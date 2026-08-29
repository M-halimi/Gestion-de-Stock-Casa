<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\BillOfMaterialItem;
use App\Models\Category;
use App\Models\InventoryAdjustmentItem;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductionOrderItem;
use App\Models\StockMovement;
use App\Models\Unit;
use App\Models\Warehouse;
use App\Models\Color;
use App\Models\Size;
use App\Services\ProductVariantService;
use App\Services\StockService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function __construct(
        private readonly ProductVariantService $variantService,
    ) {
    }

    public function index(): Response
    {
        $products = Product::query()
            ->with(['category', 'unit', 'stocks'])
            ->with('variants.color', 'variants.size')
            ->withSum('stocks as total_quantity', 'quantity')
            ->when(request('search'), function ($q, $search) {
                $q->where(fn ($q) => $q
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%")
                    ->orWhereHas('variants', fn ($variant) => $variant
                        ->where('barcode', 'like', "%{$search}%")
                        ->orWhereHas('color', fn ($color) => $color->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('size', fn ($size) => $size->where('name', 'like', "%{$search}%"))));
            })
            ->when(request('category_id'), fn ($q, $id) => $q->where('category_id', $id))
            ->when(request('status'), fn ($q, $status) => $q->where('status', $status))
            ->orderBy('name')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('Products/Index', [
            'products' => $products,
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'filters' => request()->only(['search', 'category_id', 'status']),
        ]);
    }

    public function create(): Response
    {
        $returnWarehouseId = request()->integer('warehouse_id');

        return Inertia::render('Products/Create', [
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'units' => Unit::orderBy('name')->get(['id', 'name', 'abbreviation']),
            'warehouses' => Warehouse::orderBy('name')->get(['id', 'name']),
            'colors' => Color::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'sizes' => Size::where('is_active', true)->orderBy('name')->get(['id', 'name', 'category']),
            'returnTo' => request('from') === 'pos'
                ? route('pos.create', array_filter(['warehouse_id' => $returnWarehouseId ?: null]))
                : route('products.index'),
            'returnContext' => request('from') === 'pos' ? 'pos' : null,
            'returnWarehouseId' => request('from') === 'pos' ? $returnWarehouseId : null,
        ]);
    }

    public function store(StoreProductRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $data['min_stock'] = filled($data['min_stock'] ?? null) ? $data['min_stock'] : 3;

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('products', 'public');
        }

        // Initial stock is validated here directly from the request input so the
        // flow works even if the deployed FormRequest is an older version that
        // does not declare these fields.
        $variants = $data['variants'] ?? [];
        unset($data['variants'], $data['initial_stock_enabled'], $data['initial_warehouse_id'], $data['initial_quantity'], $data['initial_notes']);

        $initialStockEnabled = $request->boolean('initial_stock_enabled');

        if ($initialStockEnabled && ! $request->user()->can('manage_stock')) {
            abort(403);
        }

        if ($initialStockEnabled) {
            $initialRules = [
                'initial_warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
                'initial_notes' => ['nullable', 'string', 'max:500'],
            ];
            $initialRules['initial_quantity'] = $variants === []
                ? ['required', 'numeric', 'gt:0', 'max:99999999']
                : ['nullable', 'numeric', 'min:0', 'max:99999999'];
            Validator::make($request->all(), $initialRules)->validate();
        }

        $initialWarehouseId = $initialStockEnabled ? (int) $request->input('initial_warehouse_id') : null;
        $initialQuantity = $initialStockEnabled ? (float) $request->input('initial_quantity') : null;
        $initialNotes = $initialStockEnabled
            ? ((string) $request->input('initial_notes') ?: 'Stock initial')
            : null;

        try {
            DB::transaction(function () use (&$product, $data, $variants, $initialStockEnabled, $initialWarehouseId, $initialQuantity, $initialNotes) {
                $product = Product::create($data);

                if ($variants !== []) {
                    $this->variantService->sync(
                        $product,
                        $variants,
                        $initialStockEnabled ? $initialWarehouseId : null,
                    );
                } else {
                    $legacy = $this->variantService->ensureLegacyVariant($product);

                    if ($initialStockEnabled) {
                        app(StockService::class)->increase(
                            $legacy,
                            $initialWarehouseId,
                            $initialQuantity,
                            $initialNotes,
                            StockMovement::TYPE_INITIAL_STOCK,
                        );
                    }
                }
            });
        } catch (\InvalidArgumentException $exception) {
            return back()->withInput()->withErrors(['variants' => $exception->getMessage()]);
        }

        $returnWarehouseId = $initialStockEnabled
            ? $initialWarehouseId
            : (int) $request->input('return_warehouse_id');

        $redirect = $request->input('return_to') === 'pos'
            ? redirect()->route('pos.create', array_filter(['warehouse_id' => $returnWarehouseId ?: null]))
            : redirect()->route('products.index');

        return $redirect->with('success', 'product.created');
    }

    public function show(Product $product): Response
    {
        if (! $product->variants()->exists()) {
            $this->variantService->ensureLegacyVariant($product);
        }
        $product->load(['category', 'unit', 'stocks.warehouse', 'variants.color', 'variants.size', 'variants.stocks.warehouse']);

        $movements = StockMovement::query()
            ->with(['warehouse', 'variant.color', 'variant.size'])
            ->where('product_id', $product->id)
            ->latest()
            ->limit(10)
            ->get();

        return Inertia::render('Products/Show', [
            'product' => $product,
            'movements' => $movements,
        ]);
    }

    public function edit(Product $product): Response
    {
        if (! $product->variants()->exists()) {
            $this->variantService->ensureLegacyVariant($product);
        }
        $product->load(['variants.color', 'variants.size', 'variants.stocks']);

        return Inertia::render('Products/Edit', [
            'product' => $product,
            'colors' => Color::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'sizes' => Size::where('is_active', true)->orderBy('name')->get(['id', 'name', 'category']),
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'units' => Unit::orderBy('name')->get(['id', 'name', 'abbreviation']),
        ]);
    }

    public function update(UpdateProductRequest $request, Product $product): RedirectResponse
    {
        $data = $request->validated();

        $data['min_stock'] = $data['min_stock'] ?? 0;

        if ($request->hasFile('image')) {
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }
            $data['image'] = $request->file('image')->store('products', 'public');
        }

        try {
            DB::transaction(function () use ($product, $data, $request) {
                $product->update($data);

                if ($request->has('variants')) {
                    $this->variantService->sync($product, $request->input('variants', []));
                } else {
                    $legacy = $this->variantService->ensureLegacyVariant($product);
                    $legacy->update([
                        'barcode' => $product->barcode,
                        'status' => $product->status,
                    ]);
                }
            });
        } catch (\InvalidArgumentException $exception) {
            return back()->withInput()->withErrors(['variants' => $exception->getMessage()]);
        }

        return redirect()
            ->route('products.index')
            ->with('success', 'product.updated');
    }

    public function destroy(Product $product): RedirectResponse
    {
        $isInUse = $product->purchaseItems()->exists()
            || $product->saleItems()->exists()
            || $product->stockMovements()->exists()
            || InventoryAdjustmentItem::where('product_id', $product->id)->exists()
            || $product->productionOrders()->exists()
            || $product->stocks()->where('quantity', '!=', 0)->exists()
            || ProductVariant::where('product_id', $product->id)->whereHas('stockMovements')->exists()
            || BillOfMaterialItem::where('component_id', $product->id)->exists()
            || ProductionOrderItem::where('component_id', $product->id)->exists();

        if ($isInUse) {
            return redirect()
                ->route('products.index')
                ->with('error', 'product.in_use');
        }

        DB::transaction(function () use ($product) {
            if ($product->image) {
                Storage::disk('public')->delete($product->image);
            }

            $product->delete();
        });

        return redirect()
            ->route('products.index')
            ->with('success', 'product.deleted');
    }
}
