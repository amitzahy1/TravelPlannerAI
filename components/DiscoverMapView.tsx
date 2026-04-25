import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Trip, Restaurant, Attraction } from '../types';
import { Utensils, Ticket, MapPin } from 'lucide-react';
import { GlobalPlaceModal } from './GlobalPlaceModal';

type Kind = 'food' | 'sights';

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
        raw: Restaurant | Attraction;
}

const PIN_COLORS = {
        food:   { bg: '#ea580c', ring: '#ffedd5', emoji: '🍽' },
        sights: { bg: '#7c3aed', ring: '#ede9fe', emoji: '📍' },
} as const;

const makePinIcon = (kind: Kind, rating?: number, isSelected?: boolean): L.DivIcon => {
        const cfg = PIN_COLORS[kind];
        const ratingHtml = rating
                ? `<div style="position:absolute;top:-6px;right:-8px;background:#fff;color:#0f172a;border:1.5px solid ${cfg.bg};font-size:9px;font-weight:800;padding:1px 4px;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.18);">${rating}★</div>`
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
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

/**
 * Map view for the Discover tab — restaurants + attractions plotted on a
 * clean cartographic basemap, each pin tappable to open the same detail
 * popup the list view uses. Items without geocodes are reported in a
 * footer chip so the user knows what's missing.
 */
export const DiscoverMapView: React.FC<DiscoverMapViewProps> = ({ trip, onUpdateTrip }) => {
        const containerRef = useRef<HTMLDivElement>(null);
        const mapRef = useRef<L.Map | null>(null);
        const layerRef = useRef<L.LayerGroup | null>(null);
        const [filter, setFilter] = useState<'all' | Kind>('all');
        const [selected, setSelected] = useState<MapPlace | null>(null);

        // Flatten + filter restaurants/attractions to placements that can be
        // shown on the map. Drops items without lat/lng (we surface the
        // missing count below as a hint).
        const { places, missing } = useMemo(() => {
                const all: MapPlace[] = [];
                let miss = 0;
                (trip.aiRestaurants || []).forEach(cat => cat.restaurants.forEach(r => {
                        if (isValidLatLng(r.lat, r.lng)) {
                                all.push({
                                        id: r.id, kind: 'food',
                                        name: r.name, nameEnglish: (r as any).nameEnglish, location: r.location,
                                        lat: r.lat, lng: r.lng,
                                        rating: r.googleRating, recommendationSource: r.recommendationSource,
                                        cuisine: r.cuisine, description: r.description, imageUrl: r.imageUrl,
                                        raw: r,
                                });
                        } else miss++;
                }));
                (trip.aiAttractions || []).forEach(cat => cat.attractions.forEach(a => {
                        if (isValidLatLng(a.lat, a.lng)) {
                                all.push({
                                        id: a.id, kind: 'sights',
                                        name: a.name, location: a.location,
                                        lat: a.lat, lng: a.lng,
                                        rating: a.rating, recommendationSource: a.recommendationSource,
                                        type: a.type, description: a.description, imageUrl: a.imageUrl,
                                        raw: a,
                                });
                        } else miss++;
                }));
                return {
                        places: filter === 'all' ? all : all.filter(p => p.kind === filter),
                        missing: miss,
                };
        }, [trip.aiRestaurants, trip.aiAttractions, filter]);

        // 1. Initialise the Leaflet map once per mount. CartoDB Voyager basemap
        // — clean modern style, similar to Airbnb / Google Maps light.
        useEffect(() => {
                if (!containerRef.current || mapRef.current) return;
                const map = L.map(containerRef.current, {
                        center: [13.7563, 100.5018], // Bangkok default
                        zoom: 10,
                        zoomControl: true,
                        attributionControl: false,
                });
                L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                        maxZoom: 19,
                        subdomains: 'abcd',
                }).addTo(map);
                L.control.attribution({ prefix: false, position: 'bottomleft' })
                        .addAttribution('© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · © <a href="https://carto.com/attributions">CARTO</a>')
                        .addTo(map);
                mapRef.current = map;
                layerRef.current = L.layerGroup().addTo(map);
                setTimeout(() => map.invalidateSize(), 200);
                const ro = new ResizeObserver(() => map.invalidateSize());
                ro.observe(containerRef.current);
                return () => { ro.disconnect(); map.remove(); mapRef.current = null; layerRef.current = null; };
        }, []);

        // 2. Render pins on every places change. Keep the layer group fresh by
        // clearing + adding — places are typically <100 so this is cheap.
        useEffect(() => {
                const map = mapRef.current;
                const layer = layerRef.current;
                if (!map || !layer) return;
                layer.clearLayers();
                if (places.length === 0) return;

                const bounds = L.latLngBounds([]);
                places.forEach(p => {
                        const isSel = selected?.id === p.id;
                        const icon = makePinIcon(p.kind, p.rating, isSel);
                        const marker = L.marker([p.lat, p.lng], { icon, riseOnHover: true });

                        // Tooltip — instant context: name + source + rating without
                        // having to open the modal. Sticks just above the pin.
                        const ratingChip = p.rating ? `<span style="display:inline-flex;align-items:center;gap:2px;background:#fef9c3;color:#854d0e;font-weight:800;font-size:10px;padding:1px 5px;border-radius:8px;">${p.rating}★</span>` : '';
                        const sourceChip = p.recommendationSource
                                ? `<div style="font-size:10px;font-weight:700;color:#92400e;background:#fef3c7;padding:2px 6px;border-radius:6px;margin-top:3px;display:inline-block;">🏆 ${p.recommendationSource.replace(/Bib/i, 'Michelin')}</div>`
                                : '';
                        const tooltipHtml = `
                            <div style="font-family:'Rubik','Inter',sans-serif;direction:rtl;text-align:right;min-width:140px;max-width:220px;padding:2px 0;">
                                <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
                                    <span style="font-size:14px;font-weight:800;color:#0f172a;line-height:1.2;flex:1;">${p.nameEnglish || p.name}</span>
                                    ${ratingChip}
                                </div>
                                <div style="font-size:11px;color:#64748b;line-height:1.3;">${p.location || ''}</div>
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

                if (places.length === 1) {
                        map.setView([places[0].lat, places[0].lng], 14, { animate: true });
                } else if (bounds.isValid()) {
                        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: true });
                }
        }, [places, selected]);

        const handleAddRestaurant = (r: Restaurant) => {
                if (!selected || selected.kind !== 'food') return;
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
                if (!selected || selected.kind !== 'sights') return;
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
                return trip.attractions.some(c => c.attractions.some(a => a.name === selected.name));
        }, [selected, trip.restaurants, trip.attractions]);

        return (
                <div className="space-y-3">
                        {/* Filter chips: All / Food / Sights */}
                        <div className="flex items-center gap-2 flex-wrap">
                                <button
                                        onClick={() => setFilter('all')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-bold transition-colors ${
                                                filter === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                        }`}
                                >
                                        <MapPin className="w-3.5 h-3.5" /> הכל ({places.length + (filter === 'all' ? 0 : 0)})
                                </button>
                                <button
                                        onClick={() => setFilter('food')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-bold transition-colors ${
                                                filter === 'food' ? 'bg-orange-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-orange-50'
                                        }`}
                                >
                                        <Utensils className="w-3.5 h-3.5" /> אוכל
                                </button>
                                <button
                                        onClick={() => setFilter('sights')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-bold transition-colors ${
                                                filter === 'sights' ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50'
                                        }`}
                                >
                                        <Ticket className="w-3.5 h-3.5" /> אטרקציות
                                </button>
                                {missing > 0 && (
                                        <span className="text-2xs font-semibold text-slate-400 mr-auto">
                                                {missing} ללא מיקום מדויק — לא מוצגים
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
                        {places.length === 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-900 font-medium">
                                        אין עדיין מקומות עם מיקום על המפה לסוג הזה. הרץ מחקר AI במסך גילויים כדי לקבל תוצאות עם קואורדינטות.
                                </div>
                        )}

                        {/* Detail modal — same component the list uses, so the
                             user gets the full info + image + add-to-trip button. */}
                        {selected && (
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
                </div>
        );
};
