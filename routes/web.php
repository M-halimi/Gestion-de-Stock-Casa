<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductionController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\StockController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\TransferController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WarehouseController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::get('/dashboard', [DashboardController::class, 'index'])
    ->middleware(['auth', 'verified', 'permission:view_dashboard'])
    ->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::controller(CategoryController::class)->middleware(['verified'])->group(function () {
        Route::get('/categories', 'index')->middleware('permission:view_categories')->name('categories.index');
        Route::get('/categories/create', 'create')->middleware('permission:create_categories')->name('categories.create');
        Route::post('/categories', 'store')->middleware('permission:create_categories')->name('categories.store');
        Route::get('/categories/{category}/edit', 'edit')->middleware('permission:edit_categories')->name('categories.edit');
        Route::put('/categories/{category}', 'update')->middleware('permission:edit_categories')->name('categories.update');
        Route::delete('/categories/{category}', 'destroy')->middleware('permission:delete_categories')->name('categories.destroy');
    });

    Route::controller(UnitController::class)->middleware(['verified'])->group(function () {
        Route::get('/units', 'index')->middleware('permission:view_units')->name('units.index');
        Route::get('/units/create', 'create')->middleware('permission:create_units')->name('units.create');
        Route::post('/units', 'store')->middleware('permission:create_units')->name('units.store');
        Route::get('/units/{unit}/edit', 'edit')->middleware('permission:edit_units')->name('units.edit');
        Route::put('/units/{unit}', 'update')->middleware('permission:edit_units')->name('units.update');
        Route::delete('/units/{unit}', 'destroy')->middleware('permission:delete_units')->name('units.destroy');
    });

    Route::controller(SupplierController::class)->middleware(['verified'])->group(function () {
        Route::get('/suppliers', 'index')->middleware('permission:view_suppliers')->name('suppliers.index');
        Route::get('/suppliers/create', 'create')->middleware('permission:create_suppliers')->name('suppliers.create');
        Route::post('/suppliers', 'store')->middleware('permission:create_suppliers')->name('suppliers.store');
        Route::get('/suppliers/{supplier}/edit', 'edit')->middleware('permission:edit_suppliers')->name('suppliers.edit');
        Route::put('/suppliers/{supplier}', 'update')->middleware('permission:edit_suppliers')->name('suppliers.update');
        Route::delete('/suppliers/{supplier}', 'destroy')->middleware('permission:delete_suppliers')->name('suppliers.destroy');
    });

    Route::controller(CustomerController::class)->middleware(['verified'])->group(function () {
        Route::get('/customers', 'index')->middleware('permission:view_customers')->name('customers.index');
        Route::get('/customers/search', 'search')->middleware('permission:create_sales')->name('customers.search');
        Route::post('/customers/quick', 'quickStore')->middleware('permission:create_sales')->name('customers.quick-store');
        Route::get('/customers/create', 'create')->middleware('permission:create_customers')->name('customers.create');
        Route::post('/customers', 'store')->middleware('permission:create_customers')->name('customers.store');
        Route::get('/customers/{customer}/edit', 'edit')->middleware('permission:edit_customers')->name('customers.edit');
        Route::put('/customers/{customer}', 'update')->middleware('permission:edit_customers')->name('customers.update');
        Route::delete('/customers/{customer}', 'destroy')->middleware('permission:delete_customers')->name('customers.destroy');
    });

    Route::controller(WarehouseController::class)->middleware(['verified'])->group(function () {
        Route::get('/warehouses', 'index')->middleware('permission:view_warehouses')->name('warehouses.index');
        Route::get('/warehouses/create', 'create')->middleware('permission:create_warehouses')->name('warehouses.create');
        Route::post('/warehouses', 'store')->middleware('permission:create_warehouses')->name('warehouses.store');
        Route::get('/warehouses/{warehouse}/edit', 'edit')->middleware('permission:edit_warehouses')->name('warehouses.edit');
        Route::put('/warehouses/{warehouse}', 'update')->middleware('permission:edit_warehouses')->name('warehouses.update');
        Route::delete('/warehouses/{warehouse}', 'destroy')->middleware('permission:delete_warehouses')->name('warehouses.destroy');
    });

    Route::get('/stock', [StockController::class, 'index'])
        ->middleware(['verified', 'permission:view_stock'])
        ->name('stock.index');

    Route::controller(ProductController::class)->middleware(['verified'])->group(function () {
        Route::get('/products', 'index')->middleware('permission:view_products')->name('products.index');
        Route::get('/products/create', 'create')->middleware('permission:create_products')->name('products.create');
        Route::post('/products', 'store')->middleware('permission:create_products')->name('products.store');
        Route::get('/products/{product}', 'show')->middleware('permission:view_products')->name('products.show');
        Route::get('/products/{product}/edit', 'edit')->middleware('permission:edit_products')->name('products.edit');
        Route::put('/products/{product}', 'update')->middleware('permission:edit_products')->name('products.update');
        Route::delete('/products/{product}', 'destroy')->middleware('permission:delete_products')->name('products.destroy');
    });

    Route::controller(ProductionController::class)->middleware(['verified'])->group(function () {
        Route::get('/production', 'index')->middleware('permission:view_production')->name('production.index');

        Route::get('/production/boms', 'bomsIndex')->middleware('permission:view_production')->name('production.boms.index');
        Route::get('/production/boms/create', 'bomsCreate')->middleware('permission:create_production')->name('production.boms.create');
        Route::post('/production/boms', 'bomsStore')->middleware('permission:create_production')->name('production.boms.store');
        Route::get('/production/boms/{bom}/edit', 'bomsEdit')->middleware('permission:edit_production')->name('production.boms.edit');
        Route::put('/production/boms/{bom}', 'bomsUpdate')->middleware('permission:edit_production')->name('production.boms.update');
        Route::delete('/production/boms/{bom}', 'bomsDestroy')->middleware('permission:delete_production')->name('production.boms.destroy');

        Route::get('/production/orders', 'ordersIndex')->middleware('permission:view_production')->name('production.orders.index');
        Route::get('/production/orders/create', 'ordersCreate')->middleware('permission:create_production')->name('production.orders.create');
        Route::post('/production/orders', 'ordersStore')->middleware('permission:create_production')->name('production.orders.store');
        Route::get('/production/orders/{order}', 'ordersShow')->middleware('permission:view_production')->name('production.orders.show');
        Route::post('/production/orders/{order}/launch', 'ordersLaunch')->middleware('permission:manage_production')->name('production.orders.launch');
        Route::post('/production/orders/{order}/complete', 'ordersComplete')->middleware('permission:manage_production')->name('production.orders.complete');
        Route::post('/production/orders/{order}/cancel', 'ordersCancel')->middleware('permission:manage_production')->name('production.orders.cancel');
    });

    Route::controller(PurchaseController::class)->middleware(['verified'])->group(function () {
        Route::get('/purchases', 'index')->middleware('permission:view_purchases')->name('purchases.index');
        Route::get('/purchases/create', 'create')->middleware('permission:create_purchases')->name('purchases.create');
        Route::post('/purchases', 'store')->middleware('permission:create_purchases')->name('purchases.store');
        Route::get('/purchases/{purchase}', 'show')->middleware('permission:view_purchases')->name('purchases.show');
        Route::get('/purchases/{purchase}/edit', 'edit')->middleware('permission:edit_purchases')->name('purchases.edit');
        Route::put('/purchases/{purchase}', 'update')->middleware('permission:edit_purchases')->name('purchases.update');
        Route::delete('/purchases/{purchase}', 'destroy')->middleware('permission:delete_purchases')->name('purchases.destroy');
        Route::post('/purchases/{purchase}/receive', 'receive')->middleware('permission:receive_purchases')->name('purchases.receive');
        Route::post('/purchases/{purchase}/cancel', 'cancel')->middleware('permission:cancel_purchases')->name('purchases.cancel');
    });

    Route::controller(SaleController::class)->middleware(['verified'])->group(function () {
        Route::get('/sales', 'index')->middleware('permission:view_sales')->name('sales.index');
        Route::get('/sales/create', 'create')->middleware('permission:create_sales')->name('sales.create');
        Route::post('/sales', 'store')->middleware('permission:create_sales')->name('sales.store');
        Route::get('/sales/{sale}', 'show')->middleware('permission:view_sales')->name('sales.show');
        Route::get('/sales/{sale}/edit', 'edit')->middleware('permission:edit_sales')->name('sales.edit');
        Route::put('/sales/{sale}', 'update')->middleware('permission:edit_sales')->name('sales.update');
        Route::delete('/sales/{sale}', 'destroy')->middleware('permission:delete_sales')->name('sales.destroy');
        Route::post('/sales/{sale}/confirm', 'confirm')->middleware('permission:confirm_sales')->name('sales.confirm');
        Route::post('/sales/{sale}/cancel', 'cancel')->middleware('permission:cancel_sales')->name('sales.cancel');
    });

    Route::controller(StockMovementController::class)->middleware(['verified'])->group(function () {
        Route::get('/movements', 'index')->middleware('permission:view_movements')->name('movements.index');
    });

    Route::controller(TransferController::class)->middleware(['verified'])->group(function () {
        Route::get('/transfers/create', 'create')->middleware('permission:create_transfers')->name('transfers.create');
        Route::post('/transfers', 'store')->middleware('permission:create_transfers')->name('transfers.store');
    });

    Route::controller(InventoryController::class)->middleware(['verified'])->group(function () {
        Route::get('/inventory', 'index')->middleware('permission:view_inventory')->name('inventory.index');
        Route::get('/inventory/create', 'create')->middleware('permission:view_inventory')->name('inventory.create');
        Route::post('/inventory', 'store')->middleware('permission:view_inventory')->name('inventory.store');
        Route::get('/inventory/{adjustment}/edit', 'edit')->middleware('permission:view_inventory')->name('inventory.edit');
        Route::put('/inventory/{adjustment}', 'update')->middleware('permission:view_inventory')->name('inventory.update');
        Route::post('/inventory/{adjustment}/validate', 'validate')->middleware('permission:validate_inventory')->name('inventory.validate');
    });

    Route::controller(ReportController::class)->middleware(['verified'])->group(function () {
        Route::get('/reports', 'index')->middleware('permission:view_reports')->name('reports.index');
        Route::get('/reports/export', 'export')->middleware('permission:view_reports')->name('reports.export');
    });

    Route::controller(UserController::class)->middleware(['verified', 'role:Admin'])->group(function () {
        Route::get('/users', 'index')->middleware('permission:view_users')->name('users.index');
        Route::get('/users/create', 'create')->middleware('permission:manage_users')->name('users.create');
        Route::post('/users', 'store')->middleware('permission:manage_users')->name('users.store');
        Route::get('/users/{user}/edit', 'edit')->middleware('permission:manage_users')->name('users.edit');
        Route::put('/users/{user}', 'update')->middleware('permission:manage_users')->name('users.update');
        Route::delete('/users/{user}', 'destroy')->middleware('permission:manage_users')->name('users.destroy');
    });

    Route::controller(SettingsController::class)->middleware(['verified', 'role:Admin'])->group(function () {
        Route::get('/settings', 'edit')->middleware('permission:manage_users')->name('settings.index');
        Route::put('/settings', 'update')->middleware('permission:manage_users')->name('settings.update');
    });
});

require __DIR__.'/auth.php';
