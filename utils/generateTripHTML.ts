import { Trip, FlightSegment, HotelBooking, ItineraryItem } from '../types';

/**
 * Generates a Premium Travel Timeline (v5 — Perfected)
 * ─────────────────────────────────────────────────────
 * - Boarding-pass style flight cards
 * - Rich hotel cards with nights count
 * - "Vacation Mode" for hotel stay days
 * - Smart entity handling (no double-escape)
 * - Polished visual design with gradients
 */

// ── Types ────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string;
  type: 'flight_dep' | 'flight_arr' | 'hotel_in' | 'hotel_out' | 'hotel_stay' | 'activity' | 'food' | 'divider';
  time: string;
  title: string;
  subtitle?: string;
  icon: string;
  details?: string;
  isMajor?: boolean;
  isNight?: boolean;
  // Flight-specific rich data
  flightData?: FlightSegment;
  // Hotel-specific
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

// ── Helpers ──────────────────────────────────────────────────────

/** Smart escape: first decode any existing entities, then re-encode once */
const esc = (s: string): string => {
  if (!s) return '';
  // Decode common HTML entities first to prevent double-encoding
  const decoded = s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
  // Then encode cleanly
  return decoded
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const DOW_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
const MONTHS_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

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
  try {
    return (typeof d === 'string' ? new Date(d) : d).toISOString().split('T')[0];
  } catch { return ''; }
};

const addDays = (d: Date, n: number): Date => {
  const newD = new Date(d);
  newD.setDate(newD.getDate() + n);
  return newD;
};

const nightsBetween = (checkIn: string, checkOut: string): number => {
  try {
    const a = new Date(checkIn), b = new Date(checkOut);
    return Math.max(0, Math.ceil((b.getTime() - a.getTime()) / 86400000));
  } catch { return 0; }
};

// ── Timeline Builder ─────────────────────────────────────────────

