import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import CustomerCombobox from '@/Components/CustomerCombobox';
import Input from '@/Components/ui/Input';
import InputLabel from '@/Components/InputLabel';
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
} from '@/Components/ui/FormIcons';
import { useTranslation } from 'react-i18next';
import { fmtMoney, fmtNumber } from '@/utils/format';

const money = (v) => Number(v) || 0;

export default function SaleForm({
    customers,
    warehouses,
    products,
    data,
    setData,
    errors,
    processing,
    submitLabel,
    onSubmit,
    onOpenCreateCustomer,
}) {
    const { t } = useTranslation();

    const setItem = (index, key, value) => {
        const items = [...data.items];
        items[index] = { ...items[index], [key]: value };

        if (key === 'product_id') {
            const product = products.find((p) => String(p.id) === String(value));
            if (product && !items[index].unit_price) {
                items[index].unit_price = String(product.sale_price ?? '');
            }
        }

        setData('items', items);
    };

    const addItem = () => {
        setData('items', [...data.items, { product_id: '', quantity: '', unit_price: '', discount: 0, tax: 0 }]);
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
            product: products.find((p) => String(p.id) === String(item.product_id)),
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

    const selectedWarehouseId = String(data.warehouse_id ?? '');

    const availableStock = (product) => {
        if (!product) return 0;
        const rows = product.stocks ?? [];
        const filtered = selectedWarehouseId
            ? rows.filter((s) => String(s.warehouse_id) === selectedWarehouseId)
            : rows;
        return filtered.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
    };

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
                        <div>
                            <InputLabel htmlFor="customer_combobox" value={t('pages.sales.customer')} />
                            <CustomerCombobox
                                id="customer_combobox"
                                value={customers.find((c) => String(c.id) === String(data.customer_id ?? '')) ?? null}
                                customers={customers}
                                onSelect={(c) => setData('customer_id', String(c.id))}
                                onCreateNew={onOpenCreateCustomer}
                                error={errors.customer_id}
                                placeholder={t('pages.sales.customer_search_placeholder')}
                            />
                        </div>
                        <Select
                            id="warehouse_id"
                            label={t('pages.sales.warehouse')}
                            value={String(data.warehouse_id ?? '')}
                            onChange={(e) => setData('warehouse_id', e.target.value)}
                            error={errors.warehouse_id}
                            icon={<IconBuilding />}
                            options={[
                                { value: '', label: t('pages.sales.select_warehouse') },
                                ...warehouses.map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
                            ]}
                        />
                        <Input
                            id="date"
                            label={t('pages.sales.date')}
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
                            label={t('pages.sales.notes')}
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            error={errors.notes}
                            icon={<IconNote />}
                        />
                    </div>
                </Card>

                <Card>
                    <div className="mb-4 flex items-center justify-between">
                        <label className="text-[14px] font-normal text-ink">{t('pages.sales.items')}</label>
                        <Button type="button" size="sm" variant="secondary" onClick={addItem}>
                            {t('pages.sales.add_item')}
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className="rounded-lg border border-hairline bg-canvas-soft p-3">
                                <div className="flex flex-wrap items-end gap-3">
                                    <Select
                                        label={t('pages.sales.product')}
                                        value={String(item.product_id ?? '')}
                                        onChange={(e) => setItem(index, 'product_id', e.target.value)}
                                        error={errors[`items.${index}.product_id`]}
                                        className="min-w-56 flex-1"
                                        icon={<IconBox />}
                                        options={[
                                            { value: '', label: t('pages.sales.select_product') },
                                            ...products.map((p) => ({ value: String(p.id), label: `${p.name} (${p.sku})` })),
                                        ]}
                                    />
                                    <Input
                                        label={t('pages.sales.quantity')}
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
                                        label={t('pages.sales.unit_price')}
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
                                        label={t('pages.sales.discount')}
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
                                        label={t('pages.sales.tax')}
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
                                        <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.sales.line_total')}</div>
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
                                {item.product && (
                                    <p className="mt-2 text-[12px] text-ink-mute tabular">
                                        {t('pages.sales.stock_available')} : {fmtNumber(availableStock(item.product))}
                                        {!selectedWarehouseId && <span> ({t('pages.sales.all_warehouses')})</span>}
                                    </p>
                                )}
                            </div>
                        ))}

                        {items.length === 0 && (
                            <div className="rounded-lg border border-dashed border-hairline-strong p-6 text-center">
                                <p className="text-[14px] text-ink-mute">{t('pages.sales.no_items')}</p>
                            </div>
                        )}

                        {generalErrors && <p className="text-[13px] text-destructive">{generalErrors}</p>}
                    </div>
                </Card>

                {items.length > 0 && (
                    <Card>
                        <div className="space-y-1.5 text-[14px]">
                            <div className="flex justify-between">
                                <span className="text-ink-mute">{t('pages.sales.subtotal')}</span>
                                <span className="text-ink tabular">{fmtMoney(totals.subtotal)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-ink-mute">{t('pages.sales.discount')}</span>
                                <span className="text-ink tabular">− {fmtMoney(totals.discount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-ink-mute">{t('pages.sales.tax')}</span>
                                <span className="text-ink tabular">+ {fmtMoney(totals.tax)}</span>
                            </div>
                            <div className="mt-2 flex justify-between border-t border-hairline pt-2.5">
                                <span className="font-semibold text-ink">{t('pages.sales.grand_total')}</span>
                                <span className="font-semibold text-ink tabular">{fmtMoney(grandTotal)}</span>
                            </div>
                        </div>
                    </Card>
                )}

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" href={route('sales.index')}>
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
