import React, { useMemo, useState } from 'react';
import { Trip } from '../../types';
import { MapPin, Hotel as HotelIcon, Lightbulb } from 'lucide-react';

interface TripContextBarProps {
        trip: Trip;
        recommendationCount?: number;
        onOpenRecommendations?: () => void;
}

const normDate = (d?: string): string => {
        if (!d) return '';
        const m = d.match(/(\d{4})-(\d{2})-(\d{2})/);
        return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
};

const isRealCity = (c: string): boolean => {
        if (!c || c.length < 2 || c.length > 40) return false;
        if (/\d/.test(c)) return false;
        if (/[\/\\]/.test(c)) return false;
        if (/^(road|street|sai|moo|apt|floor|building|avenue|lane|blvd|drive|way|place|plaza|square)/i.test(c.trim())) return false;
        return true;
};

const extractCity = (hotel: Trip['hotels'][number]): string => {
        if (hotel.city && isRealCity(hotel.city)) return hotel.city;
        if (hotel.address) {
                const parts = hotel.address.split(',').map(p => p.trim()).filter(isRealCity);
                if (parts.length >= 2) return parts[1];
                if (parts.length === 1) return parts[0];
        }
        return '';
};

/**
 * Compact horizontal bar that sits directly under the hero on the home
 * (Itinerary) view. Shows the trip's cities with their nights count —
 * computed only from hotels, so airport-only stops don't pollute the
 * row — and a small recommendations button at the end. Replaces the
 * full-width "המלצות לשיפור" card (the user wanted that as a tiny pill,
 * not a row-eating section).
 */
export const TripContextBar: React.FC<TripContextBarProps> = ({ trip, recommendationCount = 0, onOpenRecommendations }) => {
        const cityNights = useMemo(() => {
                const map: Record<string, number> = {};
                (trip.hotels || []).forEach(h => {
                        const city = extractCity(h) || 'אחר';
                        // Prefer explicit nights, else compute from check-in/out.
                        let n = h.nights && h.nights > 0 ? h.nights : 0;
                        if (!n && h.checkInDate && h.checkOutDate) {
                                const ci = new Date(normDate(h.checkInDate) + 'T12:00:00');
                                const co = new Date(normDate(h.checkOutDate) + 'T12:00:00');
                                if (!isNaN(ci.getTime()) && !isNaN(co.getTime())) {
                                        const d = Math.round((co.getTime() - ci.getTime()) / 86400000);
                                        if (d > 0) n = d;
                                }
                        }
                        if (n > 0) map[city] = (map[city] || 0) + n;
                });
                return Object.entries(map)
                        .filter(([k]) => k !== 'אחר' || Object.keys(map).length === 1)
                        .sort((a, b) => b[1] - a[1]);
        }, [trip.hotels]);

        const total = cityNights.reduce((s, [, n]) => s + n, 0);

        if (cityNights.length === 0 && recommendationCount === 0) return null;

        return (
                <div className="flex items-center gap-1.5 sm:gap-2 px-1 -mx-1 overflow-x-auto pb-1" dir="rtl">
                        {cityNights.length > 0 && (
                                <span className="shrink-0 inline-flex items-center gap-1.5 bg-slate-900 text-white text-2xs font-black px-2.5 py-1.5 rounded-pill whitespace-nowrap">
                                        <HotelIcon className="w-3 h-3" />
                                        {total} {total === 1 ? 'לילה' : 'לילות'}
                                </span>
                        )}
                        {cityNights.map(([city, nights]) => (
                                <span
                                        key={city}
                                        className="shrink-0 inline-flex items-center gap-1.5 bg-white text-slate-700 text-2xs font-bold px-2.5 py-1.5 rounded-pill border border-slate-200 whitespace-nowrap shadow-card"
                                >
                                        <MapPin className="w-3 h-3 text-slate-400" />
                                        <span className="font-bold">{city}</span>
                                        <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                                                {nights}
                                        </span>
                                </span>
                        ))}
                        {recommendationCount > 0 && onOpenRecommendations && (
                                <button
                                        onClick={onOpenRecommendations}
                                        className="shrink-0 inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-2xs font-black px-2.5 py-1.5 rounded-pill whitespace-nowrap hover:bg-amber-100 transition-colors me-auto"
                                >
                                        <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                                        <span>{recommendationCount} המלצות</span>
                                </button>
                        )}
                </div>
        );
};
