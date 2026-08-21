import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',

    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.jsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                primary: {
                    DEFAULT: 'rgb(var(--c-primary) / <alpha-value>)',
                    deep: 'rgb(var(--c-primary-deep) / <alpha-value>)',
                    press: 'rgb(var(--c-primary-press) / <alpha-value>)',
                    soft: 'var(--c-primary-soft)',
                    subdued: 'var(--c-primary-subdued)',
                },
                branddark: {
                    DEFAULT: 'var(--c-branddark)',
                    900: 'var(--c-branddark-900)',
                },
                ink: {
                    DEFAULT: 'var(--c-ink)',
                    secondary: 'var(--c-ink-secondary)',
                    mute: 'var(--c-ink-mute)',
                    mute2: 'var(--c-ink-mute2)',
                },
                canvas: {
                    DEFAULT: 'var(--c-canvas)',
                    soft: 'var(--c-canvas-soft)',
                    cream: 'var(--c-canvas-cream)',
                    glass: 'var(--c-canvas-glass)',
                },
                hairline: {
                    DEFAULT: 'var(--c-hairline)',
                    input: 'var(--c-hairline-input)',
                    strong: 'var(--c-hairline-strong)',
                },
                destructive: {
                    DEFAULT: 'rgb(var(--c-destructive) / <alpha-value>)',
                    soft: 'var(--c-destructive-soft)',
                },
                success: {
                    DEFAULT: 'rgb(var(--c-success) / <alpha-value>)',
                    soft: 'var(--c-success-soft)',
                },
                warning: {
                    DEFAULT: 'rgb(var(--c-warning) / <alpha-value>)',
                    soft: 'var(--c-warning-soft)',
                },
                info: {
                    DEFAULT: 'rgb(var(--c-info) / <alpha-value>)',
                    soft: 'var(--c-info-soft)',
                },
                accent: {
                    DEFAULT: 'rgb(var(--c-primary) / <alpha-value>)',
                    ruby: 'rgb(var(--c-destructive) / <alpha-value>)',
                    magenta: 'var(--c-accent-magenta)',
                    lemon: 'var(--c-accent-lemon)',
                },
            },
            letterSpacing: {
                'display-xxl': '-1.4px',
                'display-xl': '-0.96px',
                'display-lg': '-0.64px',
                'display-md': '-0.26px',
                'heading': '-0.2px',
                'tabular': '-0.42px',
            },
            boxShadow: {
                'level-1': 'var(--shadow-1)',
                'level-2': 'var(--shadow-2)',
            },
        },
    },

    plugins: [forms],
};