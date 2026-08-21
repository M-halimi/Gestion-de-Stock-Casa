export let CURRENCY = 'DH';

export function setCurrency(symbol) {
    CURRENCY = symbol || CURRENCY;
}

export function formatMoney(value) {
    const n = Number(value ?? 0);
    const formatted = n.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return `${formatted} ${CURRENCY}`;
}

export function formatQty(value) {
    return Number(value ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 3 });
}

export function formatInt(value) {
    return Number(value ?? 0).toLocaleString('fr-FR');
}

export function formatDay(day) {
    const [y, m, d] = String(day).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}