/** Round 9 — itinerary variants with strong colored backgrounds in the header.
 *  Each variant is visually DISTINCT (not just an accent tweak): solid color band,
 *  photo + gradient hero, magazine side-block, or compact gradient-stripe grid. */
import React from 'react';
import { Plane, Hotel, UtensilsCrossed, MapPin, Bus } from 'lucide-react';
import { previewItinerary, getCityColor, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, HAIRLINE } from './fixtures';

const days = previewItinerary;

const cityPhoto: Record<string, string> = {
  Bangkok: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1600&q=80',
  Pattaya: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1600&q=80',
  'Koh Chang': 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1600&q=80',
};
const photoFor = (city: string) => cityPhoto[city] || cityPhoto.Bangkok;

const eventIcon: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  flight: Plane,
  hotel: Hotel,
  meal: UtensilsCrossed,
  attraction: MapPin,
  transport: Bus,
};

/** A — Solid-color header band per day (the strongest, most "current-site"-style) */
export const ItineraryA: React.FC = () => (
  <div className="space-y-3" dir="rtl">
    {days.map(d => {
      const c = getCityColor(d.city);
      return (
        <article key={d.id} className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }}>
          <header className="px-5 py-4 flex items-center justify-between" style={{ background: c.accent }}>
            <div className="flex items-baseline gap-3 text-white">
              <span className="text-[28px] font-semibold tracking-tight leading-none">{d.day}</span>
              <div className="leading-tight">
                <p className="text-[14px] font-semibold">{d.dayOfWeek} · {d.date}</p>
                <p className="text-[11px] font-medium uppercase tracking-wider opacity-85">{c.label}</p>
              </div>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/85">{d.events.length} פעילויות</span>
          </header>
          <ol className="p-4 space-y-2">
            {d.events.map(e => (
              <li key={e.id} className="flex items-baseline gap-3 text-[14px]">
                <span className="font-mono font-semibold w-12 flex-shrink-0 tabular-nums" style={{ color: TEXT_MUTED }}>{e.time}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: TEXT_PRIMARY }}>{e.title}</p>
                  {e.subtitle && <p className="text-[12px] truncate" style={{ color: TEXT_SECONDARY }}>{e.subtitle}</p>}
                </div>
              </li>
            ))}
          </ol>
        </article>
      );
    })}
  </div>
);

/** B — Photo hero header with dark gradient overlay (matches the home banner) */
export const ItineraryB: React.FC = () => (
  <div className="space-y-3" dir="rtl">
    {days.map(d => {
      const c = getCityColor(d.city);
      return (
        <article key={d.id} className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }}>
          <header className="relative h-28 overflow-hidden">
            <img src={photoFor(d.city)} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.4) 60%, rgba(15,23,42,0.1) 100%)' }} />
            <div className="relative h-full px-5 py-3 flex items-end justify-between text-white">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.85)' }}>{d.dayOfWeek} · {d.date}</p>
                <h3 className="text-[20px] font-semibold tracking-tight leading-tight mt-0.5">
                  יום {d.day} · {c.label}
                </h3>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold backdrop-blur-md" style={{ background: c.accent, color: 'white' }}>
                {d.events.length} פעילויות
              </span>
            </div>
          </header>
          <ol className="p-4 space-y-2">
            {d.events.map(e => {
              const Icon = eventIcon[e.type] || MapPin;
              return (
                <li key={e.id} className="flex items-baseline gap-3 text-[14px]">
                  <span className="font-mono font-semibold w-12 flex-shrink-0 tabular-nums" style={{ color: TEXT_MUTED }}>{e.time}</span>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0 self-center" style={{ color: c.accent }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" style={{ color: TEXT_PRIMARY }}>{e.title}</p>
                    {e.subtitle && <p className="text-[12px] truncate" style={{ color: TEXT_SECONDARY }}>{e.subtitle}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        </article>
      );
    })}
  </div>
);

