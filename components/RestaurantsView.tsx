import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Trip, Restaurant, RestaurantIconType, RestaurantCategory } from '../types';
import { MapPin, Filter, Coffee, Flame, Fish, Star, Soup, Sandwich, Utensils, StickyNote, Sparkles, BrainCircuit, Loader2, Plus, RotateCw, CheckCircle2, Navigation, Map as MapIcon, List, Calendar, Clock, Trash2, Search, X, Trophy, Wine, Pizza, ChefHat, Store, History, Award, LayoutGrid, RefreshCw, Globe, ChevronLeft, Hotel, Heart, ClipboardPaste } from 'lucide-react';
import { ExternalAiPasteModal } from './ExternalAiPasteModal';
// cleaned imports
import { getFoodImage } from '../services/imageMapper';
import { getEnglishName } from '../utils/displayName';
import { useLazyPlaceImage } from '../hooks/useLazyPlaceImage';
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
import { getUserPremiumState, markPremiumRunUsed, getCategoryRefreshes, incrementCategoryRefresh, CategoryRefreshEntry, getPlacesSpendToday, incrementPlacesSpend, PLACES_ILS_PER_CALL } from '../services/firestoreService';
import { isPlacesDisabled } from '../services/placesService';

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

    // ── Specific national cuisines first (so "British" beats "pub" → Nightlife,
    //     and "Greek" doesn't fall through to the generic Restaurant bucket).

    if (c.includes('greek'))
        return { icon: '🫒', gradient: 'bg-gradient-to-br from-sky-500 to-blue-700 text-white', label: 'Greek' };

    if (c.includes('indian') || c.includes('biryani') || c.includes('tandoor'))
        return { icon: '🍛', gradient: 'bg-gradient-to-br from-orange-600 to-red-700 text-white', label: 'Indian' };

    if (c.includes('mexican') || c.includes('taco') || c.includes('mezcal'))
        return { icon: '🌮', gradient: 'bg-gradient-to-br from-lime-500 to-green-700 text-white', label: 'Mexican' };

    if (c.includes('french'))
        return { icon: '🥐', gradient: 'bg-gradient-to-br from-blue-600 to-indigo-800 text-white', label: 'French' };

    if (c.includes('chinese') || c.includes('cantonese') || c.includes('dim sum'))
        return { icon: '🥟', gradient: 'bg-gradient-to-br from-red-600 to-rose-800 text-white', label: 'Chinese' };

    if (c.includes('korean'))
        return { icon: '🌶️', gradient: 'bg-gradient-to-br from-rose-500 to-red-700 text-white', label: 'Korean' };

    if (c.includes('vietnamese') || c.includes('pho'))
        return { icon: '🍲', gradient: 'bg-gradient-to-br from-emerald-600 to-teal-800 text-white', label: 'Vietnamese' };

    if (c.includes('spanish') || c.includes('tapas') || c.includes('paella'))
        return { icon: '🥘', gradient: 'bg-gradient-to-br from-yellow-500 to-orange-700 text-white', label: 'Spanish' };

    if (c.includes('mediterranean'))
        return { icon: '🌊', gradient: 'bg-gradient-to-br from-cyan-500 to-blue-700 text-white', label: 'Mediterranean' };

    if (c.includes('lebanese') || c.includes('middle eastern') || c.includes('arabic'))
        return { icon: '🌯', gradient: 'bg-gradient-to-br from-amber-700 to-orange-900 text-white', label: 'Middle Eastern' };

    if (c.includes('british') || c.includes('english'))
        return { icon: '🥧', gradient: 'bg-gradient-to-br from-slate-600 to-slate-900 text-white', label: 'British' };

    if (c.includes('german') || c.includes('austrian'))
        return { icon: '🥨', gradient: 'bg-gradient-to-br from-yellow-600 to-amber-800 text-white', label: 'German' };

    if (c.includes('swiss'))
        return { icon: '🧀', gradient: 'bg-gradient-to-br from-red-600 to-red-900 text-white', label: 'Swiss' };

    if (c.includes('steak'))
        return { icon: '🥩', gradient: 'bg-gradient-to-br from-red-700 to-red-950 text-white', label: 'Steakhouse' };

    if (c.includes('vegan') || c.includes('vegetarian') || c.includes('healthy'))
        return { icon: '🥗', gradient: 'bg-gradient-to-br from-green-500 to-emerald-700 text-white', label: 'Vegan' };

    if (c.includes('european'))
        return { icon: '🇪🇺', gradient: 'bg-gradient-to-br from-indigo-600 to-blue-800 text-white', label: 'European' };

    // ── Generic / category-style buckets after the specific cuisines.

    if (c.includes('fine') || c.includes('michelin') || c.includes('luxury'))
        return { icon: '💎', gradient: 'bg-gradient-to-br from-slate-800 to-black text-white', label: 'Luxury' };

    if (c.includes('street') || c.includes('market') || c.includes('stall'))
        return { icon: '🥢', gradient: 'bg-gradient-to-br from-orange-400 to-red-500 text-white', label: 'Street Food' };

    if (c.includes('burger') || c.includes('smash'))
        return { icon: '🍔', gradient: 'bg-gradient-to-br from-red-500 to-orange-600 text-white', label: 'Burger' };

    if (c.includes('pizza') || c.includes('italian'))
        return { icon: '🍕', gradient: 'bg-gradient-to-br from-green-500 to-emerald-700 text-white', label: 'Italian' };

    if (c.includes('sushi') || c.includes('japanese') || c.includes('ramen') || c.includes('izakaya') || c.includes('yakiniku') || c.includes('omakase') || c.includes('tsukemen'))
        return { icon: '🍜', gradient: 'bg-gradient-to-br from-rose-400 to-pink-600 text-white', label: 'Japanese' };

    // Bakery / patisserie / pastry gets its own bucket so it doesn't fall
    // through to the generic Cafe label. Match BEFORE the cafe matcher.
    if (c.includes('bakery') || c.includes('patisserie') || c.includes('pastry')
        || c.includes('boulangerie') || c.includes('croissant') || c.includes('viennoiserie'))
        return { icon: '🥐', gradient: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white', label: 'Bakery' };

    if (c.includes('coffee') || c.includes('cafe') || c.includes('café') || c.includes('brunch'))
        return { icon: '☕', gradient: 'bg-gradient-to-br from-amber-600 to-brown-800 text-white', label: 'Cafe' };

    if (c.includes('cocktail') || c.includes('rooftop'))
        return { icon: '🍸', gradient: 'bg-gradient-to-br from-purple-600 to-indigo-800 text-white', label: 'Cocktails' };

    if (c.includes('bar') || c.includes('pub'))
        return { icon: '🍺', gradient: 'bg-gradient-to-br from-amber-700 to-yellow-900 text-white', label: 'Bar' };

    if (c.includes('seafood'))
        return { icon: '🦞', gradient: 'bg-gradient-to-br from-blue-400 to-cyan-600 text-white', label: 'Seafood' };

    if (c.includes('thai') || c.includes('isaan'))
        return { icon: '🌶️', gradient: 'bg-gradient-to-br from-orange-500 to-yellow-500 text-white', label: 'Thai' };

    if (c.includes('asian'))
        return { icon: '🥢', gradient: 'bg-gradient-to-br from-orange-500 to-amber-600 text-white', label: 'Asian' };

    if (c.includes('dessert') || c.includes('ice cream') || c.includes('sweet'))
        return { icon: '🍦', gradient: 'bg-gradient-to-br from-pink-300 to-rose-400 text-white', label: 'Sweets' };

    if (c.includes('american'))
        return { icon: '🍔', gradient: 'bg-gradient-to-br from-red-500 to-orange-600 text-white', label: 'American' };

    if (c.includes('bbq') || c.includes('grill') || c.includes('barbecue'))
        return { icon: '🔥', gradient: 'bg-gradient-to-br from-orange-600 to-red-800 text-white', label: 'BBQ' };

    if (c.includes('buffet'))
        return { icon: '🍽️', gradient: 'bg-gradient-to-br from-purple-500 to-pink-600 text-white', label: 'Buffet' };

    if (c.includes('local') || c.includes('authentic') || c.includes('georgian'))
        return { icon: '🍲', gradient: 'bg-gradient-to-br from-amber-500 to-orange-700 text-white', label: 'Local Authentic' };

    if (c.includes('family'))
        return { icon: '👨‍👩‍👧‍👦', gradient: 'bg-gradient-to-br from-green-400 to-teal-600 text-white', label: 'Family Friendly' };

    return { icon: '🍽️', gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white', label: 'Restaurant' };
};

import { cleanTextForMap } from '../utils/textUtils';
import { getTripCities, locationMatchesCity, displayCityName, cityKey, extractRobustCity } from '../utils/geoData';
import { categoryTitleToEnglish } from '../utils/categoryTranslate';
import { geocodePlacesBatch, photonGeocodeRich } from '../utils/geocodePlaces';
import { isPlaceInTripScope, resolvePlaceCity } from '../utils/tripScope';
import { safeMapsUrl } from '../utils/mapsUrl';
import { detectCountryCode } from '../utils/countryCodes';
import { normalizeNearHotelTitle, isNearHotelTitle } from '../utils/categoryTitle';
import { walkingMinutesBetween } from '../utils/walkingDistance';
import { cuisineToHebrew, priceToBucket, sortPriceKeys } from '../utils/cuisineLabels';
import { FilterChipGroup } from './FilterChipGroup';
import { ActionsMenu } from './ActionsMenu';
import { CategoryChip } from './CategoryChip';
import { useIsMobile } from '../hooks/useMediaQuery';
import { normalizeCityForChip, isProvinceOrCountryName } from '../utils/cityNormalize';
import { isAdmin } from '../utils/isAdmin';


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

// Match a restaurant against a city chip. We check several fields because
// non-grounded LLMs (Groq, OpenRouter free) often return items with the city
// embedded in the NAME ("Vlora Bar Cafe") but empty `location` / `region`.
// Without checking name + nameEnglish + description, those items get attributed
// to no city and the chip counts read 0 even when the city tab is full.
const restaurantMatchesCity = (restaurant: Pick<Restaurant, 'location' | 'region' | 'name' | 'nameEnglish' | 'description'>, city: string): boolean => {
    return locationMatchesCity(restaurant.location || '', city)
        || locationMatchesCity(restaurant.region || '', city)
        || locationMatchesCity(restaurant.name || '', city)
        || locationMatchesCity(restaurant.nameEnglish || '', city)
        || locationMatchesCity(restaurant.description || '', city);
};

// Haversine — small inline copy so the per-render filter doesn't pull
// from utils. ~110m precision; fine for "which city is closer".
const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.asin(Math.sqrt(h));
};

