import React from 'react';

type Tone = 'primary' | 'emerald' | 'amber' | 'rose' | 'slate';

interface EmptyStateProps {
        icon?: React.ReactNode;
        title: string;
        description?: string;
        ctaLabel?: string;
        onCta?: () => void;
        secondaryCtaLabel?: string;
        onSecondaryCta?: () => void;
        tone?: Tone;
        dense?: boolean;
}

const TONE: Record<Tone, { chip: string; icon: string; btn: string }> = {
        primary: { chip: 'bg-blue-50', icon: 'text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700' },
        emerald: { chip: 'bg-emerald-50', icon: 'text-emerald-600', btn: 'bg-emerald-600 hover:bg-emerald-700' },
        amber: { chip: 'bg-amber-50', icon: 'text-amber-600', btn: 'bg-amber-600 hover:bg-amber-700' },
        rose: { chip: 'bg-rose-50', icon: 'text-rose-600', btn: 'bg-rose-600 hover:bg-rose-700' },
        slate: { chip: 'bg-slate-100', icon: 'text-slate-500', btn: 'bg-slate-600 hover:bg-slate-700' },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
        icon, title, description, ctaLabel, onCta, secondaryCtaLabel, onSecondaryCta, tone = 'primary', dense = false,
}) => {
        const s = TONE[tone];
        const pad = dense ? 'py-8 px-4' : 'py-14 px-6';
        return (
                <div dir="rtl" className={`flex flex-col items-center text-center ${pad} max-w-md mx-auto`}>
                        {icon && (
                                <div className={`w-16 h-16 ${s.chip} rounded-xl flex items-center justify-center mb-4 ${s.icon}`}>
                                        {icon}
                                </div>
                        )}
                        <h3 className="text-xl font-bold text-slate-900 mb-1">{title}</h3>
                        {description && <p className="text-sm text-slate-500 leading-relaxed mb-5">{description}</p>}
                        <div className="flex flex-wrap justify-center gap-2">
                                {ctaLabel && onCta && (
                                        <button
                                                type="button"
                                                onClick={onCta}
                                                className={`px-5 py-2.5 rounded-md ${s.btn} text-white text-sm font-bold shadow-card-hover active:scale-95 transition-all`}
                                        >
                                                {ctaLabel}
                                        </button>
                                )}
                                {secondaryCtaLabel && onSecondaryCta && (
                                        <button
                                                type="button"
                                                onClick={onSecondaryCta}
                                                className="px-5 py-2.5 rounded-md bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 active:scale-95 transition-all"
                                        >
                                                {secondaryCtaLabel}
                                        </button>
                                )}
                        </div>
                </div>
        );
};
