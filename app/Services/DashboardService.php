<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Stock;
use App\Models\StockMovement;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

class DashboardService
{
    /**
     * Resolve the requested period into [start, end] Carbon dates.
     */
    public function resolvePeriod(?string $period, ?string $from = null, ?string $to = null): array
    {
        $today = CarbonImmutable::today();

        $ranges = [
            'today' => [$today, $today],
            'yesterday' => [$today->subDay(), $today->subDay()],
            '7d' => [$today->subDays(6), $today],
            '30d' => [$today->subDays(29), $today],
            'month' => [$today->startOfMonth(), $today],
            'last_month' => [$today->subMonthNoOverflow()->startOfMonth(), $today->subMonthNoOverflow()->endOfMonth()],
            'year' => [$today->startOfYear(), $today],
            'custom' => null,
        ];

        $key = array_key_exists((string) $period, $ranges) ? (string) $period : '30d';

        if ($key === 'custom' && $from && $to) {
            $start = Carbon::parse($from)->startOfDay();
            $end = Carbon::parse($to)->endOfDay();

            return [
                'key' => 'custom',
                'label' => 'dashboard.periods.custom',
                'start' => $start,
                'end' => $end,
                'from' => $start->toDateString(),
                'to' => $end->toDateString(),
            ];
        }

        [$start, $end] = $ranges[$key];

        return [
            'key' => $key,
            'label' => "dashboard.periods.$key",
            'start' => $start->startOfDay(),
            'end' => $end->endOfDay(),
            'from' => $start->toDateString(),
            'to' => $end->toDateString(),
        ];
    }

    /**
     * Current stock KPIs, always computed from the stocks table (real current state).
     */
    public function getKpis(): array
    {
        $products = Product::withSum('stocks as total_qty', 'quantity')
            ->where('status', 'active')
            ->get();

        $lowStock = 0;
        $outOfStock = 0;
        $stockValue = 0.0;

        foreach ($products as $product) {
            $qty = (float) $product->total_qty;
            $min = (float) $product->min_stock;
            $stockValue += $qty * (float) $product->purchase_price;

            if ($qty <= 0) {
                $outOfStock++;
            } elseif ($min > 0 && $qty <= $min) {
                $lowStock++;
            }
        }

        return [
            'total_products' => $products->count(),
            'stock_value' => round($stockValue, 2),
            'low_stock' => $lowStock,
            'out_of_stock' => $outOfStock,
        ];
    }

    /**
     * Daily sales totals within the period (cancelled sales excluded).
     */
    public function getSalesTrend(array $period): array
    {
        $rows = Sale::where('status', '!=', 'cancelled')
            ->whereBetween('date', [$period['start'], $period['end']])
            ->selectRaw('DATE(date) as day, SUM(total_amount) as total')
            ->groupBy('day')
            ->orderBy('day')
            ->pluck('total', 'day')
            ->map(fn ($v) => round((float) $v, 2));

        return $this->fillDays($period, $rows, collect(), true, false);
    }

    /**
     * Purchases vs sales per day within the period (cancelled documents excluded).
     */
    public function getPurchaseSalesComparison(array $period, bool $includeSales = true, bool $includePurchases = true): array
    {
        $sales = $includeSales
            ? Sale::where('status', '!=', 'cancelled')
                ->whereBetween('date', [$period['start'], $period['end']])
                ->selectRaw('DATE(date) as day, SUM(total_amount) as total')
                ->groupBy('day')
                ->pluck('total', 'day')
            : collect();

        $purchases = $includePurchases
            ? Purchase::where('status', '!=', 'cancelled')
                ->whereBetween('date', [$period['start'], $period['end']])
                ->selectRaw('DATE(date) as day, SUM(total_amount) as total')
                ->groupBy('day')
                ->pluck('total', 'day')
            : collect();

        return $this->fillDays($period, $sales, $purchases, $includeSales, $includePurchases);
    }

    /**
     * Product stock status counts (in / low / out).
     */
    public function getStockStatus(): array
    {
        $products = Product::withSum('stocks as total_qty', 'quantity')
            ->where('status', 'active')
            ->get();

        $status = ['in_stock' => 0, 'low_stock' => 0, 'out_of_stock' => 0];

        foreach ($products as $product) {
            $qty = (float) $product->total_qty;
            $min = (float) $product->min_stock;

            if ($qty <= 0) {
                $status['out_of_stock']++;
            } elseif ($min > 0 && $qty <= $min) {
                $status['low_stock']++;
            } else {
                $status['in_stock']++;
            }
        }

        return $status;
    }

