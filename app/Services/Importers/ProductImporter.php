<?php

namespace App\Services\Importers;

use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Model;

class ProductImporter implements ImporterInterface
{
    public function getColumns(): array
    {
        return [
            [
                'key' => 'name',
                'name' => 'Nom du produit',
                'required' => true,
                'aliases' => ['name', 'nom', 'nom_produit', 'produit', 'product_name', 'designation'],
            ],
            [
                'key' => 'sku',
                'name' => 'SKU / Référence',
                'required' => false,
                'aliases' => ['sku', 'reference', 'ref', 'code', 'code_produit'],
            ],
            [
                'key' => 'barcode',
                'name' => 'Code-barres',
                'required' => false,
                'aliases' => ['barcode', 'code_barres', 'ean', 'upc'],
            ],
            [
                'key' => 'category',
                'name' => 'Catégorie',
                'required' => false,
                'aliases' => ['categorie', 'category', 'cat', 'category_name'],
            ],
            [
                'key' => 'unit',
                'name' => 'Unité',
                'required' => false,
                'aliases' => ['unite', 'unit', 'unit_name', 'unité'],
            ],
            [
                'key' => 'purchase_price',
                'name' => "Prix d'achat",
                'required' => false,
                'aliases' => ['prix_achat', 'purchase_price', 'prix', 'cost', 'prix_de_revient'],
            ],
            [
                'key' => 'sale_price',
                'name' => 'Prix de vente',
                'required' => false,
                'aliases' => ['prix_vente', 'sale_price', 'pv', 'prix_vente_ht'],
            ],
            [
                'key' => 'min_stock',
                'name' => 'Stock minimum',
                'required' => false,
                'aliases' => ['stock_min', 'min_stock', 'stock_minimum', 'seuil', 'seuil_alerte'],
            ],
            [
                'key' => 'description',
                'name' => 'Description',
                'required' => false,
                'aliases' => ['description', 'desc', 'details'],
            ],
            [
                'key' => 'status',
                'name' => 'Statut',
                'required' => false,
                'aliases' => ['statut', 'status', 'etat', 'active'],
            ],
        ];
    }

    public function validateRow(array $row, int $rowNum): array
    {
        $errors = [];

        if (empty($row['name'])) {
            $errors['name'] = 'Le nom du produit est requis.';
        }

        if (! empty($row['purchase_price']) && ! is_numeric($row['purchase_price'])) {
            $errors['purchase_price'] = 'Le prix d\'achat doit être un nombre.';
        }

        if (! empty($row['sale_price']) && ! is_numeric($row['sale_price'])) {
            $errors['sale_price'] = 'Le prix de vente doit être un nombre.';
        }

        if (! empty($row['min_stock']) && ! is_numeric($row['min_stock'])) {
            $errors['min_stock'] = 'Le stock minimum doit être un nombre.';
        }

        if (! empty($row['category'])) {
            $category = Category::where('name', $row['category'])->first();
            if (! $category) {
                $errors['category'] = 'La catégorie "' . $row['category'] . '" n\'existe pas.';
            }
        }

        if (! empty($row['unit'])) {
            $unit = Unit::where('name', $row['unit'])->first();
            if (! $unit) {
                $errors['unit'] = 'L\'unité "' . $row['unit'] . '" n\'existe pas.';
            }
        }

        if (! empty($row['status'])) {
            $validStatuses = ['active', 'inactive', 'actif', 'inactif'];
            $statusMap = ['actif' => 'active', 'inactif' => 'inactive'];
            $normalized = strtolower(trim($row['status']));
            if (! in_array($normalized, $validStatuses)) {
                $errors['status'] = 'Le statut doit être : active, inactive, actif ou inactif.';
            }
        }

        return $errors;
    }

    public function resolveRelations(array $row): array
    {
        if (! empty($row['category'])) {
            $category = Category::where('name', $row['category'])->first();
            $row['category_id'] = $category?->id;
        }

        if (! empty($row['unit'])) {
            $unit = Unit::where('name', $row['unit'])->first();
            $row['unit_id'] = $unit?->id;
        }

        if (! empty($row['status'])) {
            $statusMap = ['actif' => 'active', 'inactif' => 'inactive'];
            $normalized = strtolower(trim($row['status']));
            $row['status'] = $statusMap[$normalized] ?? $normalized;
        }

        $row['purchase_price'] = ! empty($row['purchase_price']) ? (float) $row['purchase_price'] : 0;
        $row['sale_price'] = ! empty($row['sale_price']) ? (float) $row['sale_price'] : 0;
        $row['min_stock'] = ! empty($row['min_stock']) ? (float) $row['min_stock'] : 0;

        return $row;
    }

    public function detectDuplicates(array $row): ?Model
    {
        $query = Product::query();

        if (! empty($row['sku'])) {
            $existing = $query->where('sku', $row['sku'])->first();
            if ($existing) {
                return $existing;
            }
        }

        if (! empty($row['barcode'])) {
            $existing = $query->where('barcode', $row['barcode'])->first();
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
            'sku' => ! empty($row['sku']) ? $row['sku'] : null,
            'barcode' => ! empty($row['barcode']) ? $row['barcode'] : null,
            'category_id' => $row['category_id'] ?? null,
            'unit_id' => $row['unit_id'] ?? null,
            'purchase_price' => $row['purchase_price'],
            'sale_price' => $row['sale_price'],
            'min_stock' => $row['min_stock'],
            'description' => ! empty($row['description']) ? $row['description'] : null,
            'status' => $row['status'] ?? 'active',
        ];

        if ($existing && ($options['update_existing'] ?? false)) {
            $existing->update($data);
            AuditLogger::action(
                action: 'import_updated',
                entityType: 'Product',
                entityId: $existing->id,
                description: 'Produit mis à jour via import',
                newValues: $data
            );
            return $existing->fresh();
        }

        $product = Product::create($data);
        AuditLogger::created($product, 'Produit créé via import');
        return $product;
    }

    public function getTemplate(): array
    {
        return [
            'headers' => ['Nom', 'SKU', 'Code-barres', 'Catégorie', 'Unité', "Prix d'achat", 'Prix de vente', 'Stock min.', 'Description', 'Statut'],
            'example' => ['Produit A', 'PRD-001', '1234567890123', 'Électronique', 'Pièce', '25.00', '45.00', '10', 'Description du produit', 'active'],
        ];
    }
}
