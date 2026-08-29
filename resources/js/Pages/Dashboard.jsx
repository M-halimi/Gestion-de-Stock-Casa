import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import SearchInput from '@/Components/ui/SearchInput';
import Select from '@/Components/ui/Select';
import { fmtDate, fmtNumber, fmtMoney } from '@/utils/format';
import usePageLoading from '@/hooks/usePageLoading';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const colors = {
    primary: '#d4af5e',
    warning: '#e89030',
    success: '#3fa372',
    danger: '#d64545',
    info: '#6c8fc7',
};

function MoneyTooltip({ active, payload, label, names }) {
    const { t } = useTranslation();
    if (!active || !payload?.length) return null;

    return (
        <div className="rounded-md border border-hairline bg-canvas px-3 py-2 text-[13px] shadow-level-2">
            <p className="mb-1 font-semibold text-ink">{label}</p>
            {payload.map((entry) => (
                <p key={entry.dataKey} className="flex items-center gap-2 text-ink-secondary">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
                    {names[entry.dataKey] ?? entry.dataKey}: {fmtMoney(entry.value)}
                </p>
            ))}
        </div>
    );
}

function KpiCard({ label, value, hint, tone = 'default', icon }) {
    const palette = {
        default: { badge: 'bg-primary-soft text-primary-subdued', ring: 'border-hairline' },
        warning: { badge: 'bg-warning-soft text-warning', ring: 'border-warning/25' },
        danger: { badge: 'bg-destructive-soft text-destructive', ring: 'border-destructive/25' },
    }[tone];

    return (
        <div className={`rounded-xl border ${palette.ring} bg-canvas p-5 shadow-level-2`}>
            <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[1px] text-ink-mute">{label}</p>
                {icon && <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${palette.badge}`}>{icon}</span>}
            </div>
            <p className="mt-3 text-[34px] font-semibold leading-none tracking-tight text-ink tabular">{value}</p>
            {hint && (
                <div className="mt-3 flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${tone === 'danger' ? 'bg-destructive' : tone === 'warning' ? 'bg-warning' : 'bg-success'}`} />
                    <p className="text-[13px] text-ink-mute">{hint}</p>
                </div>
            )}
        </div>
    );
}

function SectionEmpty({ message }) {
    return (
        <div className="flex h-64 items-center justify-center">
            <p className="text-[14px] text-ink-mute">{message}</p>
        </div>
    );
}

