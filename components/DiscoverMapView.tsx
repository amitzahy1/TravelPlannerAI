import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { Trip, Restaurant, Attraction, HotelBooking } from '../types';
import { Utensils, Ticket, MapPin, Hotel, Loader2 } from 'lucide-react';
import { GlobalPlaceModal } from './GlobalPlaceModal';
import { geocodePlacesBatch, getCountryBbox, coordInBbox } from '../utils/geocodePlaces';
import { getTripCities, locationMatchesCity, displayCityName } from '../utils/geoData';
import { safeMapsUrl } from '../utils/mapsUrl';
import { containsHebrew, getEnglishName } from '../utils/displayName';

type Kind = 'food' | 'sights' | 'hotel';

interface DiscoverMapViewProps {
        trip: Trip;
        onUpdateTrip: (t: Trip) => void;
}

interface MapPlace {
        id: string;
        kind: Kind;
        name: string;
        nameEnglish?: string;
        location: string;
        lat: number;
        lng: number;
        rating?: number;
        recommendationSource?: string;
        cuisine?: string;
        type?: string;
        description?: string;
        imageUrl?: string;
        address?: string;
        raw: Restaurant | Attraction | HotelBooking;
}

const PIN_COLORS = {
        food:   { bg: '#ea580c', ring: '#ffedd5', emoji: '🍽',  label: 'Restaurant' },
        sights: { bg: '#7c3aed', ring: '#ede9fe', emoji: '📍', label: 'Attraction' },
        hotel:  { bg: '#0891b2', ring: '#cffafe', emoji: '🏨', label: 'Hotel' },
} as const;


const makePinIcon = (kind: Kind, rating?: number, isSelected?: boolean): L.DivIcon => {
        const cfg = PIN_COLORS[kind];
        const ratingHtml = rating
                ? `<div style="position:absolute;top:-6px;right:-8px;background:#fff;color:#0f172a;border:1.5px solid ${cfg.bg};font-size:9px;font-weight:800;padding:1px 4px;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.18);z-index:2;">${rating}★</div>`
                : '';
        const ringScale = isSelected ? 1.18 : 1;
        const html = `
            <div style="position:relative;transform-origin:bottom center;transform:scale(${ringScale});">
                <div style="
                    width:34px;height:34px;border-radius:50%;
                    background:${cfg.bg};
                    box-shadow:0 0 0 4px ${cfg.ring},0 4px 10px rgba(15,23,42,.25);
                    display:flex;align-items:center;justify-content:center;
                    font-size:16px;line-height:1;
                ">${cfg.emoji}</div>
                <div style="
                    position:absolute;left:50%;bottom:-6px;transform:translateX(-50%) rotate(45deg);
                    width:8px;height:8px;background:${cfg.bg};
                "></div>
                ${ratingHtml}
            </div>
        `;
        return L.divIcon({ html, className: '', iconSize: [34, 40], iconAnchor: [17, 38] });
};

const isValidLatLng = (lat?: number, lng?: number): lat is number =>
        typeof lat === 'number' && typeof lng === 'number' &&
        !isNaN(lat) && !isNaN(lng) &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
        !(lat === 0 && lng === 0);

/**
 * Map view for the Discover tab — restaurants + attractions + hotels
 * plotted on a clean cartographic basemap. AI-research items that came
 * back without lat/lng are geocoded in the background (Photon, with
 * Maps-URL extraction first) so the map fills in over a few seconds
 * instead of staying empty. Each pin opens the same detail popup the
 * list view uses.
 */
