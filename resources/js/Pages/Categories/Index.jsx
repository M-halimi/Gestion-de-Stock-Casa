import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import DataTable from '@/Components/ui/DataTable';
import DeleteModal from '@/Components/shared/DeleteModal';
import PageHeader from '@/Components/ui/PageHeader';
import SearchInput from '@/Components/ui/SearchInput';
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

    const [deleteTarget, setDeleteTarget] = useState(null);

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.categories.title')}</h2>}>
            <Head title={t('pages.categories.title')} />

            <PageHeader
                title={t('pages.categories.title')}
                subtitle={t('pages.categories.subtitle')}
                actions={
                    canCreate && (
                        <Button href={route('categories.create')}>{t('common.create')}</Button>
                    )
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
                                  <div className="flex justify-end gap-1">
                                      {canEdit && (
                                          <Button size="sm" variant="ghost" href={route('categories.edit', category.id)}>
                                              {t('common.edit')}
                                          </Button>
                                      )}
                                      {canDelete && (
                                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(category)}>
                                              {t('common.delete')}
                                          </Button>
                                      )}
                                  </div>
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