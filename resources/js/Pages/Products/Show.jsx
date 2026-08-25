import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
import BackButton from '@/Components/ui/BackButton';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import PageHeader from '@/Components/ui/PageHeader';
import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { fmtDate, fmtMoney, fmtNumber } from '@/utils/format';

function InfoRow({ label, value, tabular = false }) {
    return (
        <div className="flex items-center justify-between border-b border-hairline py-2.5 last:border-0">
            <span className="text-[14px] text-ink-mute">{label}</span>
            <span className={`text-[14px] font-normal text-ink ${tabular ? 'tabular' : ''}`}>{value}</span>
        </div>
    );
}

const movementTone = (type) =>
    ({ purchase: 'success', sale: 'danger', adjustment: 'warning', transfer_in: 'info', transfer_out: 'info', production_in: 'success', production_out: 'danger' })[type] ?? 'neutral';

export default function ProductsShow({ product, movements }) {
    const { t } = useTranslation();

    const totalQty = product.stocks.reduce((sum, s) => sum + Number(s.quantity), 0);

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{product.name}</h2>}>
            <Head title={product.name} />

            <PageHeader
                title={product.name}
                subtitle={product.sku}
                actions={
                    <BackButton href={route('products.index')}>
                        {t('common.back')}
                    </BackButton>
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <div className="flex items-center gap-4">
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-hairline bg-canvas-soft">
                                {product.image ? (
                                    <img src={`/storage/${product.image}`} alt={product.name} className="h-full w-full object-cover" />
                                ) : (
                                    <svg className="h-10 w-10 text-ink-mute" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L12 3l9 4.5M3 7.5l9 4.5m-9-4.5v9l9 4.5m0-13.5l9 4.5m-9 4.5v9m0-13.5l-9 4.5m9 4.5l9-4.5v9l-9 4.5v-9" />
                                    </svg>
                                )}
                            </div>
                            <div>
                                <Badge tone={product.status === 'active' ? 'success' : 'neutral'}>{t(`pages.products.${product.status}`)}</Badge>
                                <p className="mt-2 text-[14px] leading-relaxed text-ink-mute">
                                    {product.description || '—'}
                                </p>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="heading-md mb-2 text-ink">{t('pages.products.stock_by_warehouse')}</h3>
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-start">
                                <thead>
                                    <tr className="border-b border-hairline text-[12px] uppercase tracking-wide text-ink-mute">
                                        <th className="py-2 pe-4 font-normal">{t('pages.products.warehouse')}</th>
                                        <th className="py-2 pe-4 text-end font-normal">{t('pages.products.quantity')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {product.stocks.map((stock) => (
                                        <tr key={stock.id} className="border-b border-hairline last:border-0">
                                            <td className="py-2.5 pe-4 text-[14px] text-ink">{stock.warehouse?.name ?? '—'}</td>
                                            <td className="py-2.5 text-end text-[14px] text-ink tabular">{fmtNumber(stock.quantity)}</td>
                                        </tr>
                                    ))}
                                    {product.stocks.length === 0 && (
                                        <tr>
                                            <td colSpan={2} className="py-4 text-center text-[14px] text-ink-mute">
                                                {t('pages.products.no_stock')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="heading-md mb-2 text-ink">{t('pages.products.movements')}</h3>
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-start">
                                <thead>
                                    <tr className="border-b border-hairline text-[12px] uppercase tracking-wide text-ink-mute">
                                        <th className="py-2 pe-4 font-normal">{t('pages.products.date')}</th>
                                        <th className="py-2 pe-4 font-normal">{t('pages.products.type')}</th>
                                        <th className="py-2 pe-4 font-normal">{t('pages.products.warehouse')}</th>
                                        <th className="py-2 text-end font-normal">{t('pages.products.quantity')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {movements.map((m) => (
                                        <tr key={m.id} className="border-b border-hairline last:border-0">
                                            <td className="py-2.5 pe-4 text-[14px] text-ink tabular">
                                                {fmtDate(m.created_at)}
                                            </td>
                                            <td className="py-2.5 pe-4">
                                                <Badge tone={movementTone(m.type)}>{m.type}</Badge>
                                            </td>
                                            <td className="py-2.5 pe-4 text-[14px] text-ink-mute">{m.warehouse?.name ?? '—'}</td>
                                            <td className="py-2.5 text-end text-[14px] text-ink tabular">
                                                {m.type === 'purchase' || m.type === 'production_in' || m.type === 'transfer_in' ? '+' : ''}
                                                {fmtNumber(m.quantity)}
                                            </td>
                                        </tr>
                                    ))}
                                    {movements.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-4 text-center text-[14px] text-ink-mute">
                                                {t('pages.products.no_movements')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <h3 className="heading-md mb-2 text-ink">{t('common.details')}</h3>
                        <InfoRow label={t('pages.products.sku')} value={product.sku} tabular />
                        <InfoRow label={t('pages.products.barcode')} value={product.barcode ?? '—'} tabular />
                        <InfoRow label={t('pages.products.category')} value={product.category?.name ?? '—'} />
                        <InfoRow label={t('pages.products.unit')} value={product.unit?.name ?? '—'} />
                        <InfoRow label={t('pages.products.purchase_price')} value={fmtMoney(product.purchase_price)} tabular />
                        <InfoRow label={t('pages.products.sale_price')} value={fmtMoney(product.sale_price)} tabular />
                        <InfoRow label={t('pages.products.min_stock')} value={fmtNumber(product.min_stock)} tabular />
                    </Card>

                    <Card className="bg-canvas-soft">
                        <p className="text-[12px] uppercase tracking-wide text-ink-mute">{t('pages.products.total_stock')}</p>
                        <p className="display-lg mt-1 text-ink tabular">{fmtNumber(totalQty)}</p>
                        <Badge
                            tone={
                                product.status === 'inactive'
                                    ? 'neutral'
                                    : totalQty === 0
                                      ? 'danger'
                                      : totalQty < Number(product.min_stock)
                                        ? 'warning'
                                        : 'success'
                            }
                        >
                            {t('pages.products.in_stock')}
                        </Badge>
                    </Card>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}