import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trip, HotelBooking, HotelRoom, TravelersComposition } from '../types';
import {
    Hotel, MapPin, Calendar, BedDouble, CheckCircle, StickyNote, Edit, Plus, Trash2, X,
    Image as ImageIcon, Sparkles, Loader2, Navigation, UploadCloud, FileText, Coffee,
    ShieldCheck, Lock, ChevronDown, Users, Tag, CheckCheck, DollarSign
} from 'lucide-react';
import { generateWithFallback } from '../services/aiService';
import { CalendarDatePicker } from './CalendarDatePicker';
import { ConfirmModal } from './ConfirmModal';


// Helper to determine placeholder image based on address
const getPlaceImage = (address: string): string => {
    const lowerAddr = (address || '').toLowerCase();
    if (lowerAddr.includes('bangkok') || lowerAddr.includes('bkk')) return 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('phuket')) return 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('samui') || lowerAddr.includes('koh samui')) return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('pattaya')) return 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('chiang mai')) return 'https://images.unsplash.com/photo-1598135753163-6167c1a1ad65?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('krabi')) return 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('koh chang')) return 'https://images.unsplash.com/photo-1559530432-62dc0442c549?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('tao') || lowerAddr.includes('koh tao')) return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('london') || lowerAddr.includes('uk')) return 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('paris') || lowerAddr.includes('france')) return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('rome') || lowerAddr.includes('italy')) return 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('barcelona') || lowerAddr.includes('spain')) return 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('new york') || lowerAddr.includes('nyc')) return 'https://images.unsplash.com/photo-1496442226666-8d4a0e62e6e9?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('beach') || lowerAddr.includes('resort') || lowerAddr.includes('island')) return 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80';
    return 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80';
};

