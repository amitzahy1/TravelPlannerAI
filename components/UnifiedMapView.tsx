import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Trip } from '../types';
import { Loader2, Map as MapIcon } from 'lucide-react';
import { extractRobustCity, cleanCityName, cityKey } from '../utils/geoData';
import { getCountryBbox, coordInBbox, extractCoordsFromMapsUrl, toEnglishCountryName } from '../utils/geocodePlaces';
import { isPlaceInTripScope, getTripCountryBbox } from '../utils/tripScope';
import { classifyTripRoute, transportEmojiForMode, transportLabelForMode, LegClassification } from '../services/routeClassifier';
import { SMALL_AIRPORT_COORDS } from '../utils/airportTimezones';
import { MODE_COLORS } from '../utils/transportColors';
import { HoverPreviewCard } from './map/HoverPreviewCard';
import { MapItemPopup } from './map/MapItemPopup';

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
    // object reference each time a fly is desired (e.g. GPS locate).
    flyTo?: { lat: number; lng: number; zoom?: number } | null;
    // Optional callback wired by RestaurantsView/AttractionsView so the map
    // popup can save an AI suggestion to the user's list. The popup shows
    // an "add to my list" CTA only when this callback is provided AND the
    // item's source is 'ai'.
    onAddToList?: (item: MapItem) => void;
    // Lowercased name set used by the popup to detect when an AI suggestion
    // is already saved (toggles the CTA into a "✓ saved" state).
    savedNames?: Set<string>;
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

// --- PREMIUM PIN MARKER ---

