<?php

namespace App\Services;

use App\Models\BillOfMaterial;
use App\Models\BillOfMaterialItem;
use App\Models\Product;
use App\Models\ProductionOrder;
use App\Models\ProductionOrderItem;
use App\Models\StockMovement;
use App\Models\Warehouse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class ProductionService
{
    public function __construct(
        private readonly StockService $stockService,
    ) {
    }

    /**
     * Create a bill of materials with its component lines.
     *
     * @param array{product_id: int, notes?: ?string, items: array<int, array{component_id: int, quantity: float}>} $data
     */
    public function createBom(array $data): BillOfMaterial
    {
        $this->assertProductWithoutBom($data['product_id']);

        return DB::transaction(function () use ($data) {
            $bom = BillOfMaterial::create([
                'product_id' => $data['product_id'],
                'notes' => $data['notes'] ?? null,
            ]);

            $this->syncItems($bom, $data['items']);

            return $bom->load(['product', 'items.component']);
        });
    }

    /**
     * Update an existing bill of materials (components only; the finished
     * product of an existing recipe cannot be changed).
     *
     * @param array{notes?: ?string, items: array<int, array{component_id: int, quantity: float}>} $data
     */
    public function updateBom(BillOfMaterial $bom, array $data): BillOfMaterial
    {
        $this->assertItemsValid($bom->product_id, $data['items']);

        return DB::transaction(function () use ($bom, $data) {
            $bom->update(['notes' => $data['notes'] ?? null]);

            $this->syncItems($bom, $data['items']);

            return $bom->load(['product', 'items.component']);
        });
    }

    public function deleteBom(BillOfMaterial $bom): void
    {
        if ($bom->productionOrders()->exists()) {
            throw new RuntimeException('Cannot delete a bill of materials used by production orders.');
        }

        $bom->delete();
    }

    /**
     * Create a production order from a bill of materials, computing the
     * required material quantities and the snapshot material cost.
     *
     * @param array{bill_of_material_id: int, quantity: float, warehouse_id: int, notes?: ?string} $data
     */
    public function createOrder(array $data): ProductionOrder
    {
        $bom = BillOfMaterial::with('items.component')->findOrFail($data['bill_of_material_id']);

        if ($bom->items->isEmpty()) {
            throw new InvalidArgumentException('The bill of materials has no components.');
        }

        if ((float) $data['quantity'] <= 0) {
            throw new InvalidArgumentException('Quantity must be positive.');
        }

        return DB::transaction(function () use ($bom, $data) {
            $quantity = (float) $data['quantity'];
            $cost = 0.0;

            $items = $bom->items->map(function (BillOfMaterialItem $item) use ($quantity, &$cost) {
                $total = round($item->quantity * $quantity, 3);
                $unitCost = (float) $item->component->purchase_price;
                $cost += $unitCost * $total;

                return [
                    'component_id' => $item->component_id,
                    'quantity_per_unit' => (float) $item->quantity,
                    'total_quantity' => $total,
                    'unit_cost' => $unitCost,
                ];
            });

            $order = ProductionOrder::create([
                'reference' => $this->generateReference(),
                'bill_of_material_id' => $bom->id,
                'product_id' => $bom->product_id,
                'quantity' => $quantity,
                'material_cost' => round($cost, 2),
                'warehouse_id' => $data['warehouse_id'],
                'status' => ProductionOrder::STATUS_PENDING,
                'notes' => $data['notes'] ?? null,
                'user_id' => auth()->id(),
            ]);

            foreach ($items as $item) {
                ProductionOrderItem::create([
                    'production_order_id' => $order->id,
                    ...$item,
                ]);
            }

            return $order->load(['product', 'warehouse', 'items.component', 'user']);
        });
    }

    /**
     * Validate material availability before launching. Throws when any
     * component is short in the production warehouse.
     */
    public function launchOrder(ProductionOrder $order): ProductionOrder
    {
        $this->assertStatus($order, [ProductionOrder::STATUS_PENDING]);

        $this->assertMaterialsAvailable($order);

        $order->update([
            'status' => ProductionOrder::STATUS_IN_PROGRESS,
            'started_at' => now(),
        ]);

        return $order->refresh()->load(['product', 'warehouse', 'items.component', 'user']);
    }

    /**
     * Complete the order: consume all materials and produce the finished
     * goods inside a single transaction. Partial consumption is impossible.
     */
    public function completeOrder(ProductionOrder $order): ProductionOrder
    {
        $this->assertStatus($order, [ProductionOrder::STATUS_IN_PROGRESS]);

        DB::transaction(function () use ($order) {
            $warehouse = $order->warehouse_id;

            foreach ($order->items as $item) {
                $this->stockService->decrease(
                    $item->component_id,
                    $warehouse,
                    (float) $item->total_quantity,
                    'Production ' . $order->reference,
                    StockMovement::TYPE_PRODUCTION_OUT,
                    ProductionOrder::class,
                    $order->id,
                );
            }

            $this->stockService->increase(
                $order->product_id,
                $warehouse,
                (float) $order->quantity,
                'Production ' . $order->reference,
                StockMovement::TYPE_PRODUCTION_IN,
                ProductionOrder::class,
                $order->id,
            );

            $order->update([
                'status' => ProductionOrder::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);
        });

        return $order->refresh()->load(['product', 'warehouse', 'items.component', 'user']);
    }

    public function cancelOrder(ProductionOrder $order): ProductionOrder
    {
        $this->assertStatus($order, [ProductionOrder::STATUS_PENDING, ProductionOrder::STATUS_IN_PROGRESS]);

        $order->update([
            'status' => ProductionOrder::STATUS_CANCELLED,
        ]);

        return $order->refresh()->load(['product', 'warehouse', 'items.component', 'user']);
    }

    /**
     * Material requirements for a BOM and quantity, with current availability
     * in the given warehouse.
     */
    public function materialRequirements(BillOfMaterial $bom, float $quantity, ?int $warehouseId = null): Collection
    {
        return $bom->items->map(function (BillOfMaterialItem $item) use ($quantity, $warehouseId) {
            $total = round($item->quantity * $quantity, 3);
            $available = $item->component->totalQuantity($warehouseId);

            return [
                'component_id' => $item->component_id,
                'name' => $item->component->name,
                'sku' => $item->component->sku,
                'unit' => $item->component->unit?->name,
                'quantity_per_unit' => (float) $item->quantity,
                'total_quantity' => $total,
                'available' => round($available, 3),
                'sufficient' => $available >= $total,
            ];
        });
    }

    public function assertMaterialsAvailable(ProductionOrder $order): void
    {
        $requirements = $this->materialRequirements(
            $order->billOfMaterial,
            (float) $order->quantity,
            $order->warehouse_id,
        );

        $missing = $requirements->reject(fn ($r) => $r['sufficient']);

        if ($missing->isNotEmpty()) {
            throw new InsufficientStockException(
                'Insufficient materials for production ' . $order->reference . ': '
                . $missing->pluck('name')->implode(', ')
            );
        }
    }

    private function assertProductWithoutBom(int $productId): void
    {
        if (BillOfMaterial::where('product_id', $productId)->exists()) {
            throw new InvalidArgumentException('This product already has a bill of materials.');
        }
    }

    private function assertItemsValid(int $finishedProductId, array $items): void
    {
        if (empty($items)) {
            throw new InvalidArgumentException('At least one component is required.');
        }

        $seen = [];

        foreach ($items as $item) {
            $componentId = (int) $item['component_id'];
            $quantity = (float) $item['quantity'];

            if ($quantity <= 0) {
                throw new InvalidArgumentException('Component quantity must be positive.');
            }

            if ($componentId === $finishedProductId) {
                throw new InvalidArgumentException('A product cannot be a component of its own recipe.');
            }

            if (in_array($componentId, $seen, true)) {
                throw new InvalidArgumentException('Duplicate component in the recipe.');
            }

            $seen[] = $componentId;
        }
    }

    private function syncItems(BillOfMaterial $bom, array $items): void
    {
        $this->assertItemsValid($bom->product_id, $items);

        $bom->items()->delete();

        foreach ($items as $item) {
            BillOfMaterialItem::create([
                'bill_of_material_id' => $bom->id,
                'component_id' => $item['component_id'],
                'quantity' => $item['quantity'],
            ]);
        }
    }

    private function assertStatus(ProductionOrder $order, array $allowed): void
    {
        if (! in_array($order->status, $allowed, true)) {
            throw new RuntimeException(
                sprintf('Cannot change a production order in status "%s".', $order->status)
            );
        }
    }

    private function generateReference(): string
    {
        $date = now()->format('Ymd');
        $base = 'PRD-' . $date . '-';
        $counter = 1;

        while (ProductionOrder::where('reference', $base . str_pad((string) $counter, 3, '0', STR_PAD_LEFT))->exists()) {
            $counter++;
        }

        return $base . str_pad((string) $counter, 3, '0', STR_PAD_LEFT);
    }
}