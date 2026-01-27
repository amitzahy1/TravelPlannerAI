import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Trip, HotelBooking, FlightSegment } from '../types';
import { Save, X, Plus, Trash2, Layout, Sparkles, Globe, UploadCloud, Download, Share2, Calendar, Plane, Hotel, MapPin, ArrowRight, ArrowLeft, Loader2, CalendarCheck, FileText, Image as ImageIcon, Menu, Users, LogOut } from 'lucide-react';
import { getAI, AI_MODEL, generateWithFallback, extractTripFromDoc } from '../services/aiService';
import { MagicDropZone } from './MagicDropZone';
import { ShareModal } from './ShareModal';
import { OnboardingModal } from './OnboardingModal';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { AlertTriangle, Calendar as CalIcon } from 'lucide-react';
// CALENDAR INTEGRATION REMOVED - Security Fix
// import { requestAccessToken } from '../services/googleAuthService';
// import { fetchCalendarEvents, mapEventsToTimeline } from '../services/calendarService';
import { CalendarDatePicker } from './CalendarDatePicker';

interface TripSettingsModalProps {
    data: Trip[];
    onSave: (newData: Trip[]) => void;
    onDeleteTrip: (tripId: string) => void;
    onLeaveTrip: (tripId: string) => void;
    onClose: () => void;
}

// Helper: Convert various date formats to YYYY-MM-DD for input
const toInputDate = (dateStr: string) => {
    if (!dateStr) return '';
    // Already ISO YYYY-MM-DD
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    // Handle DD/MM/YYYY
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    // Handle "06 Aug 2026" or similar text formats
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }
    return '';
};

// Helper: Input Component for DD/MM/YYYY
const DateInput: React.FC<{
    value: string, // ISO YYYY-MM-DD
    onChange: (isoDate: string) => void,
    className?: string,
    placeholder?: string,
    title?: string
}> = ({ value, onChange, className, placeholder, title }) => {
    const [showPicker, setShowPicker] = useState(false);

    const displayDate = useMemo(() => {
        if (!value) return placeholder || "בחר תאריך";
        if (value.includes('/')) return value;
        const [y, m, d] = value.split('-');
        if (y && m && d && y.length === 4) return `${d}/${m}/${y}`;
        return value;
    }, [value, placeholder]);

    return (
        <div className="relative w-full">
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowPicker(true); }}
                className={`${className} flex items-center justify-between text-right font-bold`}
            >
                <span>{displayDate}</span>
                <Calendar className="w-4 h-4 text-slate-400" />
            </button>

            {showPicker && (
                <CalendarDatePicker
                    value={value}
                    title={title}
                    onChange={onChange}
                    onClose={() => setShowPicker(false)}
                />
            )}
        </div>
    );
};

