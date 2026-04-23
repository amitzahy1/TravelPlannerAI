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
                                className="text-center mb-12"
                        >
                                <h2 className="text-3xl md:text-4xl font-black text-brand-navy mb-3">
                                        איך תרצו לבנות את הטיול?
                                </h2>
                                <p className="text-slate-500 font-medium">
                                        בחרו את הדרך שמתאימה לכם ביותר.
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
                                                        משיכה חכמה (Smart Import)
                                                </h3>
                                                <div className="bg-brand-action/10 text-brand-action px-3 py-1 rounded-full text-xs font-bold mb-4">
                                                        מומלץ ✨
                                                </div>

                                                <p className="text-slate-500 leading-relaxed mb-8 flex-1">
                                                        העלו אישורי הזמנה (PDF) או העבירו אימיילים.
                                                        ה-AI שלנו יבנה לכם את כל המסלול תוך שניות.
                                                </p>

                                                <div className="flex items-center text-brand-action font-bold group-hover:gap-2 transition-all">
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
                                                className="h-full p-8 flex flex-col items-center text-center group border-2 border-transparent hover:border-slate-300/50"
                                        >
                                                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-slate-200 transition-colors duration-300">
                                                        <Compass className="w-10 h-10 text-slate-600" />
                                                </div>

                                                <h3 className="text-2xl font-bold text-brand-navy mb-3">
                                                        תכנון ידני
                                                </h3>
                                                <div className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-xs font-bold mb-4 opacity-0">
                                                        SPACER
                                                </div>

                                                <p className="text-slate-500 leading-relaxed mb-8 flex-1">
                                                        התחילו מאפס. בחרו תאריכים, הוסיפו ערים, ותכננו את הטיול
                                                        בדיוק איך שאתם אוהבים, צעד אחר צעד.
                                                </p>

                                                <div className="flex items-center text-slate-600 font-bold group-hover:text-brand-navy group-hover:gap-2 transition-all">
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
                                className="mt-6 md:mt-8"
                        >
                                <GlassCard
                                        hoverEffect={true}
                                        onClick={() => onSelect('text')}
                                        className="p-5 md:p-6 group border-2 border-transparent hover:border-indigo-300/40"
                                >
                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 text-right">
                                                {/* Icon */}
                                                <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300 flex-shrink-0">
                                                        <ClipboardPaste className="w-7 h-7 text-white" />
                                                </div>

                                                {/* Text */}
                                                <div className="flex-1 min-w-0">
                                                        <h3 className="text-xl md:text-2xl font-bold text-brand-navy mb-1">
                                                                תיאור הטיול במילים
                                                        </h3>
                                                        <p className="text-slate-500 text-sm md:text-base leading-relaxed">
                                                                הדביקו טקסט חופשי, טבלה או CSV עם פרטי הטיול — ה-AI יחלץ מלונות וטיסות באופן אוטומטי.
                                                                אידיאלי למי שאסף את המידע במקום אחד (למשל בעזרת ChatGPT או NotebookLM).
                                                        </p>
                                                </div>

                                                {/* CTA */}
                                                <div className="flex items-center text-indigo-600 font-bold group-hover:gap-2 transition-all flex-shrink-0 self-end md:self-auto">
                                                        <span>הדבק את הטיול</span>
                                                        <ArrowRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity transform rotate-180" />
                                                </div>
                                        </div>
                                </GlassCard>
                        </motion.div>
                </div>
        );
};
