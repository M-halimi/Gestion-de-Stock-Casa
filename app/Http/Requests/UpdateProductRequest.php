<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Services\BarcodeResolver;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('edit_products');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'sku' => ['nullable', 'string', 'max:50', 'unique:products,sku,' . $this->product->id],
            'barcode' => ['nullable', 'string', 'max:50', 'unique:products,barcode,' . $this->product->id],
            'category_id' => ['required', 'exists:categories,id'],
            'unit_id' => ['required', 'exists:units,id'],
            'purchase_price' => ['required', 'numeric', 'min:0', 'max:99999999'],
            'sale_price' => ['required', 'numeric', 'min:0', 'max:99999999'],
            'min_stock' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:2000'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
            'status' => ['required', 'in:active,inactive'],
            'variants' => ['nullable', 'array'],
            'variants.*.id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'variants.*.color_id' => ['nullable', 'integer', 'exists:colors,id'],
            'variants.*.size_id' => ['nullable', 'integer', 'exists:sizes,id'],
            'variants.*.variant_code' => ['nullable', 'string', 'max:20'],
            'variants.*.barcode' => ['nullable', 'string', 'max:100'],
            'variants.*.status' => ['nullable', 'in:active,inactive'],
            'variants.*.is_legacy' => ['nullable', 'boolean'],
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
