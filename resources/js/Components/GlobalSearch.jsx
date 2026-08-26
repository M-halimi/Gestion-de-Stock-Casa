import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const DEBOUNCE_MS = 350;

export default function GlobalSearch() {
    const { t } = useTranslation();
    const { permissions = [] } = usePage().props.auth.user;
    const can = (p) => permissions.includes(p);

    const scopes = [
        { key: 'all', label: t('search.scope_all'), show: true },
        { key: 'products', label: t('search.scope_products'), show: can('view_products') },
        { key: 'customers', label: t('search.scope_customers'), show: can('view_customers') },
        { key: 'suppliers', label: t('search.scope_suppliers'), show: can('view_suppliers') },
        { key: 'sales', label: t('search.scope_sales'), show: can('view_sales') },
        { key: 'purchases', label: t('search.scope_purchases'), show: can('view_purchases') },
    ].filter((s) => s.show);

    const [q, setQ] = useState('');
    const [scope, setScope] = useState('all');
    const [open, setOpen] = useState(false);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(-1);

    const rootRef = useRef(null);
    const inputRef = useRef(null);
    const abortRef = useRef(null);
    const timerRef = useRef(null);

    const items = groups.flatMap((g) => g.items.map((item) => ({ ...item, groupLabel: g.label })));

    const close = useCallback(() => {
        setOpen(false);
        setActive(-1);
    }, []);

    const runSearch = useCallback(
        (query, searchScope) => {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            setLoading(true);
            axios
                .get(route('search.index'), { params: { q: query, scope: searchScope }, signal: controller.signal })
                .then(({ data }) => {
                    setGroups(data.groups ?? []);
                    setActive(-1);
                })
                .catch((e) => {
                    if (e.code !== 'ERR_CANCELED') setLoading(false);
                })
                .finally(() => {
                    if (!controller.signal.aborted) setLoading(false);
                });
        },
        []
    );

    // Debounced search on query/scope change (stale requests aborted).
    useEffect(() => {
        if (!open) return undefined;
        const query = q.trim();
        if (query.length < 1) {
            abortRef.current?.abort();
            setGroups([]);
            setLoading(false);
            return undefined;
        }
        setLoading(true);
        timerRef.current = setTimeout(() => runSearch(query, scope), DEBOUNCE_MS);
        return () => clearTimeout(timerRef.current);
    }, [q, scope, open, runSearch]);

    // Close on outside click.
    useEffect(() => {
        const handler = (e) => {
            if (!rootRef.current?.contains(e.target)) close();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [close]);

    // "/" and Ctrl/Cmd+K shortcuts.
    useEffect(() => {
        const handler = (e) => {
            const tag = document.activeElement?.tagName;
            const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
            if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
                e.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const go = (item) => {
        if (!item) return;
        close();
        setQ('');
        setGroups([]);
        router.get(item.url);
    };

    const onKeyDown = (e) => {
        if (e.key === 'Escape') {
            close();
            inputRef.current?.blur();
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((i) => Math.min(i + 1, items.length - 1));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = q.trim();
            if (items.length > 0) {
                go(items[Math.max(active, 0)]);
            } else if (query !== '') {
                // Legacy fallback preserved: no results -> stock search page.
                close();
                router.get(route('stock.index', { search: query }));
            }
        }
    };

    let flatIndex = -1;

    return (
        <div ref={rootRef} className="relative block w-full flex-1 min-w-0">
            <div className="relative">
                <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-mute">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                </span>
                <input
                    ref={inputRef}
                    type="search"
                    value={q}
                    onChange={(e) => {
                        setQ(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    placeholder={t('topbar.search_placeholder')}
                    className="h-10 w-full min-w-0 rounded-lg border border-hairline-input bg-canvas-soft pe-12 ps-9 text-[14px] font-normal text-ink placeholder:text-ink-mute focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
                />
                <kbd className="pointer-events-none absolute end-3 top-1/2 hidden -translate-y-1/2 rounded border border-hairline-strong bg-canvas px-1.5 py-0.5 text-[11px] font-semibold text-ink-mute sm:block">
                    /
                </kbd>
            </div>

            {open && (
                <div className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-lg border border-hairline bg-canvas shadow-level-2">
                    <div className="border-b border-hairline px-3 py-2">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mute2">
                            {t('search.search_in')}
                        </p>
                        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
                            {scopes.map((s) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => {
                                        setScope(s.key);
                                        setActive(-1);
                                    }}
                                    className={`shrink-0 rounded-full border px-3 py-1 text-[12px] font-medium transition ${
                                        scope === s.key
                                            ? 'border-primary bg-primary-soft text-primary-subdued'
                                            : 'border-hairline text-ink-mute hover:bg-canvas-soft hover:text-ink'
                                    }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="max-h-80 overflow-auto">
                        {loading && groups.length === 0 && (
                            <div className="px-4 py-3 text-[13px] text-ink-mute">{t('search.loading')}</div>
                        )}

                        {!loading && q.trim() !== '' && items.length === 0 && (
                            <div className="px-4 py-3 text-[13px] text-ink-mute">{t('common.no_results')}</div>
                        )}

                        {q.trim() === '' && (
                            <div className="px-4 py-3 text-[13px] text-ink-mute">{t('topbar.search_placeholder')}…</div>
                        )}

                        {groups.map((group) => (
                            <div key={group.scope}>
                                <div className="bg-canvas-soft px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mute2">
                                    {group.label}
                                </div>
                                {group.items.map((item) => {
                                    flatIndex += 1;
                                    const idx = flatIndex;
                                    return (
                                        <button
                                            key={group.scope + item.url + item.id}
                                            type="button"
                                            onMouseEnter={() => setActive(idx)}
                                            onClick={() => go(item)}
                                            className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-start transition ${
                                                active === idx ? 'bg-primary-soft' : 'hover:bg-canvas-soft'
                                            }`}
                                        >
                                            <span className="min-w-0">
                                                <span className={`block truncate text-[14px] ${active === idx ? 'font-semibold text-primary-subdued' : 'text-ink'}`}>
                                                    {item.label}
                                                </span>
                                                {item.sublabel && (
                                                    <span className="block truncate text-[12px] text-ink-mute">{item.sublabel}</span>
                                                )}
                                            </span>
                                            <span className="shrink-0 text-[11px] text-ink-mute2">{group.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
