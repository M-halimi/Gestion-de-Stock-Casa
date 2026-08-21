<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('edit_production');
    }

    public function rules(): array
    {
        return [
            'notes' => ['nullable', 'string', 'max:2000'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.component_id' => [
                'required',
                'integer',
                'exists:products,id',
                'distinct',
                function ($attribute, $value, $fail) {
                    if ((int) $value === (int) $this->route('bom')->product_id) {
                        $fail(__('production.validation.component_is_finished_product'));
                    }
                },
            ],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
        ];
    }
}