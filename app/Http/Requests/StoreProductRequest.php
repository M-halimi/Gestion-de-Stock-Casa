<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Services\BarcodeResolver;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! $this->user()->can('create_products')) {
            return false;
        }

        if ($this->boolean('initial_stock_enabled') && ! $this->user()->can('manage_stock')) {
            return false;
        }

        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'sku' => ['nullable', 'string', 'max:50', 'unique:products,sku'],
            'barcode' => ['nullable', 'string', 'max:50', 'unique:products,barcode'],
            'category_id' => ['required', 'exists:categories,id'],
            'unit_id' => ['required', 'exists:units,id'],
            'purchase_price' => ['required', 'numeric', 'min:0', 'max:99999999'],
            'sale_price' => ['required', 'numeric', 'min:0', 'max:99999999'],
            'min_stock' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:2000'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'status' => ['required', 'in:active,inactive'],

            'variants' => ['nullable', 'array'],
            'variants.*.color_id' => ['nullable', 'integer', 'exists:colors,id'],
            'variants.*.size_id' => ['nullable', 'integer', 'exists:sizes,id'],
            'variants.*.variant_code' => ['nullable', 'string', 'max:20'],
            'variants.*.barcode' => ['nullable', 'string', 'max:100'],
            'variants.*.initial_stock' => ['nullable', 'numeric', 'min:0', 'max:99999999'],
            'variants.*.status' => ['nullable', 'in:active,inactive'],
            'variants.*.is_legacy' => ['nullable', 'boolean'],

            'initial_stock_enabled' => ['nullable', 'boolean'],
            'initial_warehouse_id' => [
                'nullable',
                'required_if:initial_stock_enabled,true',
                'integer',
                'exists:warehouses,id',
            ],
            'initial_quantity' => [
                'nullable',
                Rule::requiredIf(fn () => $this->boolean('initial_stock_enabled') && empty($this->input('variants', []))),
                'numeric',
                'gt:0',
                'max:99999999',
            ],
            'initial_notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $variants = collect($this->input('variants', []))->map(function (array $variant): array {
            if (array_key_exists('barcode', $variant)) {
                $variant['barcode'] = BarcodeResolver::normalize($variant['barcode']);
            }
            return $variant;
        })->all();

        $this->merge([
            'barcode' => BarcodeResolver::normalize($this->input('barcode')),
            'variants' => $variants,
        ]);
    }
}
