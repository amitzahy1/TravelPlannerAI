/**
 * Wolt-flavored design preview components.
 *
 * Tokens (see ../DESIGN_NOTES.md):
 *   - Primary accent: #00C2E8 (cyan), Navy #0E1217 for text
 *   - Background: #F4F4F5 page / #FFFFFF cards
 *   - Type: Inter Tight, 14/15/20/24, weights 500/600/700
 *   - Card radius: rounded-lg (8px)
 *   - Border (NOT shadow): border border-zinc-200
 *   - Photo aspect: 16/10 with overlay chips
 *   - Rating: prominent yellow pill
 *   - Density: gap-3, p-3
 */

import React from 'react';
import { Star, Clock, MapPin, Heart, Flame, Plus, ChevronRight } from 'lucide-react';
import type { PreviewPlace, PreviewHotel, PreviewItineraryItem, PreviewBudgetCategory } from '../fixtures';
import { previewBudgetTotal } from '../fixtures';

const WOLT_CYAN = '#00C2E8';
const WOLT_NAVY = '#0E1217';

const cardBaseClasses =
  'group relative bg-white rounded-lg overflow-hidden border border-zinc-200 hover:border-zinc-300 transition-colors cursor-pointer';

export const WoltPlaceCard: React.FC<{ place: PreviewPlace }> = ({ place }) => (
  <article className={cardBaseClasses} dir="rtl">
    <div className="relative aspect-[16/10] overflow-hidden bg-zinc-100">
      <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
      {/* Overlay chips bottom-left, Wolt-style */}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5 max-w-[80%]">
        {place.isOpenNow && (
          <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[11px] font-semibold">
            פתוח
          </span>
        )}
        <span className="px-2 py-0.5 rounded-md bg-white/95 text-[#0E1217] text-[11px] font-semibold">
          {place.walkingMinutes} דק' · {place.priceLevel}
        </span>
      </div>
      <button className="absolute top-2 left-2 p-1.5 rounded-full bg-white/95 hover:bg-white">
        <Heart className="w-4 h-4 text-[#0E1217]" strokeWidth={2.5} />
      </button>
    </div>
    <div className="p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-[15px] text-[#0E1217] truncate flex-1 leading-tight">{place.name}</h3>
        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-900 text-[12px] font-bold flex-shrink-0">
          <Star className="w-3 h-3 fill-yellow-600 text-yellow-600" />
          {place.rating}
        </span>
      </div>
      <p className="text-[13px] text-zinc-600 font-medium">{place.cuisine}</p>
      <div className="flex items-center gap-1.5 pt-0.5">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 text-[11px] font-semibold">
          <Flame className="w-3 h-3" />
          חריף
        </span>
        <span className="text-[12px] text-zinc-500">{place.reviewCount.toLocaleString()} ביקורות</span>
      </div>
    </div>
  </article>
);

