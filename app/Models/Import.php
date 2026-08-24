<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Import extends Model
{
    protected $fillable = [
        'reference',
        'type',
        'file_name',
        'file_path',
        'total_rows',
        'successful_rows',
        'updated_rows',
        'skipped_rows',
        'failed_rows',
        'status',
        'mapping',
        'options',
        'created_by',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'total_rows' => 'integer',
        'successful_rows' => 'integer',
        'updated_rows' => 'integer',
        'skipped_rows' => 'integer',
        'failed_rows' => 'integer',
        'mapping' => 'array',
        'options' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    const STATUS_PENDING = 'pending';
    const STATUS_PARSED = 'parsed';
    const STATUS_PROCESSING = 'processing';
    const STATUS_COMPLETED = 'completed';
    const STATUS_COMPLETED_WITH_ERRORS = 'completed_with_errors';
    const STATUS_FAILED = 'failed';

    const TYPES = [
        'products' => 'Products',
        'customers' => 'Clients',
        'suppliers' => 'Fournisseurs',
        'categories' => 'Categories',
        'units' => 'Units',
        'warehouses' => 'Entrepôts',
        'initial_stock' => 'Stock initial',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function errors(): HasMany
    {
        return $this->hasMany(ImportError::class);
    }

    public static function generateReference(): string
    {
        $date = now()->format('Ymd');
        $last = static::where('reference', 'like', "IMP-{$date}-%")
            ->orderByDesc('reference')
            ->value('reference');

        if ($last) {
            $seq = (int) substr($last, -3) + 1;
        } else {
            $seq = 1;
        }

        return sprintf('IMP-%s-%03d', $date, $seq);
    }
}
