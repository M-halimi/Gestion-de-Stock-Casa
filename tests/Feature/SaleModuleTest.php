<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\SaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SaleModuleTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private Warehouse $warehouse;
    private Customer $customer;
    private Product $tissu;
    private Product $bouton;

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

        $category = Category::first();
        $unit = Unit::first();

        $this->warehouse = Warehouse::create([
            'name' => 'Entrepôt Test',
            'code' => 'ENT-TST',
            'is_active' => true,
        ]);

        $this->customer = Customer::factory()->create(['name' => 'Client Test']);

        $this->tissu = Product::factory()->create([
            'name' => 'Tissu test',
            'status' => 'active',
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'sale_price' => 30,
        ]);

        $this->bouton = Product::factory()->create([
            'name' => 'Bouton test',
            'status' => 'active',
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'sale_price' => 3,
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'customer_id' => $this->customer->id,
            'warehouse_id' => $this->warehouse->id,
            'date' => now()->toDateString(),
            'notes' => null,
            'items' => [
                ['product_id' => $this->tissu->id, 'quantity' => 5, 'unit_price' => 30, 'discount' => 1, 'tax' => 2],
                ['product_id' => $this->bouton->id, 'quantity' => 10, 'unit_price' => 3, 'discount' => 0, 'tax' => 0],
            ],
        ], $overrides);
    }

    private function createSale(): Sale
    {
        return app(SaleService::class)->create($this->payload());
    }

    private function stock(float $qty): void
    {
        Stock::updateOrCreate(
            [
                'product_id' => $this->tissu->id,
                'warehouse_id' => $this->warehouse->id,
            ],
            ['quantity' => $qty]
        );
        Stock::updateOrCreate(
            [
                'product_id' => $this->bouton->id,
                'warehouse_id' => $this->warehouse->id,
            ],
            ['quantity' => $qty]
        );
    }

    public function test_admin_can_access_sales_index(): void
    {
        $this->actingAs($this->admin)
            ->get(route('sales.index'))
            ->assertOk();
    }

    public function test_admin_can_download_and_print_sale_invoice(): void
    {
        $sale = $this->createSale();

        $response = $this->actingAs($this->admin)
            ->get(route('sales.invoice', $sale))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringContainsString('facture-' . $sale->reference . '.pdf', $response->headers->get('Content-Disposition'));

        $this->actingAs($this->admin)
            ->get(route('sales.invoice.print', $sale))
            ->assertOk()
            ->assertHeader('Content-Type', 'text/html; charset=UTF-8')
            ->assertSee($sale->reference)
            ->assertSee('Tissu test');

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'invoice_downloaded',
            'entity_type' => 'Sale',
            'entity_id' => $sale->id,
        ]);
    }

    public function test_employee_with_sales_view_permission_can_download_sale_invoice(): void
    {
        $sale = $this->createSale();
        $employee = User::where('email', 'employee@demo.com')->firstOrFail();

        $this->actingAs($employee)
            ->get(route('sales.invoice', $sale))
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_employee_can_view_create_and_confirm_but_not_cancel_or_delete(): void
    {
        $employee = User::where('email', 'employee@demo.com')->firstOrFail();

        $this->actingAs($employee)->get(route('sales.index'))->assertOk();
        $this->actingAs($employee)->get(route('sales.create'))->assertOk();

        $sale = $this->createSale();
        $this->actingAs($employee)->post(route('sales.confirm', $sale))->assertRedirect();
        $this->actingAs($employee)->post(route('sales.cancel', $sale))->assertForbidden();
        $this->actingAs($employee)->delete(route('sales.destroy', $sale))->assertForbidden();
    }

    public function test_create_sale_does_not_change_stock(): void
    {
        $this->actingAs($this->admin)
            ->post(route('sales.store'), $this->payload())
            ->assertRedirect()
            ->assertSessionHas('success', 'sales.created');

        $sale = Sale::where('customer_id', $this->customer->id)->firstOrFail();

        $this->assertSame(Sale::STATUS_DRAFT, $sale->status);
        $this->assertStringStartsWith('VEN-' . now()->format('Ymd') . '-', $sale->reference);
        $this->assertSame('180.00', (string) $sale->subtotal);
        $this->assertSame('1.00', (string) $sale->discount);
        $this->assertSame('2.00', (string) $sale->tax);
        $this->assertSame('181.00', (string) $sale->total_amount);

        $this->assertFalse(Stock::where('warehouse_id', $this->warehouse->id)->exists());
        $this->assertSame(0, StockMovement::where('reference_type', Sale::class)->count());
    }

    public function test_confirm_decreases_stock_and_creates_movements(): void
    {
        $this->stock(50);
        $sale = $this->createSale();

        $this->actingAs($this->admin)
            ->post(route('sales.confirm', $sale))
            ->assertRedirect()
            ->assertSessionHas('success', 'sales.confirmed');

        $this->assertSame(Sale::STATUS_CONFIRMED, $sale->fresh()->status);

        $this->assertSame(45.0, (float) $this->tissu->totalQuantity($this->warehouse->id));
        $this->assertSame(40.0, (float) $this->bouton->totalQuantity($this->warehouse->id));

        $this->assertDatabaseHas('stock_movements', [
            'type' => StockMovement::TYPE_SALE,
            'product_id' => $this->tissu->id,
            'quantity' => 5,
            'reference_type' => Sale::class,
            'reference_id' => $sale->id,
            'warehouse_id' => $this->warehouse->id,
        ]);
        $this->assertSame(2, StockMovement::where('reference_type', Sale::class)
            ->where('reference_id', $sale->id)->count());
    }

    public function test_confirm_fails_when_stock_short_and_rolls_back(): void
    {
        $this->stock(3);
        $sale = $this->createSale();

        $this->actingAs($this->admin)
            ->post(route('sales.confirm', $sale))
            ->assertRedirect()
            ->assertSessionHas('error', function (string $error) {
                return str_contains($error, 'available 3') && str_contains($error, 'requested 5');
            });

        $this->assertSame(Sale::STATUS_DRAFT, $sale->fresh()->status);
        $this->assertSame(0, StockMovement::where('reference_type', Sale::class)->count());
        $this->assertSame(3.0, (float) $this->tissu->totalQuantity($this->warehouse->id));
        $this->assertSame(3.0, (float) $this->bouton->totalQuantity($this->warehouse->id));
    }

    public function test_cannot_confirm_twice(): void
    {
        $this->stock(50);
        $sale = $this->createSale();

        $this->actingAs($this->admin)->post(route('sales.confirm', $sale));
        $this->actingAs($this->admin)
            ->post(route('sales.confirm', $sale))
            ->assertSessionHas('error', 'sales.bad_status');

        $this->assertSame(2, StockMovement::where('reference_id', $sale->id)->count());
        $this->assertSame(45.0, (float) $this->tissu->totalQuantity($this->warehouse->id));
    }

    public function test_cancel_sale(): void
    {
        $sale = $this->createSale();

        $this->actingAs($this->admin)
            ->post(route('sales.cancel', $sale))
            ->assertRedirect()
            ->assertSessionHas('success', 'sales.cancelled');

        $this->assertSame(Sale::STATUS_CANCELLED, $sale->fresh()->status);
        $this->assertSame(0, StockMovement::where('reference_type', Sale::class)->count());
    }

    public function test_cannot_edit_confirmed_sale(): void
    {
        $this->stock(50);
        $sale = $this->createSale();
        $this->actingAs($this->admin)->post(route('sales.confirm', $sale));

        $this->actingAs($this->admin)
            ->put(route('sales.update', $sale), $this->payload(['notes' => 'Modification interdite']))
            ->assertSessionHasErrors('items');

        $this->assertSame(Sale::STATUS_CONFIRMED, $sale->fresh()->status);
        $this->assertNull($sale->fresh()->notes);
    }

    public function test_destroy_draft_sale(): void
    {
        $sale = $this->createSale();

        $this->actingAs($this->admin)
            ->delete(route('sales.destroy', $sale))
            ->assertRedirect(route('sales.index'))
            ->assertSessionHas('success', 'sales.deleted');

        $this->assertDatabaseMissing('sales', ['id' => $sale->id]);
        $this->assertDatabaseMissing('sale_items', ['sale_id' => $sale->id]);
    }

    public function test_cannot_destroy_confirmed_sale(): void
    {
        $this->stock(50);
        $sale = $this->createSale();
        $this->actingAs($this->admin)->post(route('sales.confirm', $sale));

        $this->actingAs($this->admin)
            ->delete(route('sales.destroy', $sale))
            ->assertRedirect(route('sales.index'))
            ->assertSessionHas('error', 'sales.delete_blocked');

        $this->assertDatabaseHas('sales', ['id' => $sale->id]);
    }

    public function test_update_replaces_items_and_recomputes_totals(): void
    {
        $sale = $this->createSale();

        $this->actingAs($this->admin)
            ->put(route('sales.update', $sale), $this->payload([
                'items' => [
                    ['product_id' => $this->tissu->id, 'quantity' => 2, 'unit_price' => 25, 'discount' => 0, 'tax' => 0],
                ],
            ]))
            ->assertRedirect()
            ->assertSessionHas('success', 'sales.updated');

        $sale->refresh();

        $this->assertSame(1, $sale->items()->count());
        $this->assertSame('50.00', (string) $sale->subtotal);
        $this->assertSame('50.00', (string) $sale->total_amount);
        $this->assertSame(0, StockMovement::where('reference_type', Sale::class)->count());
    }

    public function test_rejects_duplicate_products_and_empty_items(): void
    {
        $this->actingAs($this->admin)
            ->post(route('sales.store'), $this->payload([
                'items' => [
                    ['product_id' => $this->tissu->id, 'quantity' => 1, 'unit_price' => 10],
                    ['product_id' => $this->tissu->id, 'quantity' => 1, 'unit_price' => 10],
                ],
            ]))
            ->assertSessionHasErrors('items');

        $this->actingAs($this->admin)
            ->post(route('sales.store'), $this->payload(['items' => []]))
            ->assertSessionHasErrors('items');
    }

    public function test_sales_index_filters_by_status(): void
    {
        $sale = $this->createSale();

        $this->actingAs($this->admin)
            ->get(route('sales.index', ['status' => Sale::STATUS_DRAFT]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Sales/Index')
                ->has('sales.data', 1));

        $this->actingAs($this->admin)
            ->get(route('sales.index', ['status' => Sale::STATUS_CONFIRMED]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Sales/Index')
                ->has('sales.data', 0));
    }

    public function test_sale_show_lists_movements(): void
    {
        $this->stock(50);
        $sale = $this->createSale();
        $this->actingAs($this->admin)->post(route('sales.confirm', $sale));

        $this->actingAs($this->admin)
            ->get(route('sales.show', $sale))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Sales/Show')
                ->has('sale')
                ->has('movements', 2));
    }

    public function test_references_are_unique(): void
    {
        $first = $this->createSale();
        $second = $this->createSale();

        $this->assertNotSame($first->reference, $second->reference);
    }
}
