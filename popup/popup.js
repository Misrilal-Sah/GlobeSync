// popup.js — GlobeSync main popup controller

'use strict';

// ── State ────────────────────────────────────────────────────────

let settings = {};
let rates = null;
let tickInterval = null;

// ── Init ─────────────────────────────────────────────────────────

async function init() {
  await Storage.initDefaults();
  settings = await Storage.getSyncAll();

  applyTheme(settings.theme);
  await loadRates();
  setupTabs();
  setupThemeToggle();

  // Show default tab
  const def = settings.defaultTab || 'time';
  activateTab(def);

  // Check onboarding
  const params = new URLSearchParams(window.location.search);
  if (!settings.onboardingComplete || params.get('onboarding')) {
    showOnboarding();
  }

  renderTimezones();
  renderCurrency();
  renderSettings();
  initTimeConverter();

  // Start clock tick
  tickInterval = setInterval(updateClocks, 1000);
}

// ── Theme ────────────────────────────────────────────────────────

function applyTheme(theme) {
  const body = document.body;
  body.classList.remove('dark', 'light');
  body.classList.add(theme || 'dark');
}

function setupThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  btn.textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
  btn.onclick = async () => {
    const isDark = document.body.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    await Storage.setSync('theme', newTheme);
    settings.theme = newTheme;
    applyTheme(newTheme);
    btn.textContent = newTheme === 'light' ? '☀️' : '🌙';
  };
}

// ── Tabs ─────────────────────────────────────────────────────────

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => activateTab(tab.dataset.tab);
  });
}

function activateTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(tc => {
    tc.classList.toggle('hidden', tc.id !== `tab-${name}`);
    tc.classList.toggle('active', tc.id === `tab-${name}`);
  });
}

// ── Onboarding ───────────────────────────────────────────────────

function showOnboarding() {
  const el = document.getElementById('onboarding');
  el.classList.remove('hidden');
  let slide = 1;

  document.getElementById('ob-next').onclick = () => {
    slide++;
    if (slide > 3) {
      finishOnboarding();
      return;
    }
    document.querySelectorAll('.ob-slide').forEach(s => s.classList.remove('active'));
    document.querySelector(`[data-slide="${slide}"]`).classList.add('active');
    document.querySelectorAll('.ob-dot').forEach((d,i) => d.classList.toggle('active', i === slide-1));
    if (slide === 3) document.getElementById('ob-next').textContent = "Let's Go! 🚀";
  };

  document.getElementById('ob-skip').onclick = finishOnboarding;
}

async function finishOnboarding() {
  document.getElementById('onboarding').classList.add('hidden');
  await Storage.setSync('onboardingComplete', true);
}

// ── Custom Confirm Dialog ────────────────────────────────────────

function showConfirm(title, message, okLabel, onConfirm) {
  const modal = document.getElementById('confirm-modal');
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = message;
  document.getElementById('confirm-ok').textContent = okLabel || 'OK';
  modal.classList.remove('hidden');

  document.getElementById('confirm-ok').onclick = () => {
    modal.classList.add('hidden');
    if (onConfirm) onConfirm();
  };
  document.getElementById('confirm-cancel').onclick = () => {
    modal.classList.add('hidden');
  };
}

// ── Custom Select Dropdown Component ─────────────────────────────

