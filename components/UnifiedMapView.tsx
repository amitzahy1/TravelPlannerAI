import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Trip } from '../types';
import { Loader2, Map as MapIcon } from 'lucide-react';
import { extractRobustCity, cleanCityName } from '../utils/geoData';

// --- Interfaces ---
interface MapItem {
    id: string;
    type: 'hotel' | 'restaurant' | 'attraction' | 'airport' | 'shopping';
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
}

const STORAGE_KEY = 'travel_app_geo_cache_v5';

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
    shopping: {
        color: '#ec4899',
        gradient: ['#ec4899', '#db2777'],
        emoji: '🛍️',
        label: 'קניות',
        svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" x2="21" y1="6" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
    },
};

// Hebrew cross-language map
const HEBREW_TO_ENGLISH_CITY_MAP: Record<string, string[]> = {
    'בנגקוק': ['Bangkok'], 'פוקט': ['Phuket'], 'תל אביב': ['Tel Aviv'],
    'ירושלים': ['Jerusalem'], 'אילת': ['Eilat'], 'לונדון': ['London'],
    'פריז': ['Paris'], 'ניו יורק': ['New York', 'NYC'], 'רומא': ['Rome'],
    'ברצלונה': ['Barcelona'], 'טביליסי': ['Tbilisi'], 'גיאורגיה': ['Georgia'],
};

const getCityKeywords = (cityName: string): string[] => {
    const lowerCity = cityName.toLowerCase();
    for (const [hebrew, englishList] of Object.entries(HEBREW_TO_ENGLISH_CITY_MAP)) {
        if (hebrew.toLowerCase() === lowerCity) return englishList.map(e => e.toLowerCase());
        if (englishList.some(e => e.toLowerCase() === lowerCity)) return [hebrew.toLowerCase(), ...englishList.map(e => e.toLowerCase())];
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

const geocodeAddress = async (query: string): Promise<{ lat: number; lng: number } | null> => {
    if (!query) return null;
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
            headers: { 'User-Agent': 'TravelPlannerPro/2.0' }
        });
        const data = await res.json();
        if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        return null;
    } catch {
        return null;
    }
};

// --- PREMIUM PIN MARKER ---
const makePinIcon = (config: typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG], label?: string) => {
    const [c1, c2] = config.gradient;
    const html = `
        <div style="position:relative; width:44px; height:52px; display:flex; flex-direction:column; align-items:center;">
            <div style="
                width:44px; height:44px; border-radius:50% 50% 50% 0%;
                transform:rotate(-45deg);
                background:linear-gradient(135deg,${c1},${c2});
                box-shadow:0 6px 20px ${c1}60,0 2px 6px rgba(0,0,0,0.25);
                display:flex; align-items:center; justify-content:center;
                border:2.5px solid rgba(255,255,255,0.8);
            ">
                <div style="transform:rotate(45deg); color:white; display:flex; align-items:center; justify-content:center; width:22px; height:22px;">
                    ${config.svg}
                </div>
            </div>
            <div style="
                width:6px; height:10px; margin-top:-2px;
                background:linear-gradient(to bottom,${c1},${c2});
                clip-path:polygon(50% 100%,0 0,100% 0);
            "></div>
        </div>
    `;
    return L.divIcon({ html, className: '', iconSize: [44, 52], iconAnchor: [22, 52], popupAnchor: [0, -56] });
};

// --- ROUTE STOP PILL ---
const makeStopPill = (num: number, name: string, emoji: string, color: string) => {
    const html = `
        <div style="
            display:inline-flex; align-items:center; gap:7px;
            background:white;
            border-radius:24px;
            padding:5px 12px 5px 5px;
            box-shadow:0 4px 16px rgba(0,0,0,0.18),0 1px 4px rgba(0,0,0,0.1);
            border:1.5px solid rgba(255,255,255,0.9);
            white-space:nowrap;
            font-family:'Rubik','Inter',sans-serif;
            position:relative;
        ">
            <div style="
                width:28px; height:28px; border-radius:50%;
                background:linear-gradient(135deg,${color},${color}cc);
                color:white; font-weight:900; font-size:13px;
                display:flex; align-items:center; justify-content:center;
                box-shadow:0 2px 8px ${color}50;
                flex-shrink:0;
            ">${num}</div>
            <span style="font-size:13px; font-weight:700; color:#1e293b; letter-spacing:0.1px;">${emoji} ${name}</span>
        </div>
    `;
    return L.divIcon({ html, className: '', iconSize: [0, 0], iconAnchor: [0, 15] });
};

