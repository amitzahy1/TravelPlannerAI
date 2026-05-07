import React, { useState } from 'react';

interface Option {
    key: string;
    label: string;
    count: number;
}

interface Props {
    label: string;
    options: Option[];
    selected: Set<string>;
    onToggle: (key: string) => void;
    colorClass: 'orange' | 'purple' | 'emerald' | 'blue';
    /** Max chips shown before the "+ עוד N" expander appears. */
    maxVisible?: number;
}

const COLOR_CLASSES = {
    orange: { active: 'bg-orange-600 border-orange-600 text-white', hover: 'hover:border-orange-300' },
    purple: { active: 'bg-purple-600 border-purple-600 text-white', hover: 'hover:border-purple-300' },
    emerald: { active: 'bg-emerald-600 border-emerald-600 text-white', hover: 'hover:border-emerald-300' },
    blue: { active: 'bg-blue-600 border-blue-600 text-white', hover: 'hover:border-blue-300' },
};

/**
 * Compact filter chip row with a label, colored selected state, and a
 * "show more" expander when the option count exceeds `maxVisible`.
 *
 * Used by RestaurantsView and AttractionsView so the two filter UIs stay
 * visually identical.
 */
export const FilterChipGroup: React.FC<Props> = ({ label, options, selected, onToggle, colorClass, maxVisible = 6 }) => {
    const [expanded, setExpanded] = useState(false);
    const colors = COLOR_CLASSES[colorClass];

    if (options.length === 0) return null;

    const visible = expanded ? options : options.slice(0, maxVisible);
    const hidden = options.length - visible.length;

    return (
        <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-2xs font-bold text-slate-500 shrink-0 ms-0.5">{label}:</span>
            {visible.map(opt => {
                const isActive = selected.has(opt.key);
                return (
                    <button
                        key={opt.key}
                        onClick={() => onToggle(opt.key)}
                        className={`min-h-9 px-3 py-1 rounded-full text-2xs font-bold border transition-all inline-flex items-center gap-1 ${
                            isActive ? colors.active : `bg-white border-slate-200 text-slate-600 ${colors.hover}`
                        }`}
                    >
                        <span>{opt.label}</span>
                        <span className="opacity-60 text-[10px]">{opt.count}</span>
                    </button>
                );
            })}
            {hidden > 0 && (
                <button
                    onClick={() => setExpanded(true)}
                    className="min-h-9 px-3 py-1 rounded-full text-2xs font-bold border border-dashed border-slate-300 text-slate-500 hover:bg-slate-100"
                >
                    + עוד {hidden}
                </button>
            )}
            {expanded && options.length > maxVisible && (
                <button
                    onClick={() => setExpanded(false)}
                    className="min-h-9 px-3 py-1 rounded-full text-2xs font-bold border border-dashed border-slate-300 text-slate-500 hover:bg-slate-100"
                >
                    הצג פחות
                </button>
            )}
        </div>
    );
};
