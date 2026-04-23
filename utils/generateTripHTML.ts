import { Trip, FlightSegment, HotelBooking } from '../types';

/**
 * Trip Summary Export — v6 (Full-Width Dashboard)
 * ─────────────────────────────────────────────────
 * Dense, responsive dashboard layout that uses the entire viewport width.
 * Goal: cram the whole trip onto one screen on desktop, beautiful single
 * column on mobile. No more 640px centered narrow column.
 */

interface TimelineEvent {
  id: string;
  type: 'flight_dep' | 'flight_arr' | 'hotel_in' | 'hotel_out' | 'hotel_stay' | 'transfer' | 'activity' | 'food';
  time: string;
  title: string;
  subtitle?: string;
  icon: string;
  details?: string;
  flightData?: FlightSegment;
  hotelData?: HotelBooking;
  nightsCount?: number;
}

interface TimelineDay {
  date: Date;
  iso: string;
  dayNum: number;
  month: string;
  dow: string;
  events: TimelineEvent[];
  title?: string;
}

const esc = (s: string): string => {
  if (!s) return '';
  const decoded = s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  return decoded
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
};

const DOW_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const MONTHS_HE_SHORT = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];

const fmtTime = (t: string): string => {
  if (!t) return '';
  if (/^\d{1,2}:\d{2}$/.test(t)) return t;
  if (t.includes('T')) return t.split('T')[1].substring(0, 5);
  try {
    const dt = new Date(t);
    return isNaN(dt.getTime()) ? t : dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch { return t; }
};

const isoDate = (d: string | Date): string => {
  try { return (typeof d === 'string' ? new Date(d) : d).toISOString().split('T')[0]; }
  catch { return ''; }
};

const addDays = (d: Date, n: number): Date => {
  const newD = new Date(d); newD.setDate(newD.getDate() + n); return newD;
};

const nightsBetween = (a: string, b: string): number => {
  try {
    return Math.max(0, Math.ceil((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
  } catch { return 0; }
};

const fmtShort = (d: Date): string => `${d.getDate()} ${MONTHS_HE_SHORT[d.getMonth()]}`;

// ── Timeline builder (same logic as v5) ─────────────────────────

const buildTimeline = (trip: Trip): TimelineDay[] => {
  const allDates: number[] = [];
  const addDate = (s?: string) => s && !isNaN(new Date(s).getTime()) && allDates.push(new Date(s).getTime());

  trip.flights?.segments?.forEach(s => addDate(s.date));
  trip.hotels?.forEach(h => { addDate(h.checkInDate); addDate(h.checkOutDate); });
  trip.itinerary?.forEach(i => addDate(i.date));

  if (trip.dates && allDates.length === 0) {
    trip.dates.split(/[-–]/).forEach(p => addDate(p.trim()));
  }
  if (allDates.length === 0) return [];

  const startDate = new Date(Math.min(...allDates)); startDate.setHours(12, 0, 0, 0);
  const endDate = new Date(Math.max(...allDates)); endDate.setHours(12, 0, 0, 0);

  const days: Record<string, TimelineDay> = {};
  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

  for (let i = 0; i < totalDays; i++) {
    const cur = addDays(startDate, i);
    const iso = isoDate(cur);
    days[iso] = { date: cur, iso, dayNum: cur.getDate(), month: MONTHS_HE[cur.getMonth()], dow: DOW_HE[cur.getDay()], events: [] };
  }

  const addToDay = (iso: string, evt: TimelineEvent) => { if (days[iso]) days[iso].events.push(evt); };

  trip.flights?.segments?.forEach((seg, idx) => {
    const depIso = isoDate(seg.date);
    addToDay(depIso, {
      id: `f-${idx}-d`, type: 'flight_dep', time: fmtTime(seg.departureTime) || '—',
      title: `טיסה ל-${seg.toCity || seg.toCode}`,
      subtitle: `${seg.airline || ''} ${seg.flightNumber || ''}`.trim(),
      icon: '✈️', flightData: seg
    });
    let arrIso = depIso;
    const depT = fmtTime(seg.departureTime), arrT = fmtTime(seg.arrivalTime);
    if (seg.arrivalTime?.includes('T')) arrIso = isoDate(seg.arrivalTime);
    else if (depT && arrT && arrT < depT) {
      const d = new Date(seg.date); d.setDate(d.getDate() + 1); arrIso = isoDate(d);
    }
    addToDay(arrIso, {
      id: `f-${idx}-a`, type: 'flight_arr', time: arrT || '—',
      title: `נחיתה ב-${seg.toCity || seg.toCode}`,
      subtitle: seg.duration ? `${seg.duration}` : '',
      icon: '🛬', flightData: seg
    });
  });

  trip.hotels?.forEach((h, idx) => {
    const inIso = isoDate(h.checkInDate);
    const outIso = isoDate(h.checkOutDate);
    const nights = nightsBetween(h.checkInDate, h.checkOutDate);
    addToDay(inIso, {
      id: `h-${idx}-i`, type: 'hotel_in', time: '15:00',
      title: 'צ׳ק-אין', subtitle: h.name, icon: '🏨', hotelData: h, nightsCount: nights
    });
    addToDay(outIso, {
      id: `h-${idx}-o`, type: 'hotel_out', time: '11:00',
      title: 'צ׳ק-אאוט', subtitle: h.name, icon: '👋', hotelData: h
    });
  });

  trip.itinerary?.forEach((day, idx) => {
    const iso = isoDate(day.date);
    if (!days[iso]) return;
    if (day.title && day.title !== 'טיול חופשי' && day.title !== 'יום טיסה') days[iso].title = day.title;
    day.activities?.forEach((act, aIdx) => {
      const m = act.match(/^(\d{1,2}:\d{2})(?:-\d{1,2}:\d{2})?\s*(.*)/);
      const time = m ? m[1] : '';
      const text = m ? m[2] : act;
      const isTransfer = /הסעה|נסיעה|טרנספר|transfer|מונית|taxi/i.test(text);
      const dm = text.match(/\((.*?)\)$/);
      const cleanTitle = dm ? text.replace(/\s*\(.*?\)$/, '').trim() : text;
      const subtitle = dm ? dm[1] : '';
      addToDay(iso, {
        id: `a-${idx}-${aIdx}`, type: isTransfer ? 'transfer' : 'activity',
        time, title: cleanTitle, subtitle, icon: isTransfer ? '🚕' : '📍'
      });
    });
    if (day.notes) {
      addToDay(iso, { id: `n-${idx}`, type: 'activity', time: '', title: 'הערה', details: day.notes, icon: '📝' });
    }
  });

  Object.values(days).forEach(day => {
    const d = isoDate(day.date);
    const active = trip.hotels?.find(h => d > isoDate(h.checkInDate) && d < isoDate(h.checkOutDate));
    if (active && day.events.length === 0) {
      day.title = `נופש ב-${active.name}`;
      day.events.push({
        id: `s-${d}`, type: 'hotel_stay', time: '', title: active.name,
        subtitle: 'יום חופשי במלון', icon: '🛏️', hotelData: active
      });
    }
  });

  return Object.values(days).sort((a, b) => a.date.getTime() - b.date.getTime()).map((day, i, arr) => {
    day.events.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
    if (!day.title) {
      const dep = day.events.find(e => e.type === 'flight_dep');
      if (dep) day.title = `טיסה ל-${dep.flightData?.toCity || dep.flightData?.toCode || ''}`;
      else if (day.events.length === 0) day.title = 'יום חופשי';
      else day.title = i === 0 ? 'יום ראשון' : i === arr.length - 1 ? 'יום אחרון' : 'יום פעילות';
    }
    return day;
  });
};

// ── Compact event renderers ─────────────────────────────────────

const evRow = (e: TimelineEvent): string => {
  const time = e.time ? `<span class="evt-t">${e.time}</span>` : '<span class="evt-t evt-t-empty"></span>';
  let cls = `evt evt-${e.type}`;
  let body = `<span class="evt-i">${e.icon}</span><span class="evt-x"><span class="evt-title">${esc(e.title)}</span>`;
  if (e.subtitle) body += `<span class="evt-sub">${esc(e.subtitle)}</span>`;
  if (e.details) body += `<span class="evt-sub">${esc(e.details)}</span>`;
  body += '</span>';
  return `<div class="${cls}">${time}${body}</div>`;
};

const renderDayCard = (day: TimelineDay, idx: number, total: number): string => {
  const isFirst = idx === 0, isLast = idx === total - 1;
  const headerCls = isFirst ? 'first' : isLast ? 'last' : '';
  const events = day.events.length === 0
    ? '<div class="empty">☀️ יום פנוי</div>'
    : day.events.map(evRow).join('');
  return `
    <article class="day-card ${headerCls}">
      <header class="day-head">
        <div class="day-num">
          <span class="dn">${day.dayNum}</span>
          <span class="dm">${MONTHS_HE_SHORT[day.date.getMonth()]}</span>
        </div>
        <div class="day-info">
          <span class="day-dow">יום ${day.dow}</span>
          <span class="day-title">${esc(day.title || '')}</span>
        </div>
        <span class="day-idx">${idx + 1}/${total}</span>
      </header>
      <div class="day-events">${events}</div>
    </article>
  `;
};

// ── Overview sections ───────────────────────────────────────────

const renderFlightsOverview = (trip: Trip): string => {
  const segs = trip.flights?.segments || [];
  if (segs.length === 0) return '';
  const cards = segs.map(seg => {
    const depT = fmtTime(seg.departureTime), arrT = fmtTime(seg.arrivalTime);
    const dateStr = seg.date ? fmtShort(new Date(seg.date)) : '';
    return `
      <div class="ov-flight">
        <div class="ovf-top">
          <span class="ovf-date">${dateStr}</span>
          <span class="ovf-num">${esc(seg.flightNumber || '')}</span>
        </div>
        <div class="ovf-route">
          <div class="ovf-side">
            <div class="ovf-code">${esc(seg.fromCode || '')}</div>
            <div class="ovf-time">${depT}</div>
          </div>
          <div class="ovf-arrow">
            <div class="ovf-airline">${esc(seg.airline || '')}</div>
            <div class="ovf-line">✈</div>
            ${seg.duration ? `<div class="ovf-dur">${esc(seg.duration)}</div>` : ''}
          </div>
          <div class="ovf-side">
            <div class="ovf-code">${esc(seg.toCode || '')}</div>
            <div class="ovf-time">${arrT}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  return `
    <section class="overview">
      <h2 class="ov-title">✈️ טיסות <span class="ov-count">${segs.length}</span></h2>
      <div class="ov-flights-grid">${cards}</div>
    </section>
  `;
};

const renderHotelsOverview = (trip: Trip): string => {
  const hotels = trip.hotels || [];
  if (hotels.length === 0) return '';
  const cards = hotels.map(h => {
    const nights = nightsBetween(h.checkInDate, h.checkOutDate);
    const inDate = h.checkInDate ? fmtShort(new Date(h.checkInDate)) : '';
    const outDate = h.checkOutDate ? fmtShort(new Date(h.checkOutDate)) : '';
    const rooms = (h as any).rooms?.length || 0;
    return `
      <div class="ov-hotel">
        <div class="ovh-name">${esc(h.name)}</div>
        ${h.address ? `<div class="ovh-addr">📍 ${esc(h.address)}</div>` : ''}
        <div class="ovh-meta">
          <span class="ovh-dates">${inDate} → ${outDate}</span>
          ${nights > 0 ? `<span class="ovh-nights">${nights} לילות</span>` : ''}
          ${rooms > 0 ? `<span class="ovh-rooms">${rooms} חדרים</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
  return `
    <section class="overview">
      <h2 class="ov-title">🏨 מלונות <span class="ov-count">${hotels.length}</span></h2>
      <div class="ov-hotels-grid">${cards}</div>
    </section>
  `;
};

// ── Styling ─────────────────────────────────────────────────────

const STYLES = `
:root {
  --font: 'Rubik', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --bg: #f7f9fc;
  --card: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --primary: #2563eb;
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --green: #10b981;
  --green-50: #ecfdf5;
  --amber: #f59e0b;
  --amber-50: #fffbeb;
  --rose: #ef4444;
  --line: #e2e8f0;
  --line-2: #f1f5f9;
  --shadow-sm: 0 1px 2px rgba(15,23,42,0.05);
  --shadow-md: 0 4px 12px rgba(15,23,42,0.08);
  --radius: 14px;
  --radius-sm: 10px;
  --radius-xs: 6px;
}
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  direction: rtl;
  -webkit-font-smoothing: antialiased;
  font-size: 14px;
  line-height: 1.4;
}
.page {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 16px clamp(12px, 2vw, 28px) 40px;
}

/* ═══ HERO (compact) ═══ */
.hero {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  min-height: 160px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  color: white;
  margin-bottom: 18px;
  box-shadow: var(--shadow-md);
}
.hero::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.85) 100%);
}
.hero-c {
  position: relative; z-index: 2;
  padding: 18px 22px;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}
.hero h1 {
  margin: 0;
  font-size: clamp(22px, 2.6vw, 34px);
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.1;
}
.hero-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; font-size: 13px; opacity: 0.95; }
.hero-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  background: rgba(255,255,255,0.18);
  border: 1px solid rgba(255,255,255,0.25);
  backdrop-filter: blur(6px);
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

/* ═══ STATS BAR ═══ */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 18px;
}
.stat {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}
.stat-v { font-size: 22px; font-weight: 800; color: var(--primary); line-height: 1; }
.stat-l { font-size: 11px; color: var(--muted); margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }

/* ═══ OVERVIEW SECTIONS ═══ */
.overview { margin-bottom: 16px; }
.ov-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.ov-count {
  background: var(--primary-100);
  color: var(--primary);
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}
.ov-flights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
}
.ov-flight {
  background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%);
  color: white;
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  box-shadow: var(--shadow-sm);
}
.ovf-top {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11px; opacity: 0.85; margin-bottom: 6px;
  border-bottom: 1px dashed rgba(255,255,255,0.2); padding-bottom: 6px;
}
.ovf-num { font-family: 'Courier New', monospace; font-weight: 700; direction: ltr; }
.ovf-route { display: flex; align-items: center; gap: 6px; }
.ovf-side { text-align: center; min-width: 50px; direction: ltr; }
.ovf-code { font-size: 18px; font-weight: 800; font-family: 'Courier New', monospace; line-height: 1; }
.ovf-time { font-size: 12px; font-weight: 600; margin-top: 4px; opacity: 0.9; font-family: 'Courier New', monospace; }
.ovf-arrow { flex: 1; text-align: center; }
.ovf-airline { font-size: 9px; opacity: 0.65; text-transform: uppercase; letter-spacing: 0.5px; direction: ltr; }
.ovf-line { font-size: 14px; opacity: 0.6; margin: 2px 0; }
.ovf-dur { font-size: 9px; opacity: 0.6; direction: ltr; }

