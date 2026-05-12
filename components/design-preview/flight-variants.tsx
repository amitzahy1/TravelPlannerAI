/** 4 flight card variants — one is a real boarding pass. */
import React from 'react';
import { Plane, Clock, User, MapPin } from 'lucide-react';
import { previewFlights, ACCENT } from './fixtures';

const flight = previewFlights[0];

/** A — Real boarding pass (the user's specific ask) */
export const FlightA: React.FC = () => (
  <article className="bg-white rounded-2xl overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-shadow max-w-md" dir="ltr">
    {/* Airline header strip */}
    <header className="px-4 py-3 flex items-center justify-between" style={{ background: flight.airlineColor, color: flight.airlineTextColor }}>
      <div className="flex items-center gap-2">
        <Plane className="w-5 h-5" />
        <span className="font-black uppercase tracking-wider text-xs">{flight.airline}</span>
      </div>
      <span className="font-mono font-black text-sm">{flight.flightNumber}</span>
    </header>
    <div className="flex items-stretch">
      {/* Main pass info */}
      <div className="flex-1 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">FROM</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter mt-0.5">{flight.fromCode}</p>
            <p className="text-xs font-bold text-slate-600 mt-0.5">{flight.fromCity}</p>
          </div>
          <div className="flex flex-col items-center px-3 pb-2">
            <Plane className="w-5 h-5 text-slate-300 mb-1" />
            <span className="text-[10px] font-bold text-slate-400">{flight.duration}</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">TO</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter mt-0.5">{flight.toCode}</p>
            <p className="text-xs font-bold text-slate-600 mt-0.5">{flight.toCity}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-dashed border-slate-200">
          <Field label="DATE" value={flight.date} />
          <Field label="DEPART" value={flight.departureTime} />
          <Field label="ARRIVE" value={flight.arrivalTime} />
        </div>
      </div>
      {/* perforated divider */}
      <div className="relative w-6 flex-shrink-0 bg-slate-50">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-r-2 border-dashed border-slate-300" />
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white" />
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white" />
      </div>
      {/* Stub */}
      <div className="w-28 flex-shrink-0 p-4 bg-slate-50 flex flex-col justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">SEAT</p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{flight.seat}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">CLASS</p>
          <p className="text-xs font-black text-slate-700 mt-0.5">{flight.cabinClass}</p>
        </div>
        {flight.gate && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">GATE</p>
            <p className="text-base font-black text-slate-900 mt-0.5">{flight.gate}</p>
          </div>
        )}
      </div>
    </div>
  </article>
);

/** B — Horizontal timeline (origin → plane → destination) */
export const FlightB: React.FC = () => (
  <article className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow" dir="ltr">
    <header className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: flight.airlineColor, color: flight.airlineTextColor }}>
          <Plane className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-900">{flight.airline}</p>
          <p className="text-[11px] font-mono font-bold text-slate-500">{flight.flightNumber}</p>
        </div>
      </div>
      <span className="text-[11px] font-bold text-slate-500">{flight.date}</span>
    </header>
    <div className="flex items-center gap-4">
      <div className="text-center">
        <p className="text-2xl font-black text-slate-900 tracking-tight">{flight.departureTime}</p>
        <p className="text-sm font-black text-slate-700 mt-0.5">{flight.fromCode}</p>
        <p className="text-[10px] text-slate-500">{flight.fromCity}</p>
      </div>
      <div className="flex-1 flex flex-col items-center gap-1.5">
        <span className="text-[10px] font-bold text-slate-400">{flight.duration}</span>
        <div className="w-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
          <span className="flex-1 h-px border-t-2 border-dashed border-slate-300" />
          <Plane className="w-3.5 h-3.5 text-slate-400" />
          <span className="flex-1 h-px border-t-2 border-dashed border-slate-300" />
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: ACCENT }} />
        </div>
        <span className="text-[10px] font-bold text-slate-400">{flight.cabinClass}</span>
      </div>
      <div className="text-center">
        <p className="text-2xl font-black text-slate-900 tracking-tight">{flight.arrivalTime}</p>
        <p className="text-sm font-black text-slate-700 mt-0.5">{flight.toCode}</p>
        <p className="text-[10px] text-slate-500">{flight.toCity}</p>
      </div>
    </div>
  </article>
);

/** C — Itinerary row (minimal, list-friendly) */
export const FlightC: React.FC = () => (
  <article className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow" dir="ltr">
    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: flight.airlineColor, color: flight.airlineTextColor }}>
      <Plane className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-black text-slate-900">{flight.fromCode}</span>
        <span className="text-xs text-slate-400">→</span>
        <span className="text-sm font-black text-slate-900">{flight.toCode}</span>
        <span className="text-xs text-slate-500 ml-auto font-mono">{flight.flightNumber}</span>
      </div>
      <p className="text-xs text-slate-500 mt-0.5">
        {flight.departureTime} – {flight.arrivalTime} · {flight.duration} · {flight.airline}
      </p>
    </div>
  </article>
);

/** D — Airline-branded card (adopts the airline's brand colors) */
export const FlightD: React.FC = () => (
  <article className="rounded-3xl overflow-hidden shadow-lg cursor-pointer hover:shadow-xl transition-shadow max-w-md" style={{ background: flight.airlineColor }} dir="ltr">
    <div className="p-5 text-white">
      <header className="flex items-center justify-between mb-5">
        <span className="font-black uppercase tracking-wider text-sm opacity-90">{flight.airline}</span>
        <span className="font-mono font-black text-sm bg-white/20 backdrop-blur-md px-2 py-0.5 rounded">{flight.flightNumber}</span>
      </header>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-5xl font-black tracking-tighter">{flight.fromCode}</p>
          <p className="text-xs font-bold opacity-80 mt-1">{flight.fromCity}</p>
          <p className="text-base font-black mt-2">{flight.departureTime}</p>
        </div>
        <div className="pb-2 opacity-60">
          <Plane className="w-10 h-10" />
        </div>
        <div className="text-right">
          <p className="text-5xl font-black tracking-tighter">{flight.toCode}</p>
          <p className="text-xs font-bold opacity-80 mt-1">{flight.toCity}</p>
          <p className="text-base font-black mt-2">{flight.arrivalTime}</p>
        </div>
      </div>
    </div>
    <div className="px-5 py-3 bg-black/20 backdrop-blur-sm text-white flex items-center justify-between text-xs font-bold">
      <span>{flight.date}</span>
      <span>{flight.duration}</span>
      <span>{flight.seat ? `${flight.seat} · ${flight.cabinClass}` : flight.cabinClass}</span>
    </div>
  </article>
);

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
    <p className="text-sm font-black text-slate-900 mt-0.5">{value}</p>
  </div>
);

export const FLIGHT_VARIANTS = [
  { id: 'A', title: 'A — Boarding pass', subtitle: 'כרטיס טיסה אמיתי עם קו מנוקב; הכי דרמטי', Component: FlightA },
  { id: 'B', title: 'B — Timeline', subtitle: 'מוצא ⇆ יעד אופקי עם מטוס באמצע', Component: FlightB },
  { id: 'C', title: 'C — Simple row', subtitle: 'שורה דחוסה למובייל ולרשימות ארוכות', Component: FlightC },
  { id: 'D', title: 'D — Airline brand', subtitle: 'הכרטיס לובש את צבעי חברת התעופה', Component: FlightD },
];
