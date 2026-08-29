<?php

namespace App\Http\Controllers;

use App\Http\Requests\BarcodeStockRequest;
use App\Models\ProductVariant;
use App\Models\Warehouse;
use App\Services\InsufficientStockException;
use App\Services\BarcodeResolver;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BarcodeStockController extends Controller
{
    public function page(): Response
    {
        return Inertia::render('Stock/Barcode', [
            'warehouses' => Warehouse::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
        ]);
    }

    public function lookup(Request $request, BarcodeResolver $resolver): JsonResponse
    {
        $barcode = trim((string) $request->validate([
            'barcode' => ['required', 'string', 'max:100'],
        ])['barcode']);
        $result = $resolver->resolve($barcode);

        if ($result['status'] === BarcodeResolver::STATUS_NOT_FOUND) {
            return response()->json($result, 404);
        }

        if ($result['status'] === BarcodeResolver::STATUS_INACTIVE) {
            return response()->json($result, 422);
        }

        return response()->json([
            ...$result,
            // Keep the existing stock page contract while exposing the
            // product-only result as variant_id = null in the nested payload.
            'id' => $result['variant_id'],
        ]);
    }

    public function increase(BarcodeStockRequest $request, StockService $stockService): RedirectResponse
    {
        return $this->apply($request, $stockService, true);
    }

    public function decrease(BarcodeStockRequest $request, StockService $stockService): RedirectResponse
    {
        return $this->apply($request, $stockService, false);
    }

    private function apply(BarcodeStockRequest $request, StockService $stockService, bool $increase): RedirectResponse
    {
        $data = $request->validated();
        $variant = ProductVariant::with('product')->findOrFail($data['variant_id']);
        $reason = $data['reason'] ?? ($increase ? 'Barcode stock in' : 'Barcode stock out');

        try {
            $stockService->{$increase ? 'increase' : 'decrease'}(
                $variant,
                (int) $data['warehouse_id'],
                (float) $data['quantity'],
                $reason,
                $increase
                    ? \App\Models\StockMovement::TYPE_BARCODE_IN
                    : \App\Models\StockMovement::TYPE_BARCODE_OUT,
            );
        } catch (InsufficientStockException $exception) {
            return back()->withInput()->with('error', $exception->getMessage());
        }

        return back()->with('success', $increase ? 'barcode.stock_in_success' : 'barcode.stock_out_success');
    }

}
