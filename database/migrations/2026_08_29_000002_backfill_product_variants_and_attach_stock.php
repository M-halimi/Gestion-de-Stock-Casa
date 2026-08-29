<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private array $tables = [
        'stocks',
        'stock_movements',
        'sale_items',
        'purchase_items',
        'inventory_adjustment_items',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('product_variant_id')
                    ->nullable()
                    ->after('product_id')
                    ->constrained('product_variants')
                    ->restrictOnDelete();
            });
        }

        DB::table('products')->orderBy('id')->each(function (object $product): void {
            $variantId = DB::table('product_variants')
                ->where('product_id', $product->id)
                ->where('is_legacy', true)
                ->value('id');

            if (! $variantId) {
                $variantId = DB::table('product_variants')->insertGetId([
                    'product_id' => $product->id,
                    'combination_key' => 'legacy',
                    'barcode' => $product->barcode,
                    'is_legacy' => true,
                    'status' => $product->status,
                    'created_at' => $product->created_at ?? now(),
                    'updated_at' => $product->updated_at ?? now(),
                ]);
            }

            foreach ($this->tables as $tableName) {
                DB::table($tableName)
                    ->where('product_id', $product->id)
                    ->whereNull('product_variant_id')
                    ->update(['product_variant_id' => $variantId]);
            }
        });

        Schema::table('stocks', function (Blueprint $table) {
            // The legacy composite unique index is also the only usable index
            // for the existing product foreign key on MySQL. Keep that FK
            // valid while replacing the stock uniqueness rule.
            $table->index('product_id');
            $table->dropUnique('stocks_product_id_warehouse_id_unique');
            $table->unique(['product_variant_id', 'warehouse_id']);
        });
    }

    public function down(): void
    {
        Schema::table('stocks', function (Blueprint $table) {
            $table->dropUnique('stocks_product_variant_id_warehouse_id_unique');
            $table->dropIndex('stocks_product_id_index');
            $table->unique(['product_id', 'warehouse_id']);
        });

        foreach (array_reverse($this->tables) as $tableName) {
            Schema::table($tableName, function (Blueprint $table) {
                $table->dropForeign(['product_variant_id']);
                $table->dropColumn('product_variant_id');
            });
        }
    }
};
