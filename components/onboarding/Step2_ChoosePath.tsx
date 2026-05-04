import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ClipboardPaste, Mail, HelpCircle, ChevronLeft } from 'lucide-react';
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
                transition: { staggerChildren: 0.08 },
        },
};

const cardVariants = {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 22 } },
};

const ROW_DATA: Array<{
        id: ImportMethod;
        title: string;
        tag: string;
        body: string;
        gradient: string;
        accent: string;
        icon: React.ReactNode;
}> = [
        {
                id: 'smart',
                title: 'העלאת PDF',
                tag: 'מומלץ',
                body: 'Booking, Airbnb, Skyscanner — או כל אישור הזמנה. ה-AI יחלץ הכל בשניות.',
                gradient: 'from-brand-action to-accent-aurora',
                accent: 'text-brand-action',
                icon: <Sparkles className="w-6 h-6 text-white" />,
        },
        {
                id: 'text',
                title: 'תיאור במילים מכל AI',
                tag: 'ChatGPT · Gemini · Claude · NotebookLM',
                body: 'הדבק טקסט שיצרת בכל AI. ה-AI שלנו יחלץ יעדים, תאריכים, מלונות וטיסות.',
                gradient: 'from-indigo-500 to-violet-500',
                accent: 'text-indigo-600',
                icon: <ClipboardPaste className="w-6 h-6 text-white" />,
        },
        {
                id: 'mail',
                title: 'תיבת הדואר החכמה',
                tag: 'מתחבר ל-Gmail',
                body: 'העבר אישורי הזמנה למייל שלנו. ה-AI יבנה טיול אוטומטית.',
                gradient: 'from-emerald-500 to-teal-600',
                accent: 'text-emerald-700',
                icon: <Mail className="w-6 h-6 text-white" />,
        },
];

/**
 * Three blessed creation paths.
 * Mobile: compact rows (icon + title + body + chevron) — all 3 visible
 * without scrolling on a 380×600 viewport.
 * Desktop: keeps the spacious 3-card grid.
 */
