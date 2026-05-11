/**
 * Airbnb-flavored design preview components.
 *
 * Tokens (see ../DESIGN_NOTES.md for source citations):
 *   - Primary accent: #FF385C (Rausch)
 *   - Background: #FFFFFF / #F7F7F7
 *   - Text: #222 / #717171
 *   - Type scale: 14/16/18/22/28, weights 400/500/600
 *   - Card radius: rounded-xl (12px)
 *   - Shadow: very soft (shadow-sm with custom rgba)
 *   - Photo: aspect-square or aspect-[4/5], rounded-xl
 *   - Hero gesture: heart (favorite) top-right
 */

import React from 'react';
import { Star, Heart, MapPin, Clock, ChevronRight, Plus } from 'lucide-react';
import type { PreviewPlace, PreviewHotel, PreviewItineraryItem, PreviewBudgetCategory } from '../fixtures';
import { previewBudgetTotal } from '../fixtures';

const AIRBNB_PINK = '#FF385C';
const cardBaseClasses =
  'group relative bg-white rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 ' +
  '[box-shadow:0_2px_8px_rgba(0,0,0,0.05)] hover:[box-shadow:0_4px_12px_rgba(0,0,0,0.08)] cursor-pointer';

export const AirbnbPlaceCard: React.FC<{ place: PreviewPlace }> = ({ place }) => (
  <article className={cardBaseClasses} dir="rtl">
    <div className="relative aspect-[4/5] overflow-hidden">
      <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
      <button
        aria-label="Save to favorites"
        className="absolute top-3 left-3 p-2 rounded-full bg-white/0 hover:bg-white/20 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-colors"
      >
        <Heart className="w-6 h-6" strokeWidth={2.5} fill="rgba(0,0,0,0.4)" />
      </button>
      {place.recommendationSource && (
        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-white text-[11px] font-semibold text-[#222]">
          {place.recommendationSource}
        </span>
      )}
    </div>
    <div className="p-4 space-y-1">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-[16px] text-[#222] truncate flex-1" style={{ letterSpacing: '-0.01em' }}>
          {place.name}
        </h3>
        <div className="flex items-center gap-1 text-[14px] text-[#222] flex-shrink-0">
          <Star className="w-3.5 h-3.5 fill-[#222]" />
          <span className="font-medium">{place.rating}</span>
          <span className="text-[#717171]">({place.reviewCount.toLocaleString()})</span>
        </div>
      </div>
      <p className="text-[14px] text-[#717171]">{place.cuisine} · {place.city}</p>
      <p className="text-[14px] text-[#222] line-clamp-2">{place.description}</p>
      <p className="text-[14px] text-[#222] pt-1">
        <span className="font-semibold">{place.priceLevel}</span>
        <span className="text-[#717171]"> · {place.walkingMinutes} דק' הליכה</span>
      </p>
    </div>
  </article>
);

export const AirbnbPlaceModal: React.FC<{ place: PreviewPlace }> = ({ place }) => (
  <div className="bg-white rounded-2xl overflow-hidden max-w-2xl mx-auto [box-shadow:0_8px_32px_rgba(0,0,0,0.12)]" dir="rtl">
    <div className="relative aspect-[16/9] bg-zinc-100">
      <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
    </div>
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-[28px] font-semibold text-[#222]" style={{ letterSpacing: '-0.02em' }}>{place.name}</h2>
          <p className="text-[16px] text-[#717171]">{place.cuisine} · {place.city}</p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 border border-zinc-200 rounded-full">
          <Star className="w-4 h-4 fill-[#222]" />
          <span className="font-semibold text-[#222]">{place.rating}</span>
          <span className="text-[#717171] text-[14px]">· {place.reviewCount.toLocaleString()} ביקורות</span>
        </div>
      </div>
      <p className="text-[16px] text-[#222] leading-relaxed">{place.description}</p>
      <div className="border-t border-zinc-200 pt-4 space-y-2">
        {place.openingHours && (
          <div className="flex items-center gap-2 text-[14px] text-[#222]">
            <Clock className="w-4 h-4 text-[#717171]" />
            <span>פתוח היום: {place.openingHours}</span>
            {place.isOpenNow && <span className="text-emerald-600 font-medium">· פתוח עכשיו</span>}
          </div>
        )}
        <div className="flex items-center gap-2 text-[14px] text-[#222]">
          <MapPin className="w-4 h-4 text-[#717171]" />
          <span>{place.walkingMinutes} דקות הליכה מהמלון</span>
        </div>
      </div>
      <button
        className="w-full py-3 rounded-lg font-semibold text-white text-[16px] hover:opacity-90 transition-opacity"
        style={{ background: `linear-gradient(135deg, ${AIRBNB_PINK} 0%, #E61E4D 100%)` }}
      >
        הוסף לטיול שלי
      </button>
    </div>
  </div>
);

export const AirbnbPageHeader: React.FC = () => (
  <header className="bg-white border-b border-zinc-200 px-6 py-4" dir="rtl">
    <div className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-2">
        <span className="text-[24px] font-semibold" style={{ color: AIRBNB_PINK, letterSpacing: '-0.02em' }}>
          ✈ travelplanner
        </span>
      </div>
      <nav className="flex items-center gap-1">
        {['מקומות', 'אטרקציות', 'מלונות', 'תקציב'].map((label, i) => (
          <button
            key={label}
            className={`px-4 py-2 text-[14px] font-medium rounded-full transition-colors ${
              i === 0 ? 'bg-[#F7F7F7] text-[#222]' : 'text-[#717171] hover:bg-[#F7F7F7]'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <button className="px-4 py-2 rounded-full border border-zinc-300 text-[14px] font-semibold text-[#222] hover:shadow-sm">
        חפש
      </button>
    </div>
  </header>
);

export const AirbnbCategoryChips: React.FC = () => {
  const chips = ['הכל', 'מומלצים', 'מישלן', 'אסיאתי', 'מאפיות', 'ים-תיכון', 'משפחתי'];
  return (
    <div className="flex gap-8 px-6 py-3 overflow-x-auto" dir="rtl">
      {chips.map((c, i) => (
        <button
          key={c}
          className={`flex flex-col items-center gap-1.5 pb-2 border-b-2 whitespace-nowrap transition-colors ${
            i === 1 ? 'border-[#222] text-[#222]' : 'border-transparent text-[#717171] hover:text-[#222]'
          }`}
        >
          <span className="text-2xl">{['🌐', '⭐', '💎', '🍜', '🥐', '🍝', '👨‍👩‍👧'][i]}</span>
          <span className="text-[12px] font-medium">{c}</span>
        </button>
      ))}
    </div>
  );
};

export const AirbnbHotelCard: React.FC<{ hotel: PreviewHotel }> = ({ hotel }) => (
  <article className={cardBaseClasses} dir="rtl">
    <div className="relative aspect-[4/3] overflow-hidden">
      <img src={hotel.photoUrl} alt={hotel.name} className="w-full h-full object-cover" />
      <button className="absolute top-3 left-3 p-2 rounded-full text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
        <Heart className="w-6 h-6" strokeWidth={2.5} fill="rgba(0,0,0,0.4)" />
      </button>
    </div>
    <div className="p-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-[16px] text-[#222]" style={{ letterSpacing: '-0.01em' }}>{hotel.name}</h3>
        <div className="flex items-center gap-1 text-[14px] text-[#222]">
          <Star className="w-3.5 h-3.5 fill-[#222]" />
          {hotel.rating}
        </div>
      </div>
      <p className="text-[14px] text-[#717171]">{hotel.city}</p>
      <p className="text-[14px] text-[#717171]">{hotel.checkIn} – {hotel.checkOut} · {hotel.nights} לילות</p>
      <p className="text-[14px] text-[#222] mt-2"><span className="font-semibold">${hotel.pricePerNight}</span> ללילה</p>
    </div>
  </article>
);

export const AirbnbItineraryDayCard: React.FC<{ items: PreviewItineraryItem[]; day: number; date: string }> = ({
  items,
  day,
  date,
}) => (
  <section className="bg-white rounded-2xl p-6 [box-shadow:0_2px_8px_rgba(0,0,0,0.05)]" dir="rtl">
    <header className="flex items-baseline justify-between mb-4">
      <h3 className="text-[22px] font-semibold text-[#222]" style={{ letterSpacing: '-0.02em' }}>יום {day}</h3>
      <span className="text-[14px] text-[#717171]">{date}</span>
    </header>
    <ol className="space-y-3">
      {items.map(item => (
        <li key={item.id} className="flex items-start gap-3 group hover:bg-[#F7F7F7] -mx-2 px-2 py-2 rounded-lg cursor-pointer transition-colors">
          <span className="text-[14px] font-mono font-medium text-[#717171] w-12 flex-shrink-0 pt-0.5">{item.time}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-medium text-[#222]">{item.title}</p>
            {item.notes && <p className="text-[13px] text-[#717171] mt-0.5">{item.notes}</p>}
          </div>
          <ChevronRight className="w-4 h-4 text-[#717171] opacity-0 group-hover:opacity-100 transition-opacity" />
        </li>
      ))}
    </ol>
  </section>
);

export const AirbnbBudgetCard: React.FC<{ categories: PreviewBudgetCategory[] }> = ({ categories }) => {
  const totalSpent = previewBudgetTotal.spent;
  const totalBudget = previewBudgetTotal.budget;
  const percent = Math.round((totalSpent / totalBudget) * 100);
  return (
    <section className="bg-white rounded-2xl p-6 [box-shadow:0_2px_8px_rgba(0,0,0,0.05)]" dir="rtl">
      <header className="mb-5">
        <p className="text-[14px] text-[#717171]">תקציב טיול</p>
        <p className="text-[28px] font-semibold text-[#222]" style={{ letterSpacing: '-0.02em' }}>
          ${totalSpent.toLocaleString()} <span className="text-[16px] text-[#717171] font-normal">/ ${totalBudget.toLocaleString()}</span>
        </p>
        <div className="mt-3 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${percent}%`, background: AIRBNB_PINK }} />
        </div>
      </header>
      <ul className="space-y-3">
        {categories.map(c => {
          const p = Math.round((c.spent / c.budget) * 100);
          return (
            <li key={c.id} className="flex items-center justify-between gap-3">
              <span className="text-[14px] text-[#222]">{c.emoji} {c.label}</span>
              <span className="text-[14px] text-[#717171]">
                ${c.spent} <span className="text-[12px]">/ ${c.budget}</span>
                <span className={`ms-2 text-[12px] font-medium ${p > 90 ? 'text-rose-600' : 'text-emerald-600'}`}>{p}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export const AirbnbMapViewSkin: React.FC = () => (
  <div className="rounded-2xl overflow-hidden [box-shadow:0_2px_8px_rgba(0,0,0,0.05)]" dir="rtl">
    <div className="relative aspect-[4/3] bg-gradient-to-br from-emerald-50 to-sky-100">
      {/* Mock map pins — Airbnb-style price pills */}
      {[
        { x: 30, y: 40, label: '$$$' },
        { x: 60, y: 25, label: '$' },
        { x: 45, y: 65, label: '$$' },
        { x: 75, y: 55, label: '$$$$' },
      ].map((p, i) => (
        <button
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full bg-white border border-zinc-300 text-[12px] font-semibold text-[#222] [box-shadow:0_2px_8px_rgba(0,0,0,0.12)] hover:scale-110 transition-transform"
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          {p.label}
        </button>
      ))}
      <span className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-white text-[12px] font-medium text-[#222] [box-shadow:0_2px_4px_rgba(0,0,0,0.1)]">
        4 מקומות באזור
      </span>
    </div>
  </div>
);
