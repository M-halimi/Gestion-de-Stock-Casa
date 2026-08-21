<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MovementModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Warehouse $warehouseA;
    private Warehouse $warehouseB;
    private Product $product;

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

        $this->admin = User::where('email', 'admin@demo.com')->firstOrFail();
        $this->product = Product::first();

        $this->warehouseA = Warehouse::create(['name' => 'Entrepôt A', 'code' => 'A01', 'is_active' => true]);
        $this->warehouseB = Warehouse::create(['name' => 'Entrepôt B', 'code' => 'B01', 'is_active' => true]);
    }

    public function test_admin_can_access_movements_index(): void
    {
        $this->actingAs($this->admin)
            ->get(route('movements.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Stock/Movements/Index'));
    }

    public function test_employee_can_view_movements_but_not_create_transfers(): void
    {
        $employee = User::where('email', 'employee@demo.com')->firstOrFail();

        $this->actingAs($employee)->get(route('movements.index'))->assertOk();
        $this->actingAs($employee)->get(route('transfers.create'))->assertForbidden();
        $this->actingAs($employee)->post(route('transfers.store'))->assertForbidden();
    }

    public function test_movements_index_filters_by_product_type_warehouse_and_period(): void
    {
        app(StockService::class)->increase($this->product, $this->warehouseA, 10, 'Test achat', StockMovement::TYPE_PURCHASE, null, null, $this->admin->id);
        app(StockService::class)->decrease($this->product, $this->warehouseA, 4, 'Test vente', StockMovement::TYPE_SALE, null, null, $this->admin->id);

        $this->actingAs($this->admin)
            ->get(route('movements.index', ['product_id' => $this->product->id, 'type' => StockMovement::TYPE_PURCHASE]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Stock/Movements/Index')
                ->has('movements.data', 1)
                ->where('movements.data.0.type', StockMovement::TYPE_PURCHASE));

        $this->actingAs($this->admin)
            ->get(route('movements.index', ['warehouse_id' => $this->warehouseA->id]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('movements.data', 2));

        $this->actingAs($this->admin)
            ->get(route('movements.index', [
                'from' => now()->subDay()->toDateString(),
                'to' => now()->addDay()->toDateString(),
            ]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('movements.data', 2));

        $this->actingAs($this->admin)
            ->get(route('movements.index', ['from' => now()->addWeek()->toDateString()]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('movements.data', 0));
    }

    public function test_signed_quantity_matches_type(): void
    {
        app(StockService::class)->increase($this->product, $this->warehouseA, 10, 'Test achat', StockMovement::TYPE_PURCHASE, null, null, $this->admin->id);
        app(StockService::class)->decrease($this->product, $this->warehouseA, 4, 'Test vente', StockMovement::TYPE_SALE, null, null, $this->admin->id);

        $this->actingAs($this->admin)
            ->get(route('movements.index'))
            ->assertInertia(fn ($page) => $page
                ->where('movements.data.0.type', StockMovement::TYPE_SALE)
                ->where('movements.data.0.signed_quantity', -4)
                ->where('movements.data.1.type', StockMovement::TYPE_PURCHASE)
                ->where('movements.data.1.signed_quantity', 10));
    }

    public function test_transfer_moves_stock_and_creates_two_movements(): void
    {
        app(StockService::class)->increase($this->product, $this->warehouseA, 20, 'Stock initial', StockMovement::TYPE_PURCHASE, null, null, $this->admin->id);

        $this->actingAs($this->admin)
            ->post(route('transfers.store'), [
                'product_id' => $this->product->id,
                'from_warehouse_id' => $this->warehouseA->id,
                'to_warehouse_id' => $this->warehouseB->id,
                'quantity' => 7,
                'reason' => 'Réapprovisionnement',
            ])
            ->assertRedirect(route('movements.index'))
            ->assertSessionHas('success', 'transfer.created');

        $this->assertSame(13.0, (float) $this->product->totalQuantity($this->warehouseA->id));
        $this->assertSame(7.0, (float) $this->product->totalQuantity($this->warehouseB->id));

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouseA->id,
            'type' => StockMovement::TYPE_TRANSFER_OUT,
            'quantity' => 7,
            'reason' => 'Réapprovisionnement',
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $this->product->id,
            'warehouse_id' => $this->warehouseB->id,
            'type' => StockMovement::TYPE_TRANSFER_IN,
            'quantity' => 7,
            'reason' => 'Réapprovisionnement',
        ]);
    }

    public function test_transfer_fails_when_source_stock_insufficient(): void
    {
        app(StockService::class)->increase($this->product, $this->warehouseA, 5, 'Stock initial', StockMovement::TYPE_PURCHASE, null, null, $this->admin->id);

        $this->actingAs($this->admin)
            ->post(route('transfers.store'), [
                'product_id' => $this->product->id,
                'from_warehouse_id' => $this->warehouseA->id,
                'to_warehouse_id' => $this->warehouseB->id,
                'quantity' => 10,
            ])
            ->assertRedirect()
            ->assertSessionHas('error', 'transfer.insufficient');

        $this->assertSame(5.0, (float) $this->product->totalQuantity($this->warehouseA->id));
        $this->assertSame(0.0, (float) $this->product->totalQuantity($this->warehouseB->id));
        $this->assertSame(0, StockMovement::where('type', 'like', 'transfer_%')->count());
    }

    public function test_transfer_rejects_same_warehouse_and_bad_inputs(): void
    {
        $this->actingAs($this->admin)
            ->post(route('transfers.store'), [
                'product_id' => $this->product->id,
                'from_warehouse_id' => $this->warehouseA->id,
                'to_warehouse_id' => $this->warehouseA->id,
                'quantity' => 1,
            ])
            ->assertSessionHasErrors('to_warehouse_id');

        $this->actingAs($this->admin)
            ->post(route('transfers.store'), [
                'product_id' => $this->product->id,
                'from_warehouse_id' => $this->warehouseA->id,
                'to_warehouse_id' => $this->warehouseB->id,
                'quantity' => 0,
            ])
            ->assertSessionHasErrors('quantity');

        $this->actingAs($this->admin)
            ->post(route('transfers.store'), [
                'product_id' => 999999,
                'from_warehouse_id' => $this->warehouseA->id,
                'to_warehouse_id' => $this->warehouseB->id,
                'quantity' => 1,
            ])
            ->assertSessionHasErrors('product_id');

        $this->assertSame(0, StockMovement::where('type', 'like', 'transfer_%')->count());
    }

    public function test_transfer_rejects_inactive_warehouse(): void
    {
        $this->warehouseB->update(['is_active' => false]);

        $this->actingAs($this->admin)
            ->post(route('transfers.store'), [
                'product_id' => $this->product->id,
                'from_warehouse_id' => $this->warehouseA->id,
                'to_warehouse_id' => $this->warehouseB->id,
                'quantity' => 1,
            ])
            ->assertSessionHasErrors('to_warehouse_id');
    }

    public function test_transfer_create_page_lists_active_products_and_warehouses(): void
    {
        Product::create([
            'name' => 'Produit inactif',
            'sku' => 'INACTIVE-001',
            'status' => 'inactive',
            'category_id' => $this->product->category_id,
            'unit_id' => $this->product->unit_id,
        ]);

        $response = $this->actingAs($this->admin)
            ->get(route('transfers.create'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Stock/Transfers/Create'));

        $props = $response->original->getData()['page']['props'];

        $this->assertContains($this->product->id, collect($props['products'])->pluck('id')->all());
        $this->assertNotContains('INACTIVE-001', collect($props['products'])->pluck('sku')->all());
        $this->assertContains($this->warehouseA->id, collect($props['warehouses'])->pluck('id')->all());
        $this->assertContains($this->warehouseB->id, collect($props['warehouses'])->pluck('id')->all());
    }
}