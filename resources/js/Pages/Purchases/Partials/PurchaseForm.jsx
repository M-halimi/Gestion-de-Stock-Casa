import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import BarcodeInput from '@/Components/BarcodeInput';
import Input from '@/Components/ui/Input';
import Select from '@/Components/ui/Select';
import TextArea from '@/Components/ui/TextArea';
import {
    IconBox,
    IconBuilding,
    IconCalendar,
    IconMoney,
    IconNote,
    IconNumber,
    IconPercent,
    IconTruck,
} from '@/Components/ui/FormIcons';
import { useTranslation } from 'react-i18next';
import { fmtMoney } from '@/utils/format';
import { useState } from 'react';

const money = (v) => Number(v) || 0;

export default function PurchaseForm({
    suppliers,
    warehouses,
    products,
    data,
    setData,
    errors,
    processing,
    submitLabel,
    onSubmit,
}) {
    const { t } = useTranslation();
    const [scanBarcode, setScanBarcode] = useState('');
    const [scanError, setScanError] = useState('');

    const addScannedItem = (resolved) => {
        const product = products.find((candidate) => String(candidate.id) === String(resolved.product?.id));
        if (!product) return setScanError('The scanned product is not available in this form.');

        const activeVariants = (product.variants ?? []).filter((variant) => variant.status === 'active');
        const variant = resolved.match === 'variant'
            ? activeVariants.find((candidate) => String(candidate.id) === String(resolved.variant_id))
            : activeVariants.length === 1 ? activeVariants[0] : null;

        if (!variant) return setScanError('Scan the exact variant barcode for this product.');

        const existingIndex = data.items.findIndex((item) =>
            String(item.product_id) === String(product.id) && String(item.product_variant_id) === String(variant.id)
        );
        if (existingIndex >= 0) {
            const nextItems = [...data.items];
            nextItems[existingIndex] = { ...nextItems[existingIndex], quantity: money(nextItems[existingIndex].quantity) + 1 };
            setData('items', nextItems);
        } else {
            setData('items', [...data.items, {
                product_id: product.id,
                product_variant_id: variant.id,
                quantity: 1,
                unit_price: String(product.purchase_price ?? ''),
                discount: 0,
                tax: 0,
            }]);
        }
        setScanBarcode('');
        setScanError('');
    };

    const setItem = (index, key, value) => {
        const items = [...data.items];
        items[index] = { ...items[index], [key]: value };

        if (key === 'product_id') {
            const product = products.find((p) => String(p.id) === String(value));
            if (product && !items[index].unit_price) {
                items[index].unit_price = String(product.purchase_price ?? '');
            }
            const variants = (product?.variants ?? []).filter((variant) => variant.status === 'active');
            items[index].product_variant_id = variants.length === 1 ? String(variants[0].id) : '';
        }

        setData('items', items);
    };

    const addItem = () => {
        setData('items', [...data.items, { product_id: '', product_variant_id: '', quantity: '', unit_price: '', discount: 0, tax: 0 }]);
    };

    const removeItem = (index) => {
        setData(
            'items',
            data.items.filter((_, i) => i !== index)
        );
    };

    const items = data.items.map((item) => {
        const subtotal = money(item.quantity) * money(item.unit_price);
        return {
            ...item,
            subtotal,
            line_total: subtotal - money(item.discount) + money(item.tax),
        };
    });

    const totals = items.reduce(
        (acc, item) => ({
            subtotal: acc.subtotal + item.subtotal,
            discount: acc.discount + money(item.discount),
            tax: acc.tax + money(item.tax),
        }),
        { subtotal: 0, discount: 0, tax: 0 }
    );

    const grandTotal = totals.subtotal - totals.discount + totals.tax;
    const generalErrors = typeof errors.items === 'string' ? errors.items : null;
    const variantLabel = (variant) => variant.is_legacy ? 'Default' : [variant.color?.name, variant.size?.name].filter(Boolean).join(' / ');

    return (
        <div className="max-w-4xl">
            <form
                className="space-y-8"
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit?.();
                }}
            >
                <Card>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Select
                            id="supplier_id"
                            label={t('pages.purchases.supplier')}
                            value={String(data.supplier_id ?? '')}
                            onChange={(e) => setData('supplier_id', e.target.value)}
                            error={errors.supplier_id}
                            icon={<IconTruck />}
                            options={[
                                { value: '', label: t('pages.purchases.select_supplier') },
                                ...suppliers.map((s) => ({ value: String(s.id), label: s.name })),
                            ]}
                        />
                        <Select
                            id="warehouse_id"
                            label={t('pages.purchases.warehouse')}
                            value={String(data.warehouse_id ?? '')}
                            onChange={(e) => setData('warehouse_id', e.target.value)}
                            error={errors.warehouse_id}
                            icon={<IconBuilding />}
                            options={[
                                { value: '', label: t('pages.purchases.select_warehouse') },
                                ...warehouses.map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
                            ]}
                        />
                        <Input
                            id="date"
                            label={t('pages.purchases.date')}
                            type="date"
                            value={data.date}
                            onChange={(e) => setData('date', e.target.value)}
                            error={errors.date}
                            icon={<IconCalendar />}
                        />
                    </div>
                    <div className="mt-5">
                        <TextArea
                            id="notes"
                            label={t('pages.purchases.notes')}
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            error={errors.notes}
                            icon={<IconNote />}
                        />
                    </div>
                </Card>

                <Card>
                    <p className="text-[14px] font-medium text-ink">Scan barcode to add a purchase item</p>
                    <div className="mt-3">
                        <BarcodeInput
                            endpoint={route('purchases.barcode.lookup')}
                            value={scanBarcode}
                            onChange={setScanBarcode}
                            onResolved={addScannedItem}
                            onError={setScanError}
                        />
                    </div>
                    {scanError && <p className="mt-2 text-[13px] text-destructive">{scanError}</p>}
                </Card>

                <Card>
                    <div className="mb-4 flex items-center justify-between">
                        <label className="text-[14px] font-normal text-ink">{t('pages.purchases.items')}</label>
                        <Button type="button" size="sm" variant="secondary" onClick={addItem}>
                            {t('pages.purchases.add_item')}
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className="rounded-lg border border-hairline bg-canvas-soft p-3">
                                <div className="flex flex-wrap items-end gap-3">
                                    <Select
                                        label={t('pages.purchases.product')}
                                        value={String(item.product_id ?? '')}
                                        onChange={(e) => setItem(index, 'product_id', e.target.value)}
                                        error={errors[`items.${index}.product_id`]}
                                        className="min-w-56 flex-1"
                                        icon={<IconBox />}
                                        options={[
                                            { value: '', label: t('pages.purchases.select_product') },
                                            ...products.map((p) => ({ value: String(p.id), label: `${p.name} (${p.sku})` })),
                                        ]}
                                    />
                                    {((item.product?.variants ?? []).filter((variant) => variant.status === 'active').length > 0) && (
                                        <Select
                                            label="Variant"
                                            value={String(item.product_variant_id ?? '')}
                                            onChange={(e) => setItem(index, 'product_variant_id', e.target.value)}
                                            error={errors[`items.${index}.product_variant_id`]}
                                            className="min-w-40"
                                            options={[
                                                { value: '', label: 'Select variant' },
                                                ...item.product.variants
                                                    .filter((variant) => variant.status === 'active')
                                                    .map((variant) => ({ value: String(variant.id), label: variantLabel(variant) })),
                                            ]}
                                        />
                                    )}
                                    <Input
                                        label={t('pages.purchases.quantity')}
                                        type="number"
                                        step="0.001"
                                        min="0.001"
                                        value={item.quantity}
                                        onChange={(e) => setItem(index, 'quantity', e.target.value)}
                                        error={errors[`items.${index}.quantity`]}
                                        className="w-36"
                                        icon={<IconNumber />}
                                        inputClass="tabular"
                                    />
                                    <Input
                                        label={t('pages.purchases.unit_price')}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={item.unit_price}
                                        onChange={(e) => setItem(index, 'unit_price', e.target.value)}
                                        error={errors[`items.${index}.unit_price`]}
                                        className="w-36"
                                        icon={<IconMoney />}
                                        inputClass="tabular"
                                    />
                                    <Input
                                        label={t('pages.purchases.discount')}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={item.discount}
                                        onChange={(e) => setItem(index, 'discount', e.target.value)}
                                        error={errors[`items.${index}.discount`]}
                                        className="w-32"
                                        icon={<IconPercent />}
                                        inputClass="tabular"
                                    />
                                    <Input
                                        label={t('pages.purchases.tax')}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={item.tax}
                                        onChange={(e) => setItem(index, 'tax', e.target.value)}
                                        error={errors[`items.${index}.tax`]}
                                        className="w-32"
                                        icon={<IconPercent />}
                                        inputClass="tabular"
                                    />
                                    <div className="mb-1.5 text-end">
                                        <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.purchases.line_total')}</div>
                                        <div className="mt-0.5 text-[15px] font-semibold text-ink tabular">{fmtMoney(item.line_total)}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        className="mb-1.5 rounded-md p-2 text-ink-mute transition hover:bg-destructive-soft hover:text-destructive"
                                        aria-label={t('common.delete')}
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}

                        {items.length === 0 && (
                            <div className="rounded-lg border border-dashed border-hairline-strong p-6 text-center">
                                <p className="text-[14px] text-ink-mute">{t('pages.purchases.no_items')}</p>
                            </div>
                        )}

                        {generalErrors && <p className="text-[13px] text-destructive">{generalErrors}</p>}
                    </div>
                </Card>

                {items.length > 0 && (
                    <Card>
                        <div className="space-y-1.5 text-[14px]">
                            <div className="flex justify-between">
                                <span className="text-ink-mute">{t('pages.purchases.subtotal')}</span>
                                <span className="text-ink tabular">{fmtMoney(totals.subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-ink-mute">{t('pages.purchases.discount')}</span>
                                <span className="text-ink tabular">− {fmtMoney(totals.discount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-ink-mute">{t('pages.purchases.tax')}</span>
                                <span className="text-ink tabular">+ {fmtMoney(totals.tax)}</span>
                            </div>
                            <div className="mt-2 flex justify-between border-t border-hairline pt-2.5">
                                <span className="font-semibold text-ink">{t('pages.purchases.grand_total')}</span>
                                <span className="font-semibold text-ink tabular">{fmtMoney(grandTotal)}</span>
                            </div>
                        </div>
                    </Card>
                )}

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" href={route('purchases.index')}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" variant="primary" disabled={processing}>
                        {submitLabel}
                    </Button>
                </div>
            </form>
        </div>
    );
}
