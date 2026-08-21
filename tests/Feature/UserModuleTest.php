<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class UserModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $manager;
    private User $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            \Database\Seeders\RolePermissionSeeder::class,
            \Database\Seeders\UserSeeder::class,
        ]);

        $this->admin = User::where('email', 'admin@demo.com')->firstOrFail();
        $this->manager = User::where('email', 'manager@demo.com')->firstOrFail();
        $this->employee = User::where('email', 'employee@demo.com')->firstOrFail();
    }

    public function test_non_admin_cannot_access_users(): void
    {
        $this->actingAs($this->manager)->get(route('users.index'))->assertForbidden();
        $this->actingAs($this->employee)->get(route('users.create'))->assertForbidden();
        $this->actingAs($this->employee)->get(route('users.index'))->assertForbidden();
    }

    public function test_admin_index_renders_users_and_roles(): void
    {
        $this->actingAs($this->admin)
            ->get(route('users.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Users/Index')
                ->has('users.data', 3)
                ->has('roles', 3));
    }

    public function test_index_filters_by_search_and_role(): void
    {
        $this->actingAs($this->admin)
            ->get(route('users.index', ['search' => 'manager']))
            ->assertInertia(fn ($page) => $page
                ->has('users.data', 1)
                ->where('users.data.0.email', 'manager@demo.com'));

        $this->actingAs($this->admin)
            ->get(route('users.index', ['role' => 'Manager']))
            ->assertInertia(fn ($page) => $page
                ->has('users.data', 1)
                ->where('users.data.0.email', 'manager@demo.com'));
    }

    public function test_admin_can_create_user_with_role(): void
    {
        $this->actingAs($this->admin)
            ->post(route('users.store'), [
                'name' => 'Nouveau Comptable',
                'email' => 'compta@demo.com',
                'role' => 'Manager',
                'password' => 'secret123',
                'password_confirmation' => 'secret123',
            ])
            ->assertRedirect(route('users.index'))
            ->assertSessionHas('success', 'users.created');

        $user = User::where('email', 'compta@demo.com')->firstOrFail();
        $this->assertTrue(Hash::check('secret123', $user->password));
        $this->assertTrue($user->hasRole('Manager'));
    }

    public function test_create_validates_email_and_password(): void
    {
        $this->actingAs($this->admin)
            ->post(route('users.store'), [
                'name' => 'Duplicata',
                'email' => 'admin@demo.com',
                'role' => 'Manager',
                'password' => 'secret123',
                'password_confirmation' => 'secret123',
            ])
            ->assertSessionHasErrors('email');

        $this->actingAs($this->admin)
            ->post(route('users.store'), [
                'name' => 'Faible',
                'email' => 'faible@demo.com',
                'role' => 'Manager',
                'password' => 'court',
                'password_confirmation' => 'court',
            ])
            ->assertSessionHasErrors('password');
    }

    public function test_update_without_password_keeps_password(): void
    {
        $originalHash = $this->manager->password;

        $this->actingAs($this->admin)
            ->put(route('users.update', $this->manager->id), [
                'name' => 'Manager Renommé',
                'email' => 'manager@demo.com',
                'role' => 'Employee',
                'password' => '',
            ])
            ->assertRedirect(route('users.index'))
            ->assertSessionHas('success', 'users.updated');

        $this->manager->refresh();
        $this->assertSame($originalHash, $this->manager->password);
        $this->assertSame('Manager Renommé', $this->manager->name);
        $this->assertTrue($this->manager->hasRole('Employee'));
    }

    public function test_update_with_password_changes_it(): void
    {
        $this->actingAs($this->admin)
            ->put(route('users.update', $this->manager->id), [
                'name' => $this->manager->name,
                'email' => $this->manager->email,
                'role' => 'Manager',
                'password' => 'nouveau123',
                'password_confirmation' => 'nouveau123',
            ])
            ->assertRedirect(route('users.index'));

        $this->manager->refresh();
        $this->assertTrue(Hash::check('nouveau123', $this->manager->password));
    }

    public function test_cannot_delete_self(): void
    {
        $this->actingAs($this->admin)
            ->delete(route('users.destroy', $this->admin->id))
            ->assertSessionHas('error', 'users.self_delete');

        $this->assertDatabaseHas('users', ['id' => $this->admin->id]);
    }

    public function test_cannot_delete_or_demote_last_admin(): void
    {
        $this->actingAs($this->admin)
            ->delete(route('users.destroy', $this->admin->id))
            ->assertSessionHas('error', 'users.self_delete');

        $this->actingAs($this->admin)
            ->put(route('users.update', $this->admin->id), [
                'name' => $this->admin->name,
                'email' => $this->admin->email,
                'role' => 'Employee',
            ])
            ->assertSessionHas('error', 'users.last_admin');

        $this->assertTrue($this->admin->hasRole('Admin'));
    }

    public function test_can_delete_user_when_another_admin_exists(): void
    {
        $secondAdmin = User::create([
            'name' => 'Second Admin',
            'email' => 'admin2@demo.com',
            'password' => 'secret123',
        ]);
        $secondAdmin->assignRole('Admin');

        $this->actingAs($this->admin)
            ->delete(route('users.destroy', $this->manager->id))
            ->assertRedirect(route('users.index'))
            ->assertSessionHas('success', 'users.deleted');

        $this->assertDatabaseMissing('users', ['id' => $this->manager->id]);

        $this->actingAs($this->admin)
            ->delete(route('users.destroy', $secondAdmin->id))
            ->assertSessionHas('success', 'users.deleted');

        $this->assertDatabaseMissing('users', ['id' => $secondAdmin->id]);
    }
}