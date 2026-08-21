<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Stock;
use App\Models\Warehouse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class StockController extends Controller
{
    public function index(): Response
    {
        $warehouses = Warehouse::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        $totalStock = Stock::query()
            ->selectRaw('COALESCE(SUM(quantity), 0)')
            ->whereColumn('stocks.product_id', 'products.id');

        $products = Product::query()
            ->where('status', 'active')
            ->with(['category', 'unit', 'stocks'])
            ->select('products.*')
            ->selectSub($totalStock, 'total_quantity')
            ->when(request('search'), function ($q, $search) {
                $q->where(fn ($q) => $q
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%"));
            })
            ->when(request('warehouse_id'), fn ($q, $id) => $q->whereHas('stocks', fn ($sq) => $sq->where('warehouse_id', $id)))
            ->when(request('status'), function ($q, $status) use ($totalStock) {
                if ($status === 'low') {
                    $q->whereRaw("({$totalStock->toSql()}) > 0")
                        ->whereRaw("({$totalStock->toSql()}) < min_stock");
                } elseif ($status === 'out') {
                    $q->whereRaw("({$totalStock->toSql()}) = 0");
                }
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Stock/Index', [
            'products' => $products,
            'warehouses' => $warehouses,
            'filters' => request()->only(['search', 'warehouse_id', 'status']),
        ]);
    }
}