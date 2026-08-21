import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import PageHeader from '@/Components/ui/PageHeader';
import Select from '@/Components/ui/Select';
import TextArea from '@/Components/ui/TextArea';
import { IconBuilding, IconGlobe, IconMoney, IconNote } from '@/Components/ui/FormIcons';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function SettingsIndex({ settings, currencies }) {
    const { t } = useTranslation();
    const { data, setData, put, processing, errors } = useForm({
        company_name: settings.company_name,
        currency_code: settings.currency_code,
        currency_symbol: settings.currency_symbol,
        invoice_footer: settings.invoice_footer ?? '',
    });

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.settings.title')}</h2>}>
            <Head title={t('pages.settings.title')} />

            <PageHeader title={t('pages.settings.title')} subtitle={t('pages.settings.subtitle')} />

            <div className="max-w-2xl">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        put(route('settings.update'));
                    }}
                    className="space-y-8"
                >
                    <Card>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                            <Input
                                id="company_name"
                                label={t('pages.settings.company_name')}
                                value={data.company_name}
                                onChange={(e) => setData('company_name', e.target.value)}
                                error={errors.company_name}
                                icon={<IconBuilding />}
                                autoFocus
                            />
                            <Select
                                id="currency_code"
                                label={t('pages.settings.currency_code')}
                                value={data.currency_code}
                                onChange={(e) => {
                                    setData('currency_code', e.target.value);
                                    setData('currency_symbol', currencies[e.target.value] ?? data.currency_symbol);
                                }}
                                error={errors.currency_code}
                                icon={<IconGlobe />}
                                options={Object.entries(currencies).map(([code, symbol]) => ({
                                    value: code,
                                    label: `${code} (${symbol})`,
                                }))}
                            />
                            <Input
                                id="currency_symbol"
                                label={t('pages.settings.currency_symbol')}
                                value={data.currency_symbol}
                                onChange={(e) => setData('currency_symbol', e.target.value)}
                                error={errors.currency_symbol}
                                icon={<IconMoney />}
                            />
                            <div className="md:col-span-2">
                                <TextArea
                                    id="invoice_footer"
                                    label={t('pages.settings.invoice_footer')}
                                    value={data.invoice_footer}
                                    onChange={(e) => setData('invoice_footer', e.target.value)}
                                    error={errors.invoice_footer}
                                    placeholder={t('pages.settings.invoice_footer_placeholder')}
                                    icon={<IconNote />}
                                />
                            </div>
                        </div>
                    </Card>

                    <div className="flex justify-end gap-2">
                        <Button type="submit" variant="primary" disabled={processing}>
                            {t('common.save')}
                        </Button>
                    </div>
                </form>
            </div>
        </AuthenticatedLayout>
    );
}