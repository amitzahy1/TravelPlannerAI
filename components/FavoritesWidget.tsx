import React, { useMemo, useState } from 'react';
import { TripDateSelector } from './TripDateSelector';
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
                        <div className={`h-16 flex-shrink-0 flex items-center justify-center relative ${fav.type === 'food' ? 'bg-orange-50 group-hover:bg-orange-100' : 'bg-purple-50 group-hover:bg-purple-100'} transition-colors`}>
                                {fav.type === 'food' ? <Utensils className="w-6 h-6 text-orange-400" /> : <Ticket className="w-6 h-6 text-purple-400" />}

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
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white/50 backdrop-blur-md sticky top-0 z-20">
                                <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl shadow-sm bg-amber-50 text-amber-600">
                                                <Star className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest leading-none mt-0.5">
                                                המועדפים שלי
                                        </h3>
                                </div>
                                <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{favorites.length}</span>
                                </div>
                        </div>

                        {/* Split Logic: 2 Columns */}
                        <div className="flex-1 grid grid-cols-2 divide-x divide-x-reverse divide-slate-100 overflow-hidden bg-slate-50/30">

                                {/* Column 1: Food (Right) */}
                                <div className="flex flex-col h-full min-h-0 overflow-y-auto scrollbar-thin p-3 gap-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1 sticky top-0 bg-slate-50/95 backdrop-blur-sm p-1 z-10 rounded-lg">
                                                <Utensils className="w-3 h-3" /> מסעדות
                                        </div>
                                        {favorites.filter(f => f.type === 'food').map(fav => (
                                                <div
                                                        key={fav.data.id}
                                                        onClick={() => setSelectedItem({ item: fav.data, type: 'food' })}
                                                        className="p-3 bg-white border border-slate-100 rounded-xl hover:border-orange-200 hover:shadow-sm cursor-pointer transition-all group"
                                                >
                                                        <div className="flex justify-between items-start mb-1">
                                                                <span className="text-xs font-bold text-slate-800 line-clamp-1">{fav.data.name}</span>
                                                                <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 rounded">{((fav.data as any).rating || '5.0')} ★</span>
                                                        </div>
                                                        <button className="w-full mt-2 py-1 text-[10px] font-bold bg-slate-50 text-slate-400 hover:bg-orange-50 hover:text-orange-600 rounded-lg transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                                                                <Plus className="w-3 h-3" /> הוסף ללו"ז
                                                        </button>
                                                </div>
                                        ))}
                                        {favorites.filter(f => f.type === 'food').length === 0 && (
                                                <div className="text-center py-8 text-slate-300 text-[10px]">אין מסעדות שמורות</div>
                                        )}
                                </div>

                                {/* Column 2: Attractions (Left) */}
                                <div className="flex flex-col h-full min-h-0 overflow-y-auto scrollbar-thin p-3 gap-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-1 sticky top-0 bg-slate-50/95 backdrop-blur-sm p-1 z-10 rounded-lg">
                                                <Ticket className="w-3 h-3" /> אטרקציות
                                        </div>
                                        {favorites.filter(f => f.type === 'attraction').map(fav => (
                                                <div
                                                        key={fav.data.id}
                                                        onClick={() => setSelectedItem({ item: fav.data, type: 'attraction' })}
                                                        className="p-3 bg-white border border-slate-100 rounded-xl hover:border-purple-200 hover:shadow-sm cursor-pointer transition-all group"
                                                >
                                                        <div className="flex justify-between items-start mb-1">
                                                                <span className="text-xs font-bold text-slate-800 line-clamp-1">{fav.data.name}</span>
                                                                <span className="text-[10px] font-bold text-purple-500 bg-purple-50 px-1.5 rounded">{((fav.data as any).rating || '5.0')} ★</span>
                                                        </div>
                                                        <button className="w-full mt-2 py-1 text-[10px] font-bold bg-slate-50 text-slate-400 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                                                                <Plus className="w-3 h-3" /> הוסף ללו"ז
                                                        </button>
                                                </div>
                                        ))}
                                        {favorites.filter(f => f.type === 'attraction').length === 0 && (
                                                <div className="text-center py-8 text-slate-300 text-[10px]">אין אטרקציות שמורות</div>
                                        )}
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