function initCustomSelect(btnId, dropdownId, searchId, optionsId, hiddenId, currencies, onSelect) {
  const btn = document.getElementById(btnId);
  const dropdown = document.getElementById(dropdownId);
  const search = document.getElementById(searchId);
  const optionsEl = document.getElementById(optionsId);
  const hidden = hiddenId ? document.getElementById(hiddenId) : null;

  function renderOptions(filter = '') {
    const q = filter.toLowerCase();
    const filtered = q
      ? currencies.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
      : currencies;
    optionsEl.innerHTML = filtered.map(c =>
      `<div class="custom-select-option" data-code="${c.code}">${c.flag} ${c.code} — ${c.name}</div>`
    ).join('');

    optionsEl.querySelectorAll('.custom-select-option').forEach(opt => {
      opt.onclick = (e) => {
        e.stopPropagation();
        const code = opt.dataset.code;
        const cur = currencies.find(cc => cc.code === code);
        btn.textContent = `${cur.flag} ${cur.code}`;
        if (hidden) hidden.value = code;
        dropdown.classList.add('hidden');
        if (onSelect) onSelect(code);
      };
    });
  }

  btn.onclick = (e) => {
    e.stopPropagation();
    // Close any other open dropdowns
    document.querySelectorAll('.custom-select-dropdown').forEach(d => {
      if (d.id !== dropdownId) d.classList.add('hidden');
    });
    const isOpen = !dropdown.classList.contains('hidden');
    dropdown.classList.toggle('hidden', isOpen);
    if (!isOpen) {
      search.value = '';
      renderOptions();
      search.focus();
    }
  };

  search.oninput = () => renderOptions(search.value);
  search.onclick = (e) => e.stopPropagation();

  renderOptions();
  return { renderOptions };
}

// Close dropdowns on outside click
document.addEventListener('click', () => {
  document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.add('hidden'));
});

// ── Timezone Tab ─────────────────────────────────────────────────

