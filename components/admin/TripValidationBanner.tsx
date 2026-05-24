/**
 * Trip Validation Banner — surfaces logical inconsistencies in the trip
 * (impossible flight durations, hotel/flight conflicts, items in the wrong
 * country, etc.) without any AI call.
 *
 * Findings come from utils/tripValidator.ts which runs on every trip change
 * via useMemo. Pure JavaScript, $0 cost.
 *
 * The banner is dismissible per-session — clicking the X stores the finding
 * IDs in sessionStorage so the user isn't nagged about the same issue across
 * navigation. Hard refresh resets.
 */

import React, { useMemo, useState } from 'react';
import { AlertTriangle, AlertCircle, Info, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { Trip } from '../../types';
import { validateTrip, groupFindingsBySeverity, type Finding } from '../../utils/tripValidator';

const DISMISS_KEY = 'trip-validator-dismissed-v1';

const readDismissed = (tripId: string): Set<string> => {
    try {
        const raw = sessionStorage.getItem(`${DISMISS_KEY}:${tripId}`);
        if (!raw) return new Set();
        return new Set(JSON.parse(raw) as string[]);
    } catch { return new Set(); }
};

const writeDismissed = (tripId: string, ids: Set<string>): void => {
    try {
        sessionStorage.setItem(`${DISMISS_KEY}:${tripId}`, JSON.stringify([...ids]));
    } catch { /* quota */ }
};

const SEVERITY_STYLES = {
    error: {
        wrapper: 'bg-rose-50 border-rose-200 text-rose-800',
        icon: <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />,
        label: 'שגיאה',
    },
    warning: {
        wrapper: 'bg-amber-50 border-amber-200 text-amber-800',
        icon: <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />,
        label: 'אזהרה',
    },
    info: {
        wrapper: 'bg-sky-50 border-sky-200 text-sky-800',
        icon: <Info className="w-4 h-4 text-sky-600 flex-shrink-0" />,
        label: 'מידע',
    },
} as const;

export const TripValidationBanner: React.FC<{ trip: Trip | null }> = ({ trip }) => {
    const [dismissed, setDismissed] = useState<Set<string>>(() =>
        trip ? readDismissed(trip.id) : new Set(),
    );
    const [expanded, setExpanded] = useState(false);

    const findings = useMemo(() => (trip ? validateTrip(trip) : []), [trip]);
    const visible = useMemo(() => findings.filter(f => !dismissed.has(f.id)), [findings, dismissed]);
    const { errors, warnings, info } = useMemo(() => groupFindingsBySeverity(visible), [visible]);

    if (!trip || visible.length === 0) return null;

    const dismiss = (id: string) => {
        const next = new Set(dismissed);
        next.add(id);
        setDismissed(next);
        writeDismissed(trip.id, next);
    };

    const dismissAll = () => {
        const next = new Set([...dismissed, ...visible.map(f => f.id)]);
        setDismissed(next);
        writeDismissed(trip.id, next);
    };

    // When there's just one finding, render inline. Otherwise show a compact
    // summary header that expands to the full list.
    const renderFinding = (f: Finding) => {
        const style = SEVERITY_STYLES[f.severity];
        return (
            <div key={f.id} className={`flex items-start gap-2 p-3 rounded-lg border ${style.wrapper}`}>
                {style.icon}
                <div className="flex-1 text-xs">
                    <div className="font-bold">{f.headline}</div>
                    {f.action && <div className="opacity-80 mt-0.5">{f.action}</div>}
                </div>
                <button
                    onClick={() => dismiss(f.id)}
                    title="התעלם מהתראה זו עד טעינה מחודשת"
                    className="text-current opacity-50 hover:opacity-100 transition-opacity flex-shrink-0"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    };

    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <h3 className="text-sm font-bold text-slate-800">
                        בדיקת תקינות הטיול
                    </h3>
                    <div className="flex items-center gap-1.5 text-2xs">
                        {errors.length > 0 && (
                            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                                {errors.length} שגיאות
                            </span>
                        )}
                        {warnings.length > 0 && (
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                                {warnings.length} אזהרות
                            </span>
                        )}
                        {info.length > 0 && (
                            <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-bold">
                                {info.length} מידע
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={dismissAll}
                        className="text-xs text-slate-500 hover:text-slate-700 underline"
                    >
                        התעלם מהכל
                    </button>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-slate-400 hover:text-slate-700"
                    >
                        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <p className="text-2xs text-slate-500 mb-3">
                בדיקות אוטומטיות שזוהו בלי AI — משווה משך טיסות לשעות המראה/נחיתה, מאתר חפיפות מלון/טיסה,
                ופריטים מחוץ למדינות הטיול. עלות: 0 ש"ח.
            </p>

            {/* Always render errors at the top; warnings/info collapsed by default */}
            <div className="space-y-2">
                {errors.map(renderFinding)}
                {expanded && warnings.map(renderFinding)}
                {expanded && info.map(renderFinding)}
                {!expanded && (warnings.length > 0 || info.length > 0) && (
                    <button
                        onClick={() => setExpanded(true)}
                        className="text-xs text-slate-500 hover:text-slate-700 underline w-full text-right py-1"
                    >
                        הצג עוד {warnings.length + info.length} התראות
                    </button>
                )}
            </div>
        </div>
    );
};
