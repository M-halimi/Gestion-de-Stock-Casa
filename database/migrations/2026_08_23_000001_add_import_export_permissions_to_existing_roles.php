<?php

use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    private const PERMISSIONS = ['import_data', 'export_data'];

    public function up(): void
    {
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::PERMISSIONS as $permission) {
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }

        Role::whereIn('name', ['Admin', 'Manager'])
            ->get()
            ->each(fn (Role $role) => $role->givePermissionTo(self::PERMISSIONS));

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        Role::whereIn('name', ['Admin', 'Manager'])
            ->get()
            ->each(fn (Role $role) => $role->revokePermissionTo(self::PERMISSIONS));

        Permission::whereIn('name', self::PERMISSIONS)
            ->where('guard_name', 'web')
            ->whereDoesntHave('roles')
            ->delete();

        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
