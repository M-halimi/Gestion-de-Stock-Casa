<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Purchase>
 */
class PurchaseFactory extends Factory
{
    public function definition(): array
    {
        return [
            'reference' => 'ACH-' . fake()->unique()->numberBetween(1000, 9999),
            'supplier_id' => \App\Models\Supplier::factory(),
            'date' => fake()->dateTimeBetween('-6 months'),
            'total_amount' => fake()->randomFloat(2, 100, 10000),
            'status' => fake()->randomElement(['pending', 'received', 'received', 'cancelled']),
            'notes' => fake()->optional()->sentence(),
            'user_id' => null,
        ];
    }
}