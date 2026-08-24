import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import PageHeader from '@/Components/ui/PageHeader';
import { Head, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function ImportErrors({ importData, errors }) {
    const { t } = useTranslation();

    const formatDate = (date) => {
        if (!date) return '—';
        return new Intl.DateTimeFormat(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(date));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="heading-md text-ink">
                    {t('pages.imports.errors_page.title')}
                </h2>
            }
        >
            <Head title={t('pages.imports.errors_page.title')} />

            <PageHeader
                title={t('pages.imports.errors_page.title')}
                subtitle={t('pages.imports.errors_page.subtitle')}
                actions={
                    <div className="flex items-center gap-2">
                        <a
                            href={route('imports.errors.csv', importData.id)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-hairline-input bg-canvas px-3 py-2 text-[13px] font-medium text-ink-secondary transition hover:bg-canvas-soft hover:text-ink"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                            {t('pages.imports.errors_page.download_csv')}
                        </a>
                        <Link
                            href={route('imports.history')}
                            className="inline-flex items-center gap-1.5 rounded-md border border-hairline-input bg-canvas px-3 py-2 text-[13px] font-medium text-ink-secondary transition hover:bg-canvas-soft hover:text-ink"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                            </svg>
                            {t('pages.imports.errors_page.back_to_history')}
                        </Link>
                    </div>
                }
            />

            {/* Import Summary */}
            <Card className="mb-6">
                <div className="flex flex-wrap items-center gap-6">
                    <div>
                        <span className="text-[12px] uppercase text-ink-mute">{t('pages.imports.errors_page.reference')}</span>
                        <div className="mt-0.5 text-[15px] font-medium text-ink tabular">{importData.reference}</div>
                    </div>
                    <div>
                        <span className="text-[12px] uppercase text-ink-mute">{t('pages.imports.errors_page.type')}</span>
                        <div className="mt-0.5">
                            <Badge tone="primary">
                                {t(`pages.imports.types.${importData.type}.title`, importData.type)}
                            </Badge>
                        </div>
                    </div>
                    <div>
                        <span className="text-[12px] uppercase text-ink-mute">{t('pages.imports.errors_page.file')}</span>
                        <div className="mt-0.5 text-[15px] text-ink-secondary">{importData.file_name}</div>
                    </div>
                    <div>
                        <span className="text-[12px] uppercase text-ink-mute">{t('pages.imports.errors_page.status')}</span>
                        <div className="mt-0.5">
                            <Badge tone={importData.status === 'failed' ? 'danger' : 'warning'}>
                                {t(`pages.imports.status.${importData.status}`, importData.status)}
                            </Badge>
                        </div>
                    </div>
                    <div>
                        <span className="text-[12px] uppercase text-ink-mute">{t('pages.imports.errors_page.date')}</span>
                        <div className="mt-0.5 text-[14px] text-ink-secondary">{formatDate(importData.created_at)}</div>
                    </div>
                </div>
            </Card>

            {/* Errors Table */}
            <Card flush>
                <DataTable
                    columns={[
                        {
                            key: 'row',
                            label: t('pages.imports.errors_page.row'),
                            render: (err) => (
                                <span className="font-medium text-ink tabular">{err.row}</span>
                            ),
                        },
                        {
                            key: 'field',
                            label: t('pages.imports.errors_page.field'),
                            render: (err) => (
                                <span className="text-ink-secondary">{err.field ?? '—'}</span>
                            ),
                        },
                        {
                            key: 'value',
                            label: t('pages.imports.errors_page.value'),
                            render: (err) => (
                                <span className="text-ink-secondary font-mono text-[13px]">{err.value ?? '—'}</span>
                            ),
                        },
                        {
                            key: 'message',
                            label: t('pages.imports.errors_page.error_message'),
                            render: (err) => (
                                <span className="text-destructive">{err.message}</span>
                            ),
                        },
                    ]}
                    rows={errors}
                    empty={{
                        title: t('pages.imports.errors_page.no_errors'),
                        description: t('pages.imports.errors_page.no_errors_description'),
                    }}
                />
            </Card>
        </AuthenticatedLayout>
    );
}
