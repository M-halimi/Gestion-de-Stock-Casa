<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\BillOfMaterialItem;
use App\Models\Category;
use App\Models\InventoryAdjustmentItem;
use App\Models\Product;
use App\Models\ProductionOrderItem;
use App\Models\StockMovement;
use App\Models\Unit;
use App\Models\Warehouse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    public function index(): Response
    {
        $products = Product::query()
            ->with(['category', 'unit', 'stocks'])
            ->withSum('stocks as total_quantity', 'quantity')
            ->when(request('search'), function ($q, $search) {
                $q->where(fn ($q) => $q
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%"));
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
        return Inertia::render('Products/Create', [
            'categories' => Category::orderBy('name')->get(['id', 'name']),
            'units' => Unit::orderBy('name')->get(['id', 'name', 'abbreviation']),
        ]);
    }

    public function store(StoreProductRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $data['min_stock'] = $data['min_stock'] ?? 0;

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('products', 'public');
        }

        Product::create($data);

        return redirect()
            ->route('products.index')
            ->with('success', 'product.created');
    }

    public function show(Product $product): Response
    {
        $product->load(['category', 'unit', 'stocks.warehouse']);

        $movements = StockMovement::query()
            ->with(['warehouse'])
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
        return Inertia::render('Products/Edit', [
            'product' => $product,
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

        $product->update($data);

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