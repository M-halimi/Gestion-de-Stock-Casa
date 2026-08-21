import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import PageHeader from '@/Components/ui/PageHeader';
import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

export default function UnitsCreate() {
    const { t } = useTranslation();
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        abbreviation: '',
    });

    return (
        <AuthenticatedLayout header={<h2 className="heading-md text-ink">{t('pages.units.create_title')}</h2>}>
            <Head title={t('pages.units.create_title')} />

            <PageHeader
                title={t('pages.units.create_title')}
                actions={
                    <>
                        <Button variant="ghost" href={route('units.index')}>
                            {t('common.back')}
                        </Button>
                        <Button onClick={() => post(route('units.store'))} disabled={processing}>
                            {t('common.save')}
                        </Button>
                    </>
                }
            />

            <Card className="max-w-xl">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        post(route('units.store'));
                    }}
                    className="space-y-5"
                >
                    <Input
                        id="name"
                        label={t('pages.units.name')}
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        error={errors.name}
                        autoFocus
                    />
                    <Input
                        id="abbreviation"
                        label={t('pages.units.abbreviation')}
                        value={data.abbreviation}
                        onChange={(e) => setData('abbreviation', e.target.value)}
                        error={errors.abbreviation}
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