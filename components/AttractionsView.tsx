import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Trip, Attraction, AttractionCategory } from '../types';
import { MapPin, Ticket, Star, Landmark, Sparkles, Filter as FilterIcon, StickyNote, Plus, Loader2, BrainCircuit, RotateCw, RefreshCw, Navigation, Calendar, Clock, Trash2, Search, X, List, Map as MapIcon, Trophy, Mountain, ShoppingBag, Palmtree, DollarSign, LayoutGrid, Heart, Hotel, ChevronLeft as ChevronLeftIcon, ClipboardPaste } from 'lucide-react';
import { ExternalAiPasteModal } from './ExternalAiPasteModal';
// cleaned imports
import { getTripCities, locationMatchesCity, displayCityName, cityKey, extractRobustCity } from '../utils/geoData';
import { getAttractionImage } from '../services/imageMapper';
import { getEnglishName } from '../utils/displayName';
import { useLazyPlaceImage } from '../hooks/useLazyPlaceImage';
import { SYSTEM_PROMPT, generateWithFallback } from '../services/aiService';
import { CalendarDatePicker } from './CalendarDatePicker';
import { UnifiedMapView } from './UnifiedMapView';
import { ThinkingLoader } from './ThinkingLoader';
import { PlaceCard } from './PlaceCard';
import { GlobalPlaceModal } from './GlobalPlaceModal';
import { ConfirmModal } from './ConfirmModal';
import { Tabs } from './ui/Tabs';
import { SkeletonCardGrid } from './ui/Skeleton';
import { canEditTrip, isTripOwner, isViewerOnly } from '../utils/tripPermissions';
import { useAuth } from '../contexts/AuthContext';
import { getUserPremiumState, markPremiumRunUsed, getCategoryRefreshes, incrementCategoryRefresh, CategoryRefreshEntry, getPlacesSpendToday, incrementPlacesSpend, PLACES_ILS_PER_CALL } from '../services/firestoreService';
import { isPlacesDisabled } from '../services/placesService';
import { getLocalAI, setLocalAI } from '../utils/localTripAI';
import { isAdmin } from '../utils/isAdmin';
import { findClosedPlaces } from '../utils/closedPlaceCheck';

import { cleanTextForMap } from '../utils/textUtils';
import { geocodePlacesBatch, photonGeocodeRich } from '../utils/geocodePlaces';
import { isPlaceInTripScope, resolvePlaceCity } from '../utils/tripScope';
import { safeMapsUrl } from '../utils/mapsUrl';
import { detectCountryCode } from '../utils/countryCodes';
import { normalizeNearHotelTitle, isNearHotelTitle } from '../utils/categoryTitle';
import { toast } from '../stores/useToastStore';
import { walkingMinutesBetween } from '../utils/walkingDistance';
import { attractionTypeToHebrew, priceToBucket, sortPriceKeys } from '../utils/cuisineLabels';
import { FilterChipGroup } from './FilterChipGroup';
import { ActionsMenu } from './ActionsMenu';
import { CategoryChip } from './CategoryChip';
import { useIsMobile } from '../hooks/useMediaQuery';
import { normalizeCityForChip, isProvinceOrCountryName } from '../utils/cityNormalize';


// Enhanced Visuals with Gradients for Attractions
const getAttractionVisuals = (type: string = '') => {
    const t = type.toLowerCase();
    if (t.includes('must') || t.includes('top')) return { icon: '🌟', gradient: 'bg-gradient-to-br from-purple-600 to-indigo-800 text-white', label: 'Must See' };
    if (t.includes('nature') || t.includes('park') || t.includes('garden')) return { icon: '🌿', gradient: 'bg-gradient-to-br from-emerald-500 to-green-700 text-white', label: 'Nature' };
    if (t.includes('beach') || t.includes('island') || t.includes('sea')) return { icon: '🏖️', gradient: 'bg-gradient-to-br from-cyan-400 to-blue-600 text-white', label: 'Beach & Sea' };
    if (t.includes('museum') || t.includes('culture') || t.includes('history')) return { icon: '🏛️', gradient: 'bg-gradient-to-br from-amber-600 to-orange-800 text-white', label: 'Culture' };
    if (t.includes('shop') || t.includes('market') || t.includes('mall')) return { icon: '🛍️', gradient: 'bg-gradient-to-br from-pink-500 to-rose-700 text-white', label: 'Shopping' };
    if (t.includes('night') || t.includes('club') || t.includes('bar')) return { icon: '🥂', gradient: 'bg-gradient-to-br from-slate-800 to-black text-white', label: 'Nightlife' };
    if (t.includes('temple') || t.includes('religion')) return { icon: '⛩️', gradient: 'bg-gradient-to-br from-orange-500 to-amber-600 text-white', label: 'Temple' };
    return { icon: '🎫', gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white', label: 'Attraction' };
};

// Sort attractions: Favorites first, then Rating
const sortAttractions = (list: Attraction[]) => {
    return list.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return (b.rating || 0) - (a.rating || 0);
    });
};

// Match an attraction against a city chip. Checks several fields because
// non-grounded LLMs (Groq, OpenRouter free) often embed the city in the
// NAME ("Vlora Castle") rather than populating `location` properly.
const attractionMatchesCity = (attraction: Pick<Attraction, 'location' | 'region' | 'description' | 'name' | 'nameEnglish'>, city: string): boolean => {
    return locationMatchesCity(attraction.location || '', city)
        || locationMatchesCity(attraction.region || '', city)
        || locationMatchesCity(attraction.name || '', city)
        || locationMatchesCity(attraction.nameEnglish || '', city)
        || locationMatchesCity(attraction.description || '', city);
};

// Map a thrown AI/network error to a Hebrew toast message so the user can
// self-diagnose quota vs billing vs connectivity issues without opening
// devtools. Falls back to the caller-supplied label when no pattern matches.
const describeAiError = (err: unknown, fallback: string): string => {
    const msg = String((err as any)?.message || err || '').toLowerCase();
    if (!msg) return fallback;
    if (msg.includes('perday') || msg.includes('per_day') || msg.includes('per day') || msg.includes('quota') || msg.includes('429')) {
        return 'מכסת ה-AI היומית של Google נגמרה. נסה שוב מחר או הפעל חשבון בתשלום.';
    }
    if (msg.includes('freetier') || msg.includes('free tier') || msg.includes('limit: 0') || msg.includes('billing') || msg.includes('payment')) {
        return 'חשבון Google Cloud דורש הפעלת חיוב כדי להמשיך.';
    }
    if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('etimedout') || msg.includes('aborted')) {
        return 'התשובה מ-AI נקטעה (timeout). נסה שוב.';
    }
    if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('networkerror')) {
        return 'בעיית חיבור לאינטרנט. בדוק את הרשת ונסה שוב.';
    }
    return fallback;
};

const AttractionRecommendationCard: React.FC<{
    rec: any,
    tripDestination: string,
    tripDestinationEnglish?: string,
    isAdded: boolean,
    onAdd: (rec: any, cat: string) => void,
    onClick: () => void,
}> = ({ rec, tripDestination, tripDestinationEnglish, isAdded, onAdd, onClick }) => {
    const nameForMap = cleanTextForMap(rec.name);
    const locationForMap = cleanTextForMap(rec.location) || cleanTextForMap(tripDestinationEnglish || tripDestination);
    const cityForMap = cleanTextForMap(rec.verifiedCity) || cleanTextForMap(rec.region) || cleanTextForMap(tripDestinationEnglish || tripDestination);
    const countryCode = detectCountryCode(rec.verifiedCountry, tripDestinationEnglish, tripDestination);
    const mapsUrl = safeMapsUrl(rec.googleMapsUrl, nameForMap, locationForMap, cityForMap, countryCode);
    const visuals = getAttractionVisuals(rec.type);

    return (
        <PlaceCard
            type="attraction"
            name={rec.name}
            nameEnglish={rec.nameEnglish}
            description={rec.description}
            location={rec.location}
            rating={rec.rating}
            attractionType={visuals.label}
            price={rec.price}
            mapsUrl={mapsUrl}
            isAdded={isAdded}
            onAdd={() => onAdd(rec, rec.categoryTitle || 'תכנון טיול')}
            onClick={onClick}
            recommendationSource={rec.recommendationSource}
            verification_needed={rec.verification_needed}
            geocodeFailed={rec.geocodeFailed}
            verificationStatus={rec.verificationStatus}
            photoUrl={rec.googlePhotoUrl}
            googleNotFound={rec.googleNotFound}
        />
    );
};

