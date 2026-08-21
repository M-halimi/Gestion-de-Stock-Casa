<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            CategorySeeder::class,
            UnitSeeder::class,
            ProductSeeder::class,
            DemoDataSeeder::class,
            SalesPurchasesSeeder::class,
            ProductionSeeder::class,
            RolePermissionSeeder::class,
            UserSeeder::class,
        ]);
    }
}