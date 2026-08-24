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

export default function UnitsIndex({ units, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canCreate = permissions.includes('create_units');
    const canEdit = permissions.includes('edit_units');
    const canDelete = permissions.includes('delete_units');
    const canExport = permissions.includes('export_data');
    const canImport = permissions.includes('import_data');

    const [deleteTarget, setDeleteTarget] = useState(null);

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.units.title')}</h2>}>
            <Head title={t('pages.units.title')} />

            <PageHeader
                title={t('pages.units.title')}
                subtitle={t('pages.units.subtitle')}
                actions={
                    <div className="flex items-center gap-2">
                        {canImport && (
                            <Button
                                variant="secondary"
                                href={route('imports.create', 'units')}
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
                                href={route('exports.download', { type: 'units', ...filters })}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Exporter CSV
                            </Button>
                        )}
                        {canCreate && (
                            <Button href={route('units.create')}>{t('common.create')}</Button>
                        )}
                    </div>
                }
            />

            <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
                    <SearchInput
                        placeholder={t('pages.units.search_placeholder')}
                        className="w-full max-w-sm"
                    />
                </div>

                <DataTable
                    columns={[
                        { key: 'name', label: t('pages.units.name'), render: (u) => <span className="font-normal text-ink">{u.name}</span> },
                        { key: 'abbreviation', label: t('pages.units.abbreviation'), render: (u) => <span className="rounded-md bg-canvas-cream px-2 py-0.5 text-[13px] text-ink">{u.abbreviation}</span> },
                        { key: 'products_count', label: t('pages.units.products_count'), className: 'text-end', cellClass: 'text-end', tabular: true, render: (u) => u.products_count },
                    ]}
                    rows={units.data}
                    empty={{
                        title: t('common.no_results'),
                        description: t('common.no_results_description'),
                        pagination: units,
                    }}
                    actions={
                        canEdit || canDelete
                            ? (unit) => (
                                  <TableActions
                                      editHref={canEdit ? route('units.edit', unit.id) : null}
                                      onDelete={canDelete ? () => setDeleteTarget(unit) : null}
                                  />
                              )
                            : undefined
                    }
                />
            </Card>

            <DeleteModal
                show={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                href={deleteTarget ? route('units.destroy', deleteTarget.id) : '#'}
                name={deleteTarget?.name}
            />
        </AuthenticatedLayout>
    );
}
