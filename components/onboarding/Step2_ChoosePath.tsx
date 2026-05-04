import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ClipboardPaste, Mail, HelpCircle } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { HowItWorksModal } from '../HowItWorksModal';

export type ImportMethod = 'smart' | 'text' | 'mail';

interface Step2Props {
        onSelect: (method: ImportMethod) => void;
        onBack?: () => void;
}

const containerVariants = {
        hidden: { opacity: 0 },
        show: {
                opacity: 1,
                transition: { staggerChildren: 0.1 },
        },
};

const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 20 } },
};

/**
 * Three blessed creation paths:
 *   - Smart Import (PDF) — drop a booking confirmation PDF
 *   - Free Text from any AI — paste output from ChatGPT / Gemini / Claude / NotebookLM
 *   - Smart Mailbox — forward emails to our inbox; we accumulate them
 */
export const Step2_ChoosePath: React.FC<Step2Props> = ({ onSelect }) => {
        const [howItWorksOpen, setHowItWorksOpen] = useState(false);
        return (
                <div className="w-full max-w-6xl mx-auto" dir="rtl">
                        <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center mb-6 md:mb-8"
                        >
                                <h2 className="text-2xl md:text-3xl font-black text-brand-navy mb-2">
                                        איך ה-AI יבנה לך את הטיול?
                                </h2>
                                <p className="text-slate-500 font-medium text-sm md:text-base">
                                        שלוש דרכים אוטומטיות. אחרי היצירה אפשר תמיד לערוך ידנית.
                                </p>
                        </motion.div>

                        <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                className="grid md:grid-cols-3 gap-3 md:gap-5"
                        >
                                {/* CARD 1 — Smart Import (PDF) */}
                                <motion.div variants={cardVariants} className="h-full">
                                        <GlassCard
                                                hoverEffect
                                                onClick={() => onSelect('smart')}
                                                className="h-full p-5 md:p-6 flex flex-col items-center text-center group border-2 border-transparent hover:border-brand-action/30 cursor-pointer min-h-[280px]"
                                        >
                                                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-tr from-brand-action to-accent-aurora rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-action/25 group-hover:scale-110 transition-transform duration-300">
                                                        <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-white" />
                                                </div>

                                                <div className="flex items-center gap-2 mb-1.5">
                                                        <h3 className="text-base md:text-lg font-black text-brand-navy">
                                                                העלאת PDF
                                                        </h3>
                                                        <span className="bg-brand-action/10 text-brand-action px-2 py-0.5 rounded-pill text-2xs font-bold">
                                                                מומלץ
                                                        </span>
                                                </div>

                                                <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-4 flex-1">
                                                        Booking, Airbnb, Skyscanner, Trip.com — או כל אישור הזמנה. ה-AI יחלץ הכל בשניות.
                                                </p>

                                                <div className="w-full flex flex-col gap-1 text-2xs md:text-xs text-slate-500 bg-slate-50 rounded-md p-2.5 mb-4 text-right">
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

                                {/* CARD 2 — Free Text from any AI */}
                                <motion.div variants={cardVariants} className="h-full">
                                        <GlassCard
                                                hoverEffect
                                                onClick={() => onSelect('text')}
                                                className="h-full p-5 md:p-6 flex flex-col items-center text-center group border-2 border-transparent hover:border-indigo-300/40 cursor-pointer min-h-[280px]"
                                        >
                                                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform duration-300">
                                                        <ClipboardPaste className="w-7 h-7 md:w-8 md:h-8 text-white" />
                                                </div>

                                                <h3 className="text-base md:text-lg font-black text-brand-navy mb-1.5">
                                                        תיאור במילים מכל AI
                                                </h3>
                                                <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-pill text-2xs font-bold mb-2">
                                                        ChatGPT · Gemini · Claude · NotebookLM
                                                </span>

                                                <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-3 flex-1">
                                                        הדבק טקסט שיצרת בכל AI. ה-AI שלנו יחלץ יעדים, תאריכים, מלונות וטיסות — או שנייצר לך פרומפט מוכן ל-Gemini שיקרא את ה-Gmail שלך.
                                                </p>

                                                <button
                                                        onClick={(e) => { e.stopPropagation(); setHowItWorksOpen(true); }}
                                                        className="inline-flex items-center gap-1.5 text-2xs md:text-xs font-bold text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-full mb-3 self-end"
                                                        type="button"
                                                >
                                                        <HelpCircle className="w-3.5 h-3.5" />
                                                        איך זה עובד עם NotebookLM?
                                                </button>

                                                <div className="w-full flex flex-col gap-1 text-2xs md:text-xs text-slate-500 bg-slate-50 rounded-md p-2.5 mb-4 text-right">
                                                        <div>✓ מזהה ערים ותאריכים</div>
                                                        <div>✓ מחלץ מלונות + טיסות מטבלה / CSV</div>
                                                        <div>✓ עובד עם פלט מכל מודל</div>
                                                </div>

                                                <div className="flex items-center text-indigo-600 font-bold text-sm group-hover:gap-2 transition-all">
                                                        <span>בחר שיטה זו</span>
                                                        <ArrowRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity transform rotate-180" />
                                                </div>
                                        </GlassCard>
                                </motion.div>

                                {/* CARD 3 — Smart Mailbox */}
                                <motion.div variants={cardVariants} className="h-full">
                                        <GlassCard
                                                hoverEffect
                                                onClick={() => onSelect('mail')}
                                                className="h-full p-5 md:p-6 flex flex-col items-center text-center group border-2 border-transparent hover:border-emerald-300/40 cursor-pointer min-h-[280px]"
                                        >
                                                <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300">
                                                        <Mail className="w-7 h-7 md:w-8 md:h-8 text-white" />
                                                </div>

                                                <h3 className="text-base md:text-lg font-black text-brand-navy mb-1.5">
                                                        תיבת הדואר החכמה
                                                </h3>
                                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-pill text-2xs font-bold mb-2">
                                                        מתחבר ל-Gmail שלך
                                                </span>

                                                <p className="text-slate-500 text-xs md:text-sm leading-relaxed mb-4 flex-1">
                                                        העבר אישורי הזמנה למייל שלנו. ה-AI יבנה את הטיול אוטומטית — ואפשר להעביר עוד מיילים בכל זמן ולעדכן את המסלול.
                                                </p>

                                                <div className="w-full flex flex-col gap-1 text-2xs md:text-xs text-slate-500 bg-slate-50 rounded-md p-2.5 mb-4 text-right">
                                                        <div>✓ עובד עם Gmail, Outlook, יאהו</div>
                                                        <div>✓ צובר מיילים — מאשר טיול ביבוא אחד</div>
                                                        <div>✓ מעדכן טיול קיים מול אישורים חדשים</div>
                                                </div>

                                                <div className="flex items-center text-emerald-700 font-bold text-sm group-hover:gap-2 transition-all">
                                                        <span>בחר שיטה זו</span>
                                                        <ArrowRight className="w-4 h-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity transform rotate-180" />
                                                </div>
                                        </GlassCard>
                                </motion.div>
                        </motion.div>

                        <p className="text-center text-xs text-slate-400 mt-5 max-w-xl mx-auto px-4">
                                טיפ: אחרי היצירה יש עריכה מלאה — אפשר להוסיף ידנית טיסות, מלונות ופעילויות בכל תג.
                        </p>

                        <HowItWorksModal isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
                </div>
        );
};
