import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trip, Restaurant, Attraction, DayPlan } from '../types';
import {
        Lightbulb, Utensils, MapPin, Hotel, Car, X, Calendar, Star, ChevronLeft, ChevronRight, Sparkles, AlertTriangle, Clock
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
        onScheduleFavorite: (item: Restaurant | Attraction, dateIso: string, type: 'food' | 'attraction') => void;
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

        // Generate GROUPED recommendations
        const recommendations = useMemo(() => {
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
                        {/* Slim Recommendations Bar */}
                        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border border-amber-200/50 rounded-2xl p-3 mb-6 shadow-sm">
                                <div className="flex items-center gap-3">
                                        {/* Icon & Title */}
                                        <div className="flex items-center gap-2 min-w-fit">
                                                <div className="p-1.5 bg-amber-100 rounded-lg">
                                                        <Lightbulb className="w-4 h-4 text-amber-600" />
                                                </div>
                                                <span className="text-xs font-bold text-amber-800 hidden sm:inline">המלצות</span>
                                        </div>

                                        {/* Scroll Left */}
                                        {canScrollLeft && (
                                                <button
                                                        onClick={() => setScrollIndex(Math.max(0, scrollIndex - 1))}
                                                        className="p-1 hover:bg-amber-100 rounded-full transition-colors"
                                                >
                                                        <ChevronRight className="w-4 h-4 text-amber-600" />
                                                </button>
                                        )}

                                        {/* Recommendation Chips */}
                                        <div className="flex-1 flex gap-2 overflow-hidden">
                                                {visibleRecs.map(rec => (
                                                        <button
                                                                key={rec.id}
                                                                onClick={() => setSelectedRec(rec)}
                                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all hover:scale-105 hover:shadow-md whitespace-nowrap ${rec.bgColor} ${rec.color}`}
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
                                                        className="p-1 hover:bg-amber-100 rounded-full transition-colors"
                                                >
                                                        <ChevronLeft className="w-4 h-4 text-amber-600" />
                                                </button>
                                        )}

                                        {/* Counter */}
                                        <div className="text-[10px] font-bold text-amber-500 bg-amber-100 px-2 py-0.5 rounded-full min-w-fit">
                                                {recommendations.length}
                                        </div>
                                </div>
                        </div>

                        {/* Grouped Popup (Portal) */}
                        {selectedRec && createPortal(
                                <>
                                        {/* Backdrop */}
                                        <div
                                                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
                                                onClick={() => setSelectedRec(null)}
                                        />

                                        {/* Popup */}
                                        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4 z-[9999]">
                                                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
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
                                                        <div className="flex-1 overflow-y-auto p-4">
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
                                                                                                                />
                                                                                                        </div>

                                                                                                        {/* Info */}
                                                                                                        <div className="flex-1 min-w-0">
                                                                                                                <h4 className="text-sm font-bold text-slate-800 truncate" dir="ltr">{item.name}</h4>
                                                                                                                <p className="text-xs text-slate-400 truncate">
                                                                                                                        {isRestaurant ? (item as Restaurant).cuisine : (item as Attraction).type}
                                                                                                                </p>
                                                                                                        </div>

                                                                                                        {/* Quick Add Button */}
                                                                                                        <button
                                                                                                                onClick={() => {
                                                                                                                        if (selectedRec.suggestedDates?.[0]) {
                                                                                                                                onScheduleFavorite(item, selectedRec.suggestedDates[0], itemType);
                                                                                                                        }
                                                                                                                }}
                                                                                                                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                                                                                                title="הוסף ליום הראשון המתאים"
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
                                                                        <div>
                                                                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                                                                        <Calendar className="w-3 h-3" />
                                                                                        תאריכים רלוונטיים
                                                                                </h4>
                                                                                <div className="flex flex-wrap gap-2">
                                                                                        {selectedRec.suggestedDates.slice(0, 8).map(date => (
                                                                                                <span
                                                                                                        key={date}
                                                                                                        className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600"
                                                                                                >
                                                                                                        {formatDateDisplay(date)}
                                                                                                </span>
                                                                                        ))}
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
                                        </div>
                                </>,
                                document.body
                        )}
                </>
        );
};