const buildTimeline = (trip: Trip): TimelineDay[] => {
  // 1. Determine Range
  const allDates: number[] = [];
  const addDate = (s?: string) => s && !isNaN(new Date(s).getTime()) && allDates.push(new Date(s).getTime());

  trip.flights?.segments?.forEach(s => addDate(s.date));
  trip.hotels?.forEach(h => { addDate(h.checkInDate); addDate(h.checkOutDate); });
  trip.itinerary?.forEach(i => addDate(i.date));

  if (trip.dates && allDates.length === 0) {
    trip.dates.split(/[-–]/).forEach(p => addDate(p.trim()));
  }

  if (allDates.length === 0) return [];

  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));

  const startDate = new Date(minDate); startDate.setHours(12, 0, 0, 0);
  const endDate = new Date(maxDate); endDate.setHours(12, 0, 0, 0);

  const days: Record<string, TimelineDay> = {};
  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

  for (let i = 0; i < totalDays; i++) {
    const current = addDays(startDate, i);
    const iso = isoDate(current);
    days[iso] = {
      date: current,
      iso,
      dayNum: current.getDate(),
      month: MONTHS_HE[current.getMonth()],
      dow: DOW_HE[current.getDay()],
      events: []
    };
  }

  // 2. Inject Events
  const addToDay = (iso: string, evt: TimelineEvent) => {
    if (days[iso]) days[iso].events.push(evt);
  };

  // → Flights — with FULL data pass-through
  trip.flights?.segments?.forEach((seg, idx) => {
    const depIso = isoDate(seg.date);

    addToDay(depIso, {
      id: `flight-${idx}-dep`,
      type: 'flight_dep',
      time: fmtTime(seg.departureTime) || '—',
      title: `טיסה ל-${seg.toCity || seg.toCode}`,
      subtitle: `${seg.airline || ''} • ${seg.flightNumber || ''}`.trim(),
      icon: '✈️',
      isMajor: true,
      flightData: seg
    });

    // Arrival day calculation
    let arrIso = depIso;
    const depT = fmtTime(seg.departureTime);
    const arrT = fmtTime(seg.arrivalTime);

    if (seg.arrivalTime?.includes('T')) {
      arrIso = isoDate(seg.arrivalTime);
    } else if (depT && arrT && arrT < depT) {
      const d = new Date(seg.date);
      d.setDate(d.getDate() + 1);
      arrIso = isoDate(d);
    }

    addToDay(arrIso, {
      id: `flight-${idx}-arr`,
      type: 'flight_arr',
      time: arrT || '—',
      title: `נחיתה ב-${seg.toCity || seg.toCode}`,
      subtitle: seg.duration ? `משך טיסה: ${seg.duration}` : '',
      icon: '🛬',
      isMajor: true,
      flightData: seg
    });
  });

  // → Hotels (with smart check-in time based on flight arrivals)
  trip.hotels?.forEach((h, idx) => {
    const inIso = isoDate(h.checkInDate);
    const outIso = isoDate(h.checkOutDate);
    const nights = nightsBetween(h.checkInDate, h.checkOutDate);

    // Smart check-in time: if a flight arrives on the same day, place check-in AFTER arrival
    let checkInTime = '15:00';
    const arrivalOnSameDay = days[inIso]?.events.find(e => e.type === 'flight_arr');
    if (arrivalOnSameDay && arrivalOnSameDay.time) {
      // Set check-in 30 min after arrival
      const [hh, mm] = arrivalOnSameDay.time.split(':').map(Number);
      const totalMin = hh * 60 + mm + 30;
      const newH = Math.min(23, Math.floor(totalMin / 60));
      const newM = totalMin % 60;
      checkInTime = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    }

    addToDay(inIso, {
      id: `hotel-${idx}-in`,
      type: 'hotel_in',
      time: checkInTime,
      title: `צ'ק-אין`,
      subtitle: h.name,
      icon: '🏨',
      isMajor: true,
      hotelData: h,
      nightsCount: nights
    });

    // Smart check-out time: if a flight departs same day, put checkout BEFORE departure
    let checkOutTime = '11:00';
    const depOnSameDay = days[outIso]?.events.find(e => e.type === 'flight_dep');
    if (depOnSameDay && depOnSameDay.time) {
      const [hh, mm] = depOnSameDay.time.split(':').map(Number);
      const totalMin = Math.max(0, hh * 60 + mm - 120); // 2 hours before flight
      const newH = Math.floor(totalMin / 60);
      const newM = totalMin % 60;
      checkOutTime = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    }

    addToDay(outIso, {
      id: `hotel-${idx}-out`,
      type: 'hotel_out',
      time: checkOutTime,
      title: `צ'ק-אאוט`,
      subtitle: h.name,
      icon: '👋',
      hotelData: h
    });
  });

  // → Itinerary Activities
  trip.itinerary?.forEach((day, idx) => {
    const iso = isoDate(day.date);
    if (!days[iso]) return;

    if (day.title && day.title !== 'טיול חופשי' && day.title !== 'יום טיסה') {
      days[iso].title = day.title;
    }

    day.activities?.forEach((act, aIdx) => {
      const timeMatch = act.match(/^(\d{1,2}:\d{2})(?:-\d{1,2}:\d{2})?\s*(.*)/);
      const time = timeMatch ? timeMatch[1] : '';
      const text = timeMatch ? timeMatch[2] : act;

      // Detect transfer activities
      const isTransfer = /הסעה|נסיעה|טרנספר|transfer/i.test(text);

      addToDay(iso, {
        id: `act-${idx}-${aIdx}`,
        type: isTransfer ? 'activity' : 'activity',
        time,
        title: text,
        subtitle: '',
        icon: isTransfer ? '🚕' : '📍',
      });
    });

    if (day.notes) {
      addToDay(iso, {
        id: `note-${idx}`,
        type: 'activity',
        time: '',
        title: 'הערות',
        details: day.notes,
        icon: '📝'
      });
    }
  });

  // → Detect ongoing hotel stays for empty days
  Object.values(days).forEach(day => {
    const d = isoDate(day.date);
    const activeHotel = trip.hotels?.find(h => {
      const inD = isoDate(h.checkInDate);
      const outD = isoDate(h.checkOutDate);
      return d > inD && d < outD;
    });

    if (activeHotel && day.events.length === 0) {
      day.title = `נופש ב-${activeHotel.name}`;
      day.events.push({
        id: `stay-${d}`,
        type: 'hotel_stay',
        time: '',
        title: activeHotel.name,
        subtitle: 'יום חופשי במלון',
        icon: '🛏️',
        isMajor: false,
        hotelData: activeHotel
      });
    }
  });

  // 3. Sort & Assign Titles
  return Object.values(days).sort((a, b) => a.date.getTime() - b.date.getTime()).map((day, i) => {
    day.events.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });

    if (!day.title) {
      const hasFlight = day.events.some(e => e.type === 'flight_dep' || e.type === 'flight_arr');
      if (hasFlight) {
        const dep = day.events.find(e => e.type === 'flight_dep');
        day.title = dep ? `טיסה ל-${dep.flightData?.toCity || dep.flightData?.toCode || ''}` : 'נחיתה';
      } else if (day.events.length === 0) {
        day.title = 'יום חופשי';
      } else {
        day.title = 'יום פעילות';
      }
    }

    return day;
  });
};


