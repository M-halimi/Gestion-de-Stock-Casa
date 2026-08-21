<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $units = Unit::all()->keyBy('abbreviation');
        $categories = Category::all()->keyBy('name');

        $products = [
            // [name, category, unit, purchase_price, sale_price, min_stock]
            ['Tissu coton blanc', 'Tissus', 'm', 25.00, 45.00, 20],
            ['Tissu coton bleu', 'Tissus', 'm', 28.00, 50.00, 20],
            ['Tissu soie rouge', 'Tissus', 'm', 80.00, 140.00, 10],
            ['Tissu jacquard noir', 'Tissus', 'm', 60.00, 110.00, 10],
            ['Fil polyester blanc', 'Fils', 'rl', 5.00, 12.00, 15],
            ['Fil polyester noir', 'Fils', 'rl', 5.00, 12.00, 15],
            ['Bouton chemise 15mm', 'Boutons', 'pqt', 3.50, 8.00, 30],
            ['Bouton gandoura 20mm', 'Boutons', 'pqt', 4.00, 9.00, 25],
            ['Fermeture éclair 20cm', 'Mercerie', 'pc', 2.50, 7.00, 40],
            ['Élastique 2cm', 'Mercerie', 'm', 1.50, 4.00, 50],
            ['Ruban satin 2cm', 'Accessoires', 'm', 1.20, 3.50, 50],
            ['Chemise homme manches longues', 'Vêtements finis', 'pc', 60.00, 150.00, 5],
            ['Jilbab noir', 'Vêtements finis', 'pc', 120.00, 280.00, 3],
            ['Gandoura beige', 'Vêtements finis', 'pc', 90.00, 220.00, 3],
        ];

        foreach ($products as [$name, $categoryName, $unitAbbr, $purchasePrice, $salePrice, $minStock]) {
            $prefix = 'PRD-' . strtoupper(substr(str_replace(' ', '', $name), 0, 3));

            $sku = $prefix . '-' . random_int(100, 999);
            while (Product::where('sku', $sku)->exists()) {
                $sku = $prefix . '-' . random_int(100, 999);
            }

            Product::firstOrCreate(
                ['name' => $name],
                [
                    'sku' => $sku,
                    'category_id' => $categories[$categoryName]->id,
                    'unit_id' => $units[$unitAbbr]->id,
                    'purchase_price' => $purchasePrice,
                    'sale_price' => $salePrice,
                    'min_stock' => $minStock,
                    'description' => null,
                    'image' => null,
                    'status' => 'active',
                ],
            );
        }
    }
}