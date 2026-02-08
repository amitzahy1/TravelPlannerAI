import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { Trip } from '../types';
import { Loader2, Map as MapIcon, Navigation } from 'lucide-react';

// --- Interfaces ---
interface MapItem {
    id: string;
    type: 'hotel' | 'restaurant' | 'attraction' | 'airport' | 'shopping';
    subType?: 'departure' | 'arrival'; // Special for flights
    flightId?: string; // To link dep/arr
    name: string;
    description?: string;
    lat?: number;
    lng?: number;
    address?: string; // Fallback for geocoding
    date?: string; // For routing order
    time?: string; // For routing order
    city?: string; // For City Navigation
}

interface UnifiedMapViewProps {
    trip?: Trip; // If provided, shows EVERYTHING
    items?: MapItem[]; // If provided, shows specific list (overrides trip)
    height?: string;
    title?: string;
}

const STORAGE_KEY = 'travel_app_geo_cache_v4';

// Cross-language city mapping for Hebrew <-> English filter matching
const HEBREW_TO_ENGLISH_CITY_MAP: Record<string, string[]> = {
    'בנגקוק': ['Bangkok', 'Krung Thep'],
    'פטאייה': ['Pattaya', 'Chon Buri'],
    'פוקט': ['Phuket'],
    'קו סמט': ['Koh Samet', 'Ko Samet', 'Rayong'],
    'צ\'יאנג מאי': ['Chiang Mai'],
    'קוסמוי': ['Koh Samui', 'Ko Samui', 'Surat Thani'],
    'קראבי': ['Krabi'],
    'הואה הין': ['Hua Hin'],
    'תל אביב': ['Tel Aviv'],
    'ירושלים': ['Jerusalem'],
    'אילת': ['Eilat'],
    'חיפה': ['Haifa'],
    'לונדון': ['London'],
    'פריז': ['Paris'],
    'ניו יורק': ['New York', 'NYC', 'Manhattan'],
    'רומא': ['Rome', 'Roma'],
    'ברצלונה': ['Barcelona'],
    'אמסטרדם': ['Amsterdam'],
    'ברלין': ['Berlin'],
    'טוקיו': ['Tokyo'],
    'סינגפור': ['Singapore'],
    'דובאי': ['Dubai'],
    'אתונה': ['Athens'],
    'וינה': ['Vienna', 'Wien'],
    'פראג': ['Prague', 'Praha'],
    'בודפשט': ['Budapest'],
    'ליסבון': ['Lisbon', 'Lisboa'],
};

// Helper: Get English keywords for a Hebrew city (or vice versa)
const getCityKeywords = (cityName: string): string[] => {
    const lowerCity = cityName.toLowerCase();

    // Check Hebrew -> English
    for (const [hebrew, englishList] of Object.entries(HEBREW_TO_ENGLISH_CITY_MAP)) {
        if (hebrew.toLowerCase() === lowerCity) {
            return englishList.map(e => e.toLowerCase());
        }
        // Check English -> Hebrew (reverse lookup)
        if (englishList.some(e => e.toLowerCase() === lowerCity)) {
            return [hebrew.toLowerCase(), ...englishList.map(e => e.toLowerCase())];
        }
    }

    // Fallback: return the original city name
    return [lowerCity];
};

// --- Helpers ---
const isValidCoordinate = (lat?: number, lng?: number) => {
    return typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
};

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
};

const getBearing = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const y = Math.sin(deg2rad(lng2 - lng1)) * Math.cos(deg2rad(lat2));
    const x = Math.cos(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) -
        Math.sin(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(deg2rad(lng2 - lng1));
    const brng = Math.atan2(y, x);
    return (brng * 180 / Math.PI + 360) % 360;
};

const parseTripDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return new Date(dateStr);
    const parts = dateStr.split('/');
    if (parts.length !== 3) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;
        return null;
    }
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
};