const makePinIcon = (
    config: typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG],
    label?: string,
    source: 'saved' | 'ai' = 'saved',
) => {
    const [c1, c2] = config.gradient;
    // When a label is supplied we render a name pill above the pin so the
    // user can read every place's name at a glance without clicking. Long
    // names are truncated to keep neighbouring pins from colliding.
    const trimmed = label ? (label.length > 26 ? label.slice(0, 25) + '…' : label) : '';
    const labelHtml = trimmed ? `
        <div style="
            background:${source === 'ai' ? '#ffffffd9' : 'white'};
            border:1px ${source === 'ai' ? 'dashed' : 'solid'} ${c1}${source === 'ai' ? '88' : '55'};border-radius:8px;
            padding:2px 8px;font-size:10px;font-weight:700;color:${source === 'ai' ? '#475569' : '#0f172a'};
            box-shadow:0 2px 6px rgba(15,23,42,0.18);white-space:nowrap;
            font-family:'Rubik','Inter',sans-serif;line-height:1.3;
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
    // The wrapper needs a known width for proper Leaflet anchoring. We use
    // `min-width:44px` (the pin width) so the icon centers on its lat/lng,
    // and `width:max-content` so the label can grow and wrap above.
    const html = `
        <div style="position:relative; min-width:44px; display:inline-flex; flex-direction:column; align-items:center;">
            ${labelHtml}
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
                width:6px; height:10px; margin-top:-2px;
                background:linear-gradient(to bottom,${c1}${source === 'ai' ? 'aa' : ''},${c2}${source === 'ai' ? 'aa' : ''});
                clip-path:polygon(50% 100%,0 0,100% 0);
            "></div>
        </div>
    `;
    // iconSize=[0,0] lets the divIcon size to its content via inline-flex.
    // iconAnchor anchors at the bottom-center of the 52px-tall pin (52 minus
    // any label height — Leaflet will render relative to actual DOM size).
    return L.divIcon({ html, className: '', iconSize: [0, 0], iconAnchor: [22, 52], popupAnchor: [0, -56] });
};

// --- ROUTE STOP PILL ---
const makeStopPill = (num: number, name: string, emoji: string, color: string) => {
    // Trim names so stacked pins don't all grow long and collide.
    const display = name.length > 26 ? name.slice(0, 23) + '…' : name;
    const html = `
        <div style="
            display:inline-flex; align-items:center; gap:5px;
            background:white;
            border-radius:999px;
            padding:3px 10px 3px 3px;
            box-shadow:0 3px 10px rgba(15,23,42,0.18),0 1px 3px rgba(15,23,42,0.08);
            border:1px solid rgba(255,255,255,0.9);
            white-space:nowrap;
            font-family:'Rubik','Inter',sans-serif;
            position:relative;
            max-width:220px;
        ">
            <div style="
                width:22px; height:22px; border-radius:50%;
                background:linear-gradient(135deg,${color},${color}cc);
                color:white; font-weight:900; font-size:11px;
                display:flex; align-items:center; justify-content:center;
                box-shadow:0 2px 6px ${color}50;
                flex-shrink:0;
            ">${num}</div>
            <span style="font-size:11px; font-weight:700; color:#1e293b; letter-spacing:0.1px;">${emoji} ${display}</span>
        </div>
    `;
    return L.divIcon({ html, className: '', iconSize: [0, 0], iconAnchor: [-8, 11] });
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

const AIRPORT_PROXIMITY_KM = 120;

const getSegmentTransport = (
    fromStop: RouteStop, toStop: RouteStop, trip: Trip, distKm: number,
    airportCoords: Record<string, { lat: number; lng: number }>,
): SegmentTransportInfo => {
    // 1. Flight match — distance-based. Tries each flight segment: if its
    //    departure airport is within 120 km of fromStop AND its arrival
    //    airport is within 120 km of toStop, it's the same leg.
    //    This catches cases like Trat airport ↔ Koh Chang hotel.
    const segs = trip.flights?.segments || [];
    const matchedFlight = segs.find(s => {
        // Prefer coords lookup by IATA code (airportCoords is populated
        // from the geocode cache keyed on "XXX Airport" or the city name).
        const fromKey = (s.fromCode || s.fromCity || '').toLowerCase();
        const toKey = (s.toCode || s.toCity || '').toLowerCase();
        const fromC = airportCoords[fromKey] || airportCoords[(s.fromCity || '').toLowerCase()];
        const toC = airportCoords[toKey] || airportCoords[(s.toCity || '').toLowerCase()];

        const fromDist = endpointDistanceKm(fromC?.lat, fromC?.lng, fromStop);
        const toDist = endpointDistanceKm(toC?.lat, toC?.lng, toStop);

        // Primary: both endpoints geographically near the stops.
        if (fromDist <= AIRPORT_PROXIMITY_KM && toDist <= AIRPORT_PROXIMITY_KM) return true;

        // Fallback: exact city/code string match (kept so flights without
        // geocoded airports still match).
        const fromStr = s.fromCity?.toLowerCase() === fromStop.name.toLowerCase() ||
            s.fromCode?.toLowerCase() === (fromStop.code?.toLowerCase() || '');
        const toStr = s.toCity?.toLowerCase() === toStop.name.toLowerCase() ||
            s.toCode?.toLowerCase() === (toStop.code?.toLowerCase() || '');
        return fromStr && toStr;
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

    // 3. Default: drive. We explicitly do NOT guess "flight?" for long
    //    distances anymore — the user's convention is "if no flight is
    //    recorded, assume we're driving". This also removes the noisy
    //    "חסר מידע" warning badge.
    return { mode: 'drive', emoji: '🚗', label: 'נסיעה', hasTransportData: true };
};

const estimateTravelTime = (distKm: number, mode: string): string => {
    if (mode === 'flight') {
        const h = Math.max(1, Math.round(distKm / 800));
        return h <= 1 ? '~1 שעה' : `~${h} שעות`;
    }
    if (mode === 'train') {
        const h = distKm / 150;
        return h < 1 ? `~${Math.round(h * 60)} דק'` : `~${h.toFixed(1)} שעות`;
    }
    const h = distKm / 80;
    return h < 1 ? `~${Math.round(h * 60)} דק'` : `~${(Math.round(h * 10) / 10)} שעות`;
};

const fmtDistKm = (km: number): string =>
    km >= 1000 ? `${(km / 1000).toFixed(1)}K ק"מ` : `${Math.round(km)} ק"מ`;

