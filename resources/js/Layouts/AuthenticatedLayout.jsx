import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import FlashToast from '@/Components/shared/FlashToast';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import NavLink from '@/Components/NavLink';
import ThemeSwitcher from '@/Components/ThemeSwitcher';
import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const icons = {
    dashboard: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
    ),
    products: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
    ),
    categories: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
    ),
    units: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
    ),
    suppliers: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
    ),
    customers: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
    ),
    warehouses: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
    ),
    stock: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
    ),
    purchases: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
    ),
    sales: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    movements: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25m-14.25 6h14.25m0 0V6.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v4.125m-4.5 0V16.5a2.25 2.25 0 01-2.25 2.25H5.25v-3.375c0-.621-.504-1.125-1.125-1.125H3m15 6.75v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m-4.5-4.5h4.5M3 4.5h14.25" />
        </svg>
    ),
    inventory: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
    ),
    production: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
        </svg>
    ),
    reports: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
    ),
    users: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
    ),
    settings: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    'audit-logs': (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
    ),
    imports: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
    ),
};

const CalendarIcon = (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
);

const SearchIcon = (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);

const DownloadIcon = (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const PlusIcon = (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

export default function AuthenticatedLayout({ header, children }) {
    const { auth } = usePage().props;
    const user = auth.user;
    const permissions = user?.permissions ?? [];
    const has = (permission) => permissions.includes(permission);
    const { t, i18n } = useTranslation();

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [search, setSearch] = useState('');
    const searchRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            const tag = document.activeElement?.tagName;
            if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const today = new Intl.DateTimeFormat(
        i18n.language === 'ar' ? 'ar-MA' : i18n.language === 'en' ? 'en-GB' : 'fr-FR',
        { weekday: 'long', day: 'numeric', month: 'long' }
    ).format(new Date());

    const navigation = [
        { label: t('nav.dashboard'), href: route('dashboard'), permission: 'view_dashboard', icon: icons.dashboard },
        { label: t('nav.products'), href: route('products.index'), permission: 'view_products', icon: icons.products },
        { label: t('nav.categories'), href: route('categories.index'), permission: 'view_categories', icon: icons.categories },
        { label: t('nav.units'), href: route('units.index'), permission: 'view_units', icon: icons.units },
        { label: t('nav.suppliers'), href: route('suppliers.index'), permission: 'view_suppliers', icon: icons.suppliers },
        { label: t('nav.customers'), href: route('customers.index'), permission: 'view_customers', icon: icons.customers },
        { label: t('nav.warehouses'), href: route('warehouses.index'), permission: 'view_warehouses', icon: icons.warehouses },
        { label: t('nav.stock'), href: route('stock.index'), permission: 'view_stock', icon: icons.stock },
        { label: t('nav.purchases'), href: route('purchases.index'), permission: 'view_purchases', icon: icons.purchases },
        { label: t('nav.sales'), href: route('sales.index'), permission: 'view_sales', icon: icons.sales },
        { label: t('nav.movements'), href: route('movements.index'), permission: 'view_movements', icon: icons.movements },
        { label: t('nav.inventory'), href: route('inventory.index'), permission: 'view_inventory', icon: icons.inventory },
        { label: t('nav.imports'), href: route('imports.index'), permission: 'import_data', icon: icons.imports },
        { label: t('nav.production'), href: route('production.index'), permission: 'view_production', icon: icons.production },
        { label: t('nav.reports'), href: route('reports.index'), permission: 'view_reports', icon: icons.reports },
        { label: t('nav.audit_logs'), href: route('audit-logs.index'), permission: 'view_audit_logs', icon: icons['audit-logs'] },
        { label: t('nav.users'), href: route('users.index'), permission: 'view_users', icon: icons.users },
        { label: t('nav.settings'), href: route('settings.index'), permission: 'manage_users', icon: icons.settings },
    ].filter((item) => has(item.permission));

    const sidebarContent = (
        <div className="flex h-full flex-col">
            <div className="flex h-16 shrink-0 items-center gap-3 border-b border-hairline px-5">
                <Link href="/" className="flex items-center gap-2.5">
                    <ApplicationLogo className="h-8 w-8 fill-current text-primary" />
                    <span className="text-[15px] font-semibold tracking-tight text-ink">{t('app.name')}</span>
                </Link>
            </div>

            {has('create_products') && (
                <div className="px-4 pt-4">
                    <Link
                        href={route('products.create')}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(99,102,241,0.7)] transition hover:bg-primary-deep"
                    >
                        {PlusIcon}
                        {t('nav.new_product')}
                    </Link>
                </div>
            )}

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
                {navigation.map((item) => (
                    <NavLink
                        key={item.label}
                        href={item.href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors"
                        activeClassName="bg-primary-soft text-white"
                        inactiveClassName="text-ink-mute hover:bg-canvas-soft hover:text-ink"
                    >
                        {item.icon}
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="border-t border-hairline p-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-deep text-sm font-semibold text-white">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <div className="truncate text-[14px] font-medium text-ink">{user.name}</div>
                            <div className="truncate text-[12px] text-ink-mute">{user.role}</div>
                        </div>
                    </div>
                    <Dropdown>
                        <Dropdown.Trigger>
                            <button
                                type="button"
                                className="rounded-md p-2 text-ink-mute transition hover:bg-canvas-soft hover:text-ink"
                            >
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </Dropdown.Trigger>
                        <Dropdown.Content align="up-left">
                            <Dropdown.Link href={route('profile.edit')}>
                                {t('common.profile')}
                            </Dropdown.Link>
                            <Dropdown.Link href={route('logout')} method="post" as="button">
                                {t('common.logout')}
                            </Dropdown.Link>
                        </Dropdown.Content>
                    </Dropdown>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-branddark">
            <aside className="fixed inset-y-0 start-0 z-40 hidden w-60 border-e border-hairline bg-branddark-900 lg:block">
                {sidebarContent}
            </aside>

            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <aside className="absolute inset-y-0 start-0 w-60 bg-branddark-900 shadow-level-2">
                        {sidebarContent}
                    </aside>
                </div>
            )}

            <div className="lg:ps-60">
                <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hairline bg-canvas-glass px-4 backdrop-blur-md sm:px-6">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="rounded-md p-2 text-ink-mute transition hover:bg-canvas-soft hover:text-ink lg:hidden"
                        aria-label={t('nav.menu')}
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    <form
                        className="relative hidden w-full max-w-md flex-1 sm:block"
                        onSubmit={(e) => {
                            e.preventDefault();
                            router.get(route('stock.index', { search }));
                        }}
                    >
                        <span className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-mute">
                            {SearchIcon}
                        </span>
                        <input
                            ref={searchRef}
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t('topbar.search_placeholder')}
                            className="h-10 w-full rounded-lg border border-hairline-input bg-canvas-soft pe-14 ps-9 text-[14px] font-normal text-ink placeholder:text-ink-mute focus:border-primary focus:ring-2 focus:ring-primary/30"
                        />
                        <kbd className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 rounded border border-hairline-strong bg-canvas px-1.5 py-0.5 text-[11px] font-semibold text-ink-mute">
                            /
                        </kbd>
                    </form>

                    <div className="flex-1 sm:hidden" />

                    <div className="hidden items-center gap-2 text-[13px] text-ink-mute md:flex">
                        <span className="text-primary-subdued">{CalendarIcon}</span>
                        <span className="capitalize">{today}</span>
                    </div>

                    <Link
                        href={route('reports.index')}
                        className="hidden items-center gap-2 rounded-lg border border-hairline-input bg-canvas px-3 py-2 text-[13px] font-medium text-ink-secondary transition hover:bg-canvas-soft hover:text-ink sm:inline-flex"
                    >
                        {DownloadIcon}
                        {t('topbar.export')}
                    </Link>

                    <ThemeSwitcher />
                    <LanguageSwitcher />
                </header>

                {header && (
                    <div className="border-b border-hairline bg-branddark px-4 py-6 sm:px-6 lg:px-8">
                        <div className="mx-auto max-w-7xl">{header}</div>
                    </div>
                )}

                <main className="p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
            <FlashToast />
        </div>
    );
}