/** C — Magazine spread: tall solid-color side block + events panel */
export const ItineraryC: React.FC = () => (
  <div className="space-y-3" dir="rtl">
    {days.map(d => {
      const c = getCityColor(d.city);
      return (
        <article key={d.id} className="flex bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }}>
          {/* Right side (RTL): tall solid-color block */}
          <aside className="w-28 sm:w-32 flex-shrink-0 p-4 flex flex-col justify-between text-white" style={{ background: c.accent }}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest opacity-85">יום</p>
              <p className="text-[42px] font-semibold leading-none tracking-tight mt-1">{d.day}</p>
            </div>
            <div>
              <p className="text-[13px] font-semibold leading-tight">{c.label}</p>
              <p className="text-[11px] font-medium opacity-85 mt-0.5">{d.dayOfWeek}</p>
              <p className="text-[11px] font-medium opacity-85">{d.date}</p>
            </div>
          </aside>
          {/* Left: events */}
          <ol className="flex-1 min-w-0 p-4 space-y-2">
            {d.events.map(e => (
              <li key={e.id} className="flex items-baseline gap-3 text-[14px]">
                <span className="font-mono font-semibold w-12 flex-shrink-0 tabular-nums" style={{ color: TEXT_MUTED }}>{e.time}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate" style={{ color: TEXT_PRIMARY }}>{e.title}</p>
                  {e.subtitle && <p className="text-[12px] truncate" style={{ color: TEXT_SECONDARY }}>{e.subtitle}</p>}
                </div>
              </li>
            ))}
          </ol>
        </article>
      );
    })}
  </div>
);

/** D — Gradient banner top + dense info (calendar-week feel) */
export const ItineraryD: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="rtl">
    {days.map(d => {
      const c = getCityColor(d.city);
      return (
        <article key={d.id} className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }}>
          <header className="px-4 py-3 text-white" style={{ background: `linear-gradient(135deg, ${c.accent} 0%, ${c.accent}cc 100%)` }}>
            <div className="flex items-baseline justify-between">
              <p className="text-[15px] font-semibold tracking-tight">יום {d.day} · {c.label}</p>
              <p className="text-[11px] font-medium opacity-85 tabular-nums">{d.date}</p>
            </div>
            <p className="text-[11px] font-medium uppercase tracking-wider mt-0.5 opacity-85">{d.dayOfWeek} · {d.events.length} פעילויות</p>
          </header>
          <ol className="px-4 py-3 space-y-1.5">
            {d.events.map(e => (
              <li key={e.id} className="flex items-baseline gap-2 text-[13px]">
                <span className="font-mono font-medium tabular-nums w-11 flex-shrink-0" style={{ color: TEXT_MUTED }}>{e.time}</span>
                <span className="truncate font-medium" style={{ color: TEXT_PRIMARY }}>{e.title}</span>
              </li>
            ))}
          </ol>
        </article>
      );
    })}
  </div>
);

export const ITINERARY_VARIANTS = [
  { id: 'A', title: 'A — פס צבע מלא לכותרת', subtitle: 'הכותרת בצבע העיר במלוא הרוחב, טקסט לבן. הכי קרוב לסגנון הקיים', Component: ItineraryA },
  { id: 'B', title: 'B — תמונת רקע לכותרת', subtitle: 'תמונה של העיר עם גרדיאנט כהה + טקסט לבן. תואם את הבאנר בדף הבית', Component: ItineraryB },
  { id: 'C', title: 'C — בלוק צד מגזיני', subtitle: 'פאנל אנכי צבעוני עם מספר היום + שם העיר; רשימת אירועים בצד', Component: ItineraryC },
  { id: 'D', title: 'D — גריד דו-עמודות', subtitle: 'גרדיאנט שיפועי בכותרת + תצוגה דחוסה בשתי עמודות; כל הטיול במבט אחד', Component: ItineraryD },
];
