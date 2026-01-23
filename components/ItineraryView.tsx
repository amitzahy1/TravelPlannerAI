import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Trip, ManualExpense } from '../types';
import {
    Calendar, MapPin, Plane, Car,
    Hotel, Utensils, Ticket, ShoppingBag, Plus, Sparkles, X,
    ArrowLeft, Edit2, BedDouble, Moon, ExternalLink, Map as MapIcon, Navigation, Trash2, DollarSign, User, ArrowDown, ChevronDown
} from 'lucide-react';

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
    externalLink?: string; // New field for maps
    // New fields for deletion
    isManual?: boolean;
    dayId?: string;
    activityIndex?: number;
}

interface DayPlan {
    dateIso: string; // YYYY-MM-DD for sorting
    displayDate: string; // "06 Aug"
    displayDayOfWeek: string; // "יום חמישי"
    locationContext: string; // "Bangkok", "Phuket", etc.
    events: TimelineEvent[];
    stats: { food: number, attr: number, flight: number, travel: number };
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
    const [quickAddModal, setQuickAddModal] = useState<{ isOpen: boolean, targetDate?: string }>({ isOpen: false });
    const [transferModal, setTransferModal] = useState<{ date: string, defaultTime: string } | null>(null);
    const [insights, setInsights] = useState<Insight[]>([]);

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
                    stats: { food: 0, attr: 0, flight: 0, travel: 0 },
                    hasHotel: false
                });
                loopDate.setDate(loopDate.getDate() + 1);
            }

            const addToDay = (dateStr: string, event: TimelineEvent) => {
                const d = parseDateString(dateStr);
                if (!d) return;
                const isoKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

                if (!dayMap.has(isoKey)) {
                    dayMap.set(isoKey, {
                        dateIso: isoKey,
                        displayDate: formatDateDisplay(d),
                        displayDayOfWeek: getDayOfWeek(d),
                        locationContext: '',
                        events: [],
                        stats: { food: 0, attr: 0, flight: 0, travel: 0 },
                        hasHotel: false
                    });
                }
                dayMap.get(isoKey)?.events.push(event);
            };

            // --- Ingest Data ---
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
                    travel: day.events.filter(e => e.type === 'travel').length
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
    }, [trip]);

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

            {/* 2. INSIGHTS */}
            {insights.length > 0 && (
                <div className="px-2">
                    <div className="flex items-center gap-2 mb-3 px-2">
                        <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">ההמלצות של העוזר האישי</h3>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
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

            {/* 3. VERTICAL TIMELINE FEED */}
            <div className="relative px-2 md:px-4 max-w-5xl mx-auto space-y-12">
                {timeline.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">טוען לו"ז...</div>
                ) : (
                    timeline.map((day, index) => {
                        // Try to generate default date for Quick Add if none parsed
                        const [y, m, d] = day.dateIso.split('-');
                        const targetDateFormatted = `${d}/${m}/${y}`;

                        return (
                            <div key={day.dateIso} className="relative group">

                                {/* Connecting Line (except last) */}
                                {index < timeline.length - 1 && (
                                    <div className="absolute top-[80px] bottom-[-48px] right-[28px] md:right-[32px] w-0.5 border-r-[2px] border-dashed border-slate-200 group-hover:border-blue-200 transition-colors z-0"></div>
                                )}

                                {/* Sticky Date Header */}
                                <div className="sticky top-20 z-30 mb-4 bg-slate-50/95 backdrop-blur-sm py-2">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-white border-2 border-slate-200 text-slate-700 w-14 h-14 md:w-16 md:h-16 rounded-2xl flex flex-col items-center justify-center shadow-sm z-10 group-hover:border-blue-400 group-hover:text-blue-600 transition-colors">
                                            <span className="text-xl md:text-2xl font-black leading-none">{day.displayDate.split(' ')[0]}</span>
                                            <span className="text-[10px] md:text-xs font-bold uppercase">{day.displayDate.split(' ')[1]}</span>
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">{day.displayDayOfWeek}</div>
                                            <h2 className="text-2xl md:text-3xl font-black text-slate-800">{day.locationContext || 'יום בטיול'}</h2>
                                        </div>
                                    </div>
                                </div>

                                {/* Content Card */}
                                <div className="mr-8 md:mr-10">
                                    {day.events.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {day.events.map((event, i) => (
                                                <div
                                                    key={`${event.id}-${i}`}
                                                    className={`p-5 rounded-[1.5rem] border shadow-sm transition-all hover:shadow-md hover:scale-[1.01] flex flex-col justify-between h-full min-h-[140px] relative overflow-hidden group/card ${event.bgClass} bg-white`}
                                                >
                                                    {/* Delete Button */}
                                                    {event.isManual && event.dayId && event.activityIndex !== undefined && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteActivity(event.dayId!, event.activityIndex!) }}
                                                            className="absolute top-3 left-3 p-1.5 bg-white/70 hover:bg-red-100 text-slate-300 hover:text-red-500 rounded-lg transition-colors z-20 backdrop-blur-sm opacity-0 group-hover/card:opacity-100"
                                                            title="מחק פעילות"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}

                                                    <div className="relative z-10 flex flex-col h-full">
                                                        <div className="flex justify-between items-start mb-2">
                                                            {event.time ? (
                                                                <span className="font-mono text-xs font-black bg-white/80 px-2 py-1 rounded-lg backdrop-blur-sm shadow-sm border border-black/5">
                                                                    {event.time}
                                                                </span>
                                                            ) : <div />}
                                                            <event.icon className={`w-5 h-5 ${event.colorClass}`} />
                                                        </div>

                                                        <h3 className="text-lg font-black text-slate-900 leading-tight mb-1">{event.title}</h3>
                                                        {event.subtitle && <p className="text-xs font-bold text-slate-500 mb-2">{event.subtitle}</p>}

                                                        <div className="mt-auto pt-3 flex items-center gap-2">
                                                            {event.location && (
                                                                <div className="flex items-center text-[10px] font-bold text-slate-500 bg-white/60 px-2 py-1 rounded-lg">
                                                                    <MapPin className="w-3 h-3 ml-1" /> {event.location}
                                                                </div>
                                                            )}
                                                            {event.price && (
                                                                <div className="flex items-center text-[10px] font-bold text-slate-500 bg-white/60 px-2 py-1 rounded-lg">
                                                                    <Ticket className="w-3 h-3 ml-1" /> {event.price}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Add Button Inside Grid */}
                                            <button
                                                onClick={() => setQuickAddModal({ isOpen: true, targetDate: targetDateFormatted })}
                                                className="border-2 border-dashed border-slate-200 rounded-[1.5rem] flex flex-col items-center justify-center p-6 text-slate-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50/50 transition-all min-h-[140px]"
                                            >
                                                <Plus className="w-8 h-8 mb-2" />
                                                <span className="font-bold text-sm">הוסף פעילות</span>
                                            </button>
                                        </div>
                                    ) : (
                                        /* Empty State for Day */
                                        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm flex flex-col items-center text-center">
                                            <div className="bg-slate-50 p-4 rounded-full mb-3"><Moon className="w-8 h-8 text-slate-300" /></div>
                                            <h3 className="text-xl font-black text-slate-700 mb-1">יום חופשי</h3>
                                            <div className="flex gap-3 mt-4">
                                                <button onClick={() => setQuickAddModal({ isOpen: true, targetDate: targetDateFormatted })} className="text-xs font-bold bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-700">הוסף פעילות</button>
                                                <button onClick={() => onSwitchTab && onSwitchTab('attractions')} className="text-xs font-bold bg-purple-50 text-purple-600 px-4 py-2 rounded-xl hover:bg-purple-100">מצא אטרקציה</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Quick Add Modal */}
            {quickAddModal.isOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
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

            {/* Transfer Modal - Copied Logic */}
            {transferModal && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
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