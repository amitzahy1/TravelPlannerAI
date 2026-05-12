/** 4 banner variants for the home page hero. Premium-travel vibe. */
import React from 'react';
import { MapPin, Utensils, Hotel, Plane, FileText, Calendar, ChevronLeft } from 'lucide-react';
import {
  TRIP_NAME, TRIP_DATES, TRIP_COUNTDOWN_DAYS, TRIP_CITIES,
  HERO_PHOTO, ACCENT, ACCENT_SOFT,
} from './fixtures';

const stats = { places: 12, food: 27, hotels: 4, flights: 5 };

/** A — Compact horizontal strip (slim, photo-less, content-first) */
export const BannerA: React.FC = () => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" dir="rtl">
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: ACCENT_SOFT, color: ACCENT }}>
          <Plane className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-900 tracking-tight truncate">{TRIP_NAME}</h2>
          <p className="text-xs text-slate-500 font-medium">{TRIP_DATES} · {TRIP_CITIES.map(c => c.name).join(' · ')}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: ACCENT_SOFT, color: ACCENT }}>
          <Calendar className="w-3 h-3" /> עוד {TRIP_COUNTDOWN_DAYS} ימים
        </span>
        <div className="flex items-center gap-4 text-sm font-bold text-slate-700">
          <Stat icon={<MapPin className="w-3.5 h-3.5" />} value={stats.places} label="מקומות" />
          <Stat icon={<Utensils className="w-3.5 h-3.5" />} value={stats.food} label="אוכל" />
          <Stat icon={<Hotel className="w-3.5 h-3.5" />} value={stats.hotels} label="מלונות" />
          <Stat icon={<Plane className="w-3.5 h-3.5" />} value={stats.flights} label="טיסות" />
        </div>
      </div>
    </div>
  </div>
);

