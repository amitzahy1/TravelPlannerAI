import React, { useMemo, useState } from 'react';
import { Trip, SecureNote, FlightSegment } from '../types';
import { X, Plane, Hotel, Copy, Eye, EyeOff, ShieldCheck, Plus, Trash2, MapPin, Calendar, Lock, Maximize2, Loader2, Phone, ExternalLink, Users, Info } from 'lucide-react';
import { getCheckInUrl } from '../utils/airlineCheckIn';
import { safeMapsUrl } from '../utils/mapsUrl';
import { detectCountryCode } from '../utils/countryCodes';
import { toast } from '../stores/useToastStore';

interface QuickAccessWalletProps {
    trip: Trip;
    onClose: () => void;
    onUpdateTrip: (t: Trip) => void;
}

type WalletTab = 'flights' | 'hotels' | 'vault';

export const QuickAccessWallet: React.FC<QuickAccessWalletProps> = ({ trip, onClose, onUpdateTrip }) => {
    const [activeTab, setActiveTab] = useState<WalletTab>('flights');
    const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
    const [newNote, setNewNote] = useState<Partial<SecureNote>>({ title: '', value: '', category: 'passport' });
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [showDriverMode, setShowDriverMode] = useState<string | null>(null);
    const [expandedHotelInstructions, setExpandedHotelInstructions] = useState<Record<string, boolean>>({});

    const [isVaultLocked, setIsVaultLocked] = useState(true);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const handleUnlockVault = () => {
        setIsAuthenticating(true);
        setTimeout(() => {
            setIsAuthenticating(false);
            setIsVaultLocked(false);
        }, 1000);
    };

    const handleTabChange = (tab: WalletTab) => {
        setActiveTab(tab);
        if (tab === 'vault') setIsVaultLocked(true);
    };

    const toggleSecret = (id: string) => {
        setShowSecret(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (text: string, label?: string) => {
        navigator.clipboard.writeText(text);
        toast.info(label ? `${label} הועתק` : 'הועתק ללוח');
    };

    const handleAddNote = () => {
        if (!newNote.title || !newNote.value) return;
        const note: SecureNote = {
            id: `sec-${Date.now()}`,
            title: newNote.title || 'מידע רגיש',
            value: newNote.value || '',
            category: newNote.category as any,
        };
        onUpdateTrip({ ...trip, secureNotes: [...(trip.secureNotes || []), note] });
        setNewNote({ title: '', value: '', category: 'passport' });
        setIsAddingNote(false);
    };

    const handleDeleteNote = (id: string) => {
        if (window.confirm('למחוק פריט זה מהכספת?')) {
            onUpdateTrip({ ...trip, secureNotes: (trip.secureNotes || []).filter(n => n.id !== id) });
        }
    };

    // Aggregate ALL flight segments from both `trip.flights` (legacy) and
    // `trip.transports` (the unified array used by some imports). Dedup by
    // flightNumber + date so a segment imported twice doesn't double-render.
    const allSegments: Array<FlightSegment & { _pnr?: string; _passengers?: string[] }> = useMemo(() => {
        const out: Array<FlightSegment & { _pnr?: string; _passengers?: string[] }> = [];
        const seen = new Set<string>();
        const ticketPnr = trip.flights?.pnr;
        const ticketPassengers = trip.flights?.passengers;
        for (const seg of trip.flights?.segments || []) {
            const key = `${seg.flightNumber}|${seg.date || ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ ...seg, _pnr: (seg as any).confirmationCode || ticketPnr, _passengers: ticketPassengers });
        }
        for (const t of trip.transports || []) {
            if ((t as any).kind && (t as any).kind !== 'flight') continue;
            const seg = (t as any) as FlightSegment;
            if (!seg.flightNumber) continue;
            const key = `${seg.flightNumber}|${seg.date || ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ ...seg, _pnr: (seg as any).confirmationCode, _passengers: ticketPassengers });
        }
        return out;
    }, [trip.flights, trip.transports]);

    const lastNameForCheckIn = useMemo(() => {
        const first = (trip.flights?.passengers || [])[0] || '';
        const parts = first.trim().split(/\s+/);
        return parts.length > 1 ? parts[parts.length - 1] : first;
    }, [trip.flights?.passengers]);

    const tripCountryCode = useMemo(() => detectCountryCode(trip.destinationEnglish, trip.destination), [trip.destinationEnglish, trip.destination]);

    if (showDriverMode) {
        return (
            <div className="fixed inset-0 z-[110] bg-white flex flex-col items-center justify-center p-6 text-center animate-scale-in">
                <button onClick={() => setShowDriverMode(null)} className="absolute top-6 right-6 bg-gray-100 p-4 rounded-full"><X className="w-8 h-8 text-gray-800" /></button>
                <h3 className="text-gray-400 font-bold uppercase tracking-widest mb-6">הראה לנהג</h3>
                <p className="text-4xl md:text-6xl font-black text-gray-900 leading-tight" dir="auto">{showDriverMode}</p>
            </div>
        );
    }

    const flightCount = allSegments.length;
    const hotelCount = (trip.hotels || []).length;

    return (
        <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-md flex items-end md:items-center justify-center animate-fade-in">
            <div className="bg-slate-100 w-full md:max-w-md h-[90vh] md:h-[650px] rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative">

                <div className="bg-slate-900 text-white p-6 pb-8 rounded-b-[2rem] shadow-lg relative z-10 flex-shrink-0">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-2xl font-black flex items-center gap-2">
                                <span className="bg-blue-600 p-1.5 rounded-lg"><ShieldCheck className="w-5 h-5" /></span>
                                ארנק נסיעות
                            </h2>
                            <p className="text-slate-400 text-xs mt-1 font-medium">גישה מהירה ללא אינטרנט</p>
                        </div>
                        <button onClick={onClose} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="flex bg-slate-800/50 p-1 rounded-xl gap-1">
                        <TabButton active={activeTab === 'flights'} onClick={() => handleTabChange('flights')} label="טיסות" badge={flightCount} />
                        <TabButton active={activeTab === 'hotels'} onClick={() => handleTabChange('hotels')} label="מלונות" badge={hotelCount} />
                        <TabButton active={activeTab === 'vault'} onClick={() => handleTabChange('vault')} label="כספת" />
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-100 -mt-4 pt-8 pb-10">

                    {activeTab === 'flights' && (
                        <>
                            {flightCount === 0 ? (
                                <div className="text-center text-slate-400 py-8 bg-white rounded-2xl border border-dashed border-slate-200">
                                    <Plane className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <div className="font-bold">אין טיסות בארנק</div>
                                    <div className="text-xs mt-1 text-slate-400">הוסף אישור הזמנה ב-Magical Wizard או בכרטיסיית הטיסות</div>
                                </div>
                            ) : allSegments.map((seg, idx) => {
                                const pnr = seg._pnr || trip.flights?.pnr || '';
                                const checkin = getCheckInUrl(seg.airline, pnr, lastNameForCheckIn);
                                return (
                                    <div key={`${seg.flightNumber}-${seg.date}-${idx}`} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                                        <div className="relative z-10 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><Plane className="w-5 h-5" /></div>
                                                    <div>
                                                        <div className="text-2xs text-slate-400 font-bold uppercase tracking-wider">מספר טיסה</div>
                                                        <div className="text-xl font-black text-slate-800">{seg.flightNumber}</div>
                                                        {seg.airline && <div className="text-xs font-bold text-slate-500">{seg.airline}</div>}
                                                    </div>
                                                </div>
                                                <div className="text-left bg-blue-50 px-3 py-1.5 rounded-lg max-w-[55%]">
                                                    <div className="text-2xs text-blue-400 font-bold uppercase tracking-wider">קוד הזמנה (PNR)</div>
                                                    {pnr ? (
                                                        <button onClick={() => copyToClipboard(pnr, 'PNR')} className="flex items-center gap-1.5 text-base font-mono font-black text-blue-700 tracking-widest hover:opacity-80 transition-opacity">
                                                            <span>{pnr}</span>
                                                            <Copy className="w-3.5 h-3.5 text-blue-500" />
                                                        </button>
                                                    ) : (
                                                        <span className="text-2xs font-bold text-amber-700">חסר — הוסף בעריכת הטיסה</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100" dir="ltr">
                                                <div className="text-center">
                                                    <div className="text-2xl font-black text-slate-800">{seg.fromCode}</div>
                                                    <div className="text-2xs font-bold text-slate-400">{seg.departureTime}</div>
                                                    <div className="text-2xs text-slate-400">{seg.fromCity}</div>
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="h-px bg-slate-300 w-10"></div>
                                                    {seg.date && <div className="text-2xs font-bold text-slate-500">{seg.date}</div>}
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-2xl font-black text-slate-800">{seg.toCode}</div>
                                                    <div className="text-2xs font-bold text-slate-400">{seg.arrivalTime}</div>
                                                    <div className="text-2xs text-slate-400">{seg.toCity}</div>
                                                </div>
                                            </div>

                                            {seg._passengers && seg._passengers.length > 0 && (
                                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="font-bold">{seg._passengers.slice(0, 2).join(', ')}{seg._passengers.length > 2 ? ` +${seg._passengers.length - 2}` : ''}</span>
                                                </div>
                                            )}

                                            {(seg.seat || seg.class || seg.terminal || seg.gate) && (
                                                <div className="flex flex-wrap gap-2">
                                                    {seg.seat && <Pill label="מושב" value={seg.seat} />}
                                                    {seg.class && <Pill label="מחלקה" value={seg.class} />}
                                                    {seg.terminal && <Pill label="טרמינל" value={seg.terminal} />}
                                                    {seg.gate && <Pill label="שער" value={seg.gate} />}
                                                </div>
                                            )}

                                            <a
                                                href={checkin.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-md ${checkin.isFallback ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'}`}
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                {checkin.label}
                                            </a>
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {activeTab === 'hotels' && (
                        <>
                            {hotelCount === 0 ? (
                                <div className="text-center text-slate-400 py-8 bg-white rounded-2xl border border-dashed border-slate-200">
                                    <Hotel className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <div className="font-bold">אין מלונות בארנק</div>
                                    <div className="text-xs mt-1 text-slate-400">הוסף אישור הזמנה ב-Magical Wizard או בכרטיסיית המלונות</div>
                                </div>
                            ) : (trip.hotels || []).map((hotel) => {
                                const guestName = (hotel.guests && hotel.guests[0]) || '';
                                const expanded = !!expandedHotelInstructions[hotel.id];
                                const navUrl = safeMapsUrl(hotel.googleMapsUrl, hotel.name, hotel.address, hotel.city, tripCountryCode);
                                return (
                                    <div key={hotel.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                                        <div className="relative z-10 space-y-3">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 flex-shrink-0"><Hotel className="w-5 h-5" /></div>
                                                    <div className="min-w-0">
                                                        <div className="text-2xs text-slate-400 font-bold uppercase tracking-wider">מלון</div>
                                                        <div className="text-base font-black text-slate-800 leading-tight truncate">{hotel.name}</div>
                                                        {hotel.bookingSource && (
                                                            <div className="text-2xs font-bold text-indigo-500 mt-0.5">{hotel.bookingSource}</div>
                                                        )}
                                                    </div>
                                                </div>
                                                {hotel.confirmationCode && (
                                                    <div className="text-left flex-shrink-0">
                                                        <div className="text-2xs text-slate-400 font-bold uppercase tracking-wider">מספר אישור</div>
                                                        <button onClick={() => copyToClipboard(hotel.confirmationCode!, 'מספר אישור')} className="flex items-center gap-1.5 text-base font-mono font-black text-indigo-600 hover:opacity-80 transition-opacity">
                                                            <span>{hotel.confirmationCode}</span>
                                                            <Copy className="w-3.5 h-3.5 text-indigo-400" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 text-2xs">
                                                {hotel.checkInDate && (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold">
                                                        <Calendar className="w-3 h-3" /> כניסה {hotel.checkInDate}
                                                    </span>
                                                )}
                                                {hotel.checkOutDate && (
                                                    <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md font-bold">
                                                        <Calendar className="w-3 h-3" /> יציאה {hotel.checkOutDate}
                                                    </span>
                                                )}
                                                {hotel.mealPlan && <Pill label="כלכלה" value={hotel.mealPlan} />}
                                            </div>

                                            <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                                                <MapPin className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                                                <span className="leading-tight">{hotel.address}</span>
                                            </div>

                                            {guestName && (
                                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                                    <Users className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="font-bold">{guestName}{hotel.guests && hotel.guests.length > 1 ? ` +${hotel.guests.length - 1}` : ''}</span>
                                                </div>
                                            )}

                                            {hotel.checkInInstructions && (
                                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                                    <button onClick={() => setExpandedHotelInstructions(prev => ({ ...prev, [hotel.id]: !prev[hotel.id] }))} className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold">
                                                        <div className="flex items-center gap-2">
                                                            <Info className="w-3.5 h-3.5 text-slate-400" />
                                                            הוראות צ'ק-אין
                                                        </div>
                                                        <span className="text-slate-400">{expanded ? '−' : '+'}</span>
                                                    </button>
                                                    {expanded && (
                                                        <div className="px-3 py-2.5 text-xs text-slate-600 leading-relaxed whitespace-pre-line border-t border-slate-200" dir="auto">
                                                            {hotel.checkInInstructions}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="flex items-stretch gap-2">
                                                <a href={navUrl} target="_blank" rel="noreferrer" className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
                                                    <MapPin className="w-3.5 h-3.5" /> Google Maps
                                                </a>
                                                {hotel.phone ? (
                                                    <a href={`tel:${hotel.phone.replace(/\s/g, '')}`} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-colors shadow-sm">
                                                        <Phone className="w-3.5 h-3.5" /> {hotel.phone}
                                                    </a>
                                                ) : null}
                                                <button onClick={() => setShowDriverMode(hotel.address)} className="flex-1 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-900 transition-colors shadow-sm">
                                                    <Maximize2 className="w-3.5 h-3.5" /> לנהג
                                                </button>
                                            </div>

                                            {hotel.cancellationPolicy && (
                                                <div className="text-2xs text-slate-500 bg-slate-50 p-2 rounded-lg leading-relaxed" dir="auto">
                                                    <span className="font-bold text-slate-700">ביטול:</span> {hotel.cancellationPolicy}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </>
                    )}

                    {activeTab === 'vault' && (
                        <div className="space-y-4 relative min-h-[300px]">
                            {isVaultLocked && (
                                <div className="absolute inset-0 z-20 bg-slate-100/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 space-y-4 rounded-xl">
                                    <div className={`bg-slate-900 p-4 rounded-2xl shadow-xl transition-all duration-500 ${isAuthenticating ? 'scale-110' : 'scale-100'}`}>
                                        {isAuthenticating ? <Loader2 className="w-8 h-8 text-blue-400 animate-spin" /> : <Lock className="w-8 h-8 text-white" />}
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-black text-slate-900">הכספת נעולה</h4>
                                        <p className="text-slate-500 text-sm mt-1">נדרש אימות ביומטרי לצפייה בפריטים</p>
                                    </div>
                                    <button
                                        onClick={handleUnlockVault}
                                        disabled={isAuthenticating}
                                        className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95"
                                    >
                                        {isAuthenticating ? 'מאמת...' : 'אמת זהות (FaceID)'}
                                    </button>
                                </div>
                            )}
                            <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-xl flex items-start gap-2">
                                <Lock className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <p className="text-2xs text-yellow-800 leading-snug font-medium">
                                    המידע נשמר באופן מקומי על המכשיר שלך בלבד. מומלץ לא לשמור סיסמאות בנקאיות, אלא רק מידע לנסיעה (דרכון, ביטוח).
                                </p>
                            </div>

                            {trip.secureNotes?.map(note => (
                                <div key={note.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            {note.category === 'passport' && '🛂'}
                                            {note.category === 'insurance' && '🚑'}
                                            {note.category === 'credit_card' && '💳'}
                                            {note.title}
                                        </span>
                                        <button onClick={() => handleDeleteNote(note.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                        <div className="flex-grow font-mono text-lg font-bold tracking-wider text-slate-800">
                                            {showSecret[note.id] ? note.value : '••••••••••••'}
                                        </div>
                                        <button onClick={() => copyToClipboard(note.value, note.title)} className="p-1.5 hover:bg-slate-200 rounded text-slate-400"><Copy className="w-4 h-4" /></button>
                                        <button onClick={() => toggleSecret(note.id)} className="p-1.5 hover:bg-slate-200 rounded text-slate-400">
                                            {showSecret[note.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {isAddingNote ? (
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 animate-fade-in">
                                    <select
                                        className="w-full p-2 rounded-lg border border-slate-300 text-sm font-bold bg-white"
                                        value={newNote.category}
                                        onChange={e => setNewNote({ ...newNote, category: e.target.value as any })}
                                    >
                                        <option value="passport">דרכון</option>
                                        <option value="insurance">ביטוח</option>
                                        <option value="credit_card">אשראי (4 ספרות)</option>
                                        <option value="other">אחר</option>
                                    </select>
                                    <input
                                        className="w-full p-2 rounded-lg border border-slate-300 text-sm font-bold"
                                        placeholder="כותרת (למשל: דרכון אבא)"
                                        value={newNote.title}
                                        onChange={e => setNewNote({ ...newNote, title: e.target.value })}
                                    />
                                    <input
                                        className="w-full p-2 rounded-lg border border-slate-300 text-sm font-mono"
                                        placeholder="הערך הסודי"
                                        value={newNote.value}
                                        onChange={e => setNewNote({ ...newNote, value: e.target.value })}
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsAddingNote(false)} className="flex-1 py-2 text-slate-500 font-bold text-sm">ביטול</button>
                                        <button onClick={handleAddNote} className="flex-1 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm">שמור</button>
                                    </div>
                                </div>
                            ) : (
                                <button onClick={() => setIsAddingNote(true)} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 font-bold text-sm flex items-center justify-center gap-2 hover:border-slate-400 hover:text-slate-500 transition-colors">
                                    <Plus className="w-4 h-4" /> הוסף פריט לכספת
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string; badge?: number }> = ({ active, onClick, label, badge }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${active ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}
    >
        <span>{label}</span>
        {typeof badge === 'number' && badge > 0 && (
            <span className={`text-2xs font-black px-1.5 rounded-full ${active ? 'bg-slate-200 text-slate-700' : 'bg-slate-700 text-slate-300'}`}>{badge}</span>
        )}
    </button>
);

const Pill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-2xs font-bold">
        <span className="text-slate-400 uppercase tracking-wide">{label}</span>
        <span>{value}</span>
    </span>
);
