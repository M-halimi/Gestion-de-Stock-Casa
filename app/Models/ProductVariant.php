<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    use HasFactory;

    public const STATUS_ACTIVE = 'active';
    public const STATUS_INACTIVE = 'inactive';

    protected $fillable = [
        'product_id',
        'color_id',
        'size_id',
        'combination_key',
        'variant_code',
        'barcode',
        'is_legacy',
        'status',
    ];

    protected $casts = ['is_legacy' => 'boolean'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function color(): BelongsTo
    {
        return $this->belongsTo(Color::class);
    }

    public function size(): BelongsTo
    {
        return $this->belongsTo(Size::class);
    }

    public function stocks(): HasMany
    {
        return $this->hasMany(Stock::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function totalQuantity(?int $warehouseId = null): float
    {
        $query = $this->stocks();

        if ($this->is_legacy) {
            $query = Stock::query()
                ->where('product_id', $this->product_id)
                ->where(function ($stock) {
                    $stock->where('product_variant_id', $this->id)->orWhereNull('product_variant_id');
                });
        }

        return (float) $query
            ->when($warehouseId, fn ($query) => $query->where('warehouse_id', $warehouseId))
            ->sum('quantity');
    }

    public function label(): string
    {
        if ($this->is_legacy) {
            return $this->product?->name ?? 'Default';
        }

        return trim(collect([$this->color?->name, $this->size?->name])->filter()->implode(' / '));
    }
}
