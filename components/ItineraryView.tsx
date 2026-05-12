
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Trip, Restaurant, Attraction, DayPlan, TimelineEvent, TimelineEventType } from '../types';
import { TripCountdown } from './shared';
import { pickTripCover } from '../utils/destinationCover';
import { CoverPickerModal } from './CoverPickerModal';
import { computeRecommendations, countRecommendationActions } from '../utils/tripRecommendations';
import { getDismissedRecs } from '../utils/dismissedRecommendations';
import { PageIntro } from './ui/PageIntro';
import { Calendar as CalendarIntroIcon } from 'lucide-react';
import { exportTripPDF } from '../utils/generateTripHTML';
import { downloadTripIcal } from '../utils/generateTripIcal';
import { FileText as FileTextIcon, CalendarDays as CalendarDaysIcon } from 'lucide-react';
import { resolveLocationName, extractRobustCity, cleanCityName } from '../utils/geoData'; // Imported from new DB
import { getCityTheme, buildCityColorMap, lookupCityTheme } from '../utils/cityColors'; // Color Engine
import {
    MapPin, Calendar, Navigation, Info, ExternalLink,
    Share2, Download, CloudRain, Sun, Moon,
    ChevronDown, ChevronUp, AlertCircle, Clock, Check,
    Plane, Car, Globe, Hotel, Utensils, Ticket, Plus, Sparkles, X,
    ArrowLeft, Edit2, BedDouble, Map as MapIcon, Trash2, DollarSign, User, ChevronLeft, ChevronRight, MoreHorizontal, RefreshCw, CheckCircle2,
    LayoutGrid, List, Lightbulb, Wallet
} from 'lucide-react';
import { getPlaceImage } from '../services/imageMapper';
import { safeMapsUrl } from '../utils/mapsUrl';
// CALENDAR INTEGRATION REMOVED - No longer calling Google Calendar API
// import { fetchCalendarEvents, mapEventsToTimeline, GoogleCalendarEvent } from '../services/calendarService';
// CALENDAR REMOVED: import { requestAccessToken } from '../services/googleAuthService';
import { CategoryListModal } from './CategoryListModal';
import { TripDateSelector } from './TripDateSelector';
import { SmartRecommendationsBar } from './SmartRecommendationsBar';
import { toast } from '../stores/useToastStore';

// --- Types ---
// Removed to types.ts


const parseDateString = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    let d: Date | null = null;
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        // Assume DD/MM/YYYY
        d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
    } else if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts[0].length === 4) {
            // YYYY-MM-DD
            d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
        } else if (parts[2].length === 4) {
            // DD-MM-YYYY
            d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
        }
    } else {
        // Try parsing "08 Aug 2026" or other text formats
        d = new Date(dateStr);
        d.setHours(12, 0, 0, 0);
    }
    return (d && !isNaN(d.getTime())) ? d : null;
};

const formatDateDisplay = (date: Date) => {
    // Google Style: "27 Aug" (Day Month)
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short'
    }).format(date);
};
const getDayOfWeek = (date: Date) => {
    const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
    return days[date.getDay()];
};

/**
 * Compact hero date format. "2026-08-06 - 2026-08-26" → "6/8 – 26/8".
 * Falls through to the raw string if the input doesn't contain two ISO
 * dates so we never lose information when the format is unexpected.
 */
const formatHeroDates = (raw?: string): string => {
    if (!raw) return '';
    const matches = raw.match(/(\d{4}-\d{2}-\d{2})/g);
    if (!matches || matches.length < 2) return raw;
    const [a, b] = matches.slice(0, 2).map(m => new Date(m + 'T12:00:00'));
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return raw;
    const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
    // Sort so the older date comes first (handles "26 - 06" reversal).
    const [first, second] = a.getTime() <= b.getTime() ? [a, b] : [b, a];
    return `${fmt(first)} – ${fmt(second)}`;
};