// City anchors built from trip.hotels — each hotel resolves to its city via
// extractRobustCity / h.city. The result is a list of (cityName, lat, lng)
// tuples used to attribute a restaurant to its closest city. Centroid
// fallback (when no hotel has coords for a city) would require async
// geocoding; the hotel-anchor approach covers the common case where the
// user has at least one hotel per visited city.
const buildCityAnchors = (
    trip: { hotels?: { lat?: number; lng?: number; city?: string; name?: string; address?: string }[] },
): Array<{ city: string; lat: number; lng: number }> => {
    const out: Array<{ city: string; lat: number; lng: number }> = [];
    (trip.hotels || []).forEach(h => {
        if (typeof h.lat !== 'number' || typeof h.lng !== 'number') return;
        const extracted = extractRobustCity(h.address || '', h.name || '', trip as any);
        const safe = extracted && !/(province|county|country|region)/i.test(extracted) ? extracted : '';
        const cityRaw = safe || h.city || '';
        if (!cityRaw) return;
        const cityEn = (displayCityName(cityRaw, 'en') || cityRaw).trim();
        if (!cityEn) return;
        out.push({ city: cityEn, lat: h.lat, lng: h.lng });
    });
    return out;
};

// Given a restaurant + city anchors, pick the SINGLE city this item
// belongs to. Strict mode — when coords exist, geography decides; the
// item can no longer appear under two chips because its description
// happens to mention both cities. When coords don't exist, fall back to
// the per-chip string match (legacy behavior preserved). User reported
// 2026-05-25: restaurants appeared under both Tirana AND Vlora.
const getPrimaryCityForRestaurant = (
    r: Pick<Restaurant, 'lat' | 'lng' | 'location' | 'region' | 'name' | 'nameEnglish' | 'description'>,
    anchors: Array<{ city: string; lat: number; lng: number }>,
): string | null => {
    if (typeof r.lat === 'number' && typeof r.lng === 'number' && anchors.length > 0) {
        let bestCity = '';
        let bestKm = Infinity;
        for (const a of anchors) {
            const km = haversineKm({ lat: r.lat, lng: r.lng }, { lat: a.lat, lng: a.lng });
            if (km < bestKm) { bestKm = km; bestCity = a.city; }
        }
        return bestCity || null;
    }
    return null;
};

const RestaurantCard: React.FC<{
    rec: ExtendedRestaurant,
    tripDestination: string,
    tripDestinationEnglish?: string,
    isAdded: boolean,
    onAdd: (r: ExtendedRestaurant, cat: string) => void,
    onClick: () => void,
}> = ({ rec, tripDestination, tripDestinationEnglish, isAdded, onAdd, onClick }) => {

    const nameForMap = cleanTextForMap(rec.nameEnglish || rec.name);
    const locationForMap = cleanTextForMap(rec.location) || cleanTextForMap(tripDestinationEnglish || tripDestination);
    const cityForMap = cleanTextForMap(rec.verifiedCity) || cleanTextForMap(rec.region) || cleanTextForMap(tripDestinationEnglish || tripDestination);
    const countryCode = detectCountryCode(rec.verifiedCountry, tripDestinationEnglish, tripDestination);
    const mapsUrl = safeMapsUrl(rec.googleMapsUrl, nameForMap, locationForMap, cityForMap, countryCode);

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
            geocodeFailed={rec.geocodeFailed}
            verificationStatus={rec.verificationStatus}
            photoUrl={rec.googlePhotoUrl}
            googleNotFound={rec.googleNotFound}
        />
    );
};