.ov-hotels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
}
.ov-hotel {
  background: var(--card);
  border: 1px solid var(--line);
  border-right: 3px solid var(--green);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  box-shadow: var(--shadow-sm);
}
.ovh-name { font-size: 14px; font-weight: 800; line-height: 1.25; }
.ovh-addr { font-size: 11px; color: var(--muted); margin-top: 3px; line-height: 1.3; }
.ovh-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.ovh-dates {
  font-size: 11px; font-weight: 600; color: var(--text);
  background: var(--line-2); padding: 3px 8px; border-radius: 6px; direction: ltr;
}
.ovh-nights {
  font-size: 11px; font-weight: 700; color: #065f46;
  background: var(--green-50); padding: 3px 8px; border-radius: 6px;
}
.ovh-rooms {
  font-size: 11px; font-weight: 700; color: #6b21a8;
  background: #faf5ff; padding: 3px 8px; border-radius: 6px;
}

/* ═══ DAYS GRID ═══ */
.days-section { margin-top: 8px; }
.days-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
  align-items: start;
}
.day-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
}
.day-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(135deg, var(--primary-50), #ffffff);
  border-bottom: 1px solid var(--line-2);
}
.day-card.first .day-head { background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white; }
.day-card.last .day-head { background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; }
.day-card.first .day-dow,
.day-card.last .day-dow { color: rgba(255,255,255,0.85); }
.day-card.first .day-idx,
.day-card.last .day-idx { background: rgba(255,255,255,0.25); color: white; }