function renderTimezones() {
  const container = document.getElementById('tz-cards');
  const zones = settings.savedTimezones || [];

  if (zones.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🌍</div><p>No timezones yet.<br>Search above to add some!</p></div>`;
    return;
  }

  container.innerHTML = zones.map((z, i) => buildTzCard(z, i)).join('');

  // Remove buttons
  container.querySelectorAll('.tz-remove').forEach(btn => {
    btn.onclick = async () => {
      const idx = parseInt(btn.dataset.idx);
      settings.savedTimezones.splice(idx, 1);
      await Storage.setSync('savedTimezones', settings.savedTimezones);
      renderTimezones();
    };
  });
}

function buildTzCard(z, idx) {
  const fmt = settings.timeFormat === '24h';
  const dateFmt = settings.dateFormat || 'MM/DD/YYYY';
  const start = settings.workingHoursStart ?? 9;
  const end = settings.workingHoursEnd ?? 18;

  try {
    const dt = luxon.DateTime.now().setZone(z.id);
    const timeStr = fmt ? dt.toFormat('HH:mm') : dt.toFormat('h:mm a');
    const dateStr = dateFmt === 'DD/MM/YYYY' ? dt.toFormat('ccc, d LLL') : dt.toFormat('ccc, LLL d');
    const offset = getUTCOffsetStr(z.id);
    const h = dt.hour;
    const isWorking = h >= start && h < end;
    const statusDot = isWorking ? '🟢' : '🔴';

    return `<div class="tz-card">
      <div class="tz-flag">${z.flag || '🌐'}</div>
      <div class="tz-info">
        <div class="tz-name">${z.label}</div>
        <div class="tz-meta">${z.abbr || ''} · ${offset}</div>
      </div>
      <div class="tz-time-block">
        <div class="tz-time">${timeStr}<span class="tz-status">${statusDot}</span></div>
        <div class="tz-date">${dateStr}</div>
      </div>
      <button class="tz-remove" data-idx="${idx}" title="Remove">✕</button>
    </div>`;
  } catch {
    return '';
  }
}

function getUTCOffsetStr(tzId) {
  try {
    const dt = luxon.DateTime.now().setZone(tzId);
    const off = dt.offset;
    const sign = off >= 0 ? '+' : '-';
    const abs = Math.abs(off);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `UTC${sign}${h}${m > 0 ? ':' + String(m).padStart(2,'0') : ''}`;
  } catch { return 'UTC'; }
}

function updateClocks() {
  const cards = document.querySelectorAll('.tz-card');
  const fmt = settings.timeFormat === '24h';
  const dateFmt = settings.dateFormat || 'MM/DD/YYYY';
  const start = settings.workingHoursStart ?? 9;
  const end = settings.workingHoursEnd ?? 18;

  (settings.savedTimezones || []).forEach((z, i) => {
    const card = cards[i];
    if (!card) return;
    try {
      const dt = luxon.DateTime.now().setZone(z.id);
      const timeStr = fmt ? dt.toFormat('HH:mm') : dt.toFormat('h:mm a');
      const dateStr = dateFmt === 'DD/MM/YYYY' ? dt.toFormat('ccc, d LLL') : dt.toFormat('ccc, LLL d');
      const h = dt.hour;
      const statusDot = (h >= start && h < end) ? '🟢' : '🔴';
      const timeEl = card.querySelector('.tz-time');
      const dateEl = card.querySelector('.tz-date');
      if (timeEl) timeEl.innerHTML = `${timeStr}<span class="tz-status">${statusDot}</span>`;
      if (dateEl) dateEl.textContent = dateStr;
    } catch {}
  });
}

// ── Search / Autocomplete ─────────────────────────────────────────

const searchInput = document.getElementById('tz-search');
const suggestionsEl = document.getElementById('tz-suggestions');

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { suggestionsEl.classList.add('hidden'); return; }

  const cities = TimeHelper.getCityList();
  const matches = cities.filter(c =>
    c.city.toLowerCase().includes(q) ||
    c.country.toLowerCase().includes(q) ||
    c.tz.toLowerCase().includes(q)
  ).slice(0, 8);

  if (!matches.length) { suggestionsEl.classList.add('hidden'); return; }

  suggestionsEl.innerHTML = matches.map(c => `
    <div class="suggestion-item" data-tz="${c.tz}" data-label="${c.city}" data-flag="${c.flag}" data-country="${c.country}">
      <span class="sug-flag">${c.flag}</span>
      <span class="sug-city">${c.city}</span>
      <span class="sug-tz">${c.country} · ${c.tz}</span>
    </div>
  `).join('');
  suggestionsEl.classList.remove('hidden');

  suggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
    item.onclick = async () => {
      const tzId = item.dataset.tz;
      const alreadyAdded = (settings.savedTimezones || []).some(z => z.id === tzId);
      if (!alreadyAdded) {
        const dt = luxon.DateTime.now().setZone(tzId);
        const abbr = dt.toFormat('ZZZZ');
        settings.savedTimezones = settings.savedTimezones || [];
        settings.savedTimezones.push({
          id: tzId,
          label: item.dataset.label + ', ' + item.dataset.country,
          abbr,
          flag: item.dataset.flag
        });
        await Storage.setSync('savedTimezones', settings.savedTimezones);
        renderTimezones();
      }
      searchInput.value = '';
      suggestionsEl.classList.add('hidden');
    };
  });
});

document.addEventListener('click', (e) => {
  if (!searchInput.contains(e.target) && !suggestionsEl.contains(e.target)) {
    suggestionsEl.classList.add('hidden');
  }
});

// ── Copy all times ────────────────────────────────────────────────

document.getElementById('copy-all-times').onclick = () => {
  const fmt = settings.timeFormat === '24h';
  const parts = (settings.savedTimezones || []).map(z => {
    try {
      const dt = luxon.DateTime.now().setZone(z.id);
      const t = fmt ? dt.toFormat('HH:mm') : dt.toFormat('h:mm a');
      return `${z.abbr || z.label} ${t}`;
    } catch { return null; }
  }).filter(Boolean);
  navigator.clipboard.writeText(parts.join(' | ')).then(() => {
    const btn = document.getElementById('copy-all-times');
    btn.textContent = '✓ Copied!';
    setTimeout(() => btn.textContent = '📋 Copy All', 1500);
  });
};

// ── Time Converter Widget ─────────────────────────────────────────

function initTimeConverter() {
  const formatSel = document.getElementById('tc-format');
  const ampmWrap = document.getElementById('tc-ampm-wrap');
  const ampmSel = document.getElementById('tc-ampm');
  const hourBtn = document.getElementById('tc-hour-btn');
  const hourMenu = document.getElementById('tc-hour-menu');
  const minBtn = document.getElementById('tc-min-btn');
  const minMenu = document.getElementById('tc-min-menu');
  const fromTzSel = document.getElementById('tc-from-tz');
  const toTzSel = document.getElementById('tc-to-tz');
  const convertBtn = document.getElementById('tc-convert-btn');
  const resultEl = document.getElementById('tc-result');

  // Populate time menus
  function populateTimeMenus(is12h) {
    let hl = '';
    const start = is12h ? 1 : 0;
    const end = is12h ? 12 : 23;
    for (let i = start; i <= end; i++) {
      const v = is12h ? i.toString() : i.toString().padStart(2, '0');
      hl += `<div class="time-opt" data-val="${i}">${v}</div>`;
    }
    hourMenu.innerHTML = hl;

    let ml = '';
    for (let i = 0; i < 60; i++) {
      const v = i.toString().padStart(2, '0');
      ml += `<div class="time-opt" data-val="${i}">${v}</div>`;
    }
    minMenu.innerHTML = ml;

    hourMenu.querySelectorAll('.time-opt').forEach(opt => {
      opt.onclick = (e) => {
        e.stopPropagation();
        hourBtn.textContent = opt.textContent;
        hourBtn.dataset.val = opt.dataset.val;
        hourMenu.classList.add('hidden');
      };
    });
    minMenu.querySelectorAll('.time-opt').forEach(opt => {
      opt.onclick = (e) => {
        e.stopPropagation();
        minBtn.textContent = opt.textContent;
        minBtn.dataset.val = opt.dataset.val;
        minMenu.classList.add('hidden');
      };
    });
  }

  let currentFormat = settings.timeFormat || '12h';
  formatSel.value = currentFormat;
  populateTimeMenus(currentFormat === '12h');

  if (currentFormat === '12h') {
    hourBtn.textContent = '12';
    hourBtn.dataset.val = '12';
    ampmWrap.classList.remove('tc-hidden');
  } else {
    hourBtn.textContent = '00';
    hourBtn.dataset.val = '0';
    ampmWrap.classList.add('tc-hidden');
  }
  minBtn.textContent = '00';
  minBtn.dataset.val = '0';

  function scrollToSelected(menu, val) {
    menu.querySelectorAll('.time-opt').forEach(opt => opt.classList.remove('selected'));
    const target = menu.querySelector(`.time-opt[data-val="${val}"]`);
    if (target) {
      target.classList.add('selected');
      // Set a small timeout so the DOM element has time to become visible for scrolling
      setTimeout(() => {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 10);
    }
  }

  hourBtn.onclick = (e) => {
    e.stopPropagation();
    minMenu.classList.add('hidden');
    hourMenu.classList.toggle('hidden');
    if(!hourMenu.classList.contains('hidden')) {
      scrollToSelected(hourMenu, hourBtn.dataset.val);
    }
  };
  minBtn.onclick = (e) => {
    e.stopPropagation();
    hourMenu.classList.add('hidden');
    minMenu.classList.toggle('hidden');
    if(!minMenu.classList.contains('hidden')) {
      scrollToSelected(minMenu, minBtn.dataset.val);
    }
  };

  document.addEventListener('click', () => {
    hourMenu.classList.add('hidden');
    minMenu.classList.add('hidden');
  });

  // Populate timezone dropdowns
  const cities = TimeHelper.getCityList();
  const tzOptions = cities.map(c => {
    const offset = TimeHelper.getUTCOffset(c.tz);
    return `<option value="${c.tz}">${c.flag} ${c.city} (${offset})</option>`;
  }).join('');
  fromTzSel.innerHTML = tzOptions;
  toTzSel.innerHTML = tzOptions;

  // Set sensible defaults — try to match user's saved timezones
  const saved = settings.savedTimezones || [];
  if (saved.length >= 2) {
    fromTzSel.value = saved[0].id;
    toTzSel.value = saved[1].id;
  } else if (saved.length === 1) {
    fromTzSel.value = saved[0].id;
  }

  // Show/hide AM/PM based on format
  formatSel.onchange = () => {
    const is12h = formatSel.value === '12h';
    if (is12h) {
      ampmWrap.classList.remove('tc-hidden');
    } else {
      ampmWrap.classList.add('tc-hidden');
    }

    populateTimeMenus(is12h);
    let h = parseInt(hourBtn.dataset.val || '0');
    if (is12h) {
      if (h === 0) { h = 12; ampmSel.value = 'AM'; }
      else if (h > 12) { h -= 12; ampmSel.value = 'PM'; }
      else if (h === 12) { ampmSel.value = 'PM'; }
      else { ampmSel.value = 'AM'; }
      hourBtn.textContent = h.toString();
      hourBtn.dataset.val = h.toString();
    } else {
      if (ampmSel.value === 'PM' && h !== 12) h += 12;
      if (ampmSel.value === 'AM' && h === 12) h = 0;
      hourBtn.textContent = h.toString().padStart(2, '0');
      hourBtn.dataset.val = h.toString();
    }
  };

  // Convert button
  convertBtn.onclick = () => {
    let hour = parseInt(hourBtn.dataset.val);
    const minute = parseInt(minBtn.dataset.val);
    const is12h = formatSel.value === '12h';

    if (isNaN(hour) || isNaN(minute)) {
      showTcResult('Please select a time', '', true);
      return;
    }

    if (is12h) {
      const ampm = ampmSel.value;
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
    }

    const fromTz = fromTzSel.value;
    const toTz = toTzSel.value;

    try {
      // Create DateTime in the "from" timezone
      const dt = luxon.DateTime.now().setZone(fromTz).set({ hour, minute, second: 0 });
      // Convert to "to" timezone
      const converted = dt.setZone(toTz);

      const resultTime = is12h
        ? converted.toFormat('h:mm a')
        : converted.toFormat('HH:mm');

      const fromCity = cities.find(c => c.tz === fromTz);
      const toCity = cities.find(c => c.tz === toTz);
      const fromLabel = fromCity ? fromCity.city : fromTz;
      const toLabel = toCity ? toCity.city : toTz;
      const fromOffset = TimeHelper.getUTCOffset(fromTz);
      const toOffset = TimeHelper.getUTCOffset(toTz);

      const dateStr = converted.toFormat('ccc, LLL d');
      const detail = `${fromLabel} (${fromOffset}) → ${toLabel} (${toOffset}) · ${dateStr}`;

      showTcResult(resultTime, detail, false);
    } catch {
      showTcResult('Conversion error', '', true);
    }
  };

  function showTcResult(time, detail, isError) {
    resultEl.classList.remove('hidden');
    resultEl.innerHTML = `
      <div class="tc-result-time" style="${isError ? 'font-size:13px;color:var(--danger);' : ''}">${time}</div>
      ${detail ? `<div class="tc-result-detail">${detail}</div>` : ''}
    `;
  }
}

// ── Currency Tab ──────────────────────────────────────────────────

async function loadRates() {
  const base = settings.baseCurrency || 'USD';
  const cacheKey = `exchangeRates_${base}`;
  rates = await Storage.getLocal(cacheKey);

  if (!rates || (Date.now() - rates.timestamp) > 3600000) {
    try {
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${base}`);
      if (res.ok) {
        const data = await res.json();
        rates = { base, rates: data.rates, timestamp: Date.now() };
        await Storage.setLocal(cacheKey, rates);
      }
    } catch {}
  }
}

