import React, { useMemo } from 'react';
import { Trip } from '../../types';
import { Plane, Sparkles } from 'lucide-react';

interface TripCountdownProps {
        trip: Trip;
        className?: string;
        /** 'card' (default) — white pill card with shadow, used outside heroes.
         *  'overlay' — translucent glass pill for placing on top of hero image. */
        variant?: 'card' | 'overlay';
}

const parseFirstDate = (trip: Trip): Date | null => {
        // Priority: first flight's date, first hotel check-in, trip.dates range start.
        const tsList: number[] = [];
        trip.flights?.segments?.forEach(s => {
                const d = s.date ? new Date(s.date) : null;
                if (d && !isNaN(d.getTime())) tsList.push(d.getTime());
        });
        trip.hotels?.forEach(h => {
                const d = h.checkInDate ? new Date(h.checkInDate) : null;
                if (d && !isNaN(d.getTime())) tsList.push(d.getTime());
        });
        if (trip.dates) {
                const m = trip.dates.match(/(\d{4}-\d{2}-\d{2})/);
                if (m) tsList.push(new Date(m[1]).getTime());
        }
        if (tsList.length === 0) return null;
        return new Date(Math.min(...tsList));
};

const parseLastDate = (trip: Trip): Date | null => {
        const tsList: number[] = [];
        trip.flights?.segments?.forEach(s => {
                const d = s.date ? new Date(s.date) : null;
                if (d && !isNaN(d.getTime())) tsList.push(d.getTime());
        });
        trip.hotels?.forEach(h => {
                const d = h.checkOutDate ? new Date(h.checkOutDate) : null;
                if (d && !isNaN(d.getTime())) tsList.push(d.getTime());
        });
        if (trip.dates) {
                const matches = Array.from(trip.dates.matchAll(/(\d{4}-\d{2}-\d{2})/g));
                matches.forEach(m => tsList.push(new Date(m[1]).getTime()));
        }
        if (tsList.length === 0) return null;
        return new Date(Math.max(...tsList));
};

const startOfDay = (d: Date): Date => {
        const x = new Date(d);
        x.setHours(0, 0, 0, 0);
        return x;
};

/**
 * Small, always-visible countdown card for the active trip.
 * States:
 *  - Future  → "עוד N ימים ל{destination}"
 *  - Today   → "יוצאים היום!"
 *  - During  → "יום N מתוך M"
 *  - Past    → "הטיול הסתיים לפני N ימים"
 *  - Missing → render nothing (no dates known)
 */
export const TripCountdown: React.FC<TripCountdownProps> = ({ trip, className = '', variant = 'card' }) => {
        const { kind, days, total, label } = useMemo(() => {
                const first = parseFirstDate(trip);
                const last = parseLastDate(trip) || first;
                if (!first) return { kind: 'none' as const, days: 0, total: 0, label: '' };

                const today = startOfDay(new Date());
                const start = startOfDay(first);
                const end = startOfDay(last || first);
                const oneDay = 86400 * 1000;
                const daysUntilStart = Math.round((start.getTime() - today.getTime()) / oneDay);
                const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / oneDay) + 1);

                const destination = (trip.destination || trip.name || '').split(/[,\-–]/)[0].trim();

                if (daysUntilStart > 0) {
                        return { kind: 'future' as const, days: daysUntilStart, total: totalDays, label: destination };
                }
                if (daysUntilStart === 0) {
                        return { kind: 'today' as const, days: 0, total: totalDays, label: destination };
                }
                // Started already — are we still inside the trip?
                const daysSinceStart = -daysUntilStart;
                if (today.getTime() <= end.getTime()) {
                        return { kind: 'during' as const, days: daysSinceStart + 1, total: totalDays, label: destination };
                }
                // Ended
                const daysSinceEnd = Math.round((today.getTime() - end.getTime()) / oneDay);
                return { kind: 'past' as const, days: daysSinceEnd, total: totalDays, label: destination };
        }, [trip]);

        if (kind === 'none') return null;

        const tone = {
                future: 'from-blue-500 to-sky-400',
                today: 'from-emerald-500 to-teal-400',
                during: 'from-violet-500 to-indigo-500',
                past: 'from-slate-400 to-slate-500',
        }[kind];

        const headline = {
                future: `עוד ${days} ${days === 1 ? 'יום' : 'ימים'}`,
                today: 'יוצאים היום',
                during: `יום ${days} / ${total}`,
                past: `הסתיים לפני ${days} ${days === 1 ? 'יום' : 'ימים'}`,
        }[kind];

        const subline = {
                future: `עד ${label || 'היציאה'}`,
                today: label ? `ל${label}` : 'בהצלחה!',
                during: label ? `ב-${label}` : 'בטיול כרגע',
                past: label ? `מ-${label}` : '',
        }[kind];

        const Icon = kind === 'today' ? Sparkles : Plane;

        if (variant === 'overlay') {
                return (
                        <div
                                dir="rtl"
                                className={`inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-pill border border-white/25 pr-2.5 pl-1.5 py-1.5 shadow-lg ${className}`}
                        >
                                <span className={`w-7 h-7 rounded-full bg-gradient-to-tr ${tone} text-white flex items-center justify-center shrink-0`}>
                                        <Icon className={`w-3.5 h-3.5 ${kind === 'today' ? 'animate-pulse' : ''}`} aria-hidden="true" />
                                </span>
                                <div className="flex flex-col leading-tight min-w-0">
                                        <span className="text-xs font-black text-white truncate drop-shadow-sm">{headline}</span>
                                        {subline && <span className="text-[10px] text-white/85 truncate drop-shadow-sm">{subline}</span>}
                                </div>
                        </div>
                );
        }

        return (
                <div
                        dir="rtl"
                        className={`inline-flex items-center gap-3 bg-white rounded-xl border border-slate-200 shadow-card pr-3 pl-2 py-2 ${className}`}
                >
                        <span className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${tone} text-white flex items-center justify-center shrink-0 shadow-card`}>
                                <Icon className={`w-5 h-5 ${kind === 'today' ? 'animate-pulse' : ''}`} aria-hidden="true" />
                        </span>
                        <div className="flex flex-col leading-tight min-w-0">
                                <span className="text-sm font-bold text-slate-900 truncate">{headline}</span>
                                {subline && <span className="text-2xs text-slate-500 truncate">{subline}</span>}
                        </div>
                </div>
        );
};
