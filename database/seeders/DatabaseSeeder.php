<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // Core data: always seeded (roles, permissions, users).
        $this->call([
            RolePermissionSeeder::class,
            UserSeeder::class,
        ]);

        // Demo data: never seeded in production.
        if (! app()->environment('production')) {
            $this->call([
                CategorySeeder::class,
                UnitSeeder::class,
                ProductSeeder::class,
                DemoDataSeeder::class,
                SalesPurchasesSeeder::class,
                ProductionSeeder::class,
            ]);
        }
    }
}
