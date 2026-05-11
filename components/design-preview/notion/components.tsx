/**
 * Notion / Linear-flavored design preview components.
 *
 * Tokens (see ../DESIGN_NOTES.md):
 *   - Primary accent: #5E6AD2 (Linear indigo)
 *   - Background: #FAFAF9 / #FFFFFF cards
 *   - Text: #18181B / #71717A
 *   - Type: Inter, scale 12/13/14/16/20/28, weight 400/500/600/700
 *   - Letter-spacing: tracking-tight on headings
 *   - Card radius: rounded-md (6px) — NOT rounded-full pills
 *   - NO shadows; border border-zinc-200 + divide-y
 *   - Photo: small thumbnail OR absent — typography-driven
 *   - Density: space-y-6, p-5
 */

import React from 'react';
import { Star, Clock, MapPin, ChevronLeft, Circle } from 'lucide-react';
import type { PreviewPlace, PreviewHotel, PreviewItineraryItem, PreviewBudgetCategory } from '../fixtures';
import { previewBudgetTotal } from '../fixtures';

const LINEAR_INDIGO = '#5E6AD2';
const cardBase = 'bg-white rounded-md border border-zinc-200 hover:border-zinc-300 transition-colors cursor-pointer';

export const NotionPlaceCard: React.FC<{ place: PreviewPlace }> = ({ place }) => (
  <article className={`${cardBase} p-5`} dir="rtl">
    <div className="flex gap-4">
      <img
        src={place.photoUrl}
        alt={place.name}
        className="w-16 h-16 rounded-md object-cover flex-shrink-0 border border-zinc-100"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1">
          <h3 className="text-[16px] font-bold text-zinc-900 truncate flex-1 tracking-tight">{place.name}</h3>
          <span className="text-[12px] text-zinc-500 font-medium font-mono flex-shrink-0">{place.priceLevel}</span>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-zinc-500 mb-2">
          <span className="font-medium text-zinc-700">{place.rating}</span>
          <span>·</span>
          <span>{place.reviewCount.toLocaleString()} ביקורות</span>
          <span>·</span>
          <span>{place.cuisine}</span>
          <span>·</span>
          <span>{place.walkingMinutes} דק' הליכה</span>
        </div>
        <p className="text-[13px] text-zinc-600 line-clamp-2 leading-relaxed">{place.description}</p>
        {place.recommendationSource && (
          <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-zinc-100">
            <Circle className="w-1.5 h-1.5 fill-zinc-400 text-zinc-400" />
            <span className="text-[11px] font-medium text-zinc-500 tracking-wide uppercase">
              {place.recommendationSource}
            </span>
          </div>
        )}
      </div>
    </div>
  </article>
);

