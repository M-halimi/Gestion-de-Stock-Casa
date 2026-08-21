import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import PageHeader from '@/Components/ui/PageHeader';
import Select from '@/Components/ui/Select';
import { IconBuilding } from '@/Components/ui/FormIcons';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function InventoryCreate({ warehouses }) {
    const { t } = useTranslation();
    const { data, setData, post, errors, processing } = useForm({
        warehouse_id: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('inventory.store'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.inventory.create_title')}</h2>}>
            <Head title={t('pages.inventory.create_title')} />

            <PageHeader title={t('pages.inventory.create_title')} subtitle={t('pages.inventory.create_subtitle')} />

            <Card className="mx-auto max-w-xl">
                <form onSubmit={submit} className="space-y-5 px-6 py-6">
                    <Select
                        label={t('pages.inventory.warehouse')}
                        value={data.warehouse_id}
                        onChange={(e) => setData('warehouse_id', e.target.value)}
                        error={errors.warehouse_id}
                        icon={<IconBuilding />}
                        options={[
                            { value: '', label: t('pages.inventory.select_warehouse') },
                            ...warehouses.map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
                        ]}
                    />

                    <p className="rounded-md bg-canvas-soft px-3 py-2 text-[13px] text-ink-secondary">
                        {t('pages.inventory.create_hint')}
                    </p>

                    <div className="flex justify-end gap-3 border-t border-hairline pt-5">
                        <Button variant="ghost" href={route('inventory.index')}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={processing}>
                            {t('pages.inventory.create_submit')}
                        </Button>
                    </div>
                </form>
            </Card>
        </AuthenticatedLayout>
    );
}