export const WoltPlaceModal: React.FC<{ place: PreviewPlace }> = ({ place }) => (
  <div className="bg-white rounded-2xl overflow-hidden max-w-2xl mx-auto border border-zinc-200" dir="rtl">
    <div className="relative aspect-[16/9] bg-zinc-100">
      <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
      <div className="absolute bottom-4 left-4 flex gap-2">
        {place.isOpenNow && (
          <span className="px-2.5 py-1 rounded-md bg-emerald-500 text-white text-[12px] font-bold">פתוח עכשיו</span>
        )}
        <span className="px-2.5 py-1 rounded-md bg-white text-[#0E1217] text-[12px] font-bold">
          {place.walkingMinutes} דק' הליכה
        </span>
      </div>
    </div>
    <div className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[24px] font-bold text-[#0E1217] leading-tight">{place.name}</h2>
          <p className="text-[14px] text-zinc-600 font-medium mt-0.5">{place.cuisine} · {place.city}</p>
        </div>
        <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-yellow-100 text-yellow-900 text-[14px] font-bold flex-shrink-0">
          <Star className="w-4 h-4 fill-yellow-600 text-yellow-600" />
          {place.rating}
          <span className="text-yellow-800 font-medium text-[12px]">({place.reviewCount.toLocaleString()})</span>
        </span>
      </div>
      <p className="text-[14px] text-zinc-700 leading-relaxed">{place.description}</p>
      <div className="flex flex-wrap gap-2 py-2">
        <span className="px-2 py-1 rounded-md bg-rose-50 text-rose-700 text-[12px] font-semibold">🌶️ חריף</span>
        <span className="px-2 py-1 rounded-md bg-green-50 text-green-700 text-[12px] font-semibold">🥗 בריא</span>
        <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-700 text-[12px] font-semibold">⭐ מומלץ</span>
      </div>
      <div className="border-t border-zinc-200 pt-3 space-y-1.5">
        <p className="flex items-center gap-2 text-[13px] text-[#0E1217]">
          <Clock className="w-4 h-4 text-zinc-500" /> {place.openingHours}
        </p>
        <p className="flex items-center gap-2 text-[13px] text-[#0E1217]">
          <MapPin className="w-4 h-4 text-zinc-500" /> {place.walkingMinutes} דקות הליכה מהמלון
        </p>
      </div>
      <button
        className="w-full py-3 rounded-lg font-bold text-white text-[15px] transition-opacity hover:opacity-90"
        style={{ background: WOLT_CYAN }}
      >
        הוסף לטיול
      </button>
    </div>
  </div>
);

export const WoltPageHeader: React.FC = () => (
  <header className="bg-white border-b border-zinc-200 px-5 py-3" dir="rtl">
    <div className="flex items-center justify-between gap-4">
      <span className="text-[20px] font-bold text-[#0E1217]">
        <span style={{ color: WOLT_CYAN }}>●</span> travelplanner
      </span>
      <nav className="flex items-center gap-1">
        {['מקומות', 'אטרקציות', 'מלונות', 'תקציב'].map((label, i) => (
          <button
            key={label}
            className={`px-3.5 py-1.5 text-[13px] font-bold rounded-full transition-colors ${
              i === 0 ? 'bg-[#0E1217] text-white' : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <button className="px-3 py-1.5 rounded-full bg-[#0E1217] text-white text-[13px] font-bold hover:opacity-90">
        חפש
      </button>
    </div>
  </header>
);

export const WoltCategoryChips: React.FC = () => {
  const chips = [
    { label: 'הכל', emoji: '🌐', count: 168 },
    { label: 'מישלן', emoji: '💎', count: 14 },
    { label: 'אסיאתי', emoji: '🍜', count: 42 },
    { label: 'איטלקי', emoji: '🍕', count: 18 },
    { label: 'מאפיות', emoji: '🥐', count: 9 },
    { label: 'משפחתי', emoji: '👨‍👩‍👧', count: 22 },
    { label: 'חריף', emoji: '🌶️', count: 31 },
  ];
  return (
    <div className="flex gap-2 px-5 py-3 overflow-x-auto bg-white border-b border-zinc-200" dir="rtl">
      {chips.map((c, i) => (
        <button
          key={c.label}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap text-[13px] font-semibold transition-colors ${
            i === 0
              ? 'bg-[#0E1217] text-white'
              : 'bg-zinc-100 text-[#0E1217] hover:bg-zinc-200'
          }`}
        >
          <span>{c.emoji}</span>
          <span>{c.label}</span>
          <span className={`text-[11px] ${i === 0 ? 'text-white/70' : 'text-zinc-500'}`}>{c.count}</span>
        </button>
      ))}
    </div>
  );
};

