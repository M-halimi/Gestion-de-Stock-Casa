<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Warehouse;
use App\Services\InsufficientStockException;
use App\Services\StockService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TransferController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Stock/Transfers/Create', [
            'products' => Product::with('stocks')
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'sku']),
            'warehouses' => Warehouse::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'exists:products,id'],
            'from_warehouse_id' => ['required', Rule::exists('warehouses', 'id')->where('is_active', true)],
            'to_warehouse_id' => ['required', Rule::exists('warehouses', 'id')->where('is_active', true), 'different:from_warehouse_id'],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            app(StockService::class)->transfer(
                Product::findOrFail($data['product_id']),
                Warehouse::findOrFail($data['from_warehouse_id']),
                Warehouse::findOrFail($data['to_warehouse_id']),
                (float) $data['quantity'],
                $data['reason'] ?? 'Transfert entre entrepôts',
                auth()->id(),
            );
        } catch (InsufficientStockException) {
            return back()
                ->withInput()
                ->with('error', 'transfer.insufficient');
        } catch (\InvalidArgumentException $e) {
            return back()
                ->withInput()
                ->withErrors(['quantity' => $e->getMessage()]);
        }

        return redirect()
            ->route('movements.index')
            ->with('success', 'transfer.created');
    }
}