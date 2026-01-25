import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { TripDateSelector } from './TripDateSelector';
import { GlobalPlaceModal } from './GlobalPlaceModal'; // Global Modal System
import { PlaceIllustration } from './PlaceIllustration';
import { Trip, Restaurant, Attraction, DayPlan } from '../types';
import { Star, Utensils, Ticket, Calendar, Plus, X, ChevronRight } from 'lucide-react';
import { getPlaceImage } from '../services/imageMapper';

interface FavoritesWidgetProps {
        trip: Trip;
        onSchedule: (item: Restaurant | Attraction, date: string, type: 'food' | 'attraction') => void;
        timeline?: DayPlan[];
}

export const FavoritesWidget: React.FC<FavoritesWidgetProps> = ({ trip, onSchedule, timeline }) => {
        const [detailItem, setDetailItem] = useState<{ item: Restaurant | Attraction, type: 'food' | 'attraction' } | null>(null);
        const [isScheduling, setIsScheduling] = useState(false); // To toggle between Detail -> Schedule modes
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
                        onClick={() => setDetailItem({ item: fav.data, type: fav.type })}
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
                                <Column
                                        favorites={favorites}
                                        type="food"
                                        title="מסעדות"
                                        icon={<Utensils className="w-3 h-3" />}
                                        iconBg="bg-orange-50"
                                        iconColor="text-orange-600"
                                        trip={trip}
                                        onSelect={(item: any, type: any) => setDetailItem({ item, type })}
                                />

                                {/* Column 2: Attractions (Left) */}
                                <Column
                                        favorites={favorites}
                                        type="attraction"
                                        title="אטרקציות"
                                        icon={<Ticket className="w-3 h-3" />}
                                        iconBg="bg-purple-50"
                                        iconColor="text-purple-600"
                                        trip={trip}
                                        onSelect={(item: any, type: any) => setDetailItem({ item, type })}
                                />
                        </div>

                        {/* View All Modal */}
                        {showAllModal && (
                                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAllModal(false)}>
                                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[320px] max-h-[70vh] flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                                                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
                                                        <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-yellow-100 rounded-xl text-yellow-600"><Star className="w-5 h-5 fill-current" /></div>
                                                                <h3 className="text-lg font-black text-slate-800">המועדפים</h3>
                                                        </div>
                                                        <button onClick={() => setShowAllModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
                                                </div>
                                                <div className="flex-grow overflow-y-auto p-5 scrollbar-hide">
                                                        <div className="grid grid-cols-1 gap-4">
                                                                {favorites.map(fav => renderCard(fav, true))}
                                                        </div>
                                                </div>
                                        </div>
                                </div>
                        )}

                        {/* Global Place Details Modal (NEW) using Portal to escape overflow */}
                        {detailItem && createPortal(
                                <GlobalPlaceModal
                                        item={detailItem.item}
                                        type={detailItem.type}
                                        onClose={() => setDetailItem(null)}
                                        onAddToPlan={() => {
                                                setIsScheduling(true);
                                                // Don't close detailItem yet, wait for schedule success
                                        }}
                                />,
                                document.body
                        )}

                        {/* Global Date Selection Modal (Chained) using Portal */}
                        {isScheduling && createPortal(
                                <TripDateSelector
                                        isOpen={isScheduling}
                                        onClose={() => setIsScheduling(false)}
                                        onSelect={(dateIso) => {
                                                if (detailItem) {
                                                        onSchedule(detailItem.item, dateIso, detailItem.type);
                                                        setIsScheduling(false);
                                                        setDetailItem(null); // Close everything
                                                }
                                        }}
                                        title="תזמון פעילות"
                                        description={`עבור: ${detailItem?.item.name || ''}`}
                                        trip={trip}
                                        timeline={timeline}
                                />,
                                document.body
                        )}
                </div>
        );
};

