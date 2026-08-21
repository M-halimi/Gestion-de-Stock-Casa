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
import { fmtDate, fmtNumber } from '@/utils/format';

export default function BomsIndex({ boms, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canCreate = permissions.includes('create_production');
    const canEdit = permissions.includes('edit_production');
    const canDelete = permissions.includes('delete_production');

    const [deleteTarget, setDeleteTarget] = useState(null);

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.production.boms.title')}</h2>}>
            <Head title={t('pages.production.boms.title')} />

            <PageHeader
                title={t('pages.production.boms.title')}
                subtitle={t('pages.production.boms.subtitle')}
                actions={
                    canCreate && (
                        <Button href={route('production.boms.create')}>{t('pages.production.boms.create_action')}</Button>
                    )
                }
            />

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-3">
                    <SearchInput
                        placeholder={t('pages.production.boms.search_placeholder')}
                        className="w-full max-w-sm"
                    />
                </div>

                <DataTable
                    columns={[
                        {
                            key: 'product',
                            label: t('pages.production.boms.product'),
                            render: (b) => (
                                <div>
                                    <div className="font-normal text-ink">{b.product?.name}</div>
                                    <div className="text-[13px] text-ink-mute tabular">{b.product?.sku}</div>
                                </div>
                            ),
                        },
                        {
                            key: 'components_count',
                            label: t('pages.production.boms.components'),
                            render: (b) => (
                                <span className="rounded-full bg-canvas-soft px-2.5 py-0.5 text-[12px] font-semibold text-ink-secondary tabular">
                                    {b.items.length}
                                </span>
                            ),
                        },
                        {
                            key: 'production_orders_count',
                            label: t('pages.production.boms.orders'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (b) => fmtNumber(b.production_orders_count ?? 0),
                        },
                        {
                            key: 'notes',
                            label: t('pages.production.boms.notes'),
                            render: (b) =>
                                b.notes ? (
                                    <span className="line-clamp-1 max-w-xs text-[13px] text-ink-mute">{b.notes}</span>
                                ) : (
                                    <span className="text-ink-mute">—</span>
                                ),
                        },
                        {
                            key: 'created_at',
                            label: t('pages.production.boms.created_at'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (b) => fmtDate(b.created_at),
                        },
                    ]}
                    rows={boms.data}
                    empty={{
                        title: t('pages.production.boms.no_boms'),
                        description: t('pages.production.boms.no_boms_description'),
                        pagination: boms,
                    }}
                    actions={
                        canEdit || canDelete
                            ? (bom) => (
                                  <div className="flex justify-end gap-1">
                                      {canEdit && (
                                          <Button size="sm" variant="ghost" href={route('production.boms.edit', bom.id)}>
                                              {t('common.edit')}
                                          </Button>
                                      )}
                                      {canDelete && (
                                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(bom)}>
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
                href={deleteTarget ? route('production.boms.destroy', deleteTarget.id) : '#'}
                name={deleteTarget?.product?.name}
            />
        </AuthenticatedLayout>
    );
}