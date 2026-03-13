// storage.js — Chrome storage wrapper

const Storage = {
  // ── Sync storage (preferences, timezones, currency pairs) ──────────────────

  async getSync(key) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(key, (result) => {
        resolve(key ? result[key] : result);
      });
    });
  },

  async setSync(key, value) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [key]: value }, resolve);
    });
  },

  async getSyncAll() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(null, resolve);
    });
  },

  // ── Local storage (cached exchange rates, history) ─────────────────────────

  async getLocal(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        resolve(key ? result[key] : result);
      });
    });
  },

  async setLocal(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  },

  // ── Default settings ───────────────────────────────────────────────────────

  getDefaults() {
    return {
      theme: 'dark',
      timeFormat: '12h',
      dateFormat: 'MM/DD/YYYY',
      defaultTab: 'time',
      refreshInterval: '6hr',
      workingHoursStart: 9,
      workingHoursEnd: 18,
      highlightConvert: true,
      rateAlerts: false,
      savedTimezones: [
        { id: 'America/New_York', label: 'New York', abbr: 'EST', flag: '🇺🇸' },
        { id: 'Europe/London', label: 'London', abbr: 'GMT', flag: '🇬🇧' },
        { id: 'Asia/Kolkata', label: 'India', abbr: 'IST', flag: '🇮🇳' }
      ],
      baseCurrency: 'USD',
      defaultTargetCurrency: 'INR',
      favoriteCurrencies: ['EUR', 'GBP', 'INR', 'JPY'],
      favoritePairs: [
        { from: 'USD', to: 'EUR' },
        { from: 'USD', to: 'INR' },
        { from: 'GBP', to: 'USD' }
      ],
      onboardingComplete: false
    };
  },

  async initDefaults() {
    const existing = await this.getSyncAll();
    const defaults = this.getDefaults();
    const toSet = {};
    for (const [key, val] of Object.entries(defaults)) {
      if (existing[key] === undefined) toSet[key] = val;
    }
    if (Object.keys(toSet).length > 0) {
      await new Promise((resolve) => chrome.storage.sync.set(toSet, resolve));
    }
  },

  async reset() {
    await new Promise((resolve) => chrome.storage.sync.clear(resolve));
    await this.initDefaults();
  }
};
