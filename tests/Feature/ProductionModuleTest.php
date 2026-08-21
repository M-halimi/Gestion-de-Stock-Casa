<?php

namespace Tests\Feature;

use App\Models\BillOfMaterial;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductionOrder;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\ProductionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductionModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Warehouse $warehouse;
    private Product $finished;
    private Product $tissu;
    private Product $bouton;

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

        $category = Category::first();
        $unit = Unit::first();

        $this->warehouse = Warehouse::create([
            'name' => 'Atelier Test',
            'code' => 'ATE-TST',
            'is_active' => true,
        ]);

        $this->finished = Product::factory()->create([
            'name' => 'Robe test',
            'status' => 'active',
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'purchase_price' => 100,
        ]);

        $this->tissu = Product::factory()->create([
            'name' => 'Tissu test',
            'status' => 'active',
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'purchase_price' => 20,
        ]);

        $this->bouton = Product::factory()->create([
            'name' => 'Bouton test',
            'status' => 'active',
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'purchase_price' => 2,
        ]);
    }

    private function bom(array $items = []): BillOfMaterial
    {
        $bom = BillOfMaterial::create([
            'product_id' => $this->finished->id,
            'notes' => null,
        ]);

        $items = $items ?: [
            ['component_id' => $this->tissu->id, 'quantity' => 2],
            ['component_id' => $this->bouton->id, 'quantity' => 4],
        ];

        $bom->items()->createMany($items);

        return $bom->fresh();
    }

    private function stock(Product $product, float $qty): void
    {
        Stock::updateOrCreate(
            [
                'product_id' => $product->id,
                'warehouse_id' => $this->warehouse->id,
            ],
            ['quantity' => $qty]
        );
    }

    public function test_admin_can_access_boms_index(): void
    {
        $this->actingAs($this->admin)
            ->get(route('production.boms.index'))
            ->assertOk();
    }

    public function test_employee_can_view_but_not_create_bom(): void
    {
        $employee = User::where('email', 'employee@demo.com')->firstOrFail();

        $this->actingAs($employee)->get(route('production.boms.index'))->assertOk();
        $this->actingAs($employee)->get(route('production.boms.create'))->assertForbidden();
    }

    public function test_create_bom(): void
    {
        $response = $this->actingAs($this->admin)
            ->post(route('production.boms.store'), [
                'product_id' => $this->finished->id,
                'notes' => 'Recette test',
                'items' => [
                    ['component_id' => $this->tissu->id, 'quantity' => 2],
                    ['component_id' => $this->bouton->id, 'quantity' => 4],
                ],
            ]);

        $response->assertRedirect(route('production.boms.index'));

        $this->assertDatabaseHas('bill_of_materials', [
            'product_id' => $this->finished->id,
            'notes' => 'Recette test',
        ]);
        $this->assertDatabaseHas('bill_of_material_items', [
            'component_id' => $this->bouton->id,
            'quantity' => 4,
        ]);
    }

    public function test_create_bom_rejects_duplicate_product_and_self_component(): void
    {
        $this->bom();

        $this->actingAs($this->admin)
            ->post(route('production.boms.store'), [
                'product_id' => $this->finished->id,
                'items' => [
                    ['component_id' => $this->tissu->id, 'quantity' => 1],
                ],
            ])
            ->assertSessionHasErrors('product_id');

        $this->actingAs($this->admin)
            ->post(route('production.boms.store'), [
                'product_id' => $this->bouton->id,
                'items' => [
                    ['component_id' => $this->bouton->id, 'quantity' => 1],
                ],
            ])
            ->assertSessionHasErrors('items.0.component_id');
    }

    public function test_update_bom_replaces_items(): void
    {
        $bom = $this->bom();

        $this->actingAs($this->admin)
            ->put(route('production.boms.update', $bom), [
                'notes' => 'Modifiée',
                'items' => [
                    ['component_id' => $this->tissu->id, 'quantity' => 3],
                ],
            ])
            ->assertRedirect(route('production.boms.index'));

        $this->assertDatabaseHas('bill_of_materials', ['id' => $bom->id, 'notes' => 'Modifiée']);
        $this->assertSame(1, $bom->fresh()->items()->count());
        $this->assertDatabaseHas('bill_of_material_items', [
            'bill_of_material_id' => $bom->id,
            'component_id' => $this->tissu->id,
            'quantity' => 3,
        ]);
    }

    public function test_delete_bom_blocked_when_orders_exist(): void
    {
        $bom = $this->bom();

        ProductionOrder::create([
            'reference' => 'PRD-TEST-000',
            'bill_of_material_id' => $bom->id,
            'product_id' => $this->finished->id,
            'quantity' => 1,
            'material_cost' => 10,
            'warehouse_id' => $this->warehouse->id,
            'status' => ProductionOrder::STATUS_PENDING,
        ]);

        $this->actingAs($this->admin)
            ->delete(route('production.boms.destroy', $bom))
            ->assertRedirect(route('production.boms.index'));

        $this->assertDatabaseHas('bill_of_materials', ['id' => $bom->id]);
    }

    public function test_create_order_computes_items_and_cost(): void
    {
        $bom = $this->bom();

        $this->actingAs($this->admin)
            ->post(route('production.orders.store'), [
                'bill_of_material_id' => $bom->id,
                'quantity' => 3,
                'warehouse_id' => $this->warehouse->id,
            ])
            ->assertRedirect();

        $order = ProductionOrder::where('bill_of_material_id', $bom->id)->firstOrFail();

        $this->assertSame(ProductionOrder::STATUS_PENDING, $order->status);
        $this->assertSame('3.000', (string) $order->quantity);
        $this->assertSame('144.00', (string) $order->material_cost);
        $this->assertSame(2, $order->items()->count());
        $this->assertSame('6.000', (string) $order->items()->firstWhere('component_id', $this->tissu->id)->total_quantity);
        $this->assertStringStartsWith('PRD-' . now()->format('Ymd') . '-', $order->reference);
    }

    public function test_launch_order_checks_material_availability(): void
    {
        $bom = $this->bom();
        $this->stock($this->tissu, 10);
        $this->stock($this->bouton, 1);

        $order = app(ProductionService::class)->createOrder([
            'bill_of_material_id' => $bom->id,
            'quantity' => 1,
            'warehouse_id' => $this->warehouse->id,
        ]);

        $this->actingAs($this->admin)
            ->post(route('production.orders.launch', $order))
            ->assertRedirect()
            ->assertSessionHas('error', 'production.order_insufficient');

        $this->assertSame(ProductionOrder::STATUS_PENDING, $order->fresh()->status);

        $this->stock($this->bouton, 10);
        app(ProductionService::class)->launchOrder($order->fresh());

        $this->assertSame(ProductionOrder::STATUS_IN_PROGRESS, $order->fresh()->status);
        $this->assertNotNull($order->fresh()->started_at);
    }

    public function test_complete_order_consumes_materials_and_produces_finished_goods(): void
    {
        $bom = $this->bom();
        $this->stock($this->tissu, 10);
        $this->stock($this->bouton, 10);

        $order = app(ProductionService::class)->createOrder([
            'bill_of_material_id' => $bom->id,
            'quantity' => 2,
            'warehouse_id' => $this->warehouse->id,
        ]);

        app(ProductionService::class)->launchOrder($order);

        $this->actingAs($this->admin)
            ->post(route('production.orders.complete', $order))
            ->assertRedirect()
            ->assertSessionHas('success', 'production.order_completed');

        $order->refresh();

        $this->assertSame(ProductionOrder::STATUS_COMPLETED, $order->status);
        $this->assertNotNull($order->completed_at);

        $this->assertSame(6.0, (float) $order->warehouse->stocks()->where('product_id', $this->tissu->id)->value('quantity'));
        $this->assertSame(2.0, (float) $order->warehouse->stocks()->where('product_id', $this->bouton->id)->value('quantity'));
        $this->assertSame(2.0, (float) $order->warehouse->stocks()->where('product_id', $this->finished->id)->value('quantity'));

        $this->assertDatabaseHas('stock_movements', [
            'type' => StockMovement::TYPE_PRODUCTION_OUT,
            'product_id' => $this->tissu->id,
            'quantity' => 4,
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'type' => StockMovement::TYPE_PRODUCTION_IN,
            'product_id' => $this->finished->id,
            'quantity' => 2,
        ]);
    }

    public function test_complete_order_fails_when_stock_short_and_movements_rollback(): void
    {
        $bom = $this->bom();
        $this->stock($this->tissu, 10);
        $this->stock($this->bouton, 10);

        $order = app(ProductionService::class)->createOrder([
            'bill_of_material_id' => $bom->id,
            'quantity' => 1,
            'warehouse_id' => $this->warehouse->id,
        ]);

        app(ProductionService::class)->launchOrder($order);

        $this->stock($this->tissu, 1);

        $this->actingAs($this->admin)
            ->post(route('production.orders.complete', $order))
            ->assertRedirect()
            ->assertSessionHas('error', 'production.order_insufficient');

        $this->assertSame(ProductionOrder::STATUS_IN_PROGRESS, $order->fresh()->status);
        $this->assertSame(0, StockMovement::where('type', StockMovement::TYPE_PRODUCTION_OUT)->count());
        $this->assertSame(1.0, (float) $this->tissu->totalQuantity($this->warehouse->id));
        $this->assertSame(10.0, (float) $this->bouton->totalQuantity($this->warehouse->id));
    }

    public function test_cancel_order(): void
    {
        $bom = $this->bom();
        $order = app(ProductionService::class)->createOrder([
            'bill_of_material_id' => $bom->id,
            'quantity' => 1,
            'warehouse_id' => $this->warehouse->id,
        ]);

        $this->actingAs($this->admin)
            ->post(route('production.orders.cancel', $order))
            ->assertRedirect()
            ->assertSessionHas('success', 'production.order_cancelled');

        $this->assertSame(ProductionOrder::STATUS_CANCELLED, $order->fresh()->status);
    }

    public function test_order_show_lists_movements(): void
    {
        $bom = $this->bom();
        $this->stock($this->tissu, 10);
        $this->stock($this->bouton, 10);

        $order = app(ProductionService::class)->createOrder([
            'bill_of_material_id' => $bom->id,
            'quantity' => 1,
            'warehouse_id' => $this->warehouse->id,
        ]);
        app(ProductionService::class)->launchOrder($order);
        app(ProductionService::class)->completeOrder($order);

        $this->actingAs($this->admin)
            ->get(route('production.orders.show', $order))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Production/Orders/Show')
                ->has('order')
                ->has('movements', 3));
    }

    public function test_orders_index_filters_by_status(): void
    {
        $bom = $this->bom();

        app(ProductionService::class)->createOrder([
            'bill_of_material_id' => $bom->id,
            'quantity' => 1,
            'warehouse_id' => $this->warehouse->id,
        ]);

        $this->actingAs($this->admin)
            ->get(route('production.orders.index', ['status' => ProductionOrder::STATUS_PENDING]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Production/Orders/Index')
                ->has('orders.data', 1));

        $this->actingAs($this->admin)
            ->get(route('production.orders.index', ['status' => ProductionOrder::STATUS_COMPLETED]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Production/Orders/Index')
                ->has('orders.data', 0));
    }
}