
import React, { useEffect, useState, useMemo } from 'react';
import { Trip, Restaurant, Attraction, DayPlan, TimelineEvent, TimelineEventType } from '../types';
import {
    Calendar, MapPin, Plane, Car, Globe,
    Hotel, Utensils, Ticket, Plus, Sparkles, X,
    ArrowLeft, Edit2, BedDouble, Moon, Map as MapIcon, Trash2, DollarSign, User, ChevronRight, Clock, MoreHorizontal, RefreshCw
} from 'lucide-react';
import { fetchCalendarEvents, mapEventsToTimeline, GoogleCalendarEvent } from '../services/calendarService';
import { requestAccessToken } from '../services/googleAuthService';
import { CategoryListModal } from './CategoryListModal';
import { TripDateSelector } from './TripDateSelector';
import { FavoritesWidget } from './FavoritesWidget';
import { TripAssistant } from './TripAssistant';

// --- Types ---
// Removed to types.ts

interface Insight {
    id: string;
    type: 'warning' | 'suggestion' | 'info';
    title: string;
    description: string;
    actionLabel: string;
    action: () => void;
    icon: any;
}

const parseDateString = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    let d: Date | null = null;
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
    } else if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts[0].length === 4) {
            d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
        } else if (parts[2].length === 4) {
            d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
        }
    } else {
        d = new Date(dateStr);
        d.setHours(12, 0, 0, 0);
    }
    return (d && !isNaN(d.getTime())) ? d : null;
};

