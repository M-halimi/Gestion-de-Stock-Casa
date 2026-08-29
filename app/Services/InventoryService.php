<?php

namespace App\Services;

use App\Models\InventoryAdjustment;
use App\Models\InventoryAdjustmentItem;
use App\Models\Product;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class InventoryService
{
    public function create(Warehouse|int $warehouse, ?int $userId = null): InventoryAdjustment
    {
        $warehouseId = $warehouse instanceof Warehouse ? $warehouse->id : (int) $warehouse;

        return DB::transaction(function () use ($warehouseId, $userId) {
            $adjustment = InventoryAdjustment::create([
                'reference' => $this->generateReference(),
                'warehouse_id' => $warehouseId,
                'status' => InventoryAdjustment::STATUS_DRAFT,
                'user_id' => $userId ?? auth()->id(),
            ]);

            $products = Product::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'sku', 'unit_id']);

            foreach ($products as $product) {
                $variants = $product->variants()->where('status', 'active')->get();
                if ($variants->isEmpty()) {
                    $variants = collect([app(ProductVariantService::class)->ensureLegacyVariant($product)]);
                }

                foreach ($variants as $variant) {
                    $system = (float) $variant->totalQuantity($warehouseId);

                    InventoryAdjustmentItem::create([
                        'inventory_adjustment_id' => $adjustment->id,
                        'product_id' => $product->id,
                        'product_variant_id' => $variant->id,
                        'system_quantity' => $system,
                        'counted_quantity' => $system,
                        'difference' => 0,
                    ]);
                }
            }

            return $adjustment;
        });
    }

    public function updateCounts(InventoryAdjustment $adjustment, array $counts): InventoryAdjustment
    {
        if ($adjustment->status !== InventoryAdjustment::STATUS_DRAFT) {
            throw new RuntimeException('A validated inventory adjustment cannot be modified.');
        }

        foreach ($counts as $itemId => $counted) {
            $item = InventoryAdjustmentItem::where('inventory_adjustment_id', $adjustment->id)
                ->findOrFail($itemId);

            $counted = (float) $counted;

            $item->counted_quantity = $counted;
            $item->difference = round($counted - (float) $item->system_quantity, 3);
            $item->save();
        }

        return $adjustment;
    }

    public function validate(InventoryAdjustment $adjustment, ?int $userId = null): InventoryAdjustment
    {
        if ($adjustment->status !== InventoryAdjustment::STATUS_DRAFT) {
            throw new RuntimeException('Only a draft inventory adjustment can be validated.');
        }

        $adjustment->loadMissing('items.product', 'items.variant', 'warehouse');

        $reason = "Inventaire {$adjustment->reference}";

        DB::transaction(function () use ($adjustment, $reason, $userId) {
            foreach ($adjustment->items as $item) {
                if ((float) $item->difference == 0.0) {
                    continue;
                }

                $item->reason = $reason;
                $item->save();

                app(StockService::class)->adjust(
                    $item->variant ?? $item->product,
                    $adjustment->warehouse,
                    (float) $item->counted_quantity,
                    $reason,
                    $userId ?? auth()->id(),
                );
            }

            $adjustment->status = InventoryAdjustment::STATUS_VALIDATED;
            $adjustment->save();
        });

        return $adjustment;
    }

    private function generateReference(): string
    {
        $prefix = 'INV-' . now()->format('Ymd') . '-';
        $last = InventoryAdjustment::query()
            ->where('reference', 'like', $prefix . '%')
            ->orderByDesc('reference')
            ->value('reference');

        $next = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;

        return $prefix . str_pad((string) $next, 3, '0', STR_PAD_LEFT);
    }
}
