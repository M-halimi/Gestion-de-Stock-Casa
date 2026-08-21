import { Link } from '@inertiajs/react';

function pageNumbers(current, last) {
    if (last <= 7) {
        return Array.from({ length: last }, (_, i) => i + 1);
    }

    const pages = new Set([1, 2, current - 1, current, current + 1, last - 1, last]);
    return [...pages].filter((p) => p >= 1 && p <= last).sort((a, b) => a - b);
}

export default function Pagination({ meta }) {
    if (!meta || meta.last_page <= 1) return null;

    const pages = pageNumbers(meta.current_page, meta.last_page);
    const buildUrl = (page) => {
        const url = new URL(meta.first_page_url);
        url.searchParams.set('page', String(page));
        return url.pathname + url.search;
    };

    return (
        <div className="flex items-center justify-between border-t border-hairline px-5 py-3">
            <p className="text-[13px] text-ink-mute">
                {meta.from ?? 0}–{meta.to ?? 0} / {meta.total}
            </p>
            <nav className="flex items-center gap-1">
                {meta.prev_page_url && (
                    <Link
                        href={buildUrl(meta.current_page - 1)}
                        preserveScroll
                        className="rounded-md px-2.5 py-1.5 text-[13px] text-ink-secondary hover:bg-canvas-soft"
                    >
                        ‹
                    </Link>
                )}
                {pages.map((page, i) => {
                    const prev = pages[i - 1];
                    const gap = prev && page - prev > 1;
                    return (
                        <span key={page} className="flex items-center">
                            {gap && <span className="px-1 text-[13px] text-ink-mute">…</span>}
                            <Link
                                href={buildUrl(page)}
                                preserveScroll
                                className={`rounded-md px-2.5 py-1.5 text-[13px] ${
                                    page === meta.current_page
                                        ? 'bg-primary font-normal text-white'
                                        : 'text-ink-secondary hover:bg-canvas-soft'
                                }`}
                            >
                                {page}
                            </Link>
                        </span>
                    );
                })}
                {meta.next_page_url && (
                    <Link
                        href={buildUrl(meta.current_page + 1)}
                        preserveScroll
                        className="rounded-md px-2.5 py-1.5 text-[13px] text-ink-secondary hover:bg-canvas-soft"
                    >
                        ›
                    </Link>
                )}
            </nav>
        </div>
    );
}