/**
 * Canonical Button. Replaces the ~60 ad-hoc button class strings
 * scattered across views. Variants:
 *
 *   primary   — filled brand-action button. The ONE primary CTA per panel.
 *   secondary — bordered subtle button. Cancel / dismiss actions.
 *   ghost     — text + hover background only. Tertiary action / toolbar.
 *   danger    — destructive action.
 *   subtle    — soft tinted background, borderless. "Add room", "Edit", etc.
 *
 * Sizes:
 *   sm  — 32 px tall, compact
 *   md  — 40 px tall, default
 *   lg  — 48 px tall, hero CTA
 *
 * Use `iconLeading` / `iconTrailing` for inline lucide icons. Icons get
 * proper RTL flipping for free because they're flex children of a
 * `dir="rtl"` ancestor.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
        variant?: ButtonVariant;
        size?: ButtonSize;
        loading?: boolean;
        fullWidth?: boolean;
        iconLeading?: React.ReactNode;
        iconTrailing?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
        primary:
                'bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 hover:border-blue-700 active:bg-blue-800 disabled:bg-blue-300 disabled:border-blue-300 shadow-sm shadow-blue-500/15',
        secondary:
                'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 disabled:text-slate-400',
        ghost:
                'bg-transparent text-slate-600 border border-transparent hover:bg-slate-100 active:bg-slate-200 disabled:text-slate-300',
        danger:
                'bg-rose-600 text-white border border-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:bg-rose-300',
        subtle:
                'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 active:bg-blue-200 disabled:bg-slate-50 disabled:text-slate-400',
};

const sizeClasses: Record<ButtonSize, string> = {
        sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
        md: 'h-10 px-4 text-sm gap-2 rounded-xl',
        lg: 'h-12 px-6 text-base gap-2 rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
        function Button(props, ref) {
                const {
                        variant = 'primary',
                        size = 'md',
                        loading = false,
                        fullWidth = false,
                        iconLeading,
                        iconTrailing,
                        disabled,
                        className = '',
                        children,
                        ...rest
                } = props;

                const base =
                        'inline-flex items-center justify-center font-bold transition-all duration-150 ' +
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ' +
                        'disabled:cursor-not-allowed select-none active:scale-[0.98]';
                const cls =
                        `${base} ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`.trim();

                const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

                return (
                        <button ref={ref} disabled={disabled || loading} className={cls} {...rest}>
                                {loading ? (
                                        <Loader2 className={`${iconSize} animate-spin`} />
                                ) : (
                                        iconLeading && <span className={`shrink-0 ${iconSize} inline-flex`}>{iconLeading}</span>
                                )}
                                <span className="truncate">{children}</span>
                                {!loading && iconTrailing && (
                                        <span className={`shrink-0 ${iconSize} inline-flex`}>{iconTrailing}</span>
                                )}
                        </button>
                );
        },
);
