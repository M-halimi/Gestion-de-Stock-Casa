<?php

namespace App\Services\Importers;

use App\Models\Unit;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Model;

class UnitImporter implements ImporterInterface
{
    public function getColumns(): array
    {
        return [
            [
                'key' => 'name',
                'name' => 'Nom de l\'unité',
                'required' => true,
                'aliases' => ['name', 'nom', 'unite', 'unit', 'unit_name', 'unité'],
            ],
            [
                'key' => 'abbreviation',
                'name' => 'Abréviation',
                'required' => true,
                'aliases' => ['abreviation', 'abbreviation', 'abbr', 'abréviation'],
            ],
        ];
    }

    public function validateRow(array $row, int $rowNum): array
    {
        $errors = [];

        if (empty($row['name'])) {
            $errors['name'] = 'Le nom de l\'unité est requis.';
        }

        if (empty($row['abbreviation'])) {
            $errors['abbreviation'] = 'L\'abréviation est requise.';
        }

        return $errors;
    }

    public function resolveRelations(array $row): array
    {
        return $row;
    }

    public function detectDuplicates(array $row): ?Model
    {
        $query = Unit::query();

        if (! empty($row['name'])) {
            $existing = $query->where('name', $row['name'])->first();
            if ($existing) {
                return $existing;
            }
        }

        if (! empty($row['abbreviation'])) {
            $existing = $query->where('abbreviation', $row['abbreviation'])->first();
            if ($existing) {
                return $existing;
            }
        }

        return null;
    }

    public function import(array $row, ?Model $existing, array $options): Model
    {
        $data = [
            'name' => $row['name'],
            'abbreviation' => $row['abbreviation'],
        ];

        if ($existing && ($options['update_existing'] ?? false)) {
            $existing->update($data);
            AuditLogger::action(
                action: 'import_updated',
                entityType: 'Unit',
                entityId: $existing->id,
                description: 'Unité mise à jour via import',
                newValues: $data
            );
            return $existing->fresh();
        }

        $unit = Unit::create($data);
        AuditLogger::created($unit, 'Unité créée via import');
        return $unit;
    }

    public function getTemplate(): array
    {
        return [
            'headers' => ['Nom', 'Abréviation'],
            'example' => ['Pièce', 'pce'],
        ];
    }
}