// ── Renderers ────────────────────────────────────────────────────

/** Renders a prominent boarding-pass style flight card */
const renderFlightCard = (e: TimelineEvent): string => {
  const seg = e.flightData;
  if (!seg) return renderGenericEvent(e);

  const isDep = e.type === 'flight_dep';
  const depTime = fmtTime(seg.departureTime);
  const arrTime = fmtTime(seg.arrivalTime);

  // Extras row
  const extras: string[] = [];
  if (seg.terminal) extras.push(`טרמינל ${esc(seg.terminal)}`);
  if (seg.gate) extras.push(`שער ${esc(seg.gate)}`);
  if (seg.baggage) extras.push(`כבודה: ${esc(seg.baggage)}`);
  if (seg.class) extras.push(esc(seg.class));
  if (seg.seat) extras.push(`מושב ${esc(seg.seat)}`);

  return `
    <div class="flight-card ${isDep ? 'departure' : 'arrival'}">
      <div class="fc-header">
        <span class="fc-badge">${isDep ? '🛫 המראה' : '🛬 נחיתה'}</span>
        <span class="fc-flight-num">${esc(seg.flightNumber || '')}</span>
      </div>
      <div class="fc-route">
        <div class="fc-airport">
          <div class="fc-code">${esc(seg.fromCode || '')}</div>
          <div class="fc-city">${esc(seg.fromCity || '')}</div>
          <div class="fc-time">${depTime}</div>
        </div>
        <div class="fc-arrow">
          <div class="fc-airline">${esc(seg.airline || '')}</div>
          <div class="fc-arrow-line"><span>✈</span></div>
          ${seg.duration ? `<div class="fc-duration">${esc(seg.duration)}</div>` : ''}
        </div>
        <div class="fc-airport">
          <div class="fc-code">${esc(seg.toCode || '')}</div>
          <div class="fc-city">${esc(seg.toCity || '')}</div>
          <div class="fc-time">${arrTime}</div>
        </div>
      </div>
      ${extras.length > 0 ? `<div class="fc-extras">${extras.map(x => `<span>${x}</span>`).join('')}</div>` : ''}
    </div>
  `;
};

