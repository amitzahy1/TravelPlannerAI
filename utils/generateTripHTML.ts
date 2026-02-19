import { Trip, FlightSegment, HotelBooking, ItineraryItem } from '../types';

/**
 * Generates a premium travel-journal HTML page. (v3 Redesign)
 * Features:
 *   1. Hero with animated gradient + trip cover (Reduced height)
 *   2. Calendar strip showing every day of the trip with icons (Anchored to journal)
 *   3. Boarding-pass style flight cards (No PNR)
 *   4. Hotel stay timeline
 *   5. Day-by-day journal entries (robust date range)
 *   6. Restaurant recommendations grid
 *   7. Fully self-contained, RTL, responsive, print-ready
 */

// ── Helpers ──────────────────────────────────────────────────────

const esc = (s: string): string =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const fmtDate = (d: string): string => {
        if (!d) return '';
        try {
                const dt = new Date(d);
                if (isNaN(dt.getTime())) return d;
                return dt.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' });
        } catch { return d; }
};

const fmtDateFull = (d: string): string => {
        if (!d) return '';
        try {
                const dt = new Date(d);
                if (isNaN(dt.getTime())) return d;
                return dt.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        } catch { return d; }
};

// PRESERVE TIME: Do not convert to Date to avoid timezone shifts.
// If input is 2024-01-01T14:00:00, return 14:00.
const fmtTime = (t: string): string => {
        if (!t) return '';
        // If it's already HH:MM
        if (/^\d{1,2}:\d{2}$/.test(t)) return t;
        // If ISO string, split by T
        if (t.includes('T')) {
                const parts = t.split('T');
                if (parts[1]) return parts[1].substring(0, 5);
        }
        // Fallback try parse
        try {
                const dt = new Date(t);
                if (isNaN(dt.getTime())) return t;
                return dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch { return t; }
};

const isoDate = (d: string): string => {
        if (!d) return '';
        try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; }
};

const daysBetween = (a: string, b: string): number => {
        try {
                return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
        } catch { return 0; }
};

// Day-of-week short names in Hebrew
const DOW_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

// ── Calendar Logic (ROBUST) ──────────────────────────────────────

interface CalendarDay {
        iso: string;
        dayNum: number;
        dow: string;
        month: string;
        hasFlight: boolean;
        hotelName: string;
        isCheckIn: boolean;
        isCheckOut: boolean;
        activities: number;
        isToday: boolean;
}

const buildCalendarData = (trip: Trip): CalendarDay[] => {
        // 1. Collect ALL dates to find true range
        const allDates: number[] = [];
        const addDate = (s?: string) => {
                if (!s) return;
                const sms = new Date(s).getTime();
                if (!isNaN(sms)) allDates.push(sms);
        };

        // From flights
        trip.flights?.segments?.forEach(s => addDate(s.date));
        // From hotels
        trip.hotels?.forEach(h => { addDate(h.checkInDate); addDate(h.checkOutDate); });
        // From itinerary
        trip.itinerary?.forEach(i => addDate(i.date));

        // Also consider trip.dates string as a fallback but allow override by actual events
        /* 
           We prioritize actual events. If trip.dates is confusing (e.g. reversed), 
           actual events will likely provide the correct min/max.
        */
        if (trip.dates) {
                // Only if no events found yet, try to parse trip.dates
                if (allDates.length === 0) {
                        trip.dates.split(/[-–]/).forEach(p => addDate(p.trim()));
                }
        }

        if (allDates.length === 0) return [];

        const minMs = Math.min(...allDates);
        const maxMs = Math.max(...allDates);
        const startDate = new Date(minMs);
        const endDate = new Date(maxMs);

        // Normalize to noon to avoid DST issues when adding days
        startDate.setHours(12, 0, 0, 0);
        endDate.setHours(12, 0, 0, 0);

        const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
        if (totalDays <= 0 || totalDays > 90) return []; // Safety cap

        // 2. Index events
        const flightDates = new Set(
                trip.flights?.segments?.map(s => isoDate(s.date)).filter(Boolean) || []
        );

        const hotelByDate: Record<string, { name: string; isCheckIn: boolean; isCheckOut: boolean }> = {};
        trip.hotels?.forEach(h => {
                if (!h.checkInDate || !h.checkOutDate) return;
                const ci = isoDate(h.checkInDate);
                const co = isoDate(h.checkOutDate);
                const nights = daysBetween(ci, co);
                // Mark check-in
                hotelByDate[ci] = { name: h.name, isCheckIn: true, isCheckOut: false };
                // Mark check-out
                hotelByDate[co] = { name: h.name, isCheckIn: false, isCheckOut: true };
                // Mark match (middle days)
                for (let i = 1; i < nights; i++) {
                        const d = new Date(h.checkInDate);
                        d.setDate(d.getDate() + i);
                        hotelByDate[isoDate(d.toISOString())] = { name: h.name, isCheckIn: false, isCheckOut: false };
                }
        });

        const actByDate: Record<string, number> = {};
        trip.itinerary?.forEach(day => {
                const d = isoDate(day.date);
                if (d) actByDate[d] = (day.activities?.length || 0);
        });

        const today = isoDate(new Date().toISOString());
        const days: CalendarDay[] = [];

        // 3. Generate everyday
        for (let i = 0; i < totalDays; i++) {
                const d = new Date(startDate);
                d.setDate(startDate.getDate() + i);
                const iso = isoDate(d.toISOString());
                const hotel = hotelByDate[iso];

                days.push({
                        iso,
                        dayNum: d.getDate(),
                        dow: DOW_HE[d.getDay()],
                        month: d.toLocaleDateString('he-IL', { month: 'short' }),
                        hasFlight: flightDates.has(iso),
                        hotelName: hotel?.name || '',
                        isCheckIn: hotel?.isCheckIn || false,
                        isCheckOut: hotel?.isCheckOut || false,
                        activities: actByDate[iso] || 0,
                        isToday: iso === today,
                });
        }

        return days;
};

