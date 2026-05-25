import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
        Plane, Hotel, Map as MapIcon, Utensils, Ticket, Eye, X, Check,
        ChevronLeft, ChevronRight, Sparkles, Search, Users, ListChecks,
        Smartphone, Globe, Camera, MapPin, Compass,
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

interface SlideDef {
        kind: 'welcome' | 'ai-research' | 'smart-map' | 'collaboration' | 'go';
        eyebrow: string;
        accent: string;
        title: string;
        body: string;
        glyph: React.ReactNode;
        bullets?: Array<{ icon: React.ReactNode; text: string }>;
}

export const InviteeWelcome: React.FC<InviteeWelcomeProps> = ({ trip, onDismiss }) => {
        const [step, setStep] = useState(0);
        const [direction, setDirection] = useState(1);

        // Hide the mobile floating-dock while the welcome modal is open.
        // The dock has z-index 999999 (set in src/index.css) which sits
        // above this modal's z-[110], so on mobile the "Next" button at
        // the bottom of the modal was being covered by the tab bar.
        // MagicalWizard uses the same `body.modal-open` toggle — reusing
        // that CSS hook keeps the override centralized.
        useEffect(() => {
                document.body.classList.add('modal-open');
                return () => document.body.classList.remove('modal-open');
        }, []);

        const destination = trip.destination || trip.destinationEnglish || 'הטיול';
        const year = getTripYear(trip);

        const slides: SlideDef[] = [
                {
                        kind: 'welcome',
                        eyebrow: 'WeTravel · AI Trip Organizer',
                        accent: 'from-indigo-600 via-violet-600 to-fuchsia-600',
                        title: destination,
                        body: 'תכנון חכם, מפה חיה, וכולם יחד באותו הטיול.',
                        glyph: <Globe className="w-12 h-12 text-white" strokeWidth={1.4} />,
                },
                {
                        kind: 'ai-research',
                        eyebrow: 'מחקר AI חכם',
                        accent: 'from-orange-500 via-amber-500 to-yellow-400',
                        title: 'AI שמכיר את היעד',
                        body: 'מסעדות מומלצות בכל עיר, אטרקציות לפי קטגוריה, וסינון חכם — אוכל מקומי, מישלן, חיי לילה ועוד.',
                        glyph: <Sparkles className="w-11 h-11 text-white" strokeWidth={1.6} />,
                        bullets: [
                                { icon: <Utensils className="w-4 h-4" />, text: 'מסעדות עם מקור המלצה: Michelin, מקומיים, גוגל' },
                                { icon: <Ticket className="w-4 h-4" />, text: 'אטרקציות לפי טבע, היסטוריה, חיי לילה' },
                                { icon: <Search className="w-4 h-4" />, text: 'חיפוש חופשי שמבין עברית ואנגלית' },
                        ],
                },
                {
                        kind: 'smart-map',
                        eyebrow: 'מפה אינטראקטיבית',
                        accent: 'from-emerald-500 via-teal-500 to-cyan-500',
                        title: 'הטיול כולו במפה אחת',
                        body: 'מסלול הטיול, המלונות, הטיסות, וכל המסעדות והאטרקציות — בתצוגה ויזואלית אחת.',
                        glyph: <MapIcon className="w-11 h-11 text-white" strokeWidth={1.6} />,
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
                        body: 'קישור עריכה למשפחה והחברים, קישור צפייה לכל השאר. כולם מסונכרנים בזמן אמת.',
                        glyph: <Users className="w-11 h-11 text-white" strokeWidth={1.6} />,
                        bullets: [
                                { icon: <ListChecks className="w-4 h-4" />, text: 'יומן אישי לכל יום עם כל הפעילויות' },
                                { icon: <Smartphone className="w-4 h-4" />, text: 'נשמר במכשיר — זמין גם בלי אינטרנט' },
                                { icon: <Sparkles className="w-4 h-4" />, text: 'המלצות לשיפור מתעדכנות אוטומטית' },
                        ],
                },
                {
                        kind: 'go',
                        eyebrow: 'יאללה',
                        accent: 'from-blue-600 via-indigo-600 to-purple-600',
                        title: 'מוכנים? בואו נצא לדרך',
                        body: 'תקפיצו לדף הראשי לראות את המסלול יום-יום, או לדף המפה לסקירה ויזואלית.',
                        glyph: <Check className="w-11 h-11 text-white" strokeWidth={2.2} />,
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
                        className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4"
                        dir="rtl"
                >
                        <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 10 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                                className="bg-white w-full max-w-md rounded-[2rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden border border-white/40"
                        >
                                <button
                                        onClick={onDismiss}
                                        className="absolute top-4 left-4 z-30 p-2 bg-white/90 backdrop-blur hover:bg-white rounded-full text-slate-600 transition-colors shadow-sm"
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
                                                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                                className="flex flex-col"
                                        >
                                                {slide.kind === 'welcome' ? (
                                                        <WelcomeHero destination={destination} year={year} body={slide.body} />
                                                ) : (
                                                        <StandardHero slide={slide} />
                                                )}
                                        </motion.div>
                                </AnimatePresence>

                                {/* Bottom nav */}
                                <div className="px-7 pb-5 pt-3 flex items-center justify-between gap-3 bg-white relative z-10">
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
                                                        <motion.span
                                                                key={i}
                                                                animate={{ width: i === step ? 24 : 6 }}
                                                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                                                className={`h-1.5 rounded-full ${i === step ? 'bg-blue-600' : 'bg-slate-300'}`}
                                                        />
                                                ))}
                                        </div>

                                        <motion.button
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.96 }}
                                                onClick={handleNext}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-l from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full font-bold text-sm shadow-lg shadow-blue-300/50 transition-shadow"
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
                                        </motion.button>
                                </div>
                        </motion.div>
                </div>
        );
};

