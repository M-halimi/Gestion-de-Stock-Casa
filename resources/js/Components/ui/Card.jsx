export default function Card({ title, subtitle, actions, className = '', flush = false, children }) {
    return (
        <div className={`rounded-lg border border-hairline bg-canvas shadow-level-1 ${className}`}>
            {(title || actions) && (
                <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
                    <div>
                        {title && (
                            <h3 className="heading-md text-ink">{title}</h3>
                        )}
                        {subtitle && <p className="mt-0.5 text-[13px] text-ink-mute">{subtitle}</p>}
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
            )}
            <div className={flush ? '' : 'p-5'}>{children}</div>
        </div>
    );
}