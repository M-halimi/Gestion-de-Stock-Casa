import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import Input from '@/Components/ui/Input';
import PageHeader from '@/Components/ui/PageHeader';
import Select from '@/Components/ui/Select';
import { Head, router } from '@inertiajs/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { fmtDateTime, fmtMoney, fmtNumber } from '@/utils/format';

const stockTones = { in: 'ok', low: 'low', out: 'destructive' };

export default function ReportsIndex({ active_type: activeType, types, summary, warehouses, filters }) {
    const { t } = useTranslation();

    const handleFilter = (key, value) => {
        router.get(
            route('reports.index'),
            { type: activeType, ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, replace: true }
        );
    };

    const selectType = (type) => {
        router.get(route('reports.index'), { type, ...filters }, { preserveState: true, replace: true });
    };

    const exportUrl = (format) =>
        route('reports.export', { type: activeType, format, ...filters });

    const columns = useMemo(() => {
        const base = {
            stock: [
                {
                    key: 'name',
                    label: t('pages.reports.column.product'),
                    render: (r) => (
                        <div>
                            <div className="font-normal text-ink">{r.name}</div>
                            <div className="text-[13px] text-ink-mute">{r.sku}</div>
                        </div>
                    ),
                },
                {
                    key: 'quantity',
                    label: t('pages.reports.column.quantity'),
                    className: 'text-end',
                    cellClass: 'text-end',
                    tabular: true,
                    render: (r) => fmtNumber(r.quantity),
                },
                {
                    key: 'value',
                    label: t('pages.reports.column.value'),
                    className: 'text-end',
                    cellClass: 'text-end',
                    tabular: true,
                    render: (r) => fmtMoney(r.value),
                },
                {
                    key: 'status',
                    label: t('pages.reports.column.status'),
                    render: (r) => (
                        <Badge
                            status={stockTones[r.status] ?? 'inactive'}
                            label={t(`pages.reports.stock_status.${r.status}`)}
                        />
                    ),
                },
            ],
            purchases: [
                {
                    key: 'reference',
                    label: t('pages.reports.column.reference'),
                    render: (r) => <span className="tabular font-normal text-ink">{r.reference}</span>,
                },
                {
                    key: 'party',
                    label: t('pages.reports.column.supplier'),
                    render: (r) => r.party,
                },
                {
                    key: 'date',
                    label: t('pages.reports.column.date'),
                    render: (r) => r.date,
                },
                {
                    key: 'total',
                    label: t('pages.reports.column.total'),
                    className: 'text-end',
                    cellClass: 'text-end',
                    tabular: true,
                    render: (r) => fmtMoney(r.total),
                },
            ],
            sales: [
                {
                    key: 'reference',
                    label: t('pages.reports.column.reference'),
                    render: (r) => <span className="tabular font-normal text-ink">{r.reference}</span>,
                },
                {
                    key: 'party',
                    label: t('pages.reports.column.customer'),
                    render: (r) => r.party,
                },
                {
                    key: 'date',
                    label: t('pages.reports.column.date'),
                    render: (r) => r.date,
                },
                {
                    key: 'total',
                    label: t('pages.reports.column.total'),
                    className: 'text-end',
                    cellClass: 'text-end',
                    tabular: true,
                    render: (r) => fmtMoney(r.total),
                },
            ],
            movements: [
                {
                    key: 'type',
                    label: t('pages.reports.column.type'),
                    render: (r) => <Badge status={r.type} label={t(`pages.reports.types.${r.type}`)} />,
                },
                {
                    key: 'product',
                    label: t('pages.reports.column.product'),
                    render: (r) => r.product,
                },
                {
                    key: 'warehouse',
                    label: t('pages.reports.column.warehouse'),
                    render: (r) => r.warehouse,
                },
                {
                    key: 'quantity',
                    label: t('pages.reports.column.quantity'),
                    className: 'text-end',
                    cellClass: 'text-end',
                    tabular: true,
                    render: (r) => (
                        <span className={r.quantity < 0 ? 'text-destructive' : 'text-success'}>
                            {r.quantity > 0 ? '+' : ''}
                            {fmtNumber(r.quantity)}
                        </span>
                    ),
                },
                {
                    key: 'user',
                    label: t('pages.reports.column.user'),
                    render: (r) => r.user,
                },
                {
                    key: 'date',
                    label: t('pages.reports.column.date'),
                    className: 'text-end',
                    cellClass: 'text-end',
                    tabular: true,
                    render: (r) => fmtDateTime(r.date),
                },
            ],
        };

        return base[activeType] ?? base.stock;
    }, [activeType, t]);

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.reports.title')}</h2>}>
            <Head title={t('pages.reports.title')} />

            <PageHeader title={t('pages.reports.title')} subtitle={t('pages.reports.subtitle')} />

            <div className="mb-4 flex flex-wrap gap-2">
                {types.map((type) => (
                    <Button
                        key={type}
                        size="sm"
                        variant={activeType === type ? 'primary' : 'ghost'}
                        onClick={() => selectType(type)}
                    >
                        {t(`pages.reports.types.${type}`)}
                    </Button>
                ))}
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {activeType === 'stock' && (
                    <>
                        <Card flush>
                            <div className="px-5 py-4">
                                <div className="text-[13px] text-ink-mute">{t('pages.reports.totals.products')}</div>
                                <div className="mt-1 text-2xl font-semibold text-ink tabular">{fmtNumber(summary.totals.count)}</div>
                            </div>
                        </Card>
                        <Card flush>
                            <div className="px-5 py-4">
                                <div className="text-[13px] text-ink-mute">{t('pages.reports.totals.stock_value')}</div>
                                <div className="mt-1 text-2xl font-semibold text-ink tabular">{fmtMoney(summary.totals.total_value)}</div>
                            </div>
                        </Card>
                        <Card flush>
                            <div className="px-5 py-4">
                                <div className="text-[13px] text-ink-mute">{t('pages.reports.totals.low')}</div>
                                <div className="mt-1 text-2xl font-semibold text-warning tabular">{fmtNumber(summary.totals.low_count)}</div>
                            </div>
                        </Card>
                        <Card flush>
                            <div className="px-5 py-4">
                                <div className="text-[13px] text-ink-mute">{t('pages.reports.totals.out')}</div>
                                <div className="mt-1 text-2xl font-semibold text-destructive tabular">{fmtNumber(summary.totals.out_count)}</div>
                            </div>
                        </Card>
                    </>
                )}
                {(activeType === 'purchases' || activeType === 'sales') && (
                    <>
                        <Card flush>
                            <div className="px-5 py-4">
                                <div className="text-[13px] text-ink-mute">{t('pages.reports.totals.documents')}</div>
                                <div className="mt-1 text-2xl font-semibold text-ink tabular">{fmtNumber(summary.totals.count)}</div>
                            </div>
                        </Card>
                        <Card flush>
                            <div className="px-5 py-4">
                                <div className="text-[13px] text-ink-mute">{t('pages.reports.totals.total')}</div>
                                <div className="mt-1 text-2xl font-semibold text-ink tabular">{fmtMoney(summary.totals.total)}</div>
                            </div>
                        </Card>
                        <Card flush>
                            <div className="px-5 py-4">
                                <div className="text-[13px] text-ink-mute">{t('pages.reports.totals.previous')}</div>
                                <div className="mt-1 text-2xl font-semibold text-ink-mute tabular">{fmtMoney(summary.totals.previous_total)}</div>
                            </div>
                        </Card>
                        <Card flush>
                            <div className="px-5 py-4">
                                <div className="text-[13px] text-ink-mute">{t('pages.reports.totals.delta')}</div>
                                <div
                                    className={`mt-1 text-2xl font-semibold tabular ${
                                        summary.totals.total >= summary.totals.previous_total
                                            ? 'text-success'
                                            : 'text-destructive'
                                    }`}
                                >
                                    {summary.totals.previous_total > 0
                                        ? `${(((summary.totals.total - summary.totals.previous_total) / summary.totals.previous_total) * 100).toFixed(1)} %`
                                        : '—'}
                                </div>
                            </div>
                        </Card>
                    </>
                )}
                {activeType === 'movements' && (
                    <>
                        <Card flush>
                            <div className="px-5 py-4">
                                <div className="text-[13px] text-ink-mute">{t('pages.reports.totals.movements')}</div>
                                <div className="mt-1 text-2xl font-semibold text-ink tabular">{fmtNumber(summary.totals.count)}</div>
                            </div>
                        </Card>
                        <Card flush>
                            <div className="px-5 py-4">
                                <div className="text-[13px] text-ink-mute">{t('pages.reports.totals.in')}</div>
                                <div className="mt-1 text-2xl font-semibold text-success tabular">{fmtNumber(summary.totals.in)}</div>
                            </div>
                        </Card>
                        <Card flush>
                            <div className="px-5 py-4">
                                <div className="text-[13px] text-ink-mute">{t('pages.reports.totals.out')}</div>
                                <div className="mt-1 text-2xl font-semibold text-destructive tabular">{fmtNumber(summary.totals.out)}</div>
                            </div>
                        </Card>
                    </>
                )}
            </div>

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-3">
                    {activeType !== 'stock' && (
                        <>
                            <Input
                                type="date"
                                value={filters.from ?? ''}
                                onChange={(e) => handleFilter('from', e.target.value)}
                                className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                                label={t('pages.reports.from')}
                            />
                            <Input
                                type="date"
                                value={filters.to ?? ''}
                                onChange={(e) => handleFilter('to', e.target.value)}
                                className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                                label={t('pages.reports.to')}
                            />
                        </>
                    )}
                    <Select
                        value={filters.warehouse_id ?? ''}
                        onChange={(e) => handleFilter('warehouse_id', e.target.value)}
                        className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                        options={[
                            { value: '', label: t('pages.reports.all_warehouses') },
                            ...warehouses.map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
                        ]}
                    />
                    <div className="ms-auto flex gap-2">
                        <a href={exportUrl('csv')} className="inline-flex">
                            <Button size="sm" variant="secondary">
                                {t('pages.reports.export_csv')}
                            </Button>
                        </a>
                        <a href={exportUrl('pdf')} className="inline-flex">
                            <Button size="sm" variant="secondary">
                                {t('pages.reports.export_pdf')}
                            </Button>
                        </a>
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    rows={summary.preview}
                    empty={{
                        title: t('pages.reports.no_data'),
                        description: t('pages.reports.no_data_description'),
                    }}
                />
            </Card>
        </AuthenticatedLayout>
    );
}