    /**
     * Top selling products for the period (cancelled sales excluded).
     */
    public function getTopProducts(array $period, string $by = 'quantity'): Collection
    {
        $orderBy = $by === 'revenue' ? 'total_revenue' : 'total_qty';

        return SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->where('sales.status', '!=', 'cancelled')
            ->whereBetween('sales.date', [$period['start'], $period['end']])
            ->selectRaw('products.id, products.name, products.sku, SUM(sale_items.quantity) as total_qty, SUM(sale_items.subtotal) as total_revenue')
            ->groupBy('products.id', 'products.name', 'products.sku')
            ->orderByDesc($orderBy)
            ->limit(5)
            ->get()
            ->map(fn ($row) => [
                'id' => (int) $row->id,
                'name' => $row->name,
                'sku' => $row->sku,
                'total_qty' => round((float) $row->total_qty, 3),
                'total_revenue' => round((float) $row->total_revenue, 2),
            ])
            ->values();
    }

    /**
     * Top selling product variants for the period (cancelled sales excluded).
     *
     * Keeping the variant in the aggregation is important for POS reporting:
     * the same product can be sold in different sizes and colors.
     */
    public function getTopVariants(array $period, string $by = 'quantity'): Collection
    {
        $orderBy = $by === 'revenue' ? 'total_revenue' : 'total_qty';

        return SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->leftJoin('product_variants', 'product_variants.id', '=', 'sale_items.product_variant_id')
            ->leftJoin('colors', 'colors.id', '=', 'product_variants.color_id')
            ->leftJoin('sizes', 'sizes.id', '=', 'product_variants.size_id')
            ->where('sales.status', '!=', 'cancelled')
            ->whereBetween('sales.date', [$period['start'], $period['end']])
            ->selectRaw(''
                . 'product_variants.id as variant_id, '
                . 'products.id as product_id, '
                . 'products.name, products.sku, '
                . 'product_variants.variant_code, product_variants.barcode, '
                . 'colors.name as color_name, sizes.name as size_name, '
                . 'SUM(sale_items.quantity) as total_qty, '
                . 'SUM(sale_items.subtotal) as total_revenue'
            )
            ->groupBy(
                'product_variants.id',
                'products.id',
                'products.name',
                'products.sku',
                'product_variants.variant_code',
                'product_variants.barcode',
                'colors.name',
                'sizes.name',
            )
            ->orderByDesc($orderBy)
            ->limit(8)
            ->get()
            ->map(fn ($row) => [
                'variant_id' => $row->variant_id ? (int) $row->variant_id : null,
                'product_id' => (int) $row->product_id,
                'name' => $row->name,
                'sku' => $row->sku,
                'variant_code' => $row->variant_code,
                'barcode' => $row->barcode,
                'color' => $row->color_name,
                'size' => $row->size_name,
                'total_qty' => round((float) $row->total_qty, 3),
                'total_revenue' => round((float) $row->total_revenue, 2),
            ])
            ->values();
    }

    /**
     * Paginated "needs attention" product list (low + out of stock).
     */
    public function getLowStockProducts(
        ?string $search = null,
        ?string $sort = null,
        ?string $direction = null,
        int $perPage = 10,
    ): LengthAwarePaginator {
        $query = Product::query()
            ->with(['category', 'unit'])
            ->withSum('stocks as total_qty', 'quantity')
            ->where('status', 'active')
            ->whereRaw('(SELECT COALESCE(SUM(quantity), 0) FROM stocks WHERE stocks.product_id = products.id) <= COALESCE(min_stock, 0)');

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        $sort = in_array($sort, ['name', 'sku', 'total_qty', 'min_stock'], true) ? $sort : 'total_qty';
        $direction = strtolower($direction ?? 'asc') === 'desc' ? 'desc' : 'asc';
        $query->orderBy($sort, $direction);

        return $query->paginate($perPage)->withQueryString();
    }

    /**
     * Latest stock movements.
     */
    public function getRecentMovements(int $limit = 10): Collection
    {
        return StockMovement::query()
            ->with(['product:id,name,sku', 'warehouse:id,name,code', 'user:id,name', 'reference'])
            ->latest('id')
            ->limit($limit)
            ->get()
            ->map(fn (StockMovement $m) => [
                'id' => $m->id,
                'type' => $m->type,
                'quantity' => round((float) $m->quantity, 3),
                'created_at' => $m->created_at->toDateTimeString(),
                'reason' => $m->reason,
                'product' => $m->product?->only(['id', 'name', 'sku']),
                'warehouse' => $m->warehouse?->only(['id', 'name', 'code']),
                'user' => $m->user?->only(['id', 'name']),
                'reference' => $m->reference?->reference ?? null,
            ]);
    }

