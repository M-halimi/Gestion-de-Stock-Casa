import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Select from '@/Components/ui/Select';
import { IconBuilding, IconNumber } from '@/Components/ui/FormIcons';
import { Head, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fmtMoney, fmtNumber } from '@/utils/format';

const money = (value) => Number(value) || 0;

export default function PosCreate({ customers, warehouses, products, defaultWarehouseId }) {
    const barcodeRef = useRef(null);
    const barcodeRequestRef = useRef(false);
    const audioContextRef = useRef(null);
    const [barcode, setBarcode] = useState('');
    const [barcodeError, setBarcodeError] = useState('');
    const [search, setSearch] = useState('');
    const [variantPicker, setVariantPicker] = useState(null);
    const permissions = usePage().props.auth?.user?.permissions ?? [];
    const canCreateProducts = permissions.includes('create_products');

    const playSound = (kind = 'success') => {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const context = audioContextRef.current ?? new AudioContext();
            audioContextRef.current = context;

            const play = () => {
                const now = context.currentTime;
                const sequences = {
                    success: [
                        // Short, bright retail scanner chime: clear enough for a busy counter.
                        { frequency: 1046.5, start: 0, duration: 0.07, volume: 0.14 },
                        { frequency: 1318.51, start: 0.055, duration: 0.12, volume: 0.12 },
                    ],
                    error: [
                        // Three descending notes make a failed scan unmistakable.
                        { frequency: 261.63, start: 0, duration: 0.08, volume: 0.13 },
                        { frequency: 207.65, start: 0.075, duration: 0.09, volume: 0.11 },
                        { frequency: 164.81, start: 0.16, duration: 0.18, volume: 0.1 },
                    ],
                    checkout: [
                        { frequency: 659.25, start: 0, duration: 0.1, volume: 0.11 },
                        { frequency: 783.99, start: 0.085, duration: 0.1, volume: 0.11 },
                        { frequency: 1046.5, start: 0.17, duration: 0.22, volume: 0.13 },
                    ],
                };

                (sequences[kind] ?? sequences.success).forEach(({ frequency, start, duration, volume }) => {
                    const oscillator = context.createOscillator();
                    const gain = context.createGain();
                    const attack = now + start;
                    const release = attack + duration;

                    oscillator.type = kind === 'error' ? 'triangle' : 'sine';
                    oscillator.frequency.setValueAtTime(frequency, attack);
                    gain.gain.setValueAtTime(0.0001, attack);
                    gain.gain.exponentialRampToValueAtTime(volume, attack + 0.008);
                    gain.gain.exponentialRampToValueAtTime(0.0001, release);
                    oscillator.connect(gain);
                    gain.connect(context.destination);
                    oscillator.start(attack);
                    oscillator.stop(release + 0.02);
                });
            };

            if (context.state === 'suspended') {
                context.resume().then(play).catch(() => {});
            } else if (context.state !== 'closed') {
                play();
            }
        } catch {
            // Some browsers block audio until the first user interaction.
        }
    };

    const { data, setData, post, processing, errors } = useForm({
        customer_id: '',
        warehouse_id: defaultWarehouseId ? String(defaultWarehouseId) : '',
        discount: 0,
        notes: 'POS',
        items: [],
    });

    const sellableVariants = (product) => {
        const active = (product?.variants ?? []).filter((variant) => variant.status === 'active');
        const specific = active.filter((variant) => !variant.is_legacy);
        return specific.length > 0 ? specific : active;
    };

    const variantLabel = (variant) =>
        variant?.is_legacy
            ? 'Default'
            : [variant?.color?.name, variant?.size?.name].filter(Boolean).join(' / ');

    const stockFor = (product, variant) => {
        const rows = variant ? (variant.stocks ?? []) : (product?.stocks ?? []);
        return rows
            .filter((stock) => !data.warehouse_id || String(stock.warehouse_id) === String(data.warehouse_id))
            .reduce((total, stock) => total + money(stock.quantity), 0);
    };

    const totalStockFor = (product, variant) => {
        const rows = variant ? (variant.stocks ?? []) : (product?.stocks ?? []);
        return rows.reduce((total, stock) => total + money(stock.quantity), 0);
    };

    useEffect(() => {
        const withStock = products.filter((product) => sellableVariants(product).some((variant) => totalStockFor(product, variant) > 0)).length;
        console.info('[WareStock] POS inventory loaded', {
            products: products.length,
            productsWithStock: withStock,
            warehouseId: data.warehouse_id || null,
        });
    }, [products, data.warehouse_id]);

    const addToCart = (product, variant) => {
        if (!product || !variant) return;
        playSound('success');
        setBarcodeError('');
        const variantId = String(variant.id);
        const existing = data.items.findIndex((item) => String(item.product_variant_id) === variantId);

        if (existing >= 0) {
            const items = [...data.items];
            items[existing] = { ...items[existing], quantity: money(items[existing].quantity) + 1 };
            setData('items', items);
        } else {
            setData('items', [
                ...data.items,
                {
                    product_id: product.id,
                    product_variant_id: variant.id,
                    quantity: 1,
                    unit_price: money(product.sale_price),
                },
            ]);
        }
    };

    const scanBarcode = async () => {
        const value = barcode.trim();
        if (!value || barcodeRequestRef.current) return;
        barcodeRequestRef.current = true;

        try {
            const { data: resolved } = await axios.get(route('pos.barcode.lookup'), { params: { barcode: value } });
            const product = products.find((candidate) => String(candidate.id) === String(resolved.product?.id));
            if (!product) throw new Error('Resolved product is not available in this POS session.');

            if (resolved.match === 'variant' && resolved.variant_id) {
                const variant = product.variants?.find((candidate) => String(candidate.id) === String(resolved.variant_id));
                if (!variant) throw new Error('Resolved variant is not available in this POS session.');
                addToCart(product, variant);
            } else {
                const candidates = sellableVariants(product);
                if (candidates.length === 1) addToCart(product, candidates[0]);
                else setVariantPicker(product);
            }
            setBarcode('');
            requestAnimationFrame(() => barcodeRef.current?.focus());
        } catch (error) {
            playSound('error');
            setBarcodeError(error.response?.data?.message ?? error.message ?? `Barcode not found: ${value}`);
        } finally {
            barcodeRequestRef.current = false;
        }
    };

    useEffect(() => {
        if (!barcode.trim() || barcode.trim().length < 4) return undefined;
        const timer = setTimeout(scanBarcode, 260);
        return () => clearTimeout(timer);
    }, [barcode]);

    const filteredProducts = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return products;
        return products.filter((product) => {
            const values = [product.name, product.sku, product.barcode, ...sellableVariants(product).flatMap((v) => [v.barcode, variantLabel(v), v.color?.name, v.size?.name])];
            return values.filter(Boolean).join(' ').toLowerCase().includes(query);
        });
    }, [products, search]);

    const cartRows = data.items.map((item) => {
        const product = products.find((candidate) => String(candidate.id) === String(item.product_id));
        const variant = product?.variants?.find((candidate) => String(candidate.id) === String(item.product_variant_id));
        return { ...item, product, variant };
    });

    const totals = cartRows.reduce(
        (result, item) => {
            const subtotal = money(item.quantity) * money(item.unit_price);
            return { ...result, subtotal: result.subtotal + subtotal };
        },
        { subtotal: 0 }
    );
    const discount = money(data.discount);
    const total = Math.max(0, totals.subtotal - discount);

    const updateQuantity = (index, quantity) => {
        const items = [...data.items];
        items[index] = { ...items[index], quantity: Math.max(0.001, money(quantity)) };
        setData('items', items);
    };

    const removeLine = (index) => setData('items', data.items.filter((_, itemIndex) => itemIndex !== index));

    const submit = (event) => {
        event.preventDefault();
        playSound('checkout');
        post(route('pos.checkout'));
    };

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">Point of Sale</h2>}>
            <Head title="Point of Sale" />

            <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-primary">POS</p>
                        <h1 className="heading-lg text-ink">Point of Sale</h1>
                        <p className="mt-1 text-[13px] text-ink-mute">Scan a barcode and the product is added automatically.</p>
                    </div>
                    {canCreateProducts && (
                        <Button
                            variant="secondary"
                            href={route('products.create', { from: 'pos', warehouse_id: data.warehouse_id || undefined })}
                            onClick={() => console.info('[WareStock] Opening product creation from POS')}
                        >
                            + New product
                        </Button>
                    )}
                    <Button variant="secondary" href={route('pos.barcode')}>Print barcodes</Button>
                    <div className="w-full sm:w-64">
                        <Select
                            label="Warehouse"
                            value={String(data.warehouse_id ?? '')}
                            onChange={(event) => setData('warehouse_id', event.target.value)}
                            error={errors.warehouse_id}
                            icon={<IconBuilding />}
                            options={[
                                { value: '', label: 'Select warehouse' },
                                ...warehouses.map((warehouse) => ({ value: String(warehouse.id), label: `${warehouse.name} (${warehouse.code})` })),
                            ]}
                        />
                    </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <Card className="min-w-0">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 rounded-xl border-2 border-primary bg-primary-soft px-4 py-2">
                                <span className="text-primary">▥</span>
                                <input
                                    ref={barcodeRef}
                                    value={barcode}
                                    onChange={(event) => {
                                        setBarcode(event.target.value);
                                        setBarcodeError('');
                                    }}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            scanBarcode();
                                        }
                                    }}
                                    autoFocus
                                    inputMode="numeric"
                                    autoComplete="off"
                                    placeholder="Scan barcode — product adds automatically"
                                    className="h-12 min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-ink-mute"
                                />
                                <span className="hidden rounded-md bg-canvas px-2 py-1 text-[11px] text-ink-mute sm:inline">ENTER</span>
                            </div>
                            {barcodeError && <p className="text-[13px] text-destructive">{barcodeError}</p>}

                            <div className="relative">
                                <svg className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.1-5.4a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
                                </svg>
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search products by name, SKU or barcode"
                                    className="h-11 w-full rounded-lg border border-hairline-input bg-canvas-soft px-4 ps-11 text-[14px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                                />
                            </div>

                            {variantPicker && (
                                <div
                                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
                                    role="presentation"
                                    onMouseDown={() => setVariantPicker(null)}
                                >
                                    <div
                                        className="w-full max-w-xl rounded-2xl border border-hairline-strong bg-canvas p-5 shadow-level-3"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby="variant-picker-title"
                                        onMouseDown={(event) => event.stopPropagation()}
                                    >
                                        <div className="flex items-start justify-between gap-4 border-b border-hairline pb-4">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Product variant</p>
                                                <h2 id="variant-picker-title" className="mt-1 text-[20px] font-semibold text-ink">
                                                    Choose a variant for {variantPicker.name}
                                                </h2>
                                                <p className="mt-1 text-[13px] text-ink-mute">Select the color and size for this sale.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setVariantPicker(null)}
                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xl leading-none text-ink-mute hover:bg-canvas-soft hover:text-ink"
                                                aria-label="Close variant selection"
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <div className="mt-5 grid max-h-[55vh] grid-cols-1 gap-3 overflow-y-auto sm:grid-cols-2">
                                            {sellableVariants(variantPicker).map((variant) => {
                                                const available = stockFor(variantPicker, variant);
                                                return (
                                                    <button
                                                        type="button"
                                                        key={variant.id}
                                                        onClick={() => {
                                                            addToCart(variantPicker, variant);
                                                            setVariantPicker(null);
                                                        }}
                                                        className="flex min-h-20 items-center justify-between rounded-xl border border-hairline-input bg-canvas-soft px-4 py-3 text-start text-ink transition hover:border-primary hover:bg-primary-soft hover:shadow-level-1"
                                                    >
                                                        <span>
                                                            <span className="block text-[14px] font-semibold">{variantLabel(variant)}</span>
                                                            <span className="mt-1 block text-[12px] text-ink-mute">Click to add to cart</span>
                                                        </span>
                                                        <span className={`ms-3 shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${available > 0 ? 'bg-success-soft text-success' : 'bg-destructive-soft text-destructive'}`}>
                                                            {fmtNumber(available)} in stock
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
                                {filteredProducts.map((product) => {
                                    const variants = sellableVariants(product);
                                    const stock = variants.reduce((sum, variant) => sum + stockFor(product, variant), 0);
                                    const totalStock = variants.reduce((sum, variant) => sum + totalStockFor(product, variant), 0);
                                    const hasStockElsewhere = totalStock > stock;
                                    return (
                                        <button
                                            type="button"
                                            key={product.id}
                                            onClick={() => variants.length > 1
                                                ? setVariantPicker(product)
                                                : addToCart(product, variants[0])}
                                            className="group overflow-hidden rounded-xl border border-hairline bg-canvas text-start transition hover:-translate-y-0.5 hover:border-primary hover:shadow-level-1"
                                        >
                                            <div className="flex h-32 items-center justify-center bg-canvas-soft">
                                                {product.image ? (
                                                    <img src={`/storage/${product.image}`} alt={product.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-3xl text-ink-mute">▧</span>
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <div className="truncate text-[14px] font-semibold text-ink">{product.name}</div>
                                                <div className="mt-0.5 truncate text-[12px] text-ink-mute">{product.sku}</div>
                                                <div className="mt-3 flex items-center justify-between gap-2">
                                                    <span className="font-semibold tabular text-ink">{fmtMoney(product.sale_price)}</span>
                                                    <span className={`text-[11px] tabular ${stock > 0 ? 'text-success' : 'text-destructive'}`}>
                                                        {fmtNumber(stock)} in selected warehouse
                                                        {hasStockElsewhere && (
                                                            <span className="block text-[10px] text-warning">
                                                                {fmtNumber(totalStock)} total in all warehouses
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {filteredProducts.length === 0 && <p className="py-10 text-center text-[14px] text-ink-mute">No products found.</p>}
                        </div>
                    </Card>

                    <Card className="flex min-h-[540px] flex-col" title={`Cart (${cartRows.length})`} actions={cartRows.length > 0 ? <button type="button" onClick={() => setData('items', [])} className="text-[12px] font-semibold text-destructive">Clear all</button> : null}>
                        <form onSubmit={submit} className="flex flex-1 flex-col">
                            <div className="flex-1 space-y-3">
                                {cartRows.length === 0 && (
                                    <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-hairline p-5 text-center">
                                        <span className="text-4xl text-ink-mute">🛒</span>
                                        <p className="mt-3 text-[14px] font-medium text-ink">Cart is empty</p>
                                        <p className="mt-1 text-[12px] text-ink-mute">Scan a barcode to add a product.</p>
                                    </div>
                                )}
                                {cartRows.map((item, index) => (
                                    <div key={item.product_variant_id} className="rounded-lg border border-hairline bg-canvas-soft p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="truncate text-[14px] font-semibold text-ink">{item.product?.name ?? 'Product'}</div>
                                                <div className="mt-0.5 text-[12px] text-ink-mute">{variantLabel(item.variant)} · {item.product?.sku}</div>
                                            </div>
                                            <button type="button" onClick={() => removeLine(index)} className="text-[18px] leading-none text-ink-mute hover:text-destructive" aria-label="Remove">×</button>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between gap-3">
                                            <div className="flex items-center rounded-md border border-hairline-input bg-canvas">
                                                <button type="button" onClick={() => updateQuantity(index, money(item.quantity) - 1)} className="px-2.5 py-1 text-ink-mute hover:text-ink">−</button>
                                                <input
                                                    type="number"
                                                    min="0.001"
                                                    step="0.001"
                                                    value={item.quantity}
                                                    onChange={(event) => updateQuantity(index, event.target.value)}
                                                    className="w-12 border-0 bg-transparent p-1 text-center text-[13px] text-ink outline-none"
                                                />
                                                <button type="button" onClick={() => updateQuantity(index, money(item.quantity) + 1)} className="px-2.5 py-1 text-ink-mute hover:text-ink">+</button>
                                            </div>
                                            <div className="text-end">
                                                <div className="text-[15px] font-semibold tabular text-ink">{fmtMoney(money(item.quantity) * money(item.unit_price))}</div>
                                                <div className="text-[11px] text-ink-mute">{fmtNumber(stockFor(item.product, item.variant))} available</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 space-y-3 border-t border-hairline pt-4">
                                <Select
                                    label="Customer"
                                    value={String(data.customer_id ?? '')}
                                    onChange={(event) => setData('customer_id', event.target.value)}
                                    error={errors.customer_id}
                                    options={[
                                        { value: '', label: 'Walk-in Customer' },
                                        ...customers.map((customer) => ({ value: String(customer.id), label: customer.phone ? `${customer.name} (${customer.phone})` : customer.name })),
                                    ]}
                                />
                                <Input
                                    label="Discount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={data.discount}
                                    onChange={(event) => setData('discount', event.target.value)}
                                    error={errors.discount}
                                    icon={<IconNumber />}
                                />
                                <div className="space-y-1.5 text-[13px]">
                                    <div className="flex justify-between text-ink-mute"><span>Subtotal</span><span className="tabular">{fmtMoney(totals.subtotal)}</span></div>
                                    <div className="flex justify-between text-ink-mute"><span>Discount</span><span className="tabular">− {fmtMoney(discount)}</span></div>
                                    <div className="flex justify-between border-t border-dashed border-hairline pt-2 text-[16px] font-semibold text-ink"><span>Grand Total</span><span className="tabular">{fmtMoney(total)}</span></div>
                                </div>
                                {errors.items && <p className="text-[13px] text-destructive">{errors.items}</p>}
                                <Button type="submit" className="h-12 w-full" disabled={processing || cartRows.length === 0 || !data.warehouse_id}>
                                    Checkout · {fmtMoney(total)}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
