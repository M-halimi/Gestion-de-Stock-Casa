<?php

namespace App\Http\Controllers;

use App\Services\SettingsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __construct(private readonly SettingsService $settings) {}

    public function edit(): Response
    {
        return Inertia::render('Settings/Index', [
            'settings' => $this->settings->all(),
            'currencies' => SettingsService::CURRENCIES,
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'currency_code' => ['required', Rule::in(array_keys(SettingsService::CURRENCIES))],
            'currency_symbol' => ['required', 'string', 'max:8'],
            'invoice_footer' => ['nullable', 'string', 'max:1000'],
        ]);

        $this->settings->set([
            'company_name' => $data['company_name'],
            'currency_code' => $data['currency_code'],
            'currency_symbol' => $data['currency_symbol'],
            'invoice_footer' => $data['invoice_footer'] ?? '',
        ]);

        return redirect()
            ->route('settings.index')
            ->with('success', 'settings.updated');
    }
}