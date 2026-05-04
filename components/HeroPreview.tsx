import React, { useRef, useState } from 'react';
import { Calendar, Plane, FileText as FileTextIcon, MapPin, Move, Hotel as HotelIcon, Utensils } from 'lucide-react';

/**
 * Hero preview — mobile design picker.
 *
 * Decisions reached so far:
 *   - User loves the desktop hero (countdown + stats + title + cities all
 *     overlaid on the cover photo) → keep desktop unchanged.
 *   - Stats card is NOT wanted on mobile → drop it from the mobile options.
 *
 * This file shows:
 *   - Desktop reference at the top (for context only).
 *   - Three mobile options without the stats card. All three keep countdown,
 *     date pill, title, cities all overlaid on the photo per the consistency
 *     requirement. They differ in arrangement and density.
 *
 * Throwaway component — delete after a design is picked.
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
                <span>PDF</span>
        </button>
);

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
// Desktop reference (kept identical to live)
// =============================================================================
const DesktopReference: React.FC = () => {
        const stats = [
                { icon: MapPin, color: 'text-emerald-400', label: 'מקומות', value: SAMPLE.stats.places },
                { icon: Utensils, color: 'text-amber-400', label: 'אוכל', value: SAMPLE.stats.food },
                { icon: HotelIcon, color: 'text-purple-400', label: 'מלונות', value: SAMPLE.stats.hotels },
                { icon: Plane, color: 'text-sky-400', label: 'טיסות', value: SAMPLE.stats.flights },
        ];
        return (
                <div className="relative w-full h-[240px] rounded-[2rem] overflow-hidden shadow-xl">
                        <img src={SAMPLE.cover} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/30 to-slate-900/15" />
                        <div className="absolute top-4 left-4 z-20"><CountdownPill /></div>
                        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
                                <PdfPill /><DatePill />
                        </div>
                        <div className="absolute bottom-5 left-5 z-10 p-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/15 shadow-xl">
                                <div className="flex gap-2">
                                        {stats.map(s => (
                                                <div key={s.label} className="flex flex-col items-center justify-center text-center px-2 py-1">
                                                        <s.icon className={`w-5 h-5 ${s.color} mb-0.5`} />
                                                        <div className="text-lg font-black text-white leading-none">{s.value}</div>
                                                        <div className="text-2xs text-white/65 font-bold mt-0.5">{s.label}</div>
                                                </div>
                                        ))}
                                </div>
                        </div>
                        <div className="absolute bottom-5 right-5 z-10 text-right max-w-[55%]" dir="rtl">
                                <h1 className="text-4xl font-black text-white drop-shadow-md leading-tight mb-2">{SAMPLE.name}</h1>
                                <div className="flex items-center gap-1 text-white/95 text-xs font-bold flex-nowrap overflow-hidden" dir="rtl">
                                        <MapPin className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                                        {SAMPLE.cities.map((c, i) => (
                                                <span key={c.name} className="shrink-0">
                                                        <span dir="ltr">{c.name}</span>
                                                        <span className="text-white/65 text-2xs ms-1">({c.nights} לילות)</span>
                                                        {i < SAMPLE.cities.length - 1 && <span className="text-white/40 mx-1.5">·</span>}
                                                </span>
                                        ))}
                                </div>
                        </div>
                </div>
        );
};

// =============================================================================
// MOBILE A — Tall hero, big title bottom-right, cities as glass chips
// =============================================================================
const MobileOptionA: React.FC = () => {
        const { focal, editing, setEditing, ref, dragHandlers } = useFocal();
        return (
                <div
                        ref={ref}
                        {...dragHandlers}
                        className="relative w-[380px] h-[240px] rounded-[1.75rem] overflow-hidden shadow-xl select-none"
                >
                        <img src={SAMPLE.cover} className="w-full h-full object-cover" style={{ objectPosition: `${focal.x}% ${focal.y}%` }} alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-slate-900/5" />

                        <div className="absolute top-3 left-3 z-20"><CountdownPill size="sm" /></div>
                        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                                <DatePill size="sm" />
                                <button
                                        onClick={() => setEditing(e => !e)}
                                        className={`w-8 h-8 rounded-full text-white flex items-center justify-center backdrop-blur-md ${editing ? 'bg-emerald-500/95 ring-2 ring-white/50' : 'bg-black/40'}`}
                                        title="הזז תמונה"
                                ><Move className="w-3 h-3" /></button>
                        </div>

                        <div className="absolute bottom-4 right-4 left-4 z-10 text-right" dir="rtl">
                                <h2 className="text-3xl font-black text-white drop-shadow-md leading-tight mb-2.5">{SAMPLE.name}</h2>
                                <div className="flex flex-wrap gap-1.5 justify-end">
                                        {SAMPLE.cities.map(c => (
                                                <span key={c.name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/18 text-white text-2xs font-bold backdrop-blur-md border border-white/20" dir="rtl">
                                                        <span dir="ltr">{c.name}</span>
                                                        <span className="text-white/65">{c.nights}ל'</span>
                                                </span>
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
// MOBILE B — Compact hero, title + cities in single inline row
// =============================================================================
const MobileOptionB: React.FC = () => {
        const { focal, editing, setEditing, ref, dragHandlers } = useFocal();
        return (
                <div
                        ref={ref}
                        {...dragHandlers}
                        className="relative w-[380px] h-[170px] rounded-[1.75rem] overflow-hidden shadow-xl select-none"
                >
                        <img src={SAMPLE.cover} className="w-full h-full object-cover" style={{ objectPosition: `${focal.x}% ${focal.y}%` }} alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-slate-900/5" />

                        <div className="absolute top-3 left-3 z-20"><CountdownPill size="sm" /></div>
                        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                                <DatePill size="sm" />
                                <button
                                        onClick={() => setEditing(e => !e)}
                                        className={`w-8 h-8 rounded-full text-white flex items-center justify-center backdrop-blur-md ${editing ? 'bg-emerald-500/95 ring-2 ring-white/50' : 'bg-black/40'}`}
                                        title="הזז תמונה"
                                ><Move className="w-3 h-3" /></button>
                        </div>

                        <div className="absolute bottom-3 right-4 left-4 z-10 text-right" dir="rtl">
                                <h2 className="text-2xl font-black text-white drop-shadow-md leading-tight mb-1.5">{SAMPLE.name}</h2>
                                <div className="flex items-center gap-1 text-white/95 text-2xs font-bold flex-nowrap overflow-x-auto scrollbar-hide" dir="rtl">
                                        <MapPin className="w-3 h-3 text-blue-300 shrink-0" />
                                        {SAMPLE.cities.map((c, i) => (
                                                <span key={c.name} className="shrink-0">
                                                        <span dir="ltr">{c.name}</span>
                                                        <span className="text-white/65 ms-1">({c.nights})</span>
                                                        {i < SAMPLE.cities.length - 1 && <span className="text-white/40 mx-1">·</span>}
                                                </span>
                                        ))}
                                </div>
                        </div>

                        {editing && (
                                <div className="absolute top-1/2 -translate-y-1/2 inset-x-3 px-3 py-2 bg-emerald-600/95 text-white text-xs font-bold text-center backdrop-blur-md z-30 rounded-lg">
                                        גרור כדי לבחור את החלק שיוצג
                                </div>
                        )}
                </div>
        );
};

// =============================================================================
// MOBILE C — Asymmetric: title left big, cities right stacked column
// =============================================================================
const MobileOptionC: React.FC = () => {
        const { focal, editing, setEditing, ref, dragHandlers } = useFocal();
        return (
                <div
                        ref={ref}
                        {...dragHandlers}
                        className="relative w-[380px] h-[210px] rounded-[1.75rem] overflow-hidden shadow-xl select-none"
                >
                        <img src={SAMPLE.cover} className="w-full h-full object-cover" style={{ objectPosition: `${focal.x}% ${focal.y}%` }} alt="" />
                        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/90 via-slate-900/35 to-slate-900/5" />

                        <div className="absolute top-3 left-3 z-20"><CountdownPill size="sm" /></div>
                        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                                <DatePill size="sm" />
                                <button
                                        onClick={() => setEditing(e => !e)}
                                        className={`w-8 h-8 rounded-full text-white flex items-center justify-center backdrop-blur-md ${editing ? 'bg-emerald-500/95 ring-2 ring-white/50' : 'bg-black/40'}`}
                                        title="הזז תמונה"
                                ><Move className="w-3 h-3" /></button>
                        </div>

                        {/* Title bottom-right (RTL primary), cities list stacked below */}
                        <div className="absolute bottom-3 right-3 left-3 z-10" dir="rtl">
                                <h2 className="text-2xl font-black text-white drop-shadow-md leading-tight mb-2 text-right">{SAMPLE.name}</h2>
                                <div className="space-y-1">
                                        {SAMPLE.cities.map(c => (
                                                <div key={c.name} className="flex items-center justify-end gap-2 text-white/95">
                                                        <span className="text-2xs font-bold text-white/65 px-1.5 py-0.5 rounded bg-white/10 border border-white/15">
                                                                {c.nights} לילות
                                                        </span>
                                                        <span dir="ltr" className="text-sm font-bold">{c.name}</span>
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
                                <p className="text-sm text-slate-500 mt-1">בלי כרטיס הסטטיסטיקות. כל המידע — pill ספירה, תאריכים, כותרת, ערים — על התמונה.</p>
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
                                title="כותרת גדולה + ערים כצ'יפים מזכוכית"
                                sub="הכי דרמטי. תמונה גבוהה, כותרת מודגשת, כל עיר ב-pill נפרד עם מספר לילות. נותן לתמונה לנשום."
                        >
                                <MobileOptionA />
                        </Section>

                        <Section
                                letter="B"
                                color="bg-indigo-600"
                                title="קומפקטי — שורה אחת לכל הערים"
                                sub="הכי נמוך (170px). כותרת בינונית + ערים בשורה אחת בלבד. הכי חוסך מקום במובייל הקצר."
                        >
                                <MobileOptionB />
                        </Section>

                        <Section
                                letter="C"
                                color="bg-emerald-600"
                                title="ערים כרשימה אנכית עם תוויות לילות"
                                sub="כל עיר בשורה משלה עם תווית לילות מודגשת בריבוע מזכוכית. הכי קריא, אם יש מספר ערים."
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
