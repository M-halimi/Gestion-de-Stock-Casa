<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\InventoryAdjustmentItem>
 */
class InventoryAdjustmentItemFactory extends Factory
{
    public function definition(): array
    {
        $system = fake()->randomFloat(3, 0, 300);
        $counted = fake()->randomFloat(3, 0, 300);

        return [
            'inventory_adjustment_id' => \App\Models\InventoryAdjustment::factory(),
            'product_id' => \App\Models\Product::factory(),
            'system_quantity' => $system,
            'counted_quantity' => $counted,
            'difference' => round($counted - $system, 3),
            'reason' => fake()->optional()->sentence(),
        ];
    }
}