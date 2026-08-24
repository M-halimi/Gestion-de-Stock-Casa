<?php

namespace App\Services;

use App\Services\Importers\ImporterInterface;
use App\Services\Importers\ProductImporter;
use App\Services\Importers\CustomerImporter;
use App\Services\Importers\SupplierImporter;
use App\Services\Importers\CategoryImporter;
use App\Services\Importers\UnitImporter;
use App\Services\Importers\WarehouseImporter;
use App\Services\Importers\InitialStockImporter;
use App\Models\Import;
use App\Models\ImportError;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class ImportService
{
    private const CHUNK_SIZE = 500;

    private const ALLOWED_MIME_TYPES = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'text/plain',
    ];

    private const ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv'];

    private array $importers = [];

    public function __construct()
    {
        $this->importers = [
            'products' => ProductImporter::class,
            'customers' => CustomerImporter::class,
            'suppliers' => SupplierImporter::class,
            'categories' => CategoryImporter::class,
            'units' => UnitImporter::class,
            'warehouses' => WarehouseImporter::class,
            'initial_stock' => InitialStockImporter::class,
        ];
    }

    public function uploadFile(UploadedFile $file, string $type): Import
    {
        $extension = strtolower($file->getClientOriginalExtension());

        if (! in_array($extension, self::ALLOWED_EXTENSIONS)) {
            throw new \InvalidArgumentException(
                'Type de fichier non supporté. Extensions autorisées : ' . implode(', ', self::ALLOWED_EXTENSIONS)
            );
        }

        if ($file->getSize() === 0) {
            throw new \InvalidArgumentException('Le fichier est vide.');
        }

        $reference = Import::generateReference();
        $fileName = $reference . '.' . $extension;
        $filePath = $file->storeAs('imports', $fileName, 'local');

        return Import::create([
            'reference' => $reference,
            'type' => $type,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $filePath,
            'status' => Import::STATUS_PENDING,
            'created_by' => auth()->id(),
        ]);
    }

    public function parseFile(Import $import): array
    {
        $fullPath = Storage::disk('local')->path($import->file_path);

        if (! is_file($fullPath)) {
            throw new \RuntimeException('Le fichier d’import est introuvable.');
        }

        $extension = strtolower(pathinfo($import->file_name, PATHINFO_EXTENSION));

        if ($extension === 'csv') {
            return $this->parseCsv($fullPath);
        }

        return $this->parseExcel($fullPath);
    }

    /**
     * Parse an uploaded import and persist the state consumed by the wizard.
     */
    public function parseAndPrepare(Import $import): array
    {
        $parsed = $this->parseFile($import);
        $mapping = $this->autoMapColumns($parsed['headers'], $import->type);

        $import->update([
            'status' => Import::STATUS_PARSED,
            'total_rows' => count($parsed['rows']),
            'mapping' => $mapping,
        ]);

        return [
            'import' => $this->importPayload($import->fresh()),
            'preview' => [
                'headers' => $parsed['headers'],
                // Keep this alias while clients migrate; `headers` is canonical.
                'raw_headers' => $parsed['headers'],
                'rows' => array_slice($parsed['rows'], 0, 50),
                'total_rows' => count($parsed['rows']),
            ],
        ];
    }

    public function autoMapColumns(array $headers, string $type): array
    {
        $importer = $this->getImporter($type);
        $columns = $importer->getColumns();
        $mapping = [];

        foreach ($columns as $column) {
            $mapping[$column['key']] = null;
        }

        foreach ($headers as $headerIndex => $headerName) {
            $normalizedHeader = $this->normalizeHeader($headerName);

            foreach ($columns as $column) {
                $aliases = array_map([$this, 'normalizeHeader'], $column['aliases'] ?? []);
                $aliases[] = $this->normalizeHeader($column['name']);

                if (in_array($normalizedHeader, $aliases)) {
                    $mapping[$column['key']] = $headerIndex;
                    break;
                }
            }
        }

        return $mapping;
    }

    public function validateAndPreview(Import $import, array $mapping, array $options): array
    {
        $parsed = $this->parseFile($import);
        $headers = $parsed['headers'];
        $rows = $parsed['rows'];
        $importer = $this->getImporter($import->type);

        $mapping = $this->normalizeMapping($mapping, $headers, $import->type);

        $valid = [];
        $errors = [];
        $warnings = [];
        $preview = [];

        $limit = $options['preview_limit'] ?? 10;
        $processed = 0;

        foreach ($rows as $rowIndex => $row) {
            $rowNum = $rowIndex + 2;
            $mappedRow = $this->mapRow($row, $headers, $mapping);
            $rowErrors = $importer->validateRow($mappedRow, $rowNum);

            $resolvedRow = $importer->resolveRelations($mappedRow);
            $existing = $importer->detectDuplicates($resolvedRow);

            $rowData = [
                'row' => $rowNum,
                'data' => $resolvedRow,
                'is_duplicate' => $existing !== null,
                'existing_id' => $existing?->getKey(),
                'errors' => [],
                'warnings' => [],
            ];

            if (! empty($rowErrors)) {
                foreach ($rowErrors as $field => $message) {
                    $error = [
                        'row' => $rowNum,
                        'field' => $field,
                        'value' => $mappedRow[$field] ?? '',
                        'message' => $message,
                    ];
                    $errors[] = $error;
                    $rowData['errors'][] = $error;
                }
                $rowData['has_errors'] = true;
            } else {
                $rowData['has_errors'] = false;
                $valid[] = $rowData;
            }

            if ($existing !== null) {
                $warning = [
                    'row' => $rowNum,
                    'message' => 'Ligne en doublon (ID : ' . $existing->getKey() . ')',
                ];
                $warnings[] = $warning;
                $rowData['warnings'][] = $warning;
            }

            if ($processed < $limit) {
                $preview[] = $rowData;
            }

            $processed++;
        }

        $import->update([
            'total_rows' => count($rows),
            'mapping' => $mapping,
            'options' => $options,
        ]);

        $validRows = count($valid);
        $errorRows = count(array_unique(array_column($errors, 'row')));
        $warningRows = count(array_unique(array_column($warnings, 'row')));
        $displayHeaders = [];

        foreach ($mapping as $fieldKey => $headerIndex) {
            if ($headerIndex !== null && isset($headers[$headerIndex])) {
                $displayHeaders[$fieldKey] = $headers[$headerIndex];
            }
        }

        return [
            'total_rows' => count($rows),
            'valid_rows' => $validRows,
            'error_rows' => $errorRows,
            'warning_rows' => $warningRows,
            'headers' => $displayHeaders,
            'raw_headers' => $headers,
            'rows' => $preview,
        ];
    }

    public function execute(Import $import, array $mapping, array $options): Import
    {
        $parsed = $this->parseFile($import);
        $headers = $parsed['headers'];
        $rows = $parsed['rows'];
        $mapping = $this->normalizeMapping($mapping, $headers, $import->type);

        $import->update([
            'status' => Import::STATUS_PROCESSING,
            'started_at' => now(),
            'mapping' => $mapping,
            'options' => $options,
        ]);

        $importer = $this->getImporter($import->type);

        $successful = 0;
        $updated = 0;
        $skipped = 0;
        $failed = 0;

        // Preserve the original row indexes so error row numbers remain correct
        // after the first chunk.
        $chunks = array_chunk($rows, self::CHUNK_SIZE, true);

        foreach ($chunks as $chunk) {
            DB::transaction(function () use (
                $chunk, $headers, $mapping, $importer, $import, $options,
                &$successful, &$updated, &$skipped, &$failed
            ) {
                foreach ($chunk as $rowIndex => $row) {
                    $rowNum = $rowIndex + 2;
                    $mappedRow = $this->mapRow($row, $headers, $mapping);

                    try {
                        $rowErrors = $importer->validateRow($mappedRow, $rowNum);

                        if (! empty($rowErrors)) {
                            $failed++;
                            foreach ($rowErrors as $field => $message) {
                                ImportError::create([
                                    'import_id' => $import->id,
                                    'row_number' => $rowNum,
                                    'field' => $field,
                                    'value' => $mappedRow[$field] ?? '',
                                    'error_message' => $message,
                                ]);
                            }
                            continue;
                        }

                        $resolvedRow = $importer->resolveRelations($mappedRow);
                        $existing = $importer->detectDuplicates($resolvedRow);

                        if ($existing && ($options['skip_duplicates'] ?? false)) {
                            $skipped++;
                            continue;
                        }

                        $importer->import($resolvedRow, $existing, $options);

                        if ($existing) {
                            $updated++;
                        } else {
                            $successful++;
                        }
                    } catch (Throwable $e) {
                        $failed++;
                        ImportError::create([
                            'import_id' => $import->id,
                            'row_number' => $rowNum,
                            'field' => null,
                            'value' => null,
                            'error_message' => 'Erreur inattendue : ' . $e->getMessage(),
                        ]);
                    }
                }
            });
        }

        $status = $failed > 0
            ? ($successful > 0 || $updated > 0 ? Import::STATUS_COMPLETED_WITH_ERRORS : Import::STATUS_FAILED)
            : Import::STATUS_COMPLETED;

        $import->update([
            'status' => $status,
            'successful_rows' => $successful,
            'updated_rows' => $updated,
            'skipped_rows' => $skipped,
            'failed_rows' => $failed,
            'completed_at' => now(),
        ]);

        AuditLogger::log(
            action: 'import',
            entityType: 'Import',
            entityId: $import->id,
            description: sprintf(
                'Import %s terminé : %d créés, %d mis à jour, %d ignorés, %d échoués',
                $import->reference,
                $successful,
                $updated,
                $skipped,
                $failed
            ),
            newValues: [
                'type' => $import->type,
                'total_rows' => $import->total_rows,
                'successful_rows' => $successful,
                'updated_rows' => $updated,
                'skipped_rows' => $skipped,
                'failed_rows' => $failed,
            ]
        );

        return $import->fresh();
    }

    public function getImportTypes(): array
    {
        return [
            [
                'key' => 'products',
                'label' => 'Produits',
                'columns' => $this->getImporter('products')->getColumns(),
                'template' => $this->getImporter('products')->getTemplate(),
            ],
            [
                'key' => 'customers',
                'label' => 'Clients',
                'columns' => $this->getImporter('customers')->getColumns(),
                'template' => $this->getImporter('customers')->getTemplate(),
            ],
            [
                'key' => 'suppliers',
                'label' => 'Fournisseurs',
                'columns' => $this->getImporter('suppliers')->getColumns(),
                'template' => $this->getImporter('suppliers')->getTemplate(),
            ],
            [
                'key' => 'categories',
                'label' => 'Catégories',
                'columns' => $this->getImporter('categories')->getColumns(),
                'template' => $this->getImporter('categories')->getTemplate(),
            ],
            [
                'key' => 'units',
                'label' => 'Unités',
                'columns' => $this->getImporter('units')->getColumns(),
                'template' => $this->getImporter('units')->getTemplate(),
            ],
            [
                'key' => 'warehouses',
                'label' => 'Entrepôts',
                'columns' => $this->getImporter('warehouses')->getColumns(),
                'template' => $this->getImporter('warehouses')->getTemplate(),
            ],
            [
                'key' => 'initial_stock',
                'label' => 'Stock initial',
                'columns' => $this->getImporter('initial_stock')->getColumns(),
                'template' => $this->getImporter('initial_stock')->getTemplate(),
            ],
        ];
    }

    public function downloadErrorsCsv(Import $import): StreamedResponse
    {
        $errors = $import->errors()->orderBy('row_number')->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="erreurs_' . $import->reference . '.csv"',
        ];

        return response()->stream(function () use ($errors) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['Ligne', 'Champ', 'Valeur', 'Erreur'], ';');

            foreach ($errors as $error) {
                fputcsv($handle, [
                    $error->row_number,
                    $error->field ?? '',
                    $error->value ?? '',
                    $error->error_message,
                ], ';');
            }

            fclose($handle);
        }, 200, $headers);
    }

    public function getImporter(string $type): ImporterInterface
    {
        if (! isset($this->importers[$type])) {
            throw new \InvalidArgumentException("Type d'import inconnu : {$type}");
        }

        return app($this->importers[$type]);
    }

    public function importPayload(Import $import): array
    {
        return [
            'id' => $import->id,
            'reference' => $import->reference,
            'type' => $import->type,
            'status' => $import->status,
            'column_mappings' => $import->mapping ?? [],
        ];
    }

    private function normalizeMapping(array $mapping, array $headers, string $type): array
    {
        $allowedFields = array_column($this->getImporter($type)->getColumns(), 'key');
        $normalized = array_fill_keys($allowedFields, null);
        $usedIndexes = [];

        foreach ($mapping as $field => $headerIndex) {
            if (! in_array($field, $allowedFields, true) || $headerIndex === null || $headerIndex === '') {
                continue;
            }

            if (filter_var($headerIndex, FILTER_VALIDATE_INT) === false) {
                throw new \InvalidArgumentException("La colonne associée à {$field} doit être un index entier.");
            }

            $headerIndex = (int) $headerIndex;
            if ($headerIndex < 0 || $headerIndex >= count($headers)) {
                throw new \InvalidArgumentException("L’index de colonne associé à {$field} est invalide.");
            }

            if (in_array($headerIndex, $usedIndexes, true)) {
                throw new \InvalidArgumentException('Une même colonne ne peut pas être associée à plusieurs champs.');
            }

            $normalized[$field] = $headerIndex;
            $usedIndexes[] = $headerIndex;
        }

        return $normalized;
    }

    private function parseCsv(string $path): array
    {
        $handle = @fopen($path, 'r');

        if ($handle === false) {
            throw new \RuntimeException('Impossible de lire le fichier CSV.');
        }

        $firstLine = fgets($handle);

        if ($firstLine === false) {
            fclose($handle);
            throw new \RuntimeException('Le fichier CSV est vide.');
        }

        rewind($handle);

        $delimiter = str_contains($firstLine, ';') ? ';' : ',';

        $headers = fgetcsv($handle, 0, $delimiter);

        if ($headers === false || count(array_filter($headers, fn ($header) => trim((string) $header) !== '')) === 0) {
            fclose($handle);
            throw new \RuntimeException('Le fichier CSV ne contient pas d’en-têtes valides.');
        }

        $headers = array_map(fn ($header) => trim((string) $header), $headers);
        $rows = [];

        while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
            $rows[] = $row;
        }

        fclose($handle);

        return ['headers' => $headers, 'rows' => $rows];
    }

    private function parseExcel(string $path): array
    {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
        $sheet = $spreadsheet->getActiveSheet();
        $data = $sheet->toArray();

        $headers = $data[0] ?? [];
        $rows = array_slice($data, 1);

        return ['headers' => $headers, 'rows' => $rows];
    }

    private function mapRow(array $row, array $headers, array $mapping): array
    {
        $mapped = [];

        foreach ($mapping as $field => $headerIndex) {
            if ($headerIndex !== null && isset($row[$headerIndex])) {
                $mapped[$field] = trim((string) $row[$headerIndex]);
            } else {
                $mapped[$field] = null;
            }
        }

        return $mapped;
    }

    private function normalizeHeader(string $header): string
    {
        $header = mb_strtolower(trim($header));
        $header = preg_replace('/[^a-z0-9]/', '', $header);

        return $header;
    }
}