// Helper Component for Column to reduce duplication & add Image Logic
const Column = ({ favorites, type, title, icon, iconBg, iconColor, trip, onSelect }: any) => {
        // Strict City Grouping Logic
        const groupedItems = useMemo(() => {
                const masterCities = trip.destination
                        ? trip.destination.split(/[-–,]/).map((c: string) => c.trim()).filter((c: string) => c.length > 0)
                        : ['Bangkok', 'Pattaya', 'Phuket', 'Chiang Mai', 'Samui', 'Krabi', 'Hua Hin', 'Ayutthaya']; // Fallback

                return favorites.filter((f: any) => f.type === type).reduce((groups: any, item: any) => {
                        const address = (item.data.location || item.data.address || '').toLowerCase();

                        // STRICT MATCH ONLY
                        let city = 'כללי'; // Default

                        // Check against master cities
                        for (const masterCity of masterCities) {
                                if (address.includes(masterCity.toLowerCase())) {
                                        city = masterCity;
                                        break;
                                }
                        }

                        // Normalize for display (First letter caps)
                        city = city.charAt(0).toUpperCase() + city.slice(1);

                        if (!groups[city]) groups[city] = [];
                        groups[city].push(item);
                        return groups;
                }, {} as Record<string, typeof favorites>);
        }, [favorites, type, trip.destination]);

        const sortedCities = Object.entries(groupedItems).sort((a: any, b: any) => {
                if (a[0] === 'General' || a[0] === 'כללי') return 1;
                if (b[0] === 'General' || b[0] === 'כללי') return -1;
                return a[0].localeCompare(b[0]);
        });

        return (
                <div className="flex flex-col h-full min-h-0 bg-slate-50/30">
                        <div className="flex-shrink-0 px-3 py-2 bg-white/80 backdrop-blur border-b border-slate-100 flex items-center gap-2 shadow-sm z-20">
                                <div className={`p-1 ${iconBg} rounded ${iconColor}`}>{icon}</div>
                                <span className="text-xs font-black text-slate-700">{title}</span>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 rounded-full mr-auto">{favorites.filter((f: any) => f.type === type).length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto scrollbar-thin p-0">
                                <div className="flex-1 p-0 pb-2">
                                        {sortedCities.map(([city, items]: any) => (
                                                <div key={city} className="relative mb-2">
                                                        {/* Prominent Header Style */}
                                                        <div className="w-full bg-slate-100/90 text-slate-600 text-[11px] font-bold py-1.5 px-3 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm border-y border-slate-200 shadow-sm flex items-center justify-between">
                                                                <span>{city}</span>
                                                                <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 rounded-full">{items.length}</span>
                                                        </div>
                                                        <div className="space-y-0.5 p-1">
                                                                {items.map((fav: any) => {
                                                                        // Get Smart Image
                                                                        const tags = [(fav.data.cuisine || fav.data.type || ''), fav.data.location];
                                                                        const thumb = getPlaceImage(fav.data.name, fav.type, tags);

                                                                        return (
                                                                                <div key={fav.data.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg border border-transparent hover:bg-slate-50 hover:border-slate-100 group transition-all">
                                                                                        <div className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer" onClick={() => onSelect(fav.data, fav.type)}>
                                                                                                {/* Thumbnail */}
                                                                                                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 shadow-sm border border-slate-100 bg-slate-200">
                                                                                                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                                                                                                </div>
                                                                                                <div className="min-w-0 flex-1">
                                                                                                        <span className="text-[11px] font-bold text-slate-700 truncate leading-tight line-clamp-1 block">{fav.data.name}</span>
                                                                                                        <div className="flex items-center gap-1 mt-0.5">
                                                                                                                <div className="flex items-center gap-0.5 px-1 bg-slate-50 rounded text-[9px] font-bold text-slate-400 border border-slate-100">
                                                                                                                        <span>{((fav.data as any).rating || '5.0')}</span><Star className="w-1.5 h-1.5 text-yellow-400 fill-yellow-400" />
                                                                                                                </div>
                                                                                                        </div>
                                                                                                </div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-1 shrink-0 ml-1">
                                                                                                <button onClick={() => onSelect(fav.data, fav.type)} className="p-1.5 bg-slate-50 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors border border-slate-100 group-hover:border-green-200" title="הוסף ללוח"><Plus className="w-3.5 h-3.5" /></button>
                                                                                        </div>
                                                                                </div>
                                                                        );
                                                                })}
                                                        </div>
                                                </div>
                                        ))}
                                        {favorites.filter((f: any) => f.type === type).length === 0 && (
                                                <div className="text-center py-6 text-slate-300 text-[10px]">אין תוצאות</div>
                                        )}
                                </div>
                        </div>
                </div>
        );
};
