import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import PageHeader from '@/Components/ui/PageHeader';
import BomForm from '@/Pages/Production/Boms/Partials/BomForm';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function BomsEdit({ bom, products, components }) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm({
        product_id: String(bom.product_id),
        notes: bom.notes ?? '',
        items: bom.items.map((item) => ({
            component_id: String(item.component_id),
            quantity: item.quantity,
        })),
    });

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.production.boms.edit_title')}</h2>}>
            <Head title={t('pages.production.boms.edit_title')} />

            <PageHeader
                title={t('pages.production.boms.edit_title')}
                actions={
                    <Button variant="ghost" href={route('production.boms.index')}>
                        {t('common.back')}
                    </Button>
                }
            />

            <BomForm
                products={products}
                components={components}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                submitLabel={t('common.save')}
                fixedProduct
                productName={bom.product?.name}
                onSubmit={() => put(route('production.boms.update', bom.id))}
            />
        </AuthenticatedLayout>
    );
}