import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BackButton from '@/Components/ui/BackButton';
import Button from '@/Components/ui/Button';
import PageHeader from '@/Components/ui/PageHeader';
import PurchaseForm from '@/Pages/Purchases/Partials/PurchaseForm';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function PurchasesCreate({ suppliers, warehouses, products }) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        supplier_id: '',
        warehouse_id: '',
        date: new Date().toISOString().slice(0, 10),
        notes: '',
        items: [{ product_id: '', product_variant_id: '', quantity: '', unit_price: '', discount: 0, tax: 0 }],
    });

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.purchases.create_title')}</h2>}>
            <Head title={t('pages.purchases.create_title')} />

            <PageHeader
                title={t('pages.purchases.create_title')}
                actions={
                    <BackButton href={route('purchases.index')}>
                        {t('common.back')}
                    </BackButton>
                }
            />

            <PurchaseForm
                suppliers={suppliers}
                warehouses={warehouses}
                products={products}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                submitLabel={t('pages.purchases.create_action')}
                onSubmit={() => post(route('purchases.store'))}
            />
        </AuthenticatedLayout>
    );
}
