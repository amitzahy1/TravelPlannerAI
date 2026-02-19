import { Trip, FlightSegment, HotelBooking, ItineraryItem } from '../types';

/**
 * Generates a Premium Travel Timeline (v4 Redesign)
 * Concept: Unified Vertical Timeline.
 * Everything (Flights, Hotels, Activities) is an event on the timeline.
 */

// ── Types ────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string;
  type: 'flight_dep' | 'flight_arr' | 'hotel_in' | 'hotel_out' | 'hotel_stay' | 'activity' | 'food' | 'divider';
  time: string; // HH:MM
  title: string;
  subtitle?: string;
  icon: string;
  details?: string; // HTML content
  isMajor?: boolean; // Bold/Highlight
  isNight?: boolean; // For overnight stays
  lat?: number;
  lng?: number;
  // Context for linking
  refId?: string;
}

interface TimelineDay {
  date: Date;
  iso: string;
  dayNum: number;
  month: string;
  dow: string; // Day of week
  events: TimelineEvent[];
  title?: string; // "Flight to Georgia" or "City Tour"
}

// ── Helpers ──────────────────────────────────────────────────────

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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

// ── Timeline Builder ─────────────────────────────────────────────

const buildTimeline = (trip: Trip): TimelineDay[] => {
  // 1. Determine Range
  const allDates: number[] = [];
  const addDate = (s?: string) => s && !isNaN(new Date(s).getTime()) && allDates.push(new Date(s).getTime());

  trip.flights?.segments?.forEach(s => addDate(s.date));
  trip.hotels?.forEach(h => { addDate(h.checkInDate); addDate(h.checkOutDate); });
  trip.itinerary?.forEach(i => addDate(i.date));

  // Fallback
  if (trip.dates && allDates.length === 0) {
    trip.dates.split(/[-–]/).forEach(p => addDate(p.trim()));
  }

  if (allDates.length === 0) return []; // Should not happen with validation

  const minDate = new Date(Math.min(...allDates));
  const maxDate = new Date(Math.max(...allDates));

  // Normalize range (noon to avoid DST issues)
  const startDate = new Date(minDate); startDate.setHours(12, 0, 0, 0);
  const endDate = new Date(maxDate); endDate.setHours(12, 0, 0, 0);

  const days: Record<string, TimelineDay> = {};
  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;

  // Init structure
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

  // -> Flights
  trip.flights?.segments?.forEach((seg, idx) => {
    const depIso = isoDate(seg.date);

    // Departure
    addToDay(depIso, {
      id: `flight-${idx}-dep`,
      type: 'flight_dep',
      time: fmtTime(seg.departureTime) || '—',
      title: `טיסה ל-${esc(seg.toCity || seg.toCode)}`,
      subtitle: `${esc(seg.airline)} • ${esc(seg.flightNumber || '')}`,
      icon: '✈️',
      isMajor: true,
      details: `
                <div class="flight-det-row">
                    <span>המראה: ${esc(seg.fromCity)} (${esc(seg.fromCode)})</span>
                    ${seg.terminal ? `<span>טרמינל ${esc(seg.terminal)}</span>` : ''}
                </div>
            `
    });

    // Arrival (Calculate proper day)
    // Heuristic: If we have full ISO arrival time, use it. 
    // Else if arr < dep time string, assume +1 day.
    let arrIso = depIso;
    const depT = fmtTime(seg.departureTime);
    const arrT = fmtTime(seg.arrivalTime);

    if (seg.arrivalTime?.includes('T')) {
      arrIso = isoDate(seg.arrivalTime);
    } else if (depT && arrT && arrT < depT) {
      // Likely next day arrival
      const d = new Date(seg.date);
      d.setDate(d.getDate() + 1);
      arrIso = isoDate(d);
    }

    addToDay(arrIso, {
      id: `flight-${idx}-arr`,
      type: 'flight_arr',
      time: arrT || '—',
      title: `נחיתה ב-${esc(seg.toCity || seg.toCode)}`,
      subtitle: seg.duration ? `משך טיסה: ${esc(seg.duration)}` : '',
      icon: '🛬',
      isMajor: true
    });
  });

  // -> Hotels
  trip.hotels?.forEach((h, idx) => {
    const inIso = isoDate(h.checkInDate);
    const outIso = isoDate(h.checkOutDate);

    // Check-in
    addToDay(inIso, {
      id: `hotel-${idx}-in`,
      type: 'hotel_in',
      time: '15:00', // Default check-in assumption if missing
      title: `צ'ק-אין: ${esc(h.name)}`,
      subtitle: h.address || h.city,
      icon: '🏨',
      isMajor: true,
      details: h.confirmationCode ? `קוד אישור: ${esc(h.confirmationCode)}` : undefined
    });

    // Check-out
    addToDay(outIso, {
      id: `hotel-${idx}-out`,
      type: 'hotel_out',
      time: '11:00',
      title: `צ'ק-אאוט: ${esc(h.name)}`,
      subtitle: '',
      icon: '👋',
    });
  });

  // -> Itinerary Activities
  trip.itinerary?.forEach((day, idx) => {
    const iso = isoDate(day.date);

    // If day exists, we can override the day title if it matches the journal title
    // But better to just add activities
    if (!days[iso]) return;

    if (day.title && day.title !== 'טיול חופשי' && day.title !== 'יום טיסה') {
      days[iso].title = day.title; // Set explicit title for the day
    }

    day.activities?.forEach((act, aIdx) => {
      // Try to extract time "10:00 Activity Name"
      const timeMatch = act.match(/^(\d{1,2}:\d{2})\s*(.*)/);
      const time = timeMatch ? timeMatch[1] : '';
      const text = timeMatch ? timeMatch[2] : act;

      addToDay(iso, {
        id: `act-${idx}-${aIdx}`,
        type: 'activity',
        time: time, // might be empty
        title: text,
        subtitle: '',
        icon: '📍',
      });
    });

    if (day.notes) {
      addToDay(iso, {
        id: `note-${idx}`,
        type: 'activity', // generic
        time: '',
        title: 'הערות יומן',
        subtitle: '',
        details: day.notes,
        icon: '📝'
      });
    }
  });

  // -> Detect ongoing hotel stays for empty days
  // We do this BEFORE sorting, so we can set the title if needed.
  Object.values(days).forEach(day => {
    const d = isoDate(day.date);

    // Find hotel where we are strictly between check-in and check-out
    // (Check-in day and Check-out day already have events)
    const activeHotel = trip.hotels?.find(h => {
      const inD = isoDate(h.checkInDate);
      const outD = isoDate(h.checkOutDate);
      return d > inD && d < outD;
    });

    // Only add if explicit stay is needed (e.g. empty day)
    if (activeHotel) {
      if (day.events.length === 0) {
        day.title = `נופש ב-${activeHotel.name}`; // Force title
        day.events.push({
          id: `stay-${d}`,
          type: 'hotel_stay',
          time: '',
          title: 'שהייה במלון',
          subtitle: activeHotel.name,
          icon: '🛏️',
          isMajor: false,
          details: 'יום חופשי במלון'
        });
      }
    }
  });

  // 3. Sort & Assign Titles
  return Object.values(days).sort((a, b) => a.date.getTime() - b.date.getTime()).map(day => {
    // Sort events by time
    day.events.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1; // puts empty time at end? or start. Let's put at start.
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });

    // Determine title if not set
    if (!day.title) {
      if (day.events.some(e => e.type === 'flight_dep')) day.title = 'יום טיסה';
      else if (day.events.length === 0) day.title = 'יום חופשי';
      else day.title = 'יום פעילות';
    }

    return day;
  });
};