const renderCalendarStrip = (days: CalendarDay[]): string => {
        if (!days.length) return '';

        const cells = days.map((d, i) => {
                const classes = [
                        'cal-day',
                        d.hasFlight ? 'has-flight' : '',
                        d.hotelName ? 'has-hotel' : '',
                        d.isCheckIn ? 'check-in' : '',
                        d.isCheckOut ? 'check-out' : '',
                        d.isToday ? 'is-today' : '',
                ].filter(Boolean).join(' ');

                const icons: string[] = [];
                if (d.hasFlight) icons.push('✈️');
                else if (d.isCheckIn) icons.push('🏨');
                else if (d.isCheckOut) icons.push('👋');
                else if (d.activities > 0) icons.push('📍');

                return `
      <a href="#day-${d.iso}" class="${classes}" onclick="document.getElementById('day-${d.iso}').scrollIntoView({behavior: 'smooth'}); return false;">
        <div class="cal-dow">${d.dow}</div>
        <div class="cal-num">${d.dayNum}</div>
        <div class="cal-month">${i === 0 || d.dayNum === 1 ? d.month : ''}</div>
        <div class="cal-icons">${icons.join(' ')}</div>
        ${d.hotelName && (d.isCheckIn || d.isCheckOut) ? `<div class="cal-hotel-dot" title="${esc(d.hotelName)}"></div>` : ''}
      </a>
    `;
        }).join('');

        return `
    <section class="calendar-section">
      <div class="cal-strip">${cells}</div>
    </section>
  `;
};

// ── Boarding Pass Cards (Cleaned) ────────────────────────────────

