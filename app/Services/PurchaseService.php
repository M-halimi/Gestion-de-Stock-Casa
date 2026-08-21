<?php

namespace App\Services;

use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class PurchaseService
{
    public function __construct(
        private readonly StockService $stockService,
    ) {
    }

    /**
     * Create a purchase order (draft). Stock is NOT affected.
     *
     * @param array{supplier_id: int, warehouse_id: int, date: string, notes?: ?string, items: array<int, array{product_id: int, quantity: float, unit_price: float, discount?: float, tax?: float}>} $data
     */
    public function create(array $data): Purchase
    {
        return DB::transaction(function () use ($data) {
            $purchase = Purchase::create([
                'reference' => $this->generateReference(),
                'supplier_id' => $data['supplier_id'],
                'warehouse_id' => $data['warehouse_id'],
                'date' => $data['date'],
                'status' => Purchase::STATUS_PENDING,
                'notes' => $data['notes'] ?? null,
                'user_id' => auth()->id(),
            ]);

            $this->syncItems($purchase, $data['items']);
            $this->recomputeTotals($purchase);

            return $purchase->load(['supplier', 'warehouse', 'items.product', 'user']);
        });
    }

    /**
     * Update a pending purchase order. Stock is NOT affected.
     *
     * @param array{supplier_id: int, warehouse_id: int, date: string, notes?: ?string, items: array<int, array{product_id: int, quantity: float, unit_price: float, discount?: float, tax?: float}>} $data
     */
    public function update(Purchase $purchase, array $data): Purchase
    {
        $this->assertStatus($purchase, [Purchase::STATUS_PENDING]);

        return DB::transaction(function () use ($purchase, $data) {
            $purchase->update([
                'supplier_id' => $data['supplier_id'],
                'warehouse_id' => $data['warehouse_id'],
                'date' => $data['date'],
                'notes' => $data['notes'] ?? null,
            ]);

            $this->syncItems($purchase, $data['items']);
            $this->recomputeTotals($purchase);

            return $purchase->load(['supplier', 'warehouse', 'items.product', 'user']);
        });
    }

    /**
     * Receive the purchase: increase stock for every line and record the
     * movements, inside a single transaction.
     */
    public function receive(Purchase $purchase): Purchase
    {
        $this->assertStatus($purchase, [Purchase::STATUS_PENDING]);

        DB::transaction(function () use ($purchase) {
            foreach ($purchase->items as $item) {
                $this->stockService->increase(
                    $item->product_id,
                    $purchase->warehouse_id,
                    (float) $item->quantity,
                    'Achat ' . $purchase->reference,
                    StockMovement::TYPE_PURCHASE,
                    Purchase::class,
                    $purchase->id,
                );
            }

            $purchase->update(['status' => Purchase::STATUS_RECEIVED]);
        });

        return $purchase->refresh()->load(['supplier', 'warehouse', 'items.product', 'user']);
    }

    public function cancel(Purchase $purchase): Purchase
    {
        $this->assertStatus($purchase, [Purchase::STATUS_PENDING]);

        $purchase->update(['status' => Purchase::STATUS_CANCELLED]);

        return $purchase->refresh()->load(['supplier', 'warehouse', 'items.product', 'user']);
    }

    public function destroy(Purchase $purchase): void
    {
        $this->assertStatus($purchase, [Purchase::STATUS_PENDING]);

        $purchase->delete();
    }

    private function syncItems(Purchase $purchase, array $items): void
    {
        $this->assertItemsValid($items);

        $purchase->items()->delete();

        foreach ($items as $item) {
            PurchaseItem::create([
                'purchase_id' => $purchase->id,
                'product_id' => $item['product_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'subtotal' => round((float) $item['quantity'] * (float) $item['unit_price'], 2),
                'discount' => $item['discount'] ?? 0,
                'tax' => $item['tax'] ?? 0,
            ]);
        }
    }

    private function recomputeTotals(Purchase $purchase): void
    {
        $items = $purchase->items()->get();

        $subtotal = $items->sum(fn (PurchaseItem $item) => (float) $item->subtotal);
        $discount = $items->sum(fn (PurchaseItem $item) => (float) $item->discount);
        $tax = $items->sum(fn (PurchaseItem $item) => (float) $item->tax);

        $purchase->update([
            'subtotal' => round($subtotal, 2),
            'discount' => round($discount, 2),
            'tax' => round($tax, 2),
            'total_amount' => round($subtotal - $discount + $tax, 2),
        ]);
    }

    private function assertItemsValid(array $items): void
    {
        if (empty($items)) {
            throw new InvalidArgumentException('At least one product line is required.');
        }

        $seen = [];

        foreach ($items as $item) {
            $productId = (int) $item['product_id'];

            if ((float) $item['quantity'] <= 0) {
                throw new InvalidArgumentException('Line quantity must be positive.');
            }

            if ((float) $item['unit_price'] < 0) {
                throw new InvalidArgumentException('Line unit price must not be negative.');
            }

            if ((float) ($item['discount'] ?? 0) < 0) {
                throw new InvalidArgumentException('Line discount must not be negative.');
            }

            if ((float) ($item['tax'] ?? 0) < 0) {
                throw new InvalidArgumentException('Line tax must not be negative.');
            }

            if (in_array($productId, $seen, true)) {
                throw new InvalidArgumentException('Duplicate product in the purchase lines.');
            }

            $seen[] = $productId;
        }
    }

    private function assertStatus(Purchase $purchase, array $allowed): void
    {
        if (! in_array($purchase->status, $allowed, true)) {
            throw new RuntimeException(
                sprintf('Cannot change a purchase in status "%s".', $purchase->status)
            );
        }
    }

    private function generateReference(): string
    {
        $date = now()->format('Ymd');
        $base = 'ACH-' . $date . '-';
        $counter = 1;

        while (Purchase::where('reference', $base . str_pad((string) $counter, 3, '0', STR_PAD_LEFT))->exists()) {
            $counter++;
        }

        return $base . str_pad((string) $counter, 3, '0', STR_PAD_LEFT);
    }
}