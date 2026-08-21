<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WarehouseModuleTest extends TestCase
{
    use RefreshDatabase;

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
    }

    protected function admin(): User
    {
        return User::where('email', 'admin@demo.com')->first();
    }

    protected function employee(): User
    {
        return User::where('email', 'employee@demo.com')->first();
    }

    public function test_admin_can_access_warehouses_pages(): void
    {
        $this->actingAs($this->admin())
            ->get('/warehouses')
            ->assertOk();

        $this->actingAs($this->admin())
            ->get('/warehouses/create')
            ->assertOk();

        $warehouse = Warehouse::first();
        $this->actingAs($this->admin())
            ->get("/warehouses/{$warehouse->id}/edit")
            ->assertOk();
    }

    public function test_admin_can_access_stock_page(): void
    {
        $this->actingAs($this->admin())
            ->get('/stock')
            ->assertOk();
    }

    public function test_admin_can_create_and_update_warehouse(): void
    {
        $this->actingAs($this->admin())
            ->post('/warehouses', [
                'name' => 'Entrepôt Test',
                'code' => 'TST',
                'address' => 'Marrakech',
                'is_active' => 1,
            ])
            ->assertRedirect(route('warehouses.index'));

        $this->assertDatabaseHas('warehouses', ['code' => 'TST']);

        $warehouse = Warehouse::where('code', 'TST')->first();
        $this->actingAs($this->admin())
            ->put("/warehouses/{$warehouse->id}", [
                'name' => 'Entrepôt Test 2',
                'code' => 'TST2',
                'address' => null,
                'is_active' => 0,
            ])
            ->assertRedirect(route('warehouses.index'));

        $this->assertDatabaseHas('warehouses', ['code' => 'TST2', 'is_active' => 0]);
    }

    public function test_warehouse_validation(): void
    {
        $this->actingAs($this->admin())
            ->post('/warehouses', ['name' => '', 'code' => ''])
            ->assertSessionHasErrors(['name', 'code']);
    }

    public function test_admin_cannot_delete_warehouse_with_stock(): void
    {
        $warehouse = Warehouse::with('stocks')->whereHas('stocks', fn ($q) => $q->where('quantity', '!=', 0))->first();

        $this->actingAs($this->admin())
            ->delete("/warehouses/{$warehouse->id}")
            ->assertRedirect(route('warehouses.index'))
            ->assertSessionHas('error');

        $this->assertDatabaseHas('warehouses', ['id' => $warehouse->id]);
    }

    public function test_admin_can_delete_empty_warehouse(): void
    {
        $warehouse = Warehouse::create(['name' => 'Vide', 'code' => 'VID', 'is_active' => true]);

        $this->actingAs($this->admin())
            ->delete("/warehouses/{$warehouse->id}")
            ->assertRedirect(route('warehouses.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('warehouses', ['id' => $warehouse->id]);
    }

    public function test_employee_cannot_access_warehouses_crud(): void
    {
        $this->actingAs($this->employee())
            ->get('/warehouses/create')
            ->assertForbidden();

        $this->actingAs($this->employee())
            ->post('/warehouses', ['name' => 'X', 'code' => 'X'])
            ->assertForbidden();
    }

    public function test_employee_can_view_stock(): void
    {
        $this->actingAs($this->employee())
            ->get('/stock')
            ->assertOk();
    }
}
