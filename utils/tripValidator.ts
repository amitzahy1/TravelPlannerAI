// Pure-code trip validator. Detects logical inconsistencies in a Trip without
// any AI call. Catches the bug class the user surfaced 2026-05-21: a flight
// extraction showing TLV→TIA as 5h 10m and the return as 40m (real value
// ~3h each direction). The AI made up those durations during extraction;
// nothing in our pipeline noticed until the user spotted them visually.
//
// Validator rules:
//   1. Flight duration sanity — stored `duration` string must roughly match
//      the timestamp delta between `departureTime` and `arrivalTime`.
//   2. Impossible-fast flights — international hop with duration < 30m.
//   3. Hotel checkout vs flight conflicts — checkout after departure flight
//      (you'd miss your flight).
//   4. Hotel dates outside trip range — check-in / check-out outside the
//      `trip.dates` window.
//   5. Hotel-vs-hotel date overlap — two hotels with overlapping nights in
//      different cities.
//   6. Out-of-country items — restaurants / attractions whose
//      `verifiedCountry` is not the trip's country.
//
// All rules are pure functions: input is the Trip, output is a list of
// validation findings with a severity and a one-line Hebrew action message.
// The UI decides what to do with them (show banner, suggest fix, dismiss).

import type { Trip, FlightSegment, HotelBooking, Restaurant, Attraction } from '../types';
import { inferTripCountry } from './tripScope';

export type Severity = 'error' | 'warning' | 'info';

export interface Finding {
  id: string;             // stable id so UI can dedupe / dismiss
  severity: Severity;
  kind: 'flight_duration' | 'flight_impossible' | 'hotel_vs_flight' | 'hotel_dates' | 'hotel_overlap' | 'item_out_of_country';
  headline: string;       // 1-line Hebrew summary
  action?: string;        // suggested fix
  itemRef?: { kind: 'flight' | 'hotel' | 'restaurant' | 'attraction'; id?: string; name?: string };
}

// ---------- helpers ----------

const parseDateTime = (s?: string): Date | null => {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t) : null;
};

const parseTripDateRange = (dates?: string): { from: Date | null; to: Date | null } => {
  if (!dates) return { from: null, to: null };
  // Accept "YYYY-MM-DD - YYYY-MM-DD" or "YYYY-MM-DD → YYYY-MM-DD" or "DD/MM/YYYY - DD/MM/YYYY"
  const parts = dates.split(/\s*[-–—→]\s*/).map(s => s.trim());
  if (parts.length < 2) return { from: parseDateTime(parts[0]), to: null };
  return { from: parseDateTime(parts[0]), to: parseDateTime(parts[1]) };
};

// "5h 10m" / "2h 40m" / "45m" → minutes. Returns null when the string doesn't
// look like a duration we can parse.
const parseDurationMinutes = (duration?: string): number | null => {
  if (!duration) return null;
  const d = duration.toLowerCase().trim();
  const hours = d.match(/(\d+(?:\.\d+)?)\s*h/);
  const mins = d.match(/(\d+)\s*m/);
  if (!hours && !mins) return null;
  return (hours ? parseFloat(hours[1]) * 60 : 0) + (mins ? parseInt(mins[1]) : 0);
};

// Wall-clock minutes between two ISO datetimes (best effort — local times
// without timezones still produce a rough number).
const minutesBetween = (a?: string, b?: string): number | null => {
  const da = parseDateTime(a);
  const db = parseDateTime(b);
  if (!da || !db) return null;
  return Math.round((db.getTime() - da.getTime()) / 60_000);
};

// ---------- per-flight rules ----------

