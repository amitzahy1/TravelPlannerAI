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

    // 3. City Grouping Logic
    const cities = useMemo(() => {
        if (!trip?.destination) return [];

        const extractCities = (destination: string) => {
            if (!destination) return [];
            // Split by hyphen (-), en-dash (–), or comma (,)
            return destination.split(/[-–,]/)
                .map(city => city.trim()) // Remove extra spaces
                .filter(city => city.length > 0); // Remove empty strings
        };

        const rawCities = extractCities(trip.destination);

        return rawCities.map(city => {
            // Find items belonging to this city
            const matchItems = mapItems.filter(item => {
                const searchStr = (item.address || item.city || '').toLowerCase();
                return searchStr.includes(city.toLowerCase());
            });

            return {
                name: city,
                count: matchItems.length,
                // Center calculation remains useful for quick focusing, though bounds handles it mostly
                center: null
            };
        });
    }, [mapItems, trip]);

    // 4. Render Map (Initialize)
    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (!mapInstanceRef.current) {
            mapInstanceRef.current = L.map(mapContainerRef.current);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap & CARTO',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(mapInstanceRef.current);

            // Standard Layer Groups (No Cluster)
            markersRef.current = L.layerGroup().addTo(mapInstanceRef.current);
            routeLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
        }

        // Cleanup on unmount handled by ref check
    }, []);

    // 5. Update Map Markers & View
    useEffect(() => {
        const map = mapInstanceRef.current;
        const markerLayer = markersRef.current;
        const routeLayer = routeLayerRef.current;

        if (!map || !markerLayer || !routeLayer) return;

        // Resize fix
        setTimeout(() => map.invalidateSize(), 100);

        markerLayer.clearLayers();
        routeLayer.clearLayers();

        const validItems = mapItems.filter(i => isValidCoordinate(i.lat, i.lng));

        // Filter by City
        const visibleItems = activeCity === 'ALL'
            ? validItems
            : validItems.filter(i => {
                // Case-insensitive check against address or location
                const searchStr = (i.address || i.city || '').toLowerCase();
                return searchStr.includes(activeCity.toLowerCase());
            });

        const bounds = L.latLngBounds([]);

        // Plot Markers
        visibleItems.forEach(item => {
            if (item.type === 'airport') return; // Skip airport markers, lines only

            // Use simple SVG circles/icons based on type
            let color = '#3b82f6';
            let iconSvg = '';

            switch (item.type) {
                case 'hotel': color = '#4f46e5'; iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-8a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v8"/><path d="M5 21h14"/><path d="M9 10a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2"/></svg>'; break;
                case 'restaurant': color = '#ea580c'; iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>'; break;
                case 'attraction': color = '#9333ea'; iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-8"/><path d="m22 2-9 9"/><path d="M17 12a5 5 0 0 0-5-5"/></svg>'; break;
                case 'shopping': color = '#ec4899'; iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-8"/><path d="m22 2-9 9"/><path d="M17 12a5 5 0 0 0-5-5"/></svg>'; break;
            }

            const iconHtml = `<div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px rgba(0,0,0,0.2); color: white;">${iconSvg}</div>`;
            const customIcon = L.divIcon({ html: iconHtml, className: 'custom-map-icon', iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32] });

            L.marker([item.lat!, item.lng!], { icon: customIcon })
                .bindPopup(`<div style="font-family:'Rubik'; text-align:right; direction:rtl;"><strong>${item.name}</strong><br/><span style="font-size:12px;color:gray;">${item.description || ''}</span></div>`)
                .addTo(markerLayer);

            bounds.extend([item.lat!, item.lng!]);
        });

        // Plot Route (Only if showing ALL)
        if (activeCity === 'ALL' && trip && !items) {
            const routeNodes = validItems
                .filter(i => i.type === 'airport' || i.type === 'hotel')
                .sort((a, b) => getItemTimestamp(a) - getItemTimestamp(b));

            for (let i = 0; i < routeNodes.length - 1; i++) {
                const start = routeNodes[i];
                const end = routeNodes[i + 1];
                if (!start.lat || !end.lat) continue;

                const isFlight = (start.type === 'airport' && end.type === 'airport');
                const dist = getDistanceFromLatLonInKm(start.lat!, start.lng!, end.lat!, end.lng!);

                if (!isFlight && dist < 5) continue;
                if (!isFlight && dist > 3000) continue;

                const polyline = L.polyline([[start.lat!, start.lng!], [end.lat!, end.lng!]], {
                    color: isFlight ? '#3b82f6' : '#10b981',
                    weight: 3,
                    opacity: 0.7,
                    dashArray: isFlight ? '10, 10' : undefined
                }).addTo(routeLayer);

                // Direction Arrow
                const midLat = (start.lat! + end.lat!) / 2;
                const midLng = (start.lng! + end.lng!) / 2;
                const bearing = getBearing(start.lat!, start.lng!, end.lat!, end.lng!);
                const arrowHtml = `<div style="transform: rotate(${bearing}deg); color: ${isFlight ? '#3b82f6' : '#10b981'}; background:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(0,0,0,0.1);"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M2 12h20M13 2l9 10-9 10" stroke="currentColor" stroke-width="3"/></svg></div>`;
                L.marker([midLat, midLng], { icon: L.divIcon({ html: arrowHtml, className: '', iconSize: [20, 20], iconAnchor: [10, 10] }) }).addTo(routeLayer);

                bounds.extend([start.lat!, start.lng!]);
                bounds.extend([end.lat!, end.lng!]);
            }
        }

        // View Control
        if (bounds.isValid()) {
            // If specific city selected, perform a flyTo
            if (activeCity !== 'ALL') {
                map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 14, duration: 1.5 });
            } else {
                // Initial fit
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
            }
        } else if (trip?.destination) {
            // Fallback
            geocodeAddress(trip.destination).then(c => c && map.setView([c.lat, c.lng], 10));
        }

    }, [mapItems, activeCity, trip]);


    // --- UI RENDER ---
    return (
        <div className="w-full relative bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-200 animate-fade-in group">

            {/* City Navigator Bar */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-center pointer-events-none">
                <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-full shadow-lg border border-white/50 flex gap-2 overflow-x-auto max-w-full pointer-events-auto no-scrollbar items-center">
                    <button
                        onClick={() => setActiveCity('ALL')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeCity === 'ALL' ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}
                    >
                        <MapIcon className="w-3.5 h-3.5" />
                        כל המסלול
                    </button>
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    {cities.map(c => (
                        <button
                            key={c.name}
                            onClick={() => setActiveCity(c.name)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${activeCity === c.name ? 'bg-blue-600 text-white shadow-md' : 'bg-transparent text-slate-600 hover:bg-slate-100'}`}
                        >
                            <Navigation className={`w-3 h-3 ${activeCity === c.name ? 'text-white' : 'text-slate-400'}`} />
                            {c.name}
                            <span className={`text-[9px] px-1.5 rounded-full ${activeCity === c.name ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>{c.count}</span>
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