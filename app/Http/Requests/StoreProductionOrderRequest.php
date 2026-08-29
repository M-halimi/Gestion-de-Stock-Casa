<?php

namespace App\Http\Requests;

use App\Models\BillOfMaterial;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductionOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create_production');
    }

    public function rules(): array
    {
        return [
            'bill_of_material_id' => ['required', 'integer', 'exists:bill_of_materials,id'],
            'product_variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'warehouse_id' => [
                'required',
                'integer',
                Rule::exists('warehouses', 'id')->where('is_active', true),
            ],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
