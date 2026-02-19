import { Trip, FlightSegment, HotelBooking, ItineraryItem } from '../types';

/**
 * Generates a premium travel-journal HTML page.
 * Features:
 *   1. Hero with animated gradient + trip cover
 *   2. Calendar strip showing every day of the trip with icons
 *   3. Boarding-pass style flight cards
 *   4. Hotel stay timeline with visual bars
 *   5. Day-by-day journal entries
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

const fmtTime = (t: string): string => {
        if (!t) return '';
        if (/^\d{1,2}:\d{2}$/.test(t)) return t;
        try {
                const dt = new Date(t);
                if (isNaN(dt.getTime())) return t;
                return dt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch { return t; }
};

const daysBetween = (a: string, b: string): number => {
        try {
                return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
        } catch { return 0; }
};

const isoDate = (d: string): string => {
        try { return new Date(d).toISOString().split('T')[0]; } catch { return ''; }
};

// Day-of-week short names in Hebrew
const DOW_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

// ── Calendar Strip ───────────────────────────────────────────────

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
        // Determine date range
        let startDate = '', endDate = '';

        // Try from dates string
        if (trip.dates) {
                const parts = trip.dates.split(/\s*[-–]\s*/);
                if (parts.length === 2) {
                        const s = new Date(parts[0].trim());
                        const e = new Date(parts[1].trim());
                        if (!isNaN(s.getTime())) startDate = s.toISOString().split('T')[0];
                        if (!isNaN(e.getTime())) endDate = e.toISOString().split('T')[0];
                }
        }

        // Fallback to flights
        if (!startDate && trip.flights?.segments?.length) {
                const sorted = [...trip.flights.segments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                startDate = isoDate(sorted[0].date);
                endDate = isoDate(sorted[sorted.length - 1].date);
        }

        // Fallback to itinerary
        if (!startDate && trip.itinerary?.length) {
                startDate = isoDate(trip.itinerary[0].date);
                endDate = isoDate(trip.itinerary[trip.itinerary.length - 1].date);
        }

        if (!startDate || !endDate) return [];

        const start = new Date(startDate);
        const end = new Date(endDate);
        const total = daysBetween(startDate, endDate) + 1;
        if (total <= 0 || total > 60) return [];

        // Index flights by date
        const flightDates = new Set(
                trip.flights?.segments?.map(s => isoDate(s.date)).filter(Boolean) || []
        );

        // Index hotels by date range
        const hotelByDate: Record<string, { name: string; isCheckIn: boolean; isCheckOut: boolean }> = {};
        trip.hotels?.forEach(h => {
                if (!h.checkInDate || !h.checkOutDate) return;
                const ci = isoDate(h.checkInDate);
                const co = isoDate(h.checkOutDate);
                const nights = daysBetween(ci, co);
                for (let i = 0; i <= nights; i++) {
                        const d = new Date(ci);
                        d.setDate(d.getDate() + i);
                        const iso = d.toISOString().split('T')[0];
                        hotelByDate[iso] = {
                                name: h.name,
                                isCheckIn: i === 0,
                                isCheckOut: i === nights
                        };
                }
        });

        // Index itinerary activities by date
        const actByDate: Record<string, number> = {};
        trip.itinerary?.forEach(day => {
                const d = isoDate(day.date);
                if (d) actByDate[d] = (day.activities?.length || 0);
        });

        const today = new Date().toISOString().split('T')[0];
        const days: CalendarDay[] = [];

        for (let i = 0; i < total; i++) {
                const d = new Date(start);
                d.setDate(d.getDate() + i);
                const iso = d.toISOString().split('T')[0];
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
                if (d.isCheckIn) icons.push('🏨');
                if (d.isCheckOut) icons.push('🚪');
                if (d.activities > 0) icons.push(`📍${d.activities}`);

                return `
      <div class="${classes}">
        <div class="cal-dow">${d.dow}</div>
        <div class="cal-num">${d.dayNum}</div>
        <div class="cal-month">${i === 0 || d.dayNum === 1 ? d.month : ''}</div>
        <div class="cal-icons">${icons.join(' ')}</div>
        ${d.hotelName ? `<div class="cal-hotel" title="${esc(d.hotelName)}">${d.isCheckIn ? '↓' : d.isCheckOut ? '↑' : '·'}</div>` : ''}
      </div>
    `;
        }).join('');

        return `
    <section class="calendar-section">
      <h2 class="cal-title">📅 לוח מסע</h2>
      <div class="cal-strip">${cells}</div>
      <div class="cal-legend">
        <span>✈️ טיסה</span>
        <span>🏨 צ'ק-אין</span>
        <span>🚪 צ'ק-אאוט</span>
        <span>📍 פעילויות</span>
      </div>
    </section>
  `;
};

