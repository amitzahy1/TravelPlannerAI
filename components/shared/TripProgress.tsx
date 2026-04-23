import React, { useMemo } from 'react';
import { Trip } from '../../types';
import { Plane, Hotel, Calendar, Compass } from 'lucide-react';
import { ProgressDots, ProgressDot } from './ProgressDots';

interface TripProgressProps {
        trip: Trip;
        compact?: boolean;
        onNavigate?: (tab: string) => void;
}

/**
 * Always-visible trip completeness at a glance: flights, hotels, itinerary
 * (days with activities), and discover (AI-researched food + attractions).
 *
 * state rules:
 *   empty  — 0 entries
 *   partial — any data but not "filled" (itinerary: <50% of days populated,
 *             discover: only one of food/attractions)
 *   full   — comprehensively filled
 */
export const TripProgress: React.FC<TripProgressProps> = ({ trip, compact = true, onNavigate }) => {
        const dots = useMemo<ProgressDot[]>(() => {
                const flightCount = trip.flights?.segments?.length || 0;
                const hotelCount = trip.hotels?.length || 0;
                const itineraryDays = trip.itinerary || [];
                const activeItineraryDays = itineraryDays.filter(d => (d.activities?.length || 0) > 0).length;
                const totalDays = itineraryDays.length;
                const foodCatCount = trip.aiRestaurants?.length || 0;
                const attrCatCount = trip.aiAttractions?.length || 0;

                const itineraryState: ProgressDot['state'] =
                        totalDays === 0 ? 'empty' :
                                activeItineraryDays === 0 ? 'empty' :
                                        activeItineraryDays >= Math.ceil(totalDays * 0.5) ? 'full' : 'partial';

                const discoverState: ProgressDot['state'] =
                        foodCatCount === 0 && attrCatCount === 0 ? 'empty' :
                                (foodCatCount > 0 && attrCatCount > 0) ? 'full' : 'partial';

                const sz = compact ? 'w-3 h-3' : 'w-4 h-4';
                return [
                        {
                                id: 'flights',
                                label: `טיסות (${flightCount})`,
                                state: flightCount > 0 ? 'full' : 'empty',
                                icon: <Plane className={sz} />,
                                onClick: onNavigate ? () => onNavigate('flights') : undefined,
                        },
                        {
                                id: 'hotels',
                                label: `מלונות (${hotelCount})`,
                                state: hotelCount > 0 ? 'full' : 'empty',
                                icon: <Hotel className={sz} />,
                                onClick: onNavigate ? () => onNavigate('hotels') : undefined,
                        },
                        {
                                id: 'itinerary',
                                label: `יום-יום (${activeItineraryDays}/${totalDays})`,
                                state: itineraryState,
                                icon: <Calendar className={sz} />,
                                onClick: onNavigate ? () => onNavigate('itinerary') : undefined,
                        },
                        {
                                id: 'discover',
                                label: `מחקר (אוכל ${foodCatCount > 0 ? '✓' : '–'} · אטרקציות ${attrCatCount > 0 ? '✓' : '–'})`,
                                state: discoverState,
                                icon: <Compass className={sz} />,
                                onClick: onNavigate ? () => onNavigate('restaurants') : undefined,
                        },
                ];
        }, [trip, compact, onNavigate]);

        return <ProgressDots dots={dots} compact={compact} />;
};
