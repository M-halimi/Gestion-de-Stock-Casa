import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import DeleteModal from '@/Components/shared/DeleteModal';
import PageHeader from '@/Components/ui/PageHeader';
import SearchInput from '@/Components/ui/SearchInput';
import Select from '@/Components/ui/Select';
import TableActions from '@/Components/ui/TableActions';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fmtDate, fmtMoney, fmtNumber } from '@/utils/format';

const statusTones = {
    pending: 'pending',
    received: 'received',
    cancelled: 'cancelled',
};

export default function PurchasesIndex({ purchases, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canCreate = permissions.includes('create_purchases');
    const canEdit = permissions.includes('edit_purchases');
    const canDelete = permissions.includes('delete_purchases');

    const [deleteTarget, setDeleteTarget] = useState(null);

    const handleFilter = (key, value) => {
        router.get(
            route('purchases.index'),
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, replace: true }
        );
    };

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.purchases.title')}</h2>}>
            <Head title={t('pages.purchases.title')} />

            <PageHeader
                title={t('pages.purchases.title')}
                subtitle={t('pages.purchases.subtitle')}
                actions={
                    canCreate && (
                        <Button href={route('purchases.create')}>{t('pages.purchases.create_action')}</Button>
                    )
                }
            />

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-3">
                    <SearchInput
                        placeholder={t('pages.purchases.search_placeholder')}
                        className="w-full max-w-sm"
                    />
                    <Select
                        value={filters.status ?? ''}
                        onChange={(e) => handleFilter('status', e.target.value)}
                        className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                        options={[
                            { value: '', label: t('pages.purchases.filter_status') },
                            { value: 'pending', label: t('pages.purchases.status.pending') },
                            { value: 'received', label: t('pages.purchases.status.received') },
                            { value: 'cancelled', label: t('pages.purchases.status.cancelled') },
                        ]}
                    />
                </div>

                <DataTable
                    columns={[
                        {
                            key: 'reference',
                            label: t('pages.purchases.reference'),
                            render: (p) => (
                                <div>
                                    <a href={route('purchases.show', p.id)} className="font-normal text-ink underline-offset-2 hover:underline tabular">
                                        {p.reference}
                                    </a>
                                    <div className="text-[13px] text-ink-mute">{p.supplier?.name ?? '—'}</div>
                                </div>
                            ),
                        },
                        {
                            key: 'date',
                            label: t('pages.purchases.date'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (p) => fmtDate(p.date),
                        },
                        {
                            key: 'items_count',
                            label: t('pages.purchases.items'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (p) => fmtNumber(p.items_count ?? 0),
                        },
                        {
                            key: 'total_amount',
                            label: t('pages.purchases.total'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (p) => fmtMoney(p.total_amount),
                        },
                        {
                            key: 'status',
                            label: t('pages.purchases.status_label'),
                            render: (p) => (
                                <Badge status={statusTones[p.status]} label={t(`pages.purchases.status.${p.status}`)} />
                            ),
                        },
                    ]}
                    rows={purchases.data}
                    empty={{
                        title: t('pages.purchases.no_purchases'),
                        description: t('pages.purchases.no_purchases_description'),
                        pagination: purchases,
                    }}
                    actions={(purchase) => (
                        <TableActions
                            viewHref={route('purchases.show', purchase.id)}
                            editHref={canEdit && purchase.status === 'pending' ? route('purchases.edit', purchase.id) : null}
                            onDelete={canDelete && purchase.status === 'pending' ? () => setDeleteTarget(purchase) : null}
                        />
                    )}
                />
            </Card>

            <DeleteModal
                show={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                href={deleteTarget ? route('purchases.destroy', deleteTarget.id) : '#'}
                name={deleteTarget?.reference}
            />
        </AuthenticatedLayout>
    );
}