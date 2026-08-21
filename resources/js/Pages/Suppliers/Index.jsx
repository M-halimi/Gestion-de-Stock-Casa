import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import DeleteModal from '@/Components/shared/DeleteModal';
import PageHeader from '@/Components/ui/PageHeader';
import SearchInput from '@/Components/ui/SearchInput';
import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function SuppliersIndex({ suppliers, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canCreate = permissions.includes('create_suppliers');
    const canEdit = permissions.includes('edit_suppliers');
    const canDelete = permissions.includes('delete_suppliers');

    const [deleteTarget, setDeleteTarget] = useState(null);

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.suppliers.title')}</h2>}>
            <Head title={t('pages.suppliers.title')} />

            <PageHeader
                title={t('pages.suppliers.title')}
                subtitle={t('pages.suppliers.subtitle')}
                actions={canCreate && <Button href={route('suppliers.create')}>{t('common.create')}</Button>}
            />

            <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
                    <SearchInput
                        placeholder={t('pages.suppliers.search_placeholder')}
                        className="w-full max-w-sm"
                    />
                </div>

                <DataTable
                    columns={[
                        {
                            key: 'name',
                            label: t('pages.suppliers.name'),
                            render: (s) => (
                                <div>
                                    <div className="font-normal text-ink">{s.name}</div>
                                    {s.contact_person && (
                                        <div className="text-[13px] text-ink-mute">{s.contact_person}</div>
                                    )}
                                </div>
                            ),
                        },
                        { key: 'phone', label: t('pages.suppliers.phone'), tabular: true, render: (s) => s.phone ?? <span className="text-ink-mute">—</span> },
                        { key: 'email', label: t('pages.suppliers.email'), render: (s) => s.email ?? <span className="text-ink-mute">—</span> },
                        {
                            key: 'purchases_count',
                            label: t('pages.suppliers.purchases_count'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (s) => s.purchases_count,
                        },
                    ]}
                    rows={suppliers.data}
                    empty={{
                        title: t('common.no_results'),
                        description: t('common.no_results_description'),
                        pagination: suppliers,
                    }}
                    actions={
                        canEdit || canDelete
                            ? (supplier) => (
                                  <div className="flex justify-end gap-1">
                                      {canEdit && (
                                          <Button size="sm" variant="ghost" href={route('suppliers.edit', supplier.id)}>
                                              {t('common.edit')}
                                          </Button>
                                      )}
                                      {canDelete && (
                                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(supplier)}>
                                              {t('common.delete')}
                                          </Button>
                                      )}
                                  </div>
                              )
                            : undefined
                    }
                />
            </Card>

            <DeleteModal
                show={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                href={deleteTarget ? route('suppliers.destroy', deleteTarget.id) : '#'}
                name={deleteTarget?.name}
            />
        </AuthenticatedLayout>
    );
}