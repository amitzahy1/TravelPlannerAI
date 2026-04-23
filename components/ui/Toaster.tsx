import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useToastStore, ToastType } from '../../stores/useToastStore';

const STYLES: Record<ToastType, { icon: React.ComponentType<{ className?: string }>; bg: string; text: string; border: string; iconColor: string }> = {
        success: { icon: CheckCircle2, bg: 'bg-emerald-50', text: 'text-emerald-900', border: 'border-emerald-200', iconColor: 'text-emerald-500' },
        error:   { icon: AlertCircle,  bg: 'bg-red-50',     text: 'text-red-900',     border: 'border-red-200',     iconColor: 'text-red-500' },
        info:    { icon: Info,         bg: 'bg-indigo-50',  text: 'text-indigo-900',  border: 'border-indigo-200',  iconColor: 'text-indigo-500' },
        warning: { icon: AlertTriangle,bg: 'bg-amber-50',   text: 'text-amber-900',   border: 'border-amber-200',   iconColor: 'text-amber-500' },
};

export const Toaster: React.FC = () => {
        const { toasts, dismiss } = useToastStore();

        return (
                <div
                        dir="rtl"
                        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none w-full max-w-md px-4"
                >
                        <AnimatePresence>
                                {toasts.map((t) => {
                                        const { icon: Icon, bg, text, border, iconColor } = STYLES[t.type];
                                        return (
                                                <motion.div
                                                        key={t.id}
                                                        layout
                                                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                                        className={`pointer-events-auto flex items-start gap-3 w-full ${bg} ${text} ${border} border rounded-2xl shadow-lg shadow-black/5 px-4 py-3`}
                                                >
                                                        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
                                                        <div className="flex-1 text-sm font-medium leading-relaxed">{t.message}</div>
                                                        <button
                                                                type="button"
                                                                onClick={() => dismiss(t.id)}
                                                                className="flex-shrink-0 w-6 h-6 rounded-lg hover:bg-black/5 flex items-center justify-center opacity-60 hover:opacity-100"
                                                                aria-label="סגור"
                                                        >
                                                                <X className="w-4 h-4" />
                                                        </button>
                                                </motion.div>
                                        );
                                })}
                        </AnimatePresence>
                </div>
        );
};
