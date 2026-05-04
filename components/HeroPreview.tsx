import React, { useRef, useState } from 'react';
import { Calendar, Plane, Edit2, MoreVertical, Move } from 'lucide-react';

/**
 * Side-by-side preview of 3 hero/cover designs. All three keep info OVERLAID
 * on the image (per user requirement that desktop must show modules on the
 * photo, not below it). Each option is rendered twice — once at mobile width
 * and once at desktop width — so the user can compare both viewports on any
 * device without resizing the window.
 *
 * Mounted at #/hero-preview (App.tsx checks the URL hash). Throwaway —
 * delete this file once a design is picked.
 */

const SAMPLE = {
        name: 'תאילנד 26',
        cover: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1600&q=80',
        dateLabel: '6/8 – 26/8',
        countdownDays: 94,
        cities: [
                { name: 'Bangkok', nights: 3 },
                { name: 'Pattaya', nights: 5 },
                { name: 'Koh Chang', nights: 10 },
        ],
};

// =============================================================================
// Helper hook — focal-point drag editor (used by A and C)
// =============================================================================
const useFocal = (initial = { x: 50, y: 50 }) => {
        const [focal, setFocal] = useState(initial);
        const [editing, setEditing] = useState(false);
        const ref = useRef<HTMLDivElement>(null);

        const handleMove = (clientX: number, clientY: number) => {
                if (!ref.current || !editing) return;
                const r = ref.current.getBoundingClientRect();
                const x = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
                const y = Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100));
                setFocal({ x, y });
        };

        const dragHandlers = editing ? {
                onTouchMove: (e: React.TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY),
                onMouseMove: (e: React.MouseEvent) => handleMove(e.clientX, e.clientY),
        } : {};

        return { focal, editing, setEditing, ref, dragHandlers };
};

// =============================================================================
// OPTION A — Clean overlay (Apple-style)
// =============================================================================
const OptionA: React.FC<{ widthClass: string; heightClass: string; titleSize: string; chipsWrap: boolean }> = ({
        widthClass, heightClass, titleSize, chipsWrap,
}) => {
        const { focal, editing, setEditing, ref, dragHandlers } = useFocal();
        return (
                <div
                        ref={ref}
                        {...dragHandlers}
                        className={`relative ${heightClass} ${widthClass} rounded-[1.75rem] overflow-hidden shadow-xl select-none`}
                >
                        <img
                                src={SAMPLE.cover}
                                className="w-full h-full object-cover"
                                style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
                                alt=""
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/15 to-transparent" />

                        <div className="absolute top-3 left-3 z-20">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/95 text-white text-xs font-bold shadow-lg backdrop-blur-md">
                                        <Plane className="w-3.5 h-3.5" />
                                        <span>{SAMPLE.countdownDays} ימים</span>
                                </div>
                        </div>

                        <div className="absolute top-3 right-3 z-20 flex gap-1.5">
                                <button className="w-9 h-9 bg-black/40 backdrop-blur-md rounded-full text-white flex items-center justify-center" title="החלף תמונה">
                                        <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                        onClick={() => setEditing(e => !e)}
                                        className={`w-9 h-9 rounded-full text-white flex items-center justify-center backdrop-blur-md ${editing ? 'bg-emerald-500/95 ring-2 ring-white/50' : 'bg-black/40'}`}
                                        title="הזז תמונה"
                                >
                                        <Move className="w-3.5 h-3.5" />
                                </button>
                        </div>

                        <div className="absolute bottom-4 right-4 left-4 z-10 text-white" dir="rtl">
                                <div className={`${titleSize} font-black drop-shadow-md leading-tight mb-1.5`}>{SAMPLE.name}</div>
                                <div className={`flex items-center gap-1.5 ${chipsWrap ? 'flex-wrap' : 'flex-nowrap overflow-hidden'}`}>
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/20 text-white text-2xs font-bold backdrop-blur-md border border-white/20" dir="ltr">
                                                <Calendar className="w-3 h-3" />
                                                {SAMPLE.dateLabel}
                                        </span>
                                        {SAMPLE.cities.map(c => (
                                                <span key={c.name} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 text-white text-2xs font-bold backdrop-blur-md border border-white/20 shrink-0">
                                                        <span>{c.name}</span>
                                                        <span className="text-white/60">{c.nights}ל'</span>
                                                </span>
                                        ))}
                                </div>
                        </div>

                        {editing && (
                                <div className="absolute top-1/2 -translate-y-1/2 inset-x-3 px-3 py-2 bg-emerald-600/95 text-white text-xs font-bold text-center backdrop-blur-md z-30 rounded-lg">
                                        גרור כדי לבחור איזה חלק של התמונה יוצג
                                </div>
                        )}
                </div>
        );
};

