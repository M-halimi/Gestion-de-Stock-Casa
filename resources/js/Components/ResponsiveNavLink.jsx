import { Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={`flex w-full items-start border-s-4 py-2 pe-4 ps-3 ${
                active
                    ? 'border-primary bg-primary-soft text-white focus:border-primary focus:bg-primary-soft focus:text-white'
                    : 'border-transparent text-ink-mute hover:border-hairline hover:bg-canvas-soft hover:text-ink focus:border-hairline focus:bg-canvas-soft focus:text-ink'
            } text-base font-medium transition duration-150 ease-in-out focus:outline-none ${className}`}
        >
            {children}
        </Link>
    );
}