export const NotionPlaceModal: React.FC<{ place: PreviewPlace }> = ({ place }) => (
  <div className="bg-white rounded-md border border-zinc-200 max-w-2xl mx-auto" dir="rtl">
    <header className="p-6 border-b border-zinc-200">
      <div className="flex items-center gap-2 text-[12px] text-zinc-500 mb-2 font-medium">
        <span>{place.city}</span>
        <span>/</span>
        <span>{place.cuisine}</span>
      </div>
      <h2 className="text-[28px] font-bold text-zinc-900 tracking-tight">{place.name}</h2>
      <div className="flex items-center gap-3 mt-3 text-[14px] text-zinc-600">
        <span className="flex items-center gap-1 font-medium text-zinc-900">
          <Star className="w-4 h-4 fill-zinc-900" />
          {place.rating}
        </span>
        <span className="text-zinc-400">·</span>
        <span>{place.reviewCount.toLocaleString()} ביקורות</span>
        <span className="text-zinc-400">·</span>
        <span className="font-mono font-semibold">{place.priceLevel}</span>
        {place.isOpenNow && (
          <>
            <span className="text-zinc-400">·</span>
            <span className="flex items-center gap-1 text-emerald-700 font-medium">
              <Circle className="w-2 h-2 fill-emerald-600 text-emerald-600" />
              פתוח עכשיו
            </span>
          </>
        )}
      </div>
    </header>
    <img src={place.photoUrl} alt={place.name} className="w-full aspect-[3/1] object-cover border-b border-zinc-200" />
    <div className="p-6 space-y-5">
      <section>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">תיאור</h3>
        <p className="text-[14px] text-zinc-700 leading-relaxed">{place.description}</p>
      </section>
      <section className="divide-y divide-zinc-100 border-t border-b border-zinc-100">
        <div className="flex justify-between py-2.5 text-[13px]">
          <span className="text-zinc-500">שעות פתיחה</span>
          <span className="text-zinc-900 font-medium">{place.openingHours}</span>
        </div>
        <div className="flex justify-between py-2.5 text-[13px]">
          <span className="text-zinc-500">מרחק</span>
          <span className="text-zinc-900 font-medium">{place.walkingMinutes} דקות הליכה</span>
        </div>
        <div className="flex justify-between py-2.5 text-[13px]">
          <span className="text-zinc-500">מקור</span>
          <span className="text-zinc-900 font-medium">{place.recommendationSource}</span>
        </div>
      </section>
      <button
        className="w-full py-2.5 rounded-md text-[14px] font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: LINEAR_INDIGO }}
      >
        הוסף לטיול
      </button>
    </div>
  </div>
);