const renderBoardingPasses = (flights: Trip['flights']): string => {
        if (!flights?.segments?.length) return '';

        const passes = flights.segments.map(seg => {
                const depTime = fmtTime(seg.departureTime);
                const arrTime = fmtTime(seg.arrivalTime);
                const date = fmtDateFull(seg.date);

                return `
    <div class="boarding-pass">
      <div class="bp-tear-left"></div>
      <div class="bp-tear-right"></div>
      <div class="bp-main">
        <div class="bp-header">
           <div class="bp-airline">
             <span class="bp-airline-name">${esc(seg.airline || 'טיסה')}</span>
             <span class="bp-flight-num">${esc(seg.flightNumber || '')}</span>
           </div>
           <div class="bp-date">${esc(date)}</div>
        </div>
        
        <div class="bp-route">
          <div class="bp-city">
            <div class="bp-code">${esc(seg.fromCode || '—')}</div>
            <div class="bp-city-name">${esc(seg.fromCity || '')}</div>
            <div class="bp-time">${esc(depTime)}</div>
          </div>
          <div class="bp-flight-path">
            <div class="bp-path-line"></div>
            <div class="bp-plane">✈</div>
            ${seg.duration ? `<div class="bp-duration">${esc(seg.duration)}</div>` : ''}
          </div>
          <div class="bp-city">
            <div class="bp-code">${esc(seg.toCode || '—')}</div>
            <div class="bp-city-name">${esc(seg.toCity || '')}</div>
            <div class="bp-time">${esc(arrTime)}</div>
          </div>
        </div>

        <div class="bp-details-grid">
           ${seg.terminal ? `<div class="bp-det"><span class="bp-lbl">טרמינל</span><span class="bp-val">${esc(seg.terminal)}</span></div>` : ''}
           ${seg.gate ? `<div class="bp-det"><span class="bp-lbl">שער</span><span class="bp-val">${esc(seg.gate)}</span></div>` : ''}
           ${seg.seat ? `<div class="bp-det"><span class="bp-lbl">מושב</span><span class="bp-val">${esc(seg.seat)}</span></div>` : ''}
           ${seg.class ? `<div class="bp-det"><span class="bp-lbl">מחלקה</span><span class="bp-val">${esc(seg.class)}</span></div>` : ''}
        </div>
      </div>
      <!-- Stub removed for cleaner look on mobile/print based on user feedback -->
    </div>`;
        }).join('');

        return `
    <section class="section">
      <h2 class="section-title"><span class="section-emoji">✈️</span> טיסות</h2>
      <div class="boarding-passes">${passes}</div>
    </section>`;
};

// ── Hotel Timeline ───────────────────────────────────────────────

const renderHotelTimeline = (hotels: HotelBooking[]): string => {
        if (!hotels?.length) return '';

        const cards = hotels.map(h => {
                const ci = fmtDate(h.checkInDate);
                const co = fmtDate(h.checkOutDate);
                const nights = h.nights || daysBetween(h.checkInDate, h.checkOutDate);

                const tags: string[] = [];
                if (h.roomType) tags.push(`🛏️ ${h.roomType}`);
                if (h.mealPlan) tags.push(`🍽️ ${h.mealPlan}`);
                if (h.breakfastIncluded) tags.push('🥐 ארוחת בוקר');

                return `
    <div class="hotel-card">
      <div class="hotel-image-col">
         <div class="hotel-icon">🏨</div>
      </div>
      <div class="hotel-body">
        <div class="hotel-header">
          <div>
            <h3 class="hotel-name">${esc(h.name)}</h3>
            ${h.city ? `<span class="hotel-city">${esc(h.city)}</span>` : ''}
          </div>
          ${h.googleMapsUrl ? `<a href="${esc(h.googleMapsUrl)}" target="_blank" class="map-btn">📍 מפה</a>` : ''}
        </div>
        ${h.address ? `<p class="hotel-address">${esc(h.address)}</p>` : ''}
        
        <div class="hotel-stay-row">
           <div class="stay-item">
              <span class="stay-lbl">צ'ק-אין</span>
              <span class="stay-val">${esc(ci)}</span>
           </div>
           <div class="stay-arrow">➝</div>
           <div class="stay-item">
              <span class="stay-lbl">צ'ק-אאוט</span>
              <span class="stay-val">${esc(co)}</span>
           </div>
           <div class="stay-badge">${nights} לילות</div>
        </div>

        ${tags.length ? `<div class="hotel-tags">${tags.map(t => `<span class="htag">${esc(t)}</span>`).join('')}</div>` : ''}
        
        ${h.confirmationCode ? `<div class="hotel-conf">קוד אישור: <strong>${esc(h.confirmationCode)}</strong></div>` : ''}
      </div>
    </div>`;
        }).join('');

        return `
    <section class="section">
      <h2 class="section-title"><span class="section-emoji">🏨</span> מלונות</h2>
      <div class="hotels-timeline">${cards}</div>
    </section>`;
};

// ── Journal Entries (Full Range) ─────────────────────────────────

