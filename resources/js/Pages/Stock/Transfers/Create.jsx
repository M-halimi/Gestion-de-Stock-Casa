import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import PageHeader from '@/Components/ui/PageHeader';
import Select from '@/Components/ui/Select';
import { IconBox, IconBuilding, IconNote, IconNumber, IconTransfer } from '@/Components/ui/FormIcons';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fmtNumber } from '@/utils/format';

export default function TransferCreate({ products, warehouses }) {
    const { t } = useTranslation();
    const { data, setData, post, errors, processing } = useForm({
        product_id: '',
        product_variant_id: '',
        from_warehouse_id: '',
        to_warehouse_id: '',
        quantity: '',
        reason: '',
    });

    const [fromId, setFromId] = useState('');
    const [toId, setToId] = useState('');

    const selectedProduct = products.find((p) => String(p.id) === String(data.product_id));
    const variants = selectedProduct?.variants?.filter((variant) => !variant.is_legacy && variant.status === 'active') ?? [];
    const selectedVariant = variants.find((variant) => String(variant.id) === String(data.product_variant_id));
    const sourceStock = (selectedVariant?.stocks ?? selectedProduct?.stocks)?.find((s) => String(s.warehouse_id) === String(fromId));
    const available = sourceStock ? Number(sourceStock.quantity) : null;

    const variantLabel = (variant) => [variant.color?.name, variant.size?.name].filter(Boolean).join(' / ');

    const submit = (e) => {
        e.preventDefault();
        post(route('transfers.store'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.transfers.create_title')}</h2>}>
            <Head title={t('pages.transfers.create_title')} />

            <PageHeader title={t('pages.transfers.create_title')} subtitle={t('pages.transfers.subtitle')} />

            <Card className="mx-auto max-w-2xl">
                <form onSubmit={submit} className="space-y-5 px-6 py-6">
                    <Select
                        label={t('pages.transfers.product')}
                        value={data.product_id}
                        onChange={(e) => {
                            const product = products.find((p) => String(p.id) === String(e.target.value));
                            const productVariants = product?.variants?.filter((variant) => !variant.is_legacy && variant.status === 'active') ?? [];
                            setData((current) => ({
                                ...current,
                                product_id: e.target.value,
                                product_variant_id: productVariants.length === 1 ? String(productVariants[0].id) : '',
                            }));
                        }}
                        error={errors.product_id}
                        icon={<IconBox />}
                        options={[
                            { value: '', label: t('pages.transfers.select_product') },
                            ...products.map((p) => ({ value: String(p.id), label: `${p.name} (${p.sku})` })),
                        ]}
                    />

                    {variants.length > 0 && (
                        <Select
                            label="Product variant"
                            value={data.product_variant_id}
                            onChange={(e) => setData('product_variant_id', e.target.value)}
                            error={errors.product_variant_id}
                            options={[
                                { value: '', label: 'Select variant' },
                                ...variants.map((variant) => ({
                                    value: String(variant.id),
                                    label: `${variantLabel(variant)}${variant.barcode ? ` (${variant.barcode})` : ''}`,
                                })),
                            ]}
                        />
                    )}

                    <div className="grid gap-5 sm:grid-cols-2">
                        <Select
                            label={t('pages.transfers.from_warehouse')}
                            value={data.from_warehouse_id}
                            onChange={(e) => {
                                setData('from_warehouse_id', e.target.value);
                                setFromId(e.target.value);
                            }}
                            error={errors.from_warehouse_id}
                            icon={<IconBuilding />}
                            options={[
                                { value: '', label: t('pages.transfers.select_warehouse') },
                                ...warehouses.map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
                            ]}
                        />
                        <Select
                            label={t('pages.transfers.to_warehouse')}
                            value={data.to_warehouse_id}
                            onChange={(e) => {
                                setData('to_warehouse_id', e.target.value);
                                setToId(e.target.value);
                            }}
                            error={errors.to_warehouse_id}
                            icon={<IconTransfer />}
                            options={[
                                { value: '', label: t('pages.transfers.select_warehouse') },
                                ...warehouses.map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
                            ]}
                        />
                    </div>

                    {available !== null && (
                        <p className="rounded-md bg-canvas-soft px-3 py-2 text-[13px] text-ink-secondary">
                            {t('pages.transfers.available')} :{' '}
                            <span className="font-semibold tabular text-ink">{fmtNumber(available)}</span>
                        </p>
                    )}

                    <Input
                        type="number"
                        step="any"
                        min="0"
                        label={t('pages.transfers.quantity')}
                        value={data.quantity}
                        onChange={(e) => setData('quantity', e.target.value)}
                        error={errors.quantity}
                        icon={<IconNumber />}
                    />

                    <Input
                        label={t('pages.transfers.reason')}
                        value={data.reason}
                        onChange={(e) => setData('reason', e.target.value)}
                        error={errors.reason}
                        placeholder={t('pages.transfers.reason_placeholder')}
                        icon={<IconNote />}
                    />

                    <div className="flex justify-end gap-3 border-t border-hairline pt-5">
                        <Button variant="ghost" href={route('movements.index')}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {t('pages.transfers.submit')}
                        </Button>
                    </div>
                </form>
            </Card>
        </AuthenticatedLayout>
    );
}
