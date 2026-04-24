import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
        open: boolean;
        onClose: () => void;
        title?: string;
        subtitle?: string;
        size?: Size;
        /** Allow click on the backdrop to close (default true). */
        dismissOnBackdrop?: boolean;
        /** Footer actions (optional). */
        footer?: React.ReactNode;
        children: React.ReactNode;
}

const SIZE: Record<Size, string> = {
        sm: 'max-w-md',
        md: 'max-w-xl',
        lg: 'max-w-3xl',
        xl: 'max-w-5xl',
        full: 'max-w-[min(100vw-16px,1400px)]',
};

export const Modal: React.FC<ModalProps> = ({
        open, onClose, title, subtitle, size = 'md', dismissOnBackdrop = true, footer, children,
}) => {
        const dialogRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
                if (!open) return;
                const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
                document.addEventListener('keydown', onKey);
                const prevOverflow = document.body.style.overflow;
                document.body.style.overflow = 'hidden';
                return () => {
                        document.removeEventListener('keydown', onKey);
                        document.body.style.overflow = prevOverflow;
                };
        }, [open, onClose]);

        if (!open) return null;

        return createPortal(
                <div
                        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
                        onClick={dismissOnBackdrop ? onClose : undefined}
                        dir="rtl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={title ? 'modal-title' : undefined}
                >
                        <div
                                ref={dialogRef}
                                onClick={(e) => e.stopPropagation()}
                                className={`bg-white w-full ${SIZE[size]} max-h-[92vh] flex flex-col rounded-t-2xl sm:rounded-2xl shadow-popover overflow-hidden`}
                                style={{
                                        // Safe-area insets on notched phones — respect bottom
                                        // (home indicator) AND top (notch) so nothing clips.
                                        paddingBottom: 'env(safe-area-inset-bottom)',
                                        paddingTop: 'env(safe-area-inset-top)',
                                }}
                        >
                                {(title || subtitle) && (
                                        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
                                                <div className="min-w-0 flex-1">
                                                        {title && <h2 id="modal-title" className="text-lg font-bold text-slate-900 truncate">{title}</h2>}
                                                        {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
                                                </div>
                                                <button
                                                        type="button"
                                                        onClick={onClose}
                                                        aria-label="סגור"
                                                        className="shrink-0 w-9 h-9 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                                                >
                                                        <X className="w-5 h-5" />
                                                </button>
                                        </header>
                                )}
                                <div className="flex-1 overflow-y-auto">
                                        {children}
                                </div>
                                {footer && (
                                        <footer className="px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50 shrink-0">
                                                {footer}
                                        </footer>
                                )}
                        </div>
                </div>,
                document.body
        );
};
