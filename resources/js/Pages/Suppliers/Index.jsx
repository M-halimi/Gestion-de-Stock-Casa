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

export default function SuppliersIndex({ suppliers, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canCreate = permissions.includes('create_suppliers');
    const canEdit = permissions.includes('edit_suppliers');
    const canDelete = permissions.includes('delete_suppliers');
    const canExport = permissions.includes('export_data');
    const canImport = permissions.includes('import_data');

    const [deleteTarget, setDeleteTarget] = useState(null);

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.suppliers.title')}</h2>}>
            <Head title={t('pages.suppliers.title')} />

            <PageHeader
                title={t('pages.suppliers.title')}
                subtitle={t('pages.suppliers.subtitle')}
                actions={
                    <div className="flex items-center gap-2">
                        {canImport && (
                            <Button
                                variant="secondary"
                                href={route('imports.create', 'suppliers')}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                                Importer
                            </Button>
                        )}
                        {canExport && (
                            <Button
                                variant="secondary"
                                external
                                href={route('exports.download', { type: 'suppliers', ...filters })}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Exporter CSV
                            </Button>
                        )}
                        {canCreate && (
                            <Button href={route('suppliers.create')}>{t('common.create')}</Button>
                        )}
                    </div>
                }
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
                                  <TableActions
                                      editHref={canEdit ? route('suppliers.edit', supplier.id) : null}
                                      onDelete={canDelete ? () => setDeleteTarget(supplier) : null}
                                  />
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
