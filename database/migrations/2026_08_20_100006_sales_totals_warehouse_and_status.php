<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->foreignId('warehouse_id')->nullable()->after('customer_id')->constrained()->nullOnDelete();
            $table->decimal('tax', 12, 2)->default(0)->after('discount');
            $table->enum('status', ['draft', 'confirmed', 'cancelled'])->default('draft')->change();
            $table->index('warehouse_id');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->decimal('discount', 12, 2)->default(0)->after('subtotal');
            $table->decimal('tax', 12, 2)->default(0)->after('discount');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->enum('status', ['paid', 'partial', 'cancelled'])->default('paid')->change();
            $table->dropForeign(['warehouse_id']);
            $table->dropIndex(['warehouse_id']);
            $table->dropColumn(['warehouse_id', 'tax']);
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn(['discount', 'tax']);
        });
    }
};