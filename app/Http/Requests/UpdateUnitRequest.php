<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('edit_units');
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:50', 'unique:units,name,' . $this->unit->id],
            'abbreviation' => ['required', 'string', 'max:10', 'unique:units,abbreviation,' . $this->unit->id],
        ];
    }
}