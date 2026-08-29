<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Color;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Size;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\ProductVariantService;
use App\Services\StockService;
use App\Services\BarcodeResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Tests\TestCase;

class ProductVariantModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Product $product;
    private Warehouse $warehouse;
    private Color $blue;
    private Color $black;
    private Size $m;
    private Size $l;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            \Database\Seeders\CategorySeeder::class,
            \Database\Seeders\UnitSeeder::class,
            \Database\Seeders\ColorSeeder::class,
            \Database\Seeders\SizeSeeder::class,
            \Database\Seeders\RolePermissionSeeder::class,
            \Database\Seeders\UserSeeder::class,
        ]);

        $this->admin = User::where('email', 'admin@demo.com')->firstOrFail();
        $this->warehouse = Warehouse::create(['name' => 'Warehouse Test', 'code' => 'VAR-TST', 'is_active' => true]);
        $this->product = Product::factory()->create([
            'name' => 'T-Shirt variant test',
            'barcode' => null,
            'category_id' => Category::first()->id,
            'unit_id' => Unit::first()->id,
            'status' => 'active',
        ]);
        $this->blue = Color::where('name', 'Blue')->firstOrFail();
        $this->black = Color::where('name', 'Black')->firstOrFail();
        $this->m = Size::where('name', 'M')->firstOrFail();
        $this->l = Size::where('name', 'L')->firstOrFail();
    }

    private function createVariants(): array
    {
        return app(ProductVariantService::class)->sync($this->product, [
            ['color_id' => $this->blue->id, 'size_id' => $this->m->id, 'barcode' => '611000000001', 'initial_stock' => 10],
            ['color_id' => $this->blue->id, 'size_id' => $this->l->id, 'barcode' => '611000000002', 'initial_stock' => 20],
            ['color_id' => $this->black->id, 'size_id' => $this->m->id, 'barcode' => '611000000003', 'initial_stock' => 30],
        ], $this->warehouse->id)->all();
    }

    public function test_stock_isolated_per_variant(): void
    {
        [$blueM, $blueL, $blackM] = $this->createVariants();

        app(StockService::class)->decrease($blueL, $this->warehouse, 1, 'Barcode stock out', StockMovement::TYPE_BARCODE_OUT);

        $this->assertSame(10.0, (float) $blueM->totalQuantity($this->warehouse->id));
        $this->assertSame(19.0, (float) $blueL->fresh()->totalQuantity($this->warehouse->id));
        $this->assertSame(30.0, (float) $blackM->totalQuantity($this->warehouse->id));
        $this->assertDatabaseHas('stock_movements', [
            'product_variant_id' => $blueL->id,
            'type' => StockMovement::TYPE_BARCODE_OUT,
            'quantity' => 1,
        ]);
    }

    public function test_duplicate_variant_combination_and_barcode_are_rejected(): void
    {
        $this->createVariants();

        $this->expectException(InvalidArgumentException::class);
        app(ProductVariantService::class)->sync($this->product, [
            ['color_id' => $this->blue->id, 'size_id' => $this->m->id, 'barcode' => '611000000004'],
            ['color_id' => $this->blue->id, 'size_id' => $this->m->id, 'barcode' => '611000000005'],
        ]);
    }

    public function test_barcode_lookup_and_stock_out_route_target_exact_variant(): void
    {
        [, $blueL] = $this->createVariants();

        $this->actingAs($this->admin)
            ->get(route('stock.barcode.lookup', ['barcode' => '611000000002']))
            ->assertOk()
            ->assertJsonPath('product.name', 'T-Shirt variant test')
            ->assertJsonPath('label', 'Blue / L');

        $this->actingAs($this->admin)
            ->post(route('stock.barcode.out'), [
                'variant_id' => $blueL->id,
                'warehouse_id' => $this->warehouse->id,
                'quantity' => 1,
            ])
            ->assertRedirect()
            ->assertSessionHas('success', 'barcode.stock_out_success');

        $this->assertSame(19.0, (float) $blueL->fresh()->totalQuantity($this->warehouse->id));
        $this->assertSame(10.0, (float) ProductVariant::where('barcode', '611000000001')->first()->totalQuantity($this->warehouse->id));
        $this->assertSame(30.0, (float) ProductVariant::where('barcode', '611000000003')->first()->totalQuantity($this->warehouse->id));
    }

    public function test_resolver_returns_product_for_base_barcode_and_preserves_leading_zeroes(): void
    {
        $product = Product::factory()->create([
            'barcode' => '000123456789',
            'status' => 'active',
            'category_id' => Category::first()->id,
            'unit_id' => Unit::first()->id,
        ]);
        $legacy = app(ProductVariantService::class)->ensureLegacyVariant($product);

        $result = app(BarcodeResolver::class)->resolve(" 000 123456789 ");

        $this->assertSame(BarcodeResolver::STATUS_FOUND, $result['status']);
        $this->assertSame('product', $result['match']);
        $this->assertSame('000123456789', $result['barcode']);
        $this->assertSame($product->id, $result['product']['id']);
        $this->assertNull($result['variant']);
        $this->assertSame($legacy->id, $result['variant_id']);
    }

    public function test_new_variant_gets_a_database_backed_code_and_base_barcode(): void
    {
        $product = Product::factory()->create([
            'barcode' => '9999999999',
            'status' => 'active',
            'category_id' => Category::first()->id,
            'unit_id' => Unit::first()->id,
        ]);

        $variant = app(ProductVariantService::class)->sync($product, [[
            'color_id' => $this->blue->id,
            'size_id' => $this->m->id,
            'barcode' => '',
        ]])->firstOrFail();

        $expectedCode = (string) $this->m->id . $this->blue->id;
        $this->assertSame($expectedCode, $variant->variant_code);
        $this->assertSame('9999999999' . $expectedCode, $variant->barcode);

        $resolved = app(BarcodeResolver::class)->resolve($variant->barcode);
        $this->assertSame('variant', $resolved['match']);
        $this->assertSame($variant->id, $resolved['variant_id']);
        $this->assertSame('Blue / M', $resolved['label']);
    }

    public function test_inactive_variant_is_not_fallen_back_to_the_product(): void
    {
        $variant = app(ProductVariantService::class)->sync($this->product, [[
            'color_id' => $this->blue->id,
            'size_id' => $this->m->id,
            'barcode' => '000000000001',
            'status' => 'inactive',
        ]])->firstOrFail();

        $result = app(BarcodeResolver::class)->resolve($variant->barcode);

        $this->assertSame(BarcodeResolver::STATUS_INACTIVE, $result['status']);
        $this->assertSame('variant', $result['match']);
        $this->assertSame($variant->id, $result['variant_id']);
    }
}
