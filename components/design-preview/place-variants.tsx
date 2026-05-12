/** 4 place card variants for restaurants + attractions. */
import React from 'react';
import { Star, Heart, MapPin, Clock, Trophy } from 'lucide-react';
import { previewPlaces, ACCENT, ACCENT_SOFT } from './fixtures';

const place = previewPlaces[0];

/** A — Magazine (large photo, editorial typography) */
export const PlaceA: React.FC = () => (
  <article className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow cursor-pointer max-w-sm" dir="rtl">
    <div className="relative aspect-[4/5] overflow-hidden">
      <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
      <button className="absolute top-4 left-4 p-2 rounded-full text-white drop-shadow-lg">
        <Heart className="w-6 h-6" strokeWidth={2.5} fill="rgba(0,0,0,0.35)" />
      </button>
      <span className="absolute bottom-4 right-4 inline-flex items-center gap-1 px-3 py-1.5 rounded-full backdrop-blur-md bg-white/95 text-xs font-black text-slate-900">
        <Trophy className="w-3 h-3" style={{ color: ACCENT }} />
        {place.recommendationSource}
      </span>
    </div>
    <div className="p-5 space-y-1.5">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{place.cuisine}</p>
      <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{place.name}</h3>
      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed mt-2">{place.description}</p>
      <div className="flex items-center gap-3 pt-3 mt-2 text-xs text-slate-500 border-t border-slate-100">
        <span className="inline-flex items-center gap-1 font-bold text-slate-900">
          <Star className="w-3.5 h-3.5 fill-current" style={{ color: ACCENT }} /> {place.rating}
        </span>
        <span>·</span>
        <span>{place.priceLevel}</span>
        <span>·</span>
        <span>{place.walkingMinutes} דק׳</span>
      </div>
    </div>
  </article>
);

/** B — List row (thumbnail + typography) */
export const PlaceB: React.FC = () => (
  <article className="flex gap-4 bg-white rounded-2xl border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer" dir="rtl">
    <img src={place.photoUrl} alt={place.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-black text-slate-900 truncate tracking-tight">{place.name}</h3>
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-bold flex-shrink-0" style={{ background: ACCENT_SOFT, color: ACCENT }}>
          <Star className="w-3 h-3 fill-current" /> {place.rating}
        </span>
      </div>
      <p className="text-xs font-medium text-slate-500 mt-0.5">{place.cuisine} · {place.city} · {place.priceLevel}</p>
      <p className="text-xs text-slate-600 line-clamp-2 mt-1.5 leading-relaxed">{place.description}</p>
      <div className="flex items-center gap-1.5 mt-2 text-[10px] font-bold">
        <span className="text-slate-500">{place.walkingMinutes} דק׳ הליכה</span>
        <span className="text-slate-300">·</span>
        <span style={{ color: ACCENT }} className="truncate">{place.recommendationSource}</span>
      </div>
    </div>
  </article>
);

/** C — Map-pin card (photo + walking distance + open-now badge) */
export const PlaceC: React.FC = () => (
  <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer max-w-xs" dir="rtl">
    <div className="relative aspect-[16/10]">
      <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
      {place.isOpenNow && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-black">
          ● פתוח עכשיו
        </span>
      )}
    </div>
    <div className="p-3.5 space-y-2">
      <div className="flex items-start gap-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: ACCENT_SOFT, color: ACCENT }}>
          <MapPin className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-slate-900 truncate tracking-tight">{place.name}</h3>
          <p className="text-[11px] font-bold text-slate-500">{place.cuisine}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-center">
        <Metric value={place.rating.toString()} label="דירוג" />
        <Metric value={`${place.walkingMinutes}׳`} label="הליכה" />
        <Metric value={place.priceLevel} label="מחיר" />
      </div>
    </div>
  </article>
);

/** D — Discovery card (Tinder-style, single large card) */
export const PlaceD: React.FC = () => (
  <article className="relative max-w-xs mx-auto rounded-3xl overflow-hidden shadow-2xl cursor-pointer" dir="rtl">
    <div className="relative aspect-[3/4]">
      <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/30 to-transparent" />
      <span className="absolute top-4 right-4 px-2.5 py-1 rounded-full backdrop-blur-md bg-white/95 text-xs font-black text-slate-900">
        ⭐ {place.rating}
      </span>
      <div className="absolute bottom-0 inset-x-0 p-5 text-white">
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{place.recommendationSource}</p>
        <h3 className="text-3xl font-black tracking-tight mt-1">{place.name}</h3>
        <p className="text-xs font-bold opacity-80 mt-1">{place.cuisine} · {place.city}</p>
        <p className="text-sm leading-relaxed mt-3 line-clamp-3 opacity-95">{place.description}</p>
      </div>
    </div>
    <div className="absolute bottom-4 inset-x-4 flex gap-3 justify-center">
      <button className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-rose-500 hover:scale-110 transition-transform">
        <Heart className="w-6 h-6" strokeWidth={2.5} fill="currentColor" />
      </button>
      <button className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-110 transition-transform" style={{ background: ACCENT }}>
        ✓
      </button>
    </div>
  </article>
);

const Metric: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="bg-slate-50 rounded-lg py-1.5">
    <p className="text-sm font-black text-slate-900 leading-none">{value}</p>
    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{label}</p>
  </div>
);

export const PLACE_VARIANTS = [
  { id: 'A', title: 'A — Magazine', subtitle: 'תמונה גדולה ועריכת כתב-עת — עיצוב ראשי', Component: PlaceA },
  { id: 'B', title: 'B — List row', subtitle: 'שורה דחוסה לרשימות ארוכות במובייל', Component: PlaceB },
  { id: 'C', title: 'C — Map-pin', subtitle: 'תמונה + פין מפה + סטטוס "פתוח עכשיו"', Component: PlaceC },
  { id: 'D', title: 'D — Discovery', subtitle: 'כרטיס אחד במסך, סגנון Tinder להחלטות מהירות', Component: PlaceD },
];
