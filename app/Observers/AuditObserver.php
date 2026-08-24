<?php

namespace App\Observers;

use App\Models\AuditLog;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Model;

class AuditObserver
{
    public function created(Model $model): void
    {
        if ($model instanceof AuditLog) {
            return;
        }

        AuditLogger::created($model);
    }

    public function updated(Model $model): void
    {
        if ($model instanceof AuditLog) {
            return;
        }

        $changes = $model->getChanges();

        if (empty($changes)) {
            return;
        }

        AuditLogger::updated($model, $changes);
    }

    public function deleted(Model $model): void
    {
        if ($model instanceof AuditLog) {
            return;
        }

        AuditLogger::deleted($model);
    }

    public function restored(Model $model): void
    {
        if ($model instanceof AuditLog) {
            return;
        }

        AuditLogger::restored($model);
    }
}
