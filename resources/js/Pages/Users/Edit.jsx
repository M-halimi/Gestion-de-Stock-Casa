import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BackButton from '@/Components/ui/BackButton';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import PageHeader from '@/Components/ui/PageHeader';
import Select from '@/Components/ui/Select';
import { IconKey, IconMail, IconShield, IconUser } from '@/Components/ui/FormIcons';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function UsersEdit({ user, roles }) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm({
        name: user.name,
        email: user.email,
        role: user.roles[0]?.name ?? 'Employee',
        password: '',
        password_confirmation: '',
    });

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.users.edit_title')}</h2>}>
            <Head title={t('pages.users.edit_title')} />

            <PageHeader
                title={t('pages.users.edit_title')}
                actions={
                    <BackButton href={route('users.index')}>
                        {t('common.back')}
                    </BackButton>
                }
            />

            <div className="max-w-2xl">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        put(route('users.update', user.id));
                    }}
                    className="space-y-8"
                >
                    <Card>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Input
                                id="name"
                                label={t('pages.users.name')}
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                error={errors.name}
                                icon={<IconUser />}
                                autoFocus
                            />
                            <Input
                                id="email"
                                label={t('pages.users.email')}
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                error={errors.email}
                                icon={<IconMail />}
                            />
                            <Select
                                id="role"
                                label={t('pages.users.role')}
                                value={data.role}
                                onChange={(e) => setData('role', e.target.value)}
                                error={errors.role}
                                icon={<IconShield />}
                                options={roles.map((r) => ({ value: r.name, label: r.name }))}
                            />
                            <div />
                            <Input
                                id="password"
                                label={t('pages.users.password_optional')}
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                error={errors.password}
                                icon={<IconKey />}
                                autoComplete="new-password"
                            />
                            <Input
                                id="password_confirmation"
                                label={t('pages.users.password_confirmation')}
                                type="password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                error={errors.password_confirmation}
                                icon={<IconKey />}
                                autoComplete="new-password"
                            />
                        </div>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" href={route('users.index')}>
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