/** Round 10 — 4 refinements in the picked "city in slot" direction.
 *  Brings back the production pattern: prominent nights + room/guests chips,
 *  inline click-to-expand rooms panel with color-coded chips. */
import React, { useState } from 'react';
import { Star, MapPin, Calendar, BedDouble, Users, ChevronDown, Hash, Plus } from 'lucide-react';
import {
  previewHotels, previewRooms, ROOM_COLORS,
  ACCENT, ACCENT_SOFT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, HAIRLINE, PAGE_BG,
} from './fixtures';

const hotel = previewHotels[0];

const formatDate = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

// ----- Shared sub-pieces -----

const CityPill: React.FC<{ city: string }> = ({ city }) => (
  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold flex-shrink-0" style={{ background: ACCENT_SOFT, color: ACCENT }}>
    <MapPin className="w-3 h-3" /> {city}
  </span>
);

const Chip: React.FC<{ icon: React.ComponentType<{ className?: string }>; label: string; emphasis?: boolean }> = ({ icon: Icon, label, emphasis }) => (
  <span
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12px] font-semibold flex-shrink-0"
    style={{
      background: emphasis ? ACCENT_SOFT : '#F1F5F9',
      color: emphasis ? ACCENT : TEXT_PRIMARY,
    }}
  >
    <Icon className="w-3 h-3" /> {label}
  </span>
);

const RoomsPanel: React.FC = () => (
  <div className="space-y-2.5 mt-3" dir="rtl">
    <div className="grid grid-cols-3 gap-2 text-center mb-2">
      <div className="rounded-lg py-2 px-2" style={{ background: '#F8FAFC' }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>צ׳ק-אין</p>
        <p className="text-[13px] font-semibold tabular-nums mt-0.5" style={{ color: TEXT_PRIMARY }}>{formatDate(hotel.checkIn)}</p>
      </div>
      <div className="rounded-lg py-2 px-2 text-white" style={{ background: TEXT_PRIMARY }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest opacity-85">לילות</p>
        <p className="text-[15px] font-semibold tabular-nums mt-0.5">{hotel.nights}</p>
      </div>
      <div className="rounded-lg py-2 px-2" style={{ background: '#F8FAFC' }}>
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>צ׳ק-אאוט</p>
        <p className="text-[13px] font-semibold tabular-nums mt-0.5" style={{ color: TEXT_PRIMARY }}>{formatDate(hotel.checkOut)}</p>
      </div>
    </div>
    {previewRooms.map((r, i) => {
      const c = ROOM_COLORS[i % ROOM_COLORS.length];
      return (
        <div key={r.id} className="rounded-xl px-3 py-2 border flex items-center gap-2.5" style={{ background: c.bg, borderColor: c.border }}>
          <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: c.badge, color: c.num }}>
            <BedDouble className="w-3.5 h-3.5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate" style={{ color: c.text }}>{r.label}</p>
            <p className="text-[11px] truncate" style={{ color: c.text, opacity: 0.75 }}>{r.roomType} · {r.beds}</p>
          </div>
          <div className="text-[11px] font-semibold flex-shrink-0 tabular-nums" style={{ color: c.text }}>
            {r.adults}מ{r.children > 0 ? ` · ${r.children}י` : ''}
          </div>
        </div>
      );
    })}
    <button className="w-full rounded-xl py-2 border border-dashed flex items-center justify-center gap-1.5 text-[12px] font-semibold" style={{ borderColor: HAIRLINE, color: ACCENT }}>
      <Plus className="w-3.5 h-3.5" /> הוסף חדר
    </button>
  </div>
);

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <article className="bg-white rounded-2xl overflow-hidden transition-shadow" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }}>
    {children}
  </article>
);

// ----- 4 refined variants (all in "city in slot" direction) -----

/** A — Production-style chips (nights + rooms/guests as primary stats) */
export const HotelA: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <Shell>
      <button onClick={() => setOpen(o => !o)} className="w-full text-right flex items-stretch gap-0">
        <img src={hotel.photoUrl} alt="" className="w-28 h-28 object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0 p-4 flex flex-col gap-2" dir="rtl">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold tracking-tight truncate" style={{ color: TEXT_PRIMARY }}>{hotel.name}</h3>
              <p className="text-[12px] truncate mt-0.5" style={{ color: TEXT_MUTED }}>{hotel.address}</p>
            </div>
            <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: TEXT_MUTED }} />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <CityPill city={hotel.city} />
            <Chip icon={Calendar}  label={`${hotel.nights} לילות`} emphasis />
            <Chip icon={BedDouble} label={`${hotel.roomCount} חדרים`} />
            <Chip icon={Users}     label={`${hotel.guestCount} אורחים`} />
          </div>
        </div>
      </button>
      {open && <div className="px-4 pb-4 pt-0 border-t" style={{ borderColor: HAIRLINE }}><RoomsPanel /></div>}
    </Shell>
  );
};

