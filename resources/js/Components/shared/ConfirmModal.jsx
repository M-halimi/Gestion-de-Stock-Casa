import { router } from '@inertiajs/react';
import Modal from '@/Components/ui/Modal';
import { useTranslation } from 'react-i18next';

export default function ConfirmModal({ show, onClose, title, message, href, method = 'delete', confirmVariant = 'danger' }) {
    const { t } = useTranslation();

    const handleConfirm = () => {
        const options = { preserveScroll: true, onSuccess: () => onClose() };

        if (method === 'post') {
            router.post(href, {}, options);
        } else if (method === 'put') {
            router.put(href, {}, options);
        } else {
            router.delete(href, options);
        }
    };

    return (
        <Modal
            show={show}
            title={title ?? t('common.confirm_delete_title')}
            confirmLabel={t('common.confirm')}
            cancelLabel={t('common.cancel')}
            onConfirm={handleConfirm}
            onCancel={onClose}
            confirmVariant={confirmVariant}
        >
            <p>{message ?? ''}</p>
        </Modal>
    );
}