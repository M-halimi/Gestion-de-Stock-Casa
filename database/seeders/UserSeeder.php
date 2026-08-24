<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use RuntimeException;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $demoPassword = env('DEMO_USER_PASSWORD');

        if (blank($demoPassword)) {
            if (app()->environment('production')) {
                throw new RuntimeException('DEMO_USER_PASSWORD must be set before seeding demo users in production.');
            }

            $demoPassword = Str::random(32);
        }

        $users = [
            ['name' => 'Admin', 'email' => 'admin@demo.com', 'role' => 'Admin'],
            ['name' => 'Manager', 'email' => 'manager@demo.com', 'role' => 'Manager'],
            ['name' => 'Employee', 'email' => 'employee@demo.com', 'role' => 'Employee'],
        ];

        foreach ($users as $userData) {
            $user = User::firstOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'password' => $demoPassword,
                    'email_verified_at' => now(),
                ],
            );

            $user->syncRoles([$userData['role']]);
        }
    }
}
