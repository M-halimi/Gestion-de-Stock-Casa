<?php

namespace Database\Seeders;

use App\Models\Unit;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    public function run(): void
    {
        $units = [
            ['name' => 'Pièce', 'abbreviation' => 'pc'],
            ['name' => 'Mètre', 'abbreviation' => 'm'],
            ['name' => 'Rouleau', 'abbreviation' => 'rl'],
            ['name' => 'Kilogramme', 'abbreviation' => 'kg'],
            ['name' => 'Paquet', 'abbreviation' => 'pqt'],
            ['name' => 'Boîte', 'abbreviation' => 'bx'],
        ];

        foreach ($units as $unit) {
            Unit::firstOrCreate($unit);
        }
    }
}