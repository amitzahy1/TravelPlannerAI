import React, { useState, useRef, useEffect } from 'react';
import { Trip, HotelBooking, FlightSegment } from '../types';
import { Save, X, Plus, Trash2, Layout, Sparkles, Globe, UploadCloud, Download, Share2, Calendar, Plane, Hotel, MapPin, ArrowRight, ArrowLeft, Loader2, CalendarCheck, FileText, Image as ImageIcon, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { getAI, AI_MODEL, generateWithFallback } from '../services/aiService';
import { MagicDropZone } from './MagicDropZone';
import { ShareModal } from './ShareModal';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

interface TripSettingsModalProps {
    data: Trip[];
    onSave: (newData: Trip[]) => void;
    onClose: () => void;
}

// --- Helpers ---
const toInputDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
};

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

    // Form States
    const [routeCities, setRouteCities] = useState<string[]>([]);
    const [newCityInput, setNewCityInput] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Calendar Debug
    const [tokenStatus, setTokenStatus] = useState<'unknown' | 'valid' | 'invalid' | 'missing'>('unknown');
    const [debugLog, setDebugLog] = useState<string[]>([]);

    useEffect(() => {
        setTrips(data);
        if (data.length > 0 && !data.find(t => t.id === activeTripId)) {
            setActiveTripId(data[0].id);
        }
    }, [data]);

    const activeTrip = trips.find(t => t.id === activeTripId) || trips[0];

    useEffect(() => {
        if (activeTrip) {
            if (activeTrip.destination) {
                setRouteCities(activeTrip.destination.split(' - ').map(s => s.trim()).filter(Boolean));
            } else {
                setRouteCities([]);
            }
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

    // --- Input Logic ---
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

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        let newStart = startDate;
        let newEnd = endDate;
        if (type === 'start') { setStartDate(value); newStart = value; }
        else { setEndDate(value); newEnd = value; }
        if (newStart && newEnd) {
            handleUpdateTrip({ dates: `${toDisplayDate(newStart)} - ${toDisplayDate(newEnd)}` });
        }
    };

    // --- Deletion Logic ---
    const handleDeleteTrip = (e: React.MouseEvent, tripIdToDelete: string) => {
        e.stopPropagation();
        if (window.confirm("למחוק את הטיול הזה?")) {
            const newTrips = trips.filter(t => t.id !== tripIdToDelete);
            if (newTrips.length === 0) newTrips.push({ id: `t-${Date.now()}`, name: 'טיול חדש', dates: '', destination: 'יעד', coverImage: '', flights: { passengerName: '', pnr: '', segments: [] }, hotels: [], restaurants: [], attractions: [], itinerary: [], documents: [] });
            setTrips(newTrips);
            if (activeTripId === tripIdToDelete) setActiveTripId(newTrips[0].id);
            onSave(newTrips);
        }
    };

    // --- Calendar Debugging ---
    const checkCalendarToken = async () => {
        const token = localStorage.getItem('google_access_token');
        if (!token) {
            setTokenStatus('missing');
            setDebugLog(prev => [...prev, "No token found in localStorage"]);
            return;
        }
        try {
            setDebugLog(prev => [...prev, "Verifying token online..."]);
            const res = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
            if (!res.ok) throw new Error('Token check failed');
            const info = await res.json();
            setDebugLog(prev => [...prev, `Token valid. Scope: ${info.scope}`]);
            if (info.scope.includes('calendar')) {
                setTokenStatus('valid');
            } else {
                setTokenStatus('invalid'); // Valid token, but missing scope
                setDebugLog(prev => [...prev, "WARN: Missing 'calendar' scope!"]);
            }
        } catch (e: any) {
            setTokenStatus('invalid');
            setDebugLog(prev => [...prev, `Error: ${e.message}`]);
        }
    };

    const forceReAuth = async () => {
        try {
            const provider = new GoogleAuthProvider();
            provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
            provider.setCustomParameters({ prompt: 'select_account consent' });
            await signInWithPopup(auth, provider).then(result => {
                const credential = GoogleAuthProvider.credentialFromResult(result);
                if (credential?.accessToken) {
                    localStorage.setItem('google_access_token', credential.accessToken);
                    setDebugLog(prev => [...prev, "New token saved!"]);
                    checkCalendarToken();
                    alert("התחברת מחדש בהצלחה! נסה לסנכרן כעת.");
                }
            });
        } catch (e: any) {
            alert("שגיאה בהתחברות: " + e.message);
        }
    };

    // --- Layout Components ---
    const Card = ({ title, icon: Icon, children, action }: any) => (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                    <div className="bg-white p-1.5 rounded-lg border border-slate-100 shadow-sm text-slate-500">
                        <Icon className="w-4 h-4" />
                    </div>
                    {title}
                </div>
                {action}
            </div>
            <div className="p-4 flex-1">{children}</div>
        </div>
    );

    const SectionHeader = ({ title }: { title: string }) => (
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 mt-6 px-1">{title}</h3>
    );

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-100 animate-fade-in custom-scrollbar overflow-y-auto">

            {/* 1. Top Bar */}
            <div className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 md:px-8 py-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <ArrowRight className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-black text-slate-800">ניהול טיול</h1>
                    <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>

                    {/* Trip Selector (Dropdown style for Compactness) */}
                    <div className="relative group hidden md:block">
                        <button className="flex items-center gap-2 font-bold text-slate-700 hover:bg-slate-50 px-3 py-1.5 rounded-xl transition-colors border border-transparent hover:border-slate-200">
                            {activeTrip.name} <AlertTriangle className="w-3 h-3 text-slate-400" />
                        </button>
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-slate-100 shadow-xl rounded-xl p-2 hidden group-hover:block animate-fade-in">
                            {trips.map(t => (
                                <button key={t.id} onClick={() => setActiveTripId(t.id)} className={`w-full text-right px-3 py-2 rounded-lg text-sm font-bold flex justify-between items-center ${activeTripId === t.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-600'}`}>
                                    {t.name}
                                    {activeTripId === t.id && <CheckCircle className="w-3 h-3" />}
                                </button>
                            ))}
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button onClick={() => setIsWizardOpen(true)} className="w-full text-right px-3 py-2 rounded-lg text-sm font-bold text-blue-600 hover:bg-blue-50 flex items-center gap-2">
                                <Plus className="w-3 h-3" /> טיול חדש
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={() => checkCalendarToken()} className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors">
                        <AlertTriangle className="w-3 h-3" /> בדיקת חיבור
                    </button>
                    <button onClick={() => onClose()} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2">
                        <Save className="w-4 h-4" /> שמור וסגור
                    </button>
                </div>
            </div>

            {/* 2. Main Grid Content */}
            <div className="max-w-7xl mx-auto w-full p-4 md:p-8 space-y-8">

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                    {/* LEFT COLUMN (Core Info) - Span 4 */}
                    <div className="md:col-span-4 space-y-6">

                        <SectionHeader title="פרטים כלליים" />
                        <Card title="פרטי הטיול" icon={Layout}>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">שם הטיול</label>
                                    <input className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition-all" value={activeTrip.name} onChange={e => handleUpdateTrip({ name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">תמונת רקע</label>
                                    <div className="flex gap-2">
                                        <input className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 focus:bg-white outline-none" value={activeTrip.coverImage} onChange={e => handleUpdateTrip({ coverImage: e.target.value })} placeholder="https://..." />
                                        <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0">
                                            {activeTrip.coverImage && <img src={activeTrip.coverImage} className="w-full h-full object-cover" />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card title="תאריכים ויעד" icon={Calendar}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">התחלה</label>
                                        <input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none" value={startDate} onChange={e => handleDateChange('start', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">סיום</label>
                                        <input type="date" className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none" value={endDate} onChange={e => handleDateChange('end', e.target.value)} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">מסלול (ערים)</label>
                                    <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-50 rounded-xl border border-slate-100 min-h-[50px]">
                                        {routeCities.map((city, i) => (
                                            <span key={i} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1">
                                                {city} <button onClick={() => removeCity(i)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                                            </span>
                                        ))}
                                        <input className="bg-transparent text-xs font-bold outline-none flex-1 min-w-[60px]" placeholder="+ הוסף..." value={newCityInput} onChange={e => setNewCityInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCity()} />
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                            <h4 className="font-black text-blue-800 mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4" /> אזור העלאה חכם</h4>
                            <div className="scale-95 origin-top-left">
                                <MagicDropZone activeTrip={activeTrip} onUpdate={(u) => { handleUpdateTrip({ ...u }); onSave(trips.map(t => t.id === activeTripId ? { ...t, ...u } : t)); }} compact={true} />
                            </div>
                        </div>

                    </div>


                    {/* RIGHT COLUMN (Logistics) - Span 8 */}
                    <div className="md:col-span-8 space-y-6">

                        <SectionHeader title="לוגיסטיקה" />

                        {/* FLIGHTS */}
                        <Card title="טיסות" icon={Plane} action={
                            <button onClick={() => handleUpdateTrip({ flights: { ...activeTrip.flights, segments: [...(activeTrip.flights.segments || []), { fromCode: '', toCode: '', date: '', flightNumber: '', airline: '', departureTime: '', arrivalTime: '', duration: '', fromCity: '', toCity: '' }] } })} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition-colors">+ הוסף טיסה</button>
                        }>
                            <div className="space-y-3">
                                {activeTrip.flights?.segments?.map((seg, idx) => (
                                    <div key={idx} className="group flex flex-col md:flex-row items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all relative">
                                        <div className="flex items-center gap-2">
                                            <input className="w-12 text-center font-black text-sm bg-white border border-slate-200 rounded py-1 uppercase" value={seg.fromCode} onChange={e => { const newS = [...activeTrip.flights.segments]; newS[idx].fromCode = e.target.value; handleUpdateTrip({ flights: { ...activeTrip.flights, segments: newS } }) }} placeholder="TLV" />
                                            <ArrowRight className="w-3 h-3 text-slate-400" />
                                            <input className="w-12 text-center font-black text-sm bg-white border border-slate-200 rounded py-1 uppercase" value={seg.toCode} onChange={e => { const newS = [...activeTrip.flights.segments]; newS[idx].toCode = e.target.value; handleUpdateTrip({ flights: { ...activeTrip.flights, segments: newS } }) }} placeholder="JFK" />
                                        </div>
                                        <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
                                        <div className="grid grid-cols-2 gap-2 flex-1 w-full">
                                            <input type="date" className="bg-transparent text-xs font-bold text-slate-600 outline-none" value={toInputDate(seg.date)} onChange={e => { const newS = [...activeTrip.flights.segments]; newS[idx].date = e.target.value; handleUpdateTrip({ flights: { ...activeTrip.flights, segments: newS } }) }} />
                                            <input className="bg-transparent text-xs font-bold text-slate-600 outline-none placeholder-slate-400" value={seg.flightNumber} onChange={e => { const newS = [...activeTrip.flights.segments]; newS[idx].flightNumber = e.target.value; handleUpdateTrip({ flights: { ...activeTrip.flights, segments: newS } }) }} placeholder="מספר טיסה" />
                                        </div>
                                        <button onClick={() => { if (window.confirm('למחוק?')) { const newS = activeTrip.flights.segments.filter((_, i) => i !== idx); handleUpdateTrip({ flights: { ...activeTrip.flights, segments: newS } }) } }} className="absolute -top-2 -left-2 md:static md:opacity-0 md:group-hover:opacity-100 p-1.5 bg-white text-red-500 rounded-lg shadow-sm hover:bg-red-50 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                ))}
                                {(!activeTrip.flights?.segments?.length) && <div className="text-center py-8 text-slate-300 text-xs">אין טיסות. לחץ על + להוספה.</div>}
                            </div>
                        </Card>

                        {/* HOTELS */}
                        <Card title="מלונות" icon={Hotel} action={
                            <button onClick={() => handleUpdateTrip({ hotels: [...activeTrip.hotels, { id: `h-${Date.now()}`, name: '', address: '', checkInDate: '', checkOutDate: '', nights: 0 }] })} className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors">+ הוסף מלון</button>
                        }>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeTrip.hotels?.map((hotel, idx) => (
                                    <div key={idx} className="group p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all relative">
                                        <div className="mb-2">
                                            <input className="w-full font-bold text-sm bg-transparent outline-none placeholder-slate-400" value={hotel.name} onChange={e => { const newH = [...activeTrip.hotels]; newH[idx].name = e.target.value; handleUpdateTrip({ hotels: newH }) }} placeholder="שם המלון" />
                                            <input className="w-full text-xs text-slate-500 bg-transparent outline-none placeholder-slate-300" value={hotel.address} onChange={e => { const newH = [...activeTrip.hotels]; newH[idx].address = e.target.value; handleUpdateTrip({ hotels: newH }) }} placeholder="כתובת" />
                                        </div>
                                        <div className="flex gap-2 mt-2 bg-white p-2 rounded-lg border border-slate-100">
                                            <div className="flex-1">
                                                <label className="text-[8px] font-bold text-slate-400 block">IN</label>
                                                <input type="date" className="w-full text-[10px] font-bold outline-none" value={toInputDate(hotel.checkInDate)} onChange={e => { const newH = [...activeTrip.hotels]; newH[idx].checkInDate = e.target.value; handleUpdateTrip({ hotels: newH }) }} />
                                            </div>
                                            <div className="w-px bg-slate-100"></div>
                                            <div className="flex-1">
                                                <label className="text-[8px] font-bold text-slate-400 block">OUT</label>
                                                <input type="date" className="w-full text-[10px] font-bold outline-none" value={toInputDate(hotel.checkOutDate)} onChange={e => { const newH = [...activeTrip.hotels]; newH[idx].checkOutDate = e.target.value; handleUpdateTrip({ hotels: newH }) }} />
                                            </div>
                                        </div>
                                        <button onClick={() => { if (window.confirm('למחוק?')) { const newH = activeTrip.hotels.filter((_, i) => i !== idx); handleUpdateTrip({ hotels: newH }) } }} className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                ))}
                            </div>
                            {(!activeTrip.hotels?.length) && <div className="text-center py-8 text-slate-300 text-xs">אין מלונות. לחץ על + להוספה.</div>}
                        </Card>


                        {/* DEBUG & ACTIONS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card title="פעולות" icon={Share2}>
                                <div className="space-y-2">
                                    <button onClick={() => setIsShareModalOpen(true)} className="w-full py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors flex items-center justify-center gap-2">
                                        <Share2 className="w-4 h-4" /> שתף טיול
                                    </button>
                                </div>
                            </Card>

                            <div className="bg-slate-900 rounded-2xl p-4 text-slate-300 font-mono text-xs">
                                <h4 className="font-bold text-white mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500" /> דיבאג יומן</h4>
                                <div className="space-y-2 mb-4 max-h-24 overflow-y-auto">
                                    {debugLog.length === 0 && <div>תחנת דיבאג מוכנה...</div>}
                                    {debugLog.map((l, i) => <div key={i}>{l}</div>)}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={checkCalendarToken} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-white font-bold">Check Token</button>
                                    <button onClick={forceReAuth} className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded text-white font-bold">Force Re-Auth</button>
                                </div>
                                <div className="mt-2 text-[10px] text-slate-500">
                                    Status: <span className={tokenStatus === 'valid' ? 'text-green-400' : 'text-red-400'}>{tokenStatus}</span>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </div>

            {/* Modals */}
            {isShareModalOpen && (
                <ShareModal trip={activeTrip} onClose={() => setIsShareModalOpen(false)} onUpdateTrip={(updated) => { handleUpdateTrip(updated); onSave(trips.map(t => t.id === activeTripId ? updated : t)); }} />
            )}
        </div>
    );
};