export const RestaurantsView: React.FC<{ trip: Trip, onUpdateTrip: (t: Trip) => void }> = ({ trip, onUpdateTrip }) => {
    const [activeTab, setActiveTab] = useState<'my_list' | 'recommended'>('recommended');
    console.log("RestaurantView Loaded - v2 Clean Design - Smart Intent Active");
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    // Free-path paste-from-external-AI flow (Part B of the 2026-05-21 plan).
    // Lets the user copy a scoped prompt into their own ChatGPT/Gemini/Claude
    // and paste the JSON back, bypassing our Gemini quota entirely.
    const [pasteModalOpen, setPasteModalOpen] = useState(false);
    // When the user opens the paste modal via the per-category "Copy prompt"
    // menu item, this holds the category title so the prompt scopes to it.
    // Cleared when the modal closes.
    const [pasteScopeCategory, setPasteScopeCategory] = useState<string | undefined>(undefined);

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

    // Apply a Google Places enrichment patch to a single AI-recommended restaurant
    // (looked up by id). Updates both local state and persistence.
    const applyAiRestaurantPatch = (recId: string, patch: Partial<Restaurant>) => {
        const next = aiCategories.map(c => ({
            ...c,
            restaurants: c.restaurants.map(r => r.id === recId ? { ...r, ...patch } : r),
        }));
        setAiCategories(next);
        persistAiRestaurants(next);
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

    // Admin-gated controls (bulk refresh, delete-all-not-found).
    const userIsAdmin = isAdmin(user);

    // Bulk "Refresh all from Google" — sequential enrichment with progress.
    const [bulkRefreshing, setBulkRefreshing] = useState<null | 'saved' | 'ai'>(null);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, updated: 0, skippedCached: 0 });
    const [confirmDeleteNotFound, setConfirmDeleteNotFound] = useState(false);

    // How many places in the active tab are flagged googleNotFound — drives
    // visibility of the "מחק את כל הלא-נמצאו" admin button.
    const notFoundCount = useMemo(() => {
        const list = activeTab === 'my_list'
            ? trip.restaurants.flatMap(c => c.restaurants)
            : aiCategories.flatMap(c => c.restaurants);
        return list.filter(r => (r as any).googleNotFound).length;
    }, [activeTab, trip.restaurants, aiCategories]);

    const handleDeleteAllNotFound = () => {
        if (activeTab === 'my_list') {
            const next = trip.restaurants.map(cat => ({
                ...cat,
                restaurants: cat.restaurants.filter(r => !(r as any).googleNotFound),
            }));
            onUpdateTrip({ ...trip, restaurants: next });
        } else {
            const next = aiCategories.map(c => ({
                ...c,
                restaurants: c.restaurants.filter(r => !(r as any).googleNotFound),
            }));
            setAiCategories(next);
            persistAiRestaurants(next);
        }
        toast.success(`נמחקו ${notFoundCount} מסעדות שלא נמצאו ב-Google Maps`);
        setConfirmDeleteNotFound(false);
    };

    // Mirror of AttractionsView: soft daily Places cap + confirm-before-spend.
    // The May 11 budget incident came from an accidental one-click bulk run;
    // this gates both bulk paths behind an explicit confirmation and a hard
    // per-day ceiling stored in Firestore.
    const PLACES_DAILY_CAP_ILS = 5;
    const [bulkConfirm, setBulkConfirm] = useState<null | { mode: 'saved' | 'ai'; count: number; estimateIls: number }>(null);

    const handleBulkRefreshSaved = async () => {
        if (bulkRefreshing || !userId) return;
        const count = trip.restaurants.flatMap(c => c.restaurants).length;
        if (count === 0) { toast.info('אין מקומות שמורים לרענון'); return; }
        const spentToday = await getPlacesSpendToday(userId);
        const estimate = count * PLACES_ILS_PER_CALL;
        if (spentToday + estimate > PLACES_DAILY_CAP_ILS) {
            toast.error(`הגעת לתקרת ההוצאה היומית של Google Places (₪${PLACES_DAILY_CAP_ILS}). היום כבר עלה ₪${spentToday.toFixed(2)}. נסה שוב מחר.`);
            return;
        }
        setBulkConfirm({ mode: 'saved', count, estimateIls: estimate });
    };

    const handleBulkRefreshAi = async () => {
        if (bulkRefreshing || !userId) return;
        const count = aiCategories.flatMap(c => c.restaurants).length;
        if (count === 0) { toast.info('אין המלצות AI לרענון'); return; }
        const spentToday = await getPlacesSpendToday(userId);
        const estimate = count * PLACES_ILS_PER_CALL;
        if (spentToday + estimate > PLACES_DAILY_CAP_ILS) {
            toast.error(`הגעת לתקרת ההוצאה היומית של Google Places (₪${PLACES_DAILY_CAP_ILS}). היום כבר עלה ₪${spentToday.toFixed(2)}. נסה שוב מחר.`);
            return;
        }
        setBulkConfirm({ mode: 'ai', count, estimateIls: estimate });
    };

    const executeBulkRefreshSaved = async () => {
        if (bulkRefreshing) return;
        const flat = trip.restaurants.flatMap(cat => cat.restaurants.map(r => ({
            id: r.id,
            name: r.name,
            lat: r.lat,
            lng: r.lng,
            googlePlaceId: r.googlePlaceId,
            googleEnrichedAt: r.googleEnrichedAt,
            _catId: cat.id,
        })));
        if (flat.length === 0) return;
        setBulkRefreshing('saved');
        setBulkProgress({ current: 0, total: flat.length, updated: 0, skippedCached: 0 });
        try {
            const { bulkEnrichPlaces, PlacesKeyError } = await import('../services/placesService');
            const outcome = await bulkEnrichPlaces(
                flat,
                (id, patch) => {
                    const next = trip.restaurants.map(cat => ({
                        ...cat,
                        restaurants: cat.restaurants.map(r => r.id === id ? { ...r, ...patch } : r),
                    }));
                    onUpdateTrip({ ...trip, restaurants: next });
                },
                (s) => setBulkProgress(s),
            );
            if (userId && outcome.updated > 0) {
                await incrementPlacesSpend(userId, outcome.updated * PLACES_ILS_PER_CALL);
            }
            if (outcome.stoppedOnQuota) {
                toast.error(`הגעת למכסת היומית של Google. עודכנו ${outcome.updated}, ${outcome.skippedCached} כבר היו עדכניים. נסה שוב מחר.`);
            } else {
                toast.success(`רענון הסתיים · ${outcome.updated} עודכנו · ${outcome.skippedCached} כבר היו עדכניים · ${outcome.notFound} לא נמצאו ב-Google`);
            }
        } catch (err: any) {
            const { PlacesKeyError } = await import('../services/placesService');
            if (err instanceof PlacesKeyError) toast.error('Google Maps API key error — בדוק את ההגדרות');
            else toast.error('נכשל לרענן. נסה שוב.');
            console.error('[GooglePlaces] bulk refresh saved failed', err);
        } finally {
            setBulkRefreshing(null);
        }
    };

    const executeBulkRefreshAi = async () => {
        if (bulkRefreshing) return;
        const flat = aiCategories.flatMap(cat => cat.restaurants.map(r => ({
            id: r.id,
            name: r.name,
            lat: r.lat,
            lng: r.lng,
            googlePlaceId: r.googlePlaceId,
            googleEnrichedAt: r.googleEnrichedAt,
        })));
        if (flat.length === 0) return;
        setBulkRefreshing('ai');
        setBulkProgress({ current: 0, total: flat.length, updated: 0, skippedCached: 0 });
        try {
            const { bulkEnrichPlaces, PlacesKeyError } = await import('../services/placesService');
            let working = aiCategories;
            const outcome = await bulkEnrichPlaces(
                flat,
                (id, patch) => {
                    working = working.map(c => ({
                        ...c,
                        restaurants: c.restaurants.map(r => r.id === id ? { ...r, ...patch } : r),
                    }));
                    setAiCategories(working);
                },
                (s) => setBulkProgress(s),
            );
            persistAiRestaurants(working);
            if (userId && outcome.updated > 0) {
                await incrementPlacesSpend(userId, outcome.updated * PLACES_ILS_PER_CALL);
            }
            if (outcome.stoppedOnQuota) {
                toast.error(`הגעת למכסת היומית של Google. עודכנו ${outcome.updated}, ${outcome.skippedCached} כבר היו עדכניים. נסה שוב מחר.`);
            } else {
                toast.success(`רענון הסתיים · ${outcome.updated} עודכנו · ${outcome.skippedCached} כבר היו עדכניים · ${outcome.notFound} לא נמצאו ב-Google`);
            }
        } catch (err: any) {
            const { PlacesKeyError } = await import('../services/placesService');
            if (err instanceof PlacesKeyError) toast.error('Google Maps API key error — בדוק את ההגדרות');
            else toast.error('נכשל לרענן. נסה שוב.');
            console.error('[GooglePlaces] bulk refresh AI failed', err);
        } finally {
            setBulkRefreshing(null);
        }
    };

    // New cross-cutting filters (apply to both list and map): cuisine/type,
    // price level, max walking minutes from any hotel.
    const [filterCuisines, setFilterCuisines] = useState<Set<string>>(new Set());
    const [filterPrices, setFilterPrices] = useState<Set<string>>(new Set());
    const [textQuery, setTextQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Restaurant[] | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<ExtendedRestaurant | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    // Holds the id of the category the user picked from "מחק את הקטגוריה".
    // Confirmation modal reads this to show the right name + count.
    const [confirmDeleteCategory, setConfirmDeleteCategory] = useState<string | null>(null);

    // Empty the category — keep the chip itself (so "המבורגר" can be
    // re-populated later without re-creating the category) but remove
    // every restaurant inside it. User clarified 2026-05-24 that they
    // wanted to wipe contents only, not lose the category name.
    const handleDeleteCategory = (categoryId: string) => {
        const next = aiCategories.map(c =>
            c.id === categoryId ? { ...c, restaurants: [] } : c
        );
        setAiCategories(next);
        persistAiRestaurants(next);
        setConfirmDeleteCategory(null);
        toast.success('כל המסעדות בקטגוריה נמחקו');
    };
    const [confirmNearHotel, setConfirmNearHotel] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [searchExpanded, setSearchExpanded] = useState(false);
    useEffect(() => { setSearchExpanded(false); }, [activeTab]);
    const isMobile = useIsMobile();
    // Default expanded on desktop, collapsed on mobile so the wall-of-chips
    // doesn't push the list/map down on small screens.
    const [filtersExpanded, setFiltersExpanded] = useState(!isMobile);
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

    // City chip strip — source of truth is trip.hotels with aggressive
    // canonical normalization so "Bangkok" / "בנגקוק" / "Bangkok, Thailand"
    // collapse to one chip and "Koh Chang" / "Ko Chang" / "קו צ'אנג" collapse
    // to one chip. Hotels resolving to province / country names are dropped.
    // Per-city counts come from saved + AI items via locationMatchesCity.
    // Chronological order matches the hotels' check-in order.
    const presentCities = useMemo<{ display: string; count: number; key: string }[]>(() => {
        const cityByKey = new Map<string, { display: string; count: number }>();
        const sortedHotels = (trip.hotels || [])
            .map((h, i) => ({ h, i }))
            .sort((a, b) => {
                const ta = a.h.checkInDate ? new Date(a.h.checkInDate).getTime() : Number.MAX_SAFE_INTEGER - a.i;
                const tb = b.h.checkInDate ? new Date(b.h.checkInDate).getTime() : Number.MAX_SAFE_INTEGER - b.i;
                return ta - tb;
            });
        const orderedKeys: string[] = [];
        // Multi-city strings (separators: -, –, —, &, ,) are trip-level
        // destinations, not single cities. Reject them here so dirty data
        // like h.city = "Bangkok - Pattaya - Ko Chang" doesn't become a chip.
        const isMultiCityString = (s: string) => /[-–—&,]/.test(s);

        sortedHotels.forEach(({ h }) => {
            const extracted = extractRobustCity(h.address || '', h.name || '', trip);
            const fallbackCity = h.city && !isMultiCityString(h.city) ? h.city : '';
            // If extractRobustCity returned a country (which happens when the
            // hotel's address is "City, Country" and resolveLocationName
            // matched the country token rather than the city — e.g.
            // "Vlorë, Albania" resolving to "Albania"), discard it and try
            // h.city instead. Without this, half the trip's hotels' chips
            // silently disappear from the city strip even though getTripCities
            // (which reads h.city directly) shows them in the bottom UI.
            const extractedSafe = extracted && !isProvinceOrCountryName(extracted) ? extracted : '';
            const raw = extractedSafe || fallbackCity;
            if (!raw || isProvinceOrCountryName(raw) || isMultiCityString(raw)) return;
            const k = normalizeCityForChip(raw);
            if (!k || cityByKey.has(k)) return;
            const display = displayCityName(raw, 'he') || raw;
            cityByKey.set(k, { display, count: 0 });
            orderedKeys.push(k);
        });

        // Backstop — ensure every city in trip.destination has a chip even if
        // the corresponding hotel's data is missing or dirty. Without this, a
        // hotel with empty address + multi-city h.city would silently drop its
        // city from the filter list.
        const destinationCities = (trip.destination || '').split(/\s*[-–—&,]\s*/).map(s => s.trim()).filter(Boolean);
        destinationCities.forEach((rawCity: string) => {
            if (!rawCity || isProvinceOrCountryName(rawCity) || isMultiCityString(rawCity)) return;
            const k = normalizeCityForChip(rawCity);
            if (!k || cityByKey.has(k)) return;
            const display = displayCityName(rawCity, 'he') || rawCity;
            cityByKey.set(k, { display, count: 0 });
            orderedKeys.push(k);
        });

        if (orderedKeys.length === 0) return [];

        // Defensive: country-typed chips lose to city-typed chips on tally
        // (see AttractionsView for the same fix). Without this, a destination
        // that slips a country name through PROVINCE_OR_COUNTRY would absorb
        // every item via the early-exit below.
        orderedKeys.sort((a, b) => {
            const aCountry = isProvinceOrCountryName(cityByKey.get(a)!.display) ? 1 : 0;
            const bCountry = isProvinceOrCountryName(cityByKey.get(b)!.display) ? 1 : 0;
            return aCountry - bCountry;
        });

        // Tally checks several fields per item — the same set as restaurantMatchesCity —
        // so non-grounded LLM output (Groq / OpenRouter free) where the city
        // lives in the NAME ("Vlora Bar Cafe") rather than `location` still
        // gets attributed to the right chip. Otherwise chip counts read 0
        // even when the city tab has plenty of items.
        //
        // Count per matching chip (NO early-return). The chip count must equal
        // "how many items this chip's filter would show", because that's what
        // the user expects. An item that mentions two cities (rare but real:
        // "Best Tirana restaurant — close to Vlora beach") legitimately shows
        // under both filters, so it counts twice in the chip strip too. Without
        // this, items get absorbed by whichever chip comes first in orderedKeys
        // and the later chip silently reads 0 even though clicking it shows
        // dozens of items.
        const tally = (region?: string, location?: string, name?: string, nameEnglish?: string, description?: string) => {
            for (const k of orderedKeys) {
                const display = cityByKey.get(k)!.display;
                if (
                    locationMatchesCity(region || '', display)
                    || locationMatchesCity(location || '', display)
                    || locationMatchesCity(name || '', display)
                    || locationMatchesCity(nameEnglish || '', display)
                    || locationMatchesCity(description || '', display)
                ) {
                    cityByKey.get(k)!.count += 1;
                }
            }
        };
        // Skip items that are unverified or whose match was rejected — see
        // AttractionsView for the same logic.
        const isCountable = (r: { verificationStatus?: string }) =>
            r.verificationStatus !== 'not_found' && r.verificationStatus !== 'ambiguous';
        const walk = (cats?: { region?: string; restaurants: { region?: string; location?: string; name?: string; nameEnglish?: string; description?: string; verificationStatus?: string }[] }[]) => {
            (cats || []).forEach(cat => cat.restaurants.forEach(r => {
                if (isCountable(r)) tally(r.region || cat.region, r.location, r.name, r.nameEnglish, r.description);
            }));
        };
        walk(trip.restaurants);
        walk(trip.aiRestaurants);

        return orderedKeys.map(k => ({
            key: k,
            display: cityByKey.get(k)!.display,
            count: cityByKey.get(k)!.count,
        }));
    }, [trip.restaurants, trip.aiRestaurants, trip.hotels]);

    // Default map view stays on "all route" so the user sees the whole
    // trip country with every city pinned. They zoom into a specific
    // city by clicking its chip. Auto-focusing to the first city hid the
    // multi-city geography on map open — reverted 2026-05-24.

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

    // Available filter options — derived from saved + AI items, normalised to
    // Hebrew labels so "Burger" + "Burgers" + "המבורגר" collapse into a single
    // chip. Anything we can't classify falls back to "אחר".
    const filterOptions = useMemo(() => {
        const cuisines = new Map<string, number>();
        const prices = new Map<string, { label: string; count: number }>();
        const consider = (r: Restaurant) => {
            const cuisineHe = cuisineToHebrew(r.cuisine || r.iconType);
            cuisines.set(cuisineHe, (cuisines.get(cuisineHe) || 0) + 1);
            const bucket = priceToBucket(r.priceLevel || (r as any).price || (r as any).priceRange);
            if (bucket) {
                const existing = prices.get(bucket.key);
                prices.set(bucket.key, { label: bucket.label, count: (existing?.count || 0) + 1 });
            }
        };
        trip.restaurants.forEach(c => c.restaurants.forEach(consider));
        (trip.aiRestaurants || []).forEach(c => c.restaurants.forEach(consider));
        return {
            cuisines: Array.from(cuisines.entries()).sort((a, b) => b[1] - a[1]),
            prices: Array.from(prices.entries())
                .map(([key, v]) => ({ key, label: v.label, count: v.count }))
                .sort((a, b) => sortPriceKeys(a.key, b.key)),
        };
    }, [trip.restaurants, trip.aiRestaurants]);

    // Single predicate combining cuisine / price filters. Scoped to the
    // MAP view — list view ignores them, so the card UI can live inside
    // the map block where it's discoverable.
    const passesItemFilters = useCallback((r: Restaurant): boolean => {
        if (viewMode !== 'map') return true;
        if (filterCuisines.size > 0) {
            const c = cuisineToHebrew(r.cuisine || r.iconType);
            if (!filterCuisines.has(c)) return false;
        }
        if (filterPrices.size > 0) {
            const bucket = priceToBucket(r.priceLevel || (r as any).price || (r as any).priceRange);
            if (!bucket || !filterPrices.has(bucket.key)) return false;
        }
        return true;
    }, [viewMode, filterCuisines, filterPrices]);

    const toggleSetMember = (set: Set<string>, value: string): Set<string> => {
        const next = new Set(set);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
    };
    const activeFilterCount =
        (filterCuisines.size > 0 ? 1 : 0) +
        (filterPrices.size > 0 ? 1 : 0);
    const clearAllFilters = () => {
        setFilterCuisines(new Set());
        setFilterPrices(new Set());
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
        setConfirmNearHotel(false);
        const allHotels = trip.hotels || [];
        if (allHotels.length === 0) {
            toast.warning('הוסף קודם מלון לטיול כדי לחפש מסעדות בסביבתו.');
            return;
        }
        // Auto-geocode hotels missing lat/lng so a refresh on a Bangkok-only
        // (or any city's) trip doesn't silently skip the hotel category.
        const missing = allHotels.filter(h => typeof h.lat !== 'number' || typeof h.lng !== 'number');
        const enriched = [...allHotels];
        if (missing.length > 0) {
            for (const m of missing) {
                const query = [m.name, m.address, m.city, trip.destination].filter(Boolean).join(', ');
                if (!query) continue;
                const feat = await photonGeocodeRich(query);
                if (feat) {
                    const idx = enriched.findIndex(h => h.id === m.id);
                    if (idx !== -1) enriched[idx] = { ...enriched[idx], lat: feat.lat, lng: feat.lng };
                }
            }
            const stillMissing = enriched.filter(h => typeof h.lat !== 'number' || typeof h.lng !== 'number');
            if (stillMissing.length < missing.length) {
                onUpdateTrip?.({ ...trip, hotels: enriched });
            }
            if (stillMissing.length > 0) {
                const names = stillMissing.map(h => h.name).slice(0, 3).join(', ');
                toast.warning(`לא הצלחנו לאתר את הכתובת של: ${names}. עדכן כתובת מלאה למלון כדי לכלול אותו בחיפוש.`);
            }
        }
        const hotels = enriched.filter(h => typeof h.lat === 'number' && typeof h.lng === 'number');
        if (hotels.length === 0) {
            toast.warning('אף מלון בטיול אינו מאותר במפה — הוסף כתובת מלאה כדי לחפש מסעדות בסביבתו.');
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
                const catTitle = '🏨 קרוב למלון';
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
                        if (existingIdx >= 0) {
                            accumulated[existingIdx] = newCat;
                        } else {
                            // Place near-hotel at position 5 (or end). Same
                            // reasoning as AttractionsView: useful filter but
                            // not the headline.
                            const insertAt = Math.min(4, accumulated.length);
                            accumulated = [...accumulated.slice(0, insertAt), newCat, ...accumulated.slice(insertAt)];
                        }
                    }
                } catch (e: any) {
                    console.error(`Near-hotel research failed for ${hotel.name}:`, e);
                    const msg = e?.message || '';
                    if (/FreeTierBilling|FreeTier|free_tier|limit:\s*0/i.test(msg)) {
                        setRecError('מפתח Gemini API לא משויך לפרויקט Google Cloud עם חיוב פעיל — הפעל חיוב על הפרויקט בקונסול של גוגל ונסה שוב.');
                        break;
                    }
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
                    if (/FreeTierBilling|FreeTier|free_tier|limit:\s*0/i.test(msg)) {
                        setRecError('מפתח Gemini API לא משויך לפרויקט Google Cloud עם חיוב פעיל — הפעל חיוב על הפרויקט בקונסול של גוגל ונסה שוב.');
                        break;
                    }
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
            // Translate the Hebrew category label to English for the AI prompt
            // so non-Hebrew-trained models reliably grasp the concept ("Burger"
            // beats "המבורגר" for grounded web search). Hebrew is kept ONLY in
            // the output instruction so the UI still gets Hebrew labels.
            const catTitleEn = categoryTitleToEnglish(catTitle);
            const currentDate = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
            const prompt = `You are a food expert. As of ${currentDate}, find the BEST restaurants in "${cityEn}" for the category: ${catTitleEn}${catTitleEn !== catTitle ? ` (Hebrew label: "${catTitle}")` : ''}.
Return AT LEAST 10 currently operating restaurants (aim 12). Apply the same strict operational check as always — omit any closed place.
Respond in the same JSON format:
{ "restaurants": [ { "name", "nameEnglish", "description", "location", "cuisine", "googleRating", "recommendationSource", "isHotelRestaurant", "googleMapsUrl", "business_status", "verification_needed" } ] }
Every restaurant MUST have business_status = "OPERATIONAL". "location" MUST be in English. "description" MUST be in Hebrew (1–2 short sentences, traveler-facing).`;

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
                // MERGE — keep what the user already has in this category
                // and add any NEW picks the AI returned. Match by
                // normalized name so the AI returning a re-spelled
                // duplicate doesn't double the list. Previously this
                // REPLACED the category contents, which silently wiped
                // out manually-added items + every prior research run's
                // results. User flagged this as a real bug 2026-05-24.
                const existingNames = new Set(
                    cat.restaurants.map(r => (r.name || '').toLowerCase().trim())
                );
                const additions = freshRestaurants.filter((r: any) =>
                    !existingNames.has((r.name || '').toLowerCase().trim())
                );
                const mergedRestaurants = [...cat.restaurants, ...additions];
                const updated = aiCategories.map(c =>
                    c.id === cat.id ? { ...c, restaurants: mergedRestaurants } : c
                );
                console.info(`🔄 [refreshCategory] ${cat.title}: kept ${cat.restaurants.length}, ` +
                    `AI returned ${freshRestaurants.length}, added ${additions.length} new (deduped by name)`);
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
    - For EACH of the 10 categories below, return AT LEAST 10 real restaurants (aim 12)
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
            - For EACH of the 10 categories below, return AT LEAST 10 real restaurants (aim 12)
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
        // Meat + fish — added 2026-05-25 at user request, distinct from
        // the existing seafood category.
        "BBQ & Grill": "בשרים ועל האש",
        "BBQ": "בשרים ועל האש",
        "Steak": "בשרים ועל האש",
        "Steakhouse": "בשרים ועל האש",
        "Seafood": "דגים ופירות ים",
        "Fish": "דגים ופירות ים",
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

    const displayTitle = (title: string) => normalizeNearHotelTitle(HEBREW_TITLES[title] || title);

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

        // City Filter — STRICT, geography-first. When an item has lat/lng,
        // its primary city is the closest hotel-anchor city; the string
        // matcher only kicks in as a fallback for items without coords.
        // Earlier OR-everything matcher made Tirana restaurants also
        // appear under Vlora because their description mentioned both
        // cities (and vice-versa). User reported "duplicates between
        // Vlora and Tirana — every restaurant shows in both."
        if (selectedCity !== 'all') {
            const anchors = buildCityAnchors(trip);
            const selectedCityEn = (displayCityName(selectedCity, 'en') || selectedCity).trim().toLowerCase();
            list = list.filter(r => {
                const primary = getPrimaryCityForRestaurant(r, anchors);
                if (primary) {
                    // Coord-based primary city wins — no string fallback.
                    return primary.toLowerCase() === selectedCityEn;
                }
                // No coords on the item — fall back to string match.
                return restaurantMatchesCity(r, selectedCity);
            });
        }
        const afterCity = list.length;

        console.debug(`🍽️ [Restaurants] base=${afterBase} → scope=${afterScope} → city=${afterCity} (tripCities=${JSON.stringify(tripCities)}, selectedCity=${selectedCity})`);

        if (selectedRater !== 'all') {
            list = list.filter(r => normalizeSource(r.recommendationSource || '') === selectedRater);
        }

        list = list.filter(passesItemFilters);

        // Global dedupe by place name — collapses 4×Sorn into 1
        return dedupeByName(list);
    }, [aiCategories, selectedCategory, selectedRater, selectedCity, allAiRestaurants, tripCities, inTripScope, passesItemFilters, trip]);

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

        // Apply Filters — same coord-first city logic as filteredRestaurants
        let filtered = flatList;
        if (selectedCity !== 'all') {
            const anchors = buildCityAnchors(trip);
            const selectedCityEn = (displayCityName(selectedCity, 'en') || selectedCity).trim().toLowerCase();
            filtered = filtered.filter(r => {
                const primary = getPrimaryCityForRestaurant(r, anchors);
                if (primary) return primary.toLowerCase() === selectedCityEn;
                return restaurantMatchesCity(r, selectedCity);
            });
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
        const savedCoordKeys = new Set<string>();   // ~110m bucket of saved-item coords
        const coordKey = (lat?: number, lng?: number) =>
            (typeof lat === 'number' && typeof lng === 'number')
                ? `${Math.round(lat * 1000)}|${Math.round(lng * 1000)}`
                : '';
        const savedFlat = trip.restaurants.flatMap(cat =>
            cat.restaurants.map(r => ({ ...r, categoryTitle: r.categoryTitle || cat.title }))
        );
        savedFlat.forEach(r => {
            const k = coordKey(r.lat, r.lng);
            if (k) savedCoordKeys.add(k);
        });
        // Map view shows EVERYTHING by default — both saved restaurants
        // (solid orange pin) and AI suggestions (dashed orange pin) — so
        // the user sees the full picture of their food options without
        // toggling tabs. Marker style differentiates the two sources.
        // The list-view tab still scopes the list itself.
        const includeSaved = true;
        const includeAi = true;
        savedFlat.forEach(r => {
            if (!includeSaved) return;
            if (selectedCity !== 'all' && !restaurantMatchesCity(r, selectedCity)) return;
            if (!passesItemFilters(r)) return;
            savedNameKeys.add(r.name.toLowerCase());
            items.push({
                id: r.id, type: 'restaurant', name: r.name, nameEnglish: r.nameEnglish,
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
            // Coord-bucket dedupe — same place with slightly different name
            // ("Alcazar" vs "Alcazar Cabaret Show") at the same coords.
            const ck = coordKey(r.lat, r.lng);
            if (ck && savedCoordKeys.has(ck)) return;
            items.push({
                id: `ai-${r.id}`, type: 'restaurant', name: r.name, nameEnglish: r.nameEnglish,
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
            // ALWAYS include hotels regardless of selectedCity filter.
            // The hotel pin is critical context ("which restaurants are
            // near MY hotel?") and there are only 1-3 hotels per trip,
            // so showing all of them adds no visual clutter. Previously
            // we filtered by string match on h.city || h.address, which
            // dropped the hotel when those fields were empty after an
            // AI verify (only lat/lng got populated, not the strings).
            // UnifiedMapView's own visibleItems filter still tightens the
            // VIEW to the active city for restaurants, but hotels are
            // anchors — they always render.
            if (!h.address && (typeof h.lat !== 'number' || typeof h.lng !== 'number')) return;
            const hCityEn = displayCityName(h.city || h.address || '', 'en') || h.city || '';
            console.info(`[Restaurants] hotel item: ${h.name} | city="${h.city || ''}" | coords=(${h.lat ?? 'n/a'}, ${h.lng ?? 'n/a'})`);
            items.push({
                id: `hotel-${h.id}`, type: 'hotel', name: h.name,
                address: h.address, lat: h.lat, lng: h.lng,
                city: hCityEn,
                description: h.city || h.address,
                source: 'saved',
            });
        });

        // Final dedupe pass — same place may appear in multiple categories or
        // in saved + AI with slight name diffs. Bucket by (name, lat~3dp, lng~3dp).
        const seen = new Set<string>();
        return items.filter(it => {
            if (it.type === 'hotel') return true; // hotels keyed by id, no name collision
            const lat = typeof it.lat === 'number' ? Math.round(it.lat * 1000) : 'x';
            const lng = typeof it.lng === 'number' ? Math.round(it.lng * 1000) : 'x';
            const name = (it.name || '').toLowerCase().trim().replace(/\s+/g, ' ');
            const key = `${name}|${lat}|${lng}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
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
        setConfirmDeleteId(id);
    };
    const performDeleteRestaurant = (id: string) => {
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
        setConfirmDeleteId(null);
    };

    return (
        <div className="space-y-3 animate-fade-in pb-12">
            {/* Row 1 — source tabs. The search bar is hidden by default and
                lives only inside the "המלצות AI" tab; tap the 🔍 icon to expand. */}
            <div className="flex items-center justify-between gap-2">
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
                <div className="flex items-center gap-2 min-w-0 flex-shrink">
                    {/* Bulk-refresh progress badge — the action lives inside the 3-dot menu (owner-only). */}
                    {ownerOnly && userIsAdmin && bulkRefreshing && (
                        <span
                            className="flex items-center gap-1.5 h-9 px-2.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold flex-shrink-0"
                            title="מרענן מ-Google ברקע"
                        >
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>{bulkProgress.current}/{bulkProgress.total}</span>
                        </span>
                    )}
                    {ownerOnly && userIsAdmin && notFoundCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setConfirmDeleteNotFound(true)}
                            title={`מחק ${notFoundCount} מסעדות שלא נמצאו ב-Google Maps`}
                            aria-label="מחק את כל הלא-נמצאו"
                            className="flex items-center gap-1 h-9 px-2.5 sm:px-3 rounded-full border border-red-200 bg-white text-red-600 text-xs font-bold hover:bg-red-50 flex-shrink-0"
                        >
                            <X className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">מחק לא-נמצאו</span>
                            <span className="text-[10px]">{notFoundCount}</span>
                        </button>
                    )}
                    {activeTab === 'recommended' && (
                        <button
                            type="button"
                            onClick={() => setSearchExpanded(v => !v)}
                            aria-label={searchExpanded ? 'סגור חיפוש' : 'חפש מסעדה'}
                            aria-expanded={searchExpanded}
                            className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all ${searchExpanded ? 'bg-orange-600 border-orange-600 text-white shadow' : 'bg-white border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-600'}`}
                        >
                            {searchExpanded ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Search input — expands only when the user opens it from the AI tab. */}
            {activeTab === 'recommended' && searchExpanded && (
                <div className="relative z-20">
                    <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-1.5 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
                        <Search className="w-4 h-4 text-slate-400 ms-1 flex-shrink-0" />
                        <input
                            autoFocus
                            className="flex-grow outline-none text-slate-700 font-medium text-sm min-w-0 bg-transparent"
                            placeholder='נסה: מישלן, ראמן, קוקטיילים...'
                            value={textQuery}
                            onChange={(e) => setTextQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()}
                        />
                        {textQuery && (
                            <button onClick={clearSearch} aria-label="נקה חיפוש" className="p-1 hover:bg-slate-100 rounded-full text-slate-400 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
                        )}
                        <button
                            onClick={handleTextSearch}
                            disabled={isSearching || !textQuery.trim()}
                            aria-label="חפש"
                            className="bg-orange-600 text-white px-3 min-h-9 rounded-xl font-bold text-xs hover:bg-orange-700 transition-colors flex items-center gap-1 disabled:opacity-50 flex-shrink-0"
                        >
                            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{isSearching ? '...' : 'חיפוש'}</span>
                        </button>
                    </div>
                </div>
            )}

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

            {/* Row 3 — city chips. On list view this drives the list filter.
                On map view we hide it because UnifiedMapView renders its own
                on-map chip strip there (which also handles camera zoom). */}
            {presentCities.length > 0 && viewMode === 'list' && (
                <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                    <button
                        key="__all__"
                        onClick={() => setSelectedCity('all')}
                        className={`min-h-8 md:min-h-10 px-2.5 md:px-4 py-1 md:py-2 rounded-full text-[11px] md:text-xs font-black transition-all border md:border-2 whitespace-nowrap ${selectedCity === 'all' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                        כל המסלול
                    </button>
                    {presentCities.map(({ display, count, key }) => {
                        const isActive = selectedCity === display;
                        const isEmpty = count === 0;
                        return (
                            <button
                                key={key}
                                onClick={() => setSelectedCity(display)}
                                title={isEmpty ? 'אין כאן עדיין מסעדות. בחר את העיר ולחץ על "מצא הכי טוב באזור המלון" / רענן.' : undefined}
                                className={`min-h-8 md:min-h-10 px-2.5 md:px-4 py-1 md:py-2 rounded-full text-[11px] md:text-xs font-black transition-all border md:border-2 whitespace-nowrap inline-flex items-center gap-1.5 md:gap-2 ${
                                    isActive
                                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                                        : isEmpty
                                            ? 'bg-white border-dashed border-slate-300 text-slate-400 hover:bg-slate-50'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                <span>{display}</span>
                                <span className={`text-[10px] md:text-[11px] font-bold ${isActive ? 'text-white/80' : isEmpty ? 'text-slate-300' : 'text-slate-400'}`}>{count}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Row 4 — view toggle on the start, actions menu on the end.
                One coherent row, no crowding. */}
            <div className="flex items-center justify-between gap-2">
                <div className="inline-flex bg-slate-100 rounded-xl p-0.5">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`flex items-center gap-1.5 min-h-9 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <List className="w-3.5 h-3.5" /> רשימה
                    </button>
                    <button
                        onClick={() => setViewMode('map')}
                        className={`flex items-center gap-1.5 min-h-9 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <MapIcon className="w-3.5 h-3.5" /> מפה
                    </button>
                </div>
                {/* Owner-only — every action below triggers a paid Gemini/Places call. */}
                {ownerOnly && (aiCategories.length > 0 || userIsAdmin) && (
                    <ActionsMenu
                        align="end"
                        items={[
                            (() => {
                                // Refresh action — prefers the currently-selected
                                // CATEGORY (when one is picked); else falls back
                                // to selected city; else refreshes everything.
                                const activeCat = selectedCategory !== 'all'
                                    ? aiCategories.find(c => c.id === selectedCategory)
                                    : null;
                                const isBusy = loadingRecs || isResearchingAll || refreshingCategoryId !== null;
                                return {
                                    icon: <RotateCw className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />,
                                    label: activeCat
                                        ? `רענן את "${displayTitle(activeCat.title)}"`
                                        : selectedCity !== 'all'
                                            ? `רענן את ${selectedCity}`
                                            : 'רענן את כל הערים',
                                    onSelect: () => activeCat
                                        ? refreshSingleCategory(activeCat)
                                        : selectedCity !== 'all'
                                            ? initiateResearch(selectedCity)
                                            : researchAllCities(),
                                    disabled: isBusy,
                                };
                            })(),
                            // Sibling action — same scope picking as the refresh
                            // above (category > city > all) but instead of running
                            // the in-app AI chain, opens the paste modal with a
                            // scoped prompt. The user feeds the prompt to their
                            // own AI subscription (ChatGPT Pro, Gemini Advanced,
                            // Claude.ai with web access) and pastes the JSON back.
                            // Returns higher-quality results than the in-app
                            // chain because the user's AI typically has real web
                            // grounding — and zero Gemini API cost on our side.
                            (() => {
                                const activeCat = selectedCategory !== 'all'
                                    ? aiCategories.find(c => c.id === selectedCategory)
                                    : null;
                                return {
                                    icon: <ClipboardPaste className="w-4 h-4" />,
                                    label: activeCat
                                        ? `העתק פרומפט ל-"${displayTitle(activeCat.title)}"`
                                        : selectedCity !== 'all'
                                            ? `העתק פרומפט ל-${selectedCity}`
                                            : 'העתק פרומפט לכל המסעדות',
                                    onSelect: () => {
                                        setPasteScopeCategory(activeCat ? activeCat.title : undefined);
                                        setPasteModalOpen(true);
                                    },
                                };
                            })(),
                            {
                                icon: <Hotel className="w-4 h-4" />,
                                label: 'מצא מסעדות באזור המלון',
                                onSelect: () => setConfirmNearHotel(true),
                                disabled: loadingRecs || isResearchingAll || (trip.hotels || []).filter(h => typeof h.lat === 'number').length === 0,
                            },
                            ...(!isPlacesDisabled() && userIsAdmin && activeTab === 'recommended' && aiCategories.flatMap(c => c.restaurants).length > 0 ? [{
                                icon: <RefreshCw className={`w-4 h-4 ${bulkRefreshing === 'ai' ? 'animate-spin' : ''}`} />,
                                label: bulkRefreshing === 'ai'
                                    ? `מרענן מ-Google · ${bulkProgress.current}/${bulkProgress.total}`
                                    : 'רענן הכל מ-Google',
                                onSelect: handleBulkRefreshAi,
                                disabled: !!bulkRefreshing,
                            }] : []),
                            ...(!isPlacesDisabled() && userIsAdmin && activeTab === 'my_list' && trip.restaurants.flatMap(c => c.restaurants).length > 0 ? [{
                                icon: <RefreshCw className={`w-4 h-4 ${bulkRefreshing === 'saved' ? 'animate-spin' : ''}`} />,
                                label: bulkRefreshing === 'saved'
                                    ? `מרענן מ-Google · ${bulkProgress.current}/${bulkProgress.total}`
                                    : 'רענן את הרשימה שלי מ-Google',
                                onSelect: handleBulkRefreshSaved,
                                disabled: !!bulkRefreshing,
                            }] : []),
                            // Delete-category — only when a single category is
                            // selected. Removes that category and all its items
                            // in one go. Requires explicit confirmation to
                            // prevent fat-finger clicks. Surgical alternative
                            // to "reset all research".
                            ...(selectedCategory !== 'all' && aiCategories.find(c => c.id === selectedCategory) ? [(() => {
                                const activeCat = aiCategories.find(c => c.id === selectedCategory)!;
                                const itemCount = activeCat.restaurants.length;
                                return {
                                    icon: <Trash2 className="w-4 h-4" />,
                                    label: `מחק את הקטגוריה "${displayTitle(activeCat.title)}" (${itemCount})`,
                                    onSelect: () => setConfirmDeleteCategory(activeCat.id),
                                    danger: true,
                                };
                            })()] : []),
                            ...(aiCategories.length > 0 ? [{
                                icon: <Trash2 className="w-4 h-4" />,
                                label: 'אפס מחקר',
                                onSelect: () => setConfirmReset(true),
                                disabled: loadingRecs || isResearchingAll,
                                danger: true,
                            }] : []),
                        ]}
                    />
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
                    {/* Filter card — map-only. Collapsed by default on mobile,
                        expanded on desktop. Affects only the markers on the map. */}
                    {(filterOptions.cuisines.length > 0 || filterOptions.prices.length > 0) && (
                        <div className="border border-slate-200 bg-slate-50 rounded-2xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setFiltersExpanded(v => !v)}
                                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 md:py-2 text-end hover:bg-slate-100/60 transition-colors"
                                aria-expanded={filtersExpanded}
                            >
                                <span className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-slate-500" />
                                    <span className="text-xs font-black text-slate-700">סינון מפה</span>
                                    {activeFilterCount > 0 && (
                                        <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-slate-700 text-white text-[10px] font-black">{activeFilterCount}</span>
                                    )}
                                </span>
                                <span className="flex items-center gap-2">
                                    {activeFilterCount > 0 && (
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={(e) => { e.stopPropagation(); clearAllFilters(); }}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); clearAllFilters(); } }}
                                            className="text-[11px] font-bold text-slate-500 hover:text-red-600 underline underline-offset-2"
                                        >
                                            נקה הכל
                                        </span>
                                    )}
                                    <ChevronLeft className={`w-4 h-4 text-slate-400 transition-transform ${filtersExpanded ? '-rotate-90' : ''}`} />
                                </span>
                            </button>
                            {filtersExpanded && (
                                <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-slate-200/70">
                                    {filterOptions.cuisines.length > 0 && (
                                        <FilterChipGroup
                                            label="סוג"
                                            options={filterOptions.cuisines.map(([k, n]) => ({ key: k, label: k, count: n }))}
                                            selected={filterCuisines}
                                            onToggle={(k) => setFilterCuisines(prev => toggleSetMember(prev, k))}
                                            colorClass="orange"
                                            maxVisible={6}
                                        />
                                    )}
                                    {filterOptions.prices.length > 0 && (
                                        <FilterChipGroup
                                            label="מחיר"
                                            options={filterOptions.prices.map(p => ({ key: p.key, label: p.label, count: p.count }))}
                                            selected={filterPrices}
                                            onToggle={(k) => setFilterPrices(prev => toggleSetMember(prev, k))}
                                            colorClass="emerald"
                                            maxVisible={6}
                                        />
                                    )}
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
                        onCityChange={(city) => setSelectedCity(city ?? 'all')}
                        title="מפת מסעדות"
                        savedNames={savedRestaurantNames}
                        onAddToList={(item) => {
                            const r = (item as any).raw as Restaurant | undefined;
                            if (!r) return;
                            handleToggleRec(r, (item as any).categoryTitle || 'AI');
                        }}
                        onRemoveFromList={userCanEdit ? (item) => {
                            const r = (item as any).raw as Restaurant | undefined;
                            if (!r) return;
                            performDeleteRestaurant(r.id);
                        } : undefined}
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
                                            <div className="flex flex-wrap items-center gap-3">
                                                <button
                                                    onClick={() => researchAllCities()}
                                                    disabled={isResearchingAll}
                                                    title="קורא ל-Gemini grounded SEARCH דרך ה-Worker שלנו. עלות: ~$0.05 לקריאה. תוצאה מאומתת באינטרנט."
                                                    className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-8 py-3 rounded-2xl text-base font-black shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-60"
                                                >
                                                    {isResearchingAll
                                                        ? <><Loader2 className="w-5 h-5 animate-spin" /> סורק ({researchProgress.current}/{researchProgress.total})</>
                                                        : <><BrainCircuit className="w-5 h-5" /> המלצות AI לכל הטיול</>}
                                                </button>
                                                {/* Free path — copy prompt to external AI, paste JSON back */}
                                                <button
                                                    onClick={() => setPasteModalOpen(true)}
                                                    title="פתח פרומפט להעתיק ל-ChatGPT/Gemini/Claude (חינמי ב-tier שלכם). הדבק חזרה את ה-JSON. עלות לאתר: 0 ש״ח."
                                                    className="bg-white text-emerald-700 border-2 border-emerald-600 px-5 py-3 rounded-2xl text-base font-black shadow-sm hover:bg-emerald-50 transition-all flex items-center gap-2"
                                                >
                                                    <ClipboardPaste className="w-5 h-5" /> הדבק ידנית מ-AI חיצוני (חינמי)
                                                </button>
                                            </div>

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
                                            {/* Dedupe + reorder categories at render — legacy duplicates
                                                are dropped, and near-hotel categories are demoted to
                                                the END of the list (per-user request). */}
                                            {(() => {
                                                const seen = new Set<string>();
                                                const dedup = aiCategories.filter(c => {
                                                    const key = displayTitle(c.title);
                                                    if (seen.has(key)) return false;
                                                    seen.add(key);
                                                    return true;
                                                });
                                                const main = dedup.filter(c => !isNearHotelTitle(c.title));
                                                const nearHotel = dedup.filter(c => isNearHotelTitle(c.title));
                                                const uniqueCats = [...main, ...nearHotel];
                                                return (
                                                    <div className="mb-3 overflow-x-auto md:overflow-visible pb-2 scrollbar-hide">
                                                        <div className="flex flex-nowrap md:flex-wrap gap-1.5 md:gap-2">
                                                            <button onClick={() => setSelectedCategory('all')} className={`min-h-8 md:min-h-9 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-2xs md:text-xs font-bold border whitespace-nowrap ${selectedCategory === 'all' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200'}`}>הכל</button>
                                                            {uniqueCats.map(c => (
                                                                <CategoryChip
                                                                    key={c.id}
                                                                    label={displayTitle(c.title)}
                                                                    isActive={selectedCategory === c.id}
                                                                    isRefreshing={refreshingCategoryId === c.id}
                                                                    canRefresh={ownerOnly}
                                                                    refreshDisabled={refreshingCategoryId !== null}
                                                                    onSelect={() => setSelectedCategory(c.id)}
                                                                    onRefresh={() => refreshSingleCategory(c)}
                                                                    theme="orange"
                                                                />
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
                    onRefreshGoogle={(patch) => {
                        // Apply the patch to whichever list the open place belongs to.
                        const idMatch = (r: { id: string }) => r.id === selectedPlace.id;
                        const inSaved = trip.restaurants.some(c => c.restaurants.some(idMatch));
                        if (inSaved) {
                            const nextSaved = trip.restaurants.map(cat => ({
                                ...cat,
                                restaurants: cat.restaurants.map(r => idMatch(r) ? { ...r, ...patch } : r),
                            }));
                            onUpdateTrip({ ...trip, restaurants: nextSaved });
                        } else {
                            applyAiRestaurantPatch(selectedPlace.id, patch);
                        }
                        // Reflect immediately in the open modal too.
                        setSelectedPlace(prev => prev ? { ...prev, ...patch } : prev);
                    }}
                    onDelete={() => {
                        // Removes this one restaurant from whichever list it
                        // lives in (saved list OR ai categories). Closes the
                        // modal after the delete so the user immediately sees
                        // the trimmed list.
                        const idMatch = (r: { id: string }) => r.id === selectedPlace.id;
                        const inSaved = trip.restaurants.some(c => c.restaurants.some(idMatch));
                        if (inSaved) {
                            const nextSaved = trip.restaurants.map(cat => ({
                                ...cat,
                                restaurants: cat.restaurants.filter(r => !idMatch(r)),
                            })).filter(c => (c.restaurants?.length || 0) > 0);
                            onUpdateTrip({ ...trip, restaurants: nextSaved });
                        } else {
                            const next = aiCategories.map(c => ({
                                ...c,
                                restaurants: c.restaurants.filter(r => !idMatch(r)),
                            })).filter(c => (c.restaurants?.length || 0) > 0);
                            setAiCategories(next);
                            persistAiRestaurants(next);
                        }
                        setSelectedPlace(null);
                        toast.success('המסעדה הוסרה מהטיול');
                    }}
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
            {(() => {
                if (!confirmDeleteCategory) return null;
                const cat = aiCategories.find(c => c.id === confirmDeleteCategory);
                if (!cat) return null;
                return (
                    <ConfirmModal
                        isOpen={true}
                        title={`למחוק את הקטגוריה "${displayTitle(cat.title)}"?`}
                        message={`${cat.restaurants.length} מסעדות בקטגוריה זו יימחקו לצמיתות. הפעולה אינה ניתנת לביטול.`}
                        confirmText="מחק קטגוריה"
                        cancelText="ביטול"
                        isDangerous
                        onConfirm={() => handleDeleteCategory(confirmDeleteCategory)}
                        onClose={() => setConfirmDeleteCategory(null)}
                    />
                );
            })()}
            <ConfirmModal
                isOpen={showRefreshLimitModal}
                title="הגעת למכסה החודשית"
                message="הגעת למכסת הרענון החודשית לקטגוריה זו (1 רענון בתשלום + 3 רענונים חינמיים). המכסה מתאפסת בתחילת כל חודש."
                confirmText="הבנתי"
                cancelText=""
                onConfirm={() => setShowRefreshLimitModal(false)}
                onClose={() => setShowRefreshLimitModal(false)}
            />
            <ConfirmModal
                isOpen={confirmDeleteNotFound}
                title={`למחוק ${notFoundCount} מסעדות שלא נמצאו ב-Google Maps?`}
                message="המסעדות הללו לא נמצאו בחיפוש של Google Places. ייתכן שהן סגורות או לא קיימות. הפעולה אינה ניתנת לביטול."
                confirmText="מחק הכל"
                cancelText="ביטול"
                isDangerous
                onConfirm={handleDeleteAllNotFound}
                onClose={() => setConfirmDeleteNotFound(false)}
            />
            <ConfirmModal
                isOpen={!!bulkConfirm}
                title={`לרענן ${bulkConfirm?.count ?? 0} מקומות מ-Google?`}
                message={`פעולה זו תקרא ל-Google Places עבור ${bulkConfirm?.count ?? 0} מקומות (כ-₪${(bulkConfirm?.estimateIls ?? 0).toFixed(2)}). מקומות שכבר עודכנו ב-30 הימים האחרונים יישלפו מהקאש בחינם, אז העלות בפועל עשויה להיות נמוכה יותר.`}
                confirmText="כן, רענן"
                cancelText="ביטול"
                onConfirm={() => {
                    const mode = bulkConfirm?.mode;
                    setBulkConfirm(null);
                    if (mode === 'saved') executeBulkRefreshSaved();
                    else if (mode === 'ai') executeBulkRefreshAi();
                }}
                onClose={() => setBulkConfirm(null)}
            />
            <ConfirmModal
                isOpen={!!confirmDeleteId}
                title="להסיר את המסעדה מהרשימה?"
                message="המסעדה תוסר מהרשימה השמורה שלך. ניתן יהיה להוסיף אותה שוב מ-המלצות AI."
                confirmText="הסר"
                cancelText="ביטול"
                isDangerous
                onConfirm={() => confirmDeleteId && performDeleteRestaurant(confirmDeleteId)}
                onClose={() => setConfirmDeleteId(null)}
            />
            <ConfirmModal
                isOpen={confirmNearHotel}
                title="מצא מסעדות באזור המלון"
                message={(() => {
                    const n = (trip.hotels || []).filter(h => typeof h.lat === 'number' && typeof h.lng === 'number').length;
                    return `ננתח את ${n === 1 ? 'המלון שלך' : `${n} המלונות שלך`} ונחפש את המסעדות הכי טובות במרחק של עד 15 דקות הליכה. ייקח עד ~${Math.max(8, n * 8)} שניות.`;
                })()}
                confirmText="כן, חפש"
                cancelText="ביטול"
                onConfirm={researchNearHotel}
                onClose={() => setConfirmNearHotel(false)}
            />
            {/* Free-path paste-from-external-AI modal — opened by the green
                sibling button next to "המלצות AI לכל הטיול". Reuses the
                services/externalAiImport machinery. */}
            <ExternalAiPasteModal
                isOpen={pasteModalOpen}
                onClose={() => { setPasteModalOpen(false); setPasteScopeCategory(undefined); }}
                trip={trip}
                kind="restaurants"
                onApply={onUpdateTrip}
                scopeCity={selectedCity !== 'all' ? selectedCity : undefined}
                scopeCategory={pasteScopeCategory}
            />
        </div>
    );
};

const RestaurantRow: React.FC<{ data: ExtendedRestaurant, onSaveNote: (n: string) => void, onUpdate: (updates: Partial<Restaurant>) => void, onDelete: () => void, onSelect: () => void }> = ({ data, onSaveNote, onUpdate, onDelete, onSelect }) => {

    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState(data.notes || '');

    // Intelligent Mappers
    // Don't include data.location — "Bangkok, Thailand" would force every
    // venue into the Thai branch of getFoodImage. Cuisine should be derived
    // from cuisine / categoryTitle only.
    const tags = [data.cuisine || '', data.categoryTitle || ''];
    const { url: mappedUrl, label: visualLabel } = getFoodImage(data.name || '', data.description || '', tags);
    const visuals = getCuisineVisuals(data.cuisine || visualLabel);

    // Fallback Image. Priority order:
    //   1. data.googlePhotoUrl   — fresh Google Places photo (user-refreshed)
    //   2. data.imageUrl         — previously resolved Wikipedia/Wikidata image
    //   3. mappedUrl             — cuisine-based stock photo
    // Then async-upgrade from Wikipedia only if no Google photo set yet.
    const [resolvedSrc, setResolvedSrc] = useState<string>(data.googlePhotoUrl || data.imageUrl || mappedUrl);

    useEffect(() => {
        if (data.googlePhotoUrl) { setResolvedSrc(data.googlePhotoUrl); return; }
        if (data.imageUrl) { setResolvedSrc(data.imageUrl); }
    }, [data.googlePhotoUrl, data.imageUrl]);

    // Lazy Wikipedia upgrade — fires only when this row scrolls into view,
    // so a long restaurant list doesn't burst hundreds of requests at mount.
    const searchName = getEnglishName({
        name: data.name,
        nameEnglish: (data as any).nameEnglish,
        location: data.location,
    });
    const { ref: lazyRef, resolvedUrl } = useLazyPlaceImage({
        name: searchName,
        city: data.location || '',
        type: 'restaurant',
        skip: !!data.googlePhotoUrl || !!data.imageUrl,
        onResolved: url => onUpdate({ imageUrl: url }),
    });
    useEffect(() => {
        if (resolvedUrl) setResolvedSrc(resolvedUrl);
    }, [resolvedUrl]);

    const imageSrc = resolvedSrc;

    // Toggle Heart
    const toggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        onUpdate({ isFavorite: !data.isFavorite });
    };

    const saveNote = () => { onSaveNote(noteText); setIsEditingNote(false); };

    return (
        <div
            ref={lazyRef}
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
                            {data.googleNotFound && (
                                <div
                                    title="לא נמצא ב-Google Maps — ייתכן שהמקום סגור או לא קיים"
                                    className="flex items-center gap-0.5 text-2xs font-black text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded"
                                >
                                    <X className="w-3 h-3" />
                                    <span>לא נמצא</span>
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
