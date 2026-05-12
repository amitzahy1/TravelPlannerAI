/** 4 itinerary variants for the day-by-day plan. */
import React from 'react';
import { ChevronLeft, Circle, MapPin } from 'lucide-react';
import { previewItinerary, ACCENT, ACCENT_SOFT } from './fixtures';

const day = previewItinerary[0];

/** A — Vertical timeline rail (dotted line, events to the right) */
export const ItineraryA: React.FC = () => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm" dir="rtl">
    <header className="flex items-baseline justify-between mb-4 pb-3 border-b border-slate-100">
      <h3 className="text-lg font-black text-slate-900 tracking-tight">
        יום {day.day} <span className="text-sm font-bold text-slate-400 ms-1">· {day.dayOfWeek} {day.date}</span>
      </h3>
      <span className="text-xs font-bold text-slate-500">{day.city}</span>
    </header>
    <ol className="relative pr-6">
      <div className="absolute right-2 top-1 bottom-1 w-px border-r-2 border-dashed border-slate-200" />
      {day.events.map(e => (
        <li key={e.id} className="relative pb-4 last:pb-0 group">
          <span
            className="absolute right-[-7px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow"
            style={{ background: ACCENT }}
          />
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-mono font-bold text-slate-400">{e.time}</span>
            <span className="text-base">{e.emoji}</span>
            <span className="text-sm font-bold text-slate-900">{e.title}</span>
          </div>
          {e.subtitle && <p className="text-xs text-slate-500 ms-12 mt-0.5">{e.subtitle}</p>}
        </li>
      ))}
    </ol>
  </div>
);

/** B — Day-as-card grid (each day a self-contained rounded card) */
export const ItineraryB: React.FC = () => (
  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm" dir="rtl">
    <header className="px-5 py-4" style={{ background: ACCENT_SOFT }}>
      <div className="flex items-baseline justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight" style={{ color: ACCENT }}>יום {day.day}</span>
          <span className="text-xs font-bold text-slate-500">{day.dayOfWeek} · {day.date}</span>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
          <MapPin className="w-3 h-3" /> {day.city}
        </span>
      </div>
    </header>
    <ol className="p-5 space-y-3">
      {day.events.map(e => (
        <li key={e.id} className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg flex-shrink-0">
            {e.emoji}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-black text-slate-900">{e.title}</span>
              <span className="text-xs font-mono font-bold text-slate-400 ms-auto">{e.time}</span>
            </div>
            {e.subtitle && <p className="text-xs text-slate-500 mt-0.5">{e.subtitle}</p>}
          </div>
        </li>
      ))}
    </ol>
  </div>
);

/** C — Spreadsheet row view (table-like, dense, info-rich) */
export const ItineraryC: React.FC = () => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm" dir="rtl">
    <header className="px-4 py-2.5 border-b border-slate-200 bg-slate-50">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-black text-slate-900 tracking-tight">
          יום {day.day} · {day.dayOfWeek} {day.date}
        </h3>
        <span className="text-xs text-slate-500">{day.city}</span>
      </div>
    </header>
    <table className="w-full text-sm">
      <tbody>
        {day.events.map((e, i) => (
          <tr key={e.id} className={`hover:bg-slate-50 transition-colors ${i !== day.events.length - 1 ? 'border-b border-slate-100' : ''}`}>
            <td className="px-3 py-2.5 font-mono text-xs font-bold text-slate-500 w-16 align-top">{e.time}</td>
            <td className="px-1 py-2.5 w-8 text-base align-top">{e.emoji}</td>
            <td className="px-2 py-2.5 align-top">
              <p className="font-bold text-slate-900 text-sm">{e.title}</p>
              {e.subtitle && <p className="text-xs text-slate-500 mt-0.5">{e.subtitle}</p>}
            </td>
            <td className="px-3 py-2.5 text-end align-top">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{e.type}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/** D — Map-anchored day (inline map preview + events) */
export const ItineraryD: React.FC = () => (
  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm" dir="rtl">
    <div className="flex">
      <div className="w-32 flex-shrink-0 relative bg-gradient-to-br from-emerald-100 via-sky-100 to-teal-100">
        {/* Mock mini-map with route */}
        <svg viewBox="0 0 128 200" className="w-full h-full">
          <path d="M 30 30 Q 70 80 50 130 T 90 170" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="0" />
          {[[30, 30], [70, 80], [50, 130], [90, 170]].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="6" fill="#fff" stroke={ACCENT} strokeWidth="2" />
              <text x={x} y={y + 3} textAnchor="middle" fontSize="8" fontWeight="900" fill={ACCENT}>{i + 1}</text>
            </g>
          ))}
        </svg>
        <span className="absolute bottom-2 inset-x-2 text-[10px] font-bold text-center text-slate-600 backdrop-blur-md bg-white/80 rounded-full px-2 py-0.5">
          {day.city}
        </span>
      </div>
      <div className="flex-1 p-4">
        <header className="flex items-baseline justify-between mb-3">
          <h3 className="text-base font-black text-slate-900 tracking-tight">
            יום {day.day} · {day.dayOfWeek}
          </h3>
          <span className="text-xs text-slate-400">{day.date}</span>
        </header>
        <ol className="space-y-2">
          {day.events.map((e, i) => (
            <li key={e.id} className="flex items-baseline gap-2 text-sm">
              <span className="inline-flex w-5 h-5 rounded-full text-[10px] font-black items-center justify-center flex-shrink-0" style={{ background: ACCENT_SOFT, color: ACCENT }}>{i + 1}</span>
              <span className="text-xs font-mono text-slate-500 flex-shrink-0">{e.time}</span>
              <span className="text-sm font-bold text-slate-900 truncate flex-1">{e.title}</span>
              <span className="text-base flex-shrink-0">{e.emoji}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  </div>
);

export const ITINERARY_VARIANTS = [
  { id: 'A', title: 'A — Timeline rail', subtitle: 'אירועים על קו אנכי מנוקד עם נקודות', Component: ItineraryA },
  { id: 'B', title: 'B — Day card', subtitle: 'כל יום ככרטיס נפרד עם כותרת צבעונית', Component: ItineraryB },
  { id: 'C', title: 'C — Spreadsheet', subtitle: 'תצוגת טבלה צפופה — שורה לכל אירוע', Component: ItineraryC },
  { id: 'D', title: 'D — Map-anchored', subtitle: 'תצוגת מיני-מפה של המסלול היומי לצד הרשימה', Component: ItineraryD },
];
