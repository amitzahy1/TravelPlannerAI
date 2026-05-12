/** Round 10 — 4 refinements in the picked "PNR + duration" boarding-pass direction.
 *  All variants keep the airline logo + airline color header strip + perforated
 *  divider; the stub varies (label sizing, layout, accent placement). */
import React from 'react';
import { Plane, Clock } from 'lucide-react';
import { previewFlights, ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, HAIRLINE } from './fixtures';

const flight = previewFlights[0];

const PassShell: React.FC<{ stub: React.ReactNode }> = ({ stub }) => (
  <article className="bg-white rounded-2xl overflow-hidden mx-auto" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)', maxWidth: 460 }} dir="ltr">
    <header className="px-4 py-2 flex items-center justify-between" style={{ background: flight.airlineColor }}>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
          <img src={flight.airlineLogoUrl} alt="" className="w-6 h-6 object-contain" />
        </div>
        <span className="text-white text-[11px] font-semibold uppercase tracking-wider">{flight.airline}</span>
      </div>
      <span className="font-mono text-white text-[13px] font-semibold tabular-nums">{flight.flightNumber}</span>
    </header>
    <div className="flex items-stretch">
      <div className="flex-1 p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>From</p>
            <p className="text-[34px] font-semibold tracking-tighter leading-none mt-1" style={{ color: TEXT_PRIMARY }}>{flight.fromCode}</p>
            <p className="text-[11px] font-medium mt-1" style={{ color: TEXT_SECONDARY }}>{flight.fromCity}</p>
          </div>
          <div className="flex flex-col items-center pb-1">
            <Plane className="w-3.5 h-3.5 mb-1" style={{ color: TEXT_MUTED }} />
            <span className="text-[10px] font-medium" style={{ color: TEXT_MUTED }}>{flight.duration}</span>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>To</p>
            <p className="text-[34px] font-semibold tracking-tighter leading-none mt-1" style={{ color: TEXT_PRIMARY }}>{flight.toCode}</p>
            <p className="text-[11px] font-medium mt-1" style={{ color: TEXT_SECONDARY }}>{flight.toCity}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-dashed" style={{ borderColor: HAIRLINE }}>
          <Field label="Date"   value={flight.date} />
          <Field label="Depart" value={flight.departureTime} />
          <Field label="Arrive" value={flight.arrivalTime} />
        </div>
      </div>
      <div className="relative w-6 flex-shrink-0 bg-slate-50">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-r-2 border-dashed" style={{ borderColor: HAIRLINE }} />
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white" />
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white" />
      </div>
      <div className="w-24 flex-shrink-0 p-3 bg-slate-50 flex flex-col justify-between gap-2">
        {stub}
      </div>
    </div>
  </article>
);

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>{label}</p>
    <p className="text-[12px] font-semibold mt-0.5 tabular-nums" style={{ color: TEXT_PRIMARY }}>{value}</p>
  </div>
);

const StubLabel: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>{label}</p>
    <div className="mt-0.5">{children}</div>
  </div>
);

/** A — Refined baseline: PNR + duration vertically stacked */
export const FlightA: React.FC = () => (
  <PassShell stub={
    <>
      <StubLabel label="Booking">
        <p className="font-mono text-[13px] font-semibold tracking-wider tabular-nums" style={{ color: TEXT_PRIMARY }}>{flight.pnr}</p>
      </StubLabel>
      <StubLabel label="Duration">
        <p className="text-[12px] font-semibold inline-flex items-center gap-1" style={{ color: TEXT_PRIMARY }}>
          <Clock className="w-3 h-3" style={{ color: TEXT_MUTED }} /> {flight.duration}
        </p>
      </StubLabel>
    </>
  } />
);

/** B — PNR as a hero text, duration as small line */
export const FlightB: React.FC = () => (
  <PassShell stub={
    <>
      <div className="flex flex-col items-center pt-2">
        <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>PNR</p>
        <p className="font-mono text-[18px] font-semibold tracking-wider tabular-nums leading-none mt-1" style={{ color: ACCENT }}>{flight.pnr}</p>
      </div>
      <div className="text-center text-[11px] font-medium pb-1" style={{ color: TEXT_SECONDARY }}>
        <Clock className="w-3 h-3 inline -mt-0.5 me-0.5" /> {flight.duration}
      </div>
    </>
  } />
);

/** C — PNR + duration in a 2-row pill stack, accent-bordered */
export const FlightC: React.FC = () => (
  <PassShell stub={
    <>
      <div className="rounded-lg border px-2 py-1.5 text-center" style={{ borderColor: HAIRLINE }}>
        <p className="text-[8px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>Booking</p>
        <p className="font-mono text-[12px] font-semibold tabular-nums mt-0.5" style={{ color: TEXT_PRIMARY }}>{flight.pnr}</p>
      </div>
      <div className="rounded-lg px-2 py-1.5 text-center text-white" style={{ background: ACCENT }}>
        <p className="text-[8px] font-semibold uppercase tracking-widest opacity-85">Duration</p>
        <p className="text-[12px] font-semibold mt-0.5">{flight.duration}</p>
      </div>
    </>
  } />
);

/** D — Compact: PNR centered, duration as a horizontal sub-line under */
export const FlightD: React.FC = () => (
  <PassShell stub={
    <div className="flex flex-col items-center justify-center h-full gap-1">
      <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>Booking</p>
      <p className="font-mono text-[15px] font-semibold tabular-nums tracking-wider" style={{ color: TEXT_PRIMARY }}>{flight.pnr}</p>
      <div className="w-full pt-1.5 mt-1 border-t border-dashed flex items-center justify-center gap-1 text-[10px] font-medium tabular-nums" style={{ borderColor: HAIRLINE, color: TEXT_MUTED }}>
        <Clock className="w-2.5 h-2.5" /> {flight.duration}
      </div>
    </div>
  } />
);

export const FLIGHT_VARIANTS = [
  { id: 'A', title: 'A — Booking + Duration במחסנית', subtitle: 'PNR למעלה, משך טיסה למטה — נקי וברור (הבסיס שבחרת)',  Component: FlightA },
  { id: 'B', title: 'B — PNR ענק בצבע מותג',         subtitle: 'הPNR בולט במיוחד בצבע הטיל; משך טיסה כתת-כותרת',     Component: FlightB },
  { id: 'C', title: 'C — שתי כרטיסיות מובדלות',      subtitle: 'PNR בקופסה לבנה + משך טיסה בקופסה צבעונית מתחת',     Component: FlightC },
  { id: 'D', title: 'D — מרכזי-במיוחד',               subtitle: 'הPNR ממורכז עם משך טיסה כתת-שורה דקיקה למטה',       Component: FlightD },
];
