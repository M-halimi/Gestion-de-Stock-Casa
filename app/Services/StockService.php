<?php

namespace App\Services;

use App\Models\Product;
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
        Product|int $product,
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
        Product|int $product,
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
        Product|int $product,
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

        $productId = $product instanceof Product ? $product->id : (int) $product;

        DB::transaction(function () use ($productId, $fromWarehouse, $toWarehouse, $quantity, $reason, $userId) {
            $this->apply($productId, $fromWarehouse, -$quantity, StockMovement::TYPE_TRANSFER_OUT, $reason, null, null, $userId);
            $this->apply($productId, $toWarehouse, $quantity, StockMovement::TYPE_TRANSFER_IN, $reason, null, null, $userId);
        });
    }

    public function adjust(
        Product|int $product,
        Warehouse|int $warehouse,
        float $newQuantity,
        string $reason,
        ?int $userId = null,
    ): Stock {
        $productId = $product instanceof Product ? $product->id : (int) $product;
        $warehouseId = $warehouse instanceof Warehouse ? $warehouse->id : (int) $warehouse;

        return DB::transaction(function () use ($productId, $warehouseId, $newQuantity, $reason, $userId) {
            $stock = Stock::where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            $current = $stock?->quantity ?? 0;
            $delta = $newQuantity - (float) $current;

            $stock = $stock ?? new Stock([
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
            ]);

            $stock->quantity = $newQuantity;
            $stock->save();

            if ((float) $delta !== 0.0) {
                StockMovement::create([
                    'product_id' => $productId,
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
        Product|int $product,
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

        $productId = $product instanceof Product ? $product->id : (int) $product;
        $warehouseId = $warehouse instanceof Warehouse ? $warehouse->id : (int) $warehouse;

        return DB::transaction(function () use ($productId, $warehouseId, $delta, $type, $reason, $referenceType, $referenceId, $userId) {
            $stock = Stock::where('product_id', $productId)
                ->where('warehouse_id', $warehouseId)
                ->lockForUpdate()
                ->first();

            $newQuantity = ($stock?->quantity ?? 0) + $delta;

            if ($newQuantity < 0) {
                throw new InsufficientStockException(
                    sprintf('Insufficient stock for product %d in warehouse %d (requested %s, available %s).',
                        $productId, $warehouseId, -$delta, $stock?->quantity ?? 0)
                );
            }

            $stock = $stock ?? new Stock([
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
            ]);

            $stock->quantity = $newQuantity;
            $stock->save();

            StockMovement::create([
                'product_id' => $productId,
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
}