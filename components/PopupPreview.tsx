import React from 'react';
import { MapPin, Star, Trophy, ExternalLink, Clock, Hotel as HotelIcon, Utensils, Calendar, BedDouble, DollarSign, ChevronLeft } from 'lucide-react';

/**
 * Map-popup design picker.
 *
 * The current popup ([components/map/MapItemPopup.tsx]) handles all four item
 * types — hotel / restaurant / attraction / airport — with one component. The
 * user said the hotel popup looked bad (long transport note, gradient header
 * for hotels) and the restaurant popup was ugly. After clamping the note in
 * commit 831d4d5, we still need a real design refresh.
 *
 * This page renders the CURRENT popup as a baseline, then 3 design options
 * for each of hotel + restaurant so the user can compare and pick.
 *
 * Throwaway — delete this file once a design is chosen.
 */

const HOTEL = {
        name: 'Holiday Inn Pattaya',
        address: 'Holiday Inn Pattaya, Pattaya, Thailand',
        date: '07/08/2026',
        rating: 8.4,
        price: '₪1,450 / לילה',
        nights: 5,
        source: 'DIRECT',
        note: 'איסוף בשעה 12:30 משדה התעופה BKK + כיסאות בטיחות לתינוקות.',
        cover: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
};

const RESTAURANT = {
        name: 'Blue Elephant Bangkok',
        address: '233 South Sathorn Rd, Bangkok',
        cuisine: 'Royal Thai',
        rating: 4.7,
        price: '$$$',
        recommendation: 'Top 50 Asia',
        date: '08/08/2026 19:00',
        cover: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80',
};

// =============================================================================
// CURRENT (baseline)
// =============================================================================
const CurrentHotel: React.FC = () => (
        <div style={{ fontFamily: "'Rubik',sans-serif", direction: 'rtl', width: 220 }} className="bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200">
                <div style={{ position: 'relative', height: 110, background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>
                        <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 6 }}>מלון</span>
                        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '6px 10px' }}>
                                <h3 dir="ltr" style={{ margin: 0, fontSize: 13, fontWeight: 900, color: '#fff', textAlign: 'left' }}>{HOTEL.name}</h3>
                                <div style={{ fontSize: 9, color: '#cbd5e1', fontWeight: 600 }}>📍 {HOTEL.address}</div>
                                <div style={{ marginTop: 2, display: 'flex', gap: 4 }}>
                                        <span style={{ background: 'rgba(0,0,0,0.45)', color: '#fde047', fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 6 }}>🏆 {HOTEL.source}</span>
                                </div>
                        </div>
                </div>
                <div style={{ padding: '8px 10px' }}>
                        <div style={{ fontSize: 10, color: '#475569', background: '#fffaeb', border: '1px solid #fde68a', borderRadius: 6, padding: '5px 8px', lineHeight: 1.4 }}>
                                📝 {HOTEL.note}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginTop: 6 }}>📅 {HOTEL.date}</div>
                        <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, color: '#2563eb', textDecoration: 'none', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 8px', borderRadius: 6, marginTop: 6 }}>🧭 ניווט</a>
                </div>
        </div>
);

