import { Link, usePage } from '@inertiajs/react';

export default function NavLink({
    className = '',
    activeClassName = 'bg-primary-soft text-white hover:bg-primary-soft',
    inactiveClassName = 'text-ink-mute hover:bg-canvas-soft hover:text-ink',
    exact = false,
    children,
    ...props
}) {
    const { url } = usePage();
    const href = typeof props.href === 'string' ? props.href : '';
    const path = href.split('?')[0];
    const active = path !== '#' && path !== '' && (exact ? url === path : url.startsWith(path));

    return (
        <Link {...props} className={`${className} ${active ? activeClassName : inactiveClassName}`}>
            {children}
        </Link>
    );
}