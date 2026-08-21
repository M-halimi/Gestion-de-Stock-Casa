import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import PageHeader from '@/Components/ui/PageHeader';
import SearchInput from '@/Components/ui/SearchInput';
import Select from '@/Components/ui/Select';
import TableActions from '@/Components/ui/TableActions';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { fmtDate, fmtMoney, fmtNumber } from '@/utils/format';

const statusTones = {
    pending: 'pending',
    in_progress: 'in_progress',
    completed: 'completed',
    cancelled: 'cancelled',
};

export default function OrdersIndex({ orders, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const canCreate = (auth.user?.permissions ?? []).includes('create_production');

    const handleFilter = (key, value) => {
        router.get(
            route('production.orders.index'),
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, replace: true }
        );
    };

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.production.orders.title')}</h2>}>
            <Head title={t('pages.production.orders.title')} />

            <PageHeader
                title={t('pages.production.orders.title')}
                subtitle={t('pages.production.orders.subtitle')}
                actions={
                    canCreate && (
                        <Button href={route('production.orders.create')}>{t('pages.production.orders.create_action')}</Button>
                    )
                }
            />

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-3">
                    <SearchInput
                        placeholder={t('pages.production.orders.search_placeholder')}
                        className="w-full max-w-sm"
                    />
                    <Select
                        value={filters.status ?? ''}
                        onChange={(e) => handleFilter('status', e.target.value)}
                        className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                        options={[
                            { value: '', label: t('pages.production.orders.filter_status') },
                            { value: 'pending', label: t('pages.production.status.pending') },
                            { value: 'in_progress', label: t('pages.production.status.in_progress') },
                            { value: 'completed', label: t('pages.production.status.completed') },
                            { value: 'cancelled', label: t('pages.production.status.cancelled') },
                        ]}
                    />
                </div>

                <DataTable
                    columns={[
                        {
                            key: 'reference',
                            label: t('pages.production.orders.reference'),
                            render: (o) => (
                                <div>
                                    <div className="font-normal text-ink tabular">{o.reference}</div>
                                    <div className="text-[13px] text-ink-mute">{o.product?.name}</div>
                                </div>
                            ),
                        },
                        {
                            key: 'quantity',
                            label: t('pages.production.orders.quantity'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (o) => fmtNumber(o.quantity),
                        },
                        {
                            key: 'material_cost',
                            label: t('pages.production.orders.material_cost'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (o) =>
                                fmtMoney(o.material_cost),
                        },
                        {
                            key: 'warehouse',
                            label: t('pages.production.orders.warehouse'),
                            render: (o) => o.warehouse?.name ?? <span className="text-ink-mute">—</span>,
                        },
                        {
                            key: 'status',
                            label: t('pages.production.orders.status'),
                            render: (o) => (
                                <Badge status={statusTones[o.status]} label={t(`pages.production.status.${o.status}`)} />
                            ),
                        },
                        {
                            key: 'created_at',
                            label: t('pages.production.orders.created_at'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (o) => fmtDate(o.created_at),
                        },
                    ]}
                    rows={orders.data}
                    empty={{
                        title: t('pages.production.orders.no_orders'),
                        description: t('pages.production.orders.no_orders_description'),
                        pagination: orders,
                    }}
                    actions={(order) => (
                        <TableActions
                            viewHref={route('production.orders.show', order.id)}
                        />
                    )}
                />
            </Card>
        </AuthenticatedLayout>
    );
}