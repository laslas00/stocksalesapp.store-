
let currentCurrency = localStorage.getItem('currency') || 'XAF';
let currencysigns = localStorage.getItem('currencysigns') || 'FCFA';

const currencySymbols = {
    XAF: 'FCFA',
    USD: '$',
    EUR: '€',
    GBP: '£',
    NGN: '₦',
    GHS: '₵',
    CAD: '$',
    AUD: '$',
    NZD: '$',
    CHF: 'CHF',
    JPY: '¥',
    CNY: '¥',
    INR: '₹',
    RUB: '₽',
    ZAR: 'R',
    KES: 'KSh',
    UGX: 'USh',
    TZS: 'TSh',
    MAD: 'MAD',
    EGP: 'E£',
    SAR: '﷼',
    AED: 'د.إ',
    TRY: '₺',
    BRL: 'R$',
    MXN: '$',
    ARS: '$',
    COP: '$',
    CLP: '$',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    PLN: 'zł',
    CZK: 'Kč',
    HUF: 'Ft',
    THB: '฿',
    MYR: 'RM',
    IDR: 'Rp',
    PHP: '₱',
    VND: '₫',
    KRW: '₩'
};
const currencyNames = {
    XAF: 'Central African CFA Franc',
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    NGN: 'Nigerian Naira',
    GHS: 'Ghana Cedi',
    CAD: 'Canadian Dollar',
    AUD: 'Australian Dollar',
    NZD: 'New Zealand Dollar',
    CHF: 'Swiss Franc',
    JPY: 'Japanese Yen',
    CNY: 'Chinese Yuan',
    INR: 'Indian Rupee',
    RUB: 'Russian Ruble',
    ZAR: 'South African Rand',
    KES: 'Kenyan Shilling',
    UGX: 'Ugandan Shilling',
    TZS: 'Tanzanian Shilling',
    MAD: 'Moroccan Dirham',
    EGP: 'Egyptian Pound',
    SAR: 'Saudi Riyal',
    AED: 'UAE Dirham',
    TRY: 'Turkish Lira',
    BRL: 'Brazilian Real',
    MXN: 'Mexican Peso',
    ARS: 'Argentine Peso',
    COP: 'Colombian Peso',
    CLP: 'Chilean Peso',
    SEK: 'Swedish Krona',
    NOK: 'Norwegian Krone',
    DKK: 'Danish Krone',
    PLN: 'Polish Zloty',
    CZK: 'Czech Koruna',
    HUF: 'Hungarian Forint',
    THB: 'Thai Baht',
    MYR: 'Malaysian Ringgit',
    IDR: 'Indonesian Rupiah',
    PHP: 'Philippine Peso',
    VND: 'Vietnamese Dong',
    KRW: 'South Korean Won'
};
function getCurrentLocale() {
    const localeMap = {
        'en': 'en-US',
        'fr': 'fr-FR',
        'es': 'es-ES',
        'de': 'de-DE',
        'ar': 'ar-SA',
        'zh': 'zh-CN',
        'ja': 'ja-JP',
        'ko': 'ko-KR',
        'ru': 'ru-RU',
        'pt': 'pt-PT'
    };
    return localeMap[currentLanguage] || 'en-US';
}

function formatCurrency(amount) {
    const locale = getCurrentLocale();
    const symbol = getCurrencySymbol();

    return symbol + ' ' + Number(amount).toLocaleString(locale, {
        minimumFractionDigits: currentCurrency === 'XAF' ? 0 : 2
    });
}

    function getCurrencySymbol() {
    return currencySymbols[currentCurrency] || 'FCFA';
}
function updateCurrencyLabels() {
    document.querySelectorAll('.currency-label').forEach(el => {
        el.textContent = getCurrencySymbol();
    });
    document.querySelectorAll('[data-currency-label]').forEach(el => {
        el.textContent = getCurrencySymbol();
    });
    document.querySelectorAll('.currency-amount').forEach(el => {
        const amount = el.dataset.amount;
        if (amount) el.textContent = formatCurrency(amount);
    });
    document.querySelectorAll('input[data-currency-placeholder]').forEach(el => {
        el.placeholder = el.dataset.currencyPlaceholder.replace('{currency}', getCurrencySymbol());
    });
}