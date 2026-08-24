import ApplicationLogo from '@/Components/ApplicationLogo';
import FlashToast from '@/Components/shared/FlashToast';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeSwitcher from '@/Components/ThemeSwitcher';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-branddark pt-6 sm:justify-center sm:pt-0">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,94,0.14),transparent_55%)]" />

            <div className="absolute end-4 top-4 z-10 flex items-center gap-2">
                <ThemeSwitcher />
                <LanguageSwitcher />
            </div>

            <div className="relative z-10">
                <Link href="/" className="flex items-center gap-3">
                    <ApplicationLogo className="h-24 w-24" />
                    <span className="brand-wordmark text-2xl font-bold uppercase tracking-wide">
                        Teklidi Shop
                    </span>
                </Link>
            </div>

            <div className="relative z-10 mt-6 w-full max-w-md overflow-hidden rounded-xl border border-hairline bg-canvas px-6 py-6 shadow-level-2">
                {children}
            </div>

            <FlashToast />
        </div>
    );
}