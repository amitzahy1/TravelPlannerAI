/**
 * Single overlay primitive. Replaces the 28 `fixed inset-0 z-[…]`
 * blocks scattered across views. Built-in:
 *
 *   - dir="rtl" by default (matches the app shell)
 *   - ESC to close
 *   - Click-outside to close (toggle with `dismissOnBackdrop`)
 *   - Body scroll lock while open
 *   - Focus trap-lite (initial focus on first focusable element)
 *   - Z-index from designTokens (`Z.modal` / `Z.modalOver`)
 *   - Sticky header + footer slots
 *   - 4 sizes: sm (400), md (560), lg (720), full (100% width with max)
 *
 * Use as:
 *   <Modal isOpen={x} onClose={...} title="Edit hotel" footer={<Button…/>}>
 *     <body content/>
 *   </Modal>
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { zIndex } from '../../utils/designTokens';
import { fadeUp, modalBackdrop } from '../../utils/motion';
import { IconButton } from './IconButton';

export type ModalSize = 'sm' | 'md' | 'lg' | 'full';
export type ModalLayer = 'modal' | 'modalOver';

export interface ModalProps {
        isOpen: boolean;
        onClose: () => void;
        title?: React.ReactNode;
        description?: React.ReactNode;
        children: React.ReactNode;
        footer?: React.ReactNode;
        size?: ModalSize;
        /** Stack above another modal (e.g. confirmation dialogs). */
        layer?: ModalLayer;
        dismissOnBackdrop?: boolean;
        dismissOnEsc?: boolean;
        showCloseButton?: boolean;
        /** Optional class on the inner panel (e.g. `bg-slate-50` for dense content). */
        panelClassName?: string;
        /** Hide the header entirely (e.g. immersive image-led modals). */
        hideHeader?: boolean;
        /** Stretch body to fill available height (good for forms with internal scroll). */
        fullHeight?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
        sm: 'max-w-sm',
        md: 'max-w-xl',
        lg: 'max-w-3xl',
        full: 'max-w-5xl w-full',
};

export const Modal: React.FC<ModalProps> = ({
        isOpen,
        onClose,
        title,
        description,
        children,
        footer,
        size = 'md',
        layer = 'modal',
        dismissOnBackdrop = true,
        dismissOnEsc = true,
        showCloseButton = true,
        panelClassName = '',
        hideHeader = false,
        fullHeight = false,
}) => {
        const panelRef = useRef<HTMLDivElement>(null);

        // ESC + body scroll lock while open.
        useEffect(() => {
                if (!isOpen) return;
                const onKey = (e: KeyboardEvent) => {
                        if (e.key === 'Escape' && dismissOnEsc) onClose();
                };
                window.addEventListener('keydown', onKey);
                const prevOverflow = document.body.style.overflow;
                document.body.style.overflow = 'hidden';
                return () => {
                        window.removeEventListener('keydown', onKey);
                        document.body.style.overflow = prevOverflow;
                };
        }, [isOpen, dismissOnEsc, onClose]);

        // Initial-focus on the first focusable inside the panel.
        useEffect(() => {
                if (!isOpen) return;
                const t = window.setTimeout(() => {
                        const root = panelRef.current;
                        if (!root) return;
                        const focusable = root.querySelector<HTMLElement>(
                                'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
                        );
                        focusable?.focus();
                }, 60);
                return () => window.clearTimeout(t);
        }, [isOpen]);

        return (
                <AnimatePresence>
                        {isOpen && (
                                <motion.div
                                        key="modal-backdrop"
                                        variants={modalBackdrop}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        className="fixed inset-0 flex items-start justify-center bg-slate-900/55 backdrop-blur-sm p-4 py-8 sm:py-12 overflow-y-auto"
                                        style={{ zIndex: zIndex[layer] }}
                                        dir="rtl"
                                        role="dialog"
                                        aria-modal="true"
                                        aria-labelledby={title ? 'modal-title' : undefined}
                                        onClick={dismissOnBackdrop ? onClose : undefined}
                                >
                                        <motion.div
                                                ref={panelRef}
                                                variants={fadeUp}
                                                initial="initial"
                                                animate="animate"
                                                exit="exit"
                                                onClick={(e) => e.stopPropagation()}
                                                className={`relative bg-white rounded-2xl shadow-2xl shadow-slate-900/20 w-full ${sizeClasses[size]} flex flex-col ${fullHeight ? 'max-h-[calc(100vh-6rem)] h-[calc(100vh-6rem)] overflow-hidden' : ''} ${panelClassName}`}
                                        >
                                                {!hideHeader && (title || showCloseButton) && (
                                                        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
                                                                <div className="min-w-0 flex-1 text-start">
                                                                        {title && (
                                                                                <h2 id="modal-title" className="text-lg font-black text-slate-900 leading-tight truncate">
                                                                                        {title}
                                                                                </h2>
                                                                        )}
                                                                        {description && (
                                                                                <p className="text-xs text-slate-500 mt-1 leading-snug">{description}</p>
                                                                        )}
                                                                </div>
                                                                {showCloseButton && (
                                                                        <IconButton
                                                                                aria-label="סגור"
                                                                                tone="neutral"
                                                                                size="sm"
                                                                                onClick={onClose}
                                                                        >
                                                                                <X />
                                                                        </IconButton>
                                                                )}
                                                        </div>
                                                )}

                                                <div className="flex-1 overflow-y-auto px-6 py-4">
                                                        {children}
                                                </div>

                                                {footer && (
                                                        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-100 bg-slate-50/60 flex-shrink-0">
                                                                {footer}
                                                        </div>
                                                )}
                                        </motion.div>
                                </motion.div>
                        )}
                </AnimatePresence>
        );
};