const renderJournal = (itinerary: ItineraryItem[], trip: Trip, days: CalendarDay[]): string => {
        if (!days.length) return '';

        // Lookup existing itinerary items by date
        const itinByDate: Record<string, ItineraryItem> = {};
        itinerary?.forEach(i => { if (i.date) itinByDate[isoDate(i.date)] = i; });

        // Lookup flight/hotel
        const flightsOnDate = (d: string) =>
                trip.flights?.segments?.filter(s => isoDate(s.date) === d) || [];
        const hotelOnDate = (d: string) =>
                trip.hotels?.find(h => {
                        const t = isoDate(d);
                        return t >= isoDate(h.checkInDate) && t < isoDate(h.checkOutDate);
                });

        const entries = days.map((day, i) => {
                const itin = itinByDate[day.iso];
                const flights = flightsOnDate(day.iso);
                const hotel = hotelOnDate(day.iso);
                const isLast = i === days.length - 1;

                // Title logic
                let title = itin?.title || (day.hasFlight ? 'יום טיסה' : 'טיול חופשי');
                if (day.activities === 0 && !day.hasFlight && !hotel) title = 'יום חופשי';

                const flightBadges = flights.map(f =>
                        `<div class="journal-flight">
               <span class="jf-icon">✈️</span>
               <div class="jf-info">
                 <span class="jf-route">${esc(f.fromCode || '')} ➝ ${esc(f.toCode || '')}</span>
                 <span class="jf-time">${esc(fmtTime(f.departureTime))}</span>
               </div>
             </div>`
                ).join('');

                const actList = itin?.activities?.length
                        ? `<ul class="journal-activities">${itin.activities.map(a => `<li>${esc(a)}</li>`).join('')}</ul>`
                        : (!day.hasFlight ? `<div class="journal-empty">אין פעילויות מתוכננות ליום זה</div>` : '');

                return `
    <div class="journal-entry" id="day-${day.iso}">
      <div class="journal-side">
         <div class="js-dow">${day.dow}</div>
         <div class="js-num">${day.dayNum}</div>
      </div>
      <div class="journal-divider">
         <div class="jd-dot"></div>
         ${!isLast ? `<div class="jd-line"></div>` : ''}
      </div>
      <div class="journal-content">
        <div class="journal-card">
           <div class="jc-header">
              <h3 class="jc-title">${esc(title)}</h3>
              <div class="jc-date">${day.month} ${day.dayNum}, ${new Date(day.iso).getFullYear()}</div>
           </div>
           
           ${flightBadges}
           
           <div class="jc-body">
              ${actList}
              ${itin?.notes ? `<div class="journal-notes">📝 ${esc(itin.notes)}</div>` : ''}
           </div>

           ${hotel ? `<div class="journal-footer-hotel">
              <span class="jh-icon">🌙</span> לינה: <strong>${esc(hotel.name)}</strong>
           </div>` : ''}
        </div>
      </div>
    </div>`;
        }).join('');

        return `
    <section class="section">
      <h2 class="section-title"><span class="section-emoji">📖</span> יומן מסע</h2>
      <div class="journal-timeline">${entries}</div>
    </section>`;
};

// ── Restaurants ──────────────────────────────────────────────────

const renderRestaurants = (trip: Trip): string => {
        const all = trip.restaurants?.flatMap(c => c.restaurants) || [];
        const list = all.filter(r => r.isFavorite).length > 0
                ? all.filter(r => r.isFavorite) : all.slice(0, 6);
        if (!list.length) return '';

        const cards = list.map(r => `
<div class="resto-card">
  <div class="resto-header">
     <div class="resto-name">${esc(r.name)}</div>
     ${r.priceLevel ? `<div class="resto-price">${esc(r.priceLevel)}</div>` : ''}
  </div>
  ${r.cuisine ? `<div class="resto-cuisine">${esc(r.cuisine)}</div>` : ''}
  <div class="resto-loc">${esc(r.location)}</div>
  ${r.must_try_dish ? `<div class="resto-dish">🍴 מנה מומלצת: ${esc(r.must_try_dish)}</div>` : ''}
  ${r.googleMapsUrl ? `<a href="${esc(r.googleMapsUrl)}" target="_blank" class="map-link">📍 נווט</a>` : ''}
</div>`).join('');

        return `
<section class="section">
  <h2 class="section-title"><span class="section-emoji">🍴</span> קולינריה</h2>
  <div class="resto-grid">${cards}</div>
</section>`;
};

