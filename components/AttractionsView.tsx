import React, { useState, useMemo, useEffect } from 'react';
import { Trip, Attraction, AttractionCategory } from '../types';
import { MapPin, Ticket, Star, ExternalLink, Palmtree, ShoppingBag, Music, Landmark, Sparkles, Filter, StickyNote, Edit, Check, Plus, Loader2, BrainCircuit, RotateCw, Users, CheckCircle2, RefreshCw, Navigation, Calendar, Clock, Trash2, Baby, Search, X, List, Map as MapIcon, Trophy, Camera, Gem, Mountain, Award, LayoutGrid, Globe, ChevronLeft, DollarSign } from 'lucide-react';
import { Type, Schema } from "@google/genai";
import { getAI, AI_MODEL, SYSTEM_PROMPT, generateWithFallback } from '../services/aiService';
import { UnifiedMapView } from './UnifiedMapView';
import { ThinkingLoader } from './ThinkingLoader';
import { PlaceCard } from './PlaceCard';

// Helper to remove Hebrew and special chars for Maps URL
const cleanTextForMap = (text: string) => {
    if (!text) return "";
    // Keep only English letters, numbers, and spaces
    return text.replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim();
};

// Enhanced Visuals with Gradients for Attractions
const getAttractionVisuals = (type: string = '') => {
    const t = type.toLowerCase();

    if (t.includes('must') || t.includes('top'))
        return { icon: '🌟', gradient: 'bg-gradient-to-br from-purple-600 to-indigo-800 text-white', label: 'Must See' };

    if (t.includes('nature') || t.includes('park') || t.includes('garden'))
        return { icon: '🌿', gradient: 'bg-gradient-to-br from-emerald-500 to-green-700 text-white', label: 'Nature' };

    if (t.includes('beach') || t.includes('island') || t.includes('sea'))
        return { icon: '🏖️', gradient: 'bg-gradient-to-br from-cyan-400 to-blue-600 text-white', label: 'Beach & Sea' };

    if (t.includes('museum') || t.includes('culture') || t.includes('history'))
        return { icon: '🏛️', gradient: 'bg-gradient-to-br from-amber-600 to-orange-800 text-white', label: 'Culture' };

    if (t.includes('shop') || t.includes('market') || t.includes('mall'))
        return { icon: '🛍️', gradient: 'bg-gradient-to-br from-pink-500 to-rose-700 text-white', label: 'Shopping' };

    if (t.includes('night') || t.includes('club') || t.includes('bar'))
        return { icon: '🥂', gradient: 'bg-gradient-to-br from-slate-800 to-black text-white', label: 'Nightlife' };

    if (t.includes('temple') || t.includes('religion'))
        return { icon: '🙏', gradient: 'bg-gradient-to-br from-orange-500 to-amber-600 text-white', label: 'Temple' };

    return { icon: '🎫', gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white', label: 'Attraction' };
};

// Sort attractions: Favorites first, then Rating
const sortAttractions = (list: Attraction[]) => {
    return list.sort((a, b) => {
        // 1. Favorites First
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;

        // 2. Rating Second
        return (b.rating || 0) - (a.rating || 0);
    });
};

// Redesigned Card - Clean Google Style
const AttractionRecommendationCard: React.FC<{
    rec: any,
    tripDestination: string,
    tripDestinationEnglish?: string,
    isAdded: boolean,
    onAdd: (rec: any, source: string) => void
}> = ({ rec, tripDestination, tripDestinationEnglish, isAdded, onAdd }) => {

    // Strict English-Only Maps Query
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
            visualIcon={visuals.icon}
            visualBgColor="bg-slate-50 group-hover:bg-slate-100"
            mapsUrl={mapsUrl}
            isAdded={isAdded}
            onAdd={() => onAdd(rec, 'AI')}
            recommendationSource={rec.recommendationSource}
            verification_needed={rec.verification_needed}
        />
    );
};