// ── Renderers ────────────────────────────────────────────────────

const renderDay = (day: TimelineDay): string => {
  // If absolutely no events, maybe skip? Or show "Vacation Day"
  // User wanted flow, so keep all days.

  // Header
  const header = `
     <div class="day-header" id="day-${day.iso}">
        <div class="dh-sticky">
           <div class="dh-date">${day.dayNum} ${day.month}</div>
           <div class="dh-dow">${day.dow}</div>
        </div>
        <div class="dh-title">${esc(day.title || '')}</div>
     </div>
    `;

  // Events
  const events = day.events.length === 0
    ? `<div class="timeline-empty">יום חופשי - ללא לו"ז קבוע</div>`
    : day.events.map(e => `
            <div class="event-card ${e.isMajor ? 'major' : ''} type-${e.type}">
               <div class="ev-time">${e.time || ''}</div>
               <div class="ev-marker">${e.icon}</div>
               <div class="ev-content">
                  <div class="ev-title">${esc(e.title)}</div>
                  ${e.subtitle ? `<div class="ev-subtitle">${esc(e.subtitle)}</div>` : ''}
                  ${e.details ? `<div class="ev-details">${e.details}</div>` : ''}
               </div>
            </div>
          `).join('');

  return `
      <div class="timeline-day">
         ${header}
         <div class="timeline-body">
            <div class="timeline-line"></div>
            ${events}
         </div>
      </div>
    `;
};


// ── Styling ──────────────────────────────────────────────────────

