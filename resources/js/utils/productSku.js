function cleanSkuPart(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase();
}

export function generateProductSku({ name = '', categoryName = '' } = {}) {
    const categoryCode = cleanSkuPart(categoryName).slice(0, 3) || 'PRD';
    const nameCode = cleanSkuPart(name).slice(0, 3) || 'PRO';
    const timeCode = Date.now().toString(36).toUpperCase().slice(-6);
    const randomCode = Math.floor(Math.random() * 36).toString(36).toUpperCase();

    return `${categoryCode}-${nameCode}-${timeCode}${randomCode}`.slice(0, 50);
}