/** Renders a hotel check-in/out card with details */
const renderHotelCard = (e: TimelineEvent): string => {
  const h = e.hotelData;
  if (!h) return renderGenericEvent(e);

  const isIn = e.type === 'hotel_in';
  const nightsLabel = e.nightsCount && e.nightsCount > 0 ? `${e.nightsCount} לילות` : '';

  return `
    <div class="hotel-card ${isIn ? 'check-in' : 'check-out'}">
      <div class="hc-icon">${isIn ? '🏨' : '👋'}</div>
      <div class="hc-content">
        <div class="hc-label">${isIn ? `צ'ק-אין` : `צ'ק-אאוט`}</div>
        <div class="hc-name">${esc(h.name)}</div>
        ${h.address ? `<div class="hc-address">📍 ${esc(h.address)}</div>` : ''}
        <div class="hc-meta">
          ${nightsLabel ? `<span class="hc-nights">${nightsLabel}</span>` : ''}
          ${h.confirmationCode ? `<span class="hc-conf">אישור: ${esc(h.confirmationCode)}</span>` : ''}
        </div>
        ${h.price ? `<div class="hc-price">💰 ${h.price}${h.currency ? ' ' + esc(h.currency) : ''}</div>` : ''}
      </div>
    </div>
  `;
};

/** Renders a "Vacation at Hotel" stay card */
const renderStayCard = (e: TimelineEvent): string => {
  return `
    <div class="stay-card">
      <div class="stay-icon">🛏️</div>
      <div class="stay-content">
        <div class="stay-title">${esc(e.title)}</div>
        <div class="stay-sub">יום חופשי במלון — מנוחות והנאה</div>
      </div>
    </div>
  `;
};


/** Renders a standard event card */
const renderGenericEvent = (e: TimelineEvent): string => `
  <div class="event-card ${e.isMajor ? 'major' : ''} type-${e.type}">
    <div class="ev-time">${e.time || ''}</div>
    <div class="ev-marker">${e.icon}</div>
    <div class="ev-content">
      <div class="ev-title">${esc(e.title)}</div>
      ${e.subtitle ? `<div class="ev-subtitle">${esc(e.subtitle)}</div>` : ''}
      ${e.details ? `<div class="ev-details">${esc(e.details)}</div>` : ''}
    </div>
  </div>
`;

const renderEvent = (e: TimelineEvent): string => {
  switch (e.type) {
    case 'flight_dep':
    case 'flight_arr':
      return renderFlightCard(e);
    case 'hotel_in':
    case 'hotel_out':
      return renderHotelCard(e);
    case 'hotel_stay':
      return renderStayCard(e);
    default:
      return renderGenericEvent(e);
  }
};


/** Renders a grouped block for consecutive hotel-stay days */
const renderStayGroup = (days: TimelineDay[]): string => {
  if (days.length === 0) return '';
  const first = days[0];
  const last = days[days.length - 1];
  const hotel = first.events[0];
  const hotelName = hotel?.title || '';

  const dateRange = days.length === 1
    ? `${first.dayNum} ${first.month}`
    : `${first.dayNum} ${first.month} — ${last.dayNum} ${last.month}`;

  return `
    <div class="timeline-day stay-group">
      <div class="day-header" id="day-${first.iso}">
        <div class="dh-badge stay-badge">
          <div class="dh-daynum">${days.length}</div>
          <div class="dh-month">ימים</div>
        </div>
        <div class="dh-info">
          <div class="dh-label">${dateRange}</div>
          <div class="dh-title">נופש ב-${esc(hotelName)}</div>
        </div>
      </div>
      <div class="timeline-body">
        <div class="timeline-line"></div>
        <div class="stay-group-card">
          <div class="sg-icon">🛏️</div>
          <div class="sg-content">
            <div class="sg-title">${esc(hotelName)}</div>
            <div class="sg-sub">${days.length} ימי נופש ומנוחה • ${dateRange}</div>
          </div>
        </div>
      </div>
    </div>
  `;
};

