<?php

namespace App\Http\Controllers;

use App\Models\ProductVariant;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class PosBarcodeController extends Controller
{
    /** @var array<int, string> */
    private const CODE128_PATTERNS = [
        '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
        '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
        '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
        '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
        '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
        '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
        '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
        '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
        '111242',
        '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141', '214121',
        '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141', '114131',
        '311141', '411131', '211412', '211214', '211232',
    ];

    public function page(): Response
    {
        $variants = ProductVariant::query()
            ->select(['id', 'product_id', 'color_id', 'size_id', 'variant_code', 'barcode', 'is_legacy', 'status'])
            ->where('status', ProductVariant::STATUS_ACTIVE)
            ->whereHas('product', fn ($query) => $query->where('status', 'active'))
            ->with([
                'product:id,name,sku,barcode,sale_price,status',
                'color:id,name',
                'size:id,name',
            ])
            ->get()
            ->sortBy(fn (ProductVariant $variant) => mb_strtolower((string) $variant->product?->name))
            ->values()
            ->map(fn (ProductVariant $variant) => $this->mapVariant($variant));

        return Inertia::render('POS/Barcode', [
            'variants' => $variants,
        ]);
    }

    public function printLabels(Request $request): SymfonyResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.variant_id' => ['required', 'integer', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:100'],
        ]);

        $items = collect($data['items']);
        if ((int) $items->sum('quantity') > 500) {
            return back()->with('error', 'You can print a maximum of 500 labels at once.');
        }

        $variants = ProductVariant::query()
            ->whereIn('id', $items->pluck('variant_id'))
            ->where('status', ProductVariant::STATUS_ACTIVE)
            ->whereHas('product', fn ($query) => $query->where('status', 'active'))
            ->with(['product:id,name,sku,sale_price,status,barcode', 'color:id,name', 'size:id,name'])
            ->get()
            ->keyBy('id');

        $labels = collect();
        foreach ($items as $item) {
            /** @var ProductVariant|null $variant */
            $variant = $variants->get((int) $item['variant_id']);
            $barcode = trim((string) ($variant?->barcode ?: ($variant?->is_legacy ? $variant->product?->barcode : null)));

            if (! $variant || $barcode === '') {
                return back()->with('error', 'Every selected variant must have a barcode.');
            }

            for ($index = 0; $index < (int) $item['quantity']; $index++) {
                $labels->push([
                    'product_name' => $variant->product?->name ?? 'Product',
                    'sku' => $variant->product?->sku,
                    'color' => $variant->color?->name,
                    'size' => $variant->size?->name,
                    'price' => $variant->product?->sale_price,
                    'barcode' => $barcode,
                    'barcode_html' => $this->barcodeHtml($barcode),
                ]);
            }
        }

        return Pdf::loadView('documents.barcode-labels', [
            'labels' => $labels,
            'generatedAt' => now(),
        ])
            ->setPaper('a4', 'portrait')
            ->stream('product-barcodes-' . now()->format('Ymd-His') . '.pdf');
    }

    private function mapVariant(ProductVariant $variant): array
    {
        return [
            'id' => $variant->id,
            'product_name' => $variant->product?->name,
            'sku' => $variant->product?->sku,
            'variant_code' => $variant->variant_code,
            'color' => $variant->is_legacy ? null : $variant->color?->name,
            'size' => $variant->is_legacy ? null : $variant->size?->name,
            'barcode' => $variant->barcode ?: ($variant->is_legacy ? $variant->product?->barcode : null),
            'price' => $variant->product?->sale_price,
            'label' => $variant->is_legacy ? 'Default' : $variant->label(),
        ];
    }

    private function barcodeHtml(string $value): string
    {
        $codes = [104];
        foreach (str_split($value) as $character) {
            $ascii = ord($character);
            if ($ascii < 32 || $ascii > 126) {
                throw new \InvalidArgumentException('Barcode contains unsupported characters.');
            }
            $codes[] = $ascii - 32;
        }

        $checksum = 104;
        foreach (array_slice($codes, 1) as $position => $code) {
            $checksum += $code * ($position + 1);
        }
        $codes[] = $checksum % 103;
        $codes[] = 106;

        $segments = [];
        $totalModules = 0;
        foreach ($codes as $code) {
            $pattern = $code === 106 ? '2331112' : self::CODE128_PATTERNS[$code];
            for ($index = 0; $index < strlen($pattern); $index++) {
                $modules = (int) $pattern[$index];
                $segments[] = [$modules, $index % 2 === 0];
                $totalModules += $modules;
            }
        }

        $html = '<table class="barcode-table"><tr>';
        foreach ($segments as [$modules, $isBar]) {
            $width = ($modules / $totalModules) * 100;
            $background = $isBar ? '#000000' : '#ffffff';
            $html .= sprintf('<td style="width:%.5f%%;background-color:%s;padding:0;border:0"></td>', $width, $background);
        }

        return $html . '</tr></table>';
    }
}
