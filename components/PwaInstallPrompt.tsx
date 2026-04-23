import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwaInstallDismissedAt';
const RE_PROMPT_MS = 7 * 24 * 60 * 60 * 1000; // re-offer after 7 days

export const PwaInstallPrompt: React.FC = () => {
        const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
        const [visible, setVisible] = useState(false);

        useEffect(() => {
                const isStandalone =
                        window.matchMedia('(display-mode: standalone)').matches ||
                        // @ts-ignore iOS non-standard
                        (window.navigator as any).standalone === true;
                if (isStandalone) return;

                // Respect a recent dismissal
                const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
                if (dismissedAt && Date.now() - dismissedAt < RE_PROMPT_MS) return;

                const onBeforeInstallPrompt = (e: Event) => {
                        e.preventDefault();
                        setDeferred(e as BeforeInstallPromptEvent);
                        setVisible(true);
                };
                window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
                return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        }, []);

        const handleInstall = async () => {
                if (!deferred) return;
                await deferred.prompt();
                try {
                        const choice = await deferred.userChoice;
                        if (choice.outcome !== 'accepted') {
                                localStorage.setItem(DISMISS_KEY, String(Date.now()));
                        }
                } catch {
                        /* ignore */
                }
                setVisible(false);
                setDeferred(null);
        };

        const handleDismiss = () => {
                localStorage.setItem(DISMISS_KEY, String(Date.now()));
                setVisible(false);
        };

        if (!visible || !deferred) return null;

        return (
                <div
                        dir="rtl"
                        className="fixed bottom-24 md:bottom-4 left-1/2 -translate-x-1/2 z-[95] bg-white border border-slate-200 shadow-popover rounded-2xl px-4 py-3 flex items-center gap-3 max-w-sm w-[calc(100%-24px)]"
                        role="dialog"
                        aria-label="הוסף את האפליקציה למסך הבית"
                >
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-sky-400 text-white flex items-center justify-center shrink-0">
                                <Download className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-900 leading-tight">התקן לאתר למכשיר</p>
                                <p className="text-2xs text-slate-500 leading-tight mt-0.5">גישה מהירה מהמסך הבית, גם במצב אופליין</p>
                        </div>
                        <button
                                type="button"
                                onClick={handleInstall}
                                className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-2xs font-bold px-3 py-1.5 rounded-md active:scale-95 transition-all"
                        >
                                התקן
                        </button>
                        <button
                                type="button"
                                onClick={handleDismiss}
                                aria-label="סגור"
                                className="shrink-0 w-7 h-7 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center"
                        >
                                <X className="w-4 h-4" />
                        </button>
                </div>
        );
};
