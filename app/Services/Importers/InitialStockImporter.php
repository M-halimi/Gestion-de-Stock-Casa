<?php

namespace App\Services\Importers;

use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Warehouse;
use App\Services\AuditLogger;
use Illuminate\Database\Eloquent\Model;

class InitialStockImporter implements ImporterInterface
{
    public function getColumns(): array
    {
        return [
            [
                'key' => 'product',
                'name' => 'Nom du produit',
                'required' => false,
                'aliases' => ['produit', 'product', 'product_name', 'nom_produit'],
            ],
            [
                'key' => 'sku',
                'name' => 'SKU / Référence',
                'required' => false,
                'aliases' => ['sku', 'reference', 'ref', 'code', 'code_produit'],
            ],
            [
                'key' => 'warehouse',
                'name' => 'Nom de l\'entrepôt',
                'required' => false,
                'aliases' => ['entrepot', 'warehouse', 'warehouse_name', 'entrepôt'],
            ],
            [
                'key' => 'warehouse_code',
                'name' => 'Code entrepôt',
                'required' => false,
                'aliases' => ['code_entrepot', 'warehouse_code', 'code_entrepôt'],
            ],
            [
                'key' => 'quantity',
                'name' => 'Quantité',
                'required' => true,
                'aliases' => ['quantite', 'quantity', 'qtte', 'qty', 'stock'],
            ],
            [
                'key' => 'unit',
                'name' => 'Unité',
                'required' => false,
                'aliases' => ['unite', 'unit', 'unit_name', 'unité'],
            ],
        ];
    }

    public function validateRow(array $row, int $rowNum): array
    {
        $errors = [];

        if (empty($row['product']) && empty($row['sku'])) {
            $errors['product'] = 'Le nom du produit ou le SKU est requis.';
        }

        if (empty($row['warehouse']) && empty($row['warehouse_code'])) {
            $errors['warehouse'] = 'Le nom de l\'entrepôt ou le code est requis.';
        }

        if (empty($row['quantity']) || ! is_numeric($row['quantity']) || (float) $row['quantity'] < 0) {
            $errors['quantity'] = 'La quantité doit être un nombre positif.';
        }

        if (! empty($row['sku'])) {
            $product = Product::where('sku', $row['sku'])->first();
            if (! $product) {
                $errors['sku'] = 'Aucun produit trouvé avec le SKU "' . $row['sku'] . '".';
            }
        } elseif (! empty($row['product'])) {
            $product = Product::where('name', $row['product'])->first();
            if (! $product) {
                $errors['product'] = 'Aucun produit trouvé avec le nom "' . $row['product'] . '".';
            }
        }

        if (! empty($row['warehouse_code'])) {
            $warehouse = Warehouse::where('code', $row['warehouse_code'])->first();
            if (! $warehouse) {
                $errors['warehouse_code'] = 'Aucun entrepôt trouvé avec le code "' . $row['warehouse_code'] . '".';
            }
        } elseif (! empty($row['warehouse'])) {
            $warehouse = Warehouse::where('name', $row['warehouse'])->first();
            if (! $warehouse) {
                $errors['warehouse'] = 'Aucun entrepôt trouvé avec le nom "' . $row['warehouse'] . '".';
            }
        }

        return $errors;
    }

    public function resolveRelations(array $row): array
    {
        if (! empty($row['sku'])) {
            $product = Product::where('sku', $row['sku'])->first();
            $row['product_id'] = $product?->id;
        } elseif (! empty($row['product'])) {
            $product = Product::where('name', $row['product'])->first();
            $row['product_id'] = $product?->id;
        }

        if (! empty($row['warehouse_code'])) {
            $warehouse = Warehouse::where('code', $row['warehouse_code'])->first();
            $row['warehouse_id'] = $warehouse?->id;
        } elseif (! empty($row['warehouse'])) {
            $warehouse = Warehouse::where('name', $row['warehouse'])->first();
            $row['warehouse_id'] = $warehouse?->id;
        }

        $row['quantity'] = (float) ($row['quantity'] ?? 0);

        return $row;
    }

    public function detectDuplicates(array $row): ?Model
    {
        if (empty($row['product_id']) || empty($row['warehouse_id'])) {
            return null;
        }

        return Stock::where('product_id', $row['product_id'])
            ->where('warehouse_id', $row['warehouse_id'])
            ->first();
    }

    public function import(array $row, ?Model $existing, array $options): Model
    {
        $quantity = $row['quantity'];
        $productId = $row['product_id'];
        $warehouseId = $row['warehouse_id'];

        $stock = Stock::updateOrCreate(
            [
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
            ],
            [
                'quantity' => $existing ? (float) $existing->quantity + $quantity : $quantity,
            ]
        );

        StockMovement::create([
            'product_id' => $productId,
            'warehouse_id' => $warehouseId,
            // Initial stock is an inventory adjustment in the existing movement
            // vocabulary; this keeps imports compatible with older databases.
            'type' => 'adjustment',
            'quantity' => $quantity,
            'reason' => 'Import stock initial',
            'user_id' => auth()->id(),
        ]);

        AuditLogger::action(
            action: 'import_stock_initial',
            entityType: 'Stock',
            entityId: $stock->id,
            description: sprintf('Stock initial importé : %s unités pour le produit #%d dans l\'entrepôt #%d', $quantity, $productId, $warehouseId),
            newValues: [
                'product_id' => $productId,
                'warehouse_id' => $warehouseId,
                'quantity' => $quantity,
            ]
        );

        return $stock;
    }

    public function getTemplate(): array
    {
        return [
            'headers' => ['Produit', 'SKU', 'Entrepôt', 'Code entrepôt', 'Quantité', 'Unité'],
            'example' => ['Produit A', 'PRD-001', 'Entrepôt Principal', 'EP01', '100', 'Pièce'],
        ];
    }
}
