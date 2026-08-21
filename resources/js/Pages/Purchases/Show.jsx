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
    pending: 'pending',
    received: 'received',
    cancelled: 'cancelled',
};

const movementTones = {
    purchase: 'purchase',
};

export default function PurchasesShow({ purchase, movements }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canEdit = permissions.includes('edit_purchases');
    const canReceive = permissions.includes('receive_purchases');
    const canCancel = permissions.includes('cancel_purchases');
    const canDelete = permissions.includes('delete_purchases');

    const [confirmAction, setConfirmAction] = useState(null);

    const isPending = purchase.status === 'pending';

    const confirmations = {
        receive: {
            title: t('pages.purchases.confirm_receive_title'),
            message: t('pages.purchases.confirm_receive_message'),
            url: route('purchases.receive', purchase.id),
            method: 'post',
            variant: 'primary',
        },
        cancel: {
            title: t('pages.purchases.confirm_cancel_title'),
            message: t('pages.purchases.confirm_cancel_message'),
            url: route('purchases.cancel', purchase.id),
            method: 'post',
            variant: 'danger',
        },
        delete: {
            title: t('pages.purchases.confirm_delete_title'),
            message: t('pages.purchases.confirm_delete_message'),
            url: route('purchases.destroy', purchase.id),
            method: 'delete',
            variant: 'danger',
        },
    };

    const active = confirmations[confirmAction];

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink tabular">{purchase.reference}</h2>}>
            <Head title={purchase.reference} />

            <PageHeader
                title={purchase.reference}
                actions={
                    <Button variant="ghost" href={route('purchases.index')}>
                        {t('common.back')}
                    </Button>
                }
            />

            <div className="space-y-6">
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="heading-sm text-ink">{purchase.supplier?.name ?? 'â€”'}</h3>
                            <p className="mt-0.5 text-[13px] text-ink-mute">{t('pages.purchases.purchase')}</p>
                        </div>
                        <Badge status={statusTones[purchase.status]} label={t(`pages.purchases.status.${purchase.status}`)} />
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.purchases.supplier')}</div>
                            <div className="mt-1 text-[15px] text-ink">{purchase.supplier?.name ?? 'â€”'}</div>
                        </div>
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.purchases.warehouse')}</div>
                            <div className="mt-1 text-[15px] text-ink">{purchase.warehouse?.name ?? 'â€”'}</div>
                        </div>
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.purchases.date')}</div>
                            <div className="mt-1 text-[15px] text-ink tabular">{fmtDate(purchase.date)}</div>
                        </div>
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.purchases.created_by')}</div>
                            <div className="mt-1 text-[15px] text-ink">{purchase.user?.name ?? 'â€”'}</div>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.purchases.items_count_label')}</div>
                            <div className="mt-1 text-[14px] text-ink tabular">{fmtNumber(purchase.items_count ?? purchase.items.length)}</div>
                        </div>
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.purchases.grand_total')}</div>
                            <div className="mt-1 text-[14px] font-semibold text-ink tabular">{fmtMoney(purchase.total_amount)}</div>
                        </div>
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.purchases.created_at')}</div>
                            <div className="mt-1 text-[14px] text-ink tabular">{fmtDateTime(purchase.created_at)}</div>
                        </div>
                    </div>

                    {purchase.notes && (
                        <div className="mt-5 rounded-lg bg-canvas-soft p-4 text-[14px] text-ink-secondary">
                            {purchase.notes}
                        </div>
                    )}

                    {isPending && (
                        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-hairline pt-5">
                            {canEdit && (
                                <Button variant="ghost" href={route('purchases.edit', purchase.id)}>
                                    {t('common.edit')}
                                </Button>
                            )}
                            {canCancel && (
                                <Button variant="danger" onClick={() => setConfirmAction('cancel')}>
                                    {t('pages.purchases.cancel_action')}
                                </Button>
                            )}
                            {canDelete && (
                                <Button variant="danger" onClick={() => setConfirmAction('delete')}>
                                    {t('common.delete')}
                                </Button>
                            )}
                            {canReceive && (
                                <Button onClick={() => setConfirmAction('receive')}>
                                    {t('pages.purchases.receive_action')}
                                </Button>
                            )}
                        </div>
                    )}
                </Card>

                <Card>
                    <h3 className="mb-3 text-[14px] font-normal text-ink">{t('pages.purchases.items')}</h3>
                    <div className="overflow-x-auto rounded-lg border border-hairline">
                        <table className="min-w-full divide-y divide-hairline">
                            <thead className="bg-canvas-soft">
                                <tr>
                                    <th scope="col" className="px-4 py-2.5 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.purchases.product')}
                                    </th>
                                    <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.purchases.quantity')}
                                    </th>
                                    <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.purchases.unit_price')}
                                    </th>
                                    <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.purchases.discount')}
                                    </th>
                                    <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.purchases.tax')}
                                    </th>
                                    <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.purchases.line_total')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-hairline bg-canvas">
                                {purchase.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-2.5 text-[14px] text-ink">
                                            {item.product?.name ?? 'â€”'}
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
                                        {t('pages.purchases.subtotal')}
                                    </td>
                                    <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">{fmtMoney(purchase.subtotal)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={5} className="px-4 py-2.5 text-end text-[13px] text-ink-mute">
                                        {t('pages.purchases.discount')}
                                    </td>
                                    <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">âˆ’ {fmtMoney(purchase.discount)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={5} className="px-4 py-2.5 text-end text-[13px] text-ink-mute">
                                        {t('pages.purchases.tax')}
                                    </td>
                                    <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">+ {fmtMoney(purchase.tax)}</td>
                                </tr>
                                <tr>
                                    <td colSpan={5} className="px-4 py-2.5 text-end text-[13px] font-semibold text-ink">
                                        {t('pages.purchases.grand_total')}
                                    </td>
                                    <td className="px-4 py-2.5 text-end text-[14px] font-semibold text-ink tabular">{fmtMoney(purchase.total_amount)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>

                {movements.length > 0 && (
                    <Card>
                        <h3 className="mb-3 text-[14px] font-normal text-ink">{t('pages.purchases.movements')}</h3>
                        <div className="overflow-x-auto rounded-lg border border-hairline">
                            <table className="min-w-full divide-y divide-hairline">
                                <thead className="bg-canvas-soft">
                                    <tr>
                                        <th scope="col" className="px-4 py-2.5 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                            {t('pages.purchases.movement_product')}
                                        </th>
                                        <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                            {t('pages.purchases.movement_quantity')}
                                        </th>
                                        <th scope="col" className="px-4 py-2.5 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                            {t('pages.purchases.movement_warehouse')}
                                        </th>
                                        <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                            {t('pages.purchases.movement_date')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-hairline bg-canvas">
                                    {movements.map((m) => (
                                        <tr key={m.id}>
                                            <td className="px-4 py-2.5 text-[14px] text-ink">
                                                {m.product?.name ?? 'â€”'}
                                                <span className="ms-2">
                                                    <Badge status={movementTones[m.type]} label={t(`dashboard.movements.types.${m.type}`)} />
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-end text-[14px] text-success tabular">+ {fmtNumber(m.quantity)}</td>
                                            <td className="px-4 py-2.5 text-[14px] text-ink">{m.warehouse?.name ?? 'â€”'}</td>
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