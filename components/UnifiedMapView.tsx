import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Trip } from '../types';
import { Loader2, Map as MapIcon, RefreshCw } from 'lucide-react';
import { extractRobustCity, cleanCityName, cityKey } from '../utils/geoData';
import { getCountryBbox, coordInBbox, extractCoordsFromMapsUrl, toEnglishCountryName } from '../utils/geocodePlaces';
import { isPlaceInTripScope, getTripCountryBbox, getTripCountries, getTripCountryBboxes, placeInTripCountries, getCountryForHotel, coordInTripCountries, coordInTripCities, getTripCityBboxes } from '../utils/tripScope';
import { classifyTripRoute, transportEmojiForMode, transportLabelForMode, LegClassification } from '../services/routeClassifier';
import { SMALL_AIRPORT_COORDS } from '../utils/airportTimezones';
import { toast } from '../stores/useToastStore';
import { MODE_COLORS } from '../utils/transportColors';
import { MapItemPopup } from './map/MapItemPopup';
import { getEnglishName } from '../utils/displayName';

// --- Interfaces ---
export interface MapItem {
    id: string;
    type: 'hotel' | 'restaurant' | 'attraction' | 'airport';
    subType?: 'departure' | 'arrival';
    flightId?: string;
    name: string;
    description?: string;
    lat?: number;
    lng?: number;
    address?: string;
    date?: string;
    time?: string;
    city?: string;
    order?: number; // Chronological order
    // Optional rich fields rendered in the popup when present, so clicking a
    // pin shows the same level of detail as the list view (rating, cuisine,
    // recommendation source, price, image, notes).
    rating?: number;
    cuisine?: string;
    category?: string; // e.g. attraction type
    recommendationSource?: string;
    priceRange?: string;
    imageUrl?: string;
    notes?: string;
    googleMapsUrl?: string;
    // Distinguishes a place the user has saved to their list ('saved', solid
    // pin) from an AI suggestion ('ai', lighter dashed pin). Defaults to
    // 'saved' when omitted so existing callers keep their look.
    source?: 'saved' | 'ai';
    // Original record so a popup-level "save" handler can pass the full
    // place object back to the parent (which expects a Restaurant/Attraction
    // shape, not a MapItem).
    raw?: any;
    categoryTitle?: string;
}

interface RouteStop {
    name: string;
    displayName?: string;
    type: 'flight' | 'hotel' | 'city';
    code?: string;
    coords?: { lat: number; lng: number };
    date?: string;
    emoji?: string;
}

interface UnifiedMapViewProps {
    trip?: Trip;
    items?: MapItem[];
    height?: string;
    title?: string;
    // FullTripMapView (the unified map_full tab) passes these to gate which
    // layers render. All flags default to ON to preserve behaviour for the
    // existing Restaurants/Attractions tab callers — they don't pass `layers`.
    layers?: {
        route?: boolean;
        hotels?: boolean;
        myLists?: boolean;
        aiRestaurants?: boolean;
        aiAttractions?: boolean;
    };
    // Tile theme — defaults to the current Carto Voyager. Dark uses
    // Carto's dark_all variant; pin labels stay readable on both.
    tileTheme?: 'light' | 'dark';
    // When true (the default) the auto-fit prefers showing the whole trip
    // on one screen with maxZoom 11 so city pins remain readable. The
    // existing per-tab callers (which want a tighter zoom around a single
    // city) pass `compactView={false}` to keep maxZoom 14.
    compactView?: boolean;
    // Hide the built-in city filter bar + bottom timeline strip when a
    // wrapper component (e.g. FullTripMapView) renders its own chrome.
    // Defaults to false to preserve behaviour for existing callers.
    embedded?: boolean;
    // Controlled active-city — when provided, the wrapper owns city focus
    // (not the internal filter bar). Changing this prop triggers a smooth
    // flyToBounds animation instead of an instant fitBounds.
    activeCity?: string | null;
    // Concentric translucent circles around each hotel coord (1.2km
    // ≈ 15min walk and 2.4km ≈ 30min walk at 5 km/h).
    walkingCircles?: boolean;
    // When true, AI restaurant/attraction pins are augmented with
    // overlapping semi-transparent circles creating a density-heat visual.
    heatmap?: boolean;
    // When set, the map smooth-flies to these coordinates. Set to a new
    // object reference each time a fly is desired.
    //   • `{ lat, lng, zoom?, kind? }` flies to a single point.
    //   • `{ bounds: [[s,w],[n,e]], maxZoom?, kind? }` fits a rectangle —
    //     used by city chips so one click tightly fits all city items.
    //   • `kind: 'gps'` additionally renders a "you are here" marker.
    //     Default (`undefined` / `'reveal'`) renders no marker — used for
    //     UI-driven flies like chip clicks.
    flyTo?:
        | ({ lat: number; lng: number; zoom?: number; kind?: 'gps' | 'reveal' })
        | ({ bounds: [[number, number], [number, number]]; maxZoom?: number; kind?: 'gps' | 'reveal' })
        | null;
    // Optional callback wired by RestaurantsView/AttractionsView so the map
    // popup can save an AI suggestion to the user's list. The popup shows
    // an "add to my list" CTA only when this callback is provided AND the
    // item's source is 'ai'.
    onAddToList?: (item: MapItem) => void;
    // Lowercased name set used by the popup to detect when an AI suggestion
    // is already saved (toggles the CTA into a "✓ saved" state).
    savedNames?: Set<string>;
    // Wrapper-supplied trip mutation. When set, the hotel popup gets a
    // "תקן מיקום" pill that opens a Google-Maps-URL paste modal — pasted
    // coords are written back via this callback (lat / lng / googleMapsUrl).
    onUpdateTrip?: (trip: Trip) => void;
    // Fired once the geocoding pipeline produces a snapshot of resolved items
    // (each with valid lat/lng). Wrappers like FullTripMapView use it to
    // compute city bounds for the chip-strip click handler without owning
    // the geocoder themselves.
    onItemsResolved?: (items: Array<{ id: string; type: string; name: string; lat: number; lng: number; city?: string }>) => void;
}

const STORAGE_KEY = 'travel_app_geo_cache_v6';
const MAX_CACHE_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

type CachedCoord = { lat: number; lng: number; ts?: number };

const loadGeoCache = (): Record<string, { lat: number; lng: number }> => {
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, CachedCoord>;
        const now = Date.now();
        const result: Record<string, { lat: number; lng: number }> = {};
        Object.entries(raw).forEach(([k, v]) => {
            if (!v.ts || now - v.ts < MAX_CACHE_AGE_MS) result[k] = { lat: v.lat, lng: v.lng };
        });
        return result;
    } catch { return {}; }
};

const saveGeoCache = (cache: Record<string, { lat: number; lng: number }>) => {
    try {
        const now = Date.now();
        const toStore: Record<string, CachedCoord> = {};
        Object.entries(cache).forEach(([k, v]) => { toStore[k] = { ...v, ts: now }; });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch { /* storage quota */ }
};

// Type config — colors and icons
const TYPE_CONFIG = {
    hotel: {
        color: '#0ea5e9',
        gradient: ['#0ea5e9', '#0284c7'],
        emoji: '🏨',
        label: 'מלון',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-8a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v8"/><path d="M5 21h14"/><path d="M9 10V8a3 3 0 0 1 6 0v2"/></svg>`,
    },
    restaurant: {
        color: '#f97316',
        gradient: ['#f97316', '#ea580c'],
        emoji: '🍽️',
        label: 'מסעדה',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
    },
    attraction: {
        color: '#8b5cf6',
        gradient: ['#8b5cf6', '#7c3aed'],
        emoji: '🎯',
        label: 'אטרקציה',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    },
    airport: {
        color: '#6366f1',
        gradient: ['#6366f1', '#4f46e5'],
        emoji: '✈️',
        label: 'שדה תעופה',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>`,
    },
};

// Hebrew cross-language map
const HEBREW_TO_ENGLISH_CITY_MAP: Record<string, string[]> = {
    'בנגקוק': ['Bangkok'], 'פוקט': ['Phuket'], 'תל אביב': ['Tel Aviv'],
    'ירושלים': ['Jerusalem'], 'אילת': ['Eilat'], 'לונדון': ['London'],
    'פריז': ['Paris'], 'ניו יורק': ['New York', 'NYC'], 'רומא': ['Rome'],
    'ברצלונה': ['Barcelona'], 'טביליסי': ['Tbilisi'], 'גיאורגיה': ['Georgia'],
    'פטאייה': ['Pattaya'], 'קו צ\'אנג': ['Koh Chang', 'Ko Chang'],
    'קו סמוי': ['Koh Samui', 'Ko Samui'], 'קוסמוי': ['Koh Samui', 'Ko Samui'],
    'צ\'יאנג מאי': ["Chiang Mai"], 'קראבי': ['Krabi'],
    'האה הין': ['Hua Hin'], 'איי סמיי': ['Koh Samui'],
    'טוקיו': ['Tokyo'], 'אוסקה': ['Osaka'], 'קיוטו': ['Kyoto'],
    'דובאי': ['Dubai'], 'סינגפור': ['Singapore'], 'באלי': ['Bali'],
    'אמסטרדם': ['Amsterdam'], 'ברלין': ['Berlin'], 'מדריד': ['Madrid'],
    'ליסבון': ['Lisbon'], 'אתונה': ['Athens'], 'פראג': ['Prague'],
    'וינה': ['Vienna'], 'בודפשט': ['Budapest'], 'ורשה': ['Warsaw'],
    'איסטנבול': ['Istanbul'], 'מרוקו': ['Morocco'], 'מרקש': ['Marrakech'],
    'קהיר': ['Cairo'], 'תאילנד': ['Thailand'], 'יפן': ['Japan'],
};

const getCityKeywords = (cityName: string): string[] => {
    const lowerCity = cityName.toLowerCase();
    for (const [hebrew, englishList] of Object.entries(HEBREW_TO_ENGLISH_CITY_MAP)) {
        // Always include the original input so Hebrew city names match Hebrew city fields.
        if (hebrew.toLowerCase() === lowerCity) return [lowerCity, ...englishList.map(e => e.toLowerCase())];
        if (englishList.some(e => e.toLowerCase() === lowerCity)) return [lowerCity, hebrew.toLowerCase(), ...englishList.map(e => e.toLowerCase())];
    }
    return [lowerCity];
};

const isValidCoordinate = (lat?: number, lng?: number) =>
    typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);

const parseTripDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return new Date(dateStr);
    const parts = dateStr.split('/');
    if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
};

const getItemTimestamp = (item: MapItem): number => {
    if (!item.date) return Infinity;
    const date = parseTripDate(item.date);
    if (!date) return Infinity;
    if (item.time) {
        const [h, m] = item.time.split(':').map(Number);
        date.setHours(h || 0, m || 0);
    }
    return date.getTime();
};

const deg2rad = (deg: number) => deg * (Math.PI / 180);

const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getBearing = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const y = Math.sin(deg2rad(lng2 - lng1)) * Math.cos(deg2rad(lat2));
    const x = Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) - Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(deg2rad(lng2 - lng1));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

const geocodeAddress = async (
    query: string,
    bbox?: [number, number, number, number] | null,
): Promise<{ lat: number; lng: number } | null> => {
    if (!query) return null;
    // Photon (Komoot) is CORS-friendly. Nominatim is blocked on github.io,
    // so browser geocoding stops here instead of logging noisy CORS errors.
    try {
        const bboxParam = bbox ? `&bbox=${bbox.join(',')}` : '';
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1${bboxParam}`);
        if (res.ok) {
            const data = await res.json();
            const coords = data?.features?.[0]?.geometry?.coordinates;
            if (Array.isArray(coords) && coords.length >= 2) {
                const lng = parseFloat(coords[0]);
                const lat = parseFloat(coords[1]);
                if (isFinite(lat) && isFinite(lng)) {
                    // Reject results outside expected country bbox
                    if (bbox && !coordInBbox(lat, lng, bbox)) return null;
                    return { lat, lng };
                }
            }
        }
    } catch {
        return null;
    }
    return null;
};

// ─────────────────────────────────────────────────────────────────────────
// Trip-aware geocoding + coord validation. The "wrong-continent map" bug
// (Koh Chang in Europe, Bangkok in Africa) was caused by three classes of
// stale data slipping past the per-call bbox check:
//   1. localStorage geocode cache from a previous session validated nothing.
//   2. Hotels saved on the trip with wrong-country lat/lng kept those coords.
//   3. Route-stop geocoding called geocodeAddress() without any bbox at all.
// Routing every coord through these helpers fixes all three at once.
// ─────────────────────────────────────────────────────────────────────────

/** Returns the input coords iff they fall inside one of the trip's country
 *  bboxes. If the trip has no resolvable countries (brand-new trip), passes
 *  the coords through unchanged so we don't blank-screen a fresh map. */
const validateCoordsForTrip = (
    lat: number | undefined | null,
    lng: number | undefined | null,
    trip: Trip | null | undefined,
): { lat: number; lng: number } | null => {
    if (!isValidCoordinate(lat, lng)) return null;
    if (!trip) return { lat: lat as number, lng: lng as number };
    const countries = getTripCountries(trip);
    if (countries.size === 0) return { lat: lat as number, lng: lng as number };
    if (!coordInTripCountries(lat as number, lng as number, trip)) return null;
    return { lat: lat as number, lng: lng as number };
};

/** Geocode a query and return coords ONLY if they fall inside one of the
 *  trip's country bboxes. Tries each country bbox as a Photon bias, with
 *  the country name appended to the query for disambiguation. */
const geocodeForTrip = async (
    query: string,
    trip: Trip | null | undefined,
): Promise<{ lat: number; lng: number } | null> => {
    if (!query) return null;
    if (!trip) return geocodeAddress(query);
    const bboxes = getTripCountryBboxes(trip);
    if (bboxes.length === 0) return geocodeAddress(query);
    const countries = [...getTripCountries(trip)];
    // Try each country in order — append country to query, bias bbox.
    for (let i = 0; i < bboxes.length; i++) {
        const country = countries[i];
        const q = country && !query.toLowerCase().includes(country.toLowerCase())
            ? `${query}, ${country}`
            : query;
        const r = await geocodeAddress(q, bboxes[i]);
        if (r && coordInTripCountries(r.lat, r.lng, trip)) return r;
    }
    // Final attempt without bbox bias — but validate the result.
    const fallback = await geocodeAddress(query);
    return fallback && coordInTripCountries(fallback.lat, fallback.lng, trip)
        ? fallback
        : null;
};

/** Validated cache lookup. Returns cached coords ONLY if they pass the
 *  trip-country check. Wrong-country cache entries are dropped (returns
 *  null) so the caller can re-geocode with the new trip-bbox constraint. */
const lookupCachedCoords = (
    cache: Record<string, { lat: number; lng: number }>,
    key: string,
    trip: Trip | null | undefined,
): { lat: number; lng: number } | null => {
    const cached = cache[key];
    if (!cached) return null;
    return validateCoordsForTrip(cached.lat, cached.lng, trip);
};

// --- PREMIUM PIN MARKER ---

