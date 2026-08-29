<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class InsufficientStockException extends RuntimeException
{
}

class StockService
{
    public function increase(
        Product|ProductVariant|int $product,
        Warehouse|int $warehouse,
        float $quantity,
        string $reason,
        string $type = StockMovement::TYPE_PURCHASE,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?int $userId = null,
    ): Stock {
        return $this->apply($product, $warehouse, $quantity, $type, $reason, $referenceType, $referenceId, $userId);
    }

    public function decrease(
        Product|ProductVariant|int $product,
        Warehouse|int $warehouse,
        float $quantity,
        string $reason,
        string $type = StockMovement::TYPE_SALE,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?int $userId = null,
    ): Stock {
        return $this->apply($product, $warehouse, -$quantity, $type, $reason, $referenceType, $referenceId, $userId);
    }

    public function transfer(
        Product|ProductVariant|int $product,
        Warehouse|int $fromWarehouse,
        Warehouse|int $toWarehouse,
        float $quantity,
        string $reason,
        ?int $userId = null,
    ): void {
        if ($quantity <= 0) {
            throw new \InvalidArgumentException('Quantity must be positive.');
        }

        $fromId = $fromWarehouse instanceof Warehouse ? $fromWarehouse->id : (int) $fromWarehouse;
        $toId = $toWarehouse instanceof Warehouse ? $toWarehouse->id : (int) $toWarehouse;

        if ($fromId === $toId) {
            throw new \InvalidArgumentException('Source and destination warehouses must differ.');
        }

        DB::transaction(function () use ($product, $fromWarehouse, $toWarehouse, $quantity, $reason, $userId) {
            $this->apply($product, $fromWarehouse, -$quantity, StockMovement::TYPE_TRANSFER_OUT, $reason, null, null, $userId);
            $this->apply($product, $toWarehouse, $quantity, StockMovement::TYPE_TRANSFER_IN, $reason, null, null, $userId);
        });
    }

    public function adjust(
        Product|ProductVariant|int $product,
        Warehouse|int $warehouse,
        float $newQuantity,
        string $reason,
        ?int $userId = null,
    ): Stock {
        $target = $this->resolveTarget($product);
        $warehouseId = $warehouse instanceof Warehouse ? $warehouse->id : (int) $warehouse;

        return DB::transaction(function () use ($target, $warehouseId, $newQuantity, $reason, $userId) {
            $stock = Stock::query()
                ->when($target['variant_id'], fn ($query) => $query->where(function ($stock) use ($target) {
                    $stock->where('product_variant_id', $target['variant_id'])
                        ->orWhere(fn ($legacy) => $legacy->where('product_id', $target['product_id'])->whereNull('product_variant_id'));
                }))
                ->when(! $target['variant_id'], fn ($query) => $query->where('product_id', $target['product_id']))
                ->where('warehouse_id', $warehouseId)
                ->orderByRaw('product_variant_id IS NULL')
                ->lockForUpdate()
                ->first();

            $current = $stock?->quantity ?? 0;
            $delta = $newQuantity - (float) $current;

            $stock = $stock ?? new Stock([
                'product_id' => $target['product_id'],
                'product_variant_id' => $target['variant_id'],
                'warehouse_id' => $warehouseId,
            ]);

            $stock->quantity = $newQuantity;
            $stock->save();

            if ((float) $delta !== 0.0) {
                StockMovement::create([
                    'product_id' => $target['product_id'],
                    'product_variant_id' => $target['variant_id'],
                    'warehouse_id' => $warehouseId,
                    'type' => StockMovement::TYPE_ADJUSTMENT,
                    'quantity' => $delta,
                    'reason' => $reason,
                    'user_id' => $userId ?? auth()->id(),
                ]);
            }

            return $stock;
        });
    }

    private function apply(
        Product|ProductVariant|int $product,
        Warehouse|int $warehouse,
        float $delta,
        string $type,
        string $reason,
        ?string $referenceType = null,
        ?int $referenceId = null,
        ?int $userId = null,
    ): Stock {
        if ($delta == 0) {
            throw new \InvalidArgumentException('Quantity must not be zero.');
        }

        $target = $this->resolveTarget($product);
        $warehouseId = $warehouse instanceof Warehouse ? $warehouse->id : (int) $warehouse;

        return DB::transaction(function () use ($target, $warehouseId, $delta, $type, $reason, $referenceType, $referenceId, $userId) {
            $stock = Stock::query()
                ->when($target['variant_id'], fn ($query) => $query->where(function ($stock) use ($target) {
                    $stock->where('product_variant_id', $target['variant_id'])
                        ->orWhere(fn ($legacy) => $legacy->where('product_id', $target['product_id'])->whereNull('product_variant_id'));
                }))
                ->when(! $target['variant_id'], fn ($query) => $query->where('product_id', $target['product_id']))
                ->where('warehouse_id', $warehouseId)
                ->orderByRaw('product_variant_id IS NULL')
                ->lockForUpdate()
                ->first();

            $newQuantity = ($stock?->quantity ?? 0) + $delta;

            if ($newQuantity < 0) {
                throw new InsufficientStockException(
                    sprintf('Insufficient stock for product %d in warehouse %d (requested %s, available %s).',
                        $target['product_id'], $warehouseId, -$delta, $stock?->quantity ?? 0)
                );
            }

            $stock = $stock ?? new Stock([
                'product_id' => $target['product_id'],
                'product_variant_id' => $target['variant_id'],
                'warehouse_id' => $warehouseId,
            ]);

            $stock->quantity = $newQuantity;
            $stock->save();

            StockMovement::create([
                'product_id' => $target['product_id'],
                'product_variant_id' => $target['variant_id'],
                'warehouse_id' => $warehouseId,
                'type' => $type,
                'quantity' => abs($delta),
                'reason' => $reason,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'user_id' => $userId ?? auth()->id(),
            ]);

            return $stock;
        });
    }

    /** @return array{product_id:int,variant_id:?int} */
    private function resolveTarget(Product|ProductVariant|int $target): array
    {
        if ($target instanceof ProductVariant) {
            return ['product_id' => (int) $target->product_id, 'variant_id' => (int) $target->id];
        }

        $product = $target instanceof Product ? $target : Product::findOrFail((int) $target);
        $variants = $product->variants()
            ->where('status', ProductVariant::STATUS_ACTIVE)
            ->where('is_legacy', false);
        $variantsCount = $variants->count();
        if ($variantsCount === 1) {
            return ['product_id' => (int) $product->id, 'variant_id' => (int) $variants->value('id')];
        }

        if ($variantsCount > 1) {
            throw new \InvalidArgumentException('A product variant is required for this product.');
        }

        $legacy = $product->legacyVariant()->first();
        if ($legacy) {
            return ['product_id' => (int) $product->id, 'variant_id' => (int) $legacy->id];
        }

        if ($variantsCount === 0) {
            $legacy = ProductVariant::firstOrCreate(
                ['product_id' => $product->id, 'is_legacy' => true],
                [
                    'combination_key' => 'legacy',
                    'barcode' => $product->barcode,
                    'status' => $product->status ?? ProductVariant::STATUS_ACTIVE,
                ],
            );

            return ['product_id' => (int) $product->id, 'variant_id' => (int) $legacy->id];
        }

        throw new \InvalidArgumentException('A product variant is required for this product.');
    }
}
