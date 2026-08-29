<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePurchaseRequest;
use App\Http\Requests\UpdatePurchaseRequest;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\Warehouse;
use App\Services\PurchaseService;
use App\Services\AuditLogger;
use App\Services\DocumentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use RuntimeException;

class PurchaseController extends Controller
{
    public function __construct(private readonly PurchaseService $purchaseService)
    {
    }

    public function index(Request $request): Response
    {
        $purchases = Purchase::query()
            ->with(['supplier', 'warehouse', 'user'])
            ->withCount('items')
            ->when($request->input('search'), fn ($q, $search) => $q->where('reference', 'like', "%{$search}%")
                ->orWhereHas('supplier', fn ($s) => $s->where('name', 'like', "%{$search}%")))
            ->when($request->input('status'), fn ($q, $status) => $q->where('status', $status))
            ->latest('id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Purchases/Index', [
            'purchases' => $purchases,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Purchases/Create', $this->formProps());
    }

    public function store(StorePurchaseRequest $request): RedirectResponse
    {
        try {
            $purchase = $this->purchaseService->create($request->validated());

            return redirect()->route('purchases.show', $purchase)->with('success', 'purchases.created');
        } catch (RuntimeException|\InvalidArgumentException $e) {
            return back()->withErrors(['items' => $e->getMessage()])->withInput();
        }
    }

    public function show(Purchase $purchase): Response
    {
        $purchase->load(['supplier', 'warehouse', 'items.product', 'items.variant.color', 'items.variant.size', 'user']);

        return Inertia::render('Purchases/Show', [
            'purchase' => $purchase,
            'movements' => $purchase->movements()->with(['product', 'warehouse', 'user'])->latest('id')->get()
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

    public function document(Purchase $purchase, DocumentService $documents)
    {
        $response = $documents->downloadPurchaseDocument($purchase);

        AuditLogger::action('purchase_document_downloaded', 'Purchase', $purchase->id, "Purchase document \"{$purchase->reference}\" downloaded");

        return $response;
    }

    public function documentPrint(Purchase $purchase, DocumentService $documents): SymfonyResponse
    {
        AuditLogger::action('purchase_document_printed', 'Purchase', $purchase->id, "Purchase document \"{$purchase->reference}\" opened for printing");

        return response($documents->printPurchaseDocument($purchase)->render())
            ->header('Content-Type', 'text/html; charset=UTF-8');
    }

    public function edit(Purchase $purchase): Response
    {
        return Inertia::render('Purchases/Edit', [
            'purchase' => $purchase->load(['supplier', 'warehouse', 'items']),
            ...$this->formProps(),
        ]);
    }

    public function update(UpdatePurchaseRequest $request, Purchase $purchase): RedirectResponse
    {
        try {
            $this->purchaseService->update($purchase, $request->validated());

            return redirect()->route('purchases.show', $purchase)->with('success', 'purchases.updated');
        } catch (RuntimeException|\InvalidArgumentException $e) {
            return back()->withErrors(['items' => $e->getMessage()])->withInput();
        }
    }

    public function destroy(Purchase $purchase): RedirectResponse
    {
        try {
            $this->purchaseService->destroy($purchase);

            return redirect()->route('purchases.index')->with('success', 'purchases.deleted');
        } catch (RuntimeException $e) {
            return redirect()->route('purchases.index')->with('error', 'purchases.delete_blocked');
        }
    }

    public function receive(Purchase $purchase): RedirectResponse
    {
        try {
            $this->purchaseService->receive($purchase);

            return back()->with('success', 'purchases.received');
        } catch (RuntimeException $e) {
            return back()->with('error', 'purchases.bad_status');
        }
    }

    public function cancel(Purchase $purchase): RedirectResponse
    {
        try {
            $this->purchaseService->cancel($purchase);

            return back()->with('success', 'purchases.cancelled');
        } catch (RuntimeException $e) {
            return back()->with('error', 'purchases.bad_status');
        }
    }

    private function formProps(): array
    {
        return [
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name']),
            'warehouses' => Warehouse::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']),
            'products' => Product::where('status', 'active')
                ->with(['variants.color', 'variants.size', 'variants.stocks'])
                ->orderBy('name')
                ->get(['id', 'name', 'sku', 'purchase_price']),
        ];
    }
}
