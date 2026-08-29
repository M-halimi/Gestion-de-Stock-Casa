<?php

namespace App\Http\Controllers;

use App\Models\Color;
use App\Models\Size;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProductOptionController extends Controller
{
    public function storeColor(Request $request): JsonResponse
    {
        $this->assertCanManage($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:colors,name'],
            'code' => ['nullable', 'string', 'max:20'],
        ]);

        return response()->json(Color::create($data + ['is_active' => true]), 201);
    }

    public function storeSize(Request $request): JsonResponse
    {
        $this->assertCanManage($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50', 'unique:sizes,name'],
            'category' => ['nullable', 'string', 'max:50'],
        ]);

        return response()->json(Size::create($data + ['is_active' => true]), 201);
    }

    private function assertCanManage(Request $request): void
    {
        abort_unless(
            $request->user()->can('create_products') || $request->user()->can('edit_products'),
            403,
        );
    }
}