const getItemTimestamp = (item: MapItem): number => {
    if (!item.date) return 0;
    const date = parseTripDate(item.date);
    if (!date) return 0;
    if (item.time) {
        const [hours, minutes] = item.time.split(':').map(Number);
        date.setHours(hours || 0, minutes || 0);
    }
    return date.getTime();
};

// Geocoding Cache & Logic
const geocodeAddress = async (query: string): Promise<{ lat: number; lng: number } | null> => {
    if (!query) return null;
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
            headers: { 'User-Agent': 'TravelPlannerPro/1.0' }
        });
        const data = await response.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        return null;
    } catch (e) {
        console.warn("Geocoding failed for", query);
        return null;
    }
};

export const UnifiedMapView: React.FC<UnifiedMapViewProps> = ({ trip, items, height = "75vh", title }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.LayerGroup | null>(null);
    const routeLayerRef = useRef<L.LayerGroup | null>(null);

    const [mapItems, setMapItems] = useState<MapItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeCity, setActiveCity] = useState<string | 'ALL'>('ALL');
    const [routeCities, setRouteCities] = useState<{ name: string; displayName?: string; type?: 'flight' | 'hotel' | 'city'; code?: string; coords?: { lat: number; lng: number } }[]>([]);

    // Geocoding Cache
    const [geocodedCache, setGeocodedCache] = useState<Record<string, { lat: number, lng: number }>>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : {};
        } catch { return {}; }
    });

    // 1. Prepare Data
    useEffect(() => {
        let rawItems: MapItem[] = [];

        if (items) {
            rawItems = items;
        } else if (trip) {
            // FLIGHTS
            const sortedSegments = [...(trip.flights?.segments || [])].sort((a, b) => {
                return (parseTripDate(a.date)?.getTime() || 0) - (parseTripDate(b.date)?.getTime() || 0);
            });
            const originCode = sortedSegments.length > 0 ? sortedSegments[0].fromCode : null;

            sortedSegments.forEach(seg => {
                if (seg.fromCode !== originCode) {
                    rawItems.push({
                        id: `flight-${seg.flightNumber}-dep`,
                        type: 'airport',
                        subType: 'departure',
                        flightId: seg.flightNumber,
                        name: `${seg.fromCity} (${seg.fromCode})`,
                        date: seg.date,
                        time: seg.departureTime,
                        city: seg.fromCity
                    });
                }
                if (seg.toCode !== originCode) {
                    rawItems.push({
                        id: `flight-${seg.flightNumber}-arr`,
                        type: 'airport',
                        subType: 'arrival',
                        flightId: seg.flightNumber,
                        name: `${seg.toCity} (${seg.toCode})`,
                        date: seg.date,
                        time: seg.arrivalTime,
                        city: seg.toCity
                    });
                }
            });

            // HOTELS
            trip.hotels.forEach(h => {
                // Extract city from address if possible, simplistic fallback
                const cityGuess = h.address?.split(',')?.[1]?.trim() || h.address || trip.destination;
                rawItems.push({
                    id: h.id, type: 'hotel', name: h.name, address: h.address, lat: h.lat, lng: h.lng, description: h.roomType, date: h.checkInDate, city: cityGuess
                });
            });

            // RESTAURANTS & ATTRACTIONS
            trip.restaurants.forEach(cat => cat.restaurants.forEach(r => {
                const cityGuess = r.location?.split(',')?.[1]?.trim() || trip.destination;
                rawItems.push({ id: r.id, type: 'restaurant', name: r.name, address: r.location, lat: r.lat, lng: r.lng, description: r.description, date: r.reservationDate, time: r.reservationTime, city: cityGuess });
            }));
            trip.attractions.forEach(cat => cat.attractions.forEach(a => {
                const cityGuess = a.location?.split(',')?.[1]?.trim() || trip.destination;
                rawItems.push({ id: a.id, type: 'attraction', name: a.name, address: a.location, lat: a.lat, lng: a.lng, description: a.description, date: a.scheduledDate, time: a.scheduledTime, city: cityGuess });
            }));

            // SHOPPING
            if (trip.shoppingItems) {
                trip.shoppingItems.forEach(s => {
                    if (s.shopName) {
                        rawItems.push({
                            id: s.id,
                            type: 'shopping',
                            name: s.shopName,
                            address: `${s.shopName}, ${trip.destination}`,
                            description: `${s.name}`,
                            date: s.purchaseDate,
                            city: trip.destination
                        });
                    }
                });
            }
        }
        setMapItems(rawItems);
    }, [trip, items]);

    // 2. Geocode & Filter (Same logic as before, just ensuring cache consistency)
    useEffect(() => {
        const resolveAndFilter = async () => {
            if (mapItems.length === 0) return;
            const itemsToGeocode = mapItems.filter(i => !i.lat && i.address);
            if (itemsToGeocode.length > 0) setLoading(true);

            const newItems = [...mapItems];
            let newCacheEntries: Record<string, { lat: number, lng: number }> = {};
            let hasUpdates = false;

            await Promise.all(newItems.map(async (item) => {
                if ((item.lat && item.lng) || !item.address) return;

                if (geocodedCache[item.address]) {
                    item.lat = geocodedCache[item.address].lat;
                    item.lng = geocodedCache[item.address].lng;
                    return;
                }

                let query = item.address;
                if (item.type === 'airport') query = item.name.split('(')[0] + ' Airport';

                const coords = await geocodeAddress(query);
                if (coords) {
                    item.lat = coords.lat;
                    item.lng = coords.lng;
                    newCacheEntries[item.address] = coords;
                    hasUpdates = true;
                }
            }));

            if (hasUpdates) {
                setGeocodedCache(prev => {
                    const updated = { ...prev, ...newCacheEntries };
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                    return updated;
                });
            }
            setMapItems(newItems);
            setLoading(false);
        };
        resolveAndFilter();
    }, [mapItems.length, trip]); // Depend on length to avoid infinite loops, simplistic check

    // 3. City Grouping Logic (Fixed: Aggregate ALL cities from items, not just destination string)
    const cities = useMemo(() => {
        const cityMap = new Map<string, number>();
        const normalize = (s?: string) => s ? s.trim() : '';

        // 1. Add cities from Destination String (Base)
        if (trip?.destination) {
            trip.destination.split(/[-–,]/).forEach(c => {
                const name = normalize(c);
                if (name) cityMap.set(name, 0);
            });
        }

        // 2. Scan all map items and auto-add their cities
        mapItems.forEach(item => {
            const city = normalize(item.city);
            if (city) {
                // If this city isn't in the map yet, try to find a fuzzy match or add it
                // Simple version: just add if missing
                if (!cityMap.has(city)) {
                    cityMap.set(city, 0);
                }
            }
        });

        // 3. Count items per city
        const cityList = Array.from(cityMap.keys()).map(cityName => {
            // Get keywords for robust matching
            const keywords = getCityKeywords(cityName);
            const count = mapItems.filter(item => {
                const searchStr = (item.address || item.city || item.name || '').toLowerCase();
                return keywords.some(kw => searchStr.includes(kw));
            }).length;
            return { name: cityName, count };
        }).filter(c => c.count > 0 || (trip?.destination || '').includes(c.name)); // Keep if in destination OR has items

        return cityList;
    }, [mapItems, trip]);

    // 3.5. Build and geocode route cities (Updated: Preserve Hotel Name)
    useEffect(() => {
        if (!trip || items) return;

        const buildAndGeocodeRoute = async () => {
            // Extended interface to include displayName
            const newRoute: { name: string; displayName?: string; type: 'flight' | 'hotel' | 'city'; code?: string; coords?: { lat: number; lng: number } }[] = [];

            // 1. Flight Segments
            const flightSegments = [...(trip.flights?.segments || [])].sort((a, b) => {
                return (parseTripDate(a.date)?.getTime() || 0) - (parseTripDate(b.date)?.getTime() || 0);
            });

            flightSegments.forEach(seg => {
                if (seg.fromCity && (newRoute.length === 0 || newRoute[newRoute.length - 1].name.toLowerCase() !== seg.fromCity.toLowerCase())) {
                    newRoute.push({ name: seg.fromCity, displayName: seg.fromCity, type: 'city', code: seg.fromCode }); // Flights just show City
                }
                if (seg.toCity && (newRoute.length === 0 || newRoute[newRoute.length - 1].name.toLowerCase() !== seg.toCity.toLowerCase())) {
                    newRoute.push({ name: seg.toCity, displayName: seg.toCity, type: 'city', code: seg.toCode });
                }
            });

            // 2. Hotels (Interleave or Append)
            // If we have flights, usually hotels are "inside" changes. 
            // Simplified: If no flights, populate from hotels. If flights exist, we might miss "Road Trips".
            // For now, let's stick to the previous fallback logic but enhance the data.

            if (newRoute.length === 0) {
                const sortedHotels = [...(trip.hotels || [])].sort((a, b) => {
                    return (parseTripDate(a.checkInDate || '')?.getTime() || 0) - (parseTripDate(b.checkInDate || '')?.getTime() || 0);
                });

                sortedHotels.forEach(hotel => {
                    const cityGuess = hotel.address?.split(',').slice(-2, -1)[0]?.trim() || hotel.address?.split(',')[1]?.trim();
                    // Use Hotel Name if available, otherwise City
                    if (cityGuess) {
                        newRoute.push({
                            name: cityGuess,
                            displayName: hotel.name || cityGuess, // SHOW HOTEL NAME!
                            type: 'hotel',
                            coords: hotel.lat && hotel.lng ? { lat: hotel.lat, lng: hotel.lng } : undefined
                        });
                    }
                });
            }

            // 3. Last fallback
            if (newRoute.length === 0 && trip.destination) {
                const destCities = trip.destination.split(/[-–,&]/).map(c => c.trim()).filter(Boolean);
                destCities.forEach(city => newRoute.push({ name: city, displayName: city, type: 'city' }));
            }

            // Geocode missing...
            for (const item of newRoute) {
                if (item.coords) continue;
                const query = item.code ? `${item.name} Airport` : item.name;

                // Cache check...
                if (geocodedCache[query]) item.coords = geocodedCache[query];
                else if (geocodedCache[item.name]) item.coords = geocodedCache[item.name];
                else {
                    const coords = await geocodeAddress(query);
                    if (coords) {
                        item.coords = coords;
                        setGeocodedCache(prev => {
                            const updated = { ...prev, [query]: coords };
                            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                            return updated;
                        });
                    }
                }
            }
            setRouteCities(newRoute);
        };
        buildAndGeocodeRoute();
    }, [trip, items, geocodedCache]);

    // ... (Map Init useEffect skipped - no changes) ...

    // 5. Update Map Markers & View
    useEffect(() => {
        const map = mapInstanceRef.current;
        const markerLayer = markersRef.current;
        const routeLayer = routeLayerRef.current;

        if (!map || !markerLayer || !routeLayer) return;

        setTimeout(() => map.invalidateSize(), 100);

        markerLayer.clearLayers();
        routeLayer.clearLayers();

        const validItems = mapItems.filter(i => isValidCoordinate(i.lat, i.lng));

        // Filter by City
        const visibleItems = activeCity === 'ALL'
            ? validItems
            : validItems.filter(i => {
                const searchStr = (i.address || i.city || '').toLowerCase();
                return searchStr.includes(activeCity.toLowerCase());
            });

        const bounds = L.latLngBounds([]);

        // Plot Markers (Standard Items)
        visibleItems.forEach(item => {
            if (item.type === 'airport') return;

            // Brand Colors
            let color = '#3b82f6';
            let iconSvg = '';

            switch (item.type) {
                case 'hotel': color = '#0ea5e9'; iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-8a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v8"/><path d="M5 21h14"/><path d="M9 10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2"/></svg>'; break;
                case 'restaurant': color = '#f97316'; iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>'; break;
                case 'attraction': color = '#8b5cf6'; iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-8"/><path d="m22 2-9 9"/><path d="M17 12a5 5 0 0 0-5-5"/></svg>'; break;
                case 'shopping': color = '#ec4899'; iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'; break;
            }

            const iconHtml = `<div style="background-color: ${color}; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.3); color: white;">${iconSvg}</div>`;
            const customIcon = L.divIcon({ html: iconHtml, className: 'custom-map-icon', iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -36] });

            L.marker([item.lat!, item.lng!], { icon: customIcon })
                .bindPopup(`<div style="font-family:'Rubik'; text-align:right; direction:rtl;">
                    <div style="color:${color}; font-size:10px; font-weight:bold; letter-spacing:0.5px; margin-bottom:2px; text-transform:uppercase;">${item.type.toUpperCase()}</div>
                    <strong style="font-size:14px;">${item.name}</strong><br/>
                    <span style="font-size:12px;color:gray;">${item.description || ''}</span>
                </div>`)
                .addTo(markerLayer);

            bounds.extend([item.lat!, item.lng!]);
        });

        // Plot Route (Refined Styles & Labels)
        if (activeCity === 'ALL' && trip && !items && routeCities.length > 0) {
            const cityRoute = routeCities;
            let stopNumber = 0;

            cityRoute.forEach(city => {
                if (!city.coords) return;
                stopNumber++;

                // PILL MARKER: Number + Name
                const pillHtml = `
                    <div style="
                        display: flex;
                        align-items: center;
                        background: white;
                        border-radius: 20px;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                        padding-right: 4px; /* Number side */
                        padding-left: 12px;
                        height: 36px;
                        border: 2px solid white;
                        transform: translate(50%, -50%); /* Center anchor tweak */
                        white-space: nowrap;
                    ">
                        <div style="
                             background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
                             width: 28px;
                             height: 28px;
                             border-radius: 50%;
                             color: white;
                             font-weight: 900;
                             font-size: 13px;
                             display: flex;
                             align-items: center;
                             justify-content: center;
                             margin-left: 8px;
                             flex-shrink: 0;
                        ">${stopNumber}</div>
                        <span style="
                            font-family: 'Rubik', sans-serif;
                            font-weight: 700;
                            font-size: 13px;
                            color: #1e293b;
                        ">${city.displayName || city.name}</span>
                    </div>
                `;

                const pillIcon = L.divIcon({
                    html: pillHtml,
                    className: 'map-route-pill', // Add custom class if needed for hover effects
                    iconSize: [0, 0], // Size 0 handled by HTML content overflow
                    iconAnchor: [0, 0] // Adjusted in CSS transform above
                });

                L.marker([city.coords.lat, city.coords.lng], { icon: pillIcon, zIndexOffset: 1000 })
                    .addTo(markerLayer);

                bounds.extend([city.coords.lat, city.coords.lng]);
            });

            // Draw Lines (Enhanced)
            for (let i = 0; i < cityRoute.length - 1; i++) {
                const start = cityRoute[i];
                const end = cityRoute[i + 1];
                if (!start.coords || !end.coords) continue;

                const dist = getDistanceFromLatLonInKm(start.coords.lat, start.coords.lng, end.coords.lat, end.coords.lng);
                let pathPoints: [number, number][];

                // Curve Logic (Same as before, just kept for smoothness)
                if (dist > 50) {
                    const steps = 40; // Smoother
                    pathPoints = [];
                    for (let s = 0; s <= steps; s++) {
                        const t = s / steps;
                        const lat = start.coords.lat + (end.coords.lat - start.coords.lat) * t;
                        const lng = start.coords.lng + (end.coords.lng - start.coords.lng) * t;
                        const curveFactor = Math.min(dist / 40, 4); // Slightly less aggressive curve
                        const curveOffset = Math.sin(t * Math.PI) * curveFactor;
                        const perpLat = -(end.coords.lng - start.coords.lng) / Math.max(dist, 1);
                        const perpLng = (end.coords.lat - start.coords.lat) / Math.max(dist, 1);
                        pathPoints.push([lat + perpLat * curveOffset * 0.5, lng + perpLng * curveOffset * 0.5]);
                    }
                } else {
                    pathPoints = [[start.coords.lat, start.coords.lng], [end.coords.lat, end.coords.lng]];
                }

                // GLOW Layer (Bottom)
                L.polyline(pathPoints, {
                    color: '#3b82f6',
                    weight: 8,
                    opacity: 0.2,
                    lineCap: 'round',
                }).addTo(routeLayer);

                // DASHED Line (Top)
                L.polyline(pathPoints, {
                    color: '#2563eb',
                    weight: 3,
                    opacity: 0.9,
                    dashArray: '8, 8',
                    lineCap: 'round',
                    lineJoin: 'round'
                }).addTo(routeLayer);

                // Icon at Midpoint
                const midIdx = Math.floor(pathPoints.length / 2);
                const midLat = pathPoints[midIdx][0] + 0.5; // Offset slightly?
                const midLng = pathPoints[midIdx][1];
                const bearing = getBearing(start.coords.lat, start.coords.lng, end.coords.lat, end.coords.lng);

                const arrowHtml = `
                     <div style="
                        transform: rotate(${bearing - 90}deg);
                        color: #2563eb;
                        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
                    ">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </div>
                `;
                // Simple Arrow, no circular bg for cleaner look on route
                L.marker([pathPoints[midIdx][0], pathPoints[midIdx][1]], {
                    icon: L.divIcon({ html: arrowHtml, className: '', iconSize: [24, 24], iconAnchor: [12, 12] })
                }).addTo(routeLayer);
            }
        }

        // View Control
        if (bounds.isValid()) {
            if (activeCity !== 'ALL') {
                map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 14, duration: 1.5 });
            } else {
                map.fitBounds(bounds, { padding: [80, 80], maxZoom: 10 });
            }
        } else if (trip?.destination) {
            geocodeAddress(trip.destination).then(c => c && map.setView([c.lat, c.lng], 10));
        }

    }, [mapItems, activeCity, trip, routeCities]);


    // --- UI RENDER ---
    return (
        <div className="w-full relative bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-200 animate-fade-in group">

            {/* City Navigator Bar */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-center pointer-events-none">
                <div className="bg-white/95 backdrop-blur-xl p-2 rounded-2xl shadow-xl border border-white/50 flex gap-2 overflow-x-auto max-w-full pointer-events-auto no-scrollbar items-center">
                    <button
                        onClick={() => setActiveCity('ALL')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeCity === 'ALL' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                    >
                        <MapIcon className="w-4 h-4" />
                        כל המסלול
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                    {cities.map(c => (
                        <button
                            key={c.name}
                            onClick={() => setActiveCity(c.name)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeCity === c.name ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'}`}
                        >
                            {/* <Navigation className={`w-3 h-3 ${activeCity === c.name ? 'text-white' : 'text-slate-400'}`} /> */}
                            {c.name}
                            {c.count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeCity === c.name ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{c.count}</span>}
                        </button>
                    ))}
                </div>
            </div>

            {loading && (
                <div className="absolute bottom-4 left-4 z-[400] bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-gray-200 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-xs font-bold text-gray-600">טוען מיקומים...</span>
                </div>
            )}

            <div ref={mapContainerRef} style={{ height, width: '100%' }} className="z-10 bg-slate-50" />
        </div>
    );
};