import React, { useRef, useState } from 'react';
import { Calendar, Plane, FileText as FileTextIcon, MapPin, Hotel as HotelIcon, Utensils, Ticket, Move } from 'lucide-react';

/**
 * Hero design preview — user is happy with the desktop version (cover photo +
 * dark glass stats card overlaid + countdown pill + title + cities list, all
 * on the image). Asked for 3 MOBILE options that preserve this design language
 * on a narrow viewport.
 *
 * Page renders:
 *   - Desktop reference at top (for context)
 *   - Three mobile options below — each keeps the same elements (countdown,
 *     stats, title, cities) overlaid on the cover photo, just rearranged for
 *     ~380px width.
 *
 * Mounted at #/hero-preview. Throwaway — delete after a design is picked.
 */

const SAMPLE = {
        name: 'תאילנד 26',
        cover: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1600&q=80',
        dateLabel: '6/8 – 26/8',
        countdownDays: 94,
        countdownTo: 'בנגקוק',
        stats: { places: 0, food: 0, hotels: 4, flights: 5 },
        cities: [
                { name: 'Koh Chang', nights: 10 },
                { name: 'Pattaya', nights: 5 },
                { name: 'Bangkok', nights: 3 },
        ],
};

// =============================================================================
// Reusable bits
// =============================================================================

const CountdownPill: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => (
        <div className={`inline-flex items-center gap-2 ${size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5'} rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white shadow-lg`}>
                <span className={`${size === 'sm' ? 'w-5 h-5' : 'w-6 h-6'} rounded-full bg-blue-500 flex items-center justify-center shrink-0`}>
                        <Plane className={`${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-white`} />
                </span>
                <div className="flex flex-col leading-none text-right">
                        <span className={`${size === 'sm' ? 'text-2xs' : 'text-xs'} font-black`}>עוד {SAMPLE.countdownDays} ימים</span>
                        <span className={`${size === 'sm' ? 'text-[8px]' : 'text-2xs'} font-bold opacity-80 mt-0.5`}>עד {SAMPLE.countdownTo}</span>
                </div>
        </div>
);

const DatePill: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => (
        <span dir="ltr" className={`inline-flex items-center gap-1.5 ${size === 'sm' ? 'px-2 py-1 text-2xs' : 'px-2.5 py-1.5 text-xs'} font-bold rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white`}>
                <Calendar className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
                {SAMPLE.dateLabel}
        </span>
);

const PdfPill: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => (
        <button className={`inline-flex items-center gap-1.5 ${size === 'sm' ? 'h-7 px-2 text-2xs' : 'h-9 px-3 text-xs'} font-bold rounded-full bg-white/90 hover:bg-white text-slate-900 shadow`}>
                <FileTextIcon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
                <span>ייצא PDF</span>
        </button>
);