export const AttractionsView: React.FC<{ trip: Trip, onUpdateTrip: (t: Trip) => void }> = ({ trip, onUpdateTrip }) => {
    const [activeTab, setActiveTab] = useState<'my_list' | 'recommended'>('recommended');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    // Free-path paste-from-external-AI flow (Part B of the 2026-05-21 plan).
    const [pasteModalOpen, setPasteModalOpen] = useState(false);

    // Always-fresh trip ref so background geocoder doesn't clobber user
    // edits made while it's running (the "trip name got deleted" bug).
    const tripRef = useRef(trip);
    useEffect(() => { tripRef.current = trip; }, [trip]);

    // Premium-tier gating — only the trip OWNER gets one Gemini Pro
    // call per 30 days, on the very first AI Recommendations click.
    // Collaborators always run on the free chain.
    const { user } = useAuth();
    const userId = user?.uid;

    // Permission gate — viewers run AI but their results stay local-only.
    // Pass the current UID so the actual owner is recognized even when
    // they joined their own trip via a viewer link.
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
            .then(s => setPremiumLastUsedAt(s.lastPremiumRunAt_attractions ?? s.lastPremiumRunAt ?? 0))
            .catch(() => setPremiumLastUsedAt(0));
    }, [userId, ownerOnly]);
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const resolvePreferTier = (): 'paid' | 'free' => {
        if (!ownerOnly || !userId || premiumLastUsedAt === null) return 'free';
        return Date.now() - premiumLastUsedAt > THIRTY_DAYS_MS ? 'paid' : 'free';
    };
    const stampPremiumIfUsed = async (preferTier: 'paid' | 'free', producedResults: boolean) => {
        if (preferTier === 'paid' && producedResults && userId) {
            await markPremiumRunUsed(userId, 'attractions');
            setPremiumLastUsedAt(Date.now());
        }
    };

    // AI State — for viewers, hydrate from local-AI store on top of shared.
    const [aiCategories, setAiCategories] = useState<AttractionCategory[]>(() => {
        const shared = trip.aiAttractions || [];
        if (!viewerMode) return shared;
        const local = getLocalAI(trip.id).aiAttractions;
        return local && local.length > 0 ? local : shared;
    });

    const persistAiAttractions = (next: AttractionCategory[]) => {
        const latest = tripRef.current;
        if (userCanEdit) {
            onUpdateTrip({ ...latest, aiAttractions: next });
        } else {
            setLocalAI(latest.id, { aiAttractions: next });
        }
    };

    // Apply a Google Places enrichment patch to a single AI-recommended attraction.
    const applyAiAttractionPatch = (recId: string, patch: Partial<Attraction>) => {
        const next = aiCategories.map(c => ({
            ...c,
            attractions: c.attractions.map(a => a.id === recId ? { ...a, ...patch } : a),
        }));
        setAiCategories(next);
        persistAiAttractions(next);
    };

    // Admin-gated controls (bulk refresh, delete-all-not-found).
    const userIsAdmin = isAdmin(user);

    // Bulk "Refresh all from Google" — sequential enrichment with progress.
    const [bulkRefreshing, setBulkRefreshing] = useState<null | 'saved' | 'ai'>(null);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, updated: 0, skippedCached: 0 });
    const [confirmDeleteNotFound, setConfirmDeleteNotFound] = useState(false);

    const notFoundCount = useMemo(() => {
        const list = activeTab === 'my_list'
            ? trip.attractions.flatMap(c => c.attractions)
            : aiCategories.flatMap(c => c.attractions);
        return list.filter(a => (a as any).googleNotFound).length;
    }, [activeTab, trip.attractions, aiCategories]);

    const handleDeleteAllNotFound = () => {
        if (activeTab === 'my_list') {
            const next = trip.attractions.map(cat => ({
                ...cat,
                attractions: cat.attractions.filter(a => !(a as any).googleNotFound),
            }));
            onUpdateTrip({ ...trip, attractions: next });
        } else {
            const next = aiCategories.map(c => ({
                ...c,
                attractions: c.attractions.filter(a => !(a as any).googleNotFound),
            }));
            setAiCategories(next);
            persistAiAttractions(next);
        }
        toast.success(`נמחקו ${notFoundCount} אטרקציות שלא נמצאו ב-Google Maps`);
        setConfirmDeleteNotFound(false);
    };

    // Soft daily cap on Google Places spend (₪). Sized to absorb normal
    // exploration but block accidental bulk-refresh spikes — the May 11
    // incident charged ₪7.99 from a single click.
    const PLACES_DAILY_CAP_ILS = 5;
    const [bulkConfirm, setBulkConfirm] = useState<null | { mode: 'saved' | 'ai'; count: number; estimateIls: number }>(null);

    // Step 1: user taps the menu item → we cap-check, then open the confirm
    // modal. Step 2: confirm → executeBulkRefresh* runs the actual work.
    const handleBulkRefreshSaved = async () => {
        if (bulkRefreshing || !userId) return;
        const count = trip.attractions.flatMap(c => c.attractions).length;
        if (count === 0) { toast.info('אין אטרקציות שמורות לרענון'); return; }
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
        const count = aiCategories.flatMap(c => c.attractions).length;
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
        const flat = trip.attractions.flatMap(cat => cat.attractions.map(a => ({
            id: a.id,
            name: a.name,
            lat: a.lat,
            lng: a.lng,
            googlePlaceId: a.googlePlaceId,
            googleEnrichedAt: a.googleEnrichedAt,
        })));
        if (flat.length === 0) return;
        setBulkRefreshing('saved');
        setBulkProgress({ current: 0, total: flat.length, updated: 0, skippedCached: 0 });
        try {
            const { bulkEnrichPlaces, PlacesKeyError } = await import('../services/placesService');
            const outcome = await bulkEnrichPlaces(
                flat,
                (id, patch) => {
                    const next = trip.attractions.map(cat => ({
                        ...cat,
                        attractions: cat.attractions.map(a => a.id === id ? { ...a, ...patch } : a),
                    }));
                    onUpdateTrip({ ...trip, attractions: next });
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
            console.error('[GooglePlaces] bulk refresh saved attractions failed', err);
        } finally {
            setBulkRefreshing(null);
        }
    };

    const executeBulkRefreshAi = async () => {
        if (bulkRefreshing) return;
        const flat = aiCategories.flatMap(cat => cat.attractions.map(a => ({
            id: a.id,
            name: a.name,
            lat: a.lat,
            lng: a.lng,
            googlePlaceId: a.googlePlaceId,
            googleEnrichedAt: a.googleEnrichedAt,
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
                        attractions: c.attractions.map(a => a.id === id ? { ...a, ...patch } : a),
                    }));
                    setAiCategories(working);
                },
                (s) => setBulkProgress(s),
            );
            persistAiAttractions(working);
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
            console.error('[GooglePlaces] bulk refresh AI attractions failed', err);
        } finally {
            setBulkRefreshing(null);
        }
    };

    const [loadingRecs, setLoadingRecs] = useState(false);
    const [recError, setRecError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedRater, setSelectedRater] = useState<string>('all');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);
    const [isResearchingAll, setIsResearchingAll] = useState(false);
    const [researchProgress, setResearchProgress] = useState({ current: 0, total: 0 });

    const [selectedCity, setSelectedCity] = useState<string>('all');
    const [filterTypes, setFilterTypes] = useState<Set<string>>(new Set());
    const [filterPrices, setFilterPrices] = useState<Set<string>>(new Set());
    const [textQuery, setTextQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Attraction[] | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<Attraction | null>(null);

    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmNearHotel, setConfirmNearHotel] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [searchExpanded, setSearchExpanded] = useState(false);
    useEffect(() => { setSearchExpanded(false); }, [activeTab]);
    const isMobile = useIsMobile();
    const [filtersExpanded, setFiltersExpanded] = useState(!isMobile);
    // Background-geocoding progress so the map view can show a loading
    // banner when AI results are still being resolved to lat/lng. Failed
    // items (`geocodeFailed: true`) live on the attractions themselves
    // and surface as a separate warning banner.
    const [geocodingInFlight, setGeocodingInFlight] = useState(0);

    // Per-category refresh state
    const [categoryRefreshes, setCategoryRefreshes] = useState<Record<string, CategoryRefreshEntry>>({});
    const [refreshingCategoryId, setRefreshingCategoryId] = useState<string | null>(null);
    const [showRefreshLimitModal, setShowRefreshLimitModal] = useState(false);
    useEffect(() => {
        if (!userId) return;
        getCategoryRefreshes(userId).then(setCategoryRefreshes).catch(() => {});
    }, [userId]);

    // Nuke the saved AI research for this trip and start a fresh multi-city run
    // Wipe cached AI attractions — user starts fresh research manually
    const handleResetResearch = () => {
        setAiCategories([]);
        persistAiAttractions([]);
        setSelectedCategory('all');
        setSelectedRater('all');
        setConfirmReset(false);
        setTimeout(() => researchAllCities([]), 0);
    };

    const attractionsData = trip.attractions || [];

    useEffect(() => {
        if (trip.aiAttractions && trip.aiAttractions.length > 0) setAiCategories(trip.aiAttractions);
    }, [trip.aiAttractions]);

    // Exclude flight-only cities (layovers like AUH) — they're not travel destinations
    // the user actually visits, so they shouldn't pollute the attraction-research scope.
    const tripCities = useMemo(() => getTripCities(trip, { excludeFlightOnly: true, lang: 'en' }), [trip]);

    // City chip strip — same approach as RestaurantsView. Aggressive
    // canonical normalization collapses Bangkok / Ko Chang variants to a
    // single chip; province / country names are dropped.
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
        // Multi-city strings are trip-level destinations, not single cities. Reject
        // them so dirty data like h.city = "Bangkok - Pattaya - Ko Chang" doesn't
        // become a chip.
        const isMultiCityString = (s: string) => /[-–—&,]/.test(s);

        sortedHotels.forEach(({ h }) => {
            const extracted = extractRobustCity(h.address || '', h.name || '', trip);
            const fallbackCity = h.city && !isMultiCityString(h.city) ? h.city : '';
            // If extractRobustCity returned a country (e.g. "Vlorë, Albania"
            // resolves to "Albania" before "Vlorë" because Albania is in
            // WORLD_DESTINATIONS), discard it and try h.city instead. Without
            // this, the chip strip silently drops cities that getTripCities
            // (the bottom UI) still shows. See RestaurantsView for matching fix.
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
        // a hotel's data is missing or dirty.
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

        // Defensive: country-typed chips lose to city-typed chips. The chip
        // generator already rejects names in PROVINCE_OR_COUNTRY, but if a
        // destination string ever slips a country through (e.g. a new
        // destination we forgot to add to the list), the tally below would
        // assign EVERY item to the country chip because of the early-exit on
        // first match. Sorting countries to the end of orderedKeys means
        // real city chips get a chance to claim each item first.
        orderedKeys.sort((a, b) => {
            const aCountry = isProvinceOrCountryName(cityByKey.get(a)!.display) ? 1 : 0;
            const bCountry = isProvinceOrCountryName(cityByKey.get(b)!.display) ? 1 : 0;
            return aCountry - bCountry;
        });

        // Tally checks the same fields as attractionMatchesCity — see that
        // function's comment for why we look at name + description too.
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
                    return;
                }
            }
        };
        // Skip items that are unverified or whose match was rejected — they
        // would otherwise inflate the chip count for a city the research
        // never actually returned hits for (e.g. Koh Chang showing "3"
        // when the AI run returned zero attractions there).
        const isCountable = (a: { verificationStatus?: string }) =>
            a.verificationStatus !== 'not_found' && a.verificationStatus !== 'ambiguous';
        const walk = (cats?: { region?: string; attractions: { region?: string; location?: string; name?: string; nameEnglish?: string; description?: string; verificationStatus?: string }[] }[]) => {
            (cats || []).forEach(cat => cat.attractions.forEach(a => {
                if (isCountable(a)) tally(a.region || cat.region, a.location, a.name, a.nameEnglish, a.description);
            }));
        };
        walk(trip.attractions);
        walk(trip.aiAttractions);

        return orderedKeys.map(k => ({
            key: k,
            display: cityByKey.get(k)!.display,
            count: cityByKey.get(k)!.count,
        }));
    }, [trip.attractions, trip.aiAttractions, trip.hotels]);

    // When switching to map view, auto-focus on the first trip city (= the
    // city of the earliest-checkin hotel) instead of staying on "all route".
    // Honors any explicit city pick the user has already made.
    useEffect(() => {
        if (viewMode !== 'map') return;
        if (selectedCity !== 'all') return;
        const first = presentCities[0]?.display;
        if (first) setSelectedCity(first);
    }, [viewMode, presentCities, selectedCity]);

    const itemWalkingMinutes = useCallback((a: { lat?: number; lng?: number }): number | null => {
        if (typeof a.lat !== 'number' || typeof a.lng !== 'number') return null;
        let best = Infinity;
        (trip.hotels || []).forEach(h => {
            if (typeof h.lat === 'number' && typeof h.lng === 'number') {
                const m = walkingMinutesBetween({ lat: a.lat!, lng: a.lng! }, { lat: h.lat, lng: h.lng });
                if (m < best) best = m;
            }
        });
        return Number.isFinite(best) ? best : null;
    }, [trip.hotels]);

    const filterOptions = useMemo(() => {
        const types = new Map<string, number>();
        const prices = new Map<string, { label: string; count: number }>();
        const consider = (a: Attraction) => {
            const typeHe = attractionTypeToHebrew(a.type || a.activity_type);
            types.set(typeHe, (types.get(typeHe) || 0) + 1);
            const bucket = priceToBucket(a.price);
            if (bucket) {
                const existing = prices.get(bucket.key);
                prices.set(bucket.key, { label: bucket.label, count: (existing?.count || 0) + 1 });
            }
        };
        trip.attractions.forEach(c => c.attractions.forEach(consider));
        (trip.aiAttractions || []).forEach(c => c.attractions.forEach(consider));
        return {
            types: Array.from(types.entries()).sort((a, b) => b[1] - a[1]),
            prices: Array.from(prices.entries())
                .map(([key, v]) => ({ key, label: v.label, count: v.count }))
                .sort((a, b) => sortPriceKeys(a.key, b.key)),
        };
    }, [trip.attractions, trip.aiAttractions]);

    const passesItemFilters = useCallback((a: Attraction): boolean => {
        if (viewMode !== 'map') return true; // filters scoped to map only
        if (filterTypes.size > 0) {
            const t = attractionTypeToHebrew(a.type || a.activity_type);
            if (!filterTypes.has(t)) return false;
        }
        if (filterPrices.size > 0) {
            const bucket = priceToBucket(a.price);
            if (!bucket || !filterPrices.has(bucket.key)) return false;
        }
        return true;
    }, [viewMode, filterTypes, filterPrices]);

    const toggleSetMember = (set: Set<string>, value: string): Set<string> => {
        const next = new Set(set);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
    };
    const activeFilterCount =
        (filterTypes.size > 0 ? 1 : 0) +
        (filterPrices.size > 0 ? 1 : 0);
    const clearAllFilters = () => {
        setFilterTypes(new Set());
        setFilterPrices(new Set());
    };

    // --- AI Logic ---
    const handleTextSearch = async () => {
        if (!textQuery.trim()) return;
        setIsSearching(true);
        setSearchResults(null);
        try {
            const prompt = `Search Query: "${textQuery}"
            Destination Context: ${trip.destination}

            Mission: Find accurate attraction results for this query.
            - If specific name (e.g. "Eiffel Tower"): Find it.
            - If category (e.g. "Museums"): Find top examples.
            - If vague ("fun for kids"): Recommend suitable spots.

            CRITICAL: 'name' field must be in English. Description in Hebrew.
            NO TRANSPORT DATA: Do NOT return flights, trains, or hotels. ONLY ATTRACTIONS.
             OUTPUT JSON ONLY:
            { "results": [{ "name", "description", "location", "rating", "type", "price", "recommendationSource", "googleMapsUrl", "business_status", "verification_needed" }] } `;

            const response = await generateWithFallback(null, [{ role: 'user', parts: [{ text: prompt }] }], { responseMimeType: 'application/json', temperature: 0.1 }, 'SEARCH');
            const data = JSON.parse(response.text || '{}');
            if (data.results) {
                const operational = data.results.filter((r: any) => r.business_status === 'OPERATIONAL').map((r: any, i: number) => ({ ...r, id: `search-attr-${i}`, categoryTitle: 'תוצאות חיפוש' }));
                // Trip-scope filter — same logic as RestaurantsView. Drops are
                // toast-flagged; if every result is out of scope we show them
                // anyway since the user explicitly searched for it.
                const inScope = operational.filter((r: any) => isPlaceInTripScope(trip, { location: r.location, region: r.region, description: r.description }));
                const droppedCount = operational.length - inScope.length;
                const valid = inScope.length > 0 ? inScope : operational;
                if (droppedCount > 0 && inScope.length > 0) {
                    toast.warning(`סוננו ${droppedCount} תוצאות מחוץ לטיול`);
                } else if (droppedCount > 0 && inScope.length === 0) {
                    toast.info(`כל התוצאות מחוץ לטיול — מציג בכל זאת`);
                }
                setSearchResults(valid);
                if (textQuery.trim()) {
                    const current = trip.customAttractionCategories || [];
                    if (!current.includes(textQuery.trim())) onUpdateTrip({ ...trip, customAttractionCategories: [...current, textQuery.trim()] });
                }
            }
        } catch (e) { console.error(e); } finally { setIsSearching(false); }
    };

    const clearSearch = () => { setTextQuery(''); setSearchResults(null); };

    const initiateResearch = (city?: string) => {
        if (city) setSelectedCity(city);
        const cityEn = city ? displayCityName(city, 'en') : (trip.destinationEnglish || displayCityName(tripCities[0], 'en'));
        fetchRecommendations(true, cityEn);
    };

    // --- Near-Hotel Research ---
    // Asks the AI for the best attractions of any type within a 15-minute
    // walk of each hotel and saves one category per hotel into trip.aiAttractions.
    const researchNearHotel = async () => {
        setConfirmNearHotel(false);
        const allHotels = trip.hotels || [];
        if (allHotels.length === 0) {
            toast.warning('הוסף קודם מלון לטיול כדי לחפש אטרקציות בסביבתו.');
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
            // Persist enriched coords back to the trip so future refreshes use them.
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
            toast.warning('אף מלון בטיול אינו מאותר במפה — הוסף כתובת מלאה כדי לחפש אטרקציות בסביבתו.');
            return;
        }

        setIsResearchingAll(true);
        setRecError('');
        setResearchProgress({ current: 0, total: hotels.length });
        const preferTier = resolvePreferTier();
        let accumulated: AttractionCategory[] = [...aiCategories];

        try {
            for (let i = 0; i < hotels.length; i++) {
                const hotel = hotels[i];
                setResearchProgress({ current: i + 1, total: hotels.length });
                const cityEn = displayCityName(hotel.city || trip.destination || '', 'en') || hotel.city || trip.destination || '';
                const catTitle = '🏨 קרוב למלון';
                const catId = `near-hotel-att-${hotel.id}`;

                const prompt = `Find ~10 BEST attractions / things to do within a 15-minute walk (≈1.2 km radius) of "${hotel.name}" at "${hotel.address}" (lat ${hotel.lat}, lng ${hotel.lng}) in ${cityEn}.

Include a WIDE VARIETY of types (DO NOT return all the same type):
- Landmarks, viewpoints, photo spots
- Museums, galleries, cultural sites
- Parks, gardens, beaches
- Markets, shopping streets
- Temples, religious sites
- Nightlife, bars, entertainment
- Quirky / hidden gems

HARD RULES:
- Walking distance ≤ 1.2 km from the hotel coordinates above.
- Each place MUST currently be operational. Omit closed/relocated places. Set "business_status" to "OPERATIONAL".
- Type MUST VARY across the list.
- Description in Hebrew, 1–2 sentences.
- Return JSON ONLY:
  { "attractions": [{ "name", "description", "location", "type", "price", "googleMapsUrl", "rating" (number), "recommendationSource", "business_status" }] }`;

                try {
                    const response = await generateWithFallback(null, [{ role: 'user', parts: [{ text: prompt }] }], { responseMimeType: 'application/json', temperature: 0.2 }, 'SEARCH', preferTier);
                    const data = JSON.parse(response.text || '{}');
                    const rawList: any[] = Array.isArray(data.attractions) ? data.attractions : (Array.isArray(data) ? data : []);
                    const cleaned = rawList
                        .filter((a: any) => !a.business_status || a.business_status === 'OPERATIONAL')
                        .map((a: any, j: number) => ({
                            ...a,
                            id: `near-hotel-att-${hotel.id}-${Date.now()}-${j}`,
                            region: hotel.city || cityEn,
                            categoryTitle: catTitle,
                        }));

                    if (cleaned.length > 0) {
                        const newCat: AttractionCategory = {
                            id: catId,
                            title: catTitle,
                            region: hotel.city || cityEn,
                            attractions: cleaned,
                        };
                        const existingIdx = accumulated.findIndex(c => c.id === catId);
                        if (existingIdx >= 0) {
                            accumulated[existingIdx] = newCat;
                        } else {
                            // Place near-hotel categories at position 5 (or end if
                            // there are fewer than 4 existing categories). They're
                            // a useful filter but not the headline; the main
                            // research categories should appear first.
                            const insertAt = Math.min(4, accumulated.length);
                            accumulated = [...accumulated.slice(0, insertAt), newCat, ...accumulated.slice(insertAt)];
                        }
                    }
                } catch (e: any) {
                    console.error(`Near-hotel attractions research failed for ${hotel.name}:`, e);
                    const msg = e?.message || '';
                    if (/PerDay/i.test(msg) || /per_day/i.test(msg)) {
                        setRecError('מכסת ה-AI היומית מוצתה. נסה שוב מחר.');
                        break;
                    }
                }
            }

            setAiCategories(accumulated);
            persistAiAttractions(accumulated);
            await stampPremiumIfUsed(preferTier, accumulated.length > aiCategories.length);
            geocodeAndPersistAttractions(accumulated);
            toast.success('סיימנו לחפש אטרקציות באזור המלון');
        } catch (e) {
            console.error('Critical error in researchNearHotel (attractions):', e);
            setRecError('שגיאה בחיפוש בקרבת המלון.');
        } finally {
            setIsResearchingAll(false);
            setResearchProgress({ current: 0, total: 0 });
        }
    };

    const researchAllCities = async (baseCategories: AttractionCategory[] = aiCategories) => {
        setIsResearchingAll(true);
        setRecError('');
        const cities = tripCities;
        setResearchProgress({ current: 0, total: cities.length });

        // Lock premium tier ONCE for the whole multi-city run.
        const preferTier = resolvePreferTier();

        try {
            let accumulatedCategories: AttractionCategory[] = [...baseCategories];

            for (let i = 0; i < cities.length; i++) {
                setResearchProgress({ current: i + 1, total: cities.length });
                const city = cities[i];
                // Translate Hebrew display name to English for the AI prompt
                const cityEn = displayCityName(city, 'en');

                try {
                    const prompt = createResearchPrompt(cityEn);
                    const response = await generateWithFallback(null, [{ role: 'user', parts: [{ text: prompt }] }], { responseMimeType: 'application/json', temperature: 0.1 }, 'SEARCH', preferTier);
                    const rawData = JSON.parse(response.text || '{}');

                    // ROBUST PARSER: Handle { categories: [...], categories: {...} }
                    let categoriesList: any[] = [];
                    if (rawData.categories) {
                        if (Array.isArray(rawData.categories)) {
                            categoriesList = rawData.categories;
                        } else if (typeof rawData.categories === 'object') {
                            categoriesList = Object.values(rawData.categories);
                        }
                    } else if (Array.isArray(rawData)) {
                        categoriesList = rawData;
                    }
                    if (!Array.isArray(categoriesList)) categoriesList = [];

                    if (categoriesList.length > 0) {
                        const processed = categoriesList.map((c: any, index: number) => ({
                            ...c,
                            id: c.id || `ai-cat-${city}-${index}-${Date.now()}`,
                            region: city,
                            attractions: (c.attractions || [])
                                .filter((a: any) => !a.business_status || a.business_status === 'OPERATIONAL')
                                .map((a: any, j: number) => ({
                                    ...a,
                                    region: a.region || city,
                                    id: `ai-attr-${city}-${index}-${Math.random().toString(36).substr(2, 5)}-${j}`,
                                    categoryTitle: c.title
                                }))
                        }));

                        // Merge logic: append new categories/restaurants
                        processed.forEach((newCat: any) => {
                            const existingIdx = accumulatedCategories.findIndex(ac => ac.title === newCat.title);
                            if (existingIdx !== -1) {
                                // Merge restaurants, dedupe by name
                                const existingRes = accumulatedCategories[existingIdx].attractions;
                                newCat.attractions.forEach((nr: any) => {
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

            // Show results immediately; the closed-place verifier prunes
            // flagged listings once the second-pass AI returns.
            setAiCategories(accumulatedCategories);
            persistAiAttractions(accumulatedCategories);
            setSelectedCity('all');

            // Burn the monthly premium slot only if the run actually produced results.
            await stampPremiumIfUsed(preferTier, accumulatedCategories.length > 0);

            // Closed-place safety net (same pattern as Restaurants).
            (async () => {
                const baseCountry = (trip.destinationEnglish || trip.destination)?.split(/[-,]/)[0]?.trim() || '';
                const places = accumulatedCategories.flatMap(cat =>
                    (cat.attractions || []).map(a => ({
                        id: a.id,
                        name: a.name,
                        city: (a.region || cat.region || '').toString(),
                        country: baseCountry,
                    }))
                );
                if (places.length === 0) return;
                const closed = await findClosedPlaces(places);
                if (closed.size === 0) return;
                const cleaned = accumulatedCategories.map(cat => ({
                    ...cat,
                    attractions: (cat.attractions || []).filter(a => !closed.has(a.id)),
                }));
                setAiCategories(cleaned);
                persistAiAttractions(cleaned);
                console.info(`[Attractions] Closed-place check dropped ${closed.size} listings`);
            })();

            // Upstream geocoding so the map view doesn't lazy-resolve 200+
            // attractions on first open.
            geocodeAndPersistAttractions(accumulatedCategories);
        } catch (e) {
            console.error("Critical Error in Research All:", e);
            setRecError('שגיאה במהלך מחקר מקיף.');
        } finally {
            setIsResearchingAll(false);
            setResearchProgress({ current: 0, total: 0 });
        }
    };

    const refreshSingleCategory = async (cat: AttractionCategory) => {
        if (!userId || viewerMode) return;
        const currentMonth = new Date().toISOString().slice(0, 7);
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
            const prompt = `You are a travel expert. As of ${currentDate}, find the BEST attractions in "${cityEn}" for the category: "${catTitle}".
Return AT LEAST 8 currently operating places (aim 10). Omit any permanently or temporarily closed attraction.
Respond in JSON:
{ "attractions": [ { "name", "nameEnglish", "description", "location", "type", "rating", "recommendationSource", "googleMapsUrl", "business_status", "verification_needed" } ] }
Every attraction MUST have business_status = "OPERATIONAL". "location" MUST be in English.`;

            const response = await generateWithFallback(null, [{ role: 'user', parts: [{ text: prompt }] }], { responseMimeType: 'application/json', temperature: 0.1 }, 'SEARCH', tier);
            const rawData = JSON.parse(response.text || '{}');
            const freshAttractions = (rawData.attractions || [])
                .filter((a: any) => a.business_status === 'OPERATIONAL')
                .map((a: any, j: number) => ({
                    ...a,
                    region: a.region || cat.region,
                    id: `ai-attr-${cat.id}-refresh-${Date.now()}-${j}`,
                    categoryTitle: catTitle,
                }));

            const existingNamesLower = new Set(
                (cat.attractions || [])
                    .flatMap(a => [(a.name || '').toLowerCase(), ((a as any).nameEnglish || '').toLowerCase()])
                    .filter(Boolean)
            );
            const novelAttractions = freshAttractions.filter((a: any) => {
                const n1 = (a.name || '').toLowerCase();
                const n2 = (a.nameEnglish || '').toLowerCase();
                return !existingNamesLower.has(n1) && !existingNamesLower.has(n2);
            });

            if (novelAttractions.length > 0) {
                // Append to the existing list so the user keeps everything
                // they already saw, plus the new finds. (Was replace-all.)
                const updated = aiCategories.map(c =>
                    c.id === cat.id ? { ...c, attractions: [...(c.attractions || []), ...novelAttractions] } : c
                );
                setAiCategories(updated);
                persistAiAttractions(updated);
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
                toast.success(`נוספו ${novelAttractions.length} אטרקציות חדשות לקטגוריית ${catTitle}`);
                geocodeAndPersistAttractions(updated);
            } else if (freshAttractions.length > 0) {
                toast.info(`לא נמצאו אטרקציות חדשות לקטגוריית ${catTitle} מעבר למה שכבר יש`);
            } else {
                toast.warning(`לא נמצאו תוצאות עבור ${catTitle}`);
            }
        } catch (e) {
            console.error('refreshSingleCategory error:', e);
            toast.error(describeAiError(e, 'שגיאה בעדכון הקטגוריה'));
        } finally {
            setRefreshingCategoryId(null);
        }
    };

    // Append additional attractions for the currently-filtered city without
    // overwriting existing ones. Reuses the per-category refresh quota schema
    // (1 paid + 3 free / month) keyed by city to avoid runaway AI spend.
    const addMoreForCity = async (cityDisplay: string) => {
        if (!userId || viewerMode) return;
        const cityEn = displayCityName(cityDisplay, 'en') || cityDisplay;
        const currentMonth = new Date().toISOString().slice(0, 7);
        const key = `${trip.id}:addmore:${cityEn.toLowerCase()}`;
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

        setIsResearchingAll(true);
        try {
            const existingForCity = aiCategories
                .flatMap(c => c.attractions || [])
                .filter(a => attractionMatchesCity(a, cityDisplay));
            const existingNames = existingForCity
                .map(a => a.nameEnglish || a.name)
                .filter(Boolean);
            const existingList = existingNames.slice(0, 80).join(', ') || '(none)';
            const currentDate = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
            const prompt = `You are a travel expert. As of ${currentDate}, find ADDITIONAL attractions in "${cityEn}" that are NOT in this list:
${existingList}
Return 10-15 NEW, currently operating places that COMPLEMENT the list above (hidden gems, lesser-known spots, recent openings, local favorites). Omit any permanently or temporarily closed attraction.
Group them into 2-4 thematic Hebrew categories (for example: "פינות נסתרות", "אוכל וקפה", "אמנות ועיצוב", "טבע בעיר").
Respond in JSON:
{ "categories": [ { "title", "attractions": [ { "name", "nameEnglish", "description", "location", "type", "rating", "recommendationSource", "googleMapsUrl", "business_status" } ] } ] }
Every attraction MUST have business_status = "OPERATIONAL". "location" MUST be in English. Category titles must be in Hebrew.`;

            const response = await generateWithFallback(
                null,
                [{ role: 'user', parts: [{ text: prompt }] }],
                { responseMimeType: 'application/json', temperature: 0.4 },
                'SEARCH',
                tier,
            );
            const rawData = JSON.parse(response.text || '{}');
            const existingNamesLower = new Set(
                existingNames.flatMap(n => [n.toLowerCase()])
                    .concat(existingForCity.map(a => (a.name || '').toLowerCase()))
            );
            const ts = Date.now();
            const newCategories: AttractionCategory[] = (rawData.categories || [])
                .map((rc: any, i: number) => {
                    const fresh = (rc.attractions || [])
                        .filter((a: any) => {
                            if (a.business_status !== 'OPERATIONAL') return false;
                            const n1 = (a.nameEnglish || '').toLowerCase();
                            const n2 = (a.name || '').toLowerCase();
                            return !existingNamesLower.has(n1) && !existingNamesLower.has(n2);
                        })
                        .map((a: any, j: number) => ({
                            ...a,
                            region: cityEn,
                            id: `ai-attr-addmore-${ts}-${i}-${j}`,
                            categoryTitle: rc.title,
                        }));
                    return {
                        id: `cat-addmore-${ts}-${i}`,
                        title: rc.title || `המלצות נוספות ל${cityDisplay}`,
                        region: cityEn,
                        attractions: fresh,
                    } as AttractionCategory;
                })
                .filter((cat: AttractionCategory) => cat.attractions.length > 0);

            const newCount = newCategories.reduce((sum, c) => sum + c.attractions.length, 0);
            if (newCount === 0) {
                toast.warning(`לא נמצאו אטרקציות חדשות עבור ${cityDisplay}`);
                return;
            }

            const updated = [...aiCategories, ...newCategories];
            setAiCategories(updated);
            persistAiAttractions(updated);
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
            toast.success(`נוספו ${newCount} אטרקציות חדשות ל${cityDisplay}`);
            geocodeAndPersistAttractions(updated);
        } catch (e) {
            console.error('addMoreForCity error:', e);
            toast.error(describeAiError(e, `שגיאה בהוספת אטרקציות ל${cityDisplay}`));
        } finally {
            setIsResearchingAll(false);
        }
    };

    // See RestaurantsView.geocodeAndPersistRestaurants for the same
    // background-fill pattern. Resolves CORS-friendly geocoding and URL extraction
    // and writes coords back to trip.aiAttractions in batches.
    //
    // Failed lookups now set geocodeFailed: true on the attraction (instead
    // of leaving it silently undefined) so the map view can surface a count
    // of items that couldn't be located.
    const geocodeAndPersistAttractions = (cats: AttractionCategory[]) => {
        type Item = { id: string; name: string; location?: string; googleMapsUrl?: string; lat?: number; lng?: number; countryHint?: string; cityHint?: string };
        const flat: Item[] = [];
        const baseCountryHint = (trip.destinationEnglish || trip.destination)?.split(/[-,]/)[0]?.trim() || '';
        cats.forEach(c => {
            const categoryRegion = c.region || '';
            c.attractions.forEach(a => {
                const cityEn = displayCityName(a.region || categoryRegion, 'en') || a.region || categoryRegion;
                flat.push({
                    id: a.id, name: a.name, location: a.location,
                    googleMapsUrl: a.googleMapsUrl, lat: a.lat, lng: a.lng,
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
            const next: AttractionCategory[] = cats.map(c => ({
                ...c,
                attractions: c.attractions.map(a => {
                    if (resolved[a.id]) {
                        return { ...a, lat: resolved[a.id].lat, lng: resolved[a.id].lng, geocodeFailed: false };
                    }
                    if (failed.has(a.id)) {
                        return { ...a, geocodeFailed: true };
                    }
                    return a;
                }),
            }));
            setAiCategories(next);
            persistAiAttractions(next);
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

    const createResearchPrompt = (target: string) => `
    You are a travel expert helping a family plan a trip to "${target}".
    Your job: find the best, most-popular, and most-talked-about attractions
    — INCLUDING famous tourist spots. Don't skip a place because it's touristy
    — tourists actually want to visit famous places. Don't invent places.

    **PART 0: OPERATIONAL VERIFICATION — HARD RULE (READ FIRST)**
    Every attraction you return MUST currently be open / operating. The
    "business_status" field is REQUIRED and MUST be exactly "OPERATIONAL".
    If any of the following are true, OMIT the attraction entirely (do not
    return it with a non-operational status — just leave it out):
    - The place is marked "permanently closed" or "temporarily closed"
      on Google Maps. Many famous-but-now-closed attractions exist —
      always cross-check Google Maps status before recommending.
    - You are not >90% confident the attraction is still open as of
      the current month. The bar is high: when in doubt, leave it out.
    - Reviews show closure reports in the last 6 months even without
      Google Maps confirming.

    Seasonal attractions (closed for monsoon / winter) ARE fine to
    include but set "verification_needed": true so the user knows to
    double-check seasonal hours.

    Critical: omitting > including. An empty category is fine; a closed
    listing is a failure of the system.

    **PART 1: QUOTA & SCOPE**
    - For EACH of the 10 categories below, return 3-5 real attractions (aim for 5).
    - Return an empty array for a category ONLY if the city genuinely has no such
      places (e.g. "חופים ומים" in a landlocked city). Better empty than fake.
    - A full response for a major tourist city typically contains 30-50 attractions.
    - Every attraction's "location" MUST clearly be in or near "${target}".
      If the city is small/village, expand radius up to 20km.

    **PART 2: CATEGORIES**
    Use EXACTLY these 10 Hebrew titles as "title" — they're the UI keys.
    The AI decides the best fit for each attraction — do not force mappings.
    If a place genuinely fits two categories, include it in the better-fitting
    one (duplicates allowed only when equally relevant).

    1. "אתרי חובה"
    2. "טבע ונופים"
    3. "מוזיאונים ותרבות"
    4. "קניות ושווקים"
    5. "אקסטרים ופעילויות"
    6. "חופים ומים"
    7. "למשפחות וילדים"
    8. "היסטוריה ודת"
    9. "חיי לילה ואווירה"
    10. "פינות נסתרות"

    **NOTE FOR SMALL CITIES, ISLANDS & RESORT TOWNS:**
    If "${target}" is a beach resort, island, small town, or rural area:
    - Collapse categories that don't exist locally (e.g. no museums on a tiny island)
      into "אתרי חובה" or "טבע ונופים" as appropriate.
    - Water sports, boat tours, snorkeling spots, viewpoints, local markets, and
      resort activities all count as real attractions — include them.
    - Aim for at least 8-12 total attractions across all filled categories.
    - Better to fill 4-5 categories well than to leave 8 categories empty.

    **PART 3: QUALITY SIGNALS (not restrictions — just ranking)**
    - Prefer places with high Google ratings (4.0+), awards, or strong press.
    - Include iconic must-visit commercial attractions in tourist cities
      (water parks, go-karting parks, cabaret shows, aquariums, night markets,
      cultural villages) — they're highly rated for a reason.
    - Local authority sources (rate higher than Google in many Asian markets):
      * **Wongnai (วงใน)** — Thailand local app (covers attractions too)
      * **Tabelog + Jalan** — Japan
      * **Dianping (大众点评)** — China / Hong Kong locals
      * **Naver Map** — Korea
      * **Klook / KKday** — Asian tours & attractions marketplace
    - Global sources welcome: Google Reviews, TripAdvisor, Lonely Planet,
      Atlas Obscura, UNESCO, Condé Nast Traveler, BBC Travel, local tourism
      boards, travel blogs, or your own knowledge.
    - Use "Top-Rated" / "Local Favorite" when no specific source applies.

    **PART 4: GOOGLE MAPS URLS (CRITICAL FOR MAP VIEW)**
    For each attraction include "googleMapsUrl" — the actual URL from your
    Google Search results, NOT a guessed one. If you can't find a real URL
    for a place, omit the field entirely; do not fabricate.

    CRITICAL — "location" field MUST be in English (used by a geocoding API). Format: "Attraction or Neighbourhood, City". Example: "Chatuchak Weekend Market, Bangkok".

    CRITICAL — "nameEnglish" is REQUIRED for every attraction. Rules:
    - It MUST be the attraction's original/official Latin-script name as it appears on Google Maps, the official website, or English press (e.g. "Tiffany's Show Pattaya", "Wat Pho", "Chatuchak Weekend Market").
    - DO NOT transliterate the Hebrew name into Latin letters — find the real English name.
    - DO NOT translate it word-by-word; use the real proper name.
    - "name" stays in Hebrew for the UI; "nameEnglish" is what we render on the map and in any English surface.

    CRITICAL — "recommendationSource" MUST be a SHORT platform/publication name only (max 40 chars).
    Use one of: "TripAdvisor", "Lonely Planet", "Atlas Obscura", "UNESCO", "TimeOut",
    "YouTube (channel name)", "Google", "Wongnai", "Klook", "National Geographic",
    "Condé Nast Traveler", "BBC Travel", "Top-Rated", "Local Favorite".
    NEVER write descriptions ("Known for...", "Perfect for...") in this field.
    NEVER include the attraction's own name in this field.
    If no authoritative source applies, use "Local Favorite".

    OUTPUT JSON ONLY:
    { "categories": [ { "id", "title", "attractions": [ { "name", "nameEnglish", "description",
    "location", "rating", "type", "price", "recommendationSource", "googleMapsUrl",
    "business_status", "verification_needed" } ] } ] }
    "business_status" is REQUIRED — must be "OPERATIONAL" for any attraction you return.
    Set "verification_needed" to true ONLY when the place has seasonal hours,
    is undergoing renovation, or any reason the user should double-check before going.
    `;

    const fetchRecommendations = async (forceRefresh = false, specificCity?: string) => {
        setLoadingRecs(true);
        setRecError('');
        try {
            const targetCity = specificCity || trip.destinationEnglish || displayCityName(tripCities[0], 'en') || trip.destination;
            const prompt = createResearchPrompt(targetCity);
            const promptWithJsonInstruction = prompt + `

            For each attraction include "googleMapsUrl" — the actual URL
            from your Google Search results, NOT a guessed URL. If you
            cannot find a real URL, omit the field entirely.

            OUTPUT JSON ONLY(Strict Format):
            {
                "categories": [
                    {
                        "id": "string",
                        "title": "string",
                        "attractions": [
                            { "name", "nameEnglish", "description", "location", "rating", "type", "price", "recommendationSource", "googleMapsUrl" }
                        ]
                    }
                ]
            } `;

            const preferTier = resolvePreferTier();
            const response = await generateWithFallback(null, [{ role: 'user', parts: [{ text: promptWithJsonInstruction }] }], { responseMimeType: 'application/json', temperature: 0.1 }, 'SEARCH', preferTier);

            const textContent = response.text;
            console.log("🔍 [AI ATTRACTIONS Raw Response]:", textContent?.substring(0, 500) + "...");

            try {
                const rawData = JSON.parse(textContent || '{}');

                // ROBUST PARSER: Handle both { categories: [...] } and direct [...] formats
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
                    console.log(`✅[AI Success] Parsed ${categoriesList.length} attraction categories(Format: ${Array.isArray(rawData) ? 'Direct Array' : 'Wrapped Object'})`);
                    const processed = categoriesList.map((c: any, index: number) => ({
                        ...c,
                        id: c.id || `ai-cat-${index}-${Date.now()}`,
                        region: targetCity,
                        attractions: (c.attractions || []).map((a: any, i: number) => ({
                            ...a,
                            region: a.region || targetCity,
                            id: `ai-attr-${c.id || index}-${Math.random().toString(36).substr(2, 5)}-${i}`,
                            categoryTitle: c.title
                        }))
                    }));

                    // MERGE with existing categories instead of replacing —
                    // single-city research shouldn't delete other cities' data.
                    const merged: AttractionCategory[] = [...aiCategories];
                    processed.forEach((newCat: any) => {
                        const existingIdx = merged.findIndex(c => c.title === newCat.title);
                        if (existingIdx !== -1) {
                            const existing = merged[existingIdx].attractions;
                            newCat.attractions.forEach((na: any) => {
                                if (!existing.some(ea => ea.name === na.name)) {
                                    existing.push(na);
                                }
                            });
                        } else {
                            merged.push(newCat);
                        }
                    });

                    setAiCategories(merged);
                    setSelectedCategory('all');
                    persistAiAttractions(merged);
                    await stampPremiumIfUsed(preferTier, processed.length > 0);
                } else {
                    console.warn("⚠️ [AI Warning] Response was valid JSON but contained no attraction results.", rawData);
                    setRecError('לא נמצאו אטרקציות עבור יעד זה.');
                }
            } catch (parseErr) {
                console.error('❌ [AI Error] JSON Parse failed in attractions.', parseErr);
                setRecError('שגיאה בעיבוד הנתונים. נסה שוב.');
            }
        } catch (e: any) {
            console.error("❌ [AI Critical Error]:", e);
            setRecError(e.message || 'שגיאה כללית');
        } finally { setLoadingRecs(false); }
    };

    const handleToggleRec = (attraction: Attraction, catTitle: string) => {
        let newAttractions = [...attractionsData];
        let existingCatIndex = -1;
        let existingAttrIndex = -1;
        for (let i = 0; i < newAttractions.length; i++) {
            const found = newAttractions[i].attractions.findIndex(a => a.name === attraction.name);
            if (found !== -1) { existingCatIndex = i; existingAttrIndex = found; break; }
        }
        if (existingCatIndex !== -1) {
            newAttractions[existingCatIndex].attractions.splice(existingAttrIndex, 1);
            if (newAttractions[existingCatIndex].attractions.length === 0) newAttractions.splice(existingCatIndex, 1);
        } else {
            // resolvePlaceCity matches against trip cities first; falls back to
            // selectedCity / trip.destination so we never save "Unknown City".
            const region = resolvePlaceCity(
                { name: attraction.name, location: attraction.location, region: attraction.region, description: attraction.description },
                trip,
                selectedCity,
            );
            let targetIdx = newAttractions.findIndex(c => c.title === catTitle);
            if (targetIdx === -1) { newAttractions.push({ id: `cat - attr - ${Date.now()} `, title: catTitle, attractions: [] }); targetIdx = newAttractions.length - 1; }
            newAttractions[targetIdx].attractions.push({ ...attraction, id: `added - ${Date.now()} `, region: region });
        }
        onUpdateTrip({ ...trip, attractions: newAttractions });
        setAddedIds(prev => { const next = new Set(prev); if (existingCatIndex !== -1) next.delete(attraction.id); else next.add(attraction.id); return next; });
    };

    // Keep only attractions that belong to any city/country the user is visiting.
    // Delegates to the shared isPlaceInTripScope so RestaurantsView, UnifiedMapView,
    // and tripGaps stay in sync; tripCities is read transitively by getTripCities.
    const inTripScope = useMemo(() => {
        return (a: any) => isPlaceInTripScope(trip, {
            location: a.location,
            region: a.region,
            description: a.description,
        });
    }, [trip]);

    // Dedupe: an attraction may appear in multiple categories (e.g. a
    // dolphinarium in 'חופים ומים' + 'למשפחות וילדים'). Show it once; keep
    // highest-rated / most-detailed copy.
    const dedupeByName = (list: any[]): any[] => {
        const pick: Map<string, any> = new Map();
        const getAttractionCityKey = (a: any): string => {
            for (const city of tripCities) {
                if (attractionMatchesCity(a, city)) return displayCityName(city, 'en').toLowerCase();
            }
            const raw = a.region || (a.location || '').split(',').pop()?.trim() || '';
            return displayCityName(raw, 'en').toLowerCase();
        };
        for (const a of list) {
            const key = (a.name || '').trim().toLowerCase();
            if (!key) continue;
            const scopedKey = `${key}|${getAttractionCityKey(a)}`;
            const existing = pick.get(scopedKey);
            if (!existing) { pick.set(scopedKey, a); continue; }
            const existingScore = (existing.rating || 0) + (existing.recommendationSource ? 0.1 : 0);
            const newScore = (a.rating || 0) + (a.recommendationSource ? 0.1 : 0);
            if (newScore > existingScore) pick.set(scopedKey, a);
        }
        return Array.from(pick.values());
    };

    // Normalize a `recommendationSource` string to one of a fixed set of group
    // labels for the "filter by source" chip strip. Declared HERE (above
    // filteredRecommendations) because both the useMemo below and `availableRaters`
    // later need it — leaving it after filteredRecommendations created a
    // Temporal Dead Zone crash when the user changed filters in production
    // builds (Vite/esbuild order preserves source location for `const` decls).
    const normalizeSource = (raw: string): string => {
        if (!raw) return '';
        const low = raw.toLowerCase();
        if (/^(known for|praised for|offers|serves|recommended for|highly|experience|locals|family-friendly|ranked|ideal for|considered|regarded|features|perfect for)/i.test(raw.trim())) return 'Other';
        if (raw.length > 80) return 'Other';
        if (low.includes('youtube')) return 'YouTube';
        if (low.includes('unesco')) return 'UNESCO';
        if (low.includes('lonely planet')) return 'Lonely Planet';
        if (low.includes('atlas obscura')) return 'Atlas Obscura';
        if (low.includes('wongnai')) return 'Wongnai';
        if (low.includes('timeout') || low.includes('time out')) return 'TimeOut';
        if (low.includes('tripadvisor') || low.includes('trip advisor')) return 'TripAdvisor';
        if (low.includes('klook') || low.includes('kkday')) return 'Klook / KKday';
        if (low.includes('google')) return 'Google';
        if (low.includes('michelin')) return 'Michelin Guide';
        if (low.includes('condé nast') || low.includes('conde nast')) return "Condé Nast";
        if (low.includes('national geographic') || low.includes('nat geo')) return 'National Geographic';
        if (low.includes('bbc')) return 'BBC Travel';
        if (low.includes('official site') || low.includes('official website')) return 'Official Site';
        if (low.includes('wanderlog') || low.includes('tatinta') || low.includes('thailand magazine') ||
            low.includes('pattaya') || low.includes('asean now') || low.includes('traveling tum')) return 'Local Media';
        if (/\b(temple|museum|park|beach|market|island|palace)\b/i.test(raw) && raw.length > 30) return 'Other';
        return 'Other';
    };

    const filteredRecommendations = useMemo(() => {
        let list: any[] = [];
        if (selectedCategory === 'all') aiCategories.forEach(c => list.push(...c.attractions.map(a => ({
            ...a,
            region: a.region || c.region,
            categoryTitle: c.title
        }))));
        else {
            const cat = aiCategories.find(c => c.id === selectedCategory);
            if (cat) list = cat.attractions.map(a => ({
                ...a,
                region: a.region || cat.region,
                categoryTitle: cat.title
            }));
        }

        // Always trim to trip scope first — drops out-of-country items the AI
        // may have cached from a previous bugged session.
        if (tripCities.length > 0) list = list.filter(inTripScope);

        if (selectedCity !== 'all') {
            list = list.filter(a => attractionMatchesCity(a, selectedCity));
        }
        if (selectedRater !== 'all') {
            list = list.filter(a => normalizeSource(a.recommendationSource || '') === selectedRater);
        }

        list = list.filter(passesItemFilters);

        // Global dedupe — collapses same attraction across categories
        return dedupeByName(list);
    }, [aiCategories, selectedCategory, selectedRater, selectedCity, tripCities, inTripScope, passesItemFilters]);

    // True when there's stored research data, but NONE of it belongs to this trip
    // (i.e. stale data from a previous destination).
    const hasStaleData = useMemo(() => {
        if (aiCategories.length === 0) return false;
        const total = aiCategories.reduce((acc, c) => acc + c.attractions.length, 0);
        if (total === 0) return false;
        const inScope = aiCategories.reduce(
                (acc, c) => acc + c.attractions.filter(inTripScope).length, 0
        );
        return inScope === 0;
    }, [aiCategories, inTripScope]);

    // --- Data Management ---
    const handleUpdateAttraction = (id: string, updates: Partial<Attraction>) => {
        const updated = attractionsData.map(c => ({ ...c, attractions: c.attractions.map(a => a.id === id ? { ...a, ...updates } : a) }));
        onUpdateTrip({ ...trip, attractions: updated });
    };

    const handleDeleteAttraction = (id: string) => {
        setConfirmDeleteId(id);
    };
    const performDeleteAttraction = (id: string) => {
        const updated = attractionsData.map(c => ({ ...c, attractions: c.attractions.filter(a => a.id !== id) })).filter(c => c.attractions.length > 0);
        onUpdateTrip({ ...trip, attractions: updated });
        setConfirmDeleteId(null);
    };

    // Client-side translation for legacy/cached English titles
    const HEBREW_TITLES: Record<string, string> = {
        "Icons & Landmarks": "אתרי חובה",
        "Nature & Views": "טבע ונופים",
        "Heritage & Art": "מוזיאונים ותרבות",
        "Retail Therapy": "קניות ושווקים",
        "Adrenaline": "אקסטרים ופעילויות",
        "Sun & Sea": "חופים ומים",
        "Kids' Joy": "למשפחות וילדים",
        "Spiritual": "היסטוריה ודת",
        "Night Vibes": "חיי לילה ואווירה",
        "Hidden Gems": "פינות נסתרות",
        "Must See": "אתרי חובה", // Legacy
        "Shopping & Markets": "קניות ושווקים", // Legacy
        "Culture & History": "מוזיאונים ותרבות", // Legacy
        "Nightlife": "חיי לילה ואווירה" // Legacy
    };

    const displayTitle = (title: string) => normalizeNearHotelTitle(HEBREW_TITLES[title] || title);

    // normalizeSource has been hoisted above filteredRecommendations (see comment there).

    const availableRaters = useMemo(() => {
        const sources = new Set<string>();
        aiCategories.forEach(c => c.attractions.forEach(a => {
            const group = normalizeSource((a.recommendationSource || '').trim());
            if (group) sources.add(group);
        }));
        const ORDER = ['UNESCO', 'Lonely Planet', 'Atlas Obscura', 'National Geographic', 'Wongnai',
                       'TripAdvisor', 'YouTube', 'TimeOut', 'Google', 'Klook / KKday',
                       'Michelin Guide', 'Condé Nast', 'BBC Travel', 'Official Site', 'Local Media', 'Other'];
        return ORDER.filter(s => sources.has(s));
    }, [aiCategories]);


    const getMapItems = () => {
        const items: any[] = [];
        // Map shows BOTH saved (solid purple) AND AI suggestions (lighter
        // dashed purple) regardless of the active tab so the user can see
        // suggestions in context with their saved picks.
        const cityEnFor = (region?: string) =>
            selectedCity !== 'all'
                ? (displayCityName(selectedCity, 'en') || selectedCity)
                : (region ? displayCityName(region, 'en') : undefined);

        // Map view shows EVERYTHING by default — both saved (solid pin) and
        // AI suggestions (dashed pin) — so the user sees the full picture
        // without toggling tabs. The list-view tab still scopes the list.
        const includeSaved = true;
        const includeAi = true;

        const savedNameKeys = new Set<string>();
        const savedCoordKeys = new Set<string>();
        const coordKey = (lat?: number, lng?: number) =>
            (typeof lat === 'number' && typeof lng === 'number')
                ? `${Math.round(lat * 1000)}|${Math.round(lng * 1000)}`
                : '';
        const savedFlat = attractionsData.flatMap(c =>
            c.attractions.map(a => ({ ...a, region: a.region || c.region, categoryTitle: a.categoryTitle || c.title }))
        );
        savedFlat.forEach(a => {
            const k = coordKey(a.lat, a.lng);
            if (k) savedCoordKeys.add(k);
        });
        savedFlat.forEach(a => {
            if (!includeSaved) return;
            if (selectedCity !== 'all' && !attractionMatchesCity(a, selectedCity)) return;
            if (!passesItemFilters(a)) return;
            savedNameKeys.add(a.name.toLowerCase());
            items.push({
                id: a.id, type: 'attraction', name: a.name, nameEnglish: a.nameEnglish,
                address: a.location, lat: a.lat, lng: a.lng,
                city: cityEnFor(a.region),
                description: a.description,
                rating: typeof a.rating === 'number' ? a.rating : undefined,
                category: a.type || a.categoryTitle,
                recommendationSource: a.recommendationSource,
                priceRange: a.price,
                imageUrl: a.imageUrl,
                notes: a.notes,
                googleMapsUrl: a.googleMapsUrl,
                source: 'saved',
                raw: a,
                categoryTitle: a.categoryTitle,
            });
        });

        if (includeAi) (filteredRecommendations as Attraction[]).forEach(a => {
            if (selectedCity !== 'all' && !attractionMatchesCity(a, selectedCity)) return;
            if (savedNameKeys.has(a.name.toLowerCase())) return;
            // Coord-bucket dedupe — drop an AI marker that lands at the
            // same ~110m bucket as a saved place even when the names differ
            // ("Alcazar" vs "Alcazar Cabaret Show").
            const ck = coordKey(a.lat, a.lng);
            if (ck && savedCoordKeys.has(ck)) return;
            items.push({
                id: `ai-${a.id}`, type: 'attraction', name: a.name, nameEnglish: a.nameEnglish,
                address: a.location, lat: a.lat, lng: a.lng,
                city: cityEnFor(a.region),
                description: a.description,
                rating: typeof a.rating === 'number' ? a.rating : undefined,
                category: a.type || a.categoryTitle,
                recommendationSource: a.recommendationSource,
                priceRange: a.price,
                imageUrl: a.imageUrl,
                notes: a.notes,
                googleMapsUrl: a.googleMapsUrl,
                source: 'ai',
                raw: a,
                categoryTitle: a.categoryTitle || 'תכנון טיול',
            });
        });

        (trip.hotels || []).forEach(h => {
            const hCity = h.city || h.address || '';
            if (selectedCity !== 'all' && !locationMatchesCity(hCity, selectedCity)) return;
            if (!h.address && (typeof h.lat !== 'number' || typeof h.lng !== 'number')) return;
            // Include `city` (English) so UnifiedMapView's city-flyTo effect
            // can match hotels for the active city via cityKey().
            const hCityRaw = h.city || (h.address || '');
            const hCityEn = displayCityName(hCityRaw, 'en') || h.city || '';
            items.push({
                id: `hotel-${h.id}`, type: 'hotel', name: h.name,
                address: h.address, lat: h.lat, lng: h.lng,
                city: hCityEn,
                description: h.city || h.address,
                source: 'saved',
            });
        });

        // Final dedupe by (name, lat~3dp, lng~3dp) so attractions appearing
        // in multiple categories don't render as overlapping pins.
        const seen = new Set<string>();
        return items.filter(it => {
            if (it.type === 'hotel') return true;
            const lat = typeof it.lat === 'number' ? Math.round(it.lat * 1000) : 'x';
            const lng = typeof it.lng === 'number' ? Math.round(it.lng * 1000) : 'x';
            const name = (it.name || '').toLowerCase().trim().replace(/\s+/g, ' ');
            const key = `${name}|${lat}|${lng}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    const savedAttractionNames = useMemo(
        () => new Set(attractionsData.flatMap(c => c.attractions).map(a => a.name.toLowerCase())),
        [attractionsData]
    );

    return (
        <div className="space-y-3 animate-fade-in pb-10">
            {/* Row 1 — source tabs. Search lives only in the AI tab and is
                collapsed by default; tap the 🔍 icon to expand. */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex-shrink-0">
                    <Tabs<'my_list' | 'recommended'>
                        value={activeTab}
                        onChange={setActiveTab}
                        size="md"
                        className="[&_button]:px-5 [&_button]:font-black [&_button[aria-selected=true]]:text-purple-600 [&_svg]:w-4 [&_svg]:h-4"
                        ariaLabel="Attractions view mode"
                        items={[
                            { value: 'recommended', label: 'המלצות AI', iconLeading: <Sparkles /> },
                            { value: 'my_list', label: 'הרשימה שלי', iconLeading: <Ticket /> },
                        ]}
                    />
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-shrink">
                    {userIsAdmin && bulkRefreshing && (
                        <span
                            className="flex items-center gap-1.5 h-9 px-2.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold flex-shrink-0"
                            title="מרענן מ-Google ברקע"
                        >
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>{bulkProgress.current}/{bulkProgress.total}</span>
                        </span>
                    )}
                    {userIsAdmin && notFoundCount > 0 && (
                        <button
                            type="button"
                            onClick={() => setConfirmDeleteNotFound(true)}
                            title={`מחק ${notFoundCount} אטרקציות שלא נמצאו ב-Google Maps`}
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
                            aria-label={searchExpanded ? 'סגור חיפוש' : 'חפש אטרקציה'}
                            aria-expanded={searchExpanded}
                            className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all ${searchExpanded ? 'bg-purple-600 border-purple-600 text-white shadow' : 'bg-white border-slate-200 text-slate-500 hover:border-purple-300 hover:text-purple-600'}`}
                        >
                            {searchExpanded ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Search input — expands only when the user opens it from the AI tab. */}
            {activeTab === 'recommended' && searchExpanded && (
                <div className="relative z-20">
                    <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-1.5 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
                        <Search className="w-4 h-4 text-slate-400 ms-1 flex-shrink-0" />
                        <input
                            autoFocus
                            className="flex-grow outline-none text-slate-700 font-medium text-sm min-w-0 bg-transparent"
                            placeholder='נסה: מוזיאונים, חופים, ילדים, שווקים...'
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
                            className="bg-purple-600 text-white px-3 min-h-9 rounded-xl font-bold text-xs hover:bg-purple-700 transition-colors flex items-center gap-1 disabled:opacity-50 flex-shrink-0"
                        >
                            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">{isSearching ? '...' : 'חיפוש'}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Saved-search chips — only when user has them. */}
            {trip.customAttractionCategories && trip.customAttractionCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {trip.customAttractionCategories.map((cat, idx) => (
                        <button key={idx} onClick={() => { setTextQuery(cat); handleTextSearch(); }} className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-purple-50 text-slate-600 rounded-full text-2xs font-bold border border-slate-200">{cat}</button>
                    ))}
                </div>
            )}

            {/* Row 3 — city chips on list view only. The map view has its
                own on-map chip strip (UnifiedMapView) for camera zoom. */}
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
                                title={isEmpty ? 'אין כאן עדיין אטרקציות. בחר את העיר ולחץ על "מצא באזור המלון" / רענן.' : undefined}
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

            {/* Row 4 — view toggle on the start, actions menu on the end. */}
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
                                const activeCat = selectedCategory !== 'all'
                                    ? aiCategories.find(c => c.id === selectedCategory)
                                    : null;
                                const isBusy = loadingRecs || isResearchingAll || refreshingCategoryId !== null;
                                return {
                                    icon: <RotateCw className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />,
                                    label: activeCat
                                        ? `מצא עוד ב"${displayTitle(activeCat.title)}"`
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
                            ...(selectedCity !== 'all' && aiCategories.length > 0 ? [{
                                icon: <Plus className="w-4 h-4" />,
                                label: `הוסף עוד אטרקציות ל${selectedCity}`,
                                onSelect: () => addMoreForCity(selectedCity),
                                disabled: loadingRecs || isResearchingAll || refreshingCategoryId !== null,
                            }] : []),
                            {
                                icon: <Hotel className="w-4 h-4" />,
                                label: 'מצא אטרקציות באזור המלון',
                                onSelect: () => setConfirmNearHotel(true),
                                disabled: loadingRecs || isResearchingAll || (trip.hotels || []).filter(h => typeof h.lat === 'number').length === 0,
                            },
                            ...(!isPlacesDisabled() && userIsAdmin && activeTab === 'recommended' && aiCategories.flatMap(c => c.attractions).length > 0 ? [{
                                icon: <RefreshCw className={`w-4 h-4 ${bulkRefreshing === 'ai' ? 'animate-spin' : ''}`} />,
                                label: bulkRefreshing === 'ai'
                                    ? `מרענן מ-Google · ${bulkProgress.current}/${bulkProgress.total}`
                                    : 'רענן הכל מ-Google',
                                onSelect: handleBulkRefreshAi,
                                disabled: !!bulkRefreshing,
                            }] : []),
                            ...(!isPlacesDisabled() && userIsAdmin && activeTab === 'my_list' && trip.attractions.flatMap(c => c.attractions).length > 0 ? [{
                                icon: <RefreshCw className={`w-4 h-4 ${bulkRefreshing === 'saved' ? 'animate-spin' : ''}`} />,
                                label: bulkRefreshing === 'saved'
                                    ? `מרענן מ-Google · ${bulkProgress.current}/${bulkProgress.total}`
                                    : 'רענן את הרשימה שלי מ-Google',
                                onSelect: handleBulkRefreshSaved,
                                disabled: !!bulkRefreshing,
                            }] : []),
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
                    <div className="flex justify-between items-center"><h3 className="text-base font-black text-slate-800">תוצאות חיפוש</h3><button onClick={clearSearch} className="text-2xs text-slate-500 underline">נקה</button></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {searchResults.map(res => <AttractionRecommendationCard key={res.id} rec={res} tripDestination={trip.destination} isAdded={addedIds.has(res.id) || trip.attractions.some(c => c.attractions.some(a => a.name === res.name))} onAdd={handleToggleRec} onClick={() => setSelectedPlace(res)} />)}
                    </div>
                </div>
            )}

            {/* Viewer-mode notice — for collaborators joined via the viewer link. */}
            {viewerMode && (
                <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-600">
                    <span className="flex items-center gap-1.5">
                        <span>🔒</span>
                        <span>תוצאות פרטיות — נשמרות רק במכשיר שלך</span>
                    </span>
                </div>
            )}

            {viewMode === 'map' ? (
                <div className="space-y-3">
                    {/* Filter card — map-only. Collapsible on mobile, expanded
                        on desktop. Affects only the markers on the map. */}
                    {(filterOptions.types.length > 0 || filterOptions.prices.length > 0) && (
                        <div className="border border-slate-200 bg-slate-50 rounded-2xl overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setFiltersExpanded(v => !v)}
                                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 md:py-2 text-end hover:bg-slate-100/60 transition-colors"
                                aria-expanded={filtersExpanded}
                            >
                                <span className="flex items-center gap-2">
                                    <FilterIcon className="w-4 h-4 text-slate-500" />
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
                                    <ChevronLeftIcon className={`w-4 h-4 text-slate-400 transition-transform ${filtersExpanded ? '-rotate-90' : ''}`} />
                                </span>
                            </button>
                            {filtersExpanded && (
                                <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-slate-200/70">
                                    {filterOptions.types.length > 0 && (
                                        <FilterChipGroup
                                            label="סוג"
                                            options={filterOptions.types.map(([k, n]) => ({ key: k, label: k, count: n }))}
                                            selected={filterTypes}
                                            onToggle={(k) => setFilterTypes(prev => toggleSetMember(prev, k))}
                                            colorClass="purple"
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
                    {geocodingInFlight > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>מאתר {geocodingInFlight} מקומות נוספים על המפה...</span>
                        </div>
                    )}
                    <UnifiedMapView
                        items={getMapItems()}
                        trip={trip}
                        activeCity={selectedCity !== 'all' ? (displayCityName(selectedCity, 'en') || selectedCity) : null}
                        title="מפת אטרקציות"
                        savedNames={savedAttractionNames}
                        onAddToList={(item) => {
                            const a = (item as any).raw as Attraction | undefined;
                            if (!a) return;
                            handleToggleRec(a, (item as any).categoryTitle || 'תכנון טיול');
                        }}
                        onRemoveFromList={userCanEdit ? (item) => {
                            const a = (item as any).raw as Attraction | undefined;
                            if (!a) return;
                            performDeleteAttraction(a.id);
                        } : undefined}
                    />
                </div>
            ) : (
                <>
                    {/* MY LIST TAB */}
                    {activeTab === 'my_list' && (
                        <>
                            {attractionsData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-fade-in px-4">
                                    <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-fuchsia-100 rounded-full flex items-center justify-center shadow-lg shadow-purple-100/50 relative">
                                        <Sparkles className="w-10 h-10 text-purple-500 absolute top-4 right-4 animate-pulse" />
                                        <Ticket className="w-10 h-10 text-purple-600" />
                                    </div>
                                    <div className="space-y-3 max-w-sm">
                                        <h3 className="text-2xl font-black text-slate-800">מה עושים היום? ה-AI יודע!</h3>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            תן למוח שלנו למצוא לך אטרקציות, פנינים נסתרות וחוויות מטורפות ב{trip.destination}.
                                            <br />
                                            בלי חיפושים, רק תוצאות.
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
                                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-fuchsia-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <span className="relative flex items-center gap-2">
                                            {isResearchingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                                            {isResearchingAll ? 'מחפש אטרקציות…' : 'מצא לי אטרקציות (AI)'}
                                        </span>
                                    </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 mt-4">
                                    <div className="flex justify-between items-center mb-1">
                                        <button onClick={() => setViewMode('map')} className="px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold text-xs bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 transition-all shadow-sm">
                                            <MapIcon className="w-3 h-3" /> מפה
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {(() => {
                                            // Flatten List Logic
                                            const flatList: Attraction[] = [];
                                            attractionsData.forEach(c => c.attractions.forEach(a => flatList.push({
                                                ...a,
                                                region: a.region || c.region,
                                                categoryTitle: c.title
                                            })));

                                            // Filter
                                            let filtered = flatList;
                                            if (selectedCity !== 'all') {
                                                filtered = flatList.filter(a => attractionMatchesCity(a, selectedCity));
                                            }

                                            // Sort
                                            filtered = sortAttractions(filtered);

                                            if (filtered.length === 0) {
                                                return (
                                                    <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 mt-4">
                                                        <p className="text-slate-500 text-sm font-bold">לא נמצאו אטרקציות בסינון זה.</p>
                                                    </div>
                                                );
                                            }

                                            return filtered.map(attr => (
                                                <AttractionRow
                                                    key={attr.id}
                                                    data={attr}
                                                    onSaveNote={(n) => handleUpdateAttraction(attr.id, { notes: n })}
                                                    onUpdate={(u) => handleUpdateAttraction(attr.id, u)}
                                                    onDelete={() => handleDeleteAttraction(attr.id)}
                                                    onSelect={() => setSelectedPlace(attr)}
                                                />
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* RECOMMENDED TAB (AI) */}
                    {activeTab === 'recommended' && (
                        <div className="animate-fade-in">
                            {/* Refresh + reset moved to row 2 of the page header. Inline progress
                                strip surfaces multi-city research progress while it runs. */}
                            {isResearchingAll && (
                                <div className="flex items-center gap-2 mb-3 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-2xs font-bold">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>סורק עיר {researchProgress.current} מתוך {researchProgress.total}…</span>
                                </div>
                            )}

                            {loadingRecs ? (
                                <div className="space-y-4">
                                    <ThinkingLoader texts={["סורק אטרקציות...", "מחפש פנינים נסתרות...", "בודק דירוגים...", "מצליב מידע עם מקומיים..."]} />
                                    <SkeletonCardGrid count={6} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" />
                                </div>
                            ) : (
                                <>
                                    {allAiAttractions().length === 0 || hasStaleData ? (
                                        <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center px-4">
                                            <div className="bg-purple-100 p-4 rounded-full"><BrainCircuit className="w-8 h-8 text-purple-600" /></div>
                                            <h3 className="text-xl font-black text-slate-800">
                                                {hasStaleData ? 'הנתונים השמורים לא מתאימים לטיול הזה' : (tripCities.length > 1 ? 'באיזו עיר נתמקד?' : 'בחר עיר לחיפוש')}
                                            </h3>
                                            {hasStaleData && (
                                                <p className="text-sm text-slate-500 max-w-sm">
                                                    מצאנו אטרקציות שמורות ממחקר ישן שאינן ב-{trip.destination}. בצע מחקר חדש לקבלת המלצות מותאמות לטיול.
                                                </p>
                                            )}

                                            {/* Primary CTA: one clear button that starts research for ALL
                                                trip cities at once (user's main complaint: wanted a big
                                                clear button). City-specific buttons offered as secondary. */}
                                            <div className="flex flex-wrap items-center justify-center gap-3">
                                                <button
                                                    onClick={() => researchAllCities()}
                                                    disabled={isResearchingAll}
                                                    title="קורא ל-Gemini grounded SEARCH דרך ה-Worker שלנו. עלות: ~$0.05 לקריאה. תוצאה מאומתת באינטרנט."
                                                    className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-8 py-3 rounded-2xl text-base font-black shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-60"
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
                                                    <ClipboardPaste className="w-5 h-5" /> הדבק מ-ChatGPT (חינמי)
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
                                                                className="bg-white border border-slate-200 text-slate-700 px-4 py-1.5 rounded-full text-xs font-bold hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50 transition-all"
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
                                            {/* Dedupe + reorder categories at render time — catches
                                                legacy data with duplicate titles, and demotes near-hotel
                                                categories so they sit AFTER the main research categories
                                                (per-user request: not the headline). */}
                                            {(() => {
                                                const seenTitles = new Set<string>();
                                                const dedup = aiCategories.filter(c => {
                                                    const key = displayTitle(c.title);
                                                    if (seenTitles.has(key)) return false;
                                                    seenTitles.add(key);
                                                    return true;
                                                });
                                                const main = dedup.filter(c => !isNearHotelTitle(c.title));
                                                const nearHotel = dedup.filter(c => isNearHotelTitle(c.title));
                                                const uniqueCats = [...main, ...nearHotel];
                                                return (
                                                    <div className="mb-3 overflow-x-auto md:overflow-visible pb-2 scrollbar-hide">
                                                        <div className="flex flex-nowrap md:flex-wrap gap-1.5 md:gap-2">
                                                            <button onClick={() => setSelectedCategory('all')} className={`min-h-8 md:min-h-9 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-2xs md:text-xs font-bold border whitespace-nowrap ${selectedCategory === 'all' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200'}`}>הכל</button>
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
                                                                    theme="purple"
                                                                />
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Advanced filters — hidden by default to cut visual noise.
                                                Only shown if we have multiple rater sources to choose from. */}
                                            {availableRaters.length > 1 && (
                                                <div className="mb-3">
                                                    <button
                                                        onClick={() => setShowAdvancedFilters(s => !s)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-bold transition-all ${showAdvancedFilters || selectedRater !== 'all' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        סנן לפי מקור המלצה
                                                        {selectedRater !== 'all' && (
                                                            <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded-full text-[9px]">1</span>
                                                        )}
                                                        <span className={`transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}>▾</span>
                                                    </button>
                                                    {showAdvancedFilters && (
                                                        <div className="mt-2 overflow-x-auto pb-2 flex gap-2 items-center animate-fade-in">
                                                            <button onClick={() => setSelectedRater('all')} className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${selectedRater === 'all' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200'}`}>הכל</button>
                                                            {availableRaters.map(r => <button key={r} onClick={() => setSelectedRater(r)} className={`px-3 py-1.5 rounded-full text-xs font-bold border whitespace-nowrap ${selectedRater === r ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200'}`}>{r}</button>)}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                                {filteredRecommendations.map(rec => <AttractionRecommendationCard key={rec.id} rec={rec} tripDestination={trip.destination} isAdded={addedIds.has(rec.id) || trip.attractions.some(c => c.attractions.some(a => a.name === rec.name))} onAdd={handleToggleRec} onClick={() => setSelectedPlace(rec)} />)}
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
                    type="attraction"
                    onClose={() => setSelectedPlace(null)}
                    isAdded={trip.attractions.some(c => c.attractions.some(a => a.name === selectedPlace?.name))}
                    onAddToPlan={() => handleToggleRec(selectedPlace, selectedPlace?.categoryTitle || 'תכנון טיול')}
                    onRefreshGoogle={(patch) => {
                        const idMatch = (a: { id: string }) => a.id === selectedPlace.id;
                        const inSaved = trip.attractions.some(c => c.attractions.some(idMatch));
                        if (inSaved) {
                            const nextSaved = trip.attractions.map(cat => ({
                                ...cat,
                                attractions: cat.attractions.map(a => idMatch(a) ? { ...a, ...patch } : a),
                            }));
                            onUpdateTrip({ ...trip, attractions: nextSaved });
                        } else {
                            applyAiAttractionPatch(selectedPlace.id, patch);
                        }
                        setSelectedPlace(prev => prev ? { ...prev, ...patch } : prev);
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
            <ConfirmModal
                isOpen={showRefreshLimitModal}
                title="הגעת למכסה החודשית"
                message="הגעת למכסת הרענון החודשית לקטגוריה זו (1 רענון בתשלום + 3 רענונים חינמיים). המכסה מתאפסת בתחילת כל חודש."
                confirmText="הבנתי"
                cancelText="ביטול"
                onConfirm={() => setShowRefreshLimitModal(false)}
                onClose={() => setShowRefreshLimitModal(false)}
            />
            <ConfirmModal
                isOpen={confirmDeleteNotFound}
                title={`למחוק ${notFoundCount} אטרקציות שלא נמצאו ב-Google Maps?`}
                message="האטרקציות הללו לא נמצאו בחיפוש של Google Places. ייתכן שהן סגורות או לא קיימות. הפעולה אינה ניתנת לביטול."
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
                title="להסיר את האטרקציה מהרשימה?"
                message="האטרקציה תוסר מהרשימה השמורה שלך. ניתן יהיה להוסיף אותה שוב מ-המלצות AI."
                confirmText="הסר"
                cancelText="ביטול"
                isDangerous
                onConfirm={() => confirmDeleteId && performDeleteAttraction(confirmDeleteId)}
                onClose={() => setConfirmDeleteId(null)}
            />
            <ConfirmModal
                isOpen={confirmNearHotel}
                title="מצא אטרקציות באזור המלון"
                message={(() => {
                    const n = (trip.hotels || []).filter(h => typeof h.lat === 'number' && typeof h.lng === 'number').length;
                    return `ננתח את ${n === 1 ? 'המלון שלך' : `${n} המלונות שלך`} ונחפש את האטרקציות הכי טובות במרחק של עד 15 דקות הליכה. ייקח עד ~${Math.max(8, n * 8)} שניות.`;
                })()}
                confirmText="כן, חפש"
                cancelText="ביטול"
                onConfirm={researchNearHotel}
                onClose={() => setConfirmNearHotel(false)}
            />
            {/* Free-path paste-from-external-AI modal — opened by the green
                sibling button next to "המלצות AI לכל הטיול". */}
            <ExternalAiPasteModal
                isOpen={pasteModalOpen}
                onClose={() => setPasteModalOpen(false)}
                trip={trip}
                kind="attractions"
                onApply={onUpdateTrip}
            />
        </div>
    );

    // Helper to get all AI recs for initial check
    function allAiAttractions() {
        let all: any[] = [];
        aiCategories.forEach(c => all.push(...c.attractions.map(a => ({
            ...a,
            region: a.region || c.region,
            categoryTitle: a.categoryTitle || c.title,
        }))));
        return all;
    }
};

const AttractionRow: React.FC<{ data: Attraction, onSaveNote: (n: string) => void, onUpdate: (updates: Partial<Attraction>) => void, onDelete: () => void, onSelect: () => void }> = ({ data, onSaveNote, onUpdate, onDelete, onSelect }) => {

    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState(data.notes || '');

    // Use intelligent image mapper
    // Don't pass data.location — "Bangkok, Thailand" would push everything
    // into Thai-flavored buckets regardless of the actual attraction type.
    const { url: mappedUrl, label: visualLabel } = getAttractionImage(
        data.name || '',
        data.description || '',
        [data.categoryTitle || '']
    );
    const visuals = getAttractionVisuals(visualLabel);

    // Try to upgrade the stock photo to a real Wikipedia photo and persist
    // it on the saved item. After the first successful resolve, every
    // future render (and every other device) reads imageUrl directly with
    // no network call.
    const [resolvedSrc, setResolvedSrc] = useState<string>(data.googlePhotoUrl || data.imageUrl || mappedUrl);

    useEffect(() => {
        if (data.googlePhotoUrl) { setResolvedSrc(data.googlePhotoUrl); return; }
        if (data.imageUrl) { setResolvedSrc(data.imageUrl); }
    }, [data.googlePhotoUrl, data.imageUrl]);

    // Lazy Wikipedia upgrade — only fires when the row is in the viewport.
    const searchName = getEnglishName({
        name: data.name,
        nameEnglish: (data as any).nameEnglish,
        location: data.location,
    });
    const { ref: lazyRef, resolvedUrl } = useLazyPlaceImage({
        name: searchName,
        city: data.location || '',
        type: 'attraction',
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
                    {/* Image Section (Replaces Icon) */}
                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden relative border border-slate-200">
                        <img
                            src={imageSrc}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?auto=format&fit=crop&w=200&q=80';
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
                            {data.rating && (
                                <div className="flex items-center gap-1 text-2xs font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded">
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    {data.rating}
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
                    {/* Heart Icon Toggle */}
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
