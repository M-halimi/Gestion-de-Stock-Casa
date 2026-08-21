import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Select from '@/Components/ui/Select';
import TextArea from '@/Components/ui/TextArea';
import { IconBox, IconNote, IconNumber } from '@/Components/ui/FormIcons';
import { useTranslation } from 'react-i18next';

export default function BomForm({
    products,
    components,
    data,
    setData,
    errors,
    processing,
    submitLabel,
    fixedProduct = false,
    productName = '',
    onSubmit,
}) {
    const { t } = useTranslation();

    const setItem = (index, key, value) => {
        const items = [...data.items];
        items[index] = { ...items[index], [key]: value };
        setData('items', items);
    };

    const addItem = () => {
        setData('items', [...data.items, { component_id: '', quantity: '' }]);
    };

    const removeItem = (index) => {
        setData(
            'items',
            data.items.filter((_, i) => i !== index)
        );
    };

    const productOptions = fixedProduct
        ? [{ value: String(data.product_id), label: productName }]
        : [
              { value: '', label: t('pages.production.boms.select_product') },
              ...products.map((p) => ({ value: String(p.id), label: `${p.name} (${p.sku})` })),
          ];

    const generalErrors = typeof errors.items === 'string' ? errors.items : null;

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
                            id="product_id"
                            label={t('pages.production.boms.finished_product')}
                            value={data.product_id}
                            onChange={(e) => setData('product_id', e.target.value)}
                            error={errors.product_id}
                            disabled={fixedProduct}
                            icon={<IconBox />}
                            options={productOptions}
                        />
                        <TextArea
                            id="notes"
                            label={t('pages.production.boms.notes')}
                            value={data.notes}
                            onChange={(e) => setData('notes', e.target.value)}
                            error={errors.notes}
                            icon={<IconNote />}
                        />
                    </div>
                </Card>

                <Card>
                    <div className="mb-4 flex items-center justify-between">
                        <label className="text-[14px] font-normal text-ink">{t('pages.production.boms.components')}</label>
                        <Button type="button" size="sm" variant="secondary" onClick={addItem}>
                            {t('pages.production.boms.add_component')}
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {data.items.map((item, index) => (
                            <div key={index} className="flex flex-wrap items-end gap-3 rounded-lg border border-hairline bg-canvas-soft p-3">
                                <Select
                                    label={t('pages.production.boms.component')}
                                    value={String(item.component_id)}
                                    onChange={(e) => setItem(index, 'component_id', e.target.value)}
                                    error={errors[`items.${index}.component_id`]}
                                    className="min-w-56 flex-1"
                                    icon={<IconBox />}
                                    options={[
                                        { value: '', label: t('pages.production.boms.select_component') },
                                        ...components.map((c) => ({ value: String(c.id), label: `${c.name} (${c.sku})` })),
                                    ]}
                                />
                                <Input
                                    label={t('pages.production.boms.quantity')}
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    value={item.quantity}
                                    onChange={(e) => setItem(index, 'quantity', e.target.value)}
                                    error={errors[`items.${index}.quantity`]}
                                    className="w-40"
                                    icon={<IconNumber />}
                                    inputClass="tabular"
                                />
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
                        ))}

                        {data.items.length === 0 && (
                            <div className="rounded-lg border border-dashed border-hairline-strong p-6 text-center">
                                <p className="text-[14px] text-ink-mute">{t('pages.production.boms.no_components')}</p>
                            </div>
                        )}

                        {generalErrors && <p className="text-[13px] text-destructive">{generalErrors}</p>}
                    </div>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" href={route('production.boms.index')}>
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