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
    const [aiCategories, setAiCategories] = useState<AttractionCategory[]>(trip.aiAttractions || []);
    const [loadingRecs, setLoadingRecs] = useState(false);
    const [recError, setRecError] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedRater, setSelectedRater] = useState<string>('all');
    const [selectedCity, setSelectedCity] = useState<string>('all');
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
    const [textQuery, setTextQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Attraction[] | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<Attraction | null>(null);

    const attractionsData = trip.attractions || [];

    useEffect(() => {
        if (trip.aiAttractions && trip.aiAttractions.length > 0) setAiCategories(trip.aiAttractions);
    }, [trip.aiAttractions]);

    const tripCities = useMemo(() => {
        if (!trip.destination) return [];
        return trip.destination.split(/ - | & |, /).map(s => s.trim()).filter(Boolean);
    }, [trip.destination]);

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

    const groupedMyList = useMemo(() => {
        const flat: Attraction[] = [];
        attractionsData.forEach(c => c.attractions.forEach(a => flat.push(a)));
        let filtered = flat;
        if (selectedCity !== 'all') filtered = flat.filter(a => (a.location || '').toLowerCase().includes(selectedCity.toLowerCase()));
        const groups: Record<string, Attraction[]> = {};
        filtered.forEach(a => { const city = a.location?.split(',')[0] || 'General'; if (!groups[city]) groups[city] = []; groups[city].push(a); });
        Object.keys(groups).forEach(city => groups[city] = sortAttractions(groups[city]));
        return groups;
    }, [attractionsData, selectedCity]);

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

            {searchResults && (
                <div className="space-y-3 animate-fade-in">
                    <div className="flex justify-between items-center"><h3 className="text-lg font-black text-slate-800">תוצאות חיפוש</h3><button onClick={clearSearch} className="text-xs text-slate-500 underline">נקה</button></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {searchResults.map(res => <AttractionRecommendationCard key={res.id} rec={res} tripDestination={trip.destination} isAdded={addedIds.has(res.id) || trip.attractions.some(c => c.attractions.some(a => a.name === res.name))} onAdd={handleToggleRec} onClick={() => setSelectedPlace(res)} />)}
                    </div>
                </div>
            )}

            <div className="bg-slate-100/80 p-1.5 rounded-2xl flex relative mb-2">
                <button onClick={() => setActiveTab('my_list')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'my_list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><Ticket className="w-4 h-4" /> האטרקציות שלי</button>
                <button onClick={() => setActiveTab('recommended')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'recommended' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}><Sparkles className="w-4 h-4" /> המלצות TOP (AI)</button>
            </div>

            {tripCities.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <button onClick={() => setSelectedCity('all')} className={`px-4 py-2 rounded-full text-xs font-black border ${selectedCity === 'all' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>כל הערים</button>
                    {tripCities.map(city => <button key={city} onClick={() => setSelectedCity(city)} className={`px-4 py-2 rounded-full text-xs font-black border ${selectedCity === city ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>{city}</button>)}
                </div>
            )}

            {viewMode === 'map' ? (
                <UnifiedMapView items={getMapItems()} title="מפה" />
            ) : (
                <>
                    {activeTab === 'my_list' ? (
                        <div className="space-y-8 mt-4">
                            {Object.entries(groupedMyList).map(([city, items]) => (
                                <div key={city} className="animate-fade-in">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-3"><div className="h-px bg-slate-200 flex-grow"></div>{city}<div className="h-px bg-slate-200 flex-grow"></div></h3>
                                    <div className="flex flex-col gap-3">
                                        {items.map(attr => <AttractionRow key={attr.id} data={attr} onSaveNote={(n) => handleUpdateAttraction(attr.id, { notes: n })} onUpdate={(u) => handleUpdateAttraction(attr.id, u)} onDelete={() => handleDeleteAttraction(attr.id)} />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            {loadingRecs ? <ThinkingLoader texts={["סורק אטרקציות..."]} /> : (
                                <>
                                    <div className="mb-2 overflow-x-auto pb-2"><div className="flex gap-2">
                                        <button onClick={() => setSelectedCategory('all')} className={`px-4 py-2 rounded-full text-xs font-bold border ${selectedCategory === 'all' ? 'bg-purple-800 text-white' : 'bg-white'}`}>הכל</button>
                                        {aiCategories.map(c => <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={`px-4 py-2 rounded-full text-xs font-bold border ${selectedCategory === c.id ? 'bg-purple-800 text-white' : 'bg-white'}`}>{c.title}</button>)}
                                    </div></div>
                                    <div className="mb-4 overflow-x-auto pb-2 flex gap-2 items-center"><span className="text-[10px] font-bold text-slate-400">הומלץ ע"י:</span>
                                        <button onClick={() => setSelectedRater('all')} className={`px-4 py-2 rounded-full text-xs font-bold border ${selectedRater === 'all' ? 'bg-purple-800 text-white' : 'bg-white'}`}>הכל</button>
                                        {availableRaters.map(r => <button key={r} onClick={() => setSelectedRater(r)} className={`px-4 py-2 rounded-full text-xs font-bold border ${selectedRater === r ? 'bg-purple-800 text-white' : 'bg-white'}`}>{r}</button>)}
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                        {filteredRecommendations.map(rec => <AttractionRecommendationCard key={rec.id} rec={rec} tripDestination={trip.destination} isAdded={addedIds.has(rec.id) || trip.attractions.some(c => c.attractions.some(a => a.name === rec.name))} onAdd={handleToggleRec} onClick={() => setSelectedPlace(rec)} />)}
                                    </div>
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
};

const AttractionRow: React.FC<{ data: Attraction, onSaveNote: (n: string) => void, onUpdate: (updates: Partial<Attraction>) => void, onDelete: () => void }> = ({ data, onSaveNote, onUpdate, onDelete }) => {
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState(data.notes || '');
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleTime, setScheduleTime] = useState(data.scheduledTime || '');

    // Internal visibility for date picker
    const [showDatePicker, setShowDatePicker] = useState(false);

    const handleSaveSchedule = () => { onUpdate({ scheduledTime: scheduleTime }); setIsScheduling(false); };
    const saveNote = () => { onSaveNote(noteText); setIsEditingNote(false); };
    const toggleFavorite = () => onUpdate({ isFavorite: !data.isFavorite });

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.name + ' ' + (data.location || ''))}`;

    const getTypeIcon = () => {
        const text = (data.name + ' ' + (data.description || '')).toLowerCase();
        if (text.includes('museum') || text.includes('art')) return <Landmark className="w-5 h-5 text-amber-600" />;
        if (text.includes('nature') || text.includes('park')) return <Mountain className="w-5 h-5 text-emerald-600" />;
        if (text.includes('beach') || text.includes('sea')) return <Palmtree className="w-5 h-5 text-cyan-600" />;
        if (text.includes('shop') || text.includes('mall')) return <ShoppingBag className="w-5 h-5 text-pink-600" />;
        return <Ticket className="w-5 h-5 text-purple-600" />;
    };

    return (
        <div className={`bg-white rounded-xl border p-3 hover:shadow-md transition-all flex flex-col md:flex-row gap-3 relative overflow-hidden ${data.isFavorite ? 'border-yellow-200 ring-1 ring-yellow-50' : 'border-slate-100'}`}>
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-slate-50 rounded-xl shadow-inner">{getTypeIcon()}</div>
            <div className="flex-grow">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                            <button onClick={toggleFavorite} className="focus:outline-none"><Star className={`w-4 h-4 ${data.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`} /></button>
                            <h4 className="text-sm font-black text-slate-900">{data.name}</h4>
                            {data.rating && <div className="flex items-center bg-yellow-50 px-1 py-0.5 rounded text-[9px] font-bold text-yellow-700">{data.rating}⭐</div>}
                        </div>
                        <p className="text-slate-500 text-[11px] mt-1 line-clamp-1">{data.description}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <a href={mapsUrl} target="_blank" rel="noreferrer" className="p-1.5 text-slate-400 border border-slate-100 rounded-lg"><Navigation className="w-3.5 h-3.5" /></a>
                        <button onClick={() => setIsScheduling(!isScheduling)} className={`p-1.5 rounded-lg border ${data.scheduledDate ? 'bg-purple-50 border-purple-100 text-purple-600' : 'border-slate-100 text-slate-400'}`}><Calendar className="w-3.5 h-3.5" /></button>
                        <button onClick={onDelete} className="p-1.5 text-slate-400 border border-slate-100 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                </div>

                {isScheduling && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-3">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-purple-700 uppercase">תאריך</label>
                            <button onClick={() => setShowDatePicker(true)} className="w-full bg-white p-2 rounded-lg border border-purple-200 text-xs text-right flex justify-between">
                                <span>{data.scheduledDate || 'בחר תאריך'}</span><Calendar className="w-3 h-3" />
                            </button>
                            {showDatePicker && (
                                <CalendarDatePicker
                                    value={data.scheduledDate || ''}
                                    title="מזמן אטרקציה"
                                    onChange={(d) => { onUpdate({ scheduledDate: d }); setShowDatePicker(false); }}
                                    onClose={() => setShowDatePicker(false)}
                                />
                            )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-purple-700 uppercase">שעה</label>
                            <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="p-2 border border-purple-200 rounded-lg text-xs" />
                        </div>
                        <div className="flex justify-end gap-2"><button onClick={() => setIsScheduling(false)} className="text-[10px] font-bold text-purple-400">ביטול</button><button onClick={handleSaveSchedule} className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black">שמור</button></div>
                    </div>
                )}

                <div className="mt-2">
                    {isEditingNote ? (
                        <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-100"><textarea className="w-full bg-transparent border-none outline-none text-[11px] text-yellow-900" rows={1} value={noteText} onChange={e => setNoteText(e.target.value)} /><div className="flex justify-end gap-2 mt-1"><button onClick={saveNote} className="text-[10px] font-black text-yellow-700">שמור</button></div></div>
                    ) : (
                        <div onClick={() => setIsEditingNote(true)} className="text-[10px] text-slate-400 border border-dashed border-slate-200 rounded-lg p-1.5 flex items-center gap-2 cursor-pointer">{data.notes ? <><StickyNote className="w-3 h-3 text-yellow-500" /> <span className="text-yellow-900">{data.notes}</span></> : <>+ הוסף הערה...</>}</div>
                    )}
                </div>
            </div>
        </div>
    );
};