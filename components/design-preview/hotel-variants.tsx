/** 4 hotel card variants. Premium-travel vibe. */
import React from 'react';
import { Star, Heart, MapPin, Calendar, Users, BedDouble } from 'lucide-react';
import { previewHotels, ACCENT, ACCENT_SOFT } from './fixtures';

const hotel = previewHotels[0];

/** A — Booking.com-style horizontal (photo + dense info column) */
export const HotelA: React.FC = () => (
  <article className="flex bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer" dir="rtl">
    <img src={hotel.photoUrl} alt="" className="w-40 h-40 object-cover flex-shrink-0" />
    <div className="flex-1 min-w-0 p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-black text-slate-900 tracking-tight truncate">{hotel.name}</h3>
          <p className="text-xs text-slate-500 truncate mt-0.5">{hotel.address}</p>
        </div>
        <span className="inline-flex items-center gap-0.5 px-2 py-1 rounded-md text-xs font-bold flex-shrink-0" style={{ background: ACCENT_SOFT, color: ACCENT }}>
          <Star className="w-3 h-3 fill-current" /> {hotel.rating}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        <Field icon={<Calendar className="w-3 h-3" />} label="צ׳ק-אין" value={hotel.checkIn} />
        <Field icon={<Calendar className="w-3 h-3" />} label="צ׳ק-אאוט" value={hotel.checkOut} />
        <Field icon={<BedDouble className="w-3 h-3" />} label="חדרים" value={`${hotel.roomCount}`} />
        <Field icon={<Users className="w-3 h-3" />} label="אורחים" value={`${hotel.guestCount}`} />
      </div>
      <div className="mt-auto pt-3 flex items-baseline justify-between gap-2">
        <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">{hotel.nights} לילות</span>
        <span className="text-base font-black text-slate-900">${hotel.pricePerNight}<span className="text-xs font-bold text-slate-400">/לילה</span></span>
      </div>
    </div>
  </article>
);

/** B — Airbnb-style square (photo-forward, minimal text) */
export const HotelB: React.FC = () => (
  <article className="group cursor-pointer" dir="rtl">
    <div className="relative aspect-square rounded-3xl overflow-hidden">
      <img src={hotel.photoUrl} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
      <button className="absolute top-3 left-3 p-2 rounded-full text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
        <Heart className="w-6 h-6" fill="rgba(0,0,0,0.4)" strokeWidth={2.5} />
      </button>
      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-md bg-white/90 text-[11px] font-black text-slate-900">
        <Star className="w-3 h-3 fill-current" /> {hotel.rating}
      </span>
    </div>
    <div className="mt-3 px-1">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-black text-slate-900 truncate tracking-tight">{hotel.name}</h3>
        <span className="text-sm font-black text-slate-900 flex-shrink-0">${hotel.pricePerNight}</span>
      </div>
      <p className="text-sm text-slate-500 mt-0.5">{hotel.city} · {hotel.nights} לילות</p>
      <p className="text-xs text-slate-400 mt-0.5">{hotel.checkIn} → {hotel.checkOut}</p>
    </div>
  </article>
);

/** C — Hotel voucher / pass (printed-reservation feel) */
export const HotelC: React.FC = () => (
  <article className="bg-white rounded-2xl border-2 border-slate-900 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" dir="rtl">
    <div className="flex items-stretch">
      <div className="flex-1 min-w-0 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">שובר מלון</span>
          <span className="font-mono text-[10px] font-bold text-slate-700">#{hotel.confirmationCode}</span>
        </div>
        <h3 className="text-lg font-black text-slate-900 tracking-tight">{hotel.name}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{hotel.address}</p>
        <div className="mt-4 flex items-end gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">הגעה</p>
            <p className="text-sm font-black text-slate-900 mt-1">{hotel.checkIn}</p>
          </div>
          <div className="w-px h-10 bg-slate-200" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">עזיבה</p>
            <p className="text-sm font-black text-slate-900 mt-1">{hotel.checkOut}</p>
          </div>
          <div className="w-px h-10 bg-slate-200" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">לילות</p>
            <p className="text-sm font-black mt-1" style={{ color: ACCENT }}>{hotel.nights}</p>
          </div>
        </div>
      </div>
      {/* perforated divider */}
      <div className="relative w-6 flex-shrink-0">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-r-2 border-dashed border-slate-300" />
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-slate-200" />
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-slate-200" />
      </div>
      <div className="w-36 flex-shrink-0 p-4 flex flex-col justify-between" style={{ background: ACCENT_SOFT }}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">מחיר</p>
          <p className="text-2xl font-black mt-1" style={{ color: ACCENT }}>${hotel.pricePerNight}</p>
          <p className="text-[10px] font-bold text-slate-500 mt-0.5">ללילה</p>
        </div>
        <div className="text-[10px] font-bold text-slate-600 leading-relaxed">
          {hotel.roomCount} חדרים<br />{hotel.guestCount} אורחים
        </div>
      </div>
    </div>
  </article>
);

/** D — Map-anchored card (small map showing the pin) */
export const HotelD: React.FC = () => (
  <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow" dir="rtl">
    <div className="relative h-32 bg-gradient-to-br from-emerald-100 via-sky-100 to-teal-100">
      <svg viewBox="0 0 200 100" className="w-full h-full">
        <path d="M 10 70 Q 60 30 120 50 T 190 30" fill="none" stroke="rgba(15,118,110,0.3)" strokeWidth="2" />
        <circle cx="120" cy="50" r="14" fill="white" stroke={ACCENT} strokeWidth="3" />
        <circle cx="120" cy="50" r="5" fill={ACCENT} />
      </svg>
      <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full backdrop-blur-md bg-white/90 text-[10px] font-bold text-slate-700">
        <MapPin className="w-2.5 h-2.5" /> {hotel.city}
      </span>
    </div>
    <div className="p-4 flex gap-3">
      <img src={hotel.photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-black text-slate-900 truncate tracking-tight">{hotel.name}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{hotel.checkIn} → {hotel.checkOut}</p>
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="text-base font-black text-slate-900">${hotel.pricePerNight}</span>
          <span className="text-[11px] text-slate-400">/ לילה · {hotel.nights} לילות</span>
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ms-auto" style={{ background: ACCENT_SOFT, color: ACCENT }}>
            <Star className="w-2.5 h-2.5 fill-current" /> {hotel.rating}
          </span>
        </div>
      </div>
    </div>
  </article>
);

const Field: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-1.5 text-slate-700">
    <span className="text-slate-400">{icon}</span>
    <span className="font-bold">{value}</span>
    <span className="text-slate-400 text-[10px]">{label}</span>
  </div>
);

export const HOTEL_VARIANTS = [
  { id: 'A', title: 'A — Booking-style', subtitle: 'תמונה אופקית + עמודת מידע צפופה', Component: HotelA },
  { id: 'B', title: 'B — Square photo', subtitle: 'תמונה ריבועית; טקסט מינימלי', Component: HotelB },
  { id: 'C', title: 'C — Voucher / pass', subtitle: 'מראה של שובר הזמנה עם קו מנוקב', Component: HotelC },
  { id: 'D', title: 'D — Map-anchored', subtitle: 'מיני-מפה עם פין למיקום המלון', Component: HotelD },
];
