/**
 * Canonical form primitives. Use these instead of inlining
 * `<input class="border ring-2 ring-indigo-200 …" />` 50 times.
 *
 *   <TextField label="שם המלון" value={…} onChange={…} placeholder="…" />
 *   <Textarea label="הערות" rows={3} … />
 *   <Select label="סוג חדר" value={…} onChange={…}>
 *     <option value="…">…</option>
 *   </Select>
 *
 * All three share: label, helperText, error, iconLeading, fullWidth.
 * Errors paint a rose ring + error text underneath.
 */

import React from 'react';

interface FieldShellProps {
        label?: string;
        helperText?: string;
        error?: string;
        required?: boolean;
        children: React.ReactNode;
        htmlFor?: string;
        fullWidth?: boolean;
}

const FieldShell: React.FC<FieldShellProps> = ({ label, helperText, error, required, children, htmlFor, fullWidth }) => (
        <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
                {label && (
                        <label htmlFor={htmlFor} className="text-xs font-bold text-slate-700 px-0.5">
                                {label}
                                {required && <span className="text-rose-500 ms-1">*</span>}
                        </label>
                )}
                {children}
                {(error || helperText) && (
                        <p className={`text-[11px] ${error ? 'text-rose-600' : 'text-slate-500'} px-0.5`}>
                                {error || helperText}
                        </p>
                )}
        </div>
);

const inputBase =
        'w-full px-3 py-2 bg-white border rounded-xl text-sm text-slate-900 placeholder-slate-400 ' +
        'transition-colors outline-none ' +
        'focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:border-blue-500 ' +
        'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed';

const inputBorder = (error?: string) => (error ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500' : 'border-slate-200 hover:border-slate-300');

// ── TextField ────────────────────────────────────────────────────
export interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
        label?: string;
        helperText?: string;
        error?: string;
        iconLeading?: React.ReactNode;
        iconTrailing?: React.ReactNode;
        fullWidth?: boolean;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
        function TextField(props, ref) {
                const { label, helperText, error, iconLeading, iconTrailing, required, fullWidth = true, className = '', id, ...rest } = props;
                const generatedId = React.useId();
                const fieldId = id || generatedId;

                const inputEl = (
                        <input
                                ref={ref}
                                id={fieldId}
                                required={required}
                                className={`${inputBase} ${inputBorder(error)} ${iconLeading ? 'ps-9' : ''} ${iconTrailing ? 'pe-9' : ''} ${className}`}
                                {...rest}
                        />
                );

                return (
                        <FieldShell label={label} helperText={helperText} error={error} required={required} htmlFor={fieldId} fullWidth={fullWidth}>
                                {iconLeading || iconTrailing ? (
                                        <div className="relative">
                                                {iconLeading && (
                                                        <span className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none [&_svg]:w-4 [&_svg]:h-4">
                                                                {iconLeading}
                                                        </span>
                                                )}
                                                {inputEl}
                                                {iconTrailing && (
                                                        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none [&_svg]:w-4 [&_svg]:h-4">
                                                                {iconTrailing}
                                                        </span>
                                                )}
                                        </div>
                                ) : (
                                        inputEl
                                )}
                        </FieldShell>
                );
        },
);

// ── Textarea ─────────────────────────────────────────────────────
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
        label?: string;
        helperText?: string;
        error?: string;
        fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
        function Textarea(props, ref) {
                const { label, helperText, error, required, fullWidth = true, className = '', id, ...rest } = props;
                const generatedId = React.useId();
                const fieldId = id || generatedId;
                return (
                        <FieldShell label={label} helperText={helperText} error={error} required={required} htmlFor={fieldId} fullWidth={fullWidth}>
                                <textarea
                                        ref={ref}
                                        id={fieldId}
                                        required={required}
                                        className={`${inputBase} ${inputBorder(error)} resize-y min-h-[72px] ${className}`}
                                        {...rest}
                                />
                        </FieldShell>
                );
        },
);

// ── Select ───────────────────────────────────────────────────────
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
        label?: string;
        helperText?: string;
        error?: string;
        fullWidth?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
        function Select(props, ref) {
                const { label, helperText, error, required, fullWidth = true, className = '', id, children, ...rest } = props;
                const generatedId = React.useId();
                const fieldId = id || generatedId;
                return (
                        <FieldShell label={label} helperText={helperText} error={error} required={required} htmlFor={fieldId} fullWidth={fullWidth}>
                                <select
                                        ref={ref}
                                        id={fieldId}
                                        required={required}
                                        className={`${inputBase} ${inputBorder(error)} appearance-none cursor-pointer ${className}`}
                                        {...rest}
                                >
                                        {children}
                                </select>
                        </FieldShell>
                );
        },
);
