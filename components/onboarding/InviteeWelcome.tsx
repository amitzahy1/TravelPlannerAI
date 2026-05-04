import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
        Plane, Hotel, Map as MapIcon, Utensils, Ticket, Eye, X, Check,
        ChevronLeft, ChevronRight, Sparkles, Search, Users, ListChecks,
        Smartphone,
} from 'lucide-react';
import { Trip } from '../../types';

interface InviteeWelcomeProps {
        trip: Trip;
        ownerName?: string;
        onDismiss: () => void;
}

const getTripYear = (trip: Trip): string => {
        const tryParse = (s?: string): number | null => {
                if (!s) return null;
                const m = s.match(/(\d{4})/);
                if (m) {
                        const y = parseInt(m[1], 10);
                        if (y > 1900 && y < 3000) return y;
                }
                const d = new Date(s);
                if (!isNaN(d.getTime())) return d.getFullYear();
                return null;
        };
        const y = tryParse(trip.dates)
                || tryParse(trip.hotels?.[0]?.checkInDate)
                || new Date().getFullYear();
        return String(y);
};

const slideVariants = {
        enter: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
};

export const InviteeWelcome: React.FC<InviteeWelcomeProps> = ({ trip, onDismiss }) => {
        const [step, setStep] = useState(0);
        const [direction, setDirection] = useState(1);

        const destination = trip.destination || trip.destinationEnglish || 'הטיול';
        const year = getTripYear(trip);

        // 5-slide marketing-grade walk-through. Each slide is one capability;
        // first and last slides are the welcome + handoff. The middle three
        // showcase: AI research, smart map, collaborative planning.
        const slides: SlideDef[] = [
                {
                        kind: 'welcome',
                        eyebrow: 'WeTravel · AI Trip Organizer',
                        accent: 'from-blue-500 via-indigo-500 to-violet-600',
                        title: `ברוכים הבאים לטיול ל${destination} ${year}`,
                        body: 'הטיול נבנה על-ידי כל מי שמתכנן אותו — אתם, חברים, משפחה. כל הפרטים במקום אחד, מתעדכנים בזמן אמת.',
                        glyph: <Plane className="w-10 h-10 text-white" strokeWidth={1.6} />,
                },
                {
                        kind: 'ai-research',
                        eyebrow: 'מחקר AI חכם',
                        accent: 'from-orange-500 via-amber-500 to-yellow-500',
                        title: 'AI שמכיר את היעד',
                        body: 'מסעדות מומלצות בכל עיר בטיול, אטרקציות מותאמות לזמן ולתקציב, וסינון לפי קטגוריה — אוכל מקומי, פינות נסתרות, מישלן, חיי לילה ועוד.',
                        glyph: <Sparkles className="w-10 h-10 text-white" strokeWidth={1.6} />,
                        bullets: [
                                { icon: <Utensils className="w-4 h-4" />, text: 'מסעדות לפי קטגוריות + מקור המלצה (Michelin, TripAdvisor, מקומיים)' },
                                { icon: <Ticket className="w-4 h-4" />, text: 'אטרקציות לפי סוג: טבע, היסטוריה, חיי לילה' },
                                { icon: <Search className="w-4 h-4" />, text: 'חיפוש חופשי שמבין עברית ואנגלית' },
                        ],
                },
                {
                        kind: 'smart-map',
                        eyebrow: 'מפה אינטראקטיבית',
                        accent: 'from-emerald-500 via-teal-500 to-cyan-500',
                        title: 'הטיול כולו במפה אחת',
                        body: 'מסלול הטיול, המלונות, הטיסות וההעברות, וכל המסעדות והאטרקציות — הכל בתצוגה ויזואלית אחת. AI מסווג כל קטע מסלול לפי סוג התחבורה הכי הגיוני.',
                        glyph: <MapIcon className="w-10 h-10 text-white" strokeWidth={1.6} />,
                        bullets: [
                                { icon: <Hotel className="w-4 h-4" />, text: 'מלונות, טיסות, רכבות, מעבורות — כולם מסומנים' },
                                { icon: <MapIcon className="w-4 h-4" />, text: 'מסלול ממוספר עם נקודת התחלה וסיום ברורות' },
                                { icon: <Search className="w-4 h-4" />, text: 'התקרבו כדי לחשוף מסעדות ואטרקציות בכל עיר' },
                        ],
                },
                {
                        kind: 'collaboration',
                        eyebrow: 'תכנון משותף',
                        accent: 'from-pink-500 via-rose-500 to-red-500',
                        title: 'משתפים את כולם',
                        body: 'קישור עריכה לבני המשפחה והחברים, קישור צפייה לכל השאר. כולם רואים את אותם הנתונים, מתעדכנים בזמן אמת, ויודעים בדיוק מה לעשות.',
                        glyph: <Users className="w-10 h-10 text-white" strokeWidth={1.6} />,
                        bullets: [
                                { icon: <ListChecks className="w-4 h-4" />, text: 'יומן אישי לכל יום עם כל הפעילויות' },
                                { icon: <Smartphone className="w-4 h-4" />, text: 'נשמר במכשיר — זמין גם בלי אינטרנט בנסיעה' },
                                { icon: <Sparkles className="w-4 h-4" />, text: 'המלצות לשיפור מתעדכנות אוטומטית' },
                        ],
                },
                {
                        kind: 'go',
                        eyebrow: 'יאללה',
                        accent: 'from-blue-600 via-indigo-600 to-purple-600',
                        title: 'מוכנים? בואו נצא לדרך',
                        body: 'תקפיצו לדף הראשי לראות את המסלול יום-יום, או לדף המפה לסקירה ויזואלית של כל הטיול.',
                        glyph: <Check className="w-10 h-10 text-white" strokeWidth={2.2} />,
                        bullets: [
                                { icon: <Eye className="w-4 h-4" />, text: 'דף הראשי — יומן יום-יום של כל הטיול' },
                                { icon: <MapIcon className="w-4 h-4" />, text: 'דף מפה — סקירה ויזואלית של כל הנתונים' },
                                { icon: <Sparkles className="w-4 h-4" />, text: 'דף אוכל / אטרקציות — מחקר AI לפי עיר' },
                        ],
                },
        ];

        const handleNext = () => {
                if (step < slides.length - 1) {
                        setDirection(1);
                        setStep(step + 1);
                } else {
                        onDismiss();
                }
        };

        const handleBack = () => {
                if (step > 0) {
                        setDirection(-1);
                        setStep(step - 1);
                }
        };

        const isLast = step === slides.length - 1;
        const slide = slides[step];

        return (
                <div
                        className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/65 backdrop-blur-md p-4"
                        dir="rtl"
                >
                        <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                                className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl relative overflow-hidden border border-white/40"
                        >
                                <button
                                        onClick={onDismiss}
                                        className="absolute top-4 left-4 z-20 p-2 bg-white/90 backdrop-blur hover:bg-white rounded-full text-slate-600 transition-colors shadow-sm"
                                        aria-label="סגירה"
                                >
                                        <X className="w-4 h-4" />
                                </button>

                                <AnimatePresence mode="wait" custom={direction}>
                                        <motion.div
                                                key={step}
                                                custom={direction}
                                                variants={slideVariants}
                                                initial="enter"
                                                animate="center"
                                                exit="exit"
                                                transition={{ duration: 0.28, ease: 'easeInOut' }}
                                                className="flex flex-col"
                                        >
                                                {/* Hero strip with the gradient + glyph — gives every slide a
                                                    distinct emotional register and matches the marketing
                                                    "WeTravel" identity. */}
                                                <div className={`relative h-32 bg-gradient-to-br ${slide.accent} flex items-center justify-center overflow-hidden`}>
                                                        <div className="absolute inset-0 opacity-20" style={{
                                                                backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5) 0%, transparent 60%)',
                                                        }} />
                                                        <div className="relative w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-lg">
                                                                {slide.glyph}
                                                        </div>
                                                </div>

                                                <div className="px-7 pt-5 pb-4">
                                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 text-center">
                                                                {slide.eyebrow}
                                                        </div>
                                                        <h2 className="text-2xl font-black text-slate-900 text-center leading-tight mb-2.5">
                                                                {slide.title}
                                                        </h2>
                                                        <p className="text-sm text-slate-600 text-center leading-relaxed mb-4">
                                                                {slide.body}
                                                        </p>

                                                        {slide.bullets && (
                                                                <div className="space-y-2">
                                                                        {slide.bullets.map((b, i) => (
                                                                                <FeatureBullet key={i} icon={b.icon} text={b.text} />
                                                                        ))}
                                                                </div>
                                                        )}
                                                </div>
                                        </motion.div>
                                </AnimatePresence>

                                {/* Bottom nav */}
                                <div className="px-7 pb-5 pt-2 flex items-center justify-between gap-3">
                                        <button
                                                onClick={handleBack}
                                                disabled={step === 0}
                                                className={`p-2 rounded-full transition-colors ${step === 0 ? 'opacity-0 pointer-events-none' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
                                                aria-label="חזרה"
                                        >
                                                <ChevronRight className="w-5 h-5" />
                                        </button>

                                        <div className="flex items-center gap-1.5">
                                                {slides.map((_, i) => (
                                                        <span
                                                                key={i}
                                                                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-300'}`}
                                                        />
                                                ))}
                                        </div>

                                        <button
                                                onClick={handleNext}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold text-sm shadow-lg shadow-blue-200 transition-all active:scale-95"
                                        >
                                                {isLast ? (
                                                        <>
                                                                <Check className="w-4 h-4" />
                                                                <span>יאללה, בואו נצא לדרך</span>
                                                        </>
                                                ) : (
                                                        <>
                                                                <span>הבא</span>
                                                                <ChevronLeft className="w-4 h-4" />
                                                        </>
                                                )}
                                        </button>
                                </div>
                        </motion.div>
                </div>
        );
};

interface SlideDef {
        kind: 'welcome' | 'ai-research' | 'smart-map' | 'collaboration' | 'go';
        eyebrow: string;
        accent: string;
        title: string;
        body: string;
        glyph: React.ReactNode;
        bullets?: Array<{ icon: React.ReactNode; text: string }>;
}

interface FeatureBulletProps {
        icon: React.ReactNode;
        text: string;
}

const FeatureBullet: React.FC<FeatureBulletProps> = ({ icon, text }) => (
        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <div className="shrink-0 w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 mt-0.5">
                        {icon}
                </div>
                <span className="flex-1 text-[12.5px] font-bold text-slate-700 leading-snug">{text}</span>
        </div>
);
