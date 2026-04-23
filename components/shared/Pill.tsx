import React from 'react';

type Tone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'muted';
type Size = 'xs' | 'sm' | 'md';

interface PillProps {
        tone?: Tone;
        size?: Size;
        icon?: React.ReactNode;
        children: React.ReactNode;
        className?: string;
}

const TONE: Record<Tone, string> = {
        primary: 'bg-blue-50 text-blue-700 ring-blue-100',
        success: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        warning: 'bg-amber-50 text-amber-800 ring-amber-100',
        danger: 'bg-rose-50 text-rose-700 ring-rose-100',
        neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
        muted: 'bg-slate-50 text-slate-500 ring-slate-100',
};

const SIZE: Record<Size, string> = {
        xs: 'text-2xs px-1.5 py-0.5 gap-0.5',
        sm: 'text-xs px-2 py-0.5 gap-1',
        md: 'text-sm px-2.5 py-1 gap-1.5',
};

export const Pill: React.FC<PillProps> = ({
        tone = 'neutral', size = 'sm', icon, children, className = '',
}) => (
        <span className={`inline-flex items-center ring-1 rounded-pill font-semibold whitespace-nowrap ${TONE[tone]} ${SIZE[size]} ${className}`}>
                {icon && <span className="shrink-0">{icon}</span>}
                {children}
        </span>
);
