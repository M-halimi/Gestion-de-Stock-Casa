<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ImportError extends Model
{
    protected $fillable = [
        'import_id',
        'row_number',
        'field',
        'value',
        'error_message',
    ];

    protected $casts = [
        'row_number' => 'integer',
    ];

    public function import(): BelongsTo
    {
        return $this->belongsTo(Import::class);
    }
}