export const NotionPageHeader: React.FC = () => (
  <header className="bg-white border-b border-zinc-200 px-6 py-3" dir="rtl">
    <div className="flex items-center justify-between gap-6">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md" style={{ background: LINEAR_INDIGO }} />
        <span className="text-[15px] font-bold tracking-tight text-zinc-900">travelplanner</span>
      </div>
      <nav className="flex items-center">
        {['מקומות', 'אטרקציות', 'מלונות', 'תקציב'].map((label, i) => (
          <button
            key={label}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors ${
              i === 0 ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
      <button className="px-3 py-1.5 rounded-md border border-zinc-200 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50">
        ⌘K חיפוש
      </button>
    </div>
  </header>
);

export const NotionCategoryChips: React.FC = () => {
  const chips = [
    { label: 'הכל', count: 168 },
    { label: 'מישלן', count: 14 },
    { label: 'אסיאתי', count: 42 },
    { label: 'איטלקי', count: 18 },
    { label: 'מאפיות', count: 9 },
    { label: 'משפחתי', count: 22 },
  ];
  return (
    <div className="flex gap-1 px-6 py-2 border-b border-zinc-200 bg-white overflow-x-auto" dir="rtl">
      {chips.map((c, i) => (
        <button
          key={c.label}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md whitespace-nowrap text-[13px] font-medium transition-colors ${
            i === 0
              ? 'bg-zinc-100 text-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-50'
          }`}
        >
          {c.label}
          <span className="text-[11px] text-zinc-400 font-mono">{c.count}</span>
        </button>
      ))}
    </div>
  );
};

export const NotionHotelCard: React.FC<{ hotel: PreviewHotel }> = ({ hotel }) => (
  <article className={`${cardBase} p-5`} dir="rtl">
    <div className="flex gap-4">
      <img
        src={hotel.photoUrl}
        alt={hotel.name}
        className="w-20 h-20 rounded-md object-cover flex-shrink-0 border border-zinc-100"
      />
      <div className="flex-1 min-w-0">
        <h3 className="text-[16px] font-bold text-zinc-900 tracking-tight mb-1">{hotel.name}</h3>
        <p className="text-[13px] text-zinc-500 mb-2">
          {hotel.city} · {hotel.checkIn} → {hotel.checkOut} · {hotel.nights} לילות
        </p>
        <div className="flex items-center gap-3 text-[13px]">
          <span className="font-bold text-zinc-900 font-mono">${hotel.pricePerNight}/לילה</span>
          <span className="text-zinc-400">·</span>
          <span className="flex items-center gap-0.5 text-zinc-700 font-medium">
            <Star className="w-3.5 h-3.5 fill-zinc-700" />
            {hotel.rating}
          </span>
        </div>
      </div>
    </div>
  </article>
);

export const NotionItineraryDayCard: React.FC<{ items: PreviewItineraryItem[]; day: number; date: string }> = ({
  items,
  day,
  date,
}) => (
  <section className={cardBase} dir="rtl">
    <header className="flex items-baseline justify-between px-5 py-3 border-b border-zinc-200">
      <h3 className="text-[14px] font-bold text-zinc-900 tracking-tight">
        יום {day}
        <span className="text-zinc-400 font-medium ms-2">{date}</span>
      </h3>
      <span className="text-[11px] text-zinc-400 font-mono">{items.length} items</span>
    </header>
    <ol className="divide-y divide-zinc-100">
      {items.map(item => (
        <li
          key={item.id}
          className="flex items-center gap-3 px-5 py-2.5 hover:bg-zinc-50 cursor-pointer transition-colors group"
        >
          <span className="text-[12px] font-mono text-zinc-400 w-12 flex-shrink-0">{item.time}</span>
          <Circle className="w-1.5 h-1.5 fill-zinc-300 text-zinc-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-medium text-zinc-900 truncate">{item.title}</p>
            {item.notes && <p className="text-[12px] text-zinc-500 truncate">{item.notes}</p>}
          </div>
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {item.type}
          </span>
        </li>
      ))}
    </ol>
  </section>
);

export const NotionBudgetCard: React.FC<{ categories: PreviewBudgetCategory[] }> = ({ categories }) => {
  const percent = Math.round((previewBudgetTotal.spent / previewBudgetTotal.budget) * 100);
  return (
    <section className={`${cardBase} p-5`} dir="rtl">
      <header className="mb-4">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-bold mb-1">תקציב</p>
        <div className="flex items-baseline gap-2">
          <p className="text-[28px] font-bold text-zinc-900 tracking-tight font-mono">
            ${previewBudgetTotal.spent.toLocaleString()}
          </p>
          <span className="text-[14px] text-zinc-500 font-mono">/ ${previewBudgetTotal.budget.toLocaleString()}</span>
          <span className="text-[12px] font-bold text-zinc-700 ms-auto font-mono">{percent}%</span>
        </div>
        <div className="h-0.5 rounded-full bg-zinc-100 mt-3 overflow-hidden">
          <div className="h-full" style={{ width: `${percent}%`, background: LINEAR_INDIGO }} />
        </div>
      </header>
      <ul className="divide-y divide-zinc-100 -mx-5">
        {categories.map(c => {
          const p = Math.round((c.spent / c.budget) * 100);
          return (
            <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-zinc-50">
              <span className="text-[13px] text-zinc-900 font-medium">{c.emoji} {c.label}</span>
              <span className="text-[13px] font-mono text-zinc-600">
                ${c.spent}<span className="text-zinc-400"> / ${c.budget}</span>
                <span className={`ms-2 font-semibold text-[12px] ${p > 90 ? 'text-rose-700' : 'text-zinc-700'}`}>{p}%</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export const NotionMapViewSkin: React.FC = () => (
  <div className={cardBase} dir="rtl">
    <div className="relative aspect-[4/3] bg-zinc-50">
      {/* Monochrome map with single accent for selection */}
      {[
        { x: 30, y: 40, selected: false },
        { x: 60, y: 25, selected: true },
        { x: 45, y: 65, selected: false },
        { x: 75, y: 55, selected: false },
      ].map((p, i) => (
        <button
          key={i}
          className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125 ${
            p.selected ? '' : 'opacity-70'
          }`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
        >
          <div
            className={`w-3 h-3 rounded-full border-2 border-white ${p.selected ? '' : 'bg-zinc-700'}`}
            style={p.selected ? { background: LINEAR_INDIGO } : {}}
          />
        </button>
      ))}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5">
        {['Bangkok', 'Pattaya', 'Ko Chang'].map((c, i) => (
          <button
            key={c}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors ${
              i === 0
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  </div>
);
