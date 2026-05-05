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
                                // Tinted background for active state — anchor on the first stop's colour
                                // so the chip's hue matches the on-map pill at the same position.
                                const color = STOP_COLORS[(primaryNum - 1) % STOP_COLORS.length];
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
                                                        'inline-flex items-center gap-1.5',
                                                        'px-2.5 py-1 rounded-full',
                                                        'text-[11px] font-black',
                                                        'transition-all duration-150',
                                                        'border whitespace-nowrap',
                                                        'hover:-translate-y-px',
                                                ].join(' ')}
                                                style={{
                                                        background: isActive ? `${color}14` : 'rgba(255,255,255,0.95)',
                                                        borderColor: isActive ? `${color}66` : 'rgb(226 232 240)',
                                                        color: '#0f172a',
                                                        boxShadow: isActive
                                                                ? `0 4px 14px ${color}33, 0 1px 2px rgba(15,23,42,0.06)`
                                                                : '0 1px 3px rgba(15,23,42,0.06)',
                                                }}
                                        >
                                                {/* Number disc(s) — match on-map pill */}
                                                {sortedNums.length === 1 ? (
                                                        <span
                                                                className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-white"
                                                                style={{
                                                                        background: `linear-gradient(135deg,${color},${color}cc)`,
                                                                        fontSize: 10,
                                                                        boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,0.92)`,
                                                                }}
                                                        >
                                                                {primaryNum}
                                                        </span>
                                                ) : (
                                                        <span className="inline-flex items-center" style={{ marginLeft: -2 }}>
                                                                <span
                                                                        className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-white"
                                                                        style={{
                                                                                background: `linear-gradient(135deg,${color},${color}cc)`,
                                                                                fontSize: 10,
                                                                                boxShadow: `inset 0 0 0 1.5px rgba(255,255,255,0.92)`,
                                                                        }}
                                                                >
                                                                        {primaryNum}
                                                                </span>
                                                                <span
                                                                        className="inline-flex items-center justify-center w-[14px] h-[14px] rounded-full text-white border-[1.5px] border-white"
                                                                        style={{
                                                                                background: `linear-gradient(135deg,${color},${color}cc)`,
                                                                                fontSize: 8,
                                                                                marginRight: -5,
                                                                        }}
                                                                        aria-label={`כולל עצירה ${sortedNums[1]}`}
                                                                >
                                                                        +{sortedNums.length - 1}
                                                                </span>
                                                        </span>
                                                )}

                                                <span className="font-black tracking-tight">{truncate(c.name, 12)}</span>

                                                {typeof c.hotelCount === 'number' && c.hotelCount > 0 && (
                                                        <span
                                                                className="inline-flex items-center text-[9px] font-bold opacity-70"
                                                                aria-label={`${c.hotelCount} מלונות`}
                                                        >
                                                                🏨 {c.hotelCount}
                                                        </span>
                                                )}
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
                        'px-2.5 py-1 rounded-full',
                        'text-[11px] font-black',
                        'transition-all duration-150',
                        'border whitespace-nowrap',
                        'hover:-translate-y-px',
                        active
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                : 'bg-white/95 text-slate-700 border-slate-200',
                ].join(' ')}
        >
                <Globe className="w-3 h-3" />
                כל הטיול
        </button>
));
ChipAll.displayName = 'ChipAll';
