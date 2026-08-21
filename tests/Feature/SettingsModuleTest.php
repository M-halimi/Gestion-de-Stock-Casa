<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SettingsModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed([
            \Database\Seeders\RolePermissionSeeder::class,
            \Database\Seeders\UserSeeder::class,
        ]);

        $this->admin = User::where('email', 'admin@demo.com')->firstOrFail();
        $this->manager = User::where('email', 'manager@demo.com')->firstOrFail();
    }

    public function test_non_admin_cannot_access_settings(): void
    {
        $this->actingAs($this->manager)->get(route('settings.index'))->assertForbidden();
        $this->actingAs($this->manager)->put(route('settings.update'), [])->assertForbidden();
    }

    public function test_admin_can_see_settings_page_with_defaults(): void
    {
        $this->actingAs($this->admin)
            ->get(route('settings.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Settings/Index')
                ->where('settings.company_name', SettingsService::DEFAULTS['company_name'])
                ->where('settings.currency_code', 'MAD')
                ->has('currencies'));
    }

    public function test_settings_are_shared_with_authenticated_users(): void
    {
        $this->actingAs($this->admin)
            ->get(route('settings.index'))
            ->assertInertia(fn ($page) => $page
                ->where('settings.company_name', 'Gestion Stock'));
    }

    public function test_admin_can_update_settings(): void
    {
        $this->actingAs($this->admin)
            ->put(route('settings.update'), [
                'company_name' => 'Mon Entreprise SARL',
                'currency_code' => 'EUR',
                'currency_symbol' => '€',
                'invoice_footer' => 'Merci de votre confiance.',
            ])
            ->assertRedirect(route('settings.index'))
            ->assertSessionHas('success', 'settings.updated');

        $this->assertDatabaseHas('settings', ['key' => 'company_name', 'value' => 'Mon Entreprise SARL']);
        $this->assertDatabaseHas('settings', ['key' => 'currency_code', 'value' => 'EUR']);

        $this->assertSame('Mon Entreprise SARL', app(SettingsService::class)->get('company_name'));
        $this->assertSame('€', app(SettingsService::class)->get('currency_symbol'));
    }

    public function test_update_clears_cache_and_defaults_persist(): void
    {
        Cache::rememberForever('app.settings', fn () => ['company_name' => 'Vieille valeur']);

        $this->actingAs($this->admin)
            ->put(route('settings.update'), [
                'company_name' => 'Nouvelle Société',
                'currency_code' => 'MAD',
                'currency_symbol' => 'DH',
                'invoice_footer' => '',
            ])
            ->assertRedirect(route('settings.index'));

        $this->assertSame('Nouvelle Société', app(SettingsService::class)->get('company_name'));
        $this->assertSame('DH', app(SettingsService::class)->get('currency_symbol'));
    }

    public function test_update_validates_fields(): void
    {
        $this->actingAs($this->admin)
            ->put(route('settings.update'), [
                'company_name' => '',
                'currency_code' => 'BTC',
                'currency_symbol' => 'Un symbole beaucoup trop long',
            ])
            ->assertSessionHasErrors(['company_name', 'currency_code', 'currency_symbol']);
    }
}