const formatDateDisplay = (date: Date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const getDayOfWeek = (date: Date) => {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return `יום ${days[date.getDay()]}`;
};

export const ItineraryView: React.FC<{
    trip: Trip,
    onUpdateTrip: (updatedTrip: Trip) => void,
    onSwitchTab?: (tab: string) => void
}> = ({ trip, onUpdateTrip, onSwitchTab }) => {

    const [timeline, setTimeline] = useState<DayPlan[]>([]);
    const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);
    const [quickAddModal, setQuickAddModal] = useState<{ isOpen: boolean, targetDate?: string }>({ isOpen: false });
    const [transferModal, setTransferModal] = useState<{ date: string, defaultTime: string } | null>(null);
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [externalEvents, setExternalEvents] = useState<TimelineEvent[]>([]);
    const [viewingCategory, setViewingCategory] = useState<'food' | 'attractions' | 'hotels' | null>(null);
    const [scheduleItem, setScheduleItem] = useState<{ item: any, type: 'food' | 'attraction' } | null>(null); // For the scheduler

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
    const generateDayTitle = (day: DayPlan, trip: Trip, dayIndex: number, totalDays: number): string => {
        const events = day.events;

        // Priority 1: Flight Day
        const flightEvent = events.find(e => e.type === 'flight');
        if (flightEvent) {
            // Check if it's the last flight (return flight)
            const isLastDay = dayIndex === totalDays - 1 || dayIndex === totalDays - 2;
            if (isLastDay) {
                return 'טיסה חזרה';
            }
            // Extract destination from flight title
            const destMatch = flightEvent.title?.match(/טיסה ל(.+)/);
            if (destMatch && destMatch[1]) {
                return `טיסה ל${destMatch[1]}`;
            }
            return 'טיסה';
        }

        // Priority 2: Hotel Check-in Day
        const hotelCheckin = events.find(e => e.type === 'hotel_checkin');
        if (hotelCheckin) {
            // Extract hotel name from "Check-in: Hotel Name"
            const hotelMatch = hotelCheckin.title?.match(/Check-in: (.+)/);
            if (hotelMatch && hotelMatch[1]) {
                return `מלון ${hotelMatch[1]}`;
            }
            return day.hasHotel ? `צ'ק-אין` : 'מלון';
        }

        // Priority 3: Empty Day
        if (events.length === 0) {
            const location = trip.destinationEnglish || trip.destination.split('-')[0].trim();
            return `יום חופשי ב${location}`;
        }

        // Priority 4: Single Event
        if (events.length === 1) {
            const event = events[0];
            if (event.type === 'travel') return 'הסעה';
            if (event.type === 'hotel_stay') return 'מלון';
            // Use the event title if it's descriptive
            if (event.title && event.title.length < 30) {
                return event.title;
            }
        }

        // Priority 5: Multiple Events - Analyze dominant type
        const stats = {
            food: events.filter(e => e.type === 'food').length,
            attractions: events.filter(e => e.type === 'attraction').length,
            activities: events.filter(e => e.type === 'activity').length,
        };

        const location = trip.destinationEnglish || trip.destination.split('-')[0].trim();

        if (stats.attractions >= 2) {
            return `סיורים ב${location}`;
        }
        if (stats.food >= 2) {
            return `אוכל ב${location}`;
        }
        if (events.length >= 3) {
            return `יום פעילויות ב${location}`;
        }

        // Default: Location name
        return location;
    };

    useEffect(() => {
        const generateTimeline = () => {
            let startDate = new Date();
            startDate.setHours(12, 0, 0, 0);
            let endDate = new Date();
            endDate.setDate(startDate.getDate() + 7);
            endDate.setHours(12, 0, 0, 0);

            if (trip.dates) {
                const rangeParts = trip.dates.split('-').map(s => s.trim());
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
                const city = hotel.address ? hotel.address.split(',')[0].trim() : hotel.name;

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
                        subtitle: res.cuisine,
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

            const sortedTimeline = Array.from(dayMap.values()).sort((a, b) => a.dateIso.localeCompare(b.dateIso));

            // Generate dynamic titles for each day (Task 6)
            sortedTimeline.forEach((day, index) => {
                day.locationContext = generateDayTitle(day, trip, index, sortedTimeline.length);

                day.events.sort((a, b) => {
                    if (a.type === 'hotel_stay' && !a.time) return -1;
                    if (b.type === 'hotel_stay' && !b.time) return 1;
                    return (a.time || '00:00').localeCompare(b.time || '00:00')
                });
                day.stats = {
                    food: day.events.filter(e => e.type === 'food').length,
                    attr: day.events.filter(e => e.type === 'attraction').length,
                    flight: day.events.filter(e => e.type === 'flight').length,
                    travel: day.events.filter(e => e.type === 'travel').length,
                    hotel: day.events.filter(e => e.type === 'hotel_checkin' || e.type === 'hotel_stay').length
                };
            });

            setTimeline(sortedTimeline);

            const newInsights: Insight[] = [];
            trip.flights?.segments?.forEach(seg => {
                const d = parseDateString(seg.date);
                if (d) {
                    const iso = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
                    const dayPlan = dayMap.get(iso);
                    if (dayPlan && !dayPlan.events.some(e => e.type === 'travel')) {
                        newInsights.push({
                            id: `flight-transfer-${seg.flightNumber}`,
                            type: 'warning',
                            title: 'הסעה לטיסה',
                            description: `טיסה ב-${seg.date}. האם סגרת הסעה?`,
                            actionLabel: 'הוסף',
                            action: () => setTransferModal({ date: seg.date, defaultTime: seg.departureTime }),
                            icon: Car
                        });
                    }
                }
            });
            setInsights(newInsights);
        };

        generateTimeline();
    }, [trip, externalEvents]);

    const handleSyncCalendar = async () => {
        setIsSyncing(true);
        try {
            // Default to trip dates or next 30 days
            const startDate = trip.startDate ? parseDateString(trip.startDate) : new Date();
            const endDate = trip.endDate ? parseDateString(trip.endDate) : new Date(new Date().setDate(new Date().getDate() + 30));

            if (!startDate || !endDate) throw new Error("Invalid Dates");

            // Adjust to cover full days
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);

            const events = await fetchCalendarEvents(startDate.toISOString(), endDate.toISOString());
            const mapped = mapEventsToTimeline(events);

            setExternalEvents(mapped);
            alert(`סונכרנו בהצלחה ${events.length} אירועים מהיומן!`);
        } catch (error: any) {
            console.error("Sync failed", error);
            if (error.message === 'NEEDS_AUTH' || error.message.includes('Permission denied')) {
                // FORCE RE-AUTH
                try {
                    await requestAccessToken('consent');

                    // Retry fetch immediately after success
                    const startDate = trip.startDate ? parseDateString(trip.startDate) : new Date();
                    const endDate = trip.endDate ? parseDateString(trip.endDate) : new Date(new Date().setDate(new Date().getDate() + 30));

                    if (startDate && endDate) {
                        startDate.setHours(0, 0, 0, 0);
                        endDate.setHours(23, 59, 59, 999);

                        const retryEvents = await fetchCalendarEvents(startDate.toISOString(), endDate.toISOString());
                        const mapped = mapEventsToTimeline(retryEvents);
                        setExternalEvents(mapped);
                        alert(`סונכרנו בהצלחה ${retryEvents.length} אירועים מהיומן!`);
                    }
                } catch (retryError) {
                    console.error("Re-auth failed", retryError);
                    alert("Calendar sync failed. Please approve permissions.");
                }
            } else if ((error as Error).message.includes('token')) {
                alert("נדרשת התחברות מחדש כדי לקרוא מהיומן. אנא התנתק והתחבר שוב.");
            } else {
                alert("שגיאה בסנכרון יומן. נסה שנית.");
            }
        } finally {
            setIsSyncing(false);
        }
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



    const handleScheduleFavorite = (item: Restaurant | Attraction, dateIso: string, type: 'food' | 'attraction') => {
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
        } else {
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
            <div className="relative h-[220px] rounded-[2rem] overflow-hidden shadow-xl group mx-1">
                <img
                    src={trip.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80'}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    alt="Trip Cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>

                <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col md:flex-row justify-between items-end gap-4">
                    <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-3 text-white/80 font-bold text-xs uppercase tracking-widest bg-white/10 backdrop-blur-md px-3 py-1 rounded-full w-fit border border-white/20">
                            <Calendar className="w-3.5 h-3.5" /> {trip.dates}
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-md">
                            {trip.name}
                        </h1>
                        <div className="flex items-center gap-2 text-lg font-medium text-white/90">
                            <MapPin className="w-4 h-4 text-blue-400" /> {trip.destination}
                        </div>
                    </div>

                    {/* Interactive Hero Stats Bar with Popover */}
                    <div className="hidden md:block relative">
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

                        {/* Smart Popover (Floating Surface) */}
                        {viewingCategory && (
                            <>
                                {/* Backdrop for click-outside */}
                                <div className="fixed inset-0 z-40" onClick={() => setViewingCategory(null)} />

                                {/* Popover Content */}
                                <div className="absolute top-full left-0 right-0 mt-3 p-4 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-2xl z-50 origin-top animate-in slide-in-from-top-2 fade-in duration-200">
                                    {/* Header */}
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                                            {viewingCategory === 'hotels' ? 'מלונות' : viewingCategory === 'food' ? 'מסעדות מועדפות' : 'אטרקציות מועדפות'}
                                        </h3>
                                        <button onClick={() => setViewingCategory(null)} className="p-1.5 hover:bg-slate-100 rounded-full transition-colors">
                                            <X className="w-4 h-4 text-slate-400" />
                                        </button>
                                    </div>

                                    {/* Micro-Cards Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                        {(viewingCategory === 'hotels' ? (trip.hotels || []) :
                                            viewingCategory === 'food' ? favoriteRestaurants :
                                                favoriteAttractions
                                        ).map((item: any, idx: number) => (
                                            <div
                                                key={item.id || idx}
                                                onClick={() => {
                                                    setViewingCategory(null);
                                                    setScheduleItem({ item, type: viewingCategory === 'food' ? 'food' : 'attraction' });
                                                }}
                                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer group"
                                            >
                                                {/* Thumbnail */}
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                                                    <img
                                                        src={`https://images.unsplash.com/photo-${viewingCategory === 'hotels' ? '1566073771259-6a8506099945' : viewingCategory === 'food' ? '1517248135467-4c7edcad34c4' : '1469854523086-cc02fe5d8800'}?auto=format&fit=crop&w=100&q=60`}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-bold text-slate-800 truncate">{item.name}</h4>
                                                    <p className="text-[10px] text-slate-400 truncate">
                                                        {item.address || item.location || item.cuisine || item.type || 'לחץ לתזמון'}
                                                    </p>
                                                </div>

                                                {/* Rating */}
                                                {(item.rating || item.googleRating) && (
                                                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold flex-shrink-0">
                                                        {item.rating || item.googleRating}★
                                                    </span>
                                                )}
                                            </div>
                                        ))}

                                        {/* Empty State */}
                                        {((viewingCategory === 'hotels' && (trip.hotels || []).length === 0) ||
                                            (viewingCategory === 'food' && favoriteRestaurants.length === 0) ||
                                            (viewingCategory === 'attractions' && favoriteAttractions.length === 0)) && (
                                                <div className="col-span-full text-center py-6 text-slate-400 text-sm">
                                                    אין פריטים בקטגוריה זו
                                                </div>
                                            )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <button onClick={handleChangeCover} className="absolute top-4 left-4 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="w-4 h-4" /></button>
            </div>

            {/* 2. TRIP SUMMARY STRIP REMOVED PER USER FEEDBACK - DIRECT TO COMMAND CENTER */}

            {/* 3. COMMAND CENTER: Tasks & Favorites (Phase 1 Titanium UX) */}
            {/* 3. COMMAND CENTER: Tasks & Favorites (Phase 1 Titanium UX) */}
            <div className="px-1 md:px-2 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[260px] mb-8 relative z-30 mt-6">
                {/* Column 1: TripAssistant */}
                <div className="lg:col-span-1 h-full">
                    <TripAssistant
                        trip={trip}
                        onNavigate={(tab) => console.log('Navigate to:', tab)}
                    />
                </div>

                {/* Columns 2-3: FavoritesWidget (Split-View: Food vs Attractions) */}
                <div className="lg:col-span-2 h-full">
                    <FavoritesWidget
                        trip={trip}
                        timeline={timeline}
                        onSchedule={(item, date, type) => {
                            // Find day and add activity
                            const targetDay = timeline.find(d => d.dateIso === date);
                            if (targetDay) {
                                const newActivity = {
                                    description: item.name,
                                    time: '12:00',
                                    type: type === 'food' ? 'restaurant' : 'attraction'
                                };
                                const updatedTimeline = timeline.map(d =>
                                    d.id === targetDay.id ? { ...d, activities: [...(d.activities || []), newActivity] } : d
                                );
                                onUpdateTrip({ ...trip, timeline: updatedTimeline });
                            }
                        }}
                    />
                </div>
            </div>

            {/* 4. MAIN CONTENT GRID (Timeline + Assistant) */}
            <div className="px-1 md:px-1 grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">

                {/* Main Column: Timeline (3/4 width) */}
                <div className="lg:col-span-3 space-y-6">
                    {/* TIMELINE GRID */}
                    {
                        timeline.length === 0 ? (
                            <div className="text-center py-20 text-slate-400">טוען לו"ז...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                {timeline.map((day) => {
                                    const [y, m, d] = day.dateIso.split('-');

                                    return (
                                        <div
                                            key={day.dateIso}
                                            onClick={() => setSelectedDayIso(day.dateIso)}
                                            className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden group flex flex-col h-[160px]"
                                        >
                                            {/* Header Compact */}
                                            <div className="p-3 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-white border border-slate-200 text-slate-700 w-10 h-10 rounded-xl flex flex-col items-center justify-center shadow-sm">
                                                        <span className="text-sm font-black leading-none">{d}</span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 truncate">{day.displayDayOfWeek}</div>
                                                        <h3 className="font-black text-slate-800 text-sm leading-tight line-clamp-2">{day.locationContext || 'יום בטיול'}</h3>
                                                    </div>
                                                </div>
                                                {day.hasHotel && !day.events.some(e => e.type === 'hotel_checkout') && (
                                                    <div className="bg-indigo-50 text-indigo-500 p-1.5 rounded-lg"><Hotel className="w-3.5 h-3.5" /></div>
                                                )}
                                            </div>

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
                                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40 pb-2">
                                                        <Moon className="w-5 h-5 mb-1" />
                                                        <span className="text-[10px] font-bold">יום חופשי</span>
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



            {/* DAY DETAIL MODAL - FIXED POSITIONING */}
            {
                selectedDayIso && activeDay && (
                    <div
                        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4 content-center"
                        onClick={(e) => { if (e.target === e.currentTarget) setSelectedDayIso(null); }}
                    >
                        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh] animate-scale-in" onClick={e => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div className="bg-white border-b border-slate-100 p-5 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-50 text-blue-600 w-12 h-12 rounded-xl flex flex-col items-center justify-center font-black text-xl border border-blue-100 shadow-inner">
                                        {activeDay.displayDate.split(' ')[0]}
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{activeDay.displayDayOfWeek}</div>
                                        <h2 className="text-lg font-black text-slate-800">{activeDay.locationContext || 'לו"ז יומי'}</h2>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { const [y, m, d] = activeDay.dateIso.split('-'); setQuickAddModal({ isOpen: true, targetDate: `${d}/${m}/${y}` }) }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"><Plus className="w-5 h-5" /></button>
                                    <button onClick={() => setSelectedDayIso(null)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
                                </div>
                            </div>

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
                                                    {event.location && <span className="flex items-center text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded"><MapPin className="w-2.5 h-2.5 ml-0.5" /> {event.location}</span>}
                                                    {event.isExternal && <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 rounded font-bold">G-Cal</span>}
                                                </div>
                                            </div>

                                            {/* Quick Delete */}
                                            {event.isManual && (
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteActivity(event.dayId!, event.activityIndex!) }} className="absolute bottom-2 left-2 text-slate-200 hover:text-red-500 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
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
                    </div>
                )
            }

            {/* Quick Add Modal */}
            {
                quickAddModal.isOpen && (
                    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setQuickAddModal({ isOpen: false })}>
                        <div className="bg-white rounded-[2rem] p-6 w-full max-w-[320px] shadow-2xl relative max-h-[80vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800">הוספה ללו"ז</h3>
                                    <p className="text-xs text-slate-400 font-bold">תאריך: {quickAddModal.targetDate}</p>
                                </div>
                                <button onClick={() => setQuickAddModal({ isOpen: false })} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button>
                            </div>
                            <input
                                autoFocus
                                placeholder="למשל: 19:00 ארוחת ערב"
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg text-slate-800 placeholder:text-slate-300 relative z-10"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleManualAdd(e.currentTarget.value);
                                    }
                                }}
                            />
                            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 relative z-10 no-scrollbar">
                                {['✈️ טיסה', '🏨 מלון', '🍽️ אוכל', '🎟️ אטרקציה', '🚗 נסיעה'].map(suggestion => (
                                    <button
                                        key={suggestion}
                                        onClick={() => handleManualAdd(`${suggestion} ב...`)}
                                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 whitespace-nowrap transition-colors"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
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
                    trip={trip}
                    onClose={() => setScheduleItem(null)}
                    onSchedule={(dayId: string) => {
                        // Add item to the selected day
                        const targetDay = trip.timeline?.find(d => d.id === dayId);
                        if (targetDay && scheduleItem.item) {
                            const newActivity = {
                                description: scheduleItem.item.name || 'פריט',
                                time: '12:00',
                                type: scheduleItem.type === 'food' ? 'restaurant' : 'attraction'
                            };
                            const updatedTimeline = (trip.timeline || []).map(d =>
                                d.id === dayId ? { ...d, activities: [...(d.activities || []), newActivity] } : d
                            );
                            onUpdateTrip({ ...trip, timeline: updatedTimeline });
                        }
                        setScheduleItem(null);
                    }}
                    itemName={scheduleItem.item?.name || 'פריט'}
                />
            )}


        </div >
    );
};