// =====================================================================
// Bespoke Welcome Hero — animated mesh gradient, floating travel icons,
// gradient destination text, mini feature pills.
// =====================================================================
const WelcomeHero: React.FC<{ destination: string; year: string; body: string }> = ({ destination, year, body }) => {
        const floatingIcons = [
                { Icon: Plane, top: '12%', left: '14%', delay: 0, dur: 5.2, rot: -18 },
                { Icon: Hotel, top: '24%', right: '10%', delay: 0.4, dur: 6.0, rot: 8 },
                { Icon: Utensils, top: '58%', left: '8%', delay: 0.9, dur: 5.6, rot: -10 },
                { Icon: MapPin, top: '70%', right: '14%', delay: 0.6, dur: 6.4, rot: 14 },
                { Icon: Camera, top: '40%', left: '5%', delay: 1.2, dur: 5.8, rot: -22 },
                { Icon: Compass, top: '78%', left: '46%', delay: 0.2, dur: 6.6, rot: 0 },
        ];

        return (
                <div className="relative overflow-hidden">
                        {/* Animated mesh gradient hero */}
                        <div className="relative h-[210px] overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-600 to-fuchsia-600">
                                {/* Mesh blobs */}
                                <motion.div
                                        className="absolute -top-24 -right-16 w-72 h-72 rounded-full"
                                        style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.55) 0%, transparent 70%)' }}
                                        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
                                        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
                                />
                                <motion.div
                                        className="absolute -bottom-20 -left-16 w-80 h-80 rounded-full"
                                        style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.55) 0%, transparent 70%)' }}
                                        animate={{ x: [0, -20, 0], y: [0, -25, 0] }}
                                        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
                                />
                                <motion.div
                                        className="absolute top-1/3 left-1/2 w-60 h-60 rounded-full"
                                        style={{ background: 'radial-gradient(circle, rgba(250,204,21,0.30) 0%, transparent 70%)' }}
                                        animate={{ x: [-20, 20, -20], y: [10, -10, 10] }}
                                        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                                />

                                {/* Subtle starfield */}
                                <div className="absolute inset-0 opacity-30" style={{
                                        backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                                        backgroundSize: '24px 24px',
                                }} />

                                {/* Floating travel icons */}
                                {floatingIcons.map(({ Icon, top, left, right, delay, dur, rot }, i) => (
                                        <motion.div
                                                key={i}
                                                className="absolute text-white/40"
                                                style={{ top, left, right }}
                                                initial={{ opacity: 0, scale: 0.6 }}
                                                animate={{
                                                        opacity: [0, 0.7, 0.5, 0.7],
                                                        y: [0, -10, 0],
                                                        rotate: [rot - 4, rot + 4, rot - 4],
                                                }}
                                                transition={{
                                                        opacity: { duration: 1.4, delay, ease: 'easeOut' },
                                                        y: { duration: dur, delay, repeat: Infinity, ease: 'easeInOut' },
                                                        rotate: { duration: dur * 1.4, delay, repeat: Infinity, ease: 'easeInOut' },
                                                }}
                                        >
                                                <Icon className="w-6 h-6" strokeWidth={1.6} />
                                        </motion.div>
                                ))}

                                {/* Central glyph — globe with rotating ring */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                        <motion.div
                                                initial={{ scale: 0.5, rotate: -30, opacity: 0 }}
                                                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                                transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.1 }}
                                                className="relative"
                                        >
                                                {/* Outer rotating ring */}
                                                <motion.div
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                                                        className="absolute inset-0 -m-3 rounded-full border-2 border-dashed border-white/30"
                                                />
                                                {/* Glow */}
                                                <div className="absolute inset-0 -m-6 rounded-full bg-white/20 blur-2xl" />
                                                {/* Glyph plate */}
                                                <div className="relative w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-2xl">
                                                        <Globe className="w-12 h-12 text-white" strokeWidth={1.4} />
                                                </div>
                                        </motion.div>
                                </div>

                                {/* Eyebrow */}
                                <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3, duration: 0.4 }}
                                        className="absolute top-5 inset-x-0 text-center text-[10px] font-black text-white/90 tracking-[0.25em] uppercase"
                                >
                                        WeTravel · AI Trip Organizer
                                </motion.div>
                        </div>

                        {/* Content */}
                        <div className="px-7 pt-6 pb-3 text-center">
                                <motion.div
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.25, duration: 0.5 }}
                                        className="text-sm font-bold text-slate-500 mb-2"
                                >
                                        ברוכים הבאים לטיול ל
                                </motion.div>

                                <motion.h2
                                        initial={{ opacity: 0, y: 14 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.35, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                                        className="text-4xl md:text-5xl font-black leading-tight mb-1"
                                >
                                        <span className="bg-gradient-to-l from-indigo-600 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                                                {destination}
                                        </span>
                                </motion.h2>

                                <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5, duration: 0.4 }}
                                        className="text-base font-bold text-slate-400 mb-3"
                                >
                                        {year}
                                </motion.div>

                                <motion.p
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.55, duration: 0.5 }}
                                        className="text-base text-slate-600 leading-relaxed mb-4 max-w-[320px] mx-auto"
                                >
                                        {body}
                                </motion.p>

                                {/* Mini feature pills */}
                                <motion.div
                                        initial="hidden"
                                        animate="show"
                                        variants={{
                                                hidden: {},
                                                show: { transition: { staggerChildren: 0.08, delayChildren: 0.7 } },
                                        }}
                                        className="flex items-center justify-center gap-1.5 flex-wrap"
                                >
                                        {[
                                                { icon: <Sparkles className="w-3 h-3" />, label: 'מסעדות ואטרקציות AI', color: 'from-amber-50 to-orange-50 text-orange-700 border-orange-100' },
                                                { icon: <ListChecks className="w-3 h-3" />, label: 'יומן יום-יום', color: 'from-blue-50 to-indigo-50 text-indigo-700 border-indigo-100' },
                                                { icon: <Hotel className="w-3 h-3" />, label: 'טיסות ומלונות ביומן', color: 'from-emerald-50 to-teal-50 text-teal-700 border-teal-100' },
                                                { icon: <Users className="w-3 h-3" />, label: 'תכנון משותף', color: 'from-pink-50 to-rose-50 text-rose-700 border-rose-100' },
                                                { icon: <Compass className="w-3 h-3" />, label: 'AI שמסדר הכל', color: 'from-violet-50 to-fuchsia-50 text-fuchsia-700 border-fuchsia-100' },
                                        ].map((pill, i) => (
                                                <motion.div
                                                        key={i}
                                                        variants={{
                                                                hidden: { opacity: 0, y: 8, scale: 0.92 },
                                                                show: { opacity: 1, y: 0, scale: 1 },
                                                        }}
                                                        transition={{ type: 'spring', stiffness: 350, damping: 22 }}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border bg-gradient-to-l ${pill.color}`}
                                                >
                                                        {pill.icon}
                                                        <span>{pill.label}</span>
                                                </motion.div>
                                        ))}
                                </motion.div>
                        </div>
                </div>
        );
};

// =====================================================================
// Standard Hero — used by middle and final slides. Cleaner and more
// dynamic than the previous version (ring, glow, staggered bullets).
// =====================================================================
const StandardHero: React.FC<{ slide: SlideDef }> = ({ slide }) => (
        <>
                <div className={`relative h-36 bg-gradient-to-br ${slide.accent} flex items-center justify-center overflow-hidden`}>
                        <motion.div
                                className="absolute -top-12 -right-12 w-48 h-48 rounded-full"
                                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, transparent 70%)' }}
                                animate={{ x: [0, 12, 0], y: [0, 10, 0] }}
                                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <motion.div
                                className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full"
                                style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)' }}
                                animate={{ x: [0, -12, 0], y: [0, -8, 0] }}
                                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                        />
                        <motion.div
                                initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
                                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }}
                                className="relative"
                        >
                                <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
                                        className="absolute inset-0 -m-2 rounded-2xl border-2 border-dashed border-white/30"
                                />
                                <div className="relative w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl">
                                        {slide.glyph}
                                </div>
                        </motion.div>
                </div>

                <div className="px-7 pt-5 pb-3">
                        <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15, duration: 0.35 }}
                                className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2 text-center"
                        >
                                {slide.eyebrow}
                        </motion.div>
                        <motion.h2
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                                className="text-2xl font-black text-slate-900 text-center leading-tight mb-2.5"
                        >
                                {slide.title}
                        </motion.h2>
                        <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.4 }}
                                className="text-sm text-slate-600 text-center leading-relaxed mb-4"
                        >
                                {slide.body}
                        </motion.p>

                        {slide.bullets && (
                                <motion.div
                                        initial="hidden"
                                        animate="show"
                                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.4 } } }}
                                        className="space-y-2"
                                >
                                        {slide.bullets.map((b, i) => (
                                                <motion.div
                                                        key={i}
                                                        variants={{
                                                                hidden: { opacity: 0, x: 14 },
                                                                show: { opacity: 1, x: 0 },
                                                        }}
                                                        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                                                >
                                                        <FeatureBullet icon={b.icon} text={b.text} />
                                                </motion.div>
                                        ))}
                                </motion.div>
                        )}
                </div>
        </>
);

interface FeatureBulletProps {
        icon: React.ReactNode;
        text: string;
}

const FeatureBullet: React.FC<FeatureBulletProps> = ({ icon, text }) => (
        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gradient-to-l from-slate-50 to-white border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="shrink-0 w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-blue-600 mt-0.5 border border-slate-100">
                        {icon}
                </div>
                <span className="flex-1 text-[12.5px] font-bold text-slate-700 leading-snug">{text}</span>
        </div>
);
