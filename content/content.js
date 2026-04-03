// content.js — Highlight-to-convert on webpages

(function() {
  'use strict';

  let tooltip = null;
  let enabled = true;

  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Load settings
  chrome.storage.sync.get(['highlightConvert', 'theme'], (s) => {
    enabled = s.highlightConvert !== false;
  });

  // ── Pattern detection ────────────────────────────────────────────────────

  const TIME_PATTERN = /\b(1[0-2]|0?[1-9]):[0-5][0-9]\s*(AM|PM)\s*(EST|EDT|PST|PDT|CST|CDT|MST|MDT|GMT|UTC|BST|CET|CEST|IST|JST|AEST|AEDT|SGT|HKT|KST|MSK|BRT|WAT|EAT|SAST|PKT|BDT|ICT|WIB|NZST|HST|AKST)?\b/gi;
  const TIME24_PATTERN = /\b([01]?[0-9]|2[0-3]):[0-5][0-9]\s*(EST|EDT|PST|PDT|CST|CDT|MST|MDT|GMT|UTC|BST|CET|CEST|IST|JST|AEST|AEDT|SGT|HKT|KST|MSK|BRT|WAT|EAT|SAST|PKT|BDT|ICT|WIB|NZST|HST|AKST)\b/gi;
  const CURRENCY_PATTERN = /(?:^|\s)([\$€£¥₹₩]|USD|EUR|GBP|JPY|INR|CAD|AUD|CHF|AED|SGD|HKD|KRW)\s?([\d,]+(?:\.\d{1,2})?)(?:\s|$)/gi;

  function isTimeLike(text) {
    return TIME_PATTERN.test(text) || TIME24_PATTERN.test(text);
  }

  function isCurrencyLike(text) {
    return CURRENCY_PATTERN.test(text);
  }

  // ── Tooltip creation ─────────────────────────────────────────────────────

  function removeTooltip() {
    if (tooltip) {
      tooltip.remove();
      tooltip = null;
    }
  }

  function createTooltip(x, y, content) {
    removeTooltip();
    tooltip = document.createElement('div');
    tooltip.id = 'tzcp-tooltip';
    tooltip.innerHTML = content;
    document.body.appendChild(tooltip);

    // Position
    const rect = tooltip.getBoundingClientRect();
    let left = x;
    let top = y - rect.height - 10;

    if (left + rect.width > window.innerWidth - 10) {
      left = window.innerWidth - rect.width - 10;
    }
    if (top < 10) top = y + 20;

    tooltip.style.left = `${Math.max(10, left)}px`;
    tooltip.style.top = `${Math.max(10, top)}px`;

    // Close button
    const closeBtn = tooltip.querySelector('.tzcp-close');
    if (closeBtn) closeBtn.onclick = removeTooltip;

    // Copy button
    const copyBtn = tooltip.querySelector('.tzcp-copy');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(copyBtn.dataset.copy || '').then(() => {
          copyBtn.textContent = '✓ Copied!';
          setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500);
        });
      };
    }
  }

  // ── Time conversion tooltip ──────────────────────────────────────────────

  async function showTimeTooltip(text, x, y) {
    const settings = await new Promise(r => chrome.storage.sync.get(['savedTimezones', 'timeFormat'], r));
    const zones = settings.savedTimezones || [];
    const fmt = settings.timeFormat === '24h';

    // Simple parse
    const tzAbbrs = {
      'EST': 'America/New_York', 'EDT': 'America/New_York',
      'PST': 'America/Los_Angeles', 'PDT': 'America/Los_Angeles',
      'CST': 'America/Chicago', 'GMT': 'Europe/London',
      'UTC': 'UTC', 'BST': 'Europe/London', 'IST': 'Asia/Kolkata',
      'JST': 'Asia/Tokyo', 'CET': 'Europe/Paris', 'CEST': 'Europe/Paris',
      'AEST': 'Australia/Sydney', 'SGT': 'Asia/Singapore',
      'HKT': 'Asia/Hong_Kong', 'KST': 'Asia/Seoul',
      'MSK': 'Europe/Moscow', 'BRT': 'America/Sao_Paulo',
      'PKT': 'Asia/Karachi', 'BDT': 'Asia/Dhaka',
      'ICT': 'Asia/Bangkok', 'WIB': 'Asia/Jakarta',
      'MST': 'America/Denver', 'MDT': 'America/Denver',
      'NZST': 'Pacific/Auckland', 'HST': 'Pacific/Honolulu',
      'WAT': 'Africa/Lagos', 'EAT': 'Africa/Nairobi',
      'SAST': 'Africa/Johannesburg', 'AKST': 'America/Anchorage'
    };

    // Extract time + tz
    const m12 = text.match(/(1[0-2]|0?[1-9]):([0-5][0-9])\s*(AM|PM)?\s*([A-Z]{2,5})?/i);
    if (!m12) return;

    let hour = parseInt(m12[1]);
    const min = parseInt(m12[2]);
    const ampm = m12[3] ? m12[3].toUpperCase() : null;
    const abbr = m12[4] ? m12[4].toUpperCase() : 'UTC';

    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    const srcTz = tzAbbrs[abbr] || 'UTC';

    let rows = '';
    let copyText = `${text}\n`;

    for (const zone of zones) {
      try {
        // Use Intl to convert
        const now = new Date();
        now.setHours(hour, min, 0, 0);
        // Offset trick
        const srcOffset = getOffset(srcTz, now);
        const dstOffset = getOffset(zone.id, now);
        const diff = (dstOffset - srcOffset) * 60 * 1000;
        const converted = new Date(now.getTime() + diff);

        let timeStr;
        if (fmt) {
          timeStr = `${String(converted.getHours()).padStart(2,'0')}:${String(converted.getMinutes()).padStart(2,'0')}`;
        } else {
          const h = converted.getHours();
          const m2 = String(converted.getMinutes()).padStart(2,'0');
          const ap = h >= 12 ? 'PM' : 'AM';
          const h12 = h % 12 || 12;
          timeStr = `${h12}:${m2} ${ap}`;
        }

        const nextDay = converted.toDateString() !== now.toDateString();
        const nextLabel = nextDay ? `<span class="tzcp-next">(${converted.getTime() > now.getTime() ? '+1' : '-1'}d)</span>` : '';

        rows += `<div class="tzcp-row">
          <span class="tzcp-label">${zone.flag || '🌐'} ${zone.label}</span>
          <span class="tzcp-value">${timeStr} ${zone.abbr || ''}${nextLabel}</span>
        </div>`;
        copyText += `${zone.flag || ''} ${zone.label}: ${timeStr}\n`;
      } catch {}
    }

    if (!rows) return;

    createTooltip(x, y, `
      <button class="tzcp-close">✕</button>
      <div class="tzcp-header">🕐 ${escHtml(text)}</div>
      ${rows}
      <div class="tzcp-footer">
        <button class="tzcp-btn tzcp-copy" data-copy="${escHtml(copyText.trim())}">📋 Copy All</button>
      </div>
    `);
  }

  function getOffset(tzId, date) {
    // Returns UTC offset in minutes (handles half-hour timezones like IST +5:30)
    try {
      const fmtParts = (tz) => new Intl.DateTimeFormat('en', {
        timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false
      }).formatToParts(date);
      const toMins = (parts) => {
        let h = parseInt(parts.find(p => p.type === 'hour').value);
        const m = parseInt(parts.find(p => p.type === 'minute').value);
        if (h === 24) h = 0; // normalize midnight
        return h * 60 + m;
      };
      let diff = toMins(fmtParts(tzId)) - toMins(fmtParts('UTC'));
      if (diff > 720) diff -= 1440;  // handle day boundary
      if (diff < -720) diff += 1440;
      return diff;
    } catch { return 0; }
  }

  // ── Currency conversion tooltip ──────────────────────────────────────────

  async function showCurrencyTooltip(text, x, y) {
    const settings = await new Promise(r =>
      chrome.storage.sync.get(['favoriteCurrencies', 'baseCurrency'], r)
    );
    const favs = settings.favoriteCurrencies || ['EUR', 'GBP', 'INR'];

    // Parse currency from text
    const symbolMap = { '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR', '₩': 'KRW' };
    let amount = null, currency = null;

    const m = text.trim().match(/^([\$€£¥₹₩]|USD|EUR|GBP|JPY|INR|CAD|AUD|CHF|AED|SGD|KRW)\s?([\d,]+(?:\.\d{1,2})?)$|^([\d,]+(?:\.\d{1,2})?)\s*(USD|EUR|GBP|JPY|INR|CAD|AUD|CHF|AED|SGD|KRW)$/i);
    if (m) {
      if (m[1]) {
        currency = symbolMap[m[1]] || m[1].toUpperCase();
        amount = parseFloat(m[2].replace(/,/g, ''));
      } else {
        amount = parseFloat(m[3].replace(/,/g, ''));
        currency = m[4].toUpperCase();
      }
    } else {
      // Try just symbol + number anywhere
      const m2 = text.match(/([\$€£¥₹₩])\s?([\d,]+(?:\.\d{1,2})?)/);
      if (m2) {
        currency = symbolMap[m2[1]] || 'USD';
        amount = parseFloat(m2[2].replace(/,/g, ''));
      }
    }

    if (!amount || !currency) return;

    // Get rates
    const cached = await new Promise(r =>
      chrome.storage.local.get(`exchangeRates_${currency}`, (res) => r(res[`exchangeRates_${currency}`]))
    );

    // Also try USD base
    const cachedUSD = await new Promise(r =>
      chrome.storage.local.get('exchangeRates_USD', (res) => r(res['exchangeRates_USD']))
    );

    const rates = cached || cachedUSD;
    if (!rates) {
      createTooltip(x, y, `
        <button class="tzcp-close">✕</button>
        <div class="tzcp-header">💵 ${text}</div>
        <div class="tzcp-row"><span class="tzcp-label">Loading rates...</span></div>
      `);
      return;
    }

    const currencyNames = {
      USD: { symbol: '$', flag: '🇺🇸' }, EUR: { symbol: '€', flag: '🇪🇺' },
      GBP: { symbol: '£', flag: '🇬🇧' }, JPY: { symbol: '¥', flag: '🇯🇵' },
      INR: { symbol: '₹', flag: '🇮🇳' }, CAD: { symbol: 'C$', flag: '🇨🇦' },
      AUD: { symbol: 'A$', flag: '🇦🇺' }, CHF: { symbol: 'Fr', flag: '🇨🇭' },
      AED: { symbol: 'د.إ', flag: '🇦🇪' }, SGD: { symbol: 'S$', flag: '🇸🇬' },
      HKD: { symbol: 'HK$', flag: '🇭🇰' }, KRW: { symbol: '₩', flag: '🇰🇷' },
      BRL: { symbol: 'R$', flag: '🇧🇷' }, MXN: { symbol: '$', flag: '🇲🇽' }
    };

    function convert(amt, from, to, r) {
      if (from === to) return amt;
      let base = from === r.base ? amt : amt / r.rates[from];
      return base * r.rates[to];
    }

    function fmt(val, cur) {
      const info = currencyNames[cur] || {};
      const decimals = ['JPY','KRW'].includes(cur) ? 0 : 2;
      return `${info.symbol || cur} ${val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    }

    let rows = '';
    let copyText = `${text}\n`;

    const toShow = favs.filter(c => c !== currency).slice(0, 4);
    for (const cur of toShow) {
      try {
        const val = convert(amount, currency, cur, rates);
        const info = currencyNames[cur] || { flag: '🌐' };
        rows += `<div class="tzcp-row">
          <span class="tzcp-label">${info.flag} ${cur}</span>
          <span class="tzcp-value">${fmt(val, cur)}</span>
        </div>`;
        copyText += `${cur}: ${fmt(val, cur)}\n`;
      } catch {}
    }

    createTooltip(x, y, `
      <button class="tzcp-close">✕</button>
      <div class="tzcp-header">💵 ${escHtml(text)}</div>
      ${rows}
      <div class="tzcp-footer">
        <button class="tzcp-btn tzcp-copy" data-copy="${escHtml(copyText.trim())}">📋 Copy</button>
      </div>
    `);
  }

  // ── Event listeners ──────────────────────────────────────────────────────

  document.addEventListener('mouseup', async (e) => {
    if (!enabled) return;
    if (tooltip && tooltip.contains(e.target)) return;

    setTimeout(async () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const text = sel.toString().trim();
      if (!text || text.length > 30) return;

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const x = rect.left + rect.width / 2 + window.scrollX;
      const y = rect.top + window.scrollY;

      // Reset patterns
      TIME_PATTERN.lastIndex = 0;
      TIME24_PATTERN.lastIndex = 0;
      CURRENCY_PATTERN.lastIndex = 0;

      if (isTimeLike(text)) {
        await showTimeTooltip(text, x, y);
      } else if (isCurrencyLike(text)) {
        await showCurrencyTooltip(text, x, y);
      }
    }, 50);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') removeTooltip();
  });

  document.addEventListener('mousedown', (e) => {
    if (tooltip && !tooltip.contains(e.target)) removeTooltip();
  });

  // ── Message listener ──────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'convertTime') showTimeTooltip(msg.text, 200, 200);
    if (msg.action === 'convertCurrency') showCurrencyTooltip(msg.text, 200, 200);
    if (msg.action === 'quickConvert') {
      const text = window.getSelection().toString().trim();
      if (text) {
        TIME_PATTERN.lastIndex = 0;
        TIME24_PATTERN.lastIndex = 0;
        CURRENCY_PATTERN.lastIndex = 0;
        if (isTimeLike(text)) showTimeTooltip(text, window.innerWidth/2, 200);
        else if (isCurrencyLike(text)) showCurrencyTooltip(text, window.innerWidth/2, 200);
      }
    }
  });

})();
