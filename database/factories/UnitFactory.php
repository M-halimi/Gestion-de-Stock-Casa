<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Unit>
 */
class UnitFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->randomElement(['Pièce', 'Mètre', 'Kilogramme', 'Rouleau', 'Paquet', 'Boîte']),
            'abbreviation' => fake()->unique()->randomElement(['pc', 'm', 'kg', 'rl', 'pqt', 'bx']),
        ];
    }
}