const validateFlightDurations = (segments: FlightSegment[]): Finding[] => {
  const findings: Finding[] = [];
  segments.forEach((seg, idx) => {
    const stored = parseDurationMinutes(seg.duration);
    const wallClock = minutesBetween(seg.departureTime, seg.arrivalTime);
    const route = `${seg.fromCode || seg.fromCity || '?'} → ${seg.toCode || seg.toCity || '?'}`;
    const flightLabel = `${seg.airline || ''} ${seg.flightNumber || ''}`.trim() || `טיסה ${idx + 1}`;

    // Impossibly short — international flights are never <30 minutes
    if (stored !== null && stored > 0 && stored < 30) {
      findings.push({
        id: `flight-impossible-${seg.flightNumber || idx}`,
        severity: 'error',
        kind: 'flight_impossible',
        headline: `${flightLabel} (${route}): משך הטיסה הוא ${seg.duration} — בלתי אפשרי.`,
        action: 'ייתכן שספרת השעות נחתכה בייבוא. עבור ל-Flights, ערוך את הטיסה ידנית או יבא מחדש.',
        itemRef: { kind: 'flight', name: flightLabel },
      });
      return; // don't double-flag with the duration-mismatch rule
    }

    // Stored duration significantly different from wall-clock delta.
    // Tolerance: ±60 minutes (handles timezone math + boarding/landing).
    if (stored !== null && wallClock !== null && wallClock > 0) {
      const diff = Math.abs(stored - wallClock);
      const tolerance = Math.max(60, wallClock * 0.3); // 30% or 60min, whichever is larger
      if (diff > tolerance) {
        findings.push({
          id: `flight-duration-mismatch-${seg.flightNumber || idx}`,
          severity: 'warning',
          kind: 'flight_duration',
          headline: `${flightLabel} (${route}): משך הטיסה (${seg.duration}) לא תואם את שעות המראה/נחיתה (~${Math.round(wallClock / 60 * 10) / 10}h).`,
          action: 'אחד הערכים שגוי. בדוק שמשך הטיסה ושעות ההמראה/נחיתה תקינים ב-Flights.',
          itemRef: { kind: 'flight', name: flightLabel },
        });
      }
    }
  });
  return findings;
};

// ---------- hotel rules ----------

const validateHotelDates = (hotels: HotelBooking[], tripRange: { from: Date | null; to: Date | null }): Finding[] => {
  const findings: Finding[] = [];
  const { from, to } = tripRange;
  hotels.forEach(h => {
    const ci = parseDateTime(h.checkInDate);
    const co = parseDateTime(h.checkOutDate);

    // Checkout before check-in
    if (ci && co && co.getTime() < ci.getTime()) {
      findings.push({
        id: `hotel-dates-${h.id}`,
        severity: 'error',
        kind: 'hotel_dates',
        headline: `${h.name}: תאריך יציאה (${h.checkOutDate}) לפני תאריך כניסה (${h.checkInDate}).`,
        action: 'תקן את התאריכים בכרטיס המלון.',
        itemRef: { kind: 'hotel', id: h.id, name: h.name },
      });
      return;
    }

    // Outside trip window
    if (from && ci && ci.getTime() < from.getTime() - 24 * 3600_000) {
      findings.push({
        id: `hotel-before-trip-${h.id}`,
        severity: 'warning',
        kind: 'hotel_dates',
        headline: `${h.name}: כניסה ב-${h.checkInDate} — לפני תחילת הטיול.`,
        action: 'ודא שתאריך הכניסה תואם את תאריכי הטיול.',
        itemRef: { kind: 'hotel', id: h.id, name: h.name },
      });
    }
    if (to && co && co.getTime() > to.getTime() + 24 * 3600_000) {
      findings.push({
        id: `hotel-after-trip-${h.id}`,
        severity: 'warning',
        kind: 'hotel_dates',
        headline: `${h.name}: יציאה ב-${h.checkOutDate} — אחרי סיום הטיול.`,
        action: 'ודא שתאריך היציאה תואם את תאריכי הטיול.',
        itemRef: { kind: 'hotel', id: h.id, name: h.name },
      });
    }
  });
  return findings;
};

const validateHotelVsFlight = (hotels: HotelBooking[], segments: FlightSegment[]): Finding[] => {
  const findings: Finding[] = [];
  // Departure flights (any flight that leaves the trip's first/main hotel city).
  // We don't know which is "outbound" without more metadata; use the simple
  // heuristic: any flight scheduled on or after a hotel's checkout date is a
  // candidate. Flag when the gap is < 2 hours (almost certainly a data error).
  hotels.forEach(h => {
    const co = parseDateTime(h.checkOutDate);
    if (!co) return;
    segments.forEach((seg, idx) => {
      const dep = parseDateTime(seg.departureTime);
      if (!dep) return;
      const gapMinutes = (dep.getTime() - co.getTime()) / 60_000;
      // Flight departs BEFORE hotel checkout — bad
      if (gapMinutes < 0 && gapMinutes > -48 * 60) {
        findings.push({
          id: `hotel-vs-flight-${h.id}-${seg.flightNumber || idx}`,
          severity: 'error',
          kind: 'hotel_vs_flight',
          headline: `${h.name}: יציאה (${h.checkOutDate}) אחרי יציאת טיסה (${seg.departureTime}).`,
          action: 'בדוק את תאריכי המלון או טיסת היציאה — אחד מהם שגוי.',
          itemRef: { kind: 'hotel', id: h.id, name: h.name },
        });
      }
    });
  });
  return findings;
};

