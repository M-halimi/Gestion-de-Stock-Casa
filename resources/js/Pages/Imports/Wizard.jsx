import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import BackButton from '@/Components/ui/BackButton';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import PageHeader from '@/Components/ui/PageHeader';
import Badge from '@/Components/ui/Badge';
import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const STEPS = ['upload', 'mapping', 'preview', 'import', 'result'];

export default function ImportWizard({ importData, type, columns }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const [step, setStep] = useState(importData?.status === 'parsed' ? 'mapping' : 'upload');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [importResult, setImportResult] = useState(null);
    const [currentImport, setCurrentImport] = useState(importData ?? null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [columnMappings, setColumnMappings] = useState(importData?.column_mappings ?? {});
    const [duplicateStrategy, setDuplicateStrategy] = useState('skip');
    const [previewData, setPreviewData] = useState(null);
    const [rawHeaders, setRawHeaders] = useState([]);

    const stepIndex = STEPS.indexOf(step);
    const dbColumns = useMemo(() => columns ?? [], [columns]);

    const invertedMapping = useMemo(() => {
        const map = {};
        Object.entries(columnMappings).forEach(([fieldKey, headerIndex]) => {
            if (headerIndex !== null && headerIndex !== undefined) {
                map[headerIndex] = fieldKey;
            }
        });
        return map;
    }, [columnMappings]);

    const headerRows = useMemo(() => {
        if (!rawHeaders || rawHeaders.length === 0) return [];
        return rawHeaders.map((headerName, index) => ({
            headerName,
            headerIndex: index,
            fieldKey: invertedMapping[index] || null,
        }));
    }, [rawHeaders, invertedMapping]);

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    const apiHeaders = useCallback((json = false) => {
        const h = {
            'X-Requested-With': 'XMLHttpRequest',
            'X-XSRF-TOKEN': csrfToken,
        };
        if (json) h['Content-Type'] = 'application/json';
        return h;
    }, [csrfToken]);

    const uploadFile = useCallback(async (file) => {
        setLoading(true);
        setError(null);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        try {
            const response = await fetch(route('imports.upload'), {
                method: 'POST',
                headers: apiHeaders(),
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || t('pages.imports.errors.upload_failed'));
            }

            if (data.import?.status === 'parsed') {
                setCurrentImport(data.import);
                setColumnMappings(data.import.column_mappings ?? {});
                setRawHeaders(data.preview?.headers ?? data.preview?.raw_headers ?? []);
                setPreviewData(data.preview ?? null);
                setSelectedFile(file);
                setStep('mapping');
            } else {
                throw new Error('Upload succeeded but parsing did not complete.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [type, t, apiHeaders]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) uploadFile(file);
    }, [uploadFile]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDragActive(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragActive(false);
    }, []);

    const handleFileSelect = useCallback((e) => {
        const file = e.target.files?.[0];
        if (file) uploadFile(file);
    }, [uploadFile]);

    const handleMappingChange = useCallback((headerIndex, newFieldKey) => {
        setColumnMappings((prev) => {
            const updated = { ...prev };
            Object.entries(updated).forEach(([key, val]) => {
                if (val === headerIndex) {
                    updated[key] = null;
                }
            });
            if (newFieldKey) {
                updated[newFieldKey] = headerIndex;
            }
            return updated;
        });
    }, []);

    const handlePreview = useCallback(async () => {
        if (!currentImport?.id) {
            setError(t('pages.imports.errors.upload_failed'));
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(route('imports.preview', currentImport.id), {
                method: 'POST',
                headers: apiHeaders(true),
                body: JSON.stringify({ column_mappings: columnMappings }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Preview failed');
            }
            setPreviewData(data.preview);
            if (data.preview?.raw_headers) {
                setRawHeaders(data.preview.raw_headers);
            }
            setStep('preview');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [currentImport, columnMappings, apiHeaders, t]);

    const handleExecute = useCallback(async () => {
        if (!currentImport?.id) {
            setError(t('pages.imports.errors.upload_failed'));
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(route('imports.execute', currentImport.id), {
                method: 'POST',
                headers: apiHeaders(true),
                body: JSON.stringify({
                    column_mappings: columnMappings,
                    duplicate_strategy: duplicateStrategy,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || t('pages.imports.errors.upload_failed'));
            }
            setImportResult(data);
            setStep('result');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [currentImport, columnMappings, duplicateStrategy, apiHeaders, t]);

    const mappedPreviewHeaders = useMemo(() => {
        return dbColumns.filter((col) => columnMappings[col.key] !== null && columnMappings[col.key] !== undefined);
    }, [columnMappings, dbColumns]);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="heading-md text-ink">
                    {t('pages.imports.wizard_title', { type: t(`pages.imports.types.${type}.title`) })}
                </h2>
            }
        >
            <Head title={t('pages.imports.wizard_title', { type: t(`pages.imports.types.${type}.title`) })} />

            <PageHeader
                title={t('pages.imports.wizard_title', { type: t(`pages.imports.types.${type}.title`) })}
                subtitle={t(`pages.imports.types.${type}.description`)}
                actions={
                    <Button variant="ghost" size="sm" onClick={() => router.get(route('imports.index'))}>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                        {t('common.back')}
                    </Button>
                }
            />

            <div className="mb-8">
                <div className="flex items-center">
                    {STEPS.map((s, i) => {
                        const isCompleted = i < stepIndex;
                        const isCurrent = i === stepIndex;
                        return (
                            <div key={s} className="flex items-center">
                                <div className="flex items-center gap-2">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold transition ${isCompleted ? 'bg-success text-white' : isCurrent ? 'bg-primary text-white' : 'bg-canvas-soft text-ink-mute border border-hairline'}`}>
                                        {isCompleted ? (
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                            </svg>
                                        ) : (
                                            i + 1
                                        )}
                                    </div>
                                    <span className={`hidden text-[13px] font-medium sm:inline ${isCurrent ? 'text-ink' : 'text-ink-mute'}`}>
                                        {t(`pages.imports.steps.${s}`)}
                                    </span>
                                </div>
                                {i < STEPS.length - 1 && (
                                    <div className={`mx-3 h-px w-8 sm:w-12 ${isCompleted ? 'bg-success' : 'bg-hairline'}`} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {error && (
                <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-[14px] text-destructive">
                    {error}
                </div>
            )}

            {step === 'upload' && (
                <Card>
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition ${dragActive ? 'border-primary bg-primary/5' : 'border-hairline hover:border-primary/50 hover:bg-canvas-soft'}`}
                    >
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                        </div>
                        <p className="text-[15px] font-medium text-ink">{t('pages.imports.upload.drop_here')}</p>
                        <p className="mt-1 text-[13px] text-ink-mute">{t('pages.imports.upload.file_types')}</p>
                        <Button variant="secondary" size="sm" className="mt-4" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                            {t('pages.imports.upload.select_file')}
                        </Button>
                        <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                    </div>
                </Card>
            )}

            {step === 'mapping' && (
                <Card title={t('pages.imports.mapping.title')} subtitle={t('pages.imports.mapping.subtitle')}>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-hairline">
                            <thead className="bg-canvas-soft">
                                <tr>
                                    <th className="px-4 py-3 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">{t('pages.imports.mapping.file_column')}</th>
                                    <th className="px-4 py-3 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">{t('pages.imports.mapping.sample')}</th>
                                    <th className="px-4 py-3 text-start text-[12px] font-normal uppercase tracking-wide text-ink-mute">{t('pages.imports.mapping.maps_to')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-hairline">
                                {headerRows.map(({ headerName, headerIndex, fieldKey }) => (
                                    <tr key={headerIndex} className="transition hover:bg-canvas-soft">
                                        <td className="px-4 py-3 text-[14px] font-medium text-ink">{headerName}</td>
                                        <td className="px-4 py-3 text-[13px] text-ink-mute">
                                            {previewData?.rows?.[0]?.[headerIndex] ?? '\u2014'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                value={fieldKey ?? ''}
                                                onChange={(e) => handleMappingChange(headerIndex, e.target.value || null)}
                                                className="h-9 rounded-md border-hairline-input bg-canvas px-3 text-[13px] text-ink focus:border-primary focus:ring-1 focus:ring-primary/30"
                                            >
                                                <option value="">{t('pages.imports.mapping.skip')}</option>
                                                {dbColumns.map((col) => (
                                                    <option key={col.key} value={col.key}>{col.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 flex items-center justify-end gap-3">
                        <BackButton size="sm" onClick={() => setStep('upload')}>{t('common.back')}</BackButton>
                        <Button variant="primary" size="sm" onClick={handlePreview} disabled={loading}>
                            {loading ? t('common.loading') : t('pages.imports.mapping.preview_button')}
                        </Button>
                    </div>
                </Card>
            )}

            {step === 'preview' && previewData && (
                <Card title={t('pages.imports.preview.title')} subtitle={t('pages.imports.preview.subtitle')}>
                    <div className="mb-4 flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 rounded-lg border border-hairline bg-canvas-soft px-4 py-2.5">
                            <span className="text-[13px] text-ink-mute">{t('pages.imports.preview.total')}</span>
                            <span className="text-[15px] font-semibold text-ink">{previewData.total_rows ?? 0}</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-2.5">
                            <span className="text-[13px] text-success">{t('pages.imports.preview.valid')}</span>
                            <span className="text-[15px] font-semibold text-success">{previewData.valid_rows ?? 0}</span>
                        </div>
                        {(previewData.error_rows ?? 0) > 0 && (
                            <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5">
                                <span className="text-[13px] text-destructive">{t('pages.imports.preview.errors')}</span>
                                <span className="text-[15px] font-semibold text-destructive">{previewData.error_rows}</span>
                            </div>
                        )}
                        {(previewData.warning_rows ?? 0) > 0 && (
                            <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5">
                                <span className="text-[13px] text-warning">{t('pages.imports.preview.warnings')}</span>
                                <span className="text-[15px] font-semibold text-warning">{previewData.warning_rows}</span>
                            </div>
                        )}
                    </div>

                    {previewData.rows && previewData.rows.length > 0 && (
                        <div className="overflow-x-auto rounded-lg border border-hairline">
                            <table className="min-w-full divide-y divide-hairline">
                                <thead className="bg-canvas-soft">
                                    <tr>
                                        <th className="px-4 py-2.5 text-start text-[11px] font-normal uppercase text-ink-mute">#</th>
                                        {mappedPreviewHeaders.map((col) => (
                                            <th key={col.key} className="px-4 py-2.5 text-start text-[11px] font-normal uppercase text-ink-mute">{col.name}</th>
                                        ))}
                                        <th className="px-4 py-2.5 text-start text-[11px] font-normal uppercase text-ink-mute">{t('pages.imports.preview.status')}</th>
                                        <th className="px-4 py-2.5 text-start text-[11px] font-normal uppercase text-ink-mute">{t('pages.imports.preview.errors')}</th>
                                        <th className="px-4 py-2.5 text-start text-[11px] font-normal uppercase text-ink-mute">{t('pages.imports.preview.warnings')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-hairline">
                                    {previewData.rows.slice(0, 50).map((row, i) => (
                                        <tr key={i} className="transition hover:bg-canvas-soft">
                                            <td className="px-4 py-2 text-[13px] text-ink-mute">{row.row ?? i + 1}</td>
                                            {mappedPreviewHeaders.map((col) => (
                                                <td key={col.key} className="px-4 py-2 text-[13px] text-ink-secondary">{row.data?.[col.key] ?? '\u2014'}</td>
                                            ))}
                                            <td className="px-4 py-2">
                                                {(row.errors?.length ?? 0) > 0 ? (
                                                    <Badge tone="danger">{t('pages.imports.preview.error')}</Badge>
                                                ) : (row.warnings?.length ?? 0) > 0 ? (
                                                    <Badge tone="warning">{t('pages.imports.preview.warning')}</Badge>
                                                ) : (
                                                    <Badge tone="success">{t('pages.imports.preview.ok')}</Badge>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-[12px] text-destructive">
                                                {(row.errors ?? []).map((item) => item.message).join(' ') || '\u2014'}
                                            </td>
                                            <td className="px-4 py-2 text-[12px] text-warning">
                                                {(row.warnings ?? []).map((item) => item.message).join(' ') || '\u2014'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {previewData.rows.length > 50 && (
                                <div className="px-4 py-2.5 text-center text-[13px] text-ink-mute">
                                    {t('pages.imports.preview.showing_first', { count: 50 })}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-4 flex items-center justify-end gap-3">
                        <BackButton size="sm" onClick={() => setStep('mapping')}>{t('common.back')}</BackButton>
                        <Button variant="primary" size="sm" onClick={() => setStep('import')} disabled={(previewData.valid_rows ?? 0) === 0}>
                            {t('pages.imports.preview.continue')}
                        </Button>
                    </div>
                </Card>
            )}

            {step === 'import' && (
                <Card title={t('pages.imports.confirm.title')} subtitle={t('pages.imports.confirm.subtitle')}>
                    <div className="space-y-6">
                        <div className="rounded-lg border border-hairline bg-canvas-soft p-4">
                            <p className="text-[14px] text-ink">
                                {t('pages.imports.confirm.ready_message', {
                                    count: previewData?.valid_rows ?? 0,
                                    type: t(`pages.imports.types.${type}.title`),
                                })}
                            </p>
                            {(previewData?.error_rows ?? 0) > 0 && (
                                <p className="mt-1 text-[13px] text-destructive">
                                    {t('pages.imports.confirm.has_errors', { count: previewData.error_rows })}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-2 block text-[13px] font-medium text-ink">{t('pages.imports.confirm.duplicate_strategy')}</label>
                            <div className="space-y-2">
                                {[
                                    { value: 'skip', label: t('pages.imports.confirm.strategy_skip') },
                                    { value: 'update', label: t('pages.imports.confirm.strategy_update') },
                                    { value: 'create_both', label: t('pages.imports.confirm.strategy_create_both') },
                                ].map((opt) => (
                                    <label key={opt.value} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${duplicateStrategy === opt.value ? 'border-primary bg-primary/5' : 'border-hairline hover:bg-canvas-soft'}`}>
                                        <input type="radio" name="duplicate_strategy" value={opt.value} checked={duplicateStrategy === opt.value} onChange={(e) => setDuplicateStrategy(e.target.value)} className="h-4 w-4 text-primary focus:ring-primary" />
                                        <span className="text-[14px] text-ink">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <BackButton size="sm" onClick={() => setStep('preview')}>{t('common.back')}</BackButton>
                            <Button variant="primary" size="md" onClick={handleExecute} disabled={loading}>
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        {t('pages.imports.confirm.importing')}
                                    </span>
                                ) : (
                                    t('pages.imports.confirm.execute')
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {step === 'result' && importResult && (
                <Card title={t('pages.imports.result.title')}>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
                                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-[16px] font-semibold text-ink">{t('pages.imports.result.success_title')}</h3>
                                <p className="text-[14px] text-ink-mute">{t('pages.imports.result.success_message')}</p>
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-4">
                            <div className="rounded-lg border border-hairline bg-canvas-soft p-4 text-center">
                                <div className="text-[24px] font-bold text-ink">{importResult.imported ?? 0}</div>
                                <div className="text-[13px] text-ink-mute">{t('pages.imports.result.imported')}</div>
                            </div>
                            <div className="rounded-lg border border-hairline bg-canvas-soft p-4 text-center">
                                <div className="text-[24px] font-bold text-success">{importResult.updated ?? 0}</div>
                                <div className="text-[13px] text-ink-mute">{t('pages.imports.result.updated')}</div>
                            </div>
                            <div className="rounded-lg border border-hairline bg-canvas-soft p-4 text-center">
                                <div className="text-[24px] font-bold text-warning">{importResult.skipped ?? 0}</div>
                                <div className="text-[13px] text-ink-mute">{t('pages.imports.result.skipped')}</div>
                            </div>
                            <div className="rounded-lg border border-hairline bg-canvas-soft p-4 text-center">
                                <div className="text-[24px] font-bold text-destructive">{importResult.failed ?? 0}</div>
                                <div className="text-[13px] text-ink-mute">{t('pages.imports.result.failed')}</div>
                            </div>
                        </div>

                        {importResult.errors && importResult.errors.length > 0 && (
                            <div>
                                <h4 className="mb-2 text-[14px] font-medium text-ink">{t('pages.imports.result.error_details')}</h4>
                                <div className="max-h-60 overflow-y-auto rounded-lg border border-hairline">
                                    <table className="min-w-full divide-y divide-hairline">
                                        <thead className="bg-canvas-soft sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-start text-[11px] font-normal uppercase text-ink-mute">{t('pages.imports.result.row')}</th>
                                                <th className="px-3 py-2 text-start text-[11px] font-normal uppercase text-ink-mute">{t('pages.imports.result.error')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-hairline">
                                            {importResult.errors.map((err, i) => (
                                                <tr key={i} className="hover:bg-canvas-soft">
                                                    <td className="px-3 py-2 text-[13px] text-ink-secondary">{err.row ?? i + 1}</td>
                                                    <td className="px-3 py-2 text-[13px] text-destructive">{err.message}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3">
                            <Button variant="ghost" size="sm" onClick={() => router.get(route('imports.index'))}>{t('pages.imports.result.back_to_center')}</Button>
                            <Button variant="secondary" size="sm" onClick={() => router.get(route('imports.history'))}>{t('pages.imports.result.view_history')}</Button>
                        </div>
                    </div>
                </Card>
            )}
        </AuthenticatedLayout>
    );
}
