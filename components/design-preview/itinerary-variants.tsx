/** Round 10 — 4 refinements in the picked "2-col grid" direction.
 *  Same chosen direction (compact grid, whole-trip at a glance), varying:
 *  gradient vs photo vs accent stripe vs hero number. No `sm:` viewport
 *  breakpoints — uses `grid-cols-2` for content + intrinsic widths so the
 *  same component renders correctly at mobile (375px) and desktop. */
import React from 'react';
import { Plane, Hotel, UtensilsCrossed, MapPin, Bus } from 'lucide-react';
import { previewItinerary, getCityColor, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, HAIRLINE } from './fixtures';

const days = previewItinerary;

const cityPhoto: Record<string, string> = {
  Bangkok: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80',
  Pattaya: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=800&q=80',
  'Koh Chang': 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80',
};
const photoFor = (city: string) => cityPhoto[city] || cityPhoto.Bangkok;

const eventIcon: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  flight: Plane, hotel: Hotel, meal: UtensilsCrossed, attraction: MapPin, transport: Bus,
};

// Layout pattern: always grid-cols-2 (works at mobile + desktop since cards
// are intrinsically narrow). The 4 variants below differ only on the day-card
// header treatment.

// Auto-fit grid: each day card is at least 220px wide; the layout fits as
// many columns as the container allows. So at 375px (mobile) you get 1 col,
// at ~680px you get 2-3 cols, at ~1100px+ you get 4 cols, at 1400px+ 5 cols.
// This is the same primitive used by Booking.com / Airbnb result grids.
const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    dir="rtl"
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '10px',
    }}
  >
    {children}
  </div>
);

/** A — Refined gradient banner (the round-9 baseline, cleaned up) */
export const ItineraryA: React.FC = () => (
  <Grid>
    {days.map(d => {
      const c = getCityColor(d.city);
      return (
        <article key={d.id} className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <header className="px-3 py-2.5 text-white" style={{ background: `linear-gradient(135deg, ${c.accent} 0%, ${c.accent}cc 100%)` }}>
            <div className="flex items-baseline justify-between">
              <p className="text-[13px] font-semibold tracking-tight">יום {d.day} · {c.label}</p>
              <p className="text-[10px] font-medium opacity-85 tabular-nums">{d.date.slice(5)}</p>
            </div>
            <p className="text-[10px] font-medium uppercase tracking-wider mt-0.5 opacity-85">{d.dayOfWeek} · {d.events.length} פעילויות</p>
          </header>
          <ol className="px-3 py-2 space-y-1">
            {d.events.map(e => (
              <li key={e.id} className="flex items-baseline gap-1.5 text-[12px]">
                <span className="font-mono font-medium tabular-nums w-9 flex-shrink-0" style={{ color: TEXT_MUTED }}>{e.time}</span>
                <span className="truncate font-medium" style={{ color: TEXT_PRIMARY }}>{e.title}</span>
              </li>
            ))}
          </ol>
        </article>
      );
    })}
  </Grid>
);

/** B — Photo background header (a small city image with gradient overlay) */
export const ItineraryB: React.FC = () => (
  <Grid>
    {days.map(d => {
      const c = getCityColor(d.city);
      return (
        <article key={d.id} className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <header className="relative h-16">
            <img src={photoFor(d.city)} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.35) 100%)' }} />
            <div className="relative h-full px-3 py-2 flex items-end justify-between text-white">
              <p className="text-[13px] font-semibold tracking-tight">יום {d.day} · {c.label}</p>
              <p className="text-[10px] font-medium opacity-90 tabular-nums">{d.date.slice(5)}</p>
            </div>
          </header>
          <ol className="px-3 py-2 space-y-1">
            {d.events.map(e => {
              const Icon = eventIcon[e.type] || MapPin;
              return (
                <li key={e.id} className="flex items-baseline gap-1.5 text-[12px]">
                  <span className="font-mono font-medium tabular-nums w-9 flex-shrink-0" style={{ color: TEXT_MUTED }}>{e.time}</span>
                  <Icon className="w-2.5 h-2.5 flex-shrink-0 self-center" style={{ color: c.accent }} />
                  <span className="truncate font-medium" style={{ color: TEXT_PRIMARY }}>{e.title}</span>
                </li>
              );
            })}
          </ol>
        </article>
      );
    })}
  </Grid>
);

