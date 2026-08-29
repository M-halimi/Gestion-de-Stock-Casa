import Input from '@/Components/ui/Input';
import axios from 'axios';
import { useMemo, useState } from 'react';

const keyFor = (colorId, sizeId) => `${colorId}:${sizeId}`;

export default function ProductVariantsEditor({ colors = [], sizes = [], data, setData, editableStock = false, productSku = '', productBarcode = '' }) {
    const existing = data.variants ?? [];
    const [selectedColors, setSelectedColors] = useState(() => existing.filter((v) => !v.is_legacy && v.color_id).map((v) => String(v.color_id)));
    const [selectedSizes, setSelectedSizes] = useState(() => existing.filter((v) => !v.is_legacy && v.size_id).map((v) => String(v.size_id)));
    const [availableColors, setAvailableColors] = useState(colors);
    const [availableSizes, setAvailableSizes] = useState(sizes);
    const [newColor, setNewColor] = useState('');
    const [newSize, setNewSize] = useState('');
    const variantMap = useMemo(
        () => new Map(existing.filter((v) => !v.is_legacy).map((v) => [keyFor(v.color_id, v.size_id), v])),
        [existing]
    );

    const variantCodeFor = (colorId, sizeId) => `${sizeId}${colorId}`;
    const automaticBarcode = (colorId, sizeId) => {
        const base = String(productBarcode || '').replace(/\s+/g, '');
        return base ? `${base}${variantCodeFor(colorId, sizeId)}` : '';
    };

    const regenerate = (nextColors, nextSizes) => {
        const generated = [];
        nextColors.forEach((colorId) => {
            nextSizes.forEach((sizeId) => {
                const previous = variantMap.get(keyFor(colorId, sizeId));
                generated.push(
                    previous ?? {
                        color_id: Number(colorId),
                        size_id: Number(sizeId),
                        variant_code: variantCodeFor(colorId, sizeId),
                        // Keep generated values as a live preview. The
                        // backend generates the final identifier on save.
                        barcode: '',
                        initial_stock: '',
                        status: 'active',
                        is_legacy: false,
                    }
                );
            });
        });
        setData('variants', generated);
    };

    const toggle = (kind, id) => {
        const value = String(id);
        const current = kind === 'color' ? selectedColors : selectedSizes;
        const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
        if (kind === 'color') setSelectedColors(next);
        else setSelectedSizes(next);
        regenerate(kind === 'color' ? next : selectedColors, kind === 'size' ? next : selectedSizes);
    };

    const updateVariant = (index, field, value) => {
        setData(
            'variants',
            existing.map((variant, currentIndex) => (currentIndex === index ? { ...variant, [field]: value } : variant))
        );
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                    <p className="mb-2 text-[14px] font-medium text-ink">Colors</p>
                    <div className="space-y-2 rounded-lg border border-hairline bg-canvas-soft p-3">
                        {availableColors.map((color) => (
                            <label key={color.id} className="flex cursor-pointer items-center gap-2 text-[14px] text-ink">
                                <input
                                    type="checkbox"
                                    checked={selectedColors.includes(String(color.id))}
                                    onChange={() => toggle('color', color.id)}
                                    className="rounded border-hairline-input text-primary focus:ring-primary"
                                />
                                {color.code && <span className="h-3 w-3 rounded-full border border-hairline" style={{ backgroundColor: color.code }} />}
                                {color.name}
                            </label>
                        ))}
                        <div className="mt-3 flex gap-2">
                            <input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="Add color" className="h-9 min-w-0 flex-1 rounded-md border border-hairline-input bg-canvas px-2 text-[13px] text-ink" />
                            <button type="button" className="rounded-md border border-hairline px-3 text-[13px] text-ink" onClick={() => {
                                if (!newColor.trim()) return;
                                axios.post(route('product-options.colors.store'), { name: newColor.trim() }).then(({ data: color }) => {
                                    setAvailableColors((current) => [...current, color]);
                                    setSelectedColors((current) => [...current, String(color.id)]);
                                    regenerate([...selectedColors, String(color.id)], selectedSizes);
                                    setNewColor('');
                                });
                            }}>Add</button>
                        </div>
                    </div>
                </div>
                <div>
                    <p className="mb-2 text-[14px] font-medium text-ink">Sizes</p>
                    <div className="space-y-2 rounded-lg border border-hairline bg-canvas-soft p-3">
                        {availableSizes.map((size) => (
                            <label key={size.id} className="flex cursor-pointer items-center gap-2 text-[14px] text-ink">
                                <input
                                    type="checkbox"
                                    checked={selectedSizes.includes(String(size.id))}
                                    onChange={() => toggle('size', size.id)}
                                    className="rounded border-hairline-input text-primary focus:ring-primary"
                                />
                                {size.name}
                                {size.category && <span className="text-[12px] text-ink-mute">({size.category})</span>}
                            </label>
                        ))}
                        <div className="mt-3 flex gap-2">
                            <input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="Add size" className="h-9 min-w-0 flex-1 rounded-md border border-hairline-input bg-canvas px-2 text-[13px] text-ink" />
                            <button type="button" className="rounded-md border border-hairline px-3 text-[13px] text-ink" onClick={() => {
                                if (!newSize.trim()) return;
                                axios.post(route('product-options.sizes.store'), { name: newSize.trim() }).then(({ data: size }) => {
                                    setAvailableSizes((current) => [...current, size]);
                                    setSelectedSizes((current) => [...current, String(size.id)]);
                                    regenerate(selectedColors, [...selectedSizes, String(size.id)]);
                                    setNewSize('');
                                });
                            }}>Add</button>
                        </div>
                    </div>
                </div>
            </div>

            {existing.length > 0 && (
                <div className="w-full max-w-full overflow-x-auto overscroll-x-contain rounded-lg border border-hairline">
                    <table className="min-w-[720px] w-full text-start">
                        <thead className="bg-canvas-soft text-[12px] uppercase tracking-wide text-ink-mute">
                            <tr>
                                <th className="px-3 py-2 font-normal">Color</th>
                                <th className="px-3 py-2 font-normal">Size</th>
                                <th className="px-3 py-2 font-normal">Variant code</th>
                                <th className="px-3 py-2 font-normal">Barcode</th>
                                {editableStock && <th className="px-3 py-2 font-normal">Initial stock</th>}
                                <th className="px-3 py-2 font-normal">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline">
                            {existing.map((variant, index) => (
                                <tr key={variant.id ?? `${variant.color_id}-${variant.size_id}-${index}`}>
                                    <td className="px-3 py-2 text-[14px] text-ink">{variant.is_legacy ? 'Legacy / default' : availableColors.find((c) => String(c.id) === String(variant.color_id))?.name ?? '—'}</td>
                                    <td className="px-3 py-2 text-[14px] text-ink">{variant.is_legacy ? '—' : availableSizes.find((s) => String(s.id) === String(variant.size_id))?.name ?? '—'}</td>
                                    <td className="px-3 py-2 text-[14px] text-ink-mute tabular">{variant.is_legacy ? '—' : variant.variant_code || variantCodeFor(variant.color_id, variant.size_id)}</td>
                                    <td className="min-w-52 px-3 py-2">
                                        <Input
                                            name={`variant_barcode_${variant.id ?? `${variant.color_id}_${variant.size_id}_${index}`}`}
                                            autoComplete="off"
                                            value={variant.barcode || automaticBarcode(variant.color_id, variant.size_id)}
                                            onChange={(e) => updateVariant(index, 'barcode', e.target.value)}
                                            placeholder={productBarcode ? 'Generated automatically' : 'Enter product barcode first'}
                                        />
                                    </td>
                                    {editableStock && (
                                        <td className="min-w-36 px-3 py-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.001"
                                                value={variant.initial_stock ?? ''}
                                                onChange={(e) => updateVariant(index, 'initial_stock', e.target.value)}
                                            />
                                        </td>
                                    )}
                                    <td className="min-w-32 px-3 py-2">
                                        <select
                                            value={variant.status ?? 'active'}
                                            onChange={(e) => updateVariant(index, 'status', e.target.value)}
                                            className="h-10 rounded-md border border-hairline-input bg-canvas px-2 text-[14px] text-ink"
                                        >
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <p className="text-[12px] text-ink-mute">Select colors and sizes to generate every combination automatically.</p>
        </div>
    );
}
