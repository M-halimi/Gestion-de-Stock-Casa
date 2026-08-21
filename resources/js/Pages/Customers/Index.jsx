import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import DeleteModal from '@/Components/shared/DeleteModal';
import PageHeader from '@/Components/ui/PageHeader';
import SearchInput from '@/Components/ui/SearchInput';
import TableActions from '@/Components/ui/TableActions';
import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function CustomersIndex({ customers, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canCreate = permissions.includes('create_customers');
    const canEdit = permissions.includes('edit_customers');
    const canDelete = permissions.includes('delete_customers');

    const [deleteTarget, setDeleteTarget] = useState(null);

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.customers.title')}</h2>}>
            <Head title={t('pages.customers.title')} />

            <PageHeader
                title={t('pages.customers.title')}
                subtitle={t('pages.customers.subtitle')}
                actions={canCreate && <Button href={route('customers.create')}>{t('common.create')}</Button>}
            />

            <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
                    <SearchInput
                        placeholder={t('pages.customers.search_placeholder')}
                        className="w-full max-w-sm"
                    />
                </div>

                <DataTable
                    columns={[
                        {
                            key: 'name',
                            label: t('pages.customers.name'),
                            render: (c) => (
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas-cream text-[13px] font-normal text-ink">
                                        {c.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-normal text-ink">{c.name}</span>
                                </div>
                            ),
                        },
                        { key: 'phone', label: t('pages.customers.phone'), tabular: true, render: (c) => c.phone ?? <span className="text-ink-mute">—</span> },
                        { key: 'email', label: t('pages.customers.email'), render: (c) => c.email ?? <span className="text-ink-mute">—</span> },
                        {
                            key: 'sales_count',
                            label: t('pages.customers.sales_count'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (c) => c.sales_count,
                        },
                    ]}
                    rows={customers.data}
                    empty={{
                        title: t('common.no_results'),
                        description: t('common.no_results_description'),
                        pagination: customers,
                    }}
                    actions={
                        canEdit || canDelete
                            ? (customer) => (
                                  <TableActions
                                      editHref={canEdit ? route('customers.edit', customer.id) : null}
                                      onDelete={canDelete ? () => setDeleteTarget(customer) : null}
                                  />
                              )
                            : undefined
                    }
                />
            </Card>

            <DeleteModal
                show={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                href={deleteTarget ? route('customers.destroy', deleteTarget.id) : '#'}
                name={deleteTarget?.name}
            />
        </AuthenticatedLayout>
    );
}