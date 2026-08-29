<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Color;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Size;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\SaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductInitialStockTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Warehouse $warehouseA;
    protected Warehouse $warehouseB;
    protected array $basePayload;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            \Database\Seeders\CategorySeeder::class,
            \Database\Seeders\UnitSeeder::class,
            \Database\Seeders\RolePermissionSeeder::class,
            \Database\Seeders\UserSeeder::class,
        ]);

        $this->admin = User::where('email', 'admin@demo.com')->first();

        $category = \App\Models\Category::first();
        $unit = \App\Models\Unit::first();

        $this->warehouseA = Warehouse::create(['name' => 'Warehouse A', 'code' => 'WA', 'is_active' => true]);
        $this->warehouseB = Warehouse::create(['name' => 'Warehouse B', 'code' => 'WB', 'is_active' => true]);

        $this->basePayload = [
            'name' => 'Test Product',
            'sku' => 'TEST-001',
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'purchase_price' => 10,
            'sale_price' => 20,
            'status' => 'active',
        ];
    }

    protected function createSale(Product $product, Warehouse $warehouse, float $quantity): Sale
    {
        $sale = app(SaleService::class)->create([
            'customer_id' => null,
            'warehouse_id' => $warehouse->id,
            'date' => now()->toDateString(),
            'notes' => null,
            'items' => [
                ['product_id' => $product->id, 'quantity' => $quantity, 'unit_price' => 20, 'discount' => 0, 'tax' => 0],
            ],
        ], $this->admin->id);

        return $sale;
    }

    public function test_product_without_initial_stock_has_zero_stock_and_no_movement(): void
    {
        $this->actingAs($this->admin)
            ->post(route('products.store'), $this->basePayload)
            ->assertRedirect(route('products.index'));

        $product = Product::where('sku', 'TEST-001')->first();
        $this->assertNotNull($product);
        $this->assertSame(0.0, (float) $product->totalQuantity($this->warehouseA->id));
        $this->assertSame(0, StockMovement::where('product_id', $product->id)->count());
    }

    public function test_product_with_initial_stock_creates_stock_and_in_movement_atomically(): void
    {
        $this->actingAs($this->admin)
            ->post(route('products.store'), $this->basePayload + [
                'initial_stock_enabled' => true,
                'initial_warehouse_id' => $this->warehouseA->id,
                'initial_quantity' => 100,
                'initial_notes' => 'Stock initial Warehouse A',
            ])
            ->assertRedirect(route('products.index'));

        $product = Product::where('sku', 'TEST-001')->first();
        $this->assertNotNull($product);

        $this->assertDatabaseHas('stocks', [
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouseA->id,
            'quantity' => 100,
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouseA->id,
            'type' => StockMovement::TYPE_INITIAL_STOCK,
            'quantity' => 100,
            'reason' => 'Stock initial Warehouse A',
        ]);
    }

    public function test_product_variants_receive_their_initial_stock_at_creation(): void
    {
        $color = Color::create(['name' => 'Blue', 'code' => '#0000ff', 'is_active' => true]);
        $size = Size::create(['name' => 'M', 'category' => 'Clothing', 'is_active' => true]);

        $this->actingAs($this->admin)
            ->post(route('products.store'), $this->basePayload + [
                'initial_stock_enabled' => true,
                'initial_warehouse_id' => $this->warehouseA->id,
                'variants' => [[
                    'color_id' => $color->id,
                    'size_id' => $size->id,
                    'barcode' => 'TEST-VARIANT-001',
                    'initial_stock' => 25,
                    'status' => 'active',
                ]],
            ])
            ->assertRedirect(route('products.index'));

        $product = Product::where('sku', 'TEST-001')->firstOrFail();
        $variant = \App\Models\ProductVariant::where('product_id', $product->id)->firstOrFail();

        $this->assertDatabaseHas('stocks', [
            'product_id' => $product->id,
            'product_variant_id' => $variant->id,
            'warehouse_id' => $this->warehouseA->id,
            'quantity' => 25,
        ]);
    }

    public function test_initial_stock_validation_rejects_invalid_payloads(): void
    {
        // Missing warehouse
        $this->actingAs($this->admin)
            ->post(route('products.store'), $this->basePayload + [
                'initial_stock_enabled' => true,
                'initial_quantity' => 100,
            ])
            ->assertSessionHasErrors('initial_warehouse_id');

        // Zero quantity
        $this->actingAs($this->admin)
            ->post(route('products.store'), $this->basePayload + [
                'initial_stock_enabled' => true,
                'initial_warehouse_id' => $this->warehouseA->id,
                'initial_quantity' => 0,
            ])
            ->assertSessionHasErrors('initial_quantity');

        // Negative quantity
        $this->actingAs($this->admin)
            ->post(route('products.store'), $this->basePayload + [
                'initial_stock_enabled' => true,
                'initial_warehouse_id' => $this->warehouseA->id,
                'initial_quantity' => -10,
            ])
            ->assertSessionHasErrors('initial_quantity');

        // No product created by the failed attempts
        $this->assertSame(0, Product::where('sku', 'TEST-001')->count());
    }

    public function test_user_without_manage_stock_cannot_add_initial_stock(): void
    {
        $user = User::create([
            'name' => 'Limited Creator',
            'email' => 'creator@demo.com',
            'password' => 'password',
            'email_verified_at' => now(),
        ]);
        $user->givePermissionTo('create_products');

        $this->actingAs($user)
            ->post(route('products.store'), $this->basePayload + [
                'initial_stock_enabled' => true,
                'initial_warehouse_id' => $this->warehouseA->id,
                'initial_quantity' => 100,
            ])
            ->assertForbidden();

        $this->assertSame(0, Product::where('sku', 'TEST-001')->count());
    }

    public function test_sale_can_sell_initial_stock_and_updates_correct_warehouse(): void
    {
        $this->actingAs($this->admin)
            ->post(route('products.store'), $this->basePayload + [
                'initial_stock_enabled' => true,
                'initial_warehouse_id' => $this->warehouseA->id,
                'initial_quantity' => 100,
            ]);

        $product = Product::where('sku', 'TEST-001')->first();

        // Sell 10 from Warehouse A
        $sale = $this->createSale($product, $this->warehouseA, 10);
        app(SaleService::class)->confirm($sale);

        $this->assertDatabaseHas('stocks', [
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouseA->id,
            'quantity' => 90,
        ]);

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouseA->id,
            'type' => StockMovement::TYPE_SALE,
            'quantity' => 10,
        ]);

        $this->assertSame(Sale::STATUS_CONFIRMED, $sale->fresh()->status);
    }

    public function test_oversell_is_blocked_with_available_and_requested_in_message(): void
    {
        $this->actingAs($this->admin)
            ->post(route('products.store'), $this->basePayload + [
                'initial_stock_enabled' => true,
                'initial_warehouse_id' => $this->warehouseA->id,
                'initial_quantity' => 100,
            ]);

        $product = Product::where('sku', 'TEST-001')->first();
        $sale = $this->createSale($product, $this->warehouseA, 1000);

        try {
            app(SaleService::class)->confirm($sale);
            $this->fail('Expected InsufficientStockException.');
        } catch (\App\Services\InsufficientStockException $e) {
            $this->assertStringContainsString('available 100', $e->getMessage());
            $this->assertStringContainsString('requested 1000', $e->getMessage());
        }

        // Stock unchanged, sale not confirmed, no OUT movement
        $this->assertDatabaseHas('stocks', [
            'product_id' => $product->id,
            'warehouse_id' => $this->warehouseA->id,
            'quantity' => 100,
        ]);
        $this->assertSame(Sale::STATUS_DRAFT, $sale->fresh()->status);
        $this->assertSame(0, StockMovement::where('product_id', $product->id)
            ->where('type', StockMovement::TYPE_SALE)->count()); // no OUT movement on blocked sale
    }

    public function test_multi_warehouse_stock_is_isolated(): void
    {
        $this->actingAs($this->admin)
            ->post(route('products.store'), $this->basePayload + [
                'initial_stock_enabled' => true,
                'initial_warehouse_id' => $this->warehouseA->id,
                'initial_quantity' => 100,
            ]);

        $product = Product::where('sku', 'TEST-001')->first();

        // Add stock in Warehouse B via the same service (simulating a second initial entry)
        app(\App\Services\StockService::class)->increase(
            $product, $this->warehouseB, 50, 'Stock initial B', StockMovement::TYPE_INITIAL_STOCK
        );

        // Sell 10 from A
        $saleA = $this->createSale($product, $this->warehouseA, 10);
        app(SaleService::class)->confirm($saleA);

        $this->assertDatabaseHas('stocks', [
            'product_id' => $product->id, 'warehouse_id' => $this->warehouseA->id, 'quantity' => 90,
        ]);
        $this->assertDatabaseHas('stocks', [
            'product_id' => $product->id, 'warehouse_id' => $this->warehouseB->id, 'quantity' => 50,
        ]);

        // Sell 20 from B
        $saleB = $this->createSale($product, $this->warehouseB, 20);
        app(SaleService::class)->confirm($saleB);

        $this->assertDatabaseHas('stocks', [
            'product_id' => $product->id, 'warehouse_id' => $this->warehouseA->id, 'quantity' => 90,
        ]);
        $this->assertDatabaseHas('stocks', [
            'product_id' => $product->id, 'warehouse_id' => $this->warehouseB->id, 'quantity' => 30,
        ]);
    }

    public function test_stock_page_shows_the_initial_quantity_for_the_new_product(): void
    {
        $this->actingAs($this->admin)
            ->post(route('products.store'), $this->basePayload + [
                'initial_stock_enabled' => true,
                'initial_warehouse_id' => $this->warehouseA->id,
                'initial_quantity' => 100,
            ])
            ->assertRedirect(route('products.index'));

        $this->actingAs($this->admin)
            ->get('/stock')
            ->assertInertia(fn ($page) => $page
                ->component('Stock/Index')
                ->has('products.data.0', fn ($page) => $page
                    ->where('name', 'Test Product')
                    ->has('stocks', 1)
                    ->where('stocks.0.warehouse_id', $this->warehouseA->id)
                    ->where('stocks.0.quantity', '100.000')
                    ->etc()
                )
            );
    }
}
