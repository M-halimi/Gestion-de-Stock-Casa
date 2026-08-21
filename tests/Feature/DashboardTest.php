<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
    }

    protected function admin(): User
    {
        return User::where('email', 'admin@demo.com')->first();
    }

    protected function employee(): User
    {
        return User::where('email', 'employee@demo.com')->first();
    }

    public function test_admin_can_view_full_dashboard(): void
    {
        $response = $this->actingAs($this->admin())->get('/dashboard')->assertOk();

        foreach (['kpis', 'sales_trend', 'comparison', 'top_products', 'low_stock', 'movements', 'recent_purchases', 'recent_sales', 'insights'] as $prop) {
            $this->assertArrayHasKey($prop, $response->viewData('page')['props']);
        }
    }

    public function test_stock_value_matches_stocks_times_purchase_price(): void
    {
        $expected = Stock::query()
            ->join('products', 'products.id', '=', 'stocks.product_id')
            ->where('products.status', 'active')
            ->selectRaw('SUM(stocks.quantity * products.purchase_price) as value')
            ->value('value');

        $kpis = $this->actingAs($this->admin())
            ->get('/dashboard')
            ->viewData('page')['props']['kpis'];

        $this->assertEqualsWithDelta(round((float) $expected, 2), $kpis['stock_value'], 0.01);
    }

    public function test_low_and_out_of_stock_counts_match_database(): void
    {
        $products = Product::withSum('stocks as total_qty', 'quantity')->where('status', 'active')->get();

        $expectedLow = $products->filter(fn ($p) => (float) $p->total_qty > 0 && (float) $p->min_stock > 0 && (float) $p->total_qty <= (float) $p->min_stock)->count();
        $expectedOut = $products->filter(fn ($p) => (float) $p->total_qty <= 0)->count();

        $kpis = $this->actingAs($this->admin())
            ->get('/dashboard')
            ->viewData('page')['props']['kpis'];

        $this->assertSame($expectedLow, $kpis['low_stock']);
        $this->assertSame($expectedOut, $kpis['out_of_stock']);
    }

    public function test_sales_trend_excludes_cancelled_sales(): void
    {
        $this->assertGreaterThan(0, Sale::where('status', 'cancelled')->count());

        $trend = $this->actingAs($this->admin())
            ->get('/dashboard?period=30d')
            ->viewData('page')['props']['sales_trend'];

        $expected = Sale::where('status', '!=', 'cancelled')
            ->whereBetween('date', [now()->subDays(29)->startOfDay(), now()->endOfDay()])
            ->sum('total_amount');

        $this->assertEqualsWithDelta(round((float) $expected, 2), round(array_sum(array_column($trend, 'sales')), 2), 0.01);
    }

    public function test_comparison_excludes_cancelled_documents(): void
    {
        $comparison = $this->actingAs($this->admin())
            ->get('/dashboard?period=30d')
            ->viewData('page')['props']['comparison'];

        $expectedSales = Sale::where('status', '!=', 'cancelled')
            ->whereBetween('date', [now()->subDays(29)->startOfDay(), now()->endOfDay()])
            ->sum('total_amount');
        $expectedPurchases = Purchase::where('status', '!=', 'cancelled')
            ->whereBetween('date', [now()->subDays(29)->startOfDay(), now()->endOfDay()])
            ->sum('total_amount');

        $this->assertEqualsWithDelta(round((float) $expectedSales, 2), round(array_sum(array_column($comparison, 'sales')), 2), 0.01);
        $this->assertEqualsWithDelta(round((float) $expectedPurchases, 2), round(array_sum(array_column($comparison, 'purchases')), 2), 0.01);
    }

    public function test_period_filter_changes_trend_length(): void
    {
        $props7 = $this->actingAs($this->admin())->get('/dashboard?period=7d')->viewData('page')['props'];
        $props30 = $this->actingAs($this->admin())->get('/dashboard?period=30d')->viewData('page')['props'];

        $this->assertCount(7, $props7['sales_trend']);
        $this->assertCount(30, $props30['sales_trend']);
        $this->assertSame('dashboard.periods.7d', $props7['period']['label']);
    }

    public function test_top_products_by_revenue_orders_by_revenue(): void
    {
        $props = $this->actingAs($this->admin())
            ->get('/dashboard?by=revenue&period=30d')
            ->viewData('page')['props'];

        $top = $props['top_products'];

        if (count($top) >= 2) {
            $this->assertGreaterThanOrEqual($top[1]['total_revenue'], $top[0]['total_revenue']);
        }
        $this->assertSame('revenue', $props['filters']['by']);
    }

    public function test_low_stock_search_filters_products(): void
    {
        $name = Product::factory()->create([
            'status' => 'active',
            'min_stock' => 10,
            'category_id' => \App\Models\Category::first()->id,
            'unit_id' => \App\Models\Unit::first()->id,
        ])->name;

        $props = $this->actingAs($this->admin())
            ->get('/dashboard?' . http_build_query(['search' => $name]))
            ->viewData('page')['props'];

        $this->assertGreaterThan(0, $props['low_stock']['total']);
        $this->assertStringContainsString($name, $props['low_stock']['data'][0]['name']);
    }

    public function test_employee_does_not_receive_purchase_data(): void
    {
        $props = $this->actingAs($this->employee())->get('/dashboard')->viewData('page')['props'];

        $this->assertNull($props['recent_purchases']);
        $this->assertNotNull($props['recent_sales']);
        $this->assertNotNull($props['kpis']);
        $this->assertNull($props['comparison']['0']['purchases'] ?? null);

        foreach ($props['comparison'] as $row) {
            $this->assertArrayNotHasKey('purchases', $row);
        }

        foreach ($props['insights'] as $insight) {
            $this->assertNotSame('dashboard.insights.purchases_period', $insight['key']);
        }
    }

    public function test_employee_has_no_access_without_permission(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get('/dashboard')->assertForbidden();
    }
}
