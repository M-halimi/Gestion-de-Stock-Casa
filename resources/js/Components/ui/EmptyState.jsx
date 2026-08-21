export default function EmptyState({ title = 'Aucun résultat', description, action }) {
    return (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas-soft">
                <svg
                    className="h-6 w-6 text-ink-mute"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                    />
                </svg>
            </div>
            <h3 className="mt-3 text-[15px] font-normal text-ink">{title}</h3>
            {description && (
                <p className="mt-1 max-w-sm text-[13px] text-ink-mute">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}