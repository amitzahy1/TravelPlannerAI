import React, { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';

export interface ActionItem {
    icon: React.ReactNode;
    label: string;
    onSelect: () => void;
    disabled?: boolean;
    danger?: boolean;
}

interface Props {
    items: ActionItem[];
    align?: 'start' | 'end';
    ariaLabel?: string;
}

/**
 * 3-dot menu trigger that opens a small popover with action items.
 * Used in RestaurantsView / AttractionsView headers to consolidate
 * refresh / near-hotel / reset into one tap target on mobile.
 */
export const ActionsMenu: React.FC<Props> = ({ items, align = 'start', ariaLabel = 'פעולות' }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, [open]);

    const enabledItems = items.filter(i => !i.disabled);
    if (enabledItems.length === 0) return null;

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-label={ariaLabel}
                aria-expanded={open}
                aria-haspopup="menu"
                className={`flex items-center justify-center w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors ${open ? 'border-slate-400 text-slate-800 bg-slate-50' : ''}`}
            >
                <MoreVertical className="w-4 h-4" />
            </button>
            {open && (
                <div
                    role="menu"
                    className={`absolute z-50 mt-1.5 min-w-[220px] bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-200 py-1.5 ${
                        align === 'end' ? 'end-0' : 'start-0'
                    }`}
                >
                    {items.map((item, i) => (
                        <button
                            key={i}
                            role="menuitem"
                            disabled={item.disabled}
                            onClick={() => {
                                if (item.disabled) return;
                                setOpen(false);
                                item.onSelect();
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-end transition-colors ${
                                item.disabled
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : item.danger
                                        ? 'text-red-600 hover:bg-red-50'
                                        : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">{item.icon}</span>
                            <span className="flex-grow text-end">{item.label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
