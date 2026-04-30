import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Trip, HotelBooking, FlightSegment, HotelRoom } from '../types';
import { Save, X, Plus, Trash2, Layout, Sparkles, Globe, UploadCloud, Download, Share2, Calendar, Plane, Hotel, MapPin, ArrowRight, ArrowLeft, Loader2, CalendarCheck, FileText, Image as ImageIcon, Menu, Users, LogOut, ChevronDown, Terminal, CheckCircle, BedDouble } from 'lucide-react';
import { generateWithFallback } from '../services/aiService';
import { parseFreeTextTrip } from '../services/freeTextImportService';
import { toast } from '../stores/useToastStore';
import { getTripCities } from '../utils/geoData'; // Imported from new DB
import { MagicDropZone } from './MagicDropZone';
import { ShareModal } from './ShareModal';
import { exportTripPDF } from '../utils/generateTripHTML';
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
import { DataHealthPanel } from './admin/DataHealthPanel';


interface TripSettingsModalProps {
    data: Trip[];
    currentTripId?: string;
    onSave: (newData: Trip[]) => void;
    onSwitchTrip: (id: string) => void;
    onDeleteTrip: (tripId: string) => void;
    onLeaveTrip: (tripId: string) => void;
    onCleanupDuplicates?: (preferredTripId: string) => Promise<{ deletedCount: number; deletedTripIds?: string[]; keptTripId?: string }>;
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

export const AdminView: React.FC<TripSettingsModalProps> = ({ data, currentTripId, onSave, onSwitchTrip, onDeleteTrip, onLeaveTrip, onCleanupDuplicates, onClose }) => {
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
    const [activeTab, setActiveTab] = useState<'overview' | 'logistics' | 'ai' | 'health' | 'logs'>('overview');
    const [freeText, setFreeText] = useState('');
    const [isFreeTextProcessing, setIsFreeTextProcessing] = useState(false);
    const [freeTextResult, setFreeTextResult] = useState<{ hotels: HotelBooking[], flights: FlightSegment[], summary: string } | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Sidebar State
    const [tripToDelete, setTripToDelete] = useState<string | null>(null);
    const [tripToLeave, setTripToLeave] = useState<string | null>(null); // NEW: For shared trip leave confirmation
    const [isDuplicateCleanupOpen, setIsDuplicateCleanupOpen] = useState(false);
    const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
    const [hotelToDelete, setHotelToDelete] = useState<string | null>(null); // For Admin hotel deletion
    const [hotelConflicts, setHotelConflicts] = useState<{ existing: HotelBooking, incoming: HotelBooking }[]>([]);
    const [conflictResolutions, setConflictResolutions] = useState<Record<number, 'keep' | 'replace' | 'both'>>({});
    const [pendingApplyData, setPendingApplyData] = useState<{ hotels: HotelBooking[], flights: FlightSegment[] } | null>(null);


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
            // Use DD/MM/YYYY format to avoid UTC/local-timezone round-trip bugs
            const toDDMMYYYY = (iso: string) => {
                const [y, m, d] = iso.split('-');
                return (y && m && d && y.length === 4) ? `${d}/${m}/${y}` : iso;
            };
            const formatted = `${toDDMMYYYY(newStart)} - ${toDDMMYYYY(newEnd)}`;
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

    const confirmDuplicateCleanup = async () => {
        if (!activeTrip || !onCleanupDuplicates) return;

        setIsCleaningDuplicates(true);
        try {
            const result = await onCleanupDuplicates(activeTrip.id);
            setTrips(prev => prev.filter(trip => !result.deletedTripIds?.includes(trip.id)));
            setActiveTripId(result.keptTripId || activeTrip.id);
            if (result.keptTripId) onSwitchTrip(result.keptTripId);
            toast.success(result.deletedCount > 0 ? `נמחקו ${result.deletedCount} כפילויות. הטיול שנבחר נשמר.` : 'לא נמצאו כפילויות למחיקה.');
        } catch (error) {
            console.error('Duplicate cleanup failed:', error);
            toast.error('ניקוי הכפילויות נכשל. נסה שוב.');
        } finally {
            setIsCleaningDuplicates(false);
            setIsDuplicateCleanupOpen(false);
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
        onSwitchTrip(newTrip.id); // Triggers App to switch
    };

    const enrichHotelsWithAI = async (currentTrip: Trip): Promise<Trip> => {
        if (!currentTrip || !currentTrip.hotels) return currentTrip;
        const needsEnrichment = currentTrip.hotels.some(h => !h.googleMapsUrl || !h.address || h.address.length < 5);

        if (!needsEnrichment) return currentTrip;

        try {
            const hotelsToEnrich = currentTrip.hotels.map(h => ({ id: h.id, name: h.name, knownAddress: h.address }));

            const prompt = `
          I have a trip to ${currentTrip.destination}.
          Here is a list of hotels: ${JSON.stringify(hotelsToEnrich)}.
          For each hotel, find the Official Name, Full Address, and a Google Maps URL.
          Return a JSON object with an array "hotels" containing { id, name, address, googleMapsUrl }.
          Only return valid JSON.
          `;

            const response = await generateWithFallback(
                null,
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
                if (!json.id || !json.itinerary) { toast.error("קובץ לא תקין"); return; }
                const newTrip = { ...json, id: `imported-${Date.now()}`, name: `${json.name} (מיובא)` };
                const updatedTrips = [...trips, newTrip];
                setTrips(updatedTrips);
                setActiveTripId(newTrip.id);
                onSave(updatedTrips);
                onSwitchTrip(newTrip.id);
                toast.success("הטיול יובא בהצלחה!");
            } catch (err) { console.error(err); toast.error("שגיאה בקריאת הקובץ"); }
        };
        reader.readAsText(file);
        if (importFileRef.current) importFileRef.current.value = '';
    };

    // CALENDAR IMPORT REMOVED - Feature disabled to eliminate "Unverified App" security warning
    const handleImportFromGoogle = async () => {
        toast.info("יבוא מיומן Google הוסר לצורך אבטחה. הלו\"ז מנוהל ישירות באפליקציה.");
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

    // Helper: parse a simple date string (YYYY-MM-DD, DD/MM/YYYY, or text) to Date
    const parseAnyDate = (s: string): Date | null => {
        if (!s) return null;
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
            const [y, m, d] = s.split('-').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0);
        }
        if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
            const [d, m, y] = s.split('/').map(Number);
            return new Date(y, m - 1, d, 12, 0, 0);
        }
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    };

