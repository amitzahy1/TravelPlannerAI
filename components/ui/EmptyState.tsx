import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

type Tone = 'indigo' | 'emerald' | 'amber' | 'rose';

interface EmptyStateProps {
        icon: LucideIcon;
        title: string;
        description?: string;
        ctaLabel?: string;
        onCta?: () => void;
        /** Tone colour — defaults to indigo. */
        tone?: Tone;
}

const TONE_CLASSES: Record<Tone, { chip: string; icon: string; button: string; shadow: string }> = {
        indigo:  { chip: 'bg-indigo-50',  icon: 'text-indigo-500',  button: 'bg-indigo-600 hover:bg-indigo-700',  shadow: 'shadow-indigo-500/20' },
        emerald: { chip: 'bg-emerald-50', icon: 'text-emerald-500', button: 'bg-emerald-600 hover:bg-emerald-700', shadow: 'shadow-emerald-500/20' },
        amber:   { chip: 'bg-amber-50',   icon: 'text-amber-500',   button: 'bg-amber-600 hover:bg-amber-700',   shadow: 'shadow-amber-500/20' },
        rose:    { chip: 'bg-rose-50',    icon: 'text-rose-500',    button: 'bg-rose-600 hover:bg-rose-700',     shadow: 'shadow-rose-500/20' },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
        icon: Icon,
        title,
        description,
        ctaLabel,
        onCta,
        tone = 'indigo',
}) => {
        const styles = TONE_CLASSES[tone];
        return (
                <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        dir="rtl"
                        className="flex flex-col items-center text-center py-16 px-6 max-w-md mx-auto"
                >
                        <div className={`w-20 h-20 ${styles.chip} rounded-2xl flex items-center justify-center mb-6`}>
                                <Icon className={`w-10 h-10 ${styles.icon}`} />
                        </div>
                        <h3 className="text-2xl font-black text-brand-navy mb-2">{title}</h3>
                        {description && (
                                <p className="text-slate-500 leading-relaxed mb-6">{description}</p>
                        )}
                        {ctaLabel && onCta && (
                                <button
                                        type="button"
                                        onClick={onCta}
                                        className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl ${styles.button} text-white font-bold text-sm shadow-lg ${styles.shadow} transition-all transform active:scale-95`}
                                >
                                        {ctaLabel}
                                </button>
                        )}
                </motion.div>
        );
};
