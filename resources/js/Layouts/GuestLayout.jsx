import ApplicationLogo from '@/Components/ApplicationLogo';
import FlashToast from '@/Components/shared/FlashToast';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeSwitcher from '@/Components/ThemeSwitcher';
import { Link } from '@inertiajs/react';

export default function GuestLayout({ children }) {
    return (
        <div className="relative flex min-h-screen flex-col items-center overflow-hidden bg-branddark pt-6 sm:justify-center sm:pt-0">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.14),transparent_55%)]" />

            <div className="absolute end-4 top-4 z-10 flex items-center gap-2">
                <ThemeSwitcher />
                <LanguageSwitcher />
            </div>

            <div className="relative z-10">
                <Link href="/">
                    <ApplicationLogo className="h-20 w-20 fill-current text-primary" />
                </Link>
            </div>

            <div className="relative z-10 mt-6 w-full max-w-md overflow-hidden rounded-xl border border-hairline bg-canvas px-6 py-6 shadow-level-2">
                {children}
            </div>

            <FlashToast />
        </div>
    );
}