import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ClipboardPaste } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface Step2Props {
        onSelect: (method: 'smart' | 'manual' | 'text') => void;
        onBack?: () => void;
}

const containerVariants = {
        hidden: { opacity: 0 },
        show: {
                opacity: 1,
                transition: { staggerChildren: 0.12 },
        },
};

const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 20 } },
};

/**
 * Two blessed creation paths (Smart Import + Free Text).
 * Manual Build was removed in R7 per user decision — the timeline already
 * supports free-form editing after create, so a third path was noise.
 */
export const Step2_ChoosePath: React.FC<Step2Props> = ({ onSelect }) => {
        return (
                <div className="w-full max-w-4xl mx-auto" dir="rtl">
                        <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center mb-6 md:mb-8"
                        >
                                <h2 className="text-2xl md:text-3xl font-black text-brand-navy mb-2">
                                        איך ה-AI יבנה לך את הטיול?
                                </h2>
                                <p className="text-slate-500 font-medium text-sm md:text-base">
                                        שתי דרכים אוטומטיות. אחרי היצירה אפשר תמיד לערוך ידנית.
                                </p>
                        </motion.div>

                        <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                className="grid md:grid-cols-2 gap-4 md:gap-6"
                        >
                                {/* Smart Import */}
                                <motion.div variants={cardVariants} className="h-full">
                                        <GlassCard
                                                hoverEffect
                                                onClick={() => onSelect('smart')}
                                                className="h-full p-6 flex flex-col items-center text-center group border-2 border-transparent hover:border-brand-action/30"
                                        >
                                                <div className="w-16 h-16 bg-gradient-to-tr from-brand-action to-accent-aurora rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-action/25 group-hover:scale-110 transition-transform duration-300">
                                                        <Sparkles className="w-8 h-8 text-white" />
                                                </div>

                                                <div className="flex items-center gap-2 mb-1.5">
                                                        <h3 className="text-lg md:text-xl font-black text-brand-navy">
                                                                משיכה חכמה
                                                        </h3>
                                                        <span className="bg-brand-action/10 text-brand-action px-2 py-0.5 rounded-pill text-2xs font-bold">
                                                                מומלץ
                                                        </span>
                                                </div>

                                                <p className="text-slate-500 text-sm leading-relaxed mb-5 flex-1">
                                                        העלה PDF של אישור הזמנה או העבר אימייל — ה-AI יבנה את כל המסלול: טיסות, מלונות, פעילויות. מוכן בשניות.
                                                </p>

                                                <div className="w-full flex flex-col gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-md p-2.5 mb-4">
                                                        <div>✓ מעתיק טיסות, מלונות, וכתובות</div>
                                                        <div>✓ יוצר לו״ז יום-יום</div>
                                                        <div>✓ ממלא תמונות וציוני Google</div>
                                                </div>

                                                <div className="flex items-center text-brand-action font-bold text-sm group-hover:gap-2 transition-all">
                                                        <span>בחר שיטה זו</span>
                                                        <ArrowRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity transform rotate-180" />
                                                </div>
                                        </GlassCard>
                                </motion.div>

                                {/* Free Text */}
                                <motion.div variants={cardVariants} className="h-full">
                                        <GlassCard
                                                hoverEffect
                                                onClick={() => onSelect('text')}
                                                className="h-full p-6 flex flex-col items-center text-center group border-2 border-transparent hover:border-indigo-300/40"
                                        >
                                                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform duration-300">
                                                        <ClipboardPaste className="w-8 h-8 text-white" />
                                                </div>

                                                <h3 className="text-lg md:text-xl font-black text-brand-navy mb-1.5">
                                                        תיאור במילים
                                                </h3>
                                                <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-pill text-2xs font-bold mb-2">
                                                        ל-ChatGPT / NotebookLM
                                                </span>

                                                <p className="text-slate-500 text-sm leading-relaxed mb-5 flex-1">
                                                        הדבק טקסט חופשי שתיאר לך את הטיול (למשל פלט מ-ChatGPT). ה-AI יחלץ יעדים, תאריכים, מלונות וטיסות.
                                                </p>

                                                <div className="w-full flex flex-col gap-1.5 text-xs text-slate-500 bg-slate-50 rounded-md p-2.5 mb-4">
                                                        <div>✓ מזהה ערים ותאריכים</div>
                                                        <div>✓ מחלץ מלונות + טיסות מטבלה / CSV</div>
                                                        <div>✓ מושלם כהמשך לצ׳אט GPT</div>
                                                </div>

                                                <div className="flex items-center text-indigo-600 font-bold text-sm group-hover:gap-2 transition-all">
                                                        <span>בחר שיטה זו</span>
                                                        <ArrowRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity transform rotate-180" />
                                                </div>
                                        </GlassCard>
                                </motion.div>
                        </motion.div>

                        <p className="text-center text-xs text-slate-400 mt-5 max-w-xl mx-auto">
                                טיפ: אחרי היצירה יש עריכה מלאה — אפשר להוסיף ידנית טיסות, מלונות ופעילויות בכל תג.
                        </p>
                </div>
        );
};
