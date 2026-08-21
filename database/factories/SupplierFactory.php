<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Supplier>
 */
class SupplierFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->randomElement([
                'Tissus Benjelloun', 'Mercerie Atlas', 'Textile Casablanca', 'Fournitures Fès',
                'Import Tissus Maroc', 'Boutons & Cie',
            ]),
            'contact_person' => fake()->name(),
            'phone' => fake()->numerify('06########'),
            'email' => fake()->unique()->safeEmail(),
            'address' => fake()->address(),
        ];
    }
}