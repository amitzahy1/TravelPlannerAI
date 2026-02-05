import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Compass, ArrowRight } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface Step2Props {
        onSelect: (method: 'smart' | 'manual') => void;
        onBack?: () => void;
}

const containerVariants = {
        hidden: { opacity: 0 },
        show: {
                opacity: 1,
                transition: {
                        staggerChildren: 0.15
                }
        }
};

const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 20 } }
};

export const Step2_ChoosePath: React.FC<Step2Props> = ({ onSelect, onBack }) => {
        return (
                <div className="w-full max-w-4xl mx-auto">
                        <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center mb-12"
                        >
                                <h2 className="text-3xl md:text-4xl font-black text-brand-navy mb-3">
                                        How should we build this trip?
                                </h2>
                                <p className="text-slate-500 font-medium">
                                        Choose the path that suits you best.
                                </p>
                        </motion.div>

                        <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                className="grid md:grid-cols-2 gap-6 md:gap-8"
                        >
                                {/* Option A: Smart Import */}
                                <motion.div variants={cardVariants} className="h-full">
                                        <GlassCard
                                                hoverEffect={true}
                                                onClick={() => onSelect('smart')}
                                                className="h-full p-8 flex flex-col items-center text-center group border-2 border-transparent hover:border-brand-action/20"
                                        >
                                                <div className="w-20 h-20 bg-gradient-to-tr from-brand-action to-accent-aurora rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-brand-action/20 group-hover:scale-110 transition-transform duration-300">
                                                        <Sparkles className="w-10 h-10 text-white" />
                                                </div>

                                                <h3 className="text-2xl font-bold text-brand-navy mb-3">
                                                        Smart Import
                                                </h3>
                                                <div className="bg-brand-action/10 text-brand-action px-3 py-1 rounded-full text-xs font-bold mb-4">
                                                        RECOMMENDED
                                                </div>

                                                <p className="text-slate-500 leading-relaxed mb-8 flex-1">
                                                        Upload your booking confirmations (PDFs) or forward your emails.
                                                        Our AI will build your entire itinerary in seconds.
                                                </p>

                                                <div className="flex items-center text-brand-action font-bold group-hover:gap-2 transition-all">
                                                        <span>Build it for me</span>
                                                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                        </GlassCard>
                                </motion.div>

                                {/* Option B: Manual Build */}
                                <motion.div variants={cardVariants} className="h-full">
                                        <GlassCard
                                                hoverEffect={true}
                                                onClick={() => onSelect('manual')}
                                                className="h-full p-8 flex flex-col items-center text-center group border-2 border-transparent hover:border-slate-300/50"
                                        >
                                                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-slate-200 transition-colors duration-300">
                                                        <Compass className="w-10 h-10 text-slate-600" />
                                                </div>

                                                <h3 className="text-2xl font-bold text-brand-navy mb-3">
                                                        Manual Build
                                                </h3>
                                                <div className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold mb-4 opacity-0">
                                                        HIDDEN SPACER
                                                </div>

                                                <p className="text-slate-500 leading-relaxed mb-8 flex-1">
                                                        Start from scratch. Pick your dates, add your cities, and craft the
                                                        plan exactly how you want it, step by step.
                                                </p>

                                                <div className="flex items-center text-slate-600 font-bold group-hover:text-brand-navy group-hover:gap-2 transition-all">
                                                        <span>I'll lead the way</span>
                                                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                        </GlassCard>
                                </motion.div>
                        </motion.div>
                </div>
        );
};