const renderDay = (day: TimelineDay, index: number, total: number): string => {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const dayLabel = isFirst ? 'יום ראשון' : isLast ? 'יום אחרון' : `יום ${index + 1}`;

  const header = `
    <div class="day-header" id="day-${day.iso}">
      <div class="dh-badge">
        <div class="dh-daynum">${day.dayNum}</div>
        <div class="dh-month">${day.month}</div>
        <div class="dh-dow">${day.dow}</div>
      </div>
      <div class="dh-info">
        <div class="dh-label">${dayLabel}</div>
        <div class="dh-title">${esc(day.title || '')}</div>
      </div>
    </div>
  `;

  const events = day.events.length === 0
    ? `<div class="timeline-empty">☀️ יום חופשי</div>`
    : day.events.map(e => renderEvent(e)).join('');

  return `
    <div class="timeline-day${isFirst ? ' first' : ''}${isLast ? ' last' : ''}">
      ${header}
      <div class="timeline-body">
        <div class="timeline-line"></div>
        ${events}
      </div>
    </div>
  `;
};

/** Groups consecutive hotel-stay-only days, renders everything else normally */
const renderTimeline = (timeline: TimelineDay[]): string => {
  const output: string[] = [];
  let stayBuffer: TimelineDay[] = [];
  let dayCounter = 0;

  const flushStays = () => {
    if (stayBuffer.length > 0) {
      output.push(renderStayGroup(stayBuffer));
      stayBuffer = [];
    }
  };

  for (const day of timeline) {
    const isStayOnly = day.events.length > 0 && day.events.every(e => e.type === 'hotel_stay');

    if (isStayOnly) {
      stayBuffer.push(day);
    } else {
      flushStays();
      output.push(renderDay(day, dayCounter, timeline.length));
    }
    dayCounter++;
  }
  flushStays();

  return output.join('');
};


// ── Styling ──────────────────────────────────────────────────────

