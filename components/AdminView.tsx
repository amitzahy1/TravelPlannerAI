import React, { useState, useRef, useEffect } from 'react';
import { Trip, HotelBooking, FlightSegment } from '../types';
import { Save, X, Plus, Trash2, Layout, Sparkles, Globe, UploadCloud, Download, Share2, Calendar, Plane, Hotel, MapPin, ArrowRight, ArrowLeft, Loader2, CalendarCheck, FileText, Image as ImageIcon } from 'lucide-react';
import { getAI, AI_MODEL, generateWithFallback, extractTripFromDoc } from '../services/aiService';
import { MagicDropZone } from './MagicDropZone';
import { ShareModal } from './ShareModal';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';
import { AlertTriangle, Calendar as CalIcon } from 'lucide-react';
import { requestAccessToken } from '../services/googleAuthService';
import { fetchCalendarEvents, mapEventsToTimeline } from '../services/calendarService';

interface TripSettingsModalProps {
    data: Trip[];
    onSave: (newData: Trip[]) => void;
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

// Helper: Display format
const toDisplayDate = (isoDate: string) => {
    if (!isoDate) return '';
    if (isoDate.includes('-')) {
        const [y, m, d] = isoDate.split('-');
        return `${d}/${m}/${y}`;
    }
    return isoDate;
};

export const AdminView: React.FC<TripSettingsModalProps> = ({ data, onSave, onClose }) => {
    const [trips, setTrips] = useState<Trip[]>(data);
    const [activeTripId, setActiveTripId] = useState(data[0]?.id || '');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
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
            // Sync Route
            if (activeTrip.destination) {
                setRouteCities(activeTrip.destination.split(' - ').map(s => s.trim()).filter(Boolean));
            } else {
                setRouteCities([]);
            }

            // Sync Dates
            if (activeTrip.dates && activeTrip.dates.includes('-')) {
                const parts = activeTrip.dates.split('-').map(s => s.trim());
                setStartDate(toInputDate(parts[0]));
                setEndDate(toInputDate(parts[1]));
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
            const formatted = `${toDisplayDate(newStart)} - ${toDisplayDate(newEnd)}`;
            handleUpdateTrip({ dates: formatted });
        }
    };