const makePinIcon = (
    config: typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG],
    label?: string,
    source: 'saved' | 'ai' = 'saved',
    wrap: boolean = false,
    badge?: { text: string; color: 'amber' | 'blue' | 'emerald' | 'rose' | 'slate' | 'violet' | 'cyan' },
    dayHue?: { c1: string; c2: string },
) => {
    // Day-tinted gradient when active filter narrows to a single day. Lets
    // the same trip "story" through 3 different colors, one per day, so the
    // map reads chronologically at a glance.
    const [c1, c2] = dayHue ? [dayHue.c1, dayHue.c2] : config.gradient;
    // When a label is supplied we render a name pill above the pin so the
    // user can read every place's name at a glance without clicking.
    //   - wrap=false (default): single-line, truncated to 26 chars.
    //   - wrap=true (used for hotel names at city zoom): allow 2-3 lines
    //     of wrap so long names like "KC Grande Resort Koh Chang" don't
    //     overflow into neighbouring pins.
    const trimmed = label ? (wrap ? label : (label.length > 26 ? label.slice(0, 25) + '…' : label)) : '';
    const wrapStyles = wrap
        ? 'white-space:normal;max-width:140px;line-height:1.2;text-align:center;'
        : 'white-space:nowrap;line-height:1.3;';
    const labelHtml = trimmed ? `
        <div style="
            background:${source === 'ai' ? '#ffffffd9' : 'white'};
            border:1px ${source === 'ai' ? 'dashed' : 'solid'} ${c1}${source === 'ai' ? '88' : '55'};border-radius:8px;
            padding:2px 8px;font-size:10px;font-weight:700;color:${source === 'ai' ? '#475569' : '#0f172a'};
            box-shadow:0 2px 6px rgba(15,23,42,0.18);
            font-family:'Rubik','Inter',sans-serif;
            ${wrapStyles}
            margin-bottom:3px;direction:rtl;
        ">${trimmed.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
    ` : '';
    // AI suggestions render hollow: semi-transparent fill + dashed white
    // border. Same hue as saved so the user still recognises the category.
    const fill = source === 'ai'
        ? `linear-gradient(135deg,${c1}66,${c2}66)`
        : `linear-gradient(135deg,${c1},${c2})`;
    const borderStyle = source === 'ai'
        ? '2.5px dashed rgba(255,255,255,0.95)'
        : '2.5px solid rgba(255,255,255,0.8)';
    const iconColor = source === 'ai' ? `${c1}` : 'white';
    // Optional content-bearing badge — small chip overlaid on the upper-right
    // of the pin showing rating ("⭐ 8.4") or nights count ("3 ל'") so users
    // can scan quality without clicking. Color-coded.
    const badgeBg: Record<NonNullable<typeof badge>['color'], string> = {
        amber: '#d97706',
        blue: '#2563eb',
        emerald: '#059669',
        rose: '#dc2626',
        slate: '#64748b',
        violet: '#7c3aed',
        cyan: '#0891b2',
    };
    const badgeHtml = badge ? `
        <div style="
            position:absolute; top:-6px; left:-10px;
            background:${badgeBg[badge.color]}; color:white;
            font-size:9px; font-weight:900; line-height:1;
            padding:3px 6px; border-radius:999px;
            border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.25);
            font-family:'Rubik','Inter',sans-serif; white-space:nowrap;
            z-index:2; pointer-events:none;
        ">${badge.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
    ` : '';

    // The wrapper needs a known width for proper Leaflet anchoring. We use
    // `min-width:44px` (the pin width) so the icon centers on its lat/lng,
    // and `width:max-content` so the label can grow and wrap above.
    const html = `
        <div style="position:relative; min-width:44px; display:inline-flex; flex-direction:column; align-items:center;">
            ${labelHtml}
            <div style="position:relative;">
                ${badgeHtml}
                <div style="
                    width:44px; height:44px; border-radius:50% 50% 50% 0%;
                    transform:rotate(-45deg);
                    background:${fill};
                    box-shadow:0 6px 20px ${c1}${source === 'ai' ? '40' : '60'},0 2px 6px rgba(0,0,0,0.25);
                    display:flex; align-items:center; justify-content:center;
                    border:${borderStyle};
                ">
                    <div style="transform:rotate(45deg); color:${iconColor}; display:flex; align-items:center; justify-content:center; width:22px; height:22px;">
                        ${config.svg}
                    </div>
                </div>
                <div style="
                    width:6px; height:10px; margin:-2px auto 0;
                    background:linear-gradient(to bottom,${c1}${source === 'ai' ? 'aa' : ''},${c2}${source === 'ai' ? 'aa' : ''});
                    clip-path:polygon(50% 100%,0 0,100% 0);
                "></div>
            </div>
        </div>
    `;
    // iconSize=[0,0] lets the divIcon size to its content via inline-flex.
    // iconAnchor anchors at the bottom-center of the 52px-tall pin (52 minus
    // any label height — Leaflet will render relative to actual DOM size).
    return L.divIcon({ html, className: '', iconSize: [0, 0], iconAnchor: [22, 52], popupAnchor: [0, -56] });
};

// --- ROUTE STOP PILL ---
// `nums` is an array so a city visited at multiple chronological points
// (Bangkok start + Bangkok end) renders as ONE pill with two number discs
// instead of two pills stacked on top of each other (one hiding behind the
// other).
const makeStopPill = (
    nums: number[],
    name: string,
    color: string,
    role: 'start' | 'end' | 'middle' | 'roundtrip' = 'middle',
) => {
    // Truncate aggressively so two pills can sit side-by-side without crowding.
    const safeName = (name || '').trim();
    const displayName = safeName.length > 11 ? safeName.slice(0, 10) + '…' : safeName;
    const escapedName = displayName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Role ribbon — appears above stop #1 and the final stop so the user
    // sees the trip's beginning + end at a glance. A round-trip city
    // (start === end) shows a single two-tone ribbon so the green and
    // dark badges no longer stack on the same coords.
    let ribbonHtml = '';
    if (role === 'roundtrip') {
        ribbonHtml = `
            <div style="
                display:inline-flex;align-items:stretch;
                margin-bottom:3px;border-radius:999px;overflow:hidden;
                box-shadow:0 2px 6px rgba(15,23,42,0.25);
                font-family:'Rubik','Inter',sans-serif;
                font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:0.4px;
            ">
                <span style="background:#10b981;color:#fff;padding:1px 6px;">התחלה</span>
                <span style="background:#0f172a;color:#fff;padding:1px 6px;">סיום</span>
            </div>
        `;
    } else {
        const ribbonText = role === 'start' ? 'התחלה' : role === 'end' ? 'סיום' : '';
        const ribbonBg = role === 'start' ? '#10b981' : role === 'end' ? '#0f172a' : '';
        ribbonHtml = ribbonText ? `
            <div style="
                background:${ribbonBg};color:#fff;font-size:8px;font-weight:900;
                text-transform:uppercase;letter-spacing:0.4px;
                padding:1px 6px;border-radius:999px;margin-bottom:3px;
                box-shadow:0 2px 6px rgba(15,23,42,0.25);
                font-family:'Rubik','Inter',sans-serif;
                display:inline-block;
            ">${ribbonText}</div>
        ` : '';
    }
    const ringStyle = role === 'start'
        ? 'box-shadow:0 0 0 2px #10b981,0 3px 10px rgba(15,23,42,0.20);'
        : role === 'end'
            ? 'box-shadow:0 0 0 2px #0f172a,0 3px 10px rgba(15,23,42,0.20);'
            : role === 'roundtrip'
                ? 'box-shadow:0 0 0 2px #10b981, 0 0 0 4px #0f172a, 0 3px 10px rgba(15,23,42,0.20);'
                : 'box-shadow:0 3px 10px rgba(15,23,42,0.18),0 1px 2px rgba(15,23,42,0.08);';

    // Build the number disc(s). 1 → single disc. 2 → two overlapping discs
    // (chain-link). 3+ → first…last, with a tooltip listing all numbers.
    const discStyle = `
        width:22px; height:22px; border-radius:50%;
        background:linear-gradient(135deg,${color},${color}cc);
        color:white; font-weight:900; font-size:12px; line-height:1;
        display:inline-flex; align-items:center; justify-content:center;
        box-shadow:0 2px 5px ${color}55, inset 0 0 0 1.5px rgba(255,255,255,0.92);
        flex-shrink:0;
    `;
    const sortedNums = [...nums].sort((a, b) => a - b);
    let discsHtml: string;
    if (sortedNums.length === 1) {
        discsHtml = `<div style="${discStyle}">${sortedNums[0]}</div>`;
    } else if (sortedNums.length === 2) {
        // Two discs slightly overlapping (-6 px) so they read as a pair.
        discsHtml = `
            <div style="display:inline-flex;align-items:center;flex-shrink:0;">
                <div style="${discStyle}">${sortedNums[0]}</div>
                <div style="${discStyle}margin-right:-6px;border:1.5px solid white;">${sortedNums[1]}</div>
            </div>
        `;
    } else {
        const tooltip = sortedNums.join(', ');
        discsHtml = `
            <div title="עצירות ${tooltip}" style="display:inline-flex;align-items:center;flex-shrink:0;">
                <div style="${discStyle}">${sortedNums[0]}</div>
                <span style="font-size:10px;font-weight:900;color:#475569;margin:0 -2px;">…</span>
                <div style="${discStyle}border:1.5px solid white;">${sortedNums[sortedNums.length - 1]}</div>
            </div>
        `;
    }

    const html = `
        <div style="display:inline-flex;flex-direction:column;align-items:center;">
            ${ribbonHtml}
            <div style="
                display:inline-flex; align-items:center; gap:4px;
                background:white;
                border-radius:999px;
                padding:3px 8px 3px 4px;
                ${ringStyle}
                border:1px solid rgba(255,255,255,0.9);
                white-space:nowrap;
                font-family:'Rubik','Inter',sans-serif;
                direction:rtl;
            ">
                ${discsHtml}
                ${displayName ? `<span style="font-size:10px;font-weight:800;color:#0f172a;letter-spacing:-0.01em;">${escapedName}</span>` : ''}
            </div>
        </div>
    `;
    // Anchor at the bottom-center of the pill. The new pill is roughly
    // 28 px tall (22 px disc + 6 px padding); add ~18 px when a ribbon is present.
    const anchorY = role === 'middle' ? 14 : 32;
    return L.divIcon({ html, className: '', iconSize: [0, 0], iconAnchor: [50, anchorY] });
};

// --- ROUTE INFO BADGE (travel time/distance/mode between stops) ---
interface SegmentTransportInfo {
    mode: 'flight' | 'drive' | 'train' | 'ferry' | 'bus' | 'unknown';
    emoji: string;
    label: string;
    duration?: string;
    hasTransportData: boolean;
}

/** Distance (km) between a flight's endpoint and a route stop. Returns
 *  Infinity when any coord is missing so the caller can treat it as
 *  "no match". */
const endpointDistanceKm = (
    endpointLat: number | undefined, endpointLng: number | undefined,
    stop: RouteStop,
): number => {
    if (!isValidCoordinate(endpointLat, endpointLng) || !stop.coords) return Infinity;
    return getDistanceKm(endpointLat!, endpointLng!, stop.coords.lat, stop.coords.lng);
};

// Generous proximity radius — Bangkok metro alone is ~50 km wide, BKK is
// 25 km out of centre, so 120 km was leaving real flight matches behind.
// 200 km still rules out flights that aren't part of the same trip leg.
const AIRPORT_PROXIMITY_KM = 200;

// Minimum leg distance before we'll *infer* flight mode in the absence of
// any matching transport record. Within Thailand most travel under ~600 km
// is by road (Bangkok-Pattaya is 150 km, Bangkok-Koh Chang ~315 km — both
// drives). Above 600 km it's almost always a flight.
const FLIGHT_INFERENCE_DIST_KM = 600;

const stopCheckTs = (s: RouteStop): number | null => {
    if (!s.date) return null;
    const t = new Date(s.date).getTime();
    return isFinite(t) && t > 0 ? t : null;
};

const getSegmentTransport = (
    fromStop: RouteStop, toStop: RouteStop, trip: Trip, distKm: number,
    airportCoords: Record<string, { lat: number; lng: number }>,
): SegmentTransportInfo => {
    // 1. Flight match — multi-signal so a flight record matches even when
    //    its airport hasn't been geocoded yet:
    //      • geographic proximity (both endpoints within 200 km of the
    //        flight's airports)
    //      • OR an exact city/IATA code string match
    //      • OR the flight's departure date sits inside the leg window
    //        (between fromStop's date and toStop's date) AND at least one
    //        endpoint is geographically close — catches "drive to TDX,
    //        fly TDX → BKK, drive to Bangkok hotel" where the leg's
    //        endpoints are the hotels (not the airports).
    const segs = trip.flights?.segments || [];
    const fromTs = stopCheckTs(fromStop);
    const toTs = stopCheckTs(toStop);
    const fromName = fromStop.name.toLowerCase();
    const toName = toStop.name.toLowerCase();
    const matchedFlight = segs.find(s => {
        const fromKey = (s.fromCode || s.fromCity || '').toLowerCase();
        const toKey = (s.toCode || s.toCity || '').toLowerCase();
        const fromC = airportCoords[fromKey] || airportCoords[(s.fromCity || '').toLowerCase()];
        const toC = airportCoords[toKey] || airportCoords[(s.toCity || '').toLowerCase()];

        const fromDist = endpointDistanceKm(fromC?.lat, fromC?.lng, fromStop);
        const toDist = endpointDistanceKm(toC?.lat, toC?.lng, toStop);

        // Substring matches handle Hebrew vs English city names, "Trat
        // Airport" vs "Trat", and "Bangkok Hotels" vs "Bangkok".
        const flightFromCity = (s.fromCity || '').toLowerCase();
        const flightToCity = (s.toCity || '').toLowerCase();
        const fromStr =
            (flightFromCity && (flightFromCity.includes(fromName) || fromName.includes(flightFromCity))) ||
            (s.fromCode?.toLowerCase() === (fromStop.code?.toLowerCase() || '') && !!s.fromCode);
        const toStr =
            (flightToCity && (flightToCity.includes(toName) || toName.includes(flightToCity))) ||
            (s.toCode?.toLowerCase() === (toStop.code?.toLowerCase() || '') && !!s.toCode);

        // Primary: both endpoints geographically near the stops.
        if (fromDist <= AIRPORT_PROXIMITY_KM && toDist <= AIRPORT_PROXIMITY_KM) return true;

        // Two-sided string match (or one geographic + one string).
        if (fromStr && toStr) return true;
        if (fromStr && toDist <= AIRPORT_PROXIMITY_KM) return true;
        if (toStr && fromDist <= AIRPORT_PROXIMITY_KM) return true;

        // Date-window match: when the flight date sits inside the leg
        // window (or within ±1 day), one strong signal on either side is
        // enough. Catches "Koh Chang → Bangkok" where the Trat → BKK
        // flight's fromCity ("Trat") doesn't string-match "Koh Chang"
        // but its toCity ("Bangkok") matches the toStop, and its date
        // falls between the stops' check-dates.
        if (s.date && (fromTs || toTs)) {
            const sTs = new Date(s.date).getTime();
            const lowTs = (fromTs ?? toTs)! - 24 * 3600 * 1000;
            const highTs = (toTs ?? fromTs)! + 24 * 3600 * 1000;
            if (isFinite(sTs) && sTs >= lowTs && sTs <= highTs) {
                if (fromStr || toStr || fromDist <= AIRPORT_PROXIMITY_KM || toDist <= AIRPORT_PROXIMITY_KM) {
                    return true;
                }
            }
        }

        return false;
    });
    if (matchedFlight) return {
        mode: 'flight', emoji: '✈️',
        label: `${matchedFlight.airline || ''} ${matchedFlight.flightNumber || ''}`.trim() || 'טיסה',
        duration: matchedFlight.duration, hasTransportData: true,
    };

    // 2. Train / ferry / bus — same logic as before, cheap string contains.
    const matchedTrain = trip.trains?.find(t =>
        (t.fromStation?.toLowerCase() || '').includes(fromStop.name.toLowerCase()) ||
        (t.toStation?.toLowerCase() || '').includes(toStop.name.toLowerCase())
    );
    if (matchedTrain) return { mode: 'train', emoji: '🚆', label: matchedTrain.provider || 'רכבת', duration: matchedTrain.duration, hasTransportData: true };

    const matchedFerry = trip.ferries?.find(f =>
        (f.fromPort?.toLowerCase() || '').includes(fromStop.name.toLowerCase()) ||
        (f.toPort?.toLowerCase() || '').includes(toStop.name.toLowerCase())
    );
    if (matchedFerry) return { mode: 'ferry', emoji: '⛴️', label: matchedFerry.provider || 'מעבורת', hasTransportData: true };

    const matchedBus = trip.buses?.find(b =>
        (b.fromCity?.toLowerCase() || '').includes(fromStop.name.toLowerCase()) ||
        (b.toCity?.toLowerCase() || '').includes(toStop.name.toLowerCase())
    );
    if (matchedBus) return { mode: 'bus', emoji: '🚌', label: matchedBus.provider || 'אוטובוס', hasTransportData: true };

    // 2b. Unified transports — manual transfers, ferries, drives the user
    //     added via "+ הוסף הסעה". Cheap city-name match against the leg.
    const matchedTransport = trip.transports?.find(t => {
        const fLow = (t.from || '').toLowerCase();
        const tLow = (t.to || '').toLowerCase();
        const fromName = fromStop.name.toLowerCase();
        const toName = toStop.name.toLowerCase();
        return (fLow.includes(fromName) || fromName.includes(fLow)) &&
               (tLow.includes(toName) || toName.includes(tLow));
    });
    if (matchedTransport) {
        const style = MODE_COLORS[matchedTransport.mode] || MODE_COLORS.drive;
        return {
            mode: matchedTransport.mode === 'cruise' || matchedTransport.mode === 'transfer' || matchedTransport.mode === 'car_rental' ? 'drive' : matchedTransport.mode as any,
            emoji: style.emoji,
            label: matchedTransport.provider || style.label,
            duration: matchedTransport.duration,
            hasTransportData: true,
        };
    }

    // 3. Long-haul inference: when no transport record matches BUT the leg
    //    spans more than ~600 km, treat it as a flight. Within Thailand
    //    everyone flies that distance (and globally too). Without this the
    //    final Koh Chang → Bangkok hotel leg shows as a 'drive' even when
    //    the user took TDX → BKK because the trip records the flight only
    //    as a date-tagged segment whose airports differ from the hotel
    //    stops at both ends.
    if (distKm >= FLIGHT_INFERENCE_DIST_KM) {
        return { mode: 'flight', emoji: '✈️', label: 'טיסה', hasTransportData: false };
    }

    // 4. Default: drive. The user's convention is "if no flight is recorded,
    //    we're driving." We mark `hasTransportData: false` so the renderer
    //    can choose to soften the colour for unconfirmed inferences.
    return { mode: 'drive', emoji: '🚗', label: 'נסיעה', hasTransportData: false };
};

/**
 * Zoom-tiered label level. The map decides what's visible based on this
 * value; matches the patterns Mapbox / Apple Maps / Polarsteps use.
 *   0 — country/world: only polyline + START/END markers
 *   1 — regional: + numbered route stops
 *   2 — metro: + hotel pins (icons only, no names) + segment emoji only
 *   3 — city: + restaurants/attractions + hotel names with wrap + segment emoji+duration
 *   4 — street: full labels everywhere, segment emoji+duration+distance
 */
const labelTier = (z: number): 0 | 1 | 2 | 3 | 4 => {
    if (z >= 14) return 4;
    if (z >= 12) return 3;
    if (z >= 10) return 2;
    if (z >= 8)  return 1;
    return 0;
};

