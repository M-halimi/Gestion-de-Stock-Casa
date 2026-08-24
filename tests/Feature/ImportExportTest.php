<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Import;
use App\Models\ImportError;
use App\Models\Product;
use App\Models\Stock;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ImportExportTest extends TestCase
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

    protected function admin(): User
    {
        return User::where('email', 'admin@demo.com')->first();
    }

    protected function employee(): User
    {
        return User::where('email', 'employee@demo.com')->first();
    }

    private function createImportRecord(string $type = 'products', string $status = Import::STATUS_PENDING): Import
    {
        return Import::create([
            'reference' => Import::generateReference(),
            'type' => $type,
            'file_name' => 'test.csv',
            'file_path' => 'imports/test.csv',
            'status' => $status,
            'created_by' => $this->admin()->id,
        ]);
    }

    private function storeCsvFile(string $filename, string $content): string
    {
        Storage::fake('local');
        Storage::put("imports/{$filename}", $content);
        return "imports/{$filename}";
    }

    private function buildCsvContent(array $headers, array $rows): string
    {
        $lines = implode(',', array_map(fn ($h) => '"' . str_replace('"', '""', $h) . '"', $headers));
        foreach ($rows as $row) {
            $lines .= "\n" . implode(',', array_map(fn ($v) => '"' . str_replace('"', '""', (string) $v) . '"', $row));
        }
        return $lines;
    }

    private function mappingString(array $mapping): array
    {
        return $mapping;
    }

    // ============================================================
    // IMPORT TESTS
    // ============================================================

    public function test_import_center_page_loads(): void
    {
        $this->actingAs($this->admin())
            ->get('/imports')
            ->assertOk();
    }

    public function test_import_requires_permission(): void
    {
        $this->actingAs($this->employee())
            ->get('/imports')
            ->assertForbidden();
    }

    public function test_upload_valid_csv(): void
    {
        Storage::fake('local');

        $csv = $this->buildCsvContent(
            ['name', 'sku', 'category', 'unit', 'price', 'cost_price', 'min_stock'],
            [['Produit A', 'SKU-A', 'Tissu', 'pièce', '100', '50', '10']]
        );

        $file = UploadedFile::fake()->createWithContent('products.csv', $csv);

        $response = $this->actingAs($this->admin())
            ->postJson('/imports/upload', [
                'file' => $file,
                'type' => 'products',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'import' => ['id', 'reference', 'type', 'status', 'column_mappings'],
                'preview' => ['raw_headers', 'rows', 'total_rows'],
            ])
            ->assertJson(['import' => ['status' => 'parsed']]);

        $this->assertDatabaseHas('imports', [
            'type' => 'products',
            'status' => 'parsed',
        ]);
    }

    public function test_upload_invalid_extension_rejected(): void
    {
        Storage::fake('local');

        $file = UploadedFile::fake()->createWithContent('data.txt', 'some content');

        $this->actingAs($this->admin())
            ->postJson('/imports/upload', [
                'file' => $file,
                'type' => 'products',
            ])
            ->assertStatus(422);
    }

    public function test_upload_empty_file_rejected(): void
    {
        Storage::fake('local');

        $file = UploadedFile::fake()->createWithContent('empty.csv', '');

        $this->actingAs($this->admin())
            ->postJson('/imports/upload', [
                'file' => $file,
                'type' => 'products',
            ])
            ->assertStatus(422);
    }

    public function test_upload_too_large_rejected(): void
    {
        Storage::fake('local');

        $csv = $this->buildCsvContent(['name', 'sku'], [['Test', 'T-001']]);
        $file = UploadedFile::fake()->createWithContent('large.csv', $csv)
            ->size(20480);

        $this->actingAs($this->admin())
            ->postJson('/imports/upload', [
                'file' => $file,
                'type' => 'products',
            ])
            ->assertStatus(422);
    }

    public function test_parse_imported_file(): void
    {
        Storage::fake('local');

        $csv = $this->buildCsvContent(
            ['name', 'sku', 'category'],
            [
                ['Produit A', 'SKU-A', 'Tissu'],
                ['Produit B', 'SKU-B', 'Coton'],
            ]
        );

        $filePath = $this->storeCsvFile('parse_test.csv', $csv);

        $import = Import::create([
            'reference' => Import::generateReference(),
            'type' => 'products',
            'file_name' => 'parse_test.csv',
            'file_path' => $filePath,
            'status' => Import::STATUS_PENDING,
            'created_by' => $this->admin()->id,
        ]);

        $response = $this->actingAs($this->admin())
            ->getJson("/imports/{$import->id}/parse");

        $response->assertOk()
            ->assertJsonStructure([
                'import' => ['id', 'reference', 'type', 'status', 'column_mappings'],
                'preview' => ['raw_headers', 'rows', 'total_rows'],
            ]);
    }

    public function test_preview_with_valid_mapping(): void
    {
        Storage::fake('local');

        $csv = $this->buildCsvContent(
            ['name', 'sku', 'category'],
            [['Produit A', 'SKU-A', 'Tissu']]
        );

        $filePath = $this->storeCsvFile('preview_test.csv', $csv);

        $import = Import::create([
            'reference' => Import::generateReference(),
            'type' => 'products',
            'file_name' => 'preview_test.csv',
            'file_path' => $filePath,
            'status' => Import::STATUS_PENDING,
            'created_by' => $this->admin()->id,
        ]);

        $response = $this->actingAs($this->admin())
            ->postJson("/imports/{$import->id}/preview", [
                'column_mappings' => $this->mappingString([
                    'name' => 0,
                    'sku' => 1,
                    'category' => 2,
                ]),
            ]);

        $response->assertOk()
            ->assertJsonStructure([
                'preview' => [
                    'total_rows',
                    'valid_rows',
                    'error_rows',
                    'warning_rows',
                    'headers',
                    'rows',
                ],
            ]);
    }

    public function test_preview_returns_row_level_errors_and_counts(): void
    {
        Storage::fake('local');

        $category = Category::first();
        $unit = Unit::first();
        $csv = $this->buildCsvContent(
            ['name', 'category', 'unit', 'sale_price'],
            [
                ['Valid Product', $category->name, $unit->name, '10'],
                ['', 'Unknown category', $unit->name, 'not-a-price'],
            ]
        );

        $filePath = $this->storeCsvFile('row_errors.csv', $csv);
        $import = Import::create([
            'reference' => Import::generateReference(),
            'type' => 'products',
            'file_name' => 'row_errors.csv',
            'file_path' => $filePath,
            'status' => Import::STATUS_PENDING,
            'created_by' => $this->admin()->id,
        ]);

        $response = $this->actingAs($this->admin())
            ->postJson("/imports/{$import->id}/preview", [
                'column_mappings' => [
                    'name' => 0,
                    'category' => 1,
                    'unit' => 2,
                    'sale_price' => 3,
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('preview.total_rows', 2)
            ->assertJsonPath('preview.valid_rows', 1)
            ->assertJsonPath('preview.error_rows', 1)
            ->assertJsonPath('preview.rows.0.errors', [])
            ->assertJsonPath('preview.rows.1.row', 3);

        $this->assertCount(3, $response->json('preview.rows.1.errors'));
        $this->assertSame([], $response->json('preview.rows.0.warnings'));
        $this->assertIsArray($response->json('preview.rows.1.warnings'));
    }

    public function test_execute_product_import(): void
    {
        Storage::fake('local');

        $category = Category::first();
        $unit = Unit::first();

        $csv = $this->buildCsvContent(
            ['name', 'sku', 'category', 'unit', 'purchase_price', 'sale_price', 'min_stock'],
            [
                ['Import Product', 'IMP-SKU-001', $category->name, $unit->name, '100', '150', '10'],
            ]
        );

        $filePath = $this->storeCsvFile('execute_products.csv', $csv);

        $import = Import::create([
            'reference' => Import::generateReference(),
            'type' => 'products',
            'file_name' => 'execute_products.csv',
            'file_path' => $filePath,
            'status' => Import::STATUS_PENDING,
            'created_by' => $this->admin()->id,
        ]);

        $response = $this->actingAs($this->admin())
            ->postJson("/imports/{$import->id}/execute", [
                'column_mappings' => $this->mappingString([
                    'name' => 0,
                    'sku' => 1,
                    'category' => 2,
                    'unit' => 3,
                    'purchase_price' => 4,
                    'sale_price' => 5,
                    'min_stock' => 6,
                ]),
            ]);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'imported',
                'updated',
                'skipped',
                'failed',
                'errors',
            ]);

        $this->assertDatabaseHas('products', ['sku' => 'IMP-SKU-001']);
    }

    public function test_execute_customer_import(): void
    {
        Storage::fake('local');

        $csv = $this->buildCsvContent(
            ['name', 'email', 'phone', 'address', 'city'],
            [
                ['Client Import', 'client@test.com', '0600000000', '123 Rue Test', 'Casablanca'],
            ]
        );

        $filePath = $this->storeCsvFile('execute_customers.csv', $csv);

        $import = Import::create([
            'reference' => Import::generateReference(),
            'type' => 'customers',
            'file_name' => 'execute_customers.csv',
            'file_path' => $filePath,
            'status' => Import::STATUS_PENDING,
            'created_by' => $this->admin()->id,
        ]);

        $response = $this->actingAs($this->admin())
            ->postJson("/imports/{$import->id}/execute", [
                'column_mappings' => $this->mappingString([
                    'name' => 0,
                    'email' => 1,
                    'phone' => 2,
                    'address' => 3,
                    'city' => 4,
                ]),
            ]);

        $response->assertOk();

        $this->assertDatabaseHas('customers', ['email' => 'client@test.com']);
    }

    public function test_execute_supplier_import(): void
    {
        Storage::fake('local');

        $csv = $this->buildCsvContent(
            ['name', 'email', 'phone', 'address', 'city', 'company'],
            [
                ['Fournisseur Import', 'supplier@test.com', '0611111111', '456 Rue Fournisseur', 'Marrakech', 'FournCo'],
            ]
        );

        $filePath = $this->storeCsvFile('execute_suppliers.csv', $csv);

        $import = Import::create([
            'reference' => Import::generateReference(),
            'type' => 'suppliers',
            'file_name' => 'execute_suppliers.csv',
            'file_path' => $filePath,
            'status' => Import::STATUS_PENDING,
            'created_by' => $this->admin()->id,
        ]);

        $response = $this->actingAs($this->admin())
            ->postJson("/imports/{$import->id}/execute", [
                'column_mappings' => $this->mappingString([
                    'name' => 0,
                    'email' => 1,
                    'phone' => 2,
                    'address' => 3,
                    'city' => 4,
                    'company' => 5,
                ]),
            ]);

        $response->assertOk();

        $this->assertDatabaseHas('suppliers', ['email' => 'supplier@test.com']);
    }

    public function test_execute_category_import(): void
    {
        Storage::fake('local');

        $csv = $this->buildCsvContent(
            ['name', 'description'],
            [['Catégorie Import', 'Description test']]
        );

        $filePath = $this->storeCsvFile('execute_categories.csv', $csv);

        $import = Import::create([
            'reference' => Import::generateReference(),
            'type' => 'categories',
            'file_name' => 'execute_categories.csv',
            'file_path' => $filePath,
            'status' => Import::STATUS_PENDING,
            'created_by' => $this->admin()->id,
        ]);

        $response = $this->actingAs($this->admin())
            ->postJson("/imports/{$import->id}/execute", [
                'column_mappings' => $this->mappingString([
                    'name' => 0,
                    'description' => 1,
                ]),
            ]);

        $response->assertOk();

        $this->assertDatabaseHas('categories', ['name' => 'Catégorie Import']);
    }

    public function test_execute_unit_import(): void
    {
        Storage::fake('local');

        $csv = $this->buildCsvContent(
            ['name', 'abbreviation'],
            [['Mètre Import', 'mi']]
        );

        $filePath = $this->storeCsvFile('execute_units.csv', $csv);

        $import = Import::create([
            'reference' => Import::generateReference(),
            'type' => 'units',
            'file_name' => 'execute_units.csv',
            'file_path' => $filePath,
            'status' => Import::STATUS_PENDING,
            'created_by' => $this->admin()->id,
        ]);

        $response = $this->actingAs($this->admin())
            ->postJson("/imports/{$import->id}/execute", [
                'column_mappings' => $this->mappingString([
                    'name' => 0,
                    'abbreviation' => 1,
                ]),
            ]);

        $response->assertOk();

        $this->assertDatabaseHas('units', ['abbreviation' => 'mi']);
    }

    public function test_execute_warehouse_import(): void
    {
        Storage::fake('local');

        $csv = $this->buildCsvContent(
            ['name', 'code', 'address', 'is_active'],
            [['Entrepôt Import', '789 Rue Entrepôt', 'Fès', '0555555555']]
        );

        $filePath = $this->storeCsvFile('execute_warehouses.csv', $csv);

        $import = Import::create([
            'reference' => Import::generateReference(),
            'type' => 'warehouses',
            'file_name' => 'execute_warehouses.csv',
            'file_path' => $filePath,
            'status' => Import::STATUS_PENDING,
            'created_by' => $this->admin()->id,
        ]);

        $response = $this->actingAs($this->admin())
            ->postJson("/imports/{$import->id}/execute", [
                'column_mappings' => $this->mappingString([
                    'name' => 0,
                    'code' => 1,
                    'address' => 2,
                    'is_active' => 3,
                ]),
            ]);

        $response->assertOk();

        $this->assertDatabaseHas('warehouses', ['name' => 'Entrepôt Import']);
    }

    public function test_duplicate_detection_skip(): void
    {
        Storage::fake('local');

        $existingProduct = Product::first();
        $category = Category::first();
        $unit = Unit::first();

        $csv = $this->buildCsvContent(
            ['name', 'sku', 'category', 'unit', 'price', 'cost_price', 'min_stock'],
            [
                ['Existing Product', $existingProduct->sku, $category->name, $unit->name, '100', '50', '5'],
                ['New Product', 'NEW-SKU-001', $category->name, $unit->name, '200', '100', '15'],
            ]
        );

        $filePath = $this->storeCsvFile('skip_duplicates.csv', $csv);

        $import = Import::create([
            'reference' => Import::generateReference(),
            'type' => 'products',
            'file_name' => 'skip_duplicates.csv',
            'file_path' => $filePath,
            'status' => Import::STATUS_PENDING,
            'created_by' => $this->admin()->id,
        ]);

        $response = $this->actingAs($this->admin())
            ->postJson("/imports/{$import->id}/execute", [
                'column_mappings' => $this->mappingString([
                    'name' => 0,
                    'sku' => 1,
                    'category' => 2,
                    'unit' => 3,
                    'purchase_price' => 4,
                    'min_stock' => 6,
                ]),
                'duplicate_strategy' => 'skip',
            ]);

        $response->assertOk();

        $import->refresh();
        $this->assertGreaterThan(0, $import->skipped_rows);
        $this->assertDatabaseHas('products', ['sku' => 'NEW-SKU-001']);
    }

    public function test_duplicate_detection_update(): void
    {
        Storage::fake('local');

        $existingProduct = Product::first();
        $category = Category::first();
        $unit = Unit::first();

        $csv = $this->buildCsvContent(
            ['name', 'sku', 'category', 'unit', 'price', 'cost_price', 'min_stock'],
            [
                ['Updated Product', $existingProduct->sku, $category->name, $unit->name, '999', '450', '20'],
            ]
        );

        $filePath = $this->storeCsvFile('update_duplicates.csv', $csv);

        $import = Import::create([
            'reference' => Import::generateReference(),
            'type' => 'products',
            'file_name' => 'update_duplicates.csv',
            'file_path' => $filePath,
            'status' => Import::STATUS_PENDING,
            'created_by' => $this->admin()->id,
        ]);

        $response = $this->actingAs($this->admin())
            ->postJson("/imports/{$import->id}/execute", [
                'column_mappings' => $this->mappingString([
                    'name' => 0,
                    'sku' => 1,
                    'category' => 2,
                    'unit' => 3,
                    'purchase_price' => 4,
                    'min_stock' => 6,
                ]),
                'duplicate_strategy' => 'update',
            ]);

        $response->assertOk();

        $import->refresh();
        $this->assertGreaterThan(0, $import->updated_rows);
    }

    public function test_initial_stock_import_creates_movement(): void
    {
        Storage::fake('local');

        $product = Product::first();
        $warehouse = Warehouse::first();

        $csv = $this->buildCsvContent(
            ['product_sku', 'warehouse', 'quantity', 'cost_price'],
            [
                [$product->sku, $warehouse->name, '50', '25'],
            ]
        );

        $filePath = $this->storeCsvFile('initial_stock.csv', $csv);

        $import = Import::create([
            'reference' => Import::generateReference(),
            'type' => 'initial_stock',
            'file_name' => 'initial_stock.csv',
            'file_path' => $filePath,
            'status' => Import::STATUS_PENDING,
            'created_by' => $this->admin()->id,
        ]);

        $response = $this->actingAs($this->admin())
            ->postJson("/imports/{$import->id}/execute", [
                'column_mappings' => $this->mappingString([
                    'sku' => 0,
                    'warehouse' => 1,
                    'quantity' => 2,
                    'cost_price' => 3,
                ]),
            ]);

        $response->assertOk();

        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'warehouse_id' => $warehouse->id,
            'type' => 'adjustment',
            'quantity' => 50,
        ]);
        // Demo data may not contain a stock row for this product/warehouse;
        // importing the initial quantity must still leave at least the imported amount.
        $this->assertGreaterThanOrEqual(50, (float) Stock::where('product_id', $product->id)
            ->where('warehouse_id', $warehouse->id)
            ->value('quantity'));
    }

    public function test_import_history_lists_imports(): void
    {
        Import::create([
            'reference' => Import::generateReference(),
            'type' => 'products',
            'file_name' => 'history1.csv',
            'file_path' => 'imports/history1.csv',
            'status' => Import::STATUS_COMPLETED,
            'created_by' => $this->admin()->id,
        ]);

        Import::create([
            'reference' => Import::generateReference(),
            'type' => 'customers',
            'file_name' => 'history2.csv',
            'file_path' => 'imports/history2.csv',
            'status' => Import::STATUS_PENDING,
            'created_by' => $this->admin()->id,
        ]);

        $response = $this->actingAs($this->admin())
            ->get('/imports/history');

        $response->assertOk();
    }

    public function test_import_errors_endpoint(): void
    {
        $import = $this->createImportRecord();

        ImportError::create([
            'import_id' => $import->id,
            'row_number' => 2,
            'field' => 'name',
            'value' => '',
            'error_message' => 'Field "name" is required',
        ]);

        ImportError::create([
            'import_id' => $import->id,
            'row_number' => 3,
            'field' => 'sku',
            'value' => '',
            'error_message' => 'Field "sku" is required',
        ]);

        $response = $this->actingAs($this->admin())
            ->getJson("/imports/{$import->id}/errors");

        $response->assertOk()
            ->assertJsonStructure([
                'import' => ['id', 'reference'],
                'errors',
            ])
            ->assertJsonCount(2, 'errors');
    }

    public function test_download_template(): void
    {
        $response = $this->actingAs($this->admin())
            ->get('/imports/template/products');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8')
            ->assertHeader('Content-Disposition', 'attachment; filename="products-template.csv"');
    }

    // ============================================================
    // EXPORT TESTS
    // ============================================================

    public function test_export_products_csv(): void
    {
        $response = $this->actingAs($this->admin())
            ->get('/exports/products');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringContainsString('Nom', $content);
        $this->assertStringContainsString('SKU', $content);
    }

    public function test_export_customers_csv(): void
    {
        $response = $this->actingAs($this->admin())
            ->get('/exports/customers');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringContainsString('Nom', $content);
        $this->assertStringContainsString('Email', $content);
    }

    public function test_export_products_with_filter(): void
    {
        $activeProduct = Product::where('status', 'active')->first();

        $response = $this->actingAs($this->admin())
            ->get('/exports/products?status=active');

        $response->assertOk();

        $content = $response->streamedContent();
        $this->assertStringContainsString($activeProduct->name, $content);
    }

    public function test_export_requires_permission(): void
    {
        $this->actingAs($this->employee())
            ->get('/exports/products')
            ->assertForbidden();
    }

    public function test_export_stock_csv(): void
    {
        $response = $this->actingAs($this->admin())
            ->get('/exports/stock');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringContainsString('Produit', $content);
        $this->assertStringContainsString('SKU', $content);
        $this->assertStringContainsString('Quantité', $content);
    }

    public function test_export_inventory_csv(): void
    {
        $response = $this->actingAs($this->admin())
            ->get('/exports/inventory?status=validated');

        $response->assertOk()
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $this->assertStringContainsString('Référence', $response->streamedContent());
    }
}
