import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Compass, ArrowRight, ClipboardPaste } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface Step2Props {
        onSelect: (method: 'smart' | 'manual' | 'text') => void;
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
                <div className="w-full max-w-4xl mx-auto" dir="rtl">
                        <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center mb-6 md:mb-8"
                        >
                                <h2 className="text-2xl md:text-3xl font-black text-brand-navy mb-1.5">
                                        איך תרצו לבנות את הטיול?
                                </h2>
                                <p className="text-slate-500 font-medium text-sm md:text-base">
                                        בחרו את הדרך שמתאימה לכם ביותר.
                                </p>
                        </motion.div>

                        <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                className="grid md:grid-cols-2 gap-4 md:gap-5"
                        >
                                {/* Option A: Smart Import */}
                                <motion.div variants={cardVariants} className="h-full">
                                        <GlassCard
                                                hoverEffect={true}
                                                onClick={() => onSelect('smart')}
                                                className="h-full p-5 md:p-6 flex flex-col items-center text-center group border-2 border-transparent hover:border-brand-action/20"
                                        >
                                                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-tr from-brand-action to-accent-aurora rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-brand-action/20 group-hover:scale-110 transition-transform duration-300">
                                                        <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-white" />
                                                </div>

                                                <h3 className="text-lg md:text-xl font-bold text-brand-navy mb-1.5">
                                                        משיכה חכמה (Smart Import)
                                                </h3>
                                                <div className="bg-brand-action/10 text-brand-action px-2.5 py-0.5 rounded-full text-[11px] font-bold mb-2">
                                                        מומלץ ✨
                                                </div>

                                                <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-1">
                                                        העלו אישורי הזמנה (PDF) או העבירו אימיילים.
                                                        ה-AI יבנה לכם את כל המסלול תוך שניות.
                                                </p>

                                                <div className="flex items-center text-brand-action font-bold text-sm group-hover:gap-2 transition-all">
                                                        <span>בנה לי את הטיול</span>
                                                        <ArrowRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity transform rotate-180" />
                                                </div>
                                        </GlassCard>
                                </motion.div>

                                {/* Option B: Manual Build */}
                                <motion.div variants={cardVariants} className="h-full">
                                        <GlassCard
                                                hoverEffect={true}
                                                onClick={() => onSelect('manual')}
                                                className="h-full p-5 md:p-6 flex flex-col items-center text-center group border-2 border-transparent hover:border-slate-300/50"
                                        >
                                                <div className="w-14 h-14 md:w-16 md:h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-slate-200 transition-colors duration-300">
                                                        <Compass className="w-7 h-7 md:w-8 md:h-8 text-slate-600" />
                                                </div>

                                                <h3 className="text-lg md:text-xl font-bold text-brand-navy mb-1.5">
                                                        תכנון ידני
                                                </h3>
                                                <div className="px-2.5 py-0.5 text-[11px] font-bold mb-2 opacity-0" aria-hidden>SPACER</div>

                                                <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-1">
                                                        התחילו מאפס. בחרו תאריכים, הוסיפו ערים, ותכננו בדיוק איך שאתם אוהבים.
                                                </p>

                                                <div className="flex items-center text-slate-600 font-bold text-sm group-hover:text-brand-navy group-hover:gap-2 transition-all">
                                                        <span>אני אבנה בעצמי</span>
                                                        <ArrowRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity transform rotate-180" />
                                                </div>
                                        </GlassCard>
                                </motion.div>
                        </motion.div>

                        {/* Option C: Free Text — wide card below */}
                        <motion.div
                                variants={cardVariants}
                                initial="hidden"
                                animate="show"
                                className="mt-4 md:mt-5"
                        >
                                <GlassCard
                                        hoverEffect={true}
                                        onClick={() => onSelect('text')}
                                        className="p-4 md:p-5 group border-2 border-transparent hover:border-indigo-300/40"
                                >
                                        <div className="flex items-center gap-3 md:gap-4 text-right">
                                                {/* Icon */}
                                                <div className="w-11 h-11 md:w-12 md:h-12 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                                        <ClipboardPaste className="w-5 h-5 md:w-6 md:h-6 text-white" />
                                                </div>

                                                {/* Text */}
                                                <div className="flex-1 min-w-0">
                                                        <h3 className="text-base md:text-lg font-bold text-brand-navy leading-tight">
                                                                תיאור הטיול במילים
                                                        </h3>
                                                        <p className="text-slate-500 text-xs md:text-sm leading-snug mt-0.5">
                                                                הדביקו טקסט, טבלה או CSV — ה-AI יחלץ מלונות וטיסות (אידיאלי לפלט מ-ChatGPT / NotebookLM).
                                                        </p>
                                                </div>

                                                {/* CTA */}
                                                <div className="flex items-center text-indigo-600 font-bold text-sm group-hover:gap-2 transition-all flex-shrink-0 whitespace-nowrap">
                                                        <span>הדבק את הטיול</span>
                                                        <ArrowRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity transform rotate-180" />
                                                </div>
                                        </div>
                                </GlassCard>
                        </motion.div>
                </div>
        );
};
