<?php

namespace App\Http\Controllers;

use App\Models\Warehouse;
use App\Services\AuditLogger;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'warehouse_id' => ['nullable', 'integer'],
        ]);

        $type = $request->string('type', 'stock')->toString();
        if (! in_array($type, app(ReportService::class)->types(), true)) {
            $type = 'stock';
        }

        $filters = $request->only(['from', 'to', 'warehouse_id']);

        $summary = app(ReportService::class)->summary($type, $filters);

        return Inertia::render('Reports/Index', [
            'active_type' => $type,
            'types' => app(ReportService::class)->types(),
            'summary' => [
                'totals' => $summary['totals'],
                'period' => $summary['period'],
                'preview' => array_slice($summary['rows'], 0, 50),
            ],
            'warehouses' => Warehouse::orderBy('name')->get(['id', 'name', 'code']),
            'filters' => $filters,
        ]);
    }

    public function export(Request $request): SymfonyResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'in:stock,purchases,sales,movements'],
            'format' => ['required', 'in:csv,pdf'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'warehouse_id' => ['nullable', 'integer'],
        ]);

        AuditLogger::log(
            action: 'report_exported',
            entityType: 'Report',
            description: "Exported {$validated['type']} report as {$validated['format']}",
            newValues: $request->only(['from', 'to', 'warehouse_id']),
        );

        return app(ReportService::class)->export(
            $request->string('type')->toString(),
            $request->string('format')->toString(),
            $request->only(['from', 'to', 'warehouse_id']),
        );
    }
}
