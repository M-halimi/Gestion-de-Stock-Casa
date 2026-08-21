<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermissionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            \Database\Seeders\CategorySeeder::class,
            \Database\Seeders\UnitSeeder::class,
            \Database\Seeders\ProductSeeder::class,
            \Database\Seeders\DemoDataSeeder::class,
            \Database\Seeders\RolePermissionSeeder::class,
            \Database\Seeders\UserSeeder::class,
        ]);
    }

    public function test_admin_can_access_users_page(): void
    {
        $admin = User::where('email', 'admin@demo.com')->first();

        $this->actingAs($admin)
            ->get('/users')
            ->assertOk();
    }

    public function test_manager_cannot_access_users_page(): void
    {
        $manager = User::where('email', 'manager@demo.com')->first();

        $this->actingAs($manager)
            ->get('/users')
            ->assertForbidden();
    }

    public function test_employee_cannot_access_users_page(): void
    {
        $employee = User::where('email', 'employee@demo.com')->first();

        $this->actingAs($employee)
            ->get('/users')
            ->assertForbidden();
    }

    public function test_employee_cannot_access_settings_page(): void
    {
        $employee = User::where('email', 'employee@demo.com')->first();

        $this->actingAs($employee)
            ->get('/settings')
            ->assertForbidden();
    }

    public function test_employee_can_access_dashboard(): void
    {
        $employee = User::where('email', 'employee@demo.com')->first();

        $this->actingAs($employee)
            ->get('/dashboard')
            ->assertOk();
    }

    public function test_guest_is_redirected_to_login(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }
}
