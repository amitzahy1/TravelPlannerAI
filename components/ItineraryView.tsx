
import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Trip, Restaurant, Attraction, DayPlan, TimelineEvent, TimelineEventType } from '../types';
import { resolveLocationName } from '../utils/geoData'; // Imported from new DB
import { getCityTheme } from '../utils/cityColors'; // Color Engine
import {
    MapPin, Calendar, Navigation, Info, ExternalLink,
    Share2, Download, CloudRain, Sun, Moon,
    ChevronDown, ChevronUp, AlertCircle, Clock, Check,
    Plane, Car, Globe, Hotel, Utensils, Ticket, Plus, Sparkles, X,
    ArrowLeft, Edit2, BedDouble, Map as MapIcon, Trash2, DollarSign, User, ChevronLeft, ChevronRight, MoreHorizontal, RefreshCw, CheckCircle2,
    LayoutGrid, List
} from 'lucide-react';
import { getPlaceImage } from '../services/imageMapper';
// CALENDAR INTEGRATION REMOVED - No longer calling Google Calendar API
// import { fetchCalendarEvents, mapEventsToTimeline, GoogleCalendarEvent } from '../services/calendarService';
// CALENDAR REMOVED: import { requestAccessToken } from '../services/googleAuthService';
import { CategoryListModal } from './CategoryListModal';
import { TripDateSelector } from './TripDateSelector';
import { SmartRecommendationsBar } from './SmartRecommendationsBar';

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
    const [scheduleItem, setScheduleItem] = useState<{ item: any, type: 'food' | 'attraction' } | null>(null); // For the scheduler
    const [viewMode, setViewMode] = useState<'expanded' | 'compact'>(() =>
        typeof window !== 'undefined' && window.innerWidth < 768 ? 'compact' : 'expanded'
    ); // Mobile defaults to compact

    // Calculate favorite counts (Task 7)
    const favoriteRestaurants = useMemo(() => {
        const items: Restaurant[] = [];
        trip.restaurants?.forEach(cat =>
            cat.restaurants.forEach(r => {
                if (r.isFavorite) items.push(r);
            })
        );
        return items;
    }, [trip.restaurants]);

    const favoriteAttractions = useMemo(() => {
        const items: Attraction[] = [];
        trip.attractions?.forEach(cat =>
            cat.attractions.forEach(a => {
                if (a.isFavorite) items.push(a);
            })
        );
        return items;
    }, [trip.attractions]);

    // Generate context-aware day title based on events (Task 6)
    // Updated: Use locationContext (city) instead of "מלון"
    const generateDayTitle = (day: DayPlan, trip: Trip, dayIndex: number, totalDays: number): string => {
        const events = day.events;
        const cityContext = day.locationContext || trip.destinationEnglish || trip.destination.split('-')[0].trim();

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

    // SMART City Extraction - finds actual city from hotel address
    // Prioritizes: known cities from trip/flights > last address segments > hotel name
    const extractRobustCity = (address: string, hotelName: string, trip: Trip): string => {
        if (!address && !hotelName) return trip.destination.split('-')[0].trim();

        // Build known cities database from trip data
        const knownCities = new Set<string>();

        // From trip destination (e.g., "Georgia - Tbilisi & Batumi")
        trip.destination.split(/[-&,]/).forEach(part => {
            const city = part.trim().toLowerCase();
            if (city && city.length > 2 && !['and', 'the'].includes(city)) {
                knownCities.add(city);
            }
        });

        // From English destination if exists
        if (trip.destinationEnglish) {
            trip.destinationEnglish.split(/[-&,]/).forEach(part => {
                const city = part.trim().toLowerCase();
                if (city && city.length > 2) knownCities.add(city);
            });
        }

        // From flight segments (only fromCity and toCity exist on FlightSegment)
        trip.flights?.segments?.forEach(seg => {
            if (seg.toCity) knownCities.add(seg.toCity.toLowerCase());
            if (seg.fromCity) knownCities.add(seg.fromCity.toLowerCase());
        });

        // 1. Try to resolve using robust Geo Database
        const resolvedCity = resolveLocationName(address);
        if (resolvedCity) return resolvedCity;

        // 2. Legacy Fallback (capital map and manual parsing) - kept just in case
        const addressParts = address ? address.split(',').map(p => p.trim()).filter(Boolean) : [];
        const capitalMap: Record<string, string> = {
            'georgia': 'Tbilisi', 'philippines': 'Manila', 'thailand': 'Bangkok',
            'vietnam': 'Hanoi', 'indonesia': 'Jakarta', 'japan': 'Tokyo',
            'south korea': 'Seoul', 'israel': 'Tel Aviv', 'greece': 'Athens'
        };

        // Try to match against known cities in address
        for (const part of addressParts) {
            const partLower = part.toLowerCase();
            for (const known of knownCities) {
                if (partLower.includes(known) || known.includes(partLower)) {
                    // Return properly capitalized version
                    return part.charAt(0).toUpperCase() + part.slice(1);
                }
            }
        }

        // Look for city after street number pattern (e.g., "Freedom Square 4, Tbilisi")
        // Cities usually come after street addresses
        if (addressParts.length >= 2) {
            // Skip first part if it looks like a street address (has numbers)
            for (let i = 1; i < addressParts.length; i++) {
                const part = addressParts[i];
                const partLower = part.toLowerCase();

                // Skip if it's a country or postal code
                if (/^\d+$/.test(part)) continue; // Pure number = postal code
                const countries = ['georgia', 'philippines', 'thailand', 'vietnam', 'indonesia', 'japan', 'israel', 'greece', 'usa', 'uk'];
                if (countries.some(c => partLower.includes(c))) continue;

                // This is likely the city
                return part.charAt(0).toUpperCase() + part.slice(1);
            }
        }

        // Result Candidate
        let candidate = trip.destination.split('-')[0].trim();

        // Fallback: check if hotel name contains a known city
        const hotelLower = hotelName.toLowerCase();
        for (const [country, capital] of Object.entries(capitalMap)) {
            if (hotelLower.includes(country) || address.toLowerCase().includes(country)) {
                candidate = capital;
                break;
            }
        }

        return candidate.replace(/\d+/g, '') // Remove numbers
            .replace(/Street|St\.|Ave\.|Road|Block|Unit|Apartment|Apt\.?/gi, '') // Remove common street words
            .replace(/[,\.]/g, '') // Remove punctuation
            .trim();
    };

    useEffect(() => {
        const generateTimeline = () => {
            let startDate = new Date();
            startDate.setHours(12, 0, 0, 0);
            let endDate = new Date();
            endDate.setDate(startDate.getDate() + 7);
            endDate.setHours(12, 0, 0, 0);

            if (trip.dates) {
                // Trip dates might be "DD/MM/YYYY - DD/MM/YYYY" OR "08 Aug 2026 - ..." OR ISO
                const rangeParts = trip.dates.split(' - ').map(s => s.trim());
                if (rangeParts.length === 2) {
                    const s = parseDateString(rangeParts[0]);
                    const e = parseDateString(rangeParts[1]);
                    if (s && e) {
                        startDate = s;
                        endDate = e;
                    }
                }
            }

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

            // --- Ingest Trip Structure ---
            trip.flights?.segments?.forEach(seg => {
                addToDay(seg.date, {
                    id: `flight-dep-${seg.flightNumber}`,
                    type: 'flight',
                    time: seg.departureTime,
                    title: `טיסה ל${seg.toCity || seg.toCode || 'יעד'}`,
                    subtitle: `המראה: ${seg.airline} ${seg.flightNumber}`,
                    location: `${seg.fromCode} ➔ ${seg.toCode}`,
                    icon: Plane,
                    colorClass: 'text-blue-600',
                    bgClass: 'bg-blue-50 border-blue-100'
                });
                // Title will be generated dynamically by generateDayTitle
            });

            trip.hotels?.forEach(hotel => {
                const mapsUrl = hotel.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name + " " + hotel.address)}`;

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

            // Sticky Location Logic variables
            const defaultLocation = trip.destinationEnglish || trip.destination.split('-')[0].trim();
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
        alert("סנכרון יומן Google הוסר לצורך אבטחה. כעת הלו\"ז מנוהל ישירות באפליקציה.");
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
        const notes = formData.get('notes') as string;
        const activityText = `${time} ${description} ${notes ? `- ${notes}` : ''}`;

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
        const url = prompt("הכנס קישור לתמונה חדשה:");
        if (url) onUpdateTrip({ ...trip, coverImage: url });
    };



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

    return (
        <div className="space-y-8 animate-fade-in pb-24">

            {/* 1. HERO SECTION WITH INTERACTIVE STATS */}
            <div className="relative h-[220px] mx-1 group">
                {/* Background Layer (Clipped) */}
                <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-xl z-0">
                    <img
                        src={trip.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80'}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                        alt="Trip Cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
                    <button onClick={handleChangeCover} className="absolute top-4 left-4 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"><Edit2 className="w-4 h-4" /></button>
                </div>

                {/* Content Layer (Not clipped, allows Popovers) */}
                <div className="absolute inset-0 pointer-events-none z-10 flex flex-col md:flex-row justify-between items-end p-6">
                    {/* Text Info */}
                    <div className="space-y-1 max-w-xl pointer-events-auto">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-3 text-white/80 font-bold text-xs uppercase tracking-widest bg-white/10 backdrop-blur-md px-3 py-1 rounded-full w-fit border border-white/20">
                                <Calendar className="w-3.5 h-3.5" /> {trip.dates}
                            </div>
                            {onRefresh && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        const btn = e.currentTarget;
                                        btn.classList.add('animate-spin');
                                        onRefresh();
                                        setTimeout(() => btn.classList.remove('animate-spin'), 1000);
                                    }}
                                    className="p-1.5 bg-white/10 backdrop-blur-md text-white/80 hover:bg-white/20 hover:text-white rounded-full transition-colors border border-white/10"
                                    title="רענן נתונים"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-md">
                            {trip.name}
                        </h1>
                        <div className="flex items-center gap-2 text-lg font-medium text-white/90">
                            <MapPin className="w-4 h-4 text-blue-400" /> {trip.destination}
                        </div>
                    </div>

                    {/* Interactive Hero Stats Bar with Popover */}
                    <div className="hidden md:block relative pointer-events-auto">
                        <div className="flex gap-6 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-3xl">
                            <div className="flex flex-col items-center min-w-[60px]">
                                <Plane className="w-8 h-8 text-blue-400 mb-1" />
                                <span className="text-3xl font-black text-white leading-none">{totalStats.flights}</span>
                                <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider mt-1">טיסות</span>
                            </div>
                            <div className="w-px bg-white/20"></div>
                            <button
                                onClick={() => setViewingCategory(viewingCategory === 'hotels' ? null : 'hotels')}
                                className={`flex flex-col items-center min-w-[60px] hover:scale-110 transition-transform cursor-pointer group ${viewingCategory === 'hotels' ? 'scale-110' : ''}`}
                            >
                                <Hotel className={`w-8 h-8 mb-1 transition-colors ${viewingCategory === 'hotels' ? 'text-indigo-300' : 'text-indigo-400 group-hover:text-indigo-300'}`} />
                                <span className="text-3xl font-black text-white leading-none">{totalStats.hotels}</span>
                                <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider mt-1 group-hover:text-white">מלונות</span>
                            </button>
                            <div className="w-px bg-white/20"></div>
                            <button
                                onClick={() => setViewingCategory(viewingCategory === 'food' ? null : 'food')}
                                className={`flex flex-col items-center min-w-[60px] hover:scale-110 transition-transform cursor-pointer group ${viewingCategory === 'food' ? 'scale-110' : ''}`}
                            >
                                <Utensils className={`w-8 h-8 mb-1 transition-colors ${viewingCategory === 'food' ? 'text-orange-300' : 'text-orange-400 group-hover:text-orange-300'}`} />
                                <span className="text-3xl font-black text-white leading-none">{favoriteRestaurants.length}</span>
                                <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider mt-1 group-hover:text-white">אוכל</span>
                            </button>
                            <div className="w-px bg-white/20"></div>
                            <button
                                onClick={() => setViewingCategory(viewingCategory === 'attractions' ? null : 'attractions')}
                                className={`flex flex-col items-center min-w-[60px] hover:scale-110 transition-transform cursor-pointer group ${viewingCategory === 'attractions' ? 'scale-110' : ''}`}
                            >
                                <MapPin className={`w-8 h-8 mb-1 transition-colors ${viewingCategory === 'attractions' ? 'text-emerald-300' : 'text-emerald-400 group-hover:text-emerald-300'}`} />
                                <span className="text-3xl font-black text-white leading-none">{favoriteAttractions.length}</span>
                                <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider mt-1 group-hover:text-white">מקומות</span>
                            </button>
                        </div>

                        {/* Smart Popover (Floating Surface) - PORTAL */}
                        {viewingCategory && createPortal(
                            <>
                                {/* Backdrop for click-outside */}
                                <div className="fixed inset-0 z-[9990]" onClick={() => setViewingCategory(null)} />

                                {/* Popover Content - Centered Top or positioned appropriately */}
                                <div className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-[9999] animate-in slide-in-from-top-4 fade-in duration-200">
                                    <div className="bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl p-4">
                                        {/* Header */}
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                                                {viewingCategory === 'hotels' ? 'מלונות' : viewingCategory === 'food' ? 'מסעדות מועדפות' : 'אטרקציות מועדפות'}
                                            </h3>
                                            <div className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono hidden">POPUP MODE</div>
                                            <button onClick={() => setViewingCategory(null)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                                                <X className="w-4 h-4 text-slate-400" />
                                            </button>
                                        </div>

                                        {/* Micro-Cards Grid - RICH DESIGN */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar p-1">
                                            {(viewingCategory === 'hotels' ? (trip.hotels || []) :
                                                viewingCategory === 'food' ? favoriteRestaurants :
                                                    favoriteAttractions
                                            ).map((item: any, idx: number) => {
                                                // Dynamic Image Logic
                                                const tags = [item.cuisine || item.type || '', item.location || item.address || ''];
                                                const { url } = getPlaceImage(item.name || '', viewingCategory === 'food' ? 'food' : viewingCategory === 'attractions' ? 'attraction' : 'attraction', tags);

                                                return (
                                                    <div
                                                        key={item.id || idx}
                                                        onClick={() => {
                                                            setViewingCategory(null);
                                                            setScheduleItem({ item, type: viewingCategory === 'food' ? 'food' : 'attraction' });
                                                        }}
                                                        className="relative flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer group h-full"
                                                    >
                                                        {/* Image Header */}
                                                        <div className="h-32 w-full bg-slate-100 relative overflow-hidden">
                                                            <img
                                                                src={item.imageUrl || item.image || url}
                                                                alt=""
                                                                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                                            />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>

                                                            {/* Top Badge */}
                                                            <div className="absolute top-2 right-2 flex gap-1">
                                                                {(item.rating || item.googleRating) && (
                                                                    <span className="bg-white/90 backdrop-blur text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                                                                        {item.rating || item.googleRating}<span className="text-yellow-500">★</span>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Content Body */}
                                                        <div className="p-3 flex flex-col flex-1 gap-1">
                                                            <h4 className="text-sm font-black text-slate-800 leading-tight line-clamp-2" dir="ltr">{item.name}</h4>

                                                            <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-1 line-clamp-2">
                                                                <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                                                <span dir="ltr">{item.address || item.location || 'Location available on map'}</span>
                                                            </div>

                                                            {/* Category Specific Info */}
                                                            {viewingCategory === 'hotels' && (
                                                                <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between text-xs">
                                                                    <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2 py-1 rounded-md">
                                                                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                                                        <span className="font-bold">{item.checkInDate ? `${parseDateString(item.checkInDate)?.getDate()}/${parseDateString(item.checkInDate)?.getMonth()! + 1}` : '--'} - {item.checkOutDate ? `${parseDateString(item.checkOutDate)?.getDate()}/${parseDateString(item.checkOutDate)?.getMonth()! + 1}` : '--'}</span>
                                                                    </div>
                                                                    {(() => {
                                                                        const start = parseDateString(item.checkInDate || '');
                                                                        const end = parseDateString(item.checkOutDate || '');
                                                                        if (start && end) {
                                                                            const diffTime = Math.abs(end.getTime() - start.getTime());
                                                                            const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                                            if (nights > 0) {
                                                                                return <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">{nights} לילות</span>;
                                                                            }
                                                                        }
                                                                        return null;
                                                                    })()}
                                                                </div>
                                                            )}

                                                            {(viewingCategory === 'food' || viewingCategory === 'attractions') && (
                                                                <div className="mt-auto pt-2 flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                                                                        {item.cuisine || item.type || (viewingCategory === 'food' ? 'Restaurant' : 'Activity')}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Empty State */}
                                            {((viewingCategory === 'hotels' && (trip.hotels || []).length === 0) ||
                                                (viewingCategory === 'food' && favoriteRestaurants.length === 0) ||
                                                (viewingCategory === 'attractions' && favoriteAttractions.length === 0)) && (
                                                    <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
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

            {/* 2.5 SMART RECOMMENDATIONS BAR */}
            <SmartRecommendationsBar
                trip={trip}
                favoriteRestaurants={favoriteRestaurants}
                favoriteAttractions={favoriteAttractions}
                timeline={timeline}
                onScheduleFavorite={handleScheduleFavorite}
                onSwitchTab={onSwitchTab}
            />

            {/* 3. MAIN TIMELINE (Repositioned for Density) */}
            <div className="px-1 md:px-1 w-full space-y-6 relative z-10 -mt-2">

                {/* View Toggle Button */}
                <div className="flex justify-end mb-2">
                    <button
                        onClick={() => setViewMode(viewMode === 'expanded' ? 'compact' : 'expanded')}
                        className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-sm font-bold text-slate-600"
                        title={viewMode === 'expanded' ? 'תצוגה מצומצמת' : 'תצוגה מורחבת'}
                    >
                        {viewMode === 'expanded' ? (
                            <><LayoutGrid className="w-4 h-4" /> תצוגה מצומצמת</>
                        ) : (
                            <><List className="w-4 h-4" /> תצוגה מורחבת</>
                        )}
                    </button>
                </div>

                {/* Main Column: Timeline (Full width) */}
                <div className="w-full space-y-6">
                    {/* TIMELINE GRID */}
                    {
                        timeline.length === 0 ? (
                            <div className="text-center py-20 text-slate-400">טוען לו"ז...</div>
                        ) : (
                            <div className={`grid gap-3 ${viewMode === 'compact' ? 'grid-cols-2 md:grid-cols-4 xl:grid-cols-6' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4'}`}>
                                {timeline.map((day, index) => {
                                    const [y, m, d] = day.dateIso.split('-');
                                    const dayNumber = index + 1;
                                    const isLastDay = index === timeline.length - 1;

                                    // Use dynamic theme engine
                                    const theme = getCityTheme(day.locationContext);
                                    const headerColorClass = theme.bg;

                                    // COMPACT VIEW - Slim horizontal cards
                                    if (viewMode === 'compact') {
                                        return (
                                            <div
                                                key={day.dateIso}
                                                onClick={() => setSelectedDayIso(day.dateIso)}
                                                className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer flex items-stretch h-[80px] relative group overflow-visible"
                                            >
                                                {/* Mobile Flow Arrows (RTL 2-Column Logic) */}
                                                {!isLastDay && (
                                                    <>
                                                        {/* Even Item (Right Column) -> Points Left to Odd Item */}
                                                        {index % 2 === 0 && (
                                                            <div className="md:hidden absolute -left-3 top-1/2 -translate-y-1/2 z-20 text-slate-400 drop-shadow-md bg-white rounded-full p-0.5 border border-slate-100">
                                                                <ArrowLeft className="w-3 h-3 stroke-[3]" />
                                                            </div>
                                                        )}
                                                        {/* Odd Item (Left Column) -> Points Down to Next Row */}
                                                        {index % 2 !== 0 && (
                                                            <div className="md:hidden absolute left-1/2 -bottom-3 -translate-x-1/2 z-20 text-slate-400 drop-shadow-md bg-white rounded-full p-0.5 border border-slate-100">
                                                                <ChevronDown className="w-3 h-3 stroke-[3]" />
                                                            </div>
                                                        )}
                                                    </>
                                                )}

                                                {/* Desktop Flow Arrow (Simple Left Chevron for Web) */}
                                                {!isLastDay && (
                                                    <div className="hidden md:block absolute -left-3 top-1/2 -translate-y-1/2 z-10 text-slate-200 drop-shadow-sm bg-white rounded-full p-0.5 border border-slate-50">
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </div>
                                                )}

                                                {/* Color Accent Strip */}
                                                <div className={`w-1.5 ${headerColorClass} flex-shrink-0`}></div>

                                                {/* Content */}
                                                <div className="flex-1 p-2 flex flex-col justify-between min-w-0">
                                                    {/* Top: Day & Date */}
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">יום {dayNumber}</span>
                                                        <span className="text-xs font-bold text-slate-700">{day.displayDate}</span>
                                                    </div>

                                                    {/* Middle: Location */}
                                                    <h3 className="text-xs font-bold text-slate-800 truncate leading-tight">{day.locationContext || 'יום בטיול'}</h3>

                                                    {/* Bottom: Event Badges */}
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        {day.stats.flight > 0 && <span className="flex items-center gap-0.5 text-[9px] font-bold bg-blue-50 text-blue-600 px-1 py-0.5 rounded"><Plane className="w-2.5 h-2.5" />{day.stats.flight}</span>}
                                                        {day.stats.hotel > 0 && <span className="flex items-center gap-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded"><Hotel className="w-2.5 h-2.5" />{day.stats.hotel}</span>}
                                                        {day.stats.food > 0 && <span className="flex items-center gap-0.5 text-[9px] font-bold bg-orange-50 text-orange-600 px-1 py-0.5 rounded"><Utensils className="w-2.5 h-2.5" />{day.stats.food}</span>}
                                                        {day.stats.attr > 0 && <span className="flex items-center gap-0.5 text-[9px] font-bold bg-purple-50 text-purple-600 px-1 py-0.5 rounded"><Ticket className="w-2.5 h-2.5" />{day.stats.attr}</span>}
                                                        {day.events.length === 0 && <span className="text-[9px] text-slate-300 font-medium">יום חופשי</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    // EXPANDED VIEW - Original full cards
                                    return (
                                        <div
                                            key={day.dateIso}
                                            onClick={() => setSelectedDayIso(day.dateIso)}
                                            className="bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group flex flex-col h-[260px] relative"
                                        >
                                            {/* Header Background */}
                                            <div className={`h-16 ${headerColorClass} relative overflow-hidden flex items-center px-4`}>
                                                {/* Decorative Circles */}
                                                <div className="absolute -right-4 -top-4 w-20 h-20 bg-white opacity-10 rounded-full"></div>
                                                <div className="absolute right-10 bottom-0 w-12 h-12 bg-white opacity-5 rounded-full"></div>

                                                {/* Day Info */}
                                                <div className="text-white relative z-10 w-full flex justify-between items-center pl-10">
                                                    <div>
                                                        <div className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-0.5">{day.displayDayOfWeek}</div>
                                                        <div className="text-xl font-black leading-none flex items-center gap-1.5">
                                                            <span>{day.displayDate.split(' ')[1]}</span>
                                                            <span className="opacity-90 uppercase">{day.displayDate.split(' ')[0]}</span>
                                                        </div>
                                                    </div>
                                                    {/* Location Context */}
                                                    <div className="text-right max-w-[50%]">
                                                        <h3 className="text-sm font-bold text-white truncate leading-tight opacity-95">{day.locationContext || 'יום בטיול'}</h3>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Dynamic Context Widget (Top Left Corner) */}
                                            <div className="absolute top-3 left-3 z-20">
                                                <div className="bg-white/20 backdrop-blur-md border border-white/30 p-2 rounded-full shadow-lg transform group-hover:rotate-12 transition-transform duration-500">
                                                    {(() => {
                                                        const t = (day.locationContext || '').toLowerCase();
                                                        if (t.includes('טיסה') || t.includes('flight') || day.events.some(e => e.type === 'flight')) return <Plane className="w-5 h-5 text-white" />;
                                                        if (day.hasHotel || t.includes('מלון') || t.includes('hotel')) return <Hotel className="w-5 h-5 text-white" />;
                                                        return <MapPin className="w-5 h-5 text-white" />;
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Day Number Badge (Floating below header) */}
                                            <div className="absolute top-12 right-4 bg-white text-slate-800 text-[10px] font-black px-2 py-1 rounded-lg shadow-md border border-slate-100 z-20">
                                                יום {dayNumber}
                                            </div>

                                            {/* Hotel Indicator REMOVED per user request */}

                                            {/* Flow Arrow (Desktop Only - Outside) */}
                                            {!isLastDay && (
                                                <div className="hidden xl:block absolute -left-5 top-1/2 -translate-y-1/2 z-0 text-slate-200 pointer-events-none">
                                                    <ChevronLeft className="w-6 h-6 stroke-[3]" />
                                                </div>
                                            )}

                                            {/* Content Preview */}
                                            <div className="p-3 flex-grow overflow-hidden relative bg-white">
                                                {day.events.length > 0 ? (
                                                    <div className="space-y-1.5 relative z-10">
                                                        {day.events.slice(0, 3).map((event, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 w-full">
                                                                <span className="text-[10px] font-mono font-bold opacity-50 min-w-[32px]">{event.time || "--:--"}</span>
                                                                <div className={`p-1 rounded-full ${event.bgClass} flex-shrink-0`}><event.icon className={`w-3 h-3 ${event.colorClass}`} /></div>
                                                                <span className="text-xs font-bold text-slate-700 truncate leading-none flex-1 opacity-90">{event.title}</span>
                                                            </div>
                                                        ))}
                                                        {day.events.length > 3 && (
                                                            <div className="text-[10px] font-bold text-slate-400 pt-1 px-8">
                                                                + עוד {day.events.length - 3} פריטים
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="h-full">
                                                        {/* CONTEXTUAL INTELLIGENCE: SMART PLANNER REMOVED AS PER USER REQUEST */}
                                                        <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40 pb-2">
                                                            <Moon className="w-5 h-5 mb-1" />
                                                            <span className="text-[10px] font-bold">יום חופשי</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                                            </div>
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
                                const modalTheme = getCityTheme(activeDay.locationContext);
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
                            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50 scrollbar-hide">
                                {activeDay.events.length > 0 ? (
                                    activeDay.events.map((event, i) => (
                                        <div key={`${event.id}-${i}`} className="group flex gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative">
                                            <div className="w-12 flex-shrink-0 pt-1 text-center">
                                                <span className="text-xs font-bold text-slate-400 font-mono tracking-tight block">{event.time || '--:--'}</span>
                                            </div>
                                            <div className={`mt-0.5 w-1 h-full absolute right-12 top-0 rounded-full opacity-20 ${event.bgClass.replace('bg-', 'bg-')}`}></div>

                                            <div className="flex-1 min-w-0 pr-2 border-r-2 border-slate-50 mr-1">
                                                <div className="flex justify-between items-start">
                                                    <h3 className="font-bold text-slate-800 text-sm truncate">{event.title}</h3>
                                                    <div className={`p-1.5 rounded-lg ${event.bgClass} flex-shrink-0`}><event.icon className={`w-3.5 h-3.5 ${event.colorClass}`} /></div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                                    {event.subtitle && <span className="text-[10px] text-slate-500 truncate max-w-[150px]">{event.subtitle}</span>}
                                                    {event.location && (
                                                        <a
                                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.title} ${event.location}`)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="flex items-center text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded hover:bg-slate-100 hover:text-blue-500 transition-colors"
                                                        >
                                                            <MapPin className="w-2.5 h-2.5 ml-0.5" /> {event.location}
                                                        </a>
                                                    )}
                                                    {event.isExternal && <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 rounded font-bold">G-Cal</span>}
                                                </div>
                                            </div>

                                            {/* Quick Delete - Manual activities, Restaurants, Attractions */}
                                            {(event.isManual || event.type === 'food' || event.type === 'attraction') && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (event.isManual) {
                                                            handleDeleteActivity(event.dayId!, event.activityIndex!);
                                                        } else if (event.type === 'food' || event.type === 'attraction') {
                                                            handleUnscheduleItem(event.id, event.type);
                                                        }
                                                    }}
                                                    className="absolute bottom-2 left-2 text-slate-200 hover:text-red-500 transition-colors p-1"
                                                    title={event.isManual ? 'מחק מהלוז' : 'הסר מהלוז (יחזור להמלצות)'}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-slate-300 text-xs font-bold">אין פעילויות</div>
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
                                    <input name="price" type="number" placeholder="מחיר" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold" />
                                </div>
                                <textarea name="notes" placeholder="הערות..." rows={3} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium" />
                                <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold">שמור</button>
                            </div>
                        </form>
                    </div>
                )
            }


            {/* Note: CategoryListModal replaced by inline Smart Popover in Hero Stats section */}

            {/* Schedule Item Modal (from CategoryListModal selection) */}
            {scheduleItem && (
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
                        alert(`✅ "${scheduleItem.item?.name}" נוסף ליום ${d}/${m}!`);
                    }}
                />
            )}


        </div >
    );
};