// ── Main Generator ───────────────────────────────────────────────

export const generateTripHTML = (trip: Trip): string => {
        const cover = trip.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80';
        const calendarDays = buildCalendarData(trip);

        // Calculate stats
        const totalFlights = trip.flights?.segments?.length || 0;
        const totalHotels = trip.hotels?.length || 0;
        const totalDays = calendarDays.length;
        const genDate = new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });

        return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(trip.name)} — יומן מסע</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
/*═══════════════════════════════════════════════════════════════
  Travel Journal v3 — Premium Redesign
═══════════════════════════════════════════════════════════════*/
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --font: 'Rubik',-apple-system,sans-serif;
  --bg: #f8fafc;
  --card: #ffffff;
  --text: #0f172a;
  --text-muted: #64748b;
  --text-light: #94a3b8;
  --border: #e2e8f0;
  --primary: #2563eb;
  --primary-dark: #1e40af;
  --accent: #f59e0b;
  --danger: #ef4444;
  --success: #10b981;
  
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  
  --r: 16px;
}

body{
  font-family:var(--font);
  background:var(--bg);
  color:var(--text);
  line-height:1.5;
  -webkit-font-smoothing:antialiased;
  padding-bottom:100px;
}

a{color:var(--primary);text-decoration:none}

/* ═══ HERO ═══ */
.hero{
  position:relative;
  height:350px; /* Reduced height as requested */
  display:flex;
  align-items:flex-end;
  overflow:hidden;
  border-bottom:1px solid rgba(0,0,0,0.1);
}

.hero-bg{
  position:absolute;inset:0;
  background-size:cover;background-position:center;
  filter:brightness(0.65);
  animation:pan 40s ease-in-out infinite alternate;
}
@keyframes pan{from{transform:scale(1)}to{transform:scale(1.1)}}

.hero-overlay{
  position:absolute;inset:0;
  background:linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%);
}

.hero-content{
  position:relative;z-index:2;
  width:100%;max-width:800px;margin:0 auto;
  padding:0 24px 32px;
  color:white;
}

.hero h1{
  font-size:clamp(32px, 5vw, 48px);
  font-weight:800;
  line-height:1.1;
  margin-bottom:8px;
  text-shadow:0 2px 10px rgba(0,0,0,0.3);
}

.hero-meta{
  display:flex;gap:12px;font-size:16px;font-weight:500;opacity:0.9;
  align-items:center;
}

/* ═══ STATS BAR ═══ */
.stats-bar{
  max-width:800px;margin:-24px auto 32px;
  position:relative;z-index:10;
  display:flex;gap:12px;padding:0 20px;
  flex-wrap:wrap;
  justify-content:center;
}
.stat-pill{
  background:white;padding:10px 16px;
  border-radius:100px;
  display:flex;align-items:center;gap:8px;
  box-shadow:var(--shadow-lg);
  font-size:14px;font-weight:700;color:var(--text);
}

/* ═══ CALENDAR STRIP ═══ */
.calendar-section{
  max-width:800px;margin:0 auto 40px;
  padding:0 20px;
}
.cal-strip{
  display:flex;gap:6px;overflow-x:auto;padding:4px;
  scrollbar-width:none;
}
.cal-strip::-webkit-scrollbar{display:none}

