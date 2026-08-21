<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InlineCustomerTest extends TestCase
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

    protected function employee(): User
    {
        return User::where('email', 'employee@demo.com')->first();
    }

    public function test_employee_can_search_customers(): void
    {
        Customer::factory()->create(['name' => 'Zineb Recherche', 'phone' => '0666-RE-001']);

        $res = $this->actingAs($this->employee())
            ->getJson('/customers/search?q=Zineb')
            ->assertOk()
            ->assertJsonStructure(['customers' => [['id', 'name', 'phone', 'email']]]);

        $names = collect($res->json('customers'))->pluck('name');

        $this->assertTrue($names->contains('Zineb Recherche'));

        $res = $this->actingAs($this->employee())
            ->getJson('/customers/search?q=0666-RE-001')
            ->assertOk();

        $this->assertTrue(collect($res->json('customers'))->pluck('name')->contains('Zineb Recherche'));
    }

    public function test_search_is_limited_to_twenty_results(): void
    {
        Customer::factory()->count(25)->create(['name' => 'Alpha Client']);

        $res = $this->actingAs($this->employee())
            ->getJson('/customers/search?q=Alpha')
            ->assertOk();

        $this->assertLessThanOrEqual(20, count($res->json('customers')));
    }

    public function test_quick_store_creates_customer_inline(): void
    {
        $res = $this->actingAs($this->employee())
            ->postJson('/customers/quick', [
                'name' => 'Client Inline',
                'phone' => '0555-123-456',
                'email' => 'inline@demo.com',
                'address' => 'Alger Centre',
                'city' => 'Alger',
                'notes' => 'Crée pendant une vente',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'created');

        $this->assertDatabaseHas('customers', [
            'name' => 'Client Inline',
            'phone' => '0555-123-456',
            'city' => 'Alger',
            'notes' => 'Crée pendant une vente',
        ]);
        $this->assertSame('Client Inline', $res->json('customer.name'));
    }

    public function test_quick_store_validates_input(): void
    {
        $this->actingAs($this->employee())
            ->postJson('/customers/quick', ['name' => '', 'email' => 'bad-email'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email']);
    }

    public function test_quick_store_detects_duplicate_phone(): void
    {
        $existing = Customer::factory()->create(['name' => 'Dup Phone', 'phone' => '0777-999-888']);

        $res = $this->actingAs($this->employee())
            ->postJson('/customers/quick', [
                'name' => 'Autre Nom',
                'phone' => '0777-999-888',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'duplicate')
            ->assertJsonPath('field', 'phone')
            ->assertJsonPath('customer.id', $existing->id);

        $this->assertSame(1, Customer::where('phone', '0777-999-888')->count());
    }

    public function test_quick_store_detects_duplicate_email(): void
    {
        $existing = Customer::factory()->create(['name' => 'Dup Email', 'email' => 'dup@demo.com']);

        $res = $this->actingAs($this->employee())
            ->postJson('/customers/quick', [
                'name' => 'Autre Nom',
                'email' => 'dup@demo.com',
            ])
            ->assertOk()
            ->assertJsonPath('status', 'duplicate')
            ->assertJsonPath('field', 'email')
            ->assertJsonPath('customer.id', $existing->id);

        $this->assertSame(1, Customer::where('email', 'dup@demo.com')->count());
    }

    public function test_search_and_quick_store_require_create_sales_permission(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->getJson('/customers/search')->assertForbidden();
        $this->actingAs($user)
            ->postJson('/customers/quick', ['name' => 'Interdit'])
            ->assertForbidden();
    }

    public function test_sale_create_page_passes_customers_with_phone(): void
    {
        $res = $this->actingAs($this->employee())
            ->get('/sales/create')
            ->assertOk();

        $customers = $res->viewData('page')['props']['customers'] ?? null;
        $this->assertNotNull($customers);
        $this->assertArrayHasKey('phone', (array) $customers[0]);
    }
}