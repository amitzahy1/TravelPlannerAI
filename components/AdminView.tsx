import React, { useState } from 'react';
import { Trip, FlightSegment, HotelBooking, Restaurant, Attraction } from '../types';
import { X, Trash2, Plus, Save, Plane, Hotel, Utensils, Ticket, Edit3, Check } from 'lucide-react';

interface AdminViewProps {
    data: Trip[];
    currentTripId?: string;
    onSave: (newTrips: Trip[]) => void;
    onSwitchTrip: (id: string) => void;
    onDeleteTrip: (id: string) => void;
    onLeaveTrip: (id: string) => void;
    onClose: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
    data, currentTripId, onSave, onSwitchTrip, onDeleteTrip, onLeaveTrip, onClose
}) => {

    const [selectedTripId, setSelectedTripId] = useState<string | undefined>(currentTripId || (data.length > 0 ? data[0].id : undefined));
    const activeTrip = data.find(t => t.id === selectedTripId);

    // Local state for edits
    const [editedTrip, setEditedTrip] = useState<Trip | null>(activeTrip ? JSON.parse(JSON.stringify(activeTrip)) : null);

    // Update local state when switching trips
    React.useEffect(() => {
        if (activeTrip) {
            setEditedTrip(JSON.parse(JSON.stringify(activeTrip)));
        }
    }, [activeTrip]);

    const handleSave = () => {
        if (editedTrip) {
            // Update the main array
            const newTrips = data.map(t => t.id === editedTrip.id ? editedTrip : t);
            onSave(newTrips);
            alert("השינויים נשמרו בהצלחה!");
        }
    };

    const updateFlight = (index: number, field: keyof FlightSegment, value: string) => {
        if (!editedTrip) return;
        const newSegments = [...(editedTrip.flights?.segments || [])];
        newSegments[index] = { ...newSegments[index], [field]: value };
        setEditedTrip({ ...editedTrip, flights: { ...editedTrip.flights, segments: newSegments } });
    };

    // --- NEW: Helper to split ISO date into Date and Time for Inputs ---
    const getIsoSplit = (isoString: string) => {
        if (!isoString) return { date: '', time: '' };
        try {
            // Handle "2026-02-04T12:00:00" -> date: 2026-02-04, time: 12:00
            const [date, timePart] = isoString.split('T');
            const time = timePart ? timePart.substring(0, 5) : '';
            return { date, time };
        } catch (e) {
            return { date: '', time: '' };
        }
    };

    const updateFlightDateTime = (index: number, type: 'date' | 'time', value: string) => {
        if (!editedTrip) return;
        const segments = [...(editedTrip.flights?.segments || [])];
        const currentIso = segments[index].date || new Date().toISOString();
        const { date: currDate, time: currTime } = getIsoSplit(currentIso);

        let newIso = currentIso;
        if (type === 'date') {
            newIso = `${value}T${currTime || '00:00'}:00`;
        } else {
            newIso = `${currDate || new Date().toISOString().split('T')[0]}T${value}:00`;
            // Also update separate time fields if they exist
            segments[index].departureTime = value;
        }

        segments[index].date = newIso;
        setEditedTrip({ ...editedTrip, flights: { ...editedTrip.flights, segments } });
    };

    // Renders
    if (!editedTrip) return <div className="p-10 text-center">טוען נתונים...</div>;

    return (
        <div className="fixed inset-0 bg-white z-50 overflow-auto animate-fade-in" dir="rtl">

            {/* Top Bar */}
            <div className="bg-slate-900 text-white p-4 sticky top-0 z-10 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black">ממשק ניהול מתקדם</h2>
                    <select
                        value={selectedTripId}
                        onChange={(e) => setSelectedTripId(e.target.value)}
                        className="bg-slate-800 border-none text-white rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        {data.map(t => <option key={t.id} value={t.id}>{t.name || 'טיול ללא שם'}</option>)}
                    </select>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2">
                        <Save className="w-4 h-4" /> שמור שינויים
                    </button>
                    <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-8 space-y-12 pb-32">

                {/* --- 1. FLIGHTS MANAGEMENT (The Revolution) --- */}
                <section className="space-y-6">
                    <div className="flex items-center gap-3 border-b pb-2">
                        <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Plane className="w-6 h-6" /></div>
                        <h3 className="text-2xl font-black text-slate-800">ניהול טיסות</h3>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {editedTrip.flights?.segments?.map((seg, i) => {
                            const { date, time } = getIsoSplit(seg.date);
                            return (
                                <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative group hover:shadow-lg transition-all">
                                    <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="text-red-400 hover:text-red-600 bg-white p-2 rounded-full shadow-sm"><Trash2 className="w-4 h-4" /></button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                        {/* Airline & Number */}
                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-xs font-bold text-slate-400">חברת תעופה / מס' טיסה</label>
                                            <div className="flex gap-2">
                                                <input
                                                    value={seg.airline}
                                                    onChange={(e) => updateFlight(i, 'airline', e.target.value)}
                                                    className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none font-bold"
                                                    placeholder="Airline"
                                                />
                                                <input
                                                    value={seg.flightNumber}
                                                    onChange={(e) => updateFlight(i, 'flightNumber', e.target.value)}
                                                    className="w-24 p-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none font-mono text-sm"
                                                    placeholder="No."
                                                />
                                            </div>
                                        </div>

                                        {/* Route */}
                                        <div className="md:col-span-3 space-y-1">
                                            <label className="text-xs font-bold text-slate-400">נתיב (קוד שדה תעופה)</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    value={seg.fromCode}
                                                    onChange={(e) => updateFlight(i, 'fromCode', e.target.value)}
                                                    className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-center font-black uppercase tracking-wider"
                                                    placeholder="ORG"
                                                />
                                                <span className="text-slate-300">➔</span>
                                                <input
                                                    value={seg.toCode}
                                                    onChange={(e) => updateFlight(i, 'toCode', e.target.value)}
                                                    className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none text-center font-black uppercase tracking-wider"
                                                    placeholder="DST"
                                                />
                                            </div>
                                        </div>

                                        {/* Date & Time (The Fix!) */}
                                        <div className="md:col-span-4 space-y-1">
                                            <label className="text-xs font-bold text-slate-400">תאריך ושעת המראה</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="date"
                                                    value={date}
                                                    onChange={(e) => updateFlightDateTime(i, 'date', e.target.value)}
                                                    className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none"
                                                />
                                                <input
                                                    type="time"
                                                    value={seg.departureTime || time}
                                                    onChange={(e) => {
                                                        updateFlight(i, 'departureTime', e.target.value);
                                                        updateFlightDateTime(i, 'time', e.target.value);
                                                    }}
                                                    className="w-32 p-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none font-mono"
                                                />
                                            </div>
                                        </div>

                                        {/* Arrival Time */}
                                        <div className="md:col-span-2 space-y-1">
                                            <label className="text-xs font-bold text-slate-400">שעת נחיתה</label>
                                            <input
                                                type="time"
                                                value={seg.arrivalTime}
                                                onChange={(e) => updateFlight(i, 'arrivalTime', e.target.value)}
                                                className="w-full p-2 rounded-lg border border-slate-300 focus:border-blue-500 outline-none font-mono bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <button className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-colors font-bold flex justify-center items-center gap-2">
                            <Plus className="w-5 h-5" /> הוסף טיסה חדשה
                        </button>
                    </div>
                </section>

                {/* --- 2. HOTELS (Placeholder for similar logic) --- */}
                <section className="space-y-6 opacity-50 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-3 border-b pb-2">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Hotel className="w-6 h-6" /></div>
                        <h3 className="text-2xl font-black text-slate-800">ניהול מלונות (בקרוב)</h3>
                    </div>
                    {/* Add Hotel Editor Here */}
                </section>

            </div>
        </div>
    );
};
