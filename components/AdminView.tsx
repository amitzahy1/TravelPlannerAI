import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Trip, HotelBooking, FlightSegment } from '../types';
import { Save, X, Plus, Trash2, Layout, Sparkles, Globe, UploadCloud, Download, Share2, Calendar, Plane, Hotel, MapPin, ArrowRight, ArrowLeft, Loader2, CalendarCheck, FileText, Image as ImageIcon, Menu, Users, LogOut, ChevronDown, Terminal } from 'lucide-react';
import { getAI, generateWithFallback } from '../services/aiService';
import { MagicDropZone } from './MagicDropZone';
import { ShareModal } from './ShareModal';
import { SystemLogs } from './SystemLogs';

import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { AlertTriangle, Calendar as CalIcon } from 'lucide-react';
// CALENDAR INTEGRATION REMOVED - Security Fix
// import { requestAccessToken } from '../services/googleAuthService';
// import { fetchCalendarEvents, mapEventsToTimeline } from '../services/calendarService';
import { CalendarDatePicker } from './CalendarDatePicker';
import { ConfirmModal } from './ConfirmModal';
import { MagicalWizard } from './onboarding/MagicalWizard';
import { UnifiedMapView } from './UnifiedMapView';


interface TripSettingsModalProps {
    data: Trip[];
    currentTripId?: string;
    onSave: (newData: Trip[]) => void;
    onSwitchTrip: (id: string) => void;
    onDeleteTrip: (tripId: string) => void;
    onLeaveTrip: (tripId: string) => void;
    onClose: () => void;
}

// Helper: Convert various date formats to YYYY-MM-DD for input
const toInputDate = (dateStr: string) => {
    if (!dateStr) return '';
    // Already ISO YYYY-MM-DD (strict)
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;

    // Handle ISO with Time (2026-01-28T19:30:00)
    if (dateStr.includes('T')) {
        return dateStr.split('T')[0];
    }

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
        const cleanValue = value ? value.split('T')[0] : ''; // Safety clip
        if (!cleanValue) return placeholder || "בחר תאריך";
        if (cleanValue.includes('/')) return cleanValue;
        const [y, m, d] = cleanValue.split('-');
        if (y && m && d && y.length === 4) return `${d}/${m}/${y}`;
        return cleanValue;
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
                    value={value ? value.split('T')[0] : ''}
                    title={title}
                    onChange={onChange}
                    onClose={() => setShowPicker(false)}
                />
            )}
        </div>
    );
};

