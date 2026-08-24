<?php

namespace App\Services\Importers;

use Illuminate\Database\Eloquent\Model;

interface ImporterInterface
{
    public function getColumns(): array;

    public function validateRow(array $row, int $rowNum): array;

    public function resolveRelations(array $row): array;

    public function detectDuplicates(array $row): ?Model;

    public function import(array $row, ?Model $existing, array $options): Model;

    public function getTemplate(): array;
}
