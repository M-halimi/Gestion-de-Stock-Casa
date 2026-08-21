import InputError from '@/Components/InputError';

export default function Select({
    label,
    error,
    icon,
    className = '',
    wrapperClassName = '',
    options,
    children,
    ...props
}) {
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
                <select
                    {...props}
                    id={id}
                    className={`block h-11 cursor-pointer ${widthClass} rounded-md border-hairline-input bg-canvas ${
                        icon ? 'ps-11' : 'ps-3'
                    } pe-3 text-[15px] font-normal text-ink shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/30 ${extraClass}`}
                >
                    {options
                        ? options.map((option) => (
                              <option key={option.value} value={option.value}>
                                  {option.label}
                              </option>
                          ))
                        : children}
                </select>
            </div>
            {error && <InputError message={error} className="mt-1" />}
        </div>
    );
}