import React, { useState, useMemo, useEffect } from 'react';
import { Trip, Restaurant, RestaurantIconType, RestaurantCategory } from '../types';
import { MapPin, Filter, Coffee, Flame, Fish, Star, Soup, Sandwich, Utensils, StickyNote, Sparkles, BrainCircuit, Loader2, Plus, RotateCw, CheckCircle2, Navigation, Map as MapIcon, List, Calendar, Clock, Trash2, Search, X, Trophy, Wine, Pizza, ChefHat, Store, History, Award, LayoutGrid, RefreshCw, Globe, ChevronLeft, Hotel, Heart } from 'lucide-react';
// cleaned imports
import { getFoodImage } from '../services/imageMapper';
import { SYSTEM_PROMPT, generateWithFallback } from '../services/aiService';
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

    if (c.includes('local') || c.includes('authentic') || c.includes('georgian'))
        return { icon: '🍲', gradient: 'bg-gradient-to-br from-amber-500 to-orange-700 text-white', label: 'Local Authentic' };

    if (c.includes('family'))
        return { icon: '👨‍👩‍👧‍👦', gradient: 'bg-gradient-to-br from-green-400 to-teal-600 text-white', label: 'Family Friendly' };

    return { icon: '🍽️', gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white', label: 'Restaurant' };
};