export const AttractionsView: React.FC<{ trip: Trip, onUpdateTrip: (t: Trip) => void }> = ({ trip, onUpdateTrip }) => {
    const [activeTab, setActiveTab] = useState<'my_list' | 'recommended'>('my_list');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    // AI & Data State
    const [aiCategories, setAiCategories] = useState<AttractionCategory[]>(trip.aiAttractions || []);
    const [loadingRecs, setLoadingRecs] = useState(false);
    const [recError, setRecError] = useState('');
    // showCitySelector removed

    // UX State
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedRater, setSelectedRater] = useState<string>('all');

    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
    const [textQuery, setTextQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Attraction[] | null>(null);

    const attractionsData = trip.attractions || [];

    // Persistence Sync
    useEffect(() => {
        if (trip.aiAttractions && trip.aiAttractions.length > 0) {
            setAiCategories(trip.aiAttractions);
        }
    }, [trip.aiAttractions]);

    const tripCities = useMemo(() => {
        if (!trip.destination) return [];
        return trip.destination.split('-').map(s => s.trim());
    }, [trip.destination]);

    // --- Search Logic (gemini-3-flash-preview) ---
    const handleTextSearch = async () => {
        if (!textQuery.trim()) return;
        setIsSearching(true);
        setSearchResults(null);

        try {
            const ai = getAI();
            const prompt = `${SYSTEM_PROMPT}

Search for attractions in ${trip.destination} matching: "${textQuery}".
Prioritize results from Google Maps Top Rated, TripAdvisor "Travelers' Choice" or UNESCO lists.
Try to include a price estimate if possible.
CRITICAL: 'name' MUST be in English. Description in Hebrew.`;

            const schema: Schema = {
                type: Type.OBJECT,
                properties: {
                    results: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                description: { type: Type.STRING },
                                location: { type: Type.STRING },
                                rating: { type: Type.NUMBER },
                                reviewCount: { type: Type.NUMBER },
                                type: { type: Type.STRING },
                                price: { type: Type.STRING },
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
                        .map((r: any, i: number) => ({ ...r, id: `search-attr-${i}`, categoryTitle: 'תוצאות חיפוש' }));
                    setSearchResults(validResults);

                    // Log filtered count
                    const filtered = data.results.length - validResults.length;
                    if (filtered > 0) {
                        console.log(`✅ Filtered ${filtered} closed attraction(s) from search results`);
                    }

                    // Save custom category (Task 3)
                    if (textQuery.trim() && validResults.length > 0) {
                        const currentCategories = trip.customAttractionCategories || [];
                        if (!currentCategories.includes(textQuery.trim())) {
                            onUpdateTrip({
                                ...trip,
                                customAttractionCategories: [...currentCategories, textQuery.trim()]
                            });
                        }
                    }
                }
            } catch (parseError: any) {
                console.error('❌ AI Error: JSON Parse failed in handleTextSearch. Raw response:', textContent?.substring(0, 500));
                alert('שגיאה בפרסור התוצאות. אנא נסה שנית.');
            }
        } catch (e) {
            console.error(e);
            alert('חיפוש נכשל.');
        } finally {
            setIsSearching(false);
        }
    };

    const clearSearch = () => { setTextQuery(''); setSearchResults(null); };

    // --- Market Research Logic (gemini-3-flash-preview) ---
    const initiateResearch = (city?: string) => {
        fetchRecommendations(true, city || trip.destinationEnglish || tripCities[0]);
    };

    const fetchRecommendations = async (forceRefresh = false, specificCity?: string) => {
        if (!forceRefresh && !specificCity && trip.aiAttractions && trip.aiAttractions.length > 0) {
            setAiCategories(trip.aiAttractions);
            return;
        }
        setLoadingRecs(true);
        setRecError('');
        try {
            const ai = getAI();
            const targetLocation = specificCity || trip.destinationEnglish || trip.destination;

            const prompt = `
            Act as a Luxury Travel Concierge for ${targetLocation}.
            Provide a structured guide with 6 categories.
            For each category, provide exactly 4 items.

            Categories (Hebrew Titles):
            1. "אתרי חובה" (Must See)
            2. "פנינים נסתרות" (Hidden Gems)
            3. "מוזיאונים ותרבות" (Museums)
            4. "טבע ונופים" (Nature)
            5. "קניות ושווקים" (Shopping)
            6. "חיי לילה" (Nightlife)

            **CRITICAL RULES:**
            1. **NAME:** Must be the REAL English name of the place (e.g. "Grand Palace", "Wat Arun").
            2. **DESCRIPTION:** Must be in HEBREW. Very short (max 10 words).
            3. **SOURCES:** "UNESCO", "TripAdvisor Choice", "Lonely Planet", "Atlas Obscura", "Local Secret".
            4. **PRICE:** include estimate (e.g. "Free", "500 THB").
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
                                attractions: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            name: { type: Type.STRING },
                                            description: { type: Type.STRING },
                                            location: { type: Type.STRING },
                                            rating: { type: Type.NUMBER },
                                            type: { type: Type.STRING },
                                            price: { type: Type.STRING },
                                            recommendationSource: { type: Type.STRING },
                                            googleMapsUrl: { type: Type.STRING }
                                        },
                                        required: ["name", "description", "location", "recommendationSource"]
                                    }
                                }
                            },
                            required: ["id", "title", "attractions"]
                        }
                    }
                }
            };

            const response = await generateWithFallback(ai, prompt, { responseMimeType: 'application/json', responseSchema: schema }, 'SMART');

            const textContent = typeof response.text === 'function' ? response.text() : response.text;
            try {
                const data = JSON.parse(textContent || '{}');
                if (data.categories) {
                    const processed = data.categories.map((c: any) => ({
                        ...c,
                        attractions: c.attractions.map((a: any, i: number) => ({
                            ...a,
                            id: `ai - attr - ${c.id} -${i} `,
                            categoryTitle: c.title // INJECT TITLE HERE
                        }))
                    }));
                    setAiCategories(processed);
                    setSelectedCategory('all');
                    onUpdateTrip({ ...trip, aiAttractions: processed });
                }
            } catch (parseError: any) {
                console.error('❌ AI Error: JSON Parse failed in fetchRecommendations. Raw response:', textContent?.substring(0, 500));
                setRecError('שגיאה בפרסור התוצאות. אנא נסה שנית.');
            }
        } catch (e: any) {
            console.error(e);
            const errMsg = e.message.includes("500") || e.message.includes("xhr")
                ? "שגיאת תקשורת זמנית. אנא נסה שוב."
                : `שגיאה בטעינה: ${e.message} `;
            setRecError(errMsg);
        } finally { setLoadingRecs(false); }
    };

    // Helper to map AI type to Hebrew Category
    const mapTypeToCategoryTitle = (type?: string, defaultTitle?: string) => {
        const t = (type || '').toLowerCase();
        if (t.includes('nature') || t.includes('park') || t.includes('beach')) return "טבע ונופים";
        if (t.includes('museum') || t.includes('culture') || t.includes('history')) return "מוזיאונים ותרבות";
        if (t.includes('shop') || t.includes('market') || t.includes('mall')) return "קניות ושווקים";
        if (t.includes('night') || t.includes('bar') || t.includes('club')) return "חיי לילה";
        if (t.includes('gem') || t.includes('hidden')) return "פנינים נסתרות";
        return defaultTitle || "כללי";
    };

    const handleAddRec = (attraction: Attraction, catTitle: string) => {
        let newAttractions = [...attractionsData];

        // Use passed catTitle if available (Fix Bug 2)
        const smartCategory = catTitle || mapTypeToCategoryTitle(attraction.type, catTitle);

        let targetCatIndex = newAttractions.findIndex(c => c.title === smartCategory);
        if (targetCatIndex === -1) {
            newAttractions.push({ id: `cat - attr - ${Date.now()} `, title: smartCategory, attractions: [] });
            targetCatIndex = newAttractions.length - 1;
        }

        const exists = newAttractions[targetCatIndex].attractions.some(a => a.name === attraction.name);
        if (!exists) {
            newAttractions[targetCatIndex].attractions.push({ ...attraction, id: `added - ${Date.now()} ` });
            onUpdateTrip({ ...trip, attractions: newAttractions });
            setAddedIds(prev => new Set(prev).add(attraction.id));
            setTimeout(() => { setAddedIds(prev => { const next = new Set(prev); next.delete(attraction.id); return next; }); }, 2000);
        }
    };

    const currentCategoryAttractions = useMemo(() => {
        let list: any[] = [];
        if (selectedCategory === 'all') {
            // Include categoryTitle when flattening
            aiCategories.forEach(c => list.push(...c.attractions.map(a => ({ ...a, categoryTitle: c.title }))));
        } else {
            const cat = aiCategories.find(c => c.id === selectedCategory);
            list = cat ? cat.attractions.map(a => ({ ...a, categoryTitle: cat.title })) : [];
        }

        if (selectedRater !== 'all') {
            list = list.filter(a => a.recommendationSource === selectedRater);
        }
        return list;
    }, [aiCategories, selectedCategory, selectedRater]);

    const availableRaters = useMemo(() => {
        const sources = new Set<string>();
        aiCategories.forEach(c => c.attractions.forEach(a => {
            if (a.recommendationSource) sources.add(a.recommendationSource);
        }));
        return Array.from(sources).sort();
    }, [aiCategories]);

    // My List Filtering & Sorting (Favorites First)
    const [mySelectedCategory, setMySelectedCategory] = useState<string>('all');
    const filteredMyList = useMemo(() => {
        if (mySelectedCategory === 'all') {
            // Sort all categories content
            return attractionsData.map(cat => ({
                ...cat,
                attractions: sortAttractions([...cat.attractions])
            })).filter(c => c.attractions.length > 0);
        }
        // Sort specific category content
        return attractionsData
            .filter(c => c.title === mySelectedCategory)
            .map(cat => ({
                ...cat,
                attractions: sortAttractions([...cat.attractions])
            }));
    }, [attractionsData, mySelectedCategory]);

    const handleUpdateAttraction = (attractionId: string, updates: Partial<Attraction>) => {
        const updatedAttractions = attractionsData.map(cat => ({ ...cat, attractions: cat.attractions.map(attr => attr.id === attractionId ? { ...attr, ...updates } : attr) }));
        onUpdateTrip({ ...trip, attractions: updatedAttractions });
    };

    const handleDeleteAttraction = (attractionId: string) => {
        if (window.confirm("להסיר?")) {
            const updatedAttractions = attractionsData.map(cat => ({ ...cat, attractions: cat.attractions.filter(a => a.id !== attractionId) })).filter(cat => cat.attractions.length > 0);
            onUpdateTrip({ ...trip, attractions: updatedAttractions });
        }
    };

    const getMapItems = () => {
        const items: any[] = [];
        if (activeTab === 'my_list') {
            attractionsData.forEach(cat => cat.attractions.forEach(a => items.push({ id: a.id, type: 'attraction', name: a.name, address: a.location, lat: a.lat, lng: a.lng, description: a.description })));
        } else {
            aiCategories.forEach(cat => cat.attractions.forEach(a => items.push({ id: a.id, type: 'attraction', name: a.name, address: a.location, lat: a.lat, lng: a.lng, description: `${a.rating}⭐` })));
        }
        return items;
    };

    return (
        <div className="space-y-4 animate-fade-in pb-10">

            {/* Search Bar */}
            <div className="relative z-20">
                <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-2 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition-all">
                    <Search className="w-5 h-5 text-slate-400 mr-2" />
                    <input className="flex-grow outline-none text-slate-700 font-medium text-sm" placeholder='חפש אטרקציה (כולל גוגל מפות ודירוגים)...' value={textQuery} onChange={(e) => setTextQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleTextSearch()} />
                    {textQuery && (<button onClick={clearSearch} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-4 h-4" /></button>)}
                    <button onClick={handleTextSearch} disabled={isSearching || !textQuery.trim()} className="bg-purple-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50">{isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}{isSearching ? '...' : 'חיפוש'}</button>
                </div>

                {/* Custom Category Chips (Task 3) */}
                {trip.customAttractionCategories && trip.customAttractionCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs font-bold text-slate-400 self-center">חיפושים שמורים:</span>
                        {trip.customAttractionCategories.map((category, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setTextQuery(category);
                                    handleTextSearch();
                                }}
                                className="group flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full text-xs font-medium border border-purple-200 transition-all hover:shadow-sm"
                            >
                                <Sparkles className="w-3 h-3" />
                                {category}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const updated = trip.customAttractionCategories?.filter((_, i) => i !== idx);
                                        onUpdateTrip({ ...trip, customAttractionCategories: updated });
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-purple-200 rounded-full transition-all"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Search Results */}
            {searchResults && (
                <div className="space-y-3 animate-fade-in">
                    <div className="flex justify-between items-center"><h3 className="text-lg font-black text-slate-800">תוצאות חיפוש</h3><button onClick={clearSearch} className="text-xs text-slate-500 hover:text-red-500 underline">נקה</button></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {searchResults.map(res => (
                            <AttractionRecommendationCard
                                key={res.id}
                                rec={res}
                                tripDestination={trip.destination}
                                tripDestinationEnglish={trip.destinationEnglish}
                                isAdded={addedIds.has(res.id)}
                                onAdd={(r) => handleAddRec(r, (r as any).categoryTitle || 'תוצאות חיפוש')}
                            />
                        ))}
                    </div>
                    <div className="border-b border-slate-200 my-4"></div>
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-[1.5rem] shadow-sm border border-slate-200 p-1.5 flex mb-2">
                <button onClick={() => setActiveTab('my_list')} className={`flex - 1 py - 3 rounded - [1.2rem] text - sm font - black flex items - center justify - center gap - 2 transition - all ${activeTab === 'my_list' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'} `}><Ticket className="w-4 h-4" /> האטרקציות שלי</button>
                <button onClick={() => setActiveTab('recommended')} className={`flex - 1 py - 3 rounded - [1.2rem] text - sm font - black flex items - center justify - center gap - 2 transition - all ${activeTab === 'recommended' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-purple-50 hover:text-purple-600'} `}><Sparkles className="w-4 h-4" /> המלצות TOP (AI)</button>
            </div>

            {viewMode === 'map' ? (
                <div className="space-y-3">
                    <div className="flex justify-end"><button onClick={() => setViewMode('list')} className="px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold text-xs bg-slate-100 text-slate-900 transition-all hover:bg-slate-200"><List className="w-3 h-3" /> חזרה לרשימה</button></div>
                    <UnifiedMapView items={getMapItems()} title={activeTab === 'my_list' ? `מפת האטרקציות שלי` : 'מפת המלצות'} />
                </div>
            ) : (
                <>
                    {activeTab === 'my_list' ? (
                        <>
                            <div className="flex justify-between items-center mb-1"><button onClick={() => setViewMode('map')} className="px-3 py-1.5 rounded-lg flex items-center gap-1 font-bold text-xs bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 transition-all shadow-sm"><MapIcon className="w-3 h-3" /> מפה</button></div>

                            {/* My List Filters */}
                            <div className="mb-2 overflow-x-auto pb-2 scrollbar-hide">
                                <div className="flex gap-2">
                                    <button onClick={() => setMySelectedCategory('all')} className={`flex - shrink - 0 px - 4 py - 2 rounded - xl text - xs font - bold whitespace - nowrap border transition - all ${mySelectedCategory === 'all' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-600 border-slate-200'} `}>הכל</button>
                                    {attractionsData.map(cat => (
                                        <button key={cat.id} onClick={() => setMySelectedCategory(cat.title)} className={`flex - shrink - 0 px - 4 py - 2 rounded - xl text - xs font - bold whitespace - nowrap border transition - all ${mySelectedCategory === cat.title ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 border-slate-200'} `}>{cat.title}</button>
                                    ))}
                                </div>
                            </div>

                            {/* Results */}
                            {filteredMyList.length > 0 ? (
                                <div className="space-y-4 mt-2">
                                    {filteredMyList.map((category) => (
                                        <div key={category.id} className="animate-fade-in">
                                            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center justify-between">{category.title}<span className="text-[10px] font-normal bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{category.attractions.length}</span></h3>
                                            <div className="flex flex-col gap-2">
                                                {[...category.attractions].map((attr) => (
                                                    <AttractionRow key={attr.id} data={attr} onSaveNote={(note) => handleUpdateAttraction(attr.id, { notes: note })} onUpdate={(updates) => handleUpdateAttraction(attr.id, updates)} onDelete={() => handleDeleteAttraction(attr.id)} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300 mt-4 flex flex-col items-center justify-center">
                                    <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-slate-500 text-sm font-bold mb-4">לא נמצאו אטרקציות ברשימה שלך.</p>
                                    <button onClick={() => { setActiveTab('recommended'); initiateResearch(); }} className="bg-purple-600 text-white px-6 py-2 rounded-xl font-bold text-xs hover:bg-purple-700 transition-colors shadow-lg flex items-center gap-2">
                                        <Sparkles className="w-4 h-4" /> קבל המלצות AI עכשim
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        /* Recommended Tab */
                        <div className="animate-fade-in">
                            {!loadingRecs && aiCategories.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                    <div className="bg-purple-100 p-4 rounded-full"><Navigation className="w-8 h-8 text-purple-600" /></div>
                                    <h3 className="text-xl font-black text-slate-800">
                                        {tripCities.length > 1 ? 'באיזו עיר נתמקד?' : 'בחר עיר לחיפוש'}
                                    </h3>

                                    {tripCities.length > 1 ? (
                                        <div className="flex flex-wrap justify-center gap-3 max-w-md">
                                            {tripCities.map(city => (
                                                <button
                                                    key={city}
                                                    onClick={() => initiateResearch(city)}
                                                    className="bg-white border-2 border-slate-100 text-slate-700 px-6 py-2 rounded-xl text-sm font-bold shadow-sm hover:border-purple-500 hover:text-purple-600 hover:bg-purple-50 transition-all"
                                                >
                                                    {city}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <button onClick={() => initiateResearch()} className="bg-white border-2 border-purple-500 text-purple-600 px-8 py-3 rounded-2xl text-base font-bold shadow-md hover:shadow-lg hover:bg-purple-50 transition-all">
                                            {trip.destination} - בצע מחקר שוק
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="bg-purple-50 p-3 rounded-xl mb-3 border border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                                        <div className="flex items-center gap-2"><div className="bg-white p-1.5 rounded-full shadow-sm"><BrainCircuit className="w-4 h-4 text-purple-600" /></div><div><h3 className="text-xs font-black text-purple-900">המלצות AI: Travelers' Choice</h3></div></div>

                                        {!loadingRecs && (
                                            <div className="flex items-center gap-2">
                                                {tripCities.length > 1 && (
                                                    <div className="flex gap-1 bg-white/50 p-1 rounded-lg">
                                                        {tripCities.map(city => (
                                                            <button
                                                                key={city}
                                                                onClick={() => initiateResearch(city)}
                                                                className="text-[10px] font-bold px-2 py-1 rounded hover:bg-white hover:shadow-sm text-purple-800 transition-all opacity-70 hover:opacity-100"
                                                            >
                                                                {city}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                <button onClick={() => initiateResearch()} className="text-[10px] font-bold text-purple-600 bg-white px-2 py-1 rounded shadow-sm flex items-center gap-1"><RotateCw className="w-3 h-3" /> רענן</button>
                                            </div>
                                        )}
                                    </div>

                                    {loadingRecs ? (
                                        <ThinkingLoader texts={[
                                            "סורק אתרי תיירות...",
                                            "בודק בגוגל מפות...",
                                            "קורא בלוגים מקומיים...",
                                            "מחפש המלצות אותנטיות...",
                                            "ממיין לפי דירוג..."
                                        ]} />
                                    ) : recError ? (<div className="text-center text-red-500 text-sm font-bold py-4">{recError}</div>) : (
                                        <>
                                            {/* 1. Category Filter */}
                                            <div className="mb-2 overflow-x-auto pb-2 scrollbar-hide">
                                                <div className="flex gap-2">
                                                    <button onClick={() => setSelectedCategory('all')} className={`flex - shrink - 0 px - 4 py - 2 rounded - xl text - xs font - bold whitespace - nowrap border transition - all flex items - center gap - 1 ${selectedCategory === 'all' ? 'bg-purple-800 text-white border-purple-800 shadow-md' : 'bg-white text-slate-600 border-slate-200'} `}><LayoutGrid className="w-3 h-3" /> הכל</button>
                                                    {aiCategories.map(cat => (
                                                        <button
                                                            key={cat.id}
                                                            onClick={() => setSelectedCategory(cat.id)}
                                                            className={`flex - shrink - 0 px - 4 py - 2 rounded - xl text - xs font - bold whitespace - nowrap border transition - all ${selectedCategory === cat.id ? 'bg-purple-800 text-white border-purple-800 shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'} `}
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
                                                    <button onClick={() => setSelectedRater('all')} className={`flex - shrink - 0 px - 3 py - 1 rounded - full text - [10px] font - bold border transition - all ${selectedRater === 'all' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-white text-slate-500 border-slate-200'} `}>הכל</button>
                                                    {availableRaters.map(rater => (
                                                        <button
                                                            key={rater}
                                                            onClick={() => setSelectedRater(rater)}
                                                            className={`flex - shrink - 0 px - 3 py - 1 rounded - full text - [10px] font - bold border transition - all ${selectedRater === rater ? 'bg-purple-100 text-purple-700 border-purple-200 ring-2 ring-purple-100' : 'bg-white text-slate-500 border-slate-200'} `}
                                                        >
                                                            {rater}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                {currentCategoryAttractions.map(rec => (
                                                    <AttractionRecommendationCard
                                                        key={rec.id}
                                                        rec={rec}
                                                        tripDestination={trip.destination}
                                                        tripDestinationEnglish={trip.destinationEnglish}
                                                        isAdded={addedIds.has(rec.id)}
                                                        onAdd={(r) => handleAddRec(r, (r as any).categoryTitle || 'תכנון טיול')}
                                                    />
                                                ))}
                                            </div>

                                            {currentCategoryAttractions.length === 0 && (
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
        </div>
    );
};

const AttractionRow: React.FC<{ data: Attraction, onSaveNote: (n: string) => void, onUpdate: (updates: Partial<Attraction>) => void, onDelete: () => void }> = ({ data, onSaveNote, onUpdate, onDelete }) => {
    // ... reused code
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState(data.notes || '');
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const toInputDate = (d?: string) => d ? d.split('/').reverse().join('-') : '';
    const fromInputDate = (d: string) => d.split('-').reverse().join('/');
    useEffect(() => { if (data.scheduledDate) setScheduleDate(toInputDate(data.scheduledDate)); if (data.scheduledTime) setScheduleTime(data.scheduledTime); }, [data.scheduledDate, data.scheduledTime]);
    const handleSaveSchedule = () => { onUpdate({ scheduledDate: fromInputDate(scheduleDate), scheduledTime: scheduleTime }); setIsScheduling(false); };
    const saveNote = () => { onSaveNote(noteText); setIsEditingNote(false); };
    const toggleFavorite = () => { onUpdate({ isFavorite: !data.isFavorite }); };

    // Clean maps link
    const nameForMap = cleanTextForMap(data.name);
    const locationForMap = cleanTextForMap(data.location);
    const mapsQuery = encodeURIComponent(`${nameForMap} ${locationForMap} `);
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

    // Fix: Defined getTypeIcon
    const getTypeIcon = () => {
        const text = (data.name + ' ' + (data.description || '')).toLowerCase();
        if (text.includes('museum') || text.includes('art') || text.includes('gallery')) return <Landmark className="w-5 h-5 text-amber-600" />;
        if (text.includes('nature') || text.includes('park') || text.includes('garden')) return <Mountain className="w-5 h-5 text-emerald-600" />;
        if (text.includes('beach') || text.includes('sea') || text.includes('island')) return <Palmtree className="w-5 h-5 text-cyan-600" />;
        if (text.includes('shop') || text.includes('mall') || text.includes('market')) return <ShoppingBag className="w-5 h-5 text-pink-600" />;
        return <Ticket className="w-5 h-5 text-purple-600" />;
    };

    return (
        <div className={`bg-white rounded-xl border p-3 hover:shadow-md transition-all group flex flex-col md:flex-row gap-3 relative overflow-hidden ${data.isFavorite ? 'border-yellow-200 ring-1 ring-yellow-100' : 'border-gray-100'}`}>
            <div className="flex-shrink-0 flex items-center gap-3 md:block">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-gray-50 text-gray-500 ring-1 ring-gray-100">{getTypeIcon()}</div>
                <div className="md:hidden font-bold text-gray-900" dir="ltr">{data.name}</div>
            </div>
            <div className="flex-grow min-w-0">
                <div className="flex justify-between items-start">
                    <div className="hidden md:flex flex-col">
                        <div className="flex items-center gap-2">
                            <button onClick={toggleFavorite} className="focus:outline-none">
                                <Star className={`w-4 h-4 transition-all ${data.isFavorite ? 'text-yellow-400 fill-yellow-400 scale-110' : 'text-slate-300 hover:text-yellow-400'}`} />
                            </button>
                            <h4 className="text-sm font-bold text-gray-900 leading-tight" dir="ltr">{data.name}</h4>
                            {data.rating && (<div className="flex items-center bg-yellow-50 px-1 py-0.5 rounded border border-yellow-100"><span className="text-[9px] font-bold text-yellow-700">{data.rating}</span><Star className="w-2 h-2 text-yellow-600 fill-current mr-0.5" /></div>)}
                        </div>
                        <p className="text-gray-500 text-[10px] mt-0.5 leading-snug line-clamp-1">{data.description}</p>
                        <div className="flex gap-2 mt-1">
                            {data.recommendationSource && (
                                <div className="inline-flex items-center text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 w-fit">
                                    <Trophy className="w-2 h-2 mr-1" /> {data.recommendationSource}
                                </div>
                            )}
                            {data.price && (
                                <div className="inline-flex items-center text-[9px] font-bold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 w-fit">
                                    <DollarSign className="w-2 h-2 mr-1" /> {data.price}
                                </div>
                            )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[9px] text-gray-400"><MapPin className="w-2 h-2" /> {data.location}</div>
                    </div>
                    <div className="flex items-center gap-1 pl-1 ml-auto md:ml-0">
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 rounded-lg text-[10px] flex items-center gap-1 font-bold"><MapIcon className="w-3 h-3" /> הצג במפות</a>
                        <button onClick={() => setIsScheduling(!isScheduling)} className={`p-1.5 rounded-lg border ${data.scheduledDate ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-gray-50 text-gray-400 border-transparent'}`}><Calendar className="w-3.5 h-3.5" /></button>
                        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                </div>

                <div className="md:hidden mt-2 text-xs text-gray-500">{data.description}</div>

                {isScheduling && (<div className="mt-2 bg-purple-50 p-2 rounded-lg border border-purple-100 flex items-center gap-2"><input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full p-1 rounded border border-purple-200 text-xs" /><input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full p-1 rounded border border-purple-200 text-xs" /><button onClick={handleSaveSchedule} className="bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold whitespace-nowrap">שמור</button></div>)}
                {!isScheduling && data.scheduledDate && (<div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-purple-700 bg-purple-50 w-fit px-2 py-0.5 rounded border border-purple-100"><Clock className="w-2.5 h-2.5" /> {data.scheduledDate} {data.scheduledTime}</div>)}
                <div className="mt-1">{isEditingNote ? (<div className="bg-yellow-50 p-1.5 rounded-lg border border-yellow-200"><textarea className="w-full bg-transparent border-none outline-none text-xs text-gray-800 resize-none" rows={1} placeholder="הערה..." value={noteText} onChange={e => setNoteText(e.target.value)} /><div className="flex justify-end gap-2"><button onClick={() => setIsEditingNote(false)} className="text-[9px] text-gray-500">ביטול</button><button onClick={saveNote} className="text-[9px] bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded font-bold">שמור</button></div></div>) : (<div onClick={() => setIsEditingNote(true)} className={`px-2 py-1 rounded-lg border text-[10px] flex items-center gap-1 cursor-pointer transition-colors ${data.notes ? 'bg-yellow-50 border-yellow-100 text-yellow-900' : 'bg-gray-50 border-dashed border-gray-200 text-gray-400'}`}><StickyNote className={`w-3 h-3 flex-shrink-0 ${data.notes ? 'text-yellow-600' : 'text-gray-400'}`} /><span className="line-clamp-1">{data.notes || 'הוסף הערה...'}</span></div>)}</div>
            </div>
        </div>
    );
};