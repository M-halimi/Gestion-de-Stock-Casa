import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import PageHeader from '@/Components/ui/PageHeader';
import SearchInput from '@/Components/ui/SearchInput';
import Select from '@/Components/ui/Select';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { fmtNumber as fmt } from '@/utils/format';

export default function StockIndex({ products, warehouses, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canExport = permissions.includes('export_data');
    const canImport = permissions.includes('import_data');

    const handleFilter = (key, value) => {
        router.get(
            route('stock.index'),
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, replace: true }
        );
    };

    const qtyOf = (product, warehouseId) => product.stocks.find((s) => s.warehouse_id === warehouseId)?.quantity ?? 0;
    const total = (p) => Number(p.total_quantity ?? 0);

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.stock.title')}</h2>}>
            <Head title={t('pages.stock.title')} />

            <PageHeader
                title={t('pages.stock.title')}
                subtitle={t('pages.stock.subtitle')}
                actions={
                    <div className="flex items-center gap-2">
                        {canImport && (
                            <Button
                                variant="secondary"
                                href={route('imports.create', 'initial_stock')}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                                Importer le stock initial
                            </Button>
                        )}
                        {canExport && (
                            <Button
                                variant="secondary"
                                external
                                href={route('exports.download', { type: 'stock', ...filters })}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Exporter CSV
                            </Button>
                        )}
                    </div>
                }
            />

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-3">
                    <SearchInput
                        placeholder={t('pages.stock.search_placeholder')}
                        className="w-full max-w-sm"
                    />
                    <Select
                        value={filters.warehouse_id ?? ''}
                        onChange={(e) => handleFilter('warehouse_id', e.target.value)}
                        className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                        options={[
                            { value: '', label: t('pages.stock.filter_warehouse') },
                            ...warehouses.map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
                        ]}
                    />
                    <Select
                        value={filters.status ?? ''}
                        onChange={(e) => handleFilter('status', e.target.value)}
                        className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                        options={[
                            { value: '', label: t('pages.stock.filter_status') },
                            { value: 'low', label: t('pages.stock.low') },
                            { value: 'out', label: t('pages.stock.out') },
                        ]}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-hairline">
                        <thead className="bg-canvas-soft">
                            <tr>
                                <th scope="col" className="px-5 py-3 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                    {t('pages.stock.product')}
                                </th>
                                {warehouses.map((w) => (
                                    <th
                                        key={w.id}
                                        scope="col"
                                        className="px-5 py-3 text-center text-[12px] font-normal uppercase tracking-wide text-ink-mute"
                                    >
                                        {w.code}
                                    </th>
                                ))}
                                <th scope="col" className="px-5 py-3 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                    {t('pages.stock.total')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline bg-canvas">
                            {products.data.map((p) => (
                                <tr key={p.id} className="transition hover:bg-canvas-soft">
                                    <td className="px-5 py-3">
                                        <div className="font-normal text-ink">{p.name}</div>
                                        <div className="text-[13px] text-ink-mute tabular">{p.sku}</div>
                                    </td>
                                    {warehouses.map((w) => {
                                        const qty = qtyOf(p, w.id);
                                        return (
                                            <td key={w.id} className="px-5 py-3 text-center text-[14px] text-ink tabular">
                                                {qty > 0 ? fmt(qty) : <span className="text-ink-mute">—</span>}
                                            </td>
                                        );
                                    })}
                                    <td className="px-5 py-3 text-end">
                                        <Badge
                                            tone={
                                                total(p) === 0
                                                    ? 'danger'
                                                    : Number(p.min_stock) > 0 && total(p) < Number(p.min_stock)
                                                      ? 'warning'
                                                      : 'success'
                                            }
                                        >
                                            {fmt(total(p))}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                            {products.data.length === 0 && (
                                <tr>
                                    <td colSpan={warehouses.length + 2} className="px-5 py-14 text-center">
                                        <div className="heading-md text-ink">{t('pages.stock.no_products')}</div>
                                        <p className="mt-1 text-[14px] text-ink-mute">{t('pages.stock.no_products_description')}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {products.last_page > 1 && (
                    <div className="flex items-center justify-between border-t border-hairline px-5 py-3">
                        <p className="text-[13px] text-ink-mute tabular">
                            {products.from ?? 0}–{products.to ?? 0} / {products.total}
                        </p>
                        <nav className="flex items-center gap-1">
                            {Array.from({ length: products.last_page }, (_, i) => i + 1).map((page) => (
                                <a
                                    key={page}
                                    href={route('stock.index', { ...filters, page })}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleFilter('page', page === 1 ? undefined : page);
                                    }}
                                    className={`rounded-md px-2.5 py-1.5 text-[13px] ${
                                        page === products.current_page
                                            ? 'bg-primary font-normal text-white'
                                            : 'text-ink-secondary hover:bg-canvas-soft'
                                    }`}
                                >
                                    {page}
                                </a>
                            ))}
                        </nav>
                    </div>
                )}
            </Card>
        </AuthenticatedLayout>
    );
}