export const Step2_ChoosePath: React.FC<Step2Props> = ({ onSelect }) => {
        const [howItWorksOpen, setHowItWorksOpen] = useState(false);
        return (
                <div className="w-full max-w-6xl mx-auto" dir="rtl">
                        <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center mb-3 md:mb-6"
                        >
                                <h2 className="text-xl md:text-3xl font-black text-brand-navy mb-1 md:mb-2">
                                        איך ה-AI יבנה לך את הטיול?
                                </h2>
                                <p className="text-slate-500 font-medium text-xs md:text-base">
                                        שלוש דרכים אוטומטיות. אחרי היצירה אפשר תמיד לערוך ידנית.
                                </p>
                        </motion.div>

                        {/* MOBILE: compact rows */}
                        <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                className="md:hidden flex flex-col gap-2"
                        >
                                {ROW_DATA.map(row => (
                                        <motion.button
                                                key={row.id}
                                                variants={cardVariants}
                                                onClick={() => onSelect(row.id)}
                                                className="group flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md active:scale-[0.99] transition-all text-right"
                                                dir="rtl"
                                        >
                                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${row.gradient} flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform`}>
                                                        {row.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                                                <h3 className="text-sm font-black text-brand-navy">{row.title}</h3>
                                                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 ${row.accent}`}>
                                                                        {row.tag}
                                                                </span>
                                                        </div>
                                                        <p className="text-2xs text-slate-500 leading-snug line-clamp-2">{row.body}</p>
                                                </div>
                                                <ChevronLeft className={`w-4 h-4 ${row.accent} shrink-0 group-hover:-translate-x-0.5 transition-transform`} />
                                        </motion.button>
                                ))}

                                <button
                                        onClick={() => setHowItWorksOpen(true)}
                                        className="inline-flex items-center justify-center gap-1.5 mt-1 mx-auto text-2xs font-bold text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-full"
                                        type="button"
                                >
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        איך זה עובד עם NotebookLM ו-Gemini?
                                </button>
                        </motion.div>

                        {/* DESKTOP: spacious 3-card grid */}
                        <motion.div
                                variants={containerVariants}
                                initial="hidden"
                                animate="show"
                                className="hidden md:grid md:grid-cols-3 gap-5"
                        >
                                {/* CARD 1 — Smart Import (PDF) */}
                                <motion.div variants={cardVariants} className="h-full">
                                        <GlassCard
                                                hoverEffect
                                                onClick={() => onSelect('smart')}
                                                className="h-full p-6 flex flex-col items-center text-center group border-2 border-transparent hover:border-brand-action/30 cursor-pointer min-h-[260px]"
                                        >
                                                <div className="w-16 h-16 bg-gradient-to-tr from-brand-action to-accent-aurora rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-action/25 group-hover:scale-110 transition-transform duration-300">
                                                        <Sparkles className="w-8 h-8 text-white" />
                                                </div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                        <h3 className="text-lg font-black text-brand-navy">העלאת PDF</h3>
                                                        <span className="bg-brand-action/10 text-brand-action px-2 py-0.5 rounded-pill text-2xs font-bold">מומלץ</span>
                                                </div>
                                                <p className="text-slate-500 text-sm leading-relaxed mb-3 flex-1">
                                                        Booking, Airbnb, Skyscanner, Trip.com — או כל אישור הזמנה. ה-AI יחלץ הכל בשניות.
                                                </p>
                                                <div className="w-full flex flex-col gap-1 text-xs text-slate-500 bg-slate-50 rounded-md p-2.5 mb-3 text-right">
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
                                                className="h-full p-6 flex flex-col items-center text-center group border-2 border-transparent hover:border-indigo-300/40 cursor-pointer min-h-[260px]"
                                        >
                                                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform duration-300">
                                                        <ClipboardPaste className="w-8 h-8 text-white" />
                                                </div>
                                                <h3 className="text-lg font-black text-brand-navy mb-1.5">תיאור במילים מכל AI</h3>
                                                <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-pill text-2xs font-bold mb-2">
                                                        ChatGPT · Gemini · Claude · NotebookLM
                                                </span>
                                                <p className="text-slate-500 text-sm leading-relaxed mb-2 flex-1">
                                                        הדבק טקסט שיצרת בכל AI — או שנייצר לך פרומפט מוכן ל-Gemini שיקרא את ה-Gmail שלך.
                                                </p>
                                                <button
                                                        onClick={(e) => { e.stopPropagation(); setHowItWorksOpen(true); }}
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-full mb-2 self-end"
                                                        type="button"
                                                >
                                                        <HelpCircle className="w-3.5 h-3.5" />
                                                        איך זה עובד עם NotebookLM?
                                                </button>
                                                <div className="w-full flex flex-col gap-1 text-xs text-slate-500 bg-slate-50 rounded-md p-2.5 mb-3 text-right">
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
                                                className="h-full p-6 flex flex-col items-center text-center group border-2 border-transparent hover:border-emerald-300/40 cursor-pointer min-h-[260px]"
                                        >
                                                <div className="w-16 h-16 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300">
                                                        <Mail className="w-8 h-8 text-white" />
                                                </div>
                                                <h3 className="text-lg font-black text-brand-navy mb-1.5">תיבת הדואר החכמה</h3>
                                                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-pill text-2xs font-bold mb-2">
                                                        מתחבר ל-Gmail שלך
                                                </span>
                                                <p className="text-slate-500 text-sm leading-relaxed mb-3 flex-1">
                                                        העבר אישורי הזמנה למייל שלנו. ה-AI יבנה את הטיול אוטומטית — ואפשר להעביר עוד מיילים בכל זמן ולעדכן.
                                                </p>
                                                <div className="w-full flex flex-col gap-1 text-xs text-slate-500 bg-slate-50 rounded-md p-2.5 mb-3 text-right">
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

                        <p className="hidden md:block text-center text-xs text-slate-400 mt-5 max-w-xl mx-auto px-4">
                                טיפ: אחרי היצירה יש עריכה מלאה — אפשר להוסיף ידנית טיסות, מלונות ופעילויות בכל תג.
                        </p>

                        <HowItWorksModal isOpen={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
                </div>
        );
};
