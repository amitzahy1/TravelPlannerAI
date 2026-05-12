/** Round 8 — 4 refined "list row" place card variants.
 *  Photo is FULL-height edge-to-edge (no thumbnail), no walking minutes,
 *  always show cuisine + recommendation source. */
import React from 'react';
import { Star, Trophy } from 'lucide-react';
import { previewPlaces, ACCENT, ACCENT_SOFT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, HAIRLINE } from './fixtures';

const place = previewPlaces[0];

/** A — Square photo right (full height 140px) */
export const PlaceA: React.FC = () => (
  <article className="flex bg-white rounded-2xl overflow-hidden cursor-pointer transition-shadow" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }} dir="rtl">
    <div className="flex-1 min-w-0 p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[16px] font-semibold tracking-tight" style={{ color: TEXT_PRIMARY }}>{place.name}</h3>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold flex-shrink-0" style={{ color: TEXT_PRIMARY }}>
          <Star className="w-3.5 h-3.5 fill-current" style={{ color: ACCENT }} /> {place.rating}
          <span className="font-normal" style={{ color: TEXT_MUTED }}>({place.reviewCount.toLocaleString()})</span>
        </span>
      </div>
      <p className="text-[13px] mt-1.5 line-clamp-2 leading-relaxed" style={{ color: TEXT_SECONDARY }}>{place.description}</p>
      <div className="mt-auto pt-3 flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: '#F1F5F9', color: TEXT_SECONDARY }}>
          {place.cuisine}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ background: ACCENT_SOFT, color: ACCENT }}>
          <Trophy className="w-3 h-3" /> {place.recommendationSource}
        </span>
        <span className="text-[11px] font-semibold ms-auto" style={{ color: TEXT_MUTED }}>{place.priceLevel}</span>
      </div>
    </div>
    <img src={place.photoUrl} alt="" className="w-36 h-36 sm:w-40 sm:h-40 object-cover flex-shrink-0" />
  </article>
);

/** B — Tall portrait photo right (100×140 vertical) */
export const PlaceB: React.FC = () => (
  <article className="flex bg-white rounded-2xl overflow-hidden cursor-pointer h-36" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }} dir="rtl">
    <div className="flex-1 min-w-0 px-4 py-3 flex flex-col">
      <h3 className="text-[16px] font-semibold tracking-tight truncate" style={{ color: TEXT_PRIMARY }}>{place.name}</h3>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[12px] font-medium" style={{ color: TEXT_SECONDARY }}>{place.cuisine}</span>
        <span className="w-0.5 h-0.5 rounded-full" style={{ background: TEXT_MUTED }} />
        <span className="text-[12px] font-medium" style={{ color: TEXT_SECONDARY }}>{place.city}</span>
        <span className="w-0.5 h-0.5 rounded-full" style={{ background: TEXT_MUTED }} />
        <span className="text-[12px] font-semibold" style={{ color: TEXT_MUTED }}>{place.priceLevel}</span>
      </div>
      <p className="text-[12px] mt-2 line-clamp-2 leading-relaxed" style={{ color: TEXT_SECONDARY }}>{place.description}</p>
      <div className="mt-auto flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: ACCENT }}>
          <Trophy className="w-3 h-3" /> {place.recommendationSource}
        </span>
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: TEXT_PRIMARY }}>
          <Star className="w-3 h-3 fill-current" style={{ color: ACCENT }} /> {place.rating}
        </span>
      </div>
    </div>
    <img src={place.photoUrl} alt="" className="w-24 sm:w-28 h-full object-cover flex-shrink-0" />
  </article>
);

/** C — Split with editorial description */
export const PlaceC: React.FC = () => (
  <article className="flex bg-white rounded-2xl overflow-hidden cursor-pointer" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }} dir="rtl">
    <div className="flex-1 min-w-0 p-5 flex flex-col gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>{place.recommendationSource}</p>
      <h3 className="text-[18px] font-semibold tracking-tight" style={{ color: TEXT_PRIMARY }}>{place.name}</h3>
      <p className="text-[12px] font-medium" style={{ color: TEXT_MUTED }}>{place.cuisine} · {place.city} · {place.priceLevel}</p>
      <p className="text-[13px] line-clamp-3 leading-relaxed" style={{ color: TEXT_SECONDARY }}>{place.description}</p>
      <div className="mt-auto flex items-center gap-2 pt-2 border-t" style={{ borderColor: HAIRLINE }}>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold" style={{ color: TEXT_PRIMARY }}>
          <Star className="w-3.5 h-3.5 fill-current" style={{ color: ACCENT }} /> {place.rating}
        </span>
        <span className="text-[11px] font-medium" style={{ color: TEXT_MUTED }}>{place.reviewCount.toLocaleString()} ביקורות</span>
      </div>
    </div>
    <img src={place.photoUrl} alt="" className="w-44 h-auto object-cover flex-shrink-0" style={{ minHeight: '100%' }} />
  </article>
);

/** D — Photo-as-background with left gradient */
export const PlaceD: React.FC = () => (
  <article className="relative bg-slate-900 rounded-2xl overflow-hidden cursor-pointer h-36 sm:h-40" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }} dir="rtl">
    <img src={place.photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
    <div className="absolute inset-0" style={{ background: 'linear-gradient(to left, rgba(15,23,42,0) 0%, rgba(15,23,42,0.4) 45%, rgba(15,23,42,0.92) 100%)' }} />
    <div className="relative h-full flex flex-col justify-between p-5" style={{ width: '70%' }}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/75">{place.recommendationSource}</p>
        <h3 className="text-[20px] font-semibold tracking-tight text-white mt-1">{place.name}</h3>
        <p className="text-[12px] font-medium text-white/80 mt-1">{place.cuisine} · {place.priceLevel}</p>
      </div>
      <p className="text-[12px] line-clamp-2 leading-relaxed text-white/90">{place.description}</p>
    </div>
    <span className="absolute top-4 left-4 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold backdrop-blur-md bg-white/90 text-slate-900">
      <Star className="w-3 h-3 fill-current" style={{ color: ACCENT }} /> {place.rating}
    </span>
  </article>
);

export const PLACE_VARIANTS = [
  { id: 'A', title: 'A — תמונה ריבועית', subtitle: 'תמונה 140×140 בקצה ימין; טקסט וקטגוריה משמאל', Component: PlaceA },
  { id: 'B', title: 'B — תמונה אנכית', subtitle: 'תמונה אנכית צרה (28w); תצוגה דחוסה יותר', Component: PlaceB },
  { id: 'C', title: 'C — עריכת כתב-עת', subtitle: 'תיאור ארוך; מקור ההמלצה ככותרת קטנה למעלה', Component: PlaceC },
  { id: 'D', title: 'D — תמונה כרקע', subtitle: 'הכרטיס כולו הוא התמונה; טקסט צף מעל גרדיאנט', Component: PlaceD },
];