// ── Boarding Pass Cards ──────────────────────────────────────────

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
        <div class="bp-airline">
          <span class="bp-airline-name">${esc(seg.airline || 'טיסה')}</span>
          <span class="bp-flight-num">${esc(seg.flightNumber || '')}</span>
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
        <div class="bp-date">${esc(date)}</div>
      </div>
      <div class="bp-stub">
        <div class="bp-stub-inner">
          ${seg.terminal ? `<div class="bp-info"><span class="bp-label">Terminal</span><span class="bp-val">${esc(seg.terminal)}</span></div>` : ''}
          ${seg.gate ? `<div class="bp-info"><span class="bp-label">Gate</span><span class="bp-val">${esc(seg.gate)}</span></div>` : ''}
          ${seg.seat ? `<div class="bp-info"><span class="bp-label">Seat</span><span class="bp-val">${esc(seg.seat)}</span></div>` : ''}
          ${seg.class ? `<div class="bp-info"><span class="bp-label">Class</span><span class="bp-val">${esc(seg.class)}</span></div>` : ''}
          ${seg.baggage ? `<div class="bp-info"><span class="bp-label">Baggage</span><span class="bp-val">${esc(seg.baggage)}</span></div>` : ''}
          ${seg.mealPlan ? `<div class="bp-info"><span class="bp-label">Meal</span><span class="bp-val">${esc(seg.mealPlan)}</span></div>` : ''}
        </div>
        <div class="bp-barcode">
          <div class="bp-barcode-lines"></div>
        </div>
      </div>
    </div>`;
        }).join('');

        const pnr = flights.pnr ? `<div class="pnr-block"><span class="pnr-label">קוד הזמנה (PNR)</span><span class="pnr-value">${esc(flights.pnr)}</span></div>` : '';
        const passengers = flights.passengers?.length
                ? `<div class="passengers-block">👥 ${flights.passengers.map(esc).join(' · ')}</div>` : '';

        return `
    <section class="section">
      <h2 class="section-title"><span class="section-emoji">✈️</span> טיסות</h2>
      ${passengers}${pnr}
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
                if (h.roomView) tags.push(`🌅 ${h.roomView}`);

                return `
    <div class="hotel-card">
      <div class="hotel-color-bar"></div>
      <div class="hotel-body">
        <div class="hotel-header">
          <h3 class="hotel-name">${esc(h.name)}</h3>
          ${h.city ? `<span class="hotel-city">${esc(h.city)}</span>` : ''}
        </div>
        ${h.address ? `<p class="hotel-address">📍 ${esc(h.address)}</p>` : ''}
        <div class="hotel-stay">
          <div class="stay-block">
            <div class="stay-label">צ'ק-אין</div>
            <div class="stay-date">${esc(ci)}</div>
          </div>
          <div class="stay-nights">
            <div class="stay-nights-num">${nights}</div>
            <div class="stay-nights-label">לילות</div>
          </div>
          <div class="stay-block">
            <div class="stay-label">צ'ק-אאוט</div>
            <div class="stay-date">${esc(co)}</div>
          </div>
        </div>
        ${tags.length ? `<div class="hotel-tags">${tags.map(t => `<span class="htag">${esc(t)}</span>`).join('')}</div>` : ''}
        ${h.confirmationCode ? `<div class="hotel-conf">📋 קוד אישור: <strong>${esc(h.confirmationCode)}</strong></div>` : ''}
        ${h.checkInInstructions ? `<div class="hotel-instructions">📌 ${esc(h.checkInInstructions)}</div>` : ''}
        <div class="hotel-actions">
          ${h.googleMapsUrl ? `<a href="${esc(h.googleMapsUrl)}" target="_blank" class="action-link">📍 מפה</a>` : ''}
          ${h.bookingSource ? `<span class="booking-source">${esc(h.bookingSource)}</span>` : ''}
        </div>
      </div>
    </div>`;
        }).join('');

        return `
    <section class="section">
      <h2 class="section-title"><span class="section-emoji">🏨</span> מלונות</h2>
      <div class="hotels-timeline">${cards}</div>
    </section>`;
};

