import React, { useEffect, useState, useMemo } from 'react';
import { Trip } from '../types';
import {
    Calendar, MapPin, Plane, Car,
    Hotel, Utensils, Ticket, Plus, Sparkles, X,
    ArrowLeft, Edit2, BedDouble, Moon, Map as MapIcon, Trash2, DollarSign, User, ChevronRight, Clock, MoreHorizontal, RefreshCw
} from 'lucide-react';
import { fetchCalendarEvents, mapEventsToTimeline, GoogleCalendarEvent } from '../services/calendarService';

// --- Types ---
type TimelineEventType = 'flight' | 'hotel_stay' | 'hotel_checkin' | 'hotel_checkout' | 'food' | 'attraction' | 'activity' | 'shopping' | 'travel';

interface TimelineEvent {
    id: string;
    type: TimelineEventType;
    time: string; // HH:MM
    title: string;
    subtitle?: string;
    location?: string;
    price?: string;
    icon: any;
    colorClass: string;
    bgClass: string;
    externalLink?: string;
    isManual?: boolean;
    dayId?: string;
    activityIndex?: number;
    // New
    isExternal?: boolean;
}

interface DayPlan {
    dateIso: string;
    displayDate: string;
    displayDayOfWeek: string;
    locationContext: string;
    events: TimelineEvent[];
    stats: { food: number, attr: number, flight: number, travel: number, hotel: number };
    hasHotel: boolean;
}

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
                    // Graceful fallback for out of bounds dates if needed, or ignore
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
                const d = parseDateString(seg.date);
                if (d) {
                    const isoKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
                    const plan = dayMap.get(isoKey);
                    if (plan) plan.locationContext = "טיסה";
                }
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

            // --- Ingest External Calendar Events ---
            externalEvents.forEach(ev => {
                // @ts-ignore
                if (ev.date) addToDay(ev.date, ev);
            });

            const sortedTimeline = Array.from(dayMap.values()).sort((a, b) => a.dateIso.localeCompare(b.dateIso));

            const mainDest = trip.destinationEnglish || trip.destination.split('-')[0].trim();
            sortedTimeline.forEach(day => {
                if (!day.locationContext) {
                    if (day.hasHotel) {
                        day.locationContext = mainDest;
                    } else {
                        day.locationContext = mainDest;
                    }
                }
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

            // Insights logic...
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
            const startDate = timeline.length > 0 ? timeline[0].dateIso : new Date().toISOString();
            const endDate = timeline.length > 0 ? timeline[timeline.length - 1].dateIso : new Date().toISOString();

            // Add buffer dates to catch adjacent events
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setHours(23, 59, 59);

            const events = await fetchCalendarEvents(start.toISOString(), end.toISOString());
            const mapped = mapEventsToTimeline(events);
            setExternalEvents(mapped);
            alert(`סונכרנו בהצלחה ${events.length} אירועים מהיומן!`);
        } catch (error) {
            console.error("Sync failed", error);
            if ((error as Error).message.includes('token')) {
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

            {/* 1. COMPACT HEADER */}
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

                    {/* Stats */}
                    <div className="hidden md:flex gap-6 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-3xl">
                        <div className="flex flex-col items-center min-w-[60px]">
                            <Plane className="w-8 h-8 text-blue-400 mb-1" />
                            <span className="text-3xl font-black text-white leading-none">{totalStats.flights}</span>
                        </div>
                        <div className="w-px bg-white/20"></div>
                        <div className="flex flex-col items-center min-w-[60px]">
                            <Hotel className="w-8 h-8 text-indigo-400 mb-1" />
                            <span className="text-3xl font-black text-white leading-none">{totalStats.hotels}</span>
                        </div>
                        <div className="w-px bg-white/20"></div>
                        <div className="flex flex-col items-center min-w-[60px]">
                            <Utensils className="w-8 h-8 text-orange-400 mb-1" />
                            <span className="text-3xl font-black text-white leading-none">{totalStats.restaurants}</span>
                        </div>
                    </div>
                </div>
                <button onClick={handleChangeCover} className="absolute top-4 left-4 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="w-4 h-4" /></button>
            </div>

            {/* 2. INSIGHTS & ACTIONS */}
            <div className="px-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {insights.length > 0 && (
                    <div className="">
                        <div className="flex items-center gap-2 mb-3 px-2">
                            <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
                            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">ההמלצות של העוזר האישי</h3>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide py-1">
                            {insights.map(insight => (
                                <div key={insight.id} className="min-w-[280px] bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                                    <div className={`absolute top-0 right-0 w-1.5 h-full ${insight.type === 'warning' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2.5 rounded-xl ${insight.type === 'warning' ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'}`}><insight.icon className="w-5 h-5" /></div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-sm mb-1">{insight.title}</h4>
                                            <p className="text-xs text-slate-500 leading-snug mb-3">{insight.description}</p>
                                            <button onClick={insight.action} className="text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1">{insight.actionLabel} <ArrowLeft className="w-3 h-3" /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sync Button - Added Here */}
                <div className="flex justify-end px-2">
                    <button
                        onClick={handleSyncCalendar}
                        disabled={isSyncing}
                        className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold transition-all shadow-sm border border-emerald-100 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'מסנכרן...' : 'יבא יומן Google'}
                    </button>
                </div>
            </div>

            {/* 3. GRID DASHBOARD VIEW */}
            <div className="px-2 md:px-4">
                {timeline.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">טוען לו"ז...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {timeline.map((day) => {
                            const [y, m, d] = day.dateIso.split('-');
                            const targetDateFormatted = `${d}/${m}/${y}`;

                            return (
                                <div
                                    key={day.dateIso}
                                    onClick={() => setSelectedDayIso(day.dateIso)}
                                    className="bg-white border border-slate-200 rounded-[1.8rem] shadow-sm hover:shadow-xl hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group flex flex-col h-[220px]"
                                >
                                    {/* Header */}
                                    <div className="p-3 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white border-2 border-slate-200 text-slate-700 w-10 h-10 rounded-xl flex flex-col items-center justify-center shadow-sm group-hover:border-blue-400 group-hover:text-blue-600 transition-colors">
                                                <span className="text-sm font-black leading-none">{day.displayDate.split(' ')[0]}</span>
                                                <span className="text-[8px] font-bold uppercase">{day.displayDate.split(' ')[1]}</span>
                                            </div>
                                            <div>
                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-0.5">{day.displayDayOfWeek}</div>
                                                <h3 className="font-black text-slate-800 text-sm leading-none truncate max-w-[140px]">{day.locationContext || 'יום בטיול'}</h3>
                                            </div>
                                        </div>
                                        {day.hasHotel && !day.events.some(e => e.type === 'hotel_checkout') && (
                                            <div className="bg-indigo-50 text-indigo-500 p-1.5 rounded-full">
                                                <Hotel className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Rich Preview Content - Google Pills */}
                                    <div className="p-3 flex-grow overflow-hidden relative bg-white">
                                        {day.events.length > 0 ? (
                                            <div className="space-y-1.5 relative z-10">
                                                {day.events.slice(0, 3).map((event, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-full border shadow-sm transition-transform hover:scale-105 w-fit max-w-full ${event.bgClass}`}
                                                    >
                                                        <span className="text-xs font-black opacity-60 min-w-[35px]">{event.time || "--:--"}</span>
                                                        <event.icon className={`w-3.5 h-3.5 ${event.colorClass}`} />
                                                        <span className="text-xs font-black text-slate-700 truncate leading-none">
                                                            {event.title}
                                                        </span>
                                                    </div>
                                                ))}
                                                {day.events.length > 3 && (
                                                    <div className="text-[10px] font-bold text-slate-400 px-2 pt-1 opacity-80">
                                                        + עוד {day.events.length - 3} פעילויות...
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 opacity-60">
                                                <Moon className="w-8 h-8" />
                                                <span className="text-xs font-bold">יום חופשי</span>
                                            </div>
                                        )}

                                        {/* Gradient Fade for Long Content */}
                                        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none"></div>
                                    </div>

                                    {/* Footer Indicators */}
                                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
                                        <div className="flex gap-2">
                                            {day.stats.flight > 0 && <span className="flex items-center gap-1"><Plane className="w-3 h-3" /> {day.stats.flight}</span>}
                                            {day.stats.food > 0 && <span className="flex items-center gap-1"><Utensils className="w-3 h-3" /> {day.stats.food}</span>}
                                            {day.stats.attr > 0 && <span className="flex items-center gap-1"><Ticket className="w-3 h-3" /> {day.stats.attr}</span>}
                                        </div>
                                        <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            פתח <ChevronRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* DAY DETAIL MODAL */}
            {selectedDayIso && activeDay && (
                <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto flex items-start justify-center p-4 pt-12 md:pt-24">
                    <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]">

                        {/* Modal Header */}
                        <div className="bg-white border-b border-slate-100 p-6 flex items-center justify-between sticky top-0 z-20">
                            <div className="flex items-center gap-4">
                                <div className="bg-slate-100 text-slate-700 w-20 h-20 rounded-2xl flex flex-col items-center justify-center border border-slate-200">
                                    <span className="text-3xl font-black leading-none">{activeDay.displayDate.split(' ')[0]}</span>
                                    <span className="text-xs font-bold uppercase">{activeDay.displayDate.split(' ')[1]}</span>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                                        {activeDay.displayDayOfWeek}
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-800 leading-none">{activeDay.locationContext || 'יום בטיול'}</h2>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const [y, m, d] = activeDay.dateIso.split('-');
                                        setQuickAddModal({ isOpen: true, targetDate: `${d}/${m}/${y}` })
                                    }}
                                    className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors"
                                    title="הוסף פעילות"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                                <button onClick={() => setSelectedDayIso(null)} className="p-2.5 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content - Vertical List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
                            {activeDay.events.length > 0 ? (
                                <div className="space-y-3">
                                    {activeDay.events.map((event, i) => (
                                        <div
                                            key={`${event.id}-${i}`}
                                            className="group flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all"
                                        >
                                            {/* Time Pill */}
                                            <div className="w-16 flex-shrink-0 flex flex-col items-center justify-center">
                                                {event.time ? (
                                                    <span className="font-mono text-sm font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                                                        {event.time}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-300">--:--</span>
                                                )}
                                            </div>

                                            {/* Icon */}
                                            <div className={`p-3 rounded-xl flex-shrink-0 ${event.bgClass}`}>
                                                <event.icon className={`w-5 h-5 ${event.colorClass}`} />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-slate-800 text-base truncate">{event.title}</h3>
                                                    {event.isExternal && <span className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-bold">יומן</span>}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 mt-1">
                                                    {event.subtitle && <span className="text-xs text-slate-500 font-medium truncate">{event.subtitle}</span>}
                                                    {event.location && (
                                                        <span className="flex items-center text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                                            <MapPin className="w-3 h-3 ml-0.5" /> {event.location}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {event.isManual && event.dayId && event.activityIndex !== undefined && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteActivity(event.dayId!, event.activityIndex!) }}
                                                        className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-colors"
                                                        title="מחק"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        onClick={() => {
                                            const [y, m, d] = activeDay.dateIso.split('-');
                                            setQuickAddModal({ isOpen: true, targetDate: `${d}/${m}/${y}` })
                                        }}
                                        className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 font-bold hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> הוסף פעילות נוספת
                                    </button>
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center text-center text-slate-400">
                                    <div className="bg-slate-100 p-4 rounded-full mb-4">
                                        <Moon className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-700">יום חופשי</h3>
                                    <p className="text-sm">אין פעילויות מתוכננות ליום זה</p>
                                    <button
                                        onClick={() => {
                                            const [y, m, d] = activeDay.dateIso.split('-');
                                            setQuickAddModal({ isOpen: true, targetDate: `${d}/${m}/${y}` })
                                        }}
                                        className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-all"
                                    >
                                        הוסף פעילות
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Add Modal */}
            {quickAddModal.isOpen && (
                <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
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
            )}

            {/* Transfer Modal */}
            {transferModal && (
                <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <form onSubmit={handleSaveTransfer} className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl relative">
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
            )}
        </div>
    );
};