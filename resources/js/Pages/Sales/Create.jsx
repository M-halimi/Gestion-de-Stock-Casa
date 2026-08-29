import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BackButton from '@/Components/ui/BackButton';
import Button from '@/Components/ui/Button';
import CreateCustomerDialog from '@/Components/CreateCustomerDialog';
import PageHeader from '@/Components/ui/PageHeader';
import SaleForm from '@/Pages/Sales/Partials/SaleForm';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

export default function SalesCreate({ customers, warehouses, products }) {
    const { t } = useTranslation();
    const [customerList, setCustomerList] = useState(customers ?? []);
    const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
    const { data, setData, post, processing, errors } = useForm({
        customer_id: '',
        warehouse_id: '',
        date: new Date().toISOString().slice(0, 10),
        notes: '',
        items: [{ product_id: '', product_variant_id: '', quantity: '', unit_price: '', discount: 0, tax: 0 }],
    });

    const handleCustomerCreated = (customer) => {
        setCustomerList((prev) => (prev.some((c) => String(c.id) === String(customer.id)) ? prev : [...prev, customer]));
        setData('customer_id', String(customer.id));
    };

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.sales.create_title')}</h2>}>
            <Head title={t('pages.sales.create_title')} />

            <PageHeader
                title={t('pages.sales.create_title')}
                actions={
                    <BackButton href={route('sales.index')}>
                        {t('common.back')}
                    </BackButton>
                }
            />

            <SaleForm
                customers={customerList}
                warehouses={warehouses}
                products={products}
                data={data}
                setData={setData}
                errors={errors}
                processing={processing}
                submitLabel={t('pages.sales.create_action')}
                onSubmit={() => post(route('sales.store'))}
                onOpenCreateCustomer={() => setCustomerDialogOpen(true)}
            />

            <CreateCustomerDialog
                open={customerDialogOpen}
                onClose={() => setCustomerDialogOpen(false)}
                onSuccess={handleCustomerCreated}
            />
        </AuthenticatedLayout>
    );
}
