export default function PageHeader({ title, subtitle, actions }) {
    return (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
                <h1 className="display-lg text-ink">{title}</h1>
                {subtitle && <p className="mt-1 text-[14px] text-ink-mute">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}