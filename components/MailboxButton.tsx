import React from 'react';
import { Mail } from 'lucide-react';

interface MailboxButtonProps {
        count: number;
        onClick: () => void;
        variant: 'desktop-pill' | 'mobile-icon';
}

/**
 * Entry point for the Mailbox surface.
 *   - desktop-pill: a labeled pill that fits in the Row 2 toolbar
 *   - mobile-icon: a compact icon-only button that fits in the mobile header
 *     next to the new-trip and hamburger buttons
 *
 * Both variants render an unread count badge when `count > 0`.
 */
export const MailboxButton: React.FC<MailboxButtonProps> = ({ count, onClick, variant }) => {
        if (variant === 'desktop-pill') {
                return (
                        <button
                                onClick={onClick}
                                className="relative flex items-center gap-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-2 rounded-lg text-xs font-bold transition-all border border-transparent hover:border-emerald-200 hover:shadow-sm"
                                aria-label="פתח את תיבת הדואר"
                                title={count > 0 ? `${count} פריטים בתיבת הדואר` : 'תיבת הדואר'}
                        >
                                <Mail className="w-4 h-4 text-emerald-600" />
                                <span>תיבת דואר</span>
                                {count > 0 && (
                                        <span className="ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-2xs font-black">
                                                {count > 99 ? '99+' : count}
                                        </span>
                                )}
                        </button>
                );
        }

        return (
                <button
                        onClick={onClick}
                        className="relative lg:hidden p-2.5 bg-emerald-50 rounded-xl text-emerald-700 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 flex-shrink-0"
                        aria-label={count > 0 ? `פתח תיבת דואר — ${count} ממתינים` : 'פתח תיבת דואר'}
                >
                        <Mail className="w-5 h-5" aria-hidden="true" />
                        {count > 0 && (
                                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-2xs font-black ring-2 ring-white">
                                        {count > 9 ? '9+' : count}
                                </span>
                        )}
                </button>
        );
};
