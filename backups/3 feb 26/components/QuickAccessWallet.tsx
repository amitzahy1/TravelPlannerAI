import React, { useState } from 'react';
import { Trip, SecureNote } from '../types';
import { X, Plane, Hotel, Copy, Eye, EyeOff, ShieldCheck, Plus, Trash2, MapPin, Calendar, Lock, Maximize2, Loader2 } from 'lucide-react';

interface QuickAccessWalletProps {
    trip: Trip;
    onClose: () => void;
    onUpdateTrip: (t: Trip) => void;
}

export const QuickAccessWallet: React.FC<QuickAccessWalletProps> = ({ trip, onClose, onUpdateTrip }) => {
    const [activeTab, setActiveTab] = useState<'cards' | 'vault'>('cards');
    const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
    const [newNote, setNewNote] = useState<Partial<SecureNote>>({ title: '', value: '', category: 'passport' });
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [showDriverMode, setShowDriverMode] = useState<string | null>(null);

    // Biometric Mock State
    const [isVaultLocked, setIsVaultLocked] = useState(true);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const handleUnlockVault = () => {
        setIsAuthenticating(true);
        setTimeout(() => {
            setIsAuthenticating(false);
            setIsVaultLocked(false);
        }, 1000); // Simulate FaceID delay
    };

    const handleTabChange = (tab: 'cards' | 'vault') => {
        setActiveTab(tab);
        if (tab === 'vault') setIsVaultLocked(true); // Auto-lock on entry
    };

    const toggleSecret = (id: string) => {
        setShowSecret(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add toast here
    };

    const handleAddNote = () => {
        if (!newNote.title || !newNote.value) return;
        const note: SecureNote = {
            id: `sec-${Date.now()}`,
            title: newNote.title || 'מידע רגיש',
            value: newNote.value || '',
            category: newNote.category as any
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

    if (showDriverMode) {
        return (
            <div className="fixed inset-0 z-[110] bg-white flex flex-col items-center justify-center p-6 text-center animate-scale-in">
                <button onClick={() => setShowDriverMode(null)} className="absolute top-6 right-6 bg-gray-100 p-4 rounded-full"><X className="w-8 h-8 text-gray-800" /></button>
                <h3 className="text-gray-400 font-bold uppercase tracking-widest mb-6">הראה לנהג</h3>
                <p className="text-4xl md:text-6xl font-black text-gray-900 leading-tight" dir="auto">{showDriverMode}</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-gray-900/80 backdrop-blur-md flex items-end md:items-center justify-center animate-fade-in">
            <div className="bg-slate-100 w-full md:max-w-md h-[90vh] md:h-[650px] rounded-t-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative">

                {/* Header */}
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

                    <div className="flex bg-slate-800/50 p-1 rounded-xl">
                        <button onClick={() => handleTabChange('cards')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'cards' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}>כרטיסים ושוברים</button>
                        <button onClick={() => handleTabChange('vault')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'vault' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}>כספת מאובטחת</button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-100 -mt-4 pt-8 pb-10">

                    {activeTab === 'cards' && (
                        <>
                            {/* Flight Card */}
                            {trip.flights?.segments?.length > 0 ? (
                                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-blue-100 p-2 rounded-xl text-blue-600"><Plane className="w-5 h-5" /></div>
                                                <div>
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">מספר טיסה</div>
                                                    <div className="text-xl font-black text-slate-800">{trip.flights.segments[0].flightNumber}</div>
                                                </div>
                                            </div>
                                            <div className="text-left bg-blue-50 px-3 py-1 rounded-lg">
                                                <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">קוד הזמנה (PNR)</div>
                                                <div className="text-2xl font-mono font-black text-blue-600 tracking-widest">{trip.flights.pnr}</div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                            <div className="text-center">
                                                <div className="text-2xl font-black text-slate-800">{trip.flights.segments[0].fromCode}</div>
                                                <div className="text-[10px] font-bold text-slate-400">{trip.flights.segments[0].departureTime}</div>
                                            </div>
                                            <div className="h-px bg-slate-300 w-10"></div>
                                            <div className="text-center">
                                                <div className="text-2xl font-black text-slate-800">{trip.flights.segments[0].toCode}</div>
                                                <div className="text-[10px] font-bold text-slate-400">{trip.flights.segments[0].arrivalTime}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 py-4 bg-white rounded-2xl border border-dashed border-slate-200">
                                    <Plane className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    אין פרטי טיסה
                                </div>
                            )}

                            {/* Hotel Cards */}
                            {trip.hotels?.map((hotel, idx) => (
                                <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><Hotel className="w-5 h-5" /></div>
                                                <div className="min-w-0">
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">מלון</div>
                                                    <div className="text-base font-black text-slate-800 leading-tight truncate w-40">{hotel.name}</div>
                                                </div>
                                            </div>
                                            {hotel.confirmationCode && (
                                                <div className="text-left">
                                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">מספר אישור</div>
                                                    <div className="text-lg font-mono font-black text-indigo-600">{hotel.confirmationCode}</div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg">
                                                <MapPin className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                                                <span className="leading-tight">{hotel.address}</span>
                                            </div>
                                            <button onClick={() => setShowDriverMode(hotel.address)} className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                                                <Maximize2 className="w-4 h-4" /> הצג לנהג (מסך מלא)
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!trip.hotels || trip.hotels.length === 0) && (
                                <div className="text-center text-slate-400 py-4 bg-white rounded-2xl border border-dashed border-slate-200">
                                    <Hotel className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    אין מלונות
                                </div>
                            )}
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
                                <p className="text-[11px] text-yellow-800 leading-snug font-medium">
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
                                        <button onClick={() => copyToClipboard(note.value)} className="p-1.5 hover:bg-slate-200 rounded text-slate-400"><Copy className="w-4 h-4" /></button>
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