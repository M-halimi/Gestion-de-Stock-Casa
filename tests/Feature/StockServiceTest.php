<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InsufficientStockException;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockServiceTest extends TestCase
{
    use RefreshDatabase;

    private StockService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            \Database\Seeders\CategorySeeder::class,
            \Database\Seeders\UnitSeeder::class,
            \Database\Seeders\ProductSeeder::class,
            \Database\Seeders\DemoDataSeeder::class,
            \Database\Seeders\RolePermissionSeeder::class,
            \Database\Seeders\UserSeeder::class,
        ]);

        $this->service = app(StockService::class);

        $this->actingAs(User::where('email', 'admin@demo.com')->first());
    }

    private function product(): Product
    {
        return Product::factory()->create([
            'category_id' => \App\Models\Category::first()->id,
            'unit_id' => \App\Models\Unit::first()->id,
        ]);
    }

    private function warehouse(): Warehouse
    {
        return Warehouse::create([
            'name' => 'Entrepôt Test',
            'code' => 'TST-' . strtoupper(\Illuminate\Support\Str::random(4)),
            'is_active' => true,
        ]);
    }

    public function test_increase_creates_stock_and_movement(): void
    {
        $product = $this->product();
        $warehouse = $this->warehouse();

        $stock = $this->service->increase($product, $warehouse, 50, 'Réception initiale');

        $this->assertSame(50.0, (float) $stock->quantity);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'type' => StockMovement::TYPE_PURCHASE,
            'quantity' => 50,
            'reason' => 'Réception initiale',
        ]);
    }

    public function test_increase_accumulates_on_existing_stock(): void
    {
        $product = $this->product();
        $warehouse = $this->warehouse();

        $this->service->increase($product, $warehouse, 20, 'Réception 1');
        $this->service->increase($product, $warehouse, 30, 'Réception 2');

        $this->assertSame(50.0, (float) $product->stocks()->where('warehouse_id', $warehouse->id)->first()->quantity);
        $this->assertSame(2, $product->stockMovements()->count());
    }

    public function test_decrease_reduces_stock(): void
    {
        $product = $this->product();
        $warehouse = $this->warehouse();

        $this->service->increase($product, $warehouse, 100, 'Réception');
        $stock = $this->service->decrease($product, $warehouse, 40, 'Vente');

        $this->assertSame(60.0, (float) $stock->quantity);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'type' => StockMovement::TYPE_SALE,
            'quantity' => 40,
        ]);
    }

    public function test_decrease_below_zero_throws_and_rolls_back(): void
    {
        $product = $this->product();
        $warehouse = $this->warehouse();

        $this->service->increase($product, $warehouse, 10, 'Réception');

        $this->expectException(InsufficientStockException::class);

        try {
            $this->service->decrease($product, $warehouse, 15, 'Vente trop grande');
        } finally {
            $this->assertSame(10.0, (float) $product->stocks()->where('warehouse_id', $warehouse->id)->first()->quantity);
            $this->assertDatabaseMissing('stock_movements', [
                'product_id' => $product->id,
                'type' => StockMovement::TYPE_SALE,
                'quantity' => 15,
            ]);
        }
    }

    public function test_decrease_from_zero_stock_throws(): void
    {
        $product = Product::factory()->create([
            'category_id' => \App\Models\Category::first()->id,
            'unit_id' => \App\Models\Unit::first()->id,
        ]);
        $warehouse = $this->warehouse();

        $this->expectException(InsufficientStockException::class);

        $this->service->decrease($product, $warehouse, 5, 'Vente');
    }

    public function test_transfer_moves_quantity_between_warehouses(): void
    {
        $product = $this->product();
        $from = $this->warehouse();
        $to = Warehouse::create(['name' => 'Test', 'code' => 'TST', 'is_active' => true]);

        $this->service->increase($product, $from, 80, 'Réception');

        $this->service->transfer($product, $from, $to, 30, 'Transfert test');

        $this->assertSame(50.0, (float) $from->stocks()->where('product_id', $product->id)->first()->quantity);
        $this->assertSame(30.0, (float) $to->stocks()->where('product_id', $product->id)->first()->quantity);
        $this->assertDatabaseHas('stock_movements', ['warehouse_id' => $to->id, 'type' => StockMovement::TYPE_TRANSFER_IN]);
        $this->assertDatabaseHas('stock_movements', ['warehouse_id' => $from->id, 'type' => StockMovement::TYPE_TRANSFER_OUT]);
    }

    public function test_transfer_fails_when_insufficient(): void
    {
        $product = $this->product();
        $from = $this->warehouse();
        $to = Warehouse::create(['name' => 'Test', 'code' => 'TST', 'is_active' => true]);

        $this->service->increase($product, $from, 10, 'Réception');

        $this->expectException(InsufficientStockException::class);

        try {
            $this->service->transfer($product, $from, $to, 20, 'Transfert trop grand');
        } finally {
            $this->assertDatabaseMissing('stock_movements', ['type' => StockMovement::TYPE_TRANSFER_IN]);
        }
    }

    public function test_adjust_sets_absolute_quantity(): void
    {
        $product = $this->product();
        $warehouse = $this->warehouse();

        $this->service->increase($product, $warehouse, 10, 'Réception');
        $this->service->adjust($product, $warehouse, 25, 'Inventaire');

        $this->assertSame(25.0, (float) $warehouse->stocks()->where('product_id', $product->id)->first()->quantity);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'type' => StockMovement::TYPE_ADJUSTMENT,
            'quantity' => 15,
        ]);
    }

    public function test_adjust_records_negative_delta(): void
    {
        $product = $this->product();
        $warehouse = $this->warehouse();

        $this->service->increase($product, $warehouse, 50, 'Réception');
        $this->service->adjust($product, $warehouse, 10, 'Perte');

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'type' => StockMovement::TYPE_ADJUSTMENT,
            'quantity' => -40,
        ]);
    }

    public function test_movement_records_reference_and_user(): void
    {
        $product = $this->product();
        $warehouse = $this->warehouse();
        $admin = User::where('email', 'admin@demo.com')->first();

        $this->service->increase($product, $warehouse, 5, 'Achat #123', StockMovement::TYPE_PURCHASE, Purchase::class, 1);

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'reference_type' => 'App\\Models\\Purchase',
            'reference_id' => 1,
            'user_id' => $admin->id,
        ]);
    }
}
