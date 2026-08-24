<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SecurityTest extends TestCase
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

    public function test_security_headers_are_present(): void
    {
        $response = $this->get('/');

        $response->assertOk();
        $response->assertHeader('X-Content-Type-Options', 'nosniff');
        $response->assertHeader('X-Frame-Options', 'DENY');
        $response->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->assertHeader('Permissions-Policy');
    }

    public function test_login_is_rate_limited_after_five_failures(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', [
                'email' => 'admin@demo.com',
                'password' => 'wrong-password',
            ])->assertStatus(302);
        }

        $this->post('/login', [
            'email' => 'admin@demo.com',
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }

    public function test_public_registration_is_disabled(): void
    {
        $this->get('/register')->assertNotFound();
        $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'A-strong-password-123!',
            'password_confirmation' => 'A-strong-password-123!',
        ])->assertNotFound();
    }

    public function test_forgot_password_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->post('/forgot-password', ['email' => 'admin@demo.com']);
        }

        $this->post('/forgot-password', ['email' => 'admin@demo.com'])->assertStatus(429);
    }
}
