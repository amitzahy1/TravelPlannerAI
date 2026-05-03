/**
 * Single source of truth for the "המלצות לשיפור" panel + the count badge
 * on the Itinerary page. The home-page button used to sum AI-category
 * lengths and favorite counts to produce its badge ("20") which had no
 * relation to what the panel actually rendered ("2"). This util makes
 * the count match the panel by computing both from the same logic.
 *
 * Each `Recommendation` is a single actionable group; chips render one
 * per group. The panel can introspect `dates`, `dateRanges`, and
 * `warningDetails` to render rich subtitles (e.g. "ב-15-20/8").
 */

import type { Trip, Restaurant, Attraction, DayPlan } from '../types';
import { detectSuggestedTransports } from './suggestedTransports';

export type RecommendationType =
        | 'data_warning'
        | 'restaurants'
        | 'attractions'
        | 'hotel_missing'
        | 'transfer'
        | 'food_research_missing'
        | 'attractions_research_missing';

export interface RecommendationDateRange {
        start: string; // ISO yyyy-mm-dd
        end: string;   // ISO yyyy-mm-dd inclusive (single-day if start === end)
}

export interface Recommendation {
        id: string;
        type: RecommendationType;
        title: string;
        subtitle: string;
        items?: (Restaurant | Attraction)[];
        suggestedDates?: string[];
        dateRanges?: RecommendationDateRange[]; // Compacted ranges for display
        warningDetails?: string[];
        navigateTo?: 'restaurants' | 'attractions' | 'flights' | 'hotels';
        // Count of "things to fix" — used by the badge to tally the WORK,
        // not just the chip count. e.g. 5 missing transfers = 5 to-do items
        // even though they collapse to one chip.
        actionCount: number;
}

const formatHebrewDay = (iso: string): string => {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' }).format(d);
};

/** Group a list of ISO dates into contiguous ranges. */
const compactRanges = (isoDates: string[]): RecommendationDateRange[] => {
        if (isoDates.length === 0) return [];
        const sorted = [...new Set(isoDates)].sort();
        const ranges: RecommendationDateRange[] = [];
        let start = sorted[0];
        let prev = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
                const cur = sorted[i];
                const prevDate = new Date(prev);
                const curDate = new Date(cur);
                const dayDiff = Math.round((curDate.getTime() - prevDate.getTime()) / 86400000);
                if (dayDiff === 1) {
                        prev = cur;
                        continue;
                }
                ranges.push({ start, end: prev });
                start = cur;
                prev = cur;
        }
        ranges.push({ start, end: prev });
        return ranges;
};

/** Format a date-range list as a readable Hebrew string. */
export const formatDateRanges = (ranges: RecommendationDateRange[]): string => {
        if (ranges.length === 0) return '';
        return ranges
                .map(r => (r.start === r.end ? formatHebrewDay(r.start) : `${formatHebrewDay(r.start)}–${formatHebrewDay(r.end)}`))
                .join(', ');
};

