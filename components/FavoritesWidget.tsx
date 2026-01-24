import React, { useMemo, useState } from 'react';
import { TripDateSelector } from './TripDateSelector';
import { PlaceIllustration } from './PlaceIllustration'; // Moved to top level
import { Trip, Restaurant, Attraction, DayPlan } from '../types';
import { Star, Utensils, Ticket, Calendar, Plus, X, ChevronRight } from 'lucide-react';

interface FavoritesWidgetProps {
        trip: Trip;
        onSchedule: (item: Restaurant | Attraction, date: string, type: 'food' | 'attraction') => void;
        timeline?: DayPlan[];
}

export const FavoritesWidget: React.FC<FavoritesWidgetProps> = ({ trip, onSchedule, timeline }) => {
        const [selectedItem, setSelectedItem] = useState<{ item: Restaurant | Attraction, type: 'food' | 'attraction' } | null>(null);
        const [showAllModal, setShowAllModal] = useState(false);

        // Collect Data
        const favorites = useMemo(() => {
                const items: { data: Restaurant | Attraction, type: 'food' | 'attraction', sortKey: number }[] = [];

                trip.restaurants?.forEach(cat => cat.restaurants.forEach(r => {
                        if (r.isFavorite) items.push({ data: r, type: 'food', sortKey: r.googleRating || 0 });
                }));

                trip.attractions?.forEach(cat => cat.attractions.forEach(a => {
                        if (a.isFavorite) items.push({ data: a, type: 'attraction', sortKey: a.rating || 0 });
                }));

                return items.sort((a, b) => b.sortKey - a.sortKey);
        }, [trip]);

        const displayedFavorites = useMemo(() => {
                // Show up to 4 items in the list view
                return favorites.slice(0, 4);
        }, [favorites]);

        if (favorites.length === 0) {
                return (
                        <div className="h-full px-2 animate-fade-in relative z-30 flex flex-col">
                                <div className="flex items-center gap-2 mb-3 px-2 flex-shrink-0">
                                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                                                <Star className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">המועדפים שלי</h3>
                                </div>
                                <div className="flex-grow mx-1 p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
                                        <Star className="w-8 h-8 text-slate-300 mb-2" />
                                        <p className="text-sm font-bold text-slate-500">עדיין אין מועדפים</p>
                                        <p className="text-xs text-slate-400 mt-1">סמן כוכב על מסעדות ואטרקציות</p>
                                </div>
                        </div>
                );
        }

        const renderCard = (fav: typeof favorites[0], isSmall = false) => (
                <div
                        key={`${fav.type}-${fav.data.id}`}
                        onClick={() => setSelectedItem({ item: fav.data, type: fav.type })}
                        className={`bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden flex flex-col ${isSmall ? 'h-[140px]' : 'h-full'}`}
                >

                        {/* Header Image/Icon */}
                        <div className={`h-16 flex-shrink-0 flex items-center justify-center relative bg-slate-50 group-hover:bg-slate-100 transition-colors`}>
                                <div className="transform scale-75 group-hover:scale-90 transition-transform">
                                        <PlaceIllustration
                                                type={fav.type}
                                                subType={(fav.data as any).cuisine || (fav.data as any).type}
                                                className="w-10 h-10"
                                        />
                                </div>

                                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-slate-100 shadow-sm flex items-center gap-0.5">
                                        <span className="text-[10px] font-bold">{(fav.data as any).rating || (fav.data as any).googleRating || '5.0'}</span>
                                        <Star className="w-2 h-2 text-yellow-400 fill-yellow-400" />
                                </div>
                        </div>

                        {/* Content */}
                        <div className="p-2 flex flex-col flex-grow bg-white min-h-0">
                                <h4 className="text-xs font-black text-slate-800 line-clamp-2 leading-tight mb-0.5" dir="ltr">
                                        {fav.data.name}
                                </h4>
                                <p className="text-[10px] text-slate-400 font-medium line-clamp-1 mb-2">
                                        {(fav.data as any).cuisine || (fav.data as any).type || (fav.type === 'food' ? 'מסעדה' : 'אטרקציה')}
                                </p>

                                <div className="mt-auto flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-blue-600 group-hover:underline">קבע לו"ז</span>
                                        <div className="p-1 bg-slate-50 rounded-full group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                <Plus className="w-3 h-3" />
                                        </div>
                                </div>
                        </div>
                </div>
        );

        return (
                <div className="h-full px-1 animate-fade-in relative z-30 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        {/* Clone Header: Favorites */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20 h-[40px]">
                                <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                                                <Star className="w-3.5 h-3.5" />
                                        </div>
                                        <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest leading-none mt-0.5">
                                                המועדפים שלי
                                        </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{favorites.length}</span>
                                </div>
                        </div>

                        {/* Split Logic: 2 Columns (Micro Mode) */}
                        <div className="flex-1 grid grid-cols-2 divide-x divide-x-reverse divide-slate-100 overflow-hidden bg-white">

                                {/* Column 1: Food (Right) */}
                                <div className="flex flex-col h-full min-h-0 overflow-y-auto scrollbar-thin p-0">
                                        <div className="flex-1 p-0 pb-2">
                                                {Object.entries(
                                                        favorites.filter(f => f.type === 'food').reduce((groups, item) => {
                                                                // Heuristic: Extract City from Location
                                                                const tripCities = trip.destination ? trip.destination.split('-').map(s => s.trim()) : [];
                                                                let city = 'כללי';
                                                                const loc = item.data.location || '';

                                                                // 1. Try to match known trip cities
                                                                const match = tripCities.find(c => loc.toLowerCase().includes(c.toLowerCase()));
                                                                if (match) city = match;
                                                                else {
                                                                        // 2. Fallback: Parse address (Take second to last part or first part)
                                                                        const parts = loc.split(',').map(s => s.trim());
                                                                        if (parts.length >= 2) city = parts[parts.length - 2];
                                                                        else if (parts.length === 1) city = parts[0];
                                                                }

                                                                if (!groups[city]) groups[city] = [];
                                                                groups[city].push(item);
                                                                return groups;
                                                        }, {} as Record<string, typeof favorites>)
                                                ).sort((a, b) => a[0].localeCompare(b[0])) // Sort by City Name
                                                        .map(([city, items]) => (
                                                                <div key={city} className="relative">
                                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 bg-slate-50/95 sticky top-0 backdrop-blur-sm z-10 border-y border-slate-100 shadow-sm">
                                                                                {city}
                                                                        </div>
                                                                        <div className="space-y-0.5 p-1">
                                                                                {items.map(fav => (
                                                                                        <div
                                                                                                key={fav.data.id}
                                                                                                className="flex items-center justify-between py-1.5 px-2 rounded-lg border border-transparent hover:bg-slate-50 hover:border-slate-100 group transition-all"
                                                                                        >
                                                                                                {/* Info */}
                                                                                                <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedItem({ item: fav.data, type: 'food' })}>
                                                                                                        <div className="w-4 h-4 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
                                                                                                                <Utensils className="w-2.5 h-2.5 text-orange-500" />
                                                                                                        </div>
                                                                                                        <span className="text-[11px] font-bold text-slate-700 truncate leading-tight">{fav.data.name}</span>
                                                                                                </div>

                                                                                                {/* Actions */}
                                                                                                <div className="flex items-center gap-1 shrink-0">
                                                                                                        <div className="flex items-center gap-0.5 px-1 bg-slate-50 rounded text-[9px] font-bold text-slate-400">
                                                                                                                <span>{((fav.data as any).rating || '5.0')}</span>
                                                                                                                <Star className="w-2 h-2 text-yellow-400 fill-yellow-400" />
                                                                                                        </div>
                                                                                                        <button
                                                                                                                onClick={() => setSelectedItem({ item: fav.data, type: 'food' })}
                                                                                                                className="p-1 text-green-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                                                                                title="הוסף ללוח"
                                                                                                        >
                                                                                                                <Plus className="w-3 h-3" />
                                                                                                        </button>
                                                                                                </div>
                                                                                        </div>
                                                                                ))}
                                                                        </div>
                                                                </div>
                                                        ))}
                                                {favorites.filter(f => f.type === 'food').length === 0 && (
                                                        <div className="text-center py-6 text-slate-300 text-[10px]">אין מסעדות שמורות</div>
                                                )}
                                        </div>
                                </div>

                                {/* Column 2: Attractions (Left) */}
                                <div className="flex flex-col h-full min-h-0 overflow-y-auto scrollbar-thin p-0">
                                        <div className="flex-1 p-0 pb-2">
                                                {Object.entries(
                                                        favorites.filter(f => f.type === 'attraction').reduce((groups, item) => {
                                                                // Heuristic: Extract City from Location
                                                                const tripCities = trip.destination ? trip.destination.split('-').map(s => s.trim()) : [];
                                                                let city = 'כללי';
                                                                const loc = item.data.location || '';

                                                                // 1. Try to match known trip cities
                                                                const match = tripCities.find(c => loc.toLowerCase().includes(c.toLowerCase()));
                                                                if (match) city = match;
                                                                else {
                                                                        // 2. Fallback: Parse address
                                                                        const parts = loc.split(',').map(s => s.trim());
                                                                        if (parts.length >= 2) city = parts[parts.length - 2];
                                                                        else if (parts.length === 1) city = parts[0];
                                                                }

                                                                if (!groups[city]) groups[city] = [];
                                                                groups[city].push(item);
                                                                return groups;
                                                        }, {} as Record<string, typeof favorites>)
                                                ).sort((a, b) => a[0].localeCompare(b[0])) // Sort by City Name
                                                        .map(([city, items]) => (
                                                                <div key={city} className="relative">
                                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 bg-slate-50/95 sticky top-0 backdrop-blur-sm z-10 border-y border-slate-100 shadow-sm">
                                                                                {city}
                                                                        </div>
                                                                        <div className="space-y-0.5 p-1">
                                                                                {items.map(fav => (
                                                                                        <div
                                                                                                key={fav.data.id}
                                                                                                className="flex items-center justify-between py-1.5 px-2 rounded-lg border border-transparent hover:bg-slate-50 hover:border-slate-100 group transition-all"
                                                                                        >
                                                                                                {/* Info */}
                                                                                                <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => setSelectedItem({ item: fav.data, type: 'attraction' })}>
                                                                                                        <div className="w-4 h-4 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                                                                                                                <Ticket className="w-2.5 h-2.5 text-purple-500" />
                                                                                                        </div>
                                                                                                        <span className="text-[11px] font-bold text-slate-700 truncate leading-tight">{fav.data.name}</span>
                                                                                                </div>

                                                                                                {/* Actions */}
                                                                                                <div className="flex items-center gap-1 shrink-0">
                                                                                                        <div className="flex items-center gap-0.5 px-1 bg-slate-50 rounded text-[9px] font-bold text-slate-400">
                                                                                                                <span>{((fav.data as any).rating || '5.0')}</span>
                                                                                                                <Star className="w-2 h-2 text-yellow-400 fill-yellow-400" />
                                                                                                        </div>
                                                                                                        <button
                                                                                                                onClick={() => setSelectedItem({ item: fav.data, type: 'attraction' })}
                                                                                                                className="p-1 text-green-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                                                                                title="הוסף ללוח"
                                                                                                        >
                                                                                                                <Plus className="w-3 h-3" />
                                                                                                        </button>
                                                                                                </div>
                                                                                        </div>
                                                                                ))}
                                                                        </div>
                                                                </div>
                                                        ))}
                                                {favorites.filter(f => f.type === 'attraction').length === 0 && (
                                                        <div className="text-center py-6 text-slate-300 text-[10px]">אין אטרקציות שמורות</div>
                                                )}
                                        </div>
                                </div>
                        </div>

                        {/* View All Modal */}
                        {showAllModal && (
                                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowAllModal(false)}>
                                        <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                                                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                                        <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-yellow-100 rounded-xl text-yellow-600"><Star className="w-5 h-5 fill-current" /></div>
                                                                <h3 className="text-lg font-black text-slate-800">כל האטרקציות והמסעדות השמורות</h3>
                                                        </div>
                                                        <button onClick={() => setShowAllModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
                                                </div>
                                                <div className="flex-grow overflow-y-auto p-5 scrollbar-hide">
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                {favorites.map(fav => renderCard(fav, true))}
                                                        </div>
                                                </div>
                                        </div>
                                </div>
                        )}

                        {/* Global Date Selection Modal */}
                        <TripDateSelector
                                isOpen={!!selectedItem}
                                onClose={() => setSelectedItem(null)}
                                onSelect={(dateIso) => {
                                        if (selectedItem) {
                                                onSchedule(selectedItem.item, dateIso, selectedItem.type);
                                                setSelectedItem(null);
                                        }
                                }}
                                title="תזמון פעילות"
                                description={`עבור: ${selectedItem?.item.name || ''}`}
                                trip={trip}
                                timeline={timeline}
                        />
                </div>
        );
};
