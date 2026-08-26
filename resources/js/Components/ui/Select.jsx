import InputError from '@/Components/InputError';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Case-insensitive + accent-insensitive + Arabic-friendly normalization:
// "Élastique" matches "elast", "أحمد" matches "احمد".
const normalize = (s) =>
    String(s)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[إأآ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/ـ/g, '');

export default function Select({
    label,
    error,
    icon,
    className = '',
    wrapperClassName = '',
    options = [],
    id,
    value,
    onChange,
    ...props
}) {
    const { t } = useTranslation();
    const [query, setQuery] = useState('');

    const widthMatch = className.match(/(?:^|\s)w-[^\s]+/);
    const widthClass = widthMatch ? widthMatch[0].trim() : 'w-full';
    const extraClass = className.replace(/(?:^|\s)w-[^\s]+/, '');

    const selected = options.find((o) => String(o.value) === String(value ?? '')) ?? null;

    const tokens = useMemo(
        () => normalize(query).split(/\s+/).filter(Boolean),
        [query]
    );

    const filtered = useMemo(() => {
        if (tokens.length === 0) return options;
        // Advanced match: EVERY word typed must be found somewhere in the
        // label (order-independent), ignoring case/accents.
        return options.filter((o) => {
            const n = normalize(o.label);
            return tokens.every((tk) => n.includes(tk));
        });
    }, [options, tokens]);

    const highlight = (text) => {
        if (tokens.length === 0) return text;
        const tokenSet = new Set(tokens);
        try {
            const re = new RegExp(`(${tokens.map(escapeRegExp).join('|')})`, 'gi');
            return String(text)
                .split(re)
                .map((part, i) =>
                    tokenSet.has(normalize(part)) ? (
                        <mark key={i} className="bg-primary-soft font-semibold text-primary-subdued">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                );
        } catch {
            return text;
        }
    };

    const placeholder =
        options.find((o) => o.value === '' || o.value === 0)?.label ?? '';

    const emit = (option) => {
        // Emulate a native change event so every existing handler keeps working.
        onChange?.({ target: { value: option ? option.value : '', name: props.name } });
        setQuery('');
    };

    return (
        <div className={wrapperClassName}>
            <div className="relative">
                {label && (
                    <label
                        htmlFor={id}
                        className={`pointer-events-none absolute z-[1] -top-2.5 rounded bg-canvas px-1 text-[11px] font-medium text-ink-secondary ${
                            icon ? 'start-11' : 'start-3'
                        }`}
                    >
                        {label}
                    </label>
                )}
                {icon && (
                    <span className="pointer-events-none absolute start-3 top-1/2 z-[1] -translate-y-1/2 text-ink-mute">
                        {icon}
                    </span>
                )}
                <Combobox immediate value={selected} onChange={emit} disabled={props.disabled}>
                    <div className="relative">
                        <ComboboxInput
                            id={id}
                            name={props.name}
                            autoComplete="off"
                            className={`block h-11 cursor-pointer ${widthClass} rounded-md border-hairline-input bg-canvas ${
                                icon ? 'ps-11' : 'ps-3'
                            } pe-9 text-[15px] font-normal shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none ${
                                selected ? 'text-ink' : 'text-ink-mute'
                            } ${extraClass}`}
                            displayValue={(o) => (o ? String(o.label) : '')}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={placeholder}
                        />
                        {selected ? (
                            <button
                                type="button"
                                aria-label={t('common.clear')}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    emit(null);
                                    setQuery('');
                                }}
                                className="absolute inset-y-0 end-3 flex items-center text-ink-mute transition hover:text-destructive"
                            >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        ) : (
                            <ComboboxButton className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-ink-mute">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                </svg>
                            </ComboboxButton>
                        )}
                        <ComboboxOptions className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-hairline bg-canvas shadow-level-2 focus:outline-none">
                            {query.trim() !== '' && (
                                <div className="border-b border-hairline px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-mute2 tabular">
                                    {filtered.length} {t('common.results', { count: filtered.length })}
                                </div>
                            )}
                            <div className="max-h-60 overflow-auto py-1">
                                {filtered.length === 0 ? (
                                    <div className="px-3 py-2 text-[13px] text-ink-mute">
                                        {t('common.no_results')}
                                    </div>
                                ) : (
                                    filtered.map((option) => (
                                        <ComboboxOption
                                            key={String(option.value)}
                                            value={option}
                                            className="cursor-pointer px-3 py-2 text-[14px] text-ink-secondary data-[focus]:bg-primary-soft data-[focus]:text-primary-subdued data-[selected]:bg-primary-soft data-[selected]:font-semibold data-[selected]:text-primary-subdued"
                                        >
                                            {highlight(option.label)}
                                        </ComboboxOption>
                                    ))
                                )}
                            </div>
                        </ComboboxOptions>
                    </div>
                </Combobox>
            </div>
            {error && <InputError message={error} className="mt-1" />}
        </div>
    );
}