export const AdminView: React.FC<TripSettingsModalProps> = ({ data, currentTripId, onSave, onSwitchTrip, onDeleteTrip, onLeaveTrip, onClose }) => {
    // Unique Trips only (Sanity check)
    const uniqueTrips = useMemo(() => {
        const seen = new Set();
        return data.filter(t => {
            if (seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
        });
    }, [data]);

    const [trips, setTrips] = useState<Trip[]>(uniqueTrips);
    // Initialize with active trip from parent, or first available
    const [activeTripId, setActiveTripId] = useState(currentTripId || uniqueTrips[0]?.id || '');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'logistics' | 'ai' | 'logs'>('overview');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Sidebar State
    const [tripToDelete, setTripToDelete] = useState<string | null>(null);
    const [tripToLeave, setTripToLeave] = useState<string | null>(null); // NEW: For shared trip leave confirmation
    const [hotelToDelete, setHotelToDelete] = useState<string | null>(null); // For Admin hotel deletion


    // Helper: Format for Display (e.g. "08 Aug")
    const formatDisplayDate = (iso: string) => {
        if (!iso) return '';
        const date = new Date(iso);
        if (isNaN(date.getTime())) return iso;
        return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(date);
    };

    // Wizard auto-open removed (handled by App.tsx for better UX)
    const importFileRef = useRef<HTMLInputElement>(null);

    // --- Derived State for Route Builder ---
    const [routeCities, setRouteCities] = useState<string[]>([]);
    const [newCityInput, setNewCityInput] = useState('');
    const [showMap, setShowMap] = useState(false);

    // --- Derived State for Date Range ---
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Sync with parent data changes
    useEffect(() => {
        setTrips(uniqueTrips);
        // If current active trip is gone, switch to first available
        if (uniqueTrips.length > 0 && !uniqueTrips.find(t => t.id === activeTripId)) {
            setActiveTripId(uniqueTrips[0].id);
        }
    }, [data, uniqueTrips]);

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
    const handleDeleteTrip = (e: React.MouseEvent, tripIdToDelete: string) => {
        e.stopPropagation();
        setTripToDelete(tripIdToDelete);
    };

    const confirmDeleteTrip = async () => {
        if (!tripToDelete) return;

        await onDeleteTrip(tripToDelete);

        // Update local UI state
        const newTrips = trips.filter(t => t.id !== tripToDelete);
        setTrips(newTrips);

        if (activeTripId === tripToDelete && newTrips.length > 0) {
            setActiveTripId(newTrips[0].id);
        }
        setTripToDelete(null);
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
        setHotelToDelete(hotelId);
    };

    const confirmDeleteHotel = () => {
        if (!hotelToDelete) return;
        const newHotels = activeTrip.hotels.filter(h => h.id !== hotelToDelete);
        handleUpdateTrip({ hotels: newHotels });
        setHotelToDelete(null);
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
        onSwitchTrip(newTrip.id); // Triggers App to switch
    };

    const enrichHotelsWithAI = async (currentTrip: Trip): Promise<Trip> => {
        if (!currentTrip || !currentTrip.hotels) return currentTrip;
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
                [prompt],
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
                onSwitchTrip(newTrip.id);
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
            // Fix: Intelligent Merge for Hotels to prevent duplication
            hotels: [
                ...(activeTrip.hotels || []),
                ...(updatedTripData.hotels || []).filter(newH => !activeTrip.hotels?.some(existingH => existingH.id === newH.id))
            ]
        };

        handleUpdateTrip(mergedTrip);
        const newTrips = trips.map(t => t.id === activeTripId ? mergedTrip : t);
        onSave(newTrips);
    };

    return (
        <div className="w-full h-full bg-slate-50 relative flex flex-col md:flex-row animate-scale-in" onClick={(e) => e.stopPropagation()}>

            <ConfirmModal
                isOpen={!!tripToDelete}
                title="מחיקת טיול"
                message="האם אתה בטוח שברצונך למחוק את הטיול? פעולה זו הינה בלתי הפיכה."
                confirmText="מחק טיול"
                isDangerous={true}
                onConfirm={confirmDeleteTrip}
                onClose={() => setTripToDelete(null)}
            />
            <ConfirmModal
                isOpen={!!hotelToDelete}
                title="מחיקת מלון"
                message="האם להסיר מלון זה מהרשימה?"
                confirmText="הסר"
                isDangerous={true}
                onConfirm={confirmDeleteHotel}
                onClose={() => setHotelToDelete(null)}
            />
            {/* Leave Shared Trip Confirmation */}
            <ConfirmModal
                isOpen={!!tripToLeave}
                title="יציאה מטיול משותף"
                message="האם אתה בטוח שברצונך לעזוב את הטיול המשותף? לא תוכל לראות ולערוך את הטיול יותר."
                confirmText="עזוב טיול"
                isDangerous={true}
                onConfirm={async () => {
                    if (tripToLeave) {
                        await onLeaveTrip(tripToLeave);
                        // Update local state 
                        const newTrips = trips.filter(t => t.id !== tripToLeave);
                        setTrips(newTrips);
                        if (activeTripId === tripToLeave && newTrips.length > 0) {
                            setActiveTripId(newTrips[0].id);
                        }
                        setTripToLeave(null);
                    }
                }}
                onClose={() => setTripToLeave(null)}
            />


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
                    <div className="flex justify-between items-center w-full">
                        <div>
                            <h2 className="text-xl font-black text-slate-800">הטיולים שלי</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider hidden md:block">ניהול כל הטיולים</p>
                        </div>
                        <button onClick={() => window.location.reload()} className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="רענן נתונים (מסנכרן מהשרת)">
                            <Loader2 className="w-4 h-4" />
                        </button>
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
                                    // Use confirmation modal for both delete and leave
                                    if (isOwner) {
                                        handleDeleteTrip(e, t.id);
                                    } else {
                                        setTripToLeave(t.id); // NEW: Show confirmation instead of direct call
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
                        onClick={() => onSave(trips)}
                        disabled={isSaving}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:scale-[1.02]'}`}
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{isSaving ? 'שומר...' : 'שמור שינויים'}</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-grow flex overflow-hidden bg-white/50 rounded-t-3xl border-t border-x border-white/60 shadow-xl backdrop-blur-md">

                {/* Sidebar Navigation */}
                <div className={`
                        w-64 bg-white border-l border-slate-100 flex-shrink-0 flex flex-col
                        ${isSidebarOpen ? 'absolute inset-y-0 right-0 z-20 shadow-2xl' : 'hidden md:flex'}
                    `}>
                    <div className="p-6">
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`w-full text-right px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Layout className="w-5 h-5" /> פרטים כלליים
                            </button>
                            <button
                                onClick={() => setActiveTab('logistics')}
                                className={`w-full text-right px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeTab === 'logistics' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Plane className="w-5 h-5" /> מלונות וטיסות
                            </button>
                            <button
                                onClick={() => setActiveTab('ai')}
                                className={`w-full text-right px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeTab === 'ai' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Sparkles className="w-5 h-5" /> Magic Import
                            </button>
                            <button
                                onClick={() => setActiveTab('logs')}
                                className={`w-full text-right px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors ${activeTab === 'logs' ? 'bg-slate-800 text-green-400' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <Terminal className="w-5 h-5" /> System Logs
                            </button>
                        </div>
                    </div>

                    {/* Trip List in Sidebar */}
                    <div className="mt-auto p-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2 px-2">
                            <span className="text-xs font-bold text-slate-400 uppercase">הטיולים שלי</span>
                            <button onClick={() => setIsWizardOpen(true)} className="p-1 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"><Plus className="w-4 h-4" /></button>
                        </div>
                        <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                            {trips.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => { setActiveTripId(t.id); onSwitchTrip(t.id); }}
                                    className={`w-full text-right px-3 py-2 rounded-lg text-sm font-medium truncate transition-colors ${activeTripId === t.id ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Content Panel */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 relative scroll-smooth decoration-slice">
                    {/* Mobile Sidebar Toggle */}
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden absolute top-4 left-4 p-2 bg-white shadow-sm rounded-lg border border-slate-200 z-10">
                        <Menu className="w-5 h-5 text-slate-600" />
                    </button>

                    <div className="max-w-4xl mx-auto pb-20">
                        {/* TAB: OVERVIEW */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6 animate-fade-in">
                                {/* Trip Metadata Card */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                                <span className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><Layout className="w-4 h-4" /></span> פרטים כלליים
                                            </h3>
                                            <p className="text-sm text-slate-500 mt-1">נהל את שם הטיול, יעדים ותאריכים</p>
                                        </div>
                                        {/* Share Button */}
                                        <button
                                            onClick={() => setIsShareModalOpen(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-100 hover:bg-emerald-100 transition-colors"
                                        >
                                            <Share2 className="w-4 h-4" />
                                            <span>שיתוף והרשאות</span>
                                        </button>
                                    </div>

                                    <div className="space-y-5">
                                        {/* Name Input */}
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">שם הטיול</label>
                                            <input
                                                className="w-full text-2xl font-black text-slate-800 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 outline-none transition-all placeholder:text-slate-300"
                                                value={activeTrip.name}
                                                onChange={(e) => handleUpdateTrip({ name: e.target.value })}
                                                placeholder='לדוגמה: "טיול יפן 2026"'
                                            />
                                        </div>

                                        {/* Destination & Dates Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Destination Builder */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">מסלול (ערים)</label>
                                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {routeCities.map((city, idx) => (
                                                            <div key={idx} className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm text-sm font-bold text-slate-700 animate-scale-in">
                                                                <span>{city}</span>
                                                                <button onClick={() => removeCity(idx)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-slate-400" />
                                                        <input
                                                            className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400"
                                                            value={newCityInput}
                                                            onChange={(e) => setNewCityInput(e.target.value)}
                                                            onKeyDown={(e) => e.key === 'Enter' && addCity()}
                                                            placeholder="הוסף עיר..."
                                                        />
                                                        <button onClick={addCity} className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-1 rounded-md transition-colors"><Plus className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Date Range Parser */}
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">תאריכים</label>
                                                <div className="bg-slate-50 p-1 rounded-xl border border-slate-200 flex items-center justify-between relative group">
                                                    <div className="flex-1 p-2 border-l border-slate-200">
                                                        <span className="text-[10px] font-bold text-slate-400 block mb-1">התחלה</span>
                                                        <DateInput
                                                            value={startDate}
                                                            onChange={(val) => handleDateChange('start', val)}
                                                            className="w-full text-sm outline-none bg-transparent font-bold text-slate-800"
                                                            placeholder="dd/mm/yyyy"
                                                        />
                                                    </div>
                                                    <div className="flex-1 p-2">
                                                        <span className="text-[10px] font-bold text-slate-400 block mb-1">סיום</span>
                                                        <DateInput
                                                            value={endDate}
                                                            onChange={(val) => handleDateChange('end', val)}
                                                            className="w-full text-sm outline-none bg-transparent font-bold text-slate-800"
                                                            placeholder="dd/mm/yyyy"
                                                        />
                                                    </div>
                                                </div>
                                                {/* Result Preview */}
                                                <div className="mt-2 text-center">
                                                    <span className="inline-block px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg border border-purple-100">
                                                        {activeTrip.dates || "---"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Map View Toggle */}
                                <div className="flex justify-start mb-2">
                                    <button
                                        onClick={() => setShowMap(!showMap)}
                                        className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 border border-blue-100"
                                    >
                                        <MapPin className="w-4 h-4" />
                                        {showMap ? 'הסתר מפה' : 'הצג מפה בוועדה'}
                                    </button>
                                </div>

                                {/* Map View - Conditional */}
                                {showMap && (
                                    <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
                                        <UnifiedMapView trip={activeTrip} height="400px" />
                                    </div>
                                )}

                                {/* Danger Zone */}
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



                        {/* TAB: SYSTEM LOGS - Admin Only */}
                        {activeTab === 'logs' && auth.currentUser?.email === 'amitzahy1@gmail.com' && (
                            <div className="animate-fade-in">
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
                                    <h3 className="text-lg font-black text-slate-800 mb-2">לוגים של מערכת (Debug)</h3>
                                    <p className="text-sm text-slate-500 mb-4">צפה בתהליכים שרצים ברקע, כולל קליטת מיילים ועיבוד AI.</p>
                                    <SystemLogs />
                                </div>
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
                                            onClick={() => activeTrip && handleUpdateTrip({ flights: { ...activeTrip.flights, segments: [...(activeTrip.flights?.segments || []), { flightNumber: '', fromCode: '', toCode: '', fromCity: '', toCity: '', date: '', departureTime: '', arrivalTime: '', airline: '', duration: '' }] } })}
                                            className="text-xs font-bold bg-sky-50 text-sky-600 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-colors flex items-center gap-1"
                                        >
                                            <Plus className="w-3 h-3" /> הוסף טיסה
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-6">
                                            {(activeTrip?.flights?.segments || []).map((seg, idx) => {
                                                const currentDate = seg.date ? seg.date.split('T')[0] : '';

                                                const getTime = (iso: string) => {
                                                    if (!iso) return '';
                                                    if (iso.includes('T')) return iso.split('T')[1].substring(0, 5);
                                                    return iso;
                                                };

                                                const updateTime = (field: 'departureTime' | 'arrivalTime', newTime: string) => {
                                                    // Use existing date or today if missing
                                                    const baseDate = seg.date?.split('T')[0] || new Date().toISOString().split('T')[0];
                                                    const newIso = `${baseDate}T${newTime}:00`;
                                                    handleUpdateFlightSegment(idx, field, newIso);
                                                };

                                                return (
                                                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group hover:shadow-md transition-shadow mb-4">
                                                        {/* Delete Button */}
                                                        <button
                                                            onClick={() => handleDeleteFlightSegment(idx)}
                                                            className="absolute top-2 left-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-full"
                                                            title="מחק טיסה"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>

                                                        <div className="space-y-3">
                                                            {/* Airline Name - Text-like Input */}
                                                            <div className="relative pr-1">
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">חברת תעופה</label>
                                                                <input
                                                                    className="w-full font-black text-lg text-slate-800 bg-transparent border-b border-transparent focus:border-slate-300 outline-none placeholder:text-slate-300 transition-colors"
                                                                    value={seg.airline || ''}
                                                                    onChange={(e) => handleUpdateFlightSegment(idx, 'airline', e.target.value)}
                                                                    placeholder="שם חברת התעופה..."
                                                                />
                                                            </div>

                                                            {/* Route & Flight Number - Boxed Row */}
                                                            <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                                {/* From */}
                                                                <div className="flex-1 min-w-0">
                                                                    <label className="text-[10px] font-bold text-slate-400 block text-center mb-1">מאיפה</label>
                                                                    <div className="relative">
                                                                        <input
                                                                            value={seg.fromCode || ''}
                                                                            onChange={(e) => handleUpdateFlightSegment(idx, 'fromCode', e.target.value)}
                                                                            className="w-full text-center font-black text-xl uppercase bg-transparent outline-none tracking-wider text-slate-700 placeholder:text-slate-200"
                                                                            placeholder="TLV"
                                                                        />
                                                                        {/* City Hint */}
                                                                        <div className="text-[10px] text-slate-400 font-medium text-center truncate mt-1">{seg.fromCity || '-'}</div>
                                                                    </div>
                                                                </div>

                                                                {/* Arrow */}
                                                                <div className="flex flex-col items-center justify-center text-slate-300">
                                                                    <Plane className="w-5 h-5 transform rotate-180" />
                                                                </div>

                                                                {/* To */}
                                                                <div className="flex-1 min-w-0">
                                                                    <label className="text-[10px] font-bold text-slate-400 block text-center mb-1">לאן</label>
                                                                    <div className="relative">
                                                                        <input
                                                                            value={seg.toCode || ''}
                                                                            onChange={(e) => handleUpdateFlightSegment(idx, 'toCode', e.target.value)}
                                                                            className="w-full text-center font-black text-xl uppercase bg-transparent outline-none tracking-wider text-slate-700 placeholder:text-slate-200"
                                                                            placeholder="JFK"
                                                                        />
                                                                        {/* City Hint */}
                                                                        <div className="text-[10px] text-slate-400 font-medium text-center truncate mt-1">{seg.toCity || '-'}</div>
                                                                    </div>
                                                                </div>

                                                                {/* Divider */}
                                                                <div className="w-px h-8 bg-slate-100 mx-1 hidden sm:block"></div>

                                                                {/* Flight No */}
                                                                <div className="w-20 hidden sm:block">
                                                                    <label className="text-[10px] font-bold text-slate-400 block mb-1 text-center">מס' טיסה</label>
                                                                    <input
                                                                        value={seg.flightNumber || ''}
                                                                        onChange={(e) => handleUpdateFlightSegment(idx, 'flightNumber', e.target.value)}
                                                                        className="w-full text-center font-mono text-sm font-bold bg-slate-50 rounded-md py-1 border border-slate-100 focus:border-blue-300 outline-none uppercase text-slate-600"
                                                                        placeholder="LY001"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Mobile Flight Number (Visible only on mobile) */}
                                                            <div className="sm:hidden">
                                                                <input
                                                                    value={seg.flightNumber || ''}
                                                                    onChange={(e) => handleUpdateFlightSegment(idx, 'flightNumber', e.target.value)}
                                                                    className="w-full text-center font-mono text-sm font-bold bg-white rounded-md py-2 border border-slate-100 focus:border-blue-300 outline-none uppercase text-slate-600 placeholder:text-slate-300"
                                                                    placeholder="מספר טיסה (LY001)"
                                                                />
                                                            </div>

                                                            {/* Times - Grid */}
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <div className="bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm relative transition-colors focus-within:border-blue-300">
                                                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">תאריך</label>
                                                                    <input
                                                                        type="date"
                                                                        className="w-full text-xs font-bold outline-none bg-transparent text-slate-700"
                                                                        value={currentDate}
                                                                        onChange={(e) => handleUpdateFlightSegment(idx, 'date', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm transition-colors focus-within:border-blue-300">
                                                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">המראה</label>
                                                                    <input
                                                                        type="time"
                                                                        className="w-full text-xs font-bold font-mono outline-none bg-transparent text-slate-700"
                                                                        value={getTime(seg.departureTime as string)}
                                                                        onChange={(e) => updateTime('departureTime', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="bg-white px-3 py-2 rounded-lg border border-slate-100 shadow-sm transition-colors focus-within:border-blue-300">
                                                                    <label className="text-[10px] font-bold text-slate-400 block mb-1">נחיתה</label>
                                                                    <input
                                                                        type="time"
                                                                        className="w-full text-xs font-bold font-mono outline-none bg-transparent text-slate-700"
                                                                        value={getTime(seg.arrivalTime as string)}
                                                                        onChange={(e) => updateTime('arrivalTime', e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {(!activeTrip?.flights?.segments?.length) && (
                                                <div className="text-center py-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                                                    <Plane className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                                    <div className="text-slate-400 text-sm font-medium">אין טיסות ברשימה</div>
                                                    <button
                                                        onClick={() => activeTrip && handleUpdateTrip({ flights: { ...activeTrip.flights, segments: [...(activeTrip.flights?.segments || []), { flightNumber: '', fromCode: '', toCode: '', fromCity: '', toCity: '', date: '', departureTime: '', arrivalTime: '', airline: '', duration: '' }] } })}
                                                        className="mt-4 text-sm font-bold text-blue-500 hover:text-blue-600 hover:underline"
                                                    >
                                                        צור טיסה ראשונה
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Hotels - Column 2 */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-full">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                                <span className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600"><Hotel className="w-4 h-4" /></span> מלונות
                                            </h3>
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
            {
                isShareModalOpen && (
                    <ShareModal
                        trip={activeTrip}
                        onClose={() => setIsShareModalOpen(false)}
                        onUpdateTrip={(updatedTrip) => {
                            const newTrips = trips.map(t => t.id === activeTripId ? updatedTrip : t);
                            setTrips(newTrips);
                            onSave(newTrips);
                        }}
                    />
                )
            }

            {/* New Magical Wizard for Trip Creation */}
            {
                isWizardOpen && (
                    <MagicalWizard
                        isOpen={true}
                        onClose={() => setIsWizardOpen(false)}
                        onComplete={(wizardData) => {
                            // Transform wizard data to Trip object
                            const newTrip: Trip = {
                                id: crypto.randomUUID(),
                                name: wizardData.destination ? `Trip to ${wizardData.destination}` : "New Adventure",
                                destination: wizardData.destination || "",
                                dates: wizardData.startDate ? `${wizardData.startDate} - ${wizardData.endDate}` : "",
                                coverImage: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
                                flights: wizardData.flights || { passengerName: "", pnr: "", segments: [] },
                                hotels: wizardData.hotels || [],
                                restaurants: [],
                                attractions: [],
                                itinerary: [],
                                documents: [],
                                secureNotes: [],
                                isShared: false,
                                ...(wizardData.cities && wizardData.cities.length > 0 ? {
                                    itinerary: [{
                                        id: crypto.randomUUID(),
                                        day: 1,
                                        date: wizardData.startDate || new Date().toISOString(),
                                        title: `Day 1 in ${wizardData.cities[0]}`,
                                        activities: []
                                    }]
                                } : {})
                            };

                            handleCreateTrip(newTrip);
                        }}
                    />
                )
            }
        </div >

    );
};
// Removed Legacy TripWizard Component