// =============================================================================
// OPTION B — Glass info card on photo
// =============================================================================
const OptionB: React.FC<{ widthClass: string; heightClass: string; cardPos: 'mobile' | 'desktop'; titleSize: string }> = ({
        widthClass, heightClass, cardPos, titleSize,
}) => (
        <div className={`relative ${heightClass} ${widthClass} rounded-[1.75rem] overflow-hidden shadow-xl`}>
                <img src={SAMPLE.cover} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/30 via-transparent to-transparent" />

                <button className="absolute top-3 right-3 z-20 w-9 h-9 bg-black/40 backdrop-blur-md rounded-full text-white flex items-center justify-center" title="החלף תמונה">
                        <Edit2 className="w-3.5 h-3.5" />
                </button>

                {/* Info glass card — bottom on mobile, bottom-right floating on desktop */}
                <div
                        className={`absolute z-10 bg-white/85 backdrop-blur-xl border border-white/60 rounded-2xl shadow-2xl ${
                                cardPos === 'mobile'
                                        ? 'bottom-3 right-3 left-3 p-3'
                                        : 'bottom-5 right-5 w-[440px] p-4'
                        }`}
                        dir="rtl"
                >
                        <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                        <div className={`${titleSize} font-black text-brand-navy leading-tight`}>{SAMPLE.name}</div>
                                        <div className="flex items-center gap-1.5 mt-1.5 text-2xs text-slate-500 font-bold" dir="ltr">
                                                <Calendar className="w-3 h-3" />
                                                <span>{SAMPLE.dateLabel}</span>
                                        </div>
                                </div>
                                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-600 text-white text-2xs font-black shrink-0">
                                        <Plane className="w-3 h-3" />
                                        <span>{SAMPLE.countdownDays} ימים</span>
                                </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                                {SAMPLE.cities.map(c => (
                                        <span key={c.name} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-2xs font-bold border border-blue-100">
                                                <span>{c.name}</span>
                                                <span className="text-blue-400">{c.nights}ל'</span>
                                        </span>
                                ))}
                        </div>
                </div>
        </div>
);

// =============================================================================
// OPTION C — Magazine style, full overlay with chips
// =============================================================================
const OptionC: React.FC<{ widthClass: string; heightClass: string; titleSize: string; scrollChips: boolean }> = ({
        widthClass, heightClass, titleSize, scrollChips,
}) => {
        const { focal, editing, setEditing, ref, dragHandlers } = useFocal({ x: 50, y: 35 });
        return (
                <div
                        ref={ref}
                        {...dragHandlers}
                        className={`relative ${heightClass} ${widthClass} rounded-[1.75rem] overflow-hidden shadow-xl select-none`}
                >
                        <img
                                src={SAMPLE.cover}
                                className="w-full h-full object-cover"
                                style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
                                alt=""
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/30 to-slate-900/40" />

                        <div className="absolute top-3 left-3 z-20">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 text-blue-700 text-2xs font-black shadow-lg backdrop-blur-md">
                                        <Plane className="w-3 h-3" />
                                        <span>{SAMPLE.countdownDays} ימים →</span>
                                </div>
                        </div>

                        <div className="absolute top-3 right-3 z-20 flex gap-1.5">
                                <button
                                        onClick={() => setEditing(e => !e)}
                                        className={`w-9 h-9 rounded-full text-white flex items-center justify-center backdrop-blur-md ${editing ? 'bg-emerald-500/95 ring-2 ring-white/50' : 'bg-black/40'}`}
                                        title="הזז תמונה"
                                >
                                        <Move className="w-3.5 h-3.5" />
                                </button>
                                <button className="w-9 h-9 bg-black/40 backdrop-blur-md rounded-full text-white flex items-center justify-center" title="עוד">
                                        <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                        </div>

                        <div className="absolute bottom-0 right-0 left-0 px-4 pb-3 pt-12 z-10" dir="rtl">
                                <div className={`${titleSize} font-black text-white drop-shadow-md leading-tight mb-2`}>{SAMPLE.name}</div>
                                <div className={`flex gap-1.5 ${scrollChips ? 'overflow-x-auto scrollbar-hide -mx-4 px-4' : 'flex-wrap'}`}>
                                        {SAMPLE.cities.map(c => (
                                                <div key={c.name} className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 text-white text-2xs font-bold backdrop-blur-md border border-white/20">
                                                        <span>{c.name}</span>
                                                        <span className="text-white/60">{c.nights}ל'</span>
                                                </div>
                                        ))}
                                        <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 text-white/80 text-2xs font-bold backdrop-blur-md border border-white/15" dir="ltr">
                                                <Calendar className="w-3 h-3" />
                                                {SAMPLE.dateLabel}
                                        </div>
                                </div>
                        </div>

                        {editing && (
                                <div className="absolute top-1/2 -translate-y-1/2 inset-x-3 px-3 py-2 bg-emerald-600/95 text-white text-xs font-bold text-center backdrop-blur-md z-30 rounded-lg">
                                        גרור כדי לבחור איזה חלק של התמונה יוצג
                                </div>
                        )}
                </div>
        );
};

