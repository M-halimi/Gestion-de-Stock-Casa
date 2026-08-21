import { Link } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import { IconEye, IconPencil, IconTrash, IconMoreHorizontal } from '@/Components/ui/FormIcons';
import { useTranslation } from 'react-i18next';

function Tooltip({ children, label }) {
    return (
        <span className="relative group/tooltip inline-flex">
            {children}
            <span className="pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-sm transition group-hover/tooltip:opacity-100">
                {label}
                <svg className="absolute top-full left-1/2 -translate-x-1/2" width="8" height="4" viewBox="0 0 8 4">
                    <path d="M0 0L4 4L8 0" fill="currentColor" className="text-ink" />
                </svg>
            </span>
        </span>
    );
}

const actionStyles = {
    view: 'bg-canvas-soft text-ink-secondary hover:bg-canvas-cream hover:text-ink',
    edit: 'bg-warning/15 text-warning hover:bg-warning/25',
    delete: 'bg-destructive/15 text-destructive hover:bg-destructive/25',
    more: 'bg-canvas-soft text-ink-secondary hover:bg-canvas-cream hover:text-ink',
};

function ActionButton({ icon: Icon, label, href, onClick, variant = 'view' }) {
    const classes = `inline-flex h-8 w-8 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${actionStyles[variant]}`;

    return (
        <Tooltip label={label}>
            {href ? (
                <Link href={href} className={classes} aria-label={label}>
                    <Icon className="h-4 w-4" />
                </Link>
            ) : (
                <button type="button" onClick={onClick} className={classes} aria-label={label}>
                    <Icon className="h-4 w-4" />
                </button>
            )}
        </Tooltip>
    );
}

export default function TableActions({
    viewHref,
    editHref,
    onDelete,
    moreActions,
    className,
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const hasMore = moreActions && moreActions.length > 0;

    return (
        <div className={`flex items-center justify-end gap-1.5 ${className ?? ''}`}>
            {viewHref && (
                <ActionButton
                    icon={IconEye}
                    label={t('common.view')}
                    href={viewHref}
                    variant="view"
                />
            )}
            {editHref && (
                <ActionButton
                    icon={IconPencil}
                    label={t('common.edit')}
                    href={editHref}
                    variant="edit"
                />
            )}
            {onDelete && (
                <ActionButton
                    icon={IconTrash}
                    label={t('common.delete')}
                    onClick={onDelete}
                    variant="delete"
                />
            )}
            {hasMore && (
                <div className="relative" ref={ref}>
                    <Tooltip label={t('common.more')}>
                        <button
                            type="button"
                            onClick={() => setOpen((p) => !p)}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${actionStyles.more}`}
                            aria-label={t('common.more')}
                        >
                            <IconMoreHorizontal className="h-4 w-4" />
                        </button>
                    </Tooltip>
                    {open && (
                        <div className="absolute end-0 z-50 mt-1.5 w-44 rounded-lg bg-canvas shadow-level-2 ring-1 ring-hairline" onClick={() => setOpen(false)}>
                            <div className="py-1.5">
                                {moreActions.map((action, i) =>
                                    action.href ? (
                                        <Link
                                            key={i}
                                            href={action.href}
                                            className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-ink transition hover:bg-canvas-soft"
                                        >
                                            {action.icon && <action.icon className="h-4 w-4 text-ink-secondary" />}
                                            {action.label}
                                        </Link>
                                    ) : (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => {
                                                action.onClick?.();
                                                setOpen(false);
                                            }}
                                            className={`flex w-full items-center gap-2 px-3 py-1.5 text-[13px] transition hover:bg-canvas-soft ${
                                                action.destructive ? 'text-destructive' : 'text-ink'
                                            }`}
                                        >
                                            {action.icon && <action.icon className="h-4 w-4" />}
                                            {action.label}
                                        </button>
                                    ),
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
