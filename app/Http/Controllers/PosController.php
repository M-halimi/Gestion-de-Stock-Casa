<?php

namespace App\Http\Controllers;

use App\Http\Requests\PosCheckoutRequest;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Warehouse;
use App\Services\InsufficientStockException;
use App\Services\SaleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class PosController extends Controller
{
    public function __construct(private readonly SaleService $saleService)
    {
    }

    public function create(): Response
    {
        $warehouses = Warehouse::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);
        $requestedWarehouseId = request()->integer('warehouse_id');
        $defaultWarehouseId = $warehouses->firstWhere('id', $requestedWarehouseId)?->id
            ?? $warehouses->first()?->id;

        return Inertia::render('POS/Create', [
            'customers' => Customer::orderBy('name')->limit(100)->get(['id', 'name', 'phone']),
            'warehouses' => $warehouses,
            'defaultWarehouseId' => $defaultWarehouseId,
            'products' => Product::where('status', 'active')
                ->with(['variants.color', 'variants.size', 'variants.stocks', 'stocks'])
                ->orderBy('name')
                ->get(['id', 'name', 'sku', 'barcode', 'sale_price', 'image']),
        ]);
    }

    public function checkout(PosCheckoutRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $discount = (float) ($data['discount'] ?? 0);
        $subtotal = collect($data['items'])->sum(fn (array $item) => (float) $item['quantity'] * (float) $item['unit_price']);

        if ($discount > $subtotal) {
            return back()->withInput()->withErrors(['discount' => 'Discount cannot be greater than the subtotal.']);
        }

        $customerId = $data['customer_id'] ?? Customer::firstOrCreate(['name' => 'Walk-in Customer'])->id;
        $items = collect($data['items'])->values()->map(function (array $item, int $index) use ($discount): array {
            return [
                ...$item,
                'discount' => $index === 0 ? $discount : 0,
                'tax' => 0,
            ];
        })->all();

        try {
            $sale = DB::transaction(function () use ($data, $customerId, $items): Sale {
                $sale = $this->saleService->create([
                    'customer_id' => $customerId,
                    'warehouse_id' => $data['warehouse_id'],
                    'date' => now()->toDateString(),
                    'notes' => $data['notes'] ?? 'POS',
                    'items' => $items,
                ]);

                return $this->saleService->confirm($sale);
            });
        } catch (InsufficientStockException $exception) {
            return back()->withInput()->withErrors(['items' => $exception->getMessage()]);
        } catch (InvalidArgumentException $exception) {
            return back()->withInput()->withErrors(['items' => $exception->getMessage()]);
        }

        return redirect()->route('sales.show', $sale)->with('success', 'sales.confirmed');
    }
}
