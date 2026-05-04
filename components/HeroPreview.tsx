import React, { useRef, useState } from 'react';
import { Calendar, MapPin, Plane, FileText as FileTextIcon, Edit2, MoreVertical, Move } from 'lucide-react';

/**
 * Side-by-side preview of 3 hero/cover designs for the user to choose from.
 * Mounted at #/hero-preview (App.tsx checks the URL hash). Throwaway —
 * deletes itself once a design is picked.
 *
 * All three options share identical sample data so they can be compared
 * apples-to-apples on the same screen.
 */

const SAMPLE = {
        name: 'תאילנד 26',
        cover: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=1600&q=80',
        dateLabel: '6/8 – 26/8',
        countdownDays: 94,
        countdownTo: 'בנגקוק',
        cities: [
                { name: 'Bangkok', nights: 3 },
                { name: 'Pattaya', nights: 5 },
                { name: 'Koh Chang', nights: 10 },
        ],
};

// =============================================================================
// OPTION A — Compact countdown top-left + cities below image
// =============================================================================
const OptionA: React.FC = () => {
        const [focal, setFocal] = useState({ x: 50, y: 50 });
        const [editing, setEditing] = useState(false);
        const ref = useRef<HTMLDivElement>(null);

        const handleDrag = (clientX: number, clientY: number) => {
                if (!ref.current) return;
                const r = ref.current.getBoundingClientRect();
                const x = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
                const y = Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100));
                setFocal({ x, y });
        };

        return (
                <div className="space-y-3">
                        <div
                                ref={ref}
                                className="relative h-[160px] mx-1 rounded-[1.75rem] overflow-hidden shadow-xl group select-none"
                                onTouchMove={editing ? (e) => handleDrag(e.touches[0].clientX, e.touches[0].clientY) : undefined}
                                onMouseMove={editing ? (e) => handleDrag(e.clientX, e.clientY) : undefined}
                        >
                                <img
                                        src={SAMPLE.cover}
                                        className="w-full h-full object-cover"
                                        style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
                                        alt=""
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/15 to-transparent" />

                                {/* Top-left compact countdown */}
                                <div className="absolute top-3 left-3 z-20">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/95 text-white text-xs font-bold shadow-lg backdrop-blur-md">
                                                <Plane className="w-3.5 h-3.5" />
                                                <span>{SAMPLE.countdownDays} ימים</span>
                                        </div>
                                </div>

                                {/* Top-right: cover edit + focal toggle */}
                                <div className="absolute top-3 right-3 z-20 flex gap-1.5">
                                        <button className="w-9 h-9 bg-black/40 backdrop-blur-md rounded-full text-white flex items-center justify-center" title="החלף תמונה">
                                                <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                                onClick={() => setEditing(e => !e)}
                                                className={`w-9 h-9 rounded-full text-white flex items-center justify-center backdrop-blur-md ${editing ? 'bg-emerald-500/95' : 'bg-black/40'}`}
                                                title="הזז תמונה"
                                        >
                                                <Move className="w-3.5 h-3.5" />
                                        </button>
                                </div>

                                {/* Bottom overlay: title + dates */}
                                <div className="absolute bottom-3 right-4 left-4 z-10 text-white" dir="rtl">
                                        <div className="text-2xl font-black drop-shadow-md leading-tight">{SAMPLE.name}</div>
                                        <div className="flex items-center gap-1.5 mt-1 text-2xs font-bold text-white/85">
                                                <Calendar className="w-3 h-3" />
                                                <span dir="ltr">{SAMPLE.dateLabel}</span>
                                        </div>
                                </div>

                                {editing && (
                                        <div className="absolute inset-x-0 bottom-0 px-3 py-2 bg-emerald-600/95 text-white text-xs font-bold text-center backdrop-blur-md">
                                                גרור כדי לבחור איזה חלק של התמונה יוצג · לחץ שוב לסיום
                                        </div>
                                )}
                        </div>

                        {/* City chips BELOW the image, horizontal scroll */}
                        <div className="flex gap-2 overflow-x-auto px-1 scrollbar-hide" dir="rtl">
                                {SAMPLE.cities.map(c => (
                                        <div key={c.name} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                                                <MapPin className="w-3 h-3" />
                                                <span>{c.name}</span>
                                                <span className="text-blue-400 text-2xs">{c.nights}ל'</span>
                                        </div>
                                ))}
                        </div>
                </div>
        );
};

// =============================================================================
// OPTION B — Minimal banner, all info below
// =============================================================================
const OptionB: React.FC = () => (
        <div className="space-y-3">
                <div className="relative h-[120px] mx-1 rounded-[1.75rem] overflow-hidden shadow-md group">
                        <img src={SAMPLE.cover} className="w-full h-full object-cover" alt="" />
                        <button className="absolute top-2 right-2 w-9 h-9 bg-black/40 backdrop-blur-md rounded-full text-white flex items-center justify-center" title="החלף תמונה">
                                <Edit2 className="w-3.5 h-3.5" />
                        </button>
                </div>
                <div className="px-2 space-y-2" dir="rtl">
                        <h2 className="text-2xl font-black text-brand-navy leading-tight">{SAMPLE.name}</h2>
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium flex-wrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold" dir="ltr">
                                        <Calendar className="w-3 h-3" /> {SAMPLE.dateLabel}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                                        <Plane className="w-3 h-3" /> עוד {SAMPLE.countdownDays} ימים
                                </span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide" dir="rtl">
                                {SAMPLE.cities.map(c => (
                                        <div key={c.name} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
                                                <MapPin className="w-3 h-3 text-blue-500" />
                                                <span>{c.name}</span>
                                                <span className="text-slate-400 text-2xs">{c.nights}ל'</span>
                                        </div>
                                ))}
                        </div>
                </div>
        </div>
);