// =============================================================================
// PAGE
// =============================================================================
const ViewportLabel: React.FC<{ label: string }> = ({ label }) => (
        <div className="flex items-center gap-2 mb-2">
                <span className="text-2xs font-black text-slate-500 uppercase tracking-widest">{label}</span>
                <div className="flex-1 h-px bg-slate-200" />
        </div>
);

const OptionSection: React.FC<{
        letter: string;
        color: string;
        title: string;
        sub: string;
        mobile: React.ReactNode;
        desktop: React.ReactNode;
        hasFocal?: boolean;
}> = ({ letter, color, title, sub, mobile, desktop, hasFocal }) => (
        <section className="bg-white rounded-2xl p-4 md:p-6 shadow-md">
                <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-full ${color} text-white flex items-center justify-center font-black text-lg shrink-0`}>{letter}</div>
                        <div className="min-w-0">
                                <div className="font-black text-brand-navy text-base md:text-lg">{title}</div>
                                <div className="text-2xs md:text-xs text-slate-500 leading-tight mt-0.5">{sub}</div>
                        </div>
                </div>

                <div className="space-y-5">
                        <div>
                                <ViewportLabel label="מובייל (~380px)" />
                                <div className="flex justify-center">{mobile}</div>
                        </div>
                        <div>
                                <ViewportLabel label="דסקטופ (רחב)" />
                                <div className="flex justify-center">{desktop}</div>
                        </div>
                </div>

                {hasFocal && (
                        <p className="text-2xs text-slate-400 mt-4 text-right">
                                💡 לחץ על הכפתור הירוק (Move) כדי לבחור איזה חלק של התמונה להציג. גרור עם האצבע / העכבר.
                        </p>
                )}
        </section>
);

export const HeroPreview: React.FC = () => (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-rubik" dir="rtl">
                <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
                        <header className="text-center pt-4 pb-2">
                                <h1 className="text-2xl md:text-3xl font-black text-brand-navy">3 אופציות לעיצוב התמונת נושא</h1>
                                <p className="text-sm text-slate-500 mt-1">כל אופציה מוצגת פעמיים — מובייל ודסקטופ. בחר את האחת שאתה הכי אוהב.</p>
                        </header>

                        <OptionSection
                                letter="A"
                                color="bg-blue-600"
                                title="Clean overlay — מינימליסטי"
                                sub="קאפסולת ספירה קטנה בפינה, ערים בתחתית התמונה, gradient עדין. הכי דומה ל-Apple."
                                hasFocal
                                mobile={<OptionA widthClass="w-[380px]" heightClass="h-[160px]" titleSize="text-2xl" chipsWrap={true} />}
                                desktop={<OptionA widthClass="w-full max-w-[1100px]" heightClass="h-[260px]" titleSize="text-4xl" chipsWrap={false} />}
                        />

                        <OptionSection
                                letter="B"
                                color="bg-indigo-600"
                                title="Glass info card — כרטיס זכוכית על התמונה"
                                sub="כל המידע יושב על כרטיסיית-זכוכית שמרחפת על התמונה. בדסקטופ — בפינה ימנית-תחתונה."
                                mobile={<OptionB widthClass="w-[380px]" heightClass="h-[200px]" cardPos="mobile" titleSize="text-2xl" />}
                                desktop={<OptionB widthClass="w-full max-w-[1100px]" heightClass="h-[300px]" cardPos="desktop" titleSize="text-3xl" />}
                        />

                        <OptionSection
                                letter="C"
                                color="bg-emerald-600"
                                title="Magazine — תמונה דומיננטית עם overlay"
                                sub="תמונה גבוהה, gradient חזק, צ'יפים בתוך ה-overlay. במובייל גוללים את הצ'יפים, בדסקטופ הכל נכנס."
                                hasFocal
                                mobile={<OptionC widthClass="w-[380px]" heightClass="h-[200px]" titleSize="text-2xl" scrollChips={true} />}
                                desktop={<OptionC widthClass="w-full max-w-[1100px]" heightClass="h-[300px]" titleSize="text-4xl" scrollChips={false} />}
                        />

                        <footer className="text-center pt-4 pb-12">
                                <p className="text-sm text-slate-500">בחר את הזה שאתה הכי אוהב, וכתוב לי "A", "B" או "C".</p>
                        </footer>
                </div>
        </div>
);
