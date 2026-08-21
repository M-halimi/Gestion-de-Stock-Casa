<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class SalesPurchasesSeeder extends Seeder
{
    public function run(): void
    {
        $products = Product::all();
        $customers = Customer::all();
        $suppliers = Supplier::all();
        $warehouseIds = Warehouse::where('is_active', true)->pluck('id')->all();
        $admin = User::where('email', 'admin@demo.com')->first();
        $manager = User::where('email', 'manager@demo.com')->first();
        $userIds = array_filter([$admin?->id, $manager?->id]);

        if ($products->isEmpty() || $customers->isEmpty()) {
            return;
        }

        $salesCounter = 1;
        $purchaseCounter = 1;

        for ($i = 90; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();

            foreach (range(1, fake()->numberBetween(0, 3)) as $ignored) {
                $status = fake()->randomElement(['confirmed', 'confirmed', 'confirmed', 'cancelled']);

                $sale = Sale::create([
                    'reference' => 'VEN-' . str_replace('-', '', $date) . '-' . str_pad((string) $salesCounter, 3, '0', STR_PAD_LEFT),
                    'customer_id' => $customers->random()->id,
                    'warehouse_id' => $warehouseIds ? $warehouseIds[array_rand($warehouseIds)] : null,
                    'date' => $date,
                    'subtotal' => 0,
                    'discount' => fake()->boolean(15) ? fake()->randomFloat(2, 20, 200) : 0,
                    'tax' => 0,
                    'total_amount' => 0,
                    'status' => $status,
                    'notes' => fake()->optional(0.3)->sentence(),
                    'user_id' => $userIds ? fake()->randomElement($userIds) : null,
                ]);
                $salesCounter++;

                $subtotal = 0.0;
                $usedProducts = [];

                foreach (range(1, fake()->numberBetween(1, 4)) as $ignored2) {
                    $product = $products->random();
                    if (in_array($product->id, $usedProducts, true)) {
                        continue;
                    }
                    $usedProducts[] = $product->id;

                    $quantity = fake()->randomFloat(2, 1, 40);
                    $unitPrice = round((float) $product->sale_price * fake()->randomFloat(2, 0.9, 1.1), 2);
                    $itemSubtotal = round($quantity * $unitPrice, 2);

                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $product->id,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'subtotal' => $itemSubtotal,
                        'discount' => 0,
                        'tax' => 0,
                    ]);

                    $subtotal += $itemSubtotal;

                    if ($status !== 'cancelled') {
                        StockMovement::create([
                            'product_id' => $product->id,
                            'warehouse_id' => $sale->warehouse_id,
                            'type' => StockMovement::TYPE_SALE,
                            'quantity' => $quantity,
                            'reason' => 'Vente ' . $sale->reference,
                            'reference_type' => Sale::class,
                            'reference_id' => $sale->id,
                            'user_id' => $sale->user_id,
                        ]);
                    }
                }

                $sale->update([
                    'subtotal' => round($subtotal, 2),
                    'total_amount' => round($subtotal - (float) $sale->discount + (float) $sale->tax, 2),
                ]);
            }

            if (fake()->boolean(35)) {
                $status = fake()->randomElement(['received', 'received', 'pending', 'cancelled']);

                $purchase = Purchase::create([
                    'reference' => 'ACH-' . str_replace('-', '', $date) . '-' . str_pad((string) $purchaseCounter, 3, '0', STR_PAD_LEFT),
                    'supplier_id' => $suppliers->random()->id,
                    'warehouse_id' => $warehouseIds ? $warehouseIds[array_rand($warehouseIds)] : null,
                    'date' => $date,
                    'subtotal' => 0,
                    'discount' => fake()->boolean(15) ? fake()->randomFloat(2, 20, 200) : 0,
                    'tax' => 0,
                    'total_amount' => 0,
                    'status' => $status,
                    'notes' => fake()->optional(0.3)->sentence(),
                    'user_id' => $userIds ? fake()->randomElement($userIds) : null,
                ]);
                $purchaseCounter++;

                $total = 0.0;
                $usedProducts = [];

                foreach (range(1, fake()->numberBetween(2, 5)) as $ignored2) {
                    $product = $products->random();
                    if (in_array($product->id, $usedProducts, true)) {
                        continue;
                    }
                    $usedProducts[] = $product->id;

                    $quantity = fake()->randomFloat(2, 20, 200);
                    $unitPrice = round((float) $product->purchase_price * fake()->randomFloat(2, 0.95, 1.05), 2);
                    $itemSubtotal = round($quantity * $unitPrice, 2);

                    PurchaseItem::create([
                        'purchase_id' => $purchase->id,
                        'product_id' => $product->id,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'subtotal' => $itemSubtotal,
                    ]);

                    $total += $itemSubtotal;

                    if ($status === 'received') {
                        StockMovement::create([
                            'product_id' => $product->id,
                            'warehouse_id' => $purchase->warehouse_id,
                            'type' => StockMovement::TYPE_PURCHASE,
                            'quantity' => $quantity,
                            'reason' => 'Achat ' . $purchase->reference,
                            'reference_type' => Purchase::class,
                            'reference_id' => $purchase->id,
                            'user_id' => $purchase->user_id,
                        ]);
                    }
                }

                $purchase->update([
                    'subtotal' => round($total, 2),
                    'total_amount' => round($total - (float) $purchase->discount + (float) $purchase->tax, 2),
                ]);
            }
        }
    }
}