    /**
     * Latest purchases.
     */
    public function getRecentPurchases(int $limit = 6): Collection
    {
        return Purchase::query()
            ->with(['supplier:id,name'])
            ->withCount('items')
            ->latest('date')
            ->limit($limit)
            ->get()
            ->map(fn (Purchase $p) => [
                'id' => $p->id,
                'reference' => $p->reference,
                'supplier' => $p->supplier?->only(['id', 'name']),
                'date' => $p->date->toDateString(),
                'items_count' => $p->items_count,
                'total_amount' => round((float) $p->total_amount, 2),
                'status' => $p->status,
            ]);
    }

    /**
     * Latest sales.
     */
    public function getRecentSales(int $limit = 6): Collection
    {
        return Sale::query()
            ->with(['customer:id,name'])
            ->withCount('items')
            ->latest('date')
            ->limit($limit)
            ->get()
            ->map(fn (Sale $s) => [
                'id' => $s->id,
                'reference' => $s->reference,
                'customer' => $s->customer?->only(['id', 'name']),
                'date' => $s->date->toDateString(),
                'items_count' => $s->items_count,
                'total_amount' => round((float) $s->total_amount, 2),
                'status' => $s->status,
            ]);
    }

    /**
     * Dynamic, data-driven insights for the period.
     */
    public function getInsights(array $period, array $kpis, bool $includeSales = true, bool $includePurchases = true): Collection
    {
        $insights = collect();

        if ($kpis['out_of_stock'] > 0) {
            $insights->push(['tone' => 'danger', 'key' => 'dashboard.insights.out_of_stock', 'params' => ['count' => $kpis['out_of_stock']]]);
        }

        $low = $this->getLowStockProducts(null, null, null, 10)->take(3);
        if ($low->isNotEmpty()) {
            $insights->push([
                'tone' => 'warning',
                'key' => 'dashboard.insights.low_stock',
                'params' => ['count' => $low->count(), 'names' => $low->pluck('name')->implode(', ')],
            ]);
        }

        $salesTotal = $includeSales ? collect($this->getSalesTrend($period))->sum('sales') : 0.0;
        $purchasesTotal = $includePurchases ? collect($this->getPurchaseSalesComparison($period))->sum('purchases') : 0.0;

        if ($salesTotal > 0) {
            $best = $this->getTopProducts($period, 'quantity')->first();
            if ($best) {
                $insights->push([
                    'tone' => 'success',
                    'key' => 'dashboard.insights.best_seller',
                    'params' => ['name' => $best['name'], 'quantity' => $best['total_qty']],
                ]);
            }
            $insights->push([
                'tone' => 'success',
                'key' => 'dashboard.insights.sales_period',
                'params' => ['total' => round($salesTotal, 2)],
            ]);
        } else {
            $insights->push(['tone' => 'info', 'key' => 'dashboard.insights.no_sales']);
        }

        if ($purchasesTotal > 0) {
            $insights->push([
                'tone' => 'info',
                'key' => 'dashboard.insights.purchases_period',
                'params' => ['total' => round($purchasesTotal, 2)],
            ]);
        }

        if ($salesTotal > 0 && $purchasesTotal > 0) {
            $diff = round((($salesTotal - $purchasesTotal) / max($purchasesTotal, 1)) * 100, 1);
            $insights->push([
                'tone' => $diff >= 0 ? 'success' : 'warning',
                'key' => $diff >= 0 ? 'dashboard.insights.margin_positive' : 'dashboard.insights.margin_negative',
                'params' => ['percent' => abs($diff)],
            ]);
        }

        return $insights;
    }

    private function fillDays(array $period, Collection $sales, Collection $purchases, bool $includeSales = true, bool $includePurchases = true): array
    {
        $keys = [];
        for ($d = $period['start']->copy(); $d->lte($period['end']); $d = $d->addDay()) {
            $keys[$d->toDateString()] = null;
        }

        $result = [];
        foreach ($keys as $day => $_) {
            $row = ['day' => $day];

            if ($includeSales) {
                $row['sales'] = round((float) ($sales[$day] ?? 0), 2);
            }

            if ($includePurchases) {
                $row['purchases'] = round((float) ($purchases[$day] ?? 0), 2);
            }

            $result[] = $row;
        }

        return $result;
    }
}