const STYLES = `
/* ═══ RESET & VARS ═══ */
:root{
  --font: 'Rubik',-apple-system,sans-serif;
  --bg: #f8fafc;
  --card: #ffffff;
  --text: #1e293b;
  --muted: #64748b;
  --primary: #2563eb;
  --line: #e2e8f0;
}
*,*::before,*::after{box-sizing:border-box}
body{font-family:var(--font);background:var(--bg);color:var(--text);margin:0;padding-bottom:100px;direction:rtl}

/* ═══ HERO ═══ */
.hero{
  height:260px; /* Compact */
  background-size:cover;background-position:center;
  position:relative;display:flex;align-items:flex-end;
  color:white;
}
.hero::after{content:'';position:absolute;inset:0;background:linear-gradient(to top, rgba(0,0,0,0.8), transparent)}
.hero-content{position:relative;z-index:2;padding:24px;width:100%;max-width:600px;margin:0 auto}
h1{margin:0;font-size:32px;line-height:1.1}
.meta{opacity:0.9;font-size:14px;margin-top:8px}

/* ═══ TIMELINE CONTAINER ═══ */
.timeline-container{
  max-width:600px;margin:0 auto;padding:20px 16px;
}

/* ═══ DAY GROUP ═══ */
.timeline-day{
  margin-bottom:40px;
}
.day-header{
  display:flex;align-items:center;gap:16px;margin-bottom:20px;
  position:sticky;top:0;z-index:10;background:var(--bg);
  padding:10px 0;border-bottom:1px solid var(--line);
}
.dh-sticky{
  background:var(--card);border:1px solid var(--line);
  border-radius:12px;padding:6px 12px;text-align:center;
  box-shadow:0 2px 4px rgba(0,0,0,0.05);
  min-width:60px;
}
.dh-date{font-weight:800;font-size:14px;line-height:1}
.dh-dow{font-size:11px;color:var(--muted);margin-top:2px}
.dh-title{font-size:18px;font-weight:700;color:var(--primary)}

/* ═══ TIMELINE BODY ═══ */
.timeline-body{position:relative;padding-right:24px} /* Indent for line */
.timeline-line{
  position:absolute;right:8px;top:0;bottom:0;width:2px;background:var(--line);
  border-radius:2px;
}

/* ═══ EVENT CARDS ═══ */
.event-card{
  display:flex;gap:12px;margin-bottom:24px;position:relative;
  align-items:flex-start;
}
.ev-time{
  font-size:13px;font-weight:600;color:var(--muted);
  width:45px;text-align:left;flex-shrink:0;padding-top:2px;
}
.ev-marker{
  width:32px;height:32px;background:var(--card);border:1px solid var(--line);
  box-shadow:0 1px 2px rgba(0,0,0,0.05);
  border-radius:50%;display:flex;align-items:center;justify-content:center;
  position:absolute;right:-40px; /* On the line */
  z-index:2;font-size:14px;
}
.ev-content{
  background:var(--card);border:1px solid var(--line);border-radius:12px;
  padding:12px 16px;flex:1;box-shadow:0 1px 2px rgba(0,0,0,0.02);
}

/* ═══ VARIANTS ═══ */
.event-card.major .ev-content{border-right:4px solid var(--primary)}
.event-card.type-flight_dep .ev-marker, .event-card.type-flight_arr .ev-marker{background:#eff6ff;border-color:#bfdbfe}
.event-card.type-flight_dep .ev-title{color:#1e3a8a}
.event-card.type-hotel_in .ev-marker{background:#f0fdf4;border-color:#bbf7d0}
.event-card.type-hotel_in .ev-title{color:#14532d}
.event-card.type-hotel_stay .ev-marker{background:#f0fdf4;border-color:#bbf7d0}
.event-card.type-hotel_stay .ev-title{color:#14532d}
.event-card.type-hotel_stay .ev-marker{background:#f0fdf4;border-color:#bbf7d0}
.event-card.type-hotel_stay .ev-title{color:#14532d}

.ev-title{font-weight:700;font-size:15px;margin-bottom:2px}
.ev-subtitle{font-size:13px;color:var(--muted)}
.ev-details{margin-top:8px;font-size:12px;color:var(--muted);background:#f1f5f9;padding:8px;border-radius:8px}

.timeline-empty{
  text-align:center;color:var(--muted);font-style:italic;font-size:13px;
  padding:20px;background:rgba(255,255,255,0.5);border-radius:8px;
}

/* ═══ PRINT ═══ */
@media print {
  .hero{height:150px}
  .event-card{break-inside:avoid}
}
`;

// ── Main Generator ───────────────────────────────────────────────

export const generateTripHTML = (trip: Trip): string => {
  const timeline = buildTimeline(trip);
  const cover = trip.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80';
  const genDate = new Date().toLocaleDateString('he-IL');

  const dayHtml = timeline.map(renderDay).join('');

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
     <div class="meta">📍 ${esc(trip.destination)} • ${timeline.length} ימים</div>
  </div>
</header>

<div class="timeline-container">
   ${dayHtml}
</div>

<div style="text-align:center;padding:40px;color:#cbd5e1;font-size:12px">
  Travel Planner Pro • ${genDate}
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