export const ItineraryView: React.FC<{
    trip: Trip,
    onUpdateTrip: (updatedTrip: Trip) => void,
    onSwitchTab?: (tab: string) => void,
    onRefresh?: () => void
}> = ({ trip, onUpdateTrip, onSwitchTab, onRefresh }) => {

    const [timeline, setTimeline] = useState<DayPlan[]>([]);
    const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);
    const [quickAddModal, setQuickAddModal] = useState<{ isOpen: boolean, targetDate?: string }>({ isOpen: false });
    const [transferModal, setTransferModal] = useState<{ date: string, defaultTime: string } | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [externalEvents, setExternalEvents] = useState<TimelineEvent[]>([]);
    const [viewingCategory, setViewingCategory] = useState<'food' | 'attractions' | 'hotels' | null>(null);
    // Smart-recommendations card is hidden by default and toggled from
    // the new TripContextBar pill below the hero — saves a row that was
    // permanently consumed before.
    const [showRecommendations, setShowRecommendations] = useState(false);
    const [coverPickerOpen, setCoverPickerOpen] = useState(false);
    const [scheduleItem, setScheduleItem] = useState<{ item: any, type: 'food' | 'attraction' } | null>(null); // For the scheduler
    const [viewMode, setViewMode] = useState<'expanded' | 'compact'>('expanded');

    // Scroll the day card matching today's date into view on mount, but only
    // when the trip is actually in progress (start ≤ today ≤ end). Uses an
    // id="day-{iso}" anchor we render on each card. Runs once after the
    // first timeline build.
    const todayScrolledRef = useRef(false);
    useEffect(() => {
        if (todayScrolledRef.current) return;
        if (!timeline.length) return;
        const today = new Date();
        const y = today.getFullYear();
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        const iso = `${y}-${m}-${d}`;
        const inRange = timeline.some(day => day.dateIso === iso);
        if (!inRange) return;
        // Wait a tick for cards to render + layout to stabilize
        const t = setTimeout(() => {
            const el = document.getElementById(`day-${iso}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-emerald-400', 'ring-offset-2');
                setTimeout(() => {
                    el.classList.remove('ring-2', 'ring-emerald-400', 'ring-offset-2');
                }, 2500);
                todayScrolledRef.current = true;
            }
        }, 400);
        return () => clearTimeout(t);
    }, [timeline]);

    // Counter shows ALL saved restaurants/attractions, not just favorites.
    // (User has 27 saved restaurants but ★0 favorites → previous code showed
    // "0 אוכל" which was misleading.) Favorites still sort to the top inside
    // the popover.
    const favoriteRestaurants = useMemo(() => {
        const items: Restaurant[] = [];
        trip.restaurants?.forEach(cat =>
            cat.restaurants.forEach(r => items.push(r))
        );
        return items.sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return (b.googleRating || 0) - (a.googleRating || 0);
        });
    }, [trip.restaurants]);

    const favoriteAttractions = useMemo(() => {
        const items: Attraction[] = [];
        trip.attractions?.forEach(cat =>
            cat.attractions.forEach(a => items.push(a))
        );
        return items.sort((a, b) => {
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            return (b.rating || 0) - (a.rating || 0);
        });
    }, [trip.attractions]);

    // Single source of truth for the "המלצות לשיפור" count + panel.
    // Was previously a dumb sum of AI categories + favorites (showed "20"
    // when only 2 actionable items existed). Now matches the panel.
    const [recsRefresh, setRecsRefresh] = useState(0); // bumped when items dismissed
    const visibleRecommendations = useMemo(() => {
        void recsRefresh;
        const all = computeRecommendations(trip, timeline, favoriteRestaurants, favoriteAttractions);
        const dismissed = new Set(getDismissedRecs(trip.id));
        return all.filter(r => !dismissed.has(r.id));
    }, [trip, timeline, favoriteRestaurants, favoriteAttractions, recsRefresh]);
    const recommendationActionCount = useMemo(
        () => countRecommendationActions(visibleRecommendations),
        [visibleRecommendations],
    );

    // Generate context-aware day title based on events (Task 6)
    // Updated: Use locationContext (city) instead of "מלון"
    // Generate context-aware day title based on events (Task 6)
    // Updated: Use locationContext (city) instead of "מלון"
    const generateDayTitle = (day: DayPlan, trip: Trip, dayIndex: number, totalDays: number): string => {
        const events = day.events;
        let cityContext = day.locationContext || trip.destinationEnglish || (trip.destination || '').split('-')[0].trim();

        // CLEANUP: Aggressively remove zip codes (3+ digits anywhere) from city names
        cityContext = cleanCityName(cityContext);

        // Priority 1: Flight Day - Show flight direction
        const flightEvent = events.find(e => e.type === 'flight');
        if (flightEvent) {
            const isLastDay = dayIndex === totalDays - 1 || dayIndex === totalDays - 2;
            if (isLastDay) {
                return 'טיסה חזרה';
            }
            const destMatch = flightEvent.title?.match(/טיסה ל(.+)/);
            if (destMatch && destMatch[1]) {
                return `טיסה ל${destMatch[1]}`;
            }
            return 'טיסה';
        }

        // Priority 2: Hotel Check-in - Show city name instead of hotel name
        const hotelCheckin = events.find(e => e.type === 'hotel_checkin');
        if (hotelCheckin) {
            // Use city context, NOT "מלון + hotel name"
            return cityContext;
        }

        // Priority 3: Hotel Stay - Show city name
        const hotelStay = events.find(e => e.type === 'hotel_stay');
        if (hotelStay && events.length === 1) {
            // Only hotel stay, show city name
            return cityContext;
        }

        // Priority 4: Empty Day - Show city name
        if (events.length === 0) {
            return cityContext;
        }

        // Priority 5: Check-out followed by activities - Show city
        const hotelCheckout = events.find(e => e.type === 'hotel_checkout');
        if (hotelCheckout && events.length >= 1) {
            return cityContext;
        }

        // Priority 6: Single Event
        if (events.length === 1) {
            const event = events[0];
            if (event.type === 'travel') return 'הסעה';
            if (event.title && event.title.length < 30) {
                return event.title;
            }
        }

        // Priority 7: Multiple Events - Analyze dominant type
        const stats = {
            food: events.filter(e => e.type === 'food').length,
            attractions: events.filter(e => e.type === 'attraction').length,
            activities: events.filter(e => e.type === 'activity').length,
        };

        if (stats.attractions >= 2) {
            return `סיורים ב${cityContext}`;
        }
        if (stats.food >= 2) {
            return `אוכל ב${cityContext}`;
        }
        if (events.length >= 3) {
            return `יום פעילויות ב${cityContext}`;
        }

        // Default: City name
        return cityContext;
    };

    useEffect(() => {
        const generateTimeline = () => {
            let startDate = new Date();
            startDate.setHours(12, 0, 0, 0);
            let endDate = new Date();
            endDate.setDate(startDate.getDate() + 7);
            endDate.setHours(12, 0, 0, 0);

            // Trip dates might be "DD/MM/YYYY - DD/MM/YYYY" OR "08 Aug 2026 - ..." OR ISO
            const dateStr = trip.dates || '';
            let canonicalEnd: Date | null = null; // hard cap from trip.dates
            if (dateStr.includes(' - ')) {
                const rangeParts = dateStr.split(' - ').map(s => s.trim());
                if (rangeParts.length === 2) {
                    const s = parseDateString(rangeParts[0]);
                    const e = parseDateString(rangeParts[1]);
                    if (s && e) {
                        startDate = s;
                        endDate = e;
                        canonicalEnd = e;
                    }
                }
            }

            // Extend startDate/endDate to cover all hotel check-in/out dates.
            // We extend ONLY based on hotels (not flights) to avoid stale data with
            // wrong years polluting the timeline with apparent duplicate dates.
            trip.hotels?.forEach(hotel => {
                const ci = parseDateString(hotel.checkInDate);
                const co = parseDateString(hotel.checkOutDate);
                if (ci && ci < startDate) startDate = new Date(ci);
                if (co && co > endDate) endDate = new Date(co);
            });

            const dayMap = new Map<string, DayPlan>();
            const loopDate = new Date(startDate);

            while (loopDate <= endDate) {
                const isoDate = `${loopDate.getFullYear()}-${(loopDate.getMonth() + 1).toString().padStart(2, '0')}-${loopDate.getDate().toString().padStart(2, '0')}`;
                dayMap.set(isoDate, {
                    dateIso: isoDate,
                    displayDate: formatDateDisplay(loopDate),
                    displayDayOfWeek: getDayOfWeek(loopDate),
                    locationContext: '',
                    events: [],
                    stats: { food: 0, attr: 0, flight: 0, travel: 0, hotel: 0 },
                    hasHotel: false
                });
                loopDate.setDate(loopDate.getDate() + 1);
            }

            const addToDay = (dateStr: string, event: TimelineEvent) => {
                const d = parseDateString(dateStr);
                if (!d) return;
                const isoKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

                if (!dayMap.has(isoKey)) {
                    return;
                }
                dayMap.get(isoKey)?.events.push(event);
            };

            // Determine trip year to filter stale flights (wrong-year segments from past imports)
            const itinTripYearStr = (trip.dates || '').match(/\b(20\d{2})\b/)?.[1];
            const itinTripYear = itinTripYearStr ? parseInt(itinTripYearStr) : null;

            // --- Ingest Trip Structure ---
            trip.flights?.segments?.filter(seg => {
                if (!itinTripYear) return true;
                const y = seg.date?.match(/^(\d{4})/)?.[1] || seg.departureTime?.match(/^(\d{4})/)?.[1];
                return !y || parseInt(y) === itinTripYear;
            }).forEach(seg => {
                // Extract just the HH:MM part for display. Handles both
                // plain "20:10" and ISO "2026-08-06T20:10:00".
                const clockOf = (t?: string): string => {
                    if (!t) return '';
                    if (t.includes('T')) return t.split('T')[1]?.slice(0, 5) || '';
                    const m = t.match(/^(\d{1,2}:\d{2})/);
                    return m ? m[1] : t;
                };
                const depClock = clockOf(seg.departureTime);
                const arrClock = clockOf(seg.arrivalTime);
                // Detect overnight (arrival clock < departure clock, no date override)
                const crossesMidnight = depClock && arrClock && !seg.arrivalTime?.includes('T') && arrClock < depClock;
                const airlineLabel = [seg.airline, seg.flightNumber].filter(Boolean).join(' ');
                const timeLine = depClock && arrClock
                    ? `${depClock} → ${arrClock}${crossesMidnight ? ' (+1)' : ''}`
                    : depClock || arrClock || '';
                const subtitleParts = [airlineLabel, timeLine].filter(Boolean);

                addToDay(seg.date, {
                    id: `flight-dep-${seg.flightNumber}`,
                    type: 'flight',
                    time: seg.departureTime,
                    title: `טיסה ל${seg.toCity || seg.toCode || 'יעד'}`,
                    subtitle: subtitleParts.join(' · '),
                    location: `${seg.fromCode} ➔ ${seg.toCode}`,
                    icon: Plane,
                    colorClass: 'text-blue-600',
                    bgClass: 'bg-blue-50 border-blue-100'
                });
                // Title will be generated dynamically by generateDayTitle
            });

            trip.hotels?.forEach(hotel => {
                const mapsUrl = safeMapsUrl(hotel.googleMapsUrl, hotel.name, hotel.address);

                addToDay(hotel.checkInDate, {
                    id: `hotel-in-${hotel.id}`,
                    type: 'hotel_checkin',
                    time: '14:00',
                    title: `Check-in: ${hotel.name}`,
                    location: hotel.address,
                    icon: Hotel,
                    colorClass: 'text-indigo-600',
                    bgClass: 'bg-indigo-50 border-indigo-100',
                    externalLink: mapsUrl
                });

                addToDay(hotel.checkOutDate, {
                    id: `hotel-out-${hotel.id}`,
                    type: 'hotel_checkout',
                    time: '11:00',
                    title: `Check-out: ${hotel.name}`,
                    icon: Hotel,
                    colorClass: 'text-slate-500',
                    bgClass: 'bg-slate-50 border-slate-100',
                    externalLink: mapsUrl
                });

                const start = parseDateString(hotel.checkInDate);
                const end = parseDateString(hotel.checkOutDate);
                // Use smart city extraction instead of simple first-part split
                const city = extractRobustCity(hotel.address || '', hotel.name, trip);

                if (start && end) {
                    const current = new Date(start);
                    while (current <= end) {
                        const isoKey = `${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}-${current.getDate().toString().padStart(2, '0')}`;
                        const plan = dayMap.get(isoKey);

                        if (plan) {
                            const isCheckOutDay = current.getTime() === end.getTime();
                            if (!isCheckOutDay) {
                                plan.hasHotel = true;
                            }
                            if (!plan.locationContext || plan.locationContext === 'טיסה') {
                                plan.locationContext = city;
                            }
                            const isCheckInDay = current.getTime() === start.getTime();
                            if (!isCheckInDay && !isCheckOutDay) {
                                const stayId = `stay-${hotel.id}-${isoKey}`;
                                if (!plan.events.find(e => e.id === stayId)) {
                                    plan.events.unshift({
                                        id: stayId,
                                        type: 'hotel_stay',
                                        time: '',
                                        title: `לנים ב-${hotel.name}`,
                                        location: hotel.address,
                                        icon: BedDouble,
                                        colorClass: 'text-indigo-500',
                                        bgClass: 'bg-indigo-50/30 border-indigo-100',
                                        externalLink: mapsUrl
                                    });
                                }
                            }
                        }
                        current.setDate(current.getDate() + 1);
                    }
                }
            });

            trip.restaurants?.forEach(cat => cat.restaurants.forEach(res => {
                if (res.reservationDate) {
                    addToDay(res.reservationDate, {
                        id: res.id,
                        type: 'food',
                        time: res.reservationTime || '20:00',
                        title: res.name,
                        subtitle: (res as any).categoryTitle || res.description,
                        location: res.location,
                        icon: Utensils,
                        colorClass: 'text-orange-600',
                        bgClass: 'bg-orange-50 border-orange-100'
                    });
                }
            }));

            trip.attractions?.forEach(cat => cat.attractions.forEach(attr => {
                if (attr.scheduledDate) {
                    addToDay(attr.scheduledDate, {
                        id: attr.id,
                        type: 'attraction',
                        time: attr.scheduledTime || '10:00',
                        title: attr.name,
                        price: attr.price,
                        location: attr.location,
                        icon: Ticket,
                        colorClass: 'text-purple-600',
                        bgClass: 'bg-purple-50 border-purple-100'
                    });
                }
            }));

            trip.itinerary?.forEach(day => {
                day.activities.forEach((act, idx) => {
                    const timeMatch = act.match(/^(\d{1,2}:\d{2})\s*-?\s*(.*)/);
                    const time = timeMatch ? timeMatch[1] : '';
                    const text = timeMatch ? timeMatch[2] : act;
                    let type: TimelineEventType = 'activity';
                    let icon = Sparkles;
                    let color = 'text-emerald-600';
                    let bg = 'bg-emerald-50 border-emerald-100';
                    const textLower = text.toLowerCase();
                    if (textLower.includes('טיסה') || textLower.includes('flight')) { type = 'flight'; icon = Plane; color = 'text-blue-600'; bg = 'bg-blue-50 border-blue-100'; }
                    else if (textLower.includes('נסיעה') || textLower.includes('driver') || textLower.includes('הסעה') || textLower.includes('transfer')) { type = 'travel'; icon = Car; color = 'text-gray-600'; bg = 'bg-gray-50 border-gray-100'; }
                    addToDay(day.date, {
                        id: `manual-${day.id}-${idx}`,
                        type, time, title: text, icon, colorClass: color, bgClass: bg,
                        isManual: true,
                        dayId: day.id,
                        activityIndex: idx
                    });
                });
            });

            externalEvents.forEach(ev => {
                // @ts-ignore
                if (ev.date) addToDay(ev.date, ev);
            });

            // Sort manually to ensure order
            const sortedTimeline = Array.from(dayMap.values()).sort((a, b) => a.dateIso.localeCompare(b.dateIso));

            // Trim trailing empty days — days after the last hotel/flight with no events
            // (prevents blank "Unknown" days from appearing when endDate overshoots due to hotel dates)
            while (sortedTimeline.length > 0 && sortedTimeline[sortedTimeline.length - 1].events.length === 0) {
                sortedTimeline.pop();
            }
            // Also trim leading empty days before any events
            while (sortedTimeline.length > 0 && sortedTimeline[0].events.length === 0) {
                sortedTimeline.shift();
            }
            // Trim trailing days beyond canonical trip end that only have auto-generated hotel events.
            // This handles the case where a hotel has a wrong checkout date far past the trip end.
            if (canonicalEnd) {
                const canonicalEndIso = `${canonicalEnd.getFullYear()}-${(canonicalEnd.getMonth() + 1).toString().padStart(2, '0')}-${canonicalEnd.getDate().toString().padStart(2, '0')}`;
                while (sortedTimeline.length > 0) {
                    const last = sortedTimeline[sortedTimeline.length - 1];
                    if (last.dateIso > canonicalEndIso) {
                        const hasUserContent = last.events.some(e =>
                            e.type !== 'hotel_stay' && e.type !== 'hotel_checkout'
                        );
                        if (!hasUserContent) {
                            sortedTimeline.pop();
                            continue;
                        }
                    }
                    break;
                }
            }

            // Sticky Location Logic variables
            const defaultLocation = trip.destinationEnglish || (trip.destination || '').split('-')[0].trim();
            let currentStickyLocation = defaultLocation;

            // Generate dynamic titles
            sortedTimeline.forEach((day, index) => {
                // 1. Calculate base context from events
                let context = generateDayTitle(day, trip, index, sortedTimeline.length);

                // 2. Update Sticky Location if Flight detected (Forward looking)
                const flightTo = day.events.find(e => e.type === 'flight' && e.title.includes('טיסה ל'));
                if (flightTo) {
                    const match = flightTo.title.match(/טיסה ל(.+)/);
                    if (match) {
                        currentStickyLocation = match[1].trim();
                    }
                }

                // 3. Apply Sticky Location if context is just the default location (meaning no specific event overrode it)
                // This fixes the issue where days after a flight revert to the trip's main destination
                if (context === defaultLocation) {
                    context = currentStickyLocation;
                }

                day.locationContext = context;

                // Sort events by time
                day.events.sort((a, b) => {
                    if (a.type === 'hotel_stay' && !a.time) return -1;
                    if (b.type === 'hotel_stay' && !b.time) return 1;
                    return (a.time || '00:00').localeCompare(b.time || '00:00')
                });

                // Update stats
                day.stats = {
                    food: day.events.filter(e => e.type === 'food').length,
                    attr: day.events.filter(e => e.type === 'attraction').length,
                    flight: day.events.filter(e => e.type === 'flight').length,
                    travel: day.events.filter(e => e.type === 'travel').length,
                    hotel: day.events.filter(e => e.type === 'hotel_checkin' || e.type === 'hotel_stay').length
                };
            });

            setTimeline(sortedTimeline);
        };

        generateTimeline();
    }, [trip, externalEvents]);

    // SMART DATE RECALCULATION: Auto-update trip.dates when flights/hotels change
    // DISABLED: Causing infinite loop when Firestore writes fail (Permission Errors)
    /*
    useEffect(() => {
        const calculateTripDatesFromData = () => {
            const allDates: Date[] = [];

            // Collect dates from flights
            trip.flights?.segments?.forEach(seg => {
                const depDate = parseDateString(seg.departureTime || seg.date || '');
                const arrDate = parseDateString(seg.arrivalTime || seg.date || '');
                if (depDate) allDates.push(depDate);
                if (arrDate) allDates.push(arrDate);
            });

            // Collect dates from hotels
            trip.hotels?.forEach(hotel => {
                const checkIn = parseDateString(hotel.checkInDate);
                const checkOut = parseDateString(hotel.checkOutDate);
                if (checkIn) allDates.push(checkIn);
                if (checkOut) allDates.push(checkOut);
            });

            if (allDates.length < 2) return null;

            // Sort and get min/max
            allDates.sort((a, b) => a.getTime() - b.getTime());
            const minDate = allDates[0];
            const maxDate = allDates[allDates.length - 1];

            // Format as "DD/MM/YYYY - DD/MM/YYYY"
            const formatDate = (d: Date) => {
                const dd = d.getDate().toString().padStart(2, '0');
                const mm = (d.getMonth() + 1).toString().padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${dd}/${mm}/${yyyy}`;
            };

            return `${formatDate(minDate)} - ${formatDate(maxDate)}`;
        };

        const calculatedDates = calculateTripDatesFromData();

        // Only update if we have calculated dates AND they differ from current
        if (calculatedDates && calculatedDates !== trip.dates) {
            console.log('🔄 Smart Date Recalculation:', { current: trip.dates, calculated: calculatedDates });
            onUpdateTrip({ ...trip, dates: calculatedDates });
        }
    }, [trip.flights?.segments, trip.hotels]);
    */

    // CALENDAR SYNC REMOVED - Feature disabled to eliminate "Unverified App" warning
    const handleSyncCalendar = async () => {
        toast.info("סנכרון יומן Google הוסר לצורך אבטחה. כעת הלו\"ז מנוהל ישירות באפליקציה.");
    };

    const handleManualAdd = (text: string) => {
        const targetDateStr = quickAddModal.targetDate; // DD/MM/YYYY
        if (!targetDateStr) return;

        let newItinerary = [...trip.itinerary];
        let dayIndex = newItinerary.findIndex(d => d.date === targetDateStr);
        if (dayIndex === -1) {
            newItinerary.push({ id: `day-${Date.now()}`, day: 0, date: targetDateStr, title: 'יום חדש', activities: [text] });
        } else {
            newItinerary[dayIndex].activities.push(text);
        }
        onUpdateTrip({ ...trip, itinerary: newItinerary });
        setQuickAddModal({ isOpen: false });
    };

    const handleSmartPlanGenerated = (dateIso: string, activities: string[]) => {
        const [y, m, d] = dateIso.split('-');
        const dateFormatted = `${d}/${m}/${y}`;

        let newItinerary = [...trip.itinerary];
        let dayIndex = newItinerary.findIndex(day => day.date === dateFormatted);

        if (dayIndex === -1) {
            newItinerary.push({
                id: `day-${Date.now()}`,
                day: 0,
                date: dateFormatted,
                title: 'יום מתוכנן (AI)',
                activities: activities
            });
        } else {
            newItinerary[dayIndex] = {
                ...newItinerary[dayIndex],
                activities: [...newItinerary[dayIndex].activities, ...activities]
            };
        }
        onUpdateTrip({ ...trip, itinerary: newItinerary });
    };

    const handleDeleteActivity = (dayId: string, index: number) => {
        if (!window.confirm("למחוק פעילות זו?")) return;
        const newItinerary = trip.itinerary.map(day => {
            if (day.id === dayId) {
                return { ...day, activities: day.activities.filter((_, i) => i !== index) };
            }
            return day;
        });
        onUpdateTrip({ ...trip, itinerary: newItinerary });
    };

    const handleSaveTransfer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!transferModal) return;
        const formData = new FormData(e.target as HTMLFormElement);
        const description = formData.get('description') as string;
        const time = formData.get('time') as string;
        const priceStr = formData.get('price') as string;
        const driverName = formData.get('driverName') as string;
        const driverPhone = formData.get('driverPhone') as string;
        const notes = formData.get('notes') as string;

        const detailsParts = [];
        if (driverName) detailsParts.push(`נהג: ${driverName}`);
        if (driverPhone) detailsParts.push(`טל: ${driverPhone}`);
        if (notes) detailsParts.push(notes);

        const detailsStr = detailsParts.length > 0 ? ` - ${detailsParts.join(', ')}` : '';
        const activityText = `${time} ${description}${detailsStr}`;

        let newItinerary = [...trip.itinerary];
        const targetDate = transferModal.date;
        let dayIndex = newItinerary.findIndex(d => d.date === targetDate);
        if (dayIndex === -1) {
            const d = parseDateString(targetDate);
            if (d) {
                const formatted = d.toLocaleDateString('en-GB');
                dayIndex = newItinerary.findIndex(d => d.date === formatted);
                if (dayIndex === -1) {
                    newItinerary.push({ id: `day-${Date.now()}`, day: 0, date: formatted, title: 'יום חדש', activities: [activityText] });
                } else {
                    newItinerary[dayIndex] = { ...newItinerary[dayIndex], activities: [...newItinerary[dayIndex].activities, activityText] };
                }
            } else {
                newItinerary.push({ id: `day-${Date.now()}`, day: 0, date: targetDate, title: 'יום חדש', activities: [activityText] });
            }
        } else {
            newItinerary[dayIndex] = { ...newItinerary[dayIndex], activities: [...newItinerary[dayIndex].activities, activityText] };
        }
        let newExpenses = trip.expenses || [];
        if (priceStr) {
            const amount = parseFloat(priceStr);
            if (!isNaN(amount) && amount > 0) {
                newExpenses = [...newExpenses, { id: `exp-${Date.now()}`, title: description || 'הסעה', amount: amount, category: 'transport' }];
            }
        }
        onUpdateTrip({ ...trip, itinerary: newItinerary, expenses: newExpenses });
        setTransferModal(null);
    };

    const handleChangeCover = () => {
        setCoverPickerOpen(true);
    };

    // Cover focal-point — read-only here. The drag-to-reposition editor lives
    // inside CoverPickerModal; this view just applies the persisted focal so
    // the chosen crop shows in the hero.
    const focal = trip.coverFocal ?? { x: 50, y: 50 };



    const handleScheduleFavorite = (item: Restaurant | Attraction | { name: string, id: string }, dateIso: string, type: 'food' | 'attraction' | 'transfer' | 'hotel_missing') => {
        const [y, m, d] = dateIso.split('-');
        const dateFormatted = `${d}/${m}/${y}`;
        const time = type === 'food' ? '20:00' : '10:00';

        if (type === 'food') {
            // Update the actual restaurant object
            const updatedRestaurants = trip.restaurants?.map(cat => ({
                ...cat,
                restaurants: cat.restaurants.map(r =>
                    r.id === item.id
                        ? { ...r, reservationDate: dateFormatted, reservationTime: time }
                        : r
                )
            }));
            onUpdateTrip({ ...trip, restaurants: updatedRestaurants });
        } else if (type === 'attraction') {
            // Update the actual attraction object
            const updatedAttractions = trip.attractions?.map(cat => ({
                ...cat,
                attractions: cat.attractions.map(a =>
                    a.id === item.id
                        ? { ...a, scheduledDate: dateFormatted, scheduledTime: time }
                        : a
                )
            }));
            onUpdateTrip({ ...trip, attractions: updatedAttractions });
        } else if (type === 'transfer' || type === 'hotel_missing') {
            // Add as manual activity
            const updatedItinerary = trip.itinerary.map(day => {
                if (day.date === dateIso) {
                    return {
                        ...day,
                        activities: [...day.activities, type === 'transfer' ? '10:00 הסעה לשדה תעופה' : '09:00 תזכורת: להזמין מלון']
                    };
                }
                return day;
            });
            onUpdateTrip({ ...trip, itinerary: updatedItinerary });
        }
    };

    // NEW: Unschedule a food/attraction, returning it to recommendations
    const handleUnscheduleItem = (itemId: string, type: 'food' | 'attraction') => {
        if (type === 'food') {
            const updatedRestaurants = trip.restaurants?.map(cat => ({
                ...cat,
                restaurants: cat.restaurants.map(r =>
                    r.id === itemId
                        ? { ...r, reservationDate: undefined, reservationTime: undefined }
                        : r
                )
            }));
            onUpdateTrip({ ...trip, restaurants: updatedRestaurants });
        } else {
            const updatedAttractions = trip.attractions?.map(cat => ({
                ...cat,
                attractions: cat.attractions.map(a =>
                    a.id === itemId
                        ? { ...a, scheduledDate: undefined, scheduledTime: undefined }
                        : a
                )
            }));
            onUpdateTrip({ ...trip, attractions: updatedAttractions });
        }
    };

    const totalStats = useMemo(() => {
        return {
            flights: trip.flights?.segments?.length || 0,
            hotels: trip.hotels?.length || 0,
            restaurants: trip.restaurants?.reduce((acc, cat) => acc + cat.restaurants.length, 0) || 0,
            attractions: trip.attractions?.reduce((acc, cat) => acc + cat.attractions.length, 0) || 0
        };
    }, [trip]);

    const activeDay = useMemo(() => timeline.find(d => d.dateIso === selectedDayIso), [timeline, selectedDayIso]);

    // Trip-aware colour map — guarantees distinct colours for every unique city
    // across the whole itinerary, so Pattaya / Bangkok / Abu Dhabi never collide.
    const cityColorMap = useMemo(() => {
        const cities = timeline.map(d => cleanCityName(d.locationContext || '')).filter(Boolean);
        return buildCityColorMap(cities);
    }, [timeline]);

    // City × nights for the hero — only cities the user actually has a
    // hotel in, sorted by nights descending. Format: "Bangkok (3) · Pattaya (5)".
    const heroCityNights = useMemo<Array<[string, number]>>(() => {
        const map: Record<string, number> = {};
        const isReal = (c: string) => !!c && c.length >= 2 && !/[\d\/\\]/.test(c);
        const extractCity = (h: any): string => {
            if (h.city && isReal(h.city)) return h.city;
            if (h.address) {
                const parts = String(h.address).split(',').map((p: string) => p.trim()).filter(isReal);
                if (parts.length >= 2) return parts[1];
                if (parts.length === 1) return parts[0];
            }
            return '';
        };
        (trip.hotels || []).forEach(h => {
            const city = extractCity(h) || '';
            if (!city) return;
            let n = (h.nights && h.nights > 0) ? h.nights : 0;
            if (!n && h.checkInDate && h.checkOutDate) {
                const ci = new Date(String(h.checkInDate).slice(0, 10) + 'T12:00:00');
                const co = new Date(String(h.checkOutDate).slice(0, 10) + 'T12:00:00');
                if (!isNaN(ci.getTime()) && !isNaN(co.getTime())) {
                    const d = Math.round((co.getTime() - ci.getTime()) / 86400000);
                    if (d > 0) n = d;
                }
            }
            if (n > 0) map[city] = (map[city] || 0) + n;
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [trip.hotels]);

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in pb-24">

            {/* 1. HERO — Mobile (Option B): compact 170-px overlay with
                 countdown top-left, date + cover-edit top-right, title +
                 cities in a single inline scroll-row at the bottom. The
                 focal-point drag editor lives inside CoverPickerModal. */}
            <div className="md:hidden relative h-[170px] mx-1 rounded-[1.75rem] overflow-hidden shadow-xl">
                <img
                    src={pickTripCover(trip.destination, trip.coverImage)}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
                    alt="Trip Cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-slate-900/5"></div>

                {/* Top-left: countdown */}
                <div className="absolute left-3 top-3 z-20">
                    <TripCountdown trip={trip} variant="overlay" />
                </div>

                {/* Top-right: date pill + cover-edit */}
                <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5">
                    <div className="flex items-center gap-1.5 text-white/90 font-bold text-2xs uppercase tracking-wide bg-white/15 backdrop-blur-md px-2 py-1 rounded-full w-fit border border-white/25">
                        <Calendar className="w-3 h-3" />
                        <span dir="ltr">{formatHeroDates(trip.dates)}</span>
                    </div>
                    <button onClick={handleChangeCover} className="w-8 h-8 bg-black/40 backdrop-blur-md rounded-full text-white flex items-center justify-center" aria-label="החלף תמונת נושא">
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Bottom: title + cities single inline row */}
                <div className="absolute right-3 left-3 bottom-3 z-10 text-right" dir="rtl">
                    <h1 className="text-2xl font-black text-white drop-shadow-md leading-tight mb-1.5 truncate">
                        {trip.name}
                    </h1>
                    {heroCityNights.length > 0 ? (
                        <div className="flex items-center gap-1 text-white/95 text-2xs font-bold flex-nowrap overflow-x-auto scrollbar-hide" dir="rtl">
                            <MapPin className="w-3 h-3 text-blue-300 shrink-0" />
                            {heroCityNights.map(([city, nights], i) => (
                                <span key={city} className="shrink-0">
                                    <span dir="ltr">{city}</span>
                                    <span className="text-white/65 ms-1">({nights} {nights === 1 ? 'לילה' : 'לילות'})</span>
                                    {i < heroCityNights.length - 1 && <span className="text-white/40 mx-1">·</span>}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 text-2xs font-bold text-white/90">
                            <MapPin className="w-3 h-3 text-blue-300" /> {trip.destination}
                        </div>
                    )}
                </div>
            </div>

            {/* 1. HERO — Desktop (kept as-is): tall hero with countdown,
                 date + PDF, title + cities, and the interactive stats bar. */}
            <div className="hidden md:block relative h-[180px] md:h-[220px] mx-1 group">
                {/* Background Layer (Clipped) */}
                <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-xl z-0">
                    <img
                        src={pickTripCover(trip.destination, trip.coverImage)}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
                        alt="Trip Cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
                    <button onClick={handleChangeCover} className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20" aria-label="החלף תמונת נושא"><Edit2 className="w-4 h-4" aria-hidden="true" /></button>
                </div>

                {/* Floating countdown — top-left on desktop. */}
                <div className="absolute left-3 top-3 z-20 pointer-events-auto">
                    <TripCountdown trip={trip} variant="overlay" />
                </div>

                {/* Content Layer (Not clipped, allows Popovers) */}
                <div className="absolute inset-0 pointer-events-none z-10 flex flex-row justify-between items-end p-6">
                    {/* Text Info */}
                    <div className="space-y-1 max-w-xl pointer-events-auto">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-white/90 font-bold text-xs uppercase tracking-wide bg-white/15 backdrop-blur-md px-2.5 py-1.5 rounded-full w-fit border border-white/25">
                                <Calendar className="w-3.5 h-3.5" />
                                <span dir="ltr">{formatHeroDates(trip.dates)}</span>
                            </div>
                            <button
                                onClick={() => exportTripPDF(trip)}
                                aria-label="ייצא סיכום טיול"
                                title="ייצא PDF"
                                className="h-9 px-3 bg-white/90 hover:bg-white backdrop-blur-md rounded-full text-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-popover transition-colors"
                            >
                                <FileTextIcon className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>ייצא PDF</span>
                            </button>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-md">
                            {trip.name}
                        </h1>
                        {heroCityNights.length > 0 ? (
                            <div className="flex items-start gap-2 text-base font-medium text-white/95 flex-wrap">
                                <MapPin className="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" />
                                <span className="leading-tight">
                                    {heroCityNights.map(([city, nights], i) => (
                                        <span key={city}>
                                            <span className="font-bold">{city}</span>
                                            <span className="text-white/75 text-xs ms-1">({nights} {nights === 1 ? 'לילה' : 'לילות'})</span>
                                            {i < heroCityNights.length - 1 && <span className="text-white/40 mx-2">·</span>}
                                        </span>
                                    ))}
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-lg font-medium text-white/90">
                                <MapPin className="w-4 h-4 text-blue-400" /> {trip.destination}
                            </div>
                        )}
                    </div>

                    {/* Interactive Hero Stats Bar with Popover */}
                    <div className="relative pointer-events-auto">
                        <div className="flex gap-6 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-3xl">
                            <div className="flex flex-col items-center min-w-[60px]">
                                <Plane className="w-8 h-8 text-blue-400 mb-1" />
                                <span className="text-3xl font-black text-white leading-none">{totalStats.flights}</span>
                                <span className="text-2xs uppercase font-bold text-white/60 tracking-wider mt-1">טיסות</span>
                            </div>
                            <div className="w-px bg-white/20"></div>
                            <button
                                onClick={() => setViewingCategory(viewingCategory === 'hotels' ? null : 'hotels')}
                                className={`flex flex-col items-center min-w-[60px] hover:scale-110 transition-transform cursor-pointer group ${viewingCategory === 'hotels' ? 'scale-110' : ''}`}
                            >
                                <Hotel className={`w-8 h-8 mb-1 transition-colors ${viewingCategory === 'hotels' ? 'text-indigo-300' : 'text-indigo-400 group-hover:text-indigo-300'}`} />
                                <span className="text-3xl font-black text-white leading-none">{totalStats.hotels}</span>
                                <span className="text-2xs uppercase font-bold text-white/60 tracking-wider mt-1 group-hover:text-white">מלונות</span>
                            </button>
                            <div className="w-px bg-white/20"></div>
                            <button
                                onClick={() => setViewingCategory(viewingCategory === 'food' ? null : 'food')}
                                className={`flex flex-col items-center min-w-[60px] hover:scale-110 transition-transform cursor-pointer group ${viewingCategory === 'food' ? 'scale-110' : ''}`}
                            >
                                <Utensils className={`w-8 h-8 mb-1 transition-colors ${viewingCategory === 'food' ? 'text-orange-300' : 'text-orange-400 group-hover:text-orange-300'}`} />
                                <span className="text-3xl font-black text-white leading-none">{favoriteRestaurants.length}</span>
                                <span className="text-2xs uppercase font-bold text-white/60 tracking-wider mt-1 group-hover:text-white">אוכל</span>
                            </button>
                            <div className="w-px bg-white/20"></div>
                            <button
                                onClick={() => setViewingCategory(viewingCategory === 'attractions' ? null : 'attractions')}
                                className={`flex flex-col items-center min-w-[60px] hover:scale-110 transition-transform cursor-pointer group ${viewingCategory === 'attractions' ? 'scale-110' : ''}`}
                            >
                                <MapPin className={`w-8 h-8 mb-1 transition-colors ${viewingCategory === 'attractions' ? 'text-emerald-300' : 'text-emerald-400 group-hover:text-emerald-300'}`} />
                                <span className="text-3xl font-black text-white leading-none">{favoriteAttractions.length}</span>
                                <span className="text-2xs uppercase font-bold text-white/60 tracking-wider mt-1 group-hover:text-white">מקומות</span>
                            </button>
                        </div>

                        {/* Smart Popover (Floating Surface) - PORTAL */}
                        {viewingCategory && createPortal(
                            <>
                                {/* Backdrop for click-outside */}
                                <div className="fixed inset-0 z-[9990]" onClick={() => setViewingCategory(null)} />

                                {/* Popover Content - Centered Top or positioned appropriately */}
                                <div className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-[9999] animate-in slide-in-from-top-4 fade-in duration-200">
                                    <div className="bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl p-3">
                                        {/* Header */}
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                                                {viewingCategory === 'hotels' ? 'מלונות' : viewingCategory === 'food' ? 'הרשימה שלי — מסעדות' : 'הרשימה שלי — אטרקציות'}
                                            </h3>
                                            <div className="bg-slate-100 px-2 py-0.5 rounded text-2xs text-slate-400 font-mono hidden">POPUP MODE</div>
                                            <button onClick={() => setViewingCategory(null)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                                                <X className="w-4 h-4 text-slate-400" />
                                            </button>
                                        </div>

                                        {/* Compact 1-column list — each row is a small horizontal card */}
                                        <div className="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                            {(viewingCategory === 'hotels' ? (trip.hotels || []) :
                                                viewingCategory === 'food' ? favoriteRestaurants :
                                                    favoriteAttractions
                                            ).map((item: any, idx: number) => {
                                                const tags = [item.cuisine || item.type || ''];
                                                const { url } = getPlaceImage(item.name || '', viewingCategory === 'food' ? 'food' : 'attraction', tags);
                                                const rating = item.rating || item.googleRating;
                                                const subtitle = item.address || item.location || '';
                                                const category = item.cuisine || item.type;
                                                const nights = (() => {
                                                    if (viewingCategory !== 'hotels') return null;
                                                    const start = parseDateString(item.checkInDate || '');
                                                    const end = parseDateString(item.checkOutDate || '');
                                                    if (!start || !end) return null;
                                                    const n = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                                                    return n > 0 ? `${n} לילות` : null;
                                                })();
                                                return (
                                                    <button
                                                        key={item.id || idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setViewingCategory(null);
                                                            setScheduleItem({ item, type: viewingCategory === 'food' ? 'food' : 'attraction' });
                                                        }}
                                                        className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-lg p-2 hover:bg-slate-50 hover:border-blue-300 transition-colors text-right group"
                                                    >
                                                        <img
                                                            src={item.imageUrl || item.image || url}
                                                            alt=""
                                                            loading="lazy"
                                                            className="w-11 h-11 rounded-md object-cover bg-slate-100 flex-shrink-0"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-baseline gap-1.5">
                                                                <span className="text-[13px] font-black text-slate-800 truncate" dir="ltr">{item.name}</span>
                                                                {rating && (
                                                                    <span className="text-[10px] font-bold text-slate-600 flex-shrink-0 tabular-nums">
                                                                        {rating}<span className="text-yellow-500 ms-0.5">★</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                                                {category && (
                                                                    <span className="font-semibold truncate">{category}</span>
                                                                )}
                                                                {nights && (
                                                                    <span className="font-bold text-indigo-600 flex-shrink-0">{nights}</span>
                                                                )}
                                                                {subtitle && (category || nights) && <span className="text-slate-300">·</span>}
                                                                {subtitle && (
                                                                    <span className="truncate" dir="ltr">{subtitle}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}

                                            {/* Empty State */}
                                            {((viewingCategory === 'hotels' && (trip.hotels || []).length === 0) ||
                                                (viewingCategory === 'food' && favoriteRestaurants.length === 0) ||
                                                (viewingCategory === 'attractions' && favoriteAttractions.length === 0)) && (
                                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                                                        <div className={`p-4 rounded-full bg-slate-50 ${viewingCategory === 'hotels' ? 'text-indigo-200' : viewingCategory === 'food' ? 'text-orange-200' : 'text-emerald-200'}`}>
                                                            {viewingCategory === 'hotels' ? <Hotel className="w-8 h-8" /> : viewingCategory === 'food' ? <Utensils className="w-8 h-8" /> : <MapIcon className="w-8 h-8" />}
                                                        </div>
                                                        <span className="text-sm font-bold">אין פריטים בקטגוריה זו</span>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>
                            </>,
                            document.body
                        )}
                    </div>
                </div>
            </div>

            <PageIntro
                icon={<CalendarIntroIcon />}
                description="המסלול המלא של הטיול שלך, יום אחר יום. כל מה שתכננתם — טיסות, מלונות, מסעדות ופעילויות — במקום אחד מסודר."
                className="hidden md:flex"
            />

            {/* 2.4 Compact actions — single row. Wallet first (most prominent
                 — primary CTA, always visible on mobile because the desktop
                 header's wallet button is gated to ≥1024px), then the
                 recommendations toggle + the timeline density toggle. */}
            <div className="px-1 flex items-center gap-2">
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('tp:openWallet'))}
                    aria-label="פתח ארנק"
                    className="flex-shrink-0 inline-flex items-center justify-center gap-1.5 bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black px-3 py-2 rounded-pill shadow-md shadow-indigo-200/60 hover:shadow-lg active:scale-95 transition-all"
                >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>ארנק</span>
                </button>
                <button
                    onClick={() => setShowRecommendations(v => !v)}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-black px-3 py-2 rounded-pill hover:bg-amber-100 transition-colors"
                >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                    <span>המלצות לשיפור</span>
                    {recommendationActionCount > 0 && (
                        <span className="bg-amber-200 text-amber-900 text-[10px] font-black px-1.5 rounded-md">
                            {recommendationActionCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setViewMode(viewMode === 'expanded' ? 'compact' : 'expanded')}
                    className="inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold px-3 py-2 rounded-pill hover:border-blue-300 transition-colors"
                    title={viewMode === 'expanded' ? 'תצוגה מצומצמת' : 'תצוגה מורחבת'}
                >
                    {viewMode === 'expanded' ? <LayoutGrid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{viewMode === 'expanded' ? 'מצומצמת' : 'מורחבת'}</span>
                </button>
            </div>

            {/* 2.5 SMART RECOMMENDATIONS BAR — hidden by default; toggled from
                 the TripContextBar pill above. */}
            {showRecommendations && (
                <SmartRecommendationsBar
                    trip={trip}
                    favoriteRestaurants={favoriteRestaurants}
                    favoriteAttractions={favoriteAttractions}
                    timeline={timeline}
                    onScheduleFavorite={handleScheduleFavorite}
                    onSwitchTab={onSwitchTab}
                    onRecommendationsChanged={() => setRecsRefresh(v => v + 1)}
                />
            )}

            {/* 3. MAIN TIMELINE (Repositioned for Density) */}
            <div className="px-1 md:px-1 w-full space-y-6 relative z-10 -mt-2">

                {/* View toggle moved into TripContextBar above to save a row. */}

                {/* Main Column: Timeline (Full width) */}
                <div className="w-full space-y-6">
                    {/* TIMELINE GRID */}
                    {
                        timeline.length === 0 ? (
                            <div className="flex flex-col items-center text-center py-16 px-6 max-w-md mx-auto" dir="rtl">
                                <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                                    <Calendar className="w-10 h-10 text-blue-500" />
                                </div>
                                <h3 className="text-2xl font-black text-brand-navy mb-2">עדיין אין תאריכים לטיול</h3>
                                <p className="text-slate-500 leading-relaxed mb-2">
                                    ברגע שתגדירו תאריכי התחלה וסיום לטיול, הלו"ז ייבנה אוטומטית עם יום לכל תאריך.
                                </p>
                                <p className="text-xs text-slate-400">
                                    ניתן לערוך תאריכים מ"ניהול טיולים" בתפריט העליון.
                                </p>
                            </div>
                        ) : (
                            <div className={viewMode === 'compact' ? 'flex flex-col gap-2 md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-3' : 'grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4'}>
                                {timeline.map((day, index) => {
                                    const [y, m, d] = day.dateIso.split('-');
                                    const dayNumber = index + 1;
                                    const isLastDay = index === timeline.length - 1;
                                    const isFirstDay = index === 0;

                                    // Use dynamic theme engine — trip-aware so distinct cities always
                                    // get distinct colours (see buildCityColorMap above).
                                    const theme = lookupCityTheme(cityColorMap, cleanCityName(day.locationContext));
                                    const headerColorClass = theme.bg;

                                    // COMPACT VIEW — IPO-grade strip-list card (R3)
                                    if (viewMode === 'compact') {
                                        const dayTitle = generateDayTitle(day, trip, index, timeline.length);
                                        const activeHotel = day.events.find(e => e.type === 'hotel_stay' || e.type === 'hotel_checkin');
                                        const hotelName = activeHotel?.title || activeHotel?.subtitle || '';
                                        const hasFlight = day.events.some(e => e.type === 'flight');
                                        const hasHotelChange = day.events.some(e => e.type === 'hotel_checkin' || e.type === 'hotel_checkout');
                                        const monthShort = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'][Number(m) - 1];
                                        const dowShort = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'][new Date(`${y}-${m}-${d}T12:00:00`).getDay()];
                                        const accentStrip = isFirstDay
                                            ? 'bg-gradient-to-b from-blue-500 to-sky-400'
                                            : isLastDay
                                                ? 'bg-gradient-to-b from-amber-500 to-rose-400'
                                                : hasFlight
                                                    ? 'bg-blue-400'
                                                    : headerColorClass;
                                        const topChip = hasFlight
                                            ? { tone: 'primary' as const, icon: <Plane className="w-2.5 h-2.5" />, label: 'יום טיסה' }
                                            : isFirstDay
                                                ? { tone: 'success' as const, icon: null, label: 'התחלה' }
                                                : isLastDay
                                                    ? { tone: 'warning' as const, icon: null, label: 'סיום' }
                                                    : hasHotelChange
                                                        ? { tone: 'neutral' as const, icon: <Hotel className="w-2.5 h-2.5" />, label: 'מעבר מלון' }
                                                        : null;
                                        return (
                                            <article
                                                key={day.dateIso}
                                                id={`day-${day.dateIso}`}
                                                onClick={() => setSelectedDayIso(day.dateIso)}
                                                className="relative group cursor-pointer bg-white border border-slate-200 rounded-xl shadow-card hover:shadow-card-hover hover:border-blue-300 active:scale-[0.99] transition-all flex items-center gap-3 pr-2.5 pl-3 py-2.5 overflow-hidden scroll-mt-24"
                                            >
                                                <span aria-hidden className={`absolute top-0 bottom-0 right-0 w-1 ${accentStrip}`} />

                                                {/* Date badge */}
                                                <div className="shrink-0 min-w-[46px] text-center">
                                                    <div className="text-xl font-black leading-none text-slate-900">{d.replace(/^0/, '')}</div>
                                                    <div className="text-2xs font-bold text-slate-500 mt-0.5">{monthShort}</div>
                                                    <div className="text-2xs text-slate-400 mt-0.5">{dowShort}</div>
                                                </div>

                                                <div className="h-11 w-px bg-slate-100 shrink-0" />

                                                {/* Content */}
                                                <div className="flex-1 min-w-0 flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <h3 className="text-sm font-bold text-slate-900 truncate">
                                                            {dayTitle || day.locationContext || 'יום בטיול'}
                                                        </h3>
                                                        {topChip && (
                                                            <span className={`inline-flex items-center gap-0.5 rounded-pill px-1.5 py-0.5 text-2xs font-bold ring-1 shrink-0 ${
                                                                topChip.tone === 'primary' ? 'bg-blue-50 text-blue-700 ring-blue-100' :
                                                                topChip.tone === 'success' ? 'bg-emerald-50 text-emerald-700 ring-emerald-100' :
                                                                topChip.tone === 'warning' ? 'bg-amber-50 text-amber-800 ring-amber-100' :
                                                                'bg-slate-100 text-slate-700 ring-slate-200'
                                                            }`}>
                                                                {topChip.icon}
                                                                {topChip.label}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {hotelName ? (
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <Hotel className="w-3 h-3 text-indigo-400 shrink-0" />
                                                            <span className="text-xs text-slate-600 truncate font-medium">{hotelName}</span>
                                                        </div>
                                                    ) : day.events.length === 0 ? (
                                                        <div className="text-xs text-slate-400">יום חופשי</div>
                                                    ) : (
                                                        <div className="text-xs text-slate-500 truncate">{day.events.length} פעילויות</div>
                                                    )}
                                                </div>

                                                {/* Event type icons */}
                                                <div className="shrink-0 flex items-center gap-1 text-slate-400">
                                                    {day.stats.flight > 0 && <Plane className="w-3.5 h-3.5 text-blue-500" />}
                                                    {day.stats.hotel > 0 && <Hotel className="w-3.5 h-3.5 text-indigo-500" />}
                                                    {day.stats.food > 0 && <Utensils className="w-3.5 h-3.5 text-orange-500" />}
                                                    {day.stats.attr > 0 && <Ticket className="w-3.5 h-3.5 text-purple-500" />}
                                                </div>

                                                <ChevronLeft className="w-4 h-4 text-slate-300 group-hover:text-blue-400 shrink-0 transition-colors" />

                                                {/* Day counter (subtle, top-left) */}
                                                <span className="absolute top-1.5 left-2 text-2xs text-slate-300 font-bold pointer-events-none">
                                                    {dayNumber}/{timeline.length}
                                                </span>
                                            </article>
                                        );
                                    }

                                    // EXPANDED VIEW — content-sized cards (fixed: was min-h-[260px] with
                                    // huge empty whitespace when days had 1-2 events).
                                    return (
                                        <div
                                            key={day.dateIso}
                                            id={`day-${day.dateIso}`}
                                            onClick={() => setSelectedDayIso(day.dateIso)}
                                            className="bg-white border border-slate-200 rounded-xl shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden group flex flex-col relative"
                                        >
                                            {/* Header — slim band: day-of-week + date + location */}
                                            <div className={`${headerColorClass} relative flex items-center justify-between gap-2 px-3 py-2`}>
                                                <div className="text-white flex items-baseline gap-1.5 min-w-0">
                                                    {(() => {
                                                        const parts = (day.displayDate || '').split(' ');
                                                        const dayNum = parts[1] || parts[0] || '';
                                                        const monthLabel = parts[0] && parts.length > 1 ? parts[0] : '';
                                                        return (
                                                            <>
                                                                <span className="text-lg font-black leading-none">{dayNum}</span>
                                                                {monthLabel && <span className="text-xs font-bold opacity-90 uppercase">{monthLabel}</span>}
                                                                <span className="text-2xs font-semibold opacity-70 mr-1">· {day.displayDayOfWeek}</span>
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                                <h3 className="text-xs font-bold text-white leading-tight truncate max-w-[55%]" title={day.locationContext}>
                                                    {day.locationContext || 'יום בטיול'}
                                                </h3>
                                            </div>

                                            {/* Body — content drives the height */}
                                            <div className="px-3 py-2.5 bg-white">
                                                {day.events.length > 0 ? (
                                                    <div className="space-y-1.5">
                                                        {day.events.slice(0, 4).map((event, idx) => (
                                                            <div key={idx} className="flex items-start gap-2">
                                                                <span className="text-2xs font-mono font-bold text-slate-400 min-w-[34px] pt-0.5 tabular-nums" dir="ltr">{event.time || '—'}</span>
                                                                <div className={`p-1 rounded-pill ${event.bgClass} shrink-0 mt-0.5`}>
                                                                    <event.icon className={`w-3 h-3 ${event.colorClass}`} />
                                                                </div>
                                                                <span className="text-xs font-semibold text-slate-700 leading-snug flex-1 line-clamp-2 break-words">
                                                                    {event.title}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {day.events.length > 4 && (
                                                            <div className="text-2xs font-bold text-slate-400 pt-1 pr-10">
                                                                + עוד {day.events.length - 4} פריטים
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-1.5 py-2 text-slate-400">
                                                        <Moon className="w-3.5 h-3.5" />
                                                        <span className="text-2xs font-bold">יום חופשי</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Flow Arrow (Desktop only, outside the card) */}
                                            {!isLastDay && (
                                                <div className="hidden xl:block absolute -left-5 top-1/2 -translate-y-1/2 z-0 text-slate-200 pointer-events-none">
                                                    <ChevronLeft className="w-6 h-6 stroke-[3]" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    }
                </div>

            </div>



            {/* DAY DETAIL MODAL - PORTAL FIXED POSITIONING */}
            {
                selectedDayIso && activeDay && createPortal(
                    <div
                        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4 content-center"
                        onClick={(e) => { if (e.target === e.currentTarget) setSelectedDayIso(null); }}
                    >
                        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] animate-scale-in" onClick={e => e.stopPropagation()}>
                            {/* Modal Header */}
                            {(() => {
                                const modalTheme = lookupCityTheme(cityColorMap, cleanCityName(activeDay.locationContext));
                                return (
                                    <div className={`${modalTheme.bg} border-b border-white/10 p-5 flex items-center justify-between flex-shrink-0`}>
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white/20 backdrop-blur-sm text-white min-w-[56px] h-12 px-2 rounded-xl flex flex-col items-center justify-center font-bold text-sm border border-white/20 shadow-inner">
                                                {activeDay.displayDate}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white/70 uppercase tracking-wider">{activeDay.displayDayOfWeek}</div>
                                                <h2 className="text-lg font-black text-white">{activeDay.locationContext || 'לו"ז יומי'}</h2>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => { const [y, m, d] = activeDay.dateIso.split('-'); setQuickAddModal({ isOpen: true, targetDate: `${d}/${m}/${y}` }) }} className="p-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors"><Plus className="w-5 h-5" /></button>
                                            <button onClick={() => setSelectedDayIso(null)} className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"><X className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Events List */}
                            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 bg-slate-50/50 scrollbar-hide">
                                {activeDay.events.length > 0 ? (
                                    activeDay.events.map((event, i) => {
                                        const isDeletable = event.isManual || event.type === 'food' || event.type === 'attraction';
                                        return (
                                            <div
                                                key={`${event.id}-${i}`}
                                                className="group bg-white p-3 sm:p-4 rounded-xl border border-slate-100 shadow-card hover:shadow-card-hover transition-all relative flex items-start gap-3"
                                            >
                                                {/* Time column (LTR, tabular) */}
                                                <div className="shrink-0 w-12 pt-0.5 text-center">
                                                    <span className="text-sm font-bold text-slate-700 block font-mono tabular-nums" dir="ltr">
                                                        {event.time || '—'}
                                                    </span>
                                                </div>

                                                {/* Accent line */}
                                                <div className={`absolute right-14 top-3 bottom-3 w-0.5 rounded-pill opacity-30 ${event.bgClass}`} aria-hidden />

                                                {/* Main content */}
                                                <div className="flex-1 min-w-0 flex gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-slate-900 text-sm leading-snug break-words">
                                                            {event.title}
                                                        </h3>
                                                        {event.subtitle && (
                                                            <p className="text-xs text-slate-500 leading-snug mt-1 break-words">{event.subtitle}</p>
                                                        )}
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                            {event.location && (
                                                                <a
                                                                    href={safeMapsUrl(undefined, event.title, event.location)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    className="inline-flex items-center gap-1 text-2xs font-semibold text-slate-500 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 px-2 py-0.5 rounded-pill border border-slate-100 transition-colors"
                                                                >
                                                                    <MapPin className="w-3 h-3" />
                                                                    <span className="truncate max-w-[180px]">{event.location}</span>
                                                                </a>
                                                            )}
                                                            {event.price && (
                                                                <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-pill border border-emerald-100">
                                                                    <DollarSign className="w-3 h-3" />
                                                                    {event.price}
                                                                </span>
                                                            )}
                                                            {event.isExternal && (
                                                                <span className="inline-flex items-center text-2xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-pill ring-1 ring-emerald-100">
                                                                    Google Calendar
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Type icon */}
                                                    <div className={`shrink-0 p-2 rounded-lg ${event.bgClass} ${event.colorClass} h-fit`}>
                                                        <event.icon className="w-4 h-4" />
                                                    </div>
                                                </div>

                                                {isDeletable && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (event.isManual) {
                                                                handleDeleteActivity(event.dayId!, event.activityIndex!);
                                                            } else if (event.type === 'food' || event.type === 'attraction') {
                                                                handleUnscheduleItem(event.id, event.type);
                                                            }
                                                        }}
                                                        className="absolute bottom-1.5 left-1.5 w-7 h-7 rounded-md text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors flex items-center justify-center md:opacity-0 md:group-hover:opacity-100"
                                                        title={event.isManual ? 'מחק מהלוז' : 'הסר מהלוז (יחזור להמלצות)'}
                                                        aria-label="מחק אירוע"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-8 px-4">
                                        <div className="w-14 h-14 bg-slate-100 rounded-pill flex items-center justify-center mx-auto mb-3">
                                            <Calendar className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-600">יום חופשי</p>
                                        <p className="text-xs text-slate-400 mt-1 mb-4">הוסף פעילויות או תן ל-AI להציע</p>
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                const city = activeDay.locationContext || trip.destination || '';
                                                if (!city) return;
                                                const btn = document.activeElement as HTMLButtonElement | null;
                                                if (btn) { btn.disabled = true; btn.textContent = 'חושב על תכנית…'; }
                                                try {
                                                    const prompt = `Suggest 3 realistic activities for a traveller spending a free day in "${city}". Mix 1 cultural / 1 food / 1 relaxing. For each: time (HH:MM), name (Hebrew), short reason (≤ 40 chars, Hebrew). Output ONLY JSON: {"activities":[{"time":"10:00","name":"","reason":""}]}`;
                                                    const { generateWithFallback } = await import('../services/aiService');
                                                    const res = await generateWithFallback(
                                                        null,
                                                        [{ role: 'user', parts: [{ text: prompt }] }],
                                                        { responseMimeType: 'application/json', temperature: 0.4 },
                                                        'FAST'
                                                    );
                                                    const data = JSON.parse(res.text || '{}');
                                                    const list = Array.isArray(data.activities) ? data.activities : [];
                                                    if (list.length === 0) {
                                                        toast.error('ה-AI לא הציע פעילויות. נסי שוב.');
                                                        return;
                                                    }
                                                    const activities = list.map((a: any) => `${a.time || ''} ${a.name || ''}${a.reason ? ' — ' + a.reason : ''}`.trim());
                                                    // Append to the day's itinerary
                                                    const itinerary = [...(trip.itinerary || [])];
                                                    const idx = itinerary.findIndex(d => d.date === activeDay.dateIso || d.date === activeDay.dateIso.split('-').reverse().join('/'));
                                                    if (idx >= 0) {
                                                        itinerary[idx] = { ...itinerary[idx], activities: [...(itinerary[idx].activities || []), ...activities] };
                                                    } else {
                                                        itinerary.push({ id: crypto.randomUUID(), day: 0, date: activeDay.dateIso, title: city, activities });
                                                    }
                                                    onUpdateTrip({ ...trip, itinerary });
                                                    toast.success(`✨ נוספו ${activities.length} פעילויות ליום`);
                                                } catch (err) {
                                                    console.error('Plan-day failed', err);
                                                    toast.error('לא הצלחנו לייצר תכנית. נסי שוב.');
                                                } finally {
                                                    if (btn) { btn.disabled = false; btn.innerHTML = '✨ תכננו לי את היום'; }
                                                }
                                            }}
                                            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold px-5 py-2.5 rounded-pill shadow-card-hover hover:shadow-popover active:scale-95 transition-all"
                                        >
                                            <Sparkles className="w-4 h-4" aria-hidden="true" />
                                            תכננו לי את היום
                                        </button>
                                    </div>
                                )}

                                <button
                                    onClick={() => { const [y, m, d] = activeDay.dateIso.split('-'); setQuickAddModal({ isOpen: true, targetDate: `${d}/${m}/${y}` }) }}
                                    className="w-full py-3 mt-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" /> הוספה מהירה
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Quick Add Modal - PORTAL */}
            {
                quickAddModal.isOpen && createPortal(
                    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setQuickAddModal({ isOpen: false })}>
                        <div className="bg-white rounded-3xl w-[95%] max-w-xl p-6 shadow-2xl animate-scale-in relative z-50" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800">הוספה ללו"ז</h3>
                                    <p className="text-sm text-slate-500 font-bold mt-1">תאריך: {quickAddModal.targetDate}</p>
                                </div>
                                <button onClick={() => setQuickAddModal({ isOpen: false })} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                            </div>

                            <div className="flex gap-3 mb-6">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs text-slate-400 font-bold mr-1">התחלה</span>
                                    <input
                                        type="time"
                                        id="quick-time"
                                        dir="ltr"
                                        defaultValue="10:00"
                                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-800 w-36 text-center shadow-sm"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs text-slate-400 font-bold mr-1">סיום (אופציונלי)</span>
                                    <input
                                        type="time"
                                        id="quick-end-time"
                                        dir="ltr"
                                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-sm text-slate-800 w-36 text-center placeholder:text-slate-300 shadow-sm"
                                    />
                                </div>
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <span className="text-xs text-slate-400 font-bold mr-1">תוכן</span>
                                    <input
                                        autoFocus
                                        id="quick-text"
                                        placeholder="מה בתוכנית?"
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-base text-slate-800 placeholder:text-slate-300 shadow-sm transition-all"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const time = (document.getElementById('quick-time') as HTMLInputElement).value;
                                                const endTime = (document.getElementById('quick-end-time') as HTMLInputElement).value;
                                                const timeStr = endTime ? `${time}-${endTime}` : time;
                                                handleManualAdd(`${timeStr} ${e.currentTarget.value}`);
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    const textInput = document.getElementById('quick-text') as HTMLInputElement;
                                    if (textInput && textInput.value) {
                                        const time = (document.getElementById('quick-time') as HTMLInputElement).value;
                                        const endTime = (document.getElementById('quick-end-time') as HTMLInputElement).value;
                                        const timeStr = endTime ? `${time}-${endTime}` : time;
                                        handleManualAdd(`${timeStr} ${textInput.value}`);
                                    }
                                }}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-base shadow-lg hover:shadow-xl transition-all mb-6 flex items-center justify-center gap-2 transform active:scale-95"
                            >
                                <CheckCircle2 className="w-5 h-5" /> שמור וסגור
                            </button>

                            <div className="flex flex-wrap gap-3 relative z-10">
                                {['✈️ טיסה', '🏨 מלון', '🍽️ אוכל', '🎟️ אטרקציה', '🚗 נסיעה'].map(suggestion => (
                                    <button
                                        key={suggestion}
                                        onClick={() => {
                                            const time = (document.getElementById('quick-time') as HTMLInputElement).value;
                                            const endTime = (document.getElementById('quick-end-time') as HTMLInputElement).value;
                                            const timeStr = endTime ? `${time}-${endTime}` : time;
                                            handleManualAdd(`${timeStr} ${suggestion} ב...`);
                                        }}
                                        className="px-4 py-2.5 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl text-sm font-bold text-slate-600 whitespace-nowrap transition-all shadow-sm hover:shadow-md flex-grow text-center"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Transfer Modal */}
            {
                transferModal && (
                    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setTransferModal(null)}>
                        <form onSubmit={handleSaveTransfer} className="bg-white rounded-[2rem] p-6 w-full max-w-[320px] shadow-2xl relative" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-slate-800">פרטי הסעה</h3>
                                <button type="button" onClick={() => setTransferModal(null)} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-4">
                                <input name="description" defaultValue="הסעה לשדה" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                                <div className="grid grid-cols-2 gap-4">
                                    <input name="time" type="time" defaultValue={transferModal.defaultTime} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                                    <input name="price" type="number" step="any" inputMode="decimal" placeholder="מחיר" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input name="driverName" placeholder="שם הנהג" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
                                    <input name="driverPhone" placeholder="טלפון" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
                                </div>
                                <textarea name="notes" placeholder="הערות..." rows={3} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
                                <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold">שמור</button>
                            </div>
                        </form>
                    </div >
                )
            }


            {/* Note: CategoryListModal replaced by inline Smart Popover in Hero Stats section */}

            {/* Schedule Item Modal (from CategoryListModal selection) */}
            {
                scheduleItem && (
                    <TripDateSelector
                        isOpen={true}
                        trip={trip}
                        timeline={timeline}
                        title="תזמון פעילות"
                        description={`עבור: ${scheduleItem.item?.name || 'פריט'}`}
                        onClose={() => setScheduleItem(null)}
                        onSelect={(dateIso: string) => {
                            // Convert dateIso (YYYY-MM-DD) to DD/MM/YYYY for itinerary
                            const [y, m, d] = dateIso.split('-');
                            const targetDateStr = `${d}/${m}/${y}`;

                            // Add to trip.itinerary (this is what the timeline renders from)
                            let newItinerary = [...trip.itinerary];
                            let dayIndex = newItinerary.findIndex(day => day.date === targetDateStr);

                            const activityText = `12:00 ${scheduleItem.type === 'food' ? '🍽️' : '🎟️'} ${scheduleItem.item?.name || 'פריט'}`;

                            if (dayIndex === -1) {
                                // Create new day entry
                                newItinerary.push({
                                    id: `day-${Date.now()}`,
                                    day: 0,
                                    date: targetDateStr,
                                    title: 'יום חדש',
                                    activities: [activityText]
                                });
                            } else {
                                // Add to existing day
                                newItinerary[dayIndex] = {
                                    ...newItinerary[dayIndex],
                                    activities: [...newItinerary[dayIndex].activities, activityText]
                                };
                            }

                            onUpdateTrip({ ...trip, itinerary: newItinerary });
                            setScheduleItem(null);

                            // Show confirmation
                            toast.success(`"${scheduleItem.item?.name}" נוסף ליום ${d}/${m}`);
                        }}
                    />
                )
            }

            <CoverPickerModal
                isOpen={coverPickerOpen}
                onClose={() => setCoverPickerOpen(false)}
                destination={trip.destination || ''}
                currentCover={trip.coverImage}
                currentFocal={trip.coverFocal}
                onPick={(url, focal) => onUpdateTrip({ ...trip, coverImage: url, coverFocal: focal })}
            />

        </div >
    );
};