export const WoltHotelCard: React.FC<{ hotel: PreviewHotel }> = ({ hotel }) => (
  <article className={cardBaseClasses} dir="rtl">
    <div className="relative aspect-[16/10] overflow-hidden">
      <img src={hotel.photoUrl} alt={hotel.name} className="w-full h-full object-cover" />
      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-white/95 text-[#0E1217] text-[11px] font-semibold">
        {hotel.nights} לילות
      </span>
    </div>
    <div className="p-3 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-bold text-[15px] text-[#0E1217] leading-tight flex-1">{hotel.name}</h3>
        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-900 text-[12px] font-bold flex-shrink-0">
          <Star className="w-3 h-3 fill-yellow-600 text-yellow-600" />
          {hotel.rating}
        </span>
      </div>
      <p className="text-[12px] text-zinc-600 font-medium">{hotel.city} · {hotel.checkIn}</p>
      <p className="text-[14px] text-[#0E1217] font-bold pt-1">
        <span className="text-[18px]" style={{ color: WOLT_CYAN }}>${hotel.pricePerNight}</span>
        <span className="text-zinc-500 font-medium text-[12px]"> / לילה</span>
      </p>
    </div>
  </article>
);

export const WoltItineraryDayCard: React.FC<{ items: PreviewItineraryItem[]; day: number; date: string }> = ({
  items,
  day,
  date,
}) => (
  <section className="bg-white rounded-lg border border-zinc-200" dir="rtl">
    <header className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
      <h3 className="font-bold text-[16px] text-[#0E1217]">יום {day}</h3>
      <span className="text-[12px] text-zinc-600 font-medium">{date}</span>
    </header>
    <ol>
      {items.map(item => (
        <li
          key={item.id}
          className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 cursor-pointer border-b border-zinc-100 last:border-0 transition-colors"
        >
          <span className="px-2 py-1 rounded-md bg-zinc-100 text-[12px] font-mono font-bold text-[#0E1217] flex-shrink-0">
            {item.time}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-[#0E1217] truncate">{item.title}</p>
            {item.notes && <p className="text-[12px] text-zinc-500 truncate">{item.notes}</p>}
          </div>
          <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider flex-shrink-0">{item.type}</span>
        </li>
      ))}
    </ol>
  </section>
);

export const WoltBudgetCard: React.FC<{ categories: PreviewBudgetCategory[] }> = ({ categories }) => {
  const percent = Math.round((previewBudgetTotal.spent / previewBudgetTotal.budget) * 100);
  return (
    <section className="bg-white rounded-lg border border-zinc-200 p-4" dir="rtl">
      <header className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-[12px] text-zinc-600 font-semibold uppercase tracking-wider">תקציב</p>
          <p className="text-[24px] font-bold text-[#0E1217]">
            ${previewBudgetTotal.spent.toLocaleString()}
            <span className="text-[14px] text-zinc-500 font-medium"> / ${previewBudgetTotal.budget.toLocaleString()}</span>
          </p>
        </div>
        <span
          className="px-2 py-1 rounded-md text-[12px] font-bold"
          style={{ background: WOLT_CYAN, color: '#FFF' }}
        >
          {percent}%
        </span>
      </header>
      <div className="h-2 rounded-full bg-zinc-100 overflow-hidden mb-4">
        <div className="h-full rounded-full" style={{ width: `${percent}%`, background: WOLT_CYAN }} />
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {categories.map(c => {
          const p = Math.round((c.spent / c.budget) * 100);
          return (
            <li key={c.id} className="flex flex-col gap-1 p-2 rounded-md bg-zinc-50">
              <span className="text-[12px] text-zinc-600 font-medium">{c.emoji} {c.label}</span>
              <span className="text-[14px] font-bold text-[#0E1217]">
                ${c.spent}
                <span className={`text-[11px] font-semibold ms-1 ${p > 90 ? 'text-rose-600' : 'text-emerald-600'}`}>{p}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export const WoltMapViewSkin: React.FC = () => (
  <div className="rounded-lg overflow-hidden border border-zinc-200" dir="rtl">
    <div className="relative aspect-[4/3] bg-gradient-to-br from-sky-50 to-cyan-100">
      {[
        { x: 30, y: 40, color: 'bg-rose-500', icon: '🍜' },
        { x: 60, y: 25, color: 'bg-emerald-500', icon: '🥐' },
        { x: 45, y: 65, color: 'bg-amber-500', icon: '🍕' },
        { x: 75, y: 55, color: 'bg-violet-500', icon: '💎' },
      ].map((p, i) => (
        <button
          key={i}
          className={`absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full ${p.color} border-2 border-white text-white text-[14px] flex items-center justify-center shadow-md hover:scale-110 transition-transform`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          {p.icon}
        </button>
      ))}
      <div className="absolute top-3 inset-x-3 flex gap-1.5 overflow-x-auto">
        {['הכל', 'מסעדות', 'מלונות', 'אטרקציות'].map((l, i) => (
          <button
            key={l}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
              i === 0 ? 'bg-[#0E1217] text-white' : 'bg-white/95 text-[#0E1217]'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  </div>
);
