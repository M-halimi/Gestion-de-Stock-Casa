import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import PageHeader from '@/Components/ui/PageHeader';
import Select from '@/Components/ui/Select';
import TextArea from '@/Components/ui/TextArea';
import { IconBox, IconBuilding, IconNote, IconNumber } from '@/Components/ui/FormIcons';
import { Head, useForm } from '@inertiajs/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { fmtMoney, fmtNumber } from '@/utils/format';

export default function OrdersCreate({ boms, warehouses }) {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        bill_of_material_id: '',
        quantity: '',
        warehouse_id: '',
        notes: '',
    });

    const selectedBom = useMemo(
        () => boms.find((b) => String(b.id) === String(data.bill_of_material_id)),
        [boms, data.bill_of_material_id]
    );

    const quantity = Number(data.quantity) || 0;

    const requirements = useMemo(() => {
        if (!selectedBom || quantity <= 0) return [];
        return selectedBom.components.map((c) => ({
            ...c,
            total: c.quantity_per_unit * quantity,
            line_cost: c.purchase_price * c.quantity_per_unit * quantity,
        }));
    }, [selectedBom, quantity]);

    const estimatedCost = useMemo(
        () => requirements.reduce((sum, r) => sum + r.line_cost, 0),
        [requirements]
    );

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.production.orders.create_title')}</h2>}>
            <Head title={t('pages.production.orders.create_title')} />

            <PageHeader
                title={t('pages.production.orders.create_title')}
                actions={
                    <Button variant="ghost" href={route('production.orders.index')}>
                        {t('common.back')}
                    </Button>
                }
            />

            <div className="max-w-4xl">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        post(route('production.orders.store'));
                    }}
                    className="space-y-8"
                >
                    <Card>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Select
                                id="bill_of_material_id"
                                label={t('pages.production.orders.bom')}
                                value={data.bill_of_material_id}
                                onChange={(e) => setData('bill_of_material_id', e.target.value)}
                                error={errors.bill_of_material_id}
                                icon={<IconBox />}
                                options={[
                                    { value: '', label: t('pages.production.orders.select_bom') },
                                    ...boms.map((b) => ({ value: String(b.id), label: `${b.product.name} (${b.product.sku})` })),
                                ]}
                            />
                            <Select
                                id="warehouse_id"
                                label={t('pages.production.orders.warehouse')}
                                value={data.warehouse_id}
                                onChange={(e) => setData('warehouse_id', e.target.value)}
                                error={errors.warehouse_id}
                                icon={<IconBuilding />}
                                options={[
                                    { value: '', label: t('pages.production.orders.select_warehouse') },
                                    ...warehouses.map((w) => ({ value: String(w.id), label: `${w.name} (${w.code})` })),
                                ]}
                            />
                            <Input
                                id="quantity"
                                label={t('pages.production.orders.quantity')}
                                type="number"
                                step="0.001"
                                min="0.001"
                                value={data.quantity}
                                onChange={(e) => setData('quantity', e.target.value)}
                                error={errors.quantity}
                                icon={<IconNumber />}
                                inputClass="tabular"
                            />
                        </div>
                        <div className="mt-5">
                            <TextArea
                                id="notes"
                                label={t('pages.production.orders.notes')}
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                error={errors.notes}
                                icon={<IconNote />}
                            />
                        </div>
                    </Card>

                    {selectedBom && quantity > 0 && (
                        <Card>
                            <div className="mb-3 flex items-center justify-between">
                                <label className="text-[14px] font-normal text-ink">{t('pages.production.orders.requirements')}</label>
                                <span className="text-[13px] text-ink-mute tabular">
                                    {t('pages.production.orders.estimated_cost')} :{' '}
                                    <span className="font-semibold text-ink">
                                        {fmtMoney(estimatedCost)}
                                    </span>
                                </span>
                            </div>
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
                                                {t('pages.production.orders.line_cost')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-hairline bg-canvas">
                                        {requirements.map((r) => (
                                            <tr key={r.component_id}>
                                                <td className="px-4 py-2.5 text-[14px] text-ink">
                                                    {r.name}
                                                    <span className="ms-1 text-[12px] text-ink-mute tabular">({r.sku})</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center text-[14px] text-ink tabular">
                                                    {fmtNumber(r.quantity_per_unit)} {r.unit ?? ''}
                                                </td>
                                                <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">
                                                    {fmtNumber(r.total)} {r.unit ?? ''}
                                                </td>
                                                <td className="px-4 py-2.5 text-end text-[14px] text-ink tabular">
                                                    {fmtMoney(r.line_cost)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" href={route('production.orders.index')}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" variant="primary" disabled={processing}>
                            {t('pages.production.orders.create_action')}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}