/** C — Soft header with accent left bar (no gradient — cleaner, more editorial) */
export const ItineraryC: React.FC = () => (
  <Grid>
    {days.map(d => {
      const c = getCityColor(d.city);
      return (
        <article key={d.id} className="bg-white rounded-xl overflow-hidden relative" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <span className="absolute right-0 top-0 bottom-0 w-1" style={{ background: c.accent }} aria-hidden />
          <header className="ps-3 pe-3 pt-2.5 pb-2 border-b" style={{ borderColor: HAIRLINE }}>
            <div className="flex items-baseline justify-between">
              <p className="text-[13px] font-semibold tracking-tight" style={{ color: TEXT_PRIMARY }}>יום {d.day}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider tabular-nums" style={{ color: c.accent }}>{c.label}</p>
            </div>
            <p className="text-[10px] mt-0.5" style={{ color: TEXT_MUTED }}>{d.dayOfWeek} · {d.date.slice(5)}</p>
          </header>
          <ol className="px-3 py-2 space-y-1">
            {d.events.map(e => (
              <li key={e.id} className="flex items-baseline gap-1.5 text-[12px]">
                <span className="font-mono font-medium tabular-nums w-9 flex-shrink-0" style={{ color: TEXT_MUTED }}>{e.time}</span>
                <span className="truncate font-medium" style={{ color: TEXT_PRIMARY }}>{e.title}</span>
              </li>
            ))}
          </ol>
        </article>
      );
    })}
  </Grid>
);

/** D — Day number as a giant numeral hero; city as small uppercase label */
export const ItineraryD: React.FC = () => (
  <Grid>
    {days.map(d => {
      const c = getCityColor(d.city);
      return (
        <article key={d.id} className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <header className="px-3 pt-2.5 pb-1.5 flex items-baseline gap-2.5 border-b" style={{ borderColor: HAIRLINE }}>
            <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums" style={{ color: c.accent }}>{d.day}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: c.accent }}>{c.label}</p>
              <p className="text-[11px] font-medium" style={{ color: TEXT_SECONDARY }}>{d.dayOfWeek} · {d.date.slice(5)}</p>
            </div>
          </header>
          <ol className="px-3 py-2 space-y-1">
            {d.events.map(e => (
              <li key={e.id} className="flex items-baseline gap-1.5 text-[12px]">
                <span className="font-mono font-medium tabular-nums w-9 flex-shrink-0" style={{ color: TEXT_MUTED }}>{e.time}</span>
                <span className="truncate font-medium" style={{ color: TEXT_PRIMARY }}>{e.title}</span>
              </li>
            ))}
          </ol>
        </article>
      );
    })}
  </Grid>
);

export const ITINERARY_VARIANTS = [
  { id: 'A', title: 'A — באנר גרדיאנט',          subtitle: 'הכותרת בגרדיאנט שיפועי של צבע העיר (הבסיס שבחרת)',          Component: ItineraryA },
  { id: 'B', title: 'B — תמונת עיר ככותרת',       subtitle: 'תמונה אמיתית של העיר עם גרדיאנט כהה + טקסט לבן',           Component: ItineraryB },
  { id: 'C', title: 'C — פס צבע צד + כותרת רכה', subtitle: 'בלי גרדיאנט — רק פס דק בצבע העיר; קווי מגזין עדין יותר',   Component: ItineraryC },
  { id: 'D', title: 'D — מספר יום ענק',           subtitle: 'מספר היום כספרה גדולה בצבע העיר + תווית קטנה',              Component: ItineraryD },
];
