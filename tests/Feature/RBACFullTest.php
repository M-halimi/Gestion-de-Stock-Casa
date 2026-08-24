<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Stock;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RBACFullTest extends TestCase
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

    protected function manager(): User
    {
        return User::where('email', 'manager@demo.com')->first();
    }

    protected function employee(): User
    {
        return User::where('email', 'employee@demo.com')->first();
    }

    // ─── GUEST (unauthenticated) ───────────────────────────────────

    public function test_guest_is_redirected_to_login_for_all_routes(): void
    {
        $routes = [
            '/dashboard', '/products', '/categories', '/units',
            '/suppliers', '/customers', '/warehouses', '/stock',
            '/purchases', '/sales', '/movements', '/inventory',
            '/production', '/reports', '/admin/audit-logs',
            '/users', '/settings',
        ];

        foreach ($routes as $route) {
            $this->get($route)->assertRedirect('/login');
        }
    }

    // ─── DASHBOARD ─────────────────────────────────────────────────

    public function test_admin_can_access_dashboard(): void
    {
        $this->actingAs($this->admin())->get('/dashboard')->assertOk();
    }

    public function test_manager_can_access_dashboard(): void
    {
        $this->actingAs($this->manager())->get('/dashboard')->assertOk();
    }

    public function test_employee_can_access_dashboard(): void
    {
        $this->actingAs($this->employee())->get('/dashboard')->assertOk();
    }

    // ─── PRODUCTS ──────────────────────────────────────────────────

    public function test_admin_can_access_products_crud(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->get('/products')->assertOk();
        $this->actingAs($admin)->get('/products/create')->assertOk();

        $product = Product::first();
        $this->actingAs($admin)->get("/products/{$product->id}")->assertOk();
        $this->actingAs($admin)->get("/products/{$product->id}/edit")->assertOk();
    }

    public function test_manager_can_access_products_crud(): void
    {
        $manager = $this->manager();
        $this->actingAs($manager)->get('/products')->assertOk();
        $this->actingAs($manager)->get('/products/create')->assertOk();

        $product = Product::first();
        $this->actingAs($manager)->get("/products/{$product->id}")->assertOk();
        $this->actingAs($manager)->get("/products/{$product->id}/edit")->assertOk();
    }

    public function test_employee_can_view_products_index(): void
    {
        $this->actingAs($this->employee())->get('/products')->assertOk();
    }

    public function test_employee_cannot_create_product(): void
    {
        $this->actingAs($this->employee())->get('/products/create')->assertForbidden();
    }

    public function test_employee_cannot_edit_product(): void
    {
        $product = Product::first();
        $this->actingAs($this->employee())->get("/products/{$product->id}/edit")->assertForbidden();
    }

    // ─── CATEGORIES ────────────────────────────────────────────────

    public function test_admin_can_access_categories_crud(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->get('/categories')->assertOk();
        $this->actingAs($admin)->get('/categories/create')->assertOk();

        $category = Category::first();
        $this->actingAs($admin)->get("/categories/{$category->id}/edit")->assertOk();
    }

    public function test_manager_can_access_categories_crud(): void
    {
        $manager = $this->manager();
        $this->actingAs($manager)->get('/categories')->assertOk();
        $this->actingAs($manager)->get('/categories/create')->assertOk();

        $category = Category::first();
        $this->actingAs($manager)->get("/categories/{$category->id}/edit")->assertOk();
    }

    public function test_employee_can_view_categories(): void
    {
        $this->actingAs($this->employee())->get('/categories')->assertOk();
    }

    public function test_employee_cannot_create_category(): void
    {
        $this->actingAs($this->employee())->get('/categories/create')->assertForbidden();
    }

    public function test_employee_cannot_edit_category(): void
    {
        $category = Category::first();
        $this->actingAs($this->employee())->get("/categories/{$category->id}/edit")->assertForbidden();
    }

    // ─── UNITS ─────────────────────────────────────────────────────

    public function test_admin_can_access_units_crud(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->get('/units')->assertOk();
        $this->actingAs($admin)->get('/units/create')->assertOk();

        $unit = Unit::first();
        $this->actingAs($admin)->get("/units/{$unit->id}/edit")->assertOk();
    }

    public function test_manager_can_access_units_crud(): void
    {
        $manager = $this->manager();
        $this->actingAs($manager)->get('/units')->assertOk();
        $this->actingAs($manager)->get('/units/create')->assertOk();

        $unit = Unit::first();
        $this->actingAs($manager)->get("/units/{$unit->id}/edit")->assertOk();
    }

    public function test_employee_can_view_units(): void
    {
        $this->actingAs($this->employee())->get('/units')->assertOk();
    }

    public function test_employee_cannot_create_unit(): void
    {
        $this->actingAs($this->employee())->get('/units/create')->assertForbidden();
    }

    // ─── SUPPLIERS ─────────────────────────────────────────────────

    public function test_admin_can_access_suppliers_crud(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->get('/suppliers')->assertOk();
        $this->actingAs($admin)->get('/suppliers/create')->assertOk();

        $supplier = Supplier::first();
        $this->actingAs($admin)->get("/suppliers/{$supplier->id}/edit")->assertOk();
    }

    public function test_manager_can_access_suppliers_crud(): void
    {
        $manager = $this->manager();
        $this->actingAs($manager)->get('/suppliers')->assertOk();
        $this->actingAs($manager)->get('/suppliers/create')->assertOk();

        $supplier = Supplier::first();
        $this->actingAs($manager)->get("/suppliers/{$supplier->id}/edit")->assertOk();
    }

    public function test_employee_cannot_access_suppliers(): void
    {
        $this->actingAs($this->employee())->get('/suppliers')->assertForbidden();
    }

    public function test_employee_cannot_create_supplier(): void
    {
        $this->actingAs($this->employee())->get('/suppliers/create')->assertForbidden();
    }

    // ─── CUSTOMERS ─────────────────────────────────────────────────

    public function test_admin_can_access_customers_crud(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->get('/customers')->assertOk();
        $this->actingAs($admin)->get('/customers/create')->assertOk();

        $customer = Customer::first();
        $this->actingAs($admin)->get("/customers/{$customer->id}/edit")->assertOk();
    }

    public function test_manager_can_access_customers_crud(): void
    {
        $manager = $this->manager();
        $this->actingAs($manager)->get('/customers')->assertOk();
        $this->actingAs($manager)->get('/customers/create')->assertOk();

        $customer = Customer::first();
        $this->actingAs($manager)->get("/customers/{$customer->id}/edit")->assertOk();
    }

    public function test_employee_can_view_customers(): void
    {
        $this->actingAs($this->employee())->get('/customers')->assertOk();
    }

    public function test_employee_cannot_create_customer(): void
    {
        $this->actingAs($this->employee())->get('/customers/create')->assertForbidden();
    }

    // ─── WAREHOUSES ────────────────────────────────────────────────

    public function test_admin_can_access_warehouses_crud(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->get('/warehouses')->assertOk();
        $this->actingAs($admin)->get('/warehouses/create')->assertOk();

        $warehouse = Warehouse::first();
        $this->actingAs($admin)->get("/warehouses/{$warehouse->id}/edit")->assertOk();
    }

    public function test_manager_can_access_warehouses_crud(): void
    {
        $manager = $this->manager();
        $this->actingAs($manager)->get('/warehouses')->assertOk();
        $this->actingAs($manager)->get('/warehouses/create')->assertOk();

        $warehouse = Warehouse::first();
        $this->actingAs($manager)->get("/warehouses/{$warehouse->id}/edit")->assertOk();
    }

    public function test_employee_cannot_access_warehouses(): void
    {
        $this->actingAs($this->employee())->get('/warehouses')->assertForbidden();
    }

    // ─── STOCK ─────────────────────────────────────────────────────

    public function test_admin_can_access_stock(): void
    {
        $this->actingAs($this->admin())->get('/stock')->assertOk();
    }

    public function test_manager_can_access_stock(): void
    {
        $this->actingAs($this->manager())->get('/stock')->assertOk();
    }

    public function test_employee_can_access_stock(): void
    {
        $this->actingAs($this->employee())->get('/stock')->assertOk();
    }

    // ─── PURCHASES ─────────────────────────────────────────────────

    public function test_admin_can_access_purchases_crud(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->get('/purchases')->assertOk();
        $this->actingAs($admin)->get('/purchases/create')->assertOk();

        $purchase = Purchase::first();
        if ($purchase) {
            $this->actingAs($admin)->get("/purchases/{$purchase->id}")->assertOk();
            $this->actingAs($admin)->get("/purchases/{$purchase->id}/edit")->assertOk();
        }
    }

    public function test_manager_can_access_purchases_crud(): void
    {
        $manager = $this->manager();
        $this->actingAs($manager)->get('/purchases')->assertOk();
        $this->actingAs($manager)->get('/purchases/create')->assertOk();

        $purchase = Purchase::first();
        if ($purchase) {
            $this->actingAs($manager)->get("/purchases/{$purchase->id}")->assertOk();
            $this->actingAs($manager)->get("/purchases/{$purchase->id}/edit")->assertOk();
        }
    }

    public function test_employee_cannot_access_purchases(): void
    {
        $this->actingAs($this->employee())->get('/purchases')->assertForbidden();
    }

    public function test_employee_cannot_create_purchase(): void
    {
        $this->actingAs($this->employee())->get('/purchases/create')->assertForbidden();
    }

    // ─── SALES ─────────────────────────────────────────────────────

    public function test_admin_can_access_sales_crud(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->get('/sales')->assertOk();
        $this->actingAs($admin)->get('/sales/create')->assertOk();

        $sale = Sale::first();
        if ($sale) {
            $this->actingAs($admin)->get("/sales/{$sale->id}")->assertOk();
            $this->actingAs($admin)->get("/sales/{$sale->id}/edit")->assertOk();
        }
    }

    public function test_manager_can_access_sales_crud(): void
    {
        $manager = $this->manager();
        $this->actingAs($manager)->get('/sales')->assertOk();
        $this->actingAs($manager)->get('/sales/create')->assertOk();

        $sale = Sale::first();
        if ($sale) {
            $this->actingAs($manager)->get("/sales/{$sale->id}")->assertOk();
            $this->actingAs($manager)->get("/sales/{$sale->id}/edit")->assertOk();
        }
    }

    public function test_employee_can_view_sales(): void
    {
        $this->actingAs($this->employee())->get('/sales')->assertOk();
    }

    public function test_employee_can_create_sale(): void
    {
        $this->actingAs($this->employee())->get('/sales/create')->assertOk();
    }

    // ─── MOVEMENTS ─────────────────────────────────────────────────

    public function test_admin_can_access_movements(): void
    {
        $this->actingAs($this->admin())->get('/movements')->assertOk();
    }

    public function test_manager_can_access_movements(): void
    {
        $this->actingAs($this->manager())->get('/movements')->assertOk();
    }

    public function test_employee_can_access_movements(): void
    {
        $this->actingAs($this->employee())->get('/movements')->assertOk();
    }

    // ─── INVENTORY ─────────────────────────────────────────────────

    public function test_admin_can_access_inventory_crud(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->get('/inventory')->assertOk();
        $this->actingAs($admin)->get('/inventory/create')->assertOk();
    }

    public function test_manager_can_access_inventory_crud(): void
    {
        $manager = $this->manager();
        $this->actingAs($manager)->get('/inventory')->assertOk();
        $this->actingAs($manager)->get('/inventory/create')->assertOk();
    }

    public function test_employee_cannot_access_inventory(): void
    {
        $this->actingAs($this->employee())->get('/inventory')->assertForbidden();
    }

    public function test_employee_cannot_create_inventory(): void
    {
        $this->actingAs($this->employee())->get('/inventory/create')->assertForbidden();
    }

    // ─── PRODUCTION ────────────────────────────────────────────────

    public function test_admin_can_access_production(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->get('/production')->assertRedirect();
        $this->actingAs($admin)->get('/production/boms')->assertOk();
        $this->actingAs($admin)->get('/production/boms/create')->assertOk();
        $this->actingAs($admin)->get('/production/orders')->assertOk();
        $this->actingAs($admin)->get('/production/orders/create')->assertOk();
    }

    public function test_manager_can_access_production(): void
    {
        $manager = $this->manager();
        $this->actingAs($manager)->get('/production')->assertRedirect();
        $this->actingAs($manager)->get('/production/boms')->assertOk();
        $this->actingAs($manager)->get('/production/boms/create')->assertOk();
        $this->actingAs($manager)->get('/production/orders')->assertOk();
        $this->actingAs($manager)->get('/production/orders/create')->assertOk();
    }

    public function test_employee_can_view_production(): void
    {
        $this->actingAs($this->employee())->get('/production')->assertRedirect();
    }

    public function test_employee_cannot_create_bom(): void
    {
        $this->actingAs($this->employee())->get('/production/boms/create')->assertForbidden();
    }

    public function test_employee_cannot_create_production_order(): void
    {
        $this->actingAs($this->employee())->get('/production/orders/create')->assertForbidden();
    }

    // ─── REPORTS ───────────────────────────────────────────────────

    public function test_admin_can_access_reports(): void
    {
        $this->actingAs($this->admin())->get('/reports')->assertOk();
    }

    public function test_manager_can_access_reports(): void
    {
        $this->actingAs($this->manager())->get('/reports')->assertOk();
    }

    public function test_employee_cannot_access_reports(): void
    {
        $this->actingAs($this->employee())->get('/reports')->assertForbidden();
    }

    // ─── AUDIT LOGS (Admin only) ──────────────────────────────────

    public function test_admin_can_access_audit_logs(): void
    {
        $this->actingAs($this->admin())->get('/admin/audit-logs')->assertOk();
    }

    public function test_manager_cannot_access_audit_logs(): void
    {
        $this->actingAs($this->manager())->get('/admin/audit-logs')->assertForbidden();
    }

    public function test_employee_cannot_access_audit_logs(): void
    {
        $this->actingAs($this->employee())->get('/admin/audit-logs')->assertForbidden();
    }

    // ─── USERS (Admin only) ───────────────────────────────────────

    public function test_admin_can_access_users_crud(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->get('/users')->assertOk();
        $this->actingAs($admin)->get('/users/create')->assertOk();
    }

    public function test_manager_cannot_access_users(): void
    {
        $this->actingAs($this->manager())->get('/users')->assertForbidden();
    }

    public function test_employee_cannot_access_users(): void
    {
        $this->actingAs($this->employee())->get('/users')->assertForbidden();
    }

    // ─── SETTINGS (Admin only) ────────────────────────────────────

    public function test_admin_can_access_settings(): void
    {
        $this->actingAs($this->admin())->get('/settings')->assertOk();
    }

    public function test_manager_cannot_access_settings(): void
    {
        $this->actingAs($this->manager())->get('/settings')->assertForbidden();
    }

    public function test_employee_cannot_access_settings(): void
    {
        $this->actingAs($this->employee())->get('/settings')->assertForbidden();
    }

    // ─── ROLE / PERMISSION VERIFICATION ────────────────────────────

    public function test_admin_has_all_permissions(): void
    {
        $admin = $this->admin();
        $this->assertTrue($admin->hasRole('Admin'));

        $expectedPermissions = [
            'view_dashboard', 'view_products', 'create_products', 'edit_products', 'delete_products',
            'view_categories', 'create_categories', 'edit_categories', 'delete_categories',
            'view_units', 'create_units', 'edit_units', 'delete_units',
            'view_suppliers', 'create_suppliers', 'edit_suppliers', 'delete_suppliers',
            'view_customers', 'create_customers', 'edit_customers', 'delete_customers',
            'view_warehouses', 'create_warehouses', 'edit_warehouses', 'delete_warehouses',
            'view_stock', 'manage_stock',
            'view_purchases', 'create_purchases', 'receive_purchases', 'cancel_purchases', 'edit_purchases', 'delete_purchases',
            'view_sales', 'create_sales', 'confirm_sales', 'cancel_sales', 'edit_sales', 'delete_sales',
            'view_movements', 'create_transfers',
            'view_inventory', 'validate_inventory',
            'view_production', 'create_production', 'edit_production', 'manage_production', 'delete_production',
            'view_reports',
            'view_audit_logs',
            'view_users', 'manage_users',
        ];

        foreach ($expectedPermissions as $perm) {
            $this->assertTrue($admin->hasPermissionTo($perm), "Admin missing permission: {$perm}");
        }
    }

    public function test_manager_role_permissions(): void
    {
        $manager = $this->manager();
        $this->assertTrue($manager->hasRole('Manager'));

        $shouldHave = [
            'view_dashboard', 'view_products', 'create_products', 'edit_products',
            'view_categories', 'create_categories', 'edit_categories',
            'view_units', 'create_units', 'edit_units',
            'view_suppliers', 'create_suppliers', 'edit_suppliers',
            'view_customers', 'create_customers', 'edit_customers',
            'view_warehouses', 'create_warehouses', 'edit_warehouses',
            'view_stock', 'manage_stock',
            'view_purchases', 'create_purchases', 'receive_purchases', 'cancel_purchases', 'edit_purchases',
            'view_sales', 'create_sales', 'confirm_sales', 'cancel_sales', 'edit_sales',
            'view_movements', 'create_transfers',
            'view_inventory', 'validate_inventory',
            'view_production', 'create_production', 'edit_production', 'manage_production',
            'view_reports',
        ];

        foreach ($shouldHave as $perm) {
            $this->assertTrue($manager->hasPermissionTo($perm), "Manager missing permission: {$perm}");
        }

        $shouldNotHave = [
            'delete_products', 'delete_categories', 'delete_units',
            'delete_warehouses',
            'delete_purchases', 'delete_sales', 'delete_production',
            'manage_users', 'view_audit_logs',
        ];

        foreach ($shouldNotHave as $perm) {
            $this->assertFalse($manager->hasPermissionTo($perm), "Manager should NOT have permission: {$perm}");
        }
    }

    public function test_employee_role_permissions(): void
    {
        $employee = $this->employee();
        $this->assertTrue($employee->hasRole('Employee'));

        $shouldHave = [
            'view_dashboard', 'view_products', 'view_categories', 'view_units',
            'view_customers', 'view_stock', 'view_sales', 'create_sales',
            'confirm_sales', 'view_movements', 'view_production',
        ];

        foreach ($shouldHave as $perm) {
            $this->assertTrue($employee->hasPermissionTo($perm), "Employee missing permission: {$perm}");
        }

        $shouldNotHave = [
            'create_products', 'edit_products', 'delete_products',
            'create_categories', 'edit_categories', 'delete_categories',
            'create_units', 'edit_units', 'delete_units',
            'view_suppliers', 'create_suppliers', 'edit_suppliers', 'delete_suppliers',
            'edit_customers', 'delete_customers',
            'view_warehouses', 'create_warehouses', 'edit_warehouses', 'delete_warehouses',
            'manage_stock',
            'view_purchases', 'create_purchases', 'receive_purchases', 'cancel_purchases', 'edit_purchases', 'delete_purchases',
            'edit_sales', 'cancel_sales', 'delete_sales',
            'create_transfers',
            'view_inventory', 'validate_inventory',
            'create_production', 'edit_production', 'manage_production', 'delete_production',
            'view_reports', 'view_audit_logs',
            'view_users', 'manage_users',
        ];

        foreach ($shouldNotHave as $perm) {
            $this->assertFalse($employee->hasPermissionTo($perm), "Employee should NOT have permission: {$perm}");
        }
    }

    // ─── TRANSFERS ─────────────────────────────────────────────────

    public function test_admin_can_access_transfers(): void
    {
        $this->actingAs($this->admin())->get('/transfers/create')->assertOk();
    }

    public function test_manager_can_access_transfers(): void
    {
        $this->actingAs($this->manager())->get('/transfers/create')->assertOk();
    }

    public function test_employee_cannot_access_transfers(): void
    {
        $this->actingAs($this->employee())->get('/transfers/create')->assertForbidden();
    }

    // ─── PROFILE ───────────────────────────────────────────────────

    public function test_all_roles_can_access_profile(): void
    {
        $this->actingAs($this->admin())->get('/profile')->assertOk();
        $this->actingAs($this->manager())->get('/profile')->assertOk();
        $this->actingAs($this->employee())->get('/profile')->assertOk();
    }
}
