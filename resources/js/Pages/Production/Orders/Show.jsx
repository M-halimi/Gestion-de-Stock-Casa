import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import ConfirmModal from '@/Components/shared/ConfirmModal';
import PageHeader from '@/Components/ui/PageHeader';
import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fmtDateTime, fmtMoney, fmtNumber } from '@/utils/format';

const statusTones = {
    pending: 'pending',
    in_progress: 'in_progress',
    completed: 'completed',
    cancelled: 'cancelled',
};

const movementTones = {
    production_in: 'production_in',
    production_out: 'production_out',
};

export default function OrdersShow({ order, movements }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const canManage = (auth.user?.permissions ?? []).includes('manage_production');
    const [confirmAction, setConfirmAction] = useState(null);

    const confirmations = {
        launch: {
            title: t('pages.production.orders.confirm_launch_title'),
            message: t('pages.production.orders.confirm_launch_message'),
            url: route('production.orders.launch', order.id),
        },
        complete: {
            title: t('pages.production.orders.confirm_complete_title'),
            message: t('pages.production.orders.confirm_complete_message'),
            url: route('production.orders.complete', order.id),
        },
        cancel: {
            title: t('pages.production.orders.confirm_cancel_title'),
            message: t('pages.production.orders.confirm_cancel_message'),
            url: route('production.orders.cancel', order.id),
        },
    };

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink tabular">{order.reference}</h2>}>
            <Head title={order.reference} />

            <PageHeader
                title={order.reference}
                actions={
                    <Button variant="ghost" href={route('production.orders.index')}>
                        {t('common.back')}
                    </Button>
                }
            />

            <div className="space-y-6">
                <Card>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="heading-sm text-ink">{order.product?.name}</h3>
                            <p className="mt-0.5 text-[13px] text-ink-mute tabular">{order.product?.sku}</p>
                        </div>
                        <Badge status={statusTones[order.status]} label={t(`pages.production.status.${order.status}`)} />
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.production.orders.quantity')}</div>
                            <div className="mt-1 text-[15px] text-ink tabular">{fmtNumber(order.quantity)}</div>
                        </div>
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.production.orders.material_cost')}</div>
                            <div className="mt-1 text-[15px] text-ink tabular">{fmtMoney(order.material_cost)}</div>
                        </div>
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.production.orders.warehouse')}</div>
                            <div className="mt-1 text-[15px] text-ink">{order.warehouse?.name ?? '—'}</div>
                        </div>
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.production.orders.created_by')}</div>
                            <div className="mt-1 text-[15px] text-ink">{order.user?.name ?? '—'}</div>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.production.orders.started_at')}</div>
                            <div className="mt-1 text-[14px] text-ink tabular">{fmtDateTime(order.started_at)}</div>
                        </div>
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.production.orders.completed_at')}</div>
                            <div className="mt-1 text-[14px] text-ink tabular">{fmtDateTime(order.completed_at)}</div>
                        </div>
                        <div>
                            <div className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.production.orders.created_at')}</div>
                            <div className="mt-1 text-[14px] text-ink tabular">{fmtDateTime(order.created_at)}</div>
                        </div>
                    </div>

                    {order.notes && (
                        <div className="mt-5 rounded-lg bg-canvas-soft p-4 text-[14px] text-ink-secondary">
                            {order.notes}
                        </div>
                    )}

                    {canManage && order.status !== 'completed' && order.status !== 'cancelled' && (
                        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-hairline pt-5">
                            {order.status === 'pending' && (
                                <Button onClick={() => setConfirmAction('launch')}>
                                    {t('pages.production.orders.launch_action')}
                                </Button>
                            )}
                            {order.status === 'in_progress' && (
                                <Button onClick={() => setConfirmAction('complete')}>
                                    {t('pages.production.orders.complete_action')}
                                </Button>
                            )}
                            <Button variant="danger" onClick={() => setConfirmAction('cancel')}>
                                {t('pages.production.orders.cancel_action')}
                            </Button>
                        </div>
                    )}
                </Card>

                <Card>
                    <h3 className="mb-3 text-[14px] font-normal text-ink">{t('pages.production.orders.components')}</h3>
                    <div className="overflow-x-auto rounded-lg border border-hairline">
                        <table className="min-w-full divide-y divide-hairline">
                            <thead className="bg-canvas-soft">
                                <tr>
                                    <th scope="col" className="px-4 py-2.5 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.production.orders.component')}
                                    </th>
                                    <th scope="col" className="px-4 py-2.5 text-center text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.production.orders.per_unit')}
                                    </th>
                                    <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.production.orders.total')}
                                    </th>
                                    <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.production.orders.unit_cost')}
                                    </th>
                                    <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                        {t('pages.production.orders.line_cost')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-hairline bg-canvas">
                                {order.items.map((item) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-2.5 text-[14px] text-ink">
                                            {item.component?.name ?? '—'}
                                            <span className="ms-1 text-[12px] text-ink-mute tabular">({item.component?.sku})</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-center text-[14px] text-ink tabular">
                                            {fmtNumber(item.quantity_per_unit)}
                                        </td>
                                        <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">
                                            {fmtNumber(item.total_quantity)}
                                        </td>
                                        <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">
                                            {fmtMoney(item.unit_cost)}
                                        </td>
                                        <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">
                                            {fmtMoney(Number(item.total_quantity) * Number(item.unit_cost))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-canvas-soft">
                                <tr>
                                    <td colSpan={4} className="px-4 py-2.5 text-end text-[13px] text-ink-mute">
                                        {t('pages.production.orders.total_cost')}
                                    </td>
                                    <td className="px-4 py-2.5 text-end text-[14px] font-semibold text-ink tabular">
                                        {fmtMoney(order.material_cost)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </Card>

                {movements.length > 0 && (
                    <Card>
                        <h3 className="mb-3 text-[14px] font-normal text-ink">{t('pages.production.orders.movements')}</h3>
                        <div className="overflow-x-auto rounded-lg border border-hairline">
                            <table className="min-w-full divide-y divide-hairline">
                                <thead className="bg-canvas-soft">
                                    <tr>
                                        <th scope="col" className="px-4 py-2.5 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                            {t('pages.production.orders.movement_product')}
                                        </th>
                                        <th scope="col" className="px-4 py-2.5 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                            {t('pages.production.orders.movement_type')}
                                        </th>
                                        <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                            {t('pages.production.orders.movement_quantity')}
                                        </th>
                                        <th scope="col" className="px-4 py-2.5 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                            {t('pages.production.orders.movement_warehouse')}
                                        </th>
                                        <th scope="col" className="px-4 py-2.5 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                            {t('pages.production.orders.movement_date')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-hairline bg-canvas">
                                    {movements.map((m) => (
                                        <tr key={m.id}>
                                            <td className="px-4 py-2.5 text-[14px] text-ink">{m.product?.name ?? '—'}</td>
                                            <td className="px-4 py-2.5">
                                                <Badge status={movementTones[m.type]} label={t(`pages.production.movement.${m.type}`)} />
                                            </td>
                                            <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">{fmtNumber(m.quantity)}</td>
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
                show={Boolean(confirmAction)}
                onClose={() => setConfirmAction(null)}
                title={confirmations[confirmAction]?.title}
                message={confirmations[confirmAction]?.message}
                href={confirmations[confirmAction]?.url}
                method="post"
                confirmVariant={confirmAction === 'cancel' ? 'danger' : 'primary'}
            />
        </AuthenticatedLayout>
    );
}
