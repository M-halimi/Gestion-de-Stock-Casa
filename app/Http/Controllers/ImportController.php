<?php

namespace App\Http\Controllers;

use App\Models\Import;
use App\Services\AuditLogger;
use App\Services\ExportService;
use App\Services\ImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class ImportController extends Controller
{
    public function __construct(
        private ImportService $importService,
    ) {}

    public function index(): InertiaResponse
    {
        $lastImports = [];
        foreach (Import::TYPES as $typeKey => $typeLabel) {
            $lastImports[$typeKey] = Import::where('type', $typeKey)
                ->latest()
                ->first();
        }

        return Inertia::render('Imports/Index', [
            'lastImports' => $lastImports,
        ]);
    }

    public function create(string $type): InertiaResponse
    {
        if (!isset(Import::TYPES[$type])) {
            abort(404);
        }

        $columns = $this->importService->getImporter($type)->getColumns();

        return Inertia::render('Imports/Wizard', [
            'type' => $type,
            'columns' => $columns,
        ]);
    }

    public function upload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|max:10240',
            'type' => 'required|string|in:' . implode(',', array_keys(Import::TYPES)),
        ]);

        $import = null;
        try {
            $import = $this->importService->uploadFile($request->file('file'), $validated['type']);

            AuditLogger::log(
                action: 'import_uploaded',
                entityType: 'Import',
                entityId: $import->id,
                description: "Import file \"{$import->file_name}\" uploaded for type \"{$validated['type']}\"",
            );

            return response()->json($this->importService->parseAndPrepare($import), 201);
        } catch (Throwable $e) {
            if ($import) {
                $import->update([
                    'status' => Import::STATUS_FAILED,
                    'completed_at' => now(),
                ]);
            }

            return response()->json([
                'error' => $e->getMessage(),
            ], 422);
        }
    }

    public function parse(Request $request, Import $import): JsonResponse
    {
        $filePath = $import->file_path;

        if (! Storage::disk('local')->exists($filePath)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        try {
            return response()->json($this->importService->parseAndPrepare($import));
        } catch (Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function preview(Request $request, Import $import): JsonResponse
    {
        $validated = $request->validate([
            'column_mappings' => 'required|array',
            'column_mappings.*' => 'nullable|integer',
        ]);

        try {
            return response()->json([
                'preview' => $this->importService->validateAndPreview(
                    $import,
                    $validated['column_mappings'],
                    ['preview_limit' => 100]
                ),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function execute(Request $request, Import $import): JsonResponse
    {
        $validated = $request->validate([
            'column_mappings' => 'required|array',
            'column_mappings.*' => 'nullable|integer',
            'duplicate_strategy' => 'nullable|string|in:skip,update,create_both',
        ]);

        $mapping = $validated['column_mappings'];

        $options = match ($validated['duplicate_strategy'] ?? null) {
            'skip' => ['skip_duplicates' => true],
            'update' => ['update_existing' => true],
            default => [],
        };

        AuditLogger::log(
            action: 'import_started',
            entityType: 'Import',
            entityId: $import->id,
            description: "Import \"{$import->reference}\" execution started",
        );

        try {
            $result = $this->importService->execute($import, $mapping, $options);

            return response()->json([
                'success' => true,
                'imported' => $result->successful_rows,
                'updated' => $result->updated_rows,
                'skipped' => $result->skipped_rows,
                'failed' => $result->failed_rows,
                'errors' => $result->errors->map(fn ($e) => [
                    'row' => $e->row_number,
                    'field' => $e->field,
                    'message' => $e->error_message,
                ])->values(),
            ]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        } catch (\Exception $e) {
            $import->update([
                'status' => Import::STATUS_FAILED,
                'completed_at' => now(),
            ]);

            AuditLogger::log(
                action: 'import_failed',
                entityType: 'Import',
                entityId: $import->id,
                description: "Import \"{$import->reference}\" failed: {$e->getMessage()}",
            );

            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function history(): InertiaResponse
    {
        $imports = Import::with('creator')
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Imports/History', [
            'imports' => $imports,
            'types' => Import::TYPES,
        ]);
    }

    public function errors(Import $import): JsonResponse
    {
        $errors = $import->errors()
            ->orderBy('row_number')
            ->get();

        return response()->json([
            'import' => $import,
            'errors' => $errors,
        ]);
    }

    public function downloadErrors(Import $import): Response
    {
        return $this->importService->downloadErrorsCsv($import);
    }

    public function downloadTemplate(string $type): Response|StreamedResponse
    {
        if (!isset(Import::TYPES[$type])) {
            abort(404);
        }

        $importer = $this->importService->getImporter($type);
        $template = $importer->getTemplate();
        $headers = $template['headers'];

        $callback = function () use ($headers) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, $headers);
            fclose($handle);
        };

        $filename = "{$type}-template.csv";

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }

    public function export(Request $request, string $type, ExportService $exportService): StreamedResponse
    {
        $validated = $request->validate([
            'search' => 'nullable|string',
            'status' => 'nullable|string',
            'category_id' => 'nullable|integer',
            'warehouse_id' => 'nullable|integer',
            'product_id' => 'nullable|integer',
            'type' => 'nullable|string',
            'from' => 'nullable|date',
            'to' => 'nullable|date|after_or_equal:from',
        ]);

        AuditLogger::log(
            action: 'exported',
            entityType: ucfirst($type),
            description: "Exported {$type} records",
        );

        return $exportService->export($type, $validated);
    }
}
