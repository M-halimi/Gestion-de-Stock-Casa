<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
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
                    'password' => 'password',
                    'email_verified_at' => now(),
                ],
            );

            $user->syncRoles([$userData['role']]);
        }
    }
}