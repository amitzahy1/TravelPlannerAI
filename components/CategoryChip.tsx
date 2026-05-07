import React from 'react';
import { Loader2 } from 'lucide-react';

interface Props {
    label: string;
    isActive: boolean;
    isRefreshing: boolean;
    canRefresh: boolean;          // kept for API compatibility — unused after the refresh moved to ⋮ menu
    refreshDisabled: boolean;     // kept for API compatibility
    onSelect: () => void;
    onRefresh: () => void;        // kept for API compatibility
    /** 'orange' | 'purple' — color theme. */
    theme?: 'orange' | 'purple';
}

const THEMES = {
    orange: { active: 'bg-orange-600 text-white border-orange-600' },
    purple: { active: 'bg-purple-600 text-white border-purple-600' },
};

/**
 * Plain category chip. Tap → select. Refresh of the active category lives
 * in the page-level ActionsMenu (⋮) so a single mechanism handles all
 * refresh actions and there's no hidden long-press affordance.
 */
export const CategoryChip: React.FC<Props> = ({
    label,
    isActive,
    isRefreshing,
    onSelect,
    theme = 'orange',
}) => {
    const colors = THEMES[theme];
    return (
        <button
            onClick={onSelect}
            className={`min-h-9 px-4 py-2 rounded-full text-xs font-bold border whitespace-nowrap transition-all inline-flex items-center gap-1.5 ${
                isActive ? colors.active : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
        >
            {isRefreshing && <Loader2 className="w-3 h-3 animate-spin" />}
            <span>{label}</span>
        </button>
    );
};