// ============================================================
export const UnifiedMapView: React.FC<UnifiedMapViewProps> = ({
    trip,
    items,
    height = "75vh",
    layers,
    tileTheme = 'light',
    compactView = false,
    embedded = false,
    activeCity: controlledActiveCity,
    walkingCircles = false,
    heatmap = false,
    flyTo = null,
    onAddToList,
    savedNames,
    onUpdateTrip,
    onItemsResolved,
}) => {
    // Default every layer flag to TRUE so the existing per-tab callers
    // (RestaurantsView / AttractionsView) keep working without passing
    // `layers`. The new FullTripMapView wrapper passes explicit flags.
    const layerFlags = {
        route: layers?.route ?? true,
        hotels: layers?.hotels ?? true,
        myLists: layers?.myLists ?? true,
        aiRestaurants: layers?.aiRestaurants ?? true,
        aiAttractions: layers?.aiAttractions ?? true,
    };
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.LayerGroup | null>(null);
    const routeLayerRef = useRef<L.LayerGroup | null>(null);
    const locateMarkerRef = useRef<L.CircleMarker | null>(null);
    // Mirror of geocodedCache as a ref so the mapItems-building useEffect can
    // pre-populate coordinates from cache without listing it as a dependency
    // (which would cause infinite render loops). Initialized directly from
    // localStorage so it's populated before any effect fires on first mount.
    const geocodedCacheRef = useRef<Record<string, { lat: number; lng: number }>>(loadGeoCache());

    const [mapItems, setMapItems] = useState<MapItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [geocodeProgress, setGeocodeProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
    const [activeCity, setActiveCity] = useState<string | 'ALL'>('ALL');
    const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
    const [activeStop, setActiveStop] = useState<number | null>(null);
    // "Fix location" modal state — set by the hotel popup's "תקן מיקום" pill.
    // Only meaningful when `onUpdateTrip` is wired through.
    const [fixLocationFor, setFixLocationFor] = useState<{ hotelId: string; hotelName: string } | null>(null);
    // Zoom-gated visibility (Issue 2 polish): at low/regional zoom levels
    // only the trip backbone (hotels + flights + route polyline) is shown.
    // Restaurants and attractions appear as the user zooms in, so the
    // first-glance picture is clean and the trip route reads instantly.
    const [mapZoom, setMapZoom] = useState<number>(8);
    // Snap-back protection — true once the user has manually panned/zoomed.
    // applyBounds() respects this and skips re-fitting the trip view.
    const userInteractedRef = useRef(false);
    // Popup-protection — true while a Leaflet popup is open. The marker-render
    // effect skips its rebuild while this is true so flyTo's zoom-end doesn't
    // tear the popup down a second after it appeared. After the popup closes
    // we bump `popupRebuildToken` to fire one fresh render with the latest
    // tier/visibility state.
    const popupOpenRef = useRef(false);
    const [popupRebuildToken, setPopupRebuildToken] = useState(0);
    // Reset only on a different trip — that's the one context where a
    // brand-new auto-fit is unambiguously desired. activeCity changes used
    // to also reset this ref, but doing so caused a race: when a chip click
    // both (a) bumped activeCity and (b) dispatched a setFlyTo, the reset
    // ran first → marker effect's applyBounds snapped the camera with the
    // OLD bounds → then flyTo animated to the right place. Net result was
    // the user perceiving "needs two taps to zoom in". The chip handlers in
    // FullTripMapView and UnifiedMapView's own internal handleCityPillClick
    // already drive the camera explicitly, so applyBounds should NOT also
    // re-fit on activeCity change.
    useEffect(() => {
        userInteractedRef.current = false;
    }, [trip?.id]);

    // Sync externally-controlled city → internal state. When
    // `controlledActiveCity` is `undefined` the component manages its own
    // city state (existing per-tab callers). `null` means "all cities".
    useEffect(() => {
        if (controlledActiveCity === undefined) return;
        setActiveCity(controlledActiveCity ?? 'ALL');
    }, [controlledActiveCity]);

    // Dedicated city flyTo — sole authority for "tap a chip → camera moves".
    //
    // Strategy, in priority order:
    //   1. PREFERRED: fit the resolved hotel bounds for that city. The user
    //      cares about "where am I staying", not the abstract city centroid.
    //   2. FALLBACK: geocoded city centroid + zoom 13 (existing behaviour).
    //
    // Re-fires when `mapItems` changes — so as soon as a hotel for the
    // currently-active city resolves, the camera updates from "centroid
    // fallback" to the tighter hotel bounds. Without this dep, the user
    // had to click the chip a second time to re-trigger the effect once
    // their hotels finished geocoding.
    useEffect(() => {
        if (!controlledActiveCity) return; // null → ALL view, nothing to fly to
        const map = mapInstanceRef.current;
        if (!map) return;

        // 1. Prefer the user's actual hotel bounds in this city.
        const targetKey = cityKey(controlledActiveCity);
        const cityHotels = mapItems.filter(i =>
            i.type === 'hotel'
            && isValidCoordinate(i.lat, i.lng)
            && cityKey(i.city || '') === targetKey,
        );
        if (cityHotels.length > 0) {
            const b = L.latLngBounds(cityHotels.map(h => [h.lat as number, h.lng as number] as [number, number]));
            if (b.isValid()) {
                map.stop();
                userInteractedRef.current = true; // suppress applyBounds racing
                map.flyToBounds(b, { padding: [60, 60], maxZoom: 14, duration: 1.0 });
                // eslint-disable-next-line no-console
                console.info(`[CityFly] ${controlledActiveCity} → ${cityHotels.length} hotel(s) bounds`);
                return;
            }
        }

        // 2. Fallback: geocoded city centroid.
        const tripBbox = trip
            ? (getTripCountryBbox(trip) || getCountryBbox(trip.destinationEnglish || trip.destination || ''))
            : null;
        const countryName = toEnglishCountryName(trip?.destinationEnglish || trip?.destination || '');

        const cacheKey = `city:${controlledActiveCity}`;
        const cached = geocodedCacheRef.current[cacheKey];
        if (cached) {
            if (tripBbox && !coordInBbox(cached.lat, cached.lng, tripBbox)) {
                delete geocodedCacheRef.current[cacheKey];
            } else {
                map.stop();
                userInteractedRef.current = true;
                map.flyTo([cached.lat, cached.lng], 13, { duration: 1 });
                // eslint-disable-next-line no-console
                console.info(`[CityFly] ${controlledActiveCity} → cached centroid (no hotels yet)`);
                return;
            }
        }

        const keywords = getCityKeywords(controlledActiveCity);
        const baseQuery = keywords.find(k => /^[a-z]/i.test(k) && k !== controlledActiveCity.toLowerCase())
            ?? controlledActiveCity;
        const query = countryName && !baseQuery.toLowerCase().includes(countryName.toLowerCase())
            ? `${baseQuery}, ${countryName}` : baseQuery;

        geocodeAddress(query, tripBbox).then(coords => {
            if (!coords) return;
            const m = mapInstanceRef.current;
            if (!m) return;
            setGeocodedCache(prev => {
                const next = { ...prev, [cacheKey]: coords };
                saveGeoCache(next);
                return next;
            });
            m.stop();
            userInteractedRef.current = true;
            m.flyTo([coords.lat, coords.lng], 13, { duration: 1 });
            // eslint-disable-next-line no-console
            console.info(`[CityFly] ${controlledActiveCity} → geocoded centroid (no hotels resolved)`);
        });
    }, [controlledActiveCity, mapItems, trip]); // eslint-disable-line react-hooks/exhaustive-deps

    const [geocodedCache, setGeocodedCache] = useState<Record<string, { lat: number; lng: number }>>(loadGeoCache);

    // Keep geocodedCacheRef in sync so the mapItems useEffect can read it.
    useEffect(() => { geocodedCacheRef.current = geocodedCache; }, [geocodedCache]);

    // ─────────────────────────────────────────────────────────────────
    // Stale-cache scrub. localStorage `geocodedCache` accumulates entries
    // across trips — including the Africa-positioned "Bangkok" or
    // Europe-positioned "Koh Chang" results that caused the bug. When
    // the active trip changes, drop any cache entry whose coords don't
    // belong to the trip's countries. The next geocode call will redo
    // them with the correct bbox bias.
    // ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!trip) return;
        const tripCountries = getTripCountries(trip);
        if (tripCountries.size === 0) return; // no resolvable country — skip
        const dirty: string[] = [];
        for (const [k, v] of Object.entries(geocodedCache)) {
            if (!coordInTripCountries(v.lat, v.lng, trip)) dirty.push(k);
        }
        if (dirty.length === 0) return;
        console.warn(`[Map] Scrubbing ${dirty.length} stale geocode-cache entries that fall outside trip countries`, dirty);
        setGeocodedCache(prev => {
            const next = { ...prev };
            dirty.forEach(k => { delete next[k]; });
            saveGeoCache(next);
            return next;
        });
    }, [trip?.id, trip?.destination, trip?.destinationEnglish, trip?.hotels?.length]); // eslint-disable-line react-hooks/exhaustive-deps

    // Warm the city-bbox cache for every trip city on mount. Required so the
    // synchronous coordInTripCities() check in the marker filter has data to
    // work with — otherwise the first map render passes everything through.
    useEffect(() => {
        if (!trip) return;
        let cancelled = false;
        getTripCityBboxes(trip).then(() => {
            if (!cancelled) {
                // Bump a counter to force the marker effect to re-run now
                // that the cache has been warmed.
                setCityBboxTick(v => v + 1);
            }
        }).catch(() => { /* network failure — fall back to permissive mode */ });
        return () => { cancelled = true; };
    }, [trip?.id, trip?.destination, trip?.destinationEnglish, trip?.hotels?.length]); // eslint-disable-line react-hooks/exhaustive-deps
    const [cityBboxTick, setCityBboxTick] = useState(0);

    // 1. Build raw map items from trip data
    useEffect(() => {
        if (!trip && !items) return;
        let raw: MapItem[] = [];

        // Country bbox — used to reject coordinates that landed in the wrong
        // country (e.g. Photon returning a Norwegian village for "Koh Chang").
        // Use the trip-scope helper so multi-city destinations like
        // "Bangkok - Pattaya - Koh Chang" still resolve a country.
        const tripBbox = trip
            ? (getTripCountryBbox(trip) || getCountryBbox(trip.destinationEnglish || trip.destination || ''))
            : null;
        const inCountry = (lat?: number, lng?: number) =>
            !tripBbox || !isValidCoordinate(lat, lng) || coordInBbox(lat!, lng!, tripBbox);

        if (items) {
            raw = items;
        } else if (trip) {
            // Flights — gated by `route` layer (FullTripMapView toggles it
            // off when the user only wants pins, no transit overlay).
            if (layerFlags.route) {
                const segs = [...(trip.flights?.segments || [])].sort((a, b) =>
                    (parseTripDate(a.date)?.getTime() || 0) - (parseTripDate(b.date)?.getTime() || 0)
                );
                const originCode = segs[0]?.fromCode;
                segs.forEach(seg => {
                    if (seg.fromCode !== originCode) {
                        raw.push({ id: `f-${seg.flightNumber}-dep`, type: 'airport', subType: 'departure', flightId: seg.flightNumber, name: `${seg.fromCity || seg.fromCode}`, date: seg.date, time: seg.departureTime, city: seg.fromCity });
                    }
                    if (seg.toCode !== originCode) {
                        raw.push({ id: `f-${seg.flightNumber}-arr`, type: 'airport', subType: 'arrival', flightId: seg.flightNumber, name: `${seg.toCity || seg.toCode}`, date: seg.date, time: seg.arrivalTime, city: seg.toCity });
                    }
                });
            }

            // Hotels — always-on anchor reference (per Round 9c) unless
            // explicitly disabled via the layers prop.
            if (layerFlags.hotels) {
                trip.hotels?.forEach(h => {
                    const city = cleanCityName(extractRobustCity(h.address || '', h.name || '', trip));
                    // URL coords ALWAYS win when available. The googleMapsUrl is
                    // the user's own bookmark — it points to the right place by
                    // construction. Saved h.lat/h.lng can be stale results from
                    // an old name-based geocode run that resolved the same name
                    // to a different place (real-world example: KC Grande
                    // Resort Koh Chang resolved to a south-island POI; the URL
                    // !3d!4d had the correct north-island coords). The previous
                    // 2km tolerance let drifted-but-not-by-much saved coords
                    // win — too loose. Now: URL > saved > geocode-cache.
                    // FULL hotel-record dump as a JSON STRING so the console
                    // can't collapse fields with "…". Need every field visible
                    // to find any URL-like data hidden in an unexpected key.
                    try {
                        const safe = JSON.parse(JSON.stringify(h, (_k, v) => {
                            if (Array.isArray(v) && v.length > 3) return `[Array(${v.length})]`;
                            return v;
                        }));
                        // eslint-disable-next-line no-console
                        console.info(`[HotelRecord] ${h.name}`, JSON.stringify(safe));
                    } catch { /* never throw from a log */ }

                    // Try multiple URL-like fields, not just googleMapsUrl.
                    const candidateUrls: Array<string | undefined> = [
                        h.googleMapsUrl,
                        (h as any).mapsUrl,
                        (h as any).url,
                        (h as any).link,
                        (h as any).bookingUrl,
                    ];
                    let urlCoords: { lat: number; lng: number } | null = null;
                    let urlSource = '';
                    for (const candidate of candidateUrls) {
                        const c = extractCoordsFromMapsUrl(candidate);
                        if (c) { urlCoords = c; urlSource = candidate || ''; break; }
                    }

                    let finalLat = h.lat;
                    let finalLng = h.lng;
                    try {
                        const sLat = typeof h.lat === 'number' ? h.lat.toFixed(4) : 'n/a';
                        const sLng = typeof h.lng === 'number' ? h.lng.toFixed(4) : 'n/a';
                        const uStr = urlCoords ? `(${urlCoords.lat.toFixed(4)}, ${urlCoords.lng.toFixed(4)})` : 'none';
                        const urlPreview = urlSource ? urlSource.slice(0, 100) : '';
                        // eslint-disable-next-line no-console
                        console.info(`[Hotel] ${h.name} | saved=(${sLat}, ${sLng}) | url=${uStr}${urlPreview ? ` | from="${urlPreview}…"` : ''}`);
                    } catch { /* never throw from a log */ }

                    if (urlCoords) {
                        finalLat = urlCoords.lat;
                        finalLng = urlCoords.lng;
                    }
                    raw.push({
                        id: h.id, type: 'hotel', name: h.name, address: h.address,
                        lat: finalLat, lng: finalLng, description: h.roomType, date: h.checkInDate, city,
                        imageUrl: h.imageUrl,
                        notes: h.notes,
                        googleMapsUrl: h.googleMapsUrl,
                        priceRange: h.price,
                        recommendationSource: h.bookingSource,
                    });
                });
            }

            // Saved restaurants + attractions ("my lists")
            if (layerFlags.myLists) {
                trip.restaurants?.forEach(cat => cat.restaurants?.forEach(r => {
                    const city = r.location?.split(',')?.[1]?.trim() || trip.destination;
                    raw.push({
                        id: r.id, type: 'restaurant', name: getEnglishName({ name: r.name, nameEnglish: (r as any).nameEnglish, location: r.location }), address: r.location,
                        lat: r.lat, lng: r.lng, description: r.description,
                        date: r.reservationDate, time: r.reservationTime, city,
                        rating: typeof r.googleRating === 'number' ? r.googleRating : undefined,
                        cuisine: r.cuisine, recommendationSource: r.recommendationSource,
                        priceRange: r.priceRange || r.price || r.priceLevel,
                        imageUrl: r.imageUrl, notes: r.notes, googleMapsUrl: r.googleMapsUrl,
                    });
                }));

                trip.attractions?.forEach(cat => cat.attractions?.forEach(a => {
                    const city = a.location?.split(',')?.[1]?.trim() || trip.destination;
                    raw.push({
                        id: a.id, type: 'attraction', name: getEnglishName({ name: a.name, nameEnglish: (a as any).nameEnglish, location: a.location }), address: a.location,
                        lat: a.lat, lng: a.lng, description: a.description,
                        date: a.scheduledDate, time: a.scheduledTime, city,
                        rating: typeof a.rating === 'number' ? a.rating : undefined,
                        category: a.type || a.categoryTitle,
                        recommendationSource: a.recommendationSource, priceRange: a.price,
                        imageUrl: a.imageUrl, notes: a.notes, googleMapsUrl: a.googleMapsUrl,
                    });
                }));
            }

            // AI restaurant recommendations — opt-in layer.
            // Filter out items not in trip scope so legacy/hallucinated AI data
            // (Banff, Paris on a Thailand trip) doesn't pollute the map or
            // get fed into geocoding lookups.
            if (layerFlags.aiRestaurants) {
                trip.aiRestaurants?.forEach(cat => {
                    const city = (cat as any).region || cat.title || trip.destination;
                    cat.restaurants?.forEach(r => {
                        if (!isPlaceInTripScope(trip, { location: r.location, region: r.region || city })) return;
                        raw.push({
                            id: r.id, type: 'restaurant', name: getEnglishName({ name: r.name, nameEnglish: (r as any).nameEnglish, location: r.location }), address: r.location,
                            lat: r.lat, lng: r.lng, description: r.description, city,
                            rating: typeof r.googleRating === 'number' ? r.googleRating : undefined,
                            cuisine: r.cuisine, recommendationSource: r.recommendationSource,
                            priceRange: r.priceRange || r.price || r.priceLevel,
                            imageUrl: r.imageUrl, notes: r.notes, googleMapsUrl: r.googleMapsUrl,
                        });
                    });
                });
            }

            // AI attraction recommendations — opt-in layer (same scope filter).
            if (layerFlags.aiAttractions) {
                trip.aiAttractions?.forEach(cat => {
                    const city = (cat as any).region || cat.title || trip.destination;
                    cat.attractions?.forEach(a => {
                        if (!isPlaceInTripScope(trip, { location: a.location, region: a.region || city, description: a.description })) return;
                        raw.push({
                            id: a.id, type: 'attraction', name: getEnglishName({ name: a.name, nameEnglish: (a as any).nameEnglish, location: a.location }), address: a.location,
                            lat: a.lat, lng: a.lng, description: a.description, city,
                            rating: typeof a.rating === 'number' ? a.rating : undefined,
                            category: a.type || a.categoryTitle,
                            recommendationSource: a.recommendationSource, priceRange: a.price,
                            imageUrl: a.imageUrl, notes: a.notes, googleMapsUrl: a.googleMapsUrl,
                        });
                    });
                });
            }

            // Shopping
            // Legacy 'shoppingItems' removed from the schema — pin rendering dropped.
            trip.shoppingItems?.forEach((_s: any) => {
            });
        }

        // STRICT TRIP-COUNTRY WHITELIST (A7.2): drop ENTIRE items that don't
        // belong to the trip's countries. The previous behavior only stripped
        // lat/lng, which left ghost pins floating to the wrong country once
        // they re-geocoded. Now: out-of-country items don't reach the map at
        // all. Permissive when the trip-country set is empty (brand-new trip).
        const tripCountriesForFilter = getTripCountries(trip || ({} as Trip));
        let droppedOutOfCountry = 0;
        if (tripCountriesForFilter.size > 0 && trip) {
            const filtered: MapItem[] = [];
            for (const item of raw) {
                if (item.type === 'airport') {
                    // Airport items: filter by city → country lookup.
                    const cityCountry = item.city
                        ? (() => {
                              try {
                                  const { getCountryForCity } = require('../utils/geoData');
                                  return getCountryForCity?.(item.city) || null;
                              } catch { return null; }
                          })()
                        : null;
                    if (cityCountry && !tripCountriesForFilter.has(cityCountry)) {
                        droppedOutOfCountry += 1;
                        continue;
                    }
                    filtered.push(item);
                    continue;
                }
                // Hotels / restaurants / attractions: use the strict predicate.
                const ok = placeInTripCountries(trip, {
                    lat: item.lat,
                    lng: item.lng,
                    location: item.address,
                    region: item.city,
                });
                if (!ok) {
                    droppedOutOfCountry += 1;
                    // Also strip cached coords so a later re-geocode can retry
                    // with the new bbox constraint.
                    continue;
                }
                // Even when kept: if cached coords disagree with bbox, clear
                // them so the geocoder gets another shot.
                if (isValidCoordinate(item.lat, item.lng) && !inCountry(item.lat, item.lng)) {
                    item.lat = undefined;
                    item.lng = undefined;
                }
                filtered.push(item);
            }
            raw = filtered;
        } else {
            // Legacy permissive path: keep items, just strip wrong-country coords.
            raw.forEach(item => {
                if (item.type === 'airport') return;
                if (!inCountry(item.lat, item.lng)) {
                    item.lat = undefined;
                    item.lng = undefined;
                }
            });
        }
        if (droppedOutOfCountry > 0) {
            console.info(`[Map] Dropped ${droppedOutOfCountry} items outside trip countries`);
        }

        // STRICT TRIP-CITY WHITELIST: tighter than country. Drops AI
        // restaurants/attractions whose lat/lng fall inside the country
        // (e.g. Thailand) but OUTSIDE any of the user's trip cities
        // (Bangkok / Pattaya / Koh Chang). This catches chain restaurants
        // and same-named attractions that Photon resolved to a different
        // city. Hotels are NEVER filtered this way — the user explicitly
        // booked them, even if their address is in a sub-area we don't
        // recognize as a "city".
        if (trip && cityBboxTick > 0) { // only after city bboxes are warmed
            const beforeLen = raw.length;
            raw = raw.filter(item => {
                if (item.type === 'airport' || item.type === 'hotel') return true;
                if (!isValidCoordinate(item.lat, item.lng)) return true; // not yet geocoded
                return coordInTripCities(item.lat as number, item.lng as number, trip);
            });
            const dropped = beforeLen - raw.length;
            if (dropped > 0) {
                console.info(`[Map] Dropped ${dropped} AI items outside trip cities (in-country but wrong-city)`);
            }
        }

        // Assign chronological order
        const sorted = [...raw].sort((a, b) => getItemTimestamp(a) - getItemTimestamp(b));
        sorted.forEach((item, i) => { item.order = i + 1; });

        // Pre-populate coordinates from geocoding cache so items that were
        // resolved in a previous session show immediately without re-geocoding.
        // Uses a ref (not state) to avoid adding geocodedCache as a dependency
        // which would create an infinite render loop.
        const cacheSnap = geocodedCacheRef.current;
        sorted.forEach(item => {
            if (!isValidCoordinate(item.lat, item.lng) && item.address && cacheSnap[item.address]) {
                const cached = cacheSnap[item.address];
                // Skip cached coords outside the trip's country — they were
                // geocoded before bbox validation existed and will be re-resolved.
                if (tripBbox && !coordInBbox(cached.lat, cached.lng, tripBbox)) return;
                item.lat = cached.lat;
                item.lng = cached.lng;
            }
        });

        setMapItems(sorted);
    }, [trip, items, layerFlags.route, layerFlags.hotels, layerFlags.myLists, layerFlags.aiRestaurants, layerFlags.aiAttractions, cityBboxTick]);

    // 2. Geocode missing items — batched 5-concurrent to cut wait from 7s → ~2s.
    //    Items appear on the map progressively as each batch resolves.
    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            const pending = mapItems.filter(i => !isValidCoordinate(i.lat, i.lng) && i.address);
            if (pending.length === 0) return;
            setLoading(true);
            setGeocodeProgress({ done: 0, total: pending.length });

            // Country bbox for this trip — constrains Photon queries and
            // validates results so wrong-country coords never reach the map.
            const tripBbox = trip
                ? (getTripCountryBbox(trip) || getCountryBbox(trip.destinationEnglish || trip.destination || ''))
                : null;

            const BATCH_SIZE = 5;
            for (let batchStart = 0; batchStart < pending.length; batchStart += BATCH_SIZE) {
                const batch = pending.slice(batchStart, batchStart + BATCH_SIZE);
                const batchResults = await Promise.all(batch.map(async item => {
                    const cacheKey = item.address!;
                    const bbox = item.type !== 'airport' ? tripBbox : null;

                    // 1. Try Google Maps URL first — embedded coords are exact and
                    //    require no HTTP round-trip. User confirmed navigation links
                    //    already point to the correct location.
                    if (item.googleMapsUrl) {
                        const fromUrl = extractCoordsFromMapsUrl(item.googleMapsUrl);
                        if (fromUrl && (!bbox || coordInBbox(fromUrl.lat, fromUrl.lng, bbox))) {
                            return { itemId: item.id, cacheKey, coords: fromUrl };
                        }
                    }

                    // 2. Fallback: Photon geocoding with country bbox constraint.
                    let q = item.type === 'airport' ? `${item.name} Airport` : cacheKey;
                    // Append city if not already present in the address — prevents geocoder from
                    // resolving restaurant/attraction names to same-named places in other cities.
                    if ((item.type === 'restaurant' || item.type === 'attraction') && item.city) {
                        if (!q.toLowerCase().includes(item.city.toLowerCase())) {
                            q = `${q}, ${item.city}`;
                        }
                    }
                    const coords = await geocodeAddress(q, bbox);
                    return { itemId: item.id, cacheKey, coords };
                }));

                if (cancelled) return;

                // Apply resolved coords immediately so pins appear as each batch lands
                const newEntries: Record<string, { lat: number; lng: number }> = {};
                batchResults.forEach(r => { if (r.coords) newEntries[r.cacheKey] = r.coords; });

                if (Object.keys(newEntries).length > 0) {
                    setGeocodedCache(prev => {
                        const next = { ...prev, ...newEntries };
                        saveGeoCache(next);
                        return next;
                    });
                    setMapItems(prev => prev.map(i => {
                        const entry = batchResults.find(r => r.itemId === i.id);
                        if (!entry?.coords) return i;
                        return { ...i, lat: entry.coords.lat, lng: entry.coords.lng };
                    }));
                }

                if (cancelled) return;
                setGeocodeProgress(p => ({ ...p, done: Math.min(p.total, p.done + batch.length) }));
                if (batchStart + BATCH_SIZE < pending.length) {
                    await new Promise(r => setTimeout(r, 200));
                }
            }

            if (!cancelled) {
                setLoading(false);
                setGeocodeProgress({ done: 0, total: 0 });
            }
        };
        run();
        return () => { cancelled = true; };
    }, [mapItems.length]);

    // 2a. Notify the wrapper of resolved items so it can compute city bounds
    //     for the chip-strip click handler. Fires whenever the resolved-coord
    //     subset of mapItems changes — INCLUDING during geocoding, so the
    //     wrapper has a partial snapshot the moment any item resolves. The
    //     earlier `if (loading) return;` gate caused chip clicks to silently
    //     do nothing on the user's trip (no saved hotel coords → loading
    //     stays true the whole time you're trying to interact).
    useEffect(() => {
        if (!onItemsResolved) return;
        const resolved = mapItems
            .filter(i => isValidCoordinate(i.lat, i.lng))
            .map(i => ({ id: i.id, type: i.type, name: i.name, lat: i.lat as number, lng: i.lng as number, city: i.city }));
        onItemsResolved(resolved);
    }, [mapItems, onItemsResolved]);

    // 2b. AI sanity check — runs after geocoding settles. The deterministic
    //     bbox check above catches the common case (Photon returning a place
    //     in the wrong country); this AI pass catches the rare case of coords
    //     that technically fall inside the country but at a wildly wrong
    //     position. Any pin the AI flags as out-of-country gets dropped and
    //     a single toast notifies the user.
    useEffect(() => {
        if (!trip) return;
        if (mapItems.length === 0) return;
        if (loading) return; // wait for geocoding to settle
        const tripCountries = [...getTripCountries(trip)];
        if (tripCountries.length === 0) return;

        // Run once per stable item set. Cancel-safe via the ref check inside.
        let cancelled = false;
        const runId = Math.random().toString(36).slice(2);
        const run = async () => {
            const verifiable = mapItems
                .filter(i => isValidCoordinate(i.lat, i.lng) && i.type !== 'airport')
                .map(i => ({ id: i.id, name: i.name, lat: i.lat as number, lng: i.lng as number }));
            if (verifiable.length === 0) return;

            try {
                const { verifyPinsAgainstTripCountries } = await import('../utils/mapSanityCheck');
                const results = await verifyPinsAgainstTripCountries(verifiable, tripCountries);
                if (cancelled) return;
                const wrongIds = new Set(results.filter(r => !r.in_country).map(r => r.id));
                if (wrongIds.size === 0) return;
                console.warn(`[Map][${runId}] AI sanity check rejected ${wrongIds.size} pins`, [...wrongIds]);
                setMapItems(prev =>
                    prev.map(i => (wrongIds.has(i.id) ? { ...i, lat: undefined, lng: undefined } : i)),
                );
                try {
                    const { toast } = await import('../stores/useToastStore');
                    toast.warning(`${wrongIds.size} מקומות הוסרו מהמפה — מיקומם לא תואם למדינת הטיול`);
                } catch { /* toast import is optional */ }
            } catch (e) {
                console.warn('[Map] AI sanity check failed', e);
            }
        };
        // Debounce so a flurry of geocode updates doesn't trigger N AI calls.
        const t = window.setTimeout(run, 800);
        return () => { cancelled = true; window.clearTimeout(t); };
    }, [trip?.id, mapItems.length, loading]); // eslint-disable-line react-hooks/exhaustive-deps

    // 3. Build date-ordered route stops
    useEffect(() => {
        if (!trip || items) return;

        const buildRoute = async () => {
            // Collect "stop candidates" from BOTH flights and hotels, each timestamped,
            // then merge chronologically + dedupe by city. Previous version dropped
            // hotel cities entirely when flights existed — so Koh Chang / Pattaya
            // never showed as stops on the trip's route line.
            type Candidate = RouteStop & { sortTs: number; isFlightOnly?: boolean };
            const candidates: Candidate[] = [];

            // Precompute canonical keys of all hotel cities. Flight-only stops that
            // don't match any hotel city (layovers like AUH) get dropped — unless
            // they're the origin or return home anchor.
            const hotelCityKeys = new Set<string>();
            (trip.hotels || []).forEach(h => {
                const extracted = extractRobustCity(h.address || '', h.name || '', trip);
                if (extracted) hotelCityKeys.add(cityKey(extracted));
                if (h.city) hotelCityKeys.add(cityKey(h.city));
            });

            // Flights → arrival airport on every segment.
            // We INTENTIONALLY do not add the origin (first seg fromCity) or
            // the home-return anchor (last seg toCity) — they're the user's
            // home base (e.g. Tel Aviv) and showing them on the trip map just
            // forces the map to zoom out to include a city that isn't part
            // of the actual trip. First stop on the map should be where the
            // user LANDS, not where they take off from.
            const segs = [...(trip.flights?.segments || [])].sort((a, b) =>
                (parseTripDate(a.date)?.getTime() || 0) - (parseTripDate(b.date)?.getTime() || 0)
            );

            // STRICT TRIP-COUNTRY WHITELIST (A7.2): a flight stop is included
            // ONLY if its destination city resolves to a country that's in
            // the trip's country set. The trip's country set is derived from
            // hotels + the explicit destination string — flight origins do
            // NOT auto-qualify. This implicitly drops the home airport (TLV)
            // and any return leg without needing a hardcoded home-airport list.
            const tripCountriesSet = getTripCountries(trip);

            const flightCityCountry = (city: string): string | null => {
                // Try city-name lookup against geoData; if that fails, drop
                // through to a permissive `null` (handled below).
                try {
                    const { getCountryForCity } = require('../utils/geoData');
                    return getCountryForCity?.(city) || null;
                } catch {
                    return null;
                }
            };

            if (segs.length > 0) {
                segs.forEach(seg => {
                    if (!seg.toCity) return;
                    const ts = parseTripDate(seg.date)?.getTime() || 0;
                    const k = cityKey(seg.toCity);

                    // Drop the flight stop if its country is not in the trip set.
                    // Permissive when the trip country set is empty (brand-new
                    // trip with no hotels yet) so we don't show a blank map.
                    if (tripCountriesSet.size > 0) {
                        const flightCountry = flightCityCountry(seg.toCity);
                        if (flightCountry && !tripCountriesSet.has(flightCountry)) return;
                        // If we can't resolve the country at all, keep the stop
                        // ONLY if there's a hotel in the same city — that's a
                        // strong signal the stop is part of the trip.
                        if (!flightCountry && !hotelCityKeys.has(k)) return;
                    }

                    candidates.push({
                        name: seg.toCity,
                        displayName: seg.toCity,
                        type: 'flight',
                        code: seg.toCode,
                        date: seg.date,
                        emoji: '🛬',
                        sortTs: ts,
                        // True layover: flight destination but no hotel booked there
                        isFlightOnly: !hotelCityKeys.has(k),
                    });
                });
            }

            // Hotels → one stop per hotel (chronological by check-in).
            // We add 15 hours to the sortTs so that when a hotel's check-in
            // date matches a same-day flight arrival, the flight arrival
            // sorts FIRST (matches the real sequence: land → check in).
            //
            // A7.1 — Hotels with missing/unparseable checkInDate get pushed
            // to the END of the sort instead of falling to ts=0 (which
            // sorted them BEFORE every dated stop and broke the route order).
            // Strict whitelist (A7.2): drop hotels whose country is not in
            // the trip set.
            const hotels = (trip.hotels || []).filter(h => {
                if (tripCountriesSet.size === 0) return true;
                const country = getCountryForHotel(h);
                if (!country) return true; // permissive on unparseable hotels
                return tripCountriesSet.has(country);
            });
            const lastDatedHotelTs = hotels.reduce((max, h) => {
                const t = parseTripDate(h.checkInDate || '')?.getTime() || 0;
                return t > max ? t : max;
            }, 0);
            let undatedSeq = 0;
            hotels.forEach(h => {
                const city = cleanCityName(extractRobustCity(h.address || '', h.name || '', trip));
                if (!city) return;
                const baseTs = parseTripDate(h.checkInDate || '')?.getTime() || 0;
                let ts: number;
                if (baseTs) {
                    ts = baseTs + 15 * 3600 * 1000; // 15:00 = standard check-in
                } else {
                    // Push undated hotels to the very end of the chronological list
                    // so they don't crash to position #1.
                    undatedSeq += 1;
                    ts = (lastDatedHotelTs || Date.now()) + undatedSeq * 24 * 3600 * 1000;
                    console.warn(`[Map] Hotel "${h.name}" has no parseable checkInDate — placing at end of route`);
                }
                // ⚠️ STRICT: only accept the hotel's cached lat/lng if they
                // pass the trip-country whitelist. Stale wrong-country coords
                // (e.g. Photon returning a Russian "Koh Chang" in Europe)
                // get dropped here so the geocoder retries with bbox bias.
                const validatedHotelCoords = validateCoordsForTrip(h.lat, h.lng, trip);
                candidates.push({
                    name: city,
                    displayName: h.name || city,
                    type: 'hotel',
                    date: h.checkInDate,
                    emoji: '🏨',
                    coords: validatedHotelCoords || undefined,
                    sortTs: ts,
                    isFlightOnly: false,
                });
            });

            candidates.sort((a, b) => (a.sortTs || 0) - (b.sortTs || 0));

            // Build final stops list with these rules:
            //   - HOTELS are NEVER deduped against each other — two Bangkok
            //     hotels get two stops. A tiny perpendicular offset is added
            //     downstream so stacked pins stay visible.
            //   - FLIGHT-ARRIVAL is kept as its OWN stop even when a hotel
            //     exists in the same city. User wants the landing airport
            //     to be stop #1 and the hotel to be stop #2.
            //   - Repeat arrivals (same-city second arrival, e.g. a return
            //     leg back to Bangkok after a side-trip) collapse into the
            //     existing airport pin.
            //   - FLIGHT-ONLY layovers (no hotel in that city AND not the
            //     user's final destination) are dropped.
            const stops: RouteStop[] = [];
            candidates.forEach(c => {
                const k = cityKey(c.name);

                if (c.type === 'hotel') {
                    // Always add hotels as distinct stops
                    const { sortTs, isFlightOnly, ...stop } = c;
                    stops.push(stop);
                    return;
                }

                // Flight-destination candidate — drop real layovers (no
                // hotel in that city, not user's main destination).
                if (c.isFlightOnly) return;

                // NOTE: we intentionally do NOT skip flight-dest when a hotel
                // exists in the same city. The user wants the arrival airport
                // as its own numbered stop (#1), with the hotel as the next
                // stop (#2). The pin-offset logic downstream keeps both
                // visually distinct (~300 m east).

                // Collapse only BACK-TO-BACK flight arrivals to the same city
                // (e.g. two layovers stacked). A repeat arrival separated by
                // other stops — typical for a Bangkok→side-trip→Bangkok loop
                // where the user later flies TDX→BKK — IS its own stop, so
                // the map shows the actual landing leg instead of jumping
                // from Koh Chang straight to a Bangkok hotel.
                const last = stops[stops.length - 1];
                if (last && last.type === 'flight' && cityKey(last.name) === k) return;

                const { sortTs, isFlightOnly, ...stop } = c;
                stops.push(stop);
            });

            // Fallback: destination string
            if (stops.length === 0 && trip.destination) {
                trip.destination.split(/[-–,&]/).map(s => s.trim()).filter(Boolean).forEach(dest => {
                    stops.push({ name: dest, displayName: dest, type: 'city', emoji: '📍' });
                });
            }

            // Geocode stops. Tries a chain of fallback queries so airport
            // stops always resolve — this fixes the bug where BKK / TDX
            // airport stops were being dropped from validStops because the
            // primary query ("Bangkok Airport, BKK") occasionally failed
            // and the numbered pins then started from stop #2 (Pattaya) =1.
            for (const stop of stops) {
                if (stop.coords) continue;
                // Hardcoded fallback for small airports first — if it's a known
                // regional code (TDX, USM, KBV, …) this saves a guaranteed-fail
                // network round-trip and keeps the stop on the map.
                if (stop.code) {
                        const hard = SMALL_AIRPORT_COORDS[stop.code.toUpperCase()];
                        if (hard) { stop.coords = hard; continue; }
                }
                const queries: string[] = [];
                if (stop.code) {
                        queries.push(`${stop.name} Airport, ${stop.code}`);
                        queries.push(`${stop.code} Airport`);
                        queries.push(`${stop.code}`);
                }
                queries.push(stop.name);
                // Try cache for every candidate first — VALIDATED against the trip's
                // country whitelist so a stale "Bangkok in Africa" entry can't sneak in.
                for (const q of queries) {
                        const cached = lookupCachedCoords(geocodedCache, q, trip);
                        if (cached) { stop.coords = cached; break; }
                }
                if (stop.coords) continue;
                // Network: every geocode call goes through `geocodeForTrip` which
                // (a) appends the country name, (b) biases by country bbox, and
                // (c) rejects wrong-country results. Stops will resolve to null
                // if no matching place exists in the trip's countries — better
                // than a globally-positioned wrong pin.
                for (const q of queries) {
                        const coords = await geocodeForTrip(q, trip);
                        if (coords) {
                                stop.coords = coords;
                                setGeocodedCache(prev => {
                                        const next = { ...prev, [q]: coords };
                                        saveGeoCache(next);
                                        return next;
                                });
                                break;
                        }
                }
            }

            // Offset pins that land on top of each other (same-city hotels).
            // Pushes each duplicate 0.003° east + slight lat bump so the
            // user can click each pin individually without zooming.
            const coordKey = (c: { lat: number; lng: number }) =>
                `${c.lat.toFixed(3)}_${c.lng.toFixed(3)}`;
            const occupied = new Map<string, number>();
            stops.forEach(s => {
                if (!s.coords) return;
                const k = coordKey(s.coords);
                const count = occupied.get(k) || 0;
                if (count > 0) {
                    s.coords = {
                        lat: s.coords.lat + count * 0.0008,
                        lng: s.coords.lng + count * 0.0030,
                    };
                }
                occupied.set(k, count + 1);
            });

            setRouteStops(stops);
        };

        buildRoute();
    }, [trip, items, layerFlags.route, layerFlags.hotels, layerFlags.myLists, layerFlags.aiRestaurants, layerFlags.aiAttractions]);

    // 3b. Geocode flight airport codes — used by the distance-based transport
    //     matcher so a flight from Trat matches a hotel in Koh Chang.
    const [airportCoords, setAirportCoords] = useState<Record<string, { lat: number; lng: number }>>({});
    const [legClassifications, setLegClassifications] = useState<Record<string, LegClassification>>({});
    const [waypointCoords, setWaypointCoords] = useState<Record<string, { lat: number; lng: number }>>({});
    useEffect(() => {
        if (!trip?.flights?.segments?.length) return;
        const run = async () => {
            const codes = new Set<string>();
            trip.flights!.segments.forEach(s => {
                if (s.fromCode) codes.add(s.fromCode.toLowerCase());
                if (s.toCode) codes.add(s.toCode.toLowerCase());
                if (s.fromCity) codes.add(s.fromCity.toLowerCase());
                if (s.toCity) codes.add(s.toCity.toLowerCase());
            });
            const next: Record<string, { lat: number; lng: number }> = {};
            for (const raw of Array.from(codes)) {
                if (!raw) continue;
                // 1. Hardcoded fallback for small / regional airports that
                //    Nominatim consistently fails on (TDX, USM, KBV, …).
                //    Cheaper than a network round-trip and prevents silent
                //    drop-outs that hide entire flight legs from the map.
                if (/^[a-z]{3}$/.test(raw)) {
                    const hard = SMALL_AIRPORT_COORDS[raw.toUpperCase()];
                    if (hard) { next[raw] = hard; continue; }
                }
                // 2. Existing geo cache (browser-persisted from prior trips) —
                //    validated against the trip-country whitelist so stale
                //    wrong-continent entries can't sneak in.
                const cacheCandidates = [
                    raw,
                    raw.toUpperCase(),
                    `${raw} Airport`,
                    `${raw.toUpperCase()} Airport`,
                ];
                let cached: { lat: number; lng: number } | null = null;
                for (const k of cacheCandidates) {
                    cached = lookupCachedCoords(geocodedCache, k, trip);
                    if (cached) break;
                }
                if (cached) { next[raw] = cached; continue; }
                // 3. Live geocode as last resort — country-aware.
                const q = /^[a-z]{3}$/.test(raw) ? `${raw.toUpperCase()} Airport` : raw;
                const c = await geocodeForTrip(q, trip);
                if (c) next[raw] = c;
            }
            setAirportCoords(next);
        };
        run();
    }, [trip?.flights?.segments, geocodedCache]);

    // 3c. AI-classify each consecutive pair of stops (drive / flight / ferry /
    //     drive+ferry / multi) using the shared routeClassifier service. One
    //     AI call per trip, cached in localStorage for 30 days. Runs after
    //     routeStops settle. Failures degrade silently to the distance-based
    //     heuristic in getSegmentTransport.
    useEffect(() => {
        if (!trip || items) return;
        if (routeStops.length < 2) return;
        // Use the CITY name (s.name) rather than the hotel's displayName
        // — the AI reasons about geography, not hotel brands. "Bangkok →
        // Pattaya" is much more legible than "Holiday Inn Bangkok →
        // Holiday Inn Pattaya". Also strip any stale zip-codes / country
        // suffix that snuck through extractRobustCity.
        //
        // Pass date + airport context so the AI can infer same-day airport
        // transfers (BKK→Pattaya) and ferry crossings (Pattaya→Koh Chang).
        const legs = routeStops.slice(0, -1).map((s, i) => {
            const next = routeStops[i + 1];
            return {
                from: cleanCityName(s.name),
                to: cleanCityName(next.name),
                departDate: s.date,
                arrivalDate: next.date,
                fromIsAirport: s.type === 'flight',
                toIsAirport: next.type === 'flight',
            };
        });
        let cancelled = false;
        classifyTripRoute(trip.id, legs).then(result => {
            if (cancelled) return;
            // Post-classify guard: AI sometimes returns "flight" for short legs
            // even though the user has no actual flight booked. If the leg has
            // no matching FlightSegment in trip.flights AND the great-circle
            // distance is < 700 km (≤ ~7 hours by car), override to "drive".
            // Prevents phantom Bangkok→Pattaya / Madrid→Toledo / etc. flight lines.
            const cleaned: typeof result = {};
            for (const [k, v] of Object.entries(result)) {
                if (v.mode !== 'flight') {
                    cleaned[k] = v;
                    continue;
                }
                const [legFrom, legTo] = k.split('__');
                const hasRealFlight = (trip.flights?.segments || []).some(s => {
                    const sf = (s.fromCity || s.fromCode || '').toLowerCase();
                    const st = (s.toCity || s.toCode || '').toLowerCase();
                    return sf.includes(legFrom) && st.includes(legTo);
                });
                if (hasRealFlight) {
                    cleaned[k] = v;
                    continue;
                }
                // No matching flight — find the leg's distance to decide.
                const fromStop = routeStops.find(s => cleanCityName(s.name).toLowerCase() === legFrom);
                const toStop = routeStops.find(s => cleanCityName(s.name).toLowerCase() === legTo);
                let distKm = Infinity;
                if (fromStop?.coords && toStop?.coords) {
                    distKm = getDistanceKm(fromStop.coords.lat, fromStop.coords.lng, toStop.coords.lat, toStop.coords.lng);
                }
                if (distKm < 700) {
                    console.info(`[Route] Overriding phantom "flight" classification for ${legFrom}→${legTo} (${Math.round(distKm)}km, no booking) → drive`);
                    cleaned[k] = { ...v, mode: 'drive', notes: v.notes || 'נסיעה' };
                } else {
                    cleaned[k] = v;
                }
            }
            setLegClassifications(cleaned);
        });
        return () => { cancelled = true; };
    }, [trip?.id, routeStops, items]);

    // 3d. Geocode multi-segment waypoints (ferry piers, train stations,
    //     connection points) so we can draw sub-segment lines and place
    //     small intermediate pins. Runs after legClassifications settle.
    useEffect(() => {
        const names = new Set<string>();
        Object.values(legClassifications).forEach(leg => {
            if (!leg.segments) return;
            // Every sub-segment's `via` is a waypoint that ends that sub-leg.
            // The FINAL via in a segments[] array is usually the leg's
            // end-stop (already geocoded) — we still try to geocode so we
            // can fall back to it if the main stop lookup misses.
            leg.segments.forEach(s => { if (s.via) names.add(s.via); });
        });
        if (names.size === 0) return;
        let cancelled = false;
        const run = async () => {
            const next: Record<string, { lat: number; lng: number }> = {};
            for (const name of Array.from(names)) {
                const key = name.toLowerCase();
                if (waypointCoords[key]) { next[key] = waypointCoords[key]; continue; }
                // Cache first — validated against the trip's countries.
                const cached = lookupCachedCoords(geocodedCache, name, trip)
                    || lookupCachedCoords(geocodedCache, name.toLowerCase(), trip);
                if (cached) { next[key] = cached; continue; }
                const coords = await geocodeForTrip(name, trip);
                if (coords) {
                    next[key] = coords;
                    setGeocodedCache(prev => {
                        const p = { ...prev, [name]: coords };
                        saveGeoCache(p);
                        return p;
                    });
                }
            }
            if (!cancelled && Object.keys(next).length) setWaypointCoords(next);
        };
        run();
        return () => { cancelled = true; };
    }, [legClassifications]);

    // 4. Init map. Tile layer is held in a ref so the tileTheme prop can
    // swap it (Voyager ↔ dark) without remounting the map.
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false });

        // Pick an initial view from the trip itself so mobile users never see
        // a flash of the wrong region while bounds are computed asynchronously.
        // Order: hotel coords → trip-country bbox → world view (NOT Caucasus).
        const hotelCoords: L.LatLngExpression[] = (trip?.hotels || [])
            .filter(h => typeof h.lat === 'number' && typeof h.lng === 'number')
            .map(h => [h.lat as number, h.lng as number]);
        if (hotelCoords.length >= 2) {
            map.fitBounds(L.latLngBounds(hotelCoords), { padding: [40, 40], maxZoom: 11 });
        } else if (hotelCoords.length === 1) {
            map.setView(hotelCoords[0], 11);
        } else {
            const bboxes = trip ? getTripCountryBboxes(trip) : [];
            if (bboxes.length > 0) {
                // bbox tuple is [minLon, minLat, maxLon, maxLat] (west, south, east, north).
                const corners: L.LatLngExpression[] = bboxes.flatMap(([w, s, e, n]) => [
                    [s, w] as L.LatLngExpression,
                    [n, e] as L.LatLngExpression,
                ]);
                map.fitBounds(L.latLngBounds(corners), { padding: [40, 40], maxZoom: 6 });
            } else {
                map.setView([20, 0], 2);
            }
        }

        const tileUrl = tileTheme === 'dark'
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 20 }).addTo(map);
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // @ts-ignore
        const clusterGroup = typeof L.markerClusterGroup === 'function'
            // @ts-ignore
            ? L.markerClusterGroup({
                showCoverageOnHover: false,
                // Zoom-aware cluster radius: tight clusters break apart as the
                // user zooms in so they don't have to tap a "2" bubble at
                // street level just to see two pins that are clearly
                // distinguishable. Above zoom 17, clustering stops entirely.
                maxClusterRadius: (zoom: number) => {
                    if (zoom >= 16) return 20;
                    if (zoom >= 14) return 35;
                    return 50;
                },
                disableClusteringAtZoom: 16,
                // EXPLICIT — these default to true in leaflet.markercluster but
                // were missing from the original config, and some clusters
                // (especially groups of items at the same coords) refused to
                // expand on tap. Setting them explicitly guarantees the
                // tap-to-zoom AND the spiderfy-when-overlapping behaviour.
                zoomToBoundsOnClick: true,
                spiderfyOnMaxZoom: true,
                animate: true,
                animateAddingMarkers: false,
                removeOutsideVisibleBounds: true,
                iconCreateFunction: (cluster: any) => L.divIcon({
                    html: `<div style="
                        background:linear-gradient(135deg,#4f46e5,#7c3aed);
                        color:white;border-radius:50%;width:36px;height:36px;
                        display:flex;align-items:center;justify-content:center;
                        font-weight:900;font-size:14px;font-family:'Rubik',sans-serif;
                        border:3px solid white;box-shadow:0 4px 12px rgba(79,70,229,0.4);
                    ">${cluster.getChildCount()}</div>`,
                    className: '', iconSize: [36, 36]
                })
            })
            : L.layerGroup();

        map.addLayer(clusterGroup);
        markersRef.current = clusterGroup;
        routeLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;

        // Track zoom so the marker render can hide restaurants/attractions
        // when the user is looking at a regional/country view. Once they
        // zoom in to the city level, the rest of the trip details fill in.
        setMapZoom(map.getZoom());
        map.on('zoomend', () => setMapZoom(map.getZoom()));

        // Snap-back protection (Phase 1.1): once the user has manually panned
        // or zoomed, don't auto-fit them away when geocode batches settle or
        // layer flags change. The flag resets when the trip itself changes
        // or when the user clicks the explicit "fit to trip" button below.
        map.on('dragstart zoomstart', () => { userInteractedRef.current = true; });

        // Popup-protection: while a popup is open, skip the marker rebuild
        // so flyTo's zoom-end doesn't kill the popup the user just opened.
        // After the popup closes, bump the rebuild token so any tier /
        // visibility changes that happened in the meantime get applied.
        map.on('popupopen', () => { popupOpenRef.current = true; });
        map.on('popupclose', () => {
            popupOpenRef.current = false;
            setPopupRebuildToken(t => t + 1);
        });

        setTimeout(() => map.invalidateSize(), 200);
        const ro = new ResizeObserver(() => map.invalidateSize());
        ro.observe(mapContainerRef.current);

        return () => { ro.disconnect(); map.remove(); mapInstanceRef.current = null; };
    }, []);

    // Swap tile layer when tileTheme changes (without recreating the map).
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;
        if (tileLayerRef.current) tileLayerRef.current.remove();
        const tileUrl = tileTheme === 'dark'
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        tileLayerRef.current = L.tileLayer(tileUrl, { maxZoom: 20 }).addTo(map);
    }, [tileTheme]);

    // Cities for filter bar
    const cities = useMemo(() => {
        const cityMap = new Map<string, number>();

        if (trip?.destination) {
            trip.destination.split(/[-–,]/).forEach(c => {
                const n = c.trim();
                if (n) cityMap.set(n, 0);
            });
        }

        mapItems.forEach(item => {
            const city = item.city?.trim();
            if (city && !cityMap.has(city)) cityMap.set(city, 0);
        });

        return Array.from(cityMap.keys()).map(cityName => {
            const keywords = getCityKeywords(cityName);
            const count = mapItems.filter(i => {
                const str = (i.address || i.city || i.name || '').toLowerCase();
                return keywords.some(kw => str.includes(kw));
            }).length;
            return { name: cityName, count };
        }).filter(c => c.count > 0);
    }, [mapItems, trip]);

    // 5. Render map
    useEffect(() => {
        const map = mapInstanceRef.current;
        const markerLayer = markersRef.current;
        const routeLayer = routeLayerRef.current;
        if (!map || !markerLayer || !routeLayer) return;

        // Popup-protection: a marker tap fires flyTo → zoom-end fires →
        // mapZoom state updates → this effect re-runs. Without this guard
        // markerLayer.clearLayers() destroys the marker that owns the
        // open popup, so Leaflet auto-closes it (~1s after it appeared).
        // Skip the rebuild while a popup is open; the popupclose handler
        // bumps `popupRebuildToken` so we run once when it dismisses.
        if (popupOpenRef.current) return;

        map.invalidateSize();
        markerLayer.clearLayers();
        routeLayer.clearLayers();

        const validItems = mapItems.filter(i => isValidCoordinate(i.lat, i.lng));
        const visibleItems = activeCity === 'ALL'
            ? validItems
            : (() => {
                // Use geoData's cityKey which canonicalises both Hebrew and English
                // city names to the same key — covers ALL cities, not just the
                // 12-entry HEBREW_TO_ENGLISH_CITY_MAP used by getCityKeywords.
                const activeCityKey = cityKey(activeCity);
                const keywords = getCityKeywords(activeCity);
                return validItems.filter(i => {
                    // Primary: canonical key match (handles Hebrew ↔ English variants)
                    if (activeCityKey && cityKey(i.city || '') === activeCityKey) return true;
                    // Fallback: keyword substring match in address
                    const addr = (i.address || '').toLowerCase();
                    const iCity = (i.city || '').toLowerCase();
                    return keywords.some(kw => addr.includes(kw) || iCity.includes(kw));
                });
            })();

        const bounds = L.latLngBounds([]);

        // Build a trip-region guard: any pin too far from the nearest hotel
        // anchor is almost certainly a geocoding error (AI restaurant whose name
        // also exists in another city or continent).
        // Radius is tight (500 km) when hotels provide city-accurate anchors,
        // looser (1500 km) when falling back to destination centroid only.
        const hotelAnchors = (trip?.hotels || [])
            .filter(h => isValidCoordinate(h.lat, h.lng))
            .map(h => ({ lat: h.lat!, lng: h.lng! }));
        const hasHotelAnchors = hotelAnchors.length > 0;
        // If no hotels have coords, fall back to the cached destination centroid
        // so the guard still fires on the first visit before geocoding completes.
        if (!hasHotelAnchors && trip?.destination) {
            const destKey = `dest:${trip.destination}`;
            const cached = geocodedCacheRef.current[destKey];
            if (cached) hotelAnchors.push(cached);
        }
        // 500 km when city-accurate hotel anchors are available; 1500 km for
        // destination centroid fallback (single country but multiple cities).
        const MAX_TRIP_RADIUS_KM = hasHotelAnchors ? 500 : 1500;
        const isInTripRegion = (lat: number, lng: number): boolean => {
            if (hotelAnchors.length === 0) return true; // no anchor → can't validate
            return hotelAnchors.some(a => getDistanceKm(lat, lng, a.lat, a.lng) <= MAX_TRIP_RADIUS_KM);
        };

        // ZOOM-GATED VISIBILITY: at low/regional zoom (<=10) the map shows
        // only the trip backbone — hotels, flights, route polyline. Saved
        // and AI restaurants/attractions reveal once the user zooms in to
        // the city level. Keeps the first-glance picture clean and makes
        // the trip route read instantly.
        const PLACES_REVEAL_ZOOM = 11;
        const showPlaces = mapZoom >= PLACES_REVEAL_ZOOM || activeCity !== 'ALL';
        // Tier drives label content + which marker types render. When a
        // city filter is active, jump straight to tier 3 so the user
        // sees full info inside the city they picked.
        const tier = activeCity !== 'ALL' ? 3 : labelTier(mapZoom);

        // STOP-NUMBER LOOKUP — built once before rendering hotels so each
        // hotel pin can carry its stage badge ("1", "2", "3") right on the
        // pin instead of needing a separate stop-pill marker. Lets the user
        // read the trip route at a glance from the default zoom (without
        // the badge, the user sees only hotel names with no sequence info).
        const STOP_COLORS_LOOKUP = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'];
        const hotelStopMap = new Map<string, { num: number; hex: string }>();
        if (activeCity === 'ALL' && trip && !items && routeStops.length > 0) {
            const validStopsForLookup = routeStops.filter(s => s.coords);
            const tripHotelCoords = (trip?.hotels || [])
                .filter(h => isValidCoordinate(h.lat, h.lng))
                .map(h => ({ lat: h.lat as number, lng: h.lng as number }));
            validStopsForLookup.forEach((stop, idx) => {
                if (!stop.coords) return;
                const matched = tripHotelCoords.find(h =>
                    getDistanceKm(stop.coords!.lat, stop.coords!.lng, h.lat, h.lng) < 0.25,
                );
                if (matched) {
                    const key = `${matched.lat.toFixed(4)},${matched.lng.toFixed(4)}`;
                    hotelStopMap.set(key, { num: idx + 1, hex: STOP_COLORS_LOOKUP[idx % STOP_COLORS_LOOKUP.length] });
                }
            });
        }
        const lookupHotelStop = (lat: number, lng: number): { num: number; hex: string } | undefined =>
            hotelStopMap.get(`${lat.toFixed(4)},${lng.toFixed(4)}`);

        // Plot non-airport items with premium pins. Hotels are routed to
        // the unclustered route layer so they're always individually
        // visible as a reference point — even at low zoom where dense
        // clusters of restaurants/attractions would otherwise hide them.
        visibleItems.forEach(item => {
            if (item.type === 'airport') return;
            // DEFAULT-VIEW DECLUTTER (per user spec): at the trip-overview zoom
            // (tier ≤ 2 with no city filter), the map shows ONLY the route
            // story — colored polylines + numbered city pills. Hotels reveal
            // at zoom ≥ 11 (tier ≥ 3) so the regional view stays clean. When
            // a city filter is active the user has explicitly asked to focus
            // there, so we render hotels regardless of tier.
            if (item.type === 'hotel' && tier <= 2 && activeCity === 'ALL') return;
            // Hide restaurants/attractions at low zoom unless a city filter is active.
            if (!showPlaces && (item.type === 'restaurant' || item.type === 'attraction')) return;
            if (item.type !== 'hotel' && !isInTripRegion(item.lat!, item.lng!)) return;
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.hotel;
            // Hotels never render as "ai suggestions"; only restaurant/attraction items can.
            const pinSource: 'saved' | 'ai' = item.type !== 'hotel' && item.source === 'ai' ? 'ai' : 'saved';
            // Hide name labels at low zoom — only the icon remains so the
            // first-glance picture stays clean. Names appear once the user
            // zooms in past the city level.
            // Tier-driven label rendering:
            //   - Hotels: show name with wrap at tier ≥ 3, hide name at lower tiers.
            //   - Restaurants/attractions: hide name at tier ≤ 2 (the
            //     "showPlaces" guard above already prevents the marker
            //     from rendering at tier ≤ 2 anyway), show name at tier 3+.
            // Hotel name labels: ALWAYS visible, even at country-level zoom,
            // so the user can scan the trip and see which hotels are where
            // at a glance. Restaurants/attractions stay tier-gated to keep
            // the dense view clean — they only appear at tier ≥ 3 anyway.
            const showLabel = item.type === 'hotel' || tier >= 3;
            const wrapLabel = item.type === 'hotel'; // hotel labels always wrap to 2-3 lines

            // Content-bearing badge. Priority:
            //   1. Stop-number badge for hotels that anchor a trip stage —
            //      always visible (any zoom). Tells the user "this is stop
            //      N of the trip" without needing a separate stop pill.
            //   2. Rating / nights badges (zoom tier ≥ 3 — city level only
            //      so the regional view stays uncluttered).
            let badge: { text: string; color: 'amber' | 'blue' | 'emerald' | 'rose' | 'slate' | 'violet' | 'cyan' } | undefined;
            const hotelStop = item.type === 'hotel' && isValidCoordinate(item.lat, item.lng)
                ? lookupHotelStop(item.lat as number, item.lng as number)
                : undefined;
            if (hotelStop) {
                // Map the stop's hex color to the closest named badge color so
                // the badge visually matches its incoming/outgoing route leg.
                const hexToName: Record<string, NonNullable<typeof badge>['color']> = {
                    '#2563eb': 'blue', '#7c3aed': 'violet', '#0891b2': 'cyan',
                    '#059669': 'emerald', '#d97706': 'amber', '#dc2626': 'rose',
                };
                badge = { text: String(hotelStop.num), color: hexToName[hotelStop.hex] || 'blue' };
            } else if (tier >= 3) {
                if (item.type === 'hotel') {
                    const nights = (item as any).nights;
                    if (typeof nights === 'number' && nights > 0) {
                        badge = { text: `${nights} ל'`, color: 'blue' };
                    } else if (typeof item.rating === 'number' && item.rating > 0) {
                        badge = { text: `⭐ ${item.rating.toFixed(1)}`, color: 'amber' };
                    }
                } else if (typeof item.rating === 'number' && item.rating > 0) {
                    badge = { text: `⭐ ${item.rating.toFixed(1)}`, color: 'amber' };
                }
            }

            // Prefer the English/Latin name on the map label so AI-generated
            // Hebrew transliterations like "פיג קפה" don't show up where the
            // place's actual signage reads "Pig Café".
            const labelText = (item as any).nameEnglish || item.name;
            const icon = makePinIcon(cfg, showLabel ? labelText : undefined, pinSource, wrapLabel, badge);

            const targetLayer = item.type === 'hotel' ? routeLayer : markerLayer;
            const marker = L.marker([item.lat!, item.lng!], {
                icon,
                // Z-index priority for label collisions:
                //   hotels   3000 (highest — anchor of trip planning)
                //   stops    2000 (set elsewhere on the route-stop markers)
                //   places   0    (restaurants/attractions — clusters absorb most)
                zIndexOffset: item.type === 'hotel' ? 3000 : 0,
            }).addTo(targetLayer);

            // Walking-radius rings around each hotel — opt-in via the
            // "טווח הליכה מהמלון" toggle. Outer 2.4 km ≈ 30 min, inner
            // 1.2 km ≈ 15 min at a 5 km/h walking pace. interactive=false
            // so the circles don't swallow taps on pins inside them.
            if (item.type === 'hotel' && walkingCircles && isValidCoordinate(item.lat, item.lng)) {
                L.circle([item.lat!, item.lng!], {
                    radius: 2400,
                    color: '#10b981',
                    weight: 1.5,
                    fillColor: '#10b981',
                    fillOpacity: 0.05,
                    dashArray: '6,4',
                    interactive: false,
                }).addTo(routeLayer);
                L.circle([item.lat!, item.lng!], {
                    radius: 1200,
                    color: '#10b981',
                    weight: 2,
                    fillColor: '#10b981',
                    fillOpacity: 0.10,
                    interactive: false,
                }).addTo(routeLayer);
            }

            // React portal popup — renders MapItemPopup synchronously via
            // flushSync so the DOM is populated before Leaflet opens the popup.
            marker.on('click', () => {
                // Click-to-zoom on EVERY pin: focus + zoom in so the user
                // can read surrounding context. Different target zoom per
                // type — hotels open a 4-block radius, places get tighter.
                // Setting userInteractedRef before the flyTo prevents the
                // marker effect from snapping the view back to whole-trip.
                userInteractedRef.current = true;
                if (isValidCoordinate(item.lat, item.lng)) {
                    const targetZoom = item.type === 'hotel' ? 16 : 17;
                    const currentZoom = map.getZoom();
                    // Cancel any in-flight flyTo before starting a new one —
                    // racing animations leave the map in a "stuck" state where
                    // pinch / scroll-zoom feels unresponsive.
                    map.stop();
                    map.flyTo([item.lat!, item.lng!], Math.max(currentZoom, targetZoom), { duration: 0.7 });
                }
                const container = document.createElement('div');
                const popupRoot = createRoot(container);
                const isAlreadySaved = !!(item.source === 'ai' && savedNames?.has(item.name.toLowerCase()));
                const handleAdd = onAddToList && item.source === 'ai'
                    ? () => {
                        onAddToList(item);
                        marker.closePopup();
                    }
                    : undefined;
                const handleFix = onUpdateTrip && item.type === 'hotel'
                    ? () => {
                        marker.closePopup();
                        setFixLocationFor({ hotelId: item.id, hotelName: item.name });
                    }
                    : undefined;
                flushSync(() => {
                    popupRoot.render(
                        <MapItemPopup
                            item={item}
                            onAddToList={handleAdd}
                            isAdded={isAlreadySaved}
                            onFixLocation={handleFix}
                        />
                    );
                });
                marker.bindPopup(container, { className: 'tp-popup', maxWidth: 300, minWidth: 280 }).openPopup();
                marker.once('popupclose', () => popupRoot.unmount());
            });

            // Hover preview removed (Issue 2): one-popup-only on click —
            // double-popup ghosting is gone, mobile and desktop align.

            // Heatmap: draw a soft glow circle under AI items so dense areas
            // appear "hotter". Circles are added to markerLayer so they clear
            // together with the pins on each redraw.
            if (heatmap && (item.type === 'restaurant' || item.type === 'attraction')) {
                const heatColor = item.type === 'restaurant' ? '#f97316' : '#8b5cf6';
                L.circleMarker([item.lat!, item.lng!], {
                    radius: 28,
                    color: 'transparent',
                    fillColor: heatColor,
                    fillOpacity: 0.18,
                }).addTo(markerLayer);
            }

            bounds.extend([item.lat!, item.lng!]);
        });

        // Include hotel coords in bounds — if a city filter is active, only
        // hotels in that city so the zoom is city-scoped, not trip-wide.
        if (trip?.hotels?.length) {
            const activeCityKey = activeCity !== 'ALL' ? cityKey(activeCity) : null;
            const kws = activeCityKey ? getCityKeywords(activeCity) : null;
            trip.hotels.forEach(h => {
                if (!isValidCoordinate(h.lat, h.lng)) return;
                if (activeCityKey) {
                    const hCity = cleanCityName(extractRobustCity(h.address || '', h.name || '', trip));
                    if (cityKey(hCity) === activeCityKey) { bounds.extend([h.lat!, h.lng!]); return; }
                    const addr = (h.address || '').toLowerCase();
                    if (!kws!.some(kw => addr.includes(kw))) return;
                }
                bounds.extend([h.lat!, h.lng!]);
            });
        }

        // Draw route (only in ALL view)
        if (activeCity === 'ALL' && trip && !items && routeStops.length > 0) {
            const STOP_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'];
            const validStops = routeStops.filter(s => s.coords);

            // Compute a curved poly-line between two lat/lng points. Used
            // for both primary legs and sub-legs of a multi-modal leg.
            const curvedPath = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): [number, number][] => {
                const d = getDistanceKm(a.lat, a.lng, b.lat, b.lng);
                if (d <= 50) return [[a.lat, a.lng], [b.lat, b.lng]];
                const steps = 60;
                const pts: [number, number][] = [];
                for (let s = 0; s <= steps; s++) {
                    const t = s / steps;
                    const lat = a.lat + (b.lat - a.lat) * t;
                    const lng = a.lng + (b.lng - a.lng) * t;
                    const curveFactor = Math.min(d / 30, 5);
                    const curveOffset = Math.sin(t * Math.PI) * curveFactor;
                    const perpLat = -(b.lng - a.lng) / Math.max(d, 1);
                    const perpLng = (b.lat - a.lat) / Math.max(d, 1);
                    pts.push([lat + perpLat * curveOffset * 0.6, lng + perpLng * curveOffset * 0.6]);
                }
                return pts;
            };

            // Draw a single sub-segment: glow + outline + colored dashed
            // line + arrow + optional badge. Caller provides the colors
            // so ferry legs can stand out from drive legs.
            const drawSubSegment = (
                pathPoints: [number, number][],
                primaryColor: string,
                badge: L.DivIcon | null,
                badgePos: number = 0.5,
            ) => {
                if (pathPoints.length < 2) return;
                L.polyline(pathPoints, { color: primaryColor, weight: 12, opacity: 0.12, lineCap: 'round' }).addTo(routeLayer);
                L.polyline(pathPoints, { color: 'white', weight: 5.5, opacity: 1, lineCap: 'round' }).addTo(routeLayer);
                L.polyline(pathPoints, { color: primaryColor, weight: 3.5, opacity: 0.92, dashArray: '10, 6', lineCap: 'round' }).addTo(routeLayer);

                // Direction chevrons — multiple along the path so the trip
                // direction reads at any zoom. Curved paths (60 pts) get
                // three chevrons; straight 2-pt segments get one mid-point.
                const chevronFractions = pathPoints.length >= 4 ? [0.25, 0.5, 0.75] : [0.5];
                chevronFractions.forEach(t => {
                    const idx = Math.min(pathPoints.length - 2, Math.max(0, Math.floor(t * (pathPoints.length - 1))));
                    const [aLat, aLng] = pathPoints[idx];
                    const [bLat, bLng] = pathPoints[idx + 1];
                    const bearing = getBearing(aLat, aLng, bLat, bLng);
                    // White outline behind the colored chevron so it stays
                    // readable over both land and sea tiles.
                    const html = `<div style="
                        transform:rotate(${bearing}deg);
                        color:${primaryColor};
                        filter:drop-shadow(0 0 1px white) drop-shadow(0 0 1px white) drop-shadow(0 1px 2px rgba(0,0,0,0.25));
                        line-height:0;
                    ">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4L19 11H14V20H10V11H5L12 4Z"/></svg>
                    </div>`;
                    const midLat = (aLat + bLat) / 2;
                    const midLng = (aLng + bLng) / 2;
                    L.marker([midLat, midLng], {
                        icon: L.divIcon({ html, className: '', iconSize: [16, 16], iconAnchor: [8, 8] }),
                        interactive: false,
                        zIndexOffset: 1400,
                    }).addTo(routeLayer);
                });

                if (badge) {
                    const badgeIdx = Math.floor(pathPoints.length * badgePos);
                    L.marker([pathPoints[badgeIdx][0], pathPoints[badgeIdx][1]], {
                        icon: badge, zIndexOffset: 1500, interactive: false,
                    }).addTo(routeLayer);
                }
            };

            // Draw lines between stops — multi-segment if AI classified the
            // leg as drive+ferry / multi AND we've geocoded the waypoints.
            for (let i = 0; i < validStops.length - 1; i++) {
                const start = validStops[i];
                const end = validStops[i + 1];
                if (!start.coords || !end.coords) continue;

                const lineColor = STOP_COLORS[i % STOP_COLORS.length];
                const legKeyLookup = `${cleanCityName(start.name).toLowerCase()}__${cleanCityName(end.name).toLowerCase()}`;
                const aiLeg = legClassifications[legKeyLookup];

                // Multi-segment path — requires all waypoints to be geocoded.
                const hasSegments = aiLeg?.segments && aiLeg.segments.length >= 2;
                const resolvedSegments: Array<{ from: { lat: number; lng: number }; to: { lat: number; lng: number }; mode: 'drive' | 'flight' | 'train' | 'ferry'; durationHours?: number; viaName: string }> = [];
                if (hasSegments && aiLeg?.segments) {
                    let prev: { lat: number; lng: number } = start.coords;
                    let ok = true;
                    for (let s = 0; s < aiLeg.segments.length; s++) {
                        const seg = aiLeg.segments[s];
                        const isLast = s === aiLeg.segments.length - 1;
                        // Last segment ends at the leg's end-stop — use its
                        // known coords even if the via name didn't geocode.
                        const coords = isLast
                            ? end.coords
                            : waypointCoords[seg.via.toLowerCase()];
                        if (!coords) { ok = false; break; }
                        resolvedSegments.push({ from: prev, to: coords, mode: seg.mode, durationHours: seg.durationHours, viaName: seg.via });
                        prev = coords;
                    }
                    if (!ok) resolvedSegments.length = 0;
                }

                if (resolvedSegments.length >= 2) {
                    // Draw each sub-segment with mode-aware line colors only —
                    // no transport badge, no duration label, no waypoint pin.
                    // The colored, arrow-decorated polyline alone conveys the
                    // route; mode/duration text was dropped because estimates
                    // were inaccurate and cluttered the map.
                    resolvedSegments.forEach(sub => {
                        const subColor = sub.mode === 'ferry'
                            ? '#0ea5e9'  // sky — "water"
                            : sub.mode === 'flight'
                                ? '#2563eb'
                                : sub.mode === 'train'
                                    ? '#a855f7'
                                    : lineColor; // drive uses the leg's stop color
                        const subPath = curvedPath(sub.from, sub.to);
                        drawSubSegment(subPath, subColor, null, 0.5);
                        bounds.extend([sub.from.lat, sub.from.lng]);
                        bounds.extend([sub.to.lat, sub.to.lng]);
                    });
                } else {
                    // Single-segment rendering (legacy path).
                    const dist = getDistanceKm(start.coords.lat, start.coords.lng, end.coords.lat, end.coords.lng);
                    const pathPoints = curvedPath(start.coords, end.coords);
                    let transport = getSegmentTransport(start, end, trip, dist, airportCoords);
                    if (aiLeg && aiLeg.mode) {
                        if (transport.mode === 'flight' && transport.hasTransportData) {
                            // Recorded flight wins; AI's mode/duration is ignored.
                        } else if (aiLeg.mode === 'drive+ferry' || aiLeg.mode === 'multi') {
                            // Multi-modal AI guess + no recorded flight → keep
                            // the coarse 'drive' fallback so the line color
                            // doesn't pretend to know the exact mode.
                            transport = {
                                mode: 'drive',
                                emoji: transportEmojiForMode(aiLeg.mode),
                                label: aiLeg.notes || transportLabelForMode(aiLeg.mode),
                                hasTransportData: true,
                            };
                        } else {
                            // Single confirmed mode from AI — use it.
                            transport = {
                                mode: aiLeg.mode as any,
                                emoji: transportEmojiForMode(aiLeg.mode),
                                label: aiLeg.notes || transportLabelForMode(aiLeg.mode),
                                hasTransportData: true,
                            };
                        }
                    }
                    // Diagnostic — emit a one-line summary per leg so the user
                    // can see in console why a leg landed on its mode (e.g.
                    // "drive" vs "flight"). When the mode is wrong, the log
                    // tells us whether the trip lacks the relevant flight,
                    // whether the matcher rejected it, etc.
                    try {
                        const flightSummaries = (trip.flights?.segments || []).map(s =>
                            `${s.fromCode || s.fromCity || '?'}→${s.toCode || s.toCity || '?'}@${s.date || '?'}`,
                        ).join(' | ');
                        // eslint-disable-next-line no-console
                        console.info(
                            `[Leg] ${start.name}→${end.name} ${Math.round(dist)}km → ${transport.mode} ${transport.emoji} (${transport.label}) | flights: ${flightSummaries || 'none'}`,
                        );
                    } catch { /* never throw from a log */ }
                    // Per-mode polyline colour — flight=blue, ferry=cyan,
                    // drive=slate, train=violet, bus=amber. Falls back to
                    // the per-stop colour for unknown modes.
                    //
                    // A7.3 — when the transport mode is unconfirmed (no AI
                    // classification, no flight evidence) we render a NEUTRAL
                    // GRAY dashed line instead of a confident colored line.
                    // This signals "this is a connection — figure out the
                    // real transport later" rather than implying a road
                    // exists between the two points (which would falsely
                    // suggest a driveable route across water).
                    const isConfidentMode = transport.hasTransportData
                        || transport.mode === 'flight';
                    const NEUTRAL_GRAY = '#94a3b8'; // slate-400 — soft, non-shouting
                    const modeColor = isConfidentMode
                        ? (MODE_COLORS[transport.mode as keyof typeof MODE_COLORS]?.line || lineColor)
                        : NEUTRAL_GRAY;
                    // Transport-mode/duration badges removed — the colored,
                    // arrow-decorated polyline now carries the route on its own.
                    drawSubSegment(pathPoints, modeColor, null, 0);
                    bounds.extend([start.coords.lat, start.coords.lng]);
                    bounds.extend([end.coords.lat, end.coords.lng]);
                }
            }

            // Route stop pills — pre-filter by the region guard so the
            // numbering reflects what's actually visible. Without this the
            // first visible pin could be "#5" because "#1-4" were dropped
            // out-of-region — confusing for users who expect "where do I
            // start" to be "1".
            const visibleStops = validStops.filter(s =>
                !!s.coords && isInTripRegion(s.coords.lat, s.coords.lng)
            );
            // Hotel coords list — used to skip route-stop emoji pills that
            // coincide with a hotel marker. Without this, the user sees TWO
            // overlapping pins at every hotel city: the route-stop pill
            // (number + "התחלה" + house emoji) AND the hotel pin (lock icon).
            // The hotel pin already conveys "I'm staying here" — we hide
            // the redundant emoji pill at low zoom and just keep the START/
            // END ribbon attached to the hotel pin label below.
            const hotelCoords = (trip?.hotels || [])
                .filter(h => isValidCoordinate(h.lat, h.lng))
                .map(h => ({ lat: h.lat as number, lng: h.lng as number }));
            const stopCoincidesWithHotel = (lat: number, lng: number): boolean =>
                hotelCoords.some(h => getDistanceKm(lat, lng, h.lat, h.lng) < 0.25);

            // Group stops within ~5 km (0.05° lat/lng) into a single pill so
            // co-located stops (Bangkok start + Bangkok end, Koh Chang Dinso
            // + Koh Chang KC) don't render as overlapping markers where one
            // number hides behind the other.
            type StopGroup = {
                coords: { lat: number; lng: number };
                name: string;
                nums: number[];
                role: 'start' | 'end' | 'middle' | 'roundtrip';
                colorIdx: number;
            };
            const stopGroups: StopGroup[] = [];
            visibleStops.forEach((stop, idx) => {
                if (!stop.coords) return;
                const num = idx + 1;
                const role: 'start' | 'end' | 'middle' = idx === 0
                    ? 'start'
                    : idx === visibleStops.length - 1
                        ? 'end'
                        : 'middle';
                const found = stopGroups.find(g =>
                    Math.abs(g.coords.lat - stop.coords!.lat) < 0.05 &&
                    Math.abs(g.coords.lng - stop.coords!.lng) < 0.05,
                );
                if (found) {
                    found.nums.push(num);
                    // Round-trip: when the same city is BOTH start and end of
                    // the trip we collapse the two ribbons into a single
                    // two-tone "התחלה / סיום" badge so they don't stack.
                    if (role === 'end' && found.role === 'start') found.role = 'roundtrip';
                    else if (role === 'start' && found.role === 'end') found.role = 'roundtrip';
                    else if (role === 'end' && found.role !== 'roundtrip') found.role = 'end';
                    else if (role === 'start' && found.role === 'middle') found.role = 'start';
                } else {
                    // Use the CITY name (`stop.name`) for both the pill label
                    // and the click target — `stop.displayName` is the hotel
                    // name (e.g. "Holiday Inn Pattaya") which neither fits the
                    // 11-char pill width nor matches when handleCityPillClick
                    // filters items by city.
                    stopGroups.push({
                        coords: stop.coords,
                        name: stop.name,
                        nums: [num],
                        role,
                        colorIdx: idx,
                    });
                }
            });

            stopGroups.forEach(group => {
                const color = STOP_COLORS[group.colorIdx % STOP_COLORS.length];

                // Skip the standalone stop pill ONLY when (a) it coincides
                // with a hotel AND (b) the hotel pin is currently visible —
                // i.e. we're at city-level zoom (tier ≥ 3) and either no
                // city filter or the matching one. At trip-overview zoom
                // (tier ≤ 2 with ALL view), hotel pins are hidden by the
                // declutter rule above, so the stop pill IS the city marker
                // and must render.
                const isOnHotel = stopCoincidesWithHotel(group.coords.lat, group.coords.lng);
                const hotelVisibleHere = tier >= 3 || activeCity !== 'ALL';
                if (isOnHotel && hotelVisibleHere) {
                    bounds.extend([group.coords.lat, group.coords.lng]);
                    return;
                }

                const icon = makeStopPill(group.nums, group.name, color, group.role);

                const stopMarker = L.marker([group.coords.lat, group.coords.lng], { icon, zIndexOffset: 2000 })
                    .addTo(routeLayer);

                // Tapping the stop pill = same behaviour as tapping the
                // city button.
                stopMarker.on('click', () => {
                    handleCityPillClick(group.name);
                });

                bounds.extend([group.coords.lat, group.coords.lng]);
            });
        }

        // Fit bounds — but when a destination is set (e.g. "תאילנד") and we're
        // on the ALL view, prefer a bounds that only includes stops *near* the
        // destination so far-away layovers (Abu Dhabi, Frankfurt, etc.) don't
        // zoom the map out to a hemisphere view. Layover pins stay drawn —
        // they're just not the focal point.
        const applyBounds = (b: L.LatLngBounds) => {
            // Snap-back gate: once the user has manually panned/zoomed, don't
            // re-fit them.
            if (userInteractedRef.current) return;
            // City focus is owned by the parent — chip clicks call setFlyTo
            // with bounds, and the map's flyTo effect drives the camera. If
            // we ALSO fit here, the marker effect runs first (effects fire
            // in source order), snaps the camera to whole-trip bounds, and
            // the user perceives "needs two clicks" because only the second
            // click skips this snap (its activeCity didn't change). So:
            // when a city is focused, only the flyTo effect should move the
            // camera. applyBounds stays for the whole-trip auto-fit.
            if (activeCity !== 'ALL') return;
            // Tighter default zoom + less padding on the "ALL" view so the
            // trip's actual geography fills more of the screen.
            const padding: [number, number] = [40, 40];
            const fittedMax = 14;
            const maxZoom = compactView ? 11 : fittedMax;
            map.fitBounds(b, { padding, maxZoom, duration: 1 });
        };

        if (bounds.isValid()) {
            if (activeCity === 'ALL' && trip?.destination && !items) {
                // Prefer English destination for geocoding — Hebrew multi-city strings
                // like "בנגקוק - פטאיה - קו צ'אנג" fail on both Photon and Nominatim.
                const destQuery = trip.destinationEnglish || trip.destination;
                const destCacheKey = `dest:${destQuery}`;
                const validatedDestCache = lookupCachedCoords(geocodedCache, destCacheKey, trip);
                const destPromise = validatedDestCache
                    ? Promise.resolve(validatedDestCache)
                    : geocodeForTrip(destQuery, trip).then(c => {
                            if (c) {
                                setGeocodedCache(prev => {
                                    const next = { ...prev, [destCacheKey]: c };
                                    saveGeoCache(next);
                                    return next;
                                });
                            }
                            return c;
                      });

                destPromise.then(destCoords => {
                    // Guard: map may have unmounted before this async callback fires.
                    if (!mapInstanceRef.current) return;
                    if (!destCoords) {
                        applyBounds(bounds);
                        return;
                    }

                    // Build a "near destination" bounds — include stops within
                    // 1500km of the destination centroid. Thailand → Bangkok/
                    // Pattaya/Koh Chang all included; Abu Dhabi (~4000km) left
                    // as a visible pin but excluded from the auto-fit.
                    const DEST_RADIUS_KM = 1500;
                    const nearBounds = L.latLngBounds([]);
                    routeStops.forEach(s => {
                        if (!s.coords) return;
                        const dist = getDistanceKm(s.coords.lat, s.coords.lng, destCoords.lat, destCoords.lng);
                        if (dist <= DEST_RADIUS_KM) nearBounds.extend([s.coords.lat, s.coords.lng]);
                    });
                    visibleItems.forEach(item => {
                        if (item.type === 'airport' || !isValidCoordinate(item.lat, item.lng)) return;
                        const dist = getDistanceKm(item.lat!, item.lng!, destCoords.lat, destCoords.lng);
                        if (dist <= DEST_RADIUS_KM) nearBounds.extend([item.lat!, item.lng!]);
                    });
                    // Always include the destination itself as an anchor
                    nearBounds.extend([destCoords.lat, destCoords.lng]);

                    applyBounds(nearBounds.isValid() ? nearBounds : bounds);
                });
            } else {
                applyBounds(bounds);
            }
        } else if (trip?.destination) {
            const destQuery = trip.destinationEnglish || trip.destination;
            geocodeForTrip(destQuery, trip).then(c => {
                if (!mapInstanceRef.current) return;
                if (c) map.setView([c.lat, c.lng], 8);
            });
        }

        [100, 500].forEach(t => setTimeout(() => map.invalidateSize(), t));
    }, [mapItems, activeCity, trip, routeStops, airportCoords, legClassifications, waypointCoords, walkingCircles, heatmap, layerFlags.route, layerFlags.hotels, layerFlags.myLists, layerFlags.aiRestaurants, layerFlags.aiAttractions, mapZoom, popupRebuildToken]);


    // City-pill click handler (Option A + double-tap):
    //   • Single tap: setActiveCity → marker effect filters items to that
    //     city + applyBounds smoothly fits the camera. Closes any open
    //     popup so the marker rebuild fires (popupOpenRef would otherwise
    //     gate it).
    //   • Double-tap on the SAME pill within 1.5s: step to the next hotel
    //     in that city with a tighter flyTo + open its popup. Loops.
    const lastCityClickRef = useRef<{ city: string; ts: number; idx: number } | null>(null);
    const handleCityPillClick = (cityName: string | 'ALL') => {
        const now = Date.now();
        const last = lastCityClickRef.current;
        const map = mapInstanceRef.current;
        // eslint-disable-next-line no-console
        console.info(`[CityClick] ${cityName} | mapReady=${!!map} | mapItems=${mapItems.length} | popupOpen=${popupOpenRef.current}`);

        if (map && popupOpenRef.current) {
            map.closePopup();
            popupOpenRef.current = false;
        }

        // Double-tap on the same NON-ALL pill → step through that city's hotels.
        // Reads from MAPITEMS (which has the resolved coords from geocoding)
        // not trip.hotels (which often has no lat/lng on this trip).
        if (cityName !== 'ALL' && last?.city === cityName && now - last.ts < 1500 && map) {
            const targetKey = cityKey(cityName);
            const keywords = getCityKeywords(cityName);
            const cityHotels = mapItems.filter(i => {
                if (i.type !== 'hotel' || !isValidCoordinate(i.lat, i.lng)) return false;
                if (targetKey && cityKey(i.city || '') === targetKey) return true;
                const addr = (i.address || '').toLowerCase();
                const iCity = (i.city || '').toLowerCase();
                return keywords.some(kw => addr.includes(kw) || iCity.includes(kw));
            });
            if (cityHotels.length > 0) {
                const nextIdx = (last.idx + 1) % cityHotels.length;
                const h = cityHotels[nextIdx];
                map.stop();
                userInteractedRef.current = true;
                map.flyTo([h.lat as number, h.lng as number], 16, { duration: 0.8 });
                lastCityClickRef.current = { city: cityName, ts: now, idx: nextIdx };
                return;
            }
        }

        // Single tap (or first tap on this city). Compute target bounds and
        // fly the camera DIRECTLY — don't rely on the marker effect's
        // applyBounds chain (gated by userInteractedRef and other guards
        // that can race against the click). The marker effect will still
        // fire to refresh items, but the camera move is decoupled and
        // happens immediately.
        if (map) {
            const targetItems = cityName === 'ALL'
                ? mapItems.filter(i => isValidCoordinate(i.lat, i.lng) && i.type !== 'airport')
                : (() => {
                    const targetKey = cityKey(cityName);
                    const keywords = getCityKeywords(cityName);
                    return mapItems.filter(i => {
                        if (!isValidCoordinate(i.lat, i.lng)) return false;
                        if (i.type === 'airport') return false;
                        if (targetKey && cityKey(i.city || '') === targetKey) return true;
                        const addr = (i.address || '').toLowerCase();
                        const iCity = (i.city || '').toLowerCase();
                        return keywords.some(kw => addr.includes(kw) || iCity.includes(kw));
                    });
                })();

            // eslint-disable-next-line no-console
            console.info(`[CityClick] ${cityName} → targetItems=${targetItems.length}`);
            let didFly = false;
            if (targetItems.length > 0) {
                const targetBounds = L.latLngBounds(targetItems.map(i => [i.lat as number, i.lng as number] as [number, number]));
                if (targetBounds.isValid()) {
                    userInteractedRef.current = false;
                    map.stop();
                    map.flyToBounds(targetBounds, {
                        padding: [60, 60],
                        maxZoom: cityName === 'ALL' ? 11 : 15,
                        duration: 1.0,
                    });
                    didFly = true;
                }
            }

            // Fallback: no items have coords yet (still geocoding) — geocode
            // the city/destination on the fly so the click ALWAYS does
            // something visible. Keeps the click responsive even before the
            // marker pipeline has caught up.
            if (!didFly && trip) {
                const fallbackQuery = cityName === 'ALL'
                    ? (trip.destinationEnglish || trip.destination || '')
                    : cityName;
                if (fallbackQuery) {
                    // eslint-disable-next-line no-console
                    console.info(`[CityClick] no items yet — geocoding "${fallbackQuery}" as fallback`);
                    geocodeForTrip(fallbackQuery, trip).then(coords => {
                        if (!coords || !mapInstanceRef.current) return;
                        userInteractedRef.current = false;
                        mapInstanceRef.current.stop();
                        mapInstanceRef.current.flyTo(
                            [coords.lat, coords.lng],
                            cityName === 'ALL' ? 8 : 13,
                            { duration: 1.0 },
                        );
                    });
                }
            }
        }

        setActiveCity(cityName);
        lastCityClickRef.current = { city: cityName, ts: now, idx: -1 };
    };

    // Refresh button — clears the geocoding cache + forces the geocoding
    // effect to re-run from scratch. Useful when a hotel was misplaced on
    // first run (often because Photon resolved the wrong POI) and the user
    // wants a fresh attempt.
    const handleMapRefresh = () => {
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* private mode */ }
        setGeocodedCache({});
        // Strip coords from current mapItems so the geocoding effect has
        // pending items to re-run on. The effect's pending check is
        // `!isValidCoordinate(i.lat, i.lng) && i.address`.
        setMapItems(prev => prev.map(i => ({ ...i, lat: undefined, lng: undefined })));
        userInteractedRef.current = false;
    };

    // Fly to a position OR fit a bounds rectangle. Renders a "you are here"
    // marker only when the caller tags the fly as `kind: 'gps'` — UI-driven
    // flies (chip clicks) leave the marker layer untouched.
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !flyTo) return;

        map.stop();
        // Suppress the marker effect's applyBounds snap-back so our fly wins.
        userInteractedRef.current = true;

        if ('bounds' in flyTo) {
            const b = L.latLngBounds(flyTo.bounds);
            if (b.isValid()) {
                map.flyToBounds(b, {
                    padding: [60, 60],
                    maxZoom: flyTo.maxZoom ?? 14,
                    duration: 1.0,
                });
            }
        } else {
            map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 15, { duration: 1.2 });
        }

        // Remove the previous locate marker on every fly so a stale "אתה כאן"
        // doesn't linger on the wrong spot after a chip-click reveal fly.
        if (locateMarkerRef.current) {
            locateMarkerRef.current.remove();
            locateMarkerRef.current = null;
        }
        // Render the marker only when the fly was triggered by GPS — chip
        // clicks never want a "you are here" pin.
        if (flyTo.kind === 'gps' && !('bounds' in flyTo)) {
            locateMarkerRef.current = L.circleMarker([flyTo.lat, flyTo.lng], {
                radius: 10,
                color: '#2563eb',
                weight: 3,
                fillColor: '#fff',
                fillOpacity: 1,
            })
                .bindTooltip('אתה כאן', { direction: 'top', permanent: false })
                .addTo(map);
        }
    }, [flyTo]);

    // --- UI ---
    return (
        <div
            className={embedded
                ? 'w-full h-full relative'
                : 'w-full relative bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 animate-fade-in'}
            style={{ direction: 'ltr' }}
        >

            {/* Top City Filter Bar — hidden when a wrapper renders its own
                 chrome (FullTripMapView), so we don't double-render the chips. */}
            {!embedded && (
                <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-center pointer-events-none">
                    <div className="bg-white/97 backdrop-blur-2xl p-1.5 rounded-2xl shadow-2xl border border-white/70 flex gap-1.5 overflow-x-auto max-w-full pointer-events-auto no-scrollbar items-center">
                        <button
                            onClick={() => handleCityPillClick('ALL')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeCity === 'ALL' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                        >
                            <MapIcon className="w-3.5 h-3.5" />
                            כל המסלול
                        </button>
                        <div className="w-px h-5 bg-slate-200" />
                        {cities.map(c => (
                            <button
                                key={c.name}
                                onClick={() => handleCityPillClick(c.name)}
                                title={activeCity === c.name ? 'לחיצה נוספת — מעבר למלון הבא בעיר' : `התמקד ב-${c.name}`}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeCity === c.name ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'}`}
                            >
                                {c.name}
                                {c.count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeCity === c.name ? 'bg-white/25 text-white' : 'bg-indigo-50 text-indigo-500'}`}>{c.count}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Loading + geocoding overlay — full-map centered card. The
                previous thin top stripe + bottom-left pill weren't visible
                enough; users thought the map had hung. This overlay covers
                the map with a soft scrim + a centered card showing a
                spinner, the work being done, and a progress counter. The
                map underneath is still tappable through the scrim only at
                the card edges (the card itself is non-interactive). */}
            {(loading || (geocodeProgress.total > 0 && geocodeProgress.done < geocodeProgress.total)) && (
                <div className="absolute inset-0 z-[2001] flex items-center justify-center bg-white/35 backdrop-blur-[2px] pointer-events-none">
                    <div className="bg-white/97 backdrop-blur shadow-2xl rounded-2xl px-5 py-4 flex items-center gap-3 border border-slate-200 max-w-[280px]" dir="rtl">
                        <div className="relative w-10 h-10 flex-shrink-0">
                            <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                            </div>
                        </div>
                        <div className="text-right min-w-0 flex-1">
                            <div className="text-sm font-black text-brand-navy">מחשב מיקומים על המפה</div>
                            {geocodeProgress.total > 0 ? (
                                <>
                                    <div className="text-xs text-slate-500 mt-0.5 font-bold">
                                        {geocodeProgress.done} מתוך {geocodeProgress.total} מקומות
                                    </div>
                                    <div className="mt-1.5 h-1 rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                                            style={{ width: `${(geocodeProgress.done / geocodeProgress.total) * 100}%` }}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="text-xs text-slate-500 mt-0.5">רגע אחד…</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Zoom-in hint — moved to the bottom (above the bottom stats
                 bar) so it doesn't fight the city-filter pills at the top.
                 Lower z-index than markers so it never blocks pin clicks. */}
            {mapZoom < 11 && activeCity === 'ALL' && (mapItems.some(i => i.type === 'restaurant' || i.type === 'attraction')) && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[600] bg-white/95 backdrop-blur px-3 py-1.5 rounded-full shadow-md border border-slate-200 flex items-center gap-1.5 pointer-events-none">
                    <span className="text-[11px] font-bold text-slate-600">🔍 התקרב כדי לראות מסעדות ואטרקציות</span>
                </div>
            )}

            {/* Fit-to-trip button — clears the snap-back gate and re-fits the
                 entire trip into view. Appears only after the user has manually
                 panned/zoomed (i.e. when their view is no longer the auto-fit). */}
            <button
                onClick={() => {
                    userInteractedRef.current = false;
                    // Trigger re-render so the marker effect calls applyBounds again.
                    setMapZoom(z => z); // no-op set forces dep refresh in dev only
                    const map = mapInstanceRef.current;
                    if (!map) return;
                    // Build bounds from all visible markers + route stops
                    const b = L.latLngBounds([]);
                    mapItems.forEach(i => {
                        if (isValidCoordinate(i.lat, i.lng)) b.extend([i.lat as number, i.lng as number]);
                    });
                    routeStops.forEach(s => {
                        if (s.coords) b.extend([s.coords.lat, s.coords.lng]);
                    });
                    if (b.isValid()) {
                        map.fitBounds(b, { padding: [40, 40], maxZoom: 13, duration: 0.7 });
                    }
                }}
                title="התאם לטיול כולו"
                aria-label="התאם לטיול כולו"
                className="absolute bottom-28 right-4 z-[700] w-10 h-10 inline-flex items-center justify-center bg-white hover:bg-slate-50 rounded-full shadow-lg border border-slate-200 text-slate-600 transition-all active:scale-95"
            >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4" />
                </svg>
            </button>

            {/* Refresh map data — clears the geocoding cache and triggers a
                 fresh geocode pass. Useful after changing a hotel's address
                 or when a pin is in the wrong place because Photon picked the
                 wrong POI on first run. Sits stacked above the fit-to-trip
                 button so the corner stays organized. */}
            <button
                onClick={handleMapRefresh}
                title="רענן מיקומים"
                aria-label="רענן מיקומים"
                className="absolute bottom-40 right-4 z-[700] w-10 h-10 inline-flex items-center justify-center bg-white hover:bg-slate-50 rounded-full shadow-lg border border-slate-200 text-slate-600 transition-all active:scale-95"
            >
                <RefreshCw className="w-4 h-4" />
            </button>

            {/* (Loading indicator moved to the centered full-map overlay above) */}

            {/* Map */}
            <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-10 bg-slate-50" />

            {/* Bottom Timeline Strip — mobile: vertical list inside a
                 collapsible drawer. Desktop: horizontal strip as before.
                 Hidden in embedded mode (wrapper draws its own chrome). */}
            {!embedded && routeStops.length > 0 && activeCity === 'ALL' && (
                <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white/97 backdrop-blur-xl border-t border-slate-100 shadow-xl max-h-[40vh] overflow-y-auto">
                    <div
                        className="flex md:flex-row flex-wrap items-center gap-y-1 gap-x-0 p-2 sm:p-3 md:overflow-x-auto md:overflow-y-visible md:flex-nowrap no-scrollbar"
                        dir="rtl"
                    >
                        {routeStops.map((stop, idx) => {
                            const COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'];
                            const color = COLORS[idx % COLORS.length];
                            const isLast = idx === routeStops.length - 1;
                            return (
                                <div key={idx} className="flex items-center shrink-0">
                                    <button
                                        onClick={() => {
                                            setActiveStop(activeStop === idx ? null : idx);
                                            if (stop.coords && mapInstanceRef.current) {
                                                mapInstanceRef.current.flyTo([stop.coords.lat, stop.coords.lng], 12, { duration: 1.2 });
                                            }
                                        }}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded-xl transition-all group ${activeStop === idx ? 'bg-slate-100 shadow-sm' : 'hover:bg-slate-50 active:bg-slate-100'}`}
                                    >
                                        <div style={{ background: color }} className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-white font-black text-2xs sm:text-xs shadow-md shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xs text-slate-400 font-semibold hidden sm:block">{stop.emoji} {stop.type === 'flight' ? 'טיסה' : stop.type === 'hotel' ? 'מלון' : 'עצירה'}</div>
                                            <div className="text-2xs sm:text-xs font-bold text-slate-800 whitespace-nowrap max-w-[140px] sm:max-w-none truncate">{stop.displayName || stop.name}</div>
                                        </div>
                                    </button>
                                    {!isLast && (
                                        <div className="hidden md:flex items-center mx-1 shrink-0">
                                            <div style={{ background: `linear-gradient(to right, ${color}, ${COLORS[(idx + 1) % COLORS.length]})` }}
                                                className="h-0.5 w-6 rounded-full opacity-40" />
                                            <div className="text-slate-300 text-xs mx-0.5">›</div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* "Fix location" modal — opened from a hotel popup's "תקן מיקום"
                 pill. Lets the user paste a Google Maps URL whose !3d!4d
                 coords overwrite the hotel's stored lat/lng + googleMapsUrl.
                 Only mounted when both `onUpdateTrip` and a target are set. */}
            {onUpdateTrip && fixLocationFor && trip && (
                <FixLocationModal
                    hotelName={fixLocationFor.hotelName}
                    onCancel={() => setFixLocationFor(null)}
                    onSave={(url) => {
                        const trimmed = url.trim();
                        const coords = extractCoordsFromMapsUrl(trimmed);
                        // Short share URLs (maps.app.goo.gl/...) don't expose coords —
                        // tell the user explicitly so they don't think the modal "ate"
                        // their input. Same for any URL with no coord patterns.
                        if (!coords) {
                            const isShortUrl = /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(trimmed);
                            return isShortUrl
                                ? 'הקישור הוא קישור מקוצר ולא מכיל קואורדינטות. פתח אותו ב-Google Maps והעתק את ה-URL המלא משורת הכתובת.'
                                : 'לא הצלחתי לזהות קואורדינטות בקישור. ודא שהעתקת קישור מ-Google Maps עם נקודה ספציפית (כולל @lat,lng או !3d!4d).';
                        }
                        const matched = (trip.hotels || []).find(h => h.id === fixLocationFor.hotelId);
                        if (!matched) {
                            // eslint-disable-next-line no-console
                            console.error('[FixLocation] hotelId not found in trip', fixLocationFor.hotelId);
                            return 'לא נמצא המלון בנתוני הטיול — נסה לרענן את הדף.';
                        }
                        const updated: Trip = {
                            ...trip,
                            hotels: (trip.hotels || []).map(h =>
                                h.id === fixLocationFor.hotelId
                                    ? { ...h, lat: coords.lat, lng: coords.lng, googleMapsUrl: trimmed }
                                    : h,
                            ),
                        };
                        // eslint-disable-next-line no-console
                        console.info(
                            `[FixLocation] saving "${matched.name}" → (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
                            { url: trimmed, hotelId: fixLocationFor.hotelId },
                        );
                        onUpdateTrip(updated);
                        toast.success(`המיקום של ${matched.name} עודכן`);
                        setFixLocationFor(null);
                        return null;
                    }}
                />
            )}
        </div>
    );
};

// ============================================================================
// "Fix location" modal — small inline component because it owns no state
// outside its own input + error string.
// ============================================================================
interface FixLocationModalProps {
    hotelName: string;
    onCancel: () => void;
    /** Returns an error string to display, or null on success. */
    onSave: (url: string) => string | null;
}

const FixLocationModal: React.FC<FixLocationModalProps> = ({ hotelName, onCancel, onSave }) => {
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = () => {
        const result = onSave(url);
        if (result) setError(result);
    };

    return (
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={`תקן מיקום עבור ${hotelName}`}
            dir="rtl"
            onClick={onCancel}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-sm font-black text-slate-900 mb-1">תקן מיקום מלון</h3>
                <p className="text-xs text-slate-600 mb-3 leading-snug">
                    הדבק קישור מ-Google Maps עבור <span className="font-bold">{hotelName}</span>. נחלץ מהקישור את הקואורדינטות המדויקות ונעדכן את המלון.
                </p>
                <textarea
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setError(null); }}
                    placeholder="https://www.google.com/maps/place/..."
                    rows={3}
                    dir="ltr"
                    className="w-full text-xs font-mono p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:outline-none resize-none"
                    autoFocus
                />
                {error && (
                    <p className="text-[11px] text-red-600 mt-2 leading-snug">{error}</p>
                )}
                <div className="flex items-center justify-end gap-2 mt-4">
                    <button
                        onClick={onCancel}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                        ביטול
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!url.trim()}
                        className="px-3 py-1.5 rounded-lg text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                        שמור
                    </button>
                </div>
            </div>
        </div>
    );
};
