import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
        id: string;
        message: string;
        type: ToastType;
        duration: number;
}

interface ToastStore {
        toasts: ToastItem[];
        push: (message: string, type?: ToastType, duration?: number) => string;
        dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
        toasts: [],
        push: (message, type = 'info', duration = 3500) => {
                const id = crypto.randomUUID();
                set((s) => ({ toasts: [...s.toasts, { id, message, type, duration }] }));
                if (duration > 0) {
                        setTimeout(() => {
                                set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) }));
                        }, duration);
                }
                return id;
        },
        dismiss: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

/** Imperative helper — use from any non-component code (async handlers, services, etc). */
export const toast = {
        success: (msg: string, duration?: number) => useToastStore.getState().push(msg, 'success', duration),
        error: (msg: string, duration?: number) => useToastStore.getState().push(msg, 'error', duration ?? 5000),
        info: (msg: string, duration?: number) => useToastStore.getState().push(msg, 'info', duration),
        warning: (msg: string, duration?: number) => useToastStore.getState().push(msg, 'warning', duration),
        dismiss: (id: string) => useToastStore.getState().dismiss(id),
};
