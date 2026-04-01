<img src="https://capsule-render.vercel.app/api?type=slice&color=0:0F1117,100:6C63FF&height=200&section=header&text=GlobeSync&fontColor=ffffff&fontSize=72&fontAlignY=72&fontAlign=30&desc=Timezone%20%2B%20Currency%20%7C%20Instantly%20%7C%20Anywhere&descAlignY=87&descSize=16&descAlign=30&descColor=CBD5E1" width="100%"/>

<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=15&duration=3000&pause=900&color=6C63FF&center=true&vCenter=true&width=680&lines=🌐+65+World+Cities+%7C+51+Currencies+%7C+40%2B+Timezone+Abbreviations;⚡+Highlight+any+time+or+price+on+any+webpage+—+instant+tooltip;🎯+Built+for+global+professionals%2C+remote+teams+%26+digital+nomads;🔒+No+signup.+No+subscription.+No+config.+Just+works." alt="Typing SVG" />

<br/>

[![Version](https://img.shields.io/badge/version-1.8.3-6C63FF?style=for-the-badge)](https://github.com)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![License](https://img.shields.io/badge/license-MIT-00C896?style=for-the-badge)](LICENSE)
[![JavaScript](https://img.shields.io/badge/Vanilla_JS-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

</div>

---

## 🎯 What is GlobeSync?

GlobeSync eliminates the tab-switching and mental math that slow down global professionals. It's a Chrome Extension that lives in your toolbar and on every webpage — highlight a price or time anywhere, and GlobeSync converts it on the spot.

No accounts. No subscriptions. No configuration required to get started.

---

## ✨ Core Features

<table>
<tr>
<td valign="top" width="50%">

### 🕐 Live World Clocks
Live clocks for **65+ world cities** — updates every second. See working hours status at a glance with 🟢/🔴 indicators based on your custom schedule. Search and add any city instantly.

</td>
<td valign="top" width="50%">

### 🔄 Time Converter
Enter any time in **12h or 24h format**, pick source and target timezones, get the converted result instantly — including next-day/previous-day context when date boundaries are crossed.

</td>
</tr>
<tr>
<td valign="top" width="50%">

### 💱 Currency Converter
Live exchange rates via **ExchangeRate-API** across **51 currencies**. Favorite pairs, multi-currency view, swap/refresh inline. Rates are cached locally and auto-refreshed in the background.

</td>
<td valign="top" width="50%">

### 🔍 Highlight-to-Convert
The standout feature. **Select any time or price** on any webpage and a tooltip appears with instant conversions — no popup needed. Works with dozens of time abbreviations and currency formats.

</td>
</tr>
</table>

---

## 🔍 How Highlight-to-Convert Works

Select text on **any webpage** → GlobeSync detects it in under 50ms → a floating tooltip shows converted values in all your saved timezones or favorite currencies.

**Detected Time Formats:**
```
3:00 PM EST      →  converts using 30+ abbreviations (EST, CET, JST, IST, AEST…)
15:30 UTC        →  24-hour format supported
```

**Detected Currency Formats:**
```
$250  /  €99.99  /  £45  /  ₹500  /  ¥5000     ← symbol + amount
USD 1200  /  EUR 50.25                           ← code + amount
100 GBP  /  5000 INR                             ← amount + code
```

> Right-click any selected text to access **"Convert Time"** or **"Convert Currency"** directly from the browser context menu.

---

## ⌨️ Keyboard Shortcuts

| Action | Windows / Linux | macOS |
|--------|----------------|-------|
| Open GlobeSync Popup | `Ctrl + Shift + H` | `Cmd + Shift + H` |
| Quick Convert Selected Text | `Ctrl + Shift + C` | `Cmd + Shift + C` |

---

## 🌍 Coverage

| Category | Detail |
|----------|--------|
| 🏙️ World Cities | **65** across Americas, Europe, Middle East, Asia-Pacific & Africa |
| ⏱️ Timezone Abbreviations | **30+** — EST, EDT, PST, CET, CEST, IST, JST, AEST, SGT, KST, MSK… |
| 💰 Currencies | **51** — USD, EUR, GBP, JPY, INR, CNY, AED, BRL, KRW, NGN and more |
| 🌐 Works On | Every webpage via content script injection |

---

## ⚙️ Settings & Customization

| Setting | Options |
|---------|---------|
| Theme | Dark *(default)* / Light |
| Time Format | 12h *(default)* / 24h |
| Date Format | MM/DD/YYYY *(default)* / DD/MM/YYYY |
| Rate Refresh | Every 1h / 6h *(default)* / 24h |
| Working Hours | Custom start + end hour (used for status dots) |
| Default Tab | Time / Currency |
| Highlight Convert | On *(default)* / Off |
| Data | Export or Import full settings as JSON |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Extension Runtime | Chrome Manifest V3 |
| Language | Vanilla JavaScript (ES6+) |
| Date & Timezone Engine | [Luxon.js](https://moment.github.io/luxon/) |
| Currency Rates | [ExchangeRate-API](https://www.exchangerate-api.com/) (free tier) |
| Persistence | Chrome Storage API — `sync` + `local` |
| Background Tasks | Chrome Alarms API |
| Context Menus | Chrome Context Menus API |
| Content Injection | Content Scripts + Dynamic DOM Tooltips |

---

## 📦 Installation

> Install in Developer Mode — takes under 60 seconds.

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/GlobeSync.git
```

1. Open Chrome → `chrome://extensions/`
2. Toggle **Developer Mode** on (top-right)
3. Click **"Load unpacked"** → select the `GlobeSync/` folder
4. Pin the extension from the toolbar puzzle icon
5. Press `Ctrl+Shift+H` — you're live

---

## 📁 Project Structure

```
GlobeSync/
├── manifest.json              # Manifest V3 — permissions, commands, icons
├── background.js              # Service worker: alarms, context menus, rate fetching
├── popup/
│   ├── popup.html             # Three-tab popup (Time · Currency · Settings)
│   ├── popup.css              # Full design system — dark/light, animations
│   └── popup.js               # Tab logic, modals, onboarding overlay
├── content/
│   ├── content.js             # Highlight-to-convert engine (50ms detection)
│   └── tooltip.css            # Tooltip styles + fade-in animation
├── options/
│   ├── options.html           # Full-page settings UI
│   └── options.js             # Timezone manager, preferences, data export
├── utils/
│   ├── storage.js             # Chrome Storage wrapper + default config
│   ├── timeHelper.js          # Luxon-powered timezone & DST utilities
│   └── currencyHelper.js      # Rate fetching, caching, parsing, formatting
├── assets/icons/              # PNG icons: 16 · 32 · 48 · 128px
└── libs/                      # Bundled: Luxon.min.js · Chart.umd.min.js
```

---

## 🔒 Permissions

| Permission | Why It's Needed |
|-----------|----------------|
| `storage` | Save timezones, currencies & all preferences |
| `contextMenus` | Right-click "Convert Time / Currency" on selections |
| `alarms` | Auto-refresh exchange rates on schedule |
| `notifications` | Reserved for upcoming rate alert feature |
| `https://api.exchangerate-api.com/*` | Fetch live currency exchange rates |

---

## 📝 License

MIT — free to use, modify, and distribute.

---

<div align="center">

*Built with 💜 for the people who schedule meetings at odd hours and mentally convert currencies at checkout.*

<br/>

</div>

<img src="https://capsule-render.vercel.app/api?type=egg&color=0:6C63FF,100:0F1117&height=130&section=footer" width="100%"/>
