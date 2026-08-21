<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\PurchaseItem;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductModuleTest extends TestCase
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

    public function test_admin_can_access_categories_pages(): void
    {
        $this->actingAs($this->admin())
            ->get('/categories')
            ->assertOk();

        $this->actingAs($this->admin())
            ->get('/categories/create')
            ->assertOk();

        $category = Category::first();
        $this->actingAs($this->admin())
            ->get("/categories/{$category->id}/edit")
            ->assertOk();
    }

    public function test_admin_can_create_and_update_category(): void
    {
        $this->actingAs($this->admin())
            ->post('/categories', [
                'name' => 'Accessoires Test',
                'description' => 'Boutons, fermetures',
            ])
            ->assertRedirect(route('categories.index'));

        $this->assertDatabaseHas('categories', ['name' => 'Accessoires Test']);

        $category = Category::where('name', 'Accessoires Test')->first();
        $this->actingAs($this->admin())
            ->put("/categories/{$category->id}", ['name' => 'Accessoires Test 2', 'description' => null])
            ->assertRedirect(route('categories.index'));

        $this->assertDatabaseHas('categories', ['name' => 'Accessoires Test 2']);
    }

    public function test_admin_cannot_delete_category_in_use(): void
    {
        $category = Category::with('products')->whereHas('products')->first();

        $this->actingAs($this->admin())
            ->delete("/categories/{$category->id}")
            ->assertRedirect(route('categories.index'))
            ->assertSessionHas('error');

        $this->assertDatabaseHas('categories', ['id' => $category->id]);
    }

    public function test_admin_can_delete_empty_category(): void
    {
        $category = Category::create(['name' => 'Vide']);

        $this->actingAs($this->admin())
            ->delete("/categories/{$category->id}")
            ->assertRedirect(route('categories.index'))
            ->assertSessionHas('success');

        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }

    public function test_admin_can_access_units_pages(): void
    {
        $this->actingAs($this->admin())
            ->get('/units')
            ->assertOk();

        $this->actingAs($this->admin())
            ->get('/units/create')
            ->assertOk();

        $unit = Unit::first();
        $this->actingAs($this->admin())
            ->get("/units/{$unit->id}/edit")
            ->assertOk();
    }

    public function test_admin_can_create_and_update_unit(): void
    {
        $this->actingAs($this->admin())
            ->post('/units', ['name' => 'Mètre Test', 'abbreviation' => 'mt'])
            ->assertRedirect(route('units.index'));

        $this->assertDatabaseHas('units', ['abbreviation' => 'mt']);

        $unit = Unit::where('abbreviation', 'mt')->first();
        $this->actingAs($this->admin())
            ->put("/units/{$unit->id}", ['name' => 'Mètre linéaire Test', 'abbreviation' => 'mlt'])
            ->assertRedirect(route('units.index'));

        $this->assertDatabaseHas('units', ['abbreviation' => 'mlt']);
    }

    public function test_admin_cannot_delete_unit_in_use(): void
    {
        $unit = Unit::with('products')->whereHas('products')->first();

        $this->actingAs($this->admin())
            ->delete("/units/{$unit->id}")
            ->assertRedirect(route('units.index'))
            ->assertSessionHas('error');

        $this->assertDatabaseHas('units', ['id' => $unit->id]);
    }

    public function test_admin_can_access_products_pages(): void
    {
        $product = Product::first();

        $this->actingAs($this->admin())
            ->get('/products')
            ->assertOk();

        $this->actingAs($this->admin())
            ->get('/products/create')
            ->assertOk();

        $this->actingAs($this->admin())
            ->get("/products/{$product->id}")
            ->assertOk();

        $this->actingAs($this->admin())
            ->get("/products/{$product->id}/edit")
            ->assertOk();
    }

    public function test_admin_can_create_product(): void
    {
        $category = Category::first();
        $unit = Unit::first();

        $this->actingAs($this->admin())
            ->post('/products', [
                'name' => 'Soie sauvage',
                'category_id' => $category->id,
                'unit_id' => $unit->id,
                'purchase_price' => 45,
                'sale_price' => 90,
                'min_stock' => 10,
                'status' => 'active',
            ])
            ->assertRedirect(route('products.index'));

        $this->assertDatabaseHas('products', ['name' => 'Soie sauvage']);
    }

    public function test_product_creation_requires_valid_payload(): void
    {
        $this->actingAs($this->admin())
            ->post('/products', [
                'name' => '',
                'category_id' => 999,
                'unit_id' => 999,
                'purchase_price' => -5,
                'sale_price' => -5,
                'status' => 'invalid',
            ])
            ->assertSessionHasErrors(['name', 'category_id', 'unit_id', 'purchase_price', 'sale_price', 'status']);
    }

    public function test_admin_can_update_product(): void
    {
        $product = Product::first();

        $this->actingAs($this->admin())
            ->put("/products/{$product->id}", [
                'name' => 'Nom modifié',
                'category_id' => $product->category_id,
                'unit_id' => $product->unit_id,
                'purchase_price' => $product->purchase_price,
                'sale_price' => $product->sale_price,
                'status' => $product->status,
            ])
            ->assertRedirect(route('products.index'));

        $this->assertDatabaseHas('products', ['id' => $product->id, 'name' => 'Nom modifié']);
    }

    public function test_admin_cannot_delete_product_in_use(): void
    {
        $product = Product::first();
        PurchaseItem::factory()->create(['product_id' => $product->id]);

        $this->actingAs($this->admin())
            ->delete("/products/{$product->id}")
            ->assertRedirect(route('products.index'))
            ->assertSessionHas('error');

        $this->assertDatabaseHas('products', ['id' => $product->id]);
    }

    public function test_employee_cannot_access_crud_pages(): void
    {
        $this->actingAs($this->employee())
            ->get('/products/create')
            ->assertForbidden();

        $this->actingAs($this->employee())
            ->get('/categories/create')
            ->assertForbidden();

        $this->actingAs($this->employee())
            ->get('/units/create')
            ->assertForbidden();
    }

    public function test_employee_can_view_products_index(): void
    {
        $this->actingAs($this->employee())
            ->get('/products')
            ->assertOk();
    }
}