.day-num {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 4px 8px;
  text-align: center;
  min-width: 44px;
  line-height: 1;
}
.day-num .dn { display: block; font-size: 18px; font-weight: 800; color: var(--primary); }
.day-num .dm { display: block; font-size: 10px; font-weight: 600; color: var(--muted); margin-top: 2px; }
.day-card.first .day-num .dn,
.day-card.last .day-num .dn { color: var(--primary); }
.day-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.day-dow { font-size: 10px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px; }
.day-title { font-size: 14px; font-weight: 700; line-height: 1.2; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.day-idx {
  font-size: 10px; font-weight: 700; color: var(--muted);
  background: var(--line-2); padding: 3px 7px; border-radius: 999px;
}

.day-events {
  display: flex;
  flex-direction: column;
  padding: 8px 10px 10px;
  gap: 4px;
}

/* ═══ EVENT ROWS (compact) ═══ */
.evt {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-xs);
  font-size: 12.5px;
  line-height: 1.3;
  border: 1px solid transparent;
}
.evt:hover { background: var(--line-2); }
.evt-t {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 11px;
  color: var(--muted);
  min-width: 38px;
  text-align: left;
  direction: ltr;
  padding-top: 1px;
  flex-shrink: 0;
}
.evt-t-empty { min-width: 38px; }
.evt-i { font-size: 14px; flex-shrink: 0; line-height: 1; padding-top: 1px; }
.evt-x { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.evt-title { font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; }
.evt-sub { font-size: 11px; color: var(--muted); margin-top: 1px; }

/* Type-specific accents */
.evt-flight_dep, .evt-flight_arr {
  background: #eff6ff; border-color: #bfdbfe;
}
.evt-flight_dep .evt-title, .evt-flight_arr .evt-title { color: #1e40af; font-weight: 700; }
.evt-hotel_in {
  background: var(--green-50); border-color: #a7f3d0;
}
.evt-hotel_in .evt-title { color: #065f46; font-weight: 700; }
.evt-hotel_out {
  background: var(--amber-50); border-color: #fde68a;
}
.evt-hotel_out .evt-title { color: #92400e; font-weight: 700; }
.evt-hotel_stay {
  background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
  border-color: #bbf7d0;
}
.evt-hotel_stay .evt-title { color: #14532d; font-weight: 700; }
.evt-transfer {
  background: #fffbeb; border-color: #fde68a;
}
.evt-transfer .evt-title { color: #78350f; font-weight: 700; }

.empty {
  text-align: center; padding: 14px 8px;
  color: var(--muted); font-size: 12px; font-weight: 600;
  background: var(--line-2); border-radius: var(--radius-xs);
}

/* ═══ FOOTER ═══ */
.footer {
  text-align: center;
  padding: 24px 16px 8px;
  color: #94a3b8;
  font-size: 11px;
}
.footer-logo { font-weight: 700; color: #64748b; margin-bottom: 2px; }

/* ═══ PRINT ═══ */
@media print {
  body { background: white; font-size: 11px; }
  .page { padding: 8px 12px; max-width: none; }
  .hero { min-height: 100px; box-shadow: none; }
  .day-card, .ov-flight, .ov-hotel, .stat { break-inside: avoid; box-shadow: none; }
  .days-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 6px; }
}

/* ═══ MOBILE ═══ */
@media (max-width: 640px) {
  body { font-size: 13px; }
  .page { padding: 10px 10px 30px; }
  .hero { min-height: 130px; border-radius: 14px; }
  .hero-c { padding: 14px 14px; }
  .stats { grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .stat { padding: 8px 6px; }
  .stat-v { font-size: 18px; }
  .stat-l { font-size: 10px; }
  .days-grid { grid-template-columns: 1fr; gap: 8px; }
  .ov-flights-grid, .ov-hotels-grid { grid-template-columns: 1fr; }
}
@media (min-width: 1100px) {
  .days-grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
}
@media (min-width: 1400px) {
  .days-grid { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
}
`;

// ── Main generator ──────────────────────────────────────────────

export const generateTripHTML = (trip: Trip): string => {
  const timeline = buildTimeline(trip);
  const cover = trip.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&q=80';
  const genDate = new Date().toLocaleDateString('he-IL');

  const flightCount = trip.flights?.segments?.length || 0;
  const hotelCount = trip.hotels?.length || 0;
  const itineraryActivityCount = trip.itinerary?.reduce((s, d) => s + (d.activities?.length || 0), 0) || 0;
  const dayCount = timeline.length;

  const dayCards = timeline.map((d, i) => renderDayCard(d, i, timeline.length)).join('');

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(trip.name)} — סיכום מסע</title>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${STYLES}</style>
</head>
<body>
<div class="page">

  <header class="hero" style="background-image:url('${cover}')">
    <div class="hero-c">
      <div>
        <h1>${esc(trip.name)}</h1>
        <div class="hero-meta">📍 ${esc(trip.destination || '')}</div>
      </div>
      <div class="hero-chips">
        ${dayCount > 0 ? `<span class="chip">📅 ${dayCount} ימים</span>` : ''}
        ${flightCount > 0 ? `<span class="chip">✈️ ${flightCount} טיסות</span>` : ''}
        ${hotelCount > 0 ? `<span class="chip">🏨 ${hotelCount} מלונות</span>` : ''}
      </div>
    </div>
  </header>

  <div class="stats">
    <div class="stat"><div class="stat-v">${dayCount}</div><div class="stat-l">ימים</div></div>
    <div class="stat"><div class="stat-v">${flightCount}</div><div class="stat-l">טיסות</div></div>
    <div class="stat"><div class="stat-v">${hotelCount}</div><div class="stat-l">מלונות</div></div>
    <div class="stat"><div class="stat-v">${itineraryActivityCount}</div><div class="stat-l">פעילויות</div></div>
  </div>

  ${renderFlightsOverview(trip)}
  ${renderHotelsOverview(trip)}

  <section class="days-section">
    <h2 class="ov-title">📆 יום-יום <span class="ov-count">${dayCount}</span></h2>
    <div class="days-grid">${dayCards}</div>
  </section>

  <div class="footer">
    <div class="footer-logo">✈ Travel Planner Pro</div>
    נוצר ב-${genDate}
  </div>

</div>
</body>
</html>`;
};

export const downloadTripHTML = (trip: Trip): void => {
  const html = generateTripHTML(trip);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${trip.name.replace(/[^a-zA-Z0-9֐-׿ ]/g, '').trim() || 'trip'} — סיכום מסע.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
