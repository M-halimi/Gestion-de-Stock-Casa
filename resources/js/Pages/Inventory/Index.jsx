import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import PageHeader from '@/Components/ui/PageHeader';
import Select from '@/Components/ui/Select';
import TableActions from '@/Components/ui/TableActions';
import { Head, router, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { fmtDateTime, fmtNumber } from '@/utils/format';

export default function InventoryIndex({ adjustments, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canCreate = permissions.includes('view_inventory');
    const canValidate = permissions.includes('validate_inventory');

    const handleFilter = (key, value) => {
        router.get(
            route('inventory.index'),
            { ...filters, [key]: value || undefined, page: undefined },
            { preserveState: true, replace: true }
        );
    };

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.inventory.title')}</h2>}>
            <Head title={t('pages.inventory.title')} />

            <PageHeader
                title={t('pages.inventory.title')}
                subtitle={t('pages.inventory.subtitle')}
                actions={
                    canCreate && (
                        <Button href={route('inventory.create')}>{t('pages.inventory.create_action')}</Button>
                    )
                }
            />

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b border-hairline px-5 py-3">
                    <Select
                        value={filters.status ?? ''}
                        onChange={(e) => handleFilter('status', e.target.value)}
                        className="w-full sm:w-auto sm:min-w-64 sm:max-w-full"
                        options={[
                            { value: '', label: t('pages.inventory.filter_status') },
                            { value: 'draft', label: t('pages.inventory.status.draft') },
                            { value: 'validated', label: t('pages.inventory.status.validated') },
                        ]}
                    />
                </div>

                <DataTable
                    columns={[
                        {
                            key: 'reference',
                            label: t('pages.inventory.reference'),
                            render: (a) => (
                                <div>
                                    <a
                                        href={route('inventory.edit', a.id)}
                                        className="font-normal text-ink underline-offset-2 hover:underline tabular"
                                    >
                                        {a.reference}
                                    </a>
                                    <div className="text-[13px] text-ink-mute">{a.warehouse?.name ?? '—'}</div>
                                </div>
                            ),
                        },
                        {
                            key: 'items_count',
                            label: t('pages.inventory.items'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (a) => fmtNumber(a.items_count ?? 0),
                        },
                        {
                            key: 'status',
                            label: t('pages.inventory.status_label'),
                            render: (a) => (
                                <Badge
                                    status={a.status}
                                    label={t(`pages.inventory.status.${a.status}`)}
                                />
                            ),
                        },
                        {
                            key: 'user',
                            label: t('pages.inventory.created_by'),
                            render: (a) => a.user?.name ?? '—',
                        },
                        {
                            key: 'created_at',
                            label: t('pages.inventory.created_at'),
                            className: 'text-end',
                            cellClass: 'text-end',
                            tabular: true,
                            render: (a) => fmtDateTime(a.created_at),
                        },
                    ]}
                    rows={adjustments.data}
                    empty={{
                        title: t('pages.inventory.no_adjustments'),
                        description: t('pages.inventory.no_adjustments_description'),
                        pagination: adjustments,
                    }}
                    actions={(a) =>
                        a.status === 'draft' && (
                            <TableActions
                                editHref={route('inventory.edit', a.id)}
                                moreActions={
                                    canValidate
                                        ? [
                                              {
                                                  label: t('pages.inventory.validate_action'),
                                                  href: route('inventory.edit', a.id),
                                              },
                                          ]
                                        : []
                                }
                            />
                        )
                    }
                />
            </Card>
        </AuthenticatedLayout>
    );
}