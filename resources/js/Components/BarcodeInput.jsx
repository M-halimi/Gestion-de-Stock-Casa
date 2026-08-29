import axios from 'axios';
import { useEffect, useRef } from 'react';

export default function BarcodeInput({ value, onChange, onResolved, onError, endpoint = route('stock.barcode.lookup'), autoFocus = true }) {
    const inputRef = useRef(null);
    const timerRef = useRef(null);

    const lookup = (barcode) => {
        const query = barcode.trim();
        if (!query) return;
        axios
            .get(endpoint, { params: { barcode: query } })
            .then(({ data }) => {
                onError?.(null);
                onResolved?.(data);
            })
            .catch((error) => {
                onResolved?.(null);
                onError?.(error.response?.data?.message ?? 'Barcode not found.');
            });
    };

    useEffect(() => {
        if (!value?.trim()) return undefined;
        timerRef.current = setTimeout(() => lookup(value), 250);
        return () => clearTimeout(timerRef.current);
    }, [value]);

    return (
        <div className="relative">
            <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-mute">⌕</span>
            <input
                ref={inputRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        lookup(value);
                    }
                }}
                autoFocus={autoFocus}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Scan or type barcode"
                className="h-12 w-full rounded-lg border border-hairline-input bg-canvas-soft pe-3 ps-9 text-[16px] tracking-wide text-ink focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
            />
        </div>
    );
}