// --- ROUTE INFO BADGE (travel time/distance/mode between stops) ---
interface SegmentTransportInfo {
    mode: 'flight' | 'drive' | 'train' | 'ferry' | 'bus' | 'unknown';
    emoji: string;
    label: string;
    duration?: string;
    hasTransportData: boolean;
}

const getSegmentTransport = (
    fromStop: RouteStop, toStop: RouteStop, trip: Trip, distKm: number
): SegmentTransportInfo => {
    // Match flight
    const segs = trip.flights?.segments || [];
    const matchedFlight = segs.find(s => {
        const fromMatch = s.fromCity?.toLowerCase() === fromStop.name.toLowerCase() ||
            s.fromCode?.toLowerCase() === (fromStop.code?.toLowerCase() || '');
        const toMatch = s.toCity?.toLowerCase() === toStop.name.toLowerCase() ||
            s.toCode?.toLowerCase() === (toStop.code?.toLowerCase() || '');
        return fromMatch && toMatch;
    });
    if (matchedFlight) return {
        mode: 'flight', emoji: '✈️',
        label: `${matchedFlight.airline || ''} ${matchedFlight.flightNumber || ''}`.trim() || 'טיסה',
        duration: matchedFlight.duration, hasTransportData: true
    };

    // Match train
    const matchedTrain = trip.trains?.find(t =>
        (t.fromStation?.toLowerCase() || '').includes(fromStop.name.toLowerCase()) ||
        (t.toStation?.toLowerCase() || '').includes(toStop.name.toLowerCase())
    );
    if (matchedTrain) return { mode: 'train', emoji: '🚆', label: matchedTrain.provider || 'רכבת', duration: matchedTrain.duration, hasTransportData: true };

    // Match ferry
    const matchedFerry = trip.ferries?.find(f =>
        (f.fromPort?.toLowerCase() || '').includes(fromStop.name.toLowerCase()) ||
        (f.toPort?.toLowerCase() || '').includes(toStop.name.toLowerCase())
    );
    if (matchedFerry) return { mode: 'ferry', emoji: '⛴️', label: matchedFerry.provider || 'מעבורת', hasTransportData: true };

    // Match bus
    const matchedBus = trip.buses?.find(b =>
        (b.fromCity?.toLowerCase() || '').includes(fromStop.name.toLowerCase()) ||
        (b.toCity?.toLowerCase() || '').includes(toStop.name.toLowerCase())
    );
    if (matchedBus) return { mode: 'bus', emoji: '🚌', label: matchedBus.provider || 'אוטובוס', hasTransportData: true };

    // Estimate by distance
    if (distKm > 300) return { mode: 'flight', emoji: '✈️', label: 'טיסה?', hasTransportData: false };
    return { mode: 'drive', emoji: '🚗', label: 'נסיעה', hasTransportData: false };
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
    const warn = !transport.hasTransportData
        ? `<div style="font-size:9px;color:#ef4444;font-weight:700;margin-top:2px">⚠️ חסר מידע הסעה</div>` : '';

    const html = `<div style="
        display:flex;flex-direction:column;align-items:center;
        background:white;border-radius:14px;
        padding:6px 12px;
        box-shadow:0 4px 16px rgba(0,0,0,.18),0 1px 4px rgba(0,0,0,.1);
        border:2px solid ${color}40;
        font-family:'Rubik','Inter',sans-serif;
        white-space:nowrap;direction:rtl;min-width:80px;text-align:center;
    ">
        <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px">
            <span style="font-size:14px">${transport.emoji}</span>
            <span style="font-size:11px;font-weight:800;color:${color}">${transport.label}</span>
        </div>
        <div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#475569;font-weight:600">
            <span>⏱ ${displayTime}</span>
            <span style="color:#cbd5e1">|</span>
            <span>${fmtDistKm(distKm)}</span>
        </div>
        ${warn}
    </div>`;
    return L.divIcon({ html, className: '', iconSize: [0, 0], iconAnchor: [40, 20] });
};

