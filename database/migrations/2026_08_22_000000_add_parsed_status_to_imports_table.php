<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE imports MODIFY COLUMN status ENUM('pending', 'parsed', 'processing', 'completed', 'completed_with_errors', 'failed') DEFAULT 'pending'");
    }

    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'sqlite') {
            return;
        }

        DB::statement("ALTER TABLE imports MODIFY COLUMN status ENUM('pending', 'processing', 'completed', 'completed_with_errors', 'failed') DEFAULT 'pending'");
    }
};
