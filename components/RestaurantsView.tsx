import React, { useState, useMemo, useEffect } from 'react';
import { Trip, Restaurant, RestaurantIconType, RestaurantCategory } from '../types';
import { MapPin, Filter, Coffee, Flame, Fish, Star, Soup, Sandwich, Utensils, StickyNote, Sparkles, BrainCircuit, Loader2, Plus, RotateCw, CheckCircle2, Navigation, Map as MapIcon, List, Calendar, Clock, Trash2, Search, X, Trophy, Wine, Pizza, ChefHat, Store, History, Award, LayoutGrid, RefreshCw, Globe, ChevronLeft, Hotel } from 'lucide-react';
import { Type, Schema } from "@google/genai";
import { getAI, AI_MODEL, SYSTEM_PROMPT, generateWithFallback } from '../services/aiService';
import { CalendarDatePicker } from './CalendarDatePicker';
import { UnifiedMapView } from './UnifiedMapView';
import { ThinkingLoader } from './ThinkingLoader';
import { PlaceCard } from './PlaceCard';
import { GlobalPlaceModal } from './GlobalPlaceModal';

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

import { cleanTextForMap } from '../utils/textUtils';


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
    onAdd: (r: ExtendedRestaurant, cat: string) => void,
    onClick: () => void
}> = ({ rec, tripDestination, tripDestinationEnglish, isAdded, onAdd, onClick }) => {

    // Strict English-Only Maps Query
    const nameForMap = cleanTextForMap(rec.nameEnglish || rec.name);
    const locationForMap = cleanTextForMap(rec.location) || cleanTextForMap(tripDestinationEnglish || tripDestination);
    const mapsQuery = encodeURIComponent(`${nameForMap} ${locationForMap}`);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

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
            visualIcon={visuals.icon}
            visualBgColor="bg-orange-50 group-hover:bg-orange-100"
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
    const [activeTab, setActiveTab] = useState<'my_list' | 'recommended'>('my_list');
    console.log("RestaurantView Loaded - v2 Clean Design - Smart Intent Active");
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    // AI State
    const [aiCategories, setAiCategories] = useState<RestaurantCategory[]>(trip.aiRestaurants || []);
    const [loadingRecs, setLoadingRecs] = useState(false);
    const [recError, setRecError] = useState('');
    // showCitySelector removed

    // UX State
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedRater, setSelectedRater] = useState<string>('all');

    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
    const [selectedCity, setSelectedCity] = useState<string>('all');
    const [textQuery, setTextQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Restaurant[] | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<ExtendedRestaurant | null>(null);

    // Sync state with trip prop
    useEffect(() => {
        if (trip.aiRestaurants && trip.aiRestaurants.length > 0) {
            setAiCategories(trip.aiRestaurants);
        }
    }, [trip.aiRestaurants]);

    const tripCities = useMemo(() => {
        if (!trip.destination) return [];
        // Split by hyphen, ampersand, or comma to handle "Tbilisi & Lopota Lake" or "London - Paris"
        return trip.destination.split(/ - | & |, /).map(s => s.trim()).filter(Boolean);
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
CRITICAL: 'cuisine' field MUST be one of: [Ramen, Pizza, Burger, Sushi, Asian Fusion, Fine Dining, Cafe, Steakhouse, Seafood, Georgian, Dessert, Nightlife].
Description in Hebrew. Netural English names.`;

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
                                googleMapsUrl: { type: Type.STRING },
                                business_status: { type: Type.STRING },
                                verification_needed: { type: Type.BOOLEAN }
                            },
                            required: ["name", "description", "location"]
                        }
                    }
                }
            };

            const response = await generateWithFallback(ai, prompt, { responseMimeType: 'application/json', responseSchema: schema }, 'SMART');

            const textContent = typeof response.text === 'function' ? response.text() : response.text;
            try {
                const data = JSON.parse(textContent || '{}');
                if (data.results) {
                    // Filter out closed businesses
                    const validResults = data.results
                        .filter((r: any) => !r.business_status || r.business_status === 'OPERATIONAL')
                        .map((r: any, i: number) => ({ ...r, id: `search-res-${i}`, categoryTitle: 'תוצאות חיפוש' }));
                    setSearchResults(validResults);

                    // Log filtered count
                    const filtered = data.results.length - validResults.length;
                    if (filtered > 0) {
                        console.log(`✅ Filtered ${filtered} closed business(es) from search results`);
                    }

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

    // --- AI Market Research Logic ---
    const initiateResearch = (city?: string) => {
        fetchRecommendations(true, city || trip.destinationEnglish || tripCities[0]);
    };

    const fetchRecommendations = async (forceRefresh = false, specificCity: string) => {
        setLoadingRecs(true);
        setRecError('');
        try {
            const ai = getAI();
            const currentYear = new Date().getFullYear();
            const prevYear = currentYear - 1;

            // --- STRICT PROMPT ---
            const prompt = `
            Act as a strict, fact-checking Food Guide Editor for ${specificCity}.
            Provide exactly 4 authentic recommendations for each of the following SPECIFIC categories.

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
            2. **DESCRIPTION:** Must be in HEBREW. Very short (max 12 words).
            3. **SOURCES:** Use Michelin, 50 Best, or Local Favorites.
            4. **HOTEL:** If the restaurant is inside a hotel, set isHotelRestaurant = true.
            5. **ICONS:** Set 'cuisine' field to match EXACTLY one of: [Ramen, Pizza, Burger, Sushi, Asian Fusion, Fine Dining, Cafe, Steakhouse, Seafood, Georgian, Dessert, Nightlife].
               - "אוכל רחוב אגדי" -> local_food
               - "הראמן הכי טוב" -> Ramen
               - "הפיצה הכי טובה" -> Pizza
               - "ההמבורגר הכי טוב" -> Burger
               - "נודלס ומוקפצים" -> Asian Fusion
               - "בתי קפה וקינוחים" -> Cafe
               - "מסעדות יוקרה / מישלן" -> Fine Dining
               - "ברים וקוקטיילים" -> Nightlife

            **DATA OUTPUT RULES:**
            - **CRITICAL:** Return ONLY valid JSON.
            - Do NOT return Markdown (no \`\`\`json blocks).
            - Do NOT return conversational text.
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

            const response = await generateWithFallback(ai, prompt, { responseMimeType: 'application/json', responseSchema: schema, temperature: 0.1 }, 'SMART');

            const textContent = typeof response.text === 'function' ? response.text() : response.text;
            try {
                const data = JSON.parse(textContent || '{}');
                if (data.categories) {
                    const processed = data.categories.map((c: any) => ({
                        ...c,
                        region: specificCity,
                        restaurants: c.restaurants.map((r: any, i: number) => ({
                            ...r,
                            id: `ai - rec - ${c.id} -${i} `,
                            categoryTitle: c.title
                        }))
                    }));

                    setAiCategories(processed);
                    setSelectedCategory('all');
                    onUpdateTrip({ ...trip, aiRestaurants: processed });
                }
            } catch (parseError: any) {
                console.error('❌ AI Error: JSON Parse failed in fetchRecommendations. Raw response:', textContent?.substring(0, 500));
                setRecError('שגיאה בפרסור התוצאות. אנא נסה שנית.');
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
            const region = restaurant.location?.split(',')[0] || 'Unknown City';
            let targetCatIndex = newRestaurants.findIndex(c => c.region === region && c.title === catTitle);

            if (targetCatIndex === -1) {
                newRestaurants.push({ id: `cat-${Date.now()}`, title: catTitle, region: region, restaurants: [] });
                targetCatIndex = newRestaurants.length - 1;
            }

            newRestaurants[targetCatIndex].restaurants.push({
                ...restaurant,
                id: `added-${Date.now()}`,
                region: region // Ensure city context is saved
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

    // Filtered Recommended (with City Filter)
    const filteredRestaurants = useMemo(() => {
        let list = [];
        if (selectedCategory === 'all') {
            list = allAiRestaurants;
        } else {
            const cat = aiCategories.find(c => c.id === selectedCategory);
            list = cat ? [...cat.restaurants].sort((a, b) => (b.googleRating || 0) - (a.googleRating || 0)) : [];
        }

        // City Filter
        if (selectedCity !== 'all') {
            list = list.filter(r => (r.location || '').toLowerCase().includes(selectedCity.toLowerCase()));
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
    }, [aiCategories, selectedCategory, selectedRater, selectedCity, allAiRestaurants]);

    // Grouping Logic for "My List"
    const groupedMyList = useMemo(() => {
        const flatList: Restaurant[] = [];
        trip.restaurants.forEach(cat => cat.restaurants.forEach(r => flatList.push(r)));

        // Apply Filters
        let filtered = flatList;
        if (selectedCity !== 'all') {
            filtered = flatList.filter(r => (r.location || '').toLowerCase().includes(selectedCity.toLowerCase()));
        }

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
    }, [trip.restaurants, selectedCity]);


    const getMapItems = () => {
        const items: any[] = [];
        if (activeTab === 'my_list') { trip.restaurants.forEach(cat => cat.restaurants.forEach(r => items.push({ id: r.id, type: 'restaurant', name: r.name, address: r.location, lat: r.lat, lng: r.lng, description: r.description }))); }
        else { allAiRestaurants.forEach(r => items.push({ id: r.id, type: 'restaurant', name: r.name, address: r.location, lat: r.lat, lng: r.lng, description: `${r.googleRating}⭐` })); }
        return items;
    };

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
        <div className="space-y-4 animate-fade-in pb-12">
            {/* Search Bar */}
            <div className="relative z-20">
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
                    <Search className="w-5 h-5 text-slate-400 mr-2" />
                    <input className="flex-grow outline-none text-slate-700 font-medium text-sm" placeholder='חפש מסעדה ספציפית או סוג אוכל...' value={textQuery} onChange={(e) => setTextQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()} />
                    {textQuery && (<button onClick={clearSearch} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-4 h-4" /></button>)}
                    <button onClick={handleTextSearch} disabled={isSearching || !textQuery.trim()} className="bg-orange-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50">{isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}{isSearching ? '...' : 'חיפוש'}</button>
                </div>

                {/* Custom Category Chips (Task 3) */}
                {trip.customFoodCategories && trip.customFoodCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs font-bold text-slate-400 self-center">חיפושים שמורים:</span>
                        {trip.customFoodCategories.map((category, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setTextQuery(category);
                                    handleTextSearch();
                                }}
                                className="group flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-700 rounded-full text-xs font-bold border border-slate-200 transition-all hover:shadow-sm hover:border-orange-200"
                            >
                                <Sparkles className="w-3 h-3 text-orange-400" />
                                {category}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const updated = trip.customFoodCategories?.filter((_, i) => i !== idx);
                                        onUpdateTrip({ ...trip, customFoodCategories: updated });
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-orange-100 rounded-full transition-all text-orange-400"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </button>
                        ))}
                    </div>
                )}
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
                                isAdded={addedIds.has(res.id) || trip.restaurants.some(c => c.restaurants.some(r => r.name === res.name))}
                                onAdd={handleToggleRec}
                                onClick={() => setSelectedPlace(res as ExtendedRestaurant)}
                            />
                        ))}
                    </div>
                    <div className="border-b border-slate-200 my-4"></div>
                </div>
            )}

            <div className="bg-slate-100/80 p-1.5 rounded-2xl flex relative mb-2">
                <button
                    onClick={() => setActiveTab('my_list')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all relative z-10 ${activeTab === 'my_list' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Utensils className={`w-4 h-4 ${activeTab === 'my_list' ? 'text-orange-500' : 'text-slate-400'}`} />
                    הרשימה שלי
                </button>
                <button
                    onClick={() => setActiveTab('recommended')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all relative z-10 ${activeTab === 'recommended' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Sparkles className={`w-4 h-4 ${activeTab === 'recommended' ? 'text-blue-500' : 'text-slate-400'}`} />
                    מחקר שוק (AI)
                </button>
            </div>

            {/* City Filter Bar (Task 3) */}
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
                    <UnifiedMapView items={getMapItems()} title={activeTab === 'my_list' ? `מפת מסעדות שלי` : 'מפת המלצות'} />
                </div>
            ) : (
                <>
                    {activeTab === 'my_list' ? (
                        <>
                            {trip.restaurants.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                                    <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center shadow-inner">
                                        <Utensils className="w-10 h-10 text-orange-300" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xl font-bold text-slate-700">עדיין לא שמרת מסעדות</p>
                                        <p className="text-sm text-slate-500 max-w-xs mx-auto">עבור ללשונית "מחקר שוק" והתחל לאסוף המלצות שוות</p>
                                    </div>
                                    <button onClick={() => setActiveTab('recommended')} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all">התחל לחקור</button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-1">
                                        <button onClick={() => setViewMode('map')} className="px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold text-xs bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 transition-all shadow-sm">
                                            <MapIcon className="w-3 h-3" /> מפה
                                        </button>
                                    </div>

                                    <div className="space-y-8 mt-4">
                                        {Object.entries(groupedMyList).map(([category, items]) => (
                                            <div key={category} className="animate-fade-in">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="h-px bg-slate-200 flex-grow"></div>
                                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                                                        {category} <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded-full">{items.length}</span>
                                                    </h3>
                                                    <div className="h-px bg-slate-200 flex-grow"></div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                    {items.map((r) => (
                                                        <RestaurantRow
                                                            key={r.id}
                                                            data={r}
                                                            onSaveNote={(note) => handleUpdateRestaurant(r.id, { notes: note })}
                                                            onUpdate={(updates) => handleUpdateRestaurant(r.id, updates)}
                                                            onDelete={() => handleDeleteRestaurant(r.id)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {Object.keys(groupedMyList).length === 0 && (
                                            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 mt-4">
                                                <p className="text-slate-500 text-sm font-bold">לא נמצאו מסעדות בסינון זה.</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        /* Recommended Tab */
                        <div className="animate-fade-in">
                            {!loadingRecs && allAiRestaurants.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                    <div className="bg-blue-100 p-4 rounded-full"><BrainCircuit className="w-8 h-8 text-blue-600" /></div>
                                    <h3 className="text-xl font-black text-slate-800">
                                        {tripCities.length > 1 ? 'באיזו עיר נתמקד?' : 'בחר עיר לחיפוש'}
                                    </h3>

                                    {tripCities.length > 1 ? (
                                        <div className="flex flex-wrap justify-center gap-3 max-w-md">
                                            {tripCities.map(city => (
                                                <button
                                                    key={city}
                                                    onClick={() => initiateResearch(city)}
                                                    className="bg-white border-2 border-slate-100 text-slate-700 px-6 py-2 rounded-xl text-sm font-bold shadow-sm hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                                >
                                                    {city}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <button onClick={() => initiateResearch()} className="bg-white border-2 border-blue-500 text-blue-600 px-8 py-3 rounded-2xl text-base font-bold shadow-md hover:shadow-lg hover:bg-blue-50 transition-all">
                                            {trip.destination} - בצע מחקר שוק
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="bg-white border border-slate-100 p-4 rounded-2xl mb-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <div className="flex items-center gap-3"><div className="bg-blue-50 p-2 rounded-full"><BrainCircuit className="w-5 h-5 text-blue-600" /></div><div><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Market Research</h3><p className="font-black text-lg text-slate-800">המלצות AI: Travelers' Choice</p></div></div>

                                        {!loadingRecs && (
                                            <div className="flex items-center gap-2">
                                                {tripCities.length > 1 && (
                                                    <div className="flex gap-2 bg-white/50 p-1.5 rounded-xl">
                                                        {tripCities.map(city => (
                                                            <button
                                                                key={city}
                                                                onClick={() => initiateResearch(city)}
                                                                className="text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-white hover:shadow-sm text-blue-900 transition-all opacity-80 hover:opacity-100"
                                                            >
                                                                {city}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                <button onClick={() => initiateResearch()} className="text-[10px] font-bold text-slate-500 hover:text-blue-600 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg hover:bg-blue-50 flex items-center gap-1 transition-colors"><RotateCw className="w-3 h-3" /> רענן</button>
                                            </div>
                                        )}
                                    </div>

                                    {loadingRecs ? (
                                        <ThinkingLoader texts={[
                                            "סורק בלוגים קולינריים...",
                                            "מחפש המלצות אותנטיות...",
                                            "בודק דירוגי גוגל...",
                                            "מצליב נתונים עם מדריכי טיולים...",
                                            "מסדר לפי קטגוריות..."
                                        ]} />
                                    ) : recError ? (<div className="text-center text-red-500 text-sm font-bold py-4">{recError}</div>) : (
                                        <>
                                            {/* 1. Category Filter */}
                                            <div className="mb-2 overflow-x-auto pb-2 scrollbar-hide">
                                                <div className="flex gap-2 p-1">
                                                    <button onClick={() => setSelectedCategory('all')} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all flex items-center gap-1 ${selectedCategory === 'all' ? 'bg-orange-600 text-white border-orange-600 shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'} `}><LayoutGrid className="w-3 h-3" /> הכל</button>
                                                    {aiCategories.map(cat => (
                                                        <button
                                                            key={cat.id}
                                                            onClick={() => setSelectedCategory(cat.id)}
                                                            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${selectedCategory === cat.id ? 'bg-orange-600 text-white border-orange-600 shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'} `}
                                                        >
                                                            {cat.title}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 2. Rater Filter */}
                                            <div className="mb-4 overflow-x-auto pb-2 scrollbar-hide">
                                                <div className="flex gap-2 items-center">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase flex-shrink-0">הומלץ ע"י:</span>
                                                    <button onClick={() => setSelectedRater('all')} className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${selectedRater === 'all' ? 'bg-orange-600 text-white border-orange-600 shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'} `}>הכל</button>
                                                    {availableRaters.map(rater => (
                                                        <button
                                                            key={rater}
                                                            onClick={() => setSelectedRater(rater)}
                                                            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${selectedRater === rater ? 'bg-orange-600 text-white border-orange-600 shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'} `}
                                                        >
                                                            {rater}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                {filteredRestaurants.map(res => (
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

                                            {filteredRestaurants.length === 0 && (
                                                <div className="text-center py-10 col-span-full">
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

            {/* City Selector Modal Removed */}

            {/* Global Place Modal for Drill-down */}
            {selectedPlace && (
                <GlobalPlaceModal
                    item={selectedPlace}
                    type="restaurant"
                    onClose={() => setSelectedPlace(null)}
                    isAdded={trip.restaurants.some(c => c.restaurants.some(r => r.name === selectedPlace?.name))}
                    onAddToPlan={() => handleToggleRec(selectedPlace, selectedPlace?.categoryTitle || 'תכנון טיול')}
                />
            )}
        </div>
    );
};

const RestaurantRow: React.FC<{ data: Restaurant, onSaveNote: (n: string) => void, onUpdate: (updates: Partial<Restaurant>) => void, onDelete: () => void }> = ({ data, onSaveNote, onUpdate, onDelete }) => {
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState(data.notes || '');
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleTime, setScheduleTime] = useState(data.reservationTime || '');

    const handleSaveSchedule = () => { onUpdate({ reservationTime: scheduleTime }); setIsScheduling(false); };
    const saveNote = () => { onSaveNote(noteText); setIsEditingNote(false); };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 hover:shadow-md transition-shadow relative group">
            <div className="flex justify-between items-start gap-3">
                <div className="flex gap-3 items-start flex-grow min-w-0">
                    <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden relative border border-slate-200">
                        {data.imageUrl ? <img src={data.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">{data.iconType === 'ramen' ? '🍜' : '🍽️'}</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-800 text-sm truncate">{data.name}</h4>
                            {data.michelin && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-md font-bold text-center border border-red-100">MICHELIN</span>}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{data.description || data.location}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                {data.googleRating}
                            </div>
                            <span className="text-[10px] text-slate-400 font-medium">{data.priceRange || '$$'}</span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={onDelete} className="p-1.5 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-3 pt-3 border-t border-slate-50 grid grid-cols-2 gap-2">
                {!isScheduling ? (
                    <button
                        onClick={() => setIsScheduling(true)}
                        className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${data.reservationDate ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-50 text-slate-500 hover:bg-orange-50 hover:text-orange-600'}`}
                    >
                        {data.reservationDate ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                        {data.reservationDate ? 'הוזמן' : 'תזמן'}
                    </button>
                ) : (
                    <div className="col-span-2 bg-orange-50/50 p-2 rounded-xl border border-orange-100 animate-fade-in">
                        <div className="flex items-center gap-2 mb-2">
                            <button
                                onClick={() => {
                                    (window as any)._showRestDatePicker = true;
                                    onUpdate({}); // Force re-render
                                }}
                                className="flex-1 bg-white p-2 rounded-lg border border-orange-200 text-xs font-bold flex items-center justify-between text-slate-700"
                            >
                                <span>{data.reservationDate || "תאריך"}</span>
                                <Calendar className="w-3.5 h-3.5 text-orange-400" />
                            </button>
                            <input
                                type="time"
                                value={scheduleTime}
                                onChange={(e) => setScheduleTime(e.target.value)}
                                className="w-20 bg-white p-2 rounded-lg border border-orange-200 text-xs font-bold text-center outline-none"
                            />
                        </div>
                        {
                            (window as any)._showRestDatePicker && (
                                <CalendarDatePicker
                                    value={data.reservationDate || ''}
                                    title="זיהוי הזמנה"
                                    onChange={(iso) => {
                                        onUpdate({ reservationDate: iso });
                                        (window as any)._showRestDatePicker = false;
                                    }}
                                    onClose={() => (window as any)._showRestDatePicker = false}
                                />
                            )
                        }
                        <div className="flex gap-2">
                            <button onClick={() => setIsScheduling(false)} className="flex-1 py-1.5 text-[10px] font-bold text-slate-400 hover:bg-slate-100 rounded-lg">ביטול</button>
                            <button onClick={handleSaveSchedule} className="flex-1 py-1.5 text-[10px] font-bold bg-orange-500 text-white rounded-lg shadow-sm hover:bg-orange-600">שמור תזמון</button>
                        </div>
                    </div>
                )}

                {/* Notes Section */}
                {isEditingNote ? (
                    <div className="col-span-2 bg-yellow-50 p-2 rounded-xl border border-yellow-200 animate-fade-in">
                        <textarea
                            className="w-full bg-transparent text-xs text-slate-700 font-medium outline-none resize-none placeholder-yellow-800/40"
                            rows={2}
                            placeholder="כתוב הערה..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setIsEditingNote(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600">ביטול</button>
                            <button onClick={saveNote} className="px-3 py-1 bg-yellow-400 text-yellow-900 rounded-lg text-[10px] font-bold hover:bg-yellow-500">שמור</button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setIsEditingNote(true)}
                        className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${data.notes ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-slate-50 text-slate-500 hover:bg-yellow-50 hover:text-yellow-600'}`}
                    >
                        <StickyNote className="w-3.5 h-3.5" />
                        {data.notes ? 'ערוך הערה' : 'הערה'}
                    </button>
                )}
            </div>

            {/* Status Chips */}
            {(data.reservationDate || data.reservationTime || data.notes) && !isScheduling && !isEditingNote && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {data.reservationDate && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold border border-green-100">
                            <Clock className="w-3 h-3" />
                            {data.reservationDate.split('-').reverse().join('/')} {data.reservationTime}
                        </div>
                    )}
                    {data.notes && (
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-[10px] font-bold border border-yellow-100 max-w-full">
                            <StickyNote className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{data.notes}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};