const STYLES = `
/* ═══ RESET & VARS ═══ */
:root {
  --font: 'Rubik', -apple-system, sans-serif;
  --bg: #f0f4f8;
  --card: #ffffff;
  --text: #1e293b;
  --muted: #64748b;
  --primary: #2563eb;
  --primary-light: #dbeafe;
  --accent: #0ea5e9;
  --green: #10b981;
  --green-light: #d1fae5;
  --amber: #f59e0b;
  --line: #cbd5e1;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
  --radius: 16px;
  --radius-sm: 10px;
}
*, *::before, *::after { box-sizing: border-box; }
body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  margin: 0;
  padding-bottom: 80px;
  direction: rtl;
  -webkit-font-smoothing: antialiased;
}

/* ═══ HERO ═══ */
.hero {
  height: 280px;
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;
  align-items: flex-end;
  color: white;
}
.hero::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.3) 50%, transparent 100%);
}
.hero-content {
  position: relative;
  z-index: 2;
  padding: 32px 24px;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
}
h1 {
  margin: 0;
  font-size: 36px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.5px;
}
.meta {
  opacity: 0.85;
  font-size: 14px;
  font-weight: 500;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.meta-chip {
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.2);
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

/* ═══ TIMELINE CONTAINER ═══ */
.timeline-container {
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 16px;
}

/* ═══ DAY GROUP ═══ */
.timeline-day {
  margin-bottom: 48px;
}
.timeline-day.first .day-header .dh-badge {
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  color: white;
}
.timeline-day.first .day-header .dh-badge .dh-dow { color: rgba(255,255,255,0.8); }
.timeline-day.last .day-header .dh-badge {
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  color: white;
}
.timeline-day.last .day-header .dh-badge .dh-dow { color: rgba(255,255,255,0.8); }

.day-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg);
  padding: 12px 0 12px;
}
.dh-badge {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 8px 14px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  min-width: 64px;
}
.dh-daynum { font-weight: 800; font-size: 22px; line-height: 1; }
.dh-month { font-size: 11px; font-weight: 600; margin-top: 2px; }
.dh-dow { font-size: 10px; color: var(--muted); margin-top: 2px; font-weight: 500; }
.dh-info { flex: 1; }
.dh-label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
.dh-title { font-size: 20px; font-weight: 700; color: var(--primary); margin-top: 2px; }

/* ═══ TIMELINE BODY ═══ */
.timeline-body { position: relative; padding-right: 28px; }
.timeline-line {
  position: absolute;
  right: 10px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, var(--primary-light), var(--line), var(--green-light));
  border-radius: 2px;
}

/* ═══ FLIGHT CARD (Boarding Pass) ═══ */
.flight-card {
  background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%);
  color: white;
  border-radius: var(--radius);
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  position: relative;
}
.flight-card.arrival {
  background: linear-gradient(135deg, #065f46 0%, #047857 100%);
}
.fc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px 8px;
  border-bottom: 1px dashed rgba(255,255,255,0.2);
}
.fc-badge {
  font-size: 13px;
  font-weight: 700;
  background: rgba(255,255,255,0.15);
  padding: 4px 12px;
  border-radius: 20px;
}
.fc-flight-num {
  font-size: 14px;
  font-weight: 800;
  font-family: 'Courier New', monospace;
  letter-spacing: 1px;
  direction: ltr;
}
.fc-route {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 20px;
  gap: 8px;
}
.fc-airport {
  text-align: center;
  min-width: 70px;
}
.fc-code {
  font-size: 28px;
  font-weight: 800;
  font-family: 'Courier New', monospace;
  letter-spacing: 2px;
  line-height: 1;
  direction: ltr;
}
.fc-city {
  font-size: 11px;
  opacity: 0.7;
  margin-top: 4px;
  font-weight: 500;
  direction: ltr;
}
.fc-time {
  font-size: 18px;
  font-weight: 700;
  margin-top: 6px;
  font-family: 'Courier New', monospace;
  direction: ltr;
}
.fc-arrow {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.fc-airline {
  font-size: 10px;
  font-weight: 600;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  direction: ltr;
}
.fc-arrow-line {
  width: 100%;
  height: 2px;
  background: rgba(255,255,255,0.3);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fc-arrow-line span {
  font-size: 16px;
  background: inherit;
  position: relative;
}
.fc-duration {
  font-size: 10px;
  opacity: 0.6;
  font-weight: 500;
  direction: ltr;
}
.fc-extras {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 20px 14px;
}
.fc-extras span {
  font-size: 10px;
  font-weight: 600;
  background: rgba(255,255,255,0.12);
  padding: 3px 10px;
  border-radius: 12px;
  white-space: nowrap;
}

/* ═══ HOTEL CARD ═══ */
.hotel-card {
  display: flex;
  gap: 14px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 16px 18px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
  border-right: 4px solid var(--green);
  align-items: flex-start;
}
.hotel-card.check-out {
  border-right-color: var(--amber);
  opacity: 0.85;
}
.hc-icon {
  font-size: 28px;
  flex-shrink: 0;
}
.hc-content { flex: 1; min-width: 0; }
.hc-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--green);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.hotel-card.check-out .hc-label { color: var(--amber); }
.hc-name {
  font-size: 17px;
  font-weight: 800;
  margin-top: 2px;
  line-height: 1.2;
}
.hc-address {
  font-size: 12px;
  color: var(--muted);
  margin-top: 4px;
}
.hc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.hc-nights {
  font-size: 11px;
  font-weight: 700;
  background: var(--green-light);
  color: #065f46;
  padding: 3px 10px;
  border-radius: 12px;
}
.hc-conf {
  font-size: 11px;
  font-weight: 600;
  background: #f1f5f9;
  color: var(--muted);
  padding: 3px 10px;
  border-radius: 12px;
  font-family: 'Courier New', monospace;
  direction: ltr;
}
.hc-price {
  font-size: 12px;
  font-weight: 600;
  margin-top: 6px;
  color: var(--muted);
}

/* ═══ HOTEL STAY CARD ═══ */
.stay-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  border: 1px solid #bbf7d0;
  border-radius: var(--radius);
  padding: 20px;
  margin-bottom: 20px;
}
.stay-icon { font-size: 32px; }
.stay-title {
  font-size: 16px;
  font-weight: 700;
  color: #14532d;
}
.stay-sub {
  font-size: 12px;
  color: #047857;
  margin-top: 2px;
}

/* ═══ GENERIC EVENT CARDS ═══ */
.event-card {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  position: relative;
  align-items: flex-start;
}
.ev-time {
  font-size: 13px;
  font-weight: 700;
  color: var(--muted);
  width: 48px;
  text-align: left;
  flex-shrink: 0;
  padding-top: 12px;
  font-family: 'Courier New', monospace;
  direction: ltr;
}
.ev-marker {
  width: 34px;
  height: 34px;
  background: var(--card);
  border: 2px solid var(--line);
  box-shadow: var(--shadow-sm);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  right: -42px;
  z-index: 2;
  font-size: 14px;
}
.ev-content {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  flex: 1;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s;
}
.ev-content:hover { box-shadow: var(--shadow-md); }

.ev-title { font-weight: 700; font-size: 15px; margin-bottom: 2px; }
.ev-subtitle { font-size: 13px; color: var(--muted); }
.ev-details {
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted);
  background: #f8fafc;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #f1f5f9;
}

.timeline-empty {
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  padding: 24px;
  background: rgba(255,255,255,0.6);
  border-radius: var(--radius);
  border: 1px dashed var(--line);
}

/* ═══ FOOTER ═══ */
.footer {
  text-align: center;
  padding: 48px 24px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
}
.footer-logo {
  font-size: 14px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 4px;
}

/* ═══ RESPONSIVE ═══ */
@media (max-width: 480px) {
  h1 { font-size: 28px; }
  .fc-code { font-size: 22px; }
  .fc-time { font-size: 16px; }
  .fc-route { padding: 12px 14px 16px; }
  .hc-name { font-size: 15px; }
}

/* ═══ PRINT ═══ */
@media print {
  .hero { height: 160px; }
  .event-card, .flight-card, .hotel-card, .stay-card, .stay-group-card { break-inside: avoid; }
  .day-header { position: static; }
  body { background: white; }
}

/* ═══ STAY GROUP ═══ */
.stay-group .day-header .dh-title { color: #047857; }
.stay-badge {
  background: linear-gradient(135deg, #10b981, #059669) !important;
  color: white !important;
  border-color: #047857 !important;
}
.stay-badge .dh-dow, .stay-badge .dh-month { color: rgba(255,255,255,0.85) !important; }
.stay-group-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  border: 1px solid #a7f3d0;
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: var(--shadow-sm);
}
.sg-icon { font-size: 36px; }
.sg-title { font-size: 18px; font-weight: 800; color: #065f46; }
.sg-sub { font-size: 13px; color: #047857; margin-top: 4px; font-weight: 500; }
`;