function renderCurrency() {
  const currencies = CurrencyHelper.getCurrencyList();

  // Init custom selects for From and To
  initCustomSelect('conv-from-btn', 'conv-from-dropdown', 'conv-from-search', 'conv-from-options', 'conv-from', currencies, () => updateConversion());
  initCustomSelect('conv-to-btn', 'conv-to-dropdown', 'conv-to-search', 'conv-to-options', 'conv-to', currencies, () => updateConversion());

  // Set defaults
  const fromVal = settings.baseCurrency || 'USD';
  const toVal = settings.defaultTargetCurrency || 'INR';
  const fromInfo = CurrencyHelper.currencies[fromVal] || {};
  const toInfo = CurrencyHelper.currencies[toVal] || {};
  document.getElementById('conv-from').value = fromVal;
  document.getElementById('conv-to').value = toVal;
  document.getElementById('conv-from-btn').textContent = `${fromInfo.flag || '🌐'} ${fromVal}`;
  document.getElementById('conv-to-btn').textContent = `${toInfo.flag || '🌐'} ${toVal}`;

  renderFavRates();
  renderFavPairs();
  updateConversion();
  updateRateMeta();

  document.getElementById('conv-amount').oninput = updateConversion;

  document.getElementById('swap-currencies').onclick = () => {
    const fromEl = document.getElementById('conv-from');
    const toEl = document.getElementById('conv-to');
    const fromBtn = document.getElementById('conv-from-btn');
    const toBtn = document.getElementById('conv-to-btn');
    const tmpVal = fromEl.value;
    const tmpText = fromBtn.textContent;
    fromEl.value = toEl.value;
    fromBtn.textContent = toBtn.textContent;
    toEl.value = tmpVal;
    toBtn.textContent = tmpText;
    updateConversion();
  };

  document.getElementById('refresh-rates').onclick = async () => {
    const btn = document.getElementById('refresh-rates');
    btn.classList.add('spinning');
    await loadRates();
    renderFavRates();
    renderFavPairs();
    updateConversion();
    updateRateMeta();
    setTimeout(() => btn.classList.remove('spinning'), 600);
  };

  // Add favorite button
  document.getElementById('add-fav-btn').onclick = () => showAddFavModal();

  // Add pair button
  document.getElementById('add-pair-btn').onclick = () => showAddPairModal();
}

