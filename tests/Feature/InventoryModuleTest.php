<?php

namespace Tests\Feature;

use App\Models\InventoryAdjustment;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Warehouse $warehouse;
    private Product $productA;
    private Product $productB;

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
        $this->warehouse = Warehouse::create(['name' => 'Entrepôt Test', 'code' => 'ENT-TST', 'is_active' => true]);

        $this->productA = Product::first();
        $this->productB = Product::where('id', '!=', $this->productA->id)->firstOrFail();
    }

    private function countsFor(InventoryAdjustment $adjustment, array $overrides = []): array
    {
        $counts = [];
        foreach ($adjustment->items as $item) {
            $counts[$item->id] = (string) $item->system_quantity;
        }

        return array_replace($counts, $overrides);
    }

    public function test_employee_cannot_access_inventory(): void
    {
        $employee = User::where('email', 'employee@demo.com')->firstOrFail();

        $this->actingAs($employee)->get(route('inventory.index'))->assertForbidden();
        $this->actingAs($employee)->get(route('inventory.create'))->assertForbidden();
        $this->actingAs($employee)->post(route('inventory.store'))->assertForbidden();
    }

    public function test_create_draft_does_not_change_stock_and_snapshots_system_quantity(): void
    {
        app(StockService::class)->increase($this->productA, $this->warehouse, 10, 'Initial', StockMovement::TYPE_PURCHASE, null, null, $this->admin->id);

        $this->actingAs($this->admin)
            ->post(route('inventory.store'), ['warehouse_id' => $this->warehouse->id])
            ->assertRedirect()
            ->assertSessionHas('success', 'inventory.created');

        $adjustment = InventoryAdjustment::firstOrFail();

        $this->assertSame(InventoryAdjustment::STATUS_DRAFT, $adjustment->status);
        $this->assertStringStartsWith('INV-' . now()->format('Ymd') . '-', $adjustment->reference);
        $this->assertDatabaseHas('inventory_adjustment_items', [
            'inventory_adjustment_id' => $adjustment->id,
            'product_id' => $this->productA->id,
            'system_quantity' => 10,
            'counted_quantity' => 10,
            'difference' => 0,
        ]);
        $this->assertSame(10.0, (float) $this->productA->totalQuantity($this->warehouse->id));
        $this->assertSame(0, StockMovement::where('type', StockMovement::TYPE_ADJUSTMENT)->count());
    }

    public function test_update_saves_counts_and_recomputes_variance(): void
    {
        app(StockService::class)->increase($this->productA, $this->warehouse, 10, 'Initial', StockMovement::TYPE_PURCHASE, null, null, $this->admin->id);

        $this->actingAs($this->admin)->post(route('inventory.store'), ['warehouse_id' => $this->warehouse->id]);
        $adjustment = InventoryAdjustment::firstOrFail();
        $item = $adjustment->items()->where('product_id', $this->productA->id)->firstOrFail();

        $response = $this->actingAs($this->admin)
            ->put(route('inventory.update', $adjustment), [
                'counts' => $this->countsFor($adjustment, [$item->id => '7']),
            ]);
        $response
            ->assertRedirect(route('inventory.index'))
            ->assertSessionHas('success', 'inventory.updated');

        $this->assertDatabaseHas('inventory_adjustment_items', [
            'id' => $item->id,
            'counted_quantity' => 7,
            'difference' => -3,
        ]);
        $this->assertSame(10.0, (float) $this->productA->totalQuantity($this->warehouse->id));
    }

    public function test_validate_applies_positive_and_negative_variances_with_movements(): void
    {
        app(StockService::class)->increase($this->productA, $this->warehouse, 10, 'Initial', StockMovement::TYPE_PURCHASE, null, null, $this->admin->id);
        app(StockService::class)->increase($this->productB, $this->warehouse, 5, 'Initial', StockMovement::TYPE_PURCHASE, null, null, $this->admin->id);

        $this->actingAs($this->admin)->post(route('inventory.store'), ['warehouse_id' => $this->warehouse->id]);
        $adjustment = InventoryAdjustment::firstOrFail();
        $itemA = $adjustment->items()->where('product_id', $this->productA->id)->firstOrFail();
        $itemB = $adjustment->items()->where('product_id', $this->productB->id)->firstOrFail();

        $this->actingAs($this->admin)
            ->put(route('inventory.update', $adjustment), [
                'counts' => $this->countsFor($adjustment, [$itemA->id => '12', $itemB->id => '2']),
            ]);

        $this->actingAs($this->admin)
            ->post(route('inventory.validate', $adjustment))
            ->assertRedirect(route('inventory.index'))
            ->assertSessionHas('success', 'inventory.validated');

        $this->assertSame(InventoryAdjustment::STATUS_VALIDATED, $adjustment->fresh()->status);
        $this->assertSame(12.0, (float) $this->productA->totalQuantity($this->warehouse->id));
        $this->assertSame(2.0, (float) $this->productB->totalQuantity($this->warehouse->id));

        $this->assertDatabaseHas('stock_movements', [
            'type' => StockMovement::TYPE_ADJUSTMENT,
            'product_id' => $this->productA->id,
            'quantity' => 2,
            'reason' => "Inventaire {$adjustment->reference}",
        ]);
        $this->assertDatabaseHas('stock_movements', [
            'type' => StockMovement::TYPE_ADJUSTMENT,
            'product_id' => $this->productB->id,
            'quantity' => -3,
            'reason' => "Inventaire {$adjustment->reference}",
        ]);
        $this->assertSame(2, StockMovement::where('type', StockMovement::TYPE_ADJUSTMENT)->count());
    }

    public function test_validate_with_zero_variance_creates_no_movement(): void
    {
        app(StockService::class)->increase($this->productA, $this->warehouse, 4, 'Initial', StockMovement::TYPE_PURCHASE, null, null, $this->admin->id);

        $this->actingAs($this->admin)->post(route('inventory.store'), ['warehouse_id' => $this->warehouse->id]);
        $adjustment = InventoryAdjustment::firstOrFail();

        $this->actingAs($this->admin)
            ->post(route('inventory.validate', $adjustment))
            ->assertRedirect(route('inventory.index'))
            ->assertSessionHas('success', 'inventory.validated');

        $this->assertSame(4.0, (float) $this->productA->totalQuantity($this->warehouse->id));
        $this->assertSame(0, StockMovement::where('type', StockMovement::TYPE_ADJUSTMENT)->count());
    }

    public function test_cannot_modify_or_validate_validated_adjustment(): void
    {
        app(StockService::class)->increase($this->productA, $this->warehouse, 10, 'Initial', StockMovement::TYPE_PURCHASE, null, null, $this->admin->id);

        $this->actingAs($this->admin)->post(route('inventory.store'), ['warehouse_id' => $this->warehouse->id]);
        $adjustment = InventoryAdjustment::firstOrFail();

        $this->actingAs($this->admin)->post(route('inventory.validate', $adjustment));
        $item = $adjustment->items()->where('product_id', $this->productA->id)->firstOrFail();

        $this->actingAs($this->admin)
            ->put(route('inventory.update', $adjustment), ['counts' => [$item->id => '1']])
            ->assertSessionHas('error', 'inventory.bad_status');

        $this->actingAs($this->admin)
            ->post(route('inventory.validate', $adjustment))
            ->assertSessionHas('error', 'inventory.bad_status');

        $this->assertDatabaseHas('inventory_adjustment_items', [
            'id' => $item->id,
            'counted_quantity' => 10,
        ]);
        $this->assertSame(0, StockMovement::where('type', StockMovement::TYPE_ADJUSTMENT)->count());
    }

    public function test_validate_requires_validate_inventory_permission(): void
    {
        app(StockService::class)->increase($this->productA, $this->warehouse, 10, 'Initial', StockMovement::TYPE_PURCHASE, null, null, $this->admin->id);

        $this->actingAs($this->admin)->post(route('inventory.store'), ['warehouse_id' => $this->warehouse->id]);
        $adjustment = InventoryAdjustment::firstOrFail();

        $manager = User::where('email', 'manager@demo.com')->firstOrFail();
        $role = \Spatie\Permission\Models\Role::findByName('Manager');
        $role->revokePermissionTo('validate_inventory');
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        $response = $this->actingAs($manager)
            ->post(route('inventory.validate', $adjustment));
        $response->assertForbidden();
    }

    public function test_references_are_unique(): void
    {
        $this->actingAs($this->admin)->post(route('inventory.store'), ['warehouse_id' => $this->warehouse->id]);
        $this->actingAs($this->admin)->post(route('inventory.store'), ['warehouse_id' => $this->warehouse->id]);

        $references = InventoryAdjustment::pluck('reference')->all();

        $this->assertCount(2, $references);
        $this->assertCount(2, array_unique($references));
    }

    public function test_index_lists_adjustments_and_filters_by_status(): void
    {
        $this->actingAs($this->admin)->post(route('inventory.store'), ['warehouse_id' => $this->warehouse->id]);
        $adjustment = InventoryAdjustment::firstOrFail();
        $this->actingAs($this->admin)->post(route('inventory.validate', $adjustment));

        $this->actingAs($this->admin)
            ->get(route('inventory.index', ['status' => InventoryAdjustment::STATUS_VALIDATED]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Inventory/Index')
                ->has('adjustments.data', 1)
                ->where('adjustments.data.0.status', InventoryAdjustment::STATUS_VALIDATED));

        $this->actingAs($this->admin)
            ->get(route('inventory.index', ['status' => InventoryAdjustment::STATUS_DRAFT]))
            ->assertInertia(fn ($page) => $page->has('adjustments.data', 0));
    }

    public function test_edit_page_requires_warehouse_choice_on_create(): void
    {
        $this->actingAs($this->admin)
            ->post(route('inventory.store'), ['warehouse_id' => null])
            ->assertSessionHasErrors('warehouse_id');
    }
}