import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trip, Restaurant, Attraction, DayPlan } from '../types';
import {
        Lightbulb, Utensils, MapPin, Hotel, Car, X, Calendar, Star, ChevronLeft, ChevronRight, Sparkles
} from 'lucide-react';
import { getPlaceImage } from '../services/imageMapper';

interface Recommendation {
        id: string;
        type: 'restaurant' | 'attraction' | 'hotel_missing' | 'transfer';
        title: string;
        subtitle: string;
        icon: any;
        color: string;
        bgColor: string;
        data?: any;
        suggestedDates?: string[]; // ISO dates when this could be scheduled
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
        const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
        const [scrollIndex, setScrollIndex] = useState(0);

        // Generate recommendations based on current trip state
        const recommendations = useMemo(() => {
                const recs: Recommendation[] = [];

                // Get cities from timeline for matching
                const citiesByDate = new Map<string, string>();
                timeline.forEach(day => {
                        if (day.locationContext) {
                                citiesByDate.set(day.dateIso, day.locationContext.toLowerCase());
                        }
                });

                // 1. Unscheduled favorite restaurants
                favoriteRestaurants.forEach(restaurant => {
                        if (!restaurant.reservationDate) {
                                // Find matching dates based on city
                                const matchingDates = Array.from(citiesByDate.entries())
                                        .filter(([_, city]) => {
                                                const resLocation = (restaurant.location || restaurant.region || '').toLowerCase();
                                                return resLocation.includes(city) || city.includes(resLocation.split(',')[0]);
                                        })
                                        .map(([date]) => date);

                                recs.push({
                                        id: `rec-rest-${restaurant.id}`,
                                        type: 'restaurant',
                                        title: restaurant.name,
                                        subtitle: `🍽️ ${restaurant.cuisine || 'מסעדה'} במועדפים - לא תוזמנה`,
                                        icon: Utensils,
                                        color: 'text-orange-600',
                                        bgColor: 'bg-orange-50 border-orange-200',
                                        data: restaurant,
                                        suggestedDates: matchingDates.length > 0 ? matchingDates : timeline.map(d => d.dateIso)
                                });
                        }
                });

                // 2. Unscheduled favorite attractions
                favoriteAttractions.forEach(attraction => {
                        if (!attraction.scheduledDate) {
                                const matchingDates = Array.from(citiesByDate.entries())
                                        .filter(([_, city]) => {
                                                const attrLocation = (attraction.location || attraction.region || '').toLowerCase();
                                                return attrLocation.includes(city) || city.includes(attrLocation.split(',')[0]);
                                        })
                                        .map(([date]) => date);

                                recs.push({
                                        id: `rec-attr-${attraction.id}`,
                                        type: 'attraction',
                                        title: attraction.name,
                                        subtitle: `📍 ${attraction.type || 'אטרקציה'} במועדפים - לא תוזמנה`,
                                        icon: MapPin,
                                        color: 'text-emerald-600',
                                        bgColor: 'bg-emerald-50 border-emerald-200',
                                        data: attraction,
                                        suggestedDates: matchingDates.length > 0 ? matchingDates : timeline.map(d => d.dateIso)
                                });
                        }
                });

                // 3. Check for missing hotels on certain dates
                const datesWithHotel = new Set<string>();
                trip.hotels?.forEach(hotel => {
                        // Mark all dates between check-in and check-out
                        const start = new Date(hotel.checkInDate);
                        const end = new Date(hotel.checkOutDate);
                        const current = new Date(start);
                        while (current < end) {
                                datesWithHotel.add(current.toISOString().split('T')[0]);
                                current.setDate(current.getDate() + 1);
                        }
                });

                const datesWithoutHotel = timeline
                        .filter(day => !datesWithHotel.has(day.dateIso))
                        .filter((_, i, arr) => i > 0 && i < arr.length - 1); // Exclude first and last day

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
                        // Check if there's no transfer event on flight days (simplified check)
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

                        {/* Recommendation Detail Popup (Portal) */}
                        {selectedRec && createPortal(
                                <>
                                        {/* Backdrop */}
                                        <div
                                                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
                                                onClick={() => setSelectedRec(null)}
                                        />

                                        {/* Popup */}
                                        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4 z-[9999]">
                                                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                                                        {/* Header Image (if restaurant/attraction) */}
                                                        {(selectedRec.type === 'restaurant' || selectedRec.type === 'attraction') && selectedRec.data && (
                                                                <div className="h-40 bg-slate-100 relative overflow-hidden">
                                                                        <img
                                                                                src={selectedRec.data.imageUrl || getPlaceImage(selectedRec.title, selectedRec.type === 'restaurant' ? 'food' : 'attraction', []).url}
                                                                                alt=""
                                                                                className="w-full h-full object-cover"
                                                                        />
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                                        <button
                                                                                onClick={() => setSelectedRec(null)}
                                                                                className="absolute top-3 left-3 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors"
                                                                        >
                                                                                <X className="w-4 h-4" />
                                                                        </button>
                                                                        <div className="absolute bottom-3 right-3">
                                                                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${selectedRec.bgColor} ${selectedRec.color}`}>
                                                                                        <selectedRec.icon className="w-3 h-3 inline mr-1" />
                                                                                        {selectedRec.type === 'restaurant' ? 'מסעדה' : 'אטרקציה'}
                                                                                </span>
                                                                        </div>
                                                                </div>
                                                        )}

                                                        {/* Content */}
                                                        <div className="p-5">
                                                                {/* Close for non-image items */}
                                                                {(selectedRec.type !== 'restaurant' && selectedRec.type !== 'attraction') && (
                                                                        <button
                                                                                onClick={() => setSelectedRec(null)}
                                                                                className="absolute top-3 left-3 p-2 hover:bg-slate-100 rounded-full transition-colors"
                                                                        >
                                                                                <X className="w-4 h-4 text-slate-400" />
                                                                        </button>
                                                                )}

                                                                <h3 className="text-xl font-black text-slate-800 mb-1" dir="ltr">{selectedRec.title}</h3>
                                                                <p className="text-sm text-slate-500 mb-4">{selectedRec.subtitle}</p>

                                                                {/* Description if available */}
                                                                {selectedRec.data?.description && (
                                                                        <p className="text-sm text-slate-600 mb-4 line-clamp-3">{selectedRec.data.description}</p>
                                                                )}

                                                                {/* Suggested Dates */}
                                                                {selectedRec.suggestedDates && selectedRec.suggestedDates.length > 0 && (
                                                                        <div className="mb-4">
                                                                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                                                                                        <Calendar className="w-3 h-3" />
                                                                                        תאריכים מומלצים
                                                                                </h4>
                                                                                <div className="flex flex-wrap gap-2">
                                                                                        {selectedRec.suggestedDates.slice(0, 6).map(date => (
                                                                                                <button
                                                                                                        key={date}
                                                                                                        onClick={() => {
                                                                                                                if ((selectedRec.type === 'restaurant' || selectedRec.type === 'attraction') && selectedRec.data) {
                                                                                                                        onScheduleFavorite(
                                                                                                                                selectedRec.data,
                                                                                                                                date,
                                                                                                                                selectedRec.type === 'restaurant' ? 'food' : 'attraction'
                                                                                                                        );
                                                                                                                        setSelectedRec(null);
                                                                                                                }
                                                                                                        }}
                                                                                                        className="px-3 py-1.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded-lg text-xs font-bold text-slate-600 transition-colors"
                                                                                                >
                                                                                                        {formatDateDisplay(date)}
                                                                                                </button>
                                                                                        ))}
                                                                                </div>
                                                                        </div>
                                                                )}

                                                                {/* Action Buttons */}
                                                                <div className="flex gap-2 pt-3 border-t border-slate-100">
                                                                        <button
                                                                                onClick={() => setSelectedRec(null)}
                                                                                className="flex-1 px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                                                                        >
                                                                                סגור
                                                                        </button>
                                                                        {(selectedRec.type === 'restaurant' || selectedRec.type === 'attraction') && (
                                                                                <button
                                                                                        onClick={() => {
                                                                                                // Schedule to first suggested date
                                                                                                if (selectedRec.suggestedDates?.[0] && selectedRec.data) {
                                                                                                        onScheduleFavorite(
                                                                                                                selectedRec.data,
                                                                                                                selectedRec.suggestedDates[0],
                                                                                                                selectedRec.type === 'restaurant' ? 'food' : 'attraction'
                                                                                                        );
                                                                                                        setSelectedRec(null);
                                                                                                }
                                                                                        }}
                                                                                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                                                                >
                                                                                        <Sparkles className="w-4 h-4" />
                                                                                        הוסף ללו״ז
                                                                                </button>
                                                                        )}
                                                                </div>
                                                        </div>
                                                </div>
                                        </div>
                                </>,
                                document.body
                        )}
                </>
        );
};
