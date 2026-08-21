<?php

namespace App\Services;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

class SettingsService
{
    private const CACHE_KEY = 'app.settings';

    public const DEFAULTS = [
        'company_name' => 'Gestion Stock',
        'currency_code' => 'MAD',
        'currency_symbol' => 'DH',
        'invoice_footer' => '',
    ];

    public const CURRENCIES = [
        'MAD' => 'DH',
        'DZD' => 'DA',
        'EUR' => '€',
        'USD' => '$',
        'TND' => 'DT',
        'SAR' => 'SR',
        'AED' => 'AED',
        'XOF' => 'FCFA',
    ];

    public function all(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            $values = Setting::pluck('value', 'key')->toArray();

            $settings = [];
            foreach (array_keys(self::DEFAULTS) as $key) {
                $settings[$key] = $values[$key] ?? self::DEFAULTS[$key];
            }

            return $settings;
        });
    }

    public function get(string $key, ?string $default = null): ?string
    {
        return $this->all()[$key] ?? $default;
    }

    public function set(array $values): void
    {
        foreach ($values as $key => $value) {
            Setting::updateOrCreate(
                ['key' => $key],
                ['value' => $value],
            );
        }

        Cache::forget(self::CACHE_KEY);
    }
}