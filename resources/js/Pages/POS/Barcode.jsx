import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import PageHeader from '@/Components/ui/PageHeader';
import { Head } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { fmtMoney } from '@/utils/format';

export default function PosBarcode({ variants = [] }) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState({});
    const [quantities, setQuantities] = useState({});

    const filteredVariants = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return variants;
        return variants.filter((variant) => [
            variant.product_name,
            variant.sku,
            variant.color,
            variant.size,
            variant.barcode,
            variant.label,
        ].filter(Boolean).join(' ').toLowerCase().includes(query));
    }, [search, variants]);

    const selectedVariants = variants.filter((variant) => selected[variant.id] && variant.barcode);
    const labelCount = selectedVariants.reduce((total, variant) => total + Number(quantities[variant.id] || 1), 0);

    const toggle = (variant) => {
        setSelected((current) => ({ ...current, [variant.id]: !current[variant.id] }));
        setQuantities((current) => ({ ...current, [variant.id]: current[variant.id] || 1 }));
    };

    const selectVisible = () => {
        setSelected((current) => Object.fromEntries([
            ...Object.entries(current),
            ...filteredVariants.filter((variant) => variant.barcode).map((variant) => [variant.id, true]),
        ]));
    };

    const clearSelection = () => setSelected({});

    const printPdf = () => {
        if (selectedVariants.length === 0) return;
        const params = new URLSearchParams();
        selectedVariants.forEach((variant, index) => {
            params.append(`items[${index}][variant_id]`, String(variant.id));
            params.append(`items[${index}][quantity]`, String(Math.max(1, Number(quantities[variant.id] || 1))));
        });
        window.open(`${route('pos.barcode.print')}?${params.toString()}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">Print barcodes</h2>}>
            <Head title="Print barcodes" />
            <PageHeader
                title="Print product barcodes"
                subtitle="Select products or variants, choose the number of labels, and open a PDF ready to print."
                actions={<Button variant="secondary" href={route('pos.create')}>Back to POS</Button>}
            />

            <Card>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
                    <div>
                        <h3 className="heading-md text-ink">Products and variants</h3>
                        <p className="mt-1 text-[13px] text-ink-mute">The PDF includes the product name, color, size, price, SKU, and barcode.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={selectVisible}>Select visible</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>Clear</Button>
                        <Button type="button" disabled={selectedVariants.length === 0 || labelCount > 500} onClick={printPdf}>
                            Open PDF ({labelCount})
                        </Button>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search product, SKU, color, size or barcode"
                        className="h-11 min-w-64 flex-1 rounded-md border border-hairline-input bg-canvas px-3 text-[14px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="text-[13px] text-ink-mute">{selectedVariants.length} selected · {labelCount} label(s)</span>
                </div>

                <div className="mt-4 w-full max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-hairline">
                    <table className="w-full min-w-[900px] text-start">
                        <thead className="bg-canvas-soft text-[12px] uppercase tracking-wide text-ink-mute">
                            <tr>
                                <th className="w-12 px-3 py-3"></th>
                                <th className="px-3 py-3 font-normal">Product</th>
                                <th className="px-3 py-3 font-normal">Color</th>
                                <th className="px-3 py-3 font-normal">Size</th>
                                <th className="px-3 py-3 font-normal">Barcode</th>
                                <th className="px-3 py-3 text-end font-normal">Price</th>
                                <th className="w-28 px-3 py-3 text-end font-normal">Labels</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {filteredVariants.map((variant) => (
                                <tr key={variant.id} className={selected[variant.id] ? 'bg-primary-soft/40' : ''}>
                                    <td className="px-3 py-3">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(selected[variant.id])}
                                            disabled={!variant.barcode}
                                            onChange={() => toggle(variant)}
                                            className="rounded border-hairline-input text-primary focus:ring-primary"
                                        />
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="font-medium text-ink">{variant.product_name}</div>
                                        <div className="text-[12px] text-ink-mute">{variant.sku}</div>
                                    </td>
                                    <td className="px-3 py-3 text-[14px] text-ink">{variant.color || '—'}</td>
                                    <td className="px-3 py-3 text-[14px] text-ink">{variant.size || '—'}</td>
                                    <td className="px-3 py-3 text-[13px] tabular text-ink-mute">{variant.barcode || 'No barcode'}</td>
                                    <td className="px-3 py-3 text-end text-[14px] tabular text-ink">{fmtMoney(variant.price)}</td>
                                    <td className="px-3 py-3 text-end">
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={quantities[variant.id] || 1}
                                            disabled={!variant.barcode || !selected[variant.id]}
                                            onChange={(event) => setQuantities((current) => ({ ...current, [variant.id]: event.target.value }))}
                                            className="h-9 w-20 rounded-md border border-hairline-input bg-canvas px-2 text-end text-[13px] text-ink disabled:opacity-50"
                                        />
                                    </td>
                                </tr>
                            ))}
                            {filteredVariants.length === 0 && (
                                <tr><td colSpan={7} className="py-10 text-center text-[14px] text-ink-mute">No products found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </AuthenticatedLayout>
    );
}
