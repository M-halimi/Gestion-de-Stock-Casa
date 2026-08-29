<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE stock_movements MODIFY type ENUM('purchase','sale','adjustment','transfer_in','transfer_out','production_in','production_out','initial_stock','barcode_in','barcode_out') NOT NULL");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE stock_movements MODIFY type ENUM('purchase','sale','adjustment','transfer_in','transfer_out','production_in','production_out','initial_stock') NOT NULL");
        }
    }
};
