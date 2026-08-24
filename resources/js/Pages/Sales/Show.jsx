import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import ConfirmModal from '@/Components/shared/ConfirmModal';
import PageHeader from '@/Components/ui/PageHeader';
import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fmtDate, fmtDateTime, fmtMoney, fmtNumber } from '@/utils/format';

const statusTones = {
    draft: 'draft',
    confirmed: 'confirmed',
    cancelled: 'cancelled',
};

const movementTones = {
    sale: 'sale',
};

export default function SalesShow({ sale, movements }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canEdit = permissions.includes('edit_sales');
    const canConfirm = permissions.includes('confirm_sales');
    const canCancel = permissions.includes('cancel_sales');
    const canDelete = permissions.includes('delete_sales');
    const canViewDocuments = permissions.includes('view_sales');

    const [confirmAction, setConfirmAction] = useState(null);

    const isDraft = sale.status === 'draft';

    const confirmations = {
        confirm: {
            title: t('pages.sales.confirm_confirm_title'),
            message: t('pages.sales.confirm_confirm_message'),
            url: route('sales.confirm', sale.id),
            method: 'post',
            variant: 'primary',
        },
        cancel: {
            title: t('pages.sales.confirm_cancel_title'),
            message: t('pages.sales.confirm_cancel_message'),
            url: route('sales.cancel', sale.id),
            method: 'post',
            variant: 'danger',
        },
        delete: {
            title: t('pages.sales.confirm_delete_title'),
            message: t('pages.sales.confirm_delete_message'),
            url: route('sales.destroy', sale.id),
            method: 'delete',
            variant: 'danger',
        },
    };

    const active = confirmations[confirmAction];

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink tabular">{sale.reference}</h2>}>
            <Head title={sale.reference} />

            <PageHeader
                title={sale.reference}
                actions={
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {canViewDocuments && (
                            <>
                                <Button external variant="secondary" href={route('sales.invoice', sale.id)}>
                                    {t('pages.sales.download_invoice')}
                                </Button>
                                <Button external variant="secondary" href={route('sales.invoice.print', sale.id)} target="_blank" rel="noreferrer">
                                    {t('pages.sales.print_invoice')}
                                </Button>
                            </>
                        )}
                        <Button variant="ghost" href={route('sales.index')}>
                            {t('common.back')}
                        </Button>
                    </div>
                }
            />

            <div className="space-y-6">
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="heading-sm text-ink">{sale.customer?.name ?? '—'}</h3>
                            <p className="mt-0.5 text-[13px] text-ink-mute">{t('pages.sales.sale')}</p>
                        </div>
                        <Badge status={statusTones[sale.status]} label={t(`pages.sales.status.${sale.status}`)} />
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.sales.customer')}</div>
                            <div className="mt-1 text-[15px] text-ink">{sale.customer?.name ?? '—'}</div>
                        </div>
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.sales.warehouse')}</div>
                            <div className="mt-1 text-[15px] text-ink">{sale.warehouse?.name ?? '—'}</div>
                        </div>
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.sales.date')}</div>
                            <div className="mt-1 text-[15px] text-ink tabular">{fmtDate(sale.date)}</div>
                        </div>
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.sales.created_by')}</div>
                            <div className="mt-1 text-[15px] text-ink">{sale.user?.name ?? '—'}</div>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.sales.items_count_label')}</div>
                            <div className="mt-1 text-[14px] text-ink tabular">{fmtNumber(sale.items_count ?? sale.items.length)}</div>
                        </div>
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.sales.grand_total')}</div>
                            <div className="mt-1 text-[14px] font-semibold text-ink tabular">{fmtMoney(sale.total_amount)}</div>
                        </div>
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.sales.created_at')}</div>
                            <div className="mt-1 text-[14px] text-ink tabular">{fmtDateTime(sale.created_at)}</div>
                        </div>
                    </div>

                    {sale.notes && (
                        <div className="mt-5 rounded-lg bg-canvas-soft p-4 text-[14px] text-ink-secondary">
                            {sale.notes}
                        </div>
                    )}

                    {isDraft && (
                        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-hairline pt-5">
                            {canEdit && (
                                <Button variant="ghost" href={route('sales.edit', sale.id)}>
                                    {t('common.edit')}
                                </Button>
                            )}
                            {canCancel && (
                                <Button variant="danger" onClick={() => setConfirmAction('cancel')}>
                                    {t('pages.sales.cancel_action')}
                                </Button>
                            )}
                            {canDelete && (
                                <Button variant="danger" onClick={() => setConfirmAction('delete')}>
                                    {t('common.delete')}
                                </Button>
                            )}
                            {canConfirm && (
                                <Button onClick={() => setConfirmAction('confirm')}>
                                    {t('pages.sales.confirm_action')}
                                </Button>
                            )}
                        </div>
                    )}
                </Card>

                <Card>
                    <h3 className="mb-3 text-[14px] font-normal text-ink">{t('pages.sales.items')}</h3>
                    <div className="overflow-x-auto rounded-lg border border-hairline">
                        <table className="min-w-full divide-y divide-hairline">
                            <thead className="bg-canvas-soft">
                                <tr>
                                    <th scope="col" className="px-4 py-2.5 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.sales.product')}
                                    </th>
                                    <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.sales.quantity')}
                                    </th>
                                    <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.sales.unit_price')}
                                    </th>
                                    <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.sales.discount')}
                                    </th>
                                    <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.sales.tax')}
                                    </th>
                                    <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.sales.line_total')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-hairline bg-canvas">
                                {sale.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-2.5 text-[14px] text-ink">
                                            {item.product?.name ?? '—'}
                                            <span className="ms-1 text-[12px] text-ink-mute tabular">({item.product?.sku})</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">{fmtNumber(item.quantity)}</td>
                                        <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">{fmtMoney(item.unit_price)}</td>
                                        <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">{fmtMoney(item.discount)}</td>
                                        <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">{fmtMoney(item.tax)}</td>
                                        <td className="px-4 py-2.5 text-end text-[14px] font-semibold text-ink tabular">
                                            {fmtMoney(Number(item.subtotal) - Number(item.discount) + Number(item.tax))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-canvas-soft">
                                <tr>
                                    <td colSpan={5} className="px-4 py-2.5 text-end text-[13px] text-ink-mute">
                                        {t('pages.sales.subtotal')}
                                    </td>
                                    <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">{fmtMoney(sale.subtotal)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={5} className="px-4 py-2.5 text-end text-[13px] text-ink-mute">
                                        {t('pages.sales.discount')}
                                    </td>
                                    <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">− {fmtMoney(sale.discount)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={5} className="px-4 py-2.5 text-end text-[13px] text-ink-mute">
                                        {t('pages.sales.tax')}
                                    </td>
                                    <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">+ {fmtMoney(sale.tax)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={5} className="px-4 py-2.5 text-end text-[13px] font-semibold text-ink">
                                        {t('pages.sales.grand_total')}
                                    </td>
                                    <td className="px-4 py-2.5 text-end text-[14px] font-semibold text-ink tabular">{fmtMoney(sale.total_amount)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>

                {movements.length > 0 && (
                    <Card>
                        <h3 className="mb-3 text-[14px] font-normal text-ink">{t('pages.sales.movements')}</h3>
                        <div className="overflow-x-auto rounded-lg border border-hairline">
                            <table className="min-w-full divide-y divide-hairline">
                                <thead className="bg-canvas-soft">
                                    <tr>
                                        <th scope="col" className="px-4 py-2.5 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                            {t('pages.sales.movement_product')}
                                        </th>
                                        <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                            {t('pages.sales.movement_quantity')}
                                        </th>
                                        <th scope="col" className="px-4 py-2.5 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                            {t('pages.sales.movement_warehouse')}
                                        </th>
                                        <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                            {t('pages.sales.movement_date')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-hairline bg-canvas">
                                    {movements.map((m) => (
                                        <tr key={m.id}>
                                            <td className="px-4 py-2.5 text-[14px] text-ink">
                                                {m.product?.name ?? '—'}
                                                <span className="ms-2">
                                                    <Badge status={movementTones[m.type]} label={t(`dashboard.movements.types.${m.type}`)} />
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-end text-[14px] text-destructive tabular">− {fmtNumber(m.quantity)}</td>
                                            <td className="px-4 py-2.5 text-[14px] text-ink">{m.warehouse?.name ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">{fmtDateTime(m.created_at)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            <ConfirmModal
                show={Boolean(active)}
                onClose={() => setConfirmAction(null)}
                title={active?.title}
                message={active?.message}
                href={active?.url}
                method={active?.method}
                confirmVariant={active?.variant}
            />
        </AuthenticatedLayout>
    );
}
