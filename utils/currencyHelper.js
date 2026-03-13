// currencyHelper.js — All currency logic

const CurrencyHelper = {

  API_URL: 'https://api.exchangerate-api.com/v4/latest/',
  CACHE_KEY: 'exchangeRates',
  HISTORY_KEY: 'rateHistory',

  // ── Currency metadata ──────────────────────────────────────────────────────

  currencies: {
    USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
    EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺' },
    GBP: { name: 'British Pound', symbol: '£', flag: '🇬🇧' },
    JPY: { name: 'Japanese Yen', symbol: '¥', flag: '🇯🇵' },
    CNY: { name: 'Chinese Yuan', symbol: '¥', flag: '🇨🇳' },
    INR: { name: 'Indian Rupee', symbol: '₹', flag: '🇮🇳' },
    CAD: { name: 'Canadian Dollar', symbol: 'C$', flag: '🇨🇦' },
    AUD: { name: 'Australian Dollar', symbol: 'A$', flag: '🇦🇺' },
    CHF: { name: 'Swiss Franc', symbol: 'Fr', flag: '🇨🇭' },
    HKD: { name: 'Hong Kong Dollar', symbol: 'HK$', flag: '🇭🇰' },
    SGD: { name: 'Singapore Dollar', symbol: 'S$', flag: '🇸🇬' },
    SEK: { name: 'Swedish Krona', symbol: 'kr', flag: '🇸🇪' },
    NOK: { name: 'Norwegian Krone', symbol: 'kr', flag: '🇳🇴' },
    DKK: { name: 'Danish Krone', symbol: 'kr', flag: '🇩🇰' },
    MXN: { name: 'Mexican Peso', symbol: '$', flag: '🇲🇽' },
    BRL: { name: 'Brazilian Real', symbol: 'R$', flag: '🇧🇷' },
    ARS: { name: 'Argentine Peso', symbol: '$', flag: '🇦🇷' },
    CLP: { name: 'Chilean Peso', symbol: '$', flag: '🇨🇱' },
    COP: { name: 'Colombian Peso', symbol: '$', flag: '🇨🇴' },
    AED: { name: 'UAE Dirham', symbol: 'د.إ', flag: '🇦🇪' },
    SAR: { name: 'Saudi Riyal', symbol: '﷼', flag: '🇸🇦' },
    TRY: { name: 'Turkish Lira', symbol: '₺', flag: '🇹🇷' },
    RUB: { name: 'Russian Ruble', symbol: '₽', flag: '🇷🇺' },
    PLN: { name: 'Polish Zloty', symbol: 'zł', flag: '🇵🇱' },
    CZK: { name: 'Czech Koruna', symbol: 'Kč', flag: '🇨🇿' },
    HUF: { name: 'Hungarian Forint', symbol: 'Ft', flag: '🇭🇺' },
    RON: { name: 'Romanian Leu', symbol: 'lei', flag: '🇷🇴' },
    ZAR: { name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
    NGN: { name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
    KES: { name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
    EGP: { name: 'Egyptian Pound', symbol: '£', flag: '🇪🇬' },
    PKR: { name: 'Pakistani Rupee', symbol: '₨', flag: '🇵🇰' },
    BDT: { name: 'Bangladeshi Taka', symbol: '৳', flag: '🇧🇩' },
    LKR: { name: 'Sri Lankan Rupee', symbol: '₨', flag: '🇱🇰' },
    NPR: { name: 'Nepalese Rupee', symbol: '₨', flag: '🇳🇵' },
    THB: { name: 'Thai Baht', symbol: '฿', flag: '🇹🇭' },
    VND: { name: 'Vietnamese Dong', symbol: '₫', flag: '🇻🇳' },
    IDR: { name: 'Indonesian Rupiah', symbol: 'Rp', flag: '🇮🇩' },
    MYR: { name: 'Malaysian Ringgit', symbol: 'RM', flag: '🇲🇾' },
    PHP: { name: 'Philippine Peso', symbol: '₱', flag: '🇵🇭' },
    TWD: { name: 'Taiwan Dollar', symbol: 'NT$', flag: '🇹🇼' },
    KRW: { name: 'South Korean Won', symbol: '₩', flag: '🇰🇷' },
    NZD: { name: 'New Zealand Dollar', symbol: 'NZ$', flag: '🇳🇿' },
    ILS: { name: 'Israeli Shekel', symbol: '₪', flag: '🇮🇱' },
    UAH: { name: 'Ukrainian Hryvnia', symbol: '₴', flag: '🇺🇦' },
    CRC: { name: 'Costa Rican Colón', symbol: '₡', flag: '🇨🇷' },
    QAR: { name: 'Qatari Riyal', symbol: 'ر.ق', flag: '🇶🇦' },
    KWD: { name: 'Kuwaiti Dinar', symbol: 'د.ك', flag: '🇰🇼' },
    BHD: { name: 'Bahraini Dinar', symbol: '.د.ب', flag: '🇧🇭' },
    OMR: { name: 'Omani Rial', symbol: 'ر.ع.', flag: '🇴🇲' },
    JOD: { name: 'Jordanian Dinar', symbol: 'JD', flag: '🇯🇴' },
    MAD: { name: 'Moroccan Dirham', symbol: 'MAD', flag: '🇲🇦' }
  },

  // ── API + caching ──────────────────────────────────────────────────────────

  async getRates(baseCurrency = 'USD') {
    const cacheKey = `${this.CACHE_KEY}_${baseCurrency}`;
    const cached = await Storage.getLocal(cacheKey);

    if (cached && cached.timestamp) {
      const age = Date.now() - cached.timestamp;
      if (age < 3600000) { // 1 hour cache
        return cached;
      }
    }

    try {
      const res = await fetch(`${this.API_URL}${baseCurrency}`);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const result = {
        base: baseCurrency,
        rates: data.rates,
        timestamp: Date.now()
      };
      await Storage.setLocal(cacheKey, result);
      await this.saveRateHistory(baseCurrency, data.rates);
      return result;
    } catch (err) {
      console.warn('Currency API failed, using cache:', err);
      if (cached) return cached;
      return null;
    }
  },

  async saveRateHistory(base, rates) {
    const historyKey = `${this.HISTORY_KEY}_${base}`;
    let history = await Storage.getLocal(historyKey) || [];
    const today = new Date().toISOString().split('T')[0];
    history = history.filter(h => h.date !== today);
    history.push({ date: today, rates });
    if (history.length > 7) history = history.slice(-7);
    await Storage.setLocal(historyKey, history);
  },

  async getRateHistory(base, targetCurrency) {
    const historyKey = `${this.HISTORY_KEY}_${base}`;
    const history = await Storage.getLocal(historyKey) || [];
    return history.map(h => ({
      date: h.date,
      rate: h.rates[targetCurrency] || null
    })).filter(h => h.rate !== null);
  },

  // ── Conversion ─────────────────────────────────────────────────────────────

  convert(amount, fromCurrency, toCurrency, rates) {
    if (!rates) return null;
    if (fromCurrency === toCurrency) return amount;

    let inBase = amount;
    if (fromCurrency !== rates.base) {
      inBase = amount / rates.rates[fromCurrency];
    }
    return inBase * rates.rates[toCurrency];
  },

  formatAmount(amount, currency) {
    if (amount === null || isNaN(amount)) return '—';
    const info = this.currencies[currency] || {};
    const symbol = info.symbol || currency;

    const locale = 'en-US';
    let decimals = 2;
    if (['JPY', 'KRW', 'VND', 'IDR', 'HUF'].includes(currency)) decimals = 0;

    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);

    return `${symbol} ${formatted}`;
  },

  getTimeAgo(timestamp) {
    if (!timestamp) return 'never';
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} mins ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hrs ago`;
    return `${Math.floor(diff / 86400000)} days ago`;
  },

  // ── Text parsing for content script ───────────────────────────────────────

  parseCurrencyText(text) {
    // Patterns: $250, USD 1,200, £45, €99.99, ¥5000, ₹500, etc.
    const patterns = [
      /^([\$€£¥₹₩₺₽₪₫₱₴₦₨৳฿])\s?([\d,]+(?:\.\d{1,2})?)$/,
      /^(USD|EUR|GBP|JPY|CNY|INR|CAD|AUD|CHF|HKD|SGD|AED|SAR|KRW|TWD|MXN|BRL|ZAR|NGN|PKR|BDT|THB|VND|IDR|MYR|PHP|NZD|KWD|QAR)\s?([\d,]+(?:\.\d{1,2})?)$/i,
      /^([\d,]+(?:\.\d{1,2})?)\s*(USD|EUR|GBP|JPY|CNY|INR|CAD|AUD|CHF|HKD|SGD|AED|SAR|KRW|TWD|MXN|BRL|ZAR|NGN|PKR|BDT|THB|VND|IDR|MYR|PHP|NZD|KWD|QAR)$/i
    ];

    const symbolMap = {
      '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY',
      '₹': 'INR', '₩': 'KRW', '₺': 'TRY', '₽': 'RUB',
      '₪': 'ILS', '₫': 'VND', '₱': 'PHP', '₴': 'UAH',
      '₦': 'NGN', '₨': 'PKR', '৳': 'BDT', '฿': 'THB'
    };

    const t = text.trim();
    for (const pattern of patterns) {
      const match = t.match(pattern);
      if (match) {
        let currency, amountStr;
        if (match[1] && isNaN(parseFloat(match[1]))) {
          currency = symbolMap[match[1]] || match[1].toUpperCase();
          amountStr = match[2];
        } else {
          amountStr = match[1];
          currency = match[2].toUpperCase();
        }
        const amount = parseFloat(amountStr.replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0) {
          return { amount, currency };
        }
      }
    }
    return null;
  },

  getCurrencyList() {
    return Object.entries(this.currencies).map(([code, info]) => ({
      code,
      ...info
    }));
  }
};
