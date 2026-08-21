<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Sale>
 */
class SaleFactory extends Factory
{
    public function definition(): array
    {
        $subtotal = fake()->randomFloat(2, 50, 8000);
        $discount = fake()->randomElement([0, 0, 0, 10, 25, 50]);

        return [
            'reference' => 'VEN-' . fake()->unique()->numberBetween(1000, 9999),
            'customer_id' => \App\Models\Customer::factory(),
            'date' => fake()->dateTimeBetween('-6 months'),
            'subtotal' => $subtotal,
            'discount' => $discount,
            'total_amount' => max(0, round($subtotal - $discount, 2)),
            'status' => fake()->randomElement(['paid', 'paid', 'partial', 'cancelled']),
            'notes' => fake()->optional()->sentence(),
            'user_id' => null,
        ];
    }
}