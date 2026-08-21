import i18n from '@/i18n';

const localeMap = {
    ar: 'ar-MA',
    fr: 'fr-FR',
    en: 'en-US',
};

export const fmtLocale = () => localeMap[i18n.language] ?? 'fr-FR';

export const fmtNumber = (n) => Number(n ?? 0).toLocaleString(fmtLocale());

export const fmtMoney = (n) =>
    Number(n ?? 0).toLocaleString(fmtLocale(), { style: 'currency', currency: 'MAD' });

export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(fmtLocale()) : '—');

export const fmtDateTime = (d) => (d ? new Date(d).toLocaleString(fmtLocale()) : '—');