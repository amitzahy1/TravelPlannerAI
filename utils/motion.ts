/**
 * Canonical motion variants. Every animated component in the product
 * imports from here so the timing curves stay related. If you need
 * a new motion, ADD it here — don't redefine keyframes per component.
 *
 * All variants assume Framer Motion's `Variants` shape and are
 * RTL-safe (the `slide` variant accepts a direction prop and you
 * pass +1 / -1 so the slide flips correctly under `dir="rtl"`).
 */

import type { Variants, Transition } from 'framer-motion';
import { motionDurations } from './designTokens';

const ms = (n: number): number => n / 1000;

// ── Base transitions ──────────────────────────────────────────────
export const tx = {
        instant: { duration: ms(motionDurations.instant), ease: [0.4, 0, 0.2, 1] },
        quick: { duration: ms(motionDurations.quick), ease: [0.4, 0, 0.2, 1] },
        base: { duration: ms(motionDurations.base), ease: [0.4, 0, 0.2, 1] },
        slide: { duration: ms(motionDurations.slide), ease: [0.4, 0, 0.2, 1] },
        spring: { type: 'spring' as const, stiffness: 320, damping: 28 },
} satisfies Record<string, Transition>;

// ── fadeUp — modals, page enters, sheet pop-ins ──────────────────
export const fadeUp: Variants = {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0, transition: tx.base },
        exit: { opacity: 0, y: 8, transition: tx.quick },
};

// ── popIn — toasts, badges, micro-feedback ──────────────────────
export const popIn: Variants = {
        initial: { opacity: 0, scale: 0.92 },
        animate: { opacity: 1, scale: 1, transition: tx.spring },
        exit: { opacity: 0, scale: 0.92, transition: tx.quick },
};

// ── slide — carousels, multi-step wizards ───────────────────────
// Pass `custom={direction}` (+1 forward, -1 back). RTL is honoured
// by sign-flipping at the call-site when needed.
export const slide: Variants = {
        initial: (dir: number) => ({ x: (dir > 0 ? -36 : 36), opacity: 0 }),
        animate: { x: 0, opacity: 1, transition: tx.slide },
        exit: (dir: number) => ({ x: (dir > 0 ? 36 : -36), opacity: 0, transition: tx.quick }),
};

// ── pageTransition — tab switches inside the app ────────────────
export const pageTransition: Variants = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: tx.base },
        exit: { opacity: 0, transition: tx.instant },
};

// ── nudge — error shake / "you missed something" feedback ───────
export const nudge: Variants = {
        animate: {
                x: [0, -6, 6, -4, 4, 0],
                transition: { duration: 0.4, ease: 'easeInOut' },
        },
};

// ── modalBackdrop — overlay fade ────────────────────────────────
export const modalBackdrop: Variants = {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: tx.quick },
        exit: { opacity: 0, transition: tx.quick },
};
