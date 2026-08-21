import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import PageHeader from '@/Components/ui/PageHeader';
import { IconBuilding, IconHashtag, IconMapPin } from '@/Components/ui/FormIcons';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function WarehousesEdit({ warehouse }) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm({
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address ?? '',
        is_active: warehouse.is_active,
    });

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.warehouses.edit_title')}</h2>}>
            <Head title={t('pages.warehouses.edit_title')} />

            <PageHeader
                title={t('pages.warehouses.edit_title')}
                actions={
                    <Button variant="ghost" href={route('warehouses.index')}>
                        {t('common.back')}
                    </Button>
                }
            />

            <div className="max-w-2xl">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        put(route('warehouses.update', warehouse.id));
                    }}
                    className="space-y-8"
                >
                    <Card>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Input
                                id="name"
                                label={t('pages.warehouses.name')}
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={errors.name}
                                icon={<IconBuilding />}
                                autoFocus
                            />
                            <Input
                                id="code"
                                label={t('pages.warehouses.code')}
                                value={data.code}
                                onChange={(e) => setData('code', e.target.value)}
                                error={errors.code}
                                icon={<IconHashtag />}
                                inputClass="tabular"
                            />
                            <div className="md:col-span-2">
                                <Input
                                    id="address"
                                    label={t('pages.warehouses.address')}
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    error={errors.address}
                                    icon={<IconMapPin />}
                                />
                            </div>
                        </div>
                        <label className="mt-5 flex cursor-pointer items-center gap-2">
                            <input
                                type="checkbox"
                                checked={data.is_active}
                                onChange={(e) => setData('is_active', e.target.checked)}
                                className="h-4 w-4 cursor-pointer rounded border-hairline text-primary focus:ring-primary"
                            />
                            <span className="text-[14px] text-ink">{t('pages.warehouses.is_active')}</span>
                        </label>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" href={route('warehouses.index')}>
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