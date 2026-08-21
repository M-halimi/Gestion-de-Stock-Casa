<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Stock;
use App\Models\Supplier;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        $suppliers = [
            'Tissus Benjelloun',
            'Mercerie Atlas',
            'Textile Casa Import',
            'Fournitures Fès',
        ];

        foreach ($suppliers as $name) {
            Supplier::firstOrCreate(['name' => $name], [
                'contact_person' => fake()->name(),
                'phone' => fake()->numerify('06########'),
                'email' => fake()->unique()->safeEmail(),
                'address' => fake()->address(),
            ]);
        }

        Customer::factory()->count(15)->create();

        $warehouses = [
            ['name' => 'Entrepôt principal', 'code' => 'ENT1'],
            ['name' => 'Atelier de couture', 'code' => 'ATE1'],
            ['name' => 'Magasin de vente', 'code' => 'MAG1'],
        ];

        foreach ($warehouses as $warehouse) {
            Warehouse::firstOrCreate(['code' => $warehouse['code']], [
                'name' => $warehouse['name'],
                'address' => fake()->optional()->address(),
                'is_active' => true,
            ]);
        }

        $products = Product::all();
        $warehouseIds = Warehouse::pluck('id')->all();

        foreach ($products as $product) {
            foreach ($warehouseIds as $warehouseId) {
                if (fake()->boolean(80)) {
                    Stock::create([
                        'product_id' => $product->id,
                        'warehouse_id' => $warehouseId,
                        'quantity' => fake()->randomFloat(3, 0, 300),
                    ]);
                }
            }
        }
    }
}