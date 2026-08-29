<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Product barcodes</title>
    <style>
        * { box-sizing: border-box; }
        @page { margin: 10mm; }
        body { margin: 0; color: #172033; font-family: DejaVu Sans, sans-serif; }
        .heading { margin-bottom: 8px; border-bottom: 2px solid #2563eb; padding: 0 0 7px 2px; }
        .heading h1 { margin: 0; color: #172033; font-size: 16px; font-weight: bold; }
        .heading p { margin: 3px 0 0; color: #64748b; font-size: 9px; }
        .labels-table { width: 100%; border-collapse: separate; border-spacing: 4mm 4mm; table-layout: fixed; }
        .label-cell { width: 33.333%; height: 50mm; border: 1px solid #cbd5e1; border-top: 3px solid #2563eb; border-radius: 3mm; padding: 3mm; vertical-align: top; }
        .name { height: 8mm; overflow: hidden; color: #0f172a; font-size: 11px; font-weight: bold; }
        .variant { display: inline-block; max-width: 100%; height: 6mm; overflow: hidden; border-radius: 2mm; background: #eff6ff; padding: 1mm 2mm; color: #1d4ed8; font-size: 8px; font-weight: bold; }
        .meta { margin-top: 2mm; color: #64748b; font-size: 8px; }
        .price { float: right; color: #0f766e; font-size: 9px; font-weight: bold; }
        .barcode { width: 100%; height: 17mm; margin-top: 3mm; border: 1px solid #e2e8f0; border-radius: 2mm; padding: 2mm 1.5mm 1mm; background: #ffffff; }
        .barcode-table { width: 100%; height: 100%; table-layout: fixed; border-collapse: collapse; border-spacing: 0; }
        .barcode-table tr, .barcode-table td { width: auto; height: 100%; border: 0; padding: 0; }
        .number { margin-top: 1.5mm; text-align: center; color: #0f172a; font-family: DejaVu Sans Mono, monospace; font-size: 10px; font-weight: bold; letter-spacing: 0.8px; }
    </style>
</head>
<body>
    <div class="heading">
        <h1>Product barcodes</h1>
        <p>Generated {{ $generatedAt->format('d/m/Y H:i') }} — {{ count($labels) }} label(s)</p>
    </div>

    <table class="labels-table">
        @foreach($labels->chunk(3) as $row)
            <tr>
                @foreach($row as $label)
                    <td class="label-cell">
                        <div class="name">{{ $label['product_name'] }}</div>
                        <div class="variant">
                            {{ collect([$label['color'], $label['size']])->filter()->join(' / ') ?: 'Default' }}
                        </div>
                        @if($label['sku'])<div class="sku">SKU: {{ $label['sku'] }}</div>@endif
                        @if($label['price'] !== null)<div class="price">{{ number_format((float) $label['price'], 2, ',', ' ') }} MAD</div>@endif
                        <div class="barcode">{!! $label['barcode_html'] !!}</div>
                        <div class="number">{{ $label['barcode'] }}</div>
                    </td>
                @endforeach
                @for($empty = $row->count(); $empty < 3; $empty++)
                    <td style="border-color: transparent"></td>
                @endfor
            </tr>
        @endforeach
    </table>
</body>
</html>
