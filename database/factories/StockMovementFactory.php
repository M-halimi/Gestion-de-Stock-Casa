<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\StockMovement>
 */
class StockMovementFactory extends Factory
{
    public function definition(): array
    {
        $isIncrease = fake()->boolean();

        return [
            'product_id' => \App\Models\Product::factory(),
            'warehouse_id' => \App\Models\Warehouse::factory(),
            'type' => fake()->randomElement(['purchase', 'sale', 'adjustment', 'transfer_in', 'transfer_out']),
            'quantity' => $isIncrease
                ? fake()->randomFloat(3, 1, 100)
                : -fake()->randomFloat(3, 1, 100),
            'reason' => fake()->optional()->sentence(),
            'reference_type' => null,
            'reference_id' => null,
            'user_id' => null,
        ];
    }
}