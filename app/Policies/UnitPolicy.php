<?php

namespace App\Policies;

use App\Models\Unit;
use App\Models\User;

class UnitPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('view_units');
    }

    public function create(User $user): bool
    {
        return $user->can('create_units');
    }

    public function update(User $user, Unit $unit): bool
    {
        return $user->can('edit_units');
    }

    public function delete(User $user, Unit $unit): bool
    {
        return $user->can('delete_units');
    }
}