import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BackButton from '@/Components/ui/BackButton';
import Button from '@/Components/ui/Button';
import PageHeader from '@/Components/ui/PageHeader';
import SaleForm from '@/Pages/Sales/Partials/SaleForm';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function SalesEdit({ sale, customers, warehouses, products }) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm({
        customer_id: String(sale.customer_id ?? ''),
        warehouse_id: String(sale.warehouse_id ?? ''),
        date: sale.date,
        notes: sale.notes ?? '',
        items: sale.items.map((item) => ({
            product_id: String(item.product_id),
            product_variant_id: String(item.product_variant_id ?? ''),
            quantity: String(item.quantity),
            unit_price: String(item.unit_price),
            discount: String(item.discount),
            tax: String(item.tax),
        })),
    });

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.sales.edit_title')}</h2>}>
            <Head title={t('pages.sales.edit_title')} />

            <PageHeader
                title={t('pages.sales.edit_title')}
                subtitle={sale.reference}
                actions={
                    <BackButton href={route('sales.show', sale.id)}>
                        {t('common.back')}
                    </BackButton>
                }
            />

            <SaleForm
                customers={customers}
                warehouses={warehouses}
                products={products}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                submitLabel={t('pages.sales.update_action')}
                onSubmit={() => put(route('sales.update', sale.id))}
            />
        </AuthenticatedLayout>
    );
}