const makeRouteBadge = (distKm: number, transport: SegmentTransportInfo, color: string): L.DivIcon => {
    const displayTime = transport.duration || estimateTravelTime(distKm, transport.mode);
    // Compact: single row "emoji label · time · distance". No more warning
    // chip — if no flight, we drive by default, which is not a failure.
    const html = `<div style="
        display:inline-flex;align-items:center;gap:5px;
        background:white;border-radius:999px;
        padding:3px 9px 3px 8px;
        box-shadow:0 2px 8px rgba(15,23,42,.14),0 1px 2px rgba(15,23,42,.08);
        border:1px solid ${color}33;
        font-family:'Rubik','Inter',sans-serif;
        white-space:nowrap;direction:rtl;
    ">
        <span style="font-size:12px;line-height:1">${transport.emoji}</span>
        <span style="font-size:10px;font-weight:800;color:${color};letter-spacing:.01em">${transport.label}</span>
        <span style="color:#cbd5e1;font-size:8px">•</span>
        <span style="font-size:10px;color:#475569;font-weight:700">${displayTime}</span>
        <span style="color:#cbd5e1;font-size:8px">•</span>
        <span style="font-size:10px;color:#475569;font-weight:600">${fmtDistKm(distKm)}</span>
    </div>`;
    return L.divIcon({ html, className: '', iconSize: [0, 0], iconAnchor: [0, 12] });
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
    // (which would cause infinite render loops).
    const geocodedCacheRef = useRef<Record<string, { lat: number; lng: number }>>({});

    const [mapItems, setMapItems] = useState<MapItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [geocodeProgress, setGeocodeProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
    const [activeCity, setActiveCity] = useState<string | 'ALL'>('ALL');
    const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
    const [activeStop, setActiveStop] = useState<number | null>(null);
    const [hoveredItem, setHoveredItem] = useState<MapItem | null>(null);
    const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

    // Sync externally-controlled city → internal state. When
    // `controlledActiveCity` is `undefined` the component manages its own
    // city state (existing per-tab callers). `null` means "all cities".
    useEffect(() => {
        if (controlledActiveCity === undefined) return;
        setActiveCity(controlledActiveCity ?? 'ALL');
    }, [controlledActiveCity]);

    // Dedicated city flyTo: when the external city selection changes,
    // immediately geocode that city and fly the map there. This is separate
    // from the render useEffect so it fires reliably even when items for
    // the selected city haven't been geocoded yet.
    useEffect(() => {
        if (!controlledActiveCity) return; // null → ALL view, nothing to fly to
        const map = mapInstanceRef.current;
        if (!map) return;

        // Country bbox from trip — passed alongside `items` by RestaurantsView /
        // AttractionsView so we can constrain Photon and reject wrong-country results.
        const tripBbox = trip
            ? (getTripCountryBbox(trip) || getCountryBbox(trip.destinationEnglish || trip.destination || ''))
            : null;
        // Always use an English country name for Photon — Hebrew strings like
        // "תאילנד 26 ימים" confuse the geocoder and can return Georgia or Israel.
        const countryName = toEnglishCountryName(trip?.destinationEnglish || trip?.destination || '');

        const cacheKey = `city:${controlledActiveCity}`;
        const cached = geocodedCacheRef.current[cacheKey];
        if (cached) {
            // Reject cached city coords outside the country (saved before bbox validation).
            if (tripBbox && !coordInBbox(cached.lat, cached.lng, tripBbox)) {
                delete geocodedCacheRef.current[cacheKey];
            } else {
                map.flyTo([cached.lat, cached.lng], 13, { duration: 1 });
                return;
            }
        }

        // Prefer English name — better Photon coverage. getCityKeywords returns
        // the Hebrew name plus any English alias; grab the first ASCII-only variant.
        const keywords = getCityKeywords(controlledActiveCity);
        const baseQuery = keywords.find(k => /^[a-z]/i.test(k) && k !== controlledActiveCity.toLowerCase())
            ?? controlledActiveCity;
        // Append country name so "Pattaya" → "Pattaya, Thailand" — disambiguates
        // against same-named places in other countries and improves Photon ranking.
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
            m.flyTo([coords.lat, coords.lng], 13, { duration: 1 });
        });
    }, [controlledActiveCity, trip]); // eslint-disable-line react-hooks/exhaustive-deps

    const [geocodedCache, setGeocodedCache] = useState<Record<string, { lat: number; lng: number }>>(loadGeoCache);

    // Keep geocodedCacheRef in sync so the mapItems useEffect can read it.
    useEffect(() => { geocodedCacheRef.current = geocodedCache; }, [geocodedCache]);

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
                    raw.push({
                        id: h.id, type: 'hotel', name: h.name, address: h.address,
                        lat: h.lat, lng: h.lng, description: h.roomType, date: h.checkInDate, city,
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
                        id: r.id, type: 'restaurant', name: r.name, address: r.location,
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
                        id: a.id, type: 'attraction', name: a.name, address: a.location,
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
                            id: r.id, type: 'restaurant', name: r.name, address: r.location,
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
                            id: a.id, type: 'attraction', name: a.name, address: a.location,
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

        // Strip coordinates that fall outside the trip's country bbox — prevents
        // Photon mismatches (e.g. "Koh Chang" resolving to a Norwegian village)
        // from warping the auto-fit viewport to show the whole world.
        // Airport items use IATA-keyed coords from our own table — always keep them.
        raw.forEach(item => {
            if (item.type === 'airport') return;
            if (!inCountry(item.lat, item.lng)) {
                item.lat = undefined;
                item.lng = undefined;
            }
        });

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
    }, [trip, items, layerFlags.route, layerFlags.hotels, layerFlags.myLists, layerFlags.aiRestaurants, layerFlags.aiAttractions]);

    // 2. Geocode missing items — batched 5-concurrent to cut wait from 7s → ~2s.
    //    Items appear on the map progressively as each batch resolves.
    useEffect(() => {
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

                setGeocodeProgress(p => ({ ...p, done: Math.min(p.total, p.done + batch.length) }));
                if (batchStart + BATCH_SIZE < pending.length) {
                    await new Promise(r => setTimeout(r, 200));
                }
            }

            setLoading(false);
            setGeocodeProgress({ done: 0, total: 0 });
        };
        run();
    }, [mapItems.length]);

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

            // Identify the home city — typically both the first departure and
            // the last arrival. Any stop matching this key is dropped from
            // the numbered route (flight origin + return).
            const firstFromKey = segs[0]?.fromCity ? cityKey(segs[0].fromCity) : '';
            const lastToKey = segs.length > 0 && segs[segs.length - 1].toCity
                ? cityKey(segs[segs.length - 1].toCity!)
                : '';
            const homeKeys = new Set<string>();
            if (firstFromKey) homeKeys.add(firstFromKey);
            // Only treat last-arrival as home if it matches the first-origin —
            // otherwise a one-way trip (TLV→Tokyo no return) would lose Tokyo.
            if (lastToKey && lastToKey === firstFromKey) homeKeys.add(lastToKey);

            if (segs.length > 0) {
                segs.forEach(seg => {
                    if (!seg.toCity) return;
                    const ts = parseTripDate(seg.date)?.getTime() || 0;
                    const k = cityKey(seg.toCity);
                    // Skip home-base arrivals (return flight to TLV).
                    if (homeKeys.has(k)) return;
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
            (trip.hotels || []).forEach(h => {
                const city = cleanCityName(extractRobustCity(h.address || '', h.name || '', trip));
                if (!city) return;
                const baseTs = parseTripDate(h.checkInDate || '')?.getTime() || 0;
                const ts = baseTs ? baseTs + 15 * 3600 * 1000 : 0; // 15:00 = standard check-in
                candidates.push({
                    name: city,
                    displayName: h.name || city,
                    type: 'hotel',
                    date: h.checkInDate,
                    emoji: '🏨',
                    coords: isValidCoordinate(h.lat, h.lng) ? { lat: h.lat!, lng: h.lng! } : undefined,
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
                // Try cache for every candidate first
                for (const q of queries) {
                        if (geocodedCache[q]) { stop.coords = geocodedCache[q]; break; }
                }
                if (stop.coords) continue;
                // Network: try each in order, save the first hit
                for (const q of queries) {
                        const coords = await geocodeAddress(q);
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
                // 2. Existing geo cache (browser-persisted from prior trips).
                const cached = geocodedCache[raw] || geocodedCache[raw.toUpperCase()] ||
                    geocodedCache[`${raw} Airport`] || geocodedCache[`${raw.toUpperCase()} Airport`];
                if (cached) { next[raw] = cached; continue; }
                // 3. Live geocode as last resort.
                const q = /^[a-z]{3}$/.test(raw) ? `${raw.toUpperCase()} Airport` : raw;
                const c = await geocodeAddress(q);
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
            if (!cancelled) setLegClassifications(result);
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
                // Cache first
                const cached = geocodedCache[name] || geocodedCache[name.toLowerCase()];
                if (cached) { next[key] = cached; continue; }
                const coords = await geocodeAddress(name);
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

        const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false })
            .setView([41.7, 44.8], 7);

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
                maxClusterRadius: 50,
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

        // Plot non-airport items with premium pins. Hotels are routed to
        // the unclustered route layer so they're always individually
        // visible as a reference point — even at low zoom where dense
        // clusters of restaurants/attractions would otherwise hide them.
        visibleItems.forEach(item => {
            if (item.type === 'airport') return;
            if (item.type !== 'hotel' && !isInTripRegion(item.lat!, item.lng!)) return;
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.hotel;
            // Hotels never render as "ai suggestions"; only restaurant/attraction items can.
            const pinSource: 'saved' | 'ai' = item.type !== 'hotel' && item.source === 'ai' ? 'ai' : 'saved';
            const icon = makePinIcon(cfg, item.name, pinSource);

            const targetLayer = item.type === 'hotel' ? routeLayer : markerLayer;
            const marker = L.marker([item.lat!, item.lng!], {
                icon,
                zIndexOffset: item.type === 'hotel' ? 2000 : 0,
            }).addTo(targetLayer);

            // React portal popup — renders MapItemPopup synchronously via
            // flushSync so the DOM is populated before Leaflet opens the popup.
            marker.on('click', () => {
                // Drilling into a hotel: zoom in so the user can see the
                // restaurants/attractions surrounding it. Zoom 16 ≈ a 4-block
                // radius, close enough to read nearby pins.
                if (item.type === 'hotel' && isValidCoordinate(item.lat, item.lng)) {
                    map.flyTo([item.lat!, item.lng!], 16, { duration: 1.0 });
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
                flushSync(() => {
                    popupRoot.render(
                        <MapItemPopup
                            item={item}
                            onAddToList={handleAdd}
                            isAdded={isAlreadySaved}
                        />
                    );
                });
                marker.bindPopup(container, { className: 'tp-popup', maxWidth: 300 }).openPopup();
                marker.once('popupclose', () => popupRoot.unmount());
            });

            // Hover preview (desktop) — set React state from the Leaflet
            // event so a card renders in the map container's coordinate space.
            marker
                .on('mouseover', (e: L.LeafletMouseEvent) => {
                    setHoveredItem(item);
                    setHoverPos({ x: e.containerPoint.x, y: e.containerPoint.y });
                })
                .on('mousemove', (e: L.LeafletMouseEvent) => {
                    setHoverPos({ x: e.containerPoint.x, y: e.containerPoint.y });
                })
                .on('mouseout', () => {
                    setHoveredItem(null);
                    setHoverPos(null);
                });

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

        // Walking-distance rings: 1.2 km ≈ 15 min walk, 2.4 km ≈ 30 min walk
        // at 5 km/h. Drawn on routeLayer so they survive cluster-only redraws.
        if (walkingCircles && trip?.hotels?.length) {
            trip.hotels.forEach(h => {
                if (!isValidCoordinate(h.lat, h.lng)) return;
                L.circle([h.lat!, h.lng!], {
                    radius: 1200,
                    color: '#10b981', weight: 1.5,
                    fillColor: '#10b981', fillOpacity: 0.08, opacity: 0.45,
                })
                    .bindTooltip('15 דק׳ הליכה', { permanent: true, direction: 'top', className: 'walking-label' })
                    .addTo(routeLayer);
                L.circle([h.lat!, h.lng!], {
                    radius: 2400,
                    color: '#10b981', weight: 1,
                    fillColor: '#10b981', fillOpacity: 0.04, opacity: 0.30,
                    dashArray: '6 4',
                })
                    .bindTooltip('30 דק׳ הליכה', { permanent: true, direction: 'top', className: 'walking-label' })
                    .addTo(routeLayer);
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
                const arrowIdx = Math.max(1, Math.floor(pathPoints.length * 0.6));
                const bearing = getBearing(pathPoints[arrowIdx - 1][0], pathPoints[arrowIdx - 1][1], pathPoints[pathPoints.length - 1][0], pathPoints[pathPoints.length - 1][1]);
                const arrowHtml = `<div style="transform:rotate(${bearing}deg);color:${primaryColor};filter:drop-shadow(0 1px 3px rgba(0,0,0,0.3))">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L19 9H14V22H10V9H5L12 2Z"/></svg>
                </div>`;
                L.marker([pathPoints[arrowIdx][0], pathPoints[arrowIdx][1]], {
                    icon: L.divIcon({ html: arrowHtml, className: '', iconSize: [18, 18], iconAnchor: [9, 9] })
                }).addTo(routeLayer);
                if (badge) {
                    const badgeIdx = Math.floor(pathPoints.length * badgePos);
                    L.marker([pathPoints[badgeIdx][0], pathPoints[badgeIdx][1]], {
                        icon: badge, zIndexOffset: 1500, interactive: false,
                    }).addTo(routeLayer);
                }
            };

            // Intermediate waypoint pin (e.g. ferry pier). Small diamond.
            const makeWaypointPin = (name: string, mode: 'ferry' | 'drive' | 'train' | 'flight'): L.DivIcon => {
                const emoji = mode === 'ferry' ? '⛴' : mode === 'train' ? '🚆' : mode === 'flight' ? '✈️' : '🚗';
                const html = `<div style="display:inline-flex;align-items:center;gap:4px;background:white;border:1px solid #cbd5e1;border-radius:999px;padding:3px 8px;box-shadow:0 2px 6px rgba(15,23,42,.15);font-family:'Rubik',sans-serif;font-size:10px;font-weight:700;color:#334155;white-space:nowrap;direction:rtl;">
                    <span style="font-size:11px">${emoji}</span>${name.length > 22 ? name.slice(0, 21) + '…' : name}
                </div>`;
                return L.divIcon({ html, className: '', iconSize: [0, 0], iconAnchor: [0, 10] });
            };

            const fmtHours = (h?: number): string | undefined =>
                typeof h === 'number' && h > 0
                    ? (h >= 1 ? `~${h.toFixed(h % 1 ? 1 : 0)} שעות` : `~${Math.round(h * 60)} דק׳`)
                    : undefined;

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
                    // Draw each sub-segment with mode-aware colors + per-sub
                    // badge + intermediate waypoint pin between sub-segments.
                    resolvedSegments.forEach((sub, subIdx) => {
                        const subColor = sub.mode === 'ferry'
                            ? '#0ea5e9'  // sky — "water"
                            : sub.mode === 'flight'
                                ? '#2563eb'
                                : sub.mode === 'train'
                                    ? '#a855f7'
                                    : lineColor; // drive uses the leg's stop color
                        const subPath = curvedPath(sub.from, sub.to);
                        const subLabel = sub.mode === 'ferry' ? 'מעבורת' : sub.mode === 'train' ? 'רכבת' : sub.mode === 'flight' ? 'טיסה' : 'נסיעה';
                        const subEmoji = sub.mode === 'ferry' ? '⛴' : sub.mode === 'train' ? '🚆' : sub.mode === 'flight' ? '✈️' : '🚗';
                        const subDist = getDistanceKm(sub.from.lat, sub.from.lng, sub.to.lat, sub.to.lng);
                        const subTransport: SegmentTransportInfo = {
                            mode: sub.mode,
                            emoji: subEmoji,
                            label: subLabel,
                            duration: fmtHours(sub.durationHours),
                            hasTransportData: true,
                        };
                        const badgeIcon = makeRouteBadge(subDist, subTransport, subColor);
                        drawSubSegment(subPath, subColor, badgeIcon, 0.5);
                        bounds.extend([sub.from.lat, sub.from.lng]);
                        bounds.extend([sub.to.lat, sub.to.lng]);
                        // Drop a small intermediate pin at the junction (not at
                        // the final via which is the leg's end-stop).
                        const isLast = subIdx === resolvedSegments.length - 1;
                        if (!isLast) {
                            const pinIcon = makeWaypointPin(sub.viaName, resolvedSegments[subIdx + 1].mode);
                            L.marker([sub.to.lat, sub.to.lng], {
                                icon: pinIcon, zIndexOffset: 1800, interactive: false,
                            }).addTo(routeLayer);
                        }
                    });
                } else {
                    // Single-segment rendering (legacy path).
                    const dist = getDistanceKm(start.coords.lat, start.coords.lng, end.coords.lat, end.coords.lng);
                    const pathPoints = curvedPath(start.coords, end.coords);
                    let transport = getSegmentTransport(start, end, trip, dist, airportCoords);
                    if (aiLeg && aiLeg.mode) {
                        transport = {
                            mode: aiLeg.mode === 'drive+ferry' || aiLeg.mode === 'multi' ? 'drive' : aiLeg.mode as any,
                            emoji: transportEmojiForMode(aiLeg.mode),
                            label: aiLeg.notes || transportLabelForMode(aiLeg.mode),
                            duration: fmtHours(aiLeg.durationHours) || transport.duration,
                            hasTransportData: true,
                        };
                    }
                    // Per-mode polyline colour — flight=blue, ferry=cyan,
                    // drive=slate, train=violet, bus=amber. Falls back to
                    // the per-stop colour for unknown modes.
                    const modeColor = MODE_COLORS[transport.mode as keyof typeof MODE_COLORS]?.line || lineColor;
                    const stagger = 0.45 + (i % 3) * 0.05;
                    const badgeIcon = dist >= 5 ? makeRouteBadge(dist, transport, modeColor) : null;
                    drawSubSegment(pathPoints, modeColor, badgeIcon, stagger);
                    bounds.extend([start.coords.lat, start.coords.lng]);
                    bounds.extend([end.coords.lat, end.coords.lng]);
                }
            }

            // Route stop pills — apply region guard so layover stops that
            // slipped through the isFlightOnly filter don't appear in Europe.
            validStops.forEach((stop, idx) => {
                if (!stop.coords) return;
                if (!isInTripRegion(stop.coords.lat, stop.coords.lng)) return;
                const color = STOP_COLORS[idx % STOP_COLORS.length];
                const icon = makeStopPill(idx + 1, stop.displayName || stop.name, stop.emoji || '📍', color);

                L.marker([stop.coords.lat, stop.coords.lng], { icon, zIndexOffset: 2000 })
                    .addTo(routeLayer);

                bounds.extend([stop.coords.lat, stop.coords.lng]);
            });
        }

        // Fit bounds — but when a destination is set (e.g. "תאילנד") and we're
        // on the ALL view, prefer a bounds that only includes stops *near* the
        // destination so far-away layovers (Abu Dhabi, Frankfurt, etc.) don't
        // zoom the map out to a hemisphere view. Layover pins stay drawn —
        // they're just not the focal point.
        const applyBounds = (b: L.LatLngBounds) => {
            // Tighter default zoom + less padding on the "ALL" view so the
            // trip's actual geography fills more of the screen.
            // compactView (FullTripMapView's "whole trip" mode) drops maxZoom
            // further to 11 so the entire trip fits on one screen with city
            // pins clearly distinguishable — no manual zoom needed to read
            // the city names. Existing per-tab callers leave compactView
            // false to keep the tighter 14/15 zoom they had before.
            const padding: [number, number] = activeCity !== 'ALL' ? [50, 50] : [40, 40];
            const fittedMax = activeCity !== 'ALL' ? 15 : 14;
            const maxZoom = compactView && activeCity === 'ALL' ? 11 : fittedMax;
            map.fitBounds(b, { padding, maxZoom, duration: 1 });
        };

        if (bounds.isValid()) {
            if (activeCity === 'ALL' && trip?.destination && !items) {
                // Prefer English destination for geocoding — Hebrew multi-city strings
                // like "בנגקוק - פטאיה - קו צ'אנג" fail on both Photon and Nominatim.
                const destQuery = trip.destinationEnglish || trip.destination;
                const destCacheKey = `dest:${destQuery}`;
                const destPromise = geocodedCache[destCacheKey]
                    ? Promise.resolve(geocodedCache[destCacheKey])
                    : geocodeAddress(destQuery).then(c => {
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
            geocodeAddress(destQuery).then(c => {
                if (!mapInstanceRef.current) return;
                if (c) map.setView([c.lat, c.lng], 8);
            });
        }

        [100, 500].forEach(t => setTimeout(() => map.invalidateSize(), t));
    }, [mapItems, activeCity, trip, routeStops, airportCoords, legClassifications, waypointCoords, walkingCircles]);


    // Fly to a GPS-located position and show a "you are here" marker.
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !flyTo) return;

        map.flyTo([flyTo.lat, flyTo.lng], flyTo.zoom ?? 15, { duration: 1.2 });

        // Remove previous locate marker before adding a new one.
        if (locateMarkerRef.current) {
            locateMarkerRef.current.remove();
        }
        locateMarkerRef.current = L.circleMarker([flyTo.lat, flyTo.lng], {
            radius: 10,
            color: '#2563eb',
            weight: 3,
            fillColor: '#fff',
            fillOpacity: 1,
        })
            .bindTooltip('אתה כאן', { direction: 'top', permanent: false })
            .addTo(map);
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
                            onClick={() => setActiveCity('ALL')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeCity === 'ALL' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                        >
                            <MapIcon className="w-3.5 h-3.5" />
                            כל המסלול
                        </button>
                        <div className="w-px h-5 bg-slate-200" />
                        {cities.map(c => (
                            <button
                                key={c.name}
                                onClick={() => setActiveCity(c.name)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeCity === c.name ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'}`}
                            >
                                {c.name}
                                {c.count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeCity === c.name ? 'bg-white/25 text-white' : 'bg-indigo-50 text-indigo-500'}`}>{c.count}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Geocoding progress bar — thin stripe across the top edge */}
            {geocodeProgress.total > 0 && geocodeProgress.done < geocodeProgress.total && (
                <div className="absolute top-0 left-0 right-0 z-[2001] h-0.5 bg-blue-100 pointer-events-none">
                    <div
                        className="h-full bg-blue-500 transition-all duration-500 ease-out"
                        style={{ width: `${(geocodeProgress.done / geocodeProgress.total) * 100}%` }}
                    />
                </div>
            )}

            {/* Loading indicator */}
            {loading && (
                <div className="absolute bottom-28 left-4 z-[1000] bg-white/95 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-gray-100 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span className="text-xs font-bold text-slate-600">מחשב מיקומים...</span>
                </div>
            )}

            {/* Map */}
            <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-10 bg-slate-50" />

            {/* Hover preview card — shown on desktop when cursor is over a pin.
                 Positioned relative to the map container using containerPoint. */}
            {hoveredItem && hoverPos && (
                <div
                    className="absolute z-[2000]"
                    style={{
                        left: hoverPos.x,
                        top: hoverPos.y - 16,
                        transform: 'translate(-50%, -100%)',
                    }}
                >
                    <HoverPreviewCard
                        type={hoveredItem.type}
                        name={hoveredItem.name}
                        rating={hoveredItem.rating}
                        cuisine={hoveredItem.cuisine}
                        category={hoveredItem.category}
                        priceRange={hoveredItem.priceRange}
                    />
                </div>
            )}

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
        </div>
    );
};
