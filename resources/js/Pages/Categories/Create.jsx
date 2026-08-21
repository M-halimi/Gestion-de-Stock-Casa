import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import PageHeader from '@/Components/ui/PageHeader';
import TextArea from '@/Components/ui/TextArea';
import { IconNote, IconTag } from '@/Components/ui/FormIcons';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function CategoriesCreate() {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
    });

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.categories.create_title')}</h2>}>
            <Head title={t('pages.categories.create_title')} />

            <PageHeader
                title={t('pages.categories.create_title')}
                actions={
                    <>
                        <Button variant="ghost" href={route('categories.index')}>
                            {t('common.back')}
                        </Button>
                        <Button onClick={() => post(route('categories.store'))} disabled={processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            />

            <Card className="max-w-xl">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        post(route('categories.store'));
                    }}
                    className="space-y-5"
                >
                    <Input
                        id="name"
                        label={t('pages.categories.name')}
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        error={errors.name}
                        icon={<IconTag />}
                        autoFocus
                    />
                    <TextArea
                        id="description"
                        label={t('pages.categories.description')}
                        value={data.description}
                        onChange={(e) => setData('description', e.target.value)}
                        error={errors.description}
                        icon={<IconNote />}
                    />
                    <div className="flex justify-end gap-2">
                        <Button type="submit" variant="primary" disabled={processing}>
                            {t('common.save')}
                        </Button>
                    </div>
                </form>
            </Card>
        </AuthenticatedLayout>
    );
}