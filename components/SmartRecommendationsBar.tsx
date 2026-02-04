import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trip, Restaurant, Attraction, DayPlan } from '../types';
import {
        Lightbulb, Utensils, MapPin, Hotel, Car, X, Calendar, Star, ChevronLeft, ChevronRight, Sparkles, AlertTriangle, Clock, ChevronDown
} from 'lucide-react';
import { getPlaceImage } from '../services/imageMapper';

// Grouped recommendation type
interface GroupedRecommendation {
        id: string;
        type: 'restaurants' | 'attractions' | 'hotel_missing' | 'transfer' | 'data_warning';
        title: string;
        subtitle: string;
        icon: any;
        color: string;
        bgColor: string;
        items?: (Restaurant | Attraction)[];
        suggestedDates?: string[];
        warningDetails?: string[];
}

interface Props {
        trip: Trip;
        favoriteRestaurants: Restaurant[];
        favoriteAttractions: Attraction[];
        timeline: DayPlan[];
        // Expanded types to include Actions
        onScheduleFavorite: (item: Restaurant | Attraction | { name: string, id: string }, dateIso: string, type: 'food' | 'attraction' | 'transfer' | 'hotel_missing') => void;
}

export const SmartRecommendationsBar: React.FC<Props> = ({
        trip,
        favoriteRestaurants,
        favoriteAttractions,
        timeline,
        onScheduleFavorite
}) => {
        const [selectedRec, setSelectedRec] = useState<GroupedRecommendation | null>(null);
        const [scrollIndex, setScrollIndex] = useState(0);
        const [itemToSchedule, setItemToSchedule] = useState<{ item: Restaurant | Attraction | { name: string, id: string }, type: 'food' | 'attraction' | 'transfer' | 'hotel_missing' } | null>(null);

        // Mobile Collapsible State
        const [isCollapsed, setIsCollapsed] = useState(true);

        const recommendations = useMemo(() => {
                // ... (existing logic) ...

                const recs: GroupedRecommendation[] = [];

                // Get cities from timeline for matching
                const citiesByDate = new Map<string, string>();
                timeline.forEach(day => {
                        if (day.locationContext) {
                                citiesByDate.set(day.dateIso, day.locationContext.toLowerCase());
                        }
                });

                // 1. Group unscheduled favorite restaurants
                const unscheduledRestaurants = favoriteRestaurants.filter(r => !r.reservationDate);
                if (unscheduledRestaurants.length > 0) {
                        // Find matching dates for all restaurants
                        const allMatchingDates = new Set<string>();
                        unscheduledRestaurants.forEach(restaurant => {
                                const resLocation = (restaurant.location || restaurant.region || '').toLowerCase();
                                Array.from(citiesByDate.entries()).forEach(([date, city]) => {
                                        if (resLocation.includes(city) || city.includes(resLocation.split(',')[0])) {
                                                allMatchingDates.add(date);
                                        }
                                });
                        });

                        recs.push({
                                id: 'group-restaurants',
                                type: 'restaurants',
                                title: `מסעדות מועדפות`,
                                subtitle: `🍽️ ${unscheduledRestaurants.length} מסעדות ששמרת - לא נקבעו`,
                                icon: Utensils,
                                color: 'text-orange-600',
                                bgColor: 'bg-orange-50 border-orange-200',
                                items: unscheduledRestaurants,
                                suggestedDates: allMatchingDates.size > 0 ? Array.from(allMatchingDates) : timeline.map(d => d.dateIso)
                        });
                }

                // 2. Group unscheduled favorite attractions
                const unscheduledAttractions = favoriteAttractions.filter(a => !a.scheduledDate);
                if (unscheduledAttractions.length > 0) {
                        const allMatchingDates = new Set<string>();
                        unscheduledAttractions.forEach(attraction => {
                                const attrLocation = (attraction.location || attraction.region || '').toLowerCase();
                                Array.from(citiesByDate.entries()).forEach(([date, city]) => {
                                        if (attrLocation.includes(city) || city.includes(attrLocation.split(',')[0])) {
                                                allMatchingDates.add(date);
                                        }
                                });
                        });

                        recs.push({
                                id: 'group-attractions',
                                type: 'attractions',
                                title: `אטרקציות מועדפות`,
                                subtitle: `📍 ${unscheduledAttractions.length} אטרקציות ששמרת - לא נקבעו`,
                                icon: MapPin,
                                color: 'text-emerald-600',
                                bgColor: 'bg-emerald-50 border-emerald-200',
                                items: unscheduledAttractions,
                                suggestedDates: allMatchingDates.size > 0 ? Array.from(allMatchingDates) : timeline.map(d => d.dateIso)
                        });
                }

                // 3. Check for missing hotels on certain dates
                const datesWithHotel = new Set<string>();
                trip.hotels?.forEach(hotel => {
                        const start = new Date(hotel.checkInDate);
                        const end = new Date(hotel.checkOutDate);
                        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                                const current = new Date(start);
                                while (current < end) {
                                        datesWithHotel.add(current.toISOString().split('T')[0]);
                                        current.setDate(current.getDate() + 1);
                                }
                        }
                });

                const datesWithoutHotel = timeline
                        .filter(day => !datesWithHotel.has(day.dateIso))
                        .filter((_, i, arr) => i > 0 && i < arr.length - 1);

                if (datesWithoutHotel.length > 0) {
                        recs.push({
                                id: 'rec-hotel-missing',
                                type: 'hotel_missing',
                                title: `חסר מלון`,
                                subtitle: `🏨 ${datesWithoutHotel.length} לילות ללא מלון רשום`,
                                icon: Hotel,
                                color: 'text-indigo-600',
                                bgColor: 'bg-indigo-50 border-indigo-200',
                                suggestedDates: datesWithoutHotel.map(d => d.dateIso)
                        });
                }

                // 4. Suggest airport transfers on flight days
                const flightDays = trip.flights?.segments?.map(seg => {
                        const date = seg.date || (seg.departureTime && seg.departureTime.split('T')[0]);
                        return date;
                }).filter(Boolean) || [];

                if (flightDays.length > 0) {
                        const hasTransfer = trip.itinerary?.some(day =>
                                day.activities.some(act =>
                                        act.toLowerCase().includes('הסעה') ||
                                        act.toLowerCase().includes('transfer') ||
                                        act.toLowerCase().includes('taxi')
                                )
                        );

                        if (!hasTransfer) {
                                recs.push({
                                        id: 'rec-transfer',
                                        type: 'transfer',
                                        title: 'הסעה לשדה תעופה',
                                        subtitle: `🚗 כדאי לתכנן הסעה ליום טיסה`,
                                        icon: Car,
                                        color: 'text-slate-600',
                                        bgColor: 'bg-slate-50 border-slate-200',
                                        suggestedDates: flightDays as string[]
                                });
                        }
                }

                // 5. DATA WARNINGS - Check for incomplete flight/hotel data
                const dataWarnings: string[] = [];

                // Check flights for missing times
                trip.flights?.segments?.forEach((seg, i) => {
                        if (!seg.departureTime || seg.departureTime === '00:00' || !seg.arrivalTime) {
                                dataWarnings.push(`טיסה ${i + 1}: חסרים זמני המראה/נחיתה`);
                        }
                        if (!seg.date) {
                                dataWarnings.push(`טיסה ${i + 1}: חסר תאריך`);
                        }
                });

                // Check hotels for missing dates
                trip.hotels?.forEach((hotel, i) => {
                        if (!hotel.checkInDate || !hotel.checkOutDate) {
                                dataWarnings.push(`מלון ${hotel.name || i + 1}: חסרים תאריכי צ'ק-אין/אאוט`);
                        }
                });

                if (dataWarnings.length > 0) {
                        recs.unshift({
                                id: 'data-warnings',
                                type: 'data_warning',
                                title: `תקן פרטים חסרים`,
                                subtitle: `⚠️ ${dataWarnings.length} פרטים דורשים תיקון`,
                                icon: AlertTriangle,
                                color: 'text-amber-600',
                                bgColor: 'bg-amber-100 border-amber-300',
                                warningDetails: dataWarnings
                        });
                }

                return recs;
        }, [trip, favoriteRestaurants, favoriteAttractions, timeline]);

        // Don't render if no recommendations
        if (recommendations.length === 0) return null;

        const visibleRecs = recommendations.slice(scrollIndex, scrollIndex + 4);
        const canScrollLeft = scrollIndex > 0;
        const canScrollRight = scrollIndex + 4 < recommendations.length;

        const formatDateDisplay = (isoDate: string) => {
                const date = new Date(isoDate);
                return new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'short' }).format(date);
        };


        const getItemCount = (rec: GroupedRecommendation): string => {
                if (rec.items && rec.items.length > 0) {
                        return `(${rec.items.length})`;
                }
                return '';
        };

        return (
                <>
                        {/* Mobile: Toggle Button (Only visible if >0 recs) */}
                        <div className="md:hidden bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 p-3 flex justify-between items-center cursor-pointer active:bg-amber-100 transition-colors" onClick={() => setIsCollapsed(!isCollapsed)}>
                                <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-amber-100 rounded-lg">
                                                <Lightbulb className="w-4 h-4 text-amber-600" />
                                        </div>
                                        <span className="text-sm font-bold text-amber-800">המלצות לשיפור</span>
                                        <span className="bg-amber-200 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                {recommendations.length}
                                        </span>
                                </div>
                                <div className={`transform transition-transform ${!isCollapsed ? 'rotate-180' : ''}`}>
                                        <ChevronDown className="w-5 h-5 text-amber-500" />
                                </div>
                        </div>

                        {/* Recommendation Bar (Visible on Desktop OR when Expanded on Mobile) */}
                        <div className={`${isCollapsed ? 'hidden md:block' : 'block'} bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border border-amber-200/50 rounded-b-2xl md:rounded-2xl p-3 mb-6 shadow-sm mx-4 md:mx-0 mt-2 md:mt-0 animate-in slide-in-from-top-2`}>
                                <div className="flex items-center gap-3">
                                        {/* Icon & Title - Desktop Only */}
                                        <div className="hidden md:flex items-center gap-2 min-w-fit">
                                                <div className="p-1.5 bg-amber-100 rounded-lg">
                                                        <Lightbulb className="w-4 h-4 text-amber-600" />
                                                </div>
                                                <span className="text-xs font-bold text-amber-800">המלצות</span>
                                        </div>

                                        {/* Scroll Left */}
                                        {canScrollLeft && (
                                                <button
                                                        onClick={() => setScrollIndex(Math.max(0, scrollIndex - 1))}
                                                        className="p-1 hover:bg-amber-100 rounded-full transition-colors hidden md:block" // Hide scroll arrows on mobile, use overflow-x
                                                >
                                                        <ChevronRight className="w-4 h-4 text-amber-600" />
                                                </button>
                                        )}

                                        {/* Recommendation Chips - Scrollable on Mobile */}
                                        <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide pb-1 md:pb-0">
                                                {recommendations.map((rec, i) => ( // Show ALL on mobile scroll, pagination on desktop
                                                        <button
                                                                key={rec.id}
                                                                onClick={() => setSelectedRec(rec)}
                                                                className={`flex items-center gap-1.5 px-3 py-2 md:py-1.5 rounded-xl md:rounded-full border text-xs font-medium transition-all hover:scale-105 hover:shadow-md whitespace-nowrap flex-shrink-0 ${rec.bgColor} ${rec.color} ${i >= scrollIndex && i < scrollIndex + 4 ? 'block' : 'md:hidden' // Only pagination logic on desktop
                                                                        } ${/* Always show all in mobile scroll view */ 'block'}`}
                                                        >
                                                                <rec.icon className="w-3.5 h-3.5" />
                                                                <span className="max-w-[120px] truncate">{rec.title}</span>
                                                                {rec.items && rec.items.length > 0 && (
                                                                        <span className="bg-white/60 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                                                                                {rec.items.length}
                                                                        </span>
                                                                )}
                                                        </button>
                                                ))}
                                        </div>

                                        {/* Scroll Right */}
                                        {canScrollRight && (
                                                <button
                                                        onClick={() => setScrollIndex(Math.min(recommendations.length - 4, scrollIndex + 1))}
                                                        className="p-1 hover:bg-amber-100 rounded-full transition-colors hidden md:block"
                                                >
                                                        <ChevronLeft className="w-4 h-4 text-amber-600" />
                                                </button>
                                        )}

                                        {/* Counter - Desktop Only */}
                                        <div className="hidden md:block text-[10px] font-bold text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full min-w-fit">
                                                {recommendations.length}
                                        </div>
                                </div>
                        </div>

                        {/* Grouped Popup (Portal) */}
                        {selectedRec && createPortal(
                                <>
                                        {/* Backdrop */}
                                        <div
                                                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] transition-opacity animate-in fade-in"
                                                onClick={() => setSelectedRec(null)}
                                        />

                                        {/* Popup - Bottom Sheet on Mobile, Centered on Desktop */}
                                        <div className="fixed bottom-0 md:top-1/2 md:-translate-y-1/2 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-md w-full md:rounded-2xl rounded-t-2xl bg-white shadow-2xl z-[9999] overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-300 max-h-[85vh] flex flex-col">
                                                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-2 md:hidden" /> {/* Handle */}

                                                {/* Header */}
                                                <div className={`p-4 ${selectedRec.bgColor} border-b`}>
                                                        <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                        <div className={`p-2 bg-white/50 rounded-xl`}>
                                                                                <selectedRec.icon className={`w-5 h-5 ${selectedRec.color}`} />
                                                                        </div>
                                                                        <div>
                                                                                <h3 className="text-lg font-black text-slate-800">{selectedRec.title}</h3>
                                                                                <p className="text-xs text-slate-500">{selectedRec.subtitle}</p>
                                                                        </div>
                                                                </div>
                                                                <button
                                                                        onClick={() => setSelectedRec(null)}
                                                                        className="p-2 hover:bg-black/10 rounded-full transition-colors"
                                                                >
                                                                        <X className="w-5 h-5 text-slate-500" />
                                                                </button>
                                                        </div>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 overflow-y-auto p-4 safe-area-bottom">
                                                        {/* Data Warnings List */}
                                                        {selectedRec.type === 'data_warning' && selectedRec.warningDetails && (
                                                                <div className="space-y-2">
                                                                        {selectedRec.warningDetails.map((warning, i) => (
                                                                                <div key={i} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                                                                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                                                        <span className="text-sm text-slate-700">{warning}</span>
                                                                                </div>
                                                                        ))}
                                                                        <p className="text-xs text-slate-400 mt-3 text-center">
                                                                                לחץ על לשונית "טיסות" או "מלונות" לתיקון הפרטים
                                                                        </p>
                                                                </div>
                                                        )}

                                                        {/* Items List (Restaurants/Attractions) */}
                                                        {selectedRec.items && selectedRec.items.length > 0 && (
                                                                <div className="space-y-3">
                                                                        {selectedRec.items.map((item, i) => {
                                                                                const isRestaurant = 'cuisine' in item;
                                                                                const itemType = isRestaurant ? 'food' : 'attraction';

                                                                                return (
                                                                                        <div
                                                                                                key={item.id || i}
                                                                                                className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors group"
                                                                                        >
                                                                                                {/* Image */}
                                                                                                <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200">
                                                                                                        <img
                                                                                                                src={(item as any).imageUrl || getPlaceImage(item.name, itemType, []).url}
                                                                                                                alt=""
                                                                                                                className="w-full h-full object-cover"
                                                                                                                onError={(e) => {
                                                                                                                        const target = e.target as HTMLImageElement;
                                                                                                                        target.onerror = null; // Prevent loop
                                                                                                                        target.src = getPlaceImage(item.name, itemType, []).url;
                                                                                                                }}
                                                                                                        />
                                                                                                </div>

                                                                                                {/* Info */}
                                                                                                <div className="flex-1 min-w-0">
                                                                                                        <h4 className="text-sm font-bold text-slate-800 truncate" dir="ltr">{item.name}</h4>
                                                                                                        <p className="text-xs text-slate-400 truncate">
                                                                                                                {isRestaurant ? (item as Restaurant).cuisine : (item as Attraction).type}
                                                                                                        </p>
                                                                                                </div>

                                                                                                {/* Quick Add Button -> Opens Date Picker */}
                                                                                                <button
                                                                                                        onClick={() => {
                                                                                                                setItemToSchedule({ item, type: itemType });
                                                                                                        }}
                                                                                                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                                                                        title="בחר יום להוספה"
                                                                                                >
                                                                                                        <Calendar className="w-4 h-4" />
                                                                                                </button>
                                                                                        </div>
                                                                                );
                                                                        })}
                                                                </div>
                                                        )}

                                                        {/* Suggested Dates (for hotel/transfer) */}
                                                        {(selectedRec.type === 'hotel_missing' || selectedRec.type === 'transfer') && selectedRec.suggestedDates && (
                                                                <div className="space-y-4">
                                                                        {/* Action Button */}
                                                                        <button
                                                                                onClick={() => {
                                                                                        if (selectedRec.type === 'transfer') {
                                                                                                // Try to find context from the first suggested date
                                                                                                let startName = 'הסעה לשדה תעופה';
                                                                                                if (selectedRec.suggestedDates && selectedRec.suggestedDates.length > 0) {
                                                                                                        const firstDate = selectedRec.suggestedDates[0];
                                                                                                        const relevantSeg = trip.flights?.segments?.find(s => (s.date === firstDate || s.departureTime?.startsWith(firstDate)));
                                                                                                        if (relevantSeg) {
                                                                                                                const from = relevantSeg.fromCity;
                                                                                                                const to = relevantSeg.toCity;
                                                                                                                if (from && to) startName = `הסעה: ${from} > ${to}`;
                                                                                                        }
                                                                                                }
                                                                                                setItemToSchedule({
                                                                                                        item: { id: 'transfer-action', name: startName },
                                                                                                        type: 'transfer'
                                                                                                });
                                                                                        } else if (selectedRec.type === 'hotel_missing') {
                                                                                                let startName = 'תזכורת: להזמין מלון';
                                                                                                if (selectedRec.suggestedDates && selectedRec.suggestedDates.length > 0) {
                                                                                                        const firstDate = selectedRec.suggestedDates[0];
                                                                                                        const dayPlan = timeline.find(d => d.dateIso === firstDate);
                                                                                                        const city = dayPlan?.locationContext || '';
                                                                                                        if (city) startName = `להזמין מלון: ${city}`;
                                                                                                }

                                                                                                setItemToSchedule({
                                                                                                        item: { id: 'hotel-action', name: startName },
                                                                                                        type: 'hotel_missing'
                                                                                                });
                                                                                        }
                                                                                }}
                                                                                className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm hover:shadow-md ${selectedRec.type === 'transfer'
                                                                                        ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                                        : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                                                                                        }`}
                                                                        >
                                                                                {selectedRec.type === 'transfer' ? <Car className="w-5 h-5" /> : <Hotel className="w-5 h-5" />}
                                                                                <span>
                                                                                        {selectedRec.type === 'transfer' ? 'קבע הסעה בלו"ז' : 'הוסף תזכורת ליומן'}
                                                                                </span>
                                                                        </button>

                                                                        <div>
                                                                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                                                                        <Calendar className="w-3 h-3" />
                                                                                        תאריכים רלוונטיים
                                                                                </h4>
                                                                                <div className="flex flex-wrap gap-2">
                                                                                        {selectedRec.suggestedDates.slice(0, 8).map(date => (
                                                                                                <button
                                                                                                        key={date}
                                                                                                        onClick={() => {
                                                                                                                // Direct add to specific date if clicked
                                                                                                                let startName = 'הסעה לשדה תעופה';
                                                                                                                if (selectedRec.type === 'transfer') {
                                                                                                                        const relevantSeg = trip.flights?.segments?.find(s => (s.date === date || s.departureTime?.startsWith(date)));
                                                                                                                        if (relevantSeg) {
                                                                                                                                const from = relevantSeg.fromCity || relevantSeg.origin;
                                                                                                                                const to = relevantSeg.toCity || relevantSeg.destination;
                                                                                                                                if (from && to) startName = `הסעה: ${from} > ${to}`;
                                                                                                                        }
                                                                                                                }

                                                                                                                const dummyItem = selectedRec.type === 'transfer'
                                                                                                                        ? { id: 'transfer-action', name: startName }
                                                                                                                        : { id: 'hotel-action', name: 'תזכורת: להזמין מלון' };

                                                                                                                onScheduleFavorite(dummyItem, date, selectedRec.type as any);
                                                                                                                setSelectedRec(null);
                                                                                                        }}
                                                                                                        className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 border border-transparent rounded-lg text-xs font-bold text-slate-600 transition-all"
                                                                                                >
                                                                                                        {formatDateDisplay(date)}
                                                                                                </button>
                                                                                        ))}
                                                                                </div>
                                                                        </div>
                                                                </div>
                                                        )}
                                                </div>

                                                {/* Footer */}
                                                <div className="p-4 border-t border-slate-100">
                                                        <button
                                                                onClick={() => setSelectedRec(null)}
                                                                className="w-full px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                                                        >
                                                                סגור
                                                        </button>
                                                </div>
                                        </div>
                                </>,
                                document.body
                        )}

                        {/* DATE PICKER POPUP - Shows when user wants to schedule an item */}
                        {itemToSchedule && createPortal(
                                <>
                                        {/* Backdrop */}
                                        <div
                                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[10000] animate-in fade-in"
                                                onClick={() => setItemToSchedule(null)}
                                        />

                                        {/* Date Picker Popup - Bottom Sheet on Mobile */}
                                        <div className="fixed bottom-0 md:top-1/2 md:-translate-y-1/2 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-sm w-full md:rounded-2xl rounded-t-2xl bg-white shadow-2xl z-[10001] overflow-hidden animate-in slide-in-from-bottom md:zoom-in-95 duration-300 max-h-[85vh] flex flex-col">
                                                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-2 md:hidden" /> {/* Handle */}

                                                {/* Header */}
                                                <div className="p-4 bg-blue-50 border-b border-blue-100">
                                                        <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                        <div className="p-2 bg-blue-100 rounded-xl">
                                                                                <Calendar className="w-5 h-5 text-blue-600" />
                                                                        </div>
                                                                        <div>
                                                                                <h3 className="text-base font-black text-slate-800">בחר יום להוספה</h3>
                                                                                <p className="text-xs text-slate-500 truncate max-w-[180px]" dir="ltr">
                                                                                        {itemToSchedule.item.name}
                                                                                </p>
                                                                        </div>
                                                                </div>
                                                                <button
                                                                        onClick={() => setItemToSchedule(null)}
                                                                        className="p-2 hover:bg-blue-100 rounded-full transition-colors"
                                                                >
                                                                        <X className="w-5 h-5 text-slate-400" />
                                                                </button>
                                                        </div>
                                                </div>

                                                {/* Days List */}
                                                <div className="flex-1 overflow-y-auto p-3 space-y-2 safe-area-bottom">
                                                        {timeline.map((day) => (
                                                                <button
                                                                        key={day.dateIso}
                                                                        onClick={() => {
                                                                                onScheduleFavorite(itemToSchedule.item, day.dateIso, itemToSchedule.type);
                                                                                setItemToSchedule(null);
                                                                                setSelectedRec(null); // Also close the parent rec popup if open
                                                                        }}
                                                                        className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl transition-all group text-right"
                                                                >
                                                                        <div className="flex flex-col items-center justify-center w-10 h-10 bg-white rounded-lg shadow-sm group-hover:bg-blue-100 transition-colors border border-slate-100">
                                                                                <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-blue-600">
                                                                                        {new Date(day.dateIso).toLocaleDateString('en-US', { weekday: 'short' })}
                                                                                </span>
                                                                                <span className="text-sm font-black text-slate-700 group-hover:text-blue-700 leading-none">
                                                                                        {day.dateIso.split('-')[2]}
                                                                                </span>
                                                                        </div>
                                                                        <div className="flex-1">
                                                                                <div className="flex items-center justify-between">
                                                                                        <span className="font-bold text-slate-700 group-hover:text-blue-800 transition-colors">יום {day.day}</span>
                                                                                        {/* Show if city matches */}
                                                                                        {trip.hotels?.some(h => {
                                                                                                const checkIn = new Date(h.checkInDate);
                                                                                                const checkOut = new Date(h.checkOutDate);
                                                                                                const current = new Date(day.dateIso);
                                                                                                return current >= checkIn && current < checkOut && h.address.toLowerCase().includes((day.locationContext || '').toLowerCase());
                                                                                        }) && (
                                                                                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">
                                                                                                                {day.locationContext}
                                                                                                        </span>
                                                                                                )}
                                                                                </div>
                                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                                        <span className="text-xs text-slate-400 group-hover:text-blue-400 transition-colors">
                                                                                                {day.events.length} אירועים
                                                                                        </span>
                                                                                </div>
                                                                        </div>
                                                                </button>
                                                        ))}
                                                </div>
                                        </div>
                                </>,
                                document.body
                        )}
                </>
        );
};
