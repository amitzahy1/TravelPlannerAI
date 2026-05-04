/**
 * Tiny subtitle block rendered once at the top of each main view.
 * Tells the user what they're looking at and what's unique about it —
 * orientation matters most for first-time viewers (especially shared-trip
 * invitees who land here with no context).
 *
 * Constraints:
 *   - description ≤ 22 words → never wraps to more than 2 lines on a phone
 *   - tone is informative, not promotional (no "amazing", no "!"), and
 *     uses the app's gentle Hebrew second-person plural
 *   - calm visual: slate-50 background, slate-600 text, no border that
 *     competes with the page hero
 */

import React from 'react';

export interface PageIntroProps {
        icon?: React.ReactNode;
        description: string;
        className?: string;
}

export const PageIntro: React.FC<PageIntroProps> = ({ icon, description, className = '' }) => {
        return (
                <div
                        dir="rtl"
                        className={`bg-slate-50 border border-slate-100 rounded-2xl px-3.5 py-2.5 flex items-start gap-2.5 text-sm text-slate-600 leading-snug ${className}`}
                >
                        {icon && (
                                <span className="shrink-0 mt-0.5 text-slate-400 [&_svg]:w-4 [&_svg]:h-4">
                                        {icon}
                                </span>
                        )}
                        <p className="min-w-0 flex-1">{description}</p>
                </div>
        );
};
