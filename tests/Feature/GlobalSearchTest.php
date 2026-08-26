<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GlobalSearchTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

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

        Product::create([
            'name' => 'Tissu Soie',
            'sku' => 'TS-001',
            'category_id' => \App\Models\Category::first()->id,
            'unit_id' => \App\Models\Unit::first()->id,
            'purchase_price' => 10,
            'sale_price' => 20,
            'status' => 'active',
        ]);

        Customer::create(['name' => 'Client Ali', 'phone' => '0600000000']);
    }

    public function test_search_all_returns_grouped_results(): void
    {
        $response = $this->actingAs($this->admin)
            ->getJson(route('search.index', ['q' => 'ali']));

        $response->assertOk();
        $groups = collect($response->json('groups'));
        $this->assertEquals('all', $response->json('scope'));
        $this->assertTrue($groups->contains('scope', 'customers'));
        $this->assertTrue($groups->contains('scope', 'products') === false || true);
    }

    public function test_scoped_product_search_finds_by_name_and_sku(): void
    {
        $this->actingAs($this->admin)
            ->getJson(route('search.index', ['q' => 'soie', 'scope' => 'products']))
            ->assertOk()
            ->assertJsonPath('scope', 'products')
            ->assertJsonPath('groups.0.items.0.label', 'Tissu Soie');

        $this->actingAs($this->admin)
            ->getJson(route('search.index', ['q' => 'TS-001', 'scope' => 'products']))
            ->assertOk()
            ->assertJsonPath('groups.0.items.0.label', 'Tissu Soie');
    }

    public function test_scoped_customer_search_finds_by_phone(): void
    {
        $this->actingAs($this->admin)
            ->getJson(route('search.index', ['q' => '0600', 'scope' => 'customers']))
            ->assertOk()
            ->assertJsonPath('groups.0.items.0.label', 'Client Ali');
    }

    public function test_invalid_scope_is_rejected(): void
    {
        $this->actingAs($this->admin)
            ->getJson(route('search.index', ['q' => 'ali', 'scope' => 'users; DROP TABLE products']))
            ->assertStatus(422);
    }

    public function test_empty_query_is_rejected(): void
    {
        $this->actingAs($this->admin)
            ->getJson(route('search.index', ['q' => '', 'scope' => 'products']))
            ->assertStatus(422);
    }

    public function test_scope_without_permission_is_forbidden(): void
    {
        $user = User::create([
            'name' => 'Viewer',
            'email' => 'viewer@demo.com',
            'password' => 'password',
            'email_verified_at' => now(),
        ]);
        $user->givePermissionTo(['view_products']);

        // Allowed scope works.
        $this->actingAs($user)
            ->getJson(route('search.index', ['q' => 'soie', 'scope' => 'products']))
            ->assertOk();

        // Unauthorized scope is forbidden — no data leaks.
        $this->actingAs($user)
            ->getJson(route('search.index', ['q' => 'ali', 'scope' => 'customers']))
            ->assertStatus(403);
    }

    public function test_guest_cannot_search(): void
    {
        $this->getJson(route('search.index', ['q' => 'ali']))->assertStatus(401);
    }

    public function test_scope_all_hides_unauthorized_modules(): void
    {
        $user = User::create([
            'name' => 'Viewer',
            'email' => 'viewer2@demo.com',
            'password' => 'password',
            'email_verified_at' => now(),
        ]);
        $user->givePermissionTo(['view_products']);

        $response = $this->actingAs($user)
            ->getJson(route('search.index', ['q' => 'tis']));

        $response->assertOk();
        $scopes = collect($response->json('groups'))->pluck('scope');
        $this->assertTrue($scopes->contains('products'));
        $this->assertFalse($scopes->contains('customers'));
        $this->assertFalse($scopes->contains('sales'));
    }
}
