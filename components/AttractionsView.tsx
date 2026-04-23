import React, { useState, useMemo, useEffect } from 'react';
import { Trip, Attraction, AttractionCategory } from '../types';
import { MapPin, Ticket, Star, Landmark, Sparkles, Filter, StickyNote, Plus, Loader2, BrainCircuit, RotateCw, RefreshCw, Navigation, Calendar, Clock, Trash2, Search, X, List, Map as MapIcon, Trophy, Mountain, ShoppingBag, Palmtree, DollarSign, LayoutGrid, Heart } from 'lucide-react';
// cleaned imports
import { getTripCities, locationMatchesCity } from '../utils/geoData';
import { getAttractionImage } from '../services/imageMapper';
import { SYSTEM_PROMPT, generateWithFallback } from '../services/aiService';
import { CalendarDatePicker } from './CalendarDatePicker';
import { UnifiedMapView } from './UnifiedMapView';
import { ThinkingLoader } from './ThinkingLoader';
import { PlaceCard } from './PlaceCard';
import { GlobalPlaceModal } from './GlobalPlaceModal';

import { cleanTextForMap } from '../utils/textUtils';


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

const AttractionRecommendationCard: React.FC<{
    rec: any,
    tripDestination: string,
    tripDestinationEnglish?: string,
    isAdded: boolean,
    onAdd: (rec: any, cat: string) => void,
    onClick: () => void
}> = ({ rec, tripDestination, tripDestinationEnglish, isAdded, onAdd, onClick }) => {
    const nameForMap = cleanTextForMap(rec.name);
    const locationForMap = cleanTextForMap(rec.location) || cleanTextForMap(tripDestinationEnglish || tripDestination);
    const mapsQuery = encodeURIComponent(`${nameForMap} ${locationForMap}`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;
    const visuals = getAttractionVisuals(rec.type);

    return (
        <PlaceCard
            type="attraction"
            name={rec.name}
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
        />
    );
};

export const AttractionsView: React.FC<{ trip: Trip, onUpdateTrip: (t: Trip) => void }> = ({ trip, onUpdateTrip }) => {
    // Smart default: land fresh users on the research tab so the CTA is one
    // click away; power users with saved attractions stay on their list.
    const savedAttractionsCount = (trip.attractions || []).reduce(
        (acc, c) => acc + (c.attractions?.length || 0), 0
    );
    const [activeTab, setActiveTab] = useState<'my_list' | 'recommended'>(
        savedAttractionsCount === 0 ? 'recommended' : 'my_list'
    );
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    // AI State
    const [aiCategories, setAiCategories] = useState<AttractionCategory[]>(trip.aiAttractions || []);
    const [loadingRecs, setLoadingRecs] = useState(false);
    const [recError, setRecError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedRater, setSelectedRater] = useState<string>('all');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [isResearchingAll, setIsResearchingAll] = useState(false);
    const [researchProgress, setResearchProgress] = useState({ current: 0, total: 0 });

    const [selectedCity, setSelectedCity] = useState<string>('all');
    const [textQuery, setTextQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Attraction[] | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<Attraction | null>(null);

    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

    const attractionsData = trip.attractions || [];

    useEffect(() => {
        if (trip.aiAttractions && trip.aiAttractions.length > 0) setAiCategories(trip.aiAttractions);
    }, [trip.aiAttractions]);

    // Exclude flight-only cities (layovers like AUH) — they're not travel destinations
    // the user actually visits, so they shouldn't pollute the attraction-research scope.
    const tripCities = useMemo(() => getTripCities(trip, { excludeFlightOnly: true }), [trip]);

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

            const response = await generateWithFallback(null, [{ role: 'user', parts: [{ text: prompt }] }], { responseMimeType: 'application/json' }, 'SMART');
            const data = JSON.parse(response.text || '{}');
            if (data.results) {
                const valid = data.results.filter((r: any) => !r.business_status || r.business_status === 'OPERATIONAL').map((r: any, i: number) => ({ ...r, id: `search - attr - ${i} `, categoryTitle: 'תוצאות חיפוש' }));
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
        fetchRecommendations(true, city || trip.destinationEnglish || tripCities[0]);
    };

    const researchAllCities = async () => {
        setIsResearchingAll(true);
        setRecError('');
        const cities = tripCities;
        setResearchProgress({ current: 0, total: cities.length });

        try {
            let accumulatedCategories: AttractionCategory[] = [...aiCategories];

            for (let i = 0; i < cities.length; i++) {
                setResearchProgress({ current: i + 1, total: cities.length });
                const city = cities[i];

                try {
                    const prompt = createResearchPrompt(city);
                    const response = await generateWithFallback(null, [{ role: 'user', parts: [{ text: prompt }] }], { responseMimeType: 'application/json' }, 'SEARCH');
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
                            attractions: (c.attractions || []).map((a: any, j: number) => ({
                                ...a,
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
                } catch (cityErr) {
                    console.error(`Error researching ${city}:`, cityErr);
                }
            }

            setAiCategories(accumulatedCategories);
            onUpdateTrip({ ...trip, aiAttractions: accumulatedCategories });
            setSelectedCity('all');
        } catch (e) {
            console.error("Critical Error in Research All:", e);
            setRecError('שגיאה במהלך מחקר מקיף.');
        } finally {
            setIsResearchingAll(false);
            setResearchProgress({ current: 0, total: 0 });
        }
    };

    const createResearchPrompt = (target: string) => `
    Role: You are the Lead Product Architect and Senior AI Engineer at Google Travel.
    Mission: Re-engineer the Attraction Discovery Engine to implement the "Curator Algorithm" - a strict, quota-based recommendation system.

    **PART 1: THE LOGIC RULES**
    1. **Scope Authority:** Search primarily in "${target}". IF (and only if) the city is small/village, AUTOMATICALLY expand radius to 20km to find quality spots.
    2. **Per-Category Quota:** For EACH of the 10 categories below, return **3 to 5 real attractions** (target 5 when the destination supports it). A major tourist city (Bangkok, Rome, Tokyo, Paris) should easily hit 5 per category; smaller places may yield 3. DO NOT cap total at 6 — full response typically contains 30-50 attractions across all categories.
    3. **NO HALLUCINATIONS:** If a category has no real results (e.g. 'חיי לילה ואווירה' in a rural village), return an empty attractions array for that category. Better empty than fake.
    4. **Scope Strictness:** Every attraction's "location" field MUST clearly be in or near "${target}". REJECT any attraction not in the requested destination — you will fail the task otherwise.

    **PART 2: THE "PERFECT DEFINITION MATRIX" (Output strictly these 10 categories):**
    [אתרי חובה, טבע ונופים, מוזיאונים ותרבות, קניות ושווקים, אקסטרים ופעילויות, חופים ומים, למשפחות וילדים, היסטוריה ודת, חיי לילה ואווירה, פינות נסתרות]

    **PART 3: THE CURATOR PHILOSOPHY**
    When providing recommendations:
    - Cite professional sources (UNESCO, Lonely Planet, Fodor's, Atlas Obscura, etc.)
    - Filter out viral trends without substance or quality backing
    - Prioritize authenticity, quality, and genuine local experiences over popularity
    - Be critical of tourist traps and overhyped locations
    - Provide context about why a place is recommended (historical significance, cultural value, etc.)
    - Consider value for money and realistic expectations
    - Warn about common tourist pitfalls

    OUTPUT JSON ONLY:
    { "categories": [ { "id", "title", "attractions": [ { "name", "description", "location", "rating", "type", "price", "recommendationSource" } ] } ] }
    `;

    const fetchRecommendations = async (forceRefresh = false, specificCity?: string) => {
        setLoadingRecs(true);
        setRecError('');
        try {
            const promptWithJsonInstruction = prompt + `
            
            OUTPUT JSON ONLY(Strict Format):
            {
                "categories": [
                    {
                        "id": "string",
                        "title": "string",
                        "attractions": [
                            { "name", "description", "location", "rating", "type", "price", "recommendationSource" }
                        ]
                    }
                ]
            } `;

            const response = await generateWithFallback(null, [{ role: 'user', parts: [{ text: promptWithJsonInstruction }] }], { responseMimeType: 'application/json' }, 'SEARCH');

            const textContent = response.text;
            console.log("🔍 [AI ATTRACTIONS Raw Response]:", textContent?.substring(0, 500) + "...");

            try {
                const rawData = JSON.parse(textContent || '{}');

                // ROBUST PARSER: Handle both { categories: [...] } and direct [...] formats
                let categoriesList = [];
                if (rawData.categories && Array.isArray(rawData.categories)) {
                    categoriesList = rawData.categories;
                } else if (Array.isArray(rawData)) {
                    categoriesList = rawData;
                }

                if (categoriesList.length > 0) {
                    console.log(`✅[AI Success] Parsed ${categoriesList.length} attraction categories(Format: ${Array.isArray(rawData) ? 'Direct Array' : 'Wrapped Object'})`);
                    const processed = categoriesList.map((c: any, index: number) => ({
                        ...c,
                        id: c.id || `ai-cat-${index}-${Date.now()}`,
                        attractions: (c.attractions || []).map((a: any, i: number) => ({
                            ...a,
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
                    onUpdateTrip({ ...trip, aiAttractions: merged });
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
            const region = attraction.location?.split(',')[0] || 'Unknown City';
            let targetIdx = newAttractions.findIndex(c => c.title === catTitle);
            if (targetIdx === -1) { newAttractions.push({ id: `cat - attr - ${Date.now()} `, title: catTitle, attractions: [] }); targetIdx = newAttractions.length - 1; }
            newAttractions[targetIdx].attractions.push({ ...attraction, id: `added - ${Date.now()} `, region: region });
        }
        onUpdateTrip({ ...trip, attractions: newAttractions });
        setAddedIds(prev => { const next = new Set(prev); if (existingCatIndex !== -1) next.delete(attraction.id); else next.add(attraction.id); return next; });
    };

    // Keep only attractions that belong to any city/country the user is visiting.
    // Guards against legacy / hallucinated data (Banff Canada, Eiffel Tower etc.
    // showing up on a Thailand trip) regardless of which city filter is active.
    const inTripScope = useMemo(() => {
        return (a: any) => {
                const loc = a.location || '';
                if (!loc) return true; // no location info → give benefit of the doubt
                return tripCities.some(c =>
                        locationMatchesCity(loc, c) ||
                        locationMatchesCity(a.description || '', c)
                );
        };
    }, [tripCities]);

    const filteredRecommendations = useMemo(() => {
        let list: any[] = [];
        if (selectedCategory === 'all') aiCategories.forEach(c => list.push(...c.attractions.map(a => ({ ...a, categoryTitle: c.title }))));
        else { const cat = aiCategories.find(c => c.id === selectedCategory); if (cat) list = cat.attractions.map(a => ({ ...a, categoryTitle: cat.title })); }

        // Always trim to trip scope first — drops out-of-country items the AI
        // may have cached from a previous bugged session.
        if (tripCities.length > 0) list = list.filter(inTripScope);

        if (selectedCity !== 'all') {
            list = list.filter(a =>
                locationMatchesCity(a.location || '', selectedCity) ||
                locationMatchesCity(a.description || '', selectedCity)
            );
        }
        if (selectedRater !== 'all') list = list.filter(a => a.recommendationSource === selectedRater);
        return list;
    }, [aiCategories, selectedCategory, selectedRater, selectedCity, tripCities, inTripScope]);

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
        if (window.confirm("להסיר?")) {
            const updated = attractionsData.map(c => ({ ...c, attractions: c.attractions.filter(a => a.id !== id) })).filter(c => c.attractions.length > 0);
            onUpdateTrip({ ...trip, attractions: updated });
        }
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

    const displayTitle = (title: string) => HEBREW_TITLES[title] || title;

    // Filtered Raters (Cleaned)
    const availableRaters = useMemo(() => {
        const sources = new Set<string>();
        const ALLOWED = ['unesco', 'tripadvisor', 'lonely planet', 'atlas obscura', 'timeout', 'google', 'local'];

        aiCategories.forEach(c => c.attractions.forEach(a => {
            if (a.recommendationSource) {
                const low = a.recommendationSource.toLowerCase();
                const isAuth = ALLOWED.some(k => low.includes(k));
                if (isAuth) sources.add(a.recommendationSource);
            }
        }));
        return Array.from(sources).sort();
    }, [aiCategories]);


    const getMapItems = () => {
        const items: any[] = [];
        if (activeTab === 'my_list') attractionsData.forEach(c => c.attractions.forEach(a => items.push({ id: a.id, type: 'attraction', name: a.name, address: a.location, lat: a.lat, lng: a.lng, description: a.description })));
        else aiCategories.forEach(c => c.attractions.forEach(a => items.push({ id: a.id, type: 'attraction', name: a.name, address: a.location, lat: a.lat, lng: a.lng, description: `${a.rating}⭐` })));
        return items;
    };

    return (
        <div className="space-y-4 animate-fade-in pb-10">
            {/* Search Bar */}
            <div className="relative z-20">
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
                    <Search className="w-5 h-5 text-slate-400 mr-2" />
                    <input className="flex-grow outline-none text-slate-700 font-medium text-sm" placeholder='חפש אטרקציה...' value={textQuery} onChange={(e) => setTextQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()} />
                    {textQuery && <button onClick={clearSearch} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-4 h-4" /></button>}
                    <button onClick={handleTextSearch} disabled={isSearching || !textQuery.trim()} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50">{isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}{isSearching ? '...' : 'חיפוש'}</button>
                </div>
                {trip.customAttractionCategories && trip.customAttractionCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {trip.customAttractionCategories.map((cat, idx) => (
                            <button key={idx} onClick={() => { setTextQuery(cat); handleTextSearch(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-purple-50 text-slate-600 rounded-full text-xs font-bold border border-slate-200">{cat}</button>
                        ))}
                    </div>
                )}
            </div>

            {/* Search Results */}
            {searchResults && (
                <div className="space-y-3 animate-fade-in">
                    <div className="flex justify-between items-center"><h3 className="text-lg font-black text-slate-800">תוצאות חיפוש</h3><button onClick={clearSearch} className="text-xs text-slate-500 underline">נקה</button></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {searchResults.map(res => <AttractionRecommendationCard key={res.id} rec={res} tripDestination={trip.destination} isAdded={addedIds.has(res.id) || trip.attractions.some(c => c.attractions.some(a => a.name === res.name))} onAdd={handleToggleRec} onClick={() => setSelectedPlace(res)} />)}
                    </div>
                </div>
            )}

            <div className="bg-slate-100/80 p-1.5 rounded-2xl flex relative mb-2">
                <button
                    onClick={() => setActiveTab('my_list')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all relative z-10 ${activeTab === 'my_list' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Ticket className={`w-4 h-4 ${activeTab === 'my_list' ? 'text-purple-500' : 'text-slate-400'}`} />
                    האטרקציות שלי
                </button>
                <button
                    onClick={() => setActiveTab('recommended')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all relative z-10 ${activeTab === 'recommended' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Sparkles className={`w-4 h-4 ${activeTab === 'recommended' ? 'text-blue-500' : 'text-slate-400'}`} />
                    המלצות TOP (AI)
                </button>
            </div>

            {/* City Filter Bar */}
            {tripCities.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {tripCities.map(city => (
                        <button
                            key={city}
                            onClick={() => setSelectedCity(city)}
                            className={`px-4 py-2 rounded-full text-xs font-black transition-all border ${selectedCity === city ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                        >
                            {city}
                        </button>
                    ))}
                </div>
            )}

            {viewMode === 'map' ? (
                <div className="space-y-3">
                    <div className="flex justify-end"><button onClick={() => setViewMode('list')} className="px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-xs bg-slate-100 text-slate-900 transition-all hover:bg-slate-200"><List className="w-3 h-3" /> חזרה לרשימה</button></div>
                    <UnifiedMapView items={getMapItems()} title={activeTab === 'my_list' ? "מפת אטרקציות שלי" : "מפת המלצות"} />
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
                                            attractionsData.forEach(c => c.attractions.forEach(a => flatList.push({ ...a, categoryTitle: c.title })));

                                            // Filter
                                            let filtered = flatList;
                                            if (selectedCity !== 'all') {
                                                filtered = flatList.filter(a => locationMatchesCity(a.location || '', selectedCity));
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
                            {/* Single compact action row — the top city filter bar (above this
                                tab block) is already enough for picking a city. Here we just
                                offer 'refresh current city' and 'research all' when we already
                                have results. Empty state has its own big CTA. */}
                            {aiCategories.length > 0 && (
                                <div className="flex items-center justify-end gap-2 mb-4">
                                    <button
                                        onClick={() => selectedCity !== 'all' ? initiateResearch(selectedCity) : researchAllCities()}
                                        disabled={loadingRecs || isResearchingAll}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:border-purple-300 hover:text-purple-600 disabled:opacity-50"
                                    >
                                        <RotateCw className={`w-3 h-3 ${(loadingRecs || isResearchingAll) ? 'animate-spin' : ''}`} />
                                        {isResearchingAll
                                            ? `סורק (${researchProgress.current}/${researchProgress.total})`
                                            : loadingRecs
                                                ? 'טוען...'
                                                : (selectedCity !== 'all' ? 'רענן עיר' : 'רענן הכל')}
                                    </button>
                                </div>
                            )}

                            {loadingRecs ? <ThinkingLoader texts={["סורק אטרקציות...", "מחפש פנינים נסתרות...", "בודק דירוגים...", "מצליב מידע עם מקומיים..."]} /> : (
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
                                            <button
                                                onClick={researchAllCities}
                                                disabled={isResearchingAll}
                                                className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white px-8 py-3 rounded-2xl text-base font-black shadow-lg shadow-purple-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2 disabled:opacity-60"
                                            >
                                                {isResearchingAll
                                                    ? <><Loader2 className="w-5 h-5 animate-spin" /> סורק ({researchProgress.current}/{researchProgress.total})</>
                                                    : <><BrainCircuit className="w-5 h-5" /> בצע מחקר לכל הטיול (AI)</>}
                                            </button>
                                            {tripCities.length > 1 && !isResearchingAll && (
                                                <div className="pt-3 border-t border-slate-100 w-full max-w-md">
                                                    <div className="text-[11px] font-bold text-slate-400 mb-2">או מחקר ממוקד לעיר בודדת:</div>
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
                                            {/* Dedupe categories at render time — catches legacy data from
                                                before the merge fix that still has duplicate titles. */}
                                            {(() => {
                                                const seenTitles = new Set<string>();
                                                const uniqueCats = aiCategories.filter(c => {
                                                    const key = displayTitle(c.title);
                                                    if (seenTitles.has(key)) return false;
                                                    seenTitles.add(key);
                                                    return true;
                                                });
                                                return (
                                                    <div className="mb-3 overflow-x-auto pb-2 scrollbar-hide">
                                                        <div className="flex gap-2">
                                                            <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap ${selectedCategory === 'all' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200'}`}>הכל</button>
                                                            {uniqueCats.map(c => <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap ${selectedCategory === c.id ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200'}`}>{displayTitle(c.title)}</button>)}
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
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${showAdvancedFilters || selectedRater !== 'all' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-slate-500 hover:text-slate-700'}`}
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
                />
            )}
        </div>
    );

    // Helper to get all AI recs for initial check
    function allAiAttractions() {
        let all: any[] = [];
        aiCategories.forEach(c => all.push(...c.attractions));
        return all;
    }
};

const AttractionRow: React.FC<{ data: Attraction, onSaveNote: (n: string) => void, onUpdate: (updates: Partial<Attraction>) => void, onDelete: () => void, onSelect: () => void }> = ({ data, onSaveNote, onUpdate, onDelete, onSelect }) => {

    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState(data.notes || '');

    // Use intelligent image mapper
    const { url: mappedUrl, label: visualLabel } = getAttractionImage(
        data.name || '',
        data.description || '',
        [data.categoryTitle || '', data.location || '']
    );
    const visuals = getAttractionVisuals(visualLabel);

    // Fallback Image logic
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
                            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${visuals.gradient}`}>
                                <span>{visuals.icon}</span>
                                <span>{visuals.label}</span>
                            </div>
                            {data.rating && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded">
                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                    {data.rating}
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
                        <textarea className="w-full bg-transparent border-none outline-none text-[10px] text-yellow-900 resize-none" rows={1} value={noteText} onChange={e => setNoteText(e.target.value)} />
                        <button onClick={saveNote} className="text-[10px] font-black text-yellow-700 whitespace-nowrap">שמור</button>
                    </div>
                ) : (
                    <div onClick={() => setIsEditingNote(true)} className="text-[10px] text-slate-400 border border-dashed border-slate-200 rounded-lg p-1.5 flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors">
                        {data.notes ? <><StickyNote className="w-3 h-3 text-yellow-500" /> <span className="text-yellow-900 truncate">{data.notes}</span></> : <span className="opacity-50">+ הערה</span>}
                    </div>
                )}
            </div>
        </div>
    );
};