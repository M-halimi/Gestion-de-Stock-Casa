import { useTranslation } from 'react-i18next';
import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export default function CustomerCombobox({ value, customers, onSelect, onCreateNew, error, placeholder }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(customers ?? []);
    const [searching, setSearching] = useState(false);
    const [highlighted, setHighlighted] = useState(-1);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        if (query.trim() === '') {
            setResults(customers ?? []);
            setSearching(false);
            return undefined;
        }

        setSearching(true);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            axios
                .get(route('customers.search'), { params: { q: query } })
                .then((res) => {
                    setResults(res.data.customers ?? []);
                    setSearching(false);
                })
                .catch(() => setSearching(false));
        }, 300);

        return () => clearTimeout(debounceRef.current);
    }, [query, customers]);

    useEffect(() => {
        const handler = (e) => {
            if (open && e.key === 'Escape') {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [open]);

    useEffect(() => {
        if (open) setHighlighted(-1);
    }, [open, query]);

    const select = (customer) => {
        onSelect?.(customer);
        setQuery('');
        setOpen(false);
        inputRef.current?.blur();
    };

    return (
        <div ref={containerRef} className="relative">
            {value && !open && (
                <div className="pointer-events-none absolute left-3 top-1/2 z-10 flex -translate-y-1/2 items-center gap-2">
                    <span className="truncate text-[15px] font-normal text-ink">
                        {value.name}
                        {value.phone ? <span className="ms-1.5 text-[13px] text-ink-mute tabular">{value.phone}</span> : null}
                    </span>
                    <svg className="h-4 w-4 shrink-0 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}

            <input
                ref={inputRef}
                type="text"
                value={open ? query : ''}
                placeholder={value ? '' : (placeholder ?? t('pages.sales.customer_search_placeholder'))}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                    if (!open) return;
                    if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setHighlighted((h) => Math.min(h + 1, results.length - 1));
                    } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlighted((h) => Math.max(h - 1, -1));
                    } else if (e.key === 'Enter' && highlighted >= 0 && results[highlighted]) {
                        e.preventDefault();
                        select(results[highlighted]);
                    }
                }}
                onBlur={() => {
                    setTimeout(() => {
                        setOpen(false);
                        setQuery('');
                    }, 120);
                }}
                className={`mt-1 block h-11 w-full cursor-text rounded-md border-hairline-input bg-canvas px-3 text-[15px] font-normal text-ink shadow-sm placeholder:text-ink-mute focus:border-primary focus:ring-primary ${value && !open ? 'opacity-0' : ''}`}
                autoComplete="off"
            />

            {open && (
                <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-hairline bg-canvas py-1 shadow-level-2">
                    {searching ? (
                        <div className="px-3 py-2.5 text-[13px] text-ink-mute">{t('common.loading')}</div>
                    ) : results.length === 0 ? (
                        <div className="px-3 py-2.5 text-[13px] text-ink-mute">{t('pages.sales.no_customers_found')}</div>
                    ) : (
                        results.map((c, i) => (
                            <button
                                key={c.id}
                                type="button"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    select(c);
                                }}
                                onMouseEnter={() => setHighlighted(i)}
                                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-start ${i === highlighted ? 'bg-canvas-soft' : ''}`}
                            >
                                <span className="truncate text-[14px] font-normal text-ink">{c.name}</span>
                                {c.phone && <span className="shrink-0 text-[13px] text-ink-mute tabular">{c.phone}</span>}
                            </button>
                        ))
                    )}

                    <div className="my-1 border-t border-hairline" />
                    <button
                        type="button"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            onCreateNew?.();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-[14px] font-semibold text-primary transition hover:bg-primary-soft"
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        {t('pages.sales.new_customer')}
                    </button>
                </div>
            )}

            {error && <p className="mt-1 text-[13px] text-destructive">{error}</p>}
        </div>
    );
}