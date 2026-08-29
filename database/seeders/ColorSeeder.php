<?php

namespace Database\Seeders;

use App\Models\Color;
use Illuminate\Database\Seeder;

class ColorSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['name' => 'Black', 'code' => '#000000'],
            ['name' => 'White', 'code' => '#FFFFFF'],
            ['name' => 'Blue', 'code' => '#2563EB'],
            ['name' => 'Red', 'code' => '#DC2626'],
            ['name' => 'Green', 'code' => '#16A34A'],
            ['name' => 'Navy', 'code' => '#1E3A8A'],
            ['name' => 'Grey', 'code' => '#6B7280'],
        ] as $color) {
            Color::updateOrCreate(['name' => $color['name']], $color + ['is_active' => true]);
        }
    }
}
