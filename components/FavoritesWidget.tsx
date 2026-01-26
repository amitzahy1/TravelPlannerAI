import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { TripDateSelector } from './TripDateSelector';
import { GlobalPlaceModal } from './GlobalPlaceModal';
import { SlideOverPanel } from './SlideOverPanel';
import { Trip, Restaurant, Attraction, DayPlan } from '../types';
import { Star, Utensils, Ticket, Calendar, Plus, X, ChevronRight, MapPin, ArrowUpRight } from 'lucide-react';
import { getPlaceImage } from '../services/imageMapper';

interface FavoritesWidgetProps {
        trip: Trip;
        onSchedule: (item: Restaurant | Attraction, date: string, type: 'food' | 'attraction') => void;
        timeline?: DayPlan[];
}

// Helper Component for Column (Hoisted)
const Column = ({ favorites, type, title, icon, iconBg, iconColor, trip, onSelect }: any) => {
        const groupedItems = useMemo(() => {
                const masterCities = trip.destination
                        ? trip.destination.split(/[-–,]/).map((c: string) => c.trim()).filter((c: string) => c.length > 0)
                        : [];

                return favorites.filter((f: any) => f.type === type).reduce((groups: any, item: any) => {
                        const address = (item.data.location || item.data.address || '').toLowerCase();
                        let city = 'כללי';
                        for (const masterCity of masterCities) {
                                if (address.includes(masterCity.toLowerCase())) {
                                        city = masterCity;
                                        break;
                                }
                        }
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
                        <div className="flex-shrink-0 px-4 py-3 bg-white/80 backdrop-blur border-b border-slate-100 flex items-center gap-2 shadow-sm z-20 sticky top-0">
                                <div className={`p-1.5 ${iconBg} rounded-md ${iconColor}`}>{icon}</div>
                                <span className="text-xs font-black text-slate-700">{title}</span>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full mr-auto">{favorites.filter((f: any) => f.type === type).length}</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                <div className="flex-1 p-0 pb-10">
                                        {sortedCities.map(([city, items]: any) => (
                                                <div key={city} className="relative mb-2">
                                                        <div className="w-full bg-slate-100/90 text-slate-600 text-[10px] font-bold py-1.5 px-4 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-sm border-y border-slate-200 shadow-sm flex items-center justify-between">
                                                                <span>{city}</span>
                                                                <span className="text-[9px] bg-white text-slate-400 px-1.5 rounded-full border border-slate-200">{items.length}</span>
                                                        </div>
                                                        <div className="space-y-0.5 p-1">
                                                                {items.map((fav: any) => {
                                                                        const tags = [(fav.data.cuisine || fav.data.type || ''), fav.data.location];
                                                                        const { url } = getPlaceImage(fav.data.name, fav.type, tags);

                                                                        return (
                                                                                <div key={fav.data.id} className="flex items-center gap-3 p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-slate-100 cursor-pointer group" onClick={() => onSelect(fav.data, fav.type)}>
                                                                                        <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden flex-shrink-0 border border-slate-100 relative">
                                                                                                <img src={url} alt="" className="w-full h-full object-cover" />
                                                                                        </div>
                                                                                        <div className="min-w-0 flex-1">
                                                                                                <span className="text-xs font-bold text-slate-700 truncate block leading-tight">{fav.data.name}</span>
                                                                                                <div className="flex items-center gap-1.5 mt-1">
                                                                                                        <span className="text-[10px] text-slate-400 truncate max-w-[100px]">{fav.data.location?.split(',')[0]}</span>
                                                                                                        <div className="flex items-center gap-0.5 px-1 bg-yellow-50 rounded text-[9px] font-bold text-yellow-700 border border-yellow-100">
                                                                                                                <span>{((fav.data as any).rating || '5.0')}</span><Star className="w-1.5 h-1.5 text-yellow-500 fill-yellow-500" />
                                                                                                        </div>
                                                                                                </div>
                                                                                        </div>
                                                                                        <button className="p-1.5 bg-slate-50 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"><Plus className="w-4 h-4" /></button>
                                                                                </div>
                                                                        );
                                                                })}
                                                        </div>
                                                </div>
                                        ))}
                                        {favorites.filter((f: any) => f.type === type).length === 0 && (
                                                <div className="text-center py-12 text-slate-300 text-xs flex flex-col items-center gap-2">
                                                        <div className="p-3 bg-slate-50 rounded-full">{icon}</div>
                                                        <span>אין פריטים</span>
                                                </div>
                                        )}
                                </div>
                        </div>
                </div>
        );
};

export const FavoritesWidget: React.FC<FavoritesWidgetProps> = ({ trip, onSchedule, timeline }) => {

        const [detailItem, setDetailItem] = useState<{ item: Restaurant | Attraction, type: 'food' | 'attraction' } | null>(null);
        const [isScheduling, setIsScheduling] = useState(false);
        const [isExpanded, setIsExpanded] = useState(false); // Controls SlideOverPanel

        // Collect Data with Source Context
        const favorites = useMemo(() => {
                const items: { data: Restaurant | Attraction, type: 'food' | 'attraction', sortKey: number, cityGroup: string }[] = [];

                trip.restaurants?.forEach(cat => cat.restaurants.forEach(r => {
                        if (r.isFavorite) items.push({ data: r, type: 'food', sortKey: r.googleRating || 0, cityGroup: cat.title });
                }));

                trip.attractions?.forEach(cat => cat.attractions.forEach(a => {
                        if (a.isFavorite) items.push({ data: a, type: 'attraction', sortKey: a.rating || 0, cityGroup: cat.title });
                }));

                return items.sort((a, b) => b.sortKey - a.sortKey);
        }, [trip]);

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

        const renderCompactItem = (fav: typeof favorites[0]) => {
                const tags = [(fav.data as any).cuisine || (fav.data as any).type || '', fav.data.location];
                const { url } = getPlaceImage(fav.data.name, fav.type as any, tags);

                return (
                        <div
                                key={`${fav.type}-${fav.data.id}`}
                                onClick={() => setDetailItem({ item: fav.data, type: fav.type })}
                                className="flex items-center gap-2.5 p-1.5 bg-white border border-slate-100 rounded-lg hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
                        >
                                <div className="w-10 h-10 rounded-md bg-slate-100 overflow-hidden flex-shrink-0 relative">
                                        <img src={url} alt={fav.data.name} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                                </div>
                                <div className="flex-1 min-w-0">
                                        <h4 className="text-xs font-bold text-slate-800 truncate leading-tight">{fav.data.name}</h4>
                                        <div className="flex items-center gap-1 mt-0.5">
                                                <span className={`text-[9px] font-bold px-1 py-px rounded ${fav.type === 'food' ? 'bg-orange-50 text-orange-600' : 'bg-purple-50 text-purple-600'}`}>
                                                        {fav.type === 'food' ? 'אוכל' : 'אטרקציה'}
                                                </span>
                                                <div className="flex items-center gap-0.5 text-[9px] text-slate-400 font-medium">
                                                        <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                                                        <span>{(fav.data as any).rating || (fav.data as any).googleRating || '5.0'}</span>
                                                </div>
                                        </div>
                                </div>
                                <button
                                        onClick={(e) => {
                                                e.stopPropagation();
                                                setDetailItem({ item: fav.data, type: fav.type });
                                        }}
                                        className="p-1 hover:bg-slate-50 rounded-full text-slate-300 hover:text-blue-600 transition-colors"
                                >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                        </div>
                );
        };

        const renderGroupedSection = (sectionFavorites: typeof favorites, type: 'food' | 'attraction', icon: React.ReactNode, typeName: string, colorClass: string, bgClass: string, borderClass: string) => (
                <div className={`animate-fade-in flex flex-col h-full bg-${bgClass}-50/10 rounded-xl p-0.5 min-h-[120px] overflow-hidden`}>
                        <div className={`flex items-center justify-between mb-2 px-1 pb-1 border-b border-${borderClass}-100`}>
                                <span className={`text-[10px] font-black text-${colorClass}-400 uppercase tracking-widest flex items-center gap-1.5`}>{icon} {typeName} ({sectionFavorites.length})</span>
                        </div>
                        <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar pr-1">
                                {sectionFavorites.length > 0 ? (
                                        (() => {
                                                // 1. ALWAYS LIMIT TO 2 ITEMS (Compact)
                                                const itemsToRender = sectionFavorites.slice(0, 2);

                                                // 2. Strict City Grouping Logic
                                                const tripCities = trip.destination ? trip.destination.split(/[-–,]/).map(c => c.trim()) : [];

                                                const groups: Record<string, typeof itemsToRender> = {};

                                                itemsToRender.forEach(item => {
                                                        const loc = (item.data.location || '').toLowerCase();
                                                        const region = (item.data as any).region;

                                                        let matchedCity = tripCities.find(c =>
                                                                (region && region.toLowerCase().includes(c.toLowerCase())) ||
                                                                loc.includes(c.toLowerCase())
                                                        );

                                                        // Heuristic fallback
                                                        if (!matchedCity && loc.includes('telavi') && tripCities.some(c => c.includes('Lopota'))) {
                                                                matchedCity = tripCities.find(c => c.includes('Lopota'));
                                                        }

                                                        const groupName = matchedCity || 'כללי';
                                                        if (!groups[groupName]) groups[groupName] = [];
                                                        groups[groupName].push(item);
                                                });

                                                return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0])).map(([city, items]) => (
                                                        <div key={city} className="mb-1">
                                                                <h5 className="text-[10px] font-bold text-slate-400 mb-1 px-1 flex items-center gap-1">
                                                                        <MapPin className="w-2.5 h-2.5" /> {city}
                                                                </h5>
                                                                <div className="space-y-2">
                                                                        {items.map(renderCompactItem)}
                                                                </div>
                                                        </div>
                                                ));
                                        })()
                                ) : (
                                        <div className="h-full bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center p-4">
                                                <span className="text-[10px] text-slate-400 font-bold">אין {typeName}</span>
                                        </div>
                                )}
                        </div>
                </div>
        );

        return (
                <>
                        <div className="px-1 animate-fade-in relative z-30 flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-4 h-full">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                </div>
                                                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">
                                                        המועדפים ({favorites.length})
                                                </h3>
                                        </div>
                                        {/* SlideOver Toggle (Top Right - Main Access to Full List) */}
                                        {(favorites.length > 4) && (
                                                <button
                                                        onClick={() => setIsExpanded(true)}
                                                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                                                        title="פתח רשימה מלאה"
                                                >
                                                        <ArrowUpRight className="w-4 h-4" />
                                                </button>
                                        )}
                                </div>
                                {/* Compact Split List - GRID LAYOUT */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-hidden">
                                        {renderGroupedSection(favorites.filter(f => f.type === 'food'), 'food', <Utensils className="w-3 h-3" />, 'מסעדות', 'orange', 'orange', 'orange')}
                                        {renderGroupedSection(favorites.filter(f => f.type === 'attraction'), 'attraction', <Ticket className="w-3 h-3" />, 'אטרקציות', 'purple', 'purple', 'purple')}
                                </div>

                                {/* NO BOTTOM BUTTON AS REQUESTED */}
                        </div>

                        {/* EXPANDED SLIDE-OVER PANEL */}
                        <SlideOverPanel
                                isOpen={isExpanded}
                                onClose={() => setIsExpanded(false)}
                                title="כל המועדפים"
                                width="max-w-xl"
                                zIndex={60}
                        >
                                <div className="h-full flex flex-col">
                                        {/* Toolbar */}
                                        <div className="px-6 py-2 border-b border-slate-50 flex gap-2 overflow-x-auto scrollbar-hide">
                                                <div className="text-xs font-bold text-slate-400 px-2 py-1">מציג {favorites.length} מקומות</div>
                                        </div>

                                        {/* Split View Content */}
                                        <div className="flex-1 grid grid-cols-2 divide-x divide-x-reverse divide-slate-100 overflow-hidden bg-white">
                                                {/* Column 1: Food */}
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
                                                {/* Column 2: Attractions */}
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
                                </div>
                        </SlideOverPanel>

                        {/* Modals Logic */}
                        {
                                detailItem && createPortal(
                                        <GlobalPlaceModal
                                                item={detailItem.item}
                                                type={detailItem.type === 'food' ? 'restaurant' : 'attraction'}
                                                onClose={() => setDetailItem(null)}
                                                onAddToPlan={() => {
                                                        setIsScheduling(true);
                                                }}
                                                isAdded={detailItem.type === 'food' ? (detailItem.item as Restaurant).reservationDate !== undefined : (detailItem.item as Attraction).scheduledDate !== undefined}
                                        />,
                                        document.body
                                )
                        }

                        {
                                isScheduling && createPortal(
                                        <TripDateSelector
                                                isOpen={isScheduling}
                                                onClose={() => setIsScheduling(false)}
                                                onSelect={(dateIso) => {
                                                        if (detailItem) {
                                                                onSchedule(detailItem.item, dateIso, detailItem.type);
                                                                setIsScheduling(false);
                                                                setDetailItem(null);
                                                                setIsExpanded(false); // Close panel too on success
                                                        }
                                                }}
                                                title="תזמון פעילות"
                                                description={`עבור: ${detailItem?.item.name || ''}`}
                                                trip={trip}
                                                timeline={timeline}
                                        />,
                                        document.body
                                )
                        }
                </>
        );
};
