<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\StockMovement;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportService
{
    public const TYPES = ['stock', 'purchases', 'sales', 'movements'];

    public function types(): array
    {
        return self::TYPES;
    }

    /**
     * Data + summary for the reports index page.
     */
    public function summary(string $type, array $filters): array
    {
        $filters = $this->normalizeFilters($type, $filters);

        return match ($type) {
            'stock' => $this->stockSummary($filters),
            'purchases' => $this->purchasesSummary($filters),
            'sales' => $this->salesSummary($filters),
            'movements' => $this->movementsSummary($filters),
            default => throw new \InvalidArgumentException("Unknown report type [{$type}]."),
        };
    }

    public function export(string $type, string $format, array $filters)
    {
        $filters = $this->normalizeFilters($type, $filters);
        $rows = $this->rows($type, $filters);

        return $format === 'pdf'
            ? $this->pdf($type, $filters, $rows)
            : $this->csv($type, $rows);
    }

    private function normalizeFilters(string $type, array $filters): array
    {
        $from = isset($filters['from']) && $filters['from']
            ? Carbon::parse($filters['from'])->startOfDay()
            : now()->subDays(30)->startOfDay();
        $to = isset($filters['to']) && $filters['to']
            ? Carbon::parse($filters['to'])->endOfDay()
            : now()->endOfDay();

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to, $from];
        }

        return [
            'from' => $from,
            'to' => $to,
            'warehouse_id' => isset($filters['warehouse_id']) && $filters['warehouse_id'] ? (int) $filters['warehouse_id'] : null,
        ];
    }

    private function rows(string $type, array $filters): array
    {
        return match ($type) {
            'stock' => $this->stockRows($filters),
            'purchases' => $this->purchasesRows($filters),
            'sales' => $this->salesRows($filters),
            'movements' => $this->movementsRows($filters),
            default => throw new \InvalidArgumentException("Unknown report type [{$type}]."),
        };
    }

    private function stockRows(array $filters): array
    {
        return Product::query()
            ->withSum('stocks as total_quantity', 'quantity')
            ->when($filters['warehouse_id'], fn ($q, $id) => $q->withSum(['stocks as total_quantity' => fn ($q) => $q->where('warehouse_id', $id)], 'quantity'))
            ->orderBy('name')
            ->get()
            ->map(fn (Product $p) => [
                'name' => $p->name,
                'sku' => $p->sku,
                'quantity' => (float) $p->total_quantity,
                'value' => (float) $p->purchase_price * (float) $p->total_quantity,
                'status' => $this->stockStatus($p),
            ])
            ->values()
            ->all();
    }

    private function stockStatus(Product $p): string
    {
        $qty = (float) $p->total_quantity;
        $min = (float) ($p->min_stock ?? 0);

        if ($qty <= 0) {
            return 'out';
        }

        return $qty <= $min ? 'low' : 'in';
    }

    private function purchasesRows(array $filters): array
    {
        return Purchase::query()
            ->with('supplier')
            ->whereBetween('date', [$filters['from'], $filters['to']])
            ->when($filters['warehouse_id'], fn ($q, $id) => $q->where('warehouse_id', $id))
            ->orderByDesc('date')
            ->get()
            ->map(fn (Purchase $p) => [
                'reference' => $p->reference,
                'party' => $p->supplier?->name ?? '—',
                'date' => $p->date->toDateString(),
                'total' => (float) $p->total_amount,
                'status' => $p->status,
            ])
            ->values()
            ->all();
    }

    private function salesRows(array $filters): array
    {
        return Sale::query()
            ->with('customer')
            ->whereBetween('date', [$filters['from'], $filters['to']])
            ->when($filters['warehouse_id'], fn ($q, $id) => $q->where('warehouse_id', $id))
            ->orderByDesc('date')
            ->get()
            ->map(fn (Sale $s) => [
                'reference' => $s->reference,
                'party' => $s->customer?->name ?? '—',
                'date' => $s->date->toDateString(),
                'total' => (float) $s->total_amount,
                'status' => $s->status,
            ])
            ->values()
            ->all();
    }

    private function movementsRows(array $filters): array
    {
        return StockMovement::query()
            ->with(['product:id,name,sku', 'warehouse:id,name,code', 'user:id,name'])
            ->whereBetween('created_at', [$filters['from'], $filters['to']])
            ->when($filters['warehouse_id'], fn ($q, $id) => $q->where('warehouse_id', $id))
            ->latest('id')
            ->limit(2000)
            ->get()
            ->map(fn (StockMovement $m) => [
                'type' => $m->type,
                'product' => $m->product?->name ?? '—',
                'warehouse' => $m->warehouse?->name ?? '—',
                'quantity' => $this->signedQuantity($m),
                'user' => $m->user?->name ?? '—',
                'reference' => $m->reference?->reference ?? '—',
                'date' => $m->created_at->toDateTimeString(),
            ])
            ->values()
            ->all();
    }

    private function signedQuantity(StockMovement $m): float
    {
        if ($m->type === StockMovement::TYPE_ADJUSTMENT) {
            return (float) $m->quantity;
        }

        $outbound = [StockMovement::TYPE_SALE, StockMovement::TYPE_TRANSFER_OUT, StockMovement::TYPE_PRODUCTION_OUT];

        return in_array($m->type, $outbound, true)
            ? -(float) $m->quantity
            : (float) $m->quantity;
    }

    private function stockSummary(array $filters): array
    {
        $rows = $this->stockRows($filters);

        return [
            'rows' => $rows,
            'totals' => [
                'count' => count($rows),
                'total_value' => array_sum(array_column($rows, 'value')),
                'low_count' => count(array_filter($rows, fn ($r) => $r['status'] === 'low')),
                'out_count' => count(array_filter($rows, fn ($r) => $r['status'] === 'out')),
            ],
            'period' => null,
        ];
    }

    private function purchasesSummary(array $filters): array
    {
        $rows = $this->purchasesRows($filters);
        $prev = $this->previousPeriod($filters);
        $prevTotal = Purchase::query()
            ->whereBetween('date', [$prev['from'], $prev['to']])
            ->when($filters['warehouse_id'], fn ($q, $id) => $q->where('warehouse_id', $id))
            ->sum('total_amount');

        return [
            'rows' => $rows,
            'totals' => [
                'count' => count($rows),
                'total' => array_sum(array_column($rows, 'total')),
                'previous_total' => (float) $prevTotal,
            ],
            'period' => [
                'from' => $filters['from']->toDateString(),
                'to' => $filters['to']->toDateString(),
            ],
        ];
    }

    private function salesSummary(array $filters): array
    {
        $rows = $this->salesRows($filters);
        $prev = $this->previousPeriod($filters);
        $prevTotal = Sale::query()
            ->whereBetween('date', [$prev['from'], $prev['to']])
            ->when($filters['warehouse_id'], fn ($q, $id) => $q->where('warehouse_id', $id))
            ->sum('total_amount');

        return [
            'rows' => $rows,
            'totals' => [
                'count' => count($rows),
                'total' => array_sum(array_column($rows, 'total')),
                'previous_total' => (float) $prevTotal,
            ],
            'period' => [
                'from' => $filters['from']->toDateString(),
                'to' => $filters['to']->toDateString(),
            ],
        ];
    }

    private function movementsSummary(array $filters): array
    {
        $rows = $this->movementsRows($filters);

        return [
            'rows' => $rows,
            'totals' => [
                'count' => count($rows),
                'in' => array_sum(array_map(fn ($r) => $r['quantity'] > 0 ? $r['quantity'] : 0, $rows)),
                'out' => abs(array_sum(array_map(fn ($r) => $r['quantity'] < 0 ? $r['quantity'] : 0, $rows))),
            ],
            'period' => [
                'from' => $filters['from']->toDateString(),
                'to' => $filters['to']->toDateString(),
            ],
        ];
    }

    private function previousPeriod(array $filters): array
    {
        $length = $filters['from']->diffInDays($filters['to']) + 1;

        return [
            'from' => $filters['from']->copy()->subDays($length)->startOfDay(),
            'to' => $filters['to']->copy()->subDays($length)->endOfDay(),
        ];
    }

    private function columns(string $type): array
    {
        return match ($type) {
            'stock' => ['Produit', 'SKU', 'Quantité', 'Valeur', 'Statut'],
            'purchases' => ['Référence', 'Fournisseur', 'Date', 'Total', 'Statut'],
            'sales' => ['Référence', 'Client', 'Date', 'Total', 'Statut'],
            'movements' => ['Type', 'Produit', 'Entrepôt', 'Quantité', 'Utilisateur', 'Référence', 'Date'],
        };
    }

    private function csv(string $type, array $rows): StreamedResponse
    {
        $columns = $this->columns($type);

        $stream = function () use ($rows, $columns, $type) {
            $out = fopen('php://output', 'w');

            // UTF-8 BOM for Excel + Arabic
            fwrite($out, "\xEF\xBB\xBF");

            fputcsv($out, $columns, ';');

            foreach ($rows as $row) {
                fputcsv($out, $this->csvRow($row, $type), ';');
            }

            fclose($out);
        };

        return new StreamedResponse($stream, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="rapport-' . $type . '.csv"',
        ]);
    }

    private function csvRow(array $row, string $type): array
    {
        return match ($type) {
            'stock' => [$row['name'], $row['sku'], $row['quantity'], number_format($row['value'], 2, ',', ' '), $row['status']],
            'purchases', 'sales' => [$row['reference'], $row['party'], $row['date'], number_format($row['total'], 2, ',', ' '), $row['status']],
            'movements' => [$row['type'], $row['product'], $row['warehouse'], $row['quantity'], $row['user'], $row['reference'], $row['date']],
        };
    }

    private function pdf(string $type, array $filters, array $rows)
    {
        $pdf = Pdf::loadView('reports.pdf', [
            'title' => match ($type) {
                'stock' => 'Rapport de stock',
                'purchases' => 'Rapport des achats',
                'sales' => 'Rapport des ventes',
                'movements' => 'Rapport des mouvements',
            },
            'columns' => $this->columns($type),
            'rows' => $rows,
            'period' => $this->periodLabel($filters),
            'date' => now()->format('d/m/Y H:i'),
        ]);

        return $pdf->download('rapport-' . $type . '.pdf');
    }

    private function periodLabel(array $filters): ?array
    {
        if (! isset($filters['from'], $filters['to'])) {
            return null;
        }

        return [
            'from' => $filters['from']->format('Y-m-d'),
            'to' => $filters['to']->format('Y-m-d'),
        ];
    }
}
