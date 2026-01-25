import React, { useState, useMemo, useEffect } from 'react';
import { Trip, Attraction, AttractionCategory } from '../types';
import { MapPin, Ticket, Star, Landmark, Sparkles, Filter, StickyNote, Plus, Loader2, BrainCircuit, RotateCw, RefreshCw, Navigation, Calendar, Clock, Trash2, Search, X, List, Map as MapIcon, Trophy, Mountain, ShoppingBag, Palmtree, DollarSign, LayoutGrid } from 'lucide-react';
import { Type, Schema } from "@google/genai";
import { getAI, SYSTEM_PROMPT, generateWithFallback } from '../services/aiService';
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
            visualIcon={visuals.icon}
            visualBgColor="bg-slate-50 group-hover:bg-slate-100"
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
    const [activeTab, setActiveTab] = useState<'my_list' | 'recommended'>('my_list');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    // AI State
    const [aiCategories, setAiCategories] = useState<AttractionCategory[]>(trip.aiAttractions || []);
    const [loadingRecs, setLoadingRecs] = useState(false);
    const [recError, setRecError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedRater, setSelectedRater] = useState<string>('all');

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

    const tripCities = useMemo(() => {
        if (!trip.destination) return [];
        return trip.destination.split(/ - | & |, /).map(s => s.trim()).filter(Boolean);
    }, [trip.destination]);

    // --- AI Logic ---
    const handleTextSearch = async () => {
        if (!textQuery.trim()) return;
        setIsSearching(true);
        setSearchResults(null);
        try {
            const ai = getAI();
            const prompt = `${SYSTEM_PROMPT} Search for attractions in ${trip.destination} matching: "${textQuery}". CRITICAL: 'name' MUST be in English. Description in Hebrew.`;
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
            const data = JSON.parse(typeof response.text === 'function' ? response.text() : response.text || '{}');
            if (data.results) {
                const valid = data.results.filter((r: any) => !r.business_status || r.business_status === 'OPERATIONAL').map((r: any, i: number) => ({ ...r, id: `search-attr-${i}`, categoryTitle: 'תוצאות חיפוש' }));
                setSearchResults(valid);
                if (textQuery.trim()) {
                    const current = trip.customAttractionCategories || [];
                    if (!current.includes(textQuery.trim())) onUpdateTrip({ ...trip, customAttractionCategories: [...current, textQuery.trim()] });
                }
            }
        } catch (e) { console.error(e); } finally { setIsSearching(false); }
    };

    const clearSearch = () => { setTextQuery(''); setSearchResults(null); };

    const initiateResearch = (city?: string) => fetchRecommendations(true, city || trip.destinationEnglish || tripCities[0]);

    const fetchRecommendations = async (forceRefresh = false, specificCity?: string) => {
        setLoadingRecs(true);
        setRecError('');
        try {
            const ai = getAI();
            const target = specificCity || trip.destinationEnglish || trip.destination;
            const prompt = `Act as a Luxury Travel Concierge for ${target}. Provide guide with 6 categories (Hebrew Titles). Each 4 items. 'Grand Palace', 'Wat Arun'. Hebrew Description (10 words). Must See, Hidden Gems, Museums, Nature, Shopping, Nightlife.`;
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
                                        properties: { name: { type: Type.STRING }, description: { type: Type.STRING }, location: { type: Type.STRING }, rating: { type: Type.NUMBER }, type: { type: Type.STRING }, price: { type: Type.STRING }, recommendationSource: { type: Type.STRING } },
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
            const data = JSON.parse(typeof response.text === 'function' ? response.text() : response.text || '{}');
            if (data.categories) {
                const processed = data.categories.map((c: any) => ({ ...c, attractions: c.attractions.map((a: any, i: number) => ({ ...a, id: `ai-attr-${c.id}-${i}`, categoryTitle: c.title })) }));
                setAiCategories(processed);
                setSelectedCategory('all');
                onUpdateTrip({ ...trip, aiAttractions: processed });
            }
        } catch (e: any) { setRecError(e.message); } finally { setLoadingRecs(false); }
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
            if (targetIdx === -1) { newAttractions.push({ id: `cat-attr-${Date.now()}`, title: catTitle, attractions: [] }); targetIdx = newAttractions.length - 1; }
            newAttractions[targetIdx].attractions.push({ ...attraction, id: `added-${Date.now()}`, region: region });
        }
        onUpdateTrip({ ...trip, attractions: newAttractions });
        setAddedIds(prev => { const next = new Set(prev); if (existingCatIndex !== -1) next.delete(attraction.id); else next.add(attraction.id); return next; });
    };

    const filteredRecommendations = useMemo(() => {
        let list: any[] = [];
        if (selectedCategory === 'all') aiCategories.forEach(c => list.push(...c.attractions.map(a => ({ ...a, categoryTitle: c.title }))));
        else { const cat = aiCategories.find(c => c.id === selectedCategory); if (cat) list = cat.attractions.map(a => ({ ...a, categoryTitle: cat.title })); }
        if (selectedCity !== 'all') list = list.filter(a => (a.location || '').toLowerCase().includes(selectedCity.toLowerCase()));
        if (selectedRater !== 'all') list = list.filter(a => a.recommendationSource === selectedRater);
        return list;
    }, [aiCategories, selectedCategory, selectedRater, selectedCity]);

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

    // Filtered Raters
    const availableRaters = useMemo(() => {
        const sources = new Set<string>();
        aiCategories.forEach(c => c.attractions.forEach(a => a.recommendationSource && sources.add(a.recommendationSource)));
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

            {/* Tabs */}
            <div className="bg-slate-100/80 p-1.5 rounded-2xl flex relative mb-2">
                <button onClick={() => setActiveTab('my_list')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'my_list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Ticket className="w-4 h-4" /> האטרקציות שלי</button>
                <button onClick={() => setActiveTab('recommended')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'recommended' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Sparkles className="w-4 h-4" /> המלצות TOP (AI)</button>
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
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                                    <div className="w-24 h-24 bg-purple-50 rounded-full flex items-center justify-center shadow-inner">
                                        <Ticket className="w-10 h-10 text-purple-300" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-xl font-bold text-slate-700">עדיין לא הוספת אטרקציות</p>
                                        <p className="text-sm text-slate-500">עבור ללשונית "המלצות" והתחל לאסוף חוויות</p>
                                    </div>
                                    <button onClick={() => setActiveTab('recommended')} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all">התחל לחקור</button>
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
                                            attractionsData.forEach(c => c.attractions.forEach(a => flatList.push(a)));

                                            // Filter
                                            let filtered = flatList;
                                            if (selectedCity !== 'all') {
                                                filtered = flatList.filter(a => (a.location || '').toLowerCase().includes(selectedCity.toLowerCase()));
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
                            {loadingRecs ? <ThinkingLoader texts={["סורק אטרקציות...", "מחפש פנינים נסתרות...", "בודק דירוגים..."]} /> : (
                                <>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="bg-purple-50 p-2 rounded-full"><BrainCircuit className="w-5 h-5 text-purple-600" /></div>
                                        <div><h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Market Research</h3><p className="font-black text-lg text-slate-800">המלצות AI: Top Attractions</p></div>
                                    </div>

                                    {allAiAttractions().length === 0 ? (
                                        <div className="text-center py-10">
                                            <button onClick={() => initiateResearch()} className="bg-white border-2 border-purple-500 text-purple-600 px-8 py-3 rounded-2xl text-base font-bold shadow-md hover:shadow-lg hover:bg-purple-50 transition-all">
                                                {trip.destination} - בצע מחקר שוק
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="mb-2 overflow-x-auto pb-2 scrollbar-hide"><div className="flex gap-2">
                                                <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-full text-xs font-bold border ${selectedCategory === 'all' ? 'bg-purple-600 text-white' : 'bg-white text-slate-600'}`}>הכל</button>
                                                {aiCategories.map(c => <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={`px-4 py-2 rounded-full text-xs font-bold border ${selectedCategory === c.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600'}`}>{c.title}</button>)}
                                            </div></div>
                                            <div className="mb-4 overflow-x-auto pb-2 flex gap-2 items-center"><span className="text-[10px] font-bold text-slate-400">הומלץ ע"י:</span>
                                                <button onClick={() => setSelectedRater('all')} className={`px-4 py-2 rounded-full text-xs font-bold border ${selectedRater === 'all' ? 'bg-purple-600 text-white' : 'bg-white state-slate-600'}`}>הכל</button>
                                                {availableRaters.map(r => <button key={r} onClick={() => setSelectedRater(r)} className={`px-4 py-2 rounded-full text-xs font-bold border ${selectedRater === r ? 'bg-purple-600 text-white' : 'bg-white text-slate-600'}`}>{r}</button>)}
                                            </div>
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

    // Visuals
    const visuals = getAttractionVisuals(data.name + ' ' + (data.description || ''));
    // Fallback Image logic
    const imageSrc = data.imageUrl || `https://source.unsplash.com/400x300/?${visuals.label.split(' ')[0]},travel`;

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
                        {/* Using Star as Heart for consistency if needed, but Heart is better. Restaurants uses Heart now? Yes. */}
                        <Star className={`w-4 h-4 ${data.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                        {/* Note: I'm using Star here because the user might have said 'duplicate design' but let's check imports. I'll use Heart if I import it, or Star if that's what was used. RestaurantsView used Heart. */}
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