// ── Journal Entries ──────────────────────────────────────────────

const renderJournal = (itinerary: ItineraryItem[], trip: Trip): string => {
        if (!itinerary?.length) return '';

        // Build a lookup for hotels active on each date
        const hotelOnDate = (dateStr: string): HotelBooking | undefined => {
                const d = isoDate(dateStr);
                return trip.hotels?.find(h => {
                        const ci = isoDate(h.checkInDate);
                        const co = isoDate(h.checkOutDate);
                        return d >= ci && d < co;
                });
        };

        // Build a lookup for flights on each date
        const flightsOnDate = (dateStr: string): FlightSegment[] => {
                const d = isoDate(dateStr);
                return trip.flights?.segments?.filter(s => isoDate(s.date) === d) || [];
        };

        const entries = itinerary.map((day, i) => {
                const date = fmtDateFull(day.date);
                const hotel = hotelOnDate(day.date);
                const flights = flightsOnDate(day.date);

                const flightBadges = flights.map(f =>
                        `<div class="journal-flight">✈️ ${esc(f.fromCode || '')} → ${esc(f.toCode || '')} <span class="jf-time">${esc(fmtTime(f.departureTime))}</span></div>`
                ).join('');

                const actList = day.activities?.length
                        ? `<ul class="journal-activities">${day.activities.map(a => `<li>${esc(a)}</li>`).join('')}</ul>`
                        : '';

                return `
    <div class="journal-entry">
      <div class="journal-marker">
        <div class="journal-dot"></div>
        ${i < itinerary.length - 1 ? '<div class="journal-line"></div>' : ''}
      </div>
      <div class="journal-content">
        <div class="journal-day-num">יום ${day.day}</div>
        <div class="journal-date">${esc(date)}</div>
        <h3 class="journal-title">${esc(day.title)}</h3>
        ${flightBadges}
        ${hotel ? `<div class="journal-hotel">🏨 ${esc(hotel.name)}</div>` : ''}
        ${actList}
        ${day.notes ? `<div class="journal-notes">${esc(day.notes)}</div>` : ''}
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
      <div class="resto-name">${esc(r.name)}</div>
      ${r.cuisine ? `<div class="resto-cuisine">${esc(r.cuisine)}</div>` : ''}
      <div class="resto-loc">${esc(r.location)}</div>
      ${r.priceLevel ? `<div class="resto-price">${esc(r.priceLevel)}</div>` : ''}
      ${r.must_try_dish ? `<div class="resto-dish">🍴 ${esc(r.must_try_dish)}</div>` : ''}
      ${r.googleMapsUrl ? `<a href="${esc(r.googleMapsUrl)}" target="_blank" class="map-link">📍 מפה</a>` : ''}
    </div>`).join('');

        return `
    <section class="section">
      <h2 class="section-title"><span class="section-emoji">🍴</span> מסעדות מומלצות</h2>
      <div class="resto-grid">${cards}</div>
    </section>`;
};

// ── Main Generator ───────────────────────────────────────────────

export const generateTripHTML = (trip: Trip): string => {
        const cover = trip.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80';
        const calendarDays = buildCalendarData(trip);
        const genDate = new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });

        return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(trip.name)} — יומן מסע</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+Hebrew:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
/*═══════════════════════════════════════════════════════════════
  Travel Journal — Premium Self-Contained Styles
═══════════════════════════════════════════════════════════════*/
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root{
  --font: 'Noto Sans Hebrew','Inter',-apple-system,sans-serif;
  --bg: #fafbfc;
  --card: #ffffff;
  --text: #111827;
  --text2: #4b5563;
  --text3: #9ca3af;
  --border: #e5e7eb;
  --border2: #f3f4f6;
  --blue: #2563eb;
  --indigo: #4f46e5;
  --purple: #7c3aed;
  --emerald: #059669;
  --orange: #ea580c;
  --rose: #e11d48;
  --sky: #0284c7;
  --r-sm: 10px;
  --r-md: 14px;
  --r-lg: 20px;
  --r-xl: 28px;
  --shadow-s: 0 1px 3px rgba(0,0,0,.04),0 1px 2px rgba(0,0,0,.06);
  --shadow-m: 0 4px 16px rgba(0,0,0,.07);
  --shadow-l: 0 12px 40px rgba(0,0,0,.1);
}

