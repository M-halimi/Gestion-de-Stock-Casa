<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request, DashboardService $service): Response
    {
        $user = $request->user();

        $period = $service->resolvePeriod($request->query('period'), $request->query('from'), $request->query('to'));

        $canStock = $user->can('view_stock');
        $canSales = $user->can('view_sales');
        $canPurchases = $user->can('view_purchases');
        $canMovements = $user->can('view_movements');
        $canProducts = $user->can('view_products');

        $kpis = $canStock ? $service->getKpis() : null;

        $data = [
            'period' => [
                'key' => $period['key'],
                'label' => $period['label'],
                'from' => $period['from'],
                'to' => $period['to'],
            ],
            'kpis' => $kpis,
            'stock_status' => $canStock ? $service->getStockStatus() : null,
            'sales_trend' => $canSales ? $service->getSalesTrend($period) : null,
            'comparison' => $canSales || $canPurchases
                ? $service->getPurchaseSalesComparison($period, $canSales, $canPurchases)
                : null,
            'top_products' => $canSales
                ? $service->getTopProducts($period, $request->query('by') === 'revenue' ? 'revenue' : 'quantity')
                : null,
            'low_stock' => $canProducts && $canStock
                ? $service->getLowStockProducts(
                    $request->query('search'),
                    $request->query('sort'),
                    $request->query('direction'),
                )
                : null,
            'movements' => $canMovements ? $service->getRecentMovements() : null,
            'recent_purchases' => $canPurchases ? $service->getRecentPurchases() : null,
            'recent_sales' => $canSales ? $service->getRecentSales() : null,
            'insights' => $canStock ? $service->getInsights($period, $kpis, $canSales, $canPurchases) : null,
            'filters' => [
                'search' => $request->query('search'),
                'sort' => $request->query('sort'),
                'direction' => $request->query('direction'),
                'by' => $request->query('by'),
            ],
        ];

        return Inertia::render('Dashboard', $data);
    }
}