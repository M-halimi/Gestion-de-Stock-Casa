<?php

namespace App\Http\Controllers;

use App\Models\InventoryAdjustment;
use App\Models\Warehouse;
use App\Services\InventoryService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    public function index(): Response
    {
        $adjustments = InventoryAdjustment::query()
            ->with(['warehouse:id,name,code', 'user:id,name'])
            ->withCount('items')
            ->when(request('status'), fn ($q, $status) => $q->where('status', $status))
            ->latest('id')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Inventory/Index', [
            'adjustments' => $adjustments,
            'filters' => request()->only(['status']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Inventory/Create', [
            'warehouses' => Warehouse::where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'warehouse_id' => ['required', 'exists:warehouses,id'],
        ]);

        $adjustment = app(InventoryService::class)->create($data['warehouse_id']);

        return redirect()
            ->route('inventory.edit', $adjustment)
            ->with('success', 'inventory.created');
    }

    public function edit(InventoryAdjustment $adjustment): Response
    {
        return Inertia::render('Inventory/Edit', [
            'adjustment' => $adjustment->load(['warehouse:id,name,code', 'user:id,name']),
            'items' => $adjustment->items()->with('product:id,name,sku,unit_id')->get(),
        ]);
    }

    public function update(Request $request, InventoryAdjustment $adjustment): RedirectResponse
    {
        $counts = $request->validate([
            'counts' => ['required', 'array'],
            'counts.*' => ['required', 'numeric', 'min:0'],
        ])['counts'];

        try {
            app(InventoryService::class)->updateCounts($adjustment, $counts);
        } catch (\RuntimeException $e) {
            return back()->with('error', 'inventory.bad_status');
        }

        return redirect()
            ->route('inventory.index')
            ->with('success', 'inventory.updated');
    }

    public function validate(InventoryAdjustment $adjustment): RedirectResponse
    {
        try {
            app(InventoryService::class)->validate($adjustment);
        } catch (\RuntimeException $e) {
            return back()->with('error', 'inventory.bad_status');
        }

        return redirect()
            ->route('inventory.index')
            ->with('success', 'inventory.validated');
    }
}