interface StatsProps { size?: 'sm' | 'md'; layout?: 'row' | 'grid' | 'pills' }
const StatsCard: React.FC<StatsProps> = ({ size = 'md', layout = 'row' }) => {
        const stats = [
                { icon: MapPin, color: 'text-emerald-400', label: 'מקומות', value: SAMPLE.stats.places },
                { icon: Utensils, color: 'text-amber-400', label: 'אוכל', value: SAMPLE.stats.food },
                { icon: HotelIcon, color: 'text-purple-400', label: 'מלונות', value: SAMPLE.stats.hotels },
                { icon: Plane, color: 'text-sky-400', label: 'טיסות', value: SAMPLE.stats.flights },
        ];

        if (layout === 'pills') {
                return (
                        <div className="flex flex-wrap gap-1.5">
                                {stats.map(s => (
                                        <span key={s.label} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/35 backdrop-blur-md border border-white/15 text-white text-2xs font-bold">
                                                <s.icon className={`w-3 h-3 ${s.color}`} />
                                                <span>{s.value}</span>
                                                <span className="text-white/60">{s.label}</span>
                                        </span>
                                ))}
                        </div>
                );
        }

        const cardCls = layout === 'grid' ? 'grid grid-cols-4 gap-2' : 'flex gap-2';
        const padCls = size === 'sm' ? 'p-2' : 'p-3';

        return (
                <div className={`${padCls} rounded-2xl bg-black/40 backdrop-blur-xl border border-white/15 shadow-xl`}>
                        <div className={cardCls}>
                                {stats.map(s => (
                                        <div key={s.label} className="flex flex-col items-center justify-center text-center px-2 py-1">
                                                <s.icon className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} ${s.color} mb-0.5`} />
                                                <div className={`${size === 'sm' ? 'text-base' : 'text-lg'} font-black text-white leading-none`}>{s.value}</div>
                                                <div className={`${size === 'sm' ? 'text-[9px]' : 'text-2xs'} text-white/65 font-bold mt-0.5`}>{s.label}</div>
                                        </div>
                                ))}
                        </div>
                </div>
        );
};

const CitiesInline: React.FC<{ wrap?: boolean }> = ({ wrap = true }) => (
        <div className={`flex items-center gap-1 text-white/95 text-xs font-bold ${wrap ? 'flex-wrap' : 'flex-nowrap overflow-x-auto scrollbar-hide'}`} dir="rtl">
                <MapPin className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                {SAMPLE.cities.map((c, i) => (
                        <span key={c.name} className="shrink-0">
                                <span dir="ltr">{c.name}</span>
                                <span className="text-white/65 text-2xs ms-1">({c.nights} לילות)</span>
                                {i < SAMPLE.cities.length - 1 && <span className="text-white/40 mx-1.5">·</span>}
                        </span>
                ))}
        </div>
);

// =============================================================================
// Desktop reference (matches the user's screenshot)
// =============================================================================
const DesktopReference: React.FC = () => (
        <div className="relative w-full h-[240px] rounded-[2rem] overflow-hidden shadow-xl">
                <img src={SAMPLE.cover} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/30 to-slate-900/15" />

                {/* Top-left: countdown */}
                <div className="absolute top-4 left-4 z-20">
                        <CountdownPill />
                </div>

                {/* Top-right: PDF + date */}
                <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                        <PdfPill />
                        <DatePill />
                </div>

                {/* Mid-left: stats card */}
                <div className="absolute bottom-5 left-5 z-10">
                        <StatsCard layout="row" />
                </div>

                {/* Bottom-right: title + cities */}
                <div className="absolute bottom-5 right-5 z-10 text-right max-w-[55%]" dir="rtl">
                        <h1 className="text-4xl font-black text-white drop-shadow-md leading-tight mb-2">{SAMPLE.name}</h1>
                        <CitiesInline wrap={false} />
                </div>
        </div>
);

// =============================================================================
// MOBILE OPTION A — Faithful: stats card overlaid + title overlaid below
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

const MobileOptionA: React.FC = () => {
        const { focal, editing, setEditing, ref, dragHandlers } = useFocal();
        return (
                <div
                        ref={ref}
                        {...dragHandlers}
                        className="relative w-[380px] h-[260px] rounded-[1.75rem] overflow-hidden shadow-xl select-none"
                >
                        <img
                                src={SAMPLE.cover}
                                className="w-full h-full object-cover"
                                style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
                                alt=""
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/35 to-slate-900/10" />

                        <div className="absolute top-3 left-3 z-20">
                                <CountdownPill size="sm" />
                        </div>
                        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                                <DatePill size="sm" />
                                <button
                                        onClick={() => setEditing(e => !e)}
                                        className={`w-8 h-8 rounded-full text-white flex items-center justify-center backdrop-blur-md ${editing ? 'bg-emerald-500/95 ring-2 ring-white/50' : 'bg-black/40'}`}
                                        title="הזז תמונה"
                                >
                                        <Move className="w-3 h-3" />
                                </button>
                        </div>

                        {/* Stats card centered above title */}
                        <div className="absolute bottom-[78px] left-3 right-3 z-10 flex justify-center">
                                <StatsCard size="sm" layout="row" />
                        </div>

                        {/* Title + cities pinned to bottom */}
                        <div className="absolute bottom-3 right-3 left-3 z-10 text-right" dir="rtl">
                                <h2 className="text-2xl font-black text-white drop-shadow-md leading-tight mb-1.5">{SAMPLE.name}</h2>
                                <CitiesInline wrap={false} />
                        </div>

                        {editing && (
                                <div className="absolute top-1/3 inset-x-3 px-3 py-2 bg-emerald-600/95 text-white text-xs font-bold text-center backdrop-blur-md z-30 rounded-lg">
                                        גרור כדי לבחור את החלק שיוצג
                                </div>
                        )}
                </div>
        );
};

// =============================================================================
// MOBILE OPTION B — Stats as compact pills inline below title
// =============================================================================
const MobileOptionB: React.FC = () => {
        const { focal, editing, setEditing, ref, dragHandlers } = useFocal();
        return (
                <div
                        ref={ref}
                        {...dragHandlers}
                        className="relative w-[380px] h-[220px] rounded-[1.75rem] overflow-hidden shadow-xl select-none"
                >
                        <img
                                src={SAMPLE.cover}
                                className="w-full h-full object-cover"
                                style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
                                alt=""
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/35 to-slate-900/10" />

                        <div className="absolute top-3 left-3 z-20">
                                <CountdownPill size="sm" />
                        </div>
                        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                                <DatePill size="sm" />
                                <button
                                        onClick={() => setEditing(e => !e)}
                                        className={`w-8 h-8 rounded-full text-white flex items-center justify-center backdrop-blur-md ${editing ? 'bg-emerald-500/95 ring-2 ring-white/50' : 'bg-black/40'}`}
                                        title="הזז תמונה"
                                >
                                        <Move className="w-3 h-3" />
                                </button>
                        </div>

                        <div className="absolute bottom-3 right-3 left-3 z-10 text-right space-y-2" dir="rtl">
                                <h2 className="text-2xl font-black text-white drop-shadow-md leading-tight">{SAMPLE.name}</h2>
                                <CitiesInline wrap={false} />
                                <StatsCard layout="pills" />
                        </div>

                        {editing && (
                                <div className="absolute top-1/3 inset-x-3 px-3 py-2 bg-emerald-600/95 text-white text-xs font-bold text-center backdrop-blur-md z-30 rounded-lg">
                                        גרור כדי לבחור את החלק שיוצג
                                </div>
                        )}
                </div>
        );
};

// =============================================================================
// MOBILE OPTION C — Stats card 2×2 grid floating on the side
// =============================================================================
const MobileOptionC: React.FC = () => {
        const { focal, editing, setEditing, ref, dragHandlers } = useFocal();
        return (
                <div
                        ref={ref}
                        {...dragHandlers}
                        className="relative w-[380px] h-[280px] rounded-[1.75rem] overflow-hidden shadow-xl select-none"
                >
                        <img
                                src={SAMPLE.cover}
                                className="w-full h-full object-cover"
                                style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
                                alt=""
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-slate-900/10" />

                        <div className="absolute top-3 left-3 z-20">
                                <CountdownPill size="sm" />
                        </div>
                        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                                <DatePill size="sm" />
                                <button
                                        onClick={() => setEditing(e => !e)}
                                        className={`w-8 h-8 rounded-full text-white flex items-center justify-center backdrop-blur-md ${editing ? 'bg-emerald-500/95 ring-2 ring-white/50' : 'bg-black/40'}`}
                                        title="הזז תמונה"
                                >
                                        <Move className="w-3 h-3" />
                                </button>
                        </div>

                        {/* Stats 2x2 grid card on the LEFT */}
                        <div className="absolute bottom-3 left-3 z-10">
                                <StatsCard size="sm" layout="grid" />
                        </div>

                        {/* Title + cities on the RIGHT */}
                        <div className="absolute bottom-3 right-3 z-10 text-right max-w-[58%]" dir="rtl">
                                <h2 className="text-xl font-black text-white drop-shadow-md leading-tight mb-1.5">{SAMPLE.name}</h2>
                                <div className="space-y-1 text-2xs text-white/95 font-bold">
                                        {SAMPLE.cities.map(c => (
                                                <div key={c.name} className="flex items-center gap-1.5 justify-end">
                                                        <span dir="ltr">{c.name}</span>
                                                        <span className="text-white/65">({c.nights} לילות)</span>
                                                        <MapPin className="w-3 h-3 text-blue-300 shrink-0" />
                                                </div>
                                        ))}
                                </div>
                        </div>

                        {editing && (
                                <div className="absolute top-1/3 inset-x-3 px-3 py-2 bg-emerald-600/95 text-white text-xs font-bold text-center backdrop-blur-md z-30 rounded-lg">
                                        גרור כדי לבחור את החלק שיוצג
                                </div>
                        )}
                </div>
        );
};

// =============================================================================
// PAGE
// =============================================================================
const Section: React.FC<{ letter: string; color: string; title: string; sub: string; children: React.ReactNode }> = ({ letter, color, title, sub, children }) => (
        <section className="bg-white rounded-2xl p-4 md:p-6 shadow-md">
                <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-full ${color} text-white flex items-center justify-center font-black text-lg shrink-0`}>{letter}</div>
                        <div className="min-w-0">
                                <div className="font-black text-brand-navy text-base md:text-lg">{title}</div>
                                <div className="text-2xs md:text-xs text-slate-500 leading-tight mt-0.5">{sub}</div>
                        </div>
                </div>
                <div className="flex justify-center">{children}</div>
        </section>
);

export const HeroPreview: React.FC = () => (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-rubik" dir="rtl">
                <div className="max-w-5xl mx-auto space-y-6">
                        <header className="text-center pt-4 pb-2">
                                <h1 className="text-2xl md:text-3xl font-black text-brand-navy">3 אופציות לתמונת נושא במובייל</h1>
                                <p className="text-sm text-slate-500 mt-1">בכל אופציה: pill ספירה, סטטיסטיקות, כותרת וערים — כולם על התמונה (כמו בדסקטופ).</p>
                        </header>

                        {/* Desktop reference */}
                        <section className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 md:p-6 shadow-md">
                                <div className="flex items-center gap-3 mb-4">
                                        <div className="px-3 py-1.5 rounded-full bg-white/10 text-white text-2xs font-black uppercase tracking-widest">דסקטופ — נשמר כפי שהוא</div>
                                </div>
                                <DesktopReference />
                        </section>

                        <Section
                                letter="A"
                                color="bg-blue-600"
                                title="Stats card מרכזי על התמונה"
                                sub="כרטיס הסטטיסטיקות יושב באמצע-תחתון, כותרת וערים מתחת. הכי דומה לדסקטופ."
                        >
                                <MobileOptionA />
                        </Section>

                        <Section
                                letter="B"
                                color="bg-indigo-600"
                                title="סטטיסטיקות כ-pills קומפקטיים"
                                sub="ארבע פיסות מידע כצ'יפים קטנים מתחת לערים. הכי קל לקרוא."
                        >
                                <MobileOptionB />
                        </Section>

                        <Section
                                letter="C"
                                color="bg-emerald-600"
                                title="Stats card 2×2 בצד שמאל"
                                sub="הסטטיסטיקות בריבוע 2×2 משמאל, כותרת וערים מימין. הכי דחוס במידע."
                        >
                                <MobileOptionC />
                        </Section>

                        <p className="text-center text-2xs text-slate-400">
                                💡 לחץ על הכפתור הירוק (Move) כדי לבחור איזה חלק של התמונה יוצג.
                        </p>
                        <footer className="text-center pt-4 pb-12">
                                <p className="text-sm text-slate-500">בחר את הזה שאתה הכי אוהב, וכתוב לי "A", "B" או "C".</p>
                        </footer>
                </div>
        </div>
);
