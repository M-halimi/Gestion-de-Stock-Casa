<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('variant_code', 20)->nullable()->after('combination_key');
        });

        DB::table('products')->orderBy('id')->each(function (object $product): void {
            $next = 1;
            DB::table('product_variants')
                ->where('product_id', $product->id)
                ->where('is_legacy', false)
                ->orderBy('id')
                ->each(function (object $variant) use (&$next): void {
                    DB::table('product_variants')
                        ->where('id', $variant->id)
                        ->update(['variant_code' => str_pad((string) $next++, 3, '0', STR_PAD_LEFT)]);
                });
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->unique(['product_id', 'variant_code']);
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropUnique('product_variants_product_id_variant_code_unique');
            $table->dropColumn('variant_code');
        });
    }
};