import { cleanTextForMap } from '../utils/textUtils';
import { getTripCities, locationMatchesCity } from '../utils/geoData';


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
    // Smart default: if the user has no saved restaurants, land them directly on
    // the research tab so they see the CTA without an extra click. Power users
    // with their own saved list still land on 'my_list'.
    const [activeTab, setActiveTab] = useState<'my_list' | 'recommended'>(
        (trip.restaurants?.length || 0) === 0 ? 'recommended' : 'my_list'
    );
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
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [isResearchingAll, setIsResearchingAll] = useState(false);
    const [researchProgress, setResearchProgress] = useState({ current: 0, total: 0 });

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

    // Exclude flight-only cities (layovers like AUH) — they're not travel destinations
    // the user actually stays in, so they shouldn't pollute the food-research scope.
    const tripCities = useMemo(() => getTripCities(trip, { excludeFlightOnly: true }), [trip]);

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
                    const validResults = data.results
                        .filter((r: any) => !r.business_status || r.business_status === 'OPERATIONAL')
                        .map((r: any, i: number) => ({ ...r, id: `search-res-${i}`, categoryTitle: 'תוצאות חיפוש' }));
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

    // --- AI Market Research Logic ---
    const initiateResearch = (city?: string) => {
        fetchRecommendations(true, city || trip.destinationEnglish || tripCities[0]);
    };

    const researchAllCities = async () => {
        setIsResearchingAll(true);
        setRecError('');
        const cities = tripCities;
        setResearchProgress({ current: 0, total: cities.length });

        try {
            let accumulatedCategories: RestaurantCategory[] = [...aiCategories];

            for (let i = 0; i < cities.length; i++) {
                setResearchProgress({ current: i + 1, total: cities.length });
                const city = cities[i];

                try {
                    const prompt = createResearchPrompt(city);
                    const response = await generateWithFallback(null, [{ role: 'user', parts: [{ text: prompt }] }], { responseMimeType: 'application/json', temperature: 0.1 }, 'SMART');
                    const rawData = JSON.parse(response.text || '{}');
                    const categoriesList = rawData.categories || (Array.isArray(rawData) ? rawData : []);

                    if (categoriesList.length > 0) {
                        const processed = categoriesList.map((c: any, index: number) => ({
                            ...c,
                            id: c.id || `ai-food-cat-${city}-${index}-${Date.now()}`,
                            region: city,
                            restaurants: (c.restaurants || []).map((r: any, j: number) => ({
                                ...r,
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
                } catch (cityErr) {
                    console.error(`Error researching ${city}:`, cityErr);
                }
            }

            setAiCategories(accumulatedCategories);
            onUpdateTrip({ ...trip, aiRestaurants: accumulatedCategories });
            setSelectedCity('all');
        } catch (e) {
            console.error("Critical Error in Research All:", e);
            setRecError('שגיאה במהלך מחקר מקיף.');
        } finally {
            setIsResearchingAll(false);
            setResearchProgress({ current: 0, total: 0 });
        }
    };

    const createResearchPrompt = (specificCity: string) => `
    Role: You are the Lead Product Architect and Senior AI Engineer at Google Travel.
    Mission: Re-engineer the Restaurant Discovery Engine to implement the "Curator Algorithm" - a strict, quota-based recommendation system.

    **PART 1: THE LOGIC RULES**
    1. **Scope Authority:** Search primarily in "${specificCity}".
    2. **Quality > Quantity:** Return **UP TO 6** recommendations.
    
    **PART 2: THE "PERFECT DEFINITION MATRIX" (Standard 10 Categories)**
    [Authentic Local Food, Luxury & Michelin, Cocktail Bars, Family Friendly, Ramen, Pizza, Burger, Cafe & Dessert, Thai, Japanese]

    **PART 3: THE CURATOR PHILOSOPHY**
    When providing recommendations:
    - Cite professional sources (Michelin Guide, James Beard Foundation, Lonely Planet, Fodor's, etc.)
    - Filter out viral trends without substance or quality backing
    - Prioritize authenticity, quality, and genuine local experiences over popularity
    - Be critical of tourist traps and overhyped locations
    - Provide context about why a place is recommended (awards, chef credentials, historical significance, etc.)
    - Consider value for money and realistic expectations
    - Warn about common tourist pitfalls

    OUTPUT JSON ONLY:
    { "categories": [ { "id", "title", "restaurants": [ { "name", "nameEnglish", "description", "location", "cuisine", "googleRating", "recommendationSource", "isHotelRestaurant", "googleMapsUrl" } ] } ] }
    `;

    const fetchRecommendations = async (forceRefresh = false, specificCity: string) => {
        setLoadingRecs(true);
        setRecError('');
        try {
            const currentYear = new Date().getFullYear();
            const prevYear = currentYear - 1;

            // --- CURATOR ALGORITHM v2.0 (Strict Quota System) ---
            const prompt = `
            Role: You are the Lead Product Architect and Senior AI Engineer at Google Travel.
            Mission: Re-engineer the Restaurant Discovery Engine to implement the "Curator Algorithm" - a strict, quota-based recommendation system.

            **PART 1: THE LOGIC RULES**
            1. **Scope Authority:** Search primarily in "${specificCity}". IF (and only if) the city is small/village, AUTOMATICALLY expand radius to 30km to find quality spots.
            2. **Quality > Quantity:** Return **UP TO 6** recommendations. If only 3 amazing places exist, return 3. Do NOT fill with mediocrity.
            3. **NO HALLUCINATIONS:** If a category (e.g. Ramen) has no real results in this city, return an empty list. Better empty than fake.
            4. **Quality Firewall:** STRICTLY REJECT global fast-food chains (McDonald's, Starbucks, KFC). Prioritize "Chef-Driven" and "Local Legend" spots.
            5. **Context Verification:** You are searching for "${specificCity}". Ensure this is a real location.
            6. **NO TRANSPORT DATA:** Do NOT return flights, trains, or hotels. ONLY RESTAURANTS. If you return "transport" or "flight" data, you fail.

            **PART 2: THE "PERFECT DEFINITION MATRIX" (Output strictly these 10 categories):**
            
            1. **"אוכל מקומי אותנטי"** (Authentic Local Food)
               - Persona: The City's Pride. Iconic places serving the region's signature dish.
               - Anti-Pattern: International food disguised as local.
               
            2. **"יוקרה ומישלן"** (Luxury & Michelin)
               - Persona: The Experience. White tablecloths, tasting menus.
               - Anti-Pattern: Casual or messy environments.

            3. **"ברי קוקטיילים"** (Cocktail Bars)
               - Persona: The Vibe. Mixology, speakeasies, high-end hotel bars.
               - Anti-Pattern: Dance clubs, dive bars, student pubs.
               
            4. **"מסעדות משפחתיות"** (Family Friendly)
               - Persona: The Balance. Great food with space for strollers/kids.
               - Anti-Pattern: Cramped, silent, or dark places.

            5. **"ראמן"** (Ramen)
               - Persona: Slurp & Soul. Dedicated Tonkotsu/Shoyu bars.
               - Anti-Pattern: Generic Asian places that "have soup".

            6. **"פיצה"** (Pizza)
               - Title ID: pizza
               - Hebrew Title: "פיצה"
               - Persona: Dough & Fire. Wood-fired Neapolitan/Roman.
               - Multi-Lingual Rule: The JSON 'title' field MUST be "פיצה".

            7. **"המבורגר"** (Burger)
               - Title ID: burger
               - Hebrew Title: "המבורגר"
               - Persona: Meat & Bun. Gourmet/Smash burgers.
               - Multi-Lingual Rule: The JSON 'title' field MUST be "המבורגר".

            8. **"בתי קפה וקינוחים"** (Cafe & Dessert)
               - Title ID: cafe_dessert
               - Hebrew Title: "בתי קפה וקינוחים"
               - Persona: Third Wave & Sugar. Specialty roasters, Patisseries.
               - Multi-Lingual Rule: The JSON 'title' field MUST be "בתי קפה וקינוחים".

            9. **"תאילנדי"** (Thai)
               - Title ID: thai
               - Hebrew Title: "תאילנדי"
               - Persona: Spice & Wok. Authentic Pad Thai/Green Curry.
               - Multi-Lingual Rule: The JSON 'title' field MUST be "תאילנדי".

            10. **"יפני"** (Japanese - NO RAMEN)
                - Title ID: japanese
                - Hebrew Title: "יפני"
                - Persona: Precision. Sushi, Izakaya, Katsu.
                - Multi-Lingual Rule: The JSON 'title' field MUST be "יפני".

            **PART 3: DATA INTEGRITY**
            - **CRITICAL:** Return pure JSON.
            - **Titles:** The 'title' field in the JSON categories MUST be the Hebrew string (e.g. "פיצה", not "Pizza").
            - **Icons:** Map 'cuisine' field to internal IDs: [Local, Fine, Bar, Family, Ramen, Pizza, Burger, Cafe, Thai, Japanese].
            - **Hotel:** If inside a hotel, set isHotelRestaurant = true.
            
            **PART 4: AUTHORITY SOURCES ONLY**
            - The 'recommendationSource' field must be a REAL, recognized authority.
            - **ALLOWED SOURCES:** [Michelin Guide, 50 Best, TimeOut, Eater, TripAdvisor, Google Review, Local Legend, Gault & Millau].
            - **BANNED SOURCES:** Generic names like "Burger Blog", "Bar Awards", "Foodie Guy", "American Blog".
            - If no specific source exists, use "Google Review" or "Local Legend".

            **PART 5: CRITICAL QUALITY RULES (THE CURATOR PHILOSOPHY)**
            When providing recommendations:
            - **Cite professional sources** (Michelin Guide, James Beard Foundation, Lonely Planet, Fodor's, etc.)
            - **Filter out viral trends** without substance or quality backing (avoid "TikTok hype" if food is mediocre).
            - **Prioritize authenticity, quality, and genuine local experiences** over popularity.
            - **Be critical of tourist traps** and overhyped locations.
            - **Provide context** about why a place is recommended (awards, chef credentials, historical significance, etc.).
            - **Consider value for money** and realistic expectations.
            - **Warn about common tourist pitfalls**.
            
            Your goal is to provide trustworthy, well-researched recommendations that travelers can rely on.

            **PART 6: REVIEW & FORMATTING RULES**
            - **Review Check:** MUST have > 50 reviews (prefer >100). Do NOT invent places.
            - **Anti-Tourist Trap Rule:** REJECT places with > 3000 reviews but rating < 4.4. (High volume + mediocre score = Trap).
            - **Hotel Logic:** EXCLUDE hotels unless they have a SPECIFIC, NAMED restaurant (e.g. "Alain Ducasse at The Dorchester"). Do NOT recommend "The Hilton" as a restaurant.
            - **Language Rule:** Descriptions MUST be in HEBREW Only.
            - **Location Format:** "Street, City". Do NOT include text like "(30km radius)" or "(Approx)".
            - **Hotel Logic (Naming):** If restaurant is inside a hotel, set 'isHotelRestaurant' = true and use "Name (at Hotel)" format.
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

            const response = await generateWithFallback(null, [{ role: 'user', parts: [{ text: promptWithJsonInstruction }] }], { responseMimeType: 'application/json', temperature: 0.1 }, 'SMART');

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
                        region: specificCity,
                        restaurants: (c.restaurants || []).map((r: any, i: number) => ({
                            ...r,
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
                    onUpdateTrip({ ...trip, aiRestaurants: merged });
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
        aiCategories.forEach(cat => cat.restaurants.forEach(r => all.push({ ...r, categoryTitle: cat.title })));
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

    // Extract Raters for Filtering (Cleaned)
    const availableRaters = useMemo(() => {
        const sources = new Set<string>();
        const ALLOWED_AUTHORITIES = ['michelin', '50 best', 'timeout', 'eater', 'tripadvisor', 'google', 'local', 'gault'];

        allAiRestaurants.forEach(r => {
            if (r.recommendationSource) {
                let provider = r.recommendationSource;
                const low = provider.toLowerCase();

                // Consolidate Authoritative Sources
                if (low.includes('michelin')) provider = "Michelin Guide";
                else if (low.includes('50 best')) provider = "50 Best";
                else if (low.includes('timeout')) provider = "TimeOut";
                else if (low.includes('eater')) provider = "Eater";
                else if (low.includes('tripadvisor') || low.includes('trip advisor')) provider = "TripAdvisor";
                else if (low.includes('google')) provider = "Google Review";
                else if (low.includes('local')) provider = "Local Key";

                // Filter out junk (Blogs, Awards) unless it matches Authority
                const isAuthority = ALLOWED_AUTHORITIES.some(auth => low.includes(auth));
                if (isAuthority) {
                    sources.add(provider);
                } else {
                    // Map unknown/junk to "Local/Google" or ignore for filter list (but keep in list)
                    // We simply don't add it to the FILTER list so the user doesn't see "Burger Blog" button
                }
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
            // FIX: Restore correct region/city logic. Do not use Category Title (e.g. "Italian") as region.
            // Try to extract city from location (e.g. "Rothschild 12, Tel Aviv" -> "Tel Aviv")
            const locationParts = restaurant.location ? restaurant.location.split(',') : [];
            const cityFromLocation = locationParts.length > 1 ? locationParts[locationParts.length - 1].trim() : restaurant.location;

            // Priority: Extracted City -> Selected City Filter -> Trip Destination
            const intendedRegion = cityFromLocation || (selectedCity !== 'all' ? selectedCity : trip.destination);

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

    // Filtered Recommended (with City Filter)
    const filteredRestaurants = useMemo(() => {
        let list = [];
        if (selectedCategory === 'all') {
            list = allAiRestaurants;
        } else {
            const cat = aiCategories.find(c => c.id === selectedCategory);
            list = cat ? [...cat.restaurants].sort((a, b) => (b.googleRating || 0) - (a.googleRating || 0)) : [];
        }

        // City Filter — language-agnostic via locationMatchesCity
        if (selectedCity !== 'all') {
            list = list.filter(r => locationMatchesCity(r.location || '', selectedCity));
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
            filtered = flatList.filter(r => locationMatchesCity(r.location || '', selectedCity));
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
                                            {isResearchingAll ? 'מחפש מסעדות…' : 'התחל מחקר שוק (AI)'}
                                        </span>
                                    </button>
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
                                                    cuisine: r.cuisine || r.iconType || cat.title || 'General' // Ensure genre is passed
                                                })));

                                                // Apply Filters — language-agnostic city match
                                                let filtered = flatList;
                                                if (selectedCity !== 'all') {
                                                    filtered = flatList.filter(r => locationMatchesCity(r.location || '', selectedCity));
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
                            {/* Single compact action row — the top city filter bar (above this
                                tab block) already lets the user pick a city. We only need a
                                refresh button here when we have results; empty state shows
                                its own large CTA below. */}
                            {aiCategories.length > 0 && (
                                <div className="flex items-center justify-end gap-2 mb-4">
                                    <button
                                        onClick={() => selectedCity !== 'all' ? initiateResearch(selectedCity) : researchAllCities()}
                                        disabled={loadingRecs || isResearchingAll}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600 disabled:opacity-50"
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

                            {loadingRecs ? <ThinkingLoader texts={["בודק את הסצנה הקולינרית...", "מחפש מנות מומלצות...", "סורק ביקורות מקומיים...", "מצליב נתוני מישלן..."]} /> : (
                                <>
                                    {allAiRestaurants.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                            <div className="bg-orange-100 p-4 rounded-full"><BrainCircuit className="w-8 h-8 text-orange-600" /></div>
                                            <h3 className="text-xl font-black text-slate-800">
                                                {tripCities.length > 1 ? 'באיזו עיר נתמקד?' : 'בחר עיר לחיפוש'}
                                            </h3>

                                            {tripCities.length > 1 ? (
                                                <div className="flex flex-wrap justify-center gap-3 max-w-md">
                                                    {tripCities.map(city => (
                                                        <button
                                                            key={city}
                                                            onClick={() => initiateResearch(city)}
                                                            className="bg-white border-2 border-slate-100 text-slate-700 px-6 py-2 rounded-xl text-sm font-bold shadow-sm hover:border-orange-500 hover:text-orange-600 hover:bg-orange-50 transition-all"
                                                        >
                                                            {city}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <button onClick={() => initiateResearch()} className="bg-white border-2 border-orange-500 text-orange-600 px-8 py-3 rounded-2xl text-base font-bold shadow-md hover:shadow-lg hover:bg-orange-50 transition-all">
                                                    {trip.destination} - בצע מחקר שוק
                                                </button>
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
                                                            {uniqueCats.map(c => <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={`px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap ${selectedCategory === c.id ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200'}`}>{displayTitle(c.title)}</button>)}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Advanced filters collapsed by default to reduce visual noise */}
                                            {availableRaters.length > 1 && (
                                                <div className="mb-3">
                                                    <button
                                                        onClick={() => setShowAdvancedFilters(s => !s)}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${showAdvancedFilters || selectedRater !== 'all' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'text-slate-500 hover:text-slate-700'}`}
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
                            <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${visuals.gradient}`}>
                                <span>{visuals.icon}</span>
                                <span>{visuals.label}</span>
                            </div>
                            {data.googleRating && (
                                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded">
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