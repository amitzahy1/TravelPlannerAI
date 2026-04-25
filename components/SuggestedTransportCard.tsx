import React from 'react';
import { SuggestedTransport } from '../utils/suggestedTransports';
import { AlertTriangle, Plus } from 'lucide-react';

interface SuggestedTransportCardProps {
        suggestion: SuggestedTransport;
        onAdd: (s: SuggestedTransport) => void;
}

const formatDate = (raw?: string): string => {
        if (!raw) return '';
        const m = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return raw;
        const [, y, mo, d] = m;
        const date = new Date(Date.UTC(parseInt(y), parseInt(mo) - 1, parseInt(d)));
        return date.toLocaleDateString('he-IL', { weekday: 'long', day: '2-digit', month: 'long' });
};

/**
 * Yellow warning card shown in the Transports view when the heuristic
 * detector flags a gap (e.g. landing day + hotel in another city, no
 * transfer booked). Tapping the card opens AddTransportModal pre-filled
 * with the suggestion's fields so the user only has to confirm + tweak.
 */
export const SuggestedTransportCard: React.FC<SuggestedTransportCardProps> = ({ suggestion, onAdd }) => {
        return (
                <button
                        onClick={() => onAdd(suggestion)}
                        className="w-full text-right bg-amber-50 hover:bg-amber-100 border-2 border-dashed border-amber-300 rounded-2xl p-4 transition-colors group"
                        dir="rtl"
                >
                        <div className="flex items-start gap-3">
                                <span className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0">
                                        <AlertTriangle className="w-5 h-5" />
                                </span>
                                <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                                <span className="text-2xs font-black text-amber-900 bg-amber-200 px-2 py-0.5 rounded-md uppercase tracking-wide">
                                                        חסרה הסעה
                                                </span>
                                                <span className="text-2xs font-bold text-amber-800">{formatDate(suggestion.date)}</span>
                                        </div>
                                        <div className="text-sm font-black text-slate-900 leading-tight mb-1">
                                                {suggestion.from} <span className="text-amber-600">→</span> {suggestion.to}
                                        </div>
                                        <div className="text-2xs text-slate-600 leading-snug">{suggestion.reason}</div>
                                        {suggestion.notes && (
                                                <div className="text-2xs text-slate-500 italic mt-1">{suggestion.notes}</div>
                                        )}
                                </div>
                                <span className="flex-shrink-0 inline-flex items-center gap-1 bg-amber-600 group-hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                                        <Plus className="w-3.5 h-3.5" /> להוסיף
                                </span>
                        </div>
                </button>
        );
};
