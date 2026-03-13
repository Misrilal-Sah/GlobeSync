// background.js — Service Worker

// ── On install ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  registerContextMenus();
  setupAlarms();

  if (details.reason === 'install') {
    // Open onboarding on first install
    chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html?onboarding=true') });
  }
});

// ── Context Menus ──────────────────────────────────────────────────────────

function registerContextMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'convert-time',
      title: '🌍 Convert Time with GlobeSync',
      contexts: ['selection']
    });
    chrome.contextMenus.create({
      id: 'convert-currency',
      title: '💱 Convert Currency with GlobeSync',
      contexts: ['selection']
    });
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  const action = info.menuItemId === 'convert-time' ? 'convertTime' : 'convertCurrency';
  chrome.tabs.sendMessage(tab.id, {
    action,
    text: info.selectionText
  });
});

// ── Alarms for currency refresh ────────────────────────────────────────────

function setupAlarms() {
  chrome.alarms.create('refreshRates', { periodInMinutes: 360 }); // 6 hours default
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshRates') {
    fetchAndCacheRates();
  }
});

async function fetchAndCacheRates() {
  try {
    const settings = await chrome.storage.sync.get('baseCurrency');
    const base = settings.baseCurrency || 'USD';
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
    if (res.ok) {
      const data = await res.json();
      await chrome.storage.local.set({
        [`exchangeRates_${base}`]: {
          base,
          rates: data.rates,
          timestamp: Date.now()
        }
      });
    }
  } catch (err) {
    console.warn('Background rate refresh failed:', err);
  }
}

// ── Keyboard commands ──────────────────────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-popup') {
    chrome.action.openPopup();
  } else if (command === 'quick-convert') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'quickConvert' });
      }
    });
  }
});

// ── Message handler ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'fetchRates') {
    fetchAndCacheRates().then(() => sendResponse({ success: true }));
    return true;
  }
  if (msg.action === 'getRates') {
    chrome.storage.local.get(`exchangeRates_${msg.base || 'USD'}`, (result) => {
      sendResponse(result[`exchangeRates_${msg.base || 'USD'}`] || null);
    });
    return true;
  }
});
