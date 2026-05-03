/**
 * Square icon-only button. Use this instead of inlining
 * `w-9 h-9 rounded-xl` divs that handle keyboard activation in 28
 * different ways across the codebase. Always include `aria-label`.
 */

import React from 'react';

export type IconButtonTone = 'neutral' | 'primary' | 'danger' | 'success' | 'inverted';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
        tone?: IconButtonTone;
        size?: IconButtonSize;
        'aria-label': string;
}

const toneClasses: Record<IconButtonTone, string> = {
        neutral:
                'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800 active:bg-slate-100',
        primary:
                'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 hover:text-blue-700 active:bg-blue-200',
        danger:
                'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 active:bg-rose-200',
        success:
                'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 active:bg-emerald-200',
        inverted:
                'bg-white/20 text-white border border-white/15 backdrop-blur-md hover:bg-white/30 active:bg-white/40',
};

const sizeClasses: Record<IconButtonSize, string> = {
        sm: 'w-8 h-8 rounded-lg [&_svg]:w-3.5 [&_svg]:h-3.5',
        md: 'w-10 h-10 rounded-xl [&_svg]:w-4 [&_svg]:h-4',
        lg: 'w-12 h-12 rounded-xl [&_svg]:w-5 [&_svg]:h-5',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
        function IconButton(props, ref) {
                const {
                        tone = 'neutral',
                        size = 'md',
                        className = '',
                        children,
                        ...rest
                } = props;

                const base =
                        'inline-flex items-center justify-center transition-all duration-150 ' +
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ' +
                        'disabled:opacity-40 disabled:cursor-not-allowed active:scale-95';
                const cls = `${base} ${toneClasses[tone]} ${sizeClasses[size]} ${className}`.trim();

                return (
                        <button ref={ref} className={cls} {...rest}>
                                {children}
                        </button>
                );
        },
);
