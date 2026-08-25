<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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

            'initial_stock_enabled' => ['nullable', 'boolean'],
            'initial_warehouse_id' => [
                'nullable',
                'required_if:initial_stock_enabled,true',
                'integer',
                'exists:warehouses,id',
            ],
            'initial_quantity' => [
                'nullable',
                'required_if:initial_stock_enabled,true',
                'numeric',
                'gt:0',
                'max:99999999',
            ],
            'initial_notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
