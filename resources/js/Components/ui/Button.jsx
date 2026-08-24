import { Link } from '@inertiajs/react';

const variants = {
    primary: 'bg-primary text-white hover:bg-primary-deep focus-visible:outline-primary',
    secondary:
        'bg-canvas text-primary ring-1 ring-inset ring-hairline-strong hover:bg-canvas-soft focus-visible:outline-primary',
    danger: 'bg-destructive text-white hover:bg-destructive/90 focus-visible:outline-destructive',
    ondark: 'border border-hairline-input bg-canvas-soft text-ink hover:bg-canvas-cream focus-visible:outline-branddark',
    ghost: 'text-ink-secondary hover:bg-canvas-soft focus-visible:outline-ink-mute',
};

const sizes = {
    sm: 'px-3 py-1.5 text-[13px]',
    md: 'px-4 py-2 text-[14px]',
    lg: 'px-5 py-2.5 text-[15px]',
};

export default function Button({
    variant = 'primary',
    size = 'md',
    className = '',
    href,
    external = false,
    children,
    ...props
}) {
    const classes = `inline-flex cursor-pointer items-center justify-center gap-2 rounded-md font-medium leading-none transition duration-150 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`;

    if (href) {
        if (external) {
            return (
                <a href={href} className={classes} {...props}>
                    {children}
                </a>
            );
        }

        return (
            <Link href={href} className={classes}>
                {children}
            </Link>
        );
    }

    return (
        <button type="button" className={classes} {...props}>
            {children}
        </button>
    );
}
