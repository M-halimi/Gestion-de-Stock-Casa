<?php

namespace App\Policies;

use App\Models\Sale;
use App\Models\User;

class SalePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('view_sales');
    }

    public function view(User $user, Sale $sale): bool
    {
        return $user->can('view_sales');
    }

    public function create(User $user): bool
    {
        return $user->can('create_sales');
    }

    public function cancel(User $user, Sale $sale): bool
    {
        return $user->can('cancel_sales');
    }
}