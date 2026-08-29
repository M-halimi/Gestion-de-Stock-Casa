<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreBomRequest;
use App\Http\Requests\StoreProductionOrderRequest;
use App\Http\Requests\UpdateBomRequest;
use App\Models\BillOfMaterial;
use App\Models\Product;
use App\Models\ProductionOrder;
use App\Models\Warehouse;
use App\Services\InsufficientStockException;
use App\Services\ProductionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ProductionController extends Controller
{
    public function __construct(private readonly ProductionService $productionService)
    {
    }

    public function index(): RedirectResponse
    {
        return redirect()->route('production.orders.index');
    }

    /* ------------------------------------------------------------------ */
    /* Bill of materials                                                    */
    /* ------------------------------------------------------------------ */

    public function bomsIndex(Request $request): Response
    {
        $boms = BillOfMaterial::query()
            ->with(['product.category', 'items'])
            ->withCount('productionOrders')
            ->when($request->input('search'), fn ($q, $search) => $q->whereHas('product', fn ($p) => $p->where('name', 'like', "%{$search}%")->orWhere('sku', 'like', "%{$search}%")))
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Production/Boms/Index', [
            'boms' => $boms,
            'filters' => $request->only(['search']),
        ]);
    }

    public function bomsCreate(): Response
    {
        return Inertia::render('Production/Boms/Create', [
            'products' => Product::where('status', 'active')
                ->whereDoesntHave('billOfMaterial')
                ->orderBy('name')
                ->get(['id', 'name', 'sku']),
            'components' => Product::where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'sku', 'purchase_price']),
        ]);
    }

    public function bomsStore(StoreBomRequest $request): RedirectResponse
    {
        try {
            $this->productionService->createBom($request->validated());

            return redirect()->route('production.boms.index')->with('success', 'production.bom_created');
        } catch (RuntimeException|\InvalidArgumentException $e) {
            return back()->withErrors(['items' => $e->getMessage()])->withInput();
        }
    }

    public function bomsEdit(BillOfMaterial $bom): Response
    {
        return Inertia::render('Production/Boms/Edit', [
            'bom' => $bom->load(['product', 'items']),
            'products' => Product::where('status', 'active')
                ->whereDoesntHave('billOfMaterial')
                ->orWhere('id', $bom->product_id)
                ->orderBy('name')
                ->get(['id', 'name', 'sku']),
            'components' => Product::where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'sku', 'purchase_price']),
        ]);
    }

    public function bomsUpdate(UpdateBomRequest $request, BillOfMaterial $bom): RedirectResponse
    {
        try {
            $this->productionService->updateBom($bom, $request->validated());

            return redirect()->route('production.boms.index')->with('success', 'production.bom_updated');
        } catch (RuntimeException|\InvalidArgumentException $e) {
            return back()->withErrors(['items' => $e->getMessage()])->withInput();
        }
    }

    public function bomsDestroy(BillOfMaterial $bom): RedirectResponse
    {
        try {
            $this->productionService->deleteBom($bom);

            return redirect()->route('production.boms.index')->with('success', 'production.bom_deleted');
        } catch (RuntimeException $e) {
            return redirect()->route('production.boms.index')->with('error', 'production.bom_in_use');
        }
    }

    /* ------------------------------------------------------------------ */
    /* Production orders                                                    */
    /* ------------------------------------------------------------------ */

    public function ordersIndex(Request $request): Response
    {
        $orders = ProductionOrder::query()
            ->with(['product', 'variant.color', 'variant.size', 'warehouse', 'user'])
            ->withCount('items')
            ->when($request->input('search'), fn ($q, $search) => $q->where('reference', 'like', "%{$search}%")
                ->orWhereHas('product', fn ($p) => $p->where('name', 'like', "%{$search}%")))
            ->when($request->input('status'), fn ($q, $status) => $q->where('status', $status))
            ->latest('id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Production/Orders/Index', [
            'orders' => $orders,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function ordersCreate(): Response
    {
        return Inertia::render('Production/Orders/Create', [
            'boms' => BillOfMaterial::with(['product.variants.color', 'product.variants.size', 'items.component'])
                ->get()
                ->map(fn ($bom) => [
                    'id' => $bom->id,
                    'product' => $bom->product->only(['id', 'name', 'sku']),
                    'variants' => $bom->product->variants
                        ->where('status', 'active')
                        ->where('is_legacy', false)
                        ->map(fn ($variant) => [
                            'id' => $variant->id,
                            'barcode' => $variant->barcode,
                            'label' => $variant->label(),
                        ])
                        ->values(),
                    'components' => $bom->items->map(fn ($item) => [
                        'component_id' => $item->component_id,
                        'name' => $item->component->name,
                        'sku' => $item->component->sku,
                        'unit' => $item->component->unit?->name,
                        'quantity_per_unit' => (float) $item->quantity,
                        'purchase_price' => (float) $item->component->purchase_price,
                    ]),
                ]),
            'warehouses' => Warehouse::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
        ]);
    }

    public function ordersStore(StoreProductionOrderRequest $request): RedirectResponse
    {
        try {
            $order = $this->productionService->createOrder($request->validated());

            return redirect()->route('production.orders.show', $order)->with('success', 'production.order_created');
        } catch (RuntimeException|\InvalidArgumentException $e) {
            return back()->withErrors(['bill_of_material_id' => $e->getMessage()])->withInput();
        }
    }

    public function ordersShow(ProductionOrder $order): Response
    {
        return Inertia::render('Production/Orders/Show', [
            'order' => $order->load(['product', 'variant.color', 'variant.size', 'warehouse', 'items.component', 'user', 'billOfMaterial']),
            'movements' => $order->movements()->with(['product', 'warehouse', 'user'])->latest('id')->get()
                ->map(fn ($m) => [
                    'id' => $m->id,
                    'type' => $m->type,
                    'quantity' => round((float) $m->quantity, 3),
                    'product' => $m->product?->only(['id', 'name', 'sku']),
                    'warehouse' => $m->warehouse?->only(['id', 'name', 'code']),
                    'created_at' => $m->created_at->toDateTimeString(),
                ]),
        ]);
    }

    public function ordersLaunch(ProductionOrder $order): RedirectResponse
    {
        try {
            $this->productionService->launchOrder($order);

            return back()->with('success', 'production.order_launched');
        } catch (InsufficientStockException $e) {
            return back()->with('error', 'production.order_insufficient');
        } catch (RuntimeException $e) {
            return back()->with('error', 'production.order_bad_status');
        }
    }

    public function ordersComplete(ProductionOrder $order): RedirectResponse
    {
        try {
            $this->productionService->completeOrder($order);

            return back()->with('success', 'production.order_completed');
        } catch (InsufficientStockException $e) {
            return back()->with('error', 'production.order_insufficient');
        } catch (RuntimeException $e) {
            return back()->with('error', 'production.order_bad_status');
        }
    }

    public function ordersCancel(ProductionOrder $order): RedirectResponse
    {
        try {
            $this->productionService->cancelOrder($order);

            return back()->with('success', 'production.order_cancelled');
        } catch (RuntimeException $e) {
            return back()->with('error', 'production.order_bad_status');
        }
    }
}
