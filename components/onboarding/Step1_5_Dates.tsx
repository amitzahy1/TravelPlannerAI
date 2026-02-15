import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronRight } from 'lucide-react';
import { RippleButton } from '../ui/RippleButton';

interface StepDatesProps {
        onNext: (data: { startDate: string; endDate: string }) => void;
        onBack: () => void;
        initialData?: { startDate: string; endDate: string };
}

export const Step1_5_Dates: React.FC<StepDatesProps> = ({ onNext, onBack, initialData }) => {
        const [dates, setDates] = useState({
                start: initialData?.startDate || '',
                end: initialData?.endDate || ''
        });

        const isValid = dates.start && dates.end;

        return (
                <div className="w-full max-w-2xl mx-auto text-center" dir="rtl">
                        {/* Header */}
                        <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="mb-10"
                        >
                                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                        <Calendar className="w-8 h-8 text-orange-500" />
                                </div>

                                <h2 className="text-4xl md:text-5xl font-black text-brand-navy mb-4 tracking-tight">
                                        מתי אורזים מזוודות?
                                </h2>
                                <p className="text-lg text-slate-500 font-medium">
                                        בחרו את תאריכי החופשה (אופציונלי - אפשר לשנות אח״כ)
                                </p>
                        </motion.div>

                        {/* Content */}
                        <div className="max-w-xl mx-auto space-y-8">
                                <div className="flex gap-4">
                                        <div className="flex-1 space-y-2">
                                                <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider text-right px-1">תאריך התחלה</label>
                                                <input
                                                        type="date"
                                                        value={dates.start}
                                                        onChange={(e) => setDates(prev => ({ ...prev, start: e.target.value }))}
                                                        className="w-full bg-white border border-slate-200 text-slate-800 text-xl font-medium rounded-2xl py-4 px-4 shadow-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/50 transition-all text-center"
                                                />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                                <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider text-right px-1">תאריך סיום</label>
                                                <input
                                                        type="date"
                                                        value={dates.end}
                                                        min={dates.start}
                                                        onChange={(e) => setDates(prev => ({ ...prev, end: e.target.value }))}
                                                        className="w-full bg-white border border-slate-200 text-slate-800 text-xl font-medium rounded-2xl py-4 px-4 shadow-sm focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500/50 transition-all text-center"
                                                />
                                        </div>
                                </div>

                                <div className="flex flex-col gap-4 pt-8">
                                        <RippleButton
                                                onClick={() => onNext({ startDate: dates.start, endDate: dates.end })}
                                                className={`w-full py-4 text-lg shadow-orange-500/20 ${isValid ? 'bg-orange-500 hover:bg-orange-600' : 'bg-slate-200 text-slate-400 hover:bg-slate-300'}`}
                                        >
                                                {isValid ? 'המשך לשלב הבא' : 'דלג לשלב הבא'}
                                        </RippleButton>

                                        <button
                                                onClick={onBack}
                                                className="flex items-center justify-center gap-1 text-slate-400 font-bold hover:text-slate-600 transition-colors py-2"
                                        >
                                                <ChevronRight className="w-4 h-4" />
                                                חזרה
                                        </button>
                                </div>
                        </div>
                </div>
        );
};
