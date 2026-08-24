<?php

namespace App\Services\Importers;

use App\Models\Supplier;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Model;

class SupplierImporter implements ImporterInterface
{
    public function getColumns(): array
    {
        return [
            [
                'key' => 'name',
                'name' => 'Nom du fournisseur',
                'required' => true,
                'aliases' => ['name', 'nom', 'fournisseur', 'supplier_name', 'raison_sociale'],
            ],
            [
                'key' => 'contact_person',
                'name' => 'Personne de contact',
                'required' => false,
                'aliases' => ['contact', 'contact_person', 'responsable', 'interlocuteur'],
            ],
            [
                'key' => 'phone',
                'name' => 'Téléphone',
                'required' => false,
                'aliases' => ['tel', 'telephone', 'phone', 'téléphone', 'mobile'],
            ],
            [
                'key' => 'email',
                'name' => 'Email',
                'required' => false,
                'aliases' => ['email', 'mail', 'e-mail', 'courriel'],
            ],
            [
                'key' => 'address',
                'name' => 'Adresse',
                'required' => false,
                'aliases' => ['adresse', 'address', 'rue'],
            ],
        ];
    }

    public function validateRow(array $row, int $rowNum): array
    {
        $errors = [];

        if (empty($row['name'])) {
            $errors['name'] = 'Le nom du fournisseur est requis.';
        }

        if (! empty($row['email']) && ! filter_var($row['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'L\'adresse email n\'est pas valide.';
        }

        return $errors;
    }

    public function resolveRelations(array $row): array
    {
        return $row;
    }

    public function detectDuplicates(array $row): ?Model
    {
        $query = Supplier::query();

        if (! empty($row['email'])) {
            $existing = $query->where('email', $row['email'])->first();
            if ($existing) {
                return $existing;
            }
        }

        if (! empty($row['phone'])) {
            $existing = $query->where('phone', $row['phone'])->first();
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
            'contact_person' => ! empty($row['contact_person']) ? $row['contact_person'] : null,
            'phone' => ! empty($row['phone']) ? $row['phone'] : null,
            'email' => ! empty($row['email']) ? $row['email'] : null,
            'address' => ! empty($row['address']) ? $row['address'] : null,
        ];

        if ($existing && ($options['update_existing'] ?? false)) {
            $existing->update($data);
            AuditLogger::action(
                action: 'import_updated',
                entityType: 'Supplier',
                entityId: $existing->id,
                description: 'Fournisseur mis à jour via import',
                newValues: $data
            );
            return $existing->fresh();
        }

        $supplier = Supplier::create($data);
        AuditLogger::created($supplier, 'Fournisseur créé via import');
        return $supplier;
    }

    public function getTemplate(): array
    {
        return [
            'headers' => ['Nom', 'Contact', 'Téléphone', 'Email', 'Adresse'],
            'example' => ['Fournisseur X', 'Marie Martin', '+33698765432', 'contact@fournisseur.fr', '456 Rue de Lyon'],
        ];
    }
}