/** B — Hero stats: nights as a giant number on the right of the photo */
export const HotelB: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <Shell>
      <button onClick={() => setOpen(o => !o)} className="w-full text-right flex items-stretch gap-0">
        <img src={hotel.photoUrl} alt="" className="w-32 h-32 object-cover flex-shrink-0" />
        <div className="flex-1 min-w-0 p-4 flex items-start justify-between gap-3" dir="rtl">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold tracking-tight truncate" style={{ color: TEXT_PRIMARY }}>{hotel.name}</h3>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <CityPill city={hotel.city} />
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>
                <Star className="w-3 h-3 fill-current" style={{ color: ACCENT }} /> {hotel.rating}
              </span>
            </div>
            <p className="text-[12px] truncate mt-1.5" style={{ color: TEXT_MUTED }}>{hotel.address}</p>
            <div className="flex items-center gap-3 mt-2 text-[11px] font-semibold" style={{ color: TEXT_SECONDARY }}>
              <span className="inline-flex items-center gap-1"><BedDouble className="w-3 h-3" /> {hotel.roomCount} חדרים</span>
              <span className="inline-flex items-center gap-1"><Users     className="w-3 h-3" /> {hotel.guestCount} אורחים</span>
            </div>
          </div>
          <div className="flex flex-col items-center flex-shrink-0 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>לילות</p>
            <p className="text-[32px] font-semibold leading-none tabular-nums tracking-tight" style={{ color: ACCENT }}>{hotel.nights}</p>
            <ChevronDown className={`w-4 h-4 mt-1 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: TEXT_MUTED }} />
          </div>
        </div>
      </button>
      {open && <div className="px-4 pb-4 border-t" style={{ borderColor: HAIRLINE }}><RoomsPanel /></div>}
    </Shell>
  );
};

/** C — Dates ribbon: check-in → nights → check-out across the top, rooms below */
export const HotelC: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <Shell>
      <button onClick={() => setOpen(o => !o)} className="w-full text-right">
        <div className="flex items-stretch">
          <img src={hotel.photoUrl} alt="" className="w-28 h-auto object-cover flex-shrink-0" style={{ minHeight: '100%' }} />
          <div className="flex-1 min-w-0 p-4 flex flex-col gap-2" dir="rtl">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold tracking-tight truncate" style={{ color: TEXT_PRIMARY }}>{hotel.name}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CityPill city={hotel.city} />
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: TEXT_PRIMARY }}>
                    <Star className="w-3 h-3 fill-current" style={{ color: ACCENT }} /> {hotel.rating}
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: TEXT_MUTED }} />
            </div>
            {/* Dates ribbon */}
            <div className="rounded-lg px-3 py-2 flex items-center justify-between gap-2" style={{ background: PAGE_BG }}>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>אין</p>
                <p className="text-[13px] font-semibold tabular-nums" style={{ color: TEXT_PRIMARY }}>{formatDate(hotel.checkIn)}</p>
              </div>
              <div className="flex flex-col items-center px-2">
                <span className="text-[16px] font-semibold leading-none tabular-nums tracking-tight" style={{ color: ACCENT }}>{hotel.nights}</span>
                <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: ACCENT }}>לילות</span>
              </div>
              <div className="text-right min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>אאוט</p>
                <p className="text-[13px] font-semibold tabular-nums" style={{ color: TEXT_PRIMARY }}>{formatDate(hotel.checkOut)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Chip icon={BedDouble} label={`${hotel.roomCount} חדרים`} />
              <Chip icon={Users}     label={`${hotel.guestCount} אורחים`} />
              <span className="inline-flex items-center gap-1 ms-auto font-mono text-[11px] font-semibold" style={{ color: TEXT_MUTED }}>
                <Hash className="w-3 h-3" /> {hotel.confirmationCode}
              </span>
            </div>
          </div>
        </div>
      </button>
      {open && <div className="px-4 pb-4 border-t" style={{ borderColor: HAIRLINE }}><RoomsPanel /></div>}
    </Shell>
  );
};

/** D — Always-visible rooms preview (no toggle — they're chips inside the card) */
export const HotelD: React.FC = () => (
  <Shell>
    <div className="flex items-stretch">
      <img src={hotel.photoUrl} alt="" className="w-28 h-auto object-cover flex-shrink-0" style={{ minHeight: '100%' }} />
      <div className="flex-1 min-w-0 p-4 flex flex-col gap-2" dir="rtl">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold tracking-tight truncate" style={{ color: TEXT_PRIMARY }}>{hotel.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <CityPill city={hotel.city} />
              <Chip icon={Calendar}  label={`${hotel.nights} לילות`} emphasis />
              <Chip icon={Users}     label={`${hotel.guestCount} אורחים`} />
            </div>
          </div>
        </div>
        {/* Inline compact rooms preview */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[10px] font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: TEXT_MUTED }}>{hotel.roomCount} חדרים</span>
          {previewRooms.map((r, i) => {
            const c = ROOM_COLORS[i % ROOM_COLORS.length];
            return (
              <span key={r.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border" style={{ background: c.bg, borderColor: c.border, color: c.text }}>
                <BedDouble className="w-2.5 h-2.5" /> {r.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  </Shell>
);

export const HOTEL_VARIANTS = [
  { id: 'A', title: 'A — צ׳יפים בסגנון הפרודקשן', subtitle: 'עיר + לילות + חדרים + אורחים כצ׳יפים, לחיצה פותחת חדרים בפנים',     Component: HotelA },
  { id: 'B', title: 'B — לילות כמספר ענק',         subtitle: 'מספר הלילות גדול בצד ימין; שאר הפרטים בצד שמאל',                  Component: HotelB },
  { id: 'C', title: 'C — סרגל תאריכים',             subtitle: 'צ׳ק-אין → לילות → צ׳ק-אאוט באמצע; צ׳יפים של חדרים מתחת',          Component: HotelC },
  { id: 'D', title: 'D — חדרים גלויים כברירת מחדל', subtitle: 'תצוגה קומפקטית עם שמות החדרים כצ׳יפים — בלי לחיצה',               Component: HotelD },
];