export default function Dashboard({
    period,
    kpis,
    stock_status,
    sales_trend,
    comparison,
    top_products,
    top_variants,
    low_stock,
    movements,
    recent_purchases,
    recent_sales,
    insights,
    filters,
}) {
    const { t, i18n } = useTranslation();
    const loading = usePageLoading();

    const [periodKey, setPeriodKey] = useState(period.key);
    const [from, setFrom] = useState(period.from);
    const [to, setTo] = useState(period.to);

    const salesTotal = useMemo(() => (sales_trend ?? []).reduce((s, d) => s + Number(d.sales), 0), [sales_trend]);
    const stockStatusTotal = useMemo(
        () => (stock_status ? Object.values(stock_status).reduce((s, v) => s + Number(v), 0) : 0),
        [stock_status]
    );
    const maxTop = useMemo(
        () => Math.max(1, ...(top_products ?? []).map((p) => (filters?.by === 'revenue' ? Number(p.total_revenue) : Number(p.total_qty)))),
        [top_products, filters?.by]
    );
    const maxVariantTop = useMemo(
        () => Math.max(1, ...(top_variants ?? []).map((variant) => (filters?.by === 'revenue' ? Number(variant.total_revenue) : Number(variant.total_qty)))),
        [top_variants, filters?.by]
    );

    const buildQuery = (extra = {}) => {
        const q = { period: periodKey };
        if (periodKey === 'custom') {
            q.from = from;
            q.to = to;
        }
        return { ...q, ...extra };
    };

    const applyPeriod = () => {
        router.get(route('dashboard', buildQuery()), {}, { preserveState: true, replace: true });
    };

    const toggleTopBy = (by) => {
        router.get(route('dashboard', buildQuery({ by })), {}, { preserveState: true, replace: true });
    };

    const sortLink = (key) => {
        const dir = filters?.sort === key && filters?.direction === 'asc' ? 'desc' : 'asc';
        return route('dashboard', buildQuery({ sort: key, direction: dir, page: 1 }));
    };

    const sortClass = (key) => {
        if (filters?.sort !== key) return 'text-ink-mute hover:text-ink';
        return filters?.direction === 'desc' ? 'text-primary' : 'text-ink';
    };

    const movementSign = (m) => {
        if (m.type === 'adjustment') return Number(m.quantity) >= 0 ? '+' : '−';
        return ['purchase', 'transfer_in', 'production_in'].includes(m.type) ? '+' : '−';
    };
    const movementColor = (m) =>
        m.type === 'adjustment' ? (Number(m.quantity) >= 0 ? 'text-success' : 'text-destructive') : movementSign(m) === '+' ? 'text-success' : 'text-ink-secondary';

    const insightIcons = {
        danger: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-destructive">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625l6.28-10.875ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
        ),
        warning: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-warning">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625l6.28-10.875ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
        ),
        success: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-success">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
        ),
        info: (
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-info">
                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
            </svg>
        ),
    };

    const sections = `space-y-6 transition-opacity duration-200 ${loading ? 'pointer-events-none opacity-40' : ''}`;

    return (
        <AuthenticatedLayout
            header={<h2 className="heading-md text-ink">{t('dashboard.title')}</h2>}
        >
            <Head title={t('dashboard.title')} />

            <PageHeader
                title={t('dashboard.title')}
                subtitle={t('dashboard.subtitle')}
                actions={
                    <div className="flex flex-wrap items-end gap-2">
                        {loading && (
                            <span className="ms-2 inline-flex items-center gap-1.5 text-[13px] text-ink-mute">
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                {t('common.loading')}
                            </span>
                        )}
                        <Select
                            aria-label={t('dashboard.period_label')}
                            value={periodKey}
                            onChange={(e) => setPeriodKey(e.target.value)}
                            className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                            options={Object.keys(t('dashboard.periods', { returnObjects: true })).map((key) => ({
                                value: key,
                                label: t(`dashboard.periods.${key}`),
                            }))}
                        />
                        {periodKey === 'custom' && (
                            <>
                                <input
                                    type="date"
                                    value={from}
                                    onChange={(e) => setFrom(e.target.value)}
                                    className="h-11 rounded-md border-hairline-input bg-canvas px-3 text-[14px] font-normal text-ink shadow-sm focus:border-primary focus:ring-primary"
                                />
                                <input
                                    type="date"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    className="h-11 rounded-md border-hairline-input bg-canvas px-3 text-[14px] font-normal text-ink shadow-sm focus:border-primary focus:ring-primary"
                                />
                            </>
                        )}
                        <Button variant="secondary" size="md" onClick={applyPeriod} disabled={periodKey === 'custom' && (!from || !to)}>
                            {t('dashboard.apply')}
                        </Button>
                    </div>
                }
            />

            <div className={sections}>
                {kpis && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard
                            label={t('dashboard.kpis.total_products')}
                            value={fmtNumber(kpis.total_products)}
                            icon={
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                                </svg>
                            }
                        />
                        <KpiCard
                            label={t('dashboard.kpis.stock_value')}
value={fmtMoney(kpis.stock_value)}
                            icon={
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                                </svg>
                            }
                        />
                        <KpiCard
                            label={t('dashboard.kpis.low_stock')}
                            value={fmtNumber(kpis.low_stock)}
                            tone="warning"
                            hint={t('dashboard.kpis.needs_attention')}
                            icon={
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                            }
                        />
                        <KpiCard
                            label={t('dashboard.kpis.out_of_stock')}
                            value={fmtNumber(kpis.out_of_stock)}
                            tone="danger"
                            icon={
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            }
                        />
                    </div>
                )}

                {sales_trend && (
                    <Card title={t('dashboard.sales_trend.title')} subtitle={t('dashboard.sales_trend.subtitle')}>
                        {salesTotal > 0 ? (
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={sales_trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e3df" vertical={false} />
                                        <XAxis
                                            dataKey="day"
                                            tickFormatter={fmtDate}
                                            tick={{ fontSize: 11, fill: '#787671' }}
                                            tickLine={false}
                                            axisLine={{ stroke: '#e5e3df' }}
                                            minTickGap={32}
                                            interval="preserveStartEnd"
                                        />
                                        <YAxis
                                            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                                            tick={{ fontSize: 11, fill: '#787671' }}
                                            tickLine={false}
                                            axisLine={false}
                                            width={44}
                                        />
                                        <Tooltip content={<MoneyTooltip names={{ sales: t('dashboard.comparison.sales') }} />} />
                                        <Line
                                            type="monotone"
                                            dataKey="sales"
                                            stroke={colors.primary}
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 4 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <SectionEmpty message={t('dashboard.sales_trend.empty')} />
                        )}
                    </Card>
                )}

                {comparison && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <Card title={t('dashboard.comparison.title')} subtitle={t('dashboard.comparison.subtitle')}>
                            {comparison.some((d) => d.purchases > 0 || d.sales > 0) ? (
                                <div className="h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={comparison} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={3}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e3df" vertical={false} />
                                            <XAxis
                                                dataKey="day"
                                                tickFormatter={fmtDate}
                                                tick={{ fontSize: 11, fill: '#787671' }}
                                                tickLine={false}
                                                axisLine={{ stroke: '#e5e3df' }}
                                                minTickGap={32}
                                                interval="preserveStartEnd"
                                            />
                                            <YAxis
                                                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                                                tick={{ fontSize: 11, fill: '#787671' }}
                                                tickLine={false}
                                                axisLine={false}
                                                width={44}
                                            />
                                            <Tooltip
                                                content={
                                                    <MoneyTooltip
                                                        names={{
                                                            purchases: t('dashboard.comparison.purchases'),
                                                            sales: t('dashboard.comparison.sales'),
                                                        }}
                                                    />
                                                }
                                            />
                                            <Legend wrapperStyle={{ fontSize: 12, color: '#5d5b54' }} />
                                            <Bar dataKey="purchases" name={t('dashboard.comparison.purchases')} fill={colors.warning} radius={[3, 3, 0, 0]} maxBarSize={18} />
                                            <Bar dataKey="sales" name={t('dashboard.comparison.sales')} fill={colors.primary} radius={[3, 3, 0, 0]} maxBarSize={18} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <SectionEmpty message={t('dashboard.comparison.empty')} />
                            )}
                        </Card>

                        {top_products && (
                            <Card
                                title={t('dashboard.top_products.title')}
                                subtitle={t('dashboard.top_products.subtitle')}
                                actions={
                                    <div className="flex rounded-md border border-hairline p-0.5">
                                        {['quantity', 'revenue'].map((mode) => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => toggleTopBy(mode)}
                                                className={`cursor-pointer rounded px-3 py-1 text-[12px] transition ${
(filters?.by ?? 'quantity') === mode
                                                        ? 'bg-primary text-white'
                                                        : 'text-ink-mute hover:text-ink'
                                                }`}
                                            >
                                                {t(`dashboard.top_products.${mode === 'quantity' ? 'by_quantity' : 'by_revenue'}`)}
                                            </button>
                                        ))}
                                    </div>
                                }
                            >
                                {top_products.length > 0 ? (
                                    <div className="space-y-4">
                                        {top_products.map((p, i) => {
                                            const value = filters?.by === 'revenue' ? Number(p.total_revenue) : Number(p.total_qty);
                                            return (
                                                <div key={p.id}>
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-canvas-cream text-[12px] font-semibold text-ink-mute2 tabular">
                                                                {i + 1}
                                                            </span>
                                                            <Link href={route('products.show', p.id)} className="truncate text-[14px] text-ink hover:text-primary">
                                                                {p.name}
                                                            </Link>
                                                        </div>
                                                        <span className="shrink-0 text-[13px] text-ink-secondary tabular">
                                                            {filters?.by === 'revenue' ? fmtMoney(value) : `${fmtNumber(value)}`}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-canvas-soft">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${Math.max(2, (value / maxTop) * 100)}%`,
                                                                background: i === 0 ? colors.primary : colors.primary + '66',
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <SectionEmpty message={t('dashboard.top_products.empty')} />
                                )}
                            </Card>
                        )}

                        {top_variants && (
                            <Card
                                title={t('dashboard.top_variants.title')}
                                subtitle={t('dashboard.top_variants.subtitle')}
                                className="xl:col-span-2"
                            >
                                {top_variants.length > 0 ? (
                                    <>
                                        <div className="mb-4 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary-soft/40 p-3">
                                            <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-primary">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM9.25 8.25a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .74.75v.01a.75.75 0 0 1-.75.74h-.01a.75.75 0 0 1-.74-.75v-.01ZM10 10a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 10Z" clipRule="evenodd" />
                                            </svg>
                                            <p className="text-[13px] leading-relaxed text-ink-secondary">
                                                <span className="font-semibold text-ink">{t('dashboard.top_variants.guide_title')}</span>{' '}
                                                {t('dashboard.top_variants.guide_description')}
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {top_variants.map((variant, i) => {
                                            const value = filters?.by === 'revenue' ? Number(variant.total_revenue) : Number(variant.total_qty);
                                            const hasOptions = variant.color || variant.size;

                                            return (
                                                <div key={`${variant.variant_id ?? variant.product_id}-${i}`} className="rounded-lg border border-hairline bg-canvas-soft/40 p-3">
                                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                                        <div className="flex min-w-0 items-start gap-3">
                                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-canvas-cream text-[12px] font-semibold text-ink-mute2 tabular">
                                                                {i + 1}
                                                            </span>
                                                            <div className="min-w-0">
                                                                <Link href={route('products.show', variant.product_id)} className="block truncate text-[14px] font-medium text-ink hover:text-primary">
                                                                    {variant.name}
                                                                </Link>
                                                                <p className="mt-0.5 truncate text-[12px] text-ink-mute">{t('dashboard.top_variants.reference')}: {variant.sku}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex shrink-0 items-center justify-between gap-3 sm:block sm:text-end">
                                                            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-mute">{filters?.by === 'revenue' ? t('dashboard.top_variants.revenue') : t('dashboard.top_variants.sold')}</p>
                                                            <p className="text-[15px] font-semibold text-ink tabular">
                                                                {filters?.by === 'revenue' ? fmtMoney(value) : fmtNumber(value)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                                                        <span className="rounded-full bg-canvas px-2.5 py-1 text-ink-secondary">
                                                            <span className="font-medium text-ink">{t('dashboard.top_variants.color')}:</span>{' '}
                                                            {variant.color ?? t('dashboard.top_variants.not_specified')}
                                                        </span>
                                                        <span className="rounded-full bg-canvas px-2.5 py-1 text-ink-secondary">
                                                            <span className="font-medium text-ink">{t('dashboard.top_variants.size')}:</span>{' '}
                                                            {variant.size ?? t('dashboard.top_variants.not_specified')}
                                                        </span>
                                                        {!hasOptions && <span className="text-ink-mute">{t('dashboard.top_variants.no_options')}</span>}
                                                    </div>
                                                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas-soft">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${Math.max(2, (value / maxVariantTop) * 100)}%`,
                                                                background: i === 0 ? colors.success : colors.success + '66',
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        </div>
                                    </>
                                ) : (
                                    <SectionEmpty message={t('dashboard.top_variants.empty')} />
                                )}
                            </Card>
                        )}
                    </div>
                )}

                {stock_status && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
<Card title={t('dashboard.stock_status.title')} subtitle={t('dashboard.stock_status.subtitle')}>
                            <div className="relative h-56">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { key: 'in_stock', value: stock_status.in_stock },
                                                        { key: 'low_stock', value: stock_status.low_stock },
                                                        { key: 'out_of_stock', value: stock_status.out_of_stock },
                                                    ]}
                                                    dataKey="value"
                                                    nameKey="key"
                                                    innerRadius="62%"
                                                    outerRadius="85%"
                                                    paddingAngle={3}
                                                    strokeWidth={0}
                                                >
                                                    <Cell fill={colors.success} />
                                                    <Cell fill={colors.warning} />
                                                    <Cell fill={colors.danger} />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="display-lg text-ink tabular">{fmtNumber(stockStatusTotal)}</span>
                                            <span className="text-[12px] text-ink-mute">{t('dashboard.kpis.total_products')}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        {[
                                            ['in_stock', colors.success],
                                            ['low_stock', colors.warning],
                                            ['out_of_stock', colors.danger],
                                        ].map(([key, color]) => (
                                            <div key={key} className="flex items-center justify-between text-[14px]">
                                                <span className="flex items-center gap-2 text-ink-secondary">
                                                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                                                    {t(`dashboard.stock_status.${key}`)}
                                                </span>
                                                <span className="font-semibold text-ink tabular">{fmtNumber(stock_status[key])}</span>
                                            </div>
))}
                                </div>
                            </Card>

                        {insights && (
                            <Card title={t('dashboard.insights.title')} className="xl:col-span-2">
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {insights.map((insight, i) => (
                                        <div
                                            key={i}
                                            className={`flex items-start gap-3 rounded-lg border p-4 ${
                                                insight.tone === 'danger'
                                                    ? 'border-destructive/20 bg-destructive-soft'
                                                    : insight.tone === 'warning'
                                                      ? 'border-warning/20 bg-warning-soft'
                                                      : 'border-hairline bg-canvas'
                                            }`}
                                        >
                                            <span className="mt-0.5 shrink-0">{insightIcons[insight.tone]}</span>
                                            <p className="text-[14px] leading-relaxed text-ink-secondary">
                                                {t(insight.key, insight.params ?? {})}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {low_stock && (
                    <div>
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="heading-md text-ink">{t('dashboard.low_stock_table.title')}</h3>
                                <p className="mt-0.5 text-[13px] text-ink-mute">{t('dashboard.low_stock_table.subtitle')}</p>
                            </div>
                            <SearchInput placeholder={t('dashboard.low_stock_table.search_placeholder')} className="w-full max-w-sm" />
                        </div>
                        <Card flush className="overflow-hidden">
                            <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
                                <table className="min-w-[760px] divide-y divide-hairline">
                                    <thead className="bg-canvas-soft">
                                        <tr>
                                            {[
                                                ['name', t('dashboard.low_stock_table.product')],
                                                ['sku', t('dashboard.low_stock_table.sku')],
                                                ['category', t('dashboard.low_stock_table.category')],
                                                ['total_qty', t('dashboard.low_stock_table.current_stock')],
                                                ['min_stock', t('dashboard.low_stock_table.min_stock')],
                                            ].map(([key, label]) => (
                                                <th key={key} scope="col" className="px-5 py-3 text-start text-[12px] font-normal uppercase tracking-wide">
                                                    <Link href={sortLink(key)} className={`${sortClass(key)} transition`}>
                                                        {label}
                                                    </Link>
                                                </th>
                                            ))}
                                            <th scope="col" className="px-5 py-3 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                                {t('dashboard.low_stock_table.status')}
                                            </th>
                                            <th scope="col" className="px-5 py-3 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                                {t('dashboard.low_stock_table.view')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-hairline bg-canvas">
                                        {low_stock.data.map((p) => {
                                            const qty = Number(p.total_qty ?? 0);
                                            const min = Number(p.min_stock ?? 0);
                                            return (
                                                <tr key={p.id} className="transition hover:bg-canvas-soft">
                                                    <td className="px-5 py-3">
                                                        <Link href={route('products.show', p.id)} className="text-[14px] font-medium text-ink hover:text-primary">
                                                            {p.name}
                                                        </Link>
                                                    </td>
                                                    <td className="px-5 py-3 text-[14px] text-ink-mute tabular">{p.sku}</td>
                                                    <td className="px-5 py-3 text-[14px] text-ink-secondary">{p.category?.name ?? '—'}</td>
                                                    <td className="px-5 py-3 text-[14px] text-ink tabular">{fmtNumber(qty)}</td>
                                                    <td className="px-5 py-3 text-[14px] text-ink-mute tabular">{fmtNumber(min)}</td>
                                                    <td className="px-5 py-3">
                                                        <Badge status={qty <= 0 ? 'cancelled' : 'pending'} label={qty <= 0 ? t('dashboard.low_stock_table.out') : t('dashboard.low_stock_table.low')} />
                                                    </td>
                                                    <td className="px-5 py-3 text-end">
                                                        <Link href={route('products.show', p.id)} className="text-[13px] font-medium text-primary hover:text-primary-deep">
                                                            {t('dashboard.low_stock_table.view')}
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {low_stock.data.length === 0 && (
                                            <tr>
                                                <td colSpan={7} className="px-5 py-14 text-center">
                                                    <p className="heading-md text-ink">{t('dashboard.low_stock_table.empty_title')}</p>
                                                    <p className="mt-1 text-[14px] text-ink-mute">{t('dashboard.low_stock_table.empty_description')}</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {low_stock.last_page > 1 && <Pagination meta={low_stock} />}
                        </Card>
                    </div>
                )}

                {movements && (
                    <Card title={t('dashboard.movements.title')} subtitle={t('dashboard.movements.subtitle')} flush className="overflow-hidden">
                        {movements.length > 0 ? (
                            <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
                                <table className="min-w-[900px] divide-y divide-hairline">
                                    <thead className="bg-canvas-soft">
                                        <tr>
                                            {['date', 'product', 'warehouse', 'type', 'quantity', 'reference', 'user'].map((key) => (
                                                <th key={key} scope="col" className="px-5 py-3 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                                    {t(`dashboard.movements.${key}`)}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-hairline bg-canvas">
                                        {movements.map((m) => (
                                            <tr key={m.id} className="transition hover:bg-canvas-soft">
                                                <td className="px-5 py-3 whitespace-nowrap text-[13px] text-ink-mute tabular">
                                                    {new Date(m.created_at).toLocaleString(i18n.language === 'ar' ? 'ar-MA' : 'fr-FR', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </td>
                                                <td className="px-5 py-3 text-[14px] text-ink">{m.product?.name ?? '—'}</td>
                                                <td className="px-5 py-3 text-[14px] text-ink-secondary">{m.warehouse?.name ?? '—'}</td>
                                                <td className="px-5 py-3">
                                                    <Badge status={m.type} label={t(`dashboard.movements.types.${m.type}`)} />
                                                </td>
                                                <td className={`px-5 py-3 text-[14px] tabular ${movementColor(m)}`}>
                                                    {movementSign(m)}
                                                    {fmtNumber(m.quantity)}
                                                </td>
                                                <td className="px-5 py-3 text-[13px] text-ink-mute tabular">{m.reference ?? m.reason ?? '—'}</td>
                                                <td className="px-5 py-3 text-[13px] text-ink-mute">{m.user?.name ?? '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="p-10 text-center">
                                <p className="text-[14px] text-ink-mute">{t('dashboard.movements.empty')}</p>
                            </div>
                        )}
                    </Card>
                )}

                {(recent_purchases || recent_sales) && (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        {recent_purchases && (
                            <Card title={t('dashboard.recent_purchases.title')} flush className="overflow-hidden">
                                <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
                                    <table className="min-w-[720px] divide-y divide-hairline">
                                        <thead className="bg-canvas-soft">
                                            <tr>
                                                {['reference', 'supplier', 'date', 'items', 'total', 'status'].map((key) => (
                                                    <th key={key} scope="col" className="px-5 py-3 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                                        {t(`dashboard.recent_purchases.${key}`)}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-hairline bg-canvas">
                                            {recent_purchases.map((p) => (
                                                <tr key={p.id} className="transition hover:bg-canvas-soft">
                                                    <td className="px-5 py-3 text-[13px] font-medium text-ink tabular">{p.reference}</td>
                                                    <td className="px-5 py-3 text-[14px] text-ink-secondary">{p.supplier?.name ?? '—'}</td>
                                                    <td className="px-5 py-3 text-[13px] text-ink-mute tabular">{fmtDate(p.date)}</td>
                                                    <td className="px-5 py-3 text-[13px] text-ink-mute tabular">{p.items_count}</td>
                                                    <td className="px-5 py-3 text-[14px] text-ink tabular">{fmtMoney(p.total_amount)}</td>
                                                    <td className="px-5 py-3">
                                                        <Badge status={p.status} label={t(`dashboard.status.${p.status}`)} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}

                        {recent_sales && (
                            <Card title={t('dashboard.recent_sales.title')} flush className="overflow-hidden">
                                <div className="w-full max-w-full overflow-x-auto overscroll-x-contain">
                                    <table className="min-w-[720px] divide-y divide-hairline">
                                        <thead className="bg-canvas-soft">
                                            <tr>
                                                {['reference', 'customer', 'date', 'items', 'total', 'status'].map((key) => (
                                                    <th key={key} scope="col" className="px-5 py-3 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                                        {t(`dashboard.recent_sales.${key}`)}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-hairline bg-canvas">
                                            {recent_sales.map((s) => (
                                                <tr key={s.id} className="transition hover:bg-canvas-soft">
                                                    <td className="px-5 py-3 text-[13px] font-medium text-ink tabular">{s.reference}</td>
                                                    <td className="px-5 py-3 text-[14px] text-ink-secondary">{s.customer?.name ?? '—'}</td>
                                                    <td className="px-5 py-3 text-[13px] text-ink-mute tabular">{fmtDate(s.date)}</td>
                                                    <td className="px-5 py-3 text-[13px] text-ink-mute tabular">{s.items_count}</td>
                                                    <td className="px-5 py-3 text-[14px] text-ink tabular">{fmtMoney(s.total_amount)}</td>
                                                    <td className="px-5 py-3">
                                                        <Badge status={s.status} label={t(`dashboard.status.${s.status}`)} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
