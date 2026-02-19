import { Trip, FlightSegment, HotelBooking, ItineraryItem } from '../types';

/**
 * Generates a beautiful, self-contained HTML page summarizing a trip.
 * The page is RTL (Hebrew), responsive, and requires no external dependencies.
 * Designed to be shared with trip participants via messaging apps or email.
 */

const formatDate = (dateStr: string): string => {
        if (!dateStr) return '';
        try {
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return dateStr;
                return d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        } catch { return dateStr; }
};

const formatTime = (timeStr: string): string => {
        if (!timeStr) return '';
        // If already HH:MM format
        if (/^\d{1,2}:\d{2}$/.test(timeStr)) return timeStr;
        try {
                const d = new Date(timeStr);
                if (isNaN(d.getTime())) return timeStr;
                return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch { return timeStr; }
};

const escapeHtml = (str: string): string => {
        return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
};

const buildFlightsSection = (flights: { segments: FlightSegment[]; passengers: string[]; pnr: string }): string => {
        if (!flights?.segments?.length) return '';

        const segmentCards = flights.segments.map((seg, i) => {
                const date = formatDate(seg.date);
                const depTime = formatTime(seg.departureTime);
                const arrTime = formatTime(seg.arrivalTime);

                return `
      <div class="flight-card">
        <div class="flight-header">
          <div class="flight-badge">${escapeHtml(seg.airline || 'טיסה')} ${escapeHtml(seg.flightNumber || '')}</div>
          <div class="flight-date">${escapeHtml(date)}</div>
        </div>
        <div class="flight-route">
          <div class="flight-endpoint">
            <div class="airport-code">${escapeHtml(seg.fromCode || '—')}</div>
            <div class="city-name">${escapeHtml(seg.fromCity || '')}</div>
            ${depTime ? `<div class="flight-time">${escapeHtml(depTime)}</div>` : ''}
            ${seg.terminal ? `<div class="flight-detail">טרמינל ${escapeHtml(seg.terminal)}</div>` : ''}
          </div>
          <div class="flight-line">
            <div class="flight-line-bar"></div>
            <svg class="flight-plane-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l6.2 3.5-2.8 2.8-2.2-.7c-.4-.1-.8 0-1 .3l-.3.3c-.2.3-.1.7.2.9l3 2 2 3c.2.3.6.4.9.2l.3-.3c.3-.3.4-.7.3-1l-.7-2.2 2.8-2.8 3.5 6.2c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/>
            </svg>
            ${seg.duration ? `<div class="flight-duration">${escapeHtml(seg.duration)}</div>` : ''}
          </div>
          <div class="flight-endpoint">
            <div class="airport-code">${escapeHtml(seg.toCode || '—')}</div>
            <div class="city-name">${escapeHtml(seg.toCity || '')}</div>
            ${arrTime ? `<div class="flight-time">${escapeHtml(arrTime)}</div>` : ''}
            ${seg.gate ? `<div class="flight-detail">שער ${escapeHtml(seg.gate)}</div>` : ''}
          </div>
        </div>
        <div class="flight-extras">
          ${seg.class ? `<span class="flight-tag">${escapeHtml(seg.class)}</span>` : ''}
          ${seg.baggage ? `<span class="flight-tag">🧳 ${escapeHtml(seg.baggage)}</span>` : ''}
          ${seg.seat ? `<span class="flight-tag">💺 ${escapeHtml(seg.seat)}</span>` : ''}
          ${seg.mealPlan ? `<span class="flight-tag">🍽️ ${escapeHtml(seg.mealPlan)}</span>` : ''}
        </div>
      </div>
    `;
        }).join('');

        const passengersHtml = flights.passengers?.length
                ? `<div class="meta-row"><span class="meta-label">נוסעים</span><span class="meta-value">${flights.passengers.map(escapeHtml).join(', ')}</span></div>`
                : '';
        const pnrHtml = flights.pnr
                ? `<div class="meta-row"><span class="meta-label">קוד הזמנה (PNR)</span><span class="meta-value pnr-code">${escapeHtml(flights.pnr)}</span></div>`
                : '';

        return `
    <section class="section">
      <div class="section-header">
        <div class="section-icon flights-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.4-.1.9.3 1.1l6.2 3.5-2.8 2.8-2.2-.7c-.4-.1-.8 0-1 .3l-.3.3c-.2.3-.1.7.2.9l3 2 2 3c.2.3.6.4.9.2l.3-.3c.3-.3.4-.7.3-1l-.7-2.2 2.8-2.8 3.5 6.2c.2.4.7.5 1.1.3l.5-.3c.4-.2.6-.6.5-1.1z"/></svg>
        </div>
        <h2 class="section-title">✈️ טיסות</h2>
      </div>
      ${passengersHtml || pnrHtml ? `<div class="meta-block">${passengersHtml}${pnrHtml}</div>` : ''}
      <div class="flights-grid">${segmentCards}</div>
    </section>
  `;
};

const buildHotelsSection = (hotels: HotelBooking[]): string => {
        if (!hotels?.length) return '';

        const hotelCards = hotels.map(h => {
                const checkIn = formatDate(h.checkInDate);
                const checkOut = formatDate(h.checkOutDate);
                const nights = h.nights || (() => {
                        try {
                                const d1 = new Date(h.checkInDate);
                                const d2 = new Date(h.checkOutDate);
                                return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
                        } catch { return 0; }
                })();

                return `
      <div class="hotel-card">
        <div class="hotel-name">${escapeHtml(h.name)}</div>
        ${h.city ? `<div class="hotel-city">${escapeHtml(h.city)}</div>` : ''}
        ${h.address ? `<div class="hotel-address">${escapeHtml(h.address)}</div>` : ''}
        <div class="hotel-dates">
          <div class="date-block">
            <span class="date-label">כניסה</span>
            <span class="date-value">${escapeHtml(checkIn)}</span>
          </div>
          <div class="date-separator">
            <span class="nights-badge">${nights || '?'} לילות</span>
          </div>
          <div class="date-block">
            <span class="date-label">יציאה</span>
            <span class="date-value">${escapeHtml(checkOut)}</span>
          </div>
        </div>
        <div class="hotel-details">
          ${h.roomType ? `<span class="hotel-tag">🛏️ ${escapeHtml(h.roomType)}</span>` : ''}
          ${h.mealPlan ? `<span class="hotel-tag">🍽️ ${escapeHtml(h.mealPlan)}</span>` : ''}
          ${h.breakfastIncluded ? `<span class="hotel-tag">🥐 ארוחת בוקר כלולה</span>` : ''}
          ${h.roomView ? `<span class="hotel-tag">🌅 ${escapeHtml(h.roomView)}</span>` : ''}
          ${h.confirmationCode ? `<span class="hotel-tag conf-code">📋 ${escapeHtml(h.confirmationCode)}</span>` : ''}
          ${h.bookingSource ? `<span class="hotel-tag">${escapeHtml(h.bookingSource)}</span>` : ''}
        </div>
        ${h.checkInInstructions ? `<div class="hotel-instructions">📌 ${escapeHtml(h.checkInInstructions)}</div>` : ''}
        ${h.googleMapsUrl ? `<a href="${escapeHtml(h.googleMapsUrl)}" target="_blank" class="maps-link">📍 פתח במפות</a>` : ''}
      </div>
    `;
        }).join('');

        return `
    <section class="section">
      <div class="section-header">
        <div class="section-icon hotels-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21V7a2 2 0 012-2h14a2 2 0 012 2v14"/><path d="M3 11h18"/><path d="M7 11V7"/><path d="M11 11V7"/><path d="M15 11V7"/><path d="M19 11V7"/></svg>
        </div>
        <h2 class="section-title">🏨 מלונות</h2>
      </div>
      <div class="hotels-grid">${hotelCards}</div>
    </section>
  `;
};

const buildItinerarySection = (itinerary: ItineraryItem[]): string => {
        if (!itinerary?.length) return '';

        const days = itinerary.map((day, i) => {
                const dateStr = formatDate(day.date);
                const activitiesList = day.activities?.length
                        ? `<ul class="activity-list">${day.activities.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>`
                        : '<p class="no-activities">לא נוספו פעילויות עדיין</p>';

                return `
      <div class="day-card">
        <div class="day-number">יום ${day.day}</div>
        <div class="day-date">${escapeHtml(dateStr)}</div>
        <div class="day-title">${escapeHtml(day.title)}</div>
        ${activitiesList}
        ${day.notes ? `<div class="day-notes">${escapeHtml(day.notes)}</div>` : ''}
      </div>
    `;
        }).join('');

        return `
    <section class="section">
      <div class="section-header">
        <div class="section-icon itinerary-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
        </div>
        <h2 class="section-title">📅 תכנית מסלול</h2>
      </div>
      <div class="itinerary-timeline">${days}</div>
    </section>
  `;
};

const buildRestaurantsSection = (trip: Trip): string => {
        const allRestaurants = trip.restaurants?.flatMap(cat => cat.restaurants) || [];
        const favorites = allRestaurants.filter(r => r.isFavorite);
        const list = favorites.length > 0 ? favorites : allRestaurants.slice(0, 8);
        if (!list.length) return '';

        const cards = list.map(r => `
    <div class="resto-card">
      <div class="resto-name">${escapeHtml(r.name)}</div>
      ${r.cuisine ? `<div class="resto-cuisine">${escapeHtml(r.cuisine)}</div>` : ''}
      <div class="resto-location">${escapeHtml(r.location)}</div>
      ${r.priceLevel ? `<div class="resto-price">${escapeHtml(r.priceLevel)}</div>` : ''}
      ${r.googleMapsUrl ? `<a href="${escapeHtml(r.googleMapsUrl)}" target="_blank" class="maps-link">📍 מפה</a>` : ''}
    </div>
  `).join('');

        return `
    <section class="section">
      <div class="section-header">
        <div class="section-icon food-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
        </div>
        <h2 class="section-title">🍴 מסעדות מומלצות</h2>
      </div>
      <div class="resto-grid">${cards}</div>
    </section>
  `;
};

export const generateTripHTML = (trip: Trip): string => {
        const tripDates = trip.dates || '';
        const coverImage = trip.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80';

        const flightsHtml = buildFlightsSection(trip.flights);
        const hotelsHtml = buildHotelsSection(trip.hotels);
        const itineraryHtml = buildItinerarySection(trip.itinerary);
        const restaurantsHtml = buildRestaurantsSection(trip);

        const generatedDate = new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });

        return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(trip.name)} — סיכום טיול</title>
  <meta name="description" content="סיכום טיול: ${escapeHtml(trip.name)} — ${escapeHtml(trip.destination || '')}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+Hebrew:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    /* --- CSS Reset & Base --- */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg-primary: #f8fafc;
      --bg-card: #ffffff;
      --bg-card-hover: #f1f5f9;
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-tertiary: #94a3b8;
      --border: #e2e8f0;
      --border-light: #f1f5f9;
      --accent-blue: #3b82f6;
      --accent-indigo: #6366f1;
      --accent-purple: #8b5cf6;
      --accent-emerald: #10b981;
      --accent-orange: #f97316;
      --accent-rose: #f43f5e;
      --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
      --shadow-md: 0 4px 12px rgba(0,0,0,0.06);
      --shadow-lg: 0 8px 32px rgba(0,0,0,0.08);
      --shadow-xl: 0 16px 48px rgba(0,0,0,0.12);
      --radius-sm: 8px;
      --radius-md: 12px;
      --radius-lg: 16px;
      --radius-xl: 24px;
    }

    body {
      font-family: 'Noto Sans Hebrew', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* --- Hero Section --- */
    .hero {
      position: relative;
      min-height: 420px;
      display: flex;
      align-items: flex-end;
      overflow: hidden;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    }

    .hero-bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      opacity: 0.4;
      filter: blur(1px);
      transition: transform 0.3s;
    }

    .hero::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(to top, rgba(15, 23, 42, 0.95) 0%, rgba(15, 23, 42, 0.3) 50%, rgba(15, 23, 42, 0.1) 100%);
    }

    .hero-content {
      position: relative;
      z-index: 2;
      width: 100%;
      max-width: 900px;
      margin: 0 auto;
      padding: 48px 24px;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.12);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.15);
      padding: 6px 14px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 600;
      color: rgba(255,255,255,0.85);
      margin-bottom: 20px;
    }

    .hero-title {
      font-size: clamp(32px, 6vw, 56px);
      font-weight: 900;
      color: #fff;
      letter-spacing: -0.02em;
      line-height: 1.1;
      margin-bottom: 12px;
    }

    .hero-destination {
      font-size: clamp(16px, 3vw, 22px);
      font-weight: 500;
      color: rgba(255,255,255,0.7);
      margin-bottom: 8px;
    }

    .hero-dates {
      font-size: 15px;
      color: rgba(255,255,255,0.5);
      font-weight: 500;
    }

    .hero-stats {
      display: flex;
      gap: 24px;
      margin-top: 28px;
      flex-wrap: wrap;
    }

    .hero-stat {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 10px 18px;
      border-radius: var(--radius-md);
    }

    .hero-stat-icon {
      font-size: 18px;
    }

    .hero-stat-text {
      font-size: 14px;
      font-weight: 600;
      color: rgba(255,255,255,0.85);
    }

    /* --- Container --- */
    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 20px 64px;
    }

    /* --- Sections --- */
    .section {
      margin-bottom: 40px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
    }

    .section-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .section-icon svg { width: 22px; height: 22px; }

    .flights-icon { background: #eff6ff; color: var(--accent-blue); }
    .hotels-icon { background: #f5f3ff; color: var(--accent-indigo); }
    .itinerary-icon { background: #ecfdf5; color: var(--accent-emerald); }
    .food-icon { background: #fff7ed; color: var(--accent-orange); }

    .section-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.01em;
    }

    /* --- Meta Block --- */
    .meta-block {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 16px 20px;
      margin-bottom: 16px;
      box-shadow: var(--shadow-sm);
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
    }

    .meta-row + .meta-row { border-top: 1px solid var(--border-light); }
    .meta-label { font-size: 14px; color: var(--text-secondary); font-weight: 500; }
    .meta-value { font-size: 14px; font-weight: 700; color: var(--text-primary); }

    .pnr-code {
      font-family: 'Inter', monospace;
      background: #f1f5f9;
      padding: 4px 12px;
      border-radius: 6px;
      letter-spacing: 0.1em;
      font-size: 15px;
    }

    /* --- Flight Cards --- */
    .flights-grid { display: flex; flex-direction: column; gap: 12px; }

    .flight-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 20px 24px;
      box-shadow: var(--shadow-sm);
      transition: box-shadow 0.2s, transform 0.2s;
    }

    .flight-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }

    .flight-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .flight-badge {
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      color: white;
      padding: 5px 14px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }

    .flight-date { font-size: 14px; color: var(--text-secondary); font-weight: 600; }

    .flight-route {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .flight-endpoint { flex: 1; text-align: center; }
    .airport-code { font-size: 32px; font-weight: 900; letter-spacing: -0.02em; color: var(--text-primary); }
    .city-name { font-size: 13px; color: var(--text-secondary); font-weight: 500; margin-top: 2px; }
    .flight-time { font-size: 16px; font-weight: 700; color: var(--accent-blue); margin-top: 6px; }
    .flight-detail { font-size: 12px; color: var(--text-tertiary); font-weight: 500; margin-top: 2px; }

    .flight-line {
      flex: 1.5;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      position: relative;
    }

    .flight-line-bar {
      width: 100%;
      height: 2px;
      background: linear-gradient(90deg, var(--accent-blue), var(--accent-indigo));
      border-radius: 2px;
      position: relative;
    }

    .flight-line-bar::before, .flight-line-bar::after {
      content: '';
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      top: 50%;
      transform: translateY(-50%);
    }

    .flight-line-bar::before { right: -1px; background: var(--accent-indigo); }
    .flight-line-bar::after { left: -1px; background: var(--accent-blue); }

    .flight-plane-icon {
      width: 20px;
      height: 20px;
      color: var(--accent-blue);
      transform: rotate(-90deg);
      margin-top: -12px;
      background: var(--bg-card);
      padding: 2px;
    }

    .flight-duration { font-size: 12px; color: var(--text-tertiary); font-weight: 500; margin-top: 2px; }

    .flight-extras {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid var(--border-light);
    }

    .flight-tag, .hotel-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 100px;
      color: var(--text-secondary);
    }

    .conf-code {
      font-family: 'Inter', monospace;
      background: #fef3c7;
      border-color: #fde68a;
      color: #92400e;
      letter-spacing: 0.05em;
    }

    /* --- Hotel Cards --- */
    .hotels-grid { display: flex; flex-direction: column; gap: 12px; }

    .hotel-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 24px;
      box-shadow: var(--shadow-sm);
      transition: box-shadow 0.2s, transform 0.2s;
    }

    .hotel-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-1px);
    }

    .hotel-name { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
    .hotel-city { font-size: 14px; color: var(--accent-indigo); font-weight: 600; margin-bottom: 4px; }
    .hotel-address { font-size: 13px; color: var(--text-tertiary); margin-bottom: 16px; }

    .hotel-dates {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid var(--border-light);
      border-radius: var(--radius-md);
      padding: 16px;
      margin-bottom: 14px;
    }

    .date-block { flex: 1; text-align: center; }
    .date-label { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-tertiary); margin-bottom: 4px; }
    .date-value { font-size: 14px; font-weight: 700; color: var(--text-primary); }

    .date-separator { text-align: center; flex-shrink: 0; }

    .nights-badge {
      background: linear-gradient(135deg, var(--accent-indigo), var(--accent-purple));
      color: white;
      padding: 5px 14px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 700;
    }

    .hotel-details {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .hotel-instructions {
      font-size: 13px;
      color: var(--text-secondary);
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: var(--radius-sm);
      padding: 10px 14px;
      margin-bottom: 12px;
    }

    .maps-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-weight: 600;
      color: var(--accent-blue);
      text-decoration: none;
      padding: 6px 0;
    }

    .maps-link:hover { text-decoration: underline; }

    /* --- Itinerary --- */
    .itinerary-timeline { display: flex; flex-direction: column; gap: 12px; }

    .day-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 20px 24px;
      box-shadow: var(--shadow-sm);
      position: relative;
      overflow: hidden;
    }

    .day-card::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(180deg, var(--accent-emerald), var(--accent-blue));
      border-radius: 0 4px 4px 0;
    }

    .day-number {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--accent-emerald);
      margin-bottom: 4px;
    }

    .day-date { font-size: 13px; color: var(--text-tertiary); font-weight: 500; margin-bottom: 6px; }
    .day-title { font-size: 17px; font-weight: 700; margin-bottom: 10px; }

    .activity-list {
      list-style: none;
      padding: 0;
    }

    .activity-list li {
      position: relative;
      padding: 6px 0 6px 20px;
      font-size: 14px;
      color: var(--text-secondary);
    }

    .activity-list li::before {
      content: '';
      position: absolute;
      right: 0;
      top: 14px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-emerald);
    }

    .no-activities { font-size: 13px; color: var(--text-tertiary); font-style: italic; }
    .day-notes { font-size: 13px; color: var(--text-secondary); background: #f8fafc; border-radius: var(--radius-sm); padding: 10px 14px; margin-top: 10px; }

    /* --- Restaurants --- */
    .resto-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
    }

    .resto-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 18px;
      box-shadow: var(--shadow-sm);
      transition: box-shadow 0.2s, transform 0.2s;
    }

    .resto-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
    .resto-name { font-size: 15px; font-weight: 700; margin-bottom: 4px; }
    .resto-cuisine { font-size: 12px; color: var(--accent-orange); font-weight: 600; margin-bottom: 4px; }
    .resto-location { font-size: 12px; color: var(--text-tertiary); margin-bottom: 6px; }
    .resto-price { font-size: 13px; font-weight: 600; color: var(--accent-emerald); }

    /* --- Footer --- */
    .footer {
      text-align: center;
      padding: 32px 20px;
      color: var(--text-tertiary);
      font-size: 13px;
      border-top: 1px solid var(--border);
      margin-top: 20px;
    }

    .footer-logo {
      font-weight: 800;
      color: var(--text-secondary);
      margin-bottom: 4px;
    }

    /* --- Responsive --- */
    @media (max-width: 640px) {
      .hero { min-height: 320px; }
      .hero-content { padding: 32px 16px; }
      .hero-stats { gap: 10px; }
      .hero-stat { padding: 8px 12px; }
      .container { padding: 20px 16px 48px; }
      .flight-route { flex-direction: column; gap: 12px; }
      .flight-line { flex-direction: row; width: 100%; }
      .flight-line-bar { width: 100%; height: 2px; }
      .airport-code { font-size: 24px; }
      .hotel-dates { flex-direction: column; }
      .resto-grid { grid-template-columns: 1fr; }
    }

    /* --- Print Styles --- */
    @media print {
      body { background: white; }
      .hero { min-height: 200px; break-inside: avoid; }
      .section { break-inside: avoid; }
      .flight-card, .hotel-card, .day-card { break-inside: avoid; box-shadow: none; border: 1px solid #ddd; }
    }
  </style>
</head>
<body>
  <!-- Hero -->
  <header class="hero">
    <div class="hero-bg" style="background-image: url('${escapeHtml(coverImage)}')"></div>
    <div class="hero-content">
      <div class="hero-badge">✨ סיכום טיול</div>
      <h1 class="hero-title">${escapeHtml(trip.name)}</h1>
      ${trip.destination ? `<div class="hero-destination">🌍 ${escapeHtml(trip.destination)}</div>` : ''}
      ${tripDates ? `<div class="hero-dates">📆 ${escapeHtml(tripDates)}</div>` : ''}
      <div class="hero-stats">
        ${trip.flights?.segments?.length ? `<div class="hero-stat"><span class="hero-stat-icon">✈️</span><span class="hero-stat-text">${trip.flights.segments.length} טיסות</span></div>` : ''}
        ${trip.hotels?.length ? `<div class="hero-stat"><span class="hero-stat-icon">🏨</span><span class="hero-stat-text">${trip.hotels.length} מלונות</span></div>` : ''}
        ${trip.itinerary?.length ? `<div class="hero-stat"><span class="hero-stat-icon">📅</span><span class="hero-stat-text">${trip.itinerary.length} ימים</span></div>` : ''}
        ${trip.flights?.passengers?.length ? `<div class="hero-stat"><span class="hero-stat-icon">👥</span><span class="hero-stat-text">${trip.flights.passengers.length} נוסעים</span></div>` : ''}
      </div>
    </div>
  </header>

  <!-- Content -->
  <main class="container">
    ${flightsHtml}
    ${hotelsHtml}
    ${itineraryHtml}
    ${restaurantsHtml}
  </main>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-logo">Travel Planner Pro</div>
    <div>דף זה נוצר ב-${escapeHtml(generatedDate)} • מיועד לשיתוף עם משתתפי הטיול</div>
  </footer>
</body>
</html>`;
};

/**
 * Downloads the generated HTML as a file
 */
export const downloadTripHTML = (trip: Trip): void => {
        const html = generateTripHTML(trip);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${trip.name.replace(/[^a-zA-Z0-9\u0590-\u05FF ]/g, '').trim() || 'trip'} — סיכום.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
};
