<?php

namespace App\Http\Requests;

use App\Models\BillOfMaterial;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create_production');
    }

    public function rules(): array
    {
        return [
            'product_id' => [
                'required',
                'integer',
                'exists:products,id',
                Rule::unique('bill_of_materials', 'product_id'),
            ],
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.component_id' => [
                'required',
                'integer',
                'exists:products,id',
                'distinct',
                function ($attribute, $value, $fail) {
                    if ((int) $value === (int) $this->input('product_id')) {
                        $fail(__('production.validation.component_is_finished_product'));
                    }
                },
            ],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
        ];
    }
}