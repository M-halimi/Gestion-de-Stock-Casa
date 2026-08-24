<?php

namespace App\Services\Importers;

use App\Models\Category;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Model;

class CategoryImporter implements ImporterInterface
{
    public function getColumns(): array
    {
        return [
            [
                'key' => 'name',
                'name' => 'Nom de la catégorie',
                'required' => true,
                'aliases' => ['name', 'nom', 'categorie', 'category', 'category_name'],
            ],
            [
                'key' => 'description',
                'name' => 'Description',
                'required' => false,
                'aliases' => ['description', 'desc', 'details'],
            ],
        ];
    }

    public function validateRow(array $row, int $rowNum): array
    {
        $errors = [];

        if (empty($row['name'])) {
            $errors['name'] = 'Le nom de la catégorie est requis.';
        }

        return $errors;
    }

    public function resolveRelations(array $row): array
    {
        return $row;
    }

    public function detectDuplicates(array $row): ?Model
    {
        if (! empty($row['name'])) {
            return Category::where('name', $row['name'])->first();
        }

        return null;
    }

    public function import(array $row, ?Model $existing, array $options): Model
    {
        $data = [
            'name' => $row['name'],
            'description' => ! empty($row['description']) ? $row['description'] : null,
        ];

        if ($existing && ($options['update_existing'] ?? false)) {
            $existing->update($data);
            AuditLogger::action(
                action: 'import_updated',
                entityType: 'Category',
                entityId: $existing->id,
                description: 'Catégorie mise à jour via import',
                newValues: $data
            );
            return $existing->fresh();
        }

        $category = Category::create($data);
        AuditLogger::created($category, 'Catégorie créée via import');
        return $category;
    }

    public function getTemplate(): array
    {
        return [
            'headers' => ['Nom', 'Description'],
            'example' => ['Électronique', 'Appareils électroniques et accessoires'],
        ];
    }
}
