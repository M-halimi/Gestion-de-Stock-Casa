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
    draft: 'draft',
    confirmed: 'confirmed',
    cancelled: 'cancelled',
};

export default function SalesIndex({ sales, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canCreate = permissions.includes('create_sales');
    const canEdit = permissions.includes('edit_sales');
    const canDelete = permissions.includes('delete_sales');

    const [deleteTarget, setDeleteTarget] = useState(null);

    const handleFilter = (key, value) => {
        router.get(
            route('sales.index'),
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, replace: true }
        );
    };

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.sales.title')}</h2>}>
            <Head title={t('pages.sales.title')} />

            <PageHeader
                title={t('pages.sales.title')}
                subtitle={t('pages.sales.subtitle')}
                actions={
                    canCreate && (
                        <Button href={route('sales.create')}>{t('pages.sales.create_action')}</Button>
                    )
                }
            />

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-3">
                    <SearchInput
                        placeholder={t('pages.sales.search_placeholder')}
                        className="w-full max-w-sm"
                    />
                    <Select
                        value={filters.status ?? ''}
                        onChange={(e) => handleFilter('status', e.target.value)}
                        className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                        options={[
                            { value: '', label: t('pages.sales.filter_status') },
                            { value: 'draft', label: t('pages.sales.status.draft') },
                            { value: 'confirmed', label: t('pages.sales.status.confirmed') },
                            { value: 'cancelled', label: t('pages.sales.status.cancelled') },
                        ]}
                    />
                </div>

                <DataTable
                    columns={[
                        {
                            key: 'reference',
                            label: t('pages.sales.reference'),
                            render: (s) => (
                                <div>
                                    <a href={route('sales.show', s.id)} className="font-normal text-ink underline-offset-2 hover:underline tabular">
                                        {s.reference}
                                    </a>
                                    <div className="text-[13px] text-ink-mute">{s.customer?.name ?? '—'}</div>
                                </div>
                            ),
                        },
                        {
                            key: 'date',
                            label: t('pages.sales.date'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (s) => fmtDate(s.date),
                        },
                        {
                            key: 'items_count',
                            label: t('pages.sales.items'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (s) => fmtNumber(s.items_count ?? 0),
                        },
                        {
                            key: 'total_amount',
                            label: t('pages.sales.total'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (s) => fmtMoney(s.total_amount),
                        },
                        {
                            key: 'status',
                            label: t('pages.sales.status_label'),
                            render: (s) => (
                                <Badge status={statusTones[s.status]} label={t(`pages.sales.status.${s.status}`)} />
                            ),
                        },
                    ]}
                    rows={sales.data}
                    empty={{
                        title: t('pages.sales.no_sales'),
                        description: t('pages.sales.no_sales_description'),
                        pagination: sales,
                    }}
                    actions={(sale) => (
                        <TableActions
                            viewHref={route('sales.show', sale.id)}
                            editHref={canEdit && sale.status === 'draft' ? route('sales.edit', sale.id) : null}
                            onDelete={canDelete && sale.status === 'draft' ? () => setDeleteTarget(sale) : null}
                        />
                    )}
                />
            </Card>

            <DeleteModal
                show={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                href={deleteTarget ? route('sales.destroy', deleteTarget.id) : '#'}
                name={deleteTarget?.reference}
            />
        </AuthenticatedLayout>
    );
}