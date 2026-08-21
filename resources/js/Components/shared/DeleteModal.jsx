import { router } from '@inertiajs/react';
import Modal from '@/Components/ui/Modal';
import { useTranslation } from 'react-i18next';

export default function DeleteModal({ show, onClose, href, name }) {
    const { t } = useTranslation();

    const handleConfirm = () => {
        router.delete(href, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    return (
        <Modal
            show={show}
            title={t('common.confirm_delete_title')}
            confirmLabel={t('common.delete')}
            cancelLabel={t('common.cancel')}
            onConfirm={handleConfirm}
            onCancel={onClose}
        >
            <p>
                {t('common.confirm_delete_message')}
                {name && (
                    <>
                        {' '}
                        <strong>« {name} »</strong>
                    </>
                )}
            </p>
        </Modal>
    );
}