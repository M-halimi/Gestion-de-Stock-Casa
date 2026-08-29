<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Color;
use App\Models\Product;
use App\Models\Size;
use App\Models\Unit;
use App\Models\User;
use App\Services\ProductVariantService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosBarcodeTest extends TestCase
{
    use RefreshDatabase;

    public function test_pos_barcode_page_lists_variants_and_generates_pdf_labels(): void
    {
        $this->seed([
            \Database\Seeders\CategorySeeder::class,
            \Database\Seeders\UnitSeeder::class,
            \Database\Seeders\ColorSeeder::class,
            \Database\Seeders\SizeSeeder::class,
            \Database\Seeders\RolePermissionSeeder::class,
            \Database\Seeders\UserSeeder::class,
        ]);

        $admin = User::where('email', 'admin@demo.com')->firstOrFail();
        $product = Product::factory()->create([
            'name' => 'Barcode Label Shirt',
            'category_id' => Category::firstOrFail()->id,
            'unit_id' => Unit::firstOrFail()->id,
            'status' => 'active',
            'sale_price' => 149.5,
        ]);
        $variant = app(ProductVariantService::class)->sync($product, [[
            'color_id' => Color::where('name', 'Blue')->value('id'),
            'size_id' => Size::where('name', 'M')->value('id'),
            'barcode' => 'LBL-611000000001',
        ]])->firstOrFail();

        $this->actingAs($admin)
            ->get(route('pos.barcode'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('POS/Barcode')
                ->where('variants.0.product_name', 'Barcode Label Shirt')
                ->where('variants.0.color', 'Blue')
                ->where('variants.0.size', 'M')
                ->where('variants.0.barcode', 'LBL-611000000001'));

        $this->actingAs($admin)
            ->get(route('pos.barcode.print', [
                'items' => [[
                    'variant_id' => $variant->id,
                    'quantity' => 2,
                ]],
            ]))
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }
}