body{
  font-family:var(--font);
  background:var(--bg);
  color:var(--text);
  line-height:1.65;
  -webkit-font-smoothing:antialiased;
}

/* ═══ HERO ═══ */
.hero{
  position:relative;
  min-height:480px;
  display:flex;
  align-items:flex-end;
  overflow:hidden;
}

.hero-bg{
  position:absolute;inset:0;
  background-size:cover;background-position:center;
  filter:brightness(.6) saturate(1.1);
  animation:heroPan 30s ease-in-out infinite alternate;
}

@keyframes heroPan{
  0%{transform:scale(1) translate(0,0)}
  100%{transform:scale(1.08) translate(-2%,1%)}
}

.hero::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(to top,rgba(0,0,0,.85) 0%,rgba(0,0,0,.2) 60%,transparent 100%);
}

.hero-inner{
  position:relative;z-index:2;
  width:100%;max-width:960px;margin:0 auto;
  padding:60px 28px 44px;
}

.hero-chip{
  display:inline-flex;align-items:center;gap:6px;
  background:rgba(255,255,255,.12);
  backdrop-filter:blur(16px);
  border:1px solid rgba(255,255,255,.18);
  padding:7px 16px;border-radius:100px;
  font-size:13px;font-weight:700;
  color:rgba(255,255,255,.9);
  margin-bottom:20px;
}

.hero h1{
  font-size:clamp(36px,7vw,64px);
  font-weight:900;color:#fff;
  letter-spacing:-.03em;line-height:1.08;
  margin-bottom:10px;
  text-shadow:0 2px 20px rgba(0,0,0,.3);
}

.hero-dest{font-size:clamp(16px,3vw,24px);color:rgba(255,255,255,.75);font-weight:600;margin-bottom:6px}
.hero-dates{font-size:15px;color:rgba(255,255,255,.5);font-weight:500}

.hero-stats{
  display:flex;gap:12px;flex-wrap:wrap;margin-top:28px;
}
.hero-stat{
  display:flex;align-items:center;gap:8px;
  background:rgba(255,255,255,.1);
  backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,.12);
  padding:10px 18px;border-radius:var(--r-md);
  font-size:14px;font-weight:700;color:rgba(255,255,255,.9);
}

/* ═══ CALENDAR STRIP ═══ */
.calendar-section{
  max-width:960px;margin:-30px auto 0;position:relative;z-index:5;
  padding:0 24px;
}

.cal-title{
  font-size:18px;font-weight:800;color:#fff;
  margin-bottom:14px;text-shadow:0 1px 8px rgba(0,0,0,.3);
}

.cal-strip{
  display:flex;gap:4px;overflow-x:auto;
  padding:16px 20px;
  background:var(--card);
  border-radius:var(--r-lg);
  box-shadow:var(--shadow-l);
  scrollbar-width:thin;
  border:1px solid var(--border);
}

.cal-strip::-webkit-scrollbar{height:6px}
.cal-strip::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:8px}

.cal-day{
  display:flex;flex-direction:column;align-items:center;
  min-width:52px;padding:10px 6px;
  border-radius:var(--r-sm);
  transition:all .15s;
  cursor:default;
  position:relative;
}

