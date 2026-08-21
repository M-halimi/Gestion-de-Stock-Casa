<?php

namespace App\Http\Controllers;

use App\Http\Requests\QuickStoreCustomerRequest;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function index(): Response
    {
        $customers = Customer::query()
            ->withCount('sales')
            ->when(request('search'), function ($q, $search) {
                $q->where(fn ($q) => $q
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%"));
            })
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Customers/Index', [
            'customers' => $customers,
            'filters' => request()->only(['search']),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Customers/Create');
    }

    public function store(StoreCustomerRequest $request): RedirectResponse
    {
        Customer::create($request->validated());

        return redirect()
            ->route('customers.index')
            ->with('success', 'customer.created');
    }

    public function search(Request $request): JsonResponse
    {
        $search = $request->string('q')->toString();

        $customers = Customer::query()
            ->when($search !== '', fn ($q) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")))
            ->orderBy('name')
            ->limit(20)
            ->get(['id', 'name', 'phone', 'email']);

        return response()->json(['customers' => $customers]);
    }

    public function quickStore(QuickStoreCustomerRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (! empty($data['phone'])) {
            $existing = Customer::where('phone', $data['phone'])->first();

            if ($existing) {
                return response()->json([
                    'status' => 'duplicate',
                    'field' => 'phone',
                    'message' => 'pages.customers.duplicate_phone',
                    'customer' => $existing->only(['id', 'name', 'phone', 'email', 'address', 'city', 'notes']),
                ]);
            }
        }

        if (! empty($data['email'])) {
            $existing = Customer::where('email', $data['email'])->first();

            if ($existing) {
                return response()->json([
                    'status' => 'duplicate',
                    'field' => 'email',
                    'message' => 'pages.customers.duplicate_email',
                    'customer' => $existing->only(['id', 'name', 'phone', 'email', 'address', 'city', 'notes']),
                ]);
            }
        }

        $customer = Customer::create($data);

        return response()->json([
            'status' => 'created',
            'customer' => $customer->only(['id', 'name', 'phone', 'email', 'address', 'city', 'notes']),
        ]);
    }

    public function edit(Customer $customer): Response
    {
        return Inertia::render('Customers/Edit', [
            'customer' => $customer,
        ]);
    }

    public function update(UpdateCustomerRequest $request, Customer $customer): RedirectResponse
    {
        $customer->update($request->validated());

        return redirect()
            ->route('customers.index')
            ->with('success', 'customer.updated');
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        if ($customer->sales()->exists()) {
            return redirect()
                ->route('customers.index')
                ->with('error', 'customer.in_use');
        }

        $customer->delete();

        return redirect()
            ->route('customers.index')
            ->with('success', 'customer.deleted');
    }
}