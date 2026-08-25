import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BackButton from '@/Components/ui/BackButton';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import PageHeader from '@/Components/ui/PageHeader';
import TextArea from '@/Components/ui/TextArea';
import { IconCity, IconMail, IconMapPin, IconNote, IconPhone, IconUser } from '@/Components/ui/FormIcons';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function CustomersEdit({ customer }) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm({
        name: customer.name,
        phone: customer.phone ?? '',
        email: customer.email ?? '',
        address: customer.address ?? '',
        city: customer.city ?? '',
        notes: customer.notes ?? '',
    });

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.customers.edit_title')}</h2>}>
            <Head title={t('pages.customers.edit_title')} />

            <PageHeader
                title={t('pages.customers.edit_title')}
                actions={
                    <BackButton href={route('customers.index')}>
                        {t('common.back')}
                    </BackButton>
                }
            />

            <div className="max-w-2xl">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        put(route('customers.update', customer.id));
                    }}
                    className="space-y-8"
                >
                    <Card>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Input
                                id="name"
                                label={t('pages.customers.name')}
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={errors.name}
                                icon={<IconUser />}
                                autoFocus
                            />
                            <Input
                                id="phone"
                                label={t('pages.customers.phone')}
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                error={errors.phone}
                                icon={<IconPhone />}
                            />
                            <Input
                                id="email"
                                label={t('pages.customers.email')}
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                error={errors.email}
                                icon={<IconMail />}
                            />
                            <div className="md:col-span-2">
                                <Input
                                    id="address"
                                    label={t('pages.customers.address')}
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    error={errors.address}
                                    icon={<IconMapPin />}
                                />
                            </div>
                            <Input
                                id="city"
                                label={t('pages.customers.city')}
                                value={data.city}
                                onChange={(e) => setData('city', e.target.value)}
                                error={errors.city}
                                icon={<IconCity />}
                            />
                            <div className="md:col-span-2">
                                <TextArea
                                    id="notes"
                                    label={t('pages.customers.notes')}
                                    value={data.notes}
                                    onChange={(e) => setData('notes', e.target.value)}
                                    error={errors.notes}
                                    icon={<IconNote />}
                                />
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" href={route('customers.index')}>
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