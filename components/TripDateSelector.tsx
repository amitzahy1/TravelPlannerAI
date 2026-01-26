import React, { useMemo } from 'react';
import { Trip, DayPlan } from '../types';
import { X, ChevronRight } from 'lucide-react';

interface TripDateSelectorProps {
        isOpen: boolean;
        onClose: () => void;
        onSelect: (dateIso: string) => void;
        title?: string;
        description?: string;
        trip: Trip;
        timeline?: DayPlan[];
}

const TripDateSelector: React.FC<TripDateSelectorProps> = ({
        isOpen, onClose, onSelect, title = 'בחר תאריך', description, trip, timeline
}) => {
        if (!isOpen) return null;

        // Use timeline if provided, otherwise generate dates from trip
        const dates = useMemo(() => {
                if (timeline && timeline.length > 0) return timeline;

                // Fallback: Generate simple dates from trip range
                const generated: DayPlan[] = [];
                if (!trip.dates) return [];

                let start = new Date();
                let end = new Date();
                const parts = trip.dates.split('-').map(s => s.trim());

                const parse = (s: string) => {
                        if (s.includes('/')) {
                                const [d, m, y] = s.split('/');
                                return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                        }
                        return new Date(s);
                };

                if (parts.length === 2) {
                        start = parse(parts[0]);
                        end = parse(parts[1]);
                } else {
                        start.setHours(0, 0, 0, 0);
                        end.setDate(start.getDate() + 5);
                }

                const current = new Date(start);
                while (current <= end) {
                        generated.push({
                                dateIso: current.toLocaleDateString('en-GB').split('/').reverse().join('-'), // YYYY-MM-DD
                                displayDate: current.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
                                displayDayOfWeek: current.toLocaleDateString('he-IL', { weekday: 'short' }),
                                locationContext: `יום ${generated.length + 1}`,
                                events: [],
                                stats: { food: 0, attr: 0, flight: 0, travel: 0, hotel: 0 },
                                hasHotel: false
                        });
                        current.setDate(current.getDate() + 1);
                }
                return generated;
        }, [trip, timeline]);

        return (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                                {/* Header */}
                                <div className="bg-slate-50 border-b border-slate-100 p-4 flex justify-between items-center">
                                        <h3 className="text-sm font-black text-slate-800">{title}</h3>
                                        <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                                <X className="w-4 h-4" />
                                        </button>
                                </div>

                                {/* Description (Optional) */}
                                {description && <div className="px-4 py-2 bg-blue-50/50 text-xs font-bold text-blue-600 border-b border-blue-50">{description}</div>}

                                {/* Compact List */}
                                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                                        {dates.map((day) => {
                                                const hasEvents = day.events.length > 0;
                                                return (
                                                        <button
                                                                key={day.dateIso}
                                                                onClick={() => onSelect(day.dateIso)}
                                                                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors text-right group"
                                                        >
                                                                {/* Date Box */}
                                                                <div className="flex flex-col items-center justify-center w-10 h-10 bg-slate-100 rounded-lg text-slate-600 group-hover:bg-white group-hover:text-blue-600 transition-colors border border-slate-100 group-hover:border-blue-200">
                                                                        <span className="text-xs font-black leading-none">{day.displayDate.split(' ')[0]}</span>
                                                                        <span className="text-[9px] font-bold uppercase leading-none mt-0.5">{day.displayDate.split(' ')[1]}</span>
                                                                </div>

                                                                {/* Info */}
                                                                <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2">
                                                                                <span className="text-xs font-black text-slate-800">{day.displayDayOfWeek}</span>
                                                                                <span className="text-[10px] text-slate-400 truncate max-w-[150px]">{day.locationContext || 'יום בטיול'}</span>
                                                                        </div>
                                                                        {/* Events Dots */}
                                                                        {hasEvents && (
                                                                                <div className="flex items-center gap-1 mt-1.5">
                                                                                        {day.events.slice(0, 4).map((e, i) => (
                                                                                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${e.bgClass?.replace('bg-', 'bg-').split(' ')[0].replace('50', '400') || 'bg-slate-300'}`} />
                                                                                        ))}
                                                                                        {day.events.length > 4 && <span className="text-[8px] text-slate-300 font-bold">+{day.events.length - 4}</span>}
                                                                                </div>
                                                                        )}
                                                                </div>

                                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transform group-hover:-translate-x-1 transition-all" />
                                                        </button>
                                                );
                                        })}
                                </div>
                        </div>
                </div>
        );
};