// =============================================================================
// OPTION C — Magazine style with focal-point editor + bottom-overlay scroll
// =============================================================================
const OptionC: React.FC = () => {
        const [focal, setFocal] = useState({ x: 50, y: 35 });
        const [editing, setEditing] = useState(false);
        const ref = useRef<HTMLDivElement>(null);

        const handleDrag = (clientX: number, clientY: number) => {
                if (!ref.current || !editing) return;
                const r = ref.current.getBoundingClientRect();
                const x = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
                const y = Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100));
                setFocal({ x, y });
        };

        return (
                <div
                        ref={ref}
                        className="relative h-[200px] mx-1 rounded-[1.75rem] overflow-hidden shadow-xl group select-none"
                        onTouchMove={(e) => handleDrag(e.touches[0].clientX, e.touches[0].clientY)}
                        onMouseMove={(e) => handleDrag(e.clientX, e.clientY)}
                >
                        <img
                                src={SAMPLE.cover}
                                className="w-full h-full object-cover"
                                style={{ objectPosition: `${focal.x}% ${focal.y}%` }}
                                alt=""
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/30 to-slate-900/40" />

                        {/* Top-left countdown */}
                        <div className="absolute top-3 left-3 z-20">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/95 text-blue-700 text-2xs font-black shadow-lg backdrop-blur-md">
                                        <Plane className="w-3 h-3" />
                                        <span>{SAMPLE.countdownDays} ימים →</span>
                                </div>
                        </div>

                        {/* Top-right menu */}
                        <div className="absolute top-3 right-3 z-20 flex gap-1.5">
                                <button
                                        onClick={() => setEditing(e => !e)}
                                        className={`w-9 h-9 rounded-full text-white flex items-center justify-center backdrop-blur-md ${editing ? 'bg-emerald-500/95' : 'bg-black/40'}`}
                                        title="הזז תמונה"
                                >
                                        <Move className="w-3.5 h-3.5" />
                                </button>
                                <button className="w-9 h-9 bg-black/40 backdrop-blur-md rounded-full text-white flex items-center justify-center" title="עוד">
                                        <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                        </div>

                        {/* Bottom overlay: title + chips inside hero */}
                        <div className="absolute bottom-0 right-0 left-0 px-4 pb-3 pt-10 z-10" dir="rtl">
                                <h2 className="text-2xl font-black text-white drop-shadow-md leading-tight mb-2">{SAMPLE.name}</h2>
                                <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4">
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
                                <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 px-3 py-2 bg-emerald-600/95 text-white text-xs font-bold text-center backdrop-blur-md z-30">
                                        גרור כדי לבחור איזה חלק של התמונה יוצג
                                </div>
                        )}
                </div>
        );
};

// =============================================================================
// PAGE
// =============================================================================
export const HeroPreview: React.FC = () => (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-rubik" dir="rtl">
                <div className="max-w-md mx-auto space-y-8">
                        <header className="text-center pt-4">
                                <h1 className="text-2xl font-black text-brand-navy">3 אופציות לעיצוב התמונת נושא</h1>
                                <p className="text-sm text-slate-500 mt-1">בחר את האחת שאתה הכי אוהב — אז אני אטמיע אותה.</p>
                        </header>

                        {/* Option A */}
                        <section className="bg-white rounded-2xl p-4 shadow-md">
                                <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black">A</div>
                                        <div>
                                                <div className="font-black text-brand-navy">קומפקטית — ערים מתחת לתמונה</div>
                                                <div className="text-2xs text-slate-500">spinner קטן בפינה שמאל-עליונה · ערים עוברות שורה מתחת · מרגיש מסודר</div>
                                        </div>
                                </div>
                                <OptionA />
                                <p className="text-2xs text-slate-400 mt-3 text-right">
                                        💡 לחץ על הכפתור הירוק (Move) כדי לבחור איזה חלק של התמונה להציג.
                                </p>
                        </section>

                        {/* Option B */}
                        <section className="bg-white rounded-2xl p-4 shadow-md">
                                <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black">B</div>
                                        <div>
                                                <div className="font-black text-brand-navy">מינימליסטית — באנר ומידע נפרד</div>
                                                <div className="text-2xs text-slate-500">תמונה קצרה ודקורטיבית · כותרת/תאריך/ספירה כצ'יפים מתחת · הכי מסודר</div>
                                        </div>
                                </div>
                                <OptionB />
                        </section>

                        {/* Option C */}
                        <section className="bg-white rounded-2xl p-4 shadow-md">
                                <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black">C</div>
                                        <div>
                                                <div className="font-black text-brand-navy">סינמטית — overlay על תמונה גבוהה</div>
                                                <div className="text-2xs text-slate-500">תמונה דומיננטית · גלילה אופקית של הערים בתוך ה-overlay · כל המידע ב-hero</div>
                                        </div>
                                </div>
                                <OptionC />
                                <p className="text-2xs text-slate-400 mt-3 text-right">
                                        💡 לחץ על הכפתור הירוק (Move) כדי לבחור איזה חלק של התמונה להציג.
                                </p>
                        </section>

                        <footer className="text-center pt-4 pb-12">
                                <p className="text-sm text-slate-500">בחר את הזה שאתה הכי אוהב, וכתוב לי "A", "B" או "C".</p>
                        </footer>
                </div>
        </div>
);
