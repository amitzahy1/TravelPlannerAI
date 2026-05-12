/** Round 8 — 4 refined "day card" itinerary variants.
 *  Premium rules: NO emojis or colored type icons; city color = subtle accent only;
 *  8-day demo so density is judged at realistic length. */
import React from 'react';
import { previewItinerary, getCityColor, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, HAIRLINE } from './fixtures';

const days = previewItinerary;

/** A — Numbered marker + colored RTL bar */
export const ItineraryA: React.FC = () => (
  <div className="space-y-3" dir="rtl">
    {days.map(d => {
      const c = getCityColor(d.city);
      return (
        <article key={d.id} className="bg-white rounded-2xl overflow-hidden relative" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }}>
          <span className="absolute right-0 top-0 bottom-0 w-1" style={{ background: c.accent }} aria-hidden />
          <div className="ps-4 pe-5 py-4">
            <header className="flex items-baseline justify-between mb-3 pb-2.5 border-b" style={{ borderColor: HAIRLINE }}>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-semibold tracking-tight" style={{ color: c.accent }}>{d.day}</span>
                <div>
                  <p className="text-[13px] font-semibold" style={{ color: TEXT_PRIMARY }}>{d.dayOfWeek}, {d.date}</p>
                  <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: TEXT_MUTED }}>{c.label}</p>
                </div>
              </div>
            </header>
            <ol className="space-y-2">
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
          </div>
        </article>
      );
    })}
  </div>
);

/** B — Pill date header */
export const ItineraryB: React.FC = () => (
  <div className="space-y-3" dir="rtl">
    {days.map(d => {
      const c = getCityColor(d.city);
      return (
        <article key={d.id} className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }}>
          <header className="px-5 pt-4 pb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[13px] font-semibold" style={{ background: c.soft, color: c.accent }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.accent }} />
              יום {d.day} · {d.dayOfWeek}
            </span>
            <span className="text-[12px] font-medium" style={{ color: TEXT_MUTED }}>{c.label} · {d.date}</span>
          </header>
          <ol className="px-5 pb-4">
            {d.events.map((e, i) => (
              <li key={e.id} className={`grid grid-cols-[60px,1fr] gap-4 py-2 ${i !== d.events.length - 1 ? 'border-b' : ''}`} style={{ borderColor: HAIRLINE }}>
                <span className="font-mono font-semibold tabular-nums text-[13px]" style={{ color: TEXT_MUTED }}>{e.time}</span>
                <div className="min-w-0">
                  <p className="text-[14px] font-medium" style={{ color: TEXT_PRIMARY }}>{e.title}</p>
                  {e.subtitle && <p className="text-[12px] mt-0.5" style={{ color: TEXT_SECONDARY }}>{e.subtitle}</p>}
                </div>
              </li>
            ))}
          </ol>
        </article>
      );
    })}
  </div>
);

/** C — Magazine-spread (city as editorial title) */
export const ItineraryC: React.FC = () => (
  <div className="space-y-4" dir="rtl">
    {days.map(d => {
      const c = getCityColor(d.city);
      return (
        <article key={d.id} className="bg-white rounded-2xl px-6 py-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }}>
          <header className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>יום {d.day} · {d.dayOfWeek} · {d.date}</p>
              <h3 className="text-[22px] font-semibold tracking-tight mt-0.5" style={{ color: c.accent }}>{c.label}</h3>
            </div>
            <span className="text-[12px] font-medium" style={{ color: TEXT_MUTED }}>{d.events.length} פעילויות</span>
          </header>
          <ol className="space-y-2.5">
            {d.events.map((e, i) => (
              <li key={e.id} className="flex items-baseline gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-widest tabular-nums w-6 flex-shrink-0" style={{ color: c.accent }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="font-mono font-medium text-[13px] tabular-nums w-14 flex-shrink-0" style={{ color: TEXT_MUTED }}>{e.time}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium" style={{ color: TEXT_PRIMARY }}>{e.title}</p>
                  {e.subtitle && <p className="text-[12px]" style={{ color: TEXT_SECONDARY }}>{e.subtitle}</p>}
                </div>
              </li>
            ))}
          </ol>
        </article>
      );
    })}
  </div>
);

/** D — Compact 2-column grid (whole-trip-at-a-glance) */
export const ItineraryD: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="rtl">
    {days.map(d => {
      const c = getCityColor(d.city);
      return (
        <article key={d.id} className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }}>
          <div className="h-1" style={{ background: c.accent }} aria-hidden />
          <div className="px-4 py-3">
            <header className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[16px] font-semibold tracking-tight" style={{ color: TEXT_PRIMARY }}>יום {d.day}</span>
                <span className="text-[12px] font-medium" style={{ color: TEXT_SECONDARY }}>{d.dayOfWeek}</span>
              </div>
              <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: c.accent }}>{c.label}</span>
            </header>
            <ol className="space-y-1.5">
              {d.events.map(e => (
                <li key={e.id} className="flex items-baseline gap-2 text-[13px]">
                  <span className="font-mono font-medium tabular-nums" style={{ color: TEXT_MUTED }}>{e.time}</span>
                  <span className="truncate" style={{ color: TEXT_PRIMARY }}>{e.title}</span>
                </li>
              ))}
            </ol>
          </div>
        </article>
      );
    })}
  </div>
);

export const ITINERARY_VARIANTS = [
  { id: 'A', title: 'A — Day number + side bar', subtitle: 'מספר יום גדול + פס צבע צד לעיר; שורות אירוע נקיות', Component: ItineraryA },
  { id: 'B', title: 'B — Pill date header', subtitle: 'תוית עיר צבעונית כפיל; טבלה דו-עמודתית נקייה', Component: ItineraryB },
  { id: 'C', title: 'C — Magazine spread', subtitle: 'שם העיר ככותרת ראשית עריכתית; מספרי אירוע', Component: ItineraryC },
  { id: 'D', title: 'D — Whole-trip glance', subtitle: 'גריד 2-עמודות; פס צבע עליון; מינימליסטי לסקירה', Component: ItineraryD },
];
