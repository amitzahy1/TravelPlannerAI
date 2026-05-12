/** Round 8 — 4 refined boarding-pass variants.
 *  No fake SEAT/CLASS/GATE — substitute fields we actually have (PNR, status,
 *  day-of-week, etc.). Always include the airline logo. */
import React from 'react';
import { Plane } from 'lucide-react';
import { previewFlights, ACCENT, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED, HAIRLINE } from './fixtures';

const flight = previewFlights[0];

const PassShell: React.FC<{ stub: React.ReactNode }> = ({ stub }) => (
  <article className="bg-white rounded-2xl overflow-hidden cursor-pointer max-w-md" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)' }} dir="ltr">
    {/* Airline color thin header strip with logo + name (24px tall, premium rule) */}
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
      {/* Main */}
      <div className="flex-1 p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>From</p>
            <p className="text-[40px] font-semibold tracking-tighter leading-none mt-1" style={{ color: TEXT_PRIMARY }}>{flight.fromCode}</p>
            <p className="text-[12px] font-medium mt-1" style={{ color: TEXT_SECONDARY }}>{flight.fromCity}</p>
          </div>
          <div className="flex flex-col items-center pb-1">
            <Plane className="w-4 h-4 mb-1" style={{ color: TEXT_MUTED }} />
            <span className="text-[10px] font-medium" style={{ color: TEXT_MUTED }}>{flight.duration}</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>To</p>
            <p className="text-[40px] font-semibold tracking-tighter leading-none mt-1" style={{ color: TEXT_PRIMARY }}>{flight.toCode}</p>
            <p className="text-[12px] font-medium mt-1" style={{ color: TEXT_SECONDARY }}>{flight.toCity}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-dashed" style={{ borderColor: HAIRLINE }}>
          <Field label="Date" value={flight.date} />
          <Field label="Depart" value={flight.departureTime} />
          <Field label="Arrive" value={flight.arrivalTime} />
        </div>
      </div>
      {/* perforated divider */}
      <div className="relative w-6 flex-shrink-0 bg-slate-50">
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 border-r-2 border-dashed" style={{ borderColor: HAIRLINE }} />
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white" />
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white" />
      </div>
      {/* Stub */}
      <div className="w-28 flex-shrink-0 p-4 bg-slate-50 flex flex-col justify-between gap-3">
        {stub}
      </div>
    </div>
  </article>
);

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>{label}</p>
    <p className="text-[13px] font-semibold mt-1 tabular-nums" style={{ color: TEXT_PRIMARY }}>{value}</p>
  </div>
);

const StubField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: TEXT_MUTED }}>{label}</p>
    <div className="mt-1">{children}</div>
  </div>
);

/** A — PNR + duration in stub */
export const FlightA: React.FC = () => (
  <PassShell
    stub={
      <>
        <StubField label="Booking">
          <p className="font-mono text-[14px] font-semibold tracking-wider tabular-nums" style={{ color: TEXT_PRIMARY }}>{flight.pnr}</p>
        </StubField>
        <StubField label="Duration">
          <p className="text-[13px] font-medium" style={{ color: TEXT_PRIMARY }}>{flight.duration}</p>
        </StubField>
      </>
    }
  />
);

/** B — Class + status in stub */
export const FlightB: React.FC = () => {
  const statusLabel = flight.status || 'Confirmed';
  return (
    <PassShell
      stub={
        <>
          {flight.cabinClass && (
            <StubField label="Class">
              <p className="text-[13px] font-semibold" style={{ color: TEXT_PRIMARY }}>{flight.cabinClass}</p>
            </StubField>
          )}
          <StubField label="Status">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: statusLabel === 'Confirmed' ? ACCENT : '#FEF3C7', color: statusLabel === 'Confirmed' ? '#FFFFFF' : '#92400E' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" /> {statusLabel}
            </span>
          </StubField>
        </>
      }
    />
  );
};

/** C — Day-of-week + month (date marker) */
export const FlightC: React.FC = () => {
  const [year, month, day] = flight.date.split('-');
  const monthLabel = new Date(flight.date).toLocaleDateString('en-GB', { month: 'short' });
  return (
    <PassShell
      stub={
        <>
          <StubField label="Day">
            <p className="text-[18px] font-semibold leading-none tracking-tight" style={{ color: TEXT_PRIMARY }}>{flight.dateDayOfWeek}</p>
            <p className="text-[24px] font-semibold leading-none tabular-nums mt-1" style={{ color: ACCENT }}>{day}<span className="text-[12px] font-medium ml-1" style={{ color: TEXT_MUTED }}>{monthLabel}</span></p>
          </StubField>
          {flight.dayOfTrip && (
            <StubField label="Trip">
              <p className="text-[12px] font-medium" style={{ color: TEXT_PRIMARY }}>יום {flight.dayOfTrip} בטיול</p>
            </StubField>
          )}
        </>
      }
    />
  );
};

/** D — Minimal logo-led stub */
export const FlightD: React.FC = () => (
  <PassShell
    stub={
      <>
        <div className="flex flex-col items-center justify-center pt-2">
          <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-sm">
            <img src={flight.airlineLogoUrl} alt="" className="w-12 h-12 object-contain" />
          </div>
          <p className="font-mono text-[14px] font-semibold mt-2 tabular-nums" style={{ color: TEXT_PRIMARY }}>{flight.flightNumber}</p>
        </div>
        <p className="text-[10px] text-center font-medium" style={{ color: TEXT_MUTED }}>
          {flight.airline}
        </p>
      </>
    }
  />
);

export const FLIGHT_VARIANTS = [
  { id: 'A', title: 'A — PNR + משך', subtitle: 'מספר הזמנה גדול בסטאב + משך טיסה', Component: FlightA },
  { id: 'B', title: 'B — מחלקה + סטטוס', subtitle: 'מחלקת טיסה ותג סטטוס אישור/בזמן', Component: FlightB },
  { id: 'C', title: 'C — יום ותאריך', subtitle: 'דגש על יום בשבוע + מספר היום בטיול', Component: FlightC },
  { id: 'D', title: 'D — לוגו מוגדל', subtitle: 'מינימליסטי; הלוגו של חברת התעופה תופס את הסטאב', Component: FlightD },
];
