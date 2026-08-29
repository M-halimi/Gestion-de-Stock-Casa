<?php

namespace App\Providers;

use App\Models\Category;
use App\Models\Color;
use App\Models\Customer;
use App\Models\InventoryAdjustment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductionOrder;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Setting;
use App\Models\Size;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Observers\AuditObserver;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(5)->by(
                $request->ip().'|'.strtolower((string) $request->input('email'))
            );
        });

        $auditableModels = [
            Category::class,
            Color::class,
            Customer::class,
            InventoryAdjustment::class,
            Product::class,
            ProductVariant::class,
            ProductionOrder::class,
            Purchase::class,
            Sale::class,
            Setting::class,
            Size::class,
            Supplier::class,
            Unit::class,
            User::class,
            Warehouse::class,
        ];

        foreach ($auditableModels as $model) {
            $model::observe(AuditObserver::class);
        }
    }
}
