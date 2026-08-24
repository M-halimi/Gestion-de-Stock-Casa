<?php

namespace App\Services\Importers;

use App\Models\Customer;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Model;

class CustomerImporter implements ImporterInterface
{
    public function getColumns(): array
    {
        return [
            [
                'key' => 'name',
                'name' => 'Nom du client',
                'required' => true,
                'aliases' => ['name', 'nom', 'client', 'customer_name', 'raison_sociale'],
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
            [
                'key' => 'city',
                'name' => 'Ville',
                'required' => false,
                'aliases' => ['ville', 'city', 'commune'],
            ],
            [
                'key' => 'notes',
                'name' => 'Notes',
                'required' => false,
                'aliases' => ['notes', 'commentaires', 'remarks'],
            ],
        ];
    }

    public function validateRow(array $row, int $rowNum): array
    {
        $errors = [];

        if (empty($row['name'])) {
            $errors['name'] = 'Le nom du client est requis.';
        }

        if (! empty($row['email']) && ! filter_var($row['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'L\'adresse email n\'est pas valide.';
        }

        if (! empty($row['phone']) && strlen($row['phone']) < 8) {
            $errors['phone'] = 'Le numéro de téléphone est trop court.';
        }

        return $errors;
    }

    public function resolveRelations(array $row): array
    {
        return $row;
    }

    public function detectDuplicates(array $row): ?Model
    {
        $query = Customer::query();

        if (! empty($row['phone'])) {
            $existing = $query->where('phone', $row['phone'])->first();
            if ($existing) {
                return $existing;
            }
        }

        if (! empty($row['email'])) {
            $existing = $query->where('email', $row['email'])->first();
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
            'phone' => ! empty($row['phone']) ? $row['phone'] : null,
            'email' => ! empty($row['email']) ? $row['email'] : null,
            'address' => ! empty($row['address']) ? $row['address'] : null,
            'city' => ! empty($row['city']) ? $row['city'] : null,
            'notes' => ! empty($row['notes']) ? $row['notes'] : null,
        ];

        if ($existing && ($options['update_existing'] ?? false)) {
            $existing->update($data);
            AuditLogger::action(
                action: 'import_updated',
                entityType: 'Customer',
                entityId: $existing->id,
                description: 'Client mis à jour via import',
                newValues: $data
            );
            return $existing->fresh();
        }

        $customer = Customer::create($data);
        AuditLogger::created($customer, 'Client créé via import');
        return $customer;
    }

    public function getTemplate(): array
    {
        return [
            'headers' => ['Nom', 'Téléphone', 'Email', 'Adresse', 'Ville', 'Notes'],
            'example' => ['Jean Dupont', '+33612345678', 'jean@example.com', '123 Rue de Paris', 'Paris', 'Client fidèle'],
        ];
    }
}
