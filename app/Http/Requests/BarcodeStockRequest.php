<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BarcodeStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('manage_stock');
    }

    public function rules(): array
    {
        return [
            'variant_id' => ['required', 'integer', 'exists:product_variants,id'],
            'warehouse_id' => [
                'required',
                'integer',
                Rule::exists('warehouses', 'id')->where('is_active', true),
            ],
            'quantity' => ['required', 'numeric', 'gt:0', 'max:99999999'],
            'reason' => ['nullable', 'string', 'max:500'],
        ];
    }
}
