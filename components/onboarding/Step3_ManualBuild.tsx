import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, Plus } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { RippleButton } from '../ui/RippleButton';

interface Step3ManualProps {
        onComplete: (data: any) => void;
        onBack: () => void;
}

export const Step3_ManualBuild: React.FC<Step3ManualProps> = ({ onComplete, onBack }) => {
        const [startDate, setStartDate] = useState('');
        const [endDate, setEndDate] = useState('');
        const [initialCity, setInitialCity] = useState('');

        const handleComplete = () => {
                onComplete({
                        manual: true,
                        startDate,
                        endDate,
                        cities: initialCity ? [initialCity] : []
                });
        };

        return (
                <div className="w-full max-w-2xl mx-auto">
                        <div className="text-center mb-10">
                                <h2 className="text-3xl font-black text-brand-navy mb-2">The Basics</h2>
                                <p className="text-slate-500">Let's set the foundation. You can add more later.</p>
                        </div>

                        <GlassCard className="p-8">
                                <div className="space-y-8">
                                        {/* Dates */}
                                        <div>
                                                <label className="block text-sm font-bold text-brand-navy mb-3 flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-brand-action" />
                                                        When are you going?
                                                </label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="relative">
                                                                <input
                                                                        type="date"
                                                                        value={startDate}
                                                                        onChange={(e) => setStartDate(e.target.value)}
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-brand-action/20 focus:border-brand-action transition-all"
                                                                />
                                                                <span className="absolute top-[-8px] left-3 bg-white px-1 text-[10px] font-bold text-slate-400">START</span>
                                                        </div>
                                                        <div className="relative">
                                                                <input
                                                                        type="date"
                                                                        value={endDate}
                                                                        onChange={(e) => setEndDate(e.target.value)}
                                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-brand-action/20 focus:border-brand-action transition-all"
                                                                />
                                                                <span className="absolute top-[-8px] left-3 bg-white px-1 text-[10px] font-bold text-slate-400">END</span>
                                                        </div>
                                                </div>
                                        </div>

                                        {/* First City */}
                                        <div>
                                                <label className="block text-sm font-bold text-brand-navy mb-3 flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-brand-action" />
                                                        First Stop (Optional)
                                                </label>
                                                <input
                                                        type="text"
                                                        value={initialCity}
                                                        onChange={(e) => setInitialCity(e.target.value)}
                                                        placeholder="e.g. London, UK"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium focus:ring-2 focus:ring-brand-action/20 focus:border-brand-action transition-all"
                                                />
                                        </div>

                                        {/* Actions */}
                                        <div className="pt-4 flex items-center justify-between">
                                                <button
                                                        onClick={onBack}
                                                        className="text-slate-400 font-bold hover:text-brand-navy transition-colors text-sm"
                                                >
                                                        Back
                                                </button>

                                                <RippleButton
                                                        onClick={handleComplete}
                                                        className="px-8 shadow-brand-action/30"
                                                >
                                                        Create Trip
                                                </RippleButton>
                                        </div>
                                </div>
                        </GlassCard>
                </div>
        );
};
