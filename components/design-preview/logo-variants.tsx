/** 4 logo concepts. Each is a self-contained SVG component + a wordmark. */
import React from 'react';
import { ACCENT } from './fixtures';

const WORD = 'WeTravel';
const TAG = 'AI Trip Organizer';

/** A — Plane + wordmark (current style, refined) */
export const LogoA: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dims = size === 'sm' ? { box: 'w-7 h-7', icon: 'w-3.5 h-3.5', text: 'text-sm', tag: 'text-[8px]' }
            : size === 'lg' ? { box: 'w-14 h-14', icon: 'w-7 h-7', text: 'text-3xl', tag: 'text-xs' }
            : { box: 'w-10 h-10', icon: 'w-5 h-5', text: 'text-xl', tag: 'text-[10px]' };
  return (
    <div className="flex items-center gap-3 select-none">
      <div className={`${dims.box} rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20`} style={{ background: `linear-gradient(135deg, ${ACCENT} 0%, #14b8a6 100%)` }}>
        <svg viewBox="0 0 24 24" fill="none" className={`${dims.icon} text-white`}>
          <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1l3.5 1v-1.5L13 19v-5.5l8 2.5Z" fill="currentColor" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className={`font-black ${dims.text} leading-none text-slate-900 tracking-tight`}>{WORD}</span>
        <span className={`${dims.tag} font-bold uppercase tracking-widest leading-none mt-1`} style={{ color: ACCENT }}>{TAG}</span>
      </div>
    </div>
  );
};

/** B — Compass / globe mark */
export const LogoB: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dims = size === 'sm' ? { box: 'w-7 h-7', svg: 28, text: 'text-sm', tag: 'text-[8px]' }
            : size === 'lg' ? { box: 'w-14 h-14', svg: 56, text: 'text-3xl', tag: 'text-xs' }
            : { box: 'w-10 h-10', svg: 40, text: 'text-xl', tag: 'text-[10px]' };
  return (
    <div className="flex items-center gap-3 select-none">
      <div className={`${dims.box} flex items-center justify-center`}>
        <svg viewBox="0 0 40 40" width={dims.svg} height={dims.svg}>
          <circle cx="20" cy="20" r="18" fill="white" stroke={ACCENT} strokeWidth="2.5" />
          <circle cx="20" cy="20" r="14" fill="none" stroke={ACCENT} strokeWidth="1" opacity="0.3" />
          <path d="M 20 6 L 24 20 L 20 34 L 16 20 Z" fill={ACCENT} />
          <circle cx="20" cy="20" r="2" fill="white" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className={`font-black ${dims.text} leading-none text-slate-900 tracking-tight`}>{WORD}</span>
        <span className={`${dims.tag} font-bold uppercase tracking-widest leading-none mt-1`} style={{ color: ACCENT }}>{TAG}</span>
      </div>
    </div>
  );
};

/** C — Pin → plane morph (map pin shaped like an airplane) */
export const LogoC: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dims = size === 'sm' ? { svg: 28, text: 'text-sm', tag: 'text-[8px]' }
            : size === 'lg' ? { svg: 56, text: 'text-3xl', tag: 'text-xs' }
            : { svg: 40, text: 'text-xl', tag: 'text-[10px]' };
  return (
    <div className="flex items-center gap-3 select-none">
      <svg viewBox="0 0 40 48" width={dims.svg} height={dims.svg * 1.2}>
        <path
          d="M 20 4 C 11 4 4 11 4 20 C 4 30 20 46 20 46 C 20 46 36 30 36 20 C 36 11 29 4 20 4 Z"
          fill={ACCENT}
        />
        {/* plane silhouette inside */}
        <path
          d="M 28 22 L 22 22 L 18 16 L 16 16 L 18 22 L 14 22 L 12 20 L 10.5 20 L 11.5 22 L 10.5 24 L 12 24 L 14 22 L 18 22 L 16 28 L 18 28 L 22 22 L 28 22 Z"
          fill="white"
          transform="rotate(-25 20 22)"
        />
      </svg>
      <div className="flex flex-col">
        <span className={`font-black ${dims.text} leading-none text-slate-900 tracking-tight`}>{WORD}</span>
        <span className={`${dims.tag} font-bold uppercase tracking-widest leading-none mt-1`} style={{ color: ACCENT }}>{TAG}</span>
      </div>
    </div>
  );
};

/** D — Wordmark only (Linear / Spotify style, no icon) */
export const LogoD: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dims = size === 'sm' ? { text: 'text-base', dot: 'w-1.5 h-1.5' }
            : size === 'lg' ? { text: 'text-4xl', dot: 'w-3 h-3' }
            : { text: 'text-2xl', dot: 'w-2 h-2' };
  return (
    <div className="select-none flex items-baseline gap-0">
      <span className={`font-black ${dims.text} text-slate-900 tracking-tighter`}>we</span>
      <span className={`${dims.dot} rounded-full mx-0.5`} style={{ background: ACCENT }} />
      <span className={`font-black ${dims.text} text-slate-900 tracking-tighter`} style={{ color: ACCENT }}>travel</span>
    </div>
  );
};

export const LOGO_VARIANTS = [
  { id: 'A', title: 'A — Plane mark', subtitle: 'אייקון מטוס בריבוע בצבע מותג; מילולי וברור', Component: LogoA },
  { id: 'B', title: 'B — Compass', subtitle: 'מצפן/גלובוס שמשדר חקירה ונסיעות', Component: LogoB },
  { id: 'C', title: 'C — Pin + plane', subtitle: 'פין מפה עם מטוס בפנים — חיבור הביקור ליעד', Component: LogoC },
  { id: 'D', title: 'D — Wordmark only', subtitle: 'טיפוגרפיה בלבד עם נקודה צבעונית; ניטרלי, מודרני', Component: LogoD },
];
