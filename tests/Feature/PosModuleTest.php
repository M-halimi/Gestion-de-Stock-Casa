<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Color;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Sale;
use App\Models\Size;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\ProductVariantService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_pos_checkout_confirms_sale_and_decreases_scanned_variant_stock(): void
    {
        $this->seed([
            \Database\Seeders\CategorySeeder::class,
            \Database\Seeders\UnitSeeder::class,
            \Database\Seeders\ColorSeeder::class,
            \Database\Seeders\SizeSeeder::class,
            \Database\Seeders\RolePermissionSeeder::class,
            \Database\Seeders\UserSeeder::class,
        ]);

        $admin = User::where('email', 'admin@demo.com')->firstOrFail();
        $warehouse = Warehouse::create(['name' => 'POS Warehouse', 'code' => 'POS-TST', 'is_active' => true]);
        $customer = Customer::create(['name' => 'POS Customer']);
        $product = Product::factory()->create([
            'name' => 'POS T-Shirt',
            'barcode' => null,
            'category_id' => Category::first()->id,
            'unit_id' => Unit::first()->id,
            'status' => 'active',
            'sale_price' => 25,
        ]);
        $variant = app(ProductVariantService::class)->sync($product, [[
            'color_id' => Color::where('name', 'Blue')->value('id'),
            'size_id' => Size::where('name', 'M')->value('id'),
            'barcode' => 'POS-611000000001',
            'initial_stock' => 5,
        ]], $warehouse->id)->first();

        $this->actingAs($admin)->get(route('pos.create'))->assertOk();

        $this->actingAs($admin)
            ->post(route('pos.checkout'), [
                'customer_id' => $customer->id,
                'warehouse_id' => $warehouse->id,
                'items' => [[
                    'product_id' => $product->id,
                    'product_variant_id' => $variant->id,
                    'quantity' => 2,
                    'unit_price' => 25,
                ]],
            ])
            ->assertRedirect();

        $sale = Sale::latest('id')->firstOrFail();

        $this->assertSame(Sale::STATUS_CONFIRMED, $sale->status);
        $this->assertDatabaseHas('sale_items', [
            'sale_id' => $sale->id,
            'product_variant_id' => $variant->id,
            'quantity' => 2,
        ]);
        $this->assertSame(3.0, (float) Stock::where('product_variant_id', $variant->id)->where('warehouse_id', $warehouse->id)->value('quantity'));
        $this->assertDatabaseHas('stock_movements', [
            'product_variant_id' => $variant->id,
            'type' => StockMovement::TYPE_SALE,
            'quantity' => 2,
        ]);
    }
}