    // --- Deletion Logic ---
    const handleDeleteTrip = (e: React.MouseEvent, tripIdToDelete: string) => {
        e.stopPropagation();
        if (window.confirm("פעולה זו תמחק את הטיול ואת כל המידע שבו. האם להמשיך?")) {
            const newTrips = trips.filter(t => t.id !== tripIdToDelete);
            if (newTrips.length === 0) {
                const empty: Trip = { id: `t-${Date.now()}`, name: 'טיול חדש', dates: '', destination: 'יעד כללי', coverImage: '', flights: { passengerName: '', pnr: '', segments: [] }, hotels: [], restaurants: [], attractions: [], itinerary: [], documents: [] };
                newTrips.push(empty);
            }
            setTrips(newTrips);
            if (activeTripId === tripIdToDelete) setActiveTripId(newTrips[0].id);
            onSave(newTrips);
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

            const textContent = typeof response.text === 'function' ? response.text() : response.text;

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

    const handleExportTrip = () => {
        const dataStr = JSON.stringify(activeTrip, null, 2);
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `trip_backup_${activeTrip.destination}_${new Date().toISOString().slice(0, 10)}.json`;
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

    const handleImportFromGoogle = async () => {
        try {
            // Calculate date range: Trip Start or Today -> +30 days
            let start = new Date().toISOString();
            if (activeTrip.dates && activeTrip.dates.includes('-')) {
                const p = activeTrip.dates.split('-')[0].trim();
                const d = toInputDate(p);
                if (d) start = new Date(d).toISOString();
            }

            const end = new Date(start);
            end.setDate(end.getDate() + 30);

            // 1. Try with existing token (if any)
            let token = localStorage.getItem('google_access_token');
            let events = [];

            try {
                events = await fetchCalendarEvents(start, end.toISOString(), token || undefined);
            } catch (err: any) {
                // 2. If failed, request new token
                if (err.message.includes('Permission') || err.message.includes('expired') || err.message.includes('token')) {
                    token = await requestAccessToken();
                    localStorage.setItem('google_access_token', token);
                    events = await fetchCalendarEvents(start, end.toISOString(), token);
                } else {
                    throw err;
                }
            }

            // 3. Process Events
            const mapped = mapEventsToTimeline(events);
            if (mapped.length === 0) {
                alert("לא נמצאו אירועים בטווח התאריכים הנבחר.");
                return;
            }

            // Merge into itinerary (simple append for now)
            const newItinerary = [...activeTrip.itinerary];

            // Group by date
            const byDate: Record<string, any[]> = {};
            mapped.forEach(ev => {
                if (!byDate[ev.date]) byDate[ev.date] = [];
                byDate[ev.date].push(ev);
            });

            // Update itinerary items
            Object.keys(byDate).forEach(date => {
                const dayEvents = byDate[date];
                const dayIndex = newItinerary.findIndex(item => item.date === date);

                const activitiesToAdd = dayEvents.map(e => `${e.time ? e.time + ' ' : ''}${e.title}`);

                if (dayIndex >= 0) {
                    newItinerary[dayIndex] = {
                        ...newItinerary[dayIndex],
                        activities: [...newItinerary[dayIndex].activities, ...activitiesToAdd]
                    };
                } else {
                    newItinerary.push({
                        id: `day-${date}`,
                        day: newItinerary.length + 1,
                        date: date,
                        title: `יום ${newItinerary.length + 1}`,
                        activities: activitiesToAdd
                    });
                }
            });

            // Sort by date
            newItinerary.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            const updatedTrip = { ...activeTrip, itinerary: newItinerary };
            handleUpdateTrip(updatedTrip);
            onSave(trips.map(t => t.id === activeTripId ? updatedTrip : t));

            alert(`יובאו בהצלחה ${mapped.length} אירועים מהיומן!`);

        } catch (e: any) {
            console.error(e);
            alert("שגיאה ביבוא: " + e.message);
        }





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
        link.setAttribute('download', `trip_itinerary_${activeTrip.destination}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAiUpdate = (updatedTripData: Trip) => {
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
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center md:pb-6 md:px-4 bg-slate-50 md:bg-gray-900/60 md:backdrop-blur-sm animate-fade-in overflow-hidden">
            {/* Modal Container: Full screen mobile, centered rounded on desktop */}
            <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:w-full md:max-w-7xl md:rounded-[2rem] md:shadow-2xl overflow-hidden flex flex-col relative">

                {/* Header */}
                <div className="bg-slate-50 p-4 md:p-6 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 md:p-2.5 rounded-xl text-white shadow-lg"><Globe className="w-5 h-5 md:w-6 md:h-6" /></div>
                        <div>
                            <h2 className="text-xl md:text-2xl font-black text-slate-800">ניהול טיול</h2>
                            <p className="hidden md:block text-xs text-slate-500 font-bold uppercase tracking-wider">ערוך פרטים, סנכרן יומן ונהל קבצים</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="bg-white p-2 rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex flex-col md:flex-row h-full overflow-hidden relative">

                    {/* SIDEBAR - Hidden on Mobile unless needed, or collapsible. For now keep visible but styled for mobile */}
                    <div className="hidden md:flex w-full md:w-64 bg-slate-50 border-l border-slate-200 flex-col flex-shrink-0 overflow-y-auto">
                        <div className="p-4 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">בחר טיול</label>
                            {trips.map(t => (
                                <div key={t.id} className="group relative">
                                    <button
                                        onClick={() => setActiveTripId(t.id)}
                                        className={`w-full text-right px-4 py-3 rounded-xl border-2 font-bold text-sm transition-all flex items-center justify-between ${activeTripId === t.id ? 'border-blue-600 bg-white text-blue-700 shadow-md' : 'border-transparent hover:bg-white text-slate-600'}`}
                                    >
                                        <span className="truncate">{t.name}</span>
                                        {activeTripId === t.id && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                                    </button>
                                    <button
                                        onClick={(e) => handleDeleteTrip(e, t.id)}
                                        className="absolute top-3 left-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button onClick={() => setIsWizardOpen(true)} className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 font-bold text-sm hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 flex items-center justify-center gap-2 mt-2">
                                <Plus className="w-4 h-4" /> טיול חדש
                            </button>

                            <button onClick={() => setIsShareModalOpen(true)} className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 mt-4">
                                <Share2 className="w-4 h-4" /> שתף טיול
                            </button>
                        </div>

                        <div className="mt-auto p-4 border-t border-slate-200 space-y-2">
                            <button onClick={handleSyncCalendar} className="w-full py-2 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-100 flex items-center justify-center gap-2">
                                <CalendarCheck className="w-3 h-3" /> סנכרון ליומן
                            </button>
                            <button onClick={handleExportTrip} className="w-full py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                                <Download className="w-3 h-3" /> גיבוי לקובץ
                            </button>
                            <div className="relative">
                                <input type="file" accept=".json" className="hidden" ref={importFileRef} onChange={handleImportTrip} />
                                <button onClick={() => importFileRef.current?.click()} className="w-full py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-100 flex items-center justify-center gap-2">
                                    <UploadCloud className="w-3 h-3" /> שחזור מגיבוי
                                </button>
                            </div>

                            {/* Calendar Debug Section - Re-added for Fix */}
                            <div className="pt-4 border-t border-slate-200 mt-2">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 block mb-2">פתרון תקלות</label>
                                <button
                                    onClick={async () => {
                                        try {
                                            const provider = new GoogleAuthProvider();
                                            provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
                                            provider.setCustomParameters({ prompt: 'select_account consent' });
                                            await signInWithPopup(auth, provider).then(result => {
                                                const credential = GoogleAuthProvider.credentialFromResult(result);
                                                if (credential?.accessToken) {
                                                    localStorage.setItem('google_access_token', credential.accessToken);
                                                    alert("התחברת מחדש בהצלחה! נסה לסנכרן כעת.");
                                                }
                                            });
                                        } catch (e: any) {
                                            alert("שגיאה בהתחברות: " + e.message);
                                        }
                                    }}
                                    className="w-full py-2 bg-yellow-50 border border-yellow-100 rounded-xl text-xs font-bold text-yellow-700 hover:bg-yellow-100 flex items-center justify-center gap-2"
                                >
                                    <AlertTriangle className="w-3 h-3" /> תיקון חיבור ליומן
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* MAIN CONTENT */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 bg-white">


                        {/* 1. Core Details & Route Builder */}
                        <div className="space-y-6">
                            <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                                <Layout className="w-5 h-5 text-blue-500" /> פרטי הטיול
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase">שם הטיול</label>
                                        <input
                                            className="w-full p-3 rounded-xl border border-slate-200 font-bold text-lg text-slate-800 focus:ring-2 focus:ring-blue-100 outline-none transition-shadow bg-slate-50 focus:bg-white"
                                            value={activeTrip.name}
                                            onChange={e => handleUpdateTrip({ name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase">תמונת קאבר (URL)</label>
                                        <input
                                            className="w-full p-3 rounded-xl border border-slate-200 font-medium text-sm text-slate-600 focus:ring-2 focus:ring-blue-100 outline-none bg-slate-50 focus:bg-white"
                                            value={activeTrip.coverImage}
                                            onChange={e => handleUpdateTrip({ coverImage: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Date Range Picker */}
                                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                                    <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                                        <Calendar className="w-4 h-4" /> טווח תאריכים
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-blue-400 block mb-1">התחלה</label>
                                            <input
                                                type="date"
                                                className="w-full p-2 bg-white border border-blue-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                                                value={startDate}
                                                onChange={e => handleDateChange('start', e.target.value)}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-blue-400 block mb-1">סיום</label>
                                            <input
                                                type="date"
                                                className="w-full p-2 bg-white border border-blue-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                                                value={endDate}
                                                onChange={e => handleDateChange('end', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-blue-400 text-center">{activeTrip.dates}</p>
                                </div>
                            </div>

                            {/* Route Builder */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                <label className="text-xs font-black text-slate-500 mb-2 block flex items-center gap-2">
                                    <MapPin className="w-4 h-4" /> מסלול הטיול (ערים ויעדים)
                                </label>

                                <div className="flex flex-wrap gap-2 mb-2">
                                    {routeCities.map((city, idx) => (
                                        <div key={idx} className="flex items-center bg-white border border-slate-200 pl-1 pr-3 py-1 rounded-lg shadow-sm group hover:border-red-200 transition-colors">
                                            <span className="text-sm font-bold text-slate-700">{city}</span>
                                            <button onClick={() => removeCity(idx)} className="ml-2 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex items-center">
                                        <input
                                            placeholder="הוסף עיר..."
                                            className="bg-transparent border-b-2 border-slate-200 px-2 py-1 text-sm font-medium focus:border-blue-500 outline-none w-24 focus:w-40 transition-all"
                                            value={newCityInput}
                                            onChange={e => setNewCityInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && addCity()}
                                        />
                                        <button onClick={addCity} className="p-1 text-blue-500 hover:bg-blue-50 rounded-full ml-1"><Plus className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-100 w-full"></div>

                        {/* 2. Magic Drop Zone (Moved Down & Compacted) */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="bg-purple-100 p-1.5 rounded-lg"><Sparkles className="w-4 h-4 text-purple-600" /></div>
                                    <h3 className="font-bold text-purple-900 text-sm">הוספה חכמה</h3>
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold">PDF, כרטיסים, אישורים</span>
                            </div>
                            <div className="scale-95 origin-top">
                                <MagicDropZone activeTrip={activeTrip} onUpdate={handleAiUpdate} compact={true} />
                            </div>
                        </div>

                        <div className="h-px bg-slate-100 w-full"></div>

                        {/* 3. Detailed Lists */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                            {/* Hotels */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                        <span className="bg-indigo-100 p-1.5 rounded-lg text-indigo-600"><Hotel className="w-4 h-4" /></span> מלונות
                                    </h4>
                                    <button
                                        onClick={() => handleUpdateTrip({ hotels: [...activeTrip.hotels, { id: `h-${Date.now()}`, name: 'מלון חדש', address: '', checkInDate: '', checkOutDate: '', nights: 0 }] })}
                                        className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-100"
                                    >
                                        + הוסף
                                    </button>
                                </div>

                                {/* Datalist for Route Cities */}
                                <datalist id="trip-cities-list">
                                    {routeCities.map((city, idx) => (
                                        <option key={idx} value={city} />
                                    ))}
                                </datalist>

                                <div className="space-y-3">
                                    {activeTrip.hotels?.map((hotel, idx) => (
                                        <div key={hotel.id || idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group">
                                            <div className="flex justify-between items-start mb-2">
                                                <input
                                                    className="font-bold text-sm text-slate-800 w-full outline-none bg-transparent placeholder-slate-300 focus:border-b focus:border-indigo-300"
                                                    value={hotel.name}
                                                    placeholder="שם המלון (ה-AI ישלים פרטים בשמירה)"
                                                    onChange={(e) => handleUpdateHotel(hotel.id, 'name', e.target.value)}
                                                />
                                                <button onClick={() => handleDeleteHotel(hotel.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                            <input
                                                className="text-xs text-slate-500 w-full outline-none bg-transparent mb-3 border-b border-transparent focus:border-slate-200"
                                                value={hotel.address}
                                                placeholder="כתובת / עיר (בחר מהרשימה או הקלד)"
                                                list="trip-cities-list"
                                                onChange={(e) => handleUpdateHotel(hotel.id, 'address', e.target.value)}
                                            />
                                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg">
                                                <div>
                                                    <label className="text-[9px] font-bold text-slate-400 block">Check-in</label>
                                                    <input
                                                        type="date"
                                                        className="w-full bg-transparent text-[11px] font-bold text-slate-700 outline-none"
                                                        value={toInputDate(hotel.checkInDate)}
                                                        onChange={(e) => handleUpdateHotel(hotel.id, 'checkInDate', e.target.value)}
                                                    />
                                                </div>
                                                <div className="border-r border-slate-200 pr-2">
                                                    <label className="text-[9px] font-bold text-slate-400 block">Check-out</label>
                                                    <input
                                                        type="date"
                                                        min={toInputDate(hotel.checkInDate)} // Ensure check-out is after check-in
                                                        className="w-full bg-transparent text-[11px] font-bold text-slate-700 outline-none"
                                                        value={toInputDate(hotel.checkOutDate)}
                                                        onChange={(e) => handleUpdateHotel(hotel.id, 'checkOutDate', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!activeTrip.hotels || activeTrip.hotels.length === 0) && <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">אין מלונות ברשימה</div>}
                                </div>
                            </div>

                            {/* Flights */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                        <span className="bg-blue-100 p-1.5 rounded-lg text-blue-600"><Plane className="w-4 h-4" /></span> טיסות
                                    </h4>
                                    <button
                                        onClick={() => handleUpdateTrip({ flights: { ...activeTrip.flights, segments: [...(activeTrip.flights.segments || []), { fromCode: 'TLV', toCode: 'NYC', date: '', flightNumber: '', airline: '', departureTime: '', arrivalTime: '', duration: '', fromCity: '', toCity: '' }] } })}
                                        className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100"
                                    >
                                        + הוסף
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {activeTrip.flights?.segments?.map((seg, idx) => (
                                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group relative">
                                            <button onClick={() => handleDeleteFlightSegment(idx)} className="absolute top-2 left-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>

                                            <div className="flex items-center gap-2 mb-3 justify-center">
                                                <input className="w-12 text-center font-black text-lg bg-slate-50 rounded border-transparent focus:border-blue-300 border outline-none uppercase" value={seg.fromCode} onChange={(e) => handleUpdateFlightSegment(idx, 'fromCode', e.target.value)} placeholder="TLV" />
                                                <ArrowLeft className="w-4 h-4 text-slate-300" />
                                                <input className="w-12 text-center font-black text-lg bg-slate-50 rounded border-transparent focus:border-blue-300 border outline-none uppercase" value={seg.toCode} onChange={(e) => handleUpdateFlightSegment(idx, 'toCode', e.target.value)} placeholder="NYC" />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <div className="relative">
                                                    <label className="text-[9px] text-slate-400 absolute -top-1.5 right-2 bg-white px-1 font-bold">תאריך</label>
                                                    <input type="date" className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs font-medium outline-none focus:border-blue-300" value={toInputDate(seg.date)} onChange={(e) => handleUpdateFlightSegment(idx, 'date', e.target.value)} />
                                                </div>
                                                <div className="relative">
                                                    <label className="text-[9px] text-slate-400 absolute -top-1.5 right-2 bg-white px-1 font-bold">מספר טיסה</label>
                                                    <input className="w-full bg-white border border-slate-200 rounded px-2 py-2 text-xs font-medium outline-none focus:border-blue-300" value={seg.flightNumber} onChange={(e) => handleUpdateFlightSegment(idx, 'flightNumber', e.target.value)} placeholder="למשל LY001" />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <input className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium outline-none" value={seg.departureTime} onChange={(e) => handleUpdateFlightSegment(idx, 'departureTime', e.target.value)} placeholder="Dep Time" />
                                                <input className="flex-1 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-medium outline-none" value={seg.arrivalTime} onChange={(e) => handleUpdateFlightSegment(idx, 'arrivalTime', e.target.value)} placeholder="Arr Time" />
                                            </div>
                                        </div>
                                    ))}
                                    {(!activeTrip.flights?.segments || activeTrip.flights.segments.length === 0) && <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">אין טיסות ברשימה</div>}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6">
                            <button onClick={handleSaveAndClose} disabled={isSaving} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-300 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        שומר ומעשיר מידע...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        שמור וסגור
                                    </>
                                )}
                            </button>
                        </div>

                        {/* 4. Danger Zone (Mobile Support) */}
                        <div className="mt-8 p-4 bg-red-50 border border-red-100 rounded-2xl space-y-4">
                            <div className="flex items-center gap-2 text-red-700 font-bold">
                                <AlertTriangle className="w-5 h-5" />
                                <h3>אזור מסוכן</h3>
                            </div>
                            <p className="text-xs text-red-600">פעולות אלו הן בלתי הפיכות. מחיקת הטיול תמחק את כל המידע המקושר אליו.</p>
                            <button
                                onClick={(e) => handleDeleteTrip(e, activeTrip.id)}
                                className="w-full py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 flex items-center justify-center gap-2 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" /> מחק את הטיול הנוכחי
                            </button>
                        </div>
                    </div>
                </div>

                {/* Nested Wizard Modal */}
                {isWizardOpen && (
                    <div className="absolute inset-0 z-50 bg-white">
                        <TripWizard onFinish={handleCreateTrip} onCancel={() => setIsWizardOpen(false)} />
                    </div>
                )}

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
            </div>
        </div>
    );
};

const TripWizard: React.FC<{ onFinish: (trip: Trip) => void, onCancel: () => void }> = ({ onFinish, onCancel }) => {
    const [step, setStep] = useState(0);
    const [tripData, setTripData] = useState({
        name: '',
        dates: '',
        destination: '',
        coverImage: ''
    });

    const steps = [
        {
            title: "מה שם הטיול?",
            desc: "תן שם לטיול שלך - למשל 'טיול לתאילנד' או 'חופשה באיטליה'",
            icon: MapPin,
            color: "bg-blue-600",
            field: 'name'
        },
        {
            title: "מתי הטיול?",
            desc: "הזן את תאריכי הטיול (למשל: 15-22.1.2025)",
            icon: Calendar,
            color: "bg-purple-600",
            field: 'dates'
        },
        {
            title: "לאן טסים?",
            desc: "מה היעד של הטיול? (למשל: בנגקוק, רומא, ניו יורק)",
            icon: Plane,
            color: "bg-orange-500",
            field: 'destination'
        }
    ];

    const handleNext = () => {
        if (step < steps.length - 1) {
            setStep(step + 1);
        } else {
            // Create trip
            const newTrip: Trip = {
                id: `t-${Date.now()}`,
                name: tripData.name || 'טיול חדש',
                dates: tripData.dates,
                destination: tripData.destination || 'יעד כללי',
                coverImage: tripData.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80',
                flights: { passengerName: '', pnr: '', segments: [] },
                hotels: [],
                restaurants: [],
                attractions: [],
                itinerary: [],
                documents: []
            };
            onFinish(newTrip);
        }
    };

    const currentField = steps[step]?.field;
    const currentValue = currentField ? tripData[currentField as keyof typeof tripData] : '';
    const canProceed = currentValue.trim().length > 0;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-6 animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white/20 flex flex-col max-h-[90vh]">
                <button onClick={onCancel} className="absolute top-6 right-6 z-10 p-2 bg-white/20 hover:bg-black/10 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-800" />
                </button>

                {/* Dynamic Header */}
                <div className={`transition-all duration-500 overflow-hidden relative flex flex-col items-center justify-center h-72 ${steps[step].color}`}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>

                    <div className="relative z-10 bg-white/20 backdrop-blur-md p-4 rounded-full shadow-2xl border border-white/30 mb-2 animate-scale-in">
                        {React.createElement(steps[step].icon, { className: "w-16 h-16 text-white drop-shadow-md" })}
                    </div>

                    <div className="absolute bottom-6 flex gap-2">
                        {steps.map((_, i) => (
                            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}></div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 text-center flex flex-col flex-grow">
                    <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight leading-tight">{steps[step].title}</h2>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed mb-6">{steps[step].desc}</p>

                    {/* Input Field */}
                    <input
                        type="text"
                        value={currentValue}
                        onChange={(e) => setTripData({ ...tripData, [currentField]: e.target.value })}
                        placeholder={steps[step].field === 'name' ? 'שם הטיול...' : steps[step].field === 'dates' ? 'תאריכים...' : 'יעד...'}
                        className="w-full px-6 py-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none text-lg text-center font-medium transition-all"
                        autoFocus
                    />

                    <div className="mt-auto pt-6 space-y-3">
                        <button
                            onClick={handleNext}
                            disabled={!canProceed}
                            className={`w-full py-4 rounded-2xl font-bold text-xl text-white shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl flex items-center justify-center gap-2 ${steps[step].color} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
                        >
                            {step < steps.length - 1 ? (
                                <>הבא <ArrowLeft className="w-5 h-5 rotate-180" /></>
                            ) : (
                                <>צור טיול <Sparkles className="w-5 h-5" /></>
                            )}
                        </button>

                        {step > 0 && (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="w-full py-3 rounded-2xl font-medium text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> חזור
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};