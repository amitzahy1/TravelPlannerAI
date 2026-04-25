import React, { useState } from 'react';
import { Transport } from '../types';
import { styleForMode } from '../utils/transportColors';
import { ChevronDown, MoreVertical, Edit2, Trash2, Clock, Calendar } from 'lucide-react';

interface TransportRowProps {
        transport: Transport;
        onEdit?: () => void;
        onDelete?: () => void;
}

const formatTime = (raw?: string): string | undefined => {
        if (!raw) return undefined;
        if (/^\d{1,2}:\d{2}$/.test(raw)) return raw;
        if (raw.includes('T')) return raw.split('T')[1]?.slice(0, 5);
        return raw;
};

const formatDate = (raw?: string): string => {
        if (!raw) return '';
        const m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return raw;
        const [, y, mo, d] = m;
        const date = new Date(Date.UTC(parseInt(y), parseInt(mo) - 1, parseInt(d)));
        return date.toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: 'long' });
};

/**
 * Compact card for non-flight transports (transfers, ferries, drives,
 * trains, buses, car rentals). Mirrors the FlightRow visual rhythm but
 * stripped down — no boarding-pass strip, no airline logo. The colour
 * stripe on the right (RTL: visual right) matches the mode's hero
 * colour so the card reads at a glance.
 */
export const TransportRow: React.FC<TransportRowProps> = ({ transport, onEdit, onDelete }) => {
        const [menuOpen, setMenuOpen] = useState(false);
        const style = styleForMode(transport.mode);
        const dep = formatTime(transport.departureTime);
        const arr = formatTime(transport.arrivalTime);

        return (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden relative">
                        {/* Mode colour stripe — RTL visual right */}
                        <span aria-hidden className="absolute right-0 top-0 bottom-0 w-1.5" style={{ background: style.line }} />

                        <div className="px-4 sm:px-5 py-4">
                                {/* Hero row: date + mode badge + actions */}
                                <div className="flex items-center justify-between gap-3 mb-2.5" dir="rtl">
                                        <div className="min-w-0 flex-1">
                                                <div className="text-base sm:text-lg font-black text-slate-900 leading-tight truncate flex items-center gap-2">
                                                        <span style={{ background: style.bg, color: style.fg }} className="text-2xs font-black px-2 py-0.5 rounded-md uppercase tracking-wide">
                                                                {style.emoji} {style.label}
                                                        </span>
                                                        <span className="truncate">{formatDate(transport.date)}</span>
                                                </div>
                                                {transport.provider && (
                                                        <div className="text-xs font-semibold text-slate-500 mt-0.5 truncate">
                                                                {transport.provider}
                                                                {transport.bookingRef && (
                                                                        <span className="ms-2 text-2xs font-mono font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                                                                                {transport.bookingRef}
                                                                        </span>
                                                                )}
                                                        </div>
                                                )}
                                        </div>
                                        {(onEdit || onDelete) && (
                                                <div className="relative flex-shrink-0">
                                                        <button
                                                                onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
                                                                className="w-11 h-11 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center"
                                                                aria-label="פעולות"
                                                                aria-haspopup="menu"
                                                                aria-expanded={menuOpen}
                                                        >
                                                                <MoreVertical className="w-5 h-5" />
                                                        </button>
                                                        {menuOpen && (
                                                                <>
                                                                        <div className="fixed inset-0 z-50" onClick={() => setMenuOpen(false)} />
                                                                        <div role="menu" className="absolute top-full left-0 mt-1 min-w-[140px] bg-white rounded-xl shadow-xl border border-slate-100 z-[60] overflow-hidden">
                                                                                {onEdit && (
                                                                                        <button onClick={() => { setMenuOpen(false); onEdit(); }} className="w-full px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                                                                                <Edit2 className="w-4 h-4" /> ערוך
                                                                                        </button>
                                                                                )}
                                                                                {onDelete && (
                                                                                        <button onClick={() => { setMenuOpen(false); onDelete(); }} className="w-full px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                                                                                <Trash2 className="w-4 h-4" /> מחק
                                                                                        </button>
                                                                                )}
                                                                        </div>
                                                                </>
                                                        )}
                                                </div>
                                        )}
                                </div>

                                {/* From → To row */}
                                <div dir="ltr" className="flex items-center gap-2 bg-gradient-to-l from-slate-50 to-white rounded-xl p-3 border border-slate-100">
                                        <div className="flex-1 min-w-0 text-left">
                                                <div className="text-lg font-black text-slate-900 leading-tight truncate" dir="rtl">{transport.from || '—'}</div>
                                                {dep && <div className="text-xs font-semibold text-slate-500 font-mono mt-0.5">{dep}</div>}
                                        </div>
                                        <div className="flex flex-col items-center text-slate-400 px-2">
                                                <span className="text-lg leading-none">{style.emoji}</span>
                                                {transport.duration && <span className="text-2xs font-bold text-slate-500 mt-1 whitespace-nowrap">{transport.duration}</span>}
                                        </div>
                                        <div className="flex-1 min-w-0 text-right">
                                                <div className="text-lg font-black text-slate-900 leading-tight truncate" dir="rtl">{transport.to || '—'}</div>
                                                {arr && <div className="text-xs font-semibold text-slate-500 font-mono mt-0.5">{arr}</div>}
                                        </div>
                                </div>

                                {/* Footer chips: vehicle / pickup / price / notes */}
                                {(transport.vehicle || transport.pickupPoint || transport.price || transport.notes) && (
                                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                                                {transport.vehicle && (
                                                        <span className="text-2xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">{transport.vehicle}</span>
                                                )}
                                                {transport.pickupPoint && (
                                                        <span className="text-2xs font-bold bg-amber-50 text-amber-800 border border-amber-100 px-2 py-0.5 rounded-md">איסוף: {transport.pickupPoint}</span>
                                                )}
                                                {transport.price && (
                                                        <span className="text-2xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md">
                                                                {transport.price}{transport.currency ? ` ${transport.currency}` : ''}
                                                        </span>
                                                )}
                                                {transport.notes && (
                                                        <span className="text-2xs text-slate-500 italic px-2 py-0.5 truncate max-w-[200px]">{transport.notes}</span>
                                                )}
                                        </div>
                                )}
                        </div>
                </div>
        );
};