function updateConversion() {
  const amount = parseFloat(document.getElementById('conv-amount').value) || 0;
  const from = document.getElementById('conv-from').value;
  const to = document.getElementById('conv-to').value;

  if (!rates) {
    document.getElementById('conv-output').textContent = 'Loading...';
    return;
  }

  const result = CurrencyHelper.convert(amount, from, to, rates);
  document.getElementById('conv-output').textContent = CurrencyHelper.formatAmount(result, to);

  const rate = CurrencyHelper.convert(1, from, to, rates);
  document.getElementById('conv-rate').textContent = rate
    ? `1 ${from} = ${rate.toFixed(4)} ${to}`
    : '';
}

function updateRateMeta() {
  const el = document.getElementById('rate-updated');
  if (rates?.timestamp) {
    el.textContent = `Updated: ${CurrencyHelper.getTimeAgo(rates.timestamp)}`;
  } else {
    el.textContent = 'Not loaded';
  }
}

// ── Favorite Rates (always 1 USD equivalent) ──────────────────────

function renderFavRates() {
  const base = settings.baseCurrency || 'USD';
  const favs = settings.favoriteCurrencies || ['EUR', 'GBP', 'INR', 'JPY'];
  const container = document.getElementById('fav-rates');

  container.innerHTML = favs.map((cur, idx) => {
    const info = CurrencyHelper.currencies[cur] || {};
    let val = '—';
    if (rates) {
      const converted = CurrencyHelper.convert(1, base, cur, rates);
      val = CurrencyHelper.formatAmount(converted, cur);
    }
    return `<div class="fav-rate-item">
      <button class="fav-remove" data-fav-idx="${idx}" title="Remove">✕</button>
      <span class="fav-rate-label">${info.flag || '🌐'} ${cur}</span>
      <span class="fav-rate-value">${val}</span>
    </div>`;
  }).join('');

  // Remove handlers
  container.querySelectorAll('.fav-remove').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.favIdx);
      settings.favoriteCurrencies.splice(idx, 1);
      await Storage.setSync('favoriteCurrencies', settings.favoriteCurrencies);
      renderFavRates();
    };
  });
}

