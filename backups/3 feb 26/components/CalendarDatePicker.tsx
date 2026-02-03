import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarDatePickerProps {
        value: string; // ISO YYYY-MM-DD or DD/MM/YYYY
        onChange: (isoDate: string) => void;
        onClose: () => void;
        title?: string;
}

export const CalendarDatePicker: React.FC<CalendarDatePickerProps> = ({ value, onChange, onClose, title = 'בחר תאריך' }) => {
        // 1. Initial Date Logic
        const parseInitialDate = (v: string): Date => {
                if (!v) return new Date();
                // Handle DD/MM/YYYY
                if (v.includes('/')) {
                        const [d, m, y] = v.split('/');
                        const parsed = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2020) return parsed;
                }
                // Handle YYYY-MM-DD (Strict Local)
                if (v.match(/^\d{4}-\d{2}-\d{2}$/)) {
                        const [y, m, d] = v.split('-').map(Number);
                        const parsed = new Date(y, m - 1, d);
                        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2020) return parsed;
                }
                // Fallback
                const d = new Date(v);
                // If invalid or year is unreasonable, return current date
                if (isNaN(d.getTime()) || d.getFullYear() < 2020 || d.getFullYear() > 2050) {
                        return new Date();
                }
                return d;
        };

        const initialDate = useMemo(() => parseInitialDate(value), [value]);
        const [viewDate, setViewDate] = useState(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));

        // 2. Calendar Math
        const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

        const monthName = viewDate.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

        const calendarDays = useMemo(() => {
                const year = viewDate.getFullYear();
                const month = viewDate.getMonth();
                const totalDays = daysInMonth(year, month);
                const startDay = firstDayOfMonth(year, month);

                const days = [];
                // Pad previous month
                for (let i = 0; i < startDay; i++) days.push(null);
                // Current month
                for (let i = 1; i <= totalDays; i++) {
                        days.push(new Date(year, month, i));
                }
                return days;
        }, [viewDate]);

        const handleDateSelect = (d: Date) => {
                // FIXED: manually construct local YYYY-MM-DD to avoid Timezone offsets
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const iso = `${year}-${month}-${day}`;
                onChange(iso);
                onClose();
        };

        const isSelected = (d: Date) => {
                return d.getFullYear() === initialDate.getFullYear() &&
                        d.getMonth() === initialDate.getMonth() &&
                        d.getDate() === initialDate.getDate();
        };

        const isToday = (d: Date) => {
                const now = new Date();
                return d.getFullYear() === now.getFullYear() &&
                        d.getMonth() === now.getMonth() &&
                        d.getDate() === now.getDate();
        };

        return (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
                        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                                {/* Header */}
                                <div className="bg-indigo-600 p-6 text-white text-right">
                                        <div className="flex justify-between items-center mb-4">
                                                <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                                                <h3 className="text-xl font-black">{title}</h3>
                                        </div>
                                        <div className="text-4xl font-black opacity-90">
                                                {initialDate.getDate()} {initialDate.toLocaleDateString('he-IL', { month: 'short' })}
                                        </div>
                                        <div className="text-sm font-bold opacity-70 mt-1 uppercase tracking-widest">
                                                {initialDate.getFullYear()}
                                        </div>
                                </div>

                                {/* Month Navigator */}
                                <div className="p-4 bg-slate-50 flex justify-between items-center border-b border-slate-100">
                                        <button
                                                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                                                className="p-2 hover:bg-white rounded-xl shadow-sm transition-all"
                                        >
                                                <ChevronLeft className="w-5 h-5 text-slate-400" />
                                        </button>

                                        <div className="flex items-center gap-2" dir="rtl">
                                                <span className="font-black text-slate-700 text-lg">
                                                        {viewDate.toLocaleDateString('he-IL', { month: 'long' })}
                                                </span>
                                                <div className="relative">
                                                        <select
                                                                value={viewDate.getFullYear()}
                                                                onChange={(e) => setViewDate(new Date(parseInt(e.target.value), viewDate.getMonth(), 1))}
                                                                className="appearance-none bg-transparent font-bold text-slate-500 cursor-pointer focus:outline-none hover:text-indigo-600 pr-4 pl-2 text-lg"
                                                        >
                                                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                                                                        <option key={y} value={y}>{y}</option>
                                                                ))}
                                                        </select>
                                                </div>
                                        </div>

                                        <button
                                                onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                                                className="p-2 hover:bg-white rounded-xl shadow-sm transition-all"
                                        >
                                                <ChevronRight className="w-5 h-5 text-slate-400" />
                                        </button>
                                </div>

                                {/* Calendar Grid */}
                                <div className="p-4 pt-2">
                                        <div className="grid grid-cols-7 mb-2">
                                                {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(d => (
                                                        <div key={d} className="text-center text-[10px] font-black text-slate-400 py-2">{d}</div>
                                                ))}
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                                {calendarDays.map((day, i) => (
                                                        <div key={i} className="aspect-square flex items-center justify-center">
                                                                {day ? (
                                                                        <button
                                                                                onClick={() => handleDateSelect(day)}
                                                                                className={`
                                            w-9 h-9 rounded-full text-xs font-bold transition-all
                                            ${isSelected(day)
                                                                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 scale-110'
                                                                                                : isToday(day)
                                                                                                        ? 'text-indigo-600 border border-indigo-200 bg-indigo-50'
                                                                                                        : 'text-slate-600 hover:bg-slate-100'
                                                                                        }
                                        `}
                                                                        >
                                                                                {day.getDate()}
                                                                        </button>
                                                                ) : null}
                                                        </div>
                                                ))}
                                        </div>
                                </div>

                                {/* Footer */}
                                <div className="p-4 border-t border-slate-50 flex justify-end gap-2">
                                        <button onClick={onClose} className="px-5 py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors">ביטול</button>
                                        <button onClick={() => handleDateSelect(new Date())} className="px-5 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">היום</button>
                                </div>
                        </div>
                </div>
        );
};
