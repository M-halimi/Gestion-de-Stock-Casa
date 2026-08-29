<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Warehouse;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class StockMovementController extends Controller
{
    public function index(): Response
    {
        $movements = StockMovement::query()
            ->with(['product:id,name,sku', 'variant:id,product_id,color_id,size_id,barcode,is_legacy', 'variant.color:id,name', 'variant.size:id,name', 'warehouse:id,name,code', 'user:id,name', 'reference'])
            ->when(request('product_id'), fn ($q, $id) => $q->where('product_id', $id))
            ->when(request('product_variant_id'), fn ($q, $id) => $q->where('product_variant_id', $id))
            ->when(request('type'), fn ($q, $type) => $q->where('type', $type))
            ->when(request('warehouse_id'), fn ($q, $id) => $q->where('warehouse_id', $id))
            ->when(request('from'), fn ($q, $from) => $q->whereDate('created_at', '>=', Carbon::parse($from)->startOfDay()))
            ->when(request('to'), fn ($q, $to) => $q->whereDate('created_at', '<=', Carbon::parse($to)->endOfDay()))
            ->latest('id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (StockMovement $m) => $this->map($m));

        return Inertia::render('Stock/Movements/Index', [
            'movements' => $movements,
            'products' => Product::with('variants.color', 'variants.size')->orderBy('name')->get(['id', 'name', 'sku']),
            'warehouses' => Warehouse::orderBy('name')->get(['id', 'name', 'code']),
            'filters' => request()->only(['product_id', 'product_variant_id', 'type', 'warehouse_id', 'from', 'to']),
        ]);
    }

    private function map(StockMovement $m): array
    {
        return [
            'id' => $m->id,
            'type' => $m->type,
            'quantity' => round((float) $m->quantity, 3),
            'signed_quantity' => $this->signedQuantity($m),
            'reason' => $m->reason,
            'created_at' => $m->created_at->toDateTimeString(),
            'product' => $m->product?->only(['id', 'name', 'sku']),
            'variant' => $m->variant ? [
                'id' => $m->variant->id,
                'barcode' => $m->variant->barcode,
                'label' => $m->variant->label(),
                'color' => $m->variant->color?->name,
                'size' => $m->variant->size?->name,
            ] : null,
            'warehouse' => $m->warehouse?->only(['id', 'name', 'code']),
            'user' => $m->user?->only(['id', 'name']),
            'reference' => $this->referenceLink($m),
        ];
    }

    private function signedQuantity(StockMovement $m): float
    {
        if ($m->type === StockMovement::TYPE_ADJUSTMENT) {
            return round((float) $m->quantity, 3);
        }

        $outbound = [StockMovement::TYPE_SALE, StockMovement::TYPE_TRANSFER_OUT, StockMovement::TYPE_PRODUCTION_OUT, StockMovement::TYPE_BARCODE_OUT];

        return in_array($m->type, $outbound, true)
            ? -round((float) $m->quantity, 3)
            : round((float) $m->quantity, 3);
    }

    private function referenceLink(StockMovement $m): ?array
    {
        $route = match ($m->reference_type) {
            \App\Models\Purchase::class => 'purchases.show',
            \App\Models\Sale::class => 'sales.show',
            \App\Models\ProductionOrder::class => 'production.orders.show',
            default => null,
        };

        if ($route === null || ! $m->reference_id) {
            return null;
        }

        return [
            'route' => $route,
            'id' => $m->reference_id,
            'label' => $m->reference?->reference ?? null,
        ];
    }
}
