<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Warehouse>
 */
class WarehouseFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->randomElement([
                'Entrepôt principal', 'Atelier de couture', 'Magasin de vente', 'Réserve',
            ]),
            'code' => fake()->unique()->regexify('[A-Z]{3}'),
            'address' => fake()->optional()->address(),
            'is_active' => true,
        ];
    }
}