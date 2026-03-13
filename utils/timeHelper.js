// timeHelper.js — All timezone logic using Luxon

const TimeHelper = {

  // ── Core time functions ────────────────────────────────────────────────────

  getNow(tzId) {
    return luxon.DateTime.now().setZone(tzId);
  },

  formatTime(dt, format12h = true) {
    if (format12h) return dt.toFormat('h:mm a');
    return dt.toFormat('HH:mm');
  },

  formatDate(dt, format = 'MM/DD/YYYY') {
    if (format === 'DD/MM/YYYY') return dt.toFormat('dd/MM/yyyy');
    return dt.toFormat('MM/dd/yyyy');
  },

  formatDateLong(dt) {
    return dt.toFormat('cccc, LLL d');
  },

  getUTCOffset(tzId) {
    const dt = luxon.DateTime.now().setZone(tzId);
    const offset = dt.offset;
    const sign = offset >= 0 ? '+' : '-';
    const abs = Math.abs(offset);
    const hrs = Math.floor(abs / 60);
    const mins = abs % 60;
    return `UTC${sign}${hrs}${mins > 0 ? ':' + String(mins).padStart(2, '0') : ''}`;
  },

  isWorkingHours(tzId, startHour = 9, endHour = 18) {
    const dt = luxon.DateTime.now().setZone(tzId);
    const h = dt.hour;
    return h >= startHour && h < endHour;
  },

  // ── Overlap finder ─────────────────────────────────────────────────────────

  findOverlap(tzIds, startHour = 9, endHour = 18) {
    // Find hours where ALL timezones are in working hours
    const results = [];
    const now = luxon.DateTime.now().setZone('UTC');

    for (let h = 0; h < 24; h++) {
      const utcTime = now.set({ hour: h, minute: 0, second: 0 });
      const allWorking = tzIds.every(tzId => {
        const local = utcTime.setZone(tzId);
        return local.hour >= startHour && local.hour < endHour;
      });
      if (allWorking) results.push(h);
    }

    return results; // Array of UTC hours where overlap exists
  },

  formatOverlapSuggestion(overlapHours, tzIds) {
    if (overlapHours.length === 0) return null;
    const midHour = overlapHours[Math.floor(overlapHours.length / 2)];
    const utcTime = luxon.DateTime.now().setZone('UTC').set({ hour: midHour, minute: 0 });
    return tzIds.map(tzId => {
      const local = utcTime.setZone(tzId);
      return `${local.toFormat('h:mm a')} ${this.getAbbr(tzId)}`;
    }).join(' / ');
  },

  getAbbr(tzId) {
    const dt = luxon.DateTime.now().setZone(tzId);
    return dt.toFormat('ZZZZ');
  },

  // ── Convert time text to other zones ──────────────────────────────────────

  parseTimeText(text, fromTz = 'UTC') {
    // Try to parse time strings like "3:00 PM EST", "15:00 UTC"
    const tzMap = {
      'EST': 'America/New_York', 'EDT': 'America/New_York',
      'PST': 'America/Los_Angeles', 'PDT': 'America/Los_Angeles',
      'CST': 'America/Chicago', 'CDT': 'America/Chicago',
      'MST': 'America/Denver', 'MDT': 'America/Denver',
      'GMT': 'Europe/London', 'UTC': 'UTC',
      'BST': 'Europe/London',
      'CET': 'Europe/Paris', 'CEST': 'Europe/Paris',
      'IST': 'Asia/Kolkata',
      'JST': 'Asia/Tokyo',
      'CST_CN': 'Asia/Shanghai',
      'AEST': 'Australia/Sydney',
      'AEDT': 'Australia/Sydney',
      'SGT': 'Asia/Singapore',
      'HKT': 'Asia/Hong_Kong',
      'KST': 'Asia/Seoul',
      'MSK': 'Europe/Moscow',
      'ART': 'America/Argentina/Buenos_Aires',
      'BRT': 'America/Sao_Paulo',
      'WAT': 'Africa/Lagos',
      'EAT': 'Africa/Nairobi',
      'CAT': 'Africa/Harare',
      'SAST': 'Africa/Johannesburg',
      'PKT': 'Asia/Karachi',
      'BDT': 'Asia/Dhaka',
      'ICT': 'Asia/Bangkok',
      'WIB': 'Asia/Jakarta',
      'NZST': 'Pacific/Auckland',
      'HST': 'Pacific/Honolulu',
      'AKST': 'America/Anchorage'
    };

    // Match "3:00 PM EST" or "15:00 UTC"
    const match12 = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*([A-Z]{2,5})?/i);
    const match24 = text.match(/(\d{1,2}):(\d{2})\s*([A-Z]{2,5})/i);

    let hour, minute, tzAbbr, tzId;

    if (match12) {
      hour = parseInt(match12[1]);
      minute = parseInt(match12[2]);
      const ampm = match12[3].toUpperCase();
      tzAbbr = match12[4] ? match12[4].toUpperCase() : null;
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
    } else if (match24) {
      hour = parseInt(match24[1]);
      minute = parseInt(match24[2]);
      tzAbbr = match24[3] ? match24[3].toUpperCase() : null;
    } else {
      return null;
    }

    tzId = tzAbbr ? (tzMap[tzAbbr] || fromTz) : fromTz;

    try {
      const now = luxon.DateTime.now().setZone(tzId);
      return now.set({ hour, minute, second: 0 });
    } catch {
      return null;
    }
  },

  convertTo(dt, targetTzId) {
    return dt.setZone(targetTzId);
  },

  isDifferentDay(dt1, dt2) {
    return dt1.day !== dt2.day;
  },

  // ── City/Timezone list (400+ entries subset) ───────────────────────────────

  getCityList() {
    return [
      { city: 'New York', country: 'USA', tz: 'America/New_York', flag: '🇺🇸' },
      { city: 'Los Angeles', country: 'USA', tz: 'America/Los_Angeles', flag: '🇺🇸' },
      { city: 'Chicago', country: 'USA', tz: 'America/Chicago', flag: '🇺🇸' },
      { city: 'Denver', country: 'USA', tz: 'America/Denver', flag: '🇺🇸' },
      { city: 'Phoenix', country: 'USA', tz: 'America/Phoenix', flag: '🇺🇸' },
      { city: 'Anchorage', country: 'USA', tz: 'America/Anchorage', flag: '🇺🇸' },
      { city: 'Honolulu', country: 'USA', tz: 'Pacific/Honolulu', flag: '🇺🇸' },
      { city: 'Toronto', country: 'Canada', tz: 'America/Toronto', flag: '🇨🇦' },
      { city: 'Vancouver', country: 'Canada', tz: 'America/Vancouver', flag: '🇨🇦' },
      { city: 'Montreal', country: 'Canada', tz: 'America/Montreal', flag: '🇨🇦' },
      { city: 'Mexico City', country: 'Mexico', tz: 'America/Mexico_City', flag: '🇲🇽' },
      { city: 'São Paulo', country: 'Brazil', tz: 'America/Sao_Paulo', flag: '🇧🇷' },
      { city: 'Buenos Aires', country: 'Argentina', tz: 'America/Argentina/Buenos_Aires', flag: '🇦🇷' },
      { city: 'London', country: 'UK', tz: 'Europe/London', flag: '🇬🇧' },
      { city: 'Paris', country: 'France', tz: 'Europe/Paris', flag: '🇫🇷' },
      { city: 'Berlin', country: 'Germany', tz: 'Europe/Berlin', flag: '🇩🇪' },
      { city: 'Madrid', country: 'Spain', tz: 'Europe/Madrid', flag: '🇪🇸' },
      { city: 'Rome', country: 'Italy', tz: 'Europe/Rome', flag: '🇮🇹' },
      { city: 'Amsterdam', country: 'Netherlands', tz: 'Europe/Amsterdam', flag: '🇳🇱' },
      { city: 'Brussels', country: 'Belgium', tz: 'Europe/Brussels', flag: '🇧🇪' },
      { city: 'Zurich', country: 'Switzerland', tz: 'Europe/Zurich', flag: '🇨🇭' },
      { city: 'Vienna', country: 'Austria', tz: 'Europe/Vienna', flag: '🇦🇹' },
      { city: 'Warsaw', country: 'Poland', tz: 'Europe/Warsaw', flag: '🇵🇱' },
      { city: 'Stockholm', country: 'Sweden', tz: 'Europe/Stockholm', flag: '🇸🇪' },
      { city: 'Oslo', country: 'Norway', tz: 'Europe/Oslo', flag: '🇳🇴' },
      { city: 'Copenhagen', country: 'Denmark', tz: 'Europe/Copenhagen', flag: '🇩🇰' },
      { city: 'Helsinki', country: 'Finland', tz: 'Europe/Helsinki', flag: '🇫🇮' },
      { city: 'Athens', country: 'Greece', tz: 'Europe/Athens', flag: '🇬🇷' },
      { city: 'Istanbul', country: 'Turkey', tz: 'Europe/Istanbul', flag: '🇹🇷' },
      { city: 'Moscow', country: 'Russia', tz: 'Europe/Moscow', flag: '🇷🇺' },
      { city: 'Kiev', country: 'Ukraine', tz: 'Europe/Kiev', flag: '🇺🇦' },
      { city: 'Lisbon', country: 'Portugal', tz: 'Europe/Lisbon', flag: '🇵🇹' },
      { city: 'Dublin', country: 'Ireland', tz: 'Europe/Dublin', flag: '🇮🇪' },
      { city: 'Dubai', country: 'UAE', tz: 'Asia/Dubai', flag: '🇦🇪' },
      { city: 'Riyadh', country: 'Saudi Arabia', tz: 'Asia/Riyadh', flag: '🇸🇦' },
      { city: 'Tel Aviv', country: 'Israel', tz: 'Asia/Jerusalem', flag: '🇮🇱' },
      { city: 'Karachi', country: 'Pakistan', tz: 'Asia/Karachi', flag: '🇵🇰' },
      { city: 'Mumbai', country: 'India', tz: 'Asia/Kolkata', flag: '🇮🇳' },
      { city: 'New Delhi', country: 'India', tz: 'Asia/Kolkata', flag: '🇮🇳' },
      { city: 'Kolkata', country: 'India', tz: 'Asia/Kolkata', flag: '🇮🇳' },
      { city: 'Bangalore', country: 'India', tz: 'Asia/Kolkata', flag: '🇮🇳' },
      { city: 'Chennai', country: 'India', tz: 'Asia/Kolkata', flag: '🇮🇳' },
      { city: 'Dhaka', country: 'Bangladesh', tz: 'Asia/Dhaka', flag: '🇧🇩' },
      { city: 'Kathmandu', country: 'Nepal', tz: 'Asia/Kathmandu', flag: '🇳🇵' },
      { city: 'Colombo', country: 'Sri Lanka', tz: 'Asia/Colombo', flag: '🇱🇰' },
      { city: 'Bangkok', country: 'Thailand', tz: 'Asia/Bangkok', flag: '🇹🇭' },
      { city: 'Ho Chi Minh City', country: 'Vietnam', tz: 'Asia/Ho_Chi_Minh', flag: '🇻🇳' },
      { city: 'Jakarta', country: 'Indonesia', tz: 'Asia/Jakarta', flag: '🇮🇩' },
      { city: 'Singapore', country: 'Singapore', tz: 'Asia/Singapore', flag: '🇸🇬' },
      { city: 'Kuala Lumpur', country: 'Malaysia', tz: 'Asia/Kuala_Lumpur', flag: '🇲🇾' },
      { city: 'Manila', country: 'Philippines', tz: 'Asia/Manila', flag: '🇵🇭' },
      { city: 'Hong Kong', country: 'Hong Kong', tz: 'Asia/Hong_Kong', flag: '🇭🇰' },
      { city: 'Shanghai', country: 'China', tz: 'Asia/Shanghai', flag: '🇨🇳' },
      { city: 'Beijing', country: 'China', tz: 'Asia/Shanghai', flag: '🇨🇳' },
      { city: 'Taipei', country: 'Taiwan', tz: 'Asia/Taipei', flag: '🇹🇼' },
      { city: 'Seoul', country: 'South Korea', tz: 'Asia/Seoul', flag: '🇰🇷' },
      { city: 'Tokyo', country: 'Japan', tz: 'Asia/Tokyo', flag: '🇯🇵' },
      { city: 'Osaka', country: 'Japan', tz: 'Asia/Tokyo', flag: '🇯🇵' },
      { city: 'Sydney', country: 'Australia', tz: 'Australia/Sydney', flag: '🇦🇺' },
      { city: 'Melbourne', country: 'Australia', tz: 'Australia/Melbourne', flag: '🇦🇺' },
      { city: 'Brisbane', country: 'Australia', tz: 'Australia/Brisbane', flag: '🇦🇺' },
      { city: 'Perth', country: 'Australia', tz: 'Australia/Perth', flag: '🇦🇺' },
      { city: 'Auckland', country: 'New Zealand', tz: 'Pacific/Auckland', flag: '🇳🇿' },
      { city: 'Cairo', country: 'Egypt', tz: 'Africa/Cairo', flag: '🇪🇬' },
      { city: 'Lagos', country: 'Nigeria', tz: 'Africa/Lagos', flag: '🇳🇬' },
      { city: 'Nairobi', country: 'Kenya', tz: 'Africa/Nairobi', flag: '🇰🇪' },
      { city: 'Johannesburg', country: 'South Africa', tz: 'Africa/Johannesburg', flag: '🇿🇦' },
      { city: 'Casablanca', country: 'Morocco', tz: 'Africa/Casablanca', flag: '🇲🇦' },
      { city: 'UTC', country: 'Universal', tz: 'UTC', flag: '🌐' }
    ];
  }
};