const ROOM_COLORS = [
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100', num: 'text-indigo-600' },
    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100', num: 'text-emerald-600' },
    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100', num: 'text-amber-600' },
    { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100', num: 'text-rose-600' },
    { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', badge: 'bg-violet-100', num: 'text-violet-600' },
    { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', badge: 'bg-teal-100', num: 'text-teal-600' },
];


// ─────────────────────────────────────────────────────────
// RoomFormModal — add/edit a single room
// ─────────────────────────────────────────────────────────
const RoomFormModal: React.FC<{
    initialData?: HotelRoom;
    onClose: () => void;
    onSave: (room: HotelRoom) => void;
}> = ({ initialData, onClose, onSave }) => {
    const [form, setForm] = useState<Partial<HotelRoom>>(
        initialData || { adults: 2, children: 0, label: '', roomType: '', beds: '', notes: '' }
    );

    const ROOM_TYPE_OPTIONS = [
        'Standard Room', 'Deluxe Room', 'Superior Room', 'Junior Suite', 'Suite',
        'Family Room', 'Studio', 'Villa', 'Bungalow', 'Twin Room', 'Double Room', 'Executive Room'
    ];
    const BED_OPTIONS = ['King Bed', 'Queen Bed', 'Double Bed', 'Twin Beds', 'Single Bed', 'Bunk Beds'];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            id: initialData?.id || crypto.randomUUID(),
            adults: form.adults ?? 2,
            children: form.children ?? 0,
            label: form.label,
            roomType: form.roomType,
            beds: form.beds,
            notes: form.notes,
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-5 border-b border-indigo-100 flex justify-between items-center sticky top-0">
                    <h3 className="text-lg font-black text-indigo-900 flex items-center gap-2">
                        <BedDouble className="w-5 h-5 text-indigo-600" />
                        {initialData ? 'עריכת חדר' : 'הוספת חדר'}
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-white rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                            <Tag className="w-3 h-3" /> כותרת / שם משפחה לחדר
                        </label>
                        <input
                            className="w-full p-3.5 bg-slate-50 rounded-2xl font-semibold outline-none focus:ring-2 focus:ring-indigo-200 transition-all placeholder:font-normal text-slate-800"
                            placeholder='למשל: "משפחת כהן", "הורים", "הילדים"'
                            value={form.label || ''}
                            onChange={e => setForm({ ...form, label: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                            <Hotel className="w-3 h-3" /> סוג חדר
                        </label>
                        <input
                            list="room-types-list"
                            className="w-full p-3.5 bg-slate-50 rounded-2xl font-semibold outline-none focus:ring-2 focus:ring-indigo-200 transition-all placeholder:font-normal text-slate-800"
                            placeholder='Deluxe Double Room, Junior Suite...'
                            value={form.roomType || ''}
                            onChange={e => setForm({ ...form, roomType: e.target.value })}
                        />
                        <datalist id="room-types-list">
                            {ROOM_TYPE_OPTIONS.map(opt => <option key={opt} value={opt} />)}
                        </datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">מבוגרים</label>
                            <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-2 border border-slate-100">
                                <button type="button" onClick={() => setForm({ ...form, adults: Math.max(1, (form.adults ?? 1) - 1) })} className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-lg leading-none">−</button>
                                <span className="flex-1 text-center font-black text-slate-800 text-lg">{form.adults ?? 1}</span>
                                <button type="button" onClick={() => setForm({ ...form, adults: (form.adults ?? 1) + 1 })} className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-lg leading-none">+</button>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500">ילדים</label>
                            <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-2 border border-slate-100">
                                <button type="button" onClick={() => setForm({ ...form, children: Math.max(0, (form.children ?? 0) - 1) })} className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-lg leading-none">−</button>
                                <span className="flex-1 text-center font-black text-slate-800 text-lg">{form.children ?? 0}</span>
                                <button type="button" onClick={() => setForm({ ...form, children: (form.children ?? 0) + 1 })} className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-lg leading-none">+</button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                            <BedDouble className="w-3 h-3" /> סוג מיטות מועדף
                        </label>
                        <select
                            className="w-full p-3.5 bg-slate-50 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-indigo-200 transition-all text-slate-800"
                            value={form.beds || ''}
                            onChange={e => setForm({ ...form, beds: e.target.value })}
                        >
                            <option value="">לא צוין / לא משנה</option>
                            {BED_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500">בקשות / העדפות מראש</label>
                        <input
                            className="w-full p-3.5 bg-slate-50 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-indigo-200 transition-all placeholder:font-normal text-slate-800"
                            placeholder="קומה גבוהה, נוף לים, מיטת תינוק, חיבור לחדרים..."
                            value={form.notes || ''}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                        />
                    </div>

                    <button type="submit" className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold text-base shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all">
                        שמור חדר
                    </button>
                </form>
            </div>
        </div>
    );
};


// ─────────────────────────────────────────────────────────
// HotelGroup — type + grouping function
// Groups bookings for the same hotel+dates into one card
// ─────────────────────────────────────────────────────────
interface HotelGroup {
    key: string;
    primary: HotelBooking;
    hotels: HotelBooking[];
    mergedRooms: Array<HotelRoom & { _hotelId: string }>;
    confirmationCodes: string[];
}

const groupHotels = (hotels: HotelBooking[]): HotelGroup[] => {
    const map = new Map<string, HotelGroup>();
    for (const h of hotels) {
        const key = [
            h.name.toLowerCase().trim().replace(/\s+/g, ' '),
            h.checkInDate?.split('T')[0] || '',
            h.checkOutDate?.split('T')[0] || '',
        ].join('|');
        const existing = map.get(key);
        if (existing) {
            existing.hotels.push(h);
            if (h.confirmationCode && !existing.confirmationCodes.includes(h.confirmationCode))
                existing.confirmationCodes.push(h.confirmationCode);
            (h.rooms || []).forEach(r => existing.mergedRooms.push({ ...r, _hotelId: h.id }));
        } else {
            map.set(key, {
                key,
                primary: h,
                hotels: [h],
                mergedRooms: (h.rooms || []).map(r => ({ ...r, _hotelId: h.id })),
                confirmationCodes: h.confirmationCode ? [h.confirmationCode] : [],
            });
        }
    }
    return Array.from(map.values());
};


// ─────────────────────────────────────────────────────────
// Source badge styles
// ─────────────────────────────────────────────────────────
const SOURCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
    'Booking.com': { bg: 'bg-blue-600', text: 'text-white', label: 'Booking.com' },
    'Agoda':       { bg: 'bg-orange-500', text: 'text-white', label: 'Agoda' },
    'Airbnb':      { bg: 'bg-rose-500', text: 'text-white', label: 'Airbnb' },
    'Expedia':     { bg: 'bg-yellow-400', text: 'text-slate-900', label: 'Expedia' },
    'Direct':      { bg: 'bg-slate-700', text: 'text-white', label: 'Direct' },
};


// ─────────────────────────────────────────────────────────
// HotelCard — clean redesign with grouping support
// ─────────────────────────────────────────────────────────
const HotelCard: React.FC<{
    group: HotelGroup;
    tripDestination: string;
    tripTravelers?: TravelersComposition;
    onUpdateGroupRooms: (rooms: Array<HotelRoom & { _hotelId: string }>) => void;
    onDeleteGroup: () => void;
    onEditPrimary: () => void;
    onSaveNote: (note: string) => void;
    onSaveVibe: (vibe: string) => void;
}> = ({ group, tripDestination, onUpdateGroupRooms, onDeleteGroup, onEditPrimary, onSaveNote, onSaveVibe }) => {
    const { primary, mergedRooms, confirmationCodes } = group;
    const [isExpanded, setIsExpanded] = useState(false);
    const [editingRoom, setEditingRoom] = useState<(HotelRoom & { _hotelId?: string }) | null | undefined>(undefined);
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState(primary.notes || '');
    const [analyzing, setAnalyzing] = useState(false);

    const displayImage = primary.imageUrl || getPlaceImage(primary.address || primary.name);
    const sourceStyle = SOURCE_STYLES[primary.bookingSource || ''] || { bg: 'bg-slate-600', text: 'text-white', label: primary.bookingSource || '' };

    const nightsCount = (() => {
        if (primary.nights && primary.nights > 0) return primary.nights;
        const ci = primary.checkInDate ? new Date(primary.checkInDate.split('T')[0] + 'T12:00:00') : null;
        const co = primary.checkOutDate ? new Date(primary.checkOutDate.split('T')[0] + 'T12:00:00') : null;
        if (ci && co && !isNaN(ci.getTime()) && !isNaN(co.getTime())) {
            const diff = Math.round((co.getTime() - ci.getTime()) / 86400000);
            return diff > 0 ? diff : null;
        }
        return null;
    })();

    const formatDate = (ds?: string) => {
        if (!ds) return '—';
        const d = new Date(ds.split('T')[0] + 'T12:00:00');
        if (isNaN(d.getTime())) return ds;
        return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
    };

    const formatDay = (ds?: string) => {
        if (!ds) return '';
        const d = new Date(ds.split('T')[0] + 'T12:00:00');
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('he-IL', { weekday: 'short' });
    };

    const cancellationColor = (() => {
        if (!primary.cancellationPolicy) return null;
        const p = primary.cancellationPolicy.toLowerCase();
        if (p.includes('free') || p.includes('חינם') || p.includes('ללא עלות')) return 'emerald';
        if (p.includes('non-refund') || p.includes('לא ניתן') || p.includes('אי-החזר')) return 'red';
        return 'amber';
    })();

    const locationLine = primary.city
        ? `${primary.city}${primary.address ? ', ' + primary.address.split(',').slice(-1)[0]?.trim() : ''}`
        : primary.address?.split(',').slice(-2).join(', ').trim() || '';

    const handleSaveRoom = (room: HotelRoom) => {
        if (editingRoom && editingRoom.id) {
            onUpdateGroupRooms(mergedRooms.map(r => r.id === room.id ? { ...room, _hotelId: r._hotelId } : r));
        } else {
            onUpdateGroupRooms([...mergedRooms, { ...room, _hotelId: primary.id }]);
        }
        setEditingRoom(undefined);
    };

    const handleDeleteRoom = (roomId: string) => {
        onUpdateGroupRooms(mergedRooms.filter(r => r.id !== roomId));
    };

    const analyzeLocation = async () => {
        setAnalyzing(true);
        try {
            const response = await generateWithFallback(null, [`Analyze: "${primary.name}", "${primary.address}". Hebrew vibe check, max 15 words.`], {}, 'FAST');
            if (response.text) onSaveVibe(response.text);
        } catch { } finally { setAnalyzing(false); }
    };

    const saveNote = () => { onSaveNote(noteText); setIsEditingNote(false); };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group/card">

            {/* ── Photo + Info ── */}
            <div dir="ltr" className="flex">
                {/* Photo strip */}
                <div className="relative w-24 sm:w-32 flex-shrink-0 self-stretch" style={{ minHeight: '140px' }}>
                    <img src={displayImage} alt={primary.name} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                    {primary.bookingSource && (
                        <span className={`absolute top-2 left-2 text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm ${sourceStyle.bg} ${sourceStyle.text}`}>
                            {sourceStyle.label}
                        </span>
                    )}
                    {group.hotels.length > 1 && (
                        <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                            <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                                {group.hotels.length} הזמנות
                            </span>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 p-3 sm:p-4 flex flex-col gap-2.5">
                    {/* Name + edit/delete */}
                    <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                            <h3 className="font-black text-slate-900 text-base leading-snug truncate">{primary.name}</h3>
                            {locationLine && (
                                <p className="flex items-center gap-0.5 text-xs text-slate-400 mt-0.5 truncate">
                                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" />{locationLine}
                                </p>
                            )}
                        </div>
                        <div className="flex gap-0.5 flex-shrink-0 opacity-100 md:opacity-0 md:group-hover/card:opacity-100 transition-opacity">
                            <button onClick={e => { e.stopPropagation(); onEditPrimary(); }} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors" title="עריכה">
                                <Edit className="w-3.5 h-3.5 text-slate-400" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); onDeleteGroup(); }} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="מחיקה">
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            </button>
                        </div>
                    </div>

                    {/* Date bar */}
                    <div className="flex items-stretch rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                        <div className="flex-1 flex flex-col items-center justify-center py-2 bg-slate-50">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">כניסה</span>
                            <span className="text-xs sm:text-sm font-black text-slate-800 whitespace-nowrap mt-0.5">{formatDate(primary.checkInDate)}</span>
                            <span className="text-[9px] text-slate-400 font-medium">{formatDay(primary.checkInDate)}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center bg-indigo-600 px-3 py-2">
                            <span className="text-[8px] font-black text-indigo-200 uppercase tracking-wider">לילות</span>
                            <span className="text-xl font-black text-white leading-none mt-0.5">{nightsCount ?? '—'}</span>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center py-2 bg-slate-50">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">יציאה</span>
                            <span className="text-xs sm:text-sm font-black text-slate-800 whitespace-nowrap mt-0.5">{formatDate(primary.checkOutDate)}</span>
                            <span className="text-[9px] text-slate-400 font-medium">{formatDay(primary.checkOutDate)}</span>
                        </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {confirmationCodes.map(code => (
                            <span key={code} className="flex items-center gap-1 text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-mono">
                                <CheckCircle className="w-2.5 h-2.5" /> {code}
                            </span>
                        ))}
                        {(primary.mealPlan || primary.breakfastIncluded) && (
                            <span className="flex items-center gap-1 text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-md">
                                <Coffee className="w-2.5 h-2.5" /> {primary.mealPlan || 'ארוחת בוקר'}
                            </span>
                        )}
                        {cancellationColor && (
                            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                cancellationColor === 'emerald' ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                : cancellationColor === 'red'   ? 'bg-red-50 text-red-700 border-red-100'
                                :                                 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                                <ShieldCheck className="w-2.5 h-2.5" />
                                {cancellationColor === 'emerald' ? 'ביטול חינם' : cancellationColor === 'red' ? 'לא ניתן לביטול' : 'מדיניות ביטול'}
                            </span>
                        )}
                        {primary.price && (
                            <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md ms-auto">
                                {primary.price}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Rooms — always visible inline ── */}
            <div className="border-t border-slate-100 px-3 sm:px-4 py-3 bg-slate-50/40">
                <div className="flex items-center gap-2 flex-wrap">
                    {mergedRooms.length === 0 && (
                        <span className="text-xs text-slate-400 font-medium">לא הוגדרו חדרים</span>
                    )}
                    {mergedRooms.map((room, idx) => {
                        const color = ROOM_COLORS[idx % ROOM_COLORS.length];
                        return (
                            <button
                                key={room.id}
                                onClick={() => setEditingRoom(room)}
                                className={`group/room flex items-center gap-1.5 ${color.bg} border ${color.border} rounded-xl px-2.5 py-1.5 hover:shadow-sm active:scale-95 transition-all cursor-pointer`}
                            >
                                <div className={`w-5 h-5 rounded-lg ${color.badge} flex items-center justify-center flex-shrink-0`}>
                                    <BedDouble className={`w-2.5 h-2.5 ${color.num}`} />
                                </div>
                                <div className="text-right leading-none">
                                    <div className={`text-xs font-bold ${color.text} max-w-[100px] truncate`}>
                                        {room.label || room.roomType || `חדר ${idx + 1}`}
                                    </div>
                                    <div className="text-[9px] text-slate-500 mt-0.5">
                                        {room.adults}{room.children > 0 ? `+${room.children}` : ''} אנשים
                                    </div>
                                </div>
                                <button
                                    onClick={e => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                                    className="opacity-0 group-hover/room:opacity-100 p-0.5 hover:bg-red-100 rounded transition-all"
                                >
                                    <X className="w-2.5 h-2.5 text-red-400" />
                                </button>
                            </button>
                        );
                    })}
                    <button
                        onClick={() => setEditingRoom(null)}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-500 hover:bg-indigo-50 px-2.5 py-1.5 rounded-xl border border-dashed border-indigo-200 transition-colors whitespace-nowrap"
                    >
                        <Plus className="w-3.5 h-3.5" /> הוסף חדר
                    </button>
                </div>
            </div>

            {/* ── Expand toggle ── */}
            <button
                className="w-full border-t border-slate-100 px-4 py-2 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                onClick={() => setIsExpanded(v => !v)}
            >
                <span className="text-xs text-slate-400 font-medium">
                    {isExpanded ? 'הסתר פרטים' : 'פרטים נוספים'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* ── Expandable details ── */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-2 space-y-3 bg-slate-50/30">
                            {/* Map + cancellation */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <a
                                    href={primary.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${primary.name} ${primary.address || ''} ${tripDestination || ''}`)}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                                >
                                    <Navigation className="w-3 h-3" /> הצג במפה
                                </a>
                                {primary.cancellationPolicy && (
                                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 flex-1 min-w-0">
                                        <ShieldCheck className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                        <span className="truncate">{primary.cancellationPolicy}</span>
                                    </div>
                                )}
                            </div>

                            {/* Vibe check */}
                            {primary.locationVibe ? (
                                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 flex items-start gap-2">
                                    <Sparkles className="w-3.5 h-3.5 text-purple-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-purple-900 font-medium">{primary.locationVibe}</p>
                                </div>
                            ) : (
                                <button
                                    onClick={analyzeLocation}
                                    disabled={analyzing}
                                    className="flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:bg-purple-50 py-2 px-3 rounded-xl transition-colors border border-dashed border-purple-200"
                                >
                                    {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                    {analyzing ? 'מנתח מיקום...' : 'מה ה-Vibe של האזור?'}
                                </button>
                            )}

                            {/* Notes */}
                            {isEditingNote ? (
                                <div className="flex gap-2 bg-yellow-50 p-2.5 rounded-xl border border-yellow-200">
                                    <input
                                        className="flex-grow bg-transparent text-sm outline-none text-slate-800 placeholder:text-slate-400"
                                        placeholder="הוסף הערה..."
                                        value={noteText}
                                        onChange={e => setNoteText(e.target.value)}
                                        autoFocus
                                        onKeyDown={e => e.key === 'Enter' && saveNote()}
                                    />
                                    <button onClick={saveNote} className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap">שמור</button>
                                    <button onClick={() => setIsEditingNote(false)} className="text-slate-400 p-1 flex-shrink-0"><X className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsEditingNote(true)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors text-right ${primary.notes ? 'bg-yellow-50 border border-yellow-100 text-yellow-900 hover:bg-yellow-100' : 'text-slate-400 hover:bg-slate-50 border border-dashed border-slate-200'}`}
                                >
                                    <StickyNote className={`w-3.5 h-3.5 flex-shrink-0 ${primary.notes ? 'text-yellow-600' : 'text-slate-400'}`} />
                                    <span className="font-medium truncate">{primary.notes || 'הוסף הערה...'}</span>
                                </button>
                            )}

                            {/* Multi-booking breakdown */}
                            {group.hotels.length > 1 && (
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                                    <div className="text-xs font-black text-indigo-800 mb-2">מוזג מ-{group.hotels.length} הזמנות נפרדות</div>
                                    <div className="space-y-1.5">
                                        {group.hotels.map((h, i) => (
                                            <div key={h.id} className="flex items-center gap-2 text-xs text-indigo-700 bg-white/60 rounded-lg px-2.5 py-1.5">
                                                <span className="font-black text-indigo-400">#{i + 1}</span>
                                                {h.confirmationCode && <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-indigo-100">{h.confirmationCode}</span>}
                                                {h.rooms && h.rooms.length > 0 && <span>{h.rooms.length} חדרים</span>}
                                                {h.price && <span className="ms-auto font-bold">{h.price}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Room form modal */}
            {editingRoom !== undefined && (
                <RoomFormModal
                    initialData={editingRoom ?? undefined}
                    onClose={() => setEditingRoom(undefined)}
                    onSave={handleSaveRoom}
                />
            )}
        </div>
    );
};


// ─────────────────────────────────────────────────────────
// HotelsView — main view
// ─────────────────────────────────────────────────────────
export const HotelsView: React.FC<{ trip: Trip, onUpdateTrip: (t: Trip) => void }> = ({ trip, onUpdateTrip }) => {
    const { hotels } = trip;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSmartAddOpen, setIsSmartAddOpen] = useState(false);
    const [editingHotel, setEditingHotel] = useState<HotelBooking | null>(null);
    const [hotelToDelete, setHotelToDelete] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const parseCheckIn = (ds?: string): number => {
        if (!ds) return 0;
        if (ds.match(/^\d{4}-\d{2}-\d{2}/)) return new Date(ds.split('T')[0] + 'T12:00:00').getTime();
        if (ds.match(/^\d{2}\/\d{2}\/\d{4}/)) { const [d, m, y] = ds.split('/'); return new Date(`${y}-${m}-${d}T12:00:00`).getTime(); }
        return 0;
    };
    const hotelGroups = groupHotels(hotels || []).sort((a, b) =>
        parseCheckIn(a.primary.checkInDate) - parseCheckIn(b.primary.checkInDate)
    );

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newDocs = Array.from(e.target.files).map((f: File) => f.name);
            onUpdateTrip({ ...trip, documents: [...(trip.documents || []), ...newDocs] });
        }
    };

    const handleNoteUpdate = (hotelId: string, newNote: string) => {
        const updatedHotels = (trip.hotels || []).map(h => h.id === hotelId ? { ...h, notes: newNote } : h);
        onUpdateTrip({ ...trip, hotels: updatedHotels });
    };

    const handleVibeUpdate = (hotelId: string, vibe: string) => {
        const updatedHotels = (trip.hotels || []).map(h => h.id === hotelId ? { ...h, locationVibe: vibe } : h);
        onUpdateTrip({ ...trip, hotels: updatedHotels });
    };

    const handleUpdateGroupRooms = (group: HotelGroup, newRooms: Array<HotelRoom & { _hotelId: string }>) => {
        // Distribute rooms back to their respective hotels
        const updates: Record<string, HotelRoom[]> = {};
        group.hotels.forEach(h => { updates[h.id] = []; });
        newRooms.forEach(({ _hotelId, ...room }) => {
            const targetId = (_hotelId && updates.hasOwnProperty(_hotelId)) ? _hotelId : group.primary.id;
            updates[targetId].push(room as HotelRoom);
        });
        const updatedHotels = (trip.hotels || []).map(h =>
            updates.hasOwnProperty(h.id) ? { ...h, rooms: updates[h.id] } : h
        );
        onUpdateTrip({ ...trip, hotels: updatedHotels });
    };

    const handleDeleteGroup = (group: HotelGroup) => setHotelToDelete(group.primary.id);

    const confirmDeleteHotel = () => {
        if (hotelToDelete) {
            const group = hotelGroups.find(g => g.primary.id === hotelToDelete);
            const idsToDelete = new Set(group ? group.hotels.map(h => h.id) : [hotelToDelete]);
            onUpdateTrip({ ...trip, hotels: (trip.hotels || []).filter(h => !idsToDelete.has(h.id)) });
            setHotelToDelete(null);
        }
    };

    const handleEditHotel = (hotel: HotelBooking) => { setEditingHotel(hotel); setIsModalOpen(true); };
    const handleAddNew = () => { setEditingHotel(null); setIsModalOpen(true); };

    const handleSmartAdd = (hotelData: HotelBooking) => {
        const newHotels = [...(trip.hotels || []), { ...hotelData, id: crypto.randomUUID() }];
        onUpdateTrip({ ...trip, hotels: newHotels });
        setIsSmartAddOpen(false);
    };

    const handleSaveHotel = (hotelData: HotelBooking) => {
        let newHotels = [...(trip.hotels || [])];
        if (editingHotel) { newHotels = newHotels.map(h => h.id === hotelData.id ? hotelData : h); }
        else { newHotels.push({ ...hotelData, id: crypto.randomUUID() }); }
        onUpdateTrip({ ...trip, hotels: newHotels });
        setIsModalOpen(false);
        setEditingHotel(null);
    };

    // City breakdown — based on groups (no double-counting)
    const cityBreakdown = (() => {
        const cityMap: Record<string, number> = {};
        hotelGroups.forEach(g => {
            const city = g.primary.city || g.primary.address?.split(',')[0]?.trim() || 'אחר';
            const n = g.primary.nights && g.primary.nights > 0 ? g.primary.nights : (() => {
                const ci = g.primary.checkInDate ? new Date(g.primary.checkInDate.split('T')[0] + 'T12:00:00') : null;
                const co = g.primary.checkOutDate ? new Date(g.primary.checkOutDate.split('T')[0] + 'T12:00:00') : null;
                if (ci && co && !isNaN(ci.getTime()) && !isNaN(co.getTime())) {
                    const d = Math.round((co.getTime() - ci.getTime()) / 86400000);
                    return d > 0 ? d : 0;
                }
                return 0;
            })();
            cityMap[city] = (cityMap[city] || 0) + n;
        });
        return cityMap;
    })();
    const cities = Object.entries(cityBreakdown);
    const totalNights = cities.reduce((s, [, n]) => s + n, 0);

    // Group to delete info (for confirm message)
    const groupToDelete = hotelGroups.find(g => g.primary.id === hotelToDelete);

    return (
        <div className="space-y-6 animate-fade-in pb-10">

            {hotels && hotels.length > 0 ? (
                <>
                    {/* ── Header ── */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                                <span className="bg-indigo-100 p-2 rounded-xl text-indigo-600 shadow-sm flex-shrink-0"><Hotel className="w-6 h-6 md:w-7 md:h-7" /></span>
                                המלונות שלי
                            </h2>
                            <p className="text-slate-400 text-sm font-medium mt-0.5 mr-14">
                                {hotelGroups.length} {hotelGroups.length === 1 ? 'מלון' : 'מלונות'}
                                {hotels.length > hotelGroups.length && ` (${hotels.length} הזמנות)`}
                            </p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
                            <button onClick={() => setIsSmartAddOpen(true)}
                                className="flex-1 sm:flex-none bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md">
                                <Sparkles className="w-4 h-4" /> הוספה חכמה (AI)
                            </button>
                            <button onClick={handleAddNew}
                                className="flex-1 sm:flex-none bg-white text-indigo-600 border border-indigo-200 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:bg-indigo-50">
                                <Plus className="w-4 h-4" /> ידני
                            </button>
                        </div>
                    </div>

                    {/* ── Destination nights breakdown ── */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600"><Calendar className="w-4 h-4" /></span>
                            <div>
                                <div className="text-xl font-black text-slate-800 leading-none">{totalNights}</div>
                                <div className="text-xs font-bold text-slate-400">לילות בסה״כ</div>
                            </div>
                        </div>
                        {cities.length > 0 && <div className="w-px h-8 bg-slate-100 flex-shrink-0" />}
                        <div className="flex items-center gap-2 flex-wrap">
                            {cities.map(([city, nights]) => (
                                <span key={city} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                                    <MapPin className="w-3 h-3 flex-shrink-0" />
                                    {city}
                                    {nights > 0 && <span className="bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md ml-1">{nights}L</span>}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* ── Hotel cards grid ── */}
                    <div className="grid grid-cols-1 gap-4">
                        {hotelGroups.map((group) => (
                            <HotelCard
                                key={group.key}
                                group={group}
                                tripDestination={trip.destination}
                                tripTravelers={trip.travelers}
                                onUpdateGroupRooms={(rooms) => handleUpdateGroupRooms(group, rooms)}
                                onDeleteGroup={() => handleDeleteGroup(group)}
                                onEditPrimary={() => handleEditHotel(group.primary)}
                                onSaveNote={(note) => handleNoteUpdate(group.primary.id, note)}
                                onSaveVibe={(vibe) => handleVibeUpdate(group.primary.id, vibe)}
                            />
                        ))}
                    </div>
                </>
            ) : (
                /* EMPTY STATE */
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-200 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100 relative z-10 transform -rotate-3 transition-transform hover:rotate-0 duration-500 border border-indigo-50">
                            <Hotel className="w-24 h-24 text-indigo-500" strokeWidth={1.5} />
                        </div>
                    </div>
                    <div className="space-y-3 max-w-md">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">איפה ישנים?</h2>
                        <p className="text-slate-500 text-lg font-medium leading-relaxed">
                            עדיין לא הזנתם מלונות. אפשר להדביק את אישור ההזמנה כאן וה-AI יעשה את השאר.
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-lg justify-center">
                        <button onClick={() => setIsSmartAddOpen(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-xl font-bold text-sm md:text-base shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                            <Sparkles className="w-5 h-5" /> הדבק אישור (AI)
                        </button>
                        <button onClick={handleAddNew} className="bg-white text-slate-600 border border-slate-200 px-5 py-3 rounded-xl font-bold text-sm md:text-base hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                            <Plus className="w-5 h-5" /> הוסף ידנית
                        </button>
                    </div>
                </div>
            )}

            {isModalOpen && <HotelFormModal initialData={editingHotel} onClose={() => setIsModalOpen(false)} onSave={handleSaveHotel} />}
            {isSmartAddOpen && <SmartHotelAddModal onClose={() => setIsSmartAddOpen(false)} onSave={handleSmartAdd} />}

            {/* Documents Section */}
            <section className="max-w-6xl mx-auto pt-8 border-t border-slate-100">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">מסמכים מצורפים</h2>
                        <p className="text-slate-500 text-sm">אישורי הזמנת מלון, שוברים וקבלות</p>
                    </div>
                    {onUpdateTrip && (
                        <button onClick={() => fileInputRef.current?.click()} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200">
                            <UploadCloud className="w-4 h-4" /> העלה קובץ
                        </button>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <div className="bg-white p-1.5 rounded-full shadow-sm text-blue-600 mt-0.5"><ShieldCheck className="w-4 h-4" /></div>
                    <div>
                        <h4 className="text-sm font-bold text-blue-900">הגנת פרטיות מופעלת</h4>
                        <p className="text-xs text-blue-700 mt-1">
                            המסמכים שלך נשמרים בצורה מאובטחת ומקומית. לצורך הגנה על המידע האישי שלך, לא ניתן לפתוח את המסמכים ישירות מהממשק.
                            הם משמשים את ה-AI לניתוח הנתונים בלבד.
                        </p>
                    </div>
                </div>

                {trip.documents && trip.documents.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {trip.documents.map((doc, idx) => {
                            const isPdf = doc.toLowerCase().endsWith('.pdf');
                            const isImage = doc.match(/\.(jpg|jpeg|png|webp)$/i);
                            return (
                                <div key={idx} className="group relative bg-white border border-slate-200 rounded-2xl p-3 aspect-[4/5] flex flex-col items-center justify-center text-center overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
                                    {isImage ? (
                                        <div className="absolute inset-0 bg-slate-100">
                                            <img src="https://via.placeholder.com/300?text=Protected" alt="Protected Document" className="w-full h-full object-cover blur-sm opacity-50" />
                                            <div className="absolute inset-0 bg-slate-100/50"></div>
                                        </div>
                                    ) : (
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm z-10 relative ${isPdf ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                            {isPdf ? <FileText className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-slate-100">
                                                <Lock className="w-3 h-3 text-slate-400" />
                                            </div>
                                        </div>
                                    )}
                                    <div className="relative z-10 w-full px-2">
                                        <div className={`text-xs font-bold truncate w-full ${isImage ? 'text-white drop-shadow-md' : 'text-slate-700'}`}>{doc}</div>
                                        <div className={`text-[10px] font-medium uppercase mt-1 ${isImage ? 'text-white/80' : 'text-slate-400'}`}>{isPdf ? 'PDF DOC' : 'IMAGE'}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div onClick={() => fileInputRef.current?.click()} className="border-3 border-dashed border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-blue-50/50 rounded-3xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer group min-h-[200px]">
                        <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-8 h-8 text-blue-400" />
                        </div>
                        <span className="text-slate-400 font-bold group-hover:text-blue-500 transition-colors">לחץ כאן להוספת קבצים</span>
                    </div>
                )}
            </section>

            <ConfirmModal
                isOpen={!!hotelToDelete}
                title="מחיקת מלון"
                message={
                    groupToDelete && groupToDelete.hotels.length > 1
                        ? `האם למחוק את ${groupToDelete.primary.name} ואת כל ${groupToDelete.hotels.length} ההזמנות שלו?`
                        : 'האם אתה בטוח שברצונך למחוק את המלון מהרשימה?'
                }
                confirmText="מחק"
                cancelText="ביטול"
                onConfirm={confirmDeleteHotel}
                onClose={() => setHotelToDelete(null)}
                isDangerous={true}
            />
        </div>
    );
};


// ─────────────────────────────────────────────────────────
// HotelFormModal
// ─────────────────────────────────────────────────────────
const HotelFormModal: React.FC<{ initialData: HotelBooking | null; onClose: () => void; onSave: (data: HotelBooking) => void; }> = ({ initialData, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<HotelBooking>>(initialData || { name: '', address: '', checkInDate: '', checkOutDate: '', bookingSource: 'Direct', price: '' });
    const [showInPicker, setShowInPicker] = useState(false);
    const [showOutPicker, setShowOutPicker] = useState(false);
    const [showCoords, setShowCoords] = useState(!!(initialData?.lat || initialData?.lng));

    const formatForDisplay = (d?: string) => {
        if (!d) return "בחר תאריך";
        if (d.match(/^\d{4}-\d{2}-\d{2}/)) {
            const [y, m, day] = d.split('T')[0].split('-');
            return `${day}/${m}/${y}`;
        }
        return d;
    };

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData as HotelBooking); };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-scale-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                    <h3 className="text-xl font-black text-slate-800">{initialData ? 'עריכת מלון' : 'הוספת מלון ידנית'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 mr-2">שם המלון</label>
                        <input required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-lg outline-none focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="שם המלון" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 mr-2">כתובת</label>
                        <input className="w-full p-4 bg-slate-50 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="כתובת" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 mr-2">עיר (לסינון במפה)</label>
                        <input className="w-full p-4 bg-slate-50 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="למשל: Tbilisi, Napareuli..." value={(formData as any).city || ''} onChange={e => setFormData({ ...formData, city: e.target.value } as any)} />
                    </div>

                    <div>
                        <button type="button" onClick={() => setShowCoords(!showCoords)} className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-2 rounded-xl transition-colors border border-dashed border-indigo-200">
                            <Navigation className="w-3.5 h-3.5" />
                            {showCoords ? 'הסתר קואורדינטות' : '📍 עקוף מיקום על המפה (lat/lng)'}
                        </button>
                        {showCoords && (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 mr-2">Latitude</label>
                                    <input type="number" step="any" className="w-full p-3 bg-slate-50 rounded-xl font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-100" placeholder="41.6938" value={formData.lat || ''} onChange={e => setFormData({ ...formData, lat: parseFloat(e.target.value) } as any)} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 mr-2">Longitude</label>
                                    <input type="number" step="any" className="w-full p-3 bg-slate-50 rounded-xl font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-100" placeholder="44.8015" value={formData.lng || ''} onChange={e => setFormData({ ...formData, lng: parseFloat(e.target.value) } as any)} />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 relative">
                            <label className="text-xs font-bold text-slate-400 mr-2">צ'ק-אין</label>
                            <button type="button" onClick={() => setShowInPicker(true)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm text-right flex items-center justify-between hover:bg-indigo-50 transition-colors">
                                <span>{formatForDisplay(formData.checkInDate)}</span>
                                <Calendar className="w-4 h-4 text-slate-400" />
                            </button>
                            {showInPicker && <CalendarDatePicker value={formData.checkInDate || ''} title="צ'ק-אין" onChange={(iso) => setFormData({ ...formData, checkInDate: iso })} onClose={() => setShowInPicker(false)} />}
                        </div>
                        <div className="space-y-1 relative">
                            <label className="text-xs font-bold text-slate-400 mr-2">צ'ק-אאוט</label>
                            <button type="button" onClick={() => setShowOutPicker(true)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm text-right flex items-center justify-between hover:bg-indigo-50 transition-colors">
                                <span>{formatForDisplay(formData.checkOutDate)}</span>
                                <Calendar className="w-4 h-4 text-slate-400" />
                            </button>
                            {showOutPicker && <CalendarDatePicker value={formData.checkOutDate || ''} title="צ'ק-אאוט" onChange={(iso) => setFormData({ ...formData, checkOutDate: iso })} onClose={() => setShowOutPicker(false)} />}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-2xl">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input type="checkbox" className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500" checked={formData.breakfastIncluded || false} onChange={e => setFormData({ ...formData, breakfastIncluded: e.target.checked })} />
                            <span className="font-bold text-indigo-900">ארוחת בוקר כלולה?</span>
                        </label>
                    </div>

                    <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all">שמור</button>
                </form>
            </div>
        </div>
    );
};


// ─────────────────────────────────────────────────────────
// SmartHotelAddModal
// ─────────────────────────────────────────────────────────
const SmartHotelAddModal: React.FC<{ onClose: () => void; onSave: (data: HotelBooking) => void }> = ({ onClose, onSave }) => {
    const [textInput, setTextInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processContent = async (text: string, files?: FileList) => {
        setIsProcessing(true);
        try {
            const contentParts: any[] = [
                {
                    text: `Extract a hotel booking from this confirmation email or document.

Return ONLY valid JSON in this exact structure:
{
  "name": "Hotel Name",
  "address": "Full address",
  "city": "City name",
  "checkInDate": "DD/MM/YYYY",
  "checkOutDate": "DD/MM/YYYY",
  "nights": number,
  "confirmationCode": "code",
  "bookingSource": "Booking.com" | "Agoda" | "Airbnb" | "Direct",
  "price": "total price with currency symbol",
  "breakfastIncluded": true | false,
  "cancellationPolicy": "cancellation policy text or null",
  "mealPlan": "Room Only" | "Breakfast" | "Half Board" | "All Inclusive" | null,
  "rooms": [
    {
      "id": "room-1",
      "label": "family label if mentioned, otherwise null",
      "roomType": "Exact room type name from the booking e.g. Deluxe Double Room",
      "adults": number,
      "children": number,
      "beds": "King Bed" | "Twin Beds" | "Double Bed" | "Queen Bed" | null,
      "notes": "any special requests or preferences mentioned"
    }
  ]
}

IMPORTANT for rooms:
- If the booking has multiple rooms of the same type, create MULTIPLE entries in the rooms array
- Each room should have the exact room type name as written in the booking
- Extract the number of adults AND children per room (not total)
- If only total guests are mentioned and it's one room, put all in one room entry
- Always include at least 1 room entry if you can identify room type or guest count`
                }
            ];

            if (text) contentParts.push({ text: `Text: ${text}` });

            if (files) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const reader = new FileReader();
                    const promise = new Promise<any>((resolve) => {
                        if (file.type === 'text/plain') {
                            reader.onload = () => resolve({ text: reader.result });
                            reader.readAsText(file);
                        } else {
                            reader.onload = () => resolve({ inlineData: { mimeType: file.type, data: (reader.result as string).split(',')[1] } });
                            reader.readAsDataURL(file);
                        }
                    });
                    contentParts.push(await promise);
                }
            }

            const response = await generateWithFallback(
                null,
                [{ role: 'user', parts: contentParts }],
                { responseMimeType: 'application/json' }
            );

            const textContent = typeof response.text === 'function' ? response.text() : response.text;

            let hotelData;
            try {
                hotelData = JSON.parse(textContent);
            } catch {
                const jsonMatch = textContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) hotelData = JSON.parse(jsonMatch[0]);
                else throw new Error('Could not extract JSON from response');
            }
            onSave(hotelData);
        } catch (e) {
            console.error(e);
            alert('שגיאה בפענוח הנתונים.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col relative">
                <div className="bg-indigo-50 p-6 border-b border-indigo-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-indigo-900 flex items-center gap-2"><Sparkles className="w-5 h-5" /> הוספה חכמה</h3>
                    <button onClick={onClose}><X className="w-6 h-6 text-indigo-300 hover:text-indigo-600" /></button>
                </div>
                <div className="p-6 space-y-6">
                    {isProcessing ? (
                        <div className="py-10 text-center">
                            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                            <p className="font-bold text-slate-500">ה-AI קורא את ההזמנה שלך...</p>
                        </div>
                    ) : (
                        <>
                            <textarea
                                className="w-full h-32 p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 resize-none font-medium"
                                placeholder="הדבק כאן את תוכן המייל או הודעת האישור..."
                                value={textInput}
                                onChange={e => setTextInput(e.target.value)}
                            />
                            <div className="flex items-center gap-4">
                                <div className="h-px bg-slate-200 flex-grow"></div>
                                <span className="text-xs font-bold text-slate-400">או</span>
                                <div className="h-px bg-slate-200 flex-grow"></div>
                            </div>
                            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-2xl p-6 flex flex-col items-center cursor-pointer hover:bg-indigo-50 transition-colors">
                                <UploadCloud className="w-8 h-8 text-indigo-400 mb-2" />
                                <span className="font-bold text-indigo-700 text-sm">העלה צילום מסך או PDF</span>
                                <input type="file" multiple className="hidden" ref={fileInputRef} onChange={e => e.target.files && processContent("", e.target.files)} />
                            </div>
                            <button onClick={() => processContent(textInput)} disabled={!textInput.trim()} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
                                צור מלון
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