// ── Main Generator ───────────────────────────────────────────────

export const generateTripHTML = (trip: Trip): string => {
  const timeline = buildTimeline(trip);
  const cover = trip.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80';
  const genDate = new Date().toLocaleDateString('he-IL');

  // Trip stats
  const flightCount = trip.flights?.segments?.length || 0;
  const hotelCount = trip.hotels?.length || 0;

  const dayHtml = renderTimeline(timeline);

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(trip.name)}</title>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>${STYLES}</style>
</head>
<body>

<header class="hero" style="background-image:url('${cover}')">
  <div class="hero-content">
    <h1>${esc(trip.name)}</h1>
    <div class="meta">
      📍 ${esc(trip.destination)} 
      <span class="meta-chip">📅 ${timeline.length} ימים</span>
      ${flightCount > 0 ? `<span class="meta-chip">✈️ ${flightCount} טיסות</span>` : ''}
      ${hotelCount > 0 ? `<span class="meta-chip">🏨 ${hotelCount} מלונות</span>` : ''}
    </div>
  </div>
</header>

<div class="timeline-container">
  ${dayHtml}
</div>

<div class="footer">
  <div class="footer-logo">✈ Travel Planner Pro</div>
  נוצר ב-${genDate}
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
  a.download = `${trip.name.replace(/[^a-zA-Z0-9\u0590-\u05FF ]/g, '').trim() || 'trip'} — יומן מסע.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