export const AdminView: React.FC<TripSettingsModalProps> = ({ data, onSave, onDeleteTrip, onLeaveTrip, onClose }) => {
    const [trips, setTrips] = useState<Trip[]>(data);
    const [activeTripId, setActiveTripId] = useState(data[0]?.id || '');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'logistics' | 'ai'>('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Sidebar State

    // Helper: Format for Display (e.g. "08 Aug")
    const formatDisplayDate = (iso: string) => {
        if (!iso) return '';
        const date = new Date(iso);
        if (isNaN(date.getTime())) return iso;
        return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(date);
    };

    // Auto-open wizard for new users (First Time Experience)
    useEffect(() => {
        const hasSeenWizard = localStorage.getItem('welcome_wizard_seen');
        // Only open if: Not loading, User has NO trips, and Has NOT definitely seen/dismissed it before
        if (!isSaving && trips.length === 0 && !hasSeenWizard) {
            setIsWizardOpen(true);
            localStorage.setItem('welcome_wizard_seen', 'true');
        }
    }, [isSaving, trips.length]);
    const importFileRef = useRef<HTMLInputElement>(null);

    // --- Derived State for Route Builder ---
    const [routeCities, setRouteCities] = useState<string[]>([]);
    const [newCityInput, setNewCityInput] = useState('');

    // --- Derived State for Date Range ---
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Sync with parent data changes
    useEffect(() => {
        setTrips(data);
        if (data.length > 0 && !data.find(t => t.id === activeTripId)) {
            setActiveTripId(data[0].id);
        }
    }, [data]);

    // When active trip changes, sync local form state
    const activeTrip = trips.find(t => t.id === activeTripId) || trips[0];

    useEffect(() => {
        if (activeTrip) {
            // Sync Route - Handle both ' - ' and ' & ' separators for backward compatibility
            if (activeTrip.destination) {
                // Split by ' - ' OR ' & ' to ensure separate chips
                setRouteCities(activeTrip.destination.split(/ - | & /).map(s => s.trim()).filter(Boolean));
            } else {
                setRouteCities([]);
            }

            // Sync Dates - Split by ' - ' to avoid breaking ISO date format
            if (activeTrip.dates && activeTrip.dates.includes(' - ')) {
                const parts = activeTrip.dates.split(' - ').map(s => s.trim());
                if (parts.length === 2) {
                    setStartDate(toInputDate(parts[0]));
                    setEndDate(toInputDate(parts[1]));
                }
            } else {
                setStartDate('');
                setEndDate('');
            }
        }
    }, [activeTripId, trips]);

    const handleUpdateTrip = (updates: Partial<Trip>) => {
        const newTrips = trips.map(t => t.id === activeTripId ? { ...t, ...updates } : t);
        setTrips(newTrips);
    };

    // --- Route Logic ---
    const addCity = () => {
        if (!newCityInput.trim()) return;
        const newRoute = [...routeCities, newCityInput.trim()];
        setRouteCities(newRoute);
        setNewCityInput('');
        handleUpdateTrip({ destination: newRoute.join(' - ') });
    };

    const removeCity = (index: number) => {
        const newRoute = routeCities.filter((_, i) => i !== index);
        setRouteCities(newRoute);
        handleUpdateTrip({ destination: newRoute.join(' - ') });
    };

    // --- Date Logic ---
    const handleDateChange = (type: 'start' | 'end', value: string) => {
        let newStart = startDate;
        let newEnd = endDate;

        if (type === 'start') {
            setStartDate(value);
            newStart = value;
        } else {
            setEndDate(value);
            newEnd = value;
        }

        if (newStart && newEnd) {
            const formatted = `${formatDisplayDate(newStart)} - ${formatDisplayDate(newEnd)}`;
            handleUpdateTrip({ dates: formatted });
        }
    };

    // --- Deletion Logic ---
    const handleDeleteTrip = async (e: React.MouseEvent, tripIdToDelete: string) => {
        e.stopPropagation();
        if (window.confirm("פעולה זו תמחק את הטיול ואת כל המידע שבו לצמיתות. האם להמשיך?")) {
            // Call the proper delete handler from App.tsx which uses deleteDoc on Firebase
            await onDeleteTrip(tripIdToDelete);

            // Update local UI state
            const newTrips = trips.filter(t => t.id !== tripIdToDelete);
            setTrips(newTrips);

            if (activeTripId === tripIdToDelete && newTrips.length > 0) {
                setActiveTripId(newTrips[0].id);
            }
        }
    };

    const handleDeleteFlightSegment = (indexToDelete: number) => {
        if (!activeTrip.flights?.segments) return;
        if (window.confirm("למחוק את מקטע הטיסה הזה?")) {
            const newSegments = activeTrip.flights.segments.filter((_, i) => i !== indexToDelete);
            handleUpdateTrip({ flights: { ...activeTrip.flights, segments: newSegments } });
        }
    };

    const handleUpdateFlightSegment = (index: number, field: keyof FlightSegment, value: string) => {
        const newSegments = [...(activeTrip.flights?.segments || [])];

        let finalValue = value;

        newSegments[index] = { ...newSegments[index], [field]: finalValue };
        handleUpdateTrip({ flights: { ...activeTrip.flights, segments: newSegments } });
    };

    const handleDeleteHotel = (hotelId: string) => {
        if (window.confirm("למחוק מלון זה מהרשימה?")) {
            const newHotels = activeTrip.hotels.filter(h => h.id !== hotelId);
            handleUpdateTrip({ hotels: newHotels });
        }
    };

    const handleUpdateHotel = (hotelId: string, field: keyof HotelBooking, value: any) => {
        const newHotels = activeTrip.hotels.map(h => h.id === hotelId ? { ...h, [field]: value } : h);
        handleUpdateTrip({ hotels: newHotels });
    };

    // --- Wizard & IO ---
    const handleCreateTrip = (newTrip: Trip) => {
        const updatedTrips = [...trips, newTrip];
        setTrips(updatedTrips);
        setActiveTripId(newTrip.id);
        setIsWizardOpen(false);
        onSave(updatedTrips);
    };

    const enrichHotelsWithAI = async (currentTrip: Trip): Promise<Trip> => {
        const needsEnrichment = currentTrip.hotels.some(h => !h.googleMapsUrl || !h.address || h.address.length < 5);

        if (!needsEnrichment) return currentTrip;

        try {
            const ai = getAI();
            const hotelsToEnrich = currentTrip.hotels.map(h => ({ id: h.id, name: h.name, knownAddress: h.address }));

            const prompt = `
          I have a trip to ${currentTrip.destination}.
          Here is a list of hotels: ${JSON.stringify(hotelsToEnrich)}.
          For each hotel, find the Official Name, Full Address, and a Google Maps URL.
          Return a JSON object with an array "hotels" containing { id, name, address, googleMapsUrl }.
          Only return valid JSON.
          `;

            const response = await generateWithFallback(
                ai,
                prompt,
                { responseMimeType: 'application/json' },
                'SMART'
            );

            const textContent = response.text;

            let result;
            try {
                result = JSON.parse(textContent || '{}');
            } catch (e) {
                const jsonMatch = textContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    result = JSON.parse(jsonMatch[0]);
                } else {
                    result = {};
                }
            }
            if (result.hotels && Array.isArray(result.hotels)) {
                const enrichedHotels = currentTrip.hotels.map(h => {
                    const enriched = result.hotels.find((e: any) => e.id === h.id);
                    if (enriched) {
                        return {
                            ...h,
                            name: enriched.name || h.name,
                            address: enriched.address || h.address,
                            googleMapsUrl: enriched.googleMapsUrl || h.googleMapsUrl
                        };
                    }
                    return h;
                });
                return { ...currentTrip, hotels: enrichedHotels };
            }
        } catch (e) {
            console.error("Hotel Enrichment Failed", e);
        }
        return currentTrip;
    };

    const handleSaveAndClose = async () => {
        setIsSaving(true);
        const enrichedTrip = await enrichHotelsWithAI(activeTrip);
        const newTrips = trips.map(t => t.id === activeTripId ? enrichedTrip : t);
        onSave(newTrips);
        setIsSaving(false);
        onClose();
    };

    const handleExportData = () => {
        const dataStr = JSON.stringify(trips, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `trip_backup_${activeTrip?.destination || 'all'}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportTrip = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (!json.id || !json.itinerary) { alert("קובץ לא תקין"); return; }
                const newTrip = { ...json, id: `imported-${Date.now()}`, name: `${json.name} (מיובא)` };
                const updatedTrips = [...trips, newTrip];
                setTrips(updatedTrips);
                setActiveTripId(newTrip.id);
                onSave(updatedTrips);
                alert("הטיול יובא בהצלחה!");
            } catch (err) { console.error(err); alert("שגיאה בקריאת הקובץ"); }
        };
        reader.readAsText(file);
        if (importFileRef.current) importFileRef.current.value = '';
    };

    // CALENDAR IMPORT REMOVED - Feature disabled to eliminate "Unverified App" security warning
    const handleImportFromGoogle = async () => {
        alert("יבוא מיומן Google הוסר לצורך אבטחה. הלו\"ז מנוהל ישירות באפליקציה.");
    };

    const handleSyncCalendar = () => {
        const icsContent: string[] = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Travel Planner Pro//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH'
        ];

        // Format Date to YYYYMMDDTHHMMSS
        const formatICSDate = (date: Date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0];
        };

        const addEvent = (summary: string, description: string, location: string, startDate: Date, endDate: Date, allDay = false) => {
            icsContent.push('BEGIN:VEVENT');
            icsContent.push(`UID:${Date.now()}-${Math.random().toString(36).substr(2, 9)}@travelplanner.app`);
            icsContent.push(`DTSTAMP:${formatICSDate(new Date())}Z`);
            if (allDay) {
                // For all day, value is DATE (YYYYMMDD)
                icsContent.push(`DTSTART;VALUE=DATE:${formatICSDate(startDate).substring(0, 8)}`);
                const nextDay = new Date(endDate);
                nextDay.setDate(nextDay.getDate() + 1);
                icsContent.push(`DTEND;VALUE=DATE:${formatICSDate(nextDay).substring(0, 8)}`);
            } else {
                icsContent.push(`DTSTART:${formatICSDate(startDate)}`);
                icsContent.push(`DTEND:${formatICSDate(endDate)}`);
            }
            icsContent.push(`SUMMARY:${summary}`);
            icsContent.push(`DESCRIPTION:${description}`);
            icsContent.push(`LOCATION:${location}`);
            icsContent.push('END:VEVENT');
        };

        const parseEventDate = (dateStr: string, timeStr: string = '00:00'): Date | null => {
            try {
                let d: Date | null = null;
                const cleanDate = dateStr?.trim();
                const cleanTime = timeStr?.trim();
                if (!cleanDate) return null;

                if (cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    d = new Date(`${cleanDate}T${cleanTime}:00`);
                } else if (cleanDate.includes('/')) {
                    const [day, month, year] = cleanDate.split('/');
                    d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                    const [hours, minutes] = cleanTime.split(':').map(Number);
                    d.setHours(hours || 0, minutes || 0);
                } else {
                    d = new Date(`${cleanDate} ${cleanTime}`);
                }
                return (d && !isNaN(d.getTime())) ? d : null;
            } catch (e) { return null; }
        };

        // 1. Flights
        activeTrip.flights?.segments?.forEach(seg => {
            const start = parseEventDate(seg.date, seg.departureTime);
            const end = parseEventDate(seg.date, seg.arrivalTime);
            if (start && end && end < start) {
                end.setDate(end.getDate() + 1);
            }
            if (start && end) {
                addEvent(
                    `✈️ טיסה ל${seg.toCity} (${seg.flightNumber})`,
                    `טיסה עם ${seg.airline}\nמספר טיסה: ${seg.flightNumber}\nמשך: ${seg.duration}\nPNR: ${activeTrip.flights.pnr}`,
                    `${seg.fromCity} Airport`,
                    start,
                    end
                );
            }
        });

        // 2. Hotels
        activeTrip.hotels?.forEach(hotel => {
            const checkIn = parseEventDate(hotel.checkInDate, '14:00');
            const checkOut = parseEventDate(hotel.checkOutDate, '11:00');

            if (checkIn) {
                const checkInEnd = new Date(checkIn);
                checkInEnd.setHours(15, 0);
                addEvent(`🏨 צ'ק-אין: ${hotel.name}`, `כתובת: ${hotel.address}\nאישור: ${hotel.confirmationCode || 'N/A'}`, hotel.address, checkIn, checkInEnd);
            }
            if (checkOut) {
                const checkOutStart = new Date(checkOut);
                checkOutStart.setHours(10, 0);
                addEvent(`🏨 צ'ק-אאוט: ${hotel.name}`, `כתובת: ${hotel.address}`, hotel.address, checkOutStart, checkOut);
            }
        });

        // 3. Itinerary
        activeTrip.itinerary?.forEach(day => {
            day.activities.forEach(act => {
                const timeMatch = act.match(/^(\d{1,2}:\d{2})\s*-?\s*(.*)/);
                const time = timeMatch ? timeMatch[1] : '09:00';
                const text = timeMatch ? timeMatch[2] : act;
                const date = parseEventDate(day.date, time);

                if (date) {
                    const end = new Date(date);
                    end.setHours(end.getHours() + 1);
                    addEvent(`📍 ${text}`, `פעילות מתוכננת`, activeTrip.destination, date, end, !timeMatch);
                }
            });
        });

        icsContent.push('END:VCALENDAR');

        const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', `trip_itinerary_${activeTrip?.destination || 'trip'}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAiUpdate = (updatedTripData: Trip) => {
        if (!activeTrip) return;
        const mergedTrip = {
            ...activeTrip,
            ...updatedTripData,
            documents: [...(activeTrip.documents || []), ...(updatedTripData.documents || [])].filter((v, i, a) => a.indexOf(v) === i),
            hotels: [...(activeTrip.hotels || []), ...(updatedTripData.hotels || [])],
        };

        handleUpdateTrip(mergedTrip);
        const newTrips = trips.map(t => t.id === activeTripId ? mergedTrip : t);
        onSave(newTrips);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-0 md:p-6 animate-fade-in" onClick={onClose}>
            <div className="w-full h-full md:max-w-6xl bg-white md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scale-in" onClick={(e) => e.stopPropagation()}>

                {/* MOBILE OVERLAY BACKDROP */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-slate-900/50 z-[105] md:hidden backdrop-blur-sm transition-opacity"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* SIDEBAR (List of Trips) - Drawer on Mobile, Column on Desktop */}
                <div className={`
                    fixed inset-y-0 right-0 z-[110] w-72 bg-slate-50 shadow-2xl transform transition-transform duration-300 ease-in-out
                    md:relative md:translate-x-0 md:w-64 md:shadow-none md:z-auto md:border-l border-slate-200 flex flex-col flex-shrink-0
                    ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
                `}>
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center md:block">
                        <div>
                            <h2 className="text-xl font-black text-slate-800">הטיולים שלי</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider hidden md:block">ניהול כל הטיולים</p>
                        </div>
                        <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X className="w-6 h-6" /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {trips.map(t => (
                            <div key={t.id} className="relative group">
                                <button
                                    onClick={() => setActiveTripId(t.id)}
                                    className={`w-full text-right p-3 pr-4 pl-10 rounded-xl transition-all font-bold flex items-center justify-between text-sm ${activeTripId === t.id
                                        ? 'bg-white shadow-md text-blue-600 border-2 border-blue-100'
                                        : 'text-slate-600 hover:bg-slate-100 border-2 border-transparent'
                                        }`}
                                >
                                    <span className="truncate">{t.name}</span>
                                    {activeTripId === t.id && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const isOwner = !t.isShared || t.sharing?.role === 'owner';
                                        if (window.confirm(isOwner ? 'האם למחוק את הטיול הזה לצמיתות?' : 'האם לצאת מהטיול המשותף?')) {
                                            isOwner ? onDeleteTrip(t.id) : onLeaveTrip(t.id);
                                        }
                                    }}
                                    className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20 ${(!t.isShared || t.sharing?.role === 'owner')
                                        ? 'text-slate-300 hover:text-red-500 hover:bg-red-50'
                                        : 'text-slate-300 hover:text-orange-500 hover:bg-orange-50'
                                        }`}
                                    title={(!t.isShared || t.sharing?.role === 'owner') ? "מחק טיול" : "צא מהטיול"}
                                >
                                    {(!t.isShared || t.sharing?.role === 'owner') ? <Trash2 className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsWizardOpen(true);
                            }}
                            className="relative z-10 w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold text-xs hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
                        >
                            <Plus className="w-4 h-4" /> טיול חדש
                        </button>
                    </div>

                    <div className="p-4 border-t border-slate-200">
                        <button onClick={() => setIsShareModalOpen(true)} className="w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-xs hover:bg-indigo-100 flex items-center justify-center gap-2 transition-colors">
                            <Share2 className="w-3.5 h-3.5" /> שיתוף וגיבוי
                        </button>
                    </div>
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">

                    {/* STICKY HEADER */}
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50">
                        <div className="flex items-center gap-4">
                            {/* Mobile Hamburger */}
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="md:hidden p-2 -mr-2 text-slate-500 hover:bg-slate-50 rounded-lg"
                            >
                                <Menu className="w-6 h-6" />
                            </button>

                            <div className="flex p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-[200px] md:max-w-none scrollbar-hide">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-sm md:text-base font-bold transition-all whitespace-nowrap ${activeTab === 'overview' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    סקירה
                                </button>
                                <button
                                    onClick={() => setActiveTab('logistics')}
                                    className={`px-6 py-2.5 rounded-lg text-base font-bold transition-all ${activeTab === 'logistics' ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    לוגיסטיקה
                                </button>
                                <button
                                    onClick={() => setActiveTab('ai')}
                                    className={`px-6 py-2.5 rounded-lg text-base font-bold transition-all ${activeTab === 'ai' ? 'bg-white shadow text-purple-700' : 'text-slate-400 hover:text-purple-500'}`}
                                >
                                    <Sparkles className="w-4 h-4 inline-block ml-1" /> AI Magic
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2 items-center">
                            {/* Collaborator Badge */}
                            {activeTrip?.isShared && (
                                <div className="hidden md:flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full mr-2 animate-fade-in" title="Shared Trip">
                                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                                    <span className="text-xs font-extrabold text-indigo-700">
                                        {(activeTrip.sharing?.collaborators?.length || 0) + 1} Editors
                                    </span>
                                </div>
                            )}
                            <button onClick={() => setIsShareModalOpen(true)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors md:hidden">
                                <Share2 className="w-5 h-5 text-slate-600" />
                            </button>

                            <button
                                onClick={handleSaveAndClose}
                                disabled={isSaving}
                                className={`px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2 ${isSaving ? 'opacity-70 cursor-wait' : ''}`}
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isSaving ? 'שומר ומעבד...' : 'שמור וסגור'}
                            </button>
                            <button onClick={onClose} className="hidden md:flex p-2 text-slate-300 hover:bg-slate-50 hover:text-slate-500 rounded-lg transition-colors"><X className="w-6 h-6" /></button>
                        </div>
                    </div>

                    {/* Content Scroll Area */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50">
                        <div className="max-w-7xl mx-auto">

                            {/* TAB: OVERVIEW */}
                            {activeTab === 'overview' && (
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in">

                                    {/* Trip Name & Basic Info - Full Width/Top */}
                                    <div className="md:col-span-12 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                        <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                            <span className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><Layout className="w-4 h-4" /></span> פרטים כלליים
                                        </h3>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-400 uppercase">שם הטיול</label>
                                            <input
                                                value={activeTrip?.name || ''}
                                                onChange={e => handleUpdateTrip({ name: e.target.value })}
                                                className="w-full text-xl font-bold bg-slate-50 border-b-2 border-slate-200 focus:border-blue-500 px-4 py-3 rounded-lg outline-none transition-colors"
                                                placeholder="למשל: טיול משפחתי לתאילנד"
                                            />
                                        </div>
                                    </div>

                                    {/* Dates - 6 Columns */}
                                    <div className="md:col-span-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                                        <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                            <span className="bg-purple-100 p-1.5 rounded-lg text-purple-600"><Calendar className="w-4 h-4" /></span> תאריכים
                                        </h3>
                                        <div className="flex gap-4 mb-auto">
                                            <div className="flex-1 space-y-1">
                                                <label className="text-xs font-bold text-slate-400 uppercase">התחלה</label>
                                                <DateInput
                                                    value={startDate}
                                                    onChange={iso => handleDateChange('start', iso)}
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-purple-500 text-center"
                                                    placeholder="DD/MM/YYYY"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <label className="text-xs font-bold text-slate-400 uppercase">סיום</label>
                                                <DateInput
                                                    value={endDate}
                                                    onChange={iso => handleDateChange('end', iso)}
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-purple-500 text-center"
                                                    placeholder="DD/MM/YYYY"
                                                />
                                            </div>
                                        </div>
                                        <div className="mt-4 p-3 bg-purple-50 rounded-xl text-center text-sm font-bold text-purple-700 border border-purple-100">
                                            {startDate && endDate ? `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}` : 'טרם נבחר טווח תאריכים'}
                                        </div>
                                    </div>

                                    {/* Route - 6 Columns */}
                                    <div className="md:col-span-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                                        <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                            <span className="bg-orange-100 p-1.5 rounded-lg text-orange-600"><MapPin className="w-4 h-4" /></span> מסלול (ערים)
                                        </h3>
                                        <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
                                            {routeCities.map((city, idx) => (
                                                <div key={idx} className="bg-white border text-sm border-slate-200 px-3 py-1.5 rounded-full font-bold text-slate-700 shadow-sm flex items-center gap-2 animate-scale-in">
                                                    {city}
                                                    <button onClick={() => removeCity(idx)} className="text-slate-300 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                            ))}
                                            {routeCities.length === 0 && <span className="text-slate-400 text-sm italic py-1">עדיין לא הוגדרו יעדים...</span>}
                                        </div>
                                        <div className="flex gap-2 mt-auto">
                                            <div className="relative flex-1">
                                                <input
                                                    value={newCityInput}
                                                    onChange={e => setNewCityInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && addCity()}
                                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-orange-500 pr-16"
                                                    placeholder="הוסף עיר..."
                                                />
                                            </div>
                                            <button onClick={addCity} className="p-3 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 font-bold transition-colors"><Plus className="w-5 h-5" /></button>
                                        </div>
                                    </div>

                                    {/* Danger Zone - Full Width (Bottom) */}
                                    {(!activeTrip?.isShared || activeTrip.sharing?.role === 'owner') && (
                                        <div className="md:col-span-12 mt-4">
                                            <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl opacity-60 hover:opacity-100 transition-opacity flex justify-between items-center group">
                                                <div className="text-xs text-red-800 font-medium px-2">אזור מסוכן</div>
                                                <button
                                                    onClick={(e) => handleDeleteTrip(e, activeTrip?.id || '')}
                                                    className="px-4 py-2 bg-white text-red-500 font-bold text-xs rounded-lg border border-red-100 hover:bg-red-50 hover:border-red-200 transition-all flex items-center gap-2 shadow-sm"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> מחיקת טיול לצמיתות
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB: LOGISTICS */}
                            {activeTab === 'logistics' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in items-start">

                                    {/* Flights - Column 1 */}
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                                <span className="bg-sky-100 p-1.5 rounded-lg text-sky-600"><Plane className="w-4 h-4" /></span> טיסות
                                            </h3>
                                            <button
                                                onClick={() => activeTrip && handleUpdateTrip({ flights: { ...activeTrip.flights, segments: [...(activeTrip.flights?.segments || []), { flightNumber: '', from: '', to: '', date: '', departureTime: '', arrivalTime: '', airline: '', pnr: '' }] } })}
                                                className="text-xs font-bold bg-sky-50 text-sky-600 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-colors flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> הוסף טיסה
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {(activeTrip?.flights?.segments || []).map((seg, idx) => (
                                                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group hover:shadow-md transition-shadow">
                                                    <button onClick={() => handleDeleteFlightSegment(idx)} className="absolute top-2 left-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                                    <div className="flex gap-3 items-center mb-3 pr-2">
                                                        <input className="w-14 text-center font-black bg-white rounded-lg border border-slate-200 py-1.5 uppercase text-sm focus:border-sky-500 outline-none" value={seg.fromCode} onChange={(e) => handleUpdateFlightSegment(idx, 'fromCode', e.target.value)} placeholder="TLV" />
                                                        <Plane className="w-4 h-4 text-slate-300 rotate-90 shrink-0" />
                                                        <input className="w-14 text-center font-black bg-white rounded-lg border border-slate-200 py-1.5 uppercase text-sm focus:border-sky-500 outline-none" value={seg.toCode} onChange={(e) => handleUpdateFlightSegment(idx, 'toCode', e.target.value)} placeholder="JFK" />
                                                        <input className="flex-1 font-medium bg-transparent border-b border-transparent focus:border-slate-300 outline-none text-sm px-2 text-left rtl:text-right" value={seg.flightNumber} onChange={(e) => handleUpdateFlightSegment(idx, 'flightNumber', e.target.value)} placeholder="מספר טיסה" />
                                                    </div>
                                                    <div className="flex gap-2 text-xs">
                                                        <DateInput className="bg-white border border-slate-200 rounded px-2 py-1.5 flex-1" value={seg.date} onChange={(iso) => handleUpdateFlightSegment(idx, 'date', iso)} placeholder="תאריך" />
                                                        <input className="w-16 bg-white border border-slate-200 rounded px-2 py-1.5 text-center direction-ltr" value={seg.departureTime} onChange={(e) => handleUpdateFlightSegment(idx, 'departureTime', e.target.value)} placeholder="14:00" />
                                                        <span className="self-center text-slate-300">-</span>
                                                        <input className="w-16 bg-white border border-slate-200 rounded px-2 py-1.5 text-center direction-ltr" value={seg.arrivalTime} onChange={(e) => handleUpdateFlightSegment(idx, 'arrivalTime', e.target.value)} placeholder="19:00" />
                                                    </div>
                                                </div>
                                            ))}
                                            {(!activeTrip?.flights?.segments?.length) && (
                                                <div className="text-center py-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                                                    <Plane className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                                    <div className="text-slate-400 text-sm font-medium">אין טיסות ברשימה</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Hotels - Column 2 */}
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                                    <span className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600"><Hotel className="w-4 h-4" /></span> מלונות
                                                </h3>
                                                {/* AI Indicator for User Feedback */}
                                                {isSaving && <span className="text-[10px] font-bold text-purple-600 animate-pulse bg-purple-50 px-2 py-0.5 rounded-full">AI Enriching...</span>}
                                            </div>
                                            <button
                                                onClick={() => activeTrip && handleUpdateTrip({ hotels: [...activeTrip.hotels, { id: `h-${Date.now()}`, name: 'מלון חדש', address: '', checkInDate: '', checkOutDate: '', nights: 0 }] })}
                                                className="text-xs font-bold bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> הוסף מלון
                                            </button>
                                        </div>
                                        <div className="space-y-4">
                                            {(activeTrip?.hotels || []).map((h, idx) => (
                                                <div key={h.id || idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group hover:shadow-md transition-shadow">
                                                    <button onClick={() => handleDeleteHotel(h.id)} className="absolute top-2 left-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                                    <div className="space-y-3">
                                                        <input
                                                            className="w-full font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-slate-300 outline-none placeholder:font-normal"
                                                            value={h.name}
                                                            onChange={(e) => handleUpdateHotel(h.id, 'name', e.target.value)}
                                                            placeholder="שם המלון..."
                                                        />
                                                        <div className="flex items-center gap-2 text-slate-500 text-sm bg-white p-2 rounded-lg border border-slate-100">
                                                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                                                            <input
                                                                className="flex-1 bg-transparent border-none outline-none text-xs w-full"
                                                                value={h.address}
                                                                onChange={(e) => handleUpdateHotel(h.id, 'address', e.target.value)}
                                                                placeholder="כתובת מלאה (לחיפוש ע״י AI)"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Check-in</label>
                                                                <DateInput className="w-full text-xs font-bold outline-none" value={h.checkInDate} onChange={(iso) => handleUpdateHotel(h.id, 'checkInDate', iso)} />
                                                            </div>
                                                            <div className="bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm">
                                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Check-out</label>
                                                                <DateInput className="w-full text-xs font-bold outline-none" value={h.checkOutDate} onChange={(iso) => handleUpdateHotel(h.id, 'checkOutDate', iso)} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!activeTrip?.hotels?.length) && (
                                                <div className="text-center py-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                                                    <Hotel className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                                    <div className="text-slate-400 text-sm font-medium">אין מלונות ברשימה</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: AI MAGIC */}
                            {activeTab === 'ai' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-8 text-white text-center">
                                        <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-200" />
                                        <h3 className="text-2xl font-black mb-2">Magic Import</h3>
                                        <p className="text-purple-100 mb-6 font-medium">גרור לכאן קבצי PDF של טיסות, מלונות או כרטיסים וה-AI יסדר אותם בטיול.</p>
                                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                                            <MagicDropZone activeTrip={activeTrip} onUpdate={handleAiUpdate} compact={false} />
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>

                {/* Modals */}
                {isShareModalOpen && (
                    <ShareModal
                        trip={activeTrip}
                        onClose={() => setIsShareModalOpen(false)}
                        onUpdateTrip={(updatedTrip) => {
                            const newTrips = trips.map(t => t.id === activeTripId ? updatedTrip : t);
                            setTrips(newTrips);
                            onSave(newTrips);
                        }}
                    />
                )}

                {/* New File-First Onboarding Modal */}
                {isWizardOpen && (
                    <OnboardingModal
                        startOpen={true}
                        onClose={() => setIsWizardOpen(false)}
                        onImportTrip={(newTrip) => {
                            const updatedTrips = [...trips, newTrip];
                            setTrips(updatedTrips);
                            onSave(updatedTrips);
                            setActiveTripId(newTrip.id);
                            setIsWizardOpen(false);
                        }}
                        // Maintain legacy generic create support if needed, but onImportTrip handles the new flow
                        onCreateNew={() => {
                            // Fallback for "Manual" creation if the user clicked "Skip" in the modal
                            // We can either let the modal handle the empty trip creation or trigger a simple default here.
                            // The OnboardingModal's "handleLegacyCreate" logic actually calls onCreateNew if provided,
                            // or we can make OnboardingModal return a blank trip via onImportTrip.
                            // Current OnboardingModal implementation implementation calls onImportTrip with formatted data.
                            const newTrip: Trip = {
                                id: crypto.randomUUID(),
                                name: "New Trip",
                                dates: "",
                                destination: "",
                                coverImage: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
                                flights: { passengerName: "", pnr: "", segments: [] },
                                hotels: [],
                                restaurants: [],
                                attractions: [],
                                itinerary: [],
                                documents: [],
                                secureNotes: [],
                                isShared: false
                            };
                            const updatedTrips = [...trips, newTrip];
                            setTrips(updatedTrips);
                            onSave(updatedTrips);
                            setActiveTripId(newTrip.id);
                            setIsWizardOpen(false);
                        }}
                    />
                )}
            </div>
        </div>
    );
};
// Removed Legacy TripWizard Component