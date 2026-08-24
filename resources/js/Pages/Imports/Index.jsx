import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import PageHeader from '@/Components/ui/PageHeader';
import { Head, Link, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

const importTypes = [
    {
        key: 'products',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
        ),
    },
    {
        key: 'customers',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
        ),
    },
    {
        key: 'suppliers',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
            </svg>
        ),
    },
    {
        key: 'categories',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
        ),
    },
    {
        key: 'units',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
        ),
    },
    {
        key: 'warehouses',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
        ),
    },
    {
        key: 'initial_stock',
        icon: (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
        ),
    },
];

const statusColors = {
    pending: 'bg-warning-soft text-warning',
    parsing: 'bg-info-soft text-info',
    parsed: 'bg-info-soft text-info',
    mapping: 'bg-info-soft text-info',
    importing: 'bg-primary-soft text-primary',
    completed: 'bg-success-soft text-success',
    failed: 'bg-destructive-soft text-destructive',
    partially_completed: 'bg-warning-soft text-warning',
};

export default function ImportsIndex({ lastImports = {} }) {
    const { t } = useTranslation();

    const formatDate = (date) => {
        if (!date) return null;
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
                    {t('pages.imports.title')}
                </h2>
            }
        >
            <Head title={t('pages.imports.title')} />

            <PageHeader
                title={t('pages.imports.title')}
                subtitle={t('pages.imports.subtitle')}
                actions={
                    <Link
                        href={route('imports.history')}
                        className="inline-flex items-center gap-2 rounded-md border border-hairline-input bg-canvas px-4 py-2 text-[14px] font-medium text-ink-secondary transition hover:bg-canvas-soft hover:text-ink"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {t('pages.imports.history')}
                    </Link>
                }
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {importTypes.map((item) => {
                    const last = lastImports[item.key];
                    return (
                        <div
                            key={item.key}
                            className="group relative flex flex-col rounded-xl border border-hairline bg-canvas shadow-level-1 transition hover:shadow-level-2 hover:border-primary/30"
                        >
                            <div className="flex flex-1 flex-col p-5">
                                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-soft text-primary">
                                    {item.icon}
                                </div>
                                <h3 className="heading-sm text-ink">
                                    {t(`pages.imports.types.${item.key}.title`)}
                                </h3>
                                <p className="mt-1 text-[13px] leading-relaxed text-ink-mute">
                                    {t(`pages.imports.types.${item.key}.description`)}
                                </p>

                                {last && (
                                    <div className="mt-4 rounded-lg border border-hairline bg-canvas-soft p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[12px] text-ink-mute">
                                                {t('pages.imports.last_import')}
                                            </span>
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusColors[last.status] ?? 'bg-canvas-cream text-ink-mute2'}`}>
                                                {t(`pages.imports.status.${last.status}`, last.status)}
                                            </span>
                                        </div>
                                        <div className="mt-1 text-[12px] text-ink-secondary">
                                            {formatDate(last.created_at)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 border-t border-hairline p-4">
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => router.get(route('imports.create', { type: item.key }))}
                                >
                                    {t('pages.imports.import_button')}
                                </Button>
                                <a
                                    href={route('imports.template', item.key)}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-hairline-input bg-canvas px-3 py-1.5 text-[13px] font-medium text-ink-secondary transition hover:bg-canvas-soft hover:text-ink"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                    {t('pages.imports.download_template')}
                                </a>
                            </div>
                        </div>
                    );
                })}
            </div>
        </AuthenticatedLayout>
    );
}
