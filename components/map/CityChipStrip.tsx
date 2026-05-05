/**
 * CityChipStrip — top-of-map city filter chips for the `map_full` tab.
 *
 * Pure presentational. Owner (FullTripMapView) holds active state, click
 * semantics (single-tap fit / toggle / double-tap step-through), and camera
 * fly. This component only renders the chips and dispatches `onPick(name)`.
 *
 * Visual language matches the on-map stop pills:
 *   • Number disc on the right (RTL) coloured by stop index.
 *   • City name in the centre, Hebrew when available.
 *   • Optional 🏨 count chip on the left.
 *
 * Layout: horizontal, scroll-snap on mobile, no scroll on desktop for typical
 * 2-5 city trips. Active chip auto-scrolls into view on change.
 */

import React, { useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';

const STOP_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626'];

export interface CityChipDescriptor {
        name: string;          // canonical display name (Hebrew preferred)
        nums: number[];        // stop numbers — multiple when one city appears at start AND end
        hotelCount?: number;   // total hotels in this city (rendered as 🏨 N)
}

interface Props {
        cities: CityChipDescriptor[];
        activeCity: string | 'all';
        onPick: (cityName: string | 'all') => void;
}

export const CityChipStrip: React.FC<Props> = ({ cities, activeCity, onPick }) => {
        const stripRef = useRef<HTMLDivElement>(null);
        const activeChipRef = useRef<HTMLButtonElement>(null);

        useEffect(() => {
                const node = activeChipRef.current;
                if (!node) return;
                node.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }, [activeCity]);

        return (
                <div
                        ref={stripRef}
                        role="tablist"
                        aria-label="סנן לפי עיר"
                        dir="rtl"
                        className="flex items-center gap-1.5 min-w-max px-1 snap-x snap-mandatory"
                        onKeyDown={(e) => {
                                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                                const buttons = Array.from(stripRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') || []);
                                const idx = buttons.findIndex(b => b === document.activeElement);
                                if (idx === -1) return;
                                e.preventDefault();
                                // RTL: ArrowRight = previous, ArrowLeft = next
                                const dir = e.key === 'ArrowLeft' ? 1 : -1;
                                const next = (idx + dir + buttons.length) % buttons.length;
                                buttons[next]?.focus();
                        }}
                >
                        <ChipAll
                                active={activeCity === 'all'}
                                onClick={() => onPick('all')}
                                ref={activeCity === 'all' ? activeChipRef : null}
                        />
                        {cities.map((c) => {
                                const isActive = activeCity === c.name;
                                const sortedNums = [...c.nums].sort((a, b) => a - b);
                                const primaryNum = sortedNums[0];
                                // Disc colour = first stop's STOP_COLORS index. Stays consistent with
                                // the matching on-map pill at the same position.
                                const color = STOP_COLORS[(primaryNum - 1) % STOP_COLORS.length];
                                const multiStop = sortedNums.length > 1;
                                return (
                                        <button
                                                key={c.name}
                                                ref={isActive ? activeChipRef : null}
                                                role="tab"
                                                aria-selected={isActive}
                                                tabIndex={isActive ? 0 : -1}
                                                onClick={() => onPick(c.name)}
                                                title={isActive ? 'לחץ שוב להחזרה לכל הטיול · הקש פעמיים למעבר למלון הבא' : `התמקד ב-${c.name}`}
                                                className={[
                                                        'snap-start flex-shrink-0',
                                                        'inline-flex items-center gap-2',
                                                        'pl-3 pr-1.5 py-1 rounded-full',
                                                        'text-xs font-black',
                                                        'transition-all duration-150',
                                                        'border whitespace-nowrap',
                                                        'hover:-translate-y-px active:translate-y-0',
                                                        isActive
                                                                ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20'
                                                                : 'bg-white/95 backdrop-blur text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-white shadow-sm',
                                                ].join(' ')}
                                        >
                                                <span className="font-black tracking-tight leading-none">{truncate(c.name, 12)}</span>

                                                {/* Number disc — single circle that always shows the FIRST stop number,
                                                    plus a tiny "·N" suffix when this city is visited multiple times.
                                                    Cleaner than two stacked circles, easier to read at a glance. */}
                                                <span className="inline-flex items-center gap-1">
                                                        <span
                                                                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[11px] leading-none"
                                                                style={{
                                                                        background: `linear-gradient(135deg,${color},${color}cc)`,
                                                                        boxShadow: isActive
                                                                                ? `inset 0 0 0 1.5px rgba(255,255,255,0.95), 0 0 0 1px ${color}33`
                                                                                : `inset 0 0 0 1.5px rgba(255,255,255,0.95)`,
                                                                }}
                                                                aria-label={multiStop ? `עצירות ${sortedNums.join(', ')}` : `עצירה ${primaryNum}`}
                                                        >
                                                                {primaryNum}
                                                        </span>
                                                        {multiStop && (
                                                                <span
                                                                        className={[
                                                                                'text-[10px] font-black leading-none',
                                                                                isActive ? 'text-white/80' : 'text-slate-500',
                                                                        ].join(' ')}
                                                                >
                                                                        ·{sortedNums.length}
                                                                </span>
                                                        )}
                                                </span>
                                        </button>
                                );
                        })}
                </div>
        );
};

const truncate = (s: string, max: number): string =>
        s.length > max ? s.slice(0, max - 1) + '…' : s;

interface AllProps {
        active: boolean;
        onClick: () => void;
}
const ChipAll = React.forwardRef<HTMLButtonElement, AllProps>(({ active, onClick }, ref) => (
        <button
                ref={ref}
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                onClick={onClick}
                className={[
                        'snap-start flex-shrink-0',
                        'inline-flex items-center gap-1.5',
                        'px-3 py-1 rounded-full',
                        'text-xs font-black',
                        'transition-all duration-150',
                        'border whitespace-nowrap',
                        'hover:-translate-y-px active:translate-y-0',
                        active
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20'
                                : 'bg-white/95 backdrop-blur text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-white shadow-sm',
                ].join(' ')}
        >
                <Globe className="w-3.5 h-3.5" />
                כל הטיול
        </button>
));
ChipAll.displayName = 'ChipAll';
