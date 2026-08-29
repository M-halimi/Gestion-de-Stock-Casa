import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BackButton from '@/Components/ui/BackButton';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Checkbox from '@/Components/Checkbox';
import Input from '@/Components/ui/Input';
import InputError from '@/Components/InputError';
import PageHeader from '@/Components/ui/PageHeader';
import Select from '@/Components/ui/Select';
import TextArea from '@/Components/ui/TextArea';
import ProductVariantsEditor from '@/Components/ProductVariantsEditor';
import { generateProductSku } from '@/utils/productSku';
import {
    IconBarcode,
    IconBox,
    IconHashtag,
    IconImage,
    IconMoney,
    IconNote,
    IconScale,
    IconShield,
    IconTag,
} from '@/Components/ui/FormIcons';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function ProductsCreate({ categories, units, warehouses = [], colors = [], sizes = [], returnTo, returnContext, returnWarehouseId }) {
    const { t } = useTranslation();
    const permissions = usePage().props.auth.user?.permissions ?? [];
    const canManageStock = permissions.includes('manage_stock');
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        sku: '',
        barcode: '',
        category_id: '',
        unit_id: '',
        purchase_price: '',
        sale_price: '',
        min_stock: '3',
        description: '',
        image: null,
        status: 'active',
        variants: [],
        initial_stock_enabled: false,
        initial_warehouse_id: '',
        initial_quantity: '',
        initial_notes: '',
        return_to: returnContext ?? '',
        return_warehouse_id: returnWarehouseId ?? '',
    });

    const inputRef = useRef(null);
    const [preview, setPreview] = useState(null);

    const generateSku = () => {
        const category = categories.find((item) => String(item.id) === String(data.category_id));
        setData('sku', generateProductSku({ name: data.name, categoryName: category?.name }));
    };

    const handleImage = (e) => {
        const file = e.target.files?.[0];
        setData('image', file ?? null);
        if (file) setPreview(URL.createObjectURL(file));
    };

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.products.create_title')}</h2>}>
            <Head title={t('pages.products.create_title')} />

            <PageHeader
                title={t('pages.products.create_title')}
                actions={
                    <BackButton href={returnTo ?? route('products.index')}>
                        {t('common.back')}
                    </BackButton>
                }
            />

            <div className="max-w-3xl">
                <form
                onSubmit={(e) => {
                    e.preventDefault();
                    console.info('[WareStock] Product form submitted', {
                        from: returnContext ?? 'products',
                        name: data.name,
                        sku: data.sku,
                    });
                    post(route('products.store'), {
                        onSuccess: () => console.info('[WareStock] Product created successfully; returning to POS.'),
                        onError: (formErrors) => console.error('[WareStock] Product creation failed', JSON.stringify(formErrors, null, 2)),
                    });
                }}
                    className="space-y-8"
                >
                    <Card>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Input
                                id="name"
                                label={t('pages.products.name')}
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={errors.name}
                                icon={<IconTag />}
                                autoFocus
                            />
                            <div className="flex items-start gap-2">
                                <Input
                                    id="sku"
                                    label={t('pages.products.sku')}
                                    value={data.sku}
                                    onChange={(e) => setData('sku', e.target.value)}
                                    error={errors.sku}
                                    hint={t('pages.products.sku_hint')}
                                    icon={<IconHashtag />}
                                    wrapperClassName="min-w-0 flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="mt-0.5 h-10 shrink-0 whitespace-nowrap"
                                    onClick={generateSku}
                                >
                                    {t('pages.products.generate_sku')}
                                </Button>
                            </div>
                            <Input
                                id="barcode"
                                label={t('pages.products.barcode')}
                                value={data.barcode}
                                onChange={(e) => setData('barcode', e.target.value)}
                                error={errors.barcode}
                                icon={<IconBarcode />}
                            />
                            <Select
                                id="category_id"
                                label={t('pages.products.category')}
                                value={data.category_id}
                                onChange={(e) => setData('category_id', e.target.value)}
                                error={errors.category_id}
                                icon={<IconBox />}
                                options={[
                                    { value: '', label: t('pages.products.select_category') },
                                    ...categories.map((c) => ({ value: String(c.id), label: c.name })),
                                ]}
                            />
                            <Select
                                id="unit_id"
                                label={t('pages.products.unit')}
                                value={data.unit_id}
                                onChange={(e) => setData('unit_id', e.target.value)}
                                error={errors.unit_id}
                                icon={<IconScale />}
                                options={[
                                    { value: '', label: t('pages.products.select_unit') },
                                    ...units.map((u) => ({ value: String(u.id), label: `${u.name} (${u.abbreviation})` })),
                                ]}
                            />
                            <Select
                                id="status"
                                label={t('pages.products.status')}
                                value={data.status}
                                onChange={(e) => setData('status', e.target.value)}
                                error={errors.status}
                                icon={<IconShield />}
                                options={[
                                    { value: 'active', label: t('pages.products.active') },
                                    { value: 'inactive', label: t('pages.products.inactive') },
                                ]}
                            />
                            <Input
                                id="purchase_price"
                                label={t('pages.products.purchase_price')}
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.purchase_price}
                                onChange={(e) => setData('purchase_price', e.target.value)}
                                error={errors.purchase_price}
                                icon={<IconMoney />}
                                inputClass="tabular"
                            />
                            <Input
                                id="sale_price"
                                label={t('pages.products.sale_price')}
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.sale_price}
                                onChange={(e) => setData('sale_price', e.target.value)}
                                error={errors.sale_price}
                                icon={<IconMoney />}
                                inputClass="tabular"
                            />
                            <Input
                                id="min_stock"
                                label={t('pages.products.min_stock')}
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.min_stock}
                                onChange={(e) => setData('min_stock', e.target.value)}
                                error={errors.min_stock}
                                icon={<IconBox />}
                                inputClass="tabular"
                            />
                        </div>
                        <div className="mt-5">
                            <TextArea
                                id="description"
                                label={t('pages.products.description')}
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                error={errors.description}
                                icon={<IconNote />}
                            />
                        </div>
                    </Card>

                    <Card>
                        <div className="mb-4">
                            <h3 className="heading-md text-ink">Product variants</h3>
                            <p className="mt-1 text-[13px] text-ink-mute">Generate variants by selecting reusable colors and sizes.</p>
                        </div>
                        <ProductVariantsEditor colors={colors} sizes={sizes} data={data} setData={setData} productSku={data.sku} productBarcode={data.barcode} editableStock={canManageStock && data.initial_stock_enabled} />
                        {errors.variants && <InputError message={errors.variants} className="mt-3" />}
                    </Card>

                    <Card>
                        <label className="mb-3 block text-[14px] font-normal text-ink">{t('pages.products.image')}</label>
                        <div className="flex items-center gap-4">
                            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-hairline bg-canvas-soft">
                                {preview ? (
                                    <img src={preview} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <svg className="h-8 w-8 text-ink-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0021.75 19.5V4.5A1.5 1.5 0 0020.25 3H3.75A1.5 1.5 0 002.25 4.5v15A1.5 1.5 0 003.75 21z" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <button
                                    type="button"
                                    onClick={() => inputRef.current?.click()}
                                    className="rounded-md border border-hairline bg-canvas px-4 py-1.5 text-[14px] text-ink transition-colors hover:border-ink-mute"
                                >
                                    {t('common.choose_image')}
                                </button>
                                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImage} />
                                <p className="mt-1 text-[12px] text-ink-mute">{t('pages.products.image_hint')}</p>
                            </div>
                        </div>
                        {errors.image && <p className="mt-2 text-[13px] text-destructive">{errors.image}</p>}
                    </Card>

                    {canManageStock && (
                        <Card>
                            <label className="flex cursor-pointer items-center gap-3">
                                <Checkbox
                                    name="initial_stock_enabled"
                                    checked={data.initial_stock_enabled}
                                    onChange={(e) => setData('initial_stock_enabled', e.target.checked)}
                                />
                                <span className="text-[14px] font-medium text-ink">
                                    {t('pages.products.initial_stock_toggle')}
                                </span>
                            </label>
                            <p className="mt-1.5 text-[12px] text-ink-mute">
                                {t('pages.products.initial_stock_hint')}
                            </p>

                            {data.initial_stock_enabled && (
                                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                                    <Select
                                        id="initial_warehouse_id"
                                        label={t('pages.products.initial_warehouse')}
                                        value={data.initial_warehouse_id}
                                        onChange={(e) => setData('initial_warehouse_id', e.target.value)}
                                        error={errors.initial_warehouse_id}
                                        icon={<IconBox />}
                                        options={[
                                            { value: '', label: t('pages.products.select_warehouse') },
                                            ...warehouses.map((w) => ({
                                                value: String(w.id),
                                                label: w.code ? `${w.name} (${w.code})` : w.name,
                                            })),
                                        ]}
                                    />
                                    {data.variants.length === 0 && (
                                        <Input
                                            id="initial_quantity"
                                            label={t('pages.products.initial_quantity')}
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={data.initial_quantity}
                                            onChange={(e) => setData('initial_quantity', e.target.value)}
                                            error={errors.initial_quantity}
                                            icon={<IconScale />}
                                            inputClass="tabular"
                                        />
                                    )}
                                    <div className="md:col-span-2">
                                        <TextArea
                                            id="initial_notes"
                                            label={t('pages.products.initial_notes')}
                                            value={data.initial_notes}
                                            onChange={(e) => setData('initial_notes', e.target.value)}
                                            error={errors.initial_notes}
                                            icon={<IconNote />}
                                        />
                                    </div>
                                    {errors.initial_stock_enabled && (
                                        <InputError message={errors.initial_stock_enabled} className="md:col-span-2" />
                                    )}
                                </div>
                            )}
                        </Card>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" href={route('products.index')}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" variant="primary" disabled={processing}>
                            {t('common.save')}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}
