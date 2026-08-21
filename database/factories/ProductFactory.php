<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Product>
 */
class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->randomElement([
                'Tissu coton blanc', 'Tissu coton bleu', 'Tissu soie rouge', 'Bouton chemise 15mm',
                'Fil polyester blanc', 'Fil polyester noir', 'Fermeture éclair 20cm', 'Ruban satin 2cm',
                'Chemise homme manches longues', 'Jilbab noir', 'Gandoura beige', 'Élastique 2cm',
            ]),
            'sku' => strtoupper('SKU-' . fake()->unique()->numberBetween(1000, 9999)),
            'barcode' => fake()->optional()->ean13(),
            'category_id' => \App\Models\Category::factory(),
            'unit_id' => \App\Models\Unit::factory(),
            'purchase_price' => fake()->randomFloat(2, 5, 300),
            'sale_price' => fake()->randomFloat(2, 10, 500),
            'min_stock' => fake()->randomElement([0, 5, 10, 20]),
            'description' => fake()->sentence(),
            'image' => null,
            'status' => fake()->randomElement(['active', 'active', 'active', 'inactive']),
        ];
    }
}