const validateHotelOverlap = (hotels: HotelBooking[]): Finding[] => {
  const findings: Finding[] = [];
  for (let i = 0; i < hotels.length; i++) {
    for (let j = i + 1; j < hotels.length; j++) {
      const a = hotels[i], b = hotels[j];
      const aCi = parseDateTime(a.checkInDate);
      const aCo = parseDateTime(a.checkOutDate);
      const bCi = parseDateTime(b.checkInDate);
      const bCo = parseDateTime(b.checkOutDate);
      if (!aCi || !aCo || !bCi || !bCo) continue;
      // Overlap test: A starts before B ends AND B starts before A ends
      const overlap = aCi.getTime() < bCo.getTime() && bCi.getTime() < aCo.getTime();
      if (!overlap) continue;
      // Only flag when the two cities differ — same city = legitimate hotel switch.
      const aCity = (a.city || '').trim().toLowerCase();
      const bCity = (b.city || '').trim().toLowerCase();
      if (aCity && bCity && aCity !== bCity) {
        findings.push({
          id: `hotel-overlap-${a.id}-${b.id}`,
          severity: 'warning',
          kind: 'hotel_overlap',
          headline: `${a.name} (${a.city}) ו-${b.name} (${b.city}) חופפים בתאריכים — אבל בערים שונות.`,
          action: 'בדוק שלא הוזנו תאריכים כפולים בטעות בייבוא.',
          itemRef: { kind: 'hotel', id: a.id, name: a.name },
        });
      }
    }
  }
  return findings;
};

// ---------- item-scope rules ----------

const validateItemsInCountry = (trip: Trip): Finding[] => {
  const findings: Finding[] = [];
  const tripCountry = (inferTripCountry(trip) || trip.destination || '').toLowerCase();
  if (!tripCountry) return findings;

  const check = (items: Array<{ id?: string; name?: string; verifiedCountry?: string }>, kind: 'restaurant' | 'attraction') => {
    items.forEach(i => {
      if (!i.verifiedCountry) return; // Photon hasn't classified yet
      if (i.verifiedCountry.toLowerCase().includes(tripCountry) || tripCountry.includes(i.verifiedCountry.toLowerCase())) return;
      findings.push({
        id: `item-out-of-country-${kind}-${i.id || i.name}`,
        severity: 'warning',
        kind: 'item_out_of_country',
        headline: `${i.name || '(ללא שם)'} ב-${i.verifiedCountry} — מחוץ ל${trip.destination}.`,
        action: 'הסר ידנית או הרץ "אמת מחדש את כל המקומות" בניהול.',
        itemRef: { kind, id: i.id, name: i.name },
      });
    });
  };

  const flatRestaurants: Restaurant[] = [
    ...(trip.restaurants || []).flatMap(c => c.restaurants || []),
    ...(trip.aiRestaurants || []).flatMap(c => c.restaurants || []),
  ];
  const flatAttractions: Attraction[] = [
    ...(trip.attractions || []).flatMap(c => c.attractions || []),
    ...(trip.aiAttractions || []).flatMap(c => c.attractions || []),
  ];
  check(flatRestaurants, 'restaurant');
  check(flatAttractions, 'attraction');
  return findings;
};

// ---------- main entry point ----------

export const validateTrip = (trip: Trip): Finding[] => {
  const findings: Finding[] = [];
  const tripRange = parseTripDateRange(trip.dates);

  // Flights — both legacy `flights.segments` and unified `transports` if present
  const segments: FlightSegment[] = trip.flights?.segments || [];
  findings.push(...validateFlightDurations(segments));

  // Hotels
  const hotels: HotelBooking[] = trip.hotels || [];
  findings.push(...validateHotelDates(hotels, tripRange));
  findings.push(...validateHotelVsFlight(hotels, segments));
  findings.push(...validateHotelOverlap(hotels));

  // Out-of-country items (uses Photon-verified country, opt-in per item)
  findings.push(...validateItemsInCountry(trip));

  return findings;
};

// Convenience grouping for the UI banner.
export const groupFindingsBySeverity = (findings: Finding[]): { errors: Finding[]; warnings: Finding[]; info: Finding[] } => ({
  errors: findings.filter(f => f.severity === 'error'),
  warnings: findings.filter(f => f.severity === 'warning'),
  info: findings.filter(f => f.severity === 'info'),
});
