import React, { useMemo, useState } from 'react';
import { Trip, Restaurant, Attraction } from '../types';
import { Star, Utensils, Ticket, Calendar, Plus, X, ChevronRight } from 'lucide-react';

interface FavoritesWidgetProps {
        trip: Trip;
        onSchedule: (item: Restaurant | Attraction, date: string, type: 'food' | 'attraction') => void;
}

export const FavoritesWidget: React.FC<FavoritesWidgetProps> = ({ trip, onSchedule }) => {
        const [selectedItem, setSelectedItem] = useState<{ item: Restaurant | Attraction, type: 'food' | 'attraction' } | null>(null);

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

        // Generate Dates from Trip
        const tripDates = useMemo(() => {
                const dates: { iso: string, display: string, dow: string }[] = [];
                if (!trip.dates) return [];

                let start = new Date();
                let end = new Date();
                const parts = trip.dates.split('-').map(s => s.trim());

                // Simple parser
                const parse = (s: string) => {
                        if (s.includes('/')) {
                                const [d, m, y] = s.split('/');
                                return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                        }
                        return new Date(s);
                };

                if (parts.length === 2) {
                        start = parse(parts[0]);
                        end = parse(parts[1]);
                } else {
                        start.setHours(0, 0, 0, 0); // Default to today if invalid
                        end.setDate(start.getDate() + 5);
                }

                const current = new Date(start);
                while (current <= end) {
                        dates.push({
                                iso: current.toLocaleDateString('en-GB'), // DD/MM/YYYY
                                display: current.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                                dow: current.toLocaleDateString('he-IL', { weekday: 'short' })
                        });
                        current.setDate(current.getDate() + 1);
                }
                return dates;
        }, [trip.dates]);


        if (favorites.length === 0) {
                return (
                        <div className="px-2 mb-6 animate-fade-in relative z-30">
                                <div className="flex items-center gap-2 mb-3 px-2">
                                        <div className="p-1.5 bg-slate-100 rounded-lg text-slate-400">
                                                <Star className="w-4 h-4" />
                                        </div>
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">המועדפים שלי</h3>
                                </div>
                                <div className="mx-1 p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center">
                                        <Star className="w-8 h-8 text-slate-300 mb-2" />
                                        <p className="text-sm font-bold text-slate-500">עדיין אין מועדפים</p>
                                        <p className="text-xs text-slate-400 mt-1">סמן כוכב על מסעדות ואטרקציות כדי לראות אותם כאן</p>
                                </div>
                        </div>
                );
        }

        return (
                <div className="px-2 mb-6 animate-fade-in relative z-30">
                        <div className="flex items-center gap-2 mb-3 px-2">
                                <div className="p-1.5 bg-yellow-100 rounded-lg text-yellow-600">
                                        <Star className="w-4 h-4 fill-yellow-600" />
                                </div>
                                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">המועדפים שלי</h3>
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{favorites.length}</span>
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide px-1">
                                {favorites.map((fav, i) => (
                                        <div
                                                key={`${fav.type}-${i}`}
                                                onClick={() => setSelectedItem({ item: fav.data, type: fav.type })}
                                                className="min-w-[160px] w-[160px] bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden flex flex-col h-[180px]"
                                        >
                                                {/* Header Image/Icon */}
                                                <div className={`h-24 flex items-center justify-center relative ${fav.type === 'food' ? 'bg-orange-50 group-hover:bg-orange-100' : 'bg-purple-50 group-hover:bg-purple-100'} transition-colors`}>
                                                        {fav.type === 'food' ? <Utensils className="w-8 h-8 text-orange-400" /> : <Ticket className="w-8 h-8 text-purple-400" />}

                                                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-slate-100 shadow-sm flex items-center gap-0.5">
                                                                <span className="text-[10px] font-bold">{(fav.data as any).rating || (fav.data as any).googleRating || '5.0'}</span>
                                                                <Star className="w-2 h-2 text-yellow-400 fill-yellow-400" />
                                                        </div>
                                                </div>

                                                {/* Content */}
                                                <div className="p-3 flex flex-col flex-grow bg-white">
                                                        <h4 className="text-xs font-black text-slate-800 line-clamp-2 leading-tight mb-1" dir="ltr">
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
                                ))}
                        </div>

                        {/* Date Selection Modal */}
                        {selectedItem && (
                                <div className="fixed inset-0 z-[1500] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedItem(null)}>
                                        <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
                                                <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                                                        <div>
                                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">תזמון פעילות</div>
                                                                <h3 className="text-lg font-black text-slate-800 leading-none truncate max-w-[250px]" dir="ltr">{selectedItem.item.name}</h3>
                                                        </div>
                                                        <button onClick={() => setSelectedItem(null)} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-400" /></button>
                                                </div>

                                                <div className="p-4 max-h-[60vh] overflow-y-auto">
                                                        <div className="text-sm font-bold text-slate-500 mb-3">בחר יום בטיול:</div>
                                                        <div className="grid grid-cols-1 gap-2">
                                                                {tripDates.map(date => (
                                                                        <button
                                                                                key={date.iso}
                                                                                onClick={() => {
                                                                                        onSchedule(selectedItem.item, date.iso, selectedItem.type);
                                                                                        setSelectedItem(null);
                                                                                }}
                                                                                className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group text-right"
                                                                        >
                                                                                <div className="flex items-center gap-3">
                                                                                        <div className="bg-slate-100 text-slate-500 w-10 h-10 rounded-lg flex flex-col items-center justify-center group-hover:bg-blue-200 group-hover:text-blue-700">
                                                                                                <span className="text-[10px] uppercase font-bold">{date.dow}</span>
                                                                                                <span className="text-sm font-black leading-none">{date.display.split(' ')[0]}</span>
                                                                                        </div>
                                                                                        <span className="font-bold text-slate-700 group-hover:text-blue-900">יום {date.dow} - {date.display}</span>
                                                                                </div>
                                                                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500" />
                                                                        </button>
                                                                ))}
                                                        </div>
                                                </div>
                                        </div>
                                </div>
                        )}
                </div>
        );
};
