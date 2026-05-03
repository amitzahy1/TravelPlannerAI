import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Hotel, Map as MapIcon, Utensils, Ticket, Eye, Pencil, Smartphone, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
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

export const InviteeWelcome: React.FC<InviteeWelcomeProps> = ({ trip, ownerName, onDismiss }) => {
        const [step, setStep] = useState(0);
        const [direction, setDirection] = useState(1);

        const destination = trip.destination || trip.destinationEnglish || 'הטיול';
        const year = getTripYear(trip);

        const slides = [
                {
                        kind: 'welcome',
                        icon: <Plane className="w-12 h-12 text-blue-500" />,
                        title: `ברוכים הבאים לטיול ל${destination} ${year}`,
                        body: 'הטיול משותף לכל מי שמשתתף בו. הנה איך לקרוא אותו ולמצוא בו את הדרך.',
                },
                {
                        kind: 'whats-here',
                        icon: <MapIcon className="w-12 h-12 text-emerald-500" />,
                        title: 'מה יש בטיול',
                        body: 'כל מה שתוכנן עד כה נמצא כאן. אתם יכולים לעיין, להוסיף, ולשמור פרטים שתצטרכו בטיול.',
                },
                {
                        kind: 'what-to-do',
                        icon: <Eye className="w-12 h-12 text-indigo-500" />,
                        title: 'מה אתם יכולים לעשות',
                        body: '',
                },
        ] as const;

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
                        className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4"
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
                                        className="absolute top-4 left-4 z-10 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
                                        aria-label="סגירה"
                                >
                                        <X className="w-4 h-4" />
                                </button>

                                <div className="px-8 pt-12 pb-6 min-h-[28rem] flex flex-col">
                                        <AnimatePresence mode="wait" custom={direction}>
                                                <motion.div
                                                        key={step}
                                                        custom={direction}
                                                        variants={slideVariants}
                                                        initial="enter"
                                                        animate="center"
                                                        exit="exit"
                                                        transition={{ duration: 0.24, ease: 'easeInOut' }}
                                                        className="flex-1 flex flex-col"
                                                >
                                                        <div className="flex items-center justify-center w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 mb-5 shadow-sm">
                                                                {slide.icon}
                                                        </div>
                                                        <h2 className="text-2xl font-black text-slate-900 text-center leading-tight mb-3">
                                                                {slide.title}
                                                        </h2>
                                                        {slide.body && (
                                                                <p className="text-sm text-slate-600 text-center leading-relaxed mb-5 px-2">
                                                                        {slide.body}
                                                                </p>
                                                        )}

                                                        {slide.kind === 'whats-here' && (
                                                                <div className="space-y-2.5 mt-2">
                                                                        <FeatureRow
                                                                                icon={<Hotel className="w-5 h-5 text-blue-600" />}
                                                                                title="מלונות"
                                                                                subtitle="הלינות שכבר הוזמנו"
                                                                                tint="bg-blue-50 border-blue-100"
                                                                        />
                                                                        <FeatureRow
                                                                                icon={<Plane className="w-5 h-5 text-sky-600" />}
                                                                                title="טיסות והעברות"
                                                                                subtitle="כל מה שקשור להגעה ולמעבר בין יעדים"
                                                                                tint="bg-sky-50 border-sky-100"
                                                                        />
                                                                        <FeatureRow
                                                                                icon={<Utensils className="w-5 h-5 text-orange-600" />}
                                                                                title="אוכל ואטרקציות"
                                                                                subtitle="מקומות לאכול ולבקר — שלכם וגם המלצות"
                                                                                tint="bg-orange-50 border-orange-100"
                                                                        />
                                                                        <FeatureRow
                                                                                icon={<MapIcon className="w-5 h-5 text-emerald-600" />}
                                                                                title="מפה"
                                                                                subtitle="מבט-על על כל הטיול במדינת היעד"
                                                                                tint="bg-emerald-50 border-emerald-100"
                                                                        />
                                                                </div>
                                                        )}

                                                        {slide.kind === 'what-to-do' && (
                                                                <div className="space-y-3 mt-2">
                                                                        <ActionRow
                                                                                icon={<Eye className="w-5 h-5 text-indigo-600" />}
                                                                                text="לעיין בכל מה שתוכנן"
                                                                        />
                                                                        <ActionRow
                                                                                icon={<Pencil className="w-5 h-5 text-amber-600" />}
                                                                                text="להוסיף ולערוך פריטים בטיול"
                                                                        />
                                                                        <ActionRow
                                                                                icon={<Smartphone className="w-5 h-5 text-emerald-600" />}
                                                                                text="לשמור את הקישור — תזדקקו לו בנסיעה"
                                                                        />
                                                                        {ownerName && (
                                                                                <p className="text-[11px] text-slate-400 text-center mt-3">
                                                                                        תכנן ראשית: <span className="font-bold text-slate-500">{ownerName}</span> · ניתן לערוך יחד
                                                                                </p>
                                                                        )}
                                                                </div>
                                                        )}
                                                </motion.div>
                                        </AnimatePresence>
                                </div>

                                {/* Bottom nav */}
                                <div className="px-8 pb-6 pt-2 flex items-center justify-between gap-3">
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
                                                                <span>יאללה, בואו נסתכל</span>
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

interface FeatureRowProps {
        icon: React.ReactNode;
        title: string;
        subtitle: string;
        tint: string;
}

const FeatureRow: React.FC<FeatureRowProps> = ({ icon, title, subtitle, tint }) => (
        <div className={`flex items-center gap-3 p-3 rounded-xl border ${tint}`}>
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm border border-white/60 flex items-center justify-center flex-shrink-0">
                        {icon}
                </div>
                <div className="min-w-0 flex-1 text-right">
                        <div className="font-bold text-slate-800 text-sm leading-tight">{title}</div>
                        <div className="text-[11px] text-slate-500 leading-tight">{subtitle}</div>
                </div>
        </div>
);

interface ActionRowProps {
        icon: React.ReactNode;
        text: string;
}

const ActionRow: React.FC<ActionRowProps> = ({ icon, text }) => (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                        {icon}
                </div>
                <span className="text-sm font-bold text-slate-700">{text}</span>
        </div>
);
