import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import fr from '../locales/fr.json';
import ar from '../locales/ar.json';
import en from '../locales/en.json';

const STORAGE_KEY = 'gestion-stock-locale';

export const supportedLocales = [
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية' },
    { code: 'en', label: 'English' },
];

const initialLocale = localStorage.getItem(STORAGE_KEY) || 'fr';

i18n.use(initReactI18next).init({
    resources: {
        fr: { translation: fr },
        ar: { translation: ar },
        en: { translation: en },
    },
    lng: initialLocale,
    fallbackLng: 'fr',
    interpolation: {
        escapeValue: false,
    },
});

export function applyLocaleDirection(locale) {
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
}

export function changeLocale(locale) {
    localStorage.setItem(STORAGE_KEY, locale);
    i18n.changeLanguage(locale);
    applyLocaleDirection(locale);
}

applyLocaleDirection(initialLocale);

export default i18n;