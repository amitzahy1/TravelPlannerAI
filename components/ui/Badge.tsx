/**
 * Single Badge primitive. Replaces inline `<span class="bg-X-50 text-X-700…">`
 * pills scattered across views. Two flavors:
 *
 *   <Badge tone="info">פתוח כעת</Badge>           — soft tinted background
 *   <Badge tone="info" variant="solid">…</Badge>  — solid filled (use sparingly)
 *
 * Tones map to semantic intent (info, success, warning, danger, brand,
 * neutral). For a city-colored chip use the `tint` prop with a Tailwind
 * color name from cityPalette.
 */

import React from 'react';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';
export type BadgeVariant = 'soft' | 'solid' | 'outline';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
        tone?: BadgeTone;
        variant?: BadgeVariant;
        size?: BadgeSize;
        children: React.ReactNode;
        iconLeading?: React.ReactNode;
        className?: string;
        /** Optional Tailwind color name (e.g. "indigo") for city-colored chips. */
        tint?: string;
}

const softMap: Record<BadgeTone, string> = {
        neutral: 'bg-slate-100 text-slate-700 border-slate-200',
        info: 'bg-blue-50 text-blue-700 border-blue-100',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        warning: 'bg-amber-50 text-amber-700 border-amber-100',
        danger: 'bg-rose-50 text-rose-700 border-rose-100',
        brand: 'bg-blue-50 text-blue-700 border-blue-100',
};

const solidMap: Record<BadgeTone, string> = {
        neutral: 'bg-slate-700 text-white border-slate-700',
        info: 'bg-blue-600 text-white border-blue-600',
        success: 'bg-emerald-600 text-white border-emerald-600',
        warning: 'bg-amber-500 text-white border-amber-500',
        danger: 'bg-rose-600 text-white border-rose-600',
        brand: 'bg-blue-600 text-white border-blue-600',
};

const outlineMap: Record<BadgeTone, string> = {
        neutral: 'bg-transparent text-slate-700 border-slate-300',
        info: 'bg-transparent text-blue-700 border-blue-300',
        success: 'bg-transparent text-emerald-700 border-emerald-300',
        warning: 'bg-transparent text-amber-700 border-amber-300',
        danger: 'bg-transparent text-rose-700 border-rose-300',
        brand: 'bg-transparent text-blue-700 border-blue-300',
};

const sizeMap: Record<BadgeSize, string> = {
        sm: 'h-5 text-[10px] px-2 gap-1 [&_svg]:w-3 [&_svg]:h-3',
        md: 'h-6 text-xs px-2.5 gap-1.5 [&_svg]:w-3.5 [&_svg]:h-3.5',
};

export const Badge: React.FC<BadgeProps> = ({
        tone = 'neutral',
        variant = 'soft',
        size = 'md',
        iconLeading,
        children,
        className = '',
        tint,
}) => {
        const baseTone =
                tint
                        ? (variant === 'solid'
                                ? `bg-${tint}-600 text-white border-${tint}-600`
                                : variant === 'outline'
                                        ? `bg-transparent text-${tint}-700 border-${tint}-300`
                                        : `bg-${tint}-50 text-${tint}-700 border-${tint}-100`)
                        : variant === 'solid'
                                ? solidMap[tone]
                                : variant === 'outline'
                                        ? outlineMap[tone]
                                        : softMap[tone];
        return (
                <span
                        className={`inline-flex items-center font-bold border rounded-full ${baseTone} ${sizeMap[size]} ${className}`}
                >
                        {iconLeading && <span className="shrink-0 inline-flex">{iconLeading}</span>}
                        <span className="truncate">{children}</span>
                </span>
        );
};
