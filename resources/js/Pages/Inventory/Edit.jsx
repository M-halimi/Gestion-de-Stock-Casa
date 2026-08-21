import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import ConfirmModal from '@/Components/shared/ConfirmModal';
import PageHeader from '@/Components/ui/PageHeader';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fmtNumber } from '@/utils/format';

export default function InventoryEdit({ adjustment, items }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canValidate = permissions.includes('validate_inventory');
    const isDraft = adjustment.status === 'draft';

    const initialCounts = useMemo(() => {
        const map = {};
        items.forEach((item) => {
            map[item.id] = String(item.counted_quantity);
        });
        return map;
    }, [items]);

    const { data, setData, put, processing } = useForm({ counts: initialCounts });
    const [search, setSearch] = useState('');
    const [confirmValidate, setConfirmValidate] = useState(false);

    const variance = (item) => Number(data.counts[item.id] ?? 0) - Number(item.system_quantity);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (item) =>
                item.product.name.toLowerCase().includes(q) ||
                String(item.product.sku ?? '').toLowerCase().includes(q)
        );
    }, [items, search]);

    const totalVariance = items.reduce((acc, item) => acc + variance(item), 0);

    const saveDraft = () => {
        put(route('inventory.update', adjustment.id));
    };

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.inventory.edit_title')}</h2>}>
            <Head title={t('pages.inventory.edit_title')} />

            <PageHeader
                title={`${adjustment.reference} â€” ${adjustment.warehouse?.name ?? ''}`}
                subtitle={t('pages.inventory.edit_subtitle')}
            />

            <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3">
                    <div className="flex items-center gap-3">
                        <Badge
                            status={adjustment.status}
                            label={t(`pages.inventory.status.${adjustment.status}`)}
                        />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('pages.inventory.search_placeholder')}
                            className="h-11 w-full sm:w-auto sm:min-w-64 sm:max-w-full rounded-md border-hairline-input bg-canvas px-3 text-[14px] font-normal text-ink shadow-sm placeholder:text-ink-mute focus:border-primary focus:ring-primary"
                        />
                    </div>
                    <div className="text-[13px] text-ink-secondary">
                        {t('pages.inventory.total_variance')} :{' '}
                        <span
                            className={`font-semibold tabular ${
                                totalVariance > 0 ? 'text-success' : totalVariance < 0 ? 'text-destructive' : 'text-ink'
                            }`}
                        >
                            {totalVariance > 0 ? '+' : ''}
                            {fmtNumber(totalVariance)}
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-hairline">
                        <thead className="bg-canvas-soft">
                            <tr>
                                <th scope="col" className="px-5 py-3 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                    {t('pages.inventory.product')}
                                </th>
                                <th scope="col" className="px-5 py-3 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                    {t('pages.inventory.system_quantity')}
                                </th>
                                <th scope="col" className="px-5 py-3 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                    {t('pages.inventory.counted_quantity')}
                                </th>
                                <th scope="col" className="px-5 py-3 text-end text-[12px] font-normal uppercase tracking-wide text-ink-mute">
                                    {t('pages.inventory.variance')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-hairline bg-canvas">
                            {filtered.map((item) => {
                                const diff = variance(item);
                                return (
                                    <tr key={item.id} className="transition hover:bg-canvas-soft">
                                        <td className="px-5 py-3 text-[14px] text-ink-secondary">
                                            <div className="font-normal text-ink">{item.product.name}</div>
                                            <div className="text-[13px] text-ink-mute">{item.product.sku}</div>
                                        </td>
                                        <td className="px-5 py-3 text-end text-[14px] text-ink-secondary tabular">
                                            {fmtNumber(item.system_quantity)}
                                        </td>
                                        <td className="px-5 py-3 text-end">
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                disabled={!isDraft}
                                                value={data.counts[item.id] ?? ''}
                                                onChange={(e) =>
                                                    setData('counts', {
                                                        ...data.counts,
                                                        [item.id]: e.target.value,
                                                    })
                                                }
                                                className={`h-10 w-32 rounded-md border-hairline-input bg-canvas px-3 text-end text-[15px] font-normal text-ink shadow-sm focus:border-primary focus:ring-primary ${
                                                    isDraft ? '' : 'cursor-not-allowed opacity-60'
                                                }`}
                                            />
                                        </td>
                                        <td
                                            className={`px-5 py-3 text-end text-[14px] font-semibold tabular ${
                                                diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : 'text-ink-mute2'
                                            }`}
                                        >
                                            {diff > 0 ? '+' : ''}
                                            {fmtNumber(diff)}
                                        </td>
                                    </tr>
                                );
                            })}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-5 py-10 text-center text-[14px] text-ink-mute">
                                        {t('pages.inventory.no_items_found')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-hairline px-5 py-4">
                    <span className="text-[13px] text-ink-mute">{t('pages.inventory.items_label')}</span>
                    <div className="flex gap-3">
                        <Button variant="ghost" href={route('inventory.index')}>
                            {t('common.cancel')}
                        </Button>
                        {isDraft && (
                            <>
                                <Button variant="secondary" onClick={saveDraft} disabled={processing}>
                                    {t('pages.inventory.save_draft')}
                                </Button>
                                {canValidate && (
                                    <Button onClick={() => setConfirmValidate(true)} disabled={processing}>
                                        {t('pages.inventory.validate_action')}
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </Card>

            <ConfirmModal
                show={confirmValidate}
                onClose={() => setConfirmValidate(false)}
                href={route('inventory.validate', adjustment.id)}
                method="post"
                confirmVariant="success"
                title={t('pages.inventory.confirm_validate_title')}
                message={t('pages.inventory.confirm_validate_message')}
            />
        </AuthenticatedLayout>
    );
}