import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BarcodeInput from '@/Components/BarcodeInput';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import PageHeader from '@/Components/ui/PageHeader';
import Select from '@/Components/ui/Select';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { fmtNumber } from '@/utils/format';

export default function BarcodeStock({ warehouses = [] }) {
    const [barcode, setBarcode] = useState('');
    const [variant, setVariant] = useState(null);
    const [lookupError, setLookupError] = useState(null);
    const { data, setData, post, processing, errors, reset } = useForm({
        variant_id: '',
        warehouse_id: warehouses[0]?.id ? String(warehouses[0].id) : '',
        quantity: '1',
        reason: '',
    });

    const selectedStock = variant?.stocks?.find((stock) => String(stock.warehouse_id) === String(data.warehouse_id));

    const handleResolved = (result) => {
        setVariant(result);
        setData('variant_id', result?.id ? String(result.id) : '');
    };

    const submit = (direction) => (event) => {
        event.preventDefault();
        post(route(direction === 'in' ? 'stock.barcode.in' : 'stock.barcode.out'), {
            preserveScroll: true,
            onSuccess: () => {
                setBarcode('');
                setVariant(null);
                reset('variant_id', 'quantity', 'reason');
            },
        });
    };

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">Barcode stock</h2>}>
            <Head title="Barcode stock" />
            <PageHeader title="Barcode stock" subtitle="Scan a keyboard-style barcode scanner or type a barcode manually." />

            <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-2">
                <Card>
                    <h3 className="heading-md text-ink">Scan barcode</h3>
                    <p className="mt-1 text-[13px] text-ink-mute">The field accepts normal keyboard scanner input.</p>
                    <div className="mt-5">
                        <BarcodeInput value={barcode} onChange={setBarcode} onResolved={handleResolved} onError={setLookupError} />
                    </div>
                    {lookupError && <p className="mt-3 rounded-md bg-destructive-soft px-3 py-2 text-[13px] text-destructive">{lookupError}</p>}

                    {variant && (
                        <div className="mt-5 rounded-lg border border-hairline bg-canvas-soft p-4">
                            <p className="text-[16px] font-semibold text-ink">{variant.product?.name}</p>
                            <p className="mt-1 text-[14px] text-ink-secondary">{variant.label}</p>
                            <p className="mt-1 text-[12px] text-ink-mute tabular">{variant.barcode}</p>
                            <p className="mt-4 text-[13px] text-ink-mute">Current stock in selected warehouse</p>
                            <p className="text-[28px] font-semibold text-ink tabular">{fmtNumber(selectedStock?.quantity ?? 0)}</p>
                        </div>
                    )}
                </Card>

                <Card>
                    <h3 className="heading-md text-ink">Stock operation</h3>
                    <form className="mt-5 space-y-4">
                        <Select
                            label="Warehouse"
                            value={String(data.warehouse_id)}
                            onChange={(e) => setData('warehouse_id', e.target.value)}
                            error={errors.warehouse_id}
                            options={[
                                { value: '', label: 'Select warehouse' },
                                ...warehouses.map((warehouse) => ({ value: String(warehouse.id), label: `${warehouse.name} (${warehouse.code})` })),
                            ]}
                        />
                        <Input
                            label="Quantity"
                            type="number"
                            min="0.001"
                            step="0.001"
                            value={data.quantity}
                            onChange={(e) => setData('quantity', e.target.value)}
                            error={errors.quantity}
                        />
                        <Input label="Reason (optional)" value={data.reason} onChange={(e) => setData('reason', e.target.value)} error={errors.reason} />
                        {errors.variant_id && <p className="text-[13px] text-destructive">{errors.variant_id}</p>}
                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="secondary" disabled={processing || !variant} onClick={submit('in')}>Add stock</Button>
                            <Button type="button" disabled={processing || !variant} onClick={submit('out')}>Remove stock</Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
