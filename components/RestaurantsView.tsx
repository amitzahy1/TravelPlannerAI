import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Trip, Restaurant, RestaurantIconType, RestaurantCategory } from '../types';
import { MapPin, Filter, Coffee, Flame, Fish, Star, Soup, Sandwich, Utensils, StickyNote, Sparkles, BrainCircuit, Loader2, Plus, RotateCw, CheckCircle2, Navigation, Map as MapIcon, List, Calendar, Clock, Trash2, Search, X, Trophy, Wine, Pizza, ChefHat, Store, History, Award, LayoutGrid, RefreshCw, Globe, ChevronLeft, Hotel, Heart } from 'lucide-react';
// cleaned imports
import { getFoodImage } from '../services/imageMapper';
import { SYSTEM_PROMPT, generateWithFallback } from '../services/aiService';
import { CalendarDatePicker } from './CalendarDatePicker';
import { UnifiedMapView } from './UnifiedMapView';
import { ThinkingLoader } from './ThinkingLoader';
import { Tabs } from './ui/Tabs';
import { SkeletonCardGrid } from './ui/Skeleton';
import { PlaceCard } from './PlaceCard';
import { GlobalPlaceModal } from './GlobalPlaceModal';
import { ConfirmModal } from './ConfirmModal';
import { stripChainRestaurants } from '../utils/chainRestaurants';
import { canEditTrip, isTripOwner, isViewerOnly } from '../utils/tripPermissions';
import { getLocalAI, setLocalAI, clearLocalAI, hasLocalAI } from '../utils/localTripAI';
import { findClosedPlaces } from '../utils/closedPlaceCheck';
import { toast } from '../stores/useToastStore';
import { useAuth } from '../contexts/AuthContext';
import { getUserPremiumState, markPremiumRunUsed, getCategoryRefreshes, incrementCategoryRefresh, CategoryRefreshEntry } from '../services/firestoreService';

// Extended interface for internal use
interface ExtendedRestaurant extends Restaurant {
    cuisine?: string;
    categoryTitle?: string;
    nameEnglish?: string; // Critical for mapping
    isHotelRestaurant?: boolean; // New field
}

