import { useState } from 'react';
import InputError from '@/Components/InputError';

export default function Input({
    label,
    error,
    hint,
    icon,
    inputClass = '',
    className = '',
    wrapperClassName = '',
    onFocus,
    onBlur,
    ...props
}) {
    const [focused, setFocused] = useState(false);
    const hasValue = props.value != null && props.value !== '';
    const alwaysFloated = ['date', 'time', 'datetime-local', 'month', 'week'].includes(props.type);
    const floated = alwaysFloated || focused || hasValue;
    const widthMatch = className.match(/(?:^|\s)w-[^\s]+/);
    const widthClass = widthMatch ? widthMatch[0].trim() : 'w-full';
    const extraClass = className.replace(/(?:^|\s)w-[^\s]+/, '');
    const id = props.id;

    return (
        <div className={wrapperClassName}>
            <div className="relative">
                {label && (
                    <label
                        htmlFor={id}
                        className={`pointer-events-none absolute z-[1] transition-all duration-150 ${
                            icon ? 'start-11' : 'start-3'
                        } ${
                            floated
                                ? '-top-2.5 rounded bg-canvas px-1 text-[11px] font-medium text-ink-secondary'
                                : 'top-1/2 -translate-y-1/2 text-[15px] text-ink-mute'
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
                <input
                    {...props}
                    id={id}
                    onFocus={(e) => {
                        setFocused(true);
                        onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setFocused(false);
                        onBlur?.(e);
                    }}
                    placeholder={label ? ' ' : props.placeholder}
                    className={`block h-11 ${widthClass} rounded-md border-hairline-input bg-canvas ${
                        icon ? 'ps-11' : 'ps-3'
                    } pe-3 text-[15px] font-normal text-ink shadow-sm placeholder:text-ink-mute focus:border-primary focus:ring-2 focus:ring-primary/30 ${inputClass} ${extraClass}`}
                />
            </div>
            {hint && !error && <p className="mt-1 text-[12px] text-ink-mute">{hint}</p>}
            {error && <InputError message={error} className="mt-1" />}
        </div>
    );
}