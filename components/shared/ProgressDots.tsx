import React from 'react';

export interface ProgressDot {
        id: string;
        label: string;
        /** 'empty' = gray, 'partial' = amber, 'full' = green. */
        state: 'empty' | 'partial' | 'full';
        icon?: React.ReactNode;
        onClick?: () => void;
}

interface ProgressDotsProps {
        dots: ProgressDot[];
        compact?: boolean;
        className?: string;
}

const STATE_DOT = {
        empty: 'bg-slate-200 text-slate-400',
        partial: 'bg-amber-100 text-amber-700 ring-2 ring-amber-300',
        full: 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300',
};

export const ProgressDots: React.FC<ProgressDotsProps> = ({ dots, compact = false, className = '' }) => {
        return (
                <div className={`flex items-center gap-1.5 ${className}`} dir="rtl">
                        {dots.map((d) => {
                                const Tag = d.onClick ? 'button' : 'div';
                                const size = compact ? 'w-6 h-6 text-2xs' : 'w-8 h-8 text-xs';
                                return (
                                        <Tag
                                                key={d.id}
                                                onClick={d.onClick}
                                                title={d.label}
                                                aria-label={`${d.label}: ${d.state === 'full' ? 'הושלם' : d.state === 'partial' ? 'חלקי' : 'ריק'}`}
                                                className={`${size} ${STATE_DOT[d.state]} rounded-pill inline-flex items-center justify-center transition-all ${d.onClick ? 'hover:scale-110 cursor-pointer' : ''}`}
                                        >
                                                {d.icon}
                                        </Tag>
                                );
                        })}
                </div>
        );
};