// --- POPUP HTML ---
const makePopupHtml = (item: MapItem) => {
    const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.hotel;
    const dateStr = item.date ? parseTripDate(item.date)?.toLocaleDateString('he-IL', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    return `
        <div style="font-family:'Rubik','Inter',sans-serif;direction:rtl;text-align:right;min-width:200px;max-width:260px;padding:2px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                <div style="
                    width:36px;height:36px;border-radius:10px;
                    background:linear-gradient(135deg,${cfg.gradient[0]},${cfg.gradient[1]});
                    display:flex;align-items:center;justify-content:center;
                    font-size:18px;flex-shrink:0;
                ">${cfg.emoji}</div>
                <div>
                    <div style="font-size:10px;font-weight:700;color:${cfg.color};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1px;">${cfg.label}</div>
                    <div style="font-size:14px;font-weight:800;color:#0f172a;line-height:1.2;">${item.name}</div>
                </div>
            </div>
            ${item.address ? `<div style="font-size:11px;color:#64748b;display:flex;align-items:flex-start;gap:4px;margin-bottom:4px;">📍 <span>${item.address}</span></div>` : ''}
            ${item.description ? `<div style="font-size:11px;color:#475569;margin-bottom:4px;background:#f8fafc;padding:4px 8px;border-radius:8px;">${item.description}</div>` : ''}
            ${dateStr ? `<div style="font-size:11px;color:#94a3b8;font-weight:600;">📅 ${dateStr}</div>` : ''}
        </div>
    `;
};

// ============================================================
export const UnifiedMapView: React.FC<UnifiedMapViewProps> = ({ trip, items, height = "75vh" }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.LayerGroup | null>(null);
    const routeLayerRef = useRef<L.LayerGroup | null>(null);

    const [mapItems, setMapItems] = useState<MapItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeCity, setActiveCity] = useState<string | 'ALL'>('ALL');
    const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
    const [activeStop, setActiveStop] = useState<number | null>(null);

    const [geocodedCache, setGeocodedCache] = useState<Record<string, { lat: number; lng: number }>>(() => {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
    });

    // 1. Build raw map items from trip data
    useEffect(() => {
        if (!trip && !items) return;
        let raw: MapItem[] = [];

        if (items) {
            raw = items;
        } else if (trip) {
            // Flights
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

            // Hotels
            trip.hotels?.forEach(h => {
                const city = cleanCityName(extractRobustCity(h.address || '', h.name || '', trip));
                raw.push({ id: h.id, type: 'hotel', name: h.name, address: h.address, lat: h.lat, lng: h.lng, description: h.roomType, date: h.checkInDate, city });
            });

            // Restaurants
            trip.restaurants?.forEach(cat => cat.restaurants?.forEach(r => {
                const city = r.location?.split(',')?.[1]?.trim() || trip.destination;
                raw.push({ id: r.id, type: 'restaurant', name: r.name, address: r.location, lat: r.lat, lng: r.lng, description: r.description, date: r.reservationDate, time: r.reservationTime, city });
            }));

            // Attractions
            trip.attractions?.forEach(cat => cat.attractions?.forEach(a => {
                const city = a.location?.split(',')?.[1]?.trim() || trip.destination;
                raw.push({ id: a.id, type: 'attraction', name: a.name, address: a.location, lat: a.lat, lng: a.lng, description: a.description, date: a.scheduledDate, time: a.scheduledTime, city });
            }));

            // Shopping
            trip.shoppingItems?.forEach(s => {
                if (s.shopName) raw.push({ id: s.id, type: 'shopping', name: s.shopName, address: `${s.shopName}, ${trip.destination}`, description: s.name, date: s.purchaseDate, city: trip.destination });
            });
        }

        // Assign chronological order
        const sorted = [...raw].sort((a, b) => getItemTimestamp(a) - getItemTimestamp(b));
        sorted.forEach((item, i) => { item.order = i + 1; });

        setMapItems(sorted);
    }, [trip, items]);

    // 2. Geocode missing items
    useEffect(() => {
        const run = async () => {
            const toGeocode = mapItems.filter(i => !isValidCoordinate(i.lat, i.lng) && i.address);
            if (toGeocode.length === 0) return;
            setLoading(true);

            const updated = [...mapItems];
            const newEntries: Record<string, { lat: number; lng: number }> = {};

            await Promise.all(updated.map(async item => {
                if (isValidCoordinate(item.lat, item.lng) || !item.address) return;
                const cacheKey = item.address;
                if (geocodedCache[cacheKey]) { item.lat = geocodedCache[cacheKey].lat; item.lng = geocodedCache[cacheKey].lng; return; }
                const coords = await geocodeAddress(item.type === 'airport' ? `${item.name} Airport` : item.address!);
                if (coords) { item.lat = coords.lat; item.lng = coords.lng; newEntries[cacheKey] = coords; }
            }));

            if (Object.keys(newEntries).length > 0) {
                setGeocodedCache(prev => {
                    const next = { ...prev, ...newEntries };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                    return next;
                });
            }
            setMapItems(updated);
            setLoading(false);
        };
        run();
    }, [mapItems.length]);

    // 3. Build date-ordered route stops
    useEffect(() => {
        if (!trip || items) return;

        const buildRoute = async () => {
            const stops: RouteStop[] = [];

            // From flight segments (chronological)
            const segs = [...(trip.flights?.segments || [])].sort((a, b) =>
                (parseTripDate(a.date)?.getTime() || 0) - (parseTripDate(b.date)?.getTime() || 0)
            );

            if (segs.length > 0) {
                // Add origin
                const orig = segs[0];
                if (orig.fromCity && !stops.some(s => s.name.toLowerCase() === orig.fromCity!.toLowerCase())) {
                    stops.push({ name: orig.fromCity, displayName: orig.fromCity, type: 'city', code: orig.fromCode, date: orig.date, emoji: '🛫' });
                }
                segs.forEach(seg => {
                    if (seg.toCity && !stops.some(s => s.name.toLowerCase() === seg.toCity!.toLowerCase())) {
                        stops.push({ name: seg.toCity, displayName: seg.toCity, type: 'flight', code: seg.toCode, date: seg.date, emoji: '🛬' });
                    }
                });
            }

            // If no flights, build from hotels
            if (stops.length <= 1) {
                const sortedHotels = [...(trip.hotels || [])].sort((a, b) =>
                    (parseTripDate(a.checkInDate || '')?.getTime() || 0) - (parseTripDate(b.checkInDate || '')?.getTime() || 0)
                );
                sortedHotels.forEach(h => {
                    const city = cleanCityName(extractRobustCity(h.address || '', h.name || '', trip));
                    if (city && !stops.some(s => s.name.toLowerCase() === city.toLowerCase())) {
                        stops.push({ name: city, displayName: h.name || city, type: 'hotel', date: h.checkInDate, emoji: '🏨', coords: isValidCoordinate(h.lat, h.lng) ? { lat: h.lat!, lng: h.lng! } : undefined });
                    }
                });
            }

            // Fallback: destination string
            if (stops.length === 0 && trip.destination) {
                trip.destination.split(/[-–,&]/).map(s => s.trim()).filter(Boolean).forEach(dest => {
                    stops.push({ name: dest, displayName: dest, type: 'city', emoji: '📍' });
                });
            }

            // Geocode stops
            for (const stop of stops) {
                if (stop.coords) continue;
                const query = stop.code ? `${stop.name} Airport, ${stop.code}` : stop.name;
                if (geocodedCache[query]) { stop.coords = geocodedCache[query]; continue; }
                if (geocodedCache[stop.name]) { stop.coords = geocodedCache[stop.name]; continue; }
                const coords = await geocodeAddress(query);
                if (coords) {
                    stop.coords = coords;
                    setGeocodedCache(prev => {
                        const next = { ...prev, [query]: coords };
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
                        return next;
                    });
                }
            }

            setRouteStops(stops);
        };

        buildRoute();
    }, [trip, items]);

    // 4. Init map
    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false })
            .setView([41.7, 44.8], 7);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 20 }).addTo(map);
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
            : validItems.filter(i => {
                const str = (i.address || i.city || '').toLowerCase();
                return getCityKeywords(activeCity).some(kw => str.includes(kw));
            });

        const bounds = L.latLngBounds([]);

        // Plot non-airport items with premium pins
        visibleItems.forEach(item => {
            if (item.type === 'airport') return;
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.hotel;
            const icon = makePinIcon(cfg);

            L.marker([item.lat!, item.lng!], { icon })
                .bindPopup(makePopupHtml(item), {
                    className: 'premium-popup',
                    maxWidth: 280,
                    minWidth: 210,
                })
                .addTo(markerLayer);

            bounds.extend([item.lat!, item.lng!]);
        });

        // Draw route (only in ALL view)
        if (activeCity === 'ALL' && trip && !items && routeStops.length > 0) {
            const STOP_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'];
            const validStops = routeStops.filter(s => s.coords);

            // Draw curved lines between stops
            for (let i = 0; i < validStops.length - 1; i++) {
                const start = validStops[i];
                const end = validStops[i + 1];
                if (!start.coords || !end.coords) continue;

                const dist = getDistanceKm(start.coords.lat, start.coords.lng, end.coords.lat, end.coords.lng);
                let pathPoints: [number, number][];

                if (dist > 50) {
                    const steps = 60;
                    pathPoints = [];
                    for (let s = 0; s <= steps; s++) {
                        const t = s / steps;
                        const lat = start.coords.lat + (end.coords.lat - start.coords.lat) * t;
                        const lng = start.coords.lng + (end.coords.lng - start.coords.lng) * t;
                        const curveFactor = Math.min(dist / 30, 5);
                        const curveOffset = Math.sin(t * Math.PI) * curveFactor;
                        const perpLat = -(end.coords.lng - start.coords.lng) / Math.max(dist, 1);
                        const perpLng = (end.coords.lat - start.coords.lat) / Math.max(dist, 1);
                        pathPoints.push([lat + perpLat * curveOffset * 0.6, lng + perpLng * curveOffset * 0.6]);
                    }
                } else {
                    pathPoints = [[start.coords.lat, start.coords.lng], [end.coords.lat, end.coords.lng]];
                }

                const lineColor = STOP_COLORS[i % STOP_COLORS.length];

                // Glow
                L.polyline(pathPoints, { color: lineColor, weight: 12, opacity: 0.12, lineCap: 'round' }).addTo(routeLayer);

                // White stroke (outline)
                L.polyline(pathPoints, { color: 'white', weight: 5.5, opacity: 1, lineCap: 'round' }).addTo(routeLayer);

                // Main colored line
                L.polyline(pathPoints, { color: lineColor, weight: 3.5, opacity: 0.92, dashArray: '10, 6', lineCap: 'round' }).addTo(routeLayer);

                // Arrow at 60% point
                const arrowIdx = Math.floor(pathPoints.length * 0.6);
                const bearing = getBearing(pathPoints[arrowIdx - 1][0], pathPoints[arrowIdx - 1][1],
                    end.coords.lat, end.coords.lng);
                const arrowHtml = `<div style="transform:rotate(${bearing}deg);color:${lineColor};filter:drop-shadow(0 1px 3px rgba(0,0,0,0.3))">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L19 9H14V22H10V9H5L12 2Z"/></svg>
                </div>`;
                L.marker([pathPoints[arrowIdx][0], pathPoints[arrowIdx][1]], {
                    icon: L.divIcon({ html: arrowHtml, className: '', iconSize: [18, 18], iconAnchor: [9, 9] })
                }).addTo(routeLayer);

                // Transport info badge at 40% point
                if (trip) {
                    const transport = getSegmentTransport(start, end, trip, dist);
                    const badgeIdx = Math.floor(pathPoints.length * 0.4);
                    const badgeIcon = makeRouteBadge(dist, transport, lineColor);
                    L.marker([pathPoints[badgeIdx][0], pathPoints[badgeIdx][1]], {
                        icon: badgeIcon, zIndexOffset: 1500, interactive: false
                    }).addTo(routeLayer);
                }

                bounds.extend([start.coords.lat, start.coords.lng]);
                bounds.extend([end.coords.lat, end.coords.lng]);
            }

            // Route stop pills
            validStops.forEach((stop, idx) => {
                if (!stop.coords) return;
                const color = STOP_COLORS[idx % STOP_COLORS.length];
                const icon = makeStopPill(idx + 1, stop.displayName || stop.name, stop.emoji || '📍', color);

                L.marker([stop.coords.lat, stop.coords.lng], { icon, zIndexOffset: 2000 })
                    .addTo(routeLayer);

                bounds.extend([stop.coords.lat, stop.coords.lng]);
            });
        }

        // Fit bounds
        if (bounds.isValid()) {
            const padding: [number, number] = activeCity !== 'ALL' ? [60, 60] : [80, 80];
            const maxZoom = activeCity !== 'ALL' ? 15 : 12;
            map.fitBounds(bounds, { padding, maxZoom, duration: 1 });
        } else if (trip?.destination) {
            geocodeAddress(trip.destination).then(c => c && map.setView([c.lat, c.lng], 8));
        }

        [100, 500].forEach(t => setTimeout(() => map.invalidateSize(), t));
    }, [mapItems, activeCity, trip, routeStops]);

    // Popup CSS injection
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            .premium-popup .leaflet-popup-content-wrapper {
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.12);
                border: 1px solid rgba(255,255,255,0.8);
                padding: 0;
                overflow: hidden;
            }
            .premium-popup .leaflet-popup-content { margin: 14px 14px; }
            .premium-popup .leaflet-popup-tip-container { display: none; }
            .premium-popup .leaflet-popup-close-button {
                top: 8px; right: 8px;
                color: #94a3b8; font-size: 18px; font-weight: 300;
                background: rgba(248,250,252,0.8); border-radius: 50%;
                width: 24px; height: 24px; display: flex; align-items: center; justify-content:center;
                line-height: 1;
            }
        `;
        document.head.appendChild(style);
        return () => { void document.head.removeChild(style); };
    }, []);

    // --- UI ---
    return (
        <div className="w-full relative bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 animate-fade-in" style={{ direction: 'ltr' }}>

            {/* Top City Filter Bar */}
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

            {/* Loading indicator */}
            {loading && (
                <div className="absolute bottom-28 left-4 z-[1000] bg-white/95 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-gray-100 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span className="text-xs font-bold text-slate-600">מחשב מיקומים...</span>
                </div>
            )}

            {/* Map */}
            <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-10 bg-slate-50" />

            {/* Bottom Timeline Strip */}
            {routeStops.length > 0 && activeCity === 'ALL' && (
                <div className="absolute bottom-0 left-0 right-0 z-[1000] bg-white/97 backdrop-blur-xl border-t border-slate-100 shadow-xl">
                    <div className="flex items-center gap-0 overflow-x-auto p-3 no-scrollbar">
                        {routeStops.map((stop, idx) => {
                            const COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'];
                            const color = COLORS[idx % COLORS.length];
                            const isLast = idx === routeStops.length - 1;
                            return (
                                <div key={idx} className="flex items-center flex-shrink-0">
                                    <button
                                        onClick={() => {
                                            setActiveStop(activeStop === idx ? null : idx);
                                            if (stop.coords && mapInstanceRef.current) {
                                                mapInstanceRef.current.flyTo([stop.coords.lat, stop.coords.lng], 12, { duration: 1.2 });
                                            }
                                        }}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all group ${activeStop === idx ? 'bg-slate-100 shadow-sm' : 'hover:bg-slate-50'}`}
                                    >
                                        <div style={{ background: color }} className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md flex-shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[10px] text-slate-400 font-semibold">{stop.emoji} {stop.type === 'flight' ? 'טיסה' : stop.type === 'hotel' ? 'מלון' : 'עצירה'}</div>
                                            <div className="text-xs font-bold text-slate-800 whitespace-nowrap">{stop.displayName || stop.name}</div>
                                        </div>
                                    </button>
                                    {!isLast && (
                                        <div className="flex items-center mx-1 flex-shrink-0">
                                            <div style={{ background: `linear-gradient(to right, ${color}, ${COLORS[(idx + 1) % COLORS.length]})` }}
                                                className="h-0.5 w-8 rounded-full opacity-40" />
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