<?php

namespace App\Services\Importers;

use App\Models\Warehouse;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Model;

class WarehouseImporter implements ImporterInterface
{
    public function getColumns(): array
    {
        return [
            [
                'key' => 'name',
                'name' => 'Nom de l\'entrepôt',
                'required' => true,
                'aliases' => ['name', 'nom', 'entrepot', 'warehouse', 'warehouse_name', 'entrepôt'],
            ],
            [
                'key' => 'code',
                'name' => 'Code',
                'required' => true,
                'aliases' => ['code', 'reference', 'ref', 'code_entrepot'],
            ],
            [
                'key' => 'address',
                'name' => 'Adresse',
                'required' => false,
                'aliases' => ['adresse', 'address', 'rue'],
            ],
            [
                'key' => 'is_active',
                'name' => 'Actif',
                'required' => false,
                'aliases' => ['actif', 'is_active', 'active', 'statut'],
            ],
        ];
    }

    public function validateRow(array $row, int $rowNum): array
    {
        $errors = [];

        if (empty($row['name'])) {
            $errors['name'] = 'Le nom de l\'entrepôt est requis.';
        }

        if (empty($row['code'])) {
            $errors['code'] = 'Le code de l\'entrepôt est requis.';
        }

        return $errors;
    }

    public function resolveRelations(array $row): array
    {
        if (! empty($row['is_active'])) {
            $row['is_active'] = in_array(strtolower(trim($row['is_active'])), ['oui', 'yes', '1', 'true', 'actif']);
        } else {
            $row['is_active'] = true;
        }

        return $row;
    }

    public function detectDuplicates(array $row): ?Model
    {
        if (! empty($row['code'])) {
            return Warehouse::where('code', $row['code'])->first();
        }

        return null;
    }

    public function import(array $row, ?Model $existing, array $options): Model
    {
        $data = [
            'name' => $row['name'],
            'code' => $row['code'],
            'address' => ! empty($row['address']) ? $row['address'] : null,
            'is_active' => $row['is_active'],
        ];

        if ($existing && ($options['update_existing'] ?? false)) {
            $existing->update($data);
            AuditLogger::action(
                action: 'import_updated',
                entityType: 'Warehouse',
                entityId: $existing->id,
                description: 'Entrepôt mis à jour via import',
                newValues: $data
            );
            return $existing->fresh();
        }

        $warehouse = Warehouse::create($data);
        AuditLogger::created($warehouse, 'Entrepôt créé via import');
        return $warehouse;
    }

    public function getTemplate(): array
    {
        return [
            'headers' => ['Nom', 'Code', 'Adresse', 'Actif'],
            'example' => ['Entrepôt Principal', 'EP01', '789 Rue de Marseille', 'oui'],
        ];
    }
}
