import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import DeleteModal from '@/Components/shared/DeleteModal';
import PageHeader from '@/Components/ui/PageHeader';
import SearchInput from '@/Components/ui/SearchInput';
import Select from '@/Components/ui/Select';
import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function UsersIndex({ users, roles, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canManage = permissions.includes('manage_users');

    const [deleteTarget, setDeleteTarget] = useState(null);

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.users.title')}</h2>}>
            <Head title={t('pages.users.title')} />

            <PageHeader
                title={t('pages.users.title')}
                subtitle={t('pages.users.subtitle')}
                actions={canManage && <Button href={route('users.create')}>{t('common.create')}</Button>}
            />

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3">
                    <SearchInput
                        placeholder={t('pages.users.search_placeholder')}
                        defaultValue={filters.search}
                        className="w-full max-w-sm"
                    />
                    <Select
                        aria-label={t('pages.users.role')}
                        className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                        value={filters.role ?? ''}
                        onChange={(e) => {
                            const value = e.target.value;
                            const url = new URL(window.location.href);
                            if (value) {
                                url.searchParams.set('role', value);
                            } else {
                                url.searchParams.delete('role');
                            }
                            window.location.href = url.toString();
                        }}
                        options={[{ value: '', label: t('pages.users.all_roles') }, ...roles.map((r) => ({ value: r.name, label: r.name }))]}
                    />
                </div>

                <DataTable
                    columns={[
                        {
                            key: 'name',
                            label: t('pages.users.name'),
                            render: (u) => (
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas-cream text-[13px] font-normal text-ink">
                                        {u.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-normal text-ink">{u.name}</span>
                                </div>
                            ),
                        },
                        { key: 'email', label: t('pages.users.email'), render: (u) => u.email },
                        {
                            key: 'role',
                            label: t('pages.users.role'),
                            render: (u) => <Badge status={(u.roles[0]?.name ?? '').toLowerCase()} label={u.roles[0]?.name ?? '—'} />,
                        },
                        {
                            key: 'created_at',
                            label: t('pages.users.created_at'),
                            tabular: true,
                            className: 'text-end',
                            cellClass: 'text-end',
                            render: (u) => new Date(u.created_at).toLocaleDateString(),
                        },
                    ]}
                    rows={users.data}
                    empty={{
                        title: t('common.no_results'),
                        description: t('common.no_results_description'),
                        pagination: users,
                    }}
                    actions={
                        canManage
                            ? (user) => (
                                  <div className="flex justify-end gap-1">
                                      <Button size="sm" variant="ghost" href={route('users.edit', user.id)}>
                                          {t('common.edit')}
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(user)}>
                                          {t('common.delete')}
                                      </Button>
                                  </div>
                              )
                            : undefined
                    }
                />
            </Card>

            <DeleteModal
                show={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                href={deleteTarget ? route('users.destroy', deleteTarget.id) : '#'}
                name={deleteTarget?.name}
            />
        </AuthenticatedLayout>
    );
}