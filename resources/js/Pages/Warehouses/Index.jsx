import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
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

export default function WarehousesIndex({ warehouses, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canCreate = permissions.includes('create_warehouses');
    const canEdit = permissions.includes('edit_warehouses');
    const canDelete = permissions.includes('delete_warehouses');

    const [deleteTarget, setDeleteTarget] = useState(null);

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.warehouses.title')}</h2>}>
            <Head title={t('pages.warehouses.title')} />

            <PageHeader
                title={t('pages.warehouses.title')}
                subtitle={t('pages.warehouses.subtitle')}
                actions={canCreate && <Button href={route('warehouses.create')}>{t('common.create')}</Button>}
            />

            <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
                    <SearchInput
                        placeholder={t('pages.warehouses.search_placeholder')}
                        className="w-full max-w-sm"
                    />
                </div>

                <DataTable
                    columns={[
                        {
                            key: 'name',
                            label: t('pages.warehouses.name'),
                            render: (w) => (
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas-cream text-[13px] font-normal text-ink tabular">
                                        {w.code}
                                    </div>
                                    <div>
                                        <div className="font-normal text-ink">{w.name}</div>
                                        <div className="text-[13px] text-ink-mute tabular">{w.code}</div>
                                    </div>
                                </div>
                            ),
                        },
                        { key: 'address', label: t('pages.warehouses.address'), render: (w) => w.address ?? <span className="text-ink-mute">—</span> },
                        {
                            key: 'stocks_count',
                            label: t('pages.warehouses.stocks_count'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (w) => w.stocks_count,
                        },
                        {
                            key: 'is_active',
                            label: t('pages.warehouses.is_active'),
                            render: (w) => <Badge tone={w.is_active ? 'success' : 'neutral'}>{w.is_active ? t('pages.products.active') : t('pages.products.inactive')}</Badge>,
                        },
                    ]}
                    rows={warehouses.data}
                    empty={{
                        title: t('common.no_results'),
                        description: t('common.no_results_description'),
                        pagination: warehouses,
                    }}
                    actions={
                        canEdit || canDelete
                            ? (warehouse) => (
                                  <TableActions
                                      editHref={canEdit ? route('warehouses.edit', warehouse.id) : null}
                                      onDelete={canDelete ? () => setDeleteTarget(warehouse) : null}
                                  />
                              )
                            : undefined
                    }
                />
            </Card>

            <DeleteModal
                show={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                href={deleteTarget ? route('warehouses.destroy', deleteTarget.id) : '#'}
                name={deleteTarget?.name}
            />
        </AuthenticatedLayout>
    );
}