import '../css/app.css';
import './bootstrap';
import './i18n';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { setCurrency } from '@/lib/format';

const storedTheme = localStorage.getItem('theme');
document.documentElement.classList.add(storedTheme === 'light' ? 'light' : 'dark');

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';
let appTitle = appName;

createInertiaApp({
    title: (title) => `${title} - ${appTitle}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);
        const initialProps = props.initialPage?.props ?? {};

        if (initialProps.settings?.company_name) {
            appTitle = initialProps.settings.company_name;
        }

        if (initialProps.settings?.currency_symbol) {
            setCurrency(initialProps.settings.currency_symbol);
        }

        root.render(<App {...props} />);
    },
    progress: {
        color: '#533AFD',
    },
});