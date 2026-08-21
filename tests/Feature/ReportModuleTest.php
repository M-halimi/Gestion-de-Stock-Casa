<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Warehouse $warehouse;

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

        $this->admin = User::where('email', 'admin@demo.com')->firstOrFail();
        $this->warehouse = Warehouse::where('is_active', true)->firstOrFail();
    }

    public function test_employee_cannot_access_reports(): void
    {
        $employee = User::where('email', 'employee@demo.com')->firstOrFail();

        $this->actingAs($employee)->get(route('reports.index'))->assertForbidden();
        $this->actingAs($employee)->get(route('reports.export', ['type' => 'stock', 'format' => 'csv']))->assertForbidden();
    }

    public function test_index_renders_stock_report_by_default(): void
    {
        $this->actingAs($this->admin)
            ->get(route('reports.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Reports/Index')
                ->where('active_type', 'stock')
                ->has('types', 4)
                ->has('summary.totals'));
    }

    public function test_stock_report_shows_value_and_status(): void
    {
        $product = Product::first();
        app(StockService::class)->increase($product, $this->warehouse, 10, 'Initial', StockMovement::TYPE_PURCHASE, null, null, $this->admin->id);

        $noStock = Product::create([
            'name' => 'Produit sans stock',
            'sku' => 'NOSTOCK-001',
            'status' => 'active',
            'category_id' => $product->category_id,
            'unit_id' => $product->unit_id,
            'purchase_price' => 5,
            'min_stock' => 0,
        ]);

        $this->actingAs($this->admin)
            ->get(route('reports.index', ['type' => 'stock']))
            ->assertInertia(fn ($page) => $page
                ->where('summary.totals.count', Product::count())
                ->where('summary.totals.out_count', 1)
                ->where('summary.totals.total_value', fn ($v) => $v > 0));

        $content = $this->actingAs($this->admin)
            ->get(route('reports.export', ['type' => 'stock', 'format' => 'csv']))
            ->assertOk()
            ->streamedContent();

        $this->assertStringContainsString($product->sku . ';', $content);
        $this->assertStringContainsString('NOSTOCK-001;0;0,00;out', $content);
    }

    public function test_purchases_report_respects_period(): void
    {
        $purchase = Purchase::factory()->create([
            'date' => now()->subDays(2)->toDateString(),
            'status' => 'received',
            'warehouse_id' => $this->warehouse->id,
            'total_amount' => 250,
        ]);
        $date = $purchase->date->toDateString();

        $this->actingAs($this->admin)
            ->get(route('reports.index', ['type' => 'purchases', 'from' => $date, 'to' => $date]))
            ->assertInertia(fn ($page) => $page
                ->where('summary.totals.count', 1)
                ->where('summary.preview.0.reference', $purchase->reference));

        $this->actingAs($this->admin)
            ->get(route('reports.index', ['type' => 'purchases', 'from' => $date, 'to' => $date, 'warehouse_id' => 999999]))
            ->assertInertia(fn ($page) => $page->where('summary.totals.count', 0));
    }

    public function test_sales_report_summary_totals(): void
    {
        $sale = Sale::factory()->create([
            'date' => now()->subDays(3)->toDateString(),
            'status' => 'confirmed',
            'warehouse_id' => $this->warehouse->id,
            'total_amount' => 300,
        ]);
        $date = $sale->date->toDateString();

        $this->actingAs($this->admin)
            ->get(route('reports.index', ['type' => 'sales', 'from' => $date, 'to' => $date]))
            ->assertInertia(fn ($page) => $page
                ->where('summary.totals.count', 1)
                ->where('summary.totals.total', 300)
                ->has('summary.period'));
    }

    public function test_movements_report_counts(): void
    {
        $product = Product::first();
        app(StockService::class)->increase($product, $this->warehouse, 5, 'Test', StockMovement::TYPE_PURCHASE, null, null, $this->admin->id);

        $this->actingAs($this->admin)
            ->get(route('reports.index', [
                'type' => 'movements',
                'from' => now()->subDay()->toDateString(),
                'to' => now()->addDay()->toDateString(),
            ]))
            ->assertInertia(fn ($page) => $page
                ->where('summary.totals.count', 1)
                ->where('summary.totals.in', 5));
    }

    public function test_export_csv_streams_utf8_file(): void
    {
        $response = $this->actingAs($this->admin)
            ->get(route('reports.export', ['type' => 'stock', 'format' => 'csv']))
            ->assertOk();

        $this->assertStringStartsWith('text/csv', $response->headers->get('content-type'));
        $this->assertStringContainsString('filename="rapport-stock.csv"', $response->headers->get('content-disposition'));

        $content = $response->streamedContent();

        $this->assertStringStartsWith("\xEF\xBB\xBF", $content);
        $this->assertStringContainsString('Produit;SKU;Quantité;Valeur;Statut', $content);
    }

    public function test_export_pdf_downloads_pdf(): void
    {
        $response = $this->actingAs($this->admin)
            ->get(route('reports.export', ['type' => 'sales', 'format' => 'pdf']))
            ->assertOk();

        $this->assertStringContainsString('application/pdf', $response->headers->get('content-type'));
        $this->assertStringContainsString('filename=rapport-sales.pdf', $response->headers->get('content-disposition'));
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_export_validates_type_and_format(): void
    {
        $this->actingAs($this->admin)
            ->get(route('reports.export', ['type' => 'bogus', 'format' => 'csv']))
            ->assertSessionHasErrors('type');

        $this->actingAs($this->admin)
            ->get(route('reports.export', ['type' => 'stock', 'format' => 'xlsx']))
            ->assertSessionHasErrors('format');
    }

    public function test_index_falls_back_to_stock_for_invalid_type(): void
    {
        $this->actingAs($this->admin)
            ->get(route('reports.index', ['type' => 'bogus']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('active_type', 'stock'));
    }
}