.cal-day:hover{background:#f1f5f9}
.cal-day.is-today{background:#eff6ff;border:2px solid var(--blue)}
.cal-day.has-flight{background:#fef3c7}
.cal-day.check-in{border-bottom:3px solid var(--indigo)}
.cal-day.check-out{border-bottom:3px solid var(--rose)}

.cal-dow{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em}
.cal-num{font-size:22px;font-weight:900;color:var(--text);margin:2px 0}
.cal-month{font-size:10px;color:var(--text3);font-weight:600;min-height:14px}
.cal-icons{font-size:11px;margin-top:4px;min-height:16px}
.cal-hotel{font-size:14px;color:var(--indigo);font-weight:800}

.cal-legend{
  display:flex;gap:16px;justify-content:center;
  margin-top:12px;font-size:12px;color:var(--text3);font-weight:600;
}

/* ═══ CONTAINER ═══ */
.container{max-width:960px;margin:0 auto;padding:40px 24px 80px}

/* ═══ SECTIONS ═══ */
.section{margin-bottom:48px}
.section-title{
  font-size:24px;font-weight:900;
  display:flex;align-items:center;gap:10px;
  margin-bottom:24px;letter-spacing:-.01em;
}
.section-emoji{font-size:28px}

/* ═══ PNR & PASSENGERS ═══ */
.pnr-block{
  display:inline-flex;align-items:center;gap:10px;
  background:var(--card);border:1px solid var(--border);
  border-radius:var(--r-md);padding:10px 20px;
  margin-bottom:12px;box-shadow:var(--shadow-s);
}
.pnr-label{font-size:13px;color:var(--text3);font-weight:600}
.pnr-value{
  font-family:'Inter',monospace;font-size:18px;font-weight:900;
  background:#f1f5f9;padding:4px 14px;border-radius:8px;
  letter-spacing:.12em;color:var(--text);
}

.passengers-block{
  font-size:15px;font-weight:600;color:var(--text2);
  margin-bottom:12px;
}

/* ═══ BOARDING PASS ═══ */
.boarding-passes{display:flex;flex-direction:column;gap:16px}

.boarding-pass{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:var(--r-lg);
  display:flex;
  box-shadow:var(--shadow-m);
  overflow:hidden;
  position:relative;
  transition:transform .2s,box-shadow .2s;
}

.boarding-pass:hover{transform:translateY(-2px);box-shadow:var(--shadow-l)}

/* Tear-off dots */
.bp-tear-left,.bp-tear-right{
  position:absolute;top:50%;
  transform:translateY(-50%);
  width:20px;height:20px;
  background:var(--bg);
  border-radius:50%;
  z-index:3;
}
.bp-tear-left{right:-10px}
.bp-tear-right{left:-10px}

.bp-main{flex:1;padding:28px 32px;position:relative}

.bp-airline{
  display:flex;align-items:center;gap:10px;
  margin-bottom:24px;
}
.bp-airline-name{
  font-size:14px;font-weight:800;color:var(--text);
  text-transform:uppercase;letter-spacing:.04em;
}
.bp-flight-num{
  font-size:13px;font-weight:700;color:#fff;
  background:linear-gradient(135deg,var(--blue),var(--indigo));
  padding:3px 12px;border-radius:100px;
}

.bp-route{
  display:flex;align-items:center;gap:16px;
}
.bp-city{text-align:center;flex:1}
.bp-code{font-size:38px;font-weight:900;letter-spacing:-.02em}
.bp-city-name{font-size:13px;color:var(--text2);font-weight:500;margin-top:2px}
.bp-time{font-size:18px;font-weight:800;color:var(--blue);margin-top:8px}

.bp-flight-path{
  flex:1.5;display:flex;flex-direction:column;align-items:center;
  gap:2px;position:relative;
}
.bp-path-line{
  width:100%;height:2px;
  background:linear-gradient(90deg,var(--blue),var(--indigo));
  border-radius:2px;position:relative;
}
.bp-path-line::before,.bp-path-line::after{
  content:'';position:absolute;
  width:10px;height:10px;border-radius:50%;
  top:50%;transform:translateY(-50%);
}
.bp-path-line::before{right:-2px;background:var(--indigo)}
.bp-path-line::after{left:-2px;background:var(--blue)}

.bp-plane{
  font-size:22px;margin-top:-14px;
  background:var(--card);padding:0 4px;
  transform:scaleX(-1);
}
.bp-duration{font-size:12px;color:var(--text3);font-weight:600}
.bp-date{font-size:14px;color:var(--text2);font-weight:600;margin-top:20px;text-align:center}

.bp-stub{
  width:180px;
  border-right:2px dashed var(--border);
  padding:20px;
  display:flex;flex-direction:column;
  justify-content:space-between;
  background:#fafbfc;
}
.bp-stub-inner{display:flex;flex-direction:column;gap:8px}
.bp-info{display:flex;justify-content:space-between;align-items:center}
.bp-label{font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em}
.bp-val{font-size:13px;font-weight:800;color:var(--text)}

.bp-barcode{margin-top:auto;padding-top:12px}
.bp-barcode-lines{
  height:30px;
  background:repeating-linear-gradient(
    90deg,
    var(--text) 0px,var(--text) 2px,
    transparent 2px,transparent 5px,
    var(--text) 5px,var(--text) 6px,
    transparent 6px,transparent 9px,
    var(--text) 9px,var(--text) 11px,
    transparent 11px,transparent 13px
  );
  opacity:.15;border-radius:2px;
}

/* ═══ HOTELS ═══ */
.hotels-timeline{display:flex;flex-direction:column;gap:16px}

.hotel-card{
  display:flex;
  background:var(--card);
  border:1px solid var(--border);
  border-radius:var(--r-lg);
  overflow:hidden;
  box-shadow:var(--shadow-s);
  transition:transform .2s,box-shadow .2s;
}
.hotel-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-m)}

.hotel-color-bar{width:6px;background:linear-gradient(180deg,var(--indigo),var(--purple));flex-shrink:0}
.hotel-body{flex:1;padding:24px 28px}

.hotel-header{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:4px}
.hotel-name{font-size:20px;font-weight:800}
.hotel-city{font-size:14px;color:var(--indigo);font-weight:600}
.hotel-address{font-size:13px;color:var(--text3);margin-bottom:16px}

.hotel-stay{
  display:flex;align-items:center;gap:16px;
  background:#f8fafc;border:1px solid var(--border2);
  border-radius:var(--r-md);padding:16px 20px;
  margin-bottom:14px;
}
.stay-block{flex:1;text-align:center}
.stay-label{font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px}
.stay-date{font-size:14px;font-weight:700}
.stay-nights{
  text-align:center;flex-shrink:0;
  background:linear-gradient(135deg,var(--indigo),var(--purple));
  color:#fff;border-radius:var(--r-md);
  padding:8px 16px;
}
.stay-nights-num{font-size:24px;font-weight:900;line-height:1}
.stay-nights-label{font-size:10px;font-weight:700;opacity:.8;letter-spacing:.06em}

.hotel-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
.htag{
  font-size:12px;font-weight:600;
  padding:4px 10px;border-radius:100px;
  background:#f1f5f9;color:var(--text2);
  border:1px solid var(--border);
}

.hotel-conf{
  font-size:13px;color:var(--text2);
  background:#fffbeb;border:1px solid #fde68a;
  border-radius:var(--r-sm);padding:8px 14px;
  margin-bottom:8px;
}
.hotel-instructions{
  font-size:13px;color:var(--text2);
  background:#f0fdf4;border:1px solid #bbf7d0;
  border-radius:var(--r-sm);padding:8px 14px;
  margin-bottom:8px;
}

.hotel-actions{display:flex;align-items:center;gap:12px;margin-top:8px}
.action-link,.map-link{
  font-size:13px;font-weight:700;color:var(--blue);
  text-decoration:none;
}
.action-link:hover,.map-link:hover{text-decoration:underline}
.booking-source{font-size:12px;font-weight:600;color:var(--text3)}

/* ═══ JOURNAL ═══ */
.journal-timeline{position:relative;padding-right:20px}

.journal-entry{
  display:flex;gap:20px;
  margin-bottom:0;
}

.journal-marker{
  display:flex;flex-direction:column;align-items:center;
  flex-shrink:0;width:20px;
  padding-top:6px;
}
.journal-dot{
  width:14px;height:14px;border-radius:50%;
  background:linear-gradient(135deg,var(--emerald),var(--sky));
  box-shadow:0 0 0 4px rgba(5,150,105,.15);
  flex-shrink:0;
}
.journal-line{
  width:2px;flex:1;min-height:20px;
  background:linear-gradient(180deg,var(--emerald),var(--border));
  margin-top:4px;
}

.journal-content{
  flex:1;
  background:var(--card);
  border:1px solid var(--border);
  border-radius:var(--r-lg);
  padding:20px 24px;
  margin-bottom:16px;
  box-shadow:var(--shadow-s);
  transition:box-shadow .2s;
}
.journal-content:hover{box-shadow:var(--shadow-m)}

.journal-day-num{
  font-size:11px;font-weight:800;
  color:var(--emerald);
  text-transform:uppercase;letter-spacing:.1em;
}
.journal-date{font-size:13px;color:var(--text3);font-weight:500;margin-bottom:4px}
.journal-title{font-size:18px;font-weight:800;margin-bottom:10px}

.journal-flight{
  display:inline-flex;align-items:center;gap:6px;
  background:#eff6ff;border:1px solid #bfdbfe;
  border-radius:100px;padding:5px 14px;
  font-size:13px;font-weight:700;color:var(--blue);
  margin-bottom:8px;margin-left:6px;
}
.jf-time{font-weight:800}

.journal-hotel{
  font-size:13px;font-weight:600;color:var(--indigo);
  margin-bottom:8px;
}

.journal-activities{
  list-style:none;padding:0;
}
.journal-activities li{
  position:relative;padding:5px 0 5px 18px;
  font-size:14px;color:var(--text2);
}
.journal-activities li::before{
  content:'';position:absolute;right:0;top:13px;
  width:6px;height:6px;border-radius:50%;
  background:var(--emerald);
}

.journal-notes{
  font-size:13px;color:var(--text2);
  background:#f8fafc;border-radius:var(--r-sm);
  padding:10px 14px;margin-top:8px;
  font-style:italic;
}

/* ═══ RESTAURANTS ═══ */
.resto-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(240px,1fr));
  gap:12px;
}
.resto-card{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:var(--r-lg);
  padding:20px;box-shadow:var(--shadow-s);
  transition:transform .2s,box-shadow .2s;
}
.resto-card:hover{transform:translateY(-2px);box-shadow:var(--shadow-m)}
.resto-name{font-size:16px;font-weight:800;margin-bottom:4px}
.resto-cuisine{font-size:12px;color:var(--orange);font-weight:700;margin-bottom:4px}
.resto-loc{font-size:12px;color:var(--text3);margin-bottom:6px}
.resto-price{font-size:14px;font-weight:700;color:var(--emerald);margin-bottom:4px}
.resto-dish{font-size:13px;color:var(--text2);margin-bottom:6px}

