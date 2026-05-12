/** Round 8 — 4 plane-mark logo refinements (same direction, vary font/weight/anim). */
import React from 'react';
import { ACCENT } from './fixtures';

const PlaneIcon: React.FC<{ size: number; stroke?: number; outline?: boolean }> = ({ size, stroke = 0, outline = false }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={outline ? 'none' : 'currentColor'} stroke={outline ? 'currentColor' : 'none'} strokeWidth={stroke}>
    <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1l3.5 1v-1.5L13 19v-5.5l8 2.5Z" />
  </svg>
);

const SIZES = {
  sm: { box: 'w-7 h-7', icon: 14, text: 'text-[14px]', tag: 'text-[9px]', gap: 'gap-2' },
  md: { box: 'w-10 h-10', icon: 20, text: 'text-[20px]', tag: 'text-[10px]', gap: 'gap-2.5' },
  lg: { box: 'w-14 h-14', icon: 28, text: 'text-[28px]', tag: 'text-[11px]', gap: 'gap-3' },
};
const TAG = 'AI Trip Organizer';

/** A — Inter Tight Bold + sleek minimal plane */
export const LogoA: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const d = SIZES[size];
  return (
    <div className={`flex items-center ${d.gap} select-none`}>
      <div className={`${d.box} rounded-2xl flex items-center justify-center text-white`} style={{ background: ACCENT, boxShadow: '0 1px 3px rgba(15,118,110,0.25)' }}>
        <PlaneIcon size={d.icon} />
      </div>
      <div className="flex flex-col leading-none">
        <span className={`font-semibold ${d.text} text-slate-900`} style={{ letterSpacing: '-0.02em', fontFamily: "'Inter Tight', Inter, sans-serif" }}>
          WeTravel
        </span>
        <span className={`${d.tag} font-medium tracking-widest mt-1 uppercase`} style={{ color: '#94A3B8' }}>{TAG}</span>
      </div>
    </div>
  );
};

/** B — Outline plane + heavier display weight */
export const LogoB: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const d = SIZES[size];
  return (
    <div className={`flex items-center ${d.gap} select-none`}>
      <div className={`${d.box} rounded-xl flex items-center justify-center border-2`} style={{ borderColor: ACCENT, color: ACCENT }}>
        <PlaneIcon size={d.icon} outline stroke={1.6} />
      </div>
      <div className="flex flex-col leading-none">
        <span className={`font-bold ${d.text} text-slate-900`} style={{ letterSpacing: '-0.025em', fontFamily: "'Inter Display', Inter, sans-serif" }}>
          WeTravel
        </span>
        <span className={`${d.tag} font-medium tracking-widest mt-1 uppercase`} style={{ color: '#94A3B8' }}>{TAG}</span>
      </div>
    </div>
  );
};

/** C — All-caps wordmark, plane shifted up */
export const LogoC: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const d = SIZES[size];
  return (
    <div className={`flex items-end ${d.gap} select-none`}>
      <div className={`${d.box} rounded-2xl flex items-center justify-center text-white -translate-y-1`} style={{ background: ACCENT }}>
        <PlaneIcon size={d.icon} />
      </div>
      <span className={`font-semibold ${d.text} text-slate-900 leading-none`} style={{ letterSpacing: '0.08em', fontFamily: "'Inter Tight', Inter, sans-serif" }}>
        WETRAVEL
      </span>
    </div>
  );
};

/** D — Same as A but with idle + hover animation */
export const LogoD: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const d = SIZES[size];
  return (
    <div className={`flex items-center ${d.gap} select-none group logo-d-root`}>
      <div className={`${d.box} rounded-2xl flex items-center justify-center text-white transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:rotate-[-12deg] logo-d-icon`}
           style={{ background: ACCENT, boxShadow: '0 1px 3px rgba(15,118,110,0.25)' }}>
        <PlaneIcon size={d.icon} />
      </div>
      <div className="flex flex-col leading-none">
        <span className={`font-semibold ${d.text} text-slate-900`} style={{ letterSpacing: '-0.02em', fontFamily: "'Inter Tight', Inter, sans-serif" }}>
          WeTravel
        </span>
        <span className={`${d.tag} font-medium tracking-widest mt-1 uppercase`} style={{ color: '#94A3B8' }}>{TAG}</span>
      </div>
      <style>{`
        @keyframes logo-d-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        .logo-d-root .logo-d-icon { animation: logo-d-bob 3s ease-in-out infinite; }
        .logo-d-root:hover .logo-d-icon { animation: none; }
      `}</style>
    </div>
  );
};

export const LOGO_VARIANTS = [
  { id: 'A', title: 'A — Inter Tight, מטוס מלא', subtitle: 'הסגנון הקיים, מודרני ונקי; ריבוע צבע מלא', Component: LogoA },
  { id: 'B', title: 'B — מתאר במקום מלא', subtitle: 'מטוס בקווי מתאר + ריבוע שקוף עם קצה צבעוני; אלגנטי', Component: LogoB },
  { id: 'C', title: 'C — אותיות גדולות', subtitle: 'WETRAVEL בריווח כתב-עת; מטוס מועלה מעט', Component: LogoC },
  { id: 'D', title: 'D — אנימציה עדינה', subtitle: 'המטוס מתנדנד עדין בלולאה ומתרומם בריחוף', Component: LogoD },
];
