import Modal from '@/Components/ui/Modal';
import Input from '@/Components/ui/Input';
import TextArea from '@/Components/ui/TextArea';
import { IconCity, IconMail, IconMapPin, IconNote, IconPhone, IconUser } from '@/Components/ui/FormIcons';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export default function CreateCustomerDialog({ open, onClose, onSuccess }) {
    const { t } = useTranslation();
    const [data, setData] = useState({ name: '', phone: '', email: '', address: '', city: '', notes: '' });
    const [errors, setErrors] = useState({});
    const [duplicate, setDuplicate] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            setData({ name: '', phone: '', email: '', address: '', city: '', notes: '' });
            setErrors({});
            setDuplicate(null);
            setSubmitting(false);
        }
    }, [open]);

    const set = (field) => (e) => {
        setData((d) => ({ ...d, [field]: e.target.value }));
        if (duplicate) setDuplicate(null);
    };

    const submit = () => {
        if (duplicate) {
            onSuccess?.(duplicate.customer);
            onClose?.();
            return;
        }

        setSubmitting(true);
        setErrors({});
        axios
            .post(route('customers.quick-store'), data)
            .then((res) => {
                setSubmitting(false);
                if (res.data.status === 'duplicate') {
                    setDuplicate({ customer: res.data.customer, message: res.data.message });
                } else {
                    onSuccess?.(res.data.customer);
                    onClose?.();
                }
            })
            .catch((err) => {
                setSubmitting(false);
                if (err.response?.status === 422) {
                    setErrors(err.response.data.errors ?? {});
                }
            });
    };

    return (
        <Modal
            show={open}
            title={t('pages.customers.create_modal_title')}
            confirmLabel={duplicate ? t('pages.customers.use_existing') : t('pages.customers.create_modal_action')}
            cancelLabel={t('common.cancel')}
            onConfirm={submit}
            onCancel={onClose}
            busy={submitting}
            confirmVariant="primary"
        >
            <div className="grid grid-cols-1 gap-4">
                <Input
                    id="inline-name"
                    label={`${t('pages.customers.name')} *`}
                    value={data.name}
                    onChange={set('name')}
                    error={errors.name?.[0]}
                    icon={<IconUser />}
                    autoFocus
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                        id="inline-phone"
                        label={t('pages.customers.phone')}
                        value={data.phone}
                        onChange={set('phone')}
                        error={errors.phone?.[0]}
                        icon={<IconPhone />}
                    />
                    <Input
                        id="inline-email"
                        type="email"
                        label={t('pages.customers.email')}
                        value={data.email}
                        onChange={set('email')}
                        error={errors.email?.[0]}
                        icon={<IconMail />}
                    />
                </div>
                <Input
                    id="inline-address"
                    label={t('pages.customers.address')}
                    value={data.address}
                    onChange={set('address')}
                    error={errors.address?.[0]}
                    icon={<IconMapPin />}
                />
                <Input
                    id="inline-city"
                    label={t('pages.customers.city')}
                    value={data.city}
                    onChange={set('city')}
                    error={errors.city?.[0]}
                    icon={<IconCity />}
                />
                <TextArea
                    id="inline-notes"
                    label={t('pages.customers.notes')}
                    value={data.notes}
                    onChange={set('notes')}
                    error={errors.notes?.[0]}
                    icon={<IconNote />}
                />

                {duplicate && (
                    <div className="flex items-start gap-2 rounded-md bg-destructive-soft px-3 py-2.5 text-[13px] text-destructive">
                        <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <div>
                            {t(duplicate.message ?? 'pages.customers.duplicate_phone')}
                            <span className="block text-[12px] text-ink-mute">
                                {duplicate.customer.name}
                                {duplicate.customer.phone ? ` — ${duplicate.customer.phone}` : ''}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}