/* ═══ FOOTER ═══ */
.footer{
  text-align:center;padding:32px 20px;
  border-top:1px solid var(--border);
  color:var(--text3);font-size:13px;
}
.footer-logo{font-weight:900;font-size:15px;color:var(--text2);margin-bottom:4px}

/* ═══ RESPONSIVE ═══ */
@media(max-width:700px){
  .hero{min-height:360px}
  .hero-inner{padding:36px 16px 32px}
  .container{padding:28px 16px 60px}
  .bp-stub{display:none}
  .bp-main{padding:20px}
  .bp-code{font-size:28px}
  .bp-time{font-size:15px}
  .hotel-stay{flex-direction:column;gap:8px}
  .cal-day{min-width:44px;padding:8px 4px}
  .cal-num{font-size:18px}
  .resto-grid{grid-template-columns:1fr}
}

/* ═══ PRINT ═══ */
@media print{
  body{background:#fff}
  .hero{min-height:180px;break-inside:avoid}
  .boarding-pass,.hotel-card,.journal-content,.resto-card{break-inside:avoid;box-shadow:none}
  @keyframes heroPan{0%,100%{transform:none}}
}
</style>
</head>
<body>

<!-- ─── HERO ─── -->
<header class="hero">
  <div class="hero-bg" style="background-image:url('${esc(cover)}')"></div>
  <div class="hero-inner">
    <div class="hero-chip">✨ יומן מסע</div>
    <h1>${esc(trip.name)}</h1>
    ${trip.destination ? `<div class="hero-dest">🌍 ${esc(trip.destination)}</div>` : ''}
    ${trip.dates ? `<div class="hero-dates">📆 ${esc(trip.dates)}</div>` : ''}
    <div class="hero-stats">
      ${trip.flights?.segments?.length ? `<div class="hero-stat">✈️ ${trip.flights.segments.length} טיסות</div>` : ''}
      ${trip.hotels?.length ? `<div class="hero-stat">🏨 ${trip.hotels.length} מלונות</div>` : ''}
      ${trip.itinerary?.length ? `<div class="hero-stat">📅 ${trip.itinerary.length} ימים</div>` : ''}
      ${trip.flights?.passengers?.length ? `<div class="hero-stat">👥 ${trip.flights.passengers.length} נוסעים</div>` : ''}
    </div>
  </div>
</header>

<!-- ─── CALENDAR STRIP ─── -->
${renderCalendarStrip(calendarDays)}

<!-- ─── CONTENT ─── -->
<main class="container">
  ${renderJournal(trip.itinerary, trip)}
  ${renderBoardingPasses(trip.flights)}
  ${renderHotelTimeline(trip.hotels)}
  ${renderRestaurants(trip)}
</main>

<!-- ─── FOOTER ─── -->
<footer class="footer">
  <div class="footer-logo">Travel Planner Pro</div>
  <div>דף זה נוצר ב-${esc(genDate)} • מיועד לשיתוף עם משתתפי הטיול</div>
</footer>

</body>
</html>`;
};

/** Downloads the generated HTML as a file */
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
