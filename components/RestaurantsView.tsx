import React, { useState, useMemo, useEffect } from 'react';
import { Trip, Restaurant, RestaurantIconType, RestaurantCategory } from '../types';
import { MapPin, Filter, Coffee, Flame, Fish, Star, Soup, Sandwich, Utensils, StickyNote, Sparkles, BrainCircuit, Loader2, Plus, RotateCw, CheckCircle2, Navigation, Map as MapIcon, List, Calendar, Clock, Trash2, Search, X, Trophy, Wine, Pizza, ChefHat, Store, History, Award, LayoutGrid, RefreshCw, Globe, ChevronLeft, Hotel } from 'lucide-react';
import { Type, Schema } from "@google/genai";
import { getAI, AI_MODEL, SYSTEM_PROMPT, generateWithFallback } from '../services/aiService';
import { UnifiedMapView } from './UnifiedMapView';

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

    return { icon: '🍽️', gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white', label: 'Restaurant' };
};

// Helper to remove Hebrew and special chars for Maps URL
const cleanTextForMap = (text: string) => {
    if (!text) return "";
    // Keep only English letters, numbers, and spaces
    return text.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim();
};

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

const RestaurantCard: React.FC<{
    rec: ExtendedRestaurant,
    tripDestination: string,
    tripDestinationEnglish?: string,
    isAdded: boolean,
    onAdd: (r: ExtendedRestaurant, cat: string) => void
}> = ({ rec, tripDestination, tripDestinationEnglish, isAdded, onAdd }) => {

    // Strict English-Only Maps Query
    const nameForMap = cleanTextForMap(rec.nameEnglish || rec.name);
    // Use the city from the location field if available, otherwise trip destination
    const locationForMap = cleanTextForMap(rec.location) || cleanTextForMap(tripDestinationEnglish || tripDestination);

    const mapsQuery = encodeURIComponent(`${nameForMap} ${locationForMap}`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

    // Display Name (Force English)
    const displayName = rec.nameEnglish || cleanTextForMap(rec.name) || rec.name;

    const visuals = getCuisineVisuals(rec.cuisine);

    return (
        <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group relative border border-slate-100 h-full">

            {/* Colorful Header Area */}
            <div className={`h-28 ${visuals.gradient} relative flex flex-col justify-between p-4`}>
                <div className="flex justify-between items-start w-full">
                    <div className="text-3xl filter drop-shadow-md transform group-hover:scale-110 transition-transform duration-300">{visuals.icon}</div>
                    <div className="flex flex-col items-end">
                        {rec.googleRating && (
                            <div className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm text-white">
                                <span className="text-xs font-black">{rec.googleRating}</span>
                                <Star className="w-3 h-3 fill-white text-white" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Name moved to header */}
                <h3 className="text-xl font-black text-white leading-tight font-sans tracking-tight line-clamp-2 drop-shadow-md mt-2" dir="ltr">
                    {displayName}
                </h3>
            </div>

            <div className="p-4 flex flex-col flex-grow relative">

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {rec.recommendationSource && (
                        <span className="text-[9px] font-bold bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full flex items-center gap-1 border border-yellow-100">
                            <Trophy className="w-3 h-3" />
                            {rec.recommendationSource.replace('Bib', 'Michelin')}
                        </span>
                    )}
                    {rec.isHotelRestaurant && (
                        <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-100">
                            <Hotel className="w-3 h-3" /> מסעדת מלון
                        </span>
                    )}
                    <span className="text-[9px] font-bold bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100">
                        {rec.cuisine || visuals.label}
                    </span>
                </div>

                {/* Main Content */}
                <div className="mb-4">
                    <p className="text-sm text-slate-600 line-clamp-4 leading-relaxed font-medium" dir="rtl">
                        {rec.description}
                    </p>
                </div>

                {/* Footer Buttons */}
                <div className="mt-auto pt-3 border-t border-slate-50 flex gap-2">
                    <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-white hover:bg-blue-50 text-slate-500 hover:text-blue-600 border border-slate-200 rounded-xl py-2 flex items-center justify-center gap-2 transition-colors text-[10px] font-bold"
                    >
                        <MapIcon className="w-3.5 h-3.5" /> מפה
                    </a>
                    <button
                        onClick={() => onAdd(rec, rec.categoryTitle || 'AI')}
                        disabled={isAdded}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${isAdded ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                    >
                        {isAdded ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                        {isAdded ? 'נשמר' : 'שמור'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const RestaurantsView: React.FC<{ trip: Trip, onUpdateTrip: (t: Trip) => void }> = ({ trip, onUpdateTrip }) => {
    const [activeTab, setActiveTab] = useState<'my_list' | 'recommended'>('my_list');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    // AI State
    const [aiCategories, setAiCategories] = useState<RestaurantCategory[]>(trip.aiRestaurants || []);
    const [loadingRecs, setLoadingRecs] = useState(false);
    const [recError, setRecError] = useState('');
    const [showCitySelector, setShowCitySelector] = useState(false);

    // UX State
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedRater, setSelectedRater] = useState<string>('all');

    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
    const [textQuery, setTextQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Restaurant[] | null>(null);

    // Sync state with trip prop
    useEffect(() => {
        if (trip.aiRestaurants && trip.aiRestaurants.length > 0) {
            setAiCategories(trip.aiRestaurants);
        }
    }, [trip.aiRestaurants]);

    const tripCities = useMemo(() => {
        if (!trip.destination) return [];
        return trip.destination.split('-').map(s => s.trim());
    }, [trip.destination]);

    // --- Search Logic ---
    const handleTextSearch = async () => {
        if (!textQuery.trim()) return;
        setIsSearching(true);
        setSearchResults(null);
        setRecError('');

        try {
            const ai = getAI();
            const prompt = `${SYSTEM_PROMPT}

Search for: "${textQuery}" in ${trip.destination}. Return 6 high quality restaurant results.
CRITICAL: 'name' MUST be in English. 'nameEnglish' MUST be provided. Description in Hebrew.`;

            const schema: Schema = {
                type: Type.OBJECT,
                properties: {
                    results: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                nameEnglish: { type: Type.STRING },
                                description: { type: Type.STRING },
                                location: { type: Type.STRING },
                                googleRating: { type: Type.NUMBER },
                                reviewCount: { type: Type.NUMBER },
                                cuisine: { type: Type.STRING },
                                iconType: { type: Type.STRING },
                                isHotelRestaurant: { type: Type.BOOLEAN },
                                recommendationSource: { type: Type.STRING },
                                googleMapsUrl: { type: Type.STRING }
                            },
                            required: ["name", "description", "location"]
                        }
                    }
                }
            };

            const response = await generateWithFallback(ai, prompt, { responseMimeType: 'application/json', responseSchema: schema });

            const textContent = typeof response.text === 'function' ? response.text() : response.text;
            const data = JSON.parse(textContent || '{}');
            if (data.results) {
                setSearchResults(data.results.map((r: any, i: number) => ({ ...r, id: `search-res-${i}`, categoryTitle: 'תוצאות חיפוש' })));
            }
        } catch (e: any) {
            console.error(e);
            setRecError('שגיאה בחיפוש. אנא נסה שנית.');
        } finally { setIsSearching(false); }
    };

    const clearSearch = () => { setTextQuery(''); setSearchResults(null); };

    // --- AI Market Research Logic ---
    const initiateResearch = () => {
        if (tripCities.length > 1) {
            setShowCitySelector(true);
        } else {
            fetchRecommendations(true, trip.destinationEnglish || tripCities[0]);
        }
    };

    const fetchRecommendations = async (forceRefresh = false, specificCity: string) => {
        setShowCitySelector(false);
        setLoadingRecs(true);
        setRecError('');
        try {
            const ai = getAI();
            const currentYear = new Date().getFullYear();
            const prevYear = currentYear - 1;

            // --- STRICT PROMPT ---
            const prompt = `
        Act as a strict, fact-checking Food Guide Editor for ${specificCity}.
        Provide exactly 10 authentic recommendations for each of the following SPECIFIC categories.

        **Category Structure (Hebrew Titles):**
        1. "אוכל רחוב אגדי" (Street Food Legends)
        2. "הראמן הכי טוב" (Best Ramen - Must include Ramen places)
        3. "הפיצה הכי טובה" (Best Pizza - Must include Pizza places)
        4. "ההמבורגר הכי טוב" (Best Burger)
        5. "נודלס ומוקפצים" (Noodles & Stir Fry)
        6. "בתי קפה וקינוחים" (Cafes & Desserts)
        7. "מסעדות יוקרה / מישלן" (Fine Dining)
        8. "ברים וקוקטיילים" (Bars)

        **CRITICAL INTEGRITY RULES:**
        1. **NAME:** Must be the REAL English name of the place (e.g. "Raan Jay Fai", "Thipsamai").
        2. **DESCRIPTION:** Must be in HEBREW. Describe the food.
        3. **SOURCES:** Use Michelin, 50 Best, or Local Favorites.
        4. **HOTEL:** If the restaurant is inside a hotel, set isHotelRestaurant = true.
        5. **ICONS:** Determine a 'cuisine' field (e.g. "Ramen", "Pizza", "Burger") for icon matching.

        **DATA OUTPUT RULES:**
        - 'name': English Name.
        - 'nameEnglish': English Name.
        - 'description': Hebrew.
        - 'googleRating': Realistic rating (e.g. 4.5).
        `;

            const schema: Schema = {
                type: Type.OBJECT,
                properties: {
                    categories: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                title: { type: Type.STRING },
                                restaurants: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            name: { type: Type.STRING },
                                            nameEnglish: { type: Type.STRING },
                                            description: { type: Type.STRING },
                                            location: { type: Type.STRING },
                                            cuisine: { type: Type.STRING },
                                            googleRating: { type: Type.NUMBER },
                                            reviewCount: { type: Type.NUMBER },
                                            recommendationSource: { type: Type.STRING },
                                            isHotelRestaurant: { type: Type.BOOLEAN },
                                            iconType: { type: Type.STRING },
                                            googleMapsUrl: { type: Type.STRING }
                                        },
                                        required: ["name", "nameEnglish", "description", "location", "isHotelRestaurant", "recommendationSource", "cuisine"]
                                    }
                                }
                            },
                            required: ["id", "title", "restaurants"]
                        }
                    }
                }
            };

            const response = await generateWithFallback(ai, prompt, { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.1 });

            const textContent = typeof response.text === 'function' ? response.text() : response.text;
            const data = JSON.parse(textContent || '{}');
            if (data.categories) {
                const processed = data.categories.map((c: any) => ({
                    ...c,
                    region: specificCity,
                    restaurants: c.restaurants.map((r: any, i: number) => ({
                        ...r,
                        id: `ai-rec-${c.id}-${i}`,
                        categoryTitle: c.title
                    }))
                }));

                setAiCategories(processed);
                setSelectedCategory('all');
                onUpdateTrip({ ...trip, aiRestaurants: processed });
            }
        } catch (e: any) {
            console.error("AI Error:", e);
            setRecError('שגיאה בטעינת המלצות. אנא נסה שוב.');
        } finally {
            setLoadingRecs(false);
        }
    };

    const allAiRestaurants = useMemo(() => {
        let all: ExtendedRestaurant[] = [];
        aiCategories.forEach(cat => cat.restaurants.forEach(r => all.push({ ...r, categoryTitle: cat.title })));
        // Sort by Rating Descending
        return all.sort((a, b) => (b.googleRating || 0) - (a.googleRating || 0));
    }, [aiCategories]);

    // Extract Raters for Filtering (Recommended)
    const availableRaters = useMemo(() => {
        const sources = new Set<string>();
        allAiRestaurants.forEach(r => {
            if (r.recommendationSource) {
                let provider = r.recommendationSource;
                const low = provider.toLowerCase();
                if (low.includes('michelin')) provider = "Michelin Guide";
                else if (low.includes('50 best')) provider = "50 Best";
                else if (low.includes('local') || low.includes('google')) provider = "Local / Google";
                else {
                    provider = provider.replace(/#\d+|20\d\d/g, '').trim();
                }
                sources.add(provider);
            }
        });
        return Array.from(sources).sort();
    }, [allAiRestaurants]);

    // Filter Recommended
    const filteredRestaurants = useMemo(() => {
        let list = [];
        if (selectedCategory === 'all') {
            list = allAiRestaurants; // Already sorted
        } else {
            const cat = aiCategories.find(c => c.id === selectedCategory);
            list = cat ? [...cat.restaurants].sort((a, b) => (b.googleRating || 0) - (a.googleRating || 0)) : [];
        }

        if (selectedRater !== 'all') {
            list = list.filter(r => {
                if (!r.recommendationSource) return false;
                const raterLower = selectedRater.toLowerCase();
                const sourceLower = r.recommendationSource.toLowerCase();
                if (raterLower === 'michelin guide') return sourceLower.includes('michelin');
                if (raterLower === 'local / google') return (sourceLower.includes('local') || sourceLower.includes('google'));
                return sourceLower.includes(raterLower);
            });
        }
        return list;
    }, [aiCategories, selectedCategory, selectedRater, allAiRestaurants]);

    // Extract Categories and Raters for "My List"
    const myCategories = useMemo(() => trip.restaurants, [trip.restaurants]);
    const [mySelectedCategory, setMySelectedCategory] = useState<string>('all');

    // FLATTEN MY LIST when "All" is selected AND SORT BY FAVORITE
    const filteredMyList = useMemo(() => {
        if (mySelectedCategory === 'all') {
            // Flatten everything into one list
            const flatList: Restaurant[] = [];
            myCategories.forEach(cat => flatList.push(...cat.restaurants));
            // Sort by Favorite THEN Rating
            return sortMyRestaurants(flatList);
        }
        // Return specific category (will still be rendered as category group but with 1 item)
        const cat = myCategories.find(c => c.title === mySelectedCategory);
        if (cat) {
            return [{ ...cat, restaurants: sortMyRestaurants([...cat.restaurants]) }];
        }
        return [];
    }, [myCategories, mySelectedCategory]);

    const handleAddRec = (restaurant: Restaurant, catTitle: string) => {
        let newRestaurants = [...trip.restaurants];
        let targetRegion = 'כללי';
        let targetCatIndex = newRestaurants.findIndex(c => c.region === targetRegion && c.title === catTitle);
        if (targetCatIndex === -1) {
            newRestaurants.push({ id: `cat-${Date.now()}`, title: catTitle, region: targetRegion, restaurants: [] });
            targetCatIndex = newRestaurants.length - 1;
        }
        const exists = newRestaurants[targetCatIndex].restaurants.some(r => r.name === restaurant.name);
        if (!exists) {
            newRestaurants[targetCatIndex].restaurants.push({ ...restaurant, id: `added-${Date.now()}` });
            onUpdateTrip({ ...trip, restaurants: newRestaurants });
            setAddedIds(prev => new Set(prev).add(restaurant.id));
            setTimeout(() => { setAddedIds(prev => { const next = new Set(prev); next.delete(restaurant.id); return next; }); }, 2000);
        }
    };

    const getMapItems = () => {
        const items: any[] = [];
        if (activeTab === 'my_list') { trip.restaurants.forEach(cat => cat.restaurants.forEach(r => items.push({ id: r.id, type: 'restaurant', name: r.name, address: r.location, lat: r.lat, lng: r.lng, description: r.description }))); }
        else { allAiRestaurants.forEach(r => items.push({ id: r.id, type: 'restaurant', name: r.name, address: r.location, lat: r.lat, lng: r.lng, description: `${r.googleRating}⭐` })); }
        return items;
    };

    return (
        <div className="space-y-4 animate-fade-in pb-12">
            {/* Search Bar */}
            <div className="relative z-20">
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
                    <Search className="w-5 h-5 text-slate-400 mr-2" />
                    <input className="flex-grow outline-none text-slate-700 font-medium text-sm" placeholder='חפש מסעדה ספציפית או סוג אוכל...' value={textQuery} onChange={(e) => setTextQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()} />
                    {textQuery && (<button onClick={clearSearch} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-4 h-4" /></button>)}
                    <button onClick={handleTextSearch} disabled={isSearching || !textQuery.trim()} className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50">{isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}{isSearching ? '...' : 'חיפוש'}</button>
                </div>
            </div>

            {searchResults && (
                <div className="space-y-3 animate-fade-in">
                    <div className="flex justify-between items-center"><h3 className="text-lg font-black text-slate-800">תוצאות חיפוש</h3><button onClick={clearSearch} className="text-xs text-slate-500 hover:text-red-500 underline">נקה</button></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {searchResults.map(res => (
                            <RestaurantCard
                                key={res.id}
                                rec={res as ExtendedRestaurant}
                                tripDestination={trip.destination}
                                tripDestinationEnglish={trip.destinationEnglish}
                                isAdded={addedIds.has(res.id)}
                                onAdd={handleAddRec}
                            />
                        ))}
                    </div>
                    <div className="border-b border-slate-200 my-4"></div>
                </div>
            )}

            <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 p-1.5 flex mb-2">
                <button onClick={() => setActiveTab('my_list')} className={`flex-1 py-3 rounded-[1.2rem] text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === 'my_list' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}><Utensils className="w-4 h-4" /> הרשימה שלי</button>
                <button onClick={() => setActiveTab('recommended')} className={`flex-1 py-3 rounded-[1.2rem] text-sm font-black flex items-center justify-center gap-2 transition-all ${activeTab === 'recommended' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg' : 'text-slate-500 hover:bg-orange-50 hover:text-orange-600'}`}><Sparkles className="w-4 h-4" /> מחקר שוק (AI)</button>
            </div>

            {viewMode === 'map' ? (
                <div className="space-y-3">
                    <div className="flex justify-end"><button onClick={() => setViewMode('list')} className="px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-xs bg-slate-100 text-slate-900 transition-all hover:bg-slate-200"><List className="w-3 h-3" /> חזרה לרשימה</button></div>
                    <UnifiedMapView items={getMapItems()} title={activeTab === 'my_list' ? `מפת מסעדות שלי` : 'מפת המלצות'} />
                </div>
            ) : (
                <>
                    {activeTab === 'my_list' ? (
                        <>
                            {trip.restaurants.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                                    <div className="bg-orange-50 p-8 rounded-full shadow-inner animate-pulse">
                                        <Utensils className="w-16 h-16 text-orange-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-slate-800">רשימה ריקה</h3>
                                        <p className="text-slate-500 font-medium mt-2 max-w-xs mx-auto">תן ל-AI לבצע מחקר שוק מעמיק ולמצוא את המקומות הטובים ביותר בעיר.</p>
                                    </div>
                                    <button onClick={() => { setActiveTab('recommended'); initiateResearch(); }} className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-2xl font-bold shadow-xl shadow-orange-200 hover:scale-105 transition-transform flex items-center gap-2">
                                        <Sparkles className="w-5 h-5" /> התחל מחקר שוק (AI)
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-1"><button onClick={() => setViewMode('map')} className="px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold text-xs bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 transition-all shadow-sm"><MapIcon className="w-3 h-3" /> מפה</button></div>

                                    <div className="mb-2 overflow-x-auto pb-2 scrollbar-hide">
                                        <div className="flex gap-2">
                                            <button onClick={() => setMySelectedCategory('all')} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${mySelectedCategory === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200'}`}>הכל</button>
                                            {myCategories.map(cat => (
                                                <button key={cat.id} onClick={() => setMySelectedCategory(cat.title)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${mySelectedCategory === cat.title ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 border-slate-200'}`}>{cat.title}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4 mt-2">
                                        {mySelectedCategory === 'all' ? (
                                            /* FLATTENED LIST */
                                            <div className="flex flex-col gap-3">
                                                {(filteredMyList as Restaurant[]).map((restaurant) => (
                                                    <RestaurantRow
                                                        key={restaurant.id}
                                                        data={restaurant}
                                                        tripDestination={trip.destination}
                                                        tripDestinationEnglish={trip.destinationEnglish}
                                                        onSaveNote={(n) => onUpdateTrip({ ...trip, restaurants: trip.restaurants.map(c => ({ ...c, restaurants: c.restaurants.map(r => r.id === restaurant.id ? { ...r, notes: n } : r) })) })}
                                                        onUpdate={(u) => onUpdateTrip({ ...trip, restaurants: trip.restaurants.map(c => ({ ...c, restaurants: c.restaurants.map(r => r.id === restaurant.id ? { ...r, ...u } : r) })) })}
                                                        onDelete={() => { if (window.confirm('למחוק?')) onUpdateTrip({ ...trip, restaurants: trip.restaurants.map(c => ({ ...c, restaurants: c.restaurants.filter(r => r.id !== restaurant.id) })).filter(c => c.restaurants.length > 0) }) }}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            /* CATEGORY VIEW */
                                            (filteredMyList as RestaurantCategory[]).map((cat) => (
                                                <div key={cat.id} className="animate-fade-in">
                                                    <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center justify-between">{cat.title}<span className="text-[10px] font-normal bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{cat.region}</span></h3>
                                                    <div className="flex flex-col gap-3">
                                                        {cat.restaurants.map((restaurant) => (
                                                            <RestaurantRow
                                                                key={restaurant.id}
                                                                data={restaurant}
                                                                tripDestination={trip.destination}
                                                                tripDestinationEnglish={trip.destinationEnglish}
                                                                onSaveNote={(n) => onUpdateTrip({ ...trip, restaurants: trip.restaurants.map(c => c.id === cat.id ? { ...c, restaurants: c.restaurants.map(r => r.id === restaurant.id ? { ...r, notes: n } : r) } : c) })}
                                                                onUpdate={(u) => onUpdateTrip({ ...trip, restaurants: trip.restaurants.map(c => c.id === cat.id ? { ...c, restaurants: c.restaurants.map(r => r.id === restaurant.id ? { ...r, ...u } : r) } : c) })}
                                                                onDelete={() => { if (window.confirm('למחוק?')) onUpdateTrip({ ...trip, restaurants: trip.restaurants.map(c => c.id === cat.id ? { ...c, restaurants: c.restaurants.filter(r => r.id !== restaurant.id) } : c).filter(c => c.restaurants.length > 0) }) }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="animate-fade-in">
                            {!loadingRecs && aiCategories.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 space-y-6">
                                    <div className="bg-orange-100 p-6 rounded-full"><Navigation className="w-10 h-10 text-orange-600" /></div>
                                    <h3 className="text-2xl font-black text-slate-800">איפה אוכלים היום?</h3>
                                    <button onClick={initiateResearch} className="bg-white border-2 border-orange-500 text-orange-600 px-8 py-3 rounded-2xl text-base font-bold shadow-md hover:shadow-lg hover:bg-orange-50 transition-all">
                                        {trip.destination} - בצע מחקר שוק
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-slate-900 text-white p-4 rounded-2xl mb-4 shadow-lg flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3"><div className="bg-white/10 p-2 rounded-full backdrop-blur-sm"><BrainCircuit className="w-5 h-5 text-orange-400" /></div><div><h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Market Research</h3><p className="font-black text-lg">מדריך האוכל המלא</p></div></div>
                                        {!loadingRecs && (<button onClick={initiateResearch} className="text-[10px] font-bold text-orange-400 bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20 flex items-center gap-1"><RotateCw className="w-3 h-3" /> מחקר חדש</button>)}
                                    </div>

                                    {loadingRecs ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-center">
                                            <Loader2 className="w-10 h-10 text-orange-600 animate-spin mb-4" />
                                            <h3 className="text-xl font-bold text-slate-800">סורק מדריכים בינלאומיים...</h3>
                                            <p className="text-slate-500 text-sm mt-2 max-w-xs">מאמת נתונים כדי למנוע טעויות...</p>
                                        </div>
                                    ) : recError ? (
                                        <div className="text-center py-10">
                                            <p className="text-red-500 text-sm font-bold mb-4">{recError}</p>
                                            <button onClick={initiateResearch} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:scale-105 transition-transform flex items-center gap-2 mx-auto">
                                                <RefreshCw className="w-4 h-4" /> נסה שנית
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-2 overflow-x-auto pb-2 scrollbar-hide">
                                                <div className="flex gap-2">
                                                    <button onClick={() => setSelectedCategory('all')} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all flex items-center gap-1 ${selectedCategory === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200'}`}><LayoutGrid className="w-3 h-3" /> הכל</button>
                                                    {aiCategories.map(cat => (
                                                        <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${selectedCategory === cat.id ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 border-slate-200'}`}>{cat.title}</button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mb-4 overflow-x-auto pb-2 scrollbar-hide">
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase flex-shrink-0">הומלץ ע"י:</span>
                                                    <button onClick={() => setSelectedRater('all')} className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${selectedRater === 'all' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-slate-500 border-slate-200'}`}>הכל</button>
                                                    {availableRaters.map(rater => (
                                                        <button key={rater} onClick={() => setSelectedRater(rater)} className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${selectedRater === rater ? 'bg-orange-100 text-orange-700 border-orange-200 ring-2 ring-orange-100' : 'bg-white text-slate-500 border-slate-200'}`}>{rater}</button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                {filteredRestaurants.map((rec) => (
                                                    <RestaurantCard
                                                        key={rec.id}
                                                        rec={rec}
                                                        tripDestination={trip.destination}
                                                        tripDestinationEnglish={trip.destinationEnglish}
                                                        isAdded={addedIds.has(rec.id)}
                                                        onAdd={handleAddRec}
                                                    />
                                                ))}
                                            </div>

                                            {filteredRestaurants.length === 0 && (
                                                <div className="text-center py-10">
                                                    <p className="text-slate-400 font-bold">אין תוצאות בקטגוריה זו.</p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </>
            )}

            {showCitySelector && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-6 text-center">
                            <h3 className="text-xl font-black text-slate-800 mb-2">בחר עיר למחקר</h3>
                            <p className="text-sm text-slate-500 mb-6">ה-AI יבצע מחקר מעמיק על העיר שתבחר</p>
                            <div className="space-y-3">
                                {tripCities.map(city => (
                                    <button
                                        key={city}
                                        onClick={() => fetchRecommendations(true, city)}
                                        className="w-full py-4 rounded-xl border-2 border-slate-100 font-bold text-slate-700 hover:border-orange-500 hover:bg-orange-50 hover:text-orange-700 transition-all"
                                    >
                                        {city}
                                    </button>
                                ))}
                            </div>
                            <button onClick={() => setShowCitySelector(false)} className="mt-6 text-xs font-bold text-slate-400 hover:text-slate-600">ביטול</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Reused Component with new design
const RestaurantRow: React.FC<{
    data: Restaurant,
    tripDestination: string,
    tripDestinationEnglish?: string,
    onSaveNote: (n: string) => void,
    onUpdate: (updates: Partial<Restaurant>) => void,
    onDelete: () => void
}> = ({ data, tripDestination, tripDestinationEnglish, onSaveNote, onUpdate, onDelete }) => {

    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState(data.notes || '');
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const toInputDate = (d?: string) => d ? d.split('/').reverse().join('-') : '';
    const fromInputDate = (d: string) => d.split('-').reverse().join('/');

    useEffect(() => {
        if (data.reservationDate) setScheduleDate(toInputDate(data.reservationDate));
        if (data.reservationTime) setScheduleTime(data.reservationTime);
    }, [data.reservationDate, data.reservationTime]);

    const handleSaveSchedule = () => { onUpdate({ reservationDate: fromInputDate(scheduleDate), reservationTime: scheduleTime }); setIsScheduling(false); };
    const saveNote = () => { onSaveNote(noteText); setIsEditingNote(false); };
    const toggleFavorite = () => { onUpdate({ isFavorite: !data.isFavorite }); };

    // Maps
    const extendedData = data as ExtendedRestaurant;
    const nameForMap = cleanTextForMap(extendedData.nameEnglish || data.name);
    const locationForMap = cleanTextForMap(data.location) || cleanTextForMap(tripDestinationEnglish || tripDestination);
    const mapsQuery = encodeURIComponent(`${nameForMap} ${locationForMap}`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

    const visuals = getCuisineVisuals(extendedData.cuisine);

    return (
        <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all group flex flex-col md:flex-row gap-3 relative overflow-hidden pl-3 py-3 pr-3 md:pr-0 ${data.isFavorite ? 'border-yellow-200 ring-1 ring-yellow-100' : 'border-slate-100'}`}>
            <div className={`absolute right-0 top-0 bottom-0 w-1 ${visuals.gradient.split(' ')[0]}`}></div>

            <div className="flex-grow min-w-0 pr-2">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <button onClick={toggleFavorite} className="focus:outline-none">
                                <Star className={`w-5 h-5 transition-all ${data.isFavorite ? 'text-yellow-400 fill-yellow-400 scale-110' : 'text-slate-300 hover:text-yellow-400'}`} />
                            </button>
                            <span className="text-lg">{visuals.icon}</span>
                            <h4 className="text-base font-black text-slate-900 leading-tight tracking-tight font-sans" dir="ltr">
                                {extendedData.nameEnglish || data.name}
                            </h4>
                            {data.googleRating && (
                                <div className="flex items-center bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                    <span className="text-[10px] font-bold text-slate-800">{data.googleRating}</span>
                                    <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400 ml-0.5" />
                                </div>
                            )}
                        </div>
                        {/* Increased Text Size */}
                        <p className="text-slate-600 text-sm mt-1 leading-snug line-clamp-2 md:line-clamp-1">{data.description}</p>

                        <div className="flex gap-2 mt-2">
                            {data.recommendationSource && (
                                <div className="inline-flex items-center text-[9px] font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 w-fit">
                                    <Trophy className="w-2.5 h-2.5 mr-1 text-yellow-600" /> {data.recommendationSource.replace('Bib', 'Michelin')}
                                </div>
                            )}
                            {extendedData.isHotelRestaurant && (
                                <div className="inline-flex items-center text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 w-fit">
                                    <Hotel className="w-2.5 h-2.5 mr-1" /> במלון
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-1 pl-1 ml-auto md:ml-0 self-start">
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 rounded-lg hover:bg-blue-50 transition-colors"><MapIcon className="w-4 h-4" /></a>
                        <button onClick={() => setIsScheduling(!isScheduling)} className={`p-2 rounded-lg border ${data.reservationDate ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'}`}><Calendar className="w-4 h-4" /></button>
                        <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>

                {isScheduling && (<div className="mt-3 bg-orange-50 p-2 rounded-lg border border-orange-100 flex items-center gap-2 animate-fade-in"><input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full p-1.5 rounded border border-orange-200 text-xs" /><input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full p-1.5 rounded border border-orange-200 text-xs" /><button onClick={handleSaveSchedule} className="bg-orange-600 text-white px-3 py-1.5 rounded text-xs font-bold whitespace-nowrap">שמור</button></div>)}
                {!isScheduling && data.reservationDate && (<div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-50 w-fit px-2 py-1 rounded border border-orange-100"><Clock className="w-3 h-3" /> {data.reservationDate} {data.reservationTime}</div>)}
                <div className="mt-2">{isEditingNote ? (<div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200"><textarea className="w-full bg-transparent border-none outline-none text-xs text-slate-800 resize-none" rows={1} placeholder="הערה..." value={noteText} onChange={e => setNoteText(e.target.value)} /><div className="flex justify-end gap-2"><button onClick={() => setIsEditingNote(false)} className="text-[10px] text-slate-500">ביטול</button><button onClick={saveNote} className="text-[10px] bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded font-bold">שמור</button></div></div>) : (<div onClick={() => setIsEditingNote(true)} className={`px-2 py-1.5 rounded-lg border text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${data.notes ? 'bg-yellow-50 border-yellow-100 text-yellow-900' : 'bg-slate-50 border-dashed border-slate-200 text-slate-400 hover:border-slate-300'}`}><StickyNote className={`w-3 h-3 flex-shrink-0 ${data.notes ? 'text-yellow-600' : 'text-gray-400'}`} /><span className="line-clamp-1">{data.notes || 'הוסף הערה...'}</span></div>)}</div>
            </div>
        </div>
    );
};