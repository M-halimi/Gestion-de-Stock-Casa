import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import PageHeader from '@/Components/ui/PageHeader';
import Pagination from '@/Components/ui/Pagination';
import { Head, Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

const statusTones = {
    pending: 'warning',
    parsing: 'info',
    parsed: 'info',
    mapping: 'info',
    importing: 'primary',
    completed: 'success',
    failed: 'danger',
    partially_completed: 'warning',
};

export default function ImportsHistory({ imports }) {
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
                    {t('pages.imports.history_page.title')}
                </h2>
            }
        >
            <Head title={t('pages.imports.history_page.title')} />

            <PageHeader
                title={t('pages.imports.history_page.title')}
                subtitle={t('pages.imports.history_page.subtitle')}
                actions={
                    <Button href={route('imports.index')} variant="secondary" size="sm">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        {t('pages.imports.history_page.new_import')}
                    </Button>
                }
            />

            <Card flush>
                <DataTable
                    columns={[
                        {
                            key: 'reference',
                            label: t('pages.imports.history_page.reference'),
                            render: (row) => (
                                <span className="font-medium text-ink tabular">{row.reference}</span>
                            ),
                        },
                        {
                            key: 'type',
                            label: t('pages.imports.history_page.type'),
                            render: (row) => (
                                <Badge tone="primary">
                                    {t(`pages.imports.types.${row.type}.title`, row.type)}
                                </Badge>
                            ),
                        },
                        {
                            key: 'file_name',
                            label: t('pages.imports.history_page.file'),
                            render: (row) => (
                                <span className="text-ink-secondary">{row.file_name}</span>
                            ),
                        },
                        {
                            key: 'status',
                            label: t('pages.imports.history_page.status'),
                            render: (row) => (
                                <Badge tone={statusTones[row.status] ?? 'neutral'}>
                                    {t(`pages.imports.status.${row.status}`, row.status)}
                                </Badge>
                            ),
                        },
                        {
                            key: 'rows',
                            label: t('pages.imports.history_page.rows'),
                            render: (row) => (
                                <div className="flex items-center gap-2 text-[13px] tabular">
                                    <span className="text-ink-secondary">{row.total_rows ?? 0}</span>
                                    <span className="text-ink-mute">/</span>
                                    <span className="text-success">{row.success_rows ?? 0}</span>
                                    <span className="text-ink-mute">/</span>
                                    <span className="text-destructive">{row.failed_rows ?? 0}</span>
                                </div>
                            ),
                        },
                        {
                            key: 'created_by',
                            label: t('pages.imports.history_page.created_by'),
                            render: (row) => (
                                <span className="text-ink-secondary">{row.created_by?.name ?? '—'}</span>
                            ),
                        },
                        {
                            key: 'created_at',
                            label: t('pages.imports.history_page.date'),
                            render: (row) => (
                                <span className="text-ink-mute">{formatDate(row.created_at)}</span>
                            ),
                        },
                    ]}
                    rows={imports.data}
                    empty={{
                        title: t('pages.imports.history_page.no_imports'),
                        description: t('pages.imports.history_page.no_imports_description'),
                    }}
                    actions={(row) => (
                        <div className="flex items-center justify-end gap-1.5">
                            {(row.failed_rows ?? 0) > 0 && (
                                <Link
                                    href={route('imports.errors', row.id)}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-[12px] font-medium text-destructive transition hover:bg-destructive/20"
                                >
                                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                    </svg>
                                    {t('pages.imports.history_page.view_errors')}
                                </Link>
                            )}
                        </div>
                    )}
                />
                {imports.last_page > 1 && (
                    <div className="border-t border-hairline">
                        <Pagination meta={imports} />
                    </div>
                )}
            </Card>
        </AuthenticatedLayout>
    );
}
