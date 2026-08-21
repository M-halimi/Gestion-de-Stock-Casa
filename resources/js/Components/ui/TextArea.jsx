import { useState } from 'react';
import InputError from '@/Components/InputError';

export default function TextArea({
    label,
    error,
    icon,
    className = '',
    wrapperClassName = '',
    rows = 3,
    onFocus,
    onBlur,
    ...props
}) {
    const [focused, setFocused] = useState(false);
    const hasValue = props.value != null && props.value !== '';
    const floated = focused || hasValue;
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
                                : 'top-3 text-[15px] text-ink-mute'
                        }`}
                    >
                        {label}
                    </label>
                )}
                {icon && (
                    <span className="pointer-events-none absolute start-3 top-3 text-ink-mute">
                        {icon}
                    </span>
                )}
                <textarea
                    {...props}
                    id={id}
                    rows={rows}
                    onFocus={(e) => {
                        setFocused(true);
                        onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setFocused(false);
                        onBlur?.(e);
                    }}
                    placeholder={label ? ' ' : props.placeholder}
                    className={`block w-full rounded-md border-hairline-input bg-canvas ${
                        icon ? 'ps-11' : 'ps-3'
                    } pe-3 py-2.5 text-[15px] font-normal text-ink shadow-sm placeholder:text-ink-mute focus:border-primary focus:ring-2 focus:ring-primary/30 ${className}`}
                />
            </div>
            {error && <InputError message={error} className="mt-1" />}
        </div>
    );
}