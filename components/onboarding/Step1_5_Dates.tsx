import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronRight } from 'lucide-react';
import { RippleButton } from '../ui/RippleButton';

interface StepDatesProps {
        onNext: (data: { startDate: string; endDate: string }) => void;
        onBack: () => void;
        initialData?: { startDate: string; endDate: string };
}

const POPULAR_MONTHS: { label: string; month: number }[] = [
        { label: 'אוגוסט', month: 8 },
        { label: 'ספטמבר', month: 9 },
        { label: 'דצמבר', month: 12 },
        { label: 'מרץ', month: 3 },
        { label: 'אפריל', month: 4 },
];

const toISODate = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
};

/**
 * Compact, fits-on-screen on iPhone SE (375×667) AND on a 1080×~600 wizard
 * card on desktop. Tightened from the original spacious layout: smaller
 * icon + title, single-line subtitle, popular-months chips inline with header,
 * date inputs side-by-side, action buttons immediately below — all visible
 * without scrolling.
 */
export const Step1_5_Dates: React.FC<StepDatesProps> = ({ onNext, onBack, initialData }) => {
        const [dates, setDates] = useState({
                start: initialData?.startDate || '',
                end: initialData?.endDate || ''
        });

        const isValid = dates.start && dates.end;

        const pickMonth = (monthNum: number) => {
                const now = new Date();
                const firstOfThisYear = new Date(now.getFullYear(), monthNum - 1, 1);
                const year = now > firstOfThisYear ? now.getFullYear() + 1 : now.getFullYear();
                const start = new Date(year, monthNum - 1, 1);
                const end = new Date(year, monthNum - 1, 11);
                setDates({ start: toISODate(start), end: toISODate(end) });
        };

        const activeMonth = dates.start ? Number(dates.start.slice(5, 7)) : null;

        return (
                <div className="w-full max-w-2xl mx-auto text-center" dir="rtl">
                        <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className="mb-4 md:mb-6"
                        >
                                <div className="w-12 h-12 md:w-14 md:h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                        <Calendar className="w-6 h-6 md:w-7 md:h-7 text-orange-500" />
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black text-brand-navy mb-1 tracking-tight">
                                        מתי אורזים מזוודות?
                                </h2>
                                <p className="text-sm text-slate-500 font-medium">
                                        בחרו תאריכים (אופציונלי — אפשר לשנות בכל שלב)
                                </p>
                        </motion.div>

                        <div className="max-w-xl mx-auto space-y-4 md:space-y-5">
                                {/* Popular months — single row, scrolls horizontally if needed */}
                                <div>
                                        <p className="text-2xs font-black text-slate-400 uppercase tracking-widest mb-2">חודשים פופולריים</p>
                                        <div className="flex gap-2 justify-center flex-wrap">
                                                {POPULAR_MONTHS.map(m => {
                                                        const isActive = activeMonth === m.month;
                                                        return (
                                                                <button
                                                                        key={m.month}
                                                                        type="button"
                                                                        onClick={() => pickMonth(m.month)}
                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-h-[36px] ${isActive
                                                                                ? 'bg-orange-500 text-white shadow shadow-orange-500/30'
                                                                                : 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50/50'
                                                                                }`}
                                                                >
                                                                        {m.label}
                                                                </button>
                                                        );
                                                })}
                                        </div>
                                </div>

                                {/* Date inputs side-by-side, tighter padding */}
                                <div className="flex gap-3">
                                        <div className="flex-1 space-y-1">
                                                <label className="block text-2xs font-black text-slate-400 uppercase tracking-widest text-right px-1">התחלה</label>
                                                <input
                                                        type="date"
                                                        value={dates.start}
                                                        onChange={(e) => setDates(prev => ({ ...prev, start: e.target.value }))}
                                                        className="w-full bg-white border border-slate-200 text-slate-800 text-base font-bold rounded-xl py-3 px-3 shadow-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/50 transition-all text-center"
                                                />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                                <label className="block text-2xs font-black text-slate-400 uppercase tracking-widest text-right px-1">סיום</label>
                                                <input
                                                        type="date"
                                                        value={dates.end}
                                                        min={dates.start}
                                                        onChange={(e) => setDates(prev => ({ ...prev, end: e.target.value }))}
                                                        className="w-full bg-white border border-slate-200 text-slate-800 text-base font-bold rounded-xl py-3 px-3 shadow-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/50 transition-all text-center"
                                                />
                                        </div>
                                </div>

                                {/* Continue + back, immediately visible */}
                                <div className="flex flex-col gap-2 pt-2">
                                        <RippleButton
                                                onClick={() => onNext({ startDate: dates.start, endDate: dates.end })}
                                                className={`w-full py-3 text-base shadow-orange-500/20 ${isValid ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}
                                        >
                                                {isValid ? 'המשך לשלב הבא' : 'דלג לשלב הבא'}
                                        </RippleButton>
                                        <button
                                                onClick={onBack}
                                                className="flex items-center justify-center gap-1 text-slate-400 font-bold hover:text-slate-600 transition-colors py-1 text-sm"
                                        >
                                                <ChevronRight className="w-4 h-4" />
                                                חזרה
                                        </button>
                                </div>
                        </div>
                </div>
        );
};
