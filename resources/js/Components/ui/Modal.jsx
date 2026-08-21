import { useEffect } from 'react';

export default function Modal({
    show = false,
    title,
    children,
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    onConfirm,
    onCancel,
    busy = false,
    confirmVariant = 'danger',
}) {
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape' && show) onCancel?.();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [show, onCancel]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60"
                onClick={onCancel}
            />
            <div className="relative w-full max-w-md rounded-lg bg-canvas p-6 shadow-level-2">
                <h3 className="heading-md text-ink">{title}</h3>
                <div className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
                    {children}
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="cursor-pointer rounded-md bg-canvas px-4 py-2 text-[14px] text-ink-secondary ring-1 ring-inset ring-hairline hover:bg-canvas-soft"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className={`cursor-pointer rounded-md px-4 py-2 text-[14px] text-white transition disabled:opacity-50 ${
                            confirmVariant === 'danger'
                                ? 'bg-destructive hover:bg-destructive/90'
                                : 'bg-primary hover:bg-primary-deep'
                        }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}