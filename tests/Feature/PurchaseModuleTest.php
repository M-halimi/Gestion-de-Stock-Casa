<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\PurchaseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Warehouse $warehouse;
    private Supplier $supplier;
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
            'name' => 'Entrepôt Test',
            'code' => 'ENT-TST',
            'is_active' => true,
        ]);

        $this->supplier = Supplier::factory()->create(['name' => 'Fournisseur Test']);

        $this->tissu = Product::factory()->create([
            'name' => 'Tissu test',
            'status' => 'active',
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'purchase_price' => 15,
        ]);

        $this->bouton = Product::factory()->create([
            'name' => 'Bouton test',
            'status' => 'active',
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'purchase_price' => 2,
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'supplier_id' => $this->supplier->id,
            'warehouse_id' => $this->warehouse->id,
            'date' => now()->toDateString(),
            'notes' => null,
            'items' => [
                ['product_id' => $this->tissu->id, 'quantity' => 10, 'unit_price' => 15, 'discount' => 2, 'tax' => 1],
                ['product_id' => $this->bouton->id, 'quantity' => 20, 'unit_price' => 2, 'discount' => 0, 'tax' => 0],
            ],
        ], $overrides);
    }

    private function createPurchase(): Purchase
    {
        return app(PurchaseService::class)->create($this->payload());
    }

    public function test_admin_can_access_purchases_index(): void
    {
        $this->actingAs($this->admin)
            ->get(route('purchases.index'))
            ->assertOk();
    }

    public function test_employee_cannot_access_purchases(): void
    {
        $employee = User::where('email', 'employee@demo.com')->firstOrFail();

        $this->actingAs($employee)->get(route('purchases.index'))->assertForbidden();
        $this->actingAs($employee)->get(route('purchases.create'))->assertForbidden();
        $this->actingAs($employee)->post(route('purchases.store'), $this->payload())->assertForbidden();
    }

    public function test_create_purchase_does_not_change_stock(): void
    {
        $response = $this->actingAs($this->admin)
            ->post(route('purchases.store'), $this->payload());

        $response->assertRedirect();
        $response->assertSessionHas('success', 'purchases.created');

        $purchase = Purchase::where('supplier_id', $this->supplier->id)->firstOrFail();

        $this->assertSame(Purchase::STATUS_PENDING, $purchase->status);
        $this->assertStringStartsWith('ACH-' . now()->format('Ymd') . '-', $purchase->reference);
        $this->assertSame('190.00', (string) $purchase->subtotal);
        $this->assertSame('2.00', (string) $purchase->discount);
        $this->assertSame('1.00', (string) $purchase->tax);
        $this->assertSame('189.00', (string) $purchase->total_amount);

        $this->assertFalse(Stock::where('warehouse_id', $this->warehouse->id)->exists());
        $this->assertSame(0, StockMovement::where('reference_type', Purchase::class)->count());
    }

    public function test_receive_increases_stock_and_creates_movements(): void
    {
        $purchase = $this->createPurchase();

        $this->actingAs($this->admin)
            ->post(route('purchases.receive', $purchase))
            ->assertRedirect()
            ->assertSessionHas('success', 'purchases.received');

        $this->assertSame(Purchase::STATUS_RECEIVED, $purchase->fresh()->status);

        $this->assertSame(10.0, (float) $this->tissu->totalQuantity($this->warehouse->id));
        $this->assertSame(20.0, (float) $this->bouton->totalQuantity($this->warehouse->id));

        $this->assertDatabaseHas('stock_movements', [
            'type' => StockMovement::TYPE_PURCHASE,
            'product_id' => $this->tissu->id,
            'quantity' => 10,
            'reference_type' => Purchase::class,
            'reference_id' => $purchase->id,
            'warehouse_id' => $this->warehouse->id,
        ]);
        $this->assertSame(2, StockMovement::where('reference_type', Purchase::class)
            ->where('reference_id', $purchase->id)->count());
    }

    public function test_cannot_receive_twice(): void
    {
        $purchase = $this->createPurchase();

        $this->actingAs($this->admin)->post(route('purchases.receive', $purchase));
        $this->actingAs($this->admin)
            ->post(route('purchases.receive', $purchase))
            ->assertSessionHas('error', 'purchases.bad_status');

        $this->assertSame(Purchase::STATUS_RECEIVED, $purchase->fresh()->status);
        $this->assertSame(2, StockMovement::where('reference_id', $purchase->id)->count());
    }

    public function test_cancel_purchase(): void
    {
        $purchase = $this->createPurchase();

        $this->actingAs($this->admin)
            ->post(route('purchases.cancel', $purchase))
            ->assertRedirect()
            ->assertSessionHas('success', 'purchases.cancelled');

        $this->assertSame(Purchase::STATUS_CANCELLED, $purchase->fresh()->status);
        $this->assertSame(0, StockMovement::where('reference_type', Purchase::class)->count());
    }

    public function test_cannot_edit_received_purchase(): void
    {
        $purchase = $this->createPurchase();
        $this->actingAs($this->admin)->post(route('purchases.receive', $purchase));

        $this->actingAs($this->admin)
            ->put(route('purchases.update', $purchase), $this->payload(['notes' => 'Modification interdite']))
            ->assertSessionHasErrors('items');

        $this->assertSame(Purchase::STATUS_RECEIVED, $purchase->fresh()->status);
        $this->assertNull($purchase->fresh()->notes);
    }

    public function test_destroy_pending_purchase(): void
    {
        $purchase = $this->createPurchase();

        $this->actingAs($this->admin)
            ->delete(route('purchases.destroy', $purchase))
            ->assertRedirect(route('purchases.index'))
            ->assertSessionHas('success', 'purchases.deleted');

        $this->assertDatabaseMissing('purchases', ['id' => $purchase->id]);
    }

    public function test_cannot_destroy_received_purchase(): void
    {
        $purchase = $this->createPurchase();
        $this->actingAs($this->admin)->post(route('purchases.receive', $purchase));

        $this->actingAs($this->admin)
            ->delete(route('purchases.destroy', $purchase))
            ->assertRedirect(route('purchases.index'))
            ->assertSessionHas('error', 'purchases.delete_blocked');

        $this->assertDatabaseHas('purchases', ['id' => $purchase->id]);
    }

    public function test_update_replaces_items_and_recomputes_totals(): void
    {
        $purchase = $this->createPurchase();

        $this->actingAs($this->admin)
            ->put(route('purchases.update', $purchase), $this->payload([
                'items' => [
                    ['product_id' => $this->tissu->id, 'quantity' => 5, 'unit_price' => 10, 'discount' => 0, 'tax' => 0],
                ],
            ]))
            ->assertRedirect()
            ->assertSessionHas('success', 'purchases.updated');

        $purchase->refresh();

        $this->assertSame(1, $purchase->items()->count());
        $this->assertSame('50.00', (string) $purchase->subtotal);
        $this->assertSame('50.00', (string) $purchase->total_amount);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_rejects_duplicate_products_and_empty_items(): void
    {
        $this->actingAs($this->admin)
            ->post(route('purchases.store'), $this->payload([
                'items' => [
                    ['product_id' => $this->tissu->id, 'quantity' => 1, 'unit_price' => 10],
                    ['product_id' => $this->tissu->id, 'quantity' => 1, 'unit_price' => 10],
                ],
            ]))
            ->assertSessionHasErrors('items');

        $this->actingAs($this->admin)
            ->post(route('purchases.store'), $this->payload(['items' => []]))
            ->assertSessionHasErrors('items');
    }

    public function test_rejects_inactive_warehouse(): void
    {
        $inactive = Warehouse::create(['name' => 'Inactif', 'code' => 'INACT', 'is_active' => false]);

        $this->actingAs($this->admin)
            ->post(route('purchases.store'), $this->payload(['warehouse_id' => $inactive->id]))
            ->assertSessionHasErrors('warehouse_id');
    }

    public function test_purchases_index_filters_by_status(): void
    {
        $purchase = $this->createPurchase();

        $this->actingAs($this->admin)
            ->get(route('purchases.index', ['status' => Purchase::STATUS_PENDING]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Purchases/Index')
                ->has('purchases.data', 1));

        $this->actingAs($this->admin)
            ->get(route('purchases.index', ['status' => Purchase::STATUS_RECEIVED]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Purchases/Index')
                ->has('purchases.data', 0));
    }

    public function test_purchase_show_lists_movements(): void
    {
        $purchase = $this->createPurchase();
        $this->actingAs($this->admin)->post(route('purchases.receive', $purchase));

        $this->actingAs($this->admin)
            ->get(route('purchases.show', $purchase))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Purchases/Show')
                ->has('purchase')
                ->has('movements', 2));
    }

    public function test_references_are_unique(): void
    {
        $first = $this->createPurchase();
        $second = $this->createPurchase();

        $this->assertNotSame($first->reference, $second->reference);
    }
}