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

export default function UnitsIndex({ units, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canCreate = permissions.includes('create_units');
    const canEdit = permissions.includes('edit_units');
    const canDelete = permissions.includes('delete_units');

    const [deleteTarget, setDeleteTarget] = useState(null);

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.units.title')}</h2>}>
            <Head title={t('pages.units.title')} />

            <PageHeader
                title={t('pages.units.title')}
                subtitle={t('pages.units.subtitle')}
                actions={
                    canCreate && (
                        <Button href={route('units.create')}>{t('common.create')}</Button>
                    )
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
                                  <div className="flex justify-end gap-1">
                                      {canEdit && (
                                          <Button size="sm" variant="ghost" href={route('units.edit', unit.id)}>
                                              {t('common.edit')}
                                          </Button>
                                      )}
                                      {canDelete && (
                                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(unit)}>
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
                href={deleteTarget ? route('units.destroy', deleteTarget.id) : '#'}
                name={deleteTarget?.name}
            />
        </AuthenticatedLayout>
    );
}