<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariant;

class BarcodeResolver
{
    public const STATUS_FOUND = 'found';
    public const STATUS_NOT_FOUND = 'not_found';
    public const STATUS_INACTIVE = 'inactive';

    public static function normalize(?string $barcode): string
    {
        // Barcode values are identifiers. Preserve leading zeroes and remove
        // only scanner-added whitespace.
        return preg_replace('/\s+/', '', trim((string) $barcode)) ?? '';
    }

    /**
     * Resolve a barcode by exact database records. A non-legacy variant has
     * priority over a product barcode; a legacy variant represents the base
     * product and is returned as a product match.
     *
     * @return array{status:string, barcode:string, match:?string, product:?array, variant:?array, variant_id:?int, label:?string, stocks:array, message:?string}
     */
    public function resolve(?string $barcode): array
    {
        $normalized = self::normalize($barcode);
        if ($normalized === '') {
            return $this->notFound($normalized);
        }

        $barcodeVariant = ProductVariant::query()
            ->with([
                'product:id,name,sku,barcode,sale_price,purchase_price,status',
                'color:id,name,code',
                'size:id,name,category',
                'stocks:id,product_id,product_variant_id,warehouse_id,quantity',
            ])
            ->where('barcode', $normalized)
            ->first();

        if ($barcodeVariant && ! $barcodeVariant->is_legacy) {
            if ($barcodeVariant->status !== ProductVariant::STATUS_ACTIVE) {
                return $this->inactive($normalized, 'This variant is inactive.', $barcodeVariant->product, $barcodeVariant);
            }

            if ($barcodeVariant->product?->status !== 'active') {
                return $this->inactive($normalized, 'This product is inactive.', $barcodeVariant->product, $barcodeVariant);
            }

            return $this->variantResult($normalized, $barcodeVariant);
        }

        $product = Product::query()
            ->with(['legacyVariant.stocks:id,product_id,product_variant_id,warehouse_id,quantity'])
            ->where('barcode', $normalized)
            ->first();

        if (! $product && $barcodeVariant?->is_legacy) {
            $product = $barcodeVariant->product;
        }

        if (! $product) {
            return $this->notFound($normalized);
        }

        if ($product->status !== 'active' || ($barcodeVariant?->is_legacy && $barcodeVariant->status !== ProductVariant::STATUS_ACTIVE)) {
            return $this->inactive($normalized, 'This product is inactive.', $product, $barcodeVariant);
        }

        $legacy = $barcodeVariant?->is_legacy ? $barcodeVariant : $product->legacyVariant;

        return [
            'status' => self::STATUS_FOUND,
            'barcode' => $normalized,
            'match' => 'product',
            'product' => $product->only(['id', 'name', 'sku', 'barcode', 'sale_price', 'purchase_price', 'status']),
            'variant' => null,
            // The legacy row is the inventory target for products without
            // specific variants, while the public result remains product-only.
            'variant_id' => $legacy?->id,
            'label' => 'Default',
            'stocks' => $legacy?->stocks?->map(fn ($stock) => [
                'warehouse_id' => $stock->warehouse_id,
                'quantity' => (float) $stock->quantity,
            ])->values()->all() ?? [],
            'stock_status' => $this->stockStatus($legacy?->stocks),
            'message' => null,
        ];
    }

    private function variantResult(string $barcode, ProductVariant $variant): array
    {
        return [
            'status' => self::STATUS_FOUND,
            'barcode' => $barcode,
            'match' => 'variant',
            'product' => $variant->product?->only(['id', 'name', 'sku', 'barcode', 'sale_price', 'purchase_price', 'status']),
            'variant' => [
                'id' => $variant->id,
                'variant_code' => $variant->variant_code,
                'barcode' => $variant->barcode,
                'label' => $variant->label(),
                'status' => $variant->status,
                'is_legacy' => false,
                'color' => $variant->color?->only(['id', 'name', 'code']),
                'size' => $variant->size?->only(['id', 'name', 'category']),
            ],
            'variant_id' => $variant->id,
            'label' => $variant->label(),
            'stocks' => $variant->stocks->map(fn ($stock) => [
                'warehouse_id' => $stock->warehouse_id,
                'quantity' => (float) $stock->quantity,
            ])->values()->all(),
            'stock_status' => $this->stockStatus($variant->stocks),
            'message' => null,
        ];
    }

    private function inactive(string $barcode, string $message, ?Product $product, ?ProductVariant $variant): array
    {
        return [
            'status' => self::STATUS_INACTIVE,
            'barcode' => $barcode,
            'match' => $variant && ! $variant->is_legacy ? 'variant' : 'product',
            'product' => $product?->only(['id', 'name', 'sku', 'barcode', 'sale_price', 'purchase_price', 'status']),
            'variant' => $variant && ! $variant->is_legacy ? [
                'id' => $variant->id,
                'variant_code' => $variant->variant_code,
                'barcode' => $variant->barcode,
                'label' => $variant->label(),
                'status' => $variant->status,
                'is_legacy' => false,
                'color' => $variant->color?->only(['id', 'name', 'code']),
                'size' => $variant->size?->only(['id', 'name', 'category']),
            ] : null,
            'variant_id' => $variant?->id,
            'label' => $variant?->label() ?? 'Default',
            'stocks' => [],
            'stock_status' => 'unknown',
            'message' => $message,
        ];
    }

    private function notFound(string $barcode): array
    {
        return [
            'status' => self::STATUS_NOT_FOUND,
            'barcode' => $barcode,
            'match' => null,
            'product' => null,
            'variant' => null,
            'variant_id' => null,
            'label' => null,
            'stocks' => [],
            'stock_status' => 'unknown',
            'message' => $barcode === '' ? 'Barcode is required.' : "Barcode not found: {$barcode}",
        ];
    }

    private function stockStatus(?iterable $stocks): string
    {
        $quantity = collect($stocks ?? [])->sum(fn ($stock) => (float) $stock->quantity);

        return $quantity > 0 ? 'in_stock' : 'out_of_stock';
    }
}
