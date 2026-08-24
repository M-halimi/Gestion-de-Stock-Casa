<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'action',
        'entity_type',
        'entity_id',
        'description',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    protected static function booted(): void
    {
        static::creating(function (AuditLog $log) {
            if (! $log->ip_address && request()->ip()) {
                $log->ip_address = request()->ip();
            }
            if (! $log->user_agent && request()->userAgent()) {
                $log->user_agent = request()->userAgent();
            }
            if (! $log->user_id && auth()->check()) {
                $log->user_id = auth()->id();
            }
        });
    }
}