function renderFavPairs() {
  const pairs = settings.favoritePairs || [];
  const container = document.getElementById('fav-pairs');

  if (!rates) { container.innerHTML = '<div style="color:var(--text2);font-size:11px;padding:6px;">Loading rates...</div>'; return; }

  container.innerHTML = pairs.map((p, idx) => {
    const rate = CurrencyHelper.convert(1, p.from, p.to, rates);
    const fromInfo = CurrencyHelper.currencies[p.from] || {};
    const toInfo = CurrencyHelper.currencies[p.to] || {};
    const rateStr = rate ? rate.toFixed(4) : '—';
    return `<div class="fav-pair-item">
      <button class="fav-remove" data-pair-idx="${idx}" title="Remove">✕</button>
      <span class="fav-pair-label">${fromInfo.flag || ''} ${p.from} → ${toInfo.flag || ''} ${p.to}</span>
      <span class="fav-pair-rate">${rateStr}</span>
    </div>`;
  }).join('');

  container.querySelectorAll('.fav-remove').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.pairIdx);
      settings.favoritePairs.splice(idx, 1);
      await Storage.setSync('favoritePairs', settings.favoritePairs);
      renderFavPairs();
    };
  });
}

// ── Add Favorite Currency Modal ───────────────────────────────────

function showAddFavModal() {
  const modal = document.getElementById('add-fav-modal');
  modal.classList.remove('hidden');
  let selectedCode = null;

  const currencies = CurrencyHelper.getCurrencyList();
  const btn = document.getElementById('add-fav-select-btn');
  const dropdown = document.getElementById('add-fav-dropdown');
  const search = document.getElementById('add-fav-search');
  const optionsEl = document.getElementById('add-fav-options');

  btn.textContent = 'Select currency...';

  function renderOpts(filter = '') {
    const q = filter.toLowerCase();
    const existing = settings.favoriteCurrencies || [];
    const filtered = currencies.filter(c =>
      !existing.includes(c.code) &&
      (!q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
    );
    optionsEl.innerHTML = filtered.map(c =>
      `<div class="custom-select-option" data-code="${c.code}">${c.flag} ${c.code} — ${c.name}</div>`
    ).join('');
    optionsEl.querySelectorAll('.custom-select-option').forEach(opt => {
      opt.onclick = (e) => {
        e.stopPropagation();
        selectedCode = opt.dataset.code;
        const cur = currencies.find(cc => cc.code === selectedCode);
        btn.textContent = `${cur.flag} ${cur.code} — ${cur.name}`;
        dropdown.classList.add('hidden');
      };
    });
  }

  btn.onclick = (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('hidden');
    if (!dropdown.classList.contains('hidden')) {
      search.value = '';
      renderOpts();
      search.focus();
    }
  };
  search.oninput = () => renderOpts(search.value);
  search.onclick = (e) => e.stopPropagation();

  document.getElementById('add-fav-ok').onclick = async () => {
    if (selectedCode) {
      settings.favoriteCurrencies = settings.favoriteCurrencies || [];
      if (!settings.favoriteCurrencies.includes(selectedCode)) {
        settings.favoriteCurrencies.push(selectedCode);
        await Storage.setSync('favoriteCurrencies', settings.favoriteCurrencies);
        renderFavRates();
      }
    }
    modal.classList.add('hidden');
    dropdown.classList.add('hidden');
  };

  document.getElementById('add-fav-cancel').onclick = () => {
    modal.classList.add('hidden');
    dropdown.classList.add('hidden');
  };
}

// ── Add Favorite Pair Modal ───────────────────────────────────────

function showAddPairModal() {
  const modal = document.getElementById('add-pair-modal');
  modal.classList.remove('hidden');
  let fromCode = 'USD', toCode = 'INR';

  const currencies = CurrencyHelper.getCurrencyList();

  function setupPairSelect(btnId, dropId, searchId, optsId, defaultCode, onChange) {
    const btn = document.getElementById(btnId);
    const dropdown = document.getElementById(dropId);
    const search = document.getElementById(searchId);
    const optionsEl = document.getElementById(optsId);
    const info = CurrencyHelper.currencies[defaultCode] || {};
    btn.textContent = `${info.flag || '🌐'} ${defaultCode}`;

    function renderOpts(filter = '') {
      const q = filter.toLowerCase();
      const filtered = q
        ? currencies.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
        : currencies;
      optionsEl.innerHTML = filtered.map(c =>
        `<div class="custom-select-option" data-code="${c.code}">${c.flag} ${c.code} — ${c.name}</div>`
      ).join('');
      optionsEl.querySelectorAll('.custom-select-option').forEach(opt => {
        opt.onclick = (e) => {
          e.stopPropagation();
          const code = opt.dataset.code;
          const cur = currencies.find(cc => cc.code === code);
          btn.textContent = `${cur.flag} ${cur.code}`;
          dropdown.classList.add('hidden');
          onChange(code);
        };
      });
    }

    btn.onclick = (e) => {
      e.stopPropagation();
      // Close sibling dropdowns in pair modal
      document.querySelectorAll('#add-pair-modal .custom-select-dropdown').forEach(d => {
        if (d.id !== dropId) d.classList.add('hidden');
      });
      dropdown.classList.toggle('hidden');
      if (!dropdown.classList.contains('hidden')) {
        search.value = '';
        renderOpts();
        search.focus();
      }
    };
    search.oninput = () => renderOpts(search.value);
    search.onclick = (e) => e.stopPropagation();
  }

  setupPairSelect('pair-from-btn', 'pair-from-dropdown', 'pair-from-search', 'pair-from-options', fromCode, (c) => { fromCode = c; });
  setupPairSelect('pair-to-btn', 'pair-to-dropdown', 'pair-to-search', 'pair-to-options', toCode, (c) => { toCode = c; });

  document.getElementById('add-pair-ok').onclick = async () => {
    settings.favoritePairs = settings.favoritePairs || [];
    const exists = settings.favoritePairs.some(p => p.from === fromCode && p.to === toCode);
    if (!exists && fromCode !== toCode) {
      settings.favoritePairs.push({ from: fromCode, to: toCode });
      await Storage.setSync('favoritePairs', settings.favoritePairs);
      renderFavPairs();
    }
    modal.classList.add('hidden');
  };

  document.getElementById('add-pair-cancel').onclick = () => {
    modal.classList.add('hidden');
  };
}

// ── Settings Tab ──────────────────────────────────────────────────

function renderSettings() {
  // Sync toggle buttons state
  document.querySelectorAll('.tog').forEach(btn => {
    const pref = btn.dataset.pref;
    const val = btn.dataset.val;
    btn.classList.toggle('active', settings[pref] === val);
    btn.onclick = async () => {
      settings[pref] = val;
      await Storage.setSync(pref, val);
      document.querySelectorAll(`.tog[data-pref="${pref}"]`).forEach(b => b.classList.toggle('active', b.dataset.val === val));
      if (pref === 'theme') {
        applyTheme(val);
        const themeBtn = document.getElementById('theme-toggle');
        themeBtn.textContent = document.body.classList.contains('light') ? '☀️' : '🌙';
      }
    };
  });

  const workStart = document.getElementById('work-start');
  const workEnd = document.getElementById('work-end');
  workStart.value = settings.workingHoursStart ?? 9;
  workEnd.value = settings.workingHoursEnd ?? 18;

  workStart.onchange = async () => {
    settings.workingHoursStart = parseInt(workStart.value);
    await Storage.setSync('workingHoursStart', settings.workingHoursStart);
  };
  workEnd.onchange = async () => {
    settings.workingHoursEnd = parseInt(workEnd.value);
    await Storage.setSync('workingHoursEnd', settings.workingHoursEnd);
  };



  document.getElementById('export-settings').onclick = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'globesync-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById('import-settings').onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const imported = JSON.parse(text);
        Object.assign(settings, imported);
        await new Promise(r => chrome.storage.sync.set(settings, r));
        applyTheme(settings.theme);
        renderTimezones();
        renderSettings();
        renderCurrency();
      } catch {
        showConfirm('Error', 'Invalid settings file. Please select a valid JSON export.', 'OK');
      }
    };
    input.click();
  };

  document.getElementById('reset-settings').onclick = () => {
    showConfirm(
      'Reset Settings',
      'This will reset all settings, saved timezones, and favorite currencies to default. This cannot be undone.',
      'Reset',
      async () => {
        await Storage.reset();
        settings = await Storage.getSyncAll();
        applyTheme(settings.theme);
        renderTimezones();
        renderSettings();
        renderCurrency();
      }
    );
  };
}

// ── Start ────────────────────────────────────────────────────────

window.addEventListener('unload', () => {
  if (tickInterval) clearInterval(tickInterval);
});

init().catch(console.error);
