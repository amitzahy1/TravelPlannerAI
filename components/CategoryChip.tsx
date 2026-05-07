import React, { useEffect, useRef, useState } from 'react';
import { Loader2, RotateCw } from 'lucide-react';
import { useLongPress } from '../hooks/useLongPress';

interface Props {
    label: string;
    isActive: boolean;
    isRefreshing: boolean;
    canRefresh: boolean;          // hide refresh action when viewer-only or globally disabled
    refreshDisabled: boolean;     // refresh action disabled (e.g. another refresh in flight)
    onSelect: () => void;
    onRefresh: () => void;
    /** 'orange' | 'purple' — color theme. */
    theme?: 'orange' | 'purple';
}

const THEMES = {
    orange: { active: 'bg-orange-600 text-white border-orange-600', refreshHover: 'hover:text-orange-700' },
    purple: { active: 'bg-purple-600 text-white border-purple-600', refreshHover: 'hover:text-purple-700' },
};

/**
 * Category chip with a built-in long-press / right-click "refresh this
 * category" affordance. Replaces the inline ↻ icon button that sat next
 * to each chip — that pattern was visually busy on mobile.
 *
 * Tap → select the category.
 * Long-press 500 ms or right-click → popover with "רענן את הקטגוריה" CTA.
 */
export const CategoryChip: React.FC<Props> = ({
    label,
    isActive,
    isRefreshing,
    canRefresh,
    refreshDisabled,
    onSelect,
    onRefresh,
    theme = 'orange',
}) => {
    const [popoverOpen, setPopoverOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const colors = THEMES[theme];

    const longPress = useLongPress(() => {
        if (!canRefresh) return;
        setPopoverOpen(true);
    });

    useEffect(() => {
        if (!popoverOpen) return;
        const onDoc = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setPopoverOpen(false);
            }
        };
        const onEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPopoverOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onEsc);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onEsc);
        };
    }, [popoverOpen]);

    return (
        <div ref={wrapperRef} className="relative inline-block">
            <button
                {...longPress.handlers}
                onClick={() => {
                    if (longPress.wasLongPress()) {
                        longPress.reset();
                        return;
                    }
                    onSelect();
                }}
                title={canRefresh ? `${label} — לחיצה ארוכה לרענון הקטגוריה` : label}
                className={`min-h-9 px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap transition-all inline-flex items-center gap-1.5 ${
                    isActive ? colors.active : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
                {isRefreshing && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>{label}</span>
            </button>
            {popoverOpen && canRefresh && (
                <div
                    role="menu"
                    className="absolute z-50 top-[calc(100%+4px)] start-0 min-w-[200px] bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200 py-1.5"
                >
                    <button
                        role="menuitem"
                        disabled={refreshDisabled || isRefreshing}
                        onClick={() => {
                            setPopoverOpen(false);
                            onRefresh();
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-end transition-colors ${
                            refreshDisabled || isRefreshing
                                ? 'text-slate-300 cursor-not-allowed'
                                : `text-slate-700 hover:bg-slate-50 ${colors.refreshHover}`
                        }`}
                    >
                        <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                        </span>
                        <span className="flex-grow text-end">רענן את הקטגוריה</span>
                    </button>
                </div>
            )}
        </div>
    );
};