export const DiscoverMapView: React.FC<DiscoverMapViewProps> = ({ trip, onUpdateTrip }) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const mapRef = useRef<L.Map | null>(null);
        const layerRef = useRef<L.MarkerClusterGroup | null>(null);
        const [filter, setFilter] = useState<'all' | Kind>('all');
        const [selectedCity, setSelectedCity] = useState<string>('all');
        const [selected, setSelected] = useState<MapPlace | null>(null);
        // Map of "kind:id" -> coords for places we just geocoded in this session.
        // Lets us light up pins as soon as geocoding resolves them, even before
        // the parent commits the coords back to the Trip.
        const [resolvedCoords, setResolvedCoords] = useState<Record<string, { lat: number; lng: number }>>({});
        const [isGeocoding, setIsGeocoding] = useState(false);
        const [geocodeProgress, setGeocodeProgress] = useState({ done: 0, total: 0 });

        // List of cities the trip touches — for the city filter.
        const tripCities = useMemo(() => getTripCities(trip, { excludeFlightOnly: true }), [trip]);

        // Country hint and bbox derived from the trip destination — used to
        // bias geocoding queries and reject out-of-country coordinates.
        const tripCountry = trip.destinationEnglish || trip.destination || '';
        const tripBbox = useMemo(() => getCountryBbox(tripCountry), [tripCountry]);

        // Build the master place list (restaurants + attractions + hotels).
        // A place is "mappable" if it has its own lat/lng, OR was just geocoded
        // in this session (resolvedCoords). City filter is applied last.
        const { allPlaces, mappable, missing } = useMemo(() => {
                const items: Array<MapPlace | (Omit<MapPlace, 'lat' | 'lng'> & { lat?: number; lng?: number })> = [];

                (trip.aiRestaurants || []).forEach(cat => cat.restaurants.forEach(r => {
                        items.push({
                                id: `food:${r.id}`, kind: 'food',
                                name: r.name, nameEnglish: (r as any).nameEnglish, location: r.location || '',
                                lat: r.lat, lng: r.lng,
                                rating: r.googleRating, recommendationSource: r.recommendationSource,
                                cuisine: r.cuisine, description: r.description, imageUrl: r.imageUrl,
                                address: r.location, raw: r,
                        });
                }));
                (trip.aiAttractions || []).forEach(cat => cat.attractions.forEach(a => {
                        items.push({
                                id: `sights:${a.id}`, kind: 'sights',
                                name: a.name, nameEnglish: (a as any).nameEnglish, location: a.location || '',
                                lat: a.lat, lng: a.lng,
                                rating: a.rating, recommendationSource: a.recommendationSource,
                                type: a.type, description: a.description, imageUrl: a.imageUrl,
                                address: a.location, raw: a,
                        });
                }));
                (trip.hotels || []).forEach(h => {
                        items.push({
                                id: `hotel:${h.id}`, kind: 'hotel',
                                name: h.name, location: h.city || h.address,
                                lat: h.lat, lng: h.lng,
                                description: h.address, imageUrl: h.imageUrl,
                                address: h.address, raw: h,
                        });
                });

                // Resolve coords (own → resolved-in-session).
                // Reject any coordinate that falls outside the trip's country bbox —
                // this prevents Norway/Israel/etc. mismatches from Photon.
                const isInCountry = (lat?: number, lng?: number) =>
                        !tripBbox || !isValidLatLng(lat, lng) || coordInBbox(lat!, lng!, tripBbox);

                const withCoords = items.map(it => {
                        if (isValidLatLng(it.lat, it.lng) && isInCountry(it.lat, it.lng))
                                return it as MapPlace;
                        const r = resolvedCoords[it.id];
                        if (r && isInCountry(r.lat, r.lng))
                                return { ...it, lat: r.lat, lng: r.lng } as MapPlace;
                        return null;
                });

                // City filter applied to mapped places only — by city name match.
                const cityFiltered = (places: (MapPlace | null)[]) => {
                        if (selectedCity === 'all') return places.filter((p): p is MapPlace => !!p);
                        return places.filter((p): p is MapPlace =>
                                !!p && (locationMatchesCity(p.location || '', selectedCity) ||
                                       locationMatchesCity(p.address || '', selectedCity)));
                };

                const cityAll = cityFiltered(withCoords);
                const filtered = filter === 'all' ? cityAll : cityAll.filter(p => p.kind === filter);
                const missingCount = items.length - withCoords.filter(Boolean).length;

                return {
                        allPlaces: items,
                        mappable: filtered,
                        missing: missingCount,
                };
        }, [trip.aiRestaurants, trip.aiAttractions, trip.hotels, resolvedCoords, filter, selectedCity]);

        // 1. Init map (once).
        useEffect(() => {
                if (!containerRef.current || mapRef.current) return;
                const map = L.map(containerRef.current, {
                        center: [13.7563, 100.5018],
                        zoom: 10,
                        zoomControl: true,
                        attributionControl: false,
                });
                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                        maxZoom: 19,
                        subdomains: 'abcd',
                }).addTo(map);
                L.control.attribution({ prefix: false, position: 'bottomleft' })
                        .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OSM</a> · © <a href="https://carto.com/attributions">CARTO</a>')
                        .addTo(map);
                mapRef.current = map;
                // Marker clustering — collapses dense pin areas into a single
                // count badge so the map stops looking like a wall of
                // overlapping tooltips. Tapping a cluster zooms in, finally
                // breaking it into individual pins.
                const cluster = (L as any).markerClusterGroup({
                        maxClusterRadius: 48,
                        spiderfyOnMaxZoom: true,
                        showCoverageOnHover: false,
                        zoomToBoundsOnClick: true,
                        iconCreateFunction: (c: any) => {
                                const count = c.getChildCount();
                                const size = count < 10 ? 36 : count < 50 ? 44 : 54;
                                return L.divIcon({
                                        html: `<div style="
                                                width:${size}px;height:${size}px;border-radius:50%;
                                                background:rgba(15,23,42,0.85);
                                                color:#fff;display:flex;align-items:center;justify-content:center;
                                                font-weight:800;font-size:${count < 100 ? 13 : 11}px;
                                                box-shadow:0 0 0 4px rgba(255,255,255,0.85),0 6px 14px rgba(15,23,42,0.25);
                                                font-family:'Rubik','Inter',sans-serif;
                                        ">${count}</div>`,
                                        className: '', iconSize: [size, size],
                                });
                        },
                }) as L.MarkerClusterGroup;
                layerRef.current = cluster;
                map.addLayer(cluster);
                setTimeout(() => map.invalidateSize(), 200);
                const ro = new ResizeObserver(() => map.invalidateSize());
                ro.observe(containerRef.current);
                return () => { ro.disconnect(); map.remove(); mapRef.current = null; layerRef.current = null; };
        }, []);

        // 2. Geocode missing places in the background. Runs whenever the
        // unresolved set changes — typically once per trip after research.
        useEffect(() => {
                const needs = allPlaces
                        .filter(p => !isValidLatLng(p.lat, p.lng) && !resolvedCoords[p.id])
                        .map(p => ({
                                id: p.id,
                                name: p.name,
                                location: p.location,
                                googleMapsUrl: (p.raw as any).googleMapsUrl,
                                address: (p as any).address,
                                countryHint: tripCountry,
                        }));
                if (needs.length === 0) return;
                setIsGeocoding(true);
                setGeocodeProgress({ done: 0, total: needs.length });
                const ctrl = new AbortController();
                let done = 0;
                geocodePlacesBatch(
                        needs,
                        (id, coords) => {
                                done += 1;
                                setGeocodeProgress({ done, total: needs.length });
                                setResolvedCoords(prev => prev[id] ? prev : { ...prev, [id]: coords });
                        },
                        { concurrency: 4, signal: ctrl.signal },
                ).finally(() => setIsGeocoding(false));
                return () => ctrl.abort();
                // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [trip.id, trip.aiRestaurants?.length, trip.aiAttractions?.length, trip.hotels?.length]);

        // 3. Render pins on every visible-set change.
        useEffect(() => {
                const map = mapRef.current;
                const layer = layerRef.current;
                if (!map || !layer) return;
                layer.clearLayers();
                if (mappable.length === 0) return;

                const bounds = L.latLngBounds([]);
                mappable.forEach(p => {
                        const isSel = selected?.id === p.id;
                        const icon = makePinIcon(p.kind, p.rating, isSel);
                        const marker = L.marker([p.lat, p.lng], { icon, riseOnHover: true });

                        const ratingChip = p.rating ? `<span style="display:inline-flex;align-items:center;gap:2px;background:#fef9c3;color:#854d0e;font-weight:800;font-size:10px;padding:1px 5px;border-radius:8px;">${p.rating}★</span>` : '';
                        const sourceChip = p.recommendationSource
                                ? `<div style="font-size:10px;font-weight:700;color:#92400e;background:#fef3c7;padding:2px 6px;border-radius:6px;margin-top:3px;display:inline-block;">🏆 ${p.recommendationSource.replace(/Bib/i, 'Michelin')}</div>`
                                : '';
                        const kindLabel = `<span style="display:inline-block;font-size:9px;font-weight:700;color:${PIN_COLORS[p.kind].bg};background:${PIN_COLORS[p.kind].ring};padding:1px 5px;border-radius:6px;margin-bottom:3px;">${PIN_COLORS[p.kind].emoji} ${PIN_COLORS[p.kind].label}</span>`;
                        const label = getEnglishName(p);
                        const locationLine = !containsHebrew(p.location) ? (p.location || '') : '';
                        const tooltipHtml = `
                            <div style="font-family:'Inter','Rubik',sans-serif;direction:ltr;text-align:left;min-width:140px;max-width:240px;padding:2px 0;">
                                ${kindLabel}
                                <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                                    <span style="font-size:13px;font-weight:800;color:#0f172a;line-height:1.2;flex:1;">${label}</span>
                                    ${ratingChip}
                                </div>
                                <div style="font-size:11px;color:#64748b;line-height:1.3;">${locationLine}</div>
                                ${sourceChip}
                            </div>
                        `;
                        marker.bindTooltip(tooltipHtml, {
                                direction: 'top', offset: [0, -34],
                                className: 'discover-map-tooltip', sticky: false, opacity: 1,
                        });
                        marker.on('click', () => setSelected(p));
                        marker.addTo(layer);
                        bounds.extend([p.lat, p.lng]);
                });

                if (mappable.length === 1) {
                        map.setView([mappable[0].lat, mappable[0].lng], 14, { animate: true });
                } else if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [50, 40], maxZoom: 14, animate: true });
                }
        }, [mappable, selected]);

        // City flyTo fallback — when a city is selected but mappable is empty
        // (geocoding not yet complete), fly to a well-known city centre so the
        // map isn't left showing the previous viewport or the whole world.
        useEffect(() => {
                const map = mapRef.current;
                if (!map || selectedCity === 'all' || mappable.length > 0) return;
                const cityEn = displayCityName(selectedCity, 'en').toLowerCase();
                const CITY_CENTERS: Record<string, [number, number]> = {
                        'bangkok':      [13.7563, 100.5018],
                        'pattaya':      [12.9272, 100.8775],
                        'koh chang':    [12.0844, 102.3130],
                        'ko chang':     [12.0844, 102.3130],
                        'phuket':       [ 7.8804,  98.3923],
                        'chiang mai':   [18.7883,  98.9853],
                        'krabi':        [ 8.0863,  98.9063],
                        'koh samui':    [ 9.5317, 100.0614],
                        'ko samui':     [ 9.5317, 100.0614],
                        'hua hin':      [12.5684,  99.9577],
                        'ayutthaya':    [14.3532, 100.5677],
                        'tokyo':        [35.6762, 139.6503],
                        'osaka':        [34.6937, 135.5023],
                        'kyoto':        [35.0116, 135.7681],
                        'paris':        [48.8566,   2.3522],
                        'rome':         [41.9028,  12.4964],
                        'barcelona':    [41.3851,   2.1734],
                        'madrid':       [40.4168,  -3.7038],
                        'amsterdam':    [52.3676,   4.9041],
                        'london':       [51.5074,  -0.1278],
                        'lisbon':       [38.7169,  -9.1399],
                        'dubai':        [25.2048,  55.2708],
                        'singapore':    [ 1.3521, 103.8198],
                        'bali':         [-8.3405, 115.0920],
                        'new york':     [40.7128, -74.0060],
                        'los angeles':  [34.0522,-118.2437],
                };
                const coords = CITY_CENTERS[cityEn];
                if (coords) map.flyTo(coords, 12, { animate: true, duration: 0.8 });
        }, [selectedCity, mappable.length]);

        const handleAddRestaurant = (r: Restaurant) => {
                const exists = trip.restaurants.some(c => c.restaurants.some(x => x.name === r.name));
                let next = trip.restaurants;
                if (exists) {
                        next = next
                                .map(c => ({ ...c, restaurants: c.restaurants.filter(x => x.name !== r.name) }))
                                .filter(c => c.restaurants.length > 0);
                } else {
                        const catTitle = (r as any).categoryTitle || 'תכנון טיול';
                        const idx = next.findIndex(c => c.title === catTitle);
                        if (idx >= 0) {
                                next = next.map((c, i) => i === idx ? { ...c, restaurants: [...c.restaurants, r] } : c);
                        } else {
                                next = [...next, { id: `cat-${Date.now()}`, title: catTitle, region: trip.destination || '', restaurants: [r] }];
                        }
                }
                onUpdateTrip({ ...trip, restaurants: next });
        };

        const handleAddAttraction = (a: Attraction) => {
                const exists = trip.attractions.some(c => c.attractions.some(x => x.name === a.name));
                let next = trip.attractions;
                if (exists) {
                        next = next
                                .map(c => ({ ...c, attractions: c.attractions.filter(x => x.name !== a.name) }))
                                .filter(c => c.attractions.length > 0);
                } else {
                        const catTitle = (a as any).categoryTitle || 'תכנון טיול';
                        const idx = next.findIndex(c => c.title === catTitle);
                        if (idx >= 0) {
                                next = next.map((c, i) => i === idx ? { ...c, attractions: [...c.attractions, a] } : c);
                        } else {
                                next = [...next, { id: `cat-${Date.now()}`, title: catTitle, attractions: [a] }];
                        }
                }
                onUpdateTrip({ ...trip, attractions: next });
        };

        const isAdded = useMemo(() => {
                if (!selected) return false;
                if (selected.kind === 'food') {
                        return trip.restaurants.some(c => c.restaurants.some(r => r.name === selected.name));
                }
                if (selected.kind === 'sights') {
                        return trip.attractions.some(c => c.attractions.some(a => a.name === selected.name));
                }
                return false; // hotels are added via the booking flow, not the map
        }, [selected, trip.restaurants, trip.attractions]);

        const totals = useMemo(() => {
                const f = mappable.filter(p => p.kind === 'food').length;
                const s = mappable.filter(p => p.kind === 'sights').length;
                const h = mappable.filter(p => p.kind === 'hotel').length;
                return { f, s, h, total: mappable.length };
        }, [mappable]);

        return (
                <div className="space-y-3">
                        {/* City filter — pulled from the trip itself. Hidden when only
                             one city, otherwise a chip row that drives both the pin set
                             and the bounds zoom. */}
                        {tripCities.length > 1 && (
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                                        <button
                                                onClick={() => setSelectedCity('all')}
                                                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-bold transition-colors ${
                                                        selectedCity === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                                }`}
                                        >
                                                <MapPin className="w-3.5 h-3.5" /> כל הערים
                                        </button>
                                        {tripCities.map(city => (
                                                <button
                                                        key={city}
                                                        onClick={() => setSelectedCity(city)}
                                                        className={`shrink-0 px-3 py-1.5 rounded-pill text-xs font-bold transition-colors ${
                                                                selectedCity === city ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                                        }`}
                                                >
                                                        {city}
                                                </button>
                                        ))}
                                </div>
                        )}

                        {/* Kind filter chips */}
                        <div className="flex items-center gap-2 flex-wrap">
                                <button
                                        onClick={() => setFilter('all')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-bold transition-colors ${
                                                filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                        <MapPin className="w-3.5 h-3.5" /> הכל ({totals.total})
                                </button>
                                <button
                                        onClick={() => setFilter('food')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-bold transition-colors ${
                                                filter === 'food' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
                                        }`}
                                >
                                        <Utensils className="w-3.5 h-3.5" /> אוכל ({totals.f})
                                </button>
                                <button
                                        onClick={() => setFilter('sights')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-bold transition-colors ${
                                                filter === 'sights' ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50'
                                        }`}
                                >
                                        <Ticket className="w-3.5 h-3.5" /> אטרקציות ({totals.s})
                                </button>
                                <button
                                        onClick={() => setFilter('hotel')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-bold transition-colors ${
                                                filter === 'hotel' ? 'bg-cyan-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-cyan-50'
                                        }`}
                                >
                                        <Hotel className="w-3.5 h-3.5" /> מלונות ({totals.h})
                                </button>

                                {isGeocoding && (
                                        <span className="ms-auto inline-flex items-center gap-1.5 text-2xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-pill">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                ממקם {geocodeProgress.done}/{geocodeProgress.total}
                                        </span>
                                )}
                                {!isGeocoding && missing > 0 && (
                                        <span className="ms-auto text-2xs font-semibold text-slate-400">
                                                {missing} ללא מיקום
                                        </span>
                                )}
                        </div>

                        {/* Map viewport */}
                        <div
                                ref={containerRef}
                                className="w-full h-[60vh] sm:h-[68vh] rounded-2xl overflow-hidden border border-slate-200 shadow-card bg-slate-100"
                                style={{ direction: 'ltr' }}
                        />

                        {/* Empty state */}
                        {mappable.length === 0 && !isGeocoding && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 font-medium">
                                        {allPlaces.length === 0
                                                ? 'אין עדיין מקומות. הרץ מחקר AI במסך גילויים כדי לקבל המלצות.'
                                                : 'אין מקומות מתאימים לסינון הנוכחי. נסה לשחרר את סינון הסוג / העיר.'}
                                </div>
                        )}

                        {/* Detail modal — same component the list uses */}
                        {selected && selected.kind !== 'hotel' && (
                                <GlobalPlaceModal
                                        item={selected.raw as any}
                                        type={selected.kind === 'food' ? 'restaurant' : 'attraction'}
                                        onClose={() => setSelected(null)}
                                        isAdded={isAdded}
                                        onAddToPlan={() => {
                                                if (selected.kind === 'food') handleAddRestaurant(selected.raw as Restaurant);
                                                else handleAddAttraction(selected.raw as Attraction);
                                                setSelected(null);
                                        }}
                                />
                        )}

                        {/* Hotel popup — light card; the full hotel manager lives in
                             the hotels tab so we just show contextual info here. */}
                        {selected && selected.kind === 'hotel' && (
                                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
                                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                                        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                                                <div className="h-40 w-full bg-gradient-to-br from-cyan-500 to-sky-600 flex items-center justify-center">
                                                        <Hotel className="w-14 h-14 text-white/95" />
                                                </div>
                                                <div className="p-5">
                                                        <span className="inline-flex items-center gap-1 text-2xs font-bold text-cyan-700 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-md mb-2">
                                                                🏨 מלון
                                                        </span>
                                                        <h2 className="text-xl font-black text-slate-900 mb-1.5">{selected.name}</h2>
                                                        <div className="flex items-start gap-1.5 text-xs text-slate-500 mb-3">
                                                                <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                                                                <span>{selected.address || selected.location}</span>
                                                        </div>
                                                        <a
                                                                href={safeMapsUrl((selected.raw as HotelBooking).googleMapsUrl, selected.name, selected.address || (selected as any).location)}
                                                                target="_blank" rel="noreferrer"
                                                                className="block text-center py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
                                                        >
                                                                ניווט ב-Google Maps
                                                        </a>
                                                </div>
                                        </div>
                                </div>
                        )}
                </div>
        );
};
