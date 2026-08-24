<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }} {{ $document->reference }}</title>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; color: #1f2937; font-family: DejaVu Sans, sans-serif; font-size: 12px; }
        .page { max-width: 820px; margin: 0 auto; padding: 32px; }
        .header, .meta, .totals { display: flex; justify-content: space-between; gap: 24px; }
        .header { border-bottom: 2px solid #1f2937; padding-bottom: 18px; }
        h1 { margin: 0 0 8px; font-size: 24px; }
        h2 { margin: 0; font-size: 14px; }
        p { margin: 4px 0; }
        .muted { color: #6b7280; }
        .meta { margin: 24px 0; }
        .meta > div { width: 50%; }
        .label { color: #6b7280; font-size: 10px; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #f3f4f6; color: #4b5563; font-size: 10px; text-align: left; text-transform: uppercase; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 9px 7px; }
        .number { text-align: right; }
        .totals { justify-content: flex-end; margin-top: 18px; }
        .totals table { width: 280px; margin-top: 0; }
        .grand-total td { border-top: 2px solid #1f2937; font-size: 14px; font-weight: bold; }
        .notes { margin-top: 26px; padding: 12px; background: #f9fafb; }
        .footer { margin-top: 48px; border-top: 1px solid #e5e7eb; padding-top: 12px; color: #6b7280; text-align: center; }
        @media print { .page { padding: 0; } }
    </style>
</head>
<body @if($print) onload="window.print()" @endif>
@php($logoData = 'data:image/png;base64,' . base64_encode(file_get_contents(public_path('images/teklidi-logo-256.png'))))
<main class="page">
    <header class="header">
        <div>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
                <img src="{{ $logoData }}" style="height: 56px; width: 56px;" alt="logo">
                <h1 style="margin: 0;">TEKLIDI SHOP</h1>
            </div>
            <p class="muted">{{ $document->warehouse?->name ?? '' }}</p>
        </div>
        <div style="text-align: right">
            <h1>{{ $title }}</h1>
            <p><strong>N° {{ $document->reference }}</strong></p>
            <p class="muted">Date : {{ optional($document->date)->format('d/m/Y') }}</p>
        </div>
    </header>

    <section class="meta">
        <div>
            <div class="label">{{ $partyLabel }}</div>
            <h2>{{ $party?->name ?? '—' }}</h2>
            @if($party?->contact_person)<p>{{ $party->contact_person }}</p>@endif
            @if($party?->address)<p>{{ $party->address }}</p>@endif
            @if($party?->city)<p>{{ $party->city }}</p>@endif
            @if($party?->phone)<p>{{ $party->phone }}</p>@endif
            @if($party?->email)<p>{{ $party->email }}</p>@endif
        </div>
        <div style="text-align: right">
            <div class="label">Statut</div>
            <p>{{ ucfirst((string) $document->status) }}</p>
            @if($document->warehouse)
                <div class="label" style="margin-top: 12px">Entrepôt</div>
                <p>{{ $document->warehouse->name }}{{ $document->warehouse->code ? ' (' . $document->warehouse->code . ')' : '' }}</p>
            @endif
        </div>
    </section>

    <table>
        <thead>
        <tr>
            <th>Produit</th>
            <th class="number">Quantité</th>
            <th class="number">Prix unitaire</th>
            <th class="number">Remise</th>
            <th class="number">Taxe</th>
            <th class="number">Total</th>
        </tr>
        </thead>
        <tbody>
        @foreach($items as $item)
            <tr>
                <td>{{ $item->product?->name ?? '—' }} @if($item->product?->sku)<span class="muted">({{ $item->product->sku }})</span>@endif</td>
                <td class="number">{{ number_format((float) $item->quantity, 3, ',', ' ') }}</td>
                <td class="number">{{ number_format((float) $item->unit_price, 2, ',', ' ') }} {{ $settings['currency_symbol'] }}</td>
                <td class="number">{{ number_format((float) $item->discount, 2, ',', ' ') }} {{ $settings['currency_symbol'] }}</td>
                <td class="number">{{ number_format((float) $item->tax, 2, ',', ' ') }} {{ $settings['currency_symbol'] }}</td>
                <td class="number">{{ number_format((float) $item->lineTotal(), 2, ',', ' ') }} {{ $settings['currency_symbol'] }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <section class="totals">
        <table>
            <tr><td>Sous-total</td><td class="number">{{ number_format((float) $document->subtotal, 2, ',', ' ') }} {{ $settings['currency_symbol'] }}</td></tr>
            <tr><td>Remise</td><td class="number">− {{ number_format((float) $document->discount, 2, ',', ' ') }} {{ $settings['currency_symbol'] }}</td></tr>
            <tr><td>Taxe</td><td class="number">+ {{ number_format((float) $document->tax, 2, ',', ' ') }} {{ $settings['currency_symbol'] }}</td></tr>
            <tr class="grand-total"><td>Total</td><td class="number">{{ number_format((float) $document->total_amount, 2, ',', ' ') }} {{ $settings['currency_symbol'] }}</td></tr>
        </table>
    </section>

    @if($document->notes)
        <div class="notes"><strong>Notes</strong><br>{{ $document->notes }}</div>
    @endif

    @if($settings['invoice_footer'])
        <footer class="footer">{{ $settings['invoice_footer'] }}</footer>
    @endif
</main>
</body>
</html>
