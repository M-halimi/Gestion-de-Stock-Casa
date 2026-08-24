<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'view_dashboard',
            'view_products', 'create_products', 'edit_products', 'delete_products',
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
            'import_data', 'export_data',
            'view_users', 'manage_users',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $admin = Role::firstOrCreate(['name' => 'Admin']);
        $admin->syncPermissions($permissions);

        $manager = Role::firstOrCreate(['name' => 'Manager']);
        $manager->syncPermissions(array_values(array_diff($permissions, [
            'manage_users',
            'delete_products',
            'delete_categories',
            'delete_units',
            'delete_warehouses',
            'delete_production',
            'delete_purchases',
            'delete_sales',
            'view_audit_logs',
        ])));

        $employee = Role::firstOrCreate(['name' => 'Employee']);
        $employee->syncPermissions([
            'view_dashboard',
            'view_products',
            'view_categories',
            'view_units',
            'view_customers',
            'view_stock',
            'view_sales', 'create_sales', 'confirm_sales',
            'view_movements',
            'view_production',
        ]);
    }
}