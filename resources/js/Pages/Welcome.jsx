import { useState, useEffect } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import ApplicationLogo from '@/Components/ApplicationLogo';
import InputError from '@/Components/InputError';
import Checkbox from '@/Components/Checkbox';
import FlashToast from '@/Components/shared/FlashToast';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeSwitcher from '@/Components/ThemeSwitcher';

const features = [
    { key: 'stock', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { key: 'sales', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { key: 'analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

export default function Welcome({ canLogin }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const [slide, setSlide] = useState(0);

    const {
        data: loginData,
        setData: setLoginData,
        post: postLogin,
        processing: loginProcessing,
        errors: loginErrors,
        reset: resetLogin,
    } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setSlide((s) => (s + 1) % features.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const submitLogin = (e) => {
        e.preventDefault();
        postLogin(route('login'), {
            onFinish: () => resetLogin('password'),
        });
    };

    if (auth?.user) {
        return (
            <>
                <Head title="Welcome" />
                <div className="flex min-h-screen flex-col items-center justify-center bg-branddark">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,94,0.14),transparent_55%)]" />
                    <div className="relative z-10 text-center">
                        <ApplicationLogo className="mx-auto h-20 w-20" />
                        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">
                            {t('welcome.title', 'Gestion de Stock Couture')}
                        </h1>
                        <p className="mt-2 text-ink-secondary">
                            {t('welcome.redirecting', 'Redirecting to dashboard...')}
                        </p>
                        <Link
                            href={route('dashboard')}
                            className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-deep focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-branddark"
                        >
                            {t('welcome.go_dashboard', 'Go to Dashboard')}
                        </Link>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Welcome" />

            <div className="relative flex min-h-screen bg-branddark">
                {/* Radial gradient background */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(212,175,94,0.12),transparent_50%)]" />

                {/* Top-right controls */}
                <div className="absolute end-4 top-4 z-50 flex items-center gap-2">
                    <ThemeSwitcher />
                    <LanguageSwitcher />
                </div>

                {/* ===== LEFT PANEL (brand / image) ===== */}
                <div className="relative hidden w-1/2 items-center justify-center lg:flex">
                    {/* Decorative background */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-branddark to-branddark-900" />
                        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
                        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-deep/10 blur-3xl" />
                        {/* Grid pattern */}
                        <div
                            className="absolute inset-0 opacity-[0.03]"
                            style={{
                                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                                backgroundSize: '60px 60px',
                            }}
                        />
                    </div>

                    <div className="relative z-10 mx-auto max-w-lg px-8">
                        {/* Logo */}
                        <div className="mb-8 flex items-center gap-3">
                            <ApplicationLogo className="h-16 w-16" />
                            <span className="brand-wordmark text-xl font-bold uppercase tracking-wide">
                                {t('welcome.brand', 'Teklidi Shop')}
                            </span>
                        </div>

                        {/* Feature card */}
                        <div className="rounded-2xl border border-hairline/50 bg-canvas/60 p-8 backdrop-blur-sm">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15">
                                <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d={features[slide].icon} />
                                </svg>
                            </div>
                            <h3 className="mb-2 text-lg font-semibold text-ink">
                                {t(`welcome.feature_${features[slide].key}_title`, features[slide].key === 'stock' ? 'Gestion intelligente du stock' : features[slide].key === 'sales' ? 'Suivi des ventes en temps réel' : 'Rapports et analyses avancées')}
                            </h3>
                            <p className="text-sm leading-relaxed text-ink-secondary">
                                {t(`welcome.feature_${features[slide].key}_desc`, features[slide].key === 'stock' ? 'Suivez vos produits entre entrepôts, gérez les seuils minimum et optimisez votre inventaire.' : features[slide].key === 'sales' ? 'Gérez vos commandes, factures et retours avec une interface intuitive et rapide.' : 'Tableaux de bord, tendances et exports pour piloter votre activité.')}
                            </p>
                        </div>

                        {/* Slide indicators */}
                        <div className="mt-6 flex items-center justify-center gap-2">
                            {features.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSlide(i)}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${
                                        i === slide ? 'w-8 bg-primary' : 'w-1.5 bg-ink-mute2 hover:bg-ink-mute'
                                    }`}
                                    aria-label={`Slide ${i + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* ===== RIGHT PANEL (auth form) ===== */}
                <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
                    <div className="w-full max-w-md">
                        {/* Mobile logo */}
                        <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
                            <ApplicationLogo className="h-14 w-14" />
                            <span className="brand-wordmark text-lg font-bold uppercase tracking-wide">
                                {t('welcome.brand', 'Teklidi Shop')}
                            </span>
                        </div>

                        {/* ===== LOGIN FORM ===== */}
                        <div>
                                <h2 className="mb-1 text-2xl font-bold tracking-tight text-ink">
                                    {t('welcome.login_title', 'Welcome back')}
                                </h2>
                                <p className="mb-6 text-sm text-ink-secondary">
                                    {t('welcome.login_subtitle', 'Sign in to manage your stock')}
                                </p>

                                <form onSubmit={submitLogin} className="space-y-4">
                                    <div>
                                        <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-ink-secondary">
                                            {t('auth.email', 'Email')}
                                        </label>
                                        <input
                                            id="login-email"
                                            type="email"
                                            name="email"
                                            value={loginData.email}
                                            onChange={(e) => setLoginData('email', e.target.value)}
                                            className="block h-11 w-full rounded-lg border-hairline-input bg-canvas ps-4 pe-4 text-[15px] text-ink shadow-sm placeholder:text-ink-mute focus:border-primary focus:ring-2 focus:ring-primary/30"
                                            placeholder={t('auth.email_placeholder', 'you@example.com')}
                                            autoComplete="username"
                                            autoFocus
                                        />
                                        <InputError message={loginErrors.email} className="mt-1.5" />
                                    </div>

                                    <div>
                                        <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-ink-secondary">
                                            {t('auth.password', 'Password')}
                                        </label>
                                        <input
                                            id="login-password"
                                            type="password"
                                            name="password"
                                            value={loginData.password}
                                            onChange={(e) => setLoginData('password', e.target.value)}
                                            className="block h-11 w-full rounded-lg border-hairline-input bg-canvas ps-4 pe-4 text-[15px] text-ink shadow-sm placeholder:text-ink-mute focus:border-primary focus:ring-2 focus:ring-primary/30"
                                            placeholder={t('auth.password_placeholder', 'Enter your password')}
                                            autoComplete="current-password"
                                        />
                                        <InputError message={loginErrors.password} className="mt-1.5" />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <label className="flex items-center gap-2">
                                            <Checkbox
                                                name="remember"
                                                checked={loginData.remember}
                                                onChange={(e) => setLoginData('remember', e.target.checked)}
                                            />
                                            <span className="text-sm text-ink-secondary">
                                                {t('auth.remember', 'Remember me')}
                                            </span>
                                        </label>
                                        {canLogin && (
                                            <Link
                                                href={route('password.request')}
                                                className="text-sm text-primary hover:text-primary-deep transition-colors"
                                            >
                                                {t('auth.forgot_password', 'Forgot password?')}
                                            </Link>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loginProcessing}
                                        className="flex h-11 w-full items-center justify-center rounded-lg bg-primary text-sm font-semibold text-white shadow-sm transition-all hover:bg-primary-deep focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-branddark disabled:opacity-50"
                                    >
                                        {loginProcessing ? (
                                            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                        ) : (
                                            t('auth.login', 'Sign in')
                                        )}
                                    </button>
                                </form>
                        </div>

                        {/* Footer text */}
                        <p className="mt-8 text-center text-xs text-ink-mute">
                            {t('welcome.footer', 'Gestion de Stock Couture — Inventory Management System')}
                        </p>
                    </div>
                </div>

                <FlashToast />
            </div>
        </>
    );
}
