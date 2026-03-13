# 🌐 GlobeSync

A lightweight Chrome extension for global professionals — instantly convert timezones and currencies without leaving your current tab.

---

## 🚀 Features

### Time Zones Tab
- Live clocks for your saved timezones (updates every second)
- 🟢/🔴 working hours status indicators
- Search 65+ world cities to add timezone cards
- Copy all times to clipboard
- **Time Converter** — enter a time in any format (12h/24h), select source & target timezones, and instantly see the converted time with date context

### Currency Tab
- Real-time exchange rates (via ExchangeRate-API, free tier)
- Convert between 50+ currencies instantly
- Multi-currency view — see one amount in all your favorites
- Favorite currency pairs at a glance
- Rates cached locally, refreshed automatically

### Settings
- Dark / Light theme
- 12h / 24h time format
- Date format (MM/DD or DD/MM)
- Working hours customization
- Default tab selection
- Export / Import settings as JSON
- Keyboard shortcuts: `Ctrl+Shift+H` to open popup

---

## 📦 Installation (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Click **"Load unpacked"**
5. Select the `GlobeSync/` folder
6. The extension icon appears in your toolbar!

---

## 📁 Project Structure

```
GlobeSync/
├── manifest.json          
├── background.js           
├── popup/
│   ├── popup.html          
│   ├── popup.css           
│   └── popup.js            
├── content/
│   ├── content.js         
│   └── tooltip.css         
├── options/
│   ├── options.html        
│   └── options.js          
├── utils/
│   ├── storage.js         
│   ├── timeHelper.js       
│   └── currencyHelper.js   
├── assets/icons/           
└── libs/                   
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | Open popup |

---

## 🔒 Permissions

| Permission | Purpose |
|-----------|---------|
| `storage` | Save your timezones, currencies, preferences |
| `https://api.exchangerate-api.com/*` | Fetch live exchange rates |

---

## 📝 License

MIT
