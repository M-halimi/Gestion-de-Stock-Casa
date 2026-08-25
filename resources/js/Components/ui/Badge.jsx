const tones = {
    success: 'bg-success-soft text-success',
    warning: 'bg-warning-soft text-warning',
    danger: 'bg-destructive-soft text-destructive',
    info: 'bg-info-soft text-info',
    primary: 'bg-primary-soft text-primary',
    neutral: 'bg-canvas-cream text-ink-mute2',
};

const styles = {
    active: 'bg-success-soft text-success',
    inactive: 'bg-canvas-cream text-ink-mute2',
    pending: 'bg-warning-soft text-warning',
    in_progress: 'bg-info-soft text-info',
    completed: 'bg-success-soft text-success',
    received: 'bg-success-soft text-success',
    confirmed: 'bg-success-soft text-success',
    cancelled: 'bg-destructive-soft text-destructive',
    paid: 'bg-success-soft text-success',
    partial: 'bg-warning-soft text-warning',
    draft: 'bg-canvas-cream text-ink-mute2',
    validated: 'bg-success-soft text-success',
    low: 'bg-destructive-soft text-destructive',
    ok: 'bg-success-soft text-success',
    purchase: 'bg-success-soft text-success',
    initial_stock: 'bg-success-soft text-success',
    sale: 'bg-info-soft text-info',
    adjustment: 'bg-warning-soft text-warning',
    transfer_in: 'bg-canvas-cream text-ink-mute2',
    transfer_out: 'bg-canvas-cream text-ink-mute2',
    production_in: 'bg-success-soft text-success',
    production_out: 'bg-info-soft text-info',
    admin: 'bg-primary-soft text-primary',
    manager: 'bg-info-soft text-info',
    employee: 'bg-canvas-cream text-ink-mute2',
};

export default function Badge({ status, tone, label, className = '', children }) {
    const style = tone ? (tones[tone] ?? tones.neutral) : (styles[status] ?? styles.inactive);

    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${style} ${className}`}
        >
            {children ?? label ?? status}
        </span>
    );
}