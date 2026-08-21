import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import PageHeader from '@/Components/ui/PageHeader';
import { IconMail, IconMapPin, IconPhone, IconTruck, IconUser } from '@/Components/ui/FormIcons';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function SuppliersEdit({ supplier }) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm({
        name: supplier.name,
        contact_person: supplier.contact_person ?? '',
        phone: supplier.phone ?? '',
        email: supplier.email ?? '',
        address: supplier.address ?? '',
    });

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.suppliers.edit_title')}</h2>}>
            <Head title={t('pages.suppliers.edit_title')} />

            <PageHeader
                title={t('pages.suppliers.edit_title')}
                actions={
                    <Button variant="ghost" href={route('suppliers.index')}>
                        {t('common.back')}
                    </Button>
                }
            />

            <div className="max-w-2xl">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        put(route('suppliers.update', supplier.id));
                    }}
                    className="space-y-8"
                >
                    <Card>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Input
                                id="name"
                                label={t('pages.suppliers.name')}
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={errors.name}
                                icon={<IconTruck />}
                                autoFocus
                            />
                            <Input
                                id="contact_person"
                                label={t('pages.suppliers.contact_person')}
                                value={data.contact_person}
                                onChange={(e) => setData('contact_person', e.target.value)}
                                error={errors.contact_person}
                                icon={<IconUser />}
                            />
                            <Input
                                id="phone"
                                label={t('pages.suppliers.phone')}
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                error={errors.phone}
                                icon={<IconPhone />}
                            />
                            <Input
                                id="email"
                                label={t('pages.suppliers.email')}
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                error={errors.email}
                                icon={<IconMail />}
                            />
                            <div className="md:col-span-2">
                                <Input
                                    id="address"
                                    label={t('pages.suppliers.address')}
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    error={errors.address}
                                    icon={<IconMapPin />}
                                />
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" href={route('suppliers.index')}>
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