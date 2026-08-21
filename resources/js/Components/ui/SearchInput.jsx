import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function SearchInput({
    placeholder = 'Rechercher…',
    className = '',
    param = 'search',
    delay = 350,
}) {
    const [value, setValue] = useState('');
    const timer = useRef(null);

    useEffect(() => {
        const initial = new URLSearchParams(window.location.search).get(param) ?? '';
        setValue(initial);
    }, [param]);

    const handleChange = (e) => {
        const next = e.target.value;
        setValue(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            router.reload({
                data: { [param]: next || undefined, page: undefined },
                preserveState: true,
                preserveScroll: true,
            });
        }, delay);
    };

    return (
        <div className={`relative ${className}`}>
            <svg
                className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
            </svg>
            <input
                type="search"
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                className={`h-11 w-full cursor-pointer rounded-md border-hairline-input bg-canvas pe-3 ps-9 text-[14px] font-normal text-ink shadow-sm placeholder:text-ink-mute focus:border-primary focus:ring-primary ${className}`}
            />
        </div>
    );
}