    // Helper: Calculate expanded trip.dates that spans existing + new hotels/flights
    const recalculateTripDates = (hotels: HotelBooking[], flights: FlightSegment[], currentDates?: string): string | null => {
        const allDates: Date[] = [];

        // Parse current range
        if (currentDates?.includes(' - ')) {
            const [a, b] = currentDates.split(' - ').map(p => parseAnyDate(p.trim()));
            if (a) allDates.push(a);
            if (b) allDates.push(b);
        }

        hotels.forEach(h => {
            const ci = parseAnyDate(h.checkInDate);
            const co = parseAnyDate(h.checkOutDate);
            if (ci) allDates.push(ci);
            if (co) allDates.push(co);
        });

        flights.forEach(f => {
            const fd = parseAnyDate(f.date);
            if (fd) allDates.push(fd);
        });

        if (allDates.length === 0) return null;
        allDates.sort((a, b) => a.getTime() - b.getTime());

        const fmt = (d: Date) =>
            `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;

        return `${fmt(allDates[0])} - ${fmt(allDates[allDates.length - 1])}`;
    };

    const handleAiUpdate = (updatedTripData: Trip) => {
        if (!activeTrip) return;
        const mergedHotels = [
            ...(activeTrip.hotels || []),
            ...(updatedTripData.hotels || []).filter(newH => !activeTrip.hotels?.some(existingH => existingH.id === newH.id))
        ];

        // Smart flight merge: if new segments exist, use them.
        // Also drop any OLD segments from a different year to prevent stale data accumulation.
        const newSegs = updatedTripData.flights?.segments;
        let mergedSegments: FlightSegment[];
        if (newSegs && newSegs.length > 0) {
            // Determine year of the new import
            const newYear = newSegs.find(s => s.date?.match(/^(\d{4})/))?.[`date`]?.match(/^(\d{4})/)?.[1];
            if (newYear) {
                // Keep existing segments that match the same year, then add new ones (dedup by flightNumber+date)
                const keptOld = (activeTrip.flights?.segments || []).filter(s => {
                    const y = s.date?.match(/^(\d{4})/)?.[1] || s.departureTime?.match(/^(\d{4})/)?.[1];
                    return y === newYear;
                });
                const deduped = [...keptOld];
                newSegs.forEach(ns => {
                    const exists = deduped.some(s => s.flightNumber === ns.flightNumber && s.date === ns.date);
                    if (!exists) deduped.push(ns);
                });
                mergedSegments = deduped;
            } else {
                mergedSegments = newSegs;
            }
        } else {
            mergedSegments = activeTrip.flights?.segments || [];
        }

        const newDates = recalculateTripDates(mergedHotels, mergedSegments, activeTrip.dates);
        const mergedTrip = {
            ...activeTrip,
            ...updatedTripData,
            documents: [...(activeTrip.documents || []), ...(updatedTripData.documents || [])].filter((v, i, a) => a.indexOf(v) === i),
            hotels: mergedHotels,
            flights: { ...(updatedTripData.flights || activeTrip.flights), segments: mergedSegments },
            ...(newDates ? { dates: newDates } : {}),
        };

        handleUpdateTrip(mergedTrip);
        const newTrips = trips.map(t => t.id === activeTripId ? mergedTrip : t);
        onSave(newTrips);
    };

    const handleFreeTextImport = async () => {
        if (!freeText.trim()) return;
        setIsFreeTextProcessing(true);
        setFreeTextResult(null);
        try {
            const result = await parseFreeTextTrip(freeText);
            setFreeTextResult(result);
        } catch (e) {
            console.error('Free text import error:', e);
            toast.error('שגיאה בעיבוד הטקסט. אנא נסה שנית.');
        } finally {
            setIsFreeTextProcessing(false);
        }
    };

    const applyMergedData = (resolvedHotels: HotelBooking[], resolvedFlights: FlightSegment[]) => {
        if (!activeTrip) return;
        const newDates = recalculateTripDates(resolvedHotels, resolvedFlights, activeTrip.dates);
        const mergedTrip = {
            ...activeTrip,
            hotels: resolvedHotels,
            flights: { ...activeTrip.flights, segments: resolvedFlights },
            ...(newDates ? { dates: newDates } : {}),
        };
        handleUpdateTrip(mergedTrip);
        const newTrips = trips.map(t => t.id === activeTripId ? mergedTrip : t);
        onSave(newTrips);
        setFreeText('');
        setFreeTextResult(null);
        setHotelConflicts([]);
        setConflictResolutions({});
        setPendingApplyData(null);
    };

    const handleFreeTextApply = () => {
        if (!freeTextResult || !activeTrip) return;

        const existing = activeTrip.hotels || [];
        const conflicts: { existing: HotelBooking, incoming: HotelBooking }[] = [];
        const directMerge: HotelBooking[] = [...existing];

        for (const incoming of freeTextResult.hotels) {
            const sameName = existing.find(e =>
                e.name.trim().toLowerCase() === incoming.name.trim().toLowerCase()
            );
            if (!sameName) {
                // No match — add directly
                directMerge.push(incoming);
            } else if (sameName.checkInDate === incoming.checkInDate) {
                // Same hotel, same check-in → ENRICH (keep existing, merge missing fields)
                const idx = directMerge.findIndex(h => h.id === sameName.id);
                if (idx >= 0) {
                    directMerge[idx] = {
                        ...incoming,
                        id: sameName.id,
                        rooms: sameName.rooms?.length ? sameName.rooms : incoming.rooms,
                        address: sameName.address || incoming.address,
                        confirmationCode: sameName.confirmationCode || incoming.confirmationCode,
                        price: sameName.price || incoming.price,
                    };
                }
            } else {
                // Same name, different check-in → CONFLICT
                conflicts.push({ existing: sameName, incoming });
            }
        }

        // Flights: deduplicate by flightNumber+date, enrich if same
        const existingSegments = activeTrip.flights?.segments || [];
        const mergedFlights: FlightSegment[] = [...existingSegments];
        for (const incoming of freeTextResult.flights) {
            const dup = existingSegments.find(s => s.flightNumber === incoming.flightNumber && s.date === incoming.date);
            if (!dup) mergedFlights.push(incoming);
        }

        if (conflicts.length > 0) {
            setHotelConflicts(conflicts);
            setConflictResolutions({});
            setPendingApplyData({ hotels: directMerge, flights: mergedFlights });
        } else {
            applyMergedData(directMerge, mergedFlights);
        }
    };

    const handleResolveConflicts = () => {
        if (!pendingApplyData) return;
        let hotels = [...pendingApplyData.hotels];
        hotelConflicts.forEach((conflict, i) => {
            const resolution = conflictResolutions[i] || 'keep';
            if (resolution === 'replace') {
                const idx = hotels.findIndex(h => h.id === conflict.existing.id);
                if (idx >= 0) hotels[idx] = { ...conflict.incoming, id: conflict.existing.id };
            } else if (resolution === 'both') {
                hotels.push(conflict.incoming);
            }
            // 'keep' → do nothing, existing stays
        });
        applyMergedData(hotels, pendingApplyData.flights);
    };


    return (
        <div className="w-full h-full bg-white relative flex flex-col md:flex-row animate-scale-in rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

            {/* MOBILE OVERLAY */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-slate-900/50 z-[105] md:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)} />
            )}

            {/* SIDEBAR - TRIPS LIST */}
            <div className={`fixed inset-y-0 right-0 z-[110] w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-96 md:shadow-none md:z-auto md:border-l border-slate-200/50 flex flex-col flex-shrink-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="px-6 py-8 border-b border-slate-200/50 flex justify-between items-center md:block">
                    <div className="flex justify-between items-center w-full">
                        <h2 className="text-3xl font-black bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">טיולים שלי</h2>
                        <button onClick={() => window.location.reload()} className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all hover:shadow-sm" title="סינכרון"><Loader2 className="w-5 h-5" /></button>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                    {trips.map(t => (
                        <div key={t.id} className="relative group">
                            <button onClick={() => setActiveTripId(t.id)} className={`w-full text-right p-4 pr-4 pl-12 rounded-xl transition-all font-bold flex items-center justify-between text-sm border-2 ${activeTripId === t.id ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-slate-900 border-blue-300 shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200 hover:border-slate-300'}`}>
                                <span className="min-w-0 flex flex-col gap-1.5">
                                    <span className="truncate font-bold">{t.name}</span>
                                    <span className={`truncate text-xs font-medium ${activeTripId === t.id ? 'text-slate-600' : 'text-slate-500'}`}>{t.destination || t.dates || '—'}</span>
                                </span>
                                {activeTripId === t.id && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-md"></div>}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); const isOwner = !t.isShared || t.sharing?.role === 'owner'; isOwner ? handleDeleteTrip(e, t.id) : setTripToLeave(t.id); }} className={`absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20 ${(!t.isShared || t.sharing?.role === 'owner') ? 'text-slate-300 hover:text-red-500 hover:bg-red-50' : 'text-slate-300 hover:text-orange-500 hover:bg-orange-50'}`} title={(!t.isShared || t.sharing?.role === 'owner') ? "מחק" : "צא"}>
                                {(!t.isShared || t.sharing?.role === 'owner') ? <Trash2 className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                            </button>
                        </div>
                    ))}
                    <button onClick={() => onSave(trips)} disabled={isSaving} className={`w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all ${isSaving ? 'bg-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'}`}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span className="text-sm">{isSaving ? 'שומר...' : 'שמור שינויים'}</span>
                    </button>
                </div>
            </div>

