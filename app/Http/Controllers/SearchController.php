<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SearchController extends Controller
{
    /**
     * Whitelist of searchable scopes. The frontend can never query an
     * arbitrary table — every scope maps to a hard-coded query below and is
     * guarded by the same permission as its module index page.
     */
    private const SCOPES = ['all', 'products', 'customers', 'suppliers', 'sales', 'purchases'];

    private const LIMIT_PER_SCOPE = 5;

    private const LIMIT_SCOPED = 10;

    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:100'],
            'scope' => ['nullable', 'string', Rule::in(self::SCOPES)],
        ]);

        $q = $validated['q'];
        $scope = $validated['scope'] ?? 'all';

        if ($scope === 'all') {
            $groups = array_values(array_filter([
                $this->searchProducts($q),
                $this->searchCustomers($q),
                $this->searchSuppliers($q),
                $this->searchSales($q),
                $this->searchPurchases($q),
            ]));

            return response()->json(['scope' => 'all', 'groups' => $groups]);
        }

        $method = 'search' . ucfirst($scope);

        if (! $request->user()->can($this->permissionFor($scope))) {
            abort(403);
        }

        $items = $this->{$method}($q, self::LIMIT_SCOPED);

        return response()->json([
            'scope' => $scope,
            'groups' => ($items !== null && $items['items'] !== []) ? [$items] : [],
        ]);
    }

    private function permissionFor(string $scope): string
    {
        return match ($scope) {
            'products' => 'view_products',
            'customers' => 'view_customers',
            'suppliers' => 'view_suppliers',
            'sales' => 'view_sales',
            'purchases' => 'view_purchases',
            default => 'view_dashboard',
        };
    }

    private function searchProducts(string $q, int $limit = self::LIMIT_PER_SCOPE): ?array
    {
        if (! auth()->user()->can('view_products')) {
            return null;
        }

        $items = Product::query()
            ->where(fn ($query) => $query
                ->where('name', 'like', "%{$q}%")
                ->orWhere('sku', 'like', "%{$q}%")
                ->orWhere('barcode', 'like', "%{$q}%")
                ->orWhereHas('variants', fn ($variant) => $variant
                    ->where('barcode', 'like', "%{$q}%")
                    ->orWhereHas('color', fn ($color) => $color->where('name', 'like', "%{$q}%"))
                    ->orWhereHas('size', fn ($size) => $size->where('name', 'like', "%{$q}%"))))
            ->with(['variants.color', 'variants.size'])
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'name', 'sku'])
            ->map(fn (Product $p) => [
                'id' => $p->id,
                'label' => $p->name,
                'sublabel' => $p->sku . ($p->variants->first(fn ($variant) => str_contains((string) $variant->barcode, $q))?->label() ? ' · ' . $p->variants->first(fn ($variant) => str_contains((string) $variant->barcode, $q))->label() : ''),
                'url' => route('products.show', $p),
            ])
            ->all();

        return $this->group('products', __('search.scope_products'), $items);
    }

    private function searchCustomers(string $q, int $limit = self::LIMIT_PER_SCOPE): ?array
    {
        if (! auth()->user()->can('view_customers')) {
            return null;
        }

        $items = Customer::query()
            ->where(fn ($query) => $query
                ->where('name', 'like', "%{$q}%")
                ->orWhere('phone', 'like', "%{$q}%")
                ->orWhere('email', 'like', "%{$q}%"))
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'name', 'phone'])
            ->map(fn (Customer $c) => [
                'id' => $c->id,
                'label' => $c->name,
                'sublabel' => $c->phone,
                'url' => route('customers.index', ['search' => $q]),
            ])
            ->all();

        return $this->group('customers', __('search.scope_customers'), $items);
    }

    private function searchSuppliers(string $q, int $limit = self::LIMIT_PER_SCOPE): ?array
    {
        if (! auth()->user()->can('view_suppliers')) {
            return null;
        }

        $items = Supplier::query()
            ->where(fn ($query) => $query
                ->where('name', 'like', "%{$q}%")
                ->orWhere('contact_person', 'like', "%{$q}%")
                ->orWhere('email', 'like', "%{$q}%")
                ->orWhere('phone', 'like', "%{$q}%"))
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'name', 'phone'])
            ->map(fn (Supplier $s) => [
                'id' => $s->id,
                'label' => $s->name,
                'sublabel' => $s->phone,
                'url' => route('suppliers.index', ['search' => $q]),
            ])
            ->all();

        return $this->group('suppliers', __('search.scope_suppliers'), $items);
    }

    private function searchSales(string $q, int $limit = self::LIMIT_PER_SCOPE): ?array
    {
        if (! auth()->user()->can('view_sales')) {
            return null;
        }

        $items = Sale::query()
            ->with('customer:id,name')
            ->where(fn ($query) => $query
                ->where('reference', 'like', "%{$q}%")
                ->orWhereHas('customer', fn ($c) => $c->where('name', 'like', "%{$q}%")))
            ->latest('id')
            ->limit($limit)
            ->get()
            ->map(fn (Sale $s) => [
                'id' => $s->id,
                'label' => $s->reference,
                'sublabel' => $s->customer?->name,
                'url' => route('sales.show', $s),
            ])
            ->all();

        return $this->group('sales', __('search.scope_sales'), $items);
    }

    private function searchPurchases(string $q, int $limit = self::LIMIT_PER_SCOPE): ?array
    {
        if (! auth()->user()->can('view_purchases')) {
            return null;
        }

        $items = Purchase::query()
            ->with('supplier:id,name')
            ->where(fn ($query) => $query
                ->where('reference', 'like', "%{$q}%")
                ->orWhereHas('supplier', fn ($s) => $s->where('name', 'like', "%{$q}%")))
            ->latest('id')
            ->limit($limit)
            ->get()
            ->map(fn (Purchase $p) => [
                'id' => $p->id,
                'label' => $p->reference,
                'sublabel' => $p->supplier?->name,
                'url' => route('purchases.show', $p),
            ])
            ->all();

        return $this->group('purchases', __('search.scope_purchases'), $items);
    }

    private function group(string $scope, string $label, array $items): ?array
    {
        if ($items === []) {
            return null;
        }

        return ['scope' => $scope, 'label' => $label, 'items' => $items];
    }
}
