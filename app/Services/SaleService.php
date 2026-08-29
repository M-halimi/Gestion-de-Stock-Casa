<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use RuntimeException;

class SaleService
{
    public function __construct(
        private readonly StockService $stockService,
        private readonly ProductVariantService $variantService,
    ) {
    }

    /**
     * Create a sale (draft). Stock is NOT affected.
     *
     * @param array{customer_id: int, warehouse_id: int, date: string, notes?: ?string, items: array<int, array{product_id: int, quantity: float, unit_price: float, discount?: float, tax?: float}>} $data
     */
    public function create(array $data): Sale
    {
        return DB::transaction(function () use ($data) {
            $sale = Sale::create([
                'reference' => $this->generateReference(),
                'customer_id' => $data['customer_id'],
                'warehouse_id' => $data['warehouse_id'],
                'date' => $data['date'],
                'status' => Sale::STATUS_DRAFT,
                'notes' => $data['notes'] ?? null,
                'user_id' => auth()->id(),
            ]);

            $this->syncItems($sale, $data['items']);
            $this->recomputeTotals($sale);

            return $sale->load(['customer', 'warehouse', 'items.product', 'user']);
        });
    }

    /**
     * Update a draft sale. Stock is NOT affected.
     *
     * @param array{customer_id: int, warehouse_id: int, date: string, notes?: ?string, items: array<int, array{product_id: int, quantity: float, unit_price: float, discount?: float, tax?: float}>} $data
     */
    public function update(Sale $sale, array $data): Sale
    {
        $this->assertStatus($sale, [Sale::STATUS_DRAFT]);

        return DB::transaction(function () use ($sale, $data) {
            $sale->update([
                'customer_id' => $data['customer_id'],
                'warehouse_id' => $data['warehouse_id'],
                'date' => $data['date'],
                'notes' => $data['notes'] ?? null,
            ]);

            $this->syncItems($sale, $data['items']);
            $this->recomputeTotals($sale);

            return $sale->load(['customer', 'warehouse', 'items.product', 'user']);
        });
    }

    /**
     * Confirm the sale: check availability for every line, then decrease
     * stock and record the movements inside a single transaction.
     * Any line above the available stock aborts the whole sale.
     */
    public function confirm(Sale $sale): Sale
    {
        $this->assertStatus($sale, [Sale::STATUS_DRAFT]);

        DB::transaction(function () use ($sale) {
            foreach ($sale->items as $item) {
                $variant = $item->variant ?? $this->variantService->resolveForProduct($item->product_id, $item->product_variant_id);
                $variant->loadMissing('product');
                $available = $variant->totalQuantity($sale->warehouse_id);

                if ((float) $item->quantity > $available) {
                    throw new InsufficientStockException(
                        sprintf(
                            'Insufficient stock — %s (%s): available %s, requested %s.',
                            $variant->product->name,
                            $variant->label(),
                            rtrim(rtrim(number_format($available, 3, '.', ''), '0'), '.'),
                            rtrim(rtrim(number_format((float) $item->quantity, 3, '.', ''), '0'), '.')
                        )
                    );
                }
            }

            foreach ($sale->items as $item) {
                $this->stockService->decrease(
                    $item->variant ?? $this->variantService->resolveForProduct($item->product_id, $item->product_variant_id),
                    $sale->warehouse_id,
                    (float) $item->quantity,
                    'Vente ' . $sale->reference,
                    StockMovement::TYPE_SALE,
                    Sale::class,
                    $sale->id,
                );
            }

            $sale->update(['status' => Sale::STATUS_CONFIRMED]);
        });

        return $sale->refresh()->load(['customer', 'warehouse', 'items.product', 'user']);
    }

    public function cancel(Sale $sale): Sale
    {
        $this->assertStatus($sale, [Sale::STATUS_DRAFT]);

        $sale->update(['status' => Sale::STATUS_CANCELLED]);

        return $sale->refresh()->load(['customer', 'warehouse', 'items.product', 'user']);
    }

    public function destroy(Sale $sale): void
    {
        $this->assertStatus($sale, [Sale::STATUS_DRAFT]);

        $sale->delete();
    }

    private function syncItems(Sale $sale, array $items): void
    {
        $items = array_map(function (array $item): array {
            $product = Product::findOrFail($item['product_id']);
            $variant = $this->variantService->resolveForProduct(
                $product,
                ! empty($item['product_variant_id']) ? (int) $item['product_variant_id'] : null,
            );

            return [...$item, 'product_id' => $product->id, 'product_variant_id' => $variant->id];
        }, $items);

        $this->assertItemsValid($items);

        $sale->items()->delete();

        foreach ($items as $item) {
            SaleItem::create([
                'sale_id' => $sale->id,
                'product_id' => $item['product_id'],
                'product_variant_id' => $item['product_variant_id'],
                'quantity' => $item['quantity'],
                'unit_price' => $item['unit_price'],
                'subtotal' => round((float) $item['quantity'] * (float) $item['unit_price'], 2),
                'discount' => $item['discount'] ?? 0,
                'tax' => $item['tax'] ?? 0,
            ]);
        }
    }

    private function recomputeTotals(Sale $sale): void
    {
        $items = $sale->items()->get();

        $subtotal = $items->sum(fn (SaleItem $item) => (float) $item->subtotal);
        $discount = $items->sum(fn (SaleItem $item) => (float) $item->discount);
        $tax = $items->sum(fn (SaleItem $item) => (float) $item->tax);

        $sale->update([
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
            $variantId = (int) $item['product_variant_id'];

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

            if (in_array($variantId, $seen, true)) {
                throw new InvalidArgumentException('Duplicate product variant in the sale lines.');
            }

            $seen[] = $variantId;
        }
    }

    private function assertStatus(Sale $sale, array $allowed): void
    {
        if (! in_array($sale->status, $allowed, true)) {
            throw new RuntimeException(
                sprintf('Cannot change a sale in status "%s".', $sale->status)
            );
        }
    }

    private function generateReference(): string
    {
        $date = now()->format('Ymd');
        $base = 'VEN-' . $date . '-';
        $counter = 1;

        while (Sale::where('reference', $base . str_pad((string) $counter, 3, '0', STR_PAD_LEFT))->exists()) {
            $counter++;
        }

        return $base . str_pad((string) $counter, 3, '0', STR_PAD_LEFT);
    }
}