/** B — Glassmorphic over hero (current pattern, refined) */
export const BannerB: React.FC = () => (
  <div className="relative h-56 rounded-3xl overflow-hidden shadow-xl" dir="rtl">
    <img src={HERO_PHOTO} alt="" className="absolute inset-0 w-full h-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
    <span className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/85 text-xs font-black text-slate-900">
      <Plane className="w-3.5 h-3.5" style={{ color: ACCENT }} />
      עוד {TRIP_COUNTDOWN_DAYS} ימים
    </span>
    <button className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/85 text-xs font-bold text-slate-900 hover:bg-white">
      <FileText className="w-3.5 h-3.5" /> ייצא PDF
    </button>
    <div className="absolute bottom-4 inset-x-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">{TRIP_NAME}</h2>
        <p className="text-sm font-bold text-white/90 drop-shadow mt-1">{TRIP_CITIES.map(c => `${c.name} (${c.nights} לילות)`).join(' · ')}</p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {[
          { i: <MapPin className="w-4 h-4" />, v: stats.places, l: 'מקומות' },
          { i: <Utensils className="w-4 h-4" />, v: stats.food, l: 'אוכל' },
          { i: <Hotel className="w-4 h-4" />, v: stats.hotels, l: 'מלונות' },
          { i: <Plane className="w-4 h-4" />, v: stats.flights, l: 'טיסות' },
        ].map((s, i) => (
          <div key={i} className="px-3 py-2 rounded-xl backdrop-blur-md bg-white/15 border border-white/20 text-white text-center min-w-[58px]">
            <div className="flex justify-center mb-0.5 opacity-80">{s.i}</div>
            <div className="text-lg font-black leading-none">{s.v}</div>
            <div className="text-[10px] font-bold uppercase opacity-70 mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** C — Stat-tile grid (each metric is its own card, photo as side accent) */
export const BannerC: React.FC = () => (
  <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm" dir="rtl">
    <div className="flex flex-col md:flex-row">
      <div className="md:w-2/5 relative">
        <img src={HERO_PHOTO} alt="" className="w-full h-44 md:h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent md:bg-gradient-to-r" />
        <div className="absolute bottom-4 right-4 md:bottom-auto md:top-1/2 md:-translate-y-1/2">
          <h2 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">{TRIP_NAME}</h2>
          <p className="text-sm font-bold text-white/85 drop-shadow mt-1">{TRIP_DATES}</p>
          <span className="inline-flex items-center gap-1 mt-3 px-2.5 py-1 rounded-full text-xs font-bold bg-white/90 text-slate-900">
            עוד {TRIP_COUNTDOWN_DAYS} ימים
          </span>
        </div>
      </div>
      <div className="md:w-3/5 p-5 grid grid-cols-2 gap-3">
        {[
          { i: <MapPin />, v: stats.places, l: 'מקומות' },
          { i: <Utensils />, v: stats.food, l: 'אוכל' },
          { i: <Hotel />, v: stats.hotels, l: 'מלונות' },
          { i: <Plane />, v: stats.flights, l: 'טיסות' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-50 rounded-2xl p-4 hover:bg-slate-100 cursor-pointer transition-colors">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: ACCENT_SOFT, color: ACCENT }}>
              {React.cloneElement(s.i as React.ReactElement<any>, { className: 'w-5 h-5' })}
            </div>
            <p className="text-2xl font-black text-slate-900 leading-none">{s.v}</p>
            <p className="text-xs font-bold text-slate-500 uppercase mt-1">{s.l}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/** D — Story-card portrait (mobile-first, vertical, photo-immersive) */
export const BannerD: React.FC = () => (
  <div className="rounded-3xl overflow-hidden shadow-xl relative bg-slate-900 h-[420px] max-w-sm mx-auto" dir="rtl">
    <img src={HERO_PHOTO} alt="" className="absolute inset-0 w-full h-full object-cover" />
    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-transparent to-slate-900/95" />
    <div className="absolute top-4 inset-x-4 flex items-center justify-between">
      <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full backdrop-blur-md bg-white/90 text-[11px] font-black text-slate-900">
        🛫 עוד {TRIP_COUNTDOWN_DAYS} ימים
      </span>
      <span className="text-xs font-bold text-white/90 drop-shadow">{TRIP_DATES}</span>
    </div>
    <div className="absolute bottom-0 inset-x-0 p-5 space-y-3">
      <h2 className="text-4xl font-black text-white tracking-tighter drop-shadow-2xl">{TRIP_NAME}</h2>
      <p className="text-sm font-bold text-white/90 drop-shadow">{TRIP_CITIES.map(c => c.name).join(' → ')}</p>
      <div className="grid grid-cols-4 gap-2 mt-4">
        {[
          { i: '📍', v: stats.places, l: 'מקומות' },
          { i: '🍽️', v: stats.food, l: 'אוכל' },
          { i: '🏨', v: stats.hotels, l: 'מלונות' },
          { i: '✈️', v: stats.flights, l: 'טיסות' },
        ].map((s, i) => (
          <div key={i} className="text-center backdrop-blur-md bg-white/10 border border-white/15 rounded-xl py-2">
            <div className="text-lg">{s.i}</div>
            <div className="text-xl font-black text-white leading-none">{s.v}</div>
            <div className="text-[9px] font-bold text-white/70 uppercase mt-0.5">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const Stat: React.FC<{ icon: React.ReactNode; value: number; label: string }> = ({ icon, value, label }) => (
  <span className="inline-flex items-center gap-1 text-slate-700">
    <span style={{ color: ACCENT }}>{icon}</span>
    <span className="text-base font-black text-slate-900">{value}</span>
    <span className="text-xs text-slate-500">{label}</span>
  </span>
);

export const BANNER_VARIANTS = [
  { id: 'A', title: 'A — Compact strip', subtitle: 'דק וצפוף; פחות תמונה, יותר מקום לתוכן', Component: BannerA },
  { id: 'B', title: 'B — Glassmorphic hero', subtitle: 'תמונה גדולה, סטטיסטיקה צפה מעל זכוכית', Component: BannerB },
  { id: 'C', title: 'C — Tile grid', subtitle: 'כל מטריקה ככרטיס משלה ליד התמונה', Component: BannerC },
  { id: 'D', title: 'D — Story card', subtitle: 'אנכי, מובייל-פירסט, סגנון אינסטגרם-סטורי', Component: BannerD },
];
