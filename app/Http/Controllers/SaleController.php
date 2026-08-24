<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSaleRequest;
use App\Http\Requests\UpdateSaleRequest;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Sale;
use App\Models\Warehouse;
use App\Services\InsufficientStockException;
use App\Services\AuditLogger;
use App\Services\DocumentService;
use App\Services\SaleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use RuntimeException;

class SaleController extends Controller
{
    public function __construct(private readonly SaleService $saleService)
    {
    }

    public function index(Request $request): Response
    {
        $sales = Sale::query()
            ->with(['customer', 'warehouse', 'user'])
            ->withCount('items')
            ->when($request->input('search'), fn ($q, $search) => $q->where('reference', 'like', "%{$search}%")
                ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$search}%")))
            ->when($request->input('status'), fn ($q, $status) => $q->where('status', $status))
            ->latest('id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Sales/Index', [
            'sales' => $sales,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Sales/Create', $this->formProps());
    }

    public function store(StoreSaleRequest $request): RedirectResponse
    {
        try {
            $sale = $this->saleService->create($request->validated());

            return redirect()->route('sales.show', $sale)->with('success', 'sales.created');
        } catch (RuntimeException|\InvalidArgumentException $e) {
            return back()->withErrors(['items' => $e->getMessage()])->withInput();
        }
    }

    public function show(Sale $sale): Response
    {
        $sale->load(['customer', 'warehouse', 'items.product', 'user']);

        return Inertia::render('Sales/Show', [
            'sale' => $sale,
            'movements' => $sale->movements()->with(['product', 'warehouse', 'user'])->latest('id')->get()
                ->map(fn ($m) => [
                    'id' => $m->id,
                    'type' => $m->type,
                    'quantity' => round((float) $m->quantity, 3),
                    'product' => $m->product?->only(['id', 'name', 'sku']),
                    'warehouse' => $m->warehouse?->only(['id', 'name', 'code']),
                    'created_at' => $m->created_at->toDateTimeString(),
                ]),
        ]);
    }

    public function invoice(Sale $sale, DocumentService $documents)
    {
        $response = $documents->downloadSaleInvoice($sale);

        AuditLogger::action('invoice_downloaded', 'Sale', $sale->id, "Invoice for sale \"{$sale->reference}\" downloaded");

        return $response;
    }

    public function invoicePrint(Sale $sale, DocumentService $documents): SymfonyResponse
    {
        AuditLogger::action('invoice_printed', 'Sale', $sale->id, "Invoice for sale \"{$sale->reference}\" opened for printing");

        return response($documents->printSaleInvoice($sale)->render())
            ->header('Content-Type', 'text/html; charset=UTF-8');
    }

    public function edit(Sale $sale): Response
    {
        return Inertia::render('Sales/Edit', [
            'sale' => $sale->load(['customer', 'warehouse', 'items']),
            ...$this->formProps(),
        ]);
    }

    public function update(UpdateSaleRequest $request, Sale $sale): RedirectResponse
    {
        try {
            $this->saleService->update($sale, $request->validated());

            return redirect()->route('sales.show', $sale)->with('success', 'sales.updated');
        } catch (RuntimeException|\InvalidArgumentException $e) {
            return back()->withErrors(['items' => $e->getMessage()])->withInput();
        }
    }

    public function destroy(Sale $sale): RedirectResponse
    {
        try {
            $this->saleService->destroy($sale);

            return redirect()->route('sales.index')->with('success', 'sales.deleted');
        } catch (RuntimeException $e) {
            return redirect()->route('sales.index')->with('error', 'sales.delete_blocked');
        }
    }

    public function confirm(Sale $sale): RedirectResponse
    {
        try {
            $this->saleService->confirm($sale);

            return back()->with('success', 'sales.confirmed');
        } catch (InsufficientStockException $e) {
            return back()->with('error', 'sales.insufficient');
        } catch (RuntimeException $e) {
            return back()->with('error', 'sales.bad_status');
        }
    }

    public function cancel(Sale $sale): RedirectResponse
    {
        try {
            $this->saleService->cancel($sale);

            return back()->with('success', 'sales.cancelled');
        } catch (RuntimeException $e) {
            return back()->with('error', 'sales.bad_status');
        }
    }

    private function formProps(): array
    {
        return [
            'customers' => Customer::orderBy('name')->limit(50)->get(['id', 'name', 'phone']),
            'warehouses' => Warehouse::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'products' => Product::where('status', 'active')
                ->with('stocks')
                ->orderBy('name')
                ->get(['id', 'name', 'sku', 'sale_price']),
        ];
    }
}
