import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import PageHeader from '@/Components/ui/PageHeader';
import PurchaseForm from '@/Pages/Purchases/Partials/PurchaseForm';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function PurchasesEdit({ purchase, suppliers, warehouses, products }) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm({
        supplier_id: String(purchase.supplier_id ?? ''),
        warehouse_id: String(purchase.warehouse_id ?? ''),
        date: purchase.date,
        notes: purchase.notes ?? '',
        items: purchase.items.map((item) => ({
            product_id: String(item.product_id),
            quantity: String(item.quantity),
            unit_price: String(item.unit_price),
            discount: String(item.discount),
            tax: String(item.tax),
        })),
    });

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.purchases.edit_title')}</h2>}>
            <Head title={t('pages.purchases.edit_title')} />

            <PageHeader
                title={t('pages.purchases.edit_title')}
                subtitle={purchase.reference}
                actions={
                    <Button variant="ghost" href={route('purchases.show', purchase.id)}>
                        {t('common.back')}
                    </Button>
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
                submitLabel={t('pages.purchases.update_action')}
                onSubmit={() => put(route('purchases.update', purchase.id))}
            />
        </AuthenticatedLayout>
    );
}