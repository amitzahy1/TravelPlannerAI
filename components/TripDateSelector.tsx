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

export const TripDateSelector: React.FC<TripDateSelectorProps> = ({
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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={onClose}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[320px] max-h-[70vh] flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                                <div className="flex justify-between items-center mb-4 px-6 pt-6 flex-shrink-0">
                                        <div>
                                                <h3 className="text-xl font-black text-slate-800">{title}</h3>
                                                {description && (
                                                        <p className="text-xs text-slate-500 font-bold mt-1">
                                                                {description}
                                                        </p>
                                                )}
                                        </div>
                                        <button
                                                onClick={onClose}
                                                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"
                                        >
                                                <X className="w-5 h-5" />
                                        </button>
                                </div>

                                <div className="grid grid-cols-1 gap-2 flex-grow overflow-y-auto custom-scrollbar px-6 pb-6">
                                        {dates.map((day) => {
                                                const hasEvents = day.events.length > 0;
                                                const eventCount = day.events.length;

                                                return (
                                                        <button
                                                                key={day.dateIso}
                                                                onClick={() => onSelect(day.dateIso)}
                                                                className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-300 hover:bg-blue-50 transition-all text-right group flex-shrink-0"
                                                        >
                                                                <div className="flex items-center gap-4">
                                                                        <div className="bg-slate-100 text-slate-600 w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold text-sm group-hover:bg-white group-hover:text-blue-600 transition-colors">
                                                                                {day.displayDate.split(' ')[0]}
                                                                        </div>
                                                                        <div>
                                                                                <span className="text-xs font-bold text-slate-400 block mb-0.5">{day.displayDayOfWeek}</span>
                                                                                <span className="font-bold text-slate-800 block">{day.locationContext || 'יום בטיול'}</span>
                                                                        </div>
                                                                </div>

                                                                {hasEvents ? (
                                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-full border border-slate-100 shadow-sm">
                                                                                <div className="flex -space-x-1 space-x-reverse">
                                                                                        {day.events.slice(0, 3).map((e, i) => (
                                                                                                <div key={i} className={`w-2 h-2 rounded-full ${e.bgClass?.replace('bg-', 'bg-').split(' ')[0].replace('50', '400') || 'bg-blue-400'}`}></div>
                                                                                        ))}
                                                                                </div>
                                                                                <span className="text-[10px] font-bold text-slate-400">{eventCount}</span>
                                                                        </div>
                                                                ) : (
                                                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-50 opacity-0 group-hover:opacity-100 transition-all" />
                                                                )}
                                                        </button>
                                                );
                                        })}
                                </div>
                        </div>
                </div>
        );
};