/** Compute the recommendations for a trip. Pure — no React, no side effects. */
export const computeRecommendations = (
        trip: Trip,
        timeline: DayPlan[],
        favoriteRestaurants: Restaurant[],
        favoriteAttractions: Attraction[],
): Recommendation[] => {
        const recs: Recommendation[] = [];

        // Cities indexed by date for matching
        const citiesByDate = new Map<string, string>();
        timeline.forEach(day => {
                if (day.locationContext) citiesByDate.set(day.dateIso, day.locationContext.toLowerCase());
        });

        // 1. Unscheduled favorite restaurants
        const unscheduledRestaurants = favoriteRestaurants.filter(r => !r.reservationDate);
        if (unscheduledRestaurants.length > 0) {
                const matching = new Set<string>();
                unscheduledRestaurants.forEach(r => {
                        const loc = (r.location || r.region || '').toLowerCase();
                        Array.from(citiesByDate.entries()).forEach(([date, city]) => {
                                if (loc.includes(city) || city.includes(loc.split(',')[0])) matching.add(date);
                        });
                });
                recs.push({
                        id: 'group-restaurants',
                        type: 'restaurants',
                        title: 'מסעדות מועדפות',
                        subtitle: `🍽️ ${unscheduledRestaurants.length} מסעדות ששמרת — לא נקבעו`,
                        items: unscheduledRestaurants,
                        suggestedDates: matching.size > 0 ? Array.from(matching) : timeline.map(d => d.dateIso),
                        actionCount: unscheduledRestaurants.length,
                });
        }

        // 2. Unscheduled favorite attractions
        const unscheduledAttractions = favoriteAttractions.filter(a => !a.scheduledDate);
        if (unscheduledAttractions.length > 0) {
                const matching = new Set<string>();
                unscheduledAttractions.forEach(a => {
                        const loc = (a.location || a.region || '').toLowerCase();
                        Array.from(citiesByDate.entries()).forEach(([date, city]) => {
                                if (loc.includes(city) || city.includes(loc.split(',')[0])) matching.add(date);
                        });
                });
                recs.push({
                        id: 'group-attractions',
                        type: 'attractions',
                        title: 'אטרקציות מועדפות',
                        subtitle: `📍 ${unscheduledAttractions.length} אטרקציות ששמרת — לא נקבעו`,
                        items: unscheduledAttractions,
                        suggestedDates: matching.size > 0 ? Array.from(matching) : timeline.map(d => d.dateIso),
                        actionCount: unscheduledAttractions.length,
                });
        }

        // 3. Missing hotels — emit ONE chip per (city, contiguous-date-range)
        //    so the user sees "חסר מלון בפטאייה ב-23-25/8" instead of a generic
        //    "חסר מלון" lump that hides where and when. Drops first+last days
        //    of the trip (assumed travel days).
        const datesWithHotel = new Set<string>();
        trip.hotels?.forEach(h => {
                const start = new Date(h.checkInDate);
                const end = new Date(h.checkOutDate);
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                        const cur = new Date(start);
                        while (cur < end) {
                                datesWithHotel.add(cur.toISOString().split('T')[0]);
                                cur.setDate(cur.getDate() + 1);
                        }
                }
        });
        const missingHotelDays = timeline
                .filter(day => !datesWithHotel.has(day.dateIso))
                .filter((_, i, arr) => i > 0 && i < arr.length - 1);
        // Group by city, then split each group into contiguous date ranges.
        const hotelByCity = new Map<string, string[]>();
        missingHotelDays.forEach(day => {
                const city = (day.locationContext || '').trim() || '—';
                if (!hotelByCity.has(city)) hotelByCity.set(city, []);
                hotelByCity.get(city)!.push(day.dateIso);
        });
        Array.from(hotelByCity.entries()).forEach(([city, isos]) => {
                const ranges = compactRanges(isos);
                ranges.forEach((range, idx) => {
                        const cityLabel = city === '—' ? '' : ` ב-${city}`;
                        const dateLabel = range.start === range.end
                                ? formatHebrewDay(range.start)
                                : `${formatHebrewDay(range.start)}–${formatHebrewDay(range.end)}`;
                        const datesInRange: string[] = [];
                        const cur = new Date(range.start);
                        const endDate = new Date(range.end);
                        while (cur <= endDate) {
                                datesInRange.push(cur.toISOString().split('T')[0]);
                                cur.setDate(cur.getDate() + 1);
                        }
                        recs.push({
                                id: `rec-hotel-missing-${city}-${range.start}`,
                                type: 'hotel_missing',
                                title: `חסר מלון${cityLabel} ב-${dateLabel}`,
                                subtitle: `🏨 ${datesInRange.length} ${datesInRange.length === 1 ? 'לילה' : 'לילות'} ללא מלון רשום`,
                                suggestedDates: datesInRange,
                                dateRanges: [range],
                                actionCount: datesInRange.length,
                        });
                });
        });

        // 4. Missing transfers — one chip per suggested transfer so the user
        //    can see exactly which day each missing transfer is for. Uses the
        //    SAME detectSuggestedTransports() the FlightsView shows so counts
        //    are always synced.
        const suggested = detectSuggestedTransports(trip);
        suggested.forEach(s => {
                const isoDate = (s.date || '').slice(0, 10);
                const dateLabel = isoDate ? formatHebrewDay(isoDate) : '';
                const fromCity = ((s as any).fromCity || (s as any).fromName || '').toString().trim();
                const toCity = ((s as any).toCity || (s as any).toName || '').toString().trim();
                const route = fromCity && toCity ? `${fromCity}→${toCity}` : (fromCity || toCity);
                const titleParts = ['הסעה'];
                if (route) titleParts.push(route);
                if (dateLabel) titleParts.push(`ב-${dateLabel}`);
                recs.push({
                        id: `rec-transfer-${s.id}`,
                        type: 'transfer',
                        title: titleParts.join(' '),
                        subtitle: `🚗 ${s.reason || 'הסעה חסרה'}`,
                        suggestedDates: isoDate ? [isoDate] : [],
                        dateRanges: isoDate ? [{ start: isoDate, end: isoDate }] : [],
                        actionCount: 1,
                });
        });

        // 4b. AI market research missing
        if (!trip.aiRestaurants || trip.aiRestaurants.length === 0) {
                recs.push({
                        id: 'rec-food-research',
                        type: 'food_research_missing',
                        title: 'מחקר אוכל (AI)',
                        subtitle: '🍽️ עדיין לא עשית מחקר שוק למסעדות — תן ל-AI להציע',
                        navigateTo: 'restaurants',
                        actionCount: 1,
                });
        }
        if (!trip.aiAttractions || trip.aiAttractions.length === 0) {
                recs.push({
                        id: 'rec-attractions-research',
                        type: 'attractions_research_missing',
                        title: 'מחקר אטרקציות (AI)',
                        subtitle: '📍 עדיין לא עשית מחקר שוק לאטרקציות — תן ל-AI להציע',
                        navigateTo: 'attractions',
                        actionCount: 1,
                });
        }

        // 5. Data warnings — incomplete flights/hotels (prepend so it's first)
        const dataWarnings: string[] = [];
        trip.flights?.segments?.forEach((seg, i) => {
                if (!seg.departureTime || seg.departureTime === '00:00' || !seg.arrivalTime) {
                        dataWarnings.push(`טיסה ${i + 1}: חסרים זמני המראה/נחיתה`);
                }
                if (!seg.date) dataWarnings.push(`טיסה ${i + 1}: חסר תאריך`);
        });
        trip.hotels?.forEach((h, i) => {
                if (!h.checkInDate || !h.checkOutDate) {
                        dataWarnings.push(`מלון ${h.name || i + 1}: חסרים תאריכי צ'ק-אין/אאוט`);
                }
        });
        if (dataWarnings.length > 0) {
                recs.unshift({
                        id: 'data-warnings',
                        type: 'data_warning',
                        title: 'תקן פרטים חסרים',
                        subtitle: `⚠️ ${dataWarnings.length} פרטים דורשים תיקון`,
                        warningDetails: dataWarnings,
                        actionCount: dataWarnings.length,
                });
        }

        return recs;
};

/** Total number of action items across all recommendation groups —
 *  the right number for the badge on the Itinerary "המלצות לשיפור" pill. */
export const countRecommendationActions = (recs: Recommendation[]): number =>
        recs.reduce((sum, r) => sum + r.actionCount, 0);
