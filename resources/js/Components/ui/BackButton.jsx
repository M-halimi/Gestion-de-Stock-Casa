import Button from './Button';

export default function BackButton({ children, className = '', ...props }) {
    return (
        <Button variant="secondary" className={`gap-2 ${className}`} {...props}>
            <svg
                className="h-4 w-4 shrink-0 rtl:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            {children}
        </Button>
    );
}
