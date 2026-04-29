/**
 * Bottom sheet that lists every "missing data" gap detected in the trip
 * by getMissingDataPoints. Each row has a deep-link button that navigates
 * the user to the relevant tab so they can fix it.
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ArrowLeft, ExternalLink, X } from 'lucide-react';
import { MissingPoint } from '../../utils/tripGaps';

interface MissingDataSheetProps {
        isOpen: boolean;
        onClose: () => void;
        points: MissingPoint[];
        onNavigate: (tab: string) => void;
}

const KIND_META: Record<MissingPoint['kind'], { color: string; emoji: string; group: string }> = {
        no_hotel_for_day: { color: '#0ea5e9', emoji: '🏨', group: 'מלונות חסרים' },
        no_transport_to_hotel: { color: '#6366f1', emoji: '🚖', group: 'תחבורה משדה התעופה' },
        unresolved_geocode: { color: '#f59e0b', emoji: '📍', group: 'מקומות לא נמצאו במפה' },
        ambiguous_location: { color: '#eab308', emoji: '⚠️', group: 'מיקומים לא מאומתים' },
        no_research_for_city: { color: '#8b5cf6', emoji: '🔍', group: 'ערים בלי מחקר AI' },
};

export const MissingDataSheet: React.FC<MissingDataSheetProps> = ({ isOpen, onClose, points, onNavigate }) => {
        useEffect(() => {
                if (!isOpen) return;
                const previousOverflow = document.body.style.overflow;
                document.body.style.overflow = 'hidden';
                return () => { document.body.style.overflow = previousOverflow; };
        }, [isOpen]);

        if (!isOpen) return null;
        if (typeof document === 'undefined') return null;

        const grouped = points.reduce((acc, p) => {
                const key = p.kind;
                if (!acc[key]) acc[key] = [];
                acc[key].push(p);
                return acc;
        }, {} as Record<MissingPoint['kind'], MissingPoint[]>);

        return createPortal(
                <div
                        className="fixed inset-0 z-[1200] bg-slate-900/50 backdrop-blur-sm flex items-end justify-center"
                        onClick={onClose}
                        role="dialog"
                        aria-modal="true"
                        aria-label="פריטים חסרים בטיול"
                        dir="rtl"
                >
                        <div
                                className="w-full max-w-xl bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto"
                                onClick={e => e.stopPropagation()}
                        >
                                <div className="flex justify-center pt-2">
                                        <div className="w-12 h-1 rounded-full bg-slate-300" />
                                </div>
                                <div className="flex items-center justify-between px-4 pt-3 pb-2">
                                        <div className="flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                                <h2 className="text-base font-black text-slate-800">חסרים {points.length} פריטים בטיול</h2>
                                        </div>
                                        <button
                                                onClick={onClose}
                                                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500"
                                                aria-label="סגור"
                                        >
                                                <X className="w-4 h-4" />
                                        </button>
                                </div>

                                <div className="p-4 space-y-4">
                                        {(Object.keys(grouped) as MissingPoint['kind'][]).map(kind => {
                                                const meta = KIND_META[kind];
                                                const items = grouped[kind];
                                                return (
                                                        <div key={kind} className="space-y-2">
                                                                <div className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-wider">
                                                                        <span>{meta.emoji}</span>
                                                                        <span>{meta.group}</span>
                                                                        <span className="text-slate-400">·</span>
                                                                        <span>{items.length}</span>
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                        {items.map(p => (
                                                                                <div
                                                                                        key={p.id}
                                                                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-200"
                                                                                >
                                                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${meta.color}18` }}>
                                                                                                <span style={{ color: meta.color }}>{meta.emoji}</span>
                                                                                        </div>
                                                                                        <button
                                                                                                onClick={() => { onNavigate(p.deepLinkTab); onClose(); }}
                                                                                                className="flex-1 min-w-0 text-right"
                                                                                        >
                                                                                                <div className="text-sm font-bold text-slate-800 truncate">{p.label}</div>
                                                                                                <div className="text-[10px] text-slate-500 mt-0.5">{p.suggestedAction}</div>
                                                                                        </button>
                                                                                        {p.externalUrl && (
                                                                                                <a
                                                                                                        href={p.externalUrl}
                                                                                                        target="_blank"
                                                                                                        rel="noopener noreferrer"
                                                                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                                                                        title="פתח ב-Google Maps"
                                                                                                        onClick={e => e.stopPropagation()}
                                                                                                >
                                                                                                        <ExternalLink className="w-4 h-4" />
                                                                                                </a>
                                                                                        )}
                                                                                        <ArrowLeft className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                                                </div>
                                                                        ))}
                                                                </div>
                                                        </div>
                                                );
                                        })}
                                </div>
                        </div>
                </div>,
                document.body
        );
};
