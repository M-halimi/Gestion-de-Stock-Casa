<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class StockMovement extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    public const TYPE_PURCHASE = 'purchase';
    public const TYPE_SALE = 'sale';
    public const TYPE_ADJUSTMENT = 'adjustment';
    public const TYPE_TRANSFER_IN = 'transfer_in';
    public const TYPE_TRANSFER_OUT = 'transfer_out';
    public const TYPE_PRODUCTION_IN = 'production_in';
    public const TYPE_PRODUCTION_OUT = 'production_out';
    public const TYPE_INITIAL_STOCK = 'initial_stock';
    public const TYPE_BARCODE_IN = 'barcode_in';
    public const TYPE_BARCODE_OUT = 'barcode_out';

    protected $fillable = [
        'product_id',
        'product_variant_id',
        'warehouse_id',
        'type',
        'quantity',
        'reason',
        'reference_type',
        'reference_id',
        'user_id',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'created_at' => 'datetime',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