const CurrentRestaurant: React.FC = () => (
        <div style={{ fontFamily: "'Rubik',sans-serif", direction: 'rtl', width: 220 }} className="bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-200">
                <div style={{ position: 'relative', height: 110, backgroundImage: `linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.2) 55%,transparent 90%),url('${RESTAURANT.cover}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                        <span dir="ltr" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 6 }}>{RESTAURANT.cuisine}</span>
                        <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 6 }}>{RESTAURANT.price}</span>
                        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '6px 10px' }}>
                                <h3 dir="ltr" style={{ margin: 0, fontSize: 13, fontWeight: 900, color: '#fff', textAlign: 'left' }}>{RESTAURANT.name}</h3>
                                <div style={{ fontSize: 9, color: '#cbd5e1' }}>📍 {RESTAURANT.address}</div>
                                <div style={{ marginTop: 2, display: 'flex', gap: 4 }}>
                                        <span style={{ background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 10, fontWeight: 900, padding: '2px 6px', borderRadius: 6 }}>⭐ {RESTAURANT.rating}</span>
                                        <span style={{ background: 'rgba(0,0,0,0.45)', color: '#fde047', fontSize: 9, fontWeight: 900, padding: '2px 6px', borderRadius: 6 }}>🏆 {RESTAURANT.recommendation}</span>
                                </div>
                        </div>
                </div>
                <div style={{ padding: '8px 10px' }}>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>📅 {RESTAURANT.date}</div>
                        <a href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 800, color: '#2563eb', textDecoration: 'none', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 8px', borderRadius: 6, marginTop: 6 }}>🧭 ניווט</a>
                </div>
        </div>
);

// =============================================================================
// HOTEL OPTION A — Image + dark glass info panel below
// =============================================================================
const HotelA: React.FC = () => (
        <div className="w-[260px] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200" dir="rtl">
                <div className="relative h-32">
                        <img src={HOTEL.cover} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/15 to-transparent" />
                        <span className="absolute top-2 right-2 inline-flex items-center gap-1 bg-amber-400/95 text-amber-950 text-2xs font-black px-2 py-0.5 rounded-full shadow">
                                <Trophy className="w-3 h-3" />
                                {HOTEL.source}
                        </span>
                        <div className="absolute right-3 bottom-2 left-3 text-right">
                                <h3 className="text-sm font-black text-white drop-shadow leading-tight" dir="ltr">{HOTEL.name}</h3>
                                <div className="text-2xs text-white/80 truncate">{HOTEL.address}</div>
                        </div>
                </div>
                <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-2xs">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {HOTEL.rating}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                                        <BedDouble className="w-3 h-3" /> {HOTEL.nights} לילות
                                </span>
                                <span className="text-slate-500 font-bold ms-auto">{HOTEL.price}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-2xs text-slate-500">
                                <span className="inline-flex items-center gap-1.5"><Calendar className="w-3 h-3" /> צ'ק-אין {HOTEL.date}</span>
                        </div>
                        <a href="#" className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 text-white text-2xs font-black px-3 py-2 rounded-lg shadow shadow-blue-500/30 hover:bg-blue-700 transition-colors">
                                <MapPin className="w-3 h-3" /> ניווט
                        </a>
                </div>
        </div>
);

// =============================================================================
// HOTEL OPTION B — Horizontal layout: image left, info right
// =============================================================================
const HotelB: React.FC = () => (
        <div className="w-[300px] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200" dir="rtl">
                <div className="flex">
                        <img src={HOTEL.cover} className="w-24 h-24 object-cover flex-shrink-0" alt="" />
                        <div className="flex-1 p-2.5 min-w-0">
                                <h3 className="text-sm font-black text-brand-navy leading-tight truncate" dir="ltr">{HOTEL.name}</h3>
                                <div className="flex items-center gap-1 text-2xs text-slate-500 truncate">
                                        <MapPin className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{HOTEL.address}</span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 text-2xs font-bold border border-amber-200">
                                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" /> {HOTEL.rating}
                                        </span>
                                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-2xs font-bold border border-blue-200">{HOTEL.source}</span>
                                </div>
                                <div className="text-2xs text-slate-400 mt-1 truncate">{HOTEL.nights} לילות · {HOTEL.date}</div>
                        </div>
                </div>
                <div className="border-t border-slate-100 px-2.5 py-2 flex items-center justify-between gap-2 bg-slate-50">
                        <span className="text-xs font-black text-brand-navy">{HOTEL.price}</span>
                        <a href="#" className="inline-flex items-center gap-1 bg-blue-600 text-white text-2xs font-bold px-2.5 py-1 rounded-md shadow-sm">
                                <MapPin className="w-3 h-3" /> ניווט <ChevronLeft className="w-3 h-3" />
                        </a>
                </div>
        </div>
);

// =============================================================================
// HOTEL OPTION C — Bold blue header, white body
// =============================================================================
const HotelC: React.FC = () => (
        <div className="w-[260px] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200" dir="rtl">
                <div className="relative h-12 bg-gradient-to-l from-blue-600 to-blue-700 px-3 flex items-center gap-2">
                        <HotelIcon className="w-4 h-4 text-white" />
                        <div className="flex-1 min-w-0">
                                <h3 className="text-xs font-black text-white truncate" dir="ltr">{HOTEL.name}</h3>
                                <div className="text-[9px] text-white/80 truncate">{HOTEL.address}</div>
                        </div>
                        <span className="text-2xs font-black bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded">{HOTEL.source}</span>
                </div>
                <img src={HOTEL.cover} className="w-full h-24 object-cover" alt="" />
                <div className="p-2.5 space-y-2">
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                                <div className="px-1 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
                                        <div className="text-2xs font-black text-amber-700">⭐ {HOTEL.rating}</div>
                                        <div className="text-[9px] text-amber-600 font-bold mt-0.5">דירוג</div>
                                </div>
                                <div className="px-1 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
                                        <div className="text-2xs font-black text-indigo-700">{HOTEL.nights} ל'</div>
                                        <div className="text-[9px] text-indigo-600 font-bold mt-0.5">לילות</div>
                                </div>
                                <div className="px-1 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                                        <div className="text-2xs font-black text-emerald-700">₪1,450</div>
                                        <div className="text-[9px] text-emerald-600 font-bold mt-0.5">ללילה</div>
                                </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-2xs text-slate-500">
                                <Clock className="w-3 h-3" /> צ'ק-אין: {HOTEL.date}
                        </div>
                        <a href="#" className="w-full inline-flex items-center justify-center gap-1.5 bg-blue-600 text-white text-2xs font-black px-3 py-2 rounded-lg shadow shadow-blue-500/30">
                                <MapPin className="w-3 h-3" /> ניווט בגוגל מפות
                        </a>
                </div>
        </div>
);

// =============================================================================
// RESTAURANT OPTION A — Image hero, recommendation ribbon, action below
// =============================================================================
const RestoA: React.FC = () => (
        <div className="w-[260px] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200" dir="rtl">
                <div className="relative h-32">
                        <img src={RESTAURANT.cover} className="w-full h-full object-cover" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 to-transparent" />
                        <div className="absolute top-2 right-2 inline-flex items-center gap-1 bg-amber-400/95 text-amber-950 text-2xs font-black px-2 py-0.5 rounded-full shadow">
                                <Trophy className="w-3 h-3" /> {RESTAURANT.recommendation}
                        </div>
                        <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-white/95 text-orange-700 text-2xs font-black px-2 py-0.5 rounded-full shadow">
                                <Star className="w-3 h-3 fill-orange-500 text-orange-500" /> {RESTAURANT.rating}
                        </div>
                        <div className="absolute right-3 bottom-2 left-3 text-right">
                                <h3 className="text-sm font-black text-white drop-shadow leading-tight" dir="ltr">{RESTAURANT.name}</h3>
                                <div className="text-2xs text-white/85 truncate" dir="ltr">{RESTAURANT.address}</div>
                        </div>
                </div>
                <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 text-2xs">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 font-bold border border-orange-200">
                                        <Utensils className="w-3 h-3" /> {RESTAURANT.cuisine}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                        <DollarSign className="w-3 h-3" /> {RESTAURANT.price}
                                </span>
                                <span className="text-slate-400 ms-auto inline-flex items-center gap-1"><Clock className="w-3 h-3" /> 19:00</span>
                        </div>
                        <a href="#" className="w-full inline-flex items-center justify-center gap-1.5 bg-orange-600 text-white text-2xs font-black px-3 py-2 rounded-lg shadow shadow-orange-500/30">
                                <MapPin className="w-3 h-3" /> ניווט
                        </a>
                </div>
        </div>
);

// =============================================================================
// RESTAURANT OPTION B — Compact horizontal
// =============================================================================
const RestoB: React.FC = () => (
        <div className="w-[300px] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200" dir="rtl">
                <div className="flex">
                        <img src={RESTAURANT.cover} className="w-24 h-24 object-cover flex-shrink-0" alt="" />
                        <div className="flex-1 p-2.5 min-w-0">
                                <div className="flex items-start justify-between gap-1">
                                        <h3 className="text-sm font-black text-brand-navy leading-tight truncate" dir="ltr">{RESTAURANT.name}</h3>
                                        <span className="inline-flex items-center gap-0.5 text-2xs font-black text-amber-700 shrink-0">
                                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {RESTAURANT.rating}
                                        </span>
                                </div>
                                <div className="flex items-center gap-1 text-2xs text-slate-500 truncate" dir="ltr">
                                        <MapPin className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{RESTAURANT.address}</span>
                                </div>
                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 text-2xs font-bold border border-orange-200">{RESTAURANT.cuisine}</span>
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-2xs font-bold border border-emerald-200">{RESTAURANT.price}</span>
                                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-2xs font-bold border border-amber-200 inline-flex items-center gap-0.5">
                                                <Trophy className="w-2.5 h-2.5" /> {RESTAURANT.recommendation}
                                        </span>
                                </div>
                        </div>
                </div>
                <div className="border-t border-slate-100 px-2.5 py-2 flex items-center justify-between gap-2 bg-slate-50">
                        <span className="text-2xs text-slate-500 font-bold inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {RESTAURANT.date}
                        </span>
                        <a href="#" className="inline-flex items-center gap-1 bg-orange-600 text-white text-2xs font-bold px-2.5 py-1 rounded-md">
                                <MapPin className="w-3 h-3" /> ניווט <ChevronLeft className="w-3 h-3" />
                        </a>
                </div>
        </div>
);

// =============================================================================
// RESTAURANT OPTION C — Magazine-style card with bold header
// =============================================================================
const RestoC: React.FC = () => (
        <div className="w-[260px] bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200" dir="rtl">
                <div className="relative h-16 bg-gradient-to-l from-orange-500 to-rose-500 px-3 flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-white" />
                        <div className="flex-1 min-w-0">
                                <h3 className="text-xs font-black text-white truncate" dir="ltr">{RESTAURANT.name}</h3>
                                <div className="text-[9px] text-white/85 truncate" dir="ltr">{RESTAURANT.address}</div>
                        </div>
                        <span className="text-2xs font-black bg-white text-orange-700 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-orange-500 text-orange-500" /> {RESTAURANT.rating}
                        </span>
                </div>
                <img src={RESTAURANT.cover} className="w-full h-24 object-cover" alt="" />
                <div className="p-2.5 space-y-2">
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                                <div className="px-1 py-1.5 rounded-lg bg-orange-50 border border-orange-100">
                                        <Utensils className="w-3 h-3 mx-auto text-orange-600 mb-0.5" />
                                        <div className="text-[9px] text-orange-700 font-black truncate">{RESTAURANT.cuisine}</div>
                                </div>
                                <div className="px-1 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                                        <DollarSign className="w-3 h-3 mx-auto text-emerald-600 mb-0.5" />
                                        <div className="text-2xs text-emerald-700 font-black">{RESTAURANT.price}</div>
                                </div>
                                <div className="px-1 py-1.5 rounded-lg bg-amber-50 border border-amber-100">
                                        <Trophy className="w-3 h-3 mx-auto text-amber-600 mb-0.5" />
                                        <div className="text-[9px] text-amber-700 font-black truncate">Top 50</div>
                                </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-2xs text-slate-500">
                                <Clock className="w-3 h-3" /> {RESTAURANT.date}
                        </div>
                        <a href="#" className="w-full inline-flex items-center justify-center gap-1.5 bg-orange-600 text-white text-2xs font-black px-3 py-2 rounded-lg shadow shadow-orange-500/30">
                                <MapPin className="w-3 h-3" /> ניווט בגוגל מפות
                        </a>
                </div>
        </div>
);

// =============================================================================
// PAGE
// =============================================================================
const Slot: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
        <div className="flex flex-col items-center gap-2">
                <span className="text-2xs font-black text-slate-500 uppercase tracking-widest">{label}</span>
                <div>{children}</div>
        </div>
);

const Section: React.FC<{ title: string; sub: string; children: React.ReactNode }> = ({ title, sub, children }) => (
        <section className="bg-white rounded-2xl p-5 shadow-md">
                <header className="mb-4">
                        <h2 className="font-black text-brand-navy text-lg">{title}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                </header>
                <div className="flex flex-wrap items-start gap-6 justify-center">{children}</div>
        </section>
);

export const PopupPreview: React.FC = () => (
        <div className="min-h-screen bg-slate-100 p-4 md:p-8 font-rubik" dir="rtl">
                <div className="max-w-5xl mx-auto space-y-6">
                        <header className="text-center pt-4 pb-2">
                                <h1 className="text-2xl md:text-3xl font-black text-brand-navy">3 אופציות לפופ-אפ של מלון ומסעדה במפה</h1>
                                <p className="text-sm text-slate-500 mt-1">בחר אופציה אחת לכל סוג. כל פופ-אפ נראה כפי שיופיע במפה הממשית.</p>
                        </header>

                        <Section title="🏨 פופ-אפ של מלון" sub="הצג עכשיו (CURRENT) מול 3 אופציות חדשות">
                                <Slot label="עכשיו"><CurrentHotel /></Slot>
                                <Slot label="A · Image hero + chips"><HotelA /></Slot>
                                <Slot label="B · Horizontal compact"><HotelB /></Slot>
                                <Slot label="C · Bold header + stats grid"><HotelC /></Slot>
                        </Section>

                        <Section title="🍴 פופ-אפ של מסעדה" sub="הצג עכשיו מול 3 אופציות חדשות">
                                <Slot label="עכשיו"><CurrentRestaurant /></Slot>
                                <Slot label="A · Image hero + chips"><RestoA /></Slot>
                                <Slot label="B · Horizontal compact"><RestoB /></Slot>
                                <Slot label="C · Magazine card"><RestoC /></Slot>
                        </Section>

                        <footer className="text-center pt-4 pb-12">
                                <p className="text-sm text-slate-500">בחר A / B / C לכל סוג, וכתוב לי. אז אטמיע ב-MapItemPopup.</p>
                        </footer>
                </div>
        </div>
);