.cal-day{
  flex-shrink:0;width:56px;height:72px;
  background:white;border:1px solid var(--border);
  border-radius:12px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  box-shadow:var(--shadow-sm);
  transition:all 0.2s;
  cursor:pointer;position:relative;
  text-decoration:none; color:inherit;
}
.cal-day:hover{transform:translateY(-2px);border-color:var(--primary)}
.cal-day.is-today{border:2px solid var(--primary);background:#eff6ff}
.cal-day.has-flight{background:#fdf4ff;border-color:#fae8ff}
.cal-day.has-hotel{background:#f0fdf4;border-color:#dcfce7}

.cal-dow{font-size:11px;font-weight:500;color:var(--text-muted)}
.cal-num{font-size:18px;font-weight:800;line-height:1.2}
.cal-month{font-size:9px;font-weight:600;color:var(--primary);text-transform:uppercase}
.cal-icons{font-size:10px;margin-top:2px}
.cal-hotel-dot{
  position:absolute;bottom:4px;width:4px;height:4px;border-radius:50%;
  background:var(--success);
}

/* ═══ SECTIONS ═══ */
.section{max-width:800px;margin:0 auto 48px;padding:0 20px}
.section-title{
  font-size:22px;font-weight:800;margin-bottom:20px;
  display:flex;align-items:center;gap:10px;
  color:var(--text);
}

/* ═══ BOARDING PASS ═══ */
.boarding-passes{display:flex;flex-direction:column;gap:16px}
.boarding-pass{
  background:white;border-radius:16px;overflow:hidden;
  box-shadow:var(--shadow);position:relative;
  border:1px solid var(--border);
}
.bp-main{padding:20px}
.bp-header{display:flex;justify-content:space-between;margin-bottom:20px;border-bottom:1px dashed var(--border);padding-bottom:12px}
.bp-airline-name{font-weight:700;font-size:14px;text-transform:uppercase}
.bp-flight-num{background:var(--bg);padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;margin-right:8px}
.bp-date{font-size:13px;color:var(--text-muted);font-weight:500}

.bp-route{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
.bp-city{text-align:center;flex:1}
.bp-code{font-size:32px;font-weight:900;line-height:1}
.bp-time{font-size:18px;font-weight:700;color:var(--primary);margin-top:4px}
.bp-city-name{font-size:12px;color:var(--text-muted)}

.bp-flight-path{flex:1;display:flex;flex-direction:column;align-items:center;padding:0 10px}
.bp-path-line{width:100%;height:2px;background:var(--border);position:relative;margin:8px 0}
.bp-path-line::after{content:'✈';position:absolute;top:-10px;left:50%;transform:translateX(-50%) rotate(90deg);font-size:14px;color:var(--text-light)}

.bp-details-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;background:var(--bg);padding:12px;border-radius:12px}
.bp-det{text-align:center}
.bp-lbl{display:block;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase}
.bp-val{font-size:14px;font-weight:700}

/* ═══ HOTEL CARDS ═══ */
.hotels-timeline{display:flex;flex-direction:column;gap:16px}
.hotel-card{
  background:white;border-radius:16px;overflow:hidden;
  box-shadow:var(--shadow);border:1px solid var(--border);
  display:flex;
}
.hotel-image-col{
  width:80px;background:var(--bg);display:flex;align-items:center;justify-content:center;
  font-size:32px;border-left:1px solid var(--border);
}
.hotel-body{padding:20px;flex:1}
.hotel-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px}
.hotel-name{font-size:18px;font-weight:800;line-height:1.2}
.map-btn{font-size:12px;font-weight:700;color:var(--primary);background:#eff6ff;padding:4px 10px;border-radius:6px}
.hotel-city{font-size:13px;font-weight:600;color:var(--primary)}
.hotel-address{font-size:13px;color:var(--text-muted);margin-bottom:16px}

.hotel-stay-row{
  display:flex;align-items:center;gap:12px;
  background:var(--bg);padding:10px 16px;border-radius:10px;
  margin-bottom:12px;
}
.stay-item{display:flex;flex-direction:column}
.stay-lbl{font-size:10px;font-weight:600;color:var(--text-muted)}
.stay-val{font-size:14px;font-weight:700}
.stay-arrow{font-size:18px;color:var(--text-light)}
.stay-badge{margin-right:auto;font-size:12px;font-weight:700;background:white;padding:4px 10px;border-radius:100px;box-shadow:var(--shadow-sm)}

.hotel-tags{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.htag{font-size:11px;font-weight:600;background:#f1f5f9;padding:4px 8px;border-radius:6px;color:var(--text-muted)}
.hotel-conf{font-size:12px;background:#fffbeb;padding:6px 10px;border-radius:6px;display:inline-block;color:#b45309}

/* ═══ JOURNAL TIMELINE ═══ */
.journal-entry{display:flex;gap:16px;margin-bottom:24px;scroll-margin-top:100px}
.journal-side{
  width:50px;text-align:center;flex-shrink:0;
  display:flex;flex-direction:column;align-items:center;
}
.js-dow{font-size:12px;font-weight:500;color:var(--text-muted)}
.js-num{font-size:24px;font-weight:800;line-height:1}

.journal-divider{display:flex;flex-direction:column;align-items:center;width:20px;flex-shrink:0;position:relative}
.jd-dot{width:12px;height:12px;border-radius:50%;background:var(--border);border:2px solid white;box-shadow:0 0 0 2px var(--border);margin-top:10px;z-index:2}
.jd-line{width:2px;background:var(--border);flex:1;margin-top:-2px}
.is-today .jd-dot{background:var(--primary);box-shadow:0 0 0 2px var(--primary)}

.journal-content{flex:1}
.journal-card{
  background:white;border-radius:16px;border:1px solid var(--border);
  box-shadow:var(--shadow-sm);overflow:hidden;
}
.jc-header{
  padding:12px 16px;background:var(--bg);border-bottom:1px solid var(--border);
  display:flex;justify-content:space-between;align-items:center;
}
.jc-title{font-size:16px;font-weight:800}
.jc-date{font-size:12px;font-weight:600;color:var(--text-muted)}

.journal-flight{
  background:#eff6ff;padding:10px 16px;display:flex;align-items:center;gap:10px;
  border-bottom:1px solid var(--border);
}
.jf-icon{font-size:16px}
.jf-info{display:flex;flex-direction:column}
.jf-route{font-size:13px;font-weight:700;color:var(--primary-dark)}
.jf-time{font-size:11px;color:var(--primary)}

.jc-body{padding:16px}
.journal-activities{list-style:none}
.journal-activities li{
  position:relative;padding-right:16px;margin-bottom:6px;font-size:15px;
}
.journal-activities li::before{
  content:'•';color:var(--accent);font-weight:bold;position:absolute;right:0;
}
.journal-empty{font-size:13px;color:var(--text-light);font-style:italic;text-align:center}
.journal-notes{
  margin-top:12px;padding-top:12px;border-top:1px dashed var(--border);
  font-size:13px;color:var(--text-muted);
}

.journal-footer-hotel{
  background:#f0fdf4;padding:8px 16px;font-size:13px;color:#166534;
  border-top:1px solid #dcfce7;display:flex;align-items:center;gap:6px;
}

/* ═══ RESTAURANTS ═══ */
.resto-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}
.resto-card{
  background:white;padding:16px;border-radius:16px;
  border:1px solid var(--border);box-shadow:var(--shadow-sm);
}
.resto-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.resto-name{font-weight:700;font-size:15px}
.resto-price{font-size:12px;color:var(--text-light)}
.resto-cuisine{font-size:12px;color:var(--text-muted);margin-bottom:8px;background:var(--bg);display:inline-block;padding:2px 8px;border-radius:4px}
.resto-loc{font-size:12px;color:var(--text-light);margin-bottom:8px}
.resto-dish{font-size:12px;font-weight:600;color:var(--accent)}

/* ═══ PRINT ═══ */
@media print {
  .hero{height:200px}
  .boarding-pass,.hotel-card,.journal-entry{break-inside:avoid}
  .cal-strip{flex-wrap:wrap}
}
</style>
</head>
<body>

<header class="hero">
  <div class="hero-bg" style="background-image:url('${cover}')"></div>
  <div class="hero-overlay"></div>
  <div class="hero-content">
     <h1>${esc(trip.name)}</h1>
     <div class="hero-meta">
        <span>📍 ${esc(trip.destination)}</span>
        <span>•</span>
        <span>${calendarDays.length} ימים</span>
     </div>
  </div>
</header>

<div class="stats-bar">
   <div class="stat-pill">✈️ ${totalFlights} טיסות</div>
   <div class="stat-pill">🏨 ${totalHotels} מלונות</div>
   <div class="stat-pill">📅 ${totalDays} ימים</div>
</div>

${renderCalendarStrip(calendarDays)}
${renderBoardingPasses(trip.flights)}
${renderHotelTimeline(trip.hotels)}
${renderJournal(trip.itinerary, trip, calendarDays)}
${renderRestaurants(trip)}

<div class="section" style="text-align:center;margin-top:60px;color:var(--text-light);font-size:12px;">
  נוצר ע״י Travel Planner Pro • ${genDate}
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