// Enhanced Visuals with Gradients
const getCuisineVisuals = (cuisine: string = '') => {
    const c = cuisine.toLowerCase();

    if (c.includes('fine') || c.includes('michelin') || c.includes('luxury'))
        return { icon: '💎', gradient: 'bg-gradient-to-br from-slate-800 to-black text-white', label: 'Luxury' };

    if (c.includes('street') || c.includes('market') || c.includes('stall'))
        return { icon: '🥢', gradient: 'bg-gradient-to-br from-orange-400 to-red-500 text-white', label: 'Street Food' };

    if (c.includes('burger') || c.includes('american'))
        return { icon: '🍔', gradient: 'bg-gradient-to-br from-red-500 to-orange-600 text-white', label: 'Burger' };

    if (c.includes('pizza') || c.includes('italian'))
        return { icon: '🍕', gradient: 'bg-gradient-to-br from-green-500 to-emerald-700 text-white', label: 'Italian' };

    if (c.includes('sushi') || c.includes('japanese') || c.includes('ramen'))
        return { icon: '🍜', gradient: 'bg-gradient-to-br from-rose-400 to-pink-600 text-white', label: 'Japanese' };

    if (c.includes('coffee') || c.includes('cafe') || c.includes('brunch'))
        return { icon: '☕', gradient: 'bg-gradient-to-br from-amber-600 to-brown-800 text-white', label: 'Cafe' };

    if (c.includes('bar') || c.includes('cocktail') || c.includes('pub'))
        return { icon: '🍸', gradient: 'bg-gradient-to-br from-purple-600 to-indigo-800 text-white', label: 'Nightlife' };

    if (c.includes('seafood'))
        return { icon: '🦞', gradient: 'bg-gradient-to-br from-blue-400 to-cyan-600 text-white', label: 'Seafood' };

    if (c.includes('thai') || c.includes('asian'))
        return { icon: '🌶️', gradient: 'bg-gradient-to-br from-orange-500 to-yellow-500 text-white', label: 'Asian' };

    if (c.includes('dessert') || c.includes('ice cream'))
        return { icon: '🍦', gradient: 'bg-gradient-to-br from-pink-300 to-rose-400 text-white', label: 'Sweets' };

    if (c.includes('local') || c.includes('authentic') || c.includes('georgian'))
        return { icon: '🍲', gradient: 'bg-gradient-to-br from-amber-500 to-orange-700 text-white', label: 'Local Authentic' };

    if (c.includes('family'))
        return { icon: '👨‍👩‍👧‍👦', gradient: 'bg-gradient-to-br from-green-400 to-teal-600 text-white', label: 'Family Friendly' };

    return { icon: '🍽️', gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white', label: 'Restaurant' };
};

import { cleanTextForMap } from '../utils/textUtils';
import { getTripCities, locationMatchesCity, displayCityName, cityKey, extractRobustCity } from '../utils/geoData';
import { geocodePlacesBatch } from '../utils/geocodePlaces';
import { isPlaceInTripScope, resolvePlaceCity } from '../utils/tripScope';
import { safeMapsUrl } from '../utils/mapsUrl';
import { walkingMinutesBetween } from '../utils/walkingDistance';


// Sorting helper: Favorites first, then Rating
const sortMyRestaurants = (list: Restaurant[]) => {
    return list.sort((a, b) => {
        // 1. Favorites First
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;

        // 2. Rating Second
        return (b.googleRating || 0) - (a.googleRating || 0);
    });
};

const restaurantMatchesCity = (restaurant: Pick<Restaurant, 'location' | 'region'>, city: string): boolean => {
    return locationMatchesCity(restaurant.location || '', city)
        || locationMatchesCity(restaurant.region || '', city);
};

const RestaurantCard: React.FC<{
    rec: ExtendedRestaurant,
    tripDestination: string,
    tripDestinationEnglish?: string,
    isAdded: boolean,
    onAdd: (r: ExtendedRestaurant, cat: string) => void,
    onClick: () => void
}> = ({ rec, tripDestination, tripDestinationEnglish, isAdded, onAdd, onClick }) => {

    const nameForMap = cleanTextForMap(rec.nameEnglish || rec.name);
    const locationForMap = cleanTextForMap(rec.location) || cleanTextForMap(tripDestinationEnglish || tripDestination);
    const mapsUrl = safeMapsUrl(rec.googleMapsUrl, nameForMap, locationForMap);

    const visuals = getCuisineVisuals(rec.cuisine);

    return (
        <PlaceCard
            type="restaurant"
            name={rec.name}
            nameEnglish={rec.nameEnglish}
            description={rec.description}
            location={rec.location}
            rating={rec.googleRating}
            cuisine={rec.cuisine || visuals.label}
            attractionType={visuals.label}
            price={rec.price || (rec.googleRating && rec.googleRating > 4.5 ? '$$$' : '$$')}
            mapsUrl={mapsUrl}
            isAdded={isAdded}
            onAdd={() => onAdd(rec, rec.categoryTitle || 'AI')}
            onClick={onClick}
            recommendationSource={rec.recommendationSource}
            isHotelRestaurant={rec.isHotelRestaurant}
            verification_needed={(rec as any).verification_needed}
        />
    );
};

export const RestaurantsView: React.FC<{ trip: Trip, onUpdateTrip: (t: Trip) => void }> = ({ trip, onUpdateTrip }) => {
    const [activeTab, setActiveTab] = useState<'my_list' | 'recommended'>('recommended');
    console.log("RestaurantView Loaded - v2 Clean Design - Smart Intent Active");
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    // Always-fresh trip ref — used by background tasks (geocoder) so they
    // don't overwrite trip.name / destination / etc. that the user edits
    // while the task is running. Stale closure of `trip` was clobbering
    // user edits and looked like a "trip got deleted" bug.
    const tripRef = useRef(trip);
    useEffect(() => { tripRef.current = trip; }, [trip]);

    // Premium-tier gating — only the trip OWNER gets one Gemini Pro
    // call per 30 days, on the very first AI Recommendations click of
    // a calendar window. Collaborators always run on the free chain.
    const { user } = useAuth();
    const userId = user?.uid;

    // Permission gate — viewers run AI but their results stay local-only
    // (in browser localStorage scoped by trip.id). Editors / owners write
    // through to the shared trip as before. Pass the current UID so the
    // actual owner is recognized even when they joined via a viewer link.
    const viewerMode = isViewerOnly(trip, userId);
    const userCanEdit = canEditTrip(trip, userId);
    const ownerOnly = isTripOwner(trip, userId);
    const [premiumLastUsedAt, setPremiumLastUsedAt] = useState<number | null>(null);
    useEffect(() => {
        if (!userId || !ownerOnly) {
            setPremiumLastUsedAt(0);
            return;
        }
        getUserPremiumState(userId)
            .then(s => setPremiumLastUsedAt(s.lastPremiumRunAt_food ?? s.lastPremiumRunAt ?? 0))
            .catch(() => setPremiumLastUsedAt(0));
    }, [userId, ownerOnly]);
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const resolvePreferTier = (): 'paid' | 'free' => {
        if (!ownerOnly || !userId || premiumLastUsedAt === null) return 'free';
        return Date.now() - premiumLastUsedAt > THIRTY_DAYS_MS ? 'paid' : 'free';
    };
    const stampPremiumIfUsed = async (preferTier: 'paid' | 'free', producedResults: boolean) => {
        if (preferTier === 'paid' && producedResults && userId) {
            await markPremiumRunUsed(userId, 'food');
            setPremiumLastUsedAt(Date.now());
        }
    };

    // Centralised AI-persistence helper. Editors → shared Firestore trip.
    // Viewers → browser localStorage. Same call signature for callers.
    const persistAiRestaurants = (next: RestaurantCategory[]) => {
        const latest = tripRef.current;
        if (userCanEdit) {
            onUpdateTrip({ ...latest, aiRestaurants: next });
        } else {
            setLocalAI(latest.id, { aiRestaurants: next });
        }
    };

    // AI State — for viewers, hydrate from localStorage on top of the shared
    // trip's aiRestaurants so the viewer sees both layers.
    const [aiCategories, setAiCategories] = useState<RestaurantCategory[]>(() => {
        const shared = trip.aiRestaurants || [];
        if (!viewerMode) return shared;
        const local = getLocalAI(trip.id).aiRestaurants;
        return local && local.length > 0 ? local : shared;
    });
    const [loadingRecs, setLoadingRecs] = useState(false);
    const [recError, setRecError] = useState('');
    // showCitySelector removed

    // UX State
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedRater, setSelectedRater] = useState<string>('all');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
    const [isResearchingAll, setIsResearchingAll] = useState(false);
    const [researchProgress, setResearchProgress] = useState({ current: 0, total: 0 });

    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
    const [selectedCity, setSelectedCity] = useState<string>('all');
    // Map-only source filter — saved vs AI vs both. Independent of the list
    // tab so the user can be on "My list" while the map shows full research.
    const [mapSource, setMapSource] = useState<'all' | 'saved' | 'ai'>('all');
    // New cross-cutting filters (apply to both list and map): cuisine/type,
    // price level, max walking minutes from any hotel.
    const [filterCuisines, setFilterCuisines] = useState<Set<string>>(new Set());
    const [filterPrices, setFilterPrices] = useState<Set<string>>(new Set());
    const [filterMaxWalkMin, setFilterMaxWalkMin] = useState<number | null>(null);
    const [textQuery, setTextQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Restaurant[] | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<ExtendedRestaurant | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    // Background-geocoding progress so the map view can show a loading
    // banner while AI results are still being resolved to lat/lng. Failed
    // items (`geocodeFailed: true`) live on the restaurant objects and
    // surface as a separate warning banner.
    const [geocodingInFlight, setGeocodingInFlight] = useState(0);

    // Per-category refresh state
    const [categoryRefreshes, setCategoryRefreshes] = useState<Record<string, CategoryRefreshEntry>>({});
    const [refreshingCategoryId, setRefreshingCategoryId] = useState<string | null>(null);
    const [showRefreshLimitModal, setShowRefreshLimitModal] = useState(false);
    useEffect(() => {
        if (!userId) return;
        getCategoryRefreshes(userId).then(setCategoryRefreshes).catch(() => {});
    }, [userId]);

    // Wipe cached AI restaurants — user starts fresh research manually
    const handleResetResearch = () => {
        setAiCategories([]);
        persistAiRestaurants([]);
        setSelectedCategory('all');
        setSelectedRater('all');
        setConfirmReset(false);
        setTimeout(() => researchAllCities([]), 0);
    };

    // Sync state with trip prop
    useEffect(() => {
        if (trip.aiRestaurants && trip.aiRestaurants.length > 0) {
            setAiCategories(trip.aiRestaurants);
        }
    }, [trip.aiRestaurants]);

    // Exclude flight-only cities (layovers like AUH) — they're not travel destinations
    // the user actually stays in, so they shouldn't pollute the food-research scope.
    const tripCities = useMemo(() => getTripCities(trip, { excludeFlightOnly: true, lang: 'en' }), [trip]);

    // Chips strip on the map header — derived from cities that ACTUALLY have
    // saved or AI-researched items. Avoids the bug where trip.destination /
    // flights / hotels seeded chips for cities with zero items, and where
    // English/Hebrew variants of the same city appeared as separate chips.
    // Items per cityKey are counted; first-seen Hebrew display name is used.
    // Order: chronological by hotel order, leftovers alphabetical.
    const presentCities = useMemo<{ display: string; count: number; key: string }[]>(() => {
        const counts = new Map<string, { display: string; count: number }>();
        const recordCity = (raw?: string) => {
            if (!raw) return;
            const k = cityKey(raw);
            if (!k) return;
            const display = displayCityName(raw, 'he') || raw;
            const existing = counts.get(k);
            if (existing) existing.count += 1;
            else counts.set(k, { display, count: 1 });
        };

        const walkCategories = (cats?: { region?: string; restaurants: { region?: string; location?: string }[] }[]) => {
            (cats || []).forEach(cat => cat.restaurants.forEach(r => {
                recordCity(r.region || cat.region || r.location);
            }));
        };
        walkCategories(trip.restaurants);
        walkCategories(trip.aiRestaurants);

        // Order chronological by hotel sequence: walk hotels in check-in
        // order, attribute each to a cityKey, push that key first if it has
        // items. Leftover cities (research-only with no hotel) trail alphabetical.
        const hotelOrder: string[] = [];
        const seen = new Set<string>();
        const sortedHotels = (trip.hotels || [])
            .map((h, i) => ({ h, i }))
            .sort((a, b) => {
                const ta = a.h.checkInDate ? new Date(a.h.checkInDate).getTime() : Number.MAX_SAFE_INTEGER - a.i;
                const tb = b.h.checkInDate ? new Date(b.h.checkInDate).getTime() : Number.MAX_SAFE_INTEGER - b.i;
                return ta - tb;
            });
        sortedHotels.forEach(({ h }) => {
            const raw = extractRobustCity(h.address || '', h.name || '', trip) || h.city || '';
            const k = cityKey(raw);
            if (k && counts.has(k) && !seen.has(k)) {
                hotelOrder.push(k);
                seen.add(k);
            }
        });
        const leftovers = Array.from(counts.keys())
            .filter(k => !seen.has(k))
            .sort((a, b) => (counts.get(a)!.display).localeCompare(counts.get(b)!.display, 'he'));

        return [...hotelOrder, ...leftovers].map(k => ({
            key: k,
            display: counts.get(k)!.display,
            count: counts.get(k)!.count,
        }));
    }, [trip.restaurants, trip.aiRestaurants, trip.hotels]);

    // Walking minutes from a place to its NEAREST hotel — null when either
    // the place or every hotel is missing coords. Used by the distance filter
    // and by the "Near Hotel" category logic.
    const itemWalkingMinutes = useCallback((r: { lat?: number; lng?: number }): number | null => {
        if (typeof r.lat !== 'number' || typeof r.lng !== 'number') return null;
        let best = Infinity;
        (trip.hotels || []).forEach(h => {
            if (typeof h.lat === 'number' && typeof h.lng === 'number') {
                const m = walkingMinutesBetween({ lat: r.lat!, lng: r.lng! }, { lat: h.lat, lng: h.lng });
                if (m < best) best = m;
            }
        });
        return Number.isFinite(best) ? best : null;
    }, [trip.hotels]);

    // Available filter options — derived from the union of saved + AI items
    // so chips with zero matches don't render. Counts per option support
    // future "(N)" badges.
    const filterOptions = useMemo(() => {
        const cuisines = new Map<string, number>();
        const prices = new Map<string, number>();
        const consider = (r: Restaurant) => {
            const cuisineRaw = (r.cuisine || r.iconType || '').trim();
            if (cuisineRaw) cuisines.set(cuisineRaw, (cuisines.get(cuisineRaw) || 0) + 1);
            const price = (r.priceLevel || '').trim();
            if (price) prices.set(price, (prices.get(price) || 0) + 1);
        };
        trip.restaurants.forEach(c => c.restaurants.forEach(consider));
        (trip.aiRestaurants || []).forEach(c => c.restaurants.forEach(consider));
        return {
            cuisines: Array.from(cuisines.entries()).sort((a, b) => b[1] - a[1]),
            prices: Array.from(prices.entries()).sort((a, b) => a[0].length - b[0].length),
        };
    }, [trip.restaurants, trip.aiRestaurants]);

    // Single predicate combining cuisine / price / distance filters. The list
    // and map both call this so the two stay in sync.
    const passesItemFilters = useCallback((r: Restaurant): boolean => {
        if (filterCuisines.size > 0) {
            const c = (r.cuisine || r.iconType || '').trim();
            if (!filterCuisines.has(c)) return false;
        }
        if (filterPrices.size > 0) {
            const p = (r.priceLevel || '').trim();
            if (!filterPrices.has(p)) return false;
        }
        if (filterMaxWalkMin !== null) {
            const m = itemWalkingMinutes(r);
            if (m === null || m > filterMaxWalkMin) return false;
        }
        return true;
    }, [filterCuisines, filterPrices, filterMaxWalkMin, itemWalkingMinutes]);

    const toggleSetMember = (set: Set<string>, value: string): Set<string> => {
        const next = new Set(set);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
    };
    const activeFilterCount =
        (filterCuisines.size > 0 ? 1 : 0) +
        (filterPrices.size > 0 ? 1 : 0) +
        (filterMaxWalkMin !== null ? 1 : 0);
    const clearAllFilters = () => {
        setFilterCuisines(new Set());
        setFilterPrices(new Set());
        setFilterMaxWalkMin(null);
    };

    // --- Search Logic ---
    const handleTextSearch = async () => {
        if (!textQuery.trim()) return;
        setIsSearching(true);
        setSearchResults(null);
        setRecError('');

        try {
            const prompt = `Search Query: "${textQuery}"
            Destination Context: ${trip.destination}
            
            Mission: Find excellent restaurant/food results for this query.
            - If specific name (e.g. "Pizza East"): Find it.
            - If category (e.g. "Sushi"): Find top examples.
            
            CRITICAL: 'name' field must be in recognized script (English/Local). Description in Hebrew.
            OUTPUT JSON ONLY:
            { "results": [{ "name", "description", "location", "rating", "cuisine", "priceRange", "googleMapsUrl", "business_status" }] }`;

            // Removed Schema enforcement to match Pro Enforcer pattern
            const response = await generateWithFallback(null, [{ role: 'user', parts: [{ text: prompt }] }], { responseMimeType: 'application/json' }, 'SEARCH');

            const textContent = response.text;
            try {
                const data = JSON.parse(textContent || '{}');
                if (data.results) {
                    // Filter out closed businesses
                    const operationalResults = data.results
                        .filter((r: any) => r.business_status === 'OPERATIONAL')
                        .map((r: any, i: number) => ({ ...r, id: `search-res-${i}`, categoryTitle: 'תוצאות חיפוש' }));

                    // Trip-scope filter — keep AI from sneaking out-of-country
                    // results past the destination context. Drops are surfaced
                    // as a toast so the user knows; they can refine the query
                    // if the drop count looks wrong.
                    const inScope = operationalResults.filter((r: any) => isPlaceInTripScope(trip, { location: r.location, region: r.region }));
                    const droppedCount = operationalResults.length - inScope.length;
                    const validResults = inScope.length > 0 ? inScope : operationalResults;
                    if (droppedCount > 0 && inScope.length > 0) {
                        toast.warning(`סוננו ${droppedCount} תוצאות מחוץ לטיול`);
                    } else if (droppedCount > 0 && inScope.length === 0) {
                        toast.info(`כל התוצאות מחוץ לטיול — מציג בכל זאת`);
                    }
                    setSearchResults(validResults);

                    // Save custom category (Task 3)
                    if (textQuery.trim() && validResults.length > 0) {
                        const currentCategories = trip.customFoodCategories || [];
                        if (!currentCategories.includes(textQuery.trim())) {
                            onUpdateTrip({
                                ...trip,
                                customFoodCategories: [...currentCategories, textQuery.trim()]
                            });
                        }
                    }
                }
            } catch (parseError: any) {
                console.error('❌ AI Error: JSON Parse failed. Raw response:', textContent?.substring(0, 500));
                setRecError('שגיאה בפרסור התוצאות. אנא נסה שנית.');
            }
        } catch (e: any) {
            console.error(e);
            setRecError('שגיאה בחיפוש. אנא נסה שנית.');
        } finally { setIsSearching(false); }
    };

    const clearSearch = () => { setTextQuery(''); setSearchResults(null); };

    // --- Near-Hotel Research ---
    // Asks the AI for the best places of ANY cuisine within a 15-minute walk
    // of each hotel. Saves one category per hotel into trip.aiRestaurants so
    // the result behaves like any other AI category (filterable, mappable,
    // savable to "My list").
    const researchNearHotel = async () => {
        const hotels = (trip.hotels || []).filter(h => typeof h.lat === 'number' && typeof h.lng === 'number');
        if (hotels.length === 0) {
            toast.warning('לא נמצא מלון עם קואורדינטות. הוסף כתובת למלון כדי לחפש מסעדות בקרבת מקום.');
            return;
        }

        if (hotels.length > 1 && !window.confirm(`לחקור ${hotels.length} מלונות? זה ייקח עד ~${hotels.length * 8} שניות.`)) {
            return;
        }

        setIsResearchingAll(true);
        setRecError('');
        setResearchProgress({ current: 0, total: hotels.length });
        const preferTier = resolvePreferTier();
        let accumulated: RestaurantCategory[] = [...aiCategories];

        try {
            for (let i = 0; i < hotels.length; i++) {
                const hotel = hotels[i];
                setResearchProgress({ current: i + 1, total: hotels.length });
                const cityEn = displayCityName(hotel.city || trip.destination || '', 'en') || hotel.city || trip.destination || '';
                const titleSuffix = hotels.length > 1 ? ` ליד ${hotel.name}` : ' ליד המלון';
                const catTitle = `🏨${titleSuffix} — עד 15 דק׳ הליכה`;
                const catId = `near-hotel-${hotel.id}`;

                const prompt = `Find ~10 BEST places to EAT within a 15-minute walk (≈1.2 km radius) of "${hotel.name}" at "${hotel.address}" (lat ${hotel.lat}, lng ${hotel.lng}) in ${cityEn}.

Include a WIDE VARIETY of cuisines and price points (DO NOT return all the same type):
- Local street food and stalls
- Casual local restaurants
- Mid-range / family dining
- Fine dining if any walkable nearby
- Cafés, bakeries, dessert shops
- Bars, cocktail lounges, beer halls

HARD RULES:
- Walking distance ≤ 1.2 km from the hotel coordinates above.
- Each place MUST currently be operational. Omit closed/relocated places. Set "business_status" to "OPERATIONAL".
- Cuisine MUST VARY across the list. No more than 3 places of the same cuisine.
- Description in Hebrew, 1–2 sentences.
- Return JSON ONLY:
  { "restaurants": [{ "name", "description", "location", "cuisine", "priceLevel" ("$"|"$$"|"$$$"|"$$$$"), "googleMapsUrl", "googleRating" (number), "recommendationSource", "business_status" }] }`;

                try {
                    const response = await generateWithFallback(null, [{ role: 'user', parts: [{ text: prompt }] }], { responseMimeType: 'application/json', temperature: 0.2 }, 'SEARCH', preferTier);
                    const data = JSON.parse(response.text || '{}');
                    const rawList: any[] = Array.isArray(data.restaurants) ? data.restaurants : (Array.isArray(data) ? data : []);
                    const cleaned = stripChainRestaurants(rawList)
                        .filter((r: any) => !r.business_status || r.business_status === 'OPERATIONAL')
                        .map((r: any, j: number) => ({
                            ...r,
                            id: `near-hotel-${hotel.id}-${Date.now()}-${j}`,
                            region: hotel.city || cityEn,
                            categoryTitle: catTitle,
                        }));

                    if (cleaned.length > 0) {
                        const newCat: RestaurantCategory = {
                            id: catId,
                            title: catTitle,
                            region: hotel.city || cityEn,
                            restaurants: cleaned,
                        };
                        const existingIdx = accumulated.findIndex(c => c.id === catId);
                        if (existingIdx >= 0) accumulated[existingIdx] = newCat;
                        else accumulated = [newCat, ...accumulated];
                    }
                } catch (e: any) {
                    console.error(`Near-hotel research failed for ${hotel.name}:`, e);
                    const msg = e?.message || '';
                    if (/PerDay/i.test(msg) || /per_day/i.test(msg)) {
                        setRecError('מכסת ה-AI היומית מוצתה. נסה שוב מחר.');
                        break;
                    }
                }
            }

            setAiCategories(accumulated);
            persistAiRestaurants(accumulated);
            await stampPremiumIfUsed(preferTier, accumulated.length > aiCategories.length);
            geocodeAndPersistRestaurants(accumulated);
            toast.success('סיימנו לחפש מסעדות באזור המלון');
        } catch (e) {
            console.error('Critical error in researchNearHotel:', e);
            setRecError('שגיאה בחיפוש בקרבת המלון.');
        } finally {
            setIsResearchingAll(false);
            setResearchProgress({ current: 0, total: 0 });
        }
    };

    // --- AI Market Research Logic ---
    const initiateResearch = (city?: string) => {
        const cityEn = city ? displayCityName(city, 'en') : (trip.destinationEnglish || displayCityName(tripCities[0], 'en'));
        fetchRecommendations(true, cityEn);
    };

    const researchAllCities = async (baseCategories: RestaurantCategory[] = aiCategories) => {
        setIsResearchingAll(true);
        setRecError('');
        const cities = tripCities;
        setResearchProgress({ current: 0, total: cities.length });

        // Lock premium tier ONCE for the whole multi-city run so every
        // city in this click gets the same model. Stamping happens after
        // the loop, so cancellations / errors don't burn the monthly slot.
        const preferTier = resolvePreferTier();

        try {
            let accumulatedCategories: RestaurantCategory[] = [...baseCategories];

            for (let i = 0; i < cities.length; i++) {
                setResearchProgress({ current: i + 1, total: cities.length });
                const city = cities[i];
                // Translate Hebrew display name to English for the AI prompt
                const cityEn = displayCityName(city, 'en');

                try {
                    const prompt = createResearchPrompt(cityEn);
                    const response = await generateWithFallback(null, [{ role: 'user', parts: [{ text: prompt }] }], { responseMimeType: 'application/json', temperature: 0.1 }, 'SEARCH', preferTier);
                    const rawData = JSON.parse(response.text || '{}');
                    let categoriesList: any[] = [];
                    if (rawData.categories) {
                        categoriesList = Array.isArray(rawData.categories)
                            ? rawData.categories
                            : Object.values(rawData.categories);
                    } else if (Array.isArray(rawData)) {
                        categoriesList = rawData;
                    }
                    if (!Array.isArray(categoriesList)) categoriesList = [];

                    if (categoriesList.length > 0) {
                        const processed = categoriesList.map((c: any, index: number) => ({
                            ...c,
                            id: c.id || `ai-food-cat-${city}-${index}-${Date.now()}`,
                            region: city,
                            // Frontend safety-net (Round 10): even with the prompt's hard
                            // exclusion list, the model occasionally slips chains through.
                            restaurants: stripChainRestaurants(c.restaurants || [])
                                .filter((r: any) => r.business_status === 'OPERATIONAL')
                                .map((r: any, j: number) => ({
                                    ...r,
                                    region: r.region || city,
                                    id: `ai-rec-${city}-${index}-${Math.random().toString(36).substr(2, 5)}-${j}`,
                                    categoryTitle: c.title
                                }))
                        }));

                        // Merge logic: append new categories/restaurants
                        processed.forEach((newCat: any) => {
                            const existingIdx = accumulatedCategories.findIndex(ac => ac.title === newCat.title);
                            if (existingIdx !== -1) {
                                const existingRes = accumulatedCategories[existingIdx].restaurants;
                                newCat.restaurants.forEach((nr: any) => {
                                    if (!existingRes.some(er => er.name === nr.name)) {
                                        existingRes.push(nr);
                                    }
                                });
                            } else {
                                accumulatedCategories.push(newCat);
                            }
                        });
                    }
                } catch (cityErr: any) {
                    const msg = cityErr?.message || '';
                    console.error(`Error researching ${city}:`, cityErr);
                    // Day quota exhausted — waiting won't help, abort the entire loop.
                    if (/PerDay/i.test(msg) || /per_day/i.test(msg)) {
                        setRecError('מכסת ה-AI היומית מוצתה. נסה שוב מחר.');
                        break;
                    }
                    // Per-minute rate limit only — wait for quota reset before next city.
                    const retryMatch = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
                    if (retryMatch && i < cities.length - 1) {
                        const waitMs = Math.ceil(parseFloat(retryMatch[1])) * 1000 + 5000;
                        await new Promise(r => setTimeout(r, waitMs));
                    }
                }
            }

            // Show results immediately so the user isn't waiting on the
            // closed-place verifier — it then quietly removes any flagged
            // places once the second-pass AI returns.
            setAiCategories(accumulatedCategories);
            persistAiRestaurants(accumulatedCategories);
            setSelectedCity('all');

            // Burn the monthly premium slot only if the run actually produced results.
            await stampPremiumIfUsed(preferTier, accumulatedCategories.length > 0);

            // Closed-place safety net: ask a fast model "is each of these
            // permanently/temporarily closed?" and drop anything flagged.
            // Cached per (name, city) so re-runs are free.
            (async () => {
                const baseCountry = (trip.destinationEnglish || trip.destination)?.split(/[-,]/)[0]?.trim() || '';
                const places = accumulatedCategories.flatMap(cat =>
                    (cat.restaurants || []).map(r => ({
                        id: r.id,
                        name: r.name,
                        city: (r.region || cat.region || '').toString(),
                        country: baseCountry,
                    }))
                );
                if (places.length === 0) return;
                const closed = await findClosedPlaces(places);
                if (closed.size === 0) return;
                const cleaned = accumulatedCategories.map(cat => ({
                    ...cat,
                    restaurants: (cat.restaurants || []).filter(r => !closed.has(r.id)),
                }));
                setAiCategories(cleaned);
                persistAiRestaurants(cleaned);
                console.info(`[Restaurants] Closed-place check dropped ${closed.size} listings`);
            })();

            // Upstream geocoding — fill in lat/lng for every newly-fetched
            // restaurant in the background so the map view doesn't have to
            // batch-geocode 200+ places lazily on first open. Coords are
            // persisted back to the trip as they land.
            geocodeAndPersistRestaurants(accumulatedCategories);
        } catch (e) {
            console.error("Critical Error in Research All:", e);
            setRecError('שגיאה במהלך מחקר מקיף.');
        } finally {
            setIsResearchingAll(false);
            setResearchProgress({ current: 0, total: 0 });
        }
    };

    const refreshSingleCategory = async (cat: RestaurantCategory) => {
        if (!userId || viewerMode) return;
        const currentMonth = new Date().toISOString().slice(0, 7); // "2026-05"
        const key = `${trip.id}:${cat.id}`;
        const entry = categoryRefreshes[key];
        const PAID_LIMIT = 1;
        const FREE_LIMIT = 3;
        const entryInCurrentMonth = entry && entry.month === currentMonth;
        const paidUsed = entryInCurrentMonth ? entry.paid : 0;
        const freeUsed = entryInCurrentMonth ? entry.free : 0;

        const canUsePaid = ownerOnly && paidUsed < PAID_LIMIT;
        const canUseFree = freeUsed < FREE_LIMIT;
        if (!canUsePaid && !canUseFree) {
            setShowRefreshLimitModal(true);
            return;
        }

        const tier: 'paid' | 'free' = canUsePaid ? 'paid' : 'free';
        setRefreshingCategoryId(cat.id);
        try {
            const cityEn = cat.region
                ? displayCityName(cat.region as string, 'en')
                : (trip.destinationEnglish || displayCityName(tripCities[0], 'en'));
            const catTitle = cat.title;
            const currentDate = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
            const prompt = `You are a food expert. As of ${currentDate}, find the BEST restaurants in "${cityEn}" for the category: "${catTitle}".
Return 6-8 currently operating restaurants. Apply the same strict operational check as always — omit any closed place.
Respond in the same JSON format:
{ "restaurants": [ { "name", "nameEnglish", "description", "location", "cuisine", "googleRating", "recommendationSource", "isHotelRestaurant", "googleMapsUrl", "business_status", "verification_needed" } ] }
Every restaurant MUST have business_status = "OPERATIONAL". "location" MUST be in English.`;

            const response = await generateWithFallback(null, [{ role: 'user', parts: [{ text: prompt }] }], { responseMimeType: 'application/json', temperature: 0.1 }, 'SEARCH', tier);
            const rawData = JSON.parse(response.text || '{}');
            const freshRestaurants = (rawData.restaurants || [])
                .filter((r: any) => r.business_status === 'OPERATIONAL')
                .map((r: any, j: number) => ({
                    ...r,
                    region: r.region || cat.region,
                    id: `ai-rec-${cat.id}-refresh-${Date.now()}-${j}`,
                    categoryTitle: catTitle,
                }));

            if (freshRestaurants.length > 0) {
                const updated = aiCategories.map(c =>
                    c.id === cat.id ? { ...c, restaurants: freshRestaurants } : c
                );
                setAiCategories(updated);
                persistAiRestaurants(updated);
                await incrementCategoryRefresh(userId, key, tier);
                setCategoryRefreshes(prev => {
                    const prevEntry = prev[key];
                    const inMonth = prevEntry && prevEntry.month === currentMonth;
                    return {
                        ...prev,
                        [key]: {
                            paid: (inMonth ? prevEntry.paid : 0) + (tier === 'paid' ? 1 : 0),
                            free: (inMonth ? prevEntry.free : 0) + (tier === 'free' ? 1 : 0),
                            month: currentMonth,
                        },
                    };
                });
                toast.success(`${catTitle} עודכן בהצלחה`);
                geocodeAndPersistRestaurants(updated);
            } else {
                toast.warning(`לא נמצאו תוצאות חדשות עבור ${catTitle}`);
            }
        } catch (e) {
            console.error('refreshSingleCategory error:', e);
            toast.error('שגיאה בעדכון הקטגוריה');
        } finally {
            setRefreshingCategoryId(null);
        }
    };

    // Geocode any restaurants in `cats` that lack lat/lng and write the
    // resolved coords back to trip.aiRestaurants. Runs as a fire-and-forget
    // background task — UI updates incrementally as Photon resolves each.
    //
    // CRITICAL: uses tripRef instead of the captured `trip` prop so that
    // when the background flush fires after the user has edited trip.name
    // / destination / etc, we don't overwrite their changes with the stale
    // trip we captured when research started. The flush merges into the
    // LATEST trip and only touches aiRestaurants.
    const geocodeAndPersistRestaurants = (cats: RestaurantCategory[]) => {
        type Item = { id: string; name: string; location?: string; googleMapsUrl?: string; lat?: number; lng?: number; countryHint?: string; cityHint?: string };
        const flat: Item[] = [];
        // City-qualified countryHint: "Bangkok, Thailand" not just "Thailand" —
        // prevents the geocoder from resolving ambiguous addresses (e.g. a street
        // name that exists in multiple cities) to the wrong city.
        const baseCountryHint = (trip.destinationEnglish || trip.destination)?.split(/[-,]/)[0]?.trim() || '';
        cats.forEach(c => {
            const categoryRegion = c.region || '';
            c.restaurants.forEach(r => {
                const cityEn = displayCityName(r.region || categoryRegion, 'en') || r.region || categoryRegion;
                flat.push({
                    id: r.id, name: r.name, location: r.location,
                    googleMapsUrl: r.googleMapsUrl, lat: r.lat, lng: r.lng,
                    // City hint biases Photon to the per-city bbox so a chain
                    // restaurant tagged "Pattaya" doesn't resolve to its Bangkok branch.
                    cityHint: cityEn || undefined,
                    countryHint: [cityEn, baseCountryHint].filter(Boolean).join(', '),
                });
            });
        });
        const pendingItems = flat.filter(i => typeof i.lat !== 'number' || typeof i.lng !== 'number');
        if (pendingItems.length === 0) return;

        setGeocodingInFlight(prev => prev + pendingItems.length);

        const resolved: Record<string, { lat: number; lng: number }> = {};
        const failed = new Set<string>();
        let pendingFlush = 0;
        const flush = () => {
            if (pendingFlush === 0) return;
            const next: RestaurantCategory[] = cats.map(c => ({
                ...c,
                restaurants: c.restaurants.map(r => {
                    if (resolved[r.id]) {
                        return { ...r, lat: resolved[r.id].lat, lng: resolved[r.id].lng, geocodeFailed: false };
                    }
                    if (failed.has(r.id)) {
                        return { ...r, geocodeFailed: true };
                    }
                    return r;
                }),
            }));
            setAiCategories(next);
            persistAiRestaurants(next);
            pendingFlush = 0;
        };

        geocodePlacesBatch(
            pendingItems,
            (id, coords) => {
                resolved[id] = coords;
                pendingFlush += 1;
                setGeocodingInFlight(prev => Math.max(0, prev - 1));
                if (pendingFlush >= 8) flush();
            },
            {
                concurrency: 4,
                onFail: (id) => {
                    failed.add(id);
                    pendingFlush += 1;
                    setGeocodingInFlight(prev => Math.max(0, prev - 1));
                    if (pendingFlush >= 8) flush();
                },
            },
        ).finally(flush);
    };

    const createResearchPrompt = (specificCity: string) => {
    const currentDate = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    return `
    You are a food expert helping someone find the BEST restaurants in
    "${specificCity}" as of ${currentDate}. Focus on top-rated places,
    award winners, and spots with recent widespread press. Include iconic
    street food and hole-in-the-wall legends locals actually eat at.

    **TODAY'S DATE: ${currentDate}** — use this to assess "currently open",
    "recent reviews", and "last 12 months". Search Google Maps for each
    restaurant's current operational status before including it.

    **PART 0: OPERATIONAL VERIFICATION — HARD RULE (READ FIRST)**
    Every place you return MUST currently be operating. The "business_status"
    field is REQUIRED on every restaurant — set it to exactly "OPERATIONAL".
    If any of the following are true, OMIT the restaurant entirely (do not
    return it with a non-operational status — just leave it out):
    - The place is marked "permanently closed" or "temporarily closed" on
      Google Maps. (Real example we caught: "Rimpa Lapin" in Pratumnak
      Hill, Pattaya — DO NOT include this. Many places like it exist —
      check before recommending.)
    - You are not >90% confident the place is still open as of the
      current month. The bar is high: when in doubt, leave it out.
    - The chef who made it famous has left, the venue has changed
      ownership, or the location moved without keeping quality.
    - Reviews show closure reports in the last 6 months even without
      Google Maps confirming.

    Critical: omitting > including. An empty category is fine; a
    closed listing is a failure of the system. Cross-check at minimum:
    Google Maps status, recent reviews (last 90 days), official social
    media. If any of these signal closure, omit.

    **PART 1: QUOTA & SCOPE**
    - For EACH of the 10 categories below, return 6-8 real restaurants
      (aim for 8 in a major food city). Return an empty array ONLY if
      the category truly has no real results in this city. Better empty
      than fake. Full response for a major city = 60-80 restaurants.
    - Every "location" MUST clearly be in or near "${specificCity}".

    **PART 2: CATEGORIES**
    Use EXACTLY these Hebrew titles as "title" (UI keys). Let the actual
    cuisine + vibe decide the best-fitting category — don't force matches.
    A restaurant may appear in two categories if equally relevant.

    1. "אוכל מקומי אותנטי"
    2. "יוקרה ומישלן"
    3. "ברי קוקטיילים"
    4. "מסעדות משפחתיות"
    5. "ראמן"
    6. "פיצה"
    7. "המבורגר"
    8. "בתי קפה וקינוחים"
    9. "תאילנדי"
    10. "יפני"

    **NOTE FOR SMALL CITIES, ISLANDS & RESORT TOWNS:**
    If "${specificCity}" is a beach resort, island, small town, or rural area:
    - Collapse categories with no real local options (e.g. no ramen on a Thai island)
      into "אוכל מקומי אותנטי" or the best-fitting existing category.
    - Hotel restaurants, beach bars, resort dining, food stalls, and waterfront
      seafood spots all count as real local options — include them.
    - Aim for at least 8-12 total restaurants across all filled categories.
    - Better to fill 4-5 categories well than to leave 8 categories empty.

    **PART 3: RECENCY CHECK — CRITICAL**
    Do NOT recommend places whose quality has dropped:
    - Skip restaurants that USED to be great but have slid in recent
      reviews (last 12 months). If a Michelin star was LOST, don't
      recommend on the old star.
    - Skip places permanently closed, changed hands with bad reviews
      since, or that had a chef departure that hurt quality.
    - When in doubt about current quality, leave it out.

    **PART 4: LOCAL AUTHORITY SOURCES (prefer over Google / TripAdvisor)**
    Locals rate on platforms in their own language, not only Google.
    Cross-reference these where relevant before recommending:
    - **Wongnai (วงใน)** — Thailand's #1 local food-review app.
      For Thai cities, a high Wongnai rating means locals love it.
    - **Tabelog (食べログ)** — Japan's authority (3.5+ is strong,
      3.8+ is elite).
    - **Dianping (大众点评)** — China / Hong Kong locals.
    - **OpenRice** — Hong Kong, Singapore, Malaysia, Thailand.
    - **Naver Map** — Korea (locals use this more than Google).
    - **Zomato** — India, parts of SEA.
    For Western cities: Michelin Guide, Eater, TimeOut, Asia's 50 Best,
    World's 50 Best, NYT food section, local food critics.
    AVOID TripAdvisor as primary — too tourist-trap oriented.
    Use "Local Favorite" / "Top-Rated" as a fallback when no specific
    citation applies.

    **PART 5: HARD EXCLUSIONS — CHAIN RESTAURANTS (CRITICAL)**
    You MUST NOT include any of the following, even if locals sometimes
    eat there. The user has explicitly rejected chain food:
    - Global fast-food chains: McDonald's, Burger King, KFC, Subway,
      Wendy's, Taco Bell, Hardee's, Carl's Jr, Five Guys, Wingstop,
      Chick-fil-A, Popeyes, Jollibee, Dairy Queen, Arby's
    - Global pizza chains: Pizza Hut, Domino's, Papa John's, Little
      Caesars, Pizza Inn, Round Table Pizza
    - Regional fast-food pizza chains positioned LIKE Domino's: **Pizza
      Company** (Thailand), Pizza Marzano (mass-market casual), any chain
      with 50+ outlets aimed at quick delivery
    - Global coffee chains: Starbucks, Costa Coffee, Café Nero, Tim Hortons
    - Global bakery/dessert chains: Krispy Kreme, Dunkin', Cold Stone
    - Places currently closed or with quality decline in last year
    If only a chain came to mind for a category, return FEWER results
    (or empty array). Quality over quantity — never pad with chains.

    **PART 6: QUALITY FLOOR (CRITICAL)**
    For every category you return, include AT LEAST 3 places — each one
    must be a strong recommendation. If you genuinely can't find 3
    quality independent options for a category in this city, return an
    empty array for that category. Empty is better than padded.

    For "googleMapsUrl": include the actual URL from your Google Search
    results, NOT a guessed one. Omit the field entirely if you cannot
    find a real URL — fabricated URLs break the map view.

    CRITICAL — "location" field MUST be in English (used by a geocoding API). Format: "Street or Neighbourhood, City". Example: "Silom Road, Bangkok".

    CRITICAL — "nameEnglish" is REQUIRED for every restaurant. Rules:
    - It MUST be the restaurant's actual official Latin-script name as it appears on its sign, website, or Google Maps (e.g. "Paste", "Gaggan Anand", "Jay Fai", "Sorn").
    - DO NOT write a Hebrew transliteration in Latin letters. Find the real English name.
    - DO NOT translate it. Use the proper name.
    - "name" stays in Hebrew for the UI; "nameEnglish" is what the map and English surfaces render.

    CRITICAL — "recommendationSource" MUST be a SHORT platform/publication name only (max 40 chars).
    Use one of: "Wongnai", "Michelin Guide", "TripAdvisor", "TimeOut", "Eater",
    "YouTube (channel name)", "Tabelog", "OpenRice", "Asia's 50 Best", "Google",
    "Local Favorite", "Top-Rated".
    NEVER write descriptions ("Known for...", "Offers...", "Praised for...") in this field.
    NEVER include the restaurant's own name in this field.
    If no authoritative source applies, use "Local Favorite".

    OUTPUT JSON ONLY:
    { "categories": [ { "id", "title", "restaurants": [ { "name", "nameEnglish", "description", "location", "cuisine", "googleRating", "recommendationSource", "isHotelRestaurant", "googleMapsUrl", "business_status", "verification_needed" } ] } ] }
    "business_status" is REQUIRED — must be "OPERATIONAL" for any place you return.
    Set "verification_needed" to true ONLY if you're sharing the place
    but want the user to double-check hours/status before going.
    `; };

    const fetchRecommendations = async (forceRefresh = false, specificCity: string) => {
        setLoadingRecs(true);
        setRecError('');
        try {
            const currentYear = new Date().getFullYear();
            const prevYear = currentYear - 1;
            const targetCity = specificCity || trip.destinationEnglish || displayCityName(tripCities[0], 'en') || trip.destination;

            // Single-city research — lean prompt, aligned with the multi-city
            // createResearchPrompt. Focus: top-rated + award winners + recency
            // check + local-authority sources.
            const currentDate = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
            const prompt = `
            You are a food expert helping someone find the BEST restaurants in
            "${targetCity}" as of ${currentDate}. Find top-rated places, award winners,
            spots with strong recent press, and iconic hole-in-the-wall local legends.

            **TODAY'S DATE: ${currentDate}** — use this to judge "currently open",
            "recent reviews", and "last 12 months". Search Google Maps for each
            restaurant's current operational status before including it. Do NOT rely
            on training data alone — verify each place is still open right now.

            **PART 0: OPERATIONAL VERIFICATION — HARD RULE (READ FIRST)**
            Every place you return MUST currently be operating as of ${currentDate}.
            If any of the following are true, OMIT the restaurant entirely:
            - Google Maps shows "Permanently closed" or "Temporarily closed"
            - You are not >90% confident the place is still open right now
            - The chef who made it famous left and quality dropped
            - Reviews in the last 6 months report closure
            Critical: an empty category is fine; a closed listing is a failure.

            **PART 1: QUOTA & SCOPE**
            - For EACH of the 10 categories below, return 6-8 real restaurants
              (aim for 8 in a major food city). Empty array ONLY if the category
              truly has nothing. Total response for a major city = 60-80.
            - Every "location" MUST be in or near "${targetCity}".
            - If the city is small/village, expand radius to 30km.

            **PART 2: CATEGORIES (use EXACTLY these Hebrew titles as "title"):**
            1. "אוכל מקומי אותנטי"
            2. "יוקרה ומישלן"
            3. "ברי קוקטיילים"
            4. "מסעדות משפחתיות"
            5. "ראמן"
            6. "פיצה"
            7. "המבורגר"
            8. "בתי קפה וקינוחים"
            9. "תאילנדי"
            10. "יפני"

            Let the actual cuisine + vibe decide the best-fitting category.
            A restaurant may appear in two categories if equally relevant.
            Descriptions MUST be in HEBREW. "location" field MUST be in English (used for geocoding) — format: "Street, City".

            **PART 3: RECENCY CHECK (CRITICAL)**
            Do NOT recommend places whose quality dropped in the last 12 months:
            - Skip former-glory places that have slid on recent reviews.
            - If a Michelin star was LOST, don't recommend on the old star.
            - Skip permanently closed, bad chef departure, new bad management.
            - When in doubt about current quality, leave it out.

            **PART 4: LOCAL AUTHORITY SOURCES**
            Locals rate on platforms in their own language. Use these as
            signals in addition to / instead of Google:
            - **Wongnai (วงใน)** — Thailand's #1 local app. Essential for Thai cities.
            - **Tabelog (食べログ)** — Japan's authority. 3.5+ is strong, 3.8+ elite.
            - **Dianping (大众点评)** — China / Hong Kong locals.
            - **OpenRice** — Hong Kong, Singapore, Malaysia, Thailand.
            - **Naver Map** — Korea (locals use this more than Google).
            - **Zomato** — India, parts of SEA.
            Plus global: Michelin Guide, Asia's 50 Best, World's 50 Best,
            Eater, TimeOut, Condé Nast Traveler, NYT food, local press.
            AVOID TripAdvisor as primary source.
            Fallback: "Local Favorite" / "Top-Rated" when no specific source.

            **PART 5: HARD EXCLUSIONS — CHAIN RESTAURANTS (CRITICAL)**
            You MUST NOT include any of the following, even if locals
            sometimes eat there. The user has explicitly rejected chain food:
            - Global fast-food chains: McDonald's, Burger King, KFC, Subway,
              Wendy's, Taco Bell, Hardee's, Carl's Jr, Five Guys, Wingstop,
              Chick-fil-A, Popeyes, Jollibee, Dairy Queen, Arby's
            - Global pizza chains: Pizza Hut, Domino's, Papa John's, Little
              Caesars, Pizza Inn, Round Table Pizza
            - Regional fast-food pizza chains positioned LIKE Domino's:
              **Pizza Company** (Thailand), Pizza Marzano, any chain with
              50+ outlets aimed at quick delivery
            - Global coffee chains: Starbucks, Costa Coffee, Café Nero, Tim Hortons
            - Global bakery/dessert chains: Krispy Kreme, Dunkin', Cold Stone
            - Hotels without a specific named restaurant. Don't recommend
              "The Hilton" — but DO recommend "Gaggan Anand at SO/ Bangkok".
              If a restaurant is inside a hotel set isHotelRestaurant = true
              and use "Name (at Hotel Name)" format.
            If only a chain came to mind for a category, return FEWER
            results. Quality over quantity — never pad with chains.

            **PART 6: QUALITY FLOOR (CRITICAL)**
            Each category you return must contain AT LEAST 3 strong picks.
            If you can't find 3 quality independent options, return an
            empty array for that category. Empty is better than bad.

            **PART 7: FORMATTING**
            - Return pure JSON. Title MUST be the Hebrew string exactly.
            - Map 'cuisine' to one of: Local, Fine, Bar, Family, Ramen, Pizza,
              Burger, Cafe, Thai, Japanese.
            `;

            // Replaced Schema with Prompt Instruction for standard SDK
            const promptWithJsonInstruction = prompt + `
            
            OUTPUT JSON ONLY (Strict Format):
            {
              "categories": [
                {
                  "id": "string",
                  "title": "string",
                  "restaurants": [
                    { "name", "nameEnglish", "description", "location", "cuisine", "googleRating", "recommendationSource", "isHotelRestaurant", "googleMapsUrl" }
                  ]
                }
              ]
            }`;

            const preferTier = resolvePreferTier();
            const response = await generateWithFallback(null, [{ role: 'user', parts: [{ text: promptWithJsonInstruction }] }], { responseMimeType: 'application/json', temperature: 0.1 }, 'SEARCH', preferTier);

            const textContent = response.text;
            console.log("🔍 [AI Raw Response Preview]:", textContent?.substring(0, 500) + "...");

            try {
                const rawData = JSON.parse(textContent || '{}');

                // ROBUST PARSER: Handle { categories: [...], categories: {...} } and direct [...] formats
                let categoriesList: any[] = [];
                if (rawData.categories) {
                    if (Array.isArray(rawData.categories)) {
                        categoriesList = rawData.categories;
                    } else if (typeof rawData.categories === 'object') {
                        // Handle case where AI returns an object instead of array (e.g. numbered keys)
                        categoriesList = Object.values(rawData.categories);
                    }
                } else if (Array.isArray(rawData)) {
                    categoriesList = rawData;
                }

                // Extra safety: ensure it's an array
                if (!Array.isArray(categoriesList)) categoriesList = [];

                if (categoriesList.length > 0) {
                    console.log(`✅ [AI Success] Parsed ${categoriesList.length} categories (Format: ${Array.isArray(rawData) ? 'Direct Array' : 'Wrapped Object'})`);
                    const processed = categoriesList.map((c: any, idx: number) => ({
                        ...c,
                        id: c.id || `ai-food-cat-${idx}-${Date.now()}`,
                        region: targetCity,
                        // Same chain safety-net as the multi-city research path.
                        restaurants: stripChainRestaurants(c.restaurants || []).map((r: any, i: number) => ({
                            ...r,
                            region: r.region || targetCity,
                            id: `ai-rec-${c.id || idx}-${Math.random().toString(36).substr(2, 5)}-${i}`,
                            categoryTitle: c.title
                        }))
                    }));

                    // MERGE with existing categories instead of replacing —
                    // otherwise researching City B wipes the results we already
                    // have for City A and the user has to re-run everything.
                    const merged: RestaurantCategory[] = [...aiCategories];
                    processed.forEach((newCat: any) => {
                        const existingIdx = merged.findIndex(c => c.title === newCat.title);
                        if (existingIdx !== -1) {
                            const existing = merged[existingIdx].restaurants;
                            newCat.restaurants.forEach((nr: any) => {
                                if (!existing.some(er => er.name === nr.name)) {
                                    existing.push(nr);
                                }
                            });
                        } else {
                            merged.push(newCat);
                        }
                    });

                    setAiCategories(merged);
                    setSelectedCategory('all');
                    persistAiRestaurants(merged);
                    await stampPremiumIfUsed(preferTier, processed.length > 0);
                } else {
                    console.warn("⚠️ [AI Warning] Response was valid JSON but contained no results.", rawData);
                    setRecError('לא נמצאו המלצות מסעדות עבור יעד זה. המודל לא הצליח לאתר תוצאות איכותיות.');
                }
            } catch (parseError: any) {
                console.error('❌ [AI Error] JSON Parse failed in fetchRecommendations.', parseError);
                console.error('Raw content that failed:', textContent);
                setRecError('שגיאה בעיבוד התשובה. המודל החזיר תשובה שאינה תקינה.');
            }
        } catch (e: any) {
            console.error("❌ [AI Critical Error]:", e);
            setRecError(`שגיאה בטעינה: ${e.message || 'נסה שוב'}`);
        } finally {
            setLoadingRecs(false);
        }
    };

    const allAiRestaurants = useMemo(() => {
        let all: ExtendedRestaurant[] = [];
        aiCategories.forEach(cat => cat.restaurants.forEach(r => all.push({
            ...r,
            region: r.region || cat.region,
            categoryTitle: cat.title
        })));
        // Sort by Rating Descending
        return all.sort((a, b) => (b.googleRating || 0) - (a.googleRating || 0));
    }, [aiCategories]);

    // Client-side translation for legacy/cached English titles
    const HEBREW_TITLES: Record<string, string> = {
        "Authentic Local Food": "אוכל מקומי אותנטי",
        "Luxury & Michelin": "יוקרה ומישלן",
        "Cocktail Bars": "ברי קוקטיילים",
        "Family Friendly": "מסעדות משפחתיות",
        "Ramen": "ראמן",
        "Pizza": "פיצה",
        "Burger": "המבורגר",
        "Cafe & Dessert": "בתי קפה וקינוחים",
        "Thai": "תאילנדי",
        "Japanese - NO RAMEN": "יפני",
        "Japanese": "יפני",
        // Attractions
        "Icons & Landmarks": "אתרי חובה",
        "Nature & Views": "טבע ונופים",
        "Heritage & Art": "מוזיאונים ותרבות",
        "Retail Therapy": "קניות ושווקים",
        "Adrenaline": "אקסטרים ופעילויות",
        "Sun & Sea": "חופים ומים",
        "Kids' Joy": "למשפחות וילדים",
        "Spiritual": "היסטוריה ודת",
        "Night Vibes": "חיי לילה ואווירה",
        "Hidden Gems": "פינות נסתרות"
    };

    const displayTitle = (title: string) => HEBREW_TITLES[title] || title;

    // Extract Raters for Filtering — every source that actually appears in
    // the data shows up as a filter. Authoritative sources (Michelin, 50
    // Best, etc.) are consolidated under a canonical name so multiple
    // wordings collapse; everything else (Wongnai, BK Magazine, regional
    // blogs the AI surfaces) is preserved verbatim so the filter mirrors
    // what the user sees on the cards.
    // Normalise a raw recommendationSource string into one of ~8 canonical groups.
    const normalizeSource = (raw: string): string => {
        if (!raw) return '';
        const low = raw.toLowerCase();
        // Descriptions masquerading as sources — the AI sometimes puts full sentences here
        if (/^(known for|praised for|offers|serves|recommended for|highly|experience|locals|family-friendly|ranked|ideal for|considered|regarded)/i.test(raw.trim())) return 'Other';
        if (raw.length > 80) return 'Other';
        if (low.includes('youtube')) return 'YouTube';
        if (low.includes('wongnai')) return 'Wongnai';
        if (low.includes('michelin') || low.includes('bib gourmand')) return 'Michelin Guide';
        if (low.includes('50 best')) return "Asia's 50 Best";
        if (low.includes('timeout') || low.includes('time out')) return 'TimeOut';
        if (low.includes('eater')) return 'Eater';
        if (low.includes('tripadvisor') || low.includes('trip advisor')) return 'TripAdvisor';
        if (low.includes('gault')) return 'Gault & Millau';
        if (low.includes('tabelog')) return 'Tabelog';
        if (low.includes('openrice')) return 'OpenRice';
        if (low.includes('google')) return 'Google';
        if (low.includes('trip.com') || low.includes('hotels.com') || low.includes('agoda') || low.includes('tripfactory') || low.includes('bestprice')) return 'Travel Sites';
        if (low.includes('official site') || low.includes('official website')) return 'Official Site';
        // Known local media / blogs
        if (low.includes('wanderlog') || low.includes('tatinta') || low.includes('traveling tum') ||
            low.includes('ideal magazine') || low.includes('luxury society') || low.includes('feastography') ||
            low.includes('pattaya') || low.includes('thailand magazine') || low.includes('asean now')) return 'Local Media';
        // Anything that includes a restaurant/hotel name as source = unreliable provenance
        if (/\b(restaurant|hotel|bar|tavern|lounge|cafe|kitchen|grill|bistro)\b/i.test(raw)) return 'Other';
        return 'Other';
    };

    const availableRaters = useMemo(() => {
        const sources = new Set<string>();
        allAiRestaurants.forEach(r => {
            const group = normalizeSource((r.recommendationSource || '').trim());
            if (group) sources.add(group);
        });
        // Deterministic order: quality sources first
        const ORDER = ['Michelin Guide', "Asia's 50 Best", 'Wongnai', 'YouTube', 'TimeOut', 'Eater',
                        'TripAdvisor', 'Tabelog', 'OpenRice', 'Google', 'Official Site',
                        'Local Media', 'Travel Sites', 'Gault & Millau', 'Other'];
        return ORDER.filter(s => sources.has(s));
    }, [allAiRestaurants]);

    // Unified Toggle Logic (Fixes Task 4)
    const handleToggleRec = (restaurant: Restaurant, catTitle: string) => {
        let newRestaurants = [...trip.restaurants];

        // Find if restaurant is already in any category
        let existingCatIndex = -1;
        let existingResIndex = -1;

        for (let i = 0; i < newRestaurants.length; i++) {
            const foundIndex = newRestaurants[i].restaurants.findIndex(r => r.name === restaurant.name);
            if (foundIndex !== -1) {
                existingCatIndex = i;
                existingResIndex = foundIndex;
                break;
            }
        }

        if (existingCatIndex !== -1) {
            // REMOVE Logic
            newRestaurants[existingCatIndex].restaurants.splice(existingResIndex, 1);
            // Clean up empty category
            if (newRestaurants[existingCatIndex].restaurants.length === 0) {
                newRestaurants.splice(existingCatIndex, 1);
            }
        } else {
            // ADD Logic
            // resolvePlaceCity matches the location/region against actual trip
            // cities (Hebrew/English aware) and only falls back to selectedCity
            // /destination when no real match is found. Avoids saving
            // neighborhood names like "Sukhumvit" as the region.
            const intendedRegion = resolvePlaceCity(
                { name: restaurant.name, location: restaurant.location, region: restaurant.region },
                trip,
                selectedCity,
            );

            // Find category matching the Category Title (e.g. "Italian" or "Search Results")
            let targetCatIndex = newRestaurants.findIndex(c => c.title === catTitle);

            if (targetCatIndex === -1) {
                // If category doesn't exist, create it.
                newRestaurants.push({ id: `cat-${Date.now()}`, title: catTitle, region: intendedRegion, restaurants: [] });
                targetCatIndex = newRestaurants.length - 1;
            }

            newRestaurants[targetCatIndex].restaurants.push({
                ...restaurant,
                id: `added-${Date.now()}`,
                region: intendedRegion // Correctly saves the City/Region name
            });
        }

        onUpdateTrip({ ...trip, restaurants: newRestaurants });

        // Immediate visual feedback for search/recs
        setAddedIds(prev => {
            const next = new Set(prev);
            if (existingCatIndex !== -1) next.delete(restaurant.id);
            else next.add(restaurant.id);
            return next;
        });
    };

    // In-trip-scope check — delegates to the shared isPlaceInTripScope so
    // AttractionsView, UnifiedMapView, and tripGaps share one definition.
    const inTripScope = useMemo(() => {
        return (r: any) => isPlaceInTripScope(trip, { location: r.location, region: r.region });
    }, [trip]);

    // Dedupe helper: same place appearing in multiple categories (e.g. Sorn
    // in 'Authentic Local Food' + 'Luxury & Michelin' + 'תאילנדי') should show
    // once. Keeps the highest-rated / most-complete entry.
    const dedupeByName = (list: any[]): any[] => {
        const pick: Map<string, any> = new Map();
        const getRestaurantCityKey = (r: any): string => {
            for (const city of tripCities) {
                if (restaurantMatchesCity(r, city)) return displayCityName(city, 'en').toLowerCase();
            }
            const raw = r.region || (r.location || '').split(',').pop()?.trim() || '';
            return displayCityName(raw, 'en').toLowerCase();
        };
        for (const r of list) {
            const key = (r.nameEnglish || r.name || '').trim().toLowerCase();
            if (!key) continue;
            const scopedKey = `${key}|${getRestaurantCityKey(r)}`;
            const existing = pick.get(scopedKey);
            if (!existing) { pick.set(scopedKey, r); continue; }
            // Keep the entry with the higher rating or more complete source
            const existingScore = (existing.googleRating || 0) + (existing.recommendationSource ? 0.1 : 0);
            const newScore = (r.googleRating || 0) + (r.recommendationSource ? 0.1 : 0);
            if (newScore > existingScore) pick.set(scopedKey, r);
        }
        return Array.from(pick.values());
    };

    // Filtered Recommended (with City Filter)
    const filteredRestaurants = useMemo(() => {
        let list = [];
        if (selectedCategory === 'all') {
            list = allAiRestaurants;
        } else {
            const cat = aiCategories.find(c => c.id === selectedCategory);
            list = cat
                ? cat.restaurants
                    .map(r => ({ ...r, region: r.region || cat.region }))
                    .sort((a, b) => (b.googleRating || 0) - (a.googleRating || 0))
                : [];
        }

        const afterBase = list.length;

        // Trim to trip scope — catches stale data from old research runs
        if (tripCities.length > 0) list = list.filter(inTripScope);
        const afterScope = list.length;

        // City Filter — language-agnostic via locationMatchesCity
        if (selectedCity !== 'all') {
            list = list.filter(r => restaurantMatchesCity(r, selectedCity));
        }
        const afterCity = list.length;

        console.debug(`🍽️ [Restaurants] base=${afterBase} → scope=${afterScope} → city=${afterCity} (tripCities=${JSON.stringify(tripCities)}, selectedCity=${selectedCity})`);

        if (selectedRater !== 'all') {
            list = list.filter(r => normalizeSource(r.recommendationSource || '') === selectedRater);
        }

        list = list.filter(passesItemFilters);

        // Global dedupe by place name — collapses 4×Sorn into 1
        return dedupeByName(list);
    }, [aiCategories, selectedCategory, selectedRater, selectedCity, allAiRestaurants, tripCities, inTripScope, passesItemFilters]);

    // Stale data: there are cached results but ALL of them are out of trip scope
    const hasStaleData = useMemo(() => {
        if (allAiRestaurants.length === 0) return false;
        if (tripCities.length === 0) return false;
        return !allAiRestaurants.some(inTripScope);
    }, [allAiRestaurants, tripCities, inTripScope]);

    // Grouping Logic for "My List"
    const groupedMyList = useMemo(() => {
        const flatList: Restaurant[] = [];
        trip.restaurants.forEach(cat => cat.restaurants.forEach(r => flatList.push(r)));

        // Apply Filters
        let filtered = flatList;
        if (selectedCity !== 'all') {
            filtered = filtered.filter(r => restaurantMatchesCity(r, selectedCity));
        }
        filtered = filtered.filter(passesItemFilters);

        // Group by Category (User Request: "Food Categories", not streets)
        const groups: Record<string, Restaurant[]> = {};
        filtered.forEach(r => {
            // Use categoryTitle if available (from AI), or fallback to Type/Icon
            const key = r.categoryTitle || r.iconType || 'General';
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });

        // Sort each group by Favorite
        Object.keys(groups).forEach(key => {
            groups[key] = sortMyRestaurants(groups[key]);
        });

        return groups;
    }, [trip.restaurants, selectedCity, passesItemFilters]);


    const getMapItems = () => {
        const items: any[] = [];
        // Map shows BOTH saved restaurants (solid orange pin) AND AI
        // suggestions (lighter dashed orange pin) regardless of the active
        // tab. The user wants to see how the suggestions relate to the
        // places they've already saved without flipping tabs.
        const cityEnFor = (region?: string) =>
            selectedCity !== 'all'
                ? (displayCityName(selectedCity, 'en') || selectedCity)
                : (region ? displayCityName(region, 'en') : undefined);

        // Saved layer
        const savedNameKeys = new Set<string>();
        const savedFlat = trip.restaurants.flatMap(cat =>
            cat.restaurants.map(r => ({ ...r, categoryTitle: r.categoryTitle || cat.title }))
        );
        const includeSaved = mapSource !== 'ai';
        const includeAi = mapSource !== 'saved';
        savedFlat.forEach(r => {
            if (!includeSaved) return;
            if (selectedCity !== 'all' && !restaurantMatchesCity(r, selectedCity)) return;
            if (!passesItemFilters(r)) return;
            savedNameKeys.add(r.name.toLowerCase());
            items.push({
                id: r.id, type: 'restaurant', name: r.name,
                address: r.location, lat: r.lat, lng: r.lng,
                city: cityEnFor(r.region),
                description: r.description,
                rating: typeof r.googleRating === 'number' ? r.googleRating : undefined,
                cuisine: r.cuisine,
                recommendationSource: r.recommendationSource,
                priceRange: r.priceRange || r.price || r.priceLevel,
                imageUrl: r.imageUrl,
                notes: r.notes,
                googleMapsUrl: r.googleMapsUrl,
                source: 'saved',
                raw: r,
                categoryTitle: r.categoryTitle,
            });
        });

        // AI-suggestions layer — dedupe by name against saved so a place
        // present in both lists doesn't get a hollow pin stacked on top
        // of its solid saved pin. (passesItemFilters already applied
        // upstream in filteredRestaurants.)
        if (includeAi) filteredRestaurants.forEach(r => {
            if (selectedCity !== 'all' && !restaurantMatchesCity(r, selectedCity)) return;
            if (savedNameKeys.has(r.name.toLowerCase())) return;
            items.push({
                id: `ai-${r.id}`, type: 'restaurant', name: r.name,
                address: r.location, lat: r.lat, lng: r.lng,
                city: cityEnFor(r.region),
                description: r.description,
                rating: typeof r.googleRating === 'number' ? r.googleRating : undefined,
                cuisine: r.cuisine,
                recommendationSource: r.recommendationSource,
                priceRange: r.priceRange || r.price || r.priceLevel,
                imageUrl: r.imageUrl,
                notes: r.notes,
                googleMapsUrl: r.googleMapsUrl,
                source: 'ai',
                raw: r,
                categoryTitle: r.categoryTitle || 'AI',
            });
        });

        // Always layer hotels on top so the user can see how their food
        // picks relate to where they're staying. UnifiedMapView geocodes
        // addresses lazily, so hotels without lat/lng still drop a pin.
        (trip.hotels || []).forEach(h => {
            const hCity = h.city || h.address || '';
            if (selectedCity !== 'all' && !locationMatchesCity(hCity, selectedCity)) return;
            if (!h.address && (typeof h.lat !== 'number' || typeof h.lng !== 'number')) return;
            items.push({
                id: `hotel-${h.id}`, type: 'hotel', name: h.name,
                address: h.address, lat: h.lat, lng: h.lng,
                description: h.city || h.address,
                source: 'saved',
            });
        });
        return items;
    };

    // Lowercased name set of saved restaurants — passed to UnifiedMapView so
    // the popup can show "✓ ברשימה שלי" instead of the add CTA when a
    // suggestion is already saved (rare with the dedupe above, but possible
    // when names match across categories).
    const savedRestaurantNames = useMemo(
        () => new Set(trip.restaurants.flatMap(c => c.restaurants).map(r => r.name.toLowerCase())),
        [trip.restaurants]
    );

    const handleUpdateRestaurant = (id: string, updates: Partial<Restaurant>) => {
        const newRestaurants = trip.restaurants.map(cat => ({
            ...cat,
            restaurants: cat.restaurants.map(r => r.id === id ? { ...r, ...updates } : r)
        }));
        onUpdateTrip({ ...trip, restaurants: newRestaurants });
    };

    const handleDeleteRestaurant = (id: string) => {
        if (!window.confirm("להסיר את המסעדה מהרשימה?")) return;
        const newRestaurants = trip.restaurants.map(cat => ({
            ...cat,
            restaurants: cat.restaurants.filter(r => r.id !== id)
        })).filter(cat => cat.restaurants.length > 0); // Remove empty categories
        onUpdateTrip({ ...trip, restaurants: newRestaurants });
        setAddedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    return (
        <div className="space-y-3 animate-fade-in pb-12">
            {/* Row 1 — primary navigation: bold tabs (right) + free-text search (capped width). */}
            <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                    <Tabs<'my_list' | 'recommended'>
                        value={activeTab}
                        onChange={setActiveTab}
                        size="md"
                        className="[&_button]:px-5 [&_button]:font-black [&_button[aria-selected=true]]:text-orange-600 [&_svg]:w-4 [&_svg]:h-4"
                        ariaLabel="Restaurants view mode"
                        items={[
                            { value: 'recommended', label: 'המלצות AI', iconLeading: <Sparkles /> },
                            { value: 'my_list', label: 'הרשימה שלי', iconLeading: <Utensils /> },
                        ]}
                    />
                </div>
                <div className="flex-grow relative z-20 min-w-0 max-w-sm">
                    <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-1.5 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
                        <Search className="w-4 h-4 text-slate-400 mr-1 flex-shrink-0" />
                        <input className="flex-grow outline-none text-slate-700 font-medium text-sm min-w-0" placeholder='נסה: מישלן בבנגקוק, ראמן, בר קוקטיילים, בית קפה...' value={textQuery} onChange={(e) => setTextQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()} />
                        {textQuery && (<button onClick={clearSearch} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>)}
                        <button onClick={handleTextSearch} disabled={isSearching || !textQuery.trim()} className="bg-orange-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs hover:bg-orange-700 transition-colors flex items-center gap-1 disabled:opacity-50 flex-shrink-0">{isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}<span className="hidden sm:inline">{isSearching ? '...' : 'חיפוש'}</span></button>
                    </div>
                </div>
            </div>

            {/* Saved-search chips — only when user has them. Compact row, no header label. */}
            {trip.customFoodCategories && trip.customFoodCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {trip.customFoodCategories.map((category, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                setTextQuery(category);
                                handleTextSearch();
                            }}
                            className="group flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-700 rounded-full text-2xs font-bold border border-slate-200 transition-all hover:border-orange-200"
                        >
                            <Sparkles className="w-2.5 h-2.5 text-orange-400" />
                            {category}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const updated = trip.customFoodCategories?.filter((_, i) => i !== idx);
                                    onUpdateTrip({ ...trip, customFoodCategories: updated });
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-orange-100 rounded-full transition-all text-orange-400"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </button>
                    ))}
                </div>
            )}

            {/* Row 2 — context controls: city pills + list/map toggle + refresh/reset icons. */}
            <div className="flex items-center gap-2">
                {presentCities.length > 0 ? (
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-grow min-w-0">
                        <button
                            key="__all__"
                            onClick={() => setSelectedCity('all')}
                            className={`px-3 py-1 rounded-full text-2xs font-black transition-all border whitespace-nowrap flex-shrink-0 ${selectedCity === 'all' ? 'bg-slate-900 border-slate-900 text-white shadow' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                        >
                            כל המסלול
                        </button>
                        {presentCities.map(({ display, count, key }) => (
                            <button
                                key={key}
                                onClick={() => setSelectedCity(display)}
                                className={`px-3 py-1 rounded-full text-2xs font-black transition-all border whitespace-nowrap flex-shrink-0 inline-flex items-center gap-1.5 ${selectedCity === display ? 'bg-slate-900 border-slate-900 text-white shadow' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                            >
                                <span>{display}</span>
                                <span className={`text-[10px] font-bold ${selectedCity === display ? 'text-white/80' : 'text-slate-400'}`}>{count}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="flex-grow" />
                )}
                <div className="inline-flex bg-slate-100 rounded-xl p-0.5 flex-shrink-0">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <List className="w-3 h-3" /> רשימה
                    </button>
                    <button
                        onClick={() => setViewMode('map')}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-bold transition-all ${viewMode === 'map' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <MapIcon className="w-3 h-3" /> מפה
                    </button>
                </div>
                {aiCategories.length > 0 && !viewerMode && (
                    <>
                        <button
                            onClick={() => selectedCity !== 'all' ? initiateResearch(selectedCity) : researchAllCities()}
                            disabled={loadingRecs || isResearchingAll}
                            title={isResearchingAll ? `סורק (${researchProgress.current}/${researchProgress.total})` : (selectedCity !== 'all' ? 'רענן עיר' : 'רענן הכל')}
                            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-600 disabled:opacity-50 flex-shrink-0"
                        >
                            <RotateCw className={`w-3.5 h-3.5 ${(loadingRecs || isResearchingAll) ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={researchNearHotel}
                            disabled={loadingRecs || isResearchingAll || (trip.hotels || []).filter(h => typeof h.lat === 'number').length === 0}
                            title="מצא הכי טוב באזור המלון (15 דק׳ הליכה)"
                            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600 disabled:opacity-50 flex-shrink-0"
                        >
                            <Hotel className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setConfirmReset(true)}
                            disabled={loadingRecs || isResearchingAll}
                            title="איפוס מחקר"
                            className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600 disabled:opacity-50 flex-shrink-0"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </>
                )}
            </div>

            {/* Free-text search results — shown only when user submitted a query. */}
            {searchResults && (
                <div className="space-y-3 animate-fade-in">
                    <div className="flex justify-between items-center"><h3 className="text-base font-black text-slate-800">תוצאות חיפוש</h3><button onClick={clearSearch} className="text-2xs text-slate-500 hover:text-red-500 underline">נקה</button></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {searchResults.map(res => (
                            <RestaurantCard
                                key={res.id}
                                rec={res as ExtendedRestaurant}
                                tripDestination={trip.destination}
                                tripDestinationEnglish={trip.destinationEnglish}
                                isAdded={addedIds.has(res.id) || trip.restaurants.some(c => c.restaurants.some(r => r.name === res.name))}
                                onAdd={handleToggleRec}
                                onClick={() => setSelectedPlace(res as ExtendedRestaurant)}
                            />
                        ))}
                    </div>
                    <div className="border-b border-slate-200"></div>
                </div>
            )}

            {/* Viewer-mode notice — collaborators joined via the viewer link. */}
            {viewerMode && (
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600">
                    <span className="flex items-center gap-1.5">
                        <span>🔒</span>
                        <span>תוצאות פרטיות — נשמרות רק במכשיר שלך</span>
                    </span>
                    {hasLocalAI(trip.id) && (
                        <button
                            onClick={() => {
                                clearLocalAI(trip.id);
                                setAiCategories(trip.aiRestaurants || []);
                            }}
                            className="text-slate-500 hover:text-slate-800 underline underline-offset-2"
                        >
                            נקה תוצאות פרטיות
                        </button>
                    )}
                </div>
            )}

            {viewMode === 'map' ? (
                <div className="space-y-3">
                    {/* Map source toggle — saved vs AI vs both. Independent of the
                        list tab so the user can be on "My list" but still see all
                        AI-researched markers on the map. */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex bg-slate-100 rounded-xl p-0.5">
                            {([
                                { id: 'all', label: 'הכל' },
                                { id: 'saved', label: 'הרשימה שלי' },
                                { id: 'ai', label: 'מחקר AI' },
                            ] as const).map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setMapSource(opt.id)}
                                    className={`px-3 py-1 rounded-lg text-2xs font-bold transition-all ${mapSource === opt.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        {activeFilterCount > 0 && (
                            <button
                                onClick={clearAllFilters}
                                className="text-2xs text-slate-500 hover:text-red-600 underline underline-offset-2"
                            >
                                נקה סינון ({activeFilterCount})
                            </button>
                        )}
                    </div>
                    {/* Filter chips — cuisine, price, distance from hotel. Hidden
                        when no options exist for the current data set. */}
                    {(filterOptions.cuisines.length > 0 || filterOptions.prices.length > 0 || (trip.hotels || []).some(h => typeof h.lat === 'number')) && (
                        <div className="space-y-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl">
                            {filterOptions.cuisines.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-2xs font-bold text-slate-500 shrink-0">סוג:</span>
                                    {filterOptions.cuisines.slice(0, 10).map(([cuisine, n]) => (
                                        <button
                                            key={cuisine}
                                            onClick={() => setFilterCuisines(prev => toggleSetMember(prev, cuisine))}
                                            className={`px-2.5 py-0.5 rounded-full text-2xs font-bold border transition-all ${filterCuisines.has(cuisine) ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-orange-300'}`}
                                        >
                                            {cuisine} <span className="opacity-60">{n}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {filterOptions.prices.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-2xs font-bold text-slate-500 shrink-0">מחיר:</span>
                                    {filterOptions.prices.map(([price, n]) => (
                                        <button
                                            key={price}
                                            onClick={() => setFilterPrices(prev => toggleSetMember(prev, price))}
                                            className={`px-2.5 py-0.5 rounded-full text-2xs font-bold border transition-all ${filterPrices.has(price) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'}`}
                                        >
                                            {price} <span className="opacity-60">{n}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {(trip.hotels || []).some(h => typeof h.lat === 'number') && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-2xs font-bold text-slate-500 shrink-0">מרחק מהמלון:</span>
                                    {([
                                        { val: 15, label: '≤ 15 דק׳' },
                                        { val: 30, label: '≤ 30 דק׳' },
                                    ] as const).map(opt => (
                                        <button
                                            key={opt.val}
                                            onClick={() => setFilterMaxWalkMin(prev => prev === opt.val ? null : opt.val)}
                                            className={`px-2.5 py-0.5 rounded-full text-2xs font-bold border transition-all ${filterMaxWalkMin === opt.val ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {(() => {
                        return (
                            <>
                                {geocodingInFlight > 0 && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>מאתר {geocodingInFlight} מקומות נוספים על המפה...</span>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                    <UnifiedMapView
                        items={getMapItems()}
                        trip={trip}
                        activeCity={selectedCity !== 'all' ? (displayCityName(selectedCity, 'en') || selectedCity) : null}
                        title="מפת מסעדות"
                        savedNames={savedRestaurantNames}
                        onAddToList={(item) => {
                            const r = (item as any).raw as Restaurant | undefined;
                            if (!r) return;
                            handleToggleRec(r, (item as any).categoryTitle || 'AI');
                        }}
                    />
                </div>
            ) : (
                <>
                    {activeTab === 'my_list' ? (
                        <>
                            {trip.restaurants.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-fade-in px-4">
                                    <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center shadow-lg shadow-orange-100/50 relative">
                                        <Sparkles className="w-10 h-10 text-orange-500 absolute top-4 right-4 animate-pulse" />
                                        <Utensils className="w-10 h-10 text-orange-600" />
                                    </div>
                                    <div className="space-y-3 max-w-sm">
                                        <h3 className="text-2xl font-black text-slate-800">הרשימה שלך ריקה... בוא נמלא אותה!</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            ה-AI שלנו יכול לסרוק את הרשת ולמצוא עבורך את המסעדות הכי שוות ב{trip.destination}.
                                            <br />
                                            אל תבזבז זמן על חיפושים ידניים.
                                        </p>
                                    </div>
                                    {!viewerMode && (
                                    <button
                                        onClick={() => {
                                            setActiveTab('recommended');
                                            // Kick off research immediately so the user doesn't have to
                                            // click a second button on the recommended tab.
                                            if (!isResearchingAll && aiCategories.length === 0) {
                                                researchAllCities();
                                            }
                                        }}
                                        disabled={isResearchingAll}
                                        className="group relative overflow-hidden bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all flex items-center gap-3 disabled:opacity-60 disabled:cursor-wait"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <span className="relative flex items-center gap-2">
                                            {isResearchingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                                            {isResearchingAll ? 'מחפש מסעדות…' : 'התחל המלצות AI'}
                                        </span>
                                    </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-1">
                                        <button onClick={() => setViewMode('map')} className="px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold text-xs bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 transition-all shadow-sm">
                                            <MapIcon className="w-3 h-3" /> מפה
                                        </button>
                                    </div>

                                    <div className="space-y-4 mt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {/* FLAT LIST VIEW (User requested removal of categories) */}
                                            {(() => {
                                                // Flatten logic
                                                const flatList: ExtendedRestaurant[] = [];
                                                trip.restaurants.forEach(cat => cat.restaurants.forEach(r => flatList.push({
                                                    ...r,
                                                    region: r.region || cat.region,
                                                    cuisine: r.cuisine || r.iconType || cat.title || 'General' // Ensure genre is passed
                                                })));

                                                // Apply Filters — language-agnostic city match
                                                let filtered = flatList;
                                                if (selectedCity !== 'all') {
                                                    filtered = flatList.filter(r => restaurantMatchesCity(r, selectedCity));
                                                }

                                                // Sort by Favorite then Rating
                                                filtered = sortMyRestaurants(filtered);

                                                if (filtered.length === 0) {
                                                    return (
                                                        <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 mt-4">
                                                            <p className="text-slate-500 text-sm font-bold">לא נמצאו מסעדות בסינון זה.</p>
                                                        </div>
                                                    );
                                                }

                                                return filtered.map((r) => (
                                                    <RestaurantRow
                                                        key={r.id}
                                                        data={r}
                                                        onSaveNote={(n) => handleUpdateRestaurant(r.id, { notes: n })}
                                                        onUpdate={(u) => handleUpdateRestaurant(r.id, u)}
                                                        onDelete={() => handleDeleteRestaurant(r.id)}
                                                        onSelect={() => setSelectedPlace(r)}
                                                    />
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="animate-fade-in">
                            {/* Refresh + reset moved to row 2 of the page header. Inline progress
                                strip surfaces multi-city research progress while it runs. */}
                            {isResearchingAll && (
                                <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-2xs font-bold">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>סורק עיר {researchProgress.current} מתוך {researchProgress.total}…</span>
                                </div>
                            )}

                            {loadingRecs ? (
                                <div className="space-y-4">
                                    <ThinkingLoader texts={["בודק את הסצנה הקולינרית...", "מחפש מנות מומלצות...", "סורק ביקורות מקומיים...", "מצליב נתוני מישלן..."]} />
                                    <SkeletonCardGrid count={6} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" />
                                </div>
                            ) : (
                                <>
                                    {allAiRestaurants.length === 0 || hasStaleData ? (
                                        <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center px-4">
                                            <div className="bg-orange-100 p-4 rounded-full"><BrainCircuit className="w-8 h-8 text-orange-600" /></div>
                                            <h3 className="text-xl font-black text-slate-800">
                                                {hasStaleData ? 'הנתונים השמורים לא מתאימים לטיול הזה' : (tripCities.length > 1 ? 'באיזו עיר נתמקד?' : 'בחר עיר לחיפוש')}
                                            </h3>
                                            {hasStaleData && (
                                                <p className="text-sm text-slate-500 max-w-sm">
                                                    מצאנו מסעדות שמורות ממחקר ישן שאינן ב-{trip.destination}. בצע מחקר חדש לקבלת המלצות מותאמות לטיול.
                                                </p>
                                            )}

                                            {/* Big unmistakable primary CTA — the user explicitly asked
                                                for ONE clear button to run research. City-specific
                                                options are secondary links below. */}
                                            <button
                                                onClick={() => researchAllCities()}
                                                disabled={isResearchingAll}
                                                className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-8 py-3 rounded-2xl text-base font-black shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-60"
                                            >
                                                {isResearchingAll
                                                    ? <><Loader2 className="w-5 h-5 animate-spin" /> סורק ({researchProgress.current}/{researchProgress.total})</>
                                                    : <><BrainCircuit className="w-5 h-5" /> המלצות AI לכל הטיול</>}
                                            </button>

                                            {tripCities.length > 1 && !isResearchingAll && (
                                                <div className="pt-3 border-t border-slate-100 w-full max-w-md">
                                                    <div className="text-2xs font-bold text-slate-400 mb-2">או מחקר ממוקד לעיר בודדת:</div>
                                                    <div className="flex flex-wrap justify-center gap-2">
                                                        {tripCities.map(city => (
                                                            <button
                                                                key={city}
                                                                onClick={() => initiateResearch(city)}
                                                                className="bg-white border border-slate-200 text-slate-700 px-4 py-1.5 rounded-full text-xs font-bold hover:border-orange-500 hover:text-orange-600 hover:bg-orange-50 transition-all"
                                                            >
                                                                {city}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            {/* Dedupe categories at render — protects against legacy
                                                data from before the single-city merge fix that may
                                                still have duplicate titles like 'תאילנדי' twice. */}
                                            {(() => {
                                                const seen = new Set<string>();
                                                const uniqueCats = aiCategories.filter(c => {
                                                    const key = displayTitle(c.title);
                                                    if (seen.has(key)) return false;
                                                    seen.add(key);
                                                    return true;
                                                });
                                                return (
                                                    <div className="mb-3 overflow-x-auto pb-2 scrollbar-hide">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap ${selectedCategory === 'all' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200'}`}>הכל</button>
                                                            {uniqueCats.map(c => (
                                                                <div key={c.id} className="inline-flex items-center gap-0.5">
                                                                    <button onClick={() => setSelectedCategory(c.id)} className={`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap ${selectedCategory === c.id ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200'}`}>{displayTitle(c.title)}</button>
                                                                    {!viewerMode && (
                                                                        <button
                                                                            onClick={() => refreshSingleCategory(c)}
                                                                            disabled={refreshingCategoryId !== null}
                                                                            title={`רענן ${displayTitle(c.title)}`}
                                                                            className="w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-40"
                                                                        >
                                                                            {refreshingCategoryId === c.id
                                                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                                : <RotateCw className="w-3 h-3" />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Advanced filters collapsed by default to reduce visual noise */}
                                            {availableRaters.length > 1 && (
                                                <div className="mb-3">
                                                    <button
                                                        onClick={() => setShowAdvancedFilters(s => !s)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-bold transition-all ${showAdvancedFilters || selectedRater !== 'all' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        סנן לפי מקור המלצה
                                                        {selectedRater !== 'all' && (
                                                            <span className="bg-orange-600 text-white px-1.5 py-0.5 rounded-full text-[9px]">1</span>
                                                        )}
                                                        <span className={`transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}>▾</span>
                                                    </button>
                                                    {showAdvancedFilters && (
                                                        <div className="mt-2 overflow-x-auto pb-2 flex gap-2 items-center animate-fade-in">
                                                            <button onClick={() => setSelectedRater('all')} className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${selectedRater === 'all' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200'}`}>הכל</button>
                                                            {availableRaters.map(r => <button key={r} onClick={() => setSelectedRater(r)} className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${selectedRater === r ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200'}`}>{r}</button>)}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                                {filteredRestaurants.map(rec => (
                                                    <RestaurantCard
                                                        key={rec.id}
                                                        rec={rec}
                                                        tripDestination={trip.destination}
                                                        tripDestinationEnglish={trip.destinationEnglish}
                                                        isAdded={addedIds.has(rec.id) || trip.restaurants.some(c => c.restaurants.some(r => r.name === rec.name))}
                                                        onAdd={handleToggleRec}
                                                        onClick={() => setSelectedPlace(rec)}
                                                    />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </>
            )}

            {selectedPlace && (
                <GlobalPlaceModal
                    item={selectedPlace}
                    type="restaurant"
                    onClose={() => setSelectedPlace(null)}
                    isAdded={trip.restaurants.some(c => c.restaurants.some(r => r.name === selectedPlace?.name))}
                    onAddToPlan={() => handleToggleRec(selectedPlace, selectedPlace?.categoryTitle || 'תכנון טיול')}
                />
            )}

            <ConfirmModal
                isOpen={confirmReset}
                title="לאפס את המחקר?"
                message="כל ההמלצות השמורות יימחקו. מיד אחרי האישור יתחיל מחקר חדש לכל הערים של הטיול. לא ניתן לבטל."
                confirmText="אפס והרץ מחדש"
                cancelText="ביטול"
                isDangerous
                onConfirm={handleResetResearch}
                onClose={() => setConfirmReset(false)}
            />
            <ConfirmModal
                isOpen={showRefreshLimitModal}
                title="הגעת למכסה החודשית"
                message="הגעת למכסת הרענון החודשית לקטגוריה זו (1 רענון בתשלום + 3 רענונים חינמיים). המכסה מתאפסת בתחילת כל חודש."
                confirmText="הבנתי"
                cancelText=""
                onConfirm={() => setShowRefreshLimitModal(false)}
                onClose={() => setShowRefreshLimitModal(false)}
            />
        </div>
    );
};

const RestaurantRow: React.FC<{ data: ExtendedRestaurant, onSaveNote: (n: string) => void, onUpdate: (updates: Partial<Restaurant>) => void, onDelete: () => void, onSelect: () => void }> = ({ data, onSaveNote, onUpdate, onDelete, onSelect }) => {

    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState(data.notes || '');

    // Intelligent Mappers
    const tags = [data.cuisine || '', data.categoryTitle || '', data.location];
    const { url: mappedUrl, label: visualLabel } = getFoodImage(data.name || '', data.description || '', tags);
    const visuals = getCuisineVisuals(data.cuisine || visualLabel);

    // Fallback Image
    const imageSrc = data.imageUrl || mappedUrl;

    // Toggle Heart
    const toggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate({ isFavorite: !data.isFavorite });
    };

    const saveNote = () => { onSaveNote(noteText); setIsEditingNote(false); };

    return (
        <div
            onClick={onSelect}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 hover:shadow-md transition-shadow relative group cursor-pointer"
        >
            <div className="flex justify-between items-start gap-3">
                <div className="flex gap-3 items-start flex-grow min-w-0">
                    {/* Image Section */}
                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden relative border border-slate-200">
                        <img
                            src={imageSrc}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=200&q=80';
                            }}
                            className="w-full h-full object-cover"
                            alt={data.name}
                        />
                        <div className="absolute bottom-0 right-0 left-0 bg-black/40 backdrop-blur-[1px] p-0.5 text-center">
                            <span className="text-[8px] font-bold text-white block truncate">{visuals.label}</span>
                        </div>
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-800 text-sm truncate">{data.name}</h4>
                        </div>

                        {/* Genre / Badge Highlight */}
                        <div className="flex items-center gap-2 mt-1">
                            <div className={`text-2xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${visuals.gradient}`}>
                                <span>{visuals.icon}</span>
                                <span>{visuals.label}</span>
                            </div>
                            {data.googleRating && (
                                <div className="flex items-center gap-1 text-2xs font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded">
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    {data.googleRating}
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-slate-400 truncate mt-1">{data.description || data.location}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-1 flex-shrink-0">
                    <button
                        onClick={toggleFavorite}
                        className={`p-1.5 rounded-lg transition-colors ${data.isFavorite ? 'bg-red-50 text-red-500' : 'hover:bg-slate-50 text-slate-300 hover:text-slate-400'}`}
                    >
                        <Heart className={`w-4 h-4 ${data.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Inline Note (Compact) */}
            <div className="mt-2" onClick={e => e.stopPropagation()}>
                {isEditingNote ? (
                    <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-100 flex gap-1">
                        <textarea className="w-full bg-transparent border-none outline-none text-2xs text-yellow-900 resize-none" rows={1} value={noteText} onChange={e => setNoteText(e.target.value)} />
                        <button onClick={saveNote} className="text-2xs font-black text-yellow-700 whitespace-nowrap">שמור</button>
                    </div>
                ) : (
                    <div onClick={() => setIsEditingNote(true)} className="text-2xs text-slate-400 border border-dashed border-slate-200 rounded-lg p-1.5 flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors">
                        {data.notes ? <><StickyNote className="w-3 h-3 text-yellow-500" /> <span className="text-yellow-900 truncate">{data.notes}</span></> : <span className="opacity-50">+ הערה</span>}
                    </div>
                )}
            </div>
        </div>
    );
};
