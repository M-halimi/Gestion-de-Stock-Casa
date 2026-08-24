<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Customer;
use App\Models\InventoryAdjustment;
use App\Models\Product;
use App\Models\Stock;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\Warehouse;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportService
{
    public const TYPES = [
        'products' => 'Produits',
        'customers' => 'Clients',
        'suppliers' => 'Fournisseurs',
        'categories' => 'Catégories',
        'units' => 'Unités',
        'warehouses' => 'Entrepôts',
        'stock' => 'Stock',
        'movements' => 'Mouvements',
        'inventory' => 'Inventaire',
    ];

    public function export(string $type, array $filters = []): StreamedResponse
    {
        if (!isset(self::TYPES[$type])) {
            throw new \InvalidArgumentException("Unknown export type [{$type}].");
        }

        return match ($type) {
            'products' => $this->exportProducts($filters),
            'customers' => $this->exportCustomers($filters),
            'suppliers' => $this->exportSuppliers($filters),
            'categories' => $this->exportCategories($filters),
            'units' => $this->exportUnits($filters),
            'warehouses' => $this->exportWarehouses($filters),
            'stock' => $this->exportStock($filters),
            'movements' => $this->exportMovements($filters),
            'inventory' => $this->exportInventory($filters),
        };
    }

    public function getExportTypes(): array
    {
        return self::TYPES;
    }

    private function exportProducts(array $filters): StreamedResponse
    {
        $query = Product::query()
            ->with(['category:id,name', 'unit:id,name,abbreviation']);

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        $query->orderBy('name');

        $headers = ['Nom', 'SKU', 'Code-barres', 'Catégorie', 'Unité', 'Prix de vente', 'Prix d\'achat', 'Stock min', 'Statut'];

        $rows = $query->cursor()->map(function (Product $p) {
            return [
                $p->name,
                $p->sku,
                $p->barcode ?? '',
                $p->category?->name ?? '',
                $p->unit?->name ?? '',
                $p->sale_price,
                $p->purchase_price,
                $p->min_stock,
                $p->status === 'active' ? 'Actif' : 'Inactif',
            ];
        });

        return $this->streamCsv($headers, $rows, 'produits');
    }

    private function exportCustomers(array $filters): StreamedResponse
    {
        $query = Customer::query();

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $query->orderBy('name');

        $headers = ['Nom', 'Téléphone', 'Email', 'Adresse', 'Ville', 'Notes'];

        $rows = $query->cursor()->map(function (Customer $c) {
            return [
                $c->name,
                $c->phone ?? '',
                $c->email ?? '',
                $c->address ?? '',
                $c->city ?? '',
                $c->notes ?? '',
            ];
        });

        return $this->streamCsv($headers, $rows, 'clients');
    }

    private function exportSuppliers(array $filters): StreamedResponse
    {
        $query = Supplier::query();

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('contact_person', 'like', "%{$search}%");
            });
        }

        $query->orderBy('name');

        $headers = ['Nom', 'Personne de contact', 'Téléphone', 'Email', 'Adresse'];

        $rows = $query->cursor()->map(function (Supplier $s) {
            return [
                $s->name,
                $s->contact_person ?? '',
                $s->phone ?? '',
                $s->email ?? '',
                $s->address ?? '',
            ];
        });

        return $this->streamCsv($headers, $rows, 'fournisseurs');
    }

    private function exportCategories(array $filters): StreamedResponse
    {
        $query = Category::query()->withCount('products');

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $query->orderBy('name');

        $headers = ['Nom', 'Description', 'Nombre de produits'];

        $rows = $query->cursor()->map(function (Category $c) {
            return [
                $c->name,
                $c->description ?? '',
                $c->products_count,
            ];
        });

        return $this->streamCsv($headers, $rows, 'categories');
    }

    private function exportUnits(array $filters): StreamedResponse
    {
        $query = Unit::query()->withCount('products');

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('abbreviation', 'like', "%{$search}%");
            });
        }

        $query->orderBy('name');

        $headers = ['Nom', 'Abréviation', 'Nombre de produits'];

        $rows = $query->cursor()->map(function (Unit $u) {
            return [
                $u->name,
                $u->abbreviation,
                $u->products_count,
            ];
        });

        return $this->streamCsv($headers, $rows, 'unites');
    }

    private function exportWarehouses(array $filters): StreamedResponse
    {
        $query = Warehouse::query()->withCount('stocks');

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('address', 'like', "%{$search}%");
            });
        }

        $query->orderBy('name');

        $headers = ['Nom', 'Code', 'Adresse', 'Actif'];

        $rows = $query->cursor()->map(function (Warehouse $w) {
            return [
                $w->name,
                $w->code,
                $w->address ?? '',
                $w->is_active ? 'Oui' : 'Non',
            ];
        });

        return $this->streamCsv($headers, $rows, 'entrepots');
    }

    private function exportStock(array $filters): StreamedResponse
    {
        $query = Product::query()
            ->with(['category:id,name', 'unit:id,name,abbreviation'])
            ->withSum('stocks as total_quantity', 'quantity');

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['warehouse_id'])) {
            $warehouseId = $filters['warehouse_id'];
            $query->with(['stocks' => fn ($q) => $q
                ->select(['id', 'product_id', 'warehouse_id', 'quantity'])
                ->where('warehouse_id', $warehouseId)
                ->with('warehouse:id,name')
            ]);
            $query->withSum(['stocks as total_quantity' => fn ($q) => $q->where('warehouse_id', $warehouseId)], 'quantity');
        }

        if (!empty($filters['status'])) {
            $query->having('total_quantity', $filters['status'] === 'out' ? '<=' : '>', 0);
            if ($filters['status'] === 'out') {
                $query->having('total_quantity', '<=', 0);
            }
        }

        $query->orderBy('name');

        $headers = ['Produit', 'SKU', 'Catégorie', 'Unité', 'Entrepôt', 'Quantité', 'Stock min', 'Statut', 'Valeur stock'];

        $rows = $query->cursor()->map(function (Product $p) use ($filters) {
            $qty = (float) $p->total_quantity;
            $min = (float) ($p->min_stock ?? 0);
            $stockValue = (float) $p->purchase_price * $qty;

            if ($qty <= 0) {
                $status = 'Rupture';
            } elseif ($qty <= $min) {
                $status = 'Stock bas';
            } else {
                $status = 'En stock';
            }

            $warehouseName = '';
            if (!empty($filters['warehouse_id']) && $p->stocks->count()) {
                $stock = $p->stocks->first();
                $warehouseName = $stock->warehouse->name ?? '';
            }

            return [
                $p->name,
                $p->sku,
                $p->category?->name ?? '',
                $p->unit?->abbreviation ?? $p->unit?->name ?? '',
                $warehouseName,
                $qty,
                $min,
                $status,
                number_format($stockValue, 2, '.', ''),
            ];
        });

        return $this->streamCsv($headers, $rows, 'stock');
    }

    private function exportMovements(array $filters): StreamedResponse
    {
        $query = StockMovement::query()
            ->with(['product:id,name,sku', 'warehouse:id,name,code', 'user:id,name']);

        if (!empty($filters['product_id'])) {
            $query->where('product_id', $filters['product_id']);
        }

        if (!empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        if (!empty($filters['warehouse_id'])) {
            $query->where('warehouse_id', $filters['warehouse_id']);
        }

        if (!empty($filters['from'])) {
            $query->where('created_at', '>=', Carbon::parse($filters['from'])->startOfDay());
        }

        if (!empty($filters['to'])) {
            $query->where('created_at', '<=', Carbon::parse($filters['to'])->endOfDay());
        }

        $query->latest('id');

        $typeLabels = [
            StockMovement::TYPE_PURCHASE => 'Achat',
            StockMovement::TYPE_SALE => 'Vente',
            StockMovement::TYPE_ADJUSTMENT => 'Ajustement',
            StockMovement::TYPE_TRANSFER_IN => 'Transfert entrant',
            StockMovement::TYPE_TRANSFER_OUT => 'Transfert sortant',
            StockMovement::TYPE_PRODUCTION_IN => 'Production entrante',
            StockMovement::TYPE_PRODUCTION_OUT => 'Production sortante',
        ];

        $headers = ['Date', 'Produit', 'SKU', 'Entrepôt', 'Type mouvement', 'Quantité', 'Référence', 'Utilisateur', 'Notes'];

        $rows = $query->cursor()->map(function (StockMovement $m) use ($typeLabels) {
            $outbound = [StockMovement::TYPE_SALE, StockMovement::TYPE_TRANSFER_OUT, StockMovement::TYPE_PRODUCTION_OUT];
            $signedQty = in_array($m->type, $outbound, true) ? -(float) $m->quantity : (float) $m->quantity;

            return [
                $m->created_at->format('Y-m-d H:i:s'),
                $m->product?->name ?? '',
                $m->product?->sku ?? '',
                $m->warehouse?->name ?? '',
                $typeLabels[$m->type] ?? $m->type,
                $signedQty,
                $m->reference?->reference ?? '',
                $m->user?->name ?? '',
                $m->reason ?? '',
            ];
        });

        return $this->streamCsv($headers, $rows, 'mouvements');
    }

    private function exportInventory(array $filters): StreamedResponse
    {
        $query = InventoryAdjustment::query()
            ->with(['warehouse:id,name,code', 'user:id,name', 'items.product:id,name,sku']);

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $headers = ['Référence', 'Entrepôt', 'Statut', 'Produit', 'SKU', 'Stock système', 'Stock compté', 'Écart', 'Motif', 'Créé par', 'Créé le'];
        $rows = $query->latest('id')->get()->flatMap(function (InventoryAdjustment $adjustment) {
            return $adjustment->items->map(function ($item) use ($adjustment) {
                return [
                    $adjustment->reference,
                    $adjustment->warehouse?->name ?? '',
                    $adjustment->status,
                    $item->product?->name ?? '',
                    $item->product?->sku ?? '',
                    $item->system_quantity,
                    $item->counted_quantity,
                    $item->difference,
                    $item->reason ?? '',
                    $adjustment->user?->name ?? '',
                    $adjustment->created_at?->format('Y-m-d H:i:s'),
                ];
            });
        });

        return $this->streamCsv($headers, $rows, 'inventaire');
    }

    private function streamCsv(array $headers, iterable $rows, string $filename): StreamedResponse
    {
        $stream = function () use ($headers, $rows, $filename) {
            $out = fopen('php://output', 'w');

            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, $headers, ';');

            foreach ($rows as $row) {
                fputcsv($out, $row, ';');
            }

            fclose($out);
        };

        $date = now()->format('Y-m-d-His');

        return new StreamedResponse($stream, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"export-{$filename}-{$date}.csv\"",
        ]);
    }
}