            {/* MODALS */}
            {hotelConflicts.length > 0 && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col" dir="rtl">
                        <div className="p-5 border-b border-slate-100">
                            <h2 className="text-lg font-black text-slate-800">נמצאו מלונות דומים</h2>
                            <p className="text-sm text-slate-500 mt-1">בחר מה לעשות עם כל מלון</p>
                        </div>
                        <div className="overflow-y-auto flex-1 p-5 space-y-5">
                            {hotelConflicts.map((conflict, i) => (
                                <div key={i} className="border border-amber-200 rounded-xl bg-amber-50 p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                        <span>{conflict.incoming.name}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                                            <div className="font-bold text-slate-600 mb-1">קיים</div>
                                            <div className="text-slate-700">{conflict.existing.checkInDate} → {conflict.existing.checkOutDate}</div>
                                        </div>
                                        <div className="bg-white rounded-lg p-3 border border-blue-200">
                                            <div className="font-bold text-blue-600 mb-1">חדש</div>
                                            <div className="text-slate-700">{conflict.incoming.checkInDate} → {conflict.incoming.checkOutDate}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        {(['keep', 'replace', 'both'] as const).map(opt => (
                                            <button key={opt} onClick={() => setConflictResolutions(r => ({ ...r, [i]: opt }))} className={`flex-1 text-xs font-bold py-2 px-3 rounded-lg border transition-all ${conflictResolutions[i] === opt ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                                                {opt === 'keep' ? 'שמור קיים' : opt === 'replace' ? 'החלף' : 'שניהם'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-5 border-t border-slate-100 flex gap-3">
                            <button onClick={() => { setHotelConflicts([]); setConflictResolutions({}); }} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl">ביטול</button>
                            <button onClick={handleResolveConflicts} disabled={hotelConflicts.some((_, i) => !conflictResolutions[i])} className="flex-1 px-5 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50">אשר</button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal isOpen={!!tripToDelete} title="מחיקת טיול" message="האם בטוח?" confirmText="מחק" isDangerous={true} onConfirm={confirmDeleteTrip} onClose={() => setTripToDelete(null)} />
            <ConfirmModal isOpen={!!hotelToDelete} title="מחיקת מלון" message="האם להסיר?" confirmText="הסר" isDangerous={true} onConfirm={confirmDeleteHotel} onClose={() => setHotelToDelete(null)} />
            <ConfirmModal isOpen={isDuplicateCleanupOpen} title="ניקוי כפילויות" message={`נשמור את "${activeTrip?.name || ''}"`} confirmText={isCleaningDuplicates ? 'מנקה...' : 'נקה'} isDangerous={true} onConfirm={confirmDuplicateCleanup} onClose={() => !isCleaningDuplicates && setIsDuplicateCleanupOpen(false)} />
            <ConfirmModal isOpen={!!tripToLeave} title="יציאה מטיול" message="עזוב?" confirmText="עזוב" isDangerous={true} onConfirm={async () => { if (tripToLeave) { await onLeaveTrip(tripToLeave); const newTrips = trips.filter(t => t.id !== tripToLeave); setTrips(newTrips); if (activeTripId === tripToLeave && newTrips.length > 0) { setActiveTripId(newTrips[0].id); } setTripToLeave(null); } }} onClose={() => setTripToLeave(null)} />

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col overflow-hidden">
                
                {/* HEADER */}
                <div className="bg-white border-b border-slate-200/50 flex-shrink-0 shadow-sm">
                    <div className="px-4 md:px-8 py-4 md:py-6">
                        {/* Mobile Header */}
                        <div className="md:hidden flex items-center justify-between mb-4">
                            <button onClick={onClose} className="flex items-center gap-2 text-blue-600 font-bold text-sm px-3 py-2 rounded-xl">
                                <ArrowRight className="w-4 h-4" />
                                חזרה
                            </button>
                            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 hover:text-slate-600">
                                <Menu className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Trip Name & Buttons */}
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div className="min-w-0">
                                <h1 className="text-3xl md:text-4xl font-black text-slate-900">{activeTrip?.name || 'ניהול טיול'}</h1>
                                <p className="text-slate-500 mt-1 font-medium text-sm">{activeTrip?.destination && activeTrip?.dates ? `${activeTrip.destination} • ${activeTrip.dates}` : activeTrip?.destination || '—'}</p>
                            </div>
                            <div className="flex-shrink-0 flex flex-col gap-2 md:gap-3 md:flex-row">
                                {activeTrip && (
                                    <>
                                        <button onClick={() => setIsShareModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-200 hover:bg-emerald-100 transition-all">
                                            <Share2 className="w-4 h-4" />
                                            <span className="hidden md:inline">שיתוף</span>
                                        </button>
                                        <button onClick={() => exportTripPDF(activeTrip)} className="flex items-center justify-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold border border-indigo-200 hover:bg-indigo-100 transition-all">
                                            <FileText className="w-4 h-4" />
                                            <span className="hidden md:inline">PDF</span>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* TAB NAVIGATION */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 md:mx-0 px-4 md:px-0 scrollbar-hide">
                            {[
                                { id: 'overview' as const, label: 'פרטים כלליים', icon: Layout },
                                { id: 'logistics' as const, label: 'טיסות ומלונות', icon: Plane },
                                { id: 'ai' as const, label: 'Magic Import', icon: Sparkles },
                                ...(auth.currentUser?.email === 'amitzahy1@gmail.com' ? [{ id: 'health' as const, label: 'בריאות נתונים', icon: CheckCircle }] : []),
                                ...(auth.currentUser?.email === 'amitzahy1@gmail.com' ? [{ id: 'logs' as const, label: 'System Logs', icon: Terminal }] : []),
                            ].map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-50 text-blue-700 border-2 border-blue-300' : 'bg-white text-slate-600 border-2 border-slate-200 hover:border-slate-300'}`}>
                                        <Icon className="w-4 h-4" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
                    <div className="max-w-5xl mx-auto pb-20">
                        {activeTab === 'overview' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="bg-white p-7 md:p-8 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6 mb-8">
                                        <div className="min-w-0">
                                            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                                <span className="bg-blue-100 p-2.5 rounded-lg text-blue-600"><Layout className="w-5 h-5" /></span> פרטים כלליים
                                            </h3>
                                            <p className="text-base text-slate-600 mt-2 font-medium">עדכן פרטים בסיסיים של הטיול</p>
                                        </div>
                                        {activeTrip && onCleanupDuplicates && (
                                            <button onClick={() => setIsDuplicateCleanupOpen(true)} disabled={isCleaningDuplicates} className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold border border-amber-200 hover:bg-amber-100">
                                                {isCleaningDuplicates ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                נקה כפילויות
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">שם הטיול</label>
                                            <input className="w-full text-2xl font-black text-slate-800 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl px-4 py-3 outline-none transition-all" value={activeTrip.name} onChange={(e) => handleUpdateTrip({ name: e.target.value })} placeholder='טיול יפן 2026' />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">מסלול (ערים)</label>
                                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 focus-within:border-blue-500 transition-all">
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {routeCities.map((city, idx) => (
                                                            <div key={idx} className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-sm font-bold text-slate-700">
                                                                <span>{city}</span>
                                                                <button onClick={() => removeCity(idx)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-slate-400" />
                                                        <input className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-700 placeholder:text-slate-400" value={newCityInput} onChange={(e) => setNewCityInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCity()} placeholder="הוסף עיר..." />
                                                        <button onClick={addCity} className="bg-slate-200 hover:bg-slate-300 p-1 rounded-md transition-colors"><Plus className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                                {(() => { const detected = getTripCities(activeTrip); const suggestions = detected.filter(c => !routeCities.some(rc => rc.toLowerCase() === c.toLowerCase())); return suggestions.length > 0 ? (<div className="mt-2 flex flex-wrap gap-2">{suggestions.map((s, i) => (<button key={i} onClick={() => { const newRoute = [...routeCities, s]; setRouteCities(newRoute); handleUpdateTrip({ destination: newRoute.join(' - ') }); }} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100"><Sparkles className="w-3 h-3" /> {s}</button>))}</div>) : null; })()}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">תאריכים</label>
                                                <div className="bg-slate-50 p-1 rounded-xl border border-slate-200 flex gap-1">
                                                    <div className="flex-1 p-2 border-l border-slate-200">
                                                        <span className="text-2xs font-bold text-slate-400 block mb-1">התחלה</span>
                                                        <DateInput value={startDate} onChange={(val) => handleDateChange('start', val)} className="w-full text-sm bg-transparent font-bold" />
                                                    </div>
                                                    <div className="flex-1 p-2">
                                                        <span className="text-2xs font-bold text-slate-400 block mb-1">סיום</span>
                                                        <DateInput value={endDate} onChange={(val) => handleDateChange('end', val)} className="w-full text-sm bg-transparent font-bold" />
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-center">
                                                    <span className="inline-block px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg border border-purple-100">{activeTrip.dates || "---"}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'logistics' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white p-7 rounded-xl shadow-sm border border-slate-200">
                                        <div className="flex justify-between items-center mb-7">
                                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                                <span className="bg-blue-100 p-2.5 rounded-lg text-blue-600"><Plane className="w-5 h-5" /></span> טיסות
                                            </h3>
                                            <button onClick={() => activeTrip && handleUpdateTrip({ flights: { ...activeTrip.flights, segments: [...(activeTrip.flights?.segments || []), { flightNumber: '', fromCode: '', toCode: '', fromCity: '', toCity: '', date: '', departureTime: '', arrivalTime: '', airline: '', duration: '' }] } })} className="text-xs font-bold bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5">
                                                <Plus className="w-4 h-4" /> הוסף
                                            </button>
                                        </div>
                                        {(activeTrip?.flights?.segments || []).length === 0 ? (
                                            <div className="text-center py-12">
                                                <Plane className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                                <div className="text-slate-400 text-sm">אין טיסות ברשימה</div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {(activeTrip?.flights?.segments || []).map((seg, idx) => (
                                                    <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                                            <input className="bg-white px-2 py-1 rounded border border-slate-100 font-mono font-bold uppercase" value={seg.flightNumber || ''} onChange={(e) => handleUpdateFlightSegment(idx, 'flightNumber', e.target.value)} placeholder="LY001" />
                                                            <input type="date" className="bg-white px-2 py-1 rounded border border-slate-100 font-bold" value={seg.date || ''} onChange={(e) => handleUpdateFlightSegment(idx, 'date', e.target.value)} />
                                                        </div>
                                                        <div className="text-sm font-bold text-slate-700">{seg.fromCity || seg.fromCode} → {seg.toCity || seg.toCode}</div>
                                                        <div className="text-xs text-slate-500 mt-1">{seg.departureTime} - {seg.arrivalTime}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white p-7 rounded-xl shadow-sm border border-slate-200">
                                        <div className="flex justify-between items-center mb-7">
                                            <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                                <span className="bg-indigo-100 p-2.5 rounded-lg text-indigo-600"><Hotel className="w-5 h-5" /></span> מלונות
                                            </h3>
                                            <button onClick={() => activeTrip && handleUpdateTrip({ hotels: [...activeTrip.hotels, { id: `h-${Date.now()}`, name: 'מלון חדש', address: '', checkInDate: '', checkOutDate: '', nights: 0 }] })} className="text-xs font-bold bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-100 border border-indigo-200 flex items-center gap-1.5">
                                                <Plus className="w-4 h-4" /> הוסף
                                            </button>
                                        </div>
                                        {(activeTrip?.hotels || []).length === 0 ? (
                                            <div className="text-center py-12">
                                                <Hotel className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                                <div className="text-slate-400 text-sm">אין מלונות ברשימה</div>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {(activeTrip?.hotels || []).map((h, idx) => (
                                                    <div key={h.id || idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 relative group">
                                                        <button onClick={() => handleDeleteHotel(h.id)} className="absolute top-2 left-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"><Trash2 className="w-4 h-4" /></button>
                                                        <input className="w-full font-bold text-slate-800 bg-transparent border-b border-transparent focus:border-slate-300 outline-none mb-2" value={h.name} onChange={(e) => handleUpdateHotel(h.id, 'name', e.target.value)} placeholder="שם המלון..." />
                                                        <div className="flex items-center gap-2 text-slate-500 text-sm bg-white p-2 rounded-lg border border-slate-100 mb-2">
                                                            <MapPin className="w-3.5 h-3.5" />
                                                            <input className="flex-1 bg-transparent border-none outline-none text-xs" value={h.address} onChange={(e) => handleUpdateHotel(h.id, 'address', e.target.value)} placeholder="כתובת..." />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                                            <DateInput className="w-full font-bold" value={h.checkInDate} onChange={(iso) => handleUpdateHotel(h.id, 'checkInDate', iso)} />
                                                            <DateInput className="w-full font-bold" value={h.checkOutDate} onChange={(iso) => handleUpdateHotel(h.id, 'checkOutDate', iso)} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'ai' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-7">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-white/20 p-3 rounded-lg">
                                                <Terminal className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-white">יבוא מטקסט חופשי</h3>
                                                <p className="text-slate-300 text-sm mt-1">הדבק תוכנית טיול וה-AI יארגן הכל</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-7 space-y-4">
                                        <textarea className="w-full h-48 p-4 bg-slate-50 rounded-lg border border-slate-200 focus:border-indigo-400 outline-none resize-none text-sm" placeholder="הדבק כאן..." value={freeText} onChange={e => setFreeText(e.target.value)} />
                                        <button onClick={handleFreeTextImport} disabled={!freeText.trim() || isFreeTextProcessing} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                                            {isFreeTextProcessing ? <><Loader2 className="w-4 h-4 animate-spin" /> ניתוח...</> : <><Sparkles className="w-4 h-4" /> נתח וייבא</>}
                                        </button>
                                        {freeTextResult && (
                                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
                                                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                                                    <CheckCircle className="w-5 h-5" /> ה-AI זיהה: {freeTextResult.summary}
                                                </div>
                                                {freeTextResult.hotels.length > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="text-xs font-bold text-slate-600">מלונות ({freeTextResult.hotels.length})</div>
                                                        {freeTextResult.hotels.map((h, i) => (
                                                            <div key={i} className="bg-white rounded-lg p-2 border border-emerald-100 text-xs">
                                                                <div className="font-bold">{h.name}</div>
                                                                <div className="text-slate-500">{h.checkInDate} → {h.checkOutDate}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="flex gap-2">
                                                    <button onClick={handleFreeTextApply} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm">הוסף</button>
                                                    <button onClick={() => setFreeTextResult(null)} className="px-4 py-2 bg-white text-slate-500 rounded-lg font-bold border">ביטול</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl p-8 text-white text-center">
                                    <Sparkles className="w-14 h-14 mx-auto mb-4 text-yellow-300" />
                                    <h3 className="text-2xl font-black mb-2">Magic Import — קבצים</h3>
                                    <p className="text-purple-100 mb-6">גרור PDF וה-AI יחלץ את הנתונים</p>
                                    <div className="bg-white/10 rounded-lg p-6">
                                        <MagicDropZone activeTrip={activeTrip} onUpdate={handleAiUpdate} compact={false} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'health' && auth.currentUser?.email === 'amitzahy1@gmail.com' && (
                            <DataHealthPanel trip={activeTrip} />
                        )}

                        {activeTab === 'logs' && auth.currentUser?.email === 'amitzahy1@gmail.com' && (
                            <SystemLogs />
                        )}
                    </div>
                </div>
            </div>

            {isShareModalOpen && <ShareModal trip={activeTrip} onClose={() => setIsShareModalOpen(false)} onUpdateTrip={(updatedTrip) => { const newTrips = trips.map(t => t.id === activeTripId ? updatedTrip : t); setTrips(newTrips); onSave(newTrips); }} />}

            {isWizardOpen && <MagicalWizard isOpen={true} onClose={() => setIsWizardOpen(false)} onComplete={(wizardData) => { const newTrip: Trip = { id: crypto.randomUUID(), name: wizardData.destination ? `Trip to ${wizardData.destination}` : "New Adventure", destination: wizardData.destination || "", dates: wizardData.startDate ? `${wizardData.startDate} - ${wizardData.endDate}` : "", coverImage: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80", flights: wizardData.flights || { passengers: [], pnr: "", segments: [] }, hotels: wizardData.hotels || [], restaurants: [], attractions: [], itinerary: [], documents: [], secureNotes: [], isShared: false }; handleCreateTrip(newTrip); }} />}
        </div>
    );
};
