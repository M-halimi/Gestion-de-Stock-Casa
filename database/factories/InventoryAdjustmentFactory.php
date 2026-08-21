<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\InventoryAdjustment>
 */
class InventoryAdjustmentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'reference' => 'INV-' . fake()->unique()->numberBetween(1000, 9999),
            'warehouse_id' => \App\Models\Warehouse::factory(),
            'status' => fake()->randomElement(['draft', 'validated', 'validated', 'cancelled']),
            'notes' => fake()->optional()->sentence(),
            'user_id' => null,
        ];
    }
}