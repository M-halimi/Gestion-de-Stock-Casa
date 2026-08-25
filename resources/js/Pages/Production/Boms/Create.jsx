import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BackButton from '@/Components/ui/BackButton';
import Button from '@/Components/ui/Button';
import PageHeader from '@/Components/ui/PageHeader';
import BomForm from '@/Pages/Production/Boms/Partials/BomForm';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function BomsCreate({ products, components }) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        product_id: '',
        notes: '',
        items: [{ component_id: '', quantity: '' }],
    });

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.production.boms.create_title')}</h2>}>
            <Head title={t('pages.production.boms.create_title')} />

            <PageHeader
                title={t('pages.production.boms.create_title')}
                actions={
                    <BackButton href={route('production.boms.index')}>
                        {t('common.back')}
                    </BackButton>
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
                onSubmit={() => post(route('production.boms.store'))}
            />
        </AuthenticatedLayout>
    );
}