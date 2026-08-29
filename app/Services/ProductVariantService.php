<?php

namespace App\Services;

use App\Models\Color;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Size;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class ProductVariantService
{
    public function __construct(
        private readonly StockService $stockService,
    ) {
    }

    public function ensureLegacyVariant(Product $product): ProductVariant
    {
        $legacy = ProductVariant::firstOrCreate(
            ['product_id' => $product->id, 'is_legacy' => true],
            [
                'combination_key' => 'legacy',
                'variant_code' => null,
                'barcode' => BarcodeResolver::normalize($product->barcode) ?: null,
                'status' => $product->status ?? ProductVariant::STATUS_ACTIVE,
            ],
        );

        $legacy->fill([
            'barcode' => BarcodeResolver::normalize($product->barcode) ?: null,
            'status' => $product->status ?? ProductVariant::STATUS_ACTIVE,
        ]);
        $legacy->save();

        return $legacy;
    }

    public function resolveForProduct(Product|int $product, ?int $variantId = null): ProductVariant
    {
        $product = $product instanceof Product ? $product : Product::findOrFail((int) $product);

        if ($variantId !== null) {
            $variant = ProductVariant::where('product_id', $product->id)->findOrFail($variantId);
            if ($variant->status !== ProductVariant::STATUS_ACTIVE) {
                throw new InvalidArgumentException('The selected product variant is inactive.');
            }
            return $variant;
        }

        $variants = $product->variants()
            ->where('status', ProductVariant::STATUS_ACTIVE)
            ->where('is_legacy', false)
            ->get();
        if ($variants->count() === 1) {
            return $variants->first();
        }
        if ($variants->isNotEmpty()) {
            throw new InvalidArgumentException('A product variant is required for this product.');
        }

        $legacy = $product->legacyVariant()->first();
        if ($legacy) {
            if ($legacy->status !== ProductVariant::STATUS_ACTIVE) {
                throw new InvalidArgumentException('The default product variant is inactive.');
            }
            return $legacy;
        }

        return $this->ensureLegacyVariant($product);
    }

    /**
     * Synchronize submitted variants without deleting omitted variants. This
     * protects stock and movement history when a product is edited.
     */
    public function sync(Product $product, array $variants, ?int $initialWarehouseId = null): Collection
    {
        if ($variants === []) {
            return collect([$this->ensureLegacyVariant($product)]);
        }

        $seenKeys = [];
        $saved = collect();

        foreach ($variants as $payload) {
            $variantId = ! empty($payload['id']) ? (int) $payload['id'] : null;
            $colorId = ! empty($payload['color_id']) ? (int) $payload['color_id'] : null;
            $sizeId = ! empty($payload['size_id']) ? (int) $payload['size_id'] : null;
            $isLegacy = (bool) ($payload['is_legacy'] ?? false);

            if (! $isLegacy && (! $colorId || ! $sizeId)) {
                throw new InvalidArgumentException('Each variant must have a color and a size.');
            }

            if ($colorId && ! Color::whereKey($colorId)->where('is_active', true)->exists()) {
                throw new InvalidArgumentException('The selected color is invalid or inactive.');
            }

            if ($sizeId && ! Size::whereKey($sizeId)->where('is_active', true)->exists()) {
                throw new InvalidArgumentException('The selected size is invalid or inactive.');
            }

            $combinationKey = $isLegacy ? 'legacy' : "color:{$colorId}|size:{$sizeId}";

            if (isset($seenKeys[$combinationKey])) {
                throw new InvalidArgumentException('Duplicate variant combination.');
            }
            $seenKeys[$combinationKey] = true;

            $variant = $variantId
                ? ProductVariant::where('product_id', $product->id)->findOrFail($variantId)
                : new ProductVariant(['product_id' => $product->id]);

            $duplicateCombination = ProductVariant::where('product_id', $product->id)
                ->where('combination_key', $combinationKey)
                ->when($variant->exists, fn ($query) => $query->where('id', '<>', $variant->id))
                ->exists();

            if ($duplicateCombination) {
                throw new InvalidArgumentException('Duplicate variant combination.');
            }

            $variantCode = $isLegacy
                ? null
                : (trim((string) ($payload['variant_code'] ?? '')) ?: ($variant->variant_code ?: $this->variantCodeFor($sizeId, $colorId)));
            $barcode = BarcodeResolver::normalize($payload['barcode'] ?? '') ?: null;

            if (! $isLegacy && ! $barcode) {
                $barcode = $this->generateVariantBarcode($product, $variantCode);
            }

            if ($barcode) {
                $duplicateVariant = ProductVariant::where('barcode', $barcode)
                    ->when($variant->exists, fn ($query) => $query->where('id', '<>', $variant->id))
                    ->exists();

                $duplicateProduct = Product::where('barcode', $barcode)->exists();

                if ($duplicateVariant || ($duplicateProduct && ! $isLegacy)) {
                    throw new InvalidArgumentException('This barcode is already assigned to another variant.');
                }
            }

            if ($variantCode && ProductVariant::where('product_id', $product->id)
                ->where('variant_code', $variantCode)
                ->when($variant->exists, fn ($query) => $query->where('id', '<>', $variant->id))
                ->exists()) {
                throw new InvalidArgumentException('This variant code is already assigned to this product.');
            }

            $variant->fill([
                'color_id' => $colorId,
                'size_id' => $sizeId,
                'combination_key' => $combinationKey,
                'variant_code' => $variantCode,
                'barcode' => $barcode,
                'is_legacy' => $isLegacy,
                'status' => $payload['status'] ?? ProductVariant::STATUS_ACTIVE,
            ]);
            $variant->save();

            if ($initialWarehouseId !== null && ! empty($payload['initial_stock']) && ! $variantId) {
                $this->stockService->increase(
                    $variant,
                    $initialWarehouseId,
                    (float) $payload['initial_stock'],
                    'Stock initial',
                    \App\Models\StockMovement::TYPE_INITIAL_STOCK,
                );
            }

            $saved->push($variant);
        }

        if ($legacy = $product->legacyVariant()->first()) {
            $legacy->update([
                'barcode' => BarcodeResolver::normalize($product->barcode) ?: null,
                'status' => $product->status ?? ProductVariant::STATUS_ACTIVE,
            ]);
        }

        return $saved;
    }

    private function variantCodeFor(?int $sizeId, ?int $colorId): string
    {
        return (string) $sizeId . $colorId;
    }

    private function generateVariantBarcode(Product $product, string $variantCode): string
    {
        $base = BarcodeResolver::normalize($product->barcode);
        $prefix = $base !== ''
            ? $base
            : (preg_replace('/[^A-Za-z0-9]/', '', (string) $product->sku) ?: 'VAR');
        $barcode = $prefix . ($base !== '' ? $variantCode : '-' . $variantCode);

        if (ProductVariant::where('barcode', $barcode)->exists() || Product::where('barcode', $barcode)->exists()) {
            throw new InvalidArgumentException("Unable to generate a unique barcode for variant {$variantCode}.");
        }

        return $barcode;
    }
}
