/**
 * Segmented-control Tabs. Replaces the bespoke "my_list" / "recommended"
 * toggles in Restaurants/Attractions and similar pairs across the app.
 *
 *   <Tabs
 *     value={activeTab}
 *     onChange={setActiveTab}
 *     items={[
 *       { value: 'recommended', label: 'מומלץ' },
 *       { value: 'my_list', label: 'הרשימה שלי' },
 *     ]}
 *   />
 *
 * Three style variants:
 *   pill        — pill background with white active capsule (default)
 *   underline   — minimal, calm, Material 3 feel
 *   plain       — text-only with muted active color
 */

import React from 'react';

export interface TabItem<V extends string = string> {
        value: V;
        label: React.ReactNode;
        iconLeading?: React.ReactNode;
        badge?: React.ReactNode;
}

export type TabsVariant = 'pill' | 'underline' | 'plain';
export type TabsSize = 'sm' | 'md';

export interface TabsProps<V extends string = string> {
        value: V;
        onChange: (value: V) => void;
        items: ReadonlyArray<TabItem<V>>;
        variant?: TabsVariant;
        size?: TabsSize;
        fullWidth?: boolean;
        ariaLabel?: string;
        className?: string;
}

const sizeMap: Record<TabsSize, string> = {
        sm: 'h-8 text-xs px-3 gap-1.5',
        md: 'h-10 text-sm px-4 gap-2',
};

export function Tabs<V extends string = string>({
        value,
        onChange,
        items,
        variant = 'pill',
        size = 'md',
        fullWidth = false,
        ariaLabel,
        className = '',
}: TabsProps<V>) {
        if (variant === 'pill') {
                return (
                        <div
                                role="tablist"
                                aria-label={ariaLabel}
                                className={`inline-flex items-center gap-1 bg-slate-100 p-1 rounded-xl ${fullWidth ? 'w-full' : ''} ${className}`}
                        >
                                {items.map(item => {
                                        const active = item.value === value;
                                        return (
                                                <button
                                                        key={item.value}
                                                        type="button"
                                                        role="tab"
                                                        aria-selected={active}
                                                        onClick={() => onChange(item.value)}
                                                        className={`inline-flex items-center justify-center font-bold rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${sizeMap[size]} ${fullWidth ? 'flex-1' : ''} ${active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                                                >
                                                        {item.iconLeading && <span className="shrink-0 inline-flex [&_svg]:w-3.5 [&_svg]:h-3.5">{item.iconLeading}</span>}
                                                        <span className="truncate">{item.label}</span>
                                                        {item.badge && <span className="shrink-0 inline-flex">{item.badge}</span>}
                                                </button>
                                        );
                                })}
                        </div>
                );
        }

        if (variant === 'underline') {
                return (
                        <div
                                role="tablist"
                                aria-label={ariaLabel}
                                className={`flex items-center gap-1 border-b border-slate-200 ${className}`}
                        >
                                {items.map(item => {
                                        const active = item.value === value;
                                        return (
                                                <button
                                                        key={item.value}
                                                        type="button"
                                                        role="tab"
                                                        aria-selected={active}
                                                        onClick={() => onChange(item.value)}
                                                        className={`relative inline-flex items-center font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 px-4 py-3 ${size === 'sm' ? 'text-xs' : 'text-sm'} ${active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                                                >
                                                        {item.iconLeading && <span className="shrink-0 inline-flex me-2 [&_svg]:w-3.5 [&_svg]:h-3.5">{item.iconLeading}</span>}
                                                        <span className="truncate">{item.label}</span>
                                                        {item.badge && <span className="shrink-0 inline-flex ms-2">{item.badge}</span>}
                                                        <span
                                                                className={`absolute bottom-0 inset-x-3 h-0.5 rounded-full transition-all ${active ? 'bg-blue-600' : 'bg-transparent'}`}
                                                        />
                                                </button>
                                        );
                                })}
                        </div>
                );
        }

        // plain variant
        return (
                <div role="tablist" aria-label={ariaLabel} className={`inline-flex items-center gap-2 ${className}`}>
                        {items.map(item => {
                                const active = item.value === value;
                                return (
                                        <button
                                                key={item.value}
                                                type="button"
                                                role="tab"
                                                aria-selected={active}
                                                onClick={() => onChange(item.value)}
                                                className={`inline-flex items-center font-bold transition-colors ${size === 'sm' ? 'text-xs' : 'text-sm'} ${active ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                                {item.iconLeading && <span className="shrink-0 inline-flex me-1.5 [&_svg]:w-3.5 [&_svg]:h-3.5">{item.iconLeading}</span>}
                                                <span className="truncate">{item.label}</span>
                                        </button>
                                );
                        })}
                </div>
        );
}
