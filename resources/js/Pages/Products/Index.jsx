import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import DeleteModal from '@/Components/shared/DeleteModal';
import EmptyState from '@/Components/ui/EmptyState';
import PageHeader from '@/Components/ui/PageHeader';
import SearchInput from '@/Components/ui/SearchInput';
import Select from '@/Components/ui/Select';
import TableActions from '@/Components/ui/TableActions';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fmtMoney, fmtNumber } from '@/utils/format';

export default function ProductsIndex({ products, categories, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canCreate = permissions.includes('create_products');
    const canEdit = permissions.includes('edit_products');
    const canDelete = permissions.includes('delete_products');

    const [deleteTarget, setDeleteTarget] = useState(null);

    const handleFilter = (key, value) => {
        router.get(
            route('products.index'),
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, replace: true }
        );
    };

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.products.title')}</h2>}>
            <Head title={t('pages.products.title')} />

            <PageHeader
                title={t('pages.products.title')}
                subtitle={t('pages.products.subtitle')}
                actions={
                    canCreate && (
                        <Button href={route('products.create')}>{t('common.create')}</Button>
                    )
                }
            />

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-3">
                    <SearchInput
                        placeholder={t('pages.products.search_placeholder')}
                        className="w-full max-w-sm"
                    />
                    <Select
                        value={filters.category_id ?? ''}
                        onChange={(e) => handleFilter('category_id', e.target.value)}
                        className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                        options={[
                            { value: '', label: t('pages.products.filter_category') },
                            ...categories.map((c) => ({ value: String(c.id), label: c.name })),
                        ]}
                    />
                    <Select
                        value={filters.status ?? ''}
                        onChange={(e) => handleFilter('status', e.target.value)}
                        className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                        options={[
                            { value: '', label: t('pages.products.filter_status') },
                            { value: 'active', label: t('pages.products.active') },
                            { value: 'inactive', label: t('pages.products.inactive') },
                        ]}
                    />
                </div>

                <DataTable
                    columns={[
                        {
                            key: 'name',
                            label: t('pages.products.name'),
                            render: (p) => (
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-hairline bg-canvas-soft">
                                        {p.image ? (
                                            <img src={`/storage/${p.image}`} alt={p.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <svg className="h-5 w-5 text-ink-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L12 3l9 4.5M3 7.5l9 4.5m-9-4.5v9l9 4.5m0-13.5l9 4.5m-9 4.5v9m0-13.5l-9 4.5m9 4.5l9-4.5v9l-9 4.5v-9" />
                                            </svg>
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-normal text-ink">{p.name}</div>
                                        <div className="text-[13px] text-ink-mute tabular">{p.sku}</div>
                                    </div>
                                </div>
                            ),
                        },
                        { key: 'category', label: t('pages.products.category'), render: (p) => p.category?.name ?? <span className="text-ink-mute">—</span> },
                        { key: 'unit', label: t('pages.products.unit'), render: (p) => p.unit?.abbreviation ?? <span className="text-ink-mute">—</span> },
                        {
                            key: 'sale_price',
                            label: t('pages.products.sale_price'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (p) => fmtMoney(p.sale_price),
                        },
                        {
                            key: 'total_quantity',
                            label: t('pages.products.total_stock'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (p) => (
                                <Badge
                                    tone={
                                        p.status === 'inactive'
                                            ? 'neutral'
                                            : Number(p.total_quantity) === 0
                                              ? 'danger'
                                              : Number(p.total_quantity) < Number(p.min_stock)
                                                ? 'warning'
                                                : 'success'
                                    }
                                >
                                    {fmtNumber(p.total_quantity ?? 0)}
                                </Badge>
                            ),
                        },
                        {
                            key: 'status',
                            label: t('pages.products.status'),
                            render: (p) => <Badge tone={p.status === 'active' ? 'success' : 'neutral'}>{t(`pages.products.${p.status}`)}</Badge>,
                        },
                    ]}
                    rows={products.data}
                    empty={{
                        title: t('pages.products.no_products'),
                        description: t('pages.products.no_products_description'),
                        pagination: products,
                    }}
                    actions={(product) => (
                        <TableActions
                            viewHref={route('products.show', product.id)}
                            editHref={canEdit ? route('products.edit', product.id) : null}
                            onDelete={canDelete ? () => setDeleteTarget(product) : null}
                        />
                    )}
                />
            </Card>

            <DeleteModal
                show={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                href={deleteTarget ? route('products.destroy', deleteTarget.id) : '#'}
                name={deleteTarget?.name}
            />
        </AuthenticatedLayout>
    );
}