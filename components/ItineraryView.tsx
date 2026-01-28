import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Trip, DayPlan, TimelineEvent, TimelineEventType } from '../types';
import {
    Calendar, MapPin, Plane, Car,
    Hotel, Utensils, Ticket, Plus, Sparkles, X,
    Edit2, Moon, ChevronLeft
} from 'lucide-react';
import { getCityTheme } from '../utils/cityColors';

// --- Helper Functions ---
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

const formatDateDisplay = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(date);
};

const getDayOfWeek = (date: Date) => {
    const days = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
    return days[date.getDay()];
};

export const ItineraryView: React.FC<{
    trip: Trip,
    onUpdateTrip: (updatedTrip: Trip) => void,
    onSwitchTab?: (tab: string) => void
}> = ({ trip, onUpdateTrip, onSwitchTab }) => {

    const [timeline, setTimeline] = useState<DayPlan[]>([]);
    const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);
    const [quickAddModal, setQuickAddModal] = useState<{ isOpen: boolean, targetDate?: string }>({ isOpen: false });

    // Title Generation Logic
    const generateDayTitle = (day: DayPlan, trip: Trip, dayIndex: number, totalDays: number): string => {
        const events = day.events;
        const flightEvents = events.filter(e => e.type === 'flight');

        if (flightEvents.length > 0) {
            // Collect all unique destinations
            const destinations = new Set<string>();
            flightEvents.forEach(f => {
                const destMatch = f.title?.match(/טיסה ל(.+)/);
                if (destMatch && destMatch[1]) destinations.add(destMatch[1].trim());
            });

            if (destinations.size > 0) {
                return `טיסה ל${Array.from(destinations).join(', ')}`;
            }
            return 'יום טיסה';
        }

        const hotelCheckin = events.find(e => e.type === 'hotel_checkin');
        if (hotelCheckin) {
            const hotelMatch = hotelCheckin.title?.match(/Check-in: (.+)/);
            return hotelMatch && hotelMatch[1] ? `הגעה למלון` : (day.hasHotel ? `צ'ק-אין` : 'מלון');
        }
        // Fallback to location context if no major event
        return day.locationContext || trip.destinationEnglish || trip.destination;
    };

    useEffect(() => {
        const generateTimeline = () => {
            let startDate = new Date();
            startDate.setHours(12, 0, 0, 0);
            let endDate = new Date();
            endDate.setDate(startDate.getDate() + 7);
            endDate.setHours(12, 0, 0, 0);

            if (trip.dates) {
                const rangeParts = trip.dates.split(' - ').map(s => s.trim());
                if (rangeParts.length === 2) {
                    const s = parseDateString(rangeParts[0]);
                    const e = parseDateString(rangeParts[1]);
                    if (s && e) { startDate = s; endDate = e; }
                }
            }

            const dayMap = new Map<string, DayPlan>();
            const loopDate = new Date(startDate);

            // Default initialization
            while (loopDate <= endDate) {
                const isoDate = `${loopDate.getFullYear()}-${(loopDate.getMonth() + 1).toString().padStart(2, '0')}-${loopDate.getDate().toString().padStart(2, '0')}`;
                dayMap.set(isoDate, {
                    dateIso: isoDate,
                    displayDate: formatDateDisplay(loopDate),
                    displayDayOfWeek: getDayOfWeek(loopDate),
                    locationContext: '',
                    events: [],
                    stats: { food: 0, attr: 0, flight: 0, travel: 0, hotel: 0 },
                    hasHotel: false,
                    theme: getCityTheme('') // Placeholder, will be updated in Second Pass
                });
                loopDate.setDate(loopDate.getDate() + 1);
            }

            const addToDay = (dateStr: string, event: TimelineEvent) => {
                const d = parseDateString(dateStr);
                if (!d) return;
                const isoKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
                if (dayMap.has(isoKey)) dayMap.get(isoKey)?.events.push(event);
            };

            // --- Ingest Data ---
            trip.flights?.segments?.forEach(seg => {
                addToDay(seg.date, {
                    id: `flight-dep-${seg.flightNumber}`, type: 'flight', time: seg.departureTime,
                    title: `טיסה ל${seg.toCity || seg.toCode || 'יעד'}`,
                    subtitle: `${seg.airline} ${seg.flightNumber}`,
                    location: `${seg.fromCode} ➔ ${seg.toCode}`,
                    icon: Plane,
                    colorClass: 'text-blue-600',
                    bgClass: 'bg-blue-50'
                });
            });

            trip.hotels?.forEach(hotel => {
                addToDay(hotel.checkInDate, {
                    id: `hotel-in-${hotel.id}`, type: 'hotel_checkin', time: '14:00',
                    title: `Check-in: ${hotel.name}`, location: hotel.address, icon: Hotel, colorClass: 'text-indigo-600', bgClass: 'bg-indigo-50'
                });
                addToDay(hotel.checkOutDate, {
                    id: `hotel-out-${hotel.id}`, type: 'hotel_checkout', time: '11:00',
                    title: `Check-out: ${hotel.name}`, icon: Hotel, colorClass: 'text-slate-500', bgClass: 'bg-slate-50'
                });
            });

            trip.restaurants?.forEach(cat => cat.restaurants.forEach(res => {
                if (res.reservationDate) {
                    addToDay(res.reservationDate, {
                        id: res.id, type: 'food', time: res.reservationTime || '20:00',
                        title: res.name, subtitle: (res as any).categoryTitle, location: res.location, icon: Utensils, colorClass: 'text-orange-600', bgClass: 'bg-orange-50'
                    });
                }
            }));

            trip.attractions?.forEach(cat => cat.attractions.forEach(attr => {
                if (attr.scheduledDate) {
                    addToDay(attr.scheduledDate, {
                        id: attr.id, type: 'attraction', time: attr.scheduledTime || '10:00',
                        title: attr.name, price: attr.price, location: attr.location, icon: Ticket, colorClass: 'text-purple-600', bgClass: 'bg-purple-50'
                    });
                }
            }));

            trip.itinerary?.forEach(day => {
                day.activities.forEach((act, idx) => {
                    const timeMatch = act.match(/^(\d{1,2}:\d{2})\s*-?\s*(.*)/);
                    const time = timeMatch ? timeMatch[1] : '';
                    const text = timeMatch ? timeMatch[2] : act;
                    let type: TimelineEventType = 'activity';
                    let icon = Sparkles; let color = 'text-emerald-600'; let bg = 'bg-emerald-50';
                    const textLower = text.toLowerCase();
                    if (textLower.includes('טיסה')) { type = 'flight'; icon = Plane; color = 'text-blue-600'; bg = 'bg-blue-50'; }
                    else if (textLower.includes('הסעה')) { type = 'travel'; icon = Car; color = 'text-gray-600'; bg = 'bg-gray-50'; }
                    addToDay(day.date, {
                        id: `manual-${day.id}-${idx}`, type, time, title: text, icon, colorClass: color, bgClass: bg, isManual: true, dayId: day.id, activityIndex: idx
                    });
                });
            });

            const sortedTimeline = Array.from(dayMap.values()).sort((a, b) => a.dateIso.localeCompare(b.dateIso));

            // --- SECOND PASS: Context & Theme (THE FIX) ---
            // 1. Initialize with trip main destination to avoid "White/Empty" start
            let currentCity = trip.destinationEnglish || trip.destination || 'Start';
            let currentHotelName = '';

            sortedTimeline.forEach((day, index) => {
                day.events.sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

                // Update context based on specific events
                const flight = day.events.find(e => e.type === 'flight');
                if (flight) {
                    const toCity = flight.title.replace('טיסה ל', '').trim();
                    if (toCity) currentCity = toCity;
                    currentHotelName = ''; // Reset hotel on flight day usually
                }

                const checkIn = day.events.find(e => e.type === 'hotel_checkin');
                if (checkIn) {
                    const nameMatch = checkIn.title.match(/Check-in: (.+)/);
                    if (nameMatch) currentHotelName = nameMatch[1];
                }

                const checkOut = day.events.find(e => e.type === 'hotel_checkout');
                if (checkOut) currentHotelName = '';

                // Apply persistent context
                day.locationContext = currentCity;
                day.hasHotel = !!currentHotelName;

                // Ensure theme is never empty/white. 
                // getCityTheme returns a color based on the string.
                day.theme = getCityTheme(currentCity);

                // Title Logic
                const autoTitle = generateDayTitle(day, trip, index, sortedTimeline.length);
                if (day.events.length === 0 && currentHotelName) {
                    day.locationContext = `${currentCity}`;
                } else if (autoTitle && autoTitle !== 'Start') {
                    day.locationContext = autoTitle;
                }

                day.stats = {
                    food: day.events.filter(e => e.type === 'food').length,
                    attr: day.events.filter(e => e.type === 'attraction').length,
                    flight: day.events.filter(e => e.type === 'flight').length,
                    travel: day.events.filter(e => e.type === 'travel').length,
                    hotel: day.events.filter(e => e.type === 'hotel_checkin').length
                };
            });

            setTimeline(sortedTimeline);
        };

        generateTimeline();
    }, [trip]);

    const handleManualAdd = (text: string) => {
        const targetDateStr = quickAddModal.targetDate;
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
            if (day.id === dayId) return { ...day, activities: day.activities.filter((_, i) => i !== index) };
            return day;
        });
        onUpdateTrip({ ...trip, itinerary: newItinerary });
    };

    const handleChangeCover = () => {
        const url = prompt("הכנס קישור לתמונה חדשה:");
        if (url) onUpdateTrip({ ...trip, coverImage: url });
    };

    // --- Stats Calculation ---
    const tripStats = useMemo(() => {
        const flights = trip.flights?.segments?.length || 0;
        const hotels = trip.hotels?.length || 0;
        const attractions = trip.attractions?.reduce((acc, cat) => acc + cat.attractions.length, 0) || 0;
        const food = trip.restaurants?.reduce((acc, cat) => acc + cat.restaurants.length, 0) || 0;
        return { flights, hotels, attractions, food };
    }, [trip]);

    const activeDay = useMemo(() => timeline.find(d => d.dateIso === selectedDayIso), [timeline, selectedDayIso]);

    return (
        <div className="space-y-8 animate-fade-in pb-24">
            {/* HERO SECTION */}
            <div className="relative h-[220px] mx-1 group">
                <div className="absolute inset-0 rounded-[2rem] overflow-hidden shadow-xl z-0">
                    <img src={trip.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80'} className="w-full h-full object-cover" alt="Cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>

                    {/* Edit Cover Button */}
                    <button onClick={handleChangeCover} className="absolute top-4 right-4 p-2 bg-black/40 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-black/60"><Edit2 className="w-4 h-4" /></button>

                    {/* STATS WIDGETS (Interactive & Large) */}
                    <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 max-w-[70%]">
                        {tripStats.flights > 0 && (
                            <button onClick={() => onSwitchTab && onSwitchTab('flights')} className="flex items-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-black/50 backdrop-blur-md border border-white/10 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg">
                                <Plane className="w-4 h-4 text-blue-300 transform -rotate-45" />
                                <span className="text-sm drop-shadow-md">{tripStats.flights}</span>
                            </button>
                        )}
                        {tripStats.hotels > 0 && (
                            <button onClick={() => onSwitchTab && onSwitchTab('hotels')} className="flex items-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-black/50 backdrop-blur-md border border-white/10 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg">
                                <Hotel className="w-4 h-4 text-indigo-300" />
                                <span className="text-sm drop-shadow-md">{tripStats.hotels}</span>
                            </button>
                        )}
                        {tripStats.attractions > 0 && (
                            <button onClick={() => onSwitchTab && onSwitchTab('attractions')} className="flex items-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-black/50 backdrop-blur-md border border-white/10 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg">
                                <Ticket className="w-4 h-4 text-purple-300" />
                                <span className="text-sm drop-shadow-md">{tripStats.attractions}</span>
                            </button>
                        )}
                        {tripStats.food > 0 && (
                            <button onClick={() => onSwitchTab && onSwitchTab('restaurants')} className="flex items-center gap-2 px-3 py-1.5 bg-black/40 hover:bg-black/50 backdrop-blur-md border border-white/10 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-lg">
                                <Utensils className="w-4 h-4 text-orange-300" />
                                <span className="text-sm drop-shadow-md">{tripStats.food}</span>
                            </button>
                        )}
                    </div>
                </div>
                <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 pointer-events-none">
                    <div className="space-y-1 max-w-xl pointer-events-auto text-white">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full w-fit border border-white/20"><Calendar className="w-3.5 h-3.5" /> {trip.dates}</div>
                        <h1 className="text-4xl font-black drop-shadow-md">{trip.name}</h1>
                        <div className="flex items-center gap-2 text-lg font-medium opacity-90"><MapPin className="w-4 h-4 text-blue-400" /> {trip.destination}</div>
                    </div>
                </div>
            </div>

            {/* TIMELINE GRID */}
            <div className="px-1 w-full space-y-6">
                {timeline.length === 0 ? <div className="text-center py-20 text-slate-400">טוען לו"ז...</div> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {timeline.map((day, index) => {
                            const dayNumber = index + 1;
                            const isLastDay = index === timeline.length - 1;

                            // Determine Header Icon Priority
                            // 1. Flight (Most important)
                            // 2. Hotel (If staying/check-in)
                            // 3. Default (Pin/Empty)
                            const hasFlight = day.events.some(e => e.type === 'flight');
                            const hasHotel = day.hasHotel && !day.events.some(e => e.type === 'hotel_checkout');

                            let HeaderIcon = MapPin; // Default
                            if (hasFlight) HeaderIcon = Plane;
                            else if (hasHotel) HeaderIcon = Hotel;

                            return (
                                <div
                                    key={day.dateIso}
                                    onClick={() => setSelectedDayIso(day.dateIso)}
                                    className={`bg-white border rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-visible group flex flex-col h-[260px] relative
                                        ${day.theme.border} hover:border-opacity-100 border-opacity-60`}
                                >
                                    {!isLastDay && <div className="hidden xl:block absolute -left-5 top-1/2 -translate-y-1/2 z-20 text-slate-300"><div className="bg-slate-50/50 p-1 rounded-full"><ChevronLeft className="w-5 h-5 stroke-[2.5] text-slate-300" /></div></div>}

                                    <div className="absolute -top-2 -right-2 bg-slate-800 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md z-30 opacity-0 group-hover:opacity-100 transition-opacity">DAY {dayNumber.toString().padStart(2, '0')}</div>

                                    {/* --- UNIFIED HEADER (Standardized Design) --- */}
                                    <div className={`p-3 border-b flex items-center justify-between transition-colors ${day.theme.bg} ${day.theme.border}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`min-w-[48px] h-10 px-2 rounded-xl flex flex-col items-center justify-center shadow-sm border ${day.theme.badge} ${day.theme.border}`}>
                                                <span className="text-xs font-black leading-none whitespace-nowrap">{day.displayDate}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <div className={`text-[10px] font-bold uppercase tracking-widest leading-none mb-1 truncate ${day.theme.textLight}`}>
                                                    {day.displayDayOfWeek}
                                                </div>
                                                <h3 className={`font-black text-sm leading-tight line-clamp-2 ${day.theme.text}`}>
                                                    {day.locationContext}
                                                </h3>
                                            </div>
                                        </div>

                                        {/* Status Icon (Top Left in RTL / Top Right visually) */}
                                        <div className={`p-1.5 rounded-lg bg-white/60 ${day.theme.icon}`}>
                                            <HeaderIcon className="w-3.5 h-3.5" />
                                        </div>
                                    </div>

                                    {/* EVENTS LIST (Clean Rows Only) */}
                                    <div className="p-3 flex-grow overflow-y-auto scrollbar-hide relative bg-white">
                                        {day.events.length > 0 ? (
                                            <div className="space-y-1.5 relative z-10">
                                                {day.events.map((event, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 w-full py-1 group/item">
                                                        {/* Time Column */}
                                                        <span className="text-[10px] font-mono font-bold opacity-40 min-w-[32px] group-hover/item:opacity-70 transition-opacity">
                                                            {event.time || "--:--"}
                                                        </span>

                                                        {/* Icon Badge */}
                                                        <div className={`p-1.5 rounded-full ${event.bgClass} flex-shrink-0`}>
                                                            <event.icon className={`w-3.5 h-3.5 ${event.colorClass}`} />
                                                        </div>

                                                        {/* Text Info */}
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <span className="text-xs font-bold text-slate-700 truncate leading-tight opacity-90">
                                                                {event.title}
                                                            </span>
                                                            {event.subtitle && (
                                                                <span className="text-[10px] text-slate-400 truncate leading-tight">
                                                                    {event.subtitle}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
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
                )}
            </div>

            {/* Day Detail Modal */}
            {selectedDayIso && activeDay && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedDayIso(null)}>
                    <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                        <div className={`border-b p-5 flex items-center justify-between flex-shrink-0 ${activeDay.theme.bg} ${activeDay.theme.border}`}>
                            <div className="flex items-center gap-3">
                                <div className={`min-w-[56px] h-12 px-2 rounded-xl flex flex-col items-center justify-center font-bold text-sm border shadow-sm ${activeDay.theme.badge} ${activeDay.theme.border}`}>
                                    {activeDay.displayDate}
                                </div>
                                <div>
                                    <div className={`text-xs font-bold uppercase tracking-wider ${activeDay.theme.textLight}`}>{activeDay.displayDayOfWeek}</div>
                                    <h2 className={`text-lg font-black ${activeDay.theme.text}`}>{activeDay.locationContext}</h2>
                                </div>
                            </div>
                            <button onClick={() => setSelectedDayIso(null)} className="p-2 bg-white/50 hover:bg-white rounded-lg transition-colors"><X className={`w-5 h-5 ${activeDay.theme.icon}`} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50 scrollbar-hide">
                            {activeDay.events.map((event, i) => (
                                <div key={i} className="flex gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm items-center">
                                    <span className="text-xs font-bold text-slate-400 font-mono min-w-[40px]">{event.time}</span>
                                    <div className={`p-2 rounded-full ${event.bgClass} flex-shrink-0`}>
                                        <event.icon className={`w-4 h-4 ${event.colorClass}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 text-sm truncate">{event.title}</h3>
                                        <div className="text-xs text-slate-500 truncate">{event.subtitle || event.location}</div>
                                    </div>
                                    {event.isManual && <button onClick={() => handleDeleteActivity(event.dayId!, event.activityIndex!)} className="text-red-400 text-xs px-2">מחק</button>}
                                </div>
                            ))}
                            <button onClick={() => { const [y, m, d] = activeDay.dateIso.split('-'); setQuickAddModal({ isOpen: true, targetDate: `${d}/${m}/${y}` }) }} className="w-full py-3 mt-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-bold hover:border-blue-300 hover:text-blue-500 transition-all flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" /> הוספה מהירה</button>
                        </div>
                    </div>
                </div>, document.body
            )}

            {/* Quick Add Modal */}
            {quickAddModal.isOpen && createPortal(
                <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4" onClick={() => setQuickAddModal({ isOpen: false })}>
                    <div className="bg-white rounded-3xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4">הוספה ל-{quickAddModal.targetDate}</h3>
                        <input id="qa-text" className="w-full p-3 bg-slate-50 border rounded-xl mb-4" placeholder="מה בתוכנית?" autoFocus />
                        <div className="flex gap-2 mb-4">
                            <input type="time" id="qa-time" defaultValue="10:00" className="p-3 bg-slate-50 border rounded-xl" />
                        </div>
                        <button onClick={() => {
                            const val = (document.getElementById('qa-text') as HTMLInputElement).value;
                            const time = (document.getElementById('qa-time') as HTMLInputElement).value;
                            if (val) handleManualAdd(`${time} ${val}`)
                        }} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">שמור</button>
                    </div>
                </div>, document.body
            )}
        </div>
    );
};