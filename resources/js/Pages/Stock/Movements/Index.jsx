import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import Input from '@/Components/ui/Input';
import PageHeader from '@/Components/ui/PageHeader';
import Select from '@/Components/ui/Select';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { fmtDateTime, fmtNumber } from '@/utils/format';

const tones = {
    purchase: 'purchase',
    sale: 'sale',
    adjustment: 'adjustment',
    transfer_in: 'transfer_in',
    transfer_out: 'transfer_out',
    production_in: 'production_in',
    production_out: 'production_out',
};

export default function MovementsIndex({ movements, products, warehouses, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canTransfer = permissions.includes('create_transfers');
    const canExport = permissions.includes('export_data');

    const handleFilter = (key, value) => {
        router.get(
            route('movements.index'),
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, replace: true }
        );
    };

    const resetFilters = () => {
        router.get(route('movements.index'), {}, { preserveState: true, replace: true });
    };

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.movements.title')}</h2>}>
            <Head title={t('pages.movements.title')} />

            <PageHeader
                title={t('pages.movements.title')}
                subtitle={t('pages.movements.subtitle')}
                actions={
                    <div className="flex items-center gap-2">
                        {canExport && (
                            <Button
                                variant="secondary"
                                external
                                href={route('exports.download', { type: 'movements', ...filters })}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Exporter CSV
                            </Button>
                        )}
                        {canTransfer && (
                            <Button href={route('transfers.create')}>{t('pages.movements.transfer_action')}</Button>
                        )}
                    </div>
                }
            />

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-3">
                    <Select
                        value={filters.product_id ?? ''}
                        onChange={(e) => handleFilter('product_id', e.target.value)}
                        className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                        options={[
                            { value: '', label: t('pages.movements.filter_product') },
                            ...products.map((p) => ({ value: String(p.id), label: `${p.name} (${p.sku})` })),
                        ]}
                    />
                    <Select
                        value={filters.type ?? ''}
                        onChange={(e) => handleFilter('type', e.target.value)}
                        className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                        options={[
                            { value: '', label: t('pages.movements.filter_type') },
                            ...Object.entries({
                                purchase: t('pages.movements.types.purchase'),
                                sale: t('pages.movements.types.sale'),
                                adjustment: t('pages.movements.types.adjustment'),
                                transfer_in: t('pages.movements.types.transfer_in'),
                                transfer_out: t('pages.movements.types.transfer_out'),
                                production_in: t('pages.movements.types.production_in'),
                                production_out: t('pages.movements.types.production_out'),
                            }).map(([value, label]) => ({ value, label })),
                        ]}
                    />
                    <Select
                        value={filters.warehouse_id ?? ''}
                        onChange={(e) => handleFilter('warehouse_id', e.target.value)}
                        className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                        options={[
                            { value: '', label: t('pages.movements.filter_warehouse') },
                            ...warehouses.map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
                        ]}
                    />
                    <Input
                        type="date"
                        value={filters.from ?? ''}
                        onChange={(e) => handleFilter('from', e.target.value)}
                        wrapperClassName="w-full sm:w-40"
                        className="w-full"
                        label={t('pages.movements.from')}
                    />
                    <Input
                        type="date"
                        value={filters.to ?? ''}
                        onChange={(e) => handleFilter('to', e.target.value)}
                        wrapperClassName="w-full sm:w-40"
                        className="w-full"
                        label={t('pages.movements.to')}
                    />
                    {(filters.product_id || filters.type || filters.warehouse_id || filters.from || filters.to) && (
                        <Button size="sm" variant="ghost" onClick={resetFilters}>
                            {t('pages.movements.reset')}
                        </Button>
                    )}
                </div>

                <DataTable
                    columns={[
                        {
                            key: 'type',
                            label: t('pages.movements.type'),
                            render: (m) => <Badge status={tones[m.type]} label={t(`pages.movements.types.${m.type}`)} />,
                        },
                        {
                            key: 'product',
                            label: t('pages.movements.product'),
                            render: (m) => (
                                <div>
                                    <div className="font-normal text-ink">{m.product?.name ?? '—'}</div>
                                    <div className="text-[13px] text-ink-mute">{m.product?.sku}</div>
                                </div>
                            ),
                        },
                        {
                            key: 'warehouse',
                            label: t('pages.movements.warehouse'),
                            render: (m) => (
                                <div>
                                    <div className="text-ink-secondary">{m.warehouse?.name ?? '—'}</div>
                                    <div className="text-[13px] text-ink-mute">{m.warehouse?.code}</div>
                                </div>
                            ),
                        },
                        {
                            key: 'quantity',
                            label: t('pages.movements.quantity'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (m) => (
                                <span className={m.signed_quantity < 0 ? 'text-destructive' : 'text-success'}>
                                    {m.signed_quantity > 0 ? '+' : ''}
                                    {fmtNumber(m.signed_quantity)}
                                </span>
                            ),
                        },
                        {
                            key: 'reason',
                            label: t('pages.movements.reason'),
                            render: (m) => m.reason ?? '—',
                        },
                        {
                            key: 'reference',
                            label: t('pages.movements.reference'),
                            render: (m) =>
                                m.reference ? (
                                    <a
                                        href={route(m.reference.route, m.reference.id)}
                                        className="font-normal text-ink underline-offset-2 hover:underline tabular"
                                    >
                                        {m.reference.label ?? `#${m.reference.id}`}
                                    </a>
                                ) : (
                                    <span className="text-ink-mute2">—</span>
                                ),
                        },
                        {
                            key: 'user',
                            label: t('pages.movements.user'),
                            render: (m) => m.user?.name ?? '—',
                        },
                        {
                            key: 'created_at',
                            label: t('pages.movements.date'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (m) => fmtDateTime(m.created_at),
                        },
                    ]}
                    rows={movements.data}
                    empty={{
                        title: t('pages.movements.no_movements'),
                        description: t('pages.movements.no_movements_description'),
                        pagination: movements,
                    }}
                />
            </Card>
        </AuthenticatedLayout>
    );
}
