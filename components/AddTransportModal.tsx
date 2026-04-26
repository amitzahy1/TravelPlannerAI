import React, { useEffect, useState } from 'react';
import { Transport, TransportMode } from '../types';
import { MODE_COLORS } from '../utils/transportColors';
import { X, Check } from 'lucide-react';

interface AddTransportModalProps {
        initial?: Transport | null;
        onSave: (t: Transport) => void;
        onClose: () => void;
}

const SELECTABLE_MODES: TransportMode[] = ['transfer', 'ferry', 'train', 'bus', 'car_rental', 'drive', 'cruise'];

const newId = () => `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Generic modal for adding / editing a non-flight transport. Mode picker
 * at the top, then mode-specific fields revealed below. Saves into
 * trip.transports via the parent's onSave callback.
 */
export const AddTransportModal: React.FC<AddTransportModalProps> = ({ initial, onSave, onClose }) => {
        const [form, setForm] = useState<Transport>(initial || {
                id: newId(),
                mode: 'transfer',
                from: '',
                to: '',
                date: '',
                departureTime: '',
                arrivalTime: '',
                duration: '',
                provider: '',
                bookingRef: '',
                notes: '',
                vehicle: '',
                pickupPoint: '',
                sourceArrayKey: 'transports',
        });

        // Lock body scroll while the modal is open so the page underneath
        // can't scroll out from under it on mobile, and force the viewport
        // to the top so the modal is always visible without scrolling.
        useEffect(() => {
                const prev = document.body.style.overflow;
                document.body.style.overflow = 'hidden';
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return () => { document.body.style.overflow = prev; };
        }, []);

        const handleSave = () => {
                if (!form.from || !form.to || !form.date) return;
                onSave({ ...form, sourceArrayKey: form.sourceArrayKey || 'transports' });
                onClose();
        };

        const set = <K extends keyof Transport>(k: K, v: Transport[K]) => setForm(prev => ({ ...prev, [k]: v }));

        const isFlightMode = form.mode === 'flight';

        return (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
                        {/* Modal placed at the TOP of the viewport so it
                             always lands in the user's eye-line — was
                             centring vertically before, which on tall pages
                             pushed it below the fold and the user had to
                             scroll. Keeps overflow-y-auto on the wrapper so
                             long content still scrolls within the modal. */}
                        <div
                                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto mt-4 sm:mt-12 mb-8 max-h-[calc(100vh-4rem)] overflow-y-auto"
                                onClick={e => e.stopPropagation()}
                                dir="rtl"
                                style={{ width: 'calc(100% - 2rem)' }}
                        >
                                {/* Header */}
                                <div className="sticky top-0 bg-white border-b border-slate-100 px-5 py-4 flex items-center justify-between">
                                        <h2 className="text-lg font-black text-slate-900">{initial ? 'ערוך העברה' : 'הוסף העברה'}</h2>
                                        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full">
                                                <X className="w-4 h-4 text-slate-500" />
                                        </button>
                                </div>

                                <div className="p-5 space-y-4">
                                        {/* Mode picker */}
                                        <div>
                                                <label className="block text-2xs font-black text-slate-500 uppercase tracking-wider mb-2">סוג העברה</label>
                                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                                        {SELECTABLE_MODES.map(m => {
                                                                const cfg = MODE_COLORS[m];
                                                                const active = form.mode === m;
                                                                return (
                                                                        <button
                                                                                key={m}
                                                                                type="button"
                                                                                onClick={() => set('mode', m)}
                                                                                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all ${
                                                                                        active ? 'border-slate-900 shadow-sm' : 'border-slate-200 hover:border-slate-300'
                                                                                }`}
                                                                                style={active ? { background: cfg.bg } : {}}
                                                                        >
                                                                                <span className="text-xl">{cfg.emoji}</span>
                                                                                <span className="text-2xs font-black" style={active ? { color: cfg.fg } : { color: '#475569' }}>
                                                                                        {cfg.label}
                                                                                </span>
                                                                        </button>
                                                                );
                                                        })}
                                                </div>
                                        </div>

                                        {/* From / To */}
                                        <div className="grid grid-cols-1 gap-3">
                                                <div>
                                                        <label className="block text-2xs font-black text-slate-500 uppercase tracking-wider mb-1">מ-</label>
                                                        <input
                                                                type="text"
                                                                value={form.from}
                                                                onChange={e => set('from', e.target.value)}
                                                                placeholder="למשל: שדה תעופה סובארנבומי"
                                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
                                                        />
                                                </div>
                                                <div>
                                                        <label className="block text-2xs font-black text-slate-500 uppercase tracking-wider mb-1">אל</label>
                                                        <input
                                                                type="text"
                                                                value={form.to}
                                                                onChange={e => set('to', e.target.value)}
                                                                placeholder="למשל: מלון Holiday Inn Pattaya"
                                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
                                                        />
                                                </div>
                                        </div>

                                        {/* Date + times */}
                                        <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                        <label className="block text-2xs font-black text-slate-500 uppercase tracking-wider mb-1">תאריך</label>
                                                        <input
                                                                type="date"
                                                                value={form.date}
                                                                onChange={e => set('date', e.target.value)}
                                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
                                                        />
                                                </div>
                                                <div>
                                                        <label className="block text-2xs font-black text-slate-500 uppercase tracking-wider mb-1">שעה</label>
                                                        <input
                                                                type="time"
                                                                value={form.departureTime}
                                                                onChange={e => set('departureTime', e.target.value)}
                                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
                                                        />
                                                </div>
                                                <div>
                                                        <label className="block text-2xs font-black text-slate-500 uppercase tracking-wider mb-1">משך</label>
                                                        <input
                                                                type="text"
                                                                value={form.duration}
                                                                onChange={e => set('duration', e.target.value)}
                                                                placeholder="2h 15m"
                                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
                                                        />
                                                </div>
                                        </div>

                                        {/* Provider + booking */}
                                        <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                        <label className="block text-2xs font-black text-slate-500 uppercase tracking-wider mb-1">מפעיל / חברה</label>
                                                        <input
                                                                type="text"
                                                                value={form.provider || ''}
                                                                onChange={e => set('provider', e.target.value)}
                                                                placeholder="Bolt / Pattaya Pier / Eurostar"
                                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
                                                        />
                                                </div>
                                                <div>
                                                        <label className="block text-2xs font-black text-slate-500 uppercase tracking-wider mb-1">קוד הזמנה</label>
                                                        <input
                                                                type="text"
                                                                value={form.bookingRef || ''}
                                                                onChange={e => set('bookingRef', e.target.value)}
                                                                placeholder="ABC123"
                                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
                                                        />
                                                </div>
                                        </div>

                                        {/* Mode-specific extras */}
                                        {(form.mode === 'transfer' || form.mode === 'car_rental') && (
                                                <div>
                                                        <label className="block text-2xs font-black text-slate-500 uppercase tracking-wider mb-1">נקודת איסוף</label>
                                                        <input
                                                                type="text"
                                                                value={form.pickupPoint || ''}
                                                                onChange={e => set('pickupPoint', e.target.value)}
                                                                placeholder="לובי המלון / טרמינל 1"
                                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
                                                        />
                                                </div>
                                        )}

                                        {(form.mode === 'ferry' || form.mode === 'transfer' || form.mode === 'train' || form.mode === 'car_rental') && (
                                                <div>
                                                        <label className="block text-2xs font-black text-slate-500 uppercase tracking-wider mb-1">
                                                                {form.mode === 'ferry' ? 'סוג כרטיס' : form.mode === 'train' ? 'מספר קרון' : form.mode === 'car_rental' ? 'דגם רכב' : 'סוג רכב'}
                                                        </label>
                                                        <input
                                                                type="text"
                                                                value={form.vehicle || ''}
                                                                onChange={e => set('vehicle', e.target.value)}
                                                                placeholder={form.mode === 'ferry' ? 'הולכי רגל / רכב' : form.mode === 'car_rental' ? 'Toyota Yaris' : ''}
                                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
                                                        />
                                                </div>
                                        )}

                                        {/* Price */}
                                        <div className="grid grid-cols-3 gap-3">
                                                <div className="col-span-2">
                                                        <label className="block text-2xs font-black text-slate-500 uppercase tracking-wider mb-1">מחיר</label>
                                                        <input
                                                                type="number"
                                                                value={form.price ?? ''}
                                                                onChange={e => set('price', e.target.value ? Number(e.target.value) : undefined)}
                                                                placeholder="0"
                                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400"
                                                        />
                                                </div>
                                                <div>
                                                        <label className="block text-2xs font-black text-slate-500 uppercase tracking-wider mb-1">מטבע</label>
                                                        <select
                                                                value={form.currency || 'USD'}
                                                                onChange={e => set('currency', e.target.value)}
                                                                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 bg-white"
                                                        >
                                                                <option>USD</option>
                                                                <option>EUR</option>
                                                                <option>ILS</option>
                                                                <option>THB</option>
                                                                <option>GBP</option>
                                                                <option>JPY</option>
                                                        </select>
                                                </div>
                                        </div>

                                        {/* Notes */}
                                        <div>
                                                <label className="block text-2xs font-black text-slate-500 uppercase tracking-wider mb-1">הערות</label>
                                                <textarea
                                                        value={form.notes || ''}
                                                        onChange={e => set('notes', e.target.value)}
                                                        placeholder="הערות נוספות"
                                                        rows={2}
                                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 resize-none"
                                                />
                                        </div>
                                </div>

                                {/* Footer */}
                                <div className="sticky bottom-0 bg-white border-t border-slate-100 px-5 py-3 flex justify-end gap-2">
                                        <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">ביטול</button>
                                        <button
                                                onClick={handleSave}
                                                disabled={!form.from || !form.to || !form.date}
                                                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                                <Check className="w-4 h-4" /> שמור
                                        </button>
                                </div>
                        </div>
                </div>
        );
};
