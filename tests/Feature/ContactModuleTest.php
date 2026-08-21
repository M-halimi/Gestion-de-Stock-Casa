<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContactModuleTest extends TestCase
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

    public function test_admin_can_access_suppliers_pages(): void
    {
        $this->actingAs($this->admin())
            ->get('/suppliers')
            ->assertOk();

        $this->actingAs($this->admin())
            ->get('/suppliers/create')
            ->assertOk();

        $supplier = Supplier::first();
        $this->actingAs($this->admin())
            ->get("/suppliers/{$supplier->id}/edit")
            ->assertOk();
    }

    public function test_admin_can_create_and_update_supplier(): void
    {
        $this->actingAs($this->admin())
            ->post('/suppliers', [
                'name' => 'Fournisseur Test',
                'contact_person' => 'M. Dupont',
                'phone' => '0612345678',
                'email' => 'dupont@example.com',
                'address' => 'Casablanca',
            ])
            ->assertRedirect(route('suppliers.index'));

        $this->assertDatabaseHas('suppliers', ['name' => 'Fournisseur Test']);

        $supplier = Supplier::where('name', 'Fournisseur Test')->first();
        $this->actingAs($this->admin())
            ->put("/suppliers/{$supplier->id}", [
                'name' => 'Fournisseur Test 2',
                'contact_person' => null,
                'phone' => '0612345678',
                'email' => 'dupont@example.com',
                'address' => null,
            ])
            ->assertRedirect(route('suppliers.index'));

        $this->assertDatabaseHas('suppliers', ['name' => 'Fournisseur Test 2']);
    }

    public function test_supplier_validation(): void
    {
        $this->actingAs($this->admin())
            ->post('/suppliers', ['name' => '', 'email' => 'not-an-email'])
            ->assertSessionHasErrors(['name', 'email']);
    }

    public function test_admin_cannot_delete_supplier_in_use(): void
    {
        $supplier = Supplier::first();
        Purchase::factory()->create(['supplier_id' => $supplier->id]);

        $this->actingAs($this->admin())
            ->delete("/suppliers/{$supplier->id}")
            ->assertRedirect(route('suppliers.index'))
            ->assertSessionHas('error');

        $this->assertDatabaseHas('suppliers', ['id' => $supplier->id]);
    }

    public function test_admin_can_delete_empty_supplier(): void
    {
        $supplier = Supplier::create(['name' => 'Fournisseur Vide']);

        $this->actingAs($this->admin())
            ->delete("/suppliers/{$supplier->id}")
            ->assertRedirect(route('suppliers.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('suppliers', ['id' => $supplier->id]);
    }

    public function test_admin_can_access_customers_pages(): void
    {
        $this->actingAs($this->admin())
            ->get('/customers')
            ->assertOk();

        $this->actingAs($this->admin())
            ->get('/customers/create')
            ->assertOk();

        $customer = Customer::first();
        $this->actingAs($this->admin())
            ->get("/customers/{$customer->id}/edit")
            ->assertOk();
    }

    public function test_admin_can_create_and_update_customer(): void
    {
        $this->actingAs($this->admin())
            ->post('/customers', [
                'name' => 'Client Test',
                'phone' => '0600000000',
                'email' => 'client@example.com',
                'address' => 'Rabat',
            ])
            ->assertRedirect(route('customers.index'));

        $this->assertDatabaseHas('customers', ['name' => 'Client Test']);

        $customer = Customer::where('name', 'Client Test')->first();
        $this->actingAs($this->admin())
            ->put("/customers/{$customer->id}", [
                'name' => 'Client Test 2',
                'phone' => '0600000000',
                'email' => 'client@example.com',
                'address' => null,
            ])
            ->assertRedirect(route('customers.index'));

        $this->assertDatabaseHas('customers', ['name' => 'Client Test 2']);
    }

    public function test_customer_validation(): void
    {
        $this->actingAs($this->admin())
            ->post('/customers', ['name' => '', 'email' => 'bad'])
            ->assertSessionHasErrors(['name', 'email']);
    }

    public function test_admin_cannot_delete_customer_in_use(): void
    {
        $customer = Customer::first();
        Sale::factory()->create(['customer_id' => $customer->id, 'status' => Sale::STATUS_DRAFT]);

        $this->actingAs($this->admin())
            ->delete("/customers/{$customer->id}")
            ->assertRedirect(route('customers.index'))
            ->assertSessionHas('error');

        $this->assertDatabaseHas('customers', ['id' => $customer->id]);
    }

    public function test_admin_can_delete_empty_customer(): void
    {
        $customer = Customer::create(['name' => 'Client Vide']);

        $this->actingAs($this->admin())
            ->delete("/customers/{$customer->id}")
            ->assertRedirect(route('customers.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('customers', ['id' => $customer->id]);
    }

    public function test_employee_cannot_access_crud_pages(): void
    {
        $this->actingAs($this->employee())
            ->get('/suppliers/create')
            ->assertForbidden();

        $this->actingAs($this->employee())
            ->get('/customers/create')
            ->assertForbidden();
    }

    public function test_employee_can_view_customers_index(): void
    {
        $this->actingAs($this->employee())
            ->get('/customers')
            ->assertOk();
    }

    public function test_employee_cannot_view_suppliers(): void
    {
        $this->actingAs($this->employee())
            ->get('/suppliers')
            ->assertForbidden();
    }
}
