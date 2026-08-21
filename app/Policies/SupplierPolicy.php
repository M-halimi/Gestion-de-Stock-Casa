<?php

namespace App\Policies;

use App\Models\Supplier;
use App\Models\User;

class SupplierPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('view_suppliers');
    }

    public function create(User $user): bool
    {
        return $user->can('create_suppliers');
    }

    public function update(User $user, Supplier $supplier): bool
    {
        return $user->can('edit_suppliers');
    }

    public function delete(User $user, Supplier $supplier): bool
    {
        return $user->can('delete_suppliers');
    }
}