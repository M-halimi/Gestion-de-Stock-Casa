<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Color;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Size;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\ProductVariantService;
use App\Services\StockService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Creates a small, readable example for products that use colors and sizes.
 * This is only called by DatabaseSeeder outside production.
 */
class VariantDemoSeeder extends Seeder
{
    public function run(): void
    {
        $warehouse = Warehouse::where('code', 'ATE1')->first() ?? Warehouse::first();
        $category = Category::first();
        $unit = \App\Models\Unit::first();

        if (! $warehouse || ! $category || ! $unit) {
            return;
        }

        $colors = Color::whereIn('name', ['Red', 'Blue', 'Black', 'Green'])->get()->keyBy('name');
        $sizes = Size::whereIn('name', ['S', 'M', 'L', 'XL'])->get()->keyBy('name');

        if ($colors->count() < 4 || $sizes->count() < 4) {
            return;
        }

        $variantService = app(ProductVariantService::class);
        $stockService = app(StockService::class);
        $adminId = User::where('email', 'admin@demo.com')->value('id');
        $customerId = Customer::first()?->id;

        $products = [
            [
                'name' => 'Demo T-shirt - colors and sizes',
                'sku' => 'DEMO-TSHIRT-001',
                'barcode' => '2000001000001',
                'sale_price' => 199,
                'purchase_price' => 100,
                'variants' => [
                    ['color' => 'Red', 'size' => 'S', 'barcode' => '2000001000101', 'sales' => 10],
                    ['color' => 'Red', 'size' => 'M', 'barcode' => '2000001000102', 'sales' => 24],
                    ['color' => 'Blue', 'size' => 'M', 'barcode' => '2000001000103', 'sales' => 6],
                    ['color' => 'Blue', 'size' => 'L', 'barcode' => '2000001000104', 'sales' => 18],
                ],
            ],
            [
                'name' => 'Demo sweatshirt - colors and sizes',
                'sku' => 'DEMO-SWEAT-001',
                'barcode' => '2000002000001',
                'sale_price' => 299,
                'purchase_price' => 160,
                'variants' => [
                    ['color' => 'Black', 'size' => 'M', 'barcode' => '2000002000101', 'sales' => 12],
                    ['color' => 'Black', 'size' => 'L', 'barcode' => '2000002000102', 'sales' => 20],
                    ['color' => 'Green', 'size' => 'L', 'barcode' => '2000002000103', 'sales' => 8],
                    ['color' => 'Green', 'size' => 'XL', 'barcode' => '2000002000104', 'sales' => 14],
                ],
            ],
        ];

        foreach ($products as $productData) {
            $product = Product::firstOrCreate(
                ['sku' => $productData['sku']],
                [
                    'name' => $productData['name'],
                    'barcode' => $productData['barcode'],
                    'category_id' => $category->id,
                    'unit_id' => $unit->id,
                    'purchase_price' => $productData['purchase_price'],
                    'sale_price' => $productData['sale_price'],
                    'min_stock' => 3,
                    'description' => 'Example product with color and size variants.',
                    'status' => 'active',
                ],
            );

            $variantRows = collect($productData['variants'])->map(function (array $variant) use ($product, $colors, $sizes): array {
                $colorId = $colors[$variant['color']]->id;
                $sizeId = $sizes[$variant['size']]->id;
                $combinationKey = "color:{$colorId}|size:{$sizeId}";
                $existingId = ProductVariant::where('product_id', $product->id)
                    ->where('combination_key', $combinationKey)
                    ->value('id');

                return array_filter([
                    'id' => $existingId,
                    'color_id' => $colorId,
                    'size_id' => $sizeId,
                    'variant_code' => strtoupper(substr($variant['color'], 0, 3) . '-' . $variant['size']),
                    'barcode' => $variant['barcode'],
                    'initial_stock' => 100,
                    'status' => 'active',
                ], fn ($value) => $value !== null);
            })->all();

            $variants = $variantService->sync($product, $variantRows, $warehouse->id)->keyBy('barcode');

            foreach ($productData['variants'] as $index => $variantData) {
                $variant = $variants->get($variantData['barcode']);
                if (! $variant) {
                    continue;
                }

                $reference = 'DEMO-VARIANT-SALE-' . ($product->id) . '-' . str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT);
                if (Sale::where('reference', $reference)->exists()) {
                    continue;
                }

                DB::transaction(function () use ($reference, $product, $variant, $variantData, $warehouse, $customerId, $adminId, $stockService, $index): void {
                    $quantity = (float) $variantData['sales'];
                    $unitPrice = (float) $product->sale_price;
                    $subtotal = round($quantity * $unitPrice, 2);

                    $sale = Sale::create([
                        'reference' => $reference,
                        'customer_id' => $customerId,
                        'warehouse_id' => $warehouse->id,
                        'date' => now()->subDays(2 + $index)->toDateString(),
                        'subtotal' => $subtotal,
                        'discount' => 0,
                        'tax' => 0,
                        'total_amount' => $subtotal,
                        'status' => Sale::STATUS_CONFIRMED,
                        'notes' => 'Demo sale for product variant reporting.',
                        'user_id' => $adminId,
                    ]);

                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $product->id,
                        'product_variant_id' => $variant->id,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'subtotal' => $subtotal,
                        'discount' => 0,
                        'tax' => 0,
                    ]);

                    $stockService->decrease(
                        $variant,
                        $warehouse,
                        $quantity,
                        'Demo sale ' . $reference,
                        \App\Models\StockMovement::TYPE_SALE,
                        Sale::class,
                        $sale->id,
                        $adminId,
                    );
                });
            }
        }
    }
}
