<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Stock;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Warehouse $warehouseA;
    private Warehouse $warehouseB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            \Database\Seeders\CategorySeeder::class,
            \Database\Seeders\UnitSeeder::class,
            \Database\Seeders\ProductSeeder::class,
            \Database\Seeders\RolePermissionSeeder::class,
            \Database\Seeders\UserSeeder::class,
        ]);

        $this->admin = User::where('email', 'admin@demo.com')->firstOrFail();
        $this->warehouseA = Warehouse::create(['name' => 'Entrepôt A', 'code' => 'WH-A', 'is_active' => true]);
        $this->warehouseB = Warehouse::create(['name' => 'Entrepôt B', 'code' => 'WH-B', 'is_active' => true]);
    }

    private function productByName(string $name): Product
    {
        return Product::where('name', $name)->firstOrFail();
    }

    private function stockOf(Product $product, Warehouse $warehouse, float $qty): void
    {
        Stock::create([
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'quantity' => $qty,
        ]);
    }

    public function test_stock_index_shows_only_active_products(): void
    {
        $seedProduct = $this->productByName('Tissu coton blanc');
        $inactive = Product::factory()->create([
            'name' => 'Produit retiré',
            'status' => 'inactive',
            'category_id' => $seedProduct->category_id,
            'unit_id' => $seedProduct->unit_id,
        ]);

        $this->actingAs($this->admin)
            ->get(route('stock.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Stock/Index')
                ->has('products.data')
                ->has('warehouses', 2)
                ->whereNot('products.data', fn ($data) => collect($data)->contains('id', $inactive->id)));
    }

    public function test_stock_index_provides_total_quantity(): void
    {
        $tissu = $this->productByName('Tissu coton blanc');
        $this->stockOf($tissu, $this->warehouseA, 42.5);

        $this->actingAs($this->admin)
            ->get(route('stock.index'))
            ->assertInertia(fn ($page) => $page
                ->has('products.data')
                ->where('products.data', fn ($data) => (float) collect($data)->firstWhere('id', $tissu->id)['total_quantity'] === 42.5));
    }

    public function test_search_filters_by_name_or_sku(): void
    {
        $this->actingAs($this->admin)
            ->get(route('stock.index', ['search' => 'Tissu coton blanc']))
            ->assertInertia(fn ($page) => $page
                ->has('products.data', 1)
                ->where('products.data.0.name', 'Tissu coton blanc'));

        $product = $this->productByName('Tissu coton blanc');

        $this->actingAs($this->admin)
            ->get(route('stock.index', ['search' => $product->sku]))
            ->assertInertia(fn ($page) => $page
                ->has('products.data', 1)
                ->where('products.data.0.id', $product->id));
    }

    public function test_warehouse_filter_keeps_only_products_present_there(): void
    {
        $tissu = $this->productByName('Tissu coton blanc');
        $this->stockOf($tissu, $this->warehouseA, 10);

        $this->actingAs($this->admin)
            ->get(route('stock.index', ['warehouse_id' => $this->warehouseB->id]))
            ->assertInertia(fn ($page) => $page
                ->whereNot('products.data', fn ($data) => collect($data)->contains('id', $tissu->id)));

        $this->actingAs($this->admin)
            ->get(route('stock.index', ['warehouse_id' => $this->warehouseA->id]))
            ->assertInertia(fn ($page) => $page
                ->where('products.data.0.id', $tissu->id)
                ->has('products.data', 1));
    }

    public function test_low_filter_keeps_products_below_min_stock(): void
    {
        $tissu = $this->productByName('Tissu coton blanc'); // min_stock 20
        $soie = $this->productByName('Tissu soie rouge');   // min_stock 10

        $this->stockOf($tissu, $this->warehouseA, 5);
        $this->stockOf($soie, $this->warehouseA, 50);

        $this->actingAs($this->admin)
            ->get(route('stock.index', ['status' => 'low']))
            ->assertInertia(fn ($page) => $page
                ->has('products.data', 1)
                ->where('products.data.0.id', $tissu->id));
    }

    public function test_out_filter_includes_products_without_any_stock_row(): void
    {
        $tissu = $this->productByName('Tissu coton blanc');
        $this->stockOf($tissu, $this->warehouseA, 10);

        $this->actingAs($this->admin)
            ->get(route('stock.index', ['status' => 'out']))
            ->assertInertia(fn ($page) => $page
                ->has('products.data', Product::count() - 1)
                ->whereNot('products.data', fn ($data) => collect($data)->contains('id', $tissu->id)));
    }
}