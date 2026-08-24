import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import DeleteModal from '@/Components/shared/DeleteModal';
import PageHeader from '@/Components/ui/PageHeader';
import SearchInput from '@/Components/ui/SearchInput';
import TableActions from '@/Components/ui/TableActions';
import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function CategoriesIndex({ categories, filters }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const canCreate = permissions.includes('create_categories');
    const canEdit = permissions.includes('edit_categories');
    const canDelete = permissions.includes('delete_categories');
    const canExport = permissions.includes('export_data');
    const canImport = permissions.includes('import_data');

    const [deleteTarget, setDeleteTarget] = useState(null);

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.categories.title')}</h2>}>
            <Head title={t('pages.categories.title')} />

            <PageHeader
                title={t('pages.categories.title')}
                subtitle={t('pages.categories.subtitle')}
                actions={
                    <div className="flex items-center gap-2">
                        {canImport && (
                            <Button
                                variant="secondary"
                                href={route('imports.create', 'categories')}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                </svg>
                                Importer
                            </Button>
                        )}
                        {canExport && (
                            <Button
                                variant="secondary"
                                external
                                href={route('exports.download', { type: 'categories', ...filters })}
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Exporter CSV
                            </Button>
                        )}
                        {canCreate && (
                            <Button href={route('categories.create')}>{t('common.create')}</Button>
                        )}
                    </div>
                }
            />

            <Card className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
                    <SearchInput
                        placeholder={t('pages.categories.search_placeholder')}
                        className="w-full max-w-sm"
                    />
                </div>

                <DataTable
                    columns={[
                        { key: 'name', label: t('pages.categories.name'), render: (c) => <span className="font-normal text-ink">{c.name}</span> },
                        { key: 'description', label: t('pages.categories.description'), render: (c) => c.description ?? <span className="text-ink-mute">—</span> },
                        { key: 'products_count', label: t('pages.categories.products_count'), className: 'text-end', cellClass: 'text-end', tabular: true, render: (c) => c.products_count },
                    ]}
                    rows={categories.data}
                    empty={{
                        title: t('common.no_results'),
                        description: t('common.no_results_description'),
                        pagination: categories,
                    }}
                    actions={
                        canEdit || canDelete
                            ? (category) => (
                                  <TableActions
                                      editHref={canEdit ? route('categories.edit', category.id) : null}
                                      onDelete={canDelete ? () => setDeleteTarget(category) : null}
                                  />
                              )
                            : undefined
                    }
                />
            </Card>

            <DeleteModal
                show={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                href={deleteTarget ? route('categories.destroy', deleteTarget.id) : '#'}
                name={deleteTarget?.name}
            />
        </AuthenticatedLayout>
    );
}
