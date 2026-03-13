// options.js

'use strict';

let settings = {};
let tickInterval = null;

async function init() {
  await Storage.initDefaults();
  settings = await Storage.getSyncAll();

  applyTheme(settings.theme);
  renderToggles();
  renderTimezoneList();
  buildBaseCurrencySelect();
  setupSearch();
  setupDataButtons();

  document.getElementById('work-start').value = settings.workingHoursStart ?? 9;
  document.getElementById('work-end').value = settings.workingHoursEnd ?? 18;
  document.getElementById('work-start').onchange = async (e) => {
    settings.workingHoursStart = parseInt(e.target.value);
    await save('workingHoursStart', settings.workingHoursStart);
  };
  document.getElementById('work-end').onchange = async (e) => {
    settings.workingHoursEnd = parseInt(e.target.value);
    await save('workingHoursEnd', settings.workingHoursEnd);
  };



  document.getElementById('rate-alerts').checked = settings.rateAlerts === true;
  document.getElementById('rate-alerts').onchange = async (e) => {
    settings.rateAlerts = e.target.checked;
    await save('rateAlerts', settings.rateAlerts);
  };

  tickInterval = setInterval(updateTzTimes, 1000);
}

function applyTheme(theme) {
  const body = document.body;
  body.classList.remove('dark', 'light');
  body.classList.add(theme || 'dark');
}

async function save(key, val) {
  settings[key] = val;
  await Storage.setSync(key, val);
  showToast('Saved ✓');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

function renderToggles() {
  document.querySelectorAll('.tog').forEach(btn => {
    const pref = btn.dataset.pref;
    btn.classList.toggle('active', settings[pref] === btn.dataset.val);
    btn.onclick = async () => {
      await save(pref, btn.dataset.val);
      document.querySelectorAll(`.tog[data-pref="${pref}"]`).forEach(b =>
        b.classList.toggle('active', b.dataset.val === btn.dataset.val)
      );
      if (pref === 'theme') applyTheme(btn.dataset.val);
    };
  });
}

function buildBaseCurrencySelect() {
  const sel = document.getElementById('base-currency');
  const currencies = CurrencyHelper.getCurrencyList();
  sel.innerHTML = currencies.map(c =>
    `<option value="${c.code}">${c.flag} ${c.code} — ${c.name}</option>`
  ).join('');
  sel.value = settings.baseCurrency || 'USD';
  sel.onchange = () => save('baseCurrency', sel.value);
}

function renderTimezoneList() {
  const list = document.getElementById('tz-list');
  const zones = settings.savedTimezones || [];
  if (!zones.length) {
    list.innerHTML = '<div style="padding:14px 18px;color:var(--text2);font-size:13px;">No timezones saved yet.</div>';
    return;
  }
  list.innerHTML = zones.map((z, i) => {
    let timeStr = '—';
    try {
      const dt = luxon.DateTime.now().setZone(z.id);
      timeStr = settings.timeFormat === '24h' ? dt.toFormat('HH:mm') : dt.toFormat('h:mm a');
    } catch {}
    return `<div class="tz-list-item" data-idx="${i}">
      <div class="tz-item-info">
        <span class="tz-item-flag">${z.flag || '🌐'}</span>
        <div>
          <div class="tz-item-name">${z.label}</div>
          <div class="tz-item-tz">${z.id}</div>
        </div>
      </div>
      <span class="tz-item-time" data-tzid="${z.id}">${timeStr}</span>
      <button class="remove-tz" data-idx="${i}" title="Remove">✕</button>
    </div>`;
  }).join('');

  list.querySelectorAll('.remove-tz').forEach(btn => {
    btn.onclick = async () => {
      const idx = parseInt(btn.dataset.idx);
      settings.savedTimezones.splice(idx, 1);
      await save('savedTimezones', settings.savedTimezones);
      renderTimezoneList();
    };
  });
}

function updateTzTimes() {
  document.querySelectorAll('.tz-item-time[data-tzid]').forEach(el => {
    try {
      const dt = luxon.DateTime.now().setZone(el.dataset.tzid);
      el.textContent = settings.timeFormat === '24h' ? dt.toFormat('HH:mm') : dt.toFormat('h:mm a');
    } catch {}
  });
}

function setupSearch() {
  const input = document.getElementById('tz-search-opts');
  const suggestions = document.getElementById('tz-suggestions-opts');

  let dropdown = null;

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (dropdown) { dropdown.remove(); dropdown = null; }
    if (!q) return;

    const cities = TimeHelper.getCityList();
    const matches = cities.filter(c =>
      c.city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
    ).slice(0, 8);

    if (!matches.length) return;

    dropdown = document.createElement('div');
    dropdown.style.cssText = `
      position:absolute;top:0;left:0;right:0;
      background:var(--card);border:1px solid var(--border);
      border-radius:8px;z-index:100;overflow:hidden;
      box-shadow:0 8px 24px rgba(0,0,0,0.3);
    `;

    matches.forEach(c => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:10px 14px;cursor:pointer;display:flex;gap:10px;align-items:center;font-size:13px;';
      item.innerHTML = `<span style="font-size:18px;">${c.flag}</span><span style="font-weight:500;">${c.city}</span><span style="color:var(--text2);font-size:12px;">${c.country} · ${c.tz}</span>`;
      item.onmouseover = () => item.style.background = 'var(--hover)';
      item.onmouseout = () => item.style.background = '';
      item.onclick = async () => {
        const already = (settings.savedTimezones || []).some(z => z.id === c.tz);
        if (!already) {
          const dt = luxon.DateTime.now().setZone(c.tz);
          settings.savedTimezones = settings.savedTimezones || [];
          settings.savedTimezones.push({ id: c.tz, label: `${c.city}, ${c.country}`, abbr: dt.toFormat('ZZZZ'), flag: c.flag });
          await save('savedTimezones', settings.savedTimezones);
          renderTimezoneList();
        }
        input.value = '';
        dropdown.remove();
        dropdown = null;
      };
      dropdown.appendChild(item);
    });

    suggestions.style.position = 'relative';
    suggestions.appendChild(dropdown);
  });

  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && dropdown && !dropdown.contains(e.target)) {
      dropdown.remove(); dropdown = null;
    }
  });
}

function setupDataButtons() {
  document.getElementById('export-btn').onclick = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tzpro-settings.json'; a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById('import-btn').onclick = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = async (e) => {
      try {
        const text = await e.target.files[0].text();
        const imported = JSON.parse(text);
        Object.assign(settings, imported);
        await new Promise(r => chrome.storage.sync.set(settings, r));
        applyTheme(settings.theme);
        renderToggles();
        renderTimezoneList();
        showToast('Settings imported ✓');
      } catch { alert('Invalid file.'); }
    };
    input.click();
  };

  document.getElementById('reset-btn').onclick = async () => {
    if (confirm('Reset all settings to defaults?')) {
      await Storage.reset();
      settings = await Storage.getSyncAll();
      applyTheme(settings.theme);
      renderToggles();
      renderTimezoneList();
      showToast('Reset complete');
    }
  };
}

window.addEventListener('unload', () => { if (tickInterval) clearInterval(tickInterval); });

init().catch(console.error);
