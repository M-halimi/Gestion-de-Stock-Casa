<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #1a1a1a; }
        .brand { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .brand img { height: 44px; width: 44px; }
        .brand .name { font-size: 16px; font-weight: bold; color: #8c6d1f; letter-spacing: 0.5px; }
        .brand .sep { border-bottom: 2px solid #d4af5e; margin-bottom: 12px; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .meta { color: #6b6b6b; margin-bottom: 16px; font-size: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f4f2ef; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; }
        td { padding: 5px 8px; border-bottom: 1px solid #e5e3df; }
        .num { text-align: right; }
    </style>
</head>
<body>
    @php($logoData = 'data:image/png;base64,' . base64_encode(file_get_contents(public_path('images/teklidi-logo-256.png'))))
    <div class="brand">
        <img src="{{ $logoData }}" alt="logo">
        <span class="name">TEKLIDI SHOP</span>
    </div>
    <div class="sep"></div>
    <h1>{{ $title }}</h1>
    <div class="meta">
        Généré le {{ $date }}
        @if ($period)
            — Période : {{ $period['from'] }} → {{ $period['to'] }}
        @endif
        — {{ count($rows) }} ligne(s)
    </div>
    <table>
        <thead>
            <tr>
                @foreach ($columns as $column)
                    <th>{{ $column }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse ($rows as $row)
                <tr>
                    @foreach ($row as $cell)
                        <td @if (is_numeric($cell)) class="num" @endif>{{ $cell }}</td>
                    @endforeach
                </tr>
            @empty
                <tr>
                    <td colspan="{{ count($columns) }}">Aucune donnée pour cette période.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>