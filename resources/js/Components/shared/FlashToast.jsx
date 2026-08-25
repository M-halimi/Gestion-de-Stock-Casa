import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function FlashToast() {
    const { flash } = usePage().props;
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (flash?.success || flash?.error) {
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 4000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    if (!visible || (!flash?.success && !flash?.error)) return null;

    const success = Boolean(flash.success);
    const messageKey = success ? flash.success : flash.error;
    const key = `flash.${messageKey}`;
    const translated = t(key);
    const text = translated === key ? messageKey : translated;

    return (
        <div className="fixed bottom-5 end-5 z-50">
            <div
                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-[14px] text-white shadow-level-2 ${
                    success ? 'bg-emerald-600' : 'bg-destructive'
                }`}
            >
                <svg
                    className="h-5 w-5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                >
                    {success ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    )}
                </svg>
                <span className="tabular">{text}</span>
            </div>
        </div>
    );
}