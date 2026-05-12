/** Round 8 — 4 refined "Booking-style" hotel cards (no price/night). */
import React from 'react';
import { Star, MapPin, Calendar, Hash } from 'lucide-react';
import { previewHotels, ACCENT, ACCENT_SOFT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, HAIRLINE, TRIP_COUNTDOWN_DAYS } from './fixtures';

const hotel = previewHotels[0];

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <article className="flex bg-white rounded-2xl overflow-hidden cursor-pointer transition-shadow" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }}>
    {children}
  </article>
);

/** A — City name in the bottom-right slot */
export const HotelA: React.FC = () => (
  <Shell>
    <img src={hotel.photoUrl} alt="" className="w-44 h-44 object-cover flex-shrink-0" />
    <div className="flex-1 min-w-0 p-5 flex flex-col" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold tracking-tight truncate" style={{ color: TEXT_PRIMARY }}>{hotel.name}</h3>
          <p className="text-[13px] truncate mt-1" style={{ color: TEXT_SECONDARY }}>{hotel.address}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold flex-shrink-0" style={{ color: TEXT_PRIMARY }}>
          <Star className="w-3.5 h-3.5 fill-current" style={{ color: ACCENT }} /> {hotel.rating}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4 text-[13px]">
        <Field label="צ׳ק-אין" value={hotel.checkIn} />
        <Field label="צ׳ק-אאוט" value={hotel.checkOut} />
        <Field label="חדרים" value={`${hotel.roomCount}`} />
        <Field label="אורחים" value={`${hotel.guestCount}`} />
      </div>
      <div className="mt-auto pt-3 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>{hotel.nights} לילות</span>
        <span className="inline-flex items-center gap-1 text-[14px] font-semibold" style={{ color: ACCENT }}>
          <MapPin className="w-3.5 h-3.5" /> {hotel.city}
        </span>
      </div>
    </div>
  </Shell>
);

/** B — Nights badge in the slot */
export const HotelB: React.FC = () => (
  <Shell>
    <img src={hotel.photoUrl} alt="" className="w-44 h-44 object-cover flex-shrink-0" />
    <div className="flex-1 min-w-0 p-5 flex flex-col" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold tracking-tight truncate" style={{ color: TEXT_PRIMARY }}>{hotel.name}</h3>
          <p className="text-[13px] truncate mt-1" style={{ color: TEXT_SECONDARY }}>{hotel.city} · {hotel.address}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold flex-shrink-0" style={{ color: TEXT_PRIMARY }}>
          <Star className="w-3.5 h-3.5 fill-current" style={{ color: ACCENT }} /> {hotel.rating}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4 text-[13px]">
        <Field label="צ׳ק-אין" value={hotel.checkIn} />
        <Field label="צ׳ק-אאוט" value={hotel.checkOut} />
        <Field label="חדרים" value={`${hotel.roomCount}`} />
        <Field label="אורחים" value={`${hotel.guestCount}`} />
      </div>
      <div className="mt-auto pt-3 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>שהות</span>
        <span className="inline-flex items-baseline gap-1.5 px-3 py-1.5 rounded-full" style={{ background: ACCENT_SOFT }}>
          <span className="text-[20px] font-semibold leading-none tabular-nums" style={{ color: ACCENT }}>{hotel.nights}</span>
          <span className="text-[12px] font-medium" style={{ color: ACCENT }}>לילות</span>
        </span>
      </div>
    </div>
  </Shell>
);

/** C — Confirmation code in the slot */
export const HotelC: React.FC = () => (
  <Shell>
    <img src={hotel.photoUrl} alt="" className="w-44 h-44 object-cover flex-shrink-0" />
    <div className="flex-1 min-w-0 p-5 flex flex-col" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold tracking-tight truncate" style={{ color: TEXT_PRIMARY }}>{hotel.name}</h3>
          <p className="text-[13px] truncate mt-1" style={{ color: TEXT_SECONDARY }}>{hotel.city} · {hotel.nights} לילות</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold flex-shrink-0" style={{ color: TEXT_PRIMARY }}>
          <Star className="w-3.5 h-3.5 fill-current" style={{ color: ACCENT }} /> {hotel.rating}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4 text-[13px]">
        <Field label="צ׳ק-אין" value={hotel.checkIn} />
        <Field label="צ׳ק-אאוט" value={hotel.checkOut} />
        <Field label="חדרים" value={`${hotel.roomCount}`} />
        <Field label="אורחים" value={`${hotel.guestCount}`} />
      </div>
      <div className="mt-auto pt-3 border-t flex items-baseline justify-between gap-2" style={{ borderColor: HAIRLINE }}>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>אישור הזמנה</span>
        <span className="inline-flex items-center gap-1 font-mono text-[13px] font-semibold" style={{ color: TEXT_PRIMARY }}>
          <Hash className="w-3 h-3" style={{ color: TEXT_MUTED }} /> {hotel.confirmationCode}
        </span>
      </div>
    </div>
  </Shell>
);

/** D — Check-in countdown */
export const HotelD: React.FC = () => (
  <Shell>
    <img src={hotel.photoUrl} alt="" className="w-44 h-44 object-cover flex-shrink-0" />
    <div className="flex-1 min-w-0 p-5 flex flex-col" dir="rtl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[16px] font-semibold tracking-tight truncate" style={{ color: TEXT_PRIMARY }}>{hotel.name}</h3>
          <p className="text-[13px] truncate mt-1" style={{ color: TEXT_SECONDARY }}>{hotel.city} · {hotel.address}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold flex-shrink-0" style={{ color: TEXT_PRIMARY }}>
          <Star className="w-3.5 h-3.5 fill-current" style={{ color: ACCENT }} /> {hotel.rating}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4 text-[13px]">
        <Field label="צ׳ק-אין" value={hotel.checkIn} />
        <Field label="צ׳ק-אאוט" value={hotel.checkOut} />
        <Field label="חדרים" value={`${hotel.roomCount}`} />
        <Field label="אורחים" value={`${hotel.guestCount}`} />
      </div>
      <div className="mt-auto pt-3 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>הגעה בעוד</span>
        <span className="inline-flex items-baseline gap-1.5">
          <span className="text-[22px] font-semibold leading-none tabular-nums tracking-tight" style={{ color: ACCENT }}>{TRIP_COUNTDOWN_DAYS}</span>
          <span className="text-[12px] font-medium" style={{ color: TEXT_SECONDARY }}>ימים</span>
        </span>
      </div>
    </div>
  </Shell>
);

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>{label}</p>
    <p className="text-[13px] font-medium mt-0.5" style={{ color: TEXT_PRIMARY }}>{value}</p>
  </div>
);

export const HOTEL_VARIANTS = [
  { id: 'A', title: 'A — שם העיר', subtitle: 'במקום מחיר, מוצג שם העיר עם אייקון מיקום', Component: HotelA },
  { id: 'B', title: 'B — תג לילות', subtitle: 'פיל צבעוני בולט עם מספר הלילות', Component: HotelB },
  { id: 'C', title: 'C — קוד אישור', subtitle: 'מספר ההזמנה גדול וברור — סגנון רשמי', Component: HotelC },
  { id: 'D', title: 'D — ספירה לאחור', subtitle: 'כמה ימים עד הצ׳ק-אין; מעורר ציפייה', Component: HotelD },
];
