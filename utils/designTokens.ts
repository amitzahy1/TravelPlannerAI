/**
 * Design tokens — single source of truth for the IPO-grade overhaul.
 *
 * Use these instead of inline arbitrary values (ban: `text-[11px]`, `p-7`, etc).
 * Tailwind config reads from this file to extend its theme, so `text-sm`,
 * `p-3`, `rounded-md` etc. produce the sizes defined here.
 *
 * If you need a value not in these scales, ADD it here — don't hard-code it
 * at the call site.
 */

// ── Typography scale ─────────────────────────────────────────────
// Rule of thumb: 2xs + xs for chip/label metadata, sm/base for body,
// lg/xl for headings inside cards, 2xl/3xl for page headers. Never go
// below 2xs in the app (11 px is the a11y floor for dense Hebrew).
export const typographyScale = {
        '2xs': ['11px', { lineHeight: '1.3' }],
        'xs': ['12px', { lineHeight: '1.35' }],
        'sm': ['13px', { lineHeight: '1.4' }],
        'base': ['14px', { lineHeight: '1.5' }],
        'md': ['16px', { lineHeight: '1.5' }],
        'lg': ['18px', { lineHeight: '1.4' }],
        'xl': ['22px', { lineHeight: '1.3' }],
        '2xl': ['28px', { lineHeight: '1.2' }],
        '3xl': ['34px', { lineHeight: '1.1' }],
} as const;

// ── Spacing scale (px) ───────────────────────────────────────────
// 4 px base grid. Tailwind defaults to 4 px too, so we preserve the
// common tokens and deliberately DON'T add odd values like 5, 7, 9.
export const spacingScale = {
        0: '0',
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        2.5: '10px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        8: '32px',
        10: '40px',
        12: '48px',
        16: '64px',
        20: '80px',
        24: '96px',
} as const;

// ── Border radii ─────────────────────────────────────────────────
export const radiusScale = {
        none: '0',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '22px',
        '2xl': '28px',
        pill: '9999px',
} as const;

// ── Shadow scale ─────────────────────────────────────────────────
// Fewer shadows = more consistent depth. 3 steps is enough.
export const shadowScale = {
        card: '0 1px 2px rgba(15, 23, 42, 0.05)',
        'card-hover': '0 4px 12px rgba(15, 23, 42, 0.08)',
        popover: '0 16px 48px rgba(15, 23, 42, 0.18)',
} as const;

// ── City palette (12 slots) ──────────────────────────────────────
// Tailwind colour names. Extended from 6 → 12 so a 12-city trip
// never repeats. Apply via `bg-${slot}-50`, `text-${slot}-600` etc.
export const cityPalette = [
        'indigo',
        'emerald',
        'amber',
        'rose',
        'violet',
        'teal',
        'cyan',
        'fuchsia',
        'lime',
        'orange',
        'sky',
        'pink',
] as const;

// ── Semantic tokens ──────────────────────────────────────────────
export const semantic = {
        primary: { 50: 'blue-50', 100: 'blue-100', 500: 'blue-500', 600: 'blue-600', 700: 'blue-700' },
        success: { 50: 'emerald-50', 500: 'emerald-500', 600: 'emerald-600' },
        warning: { 50: 'amber-50', 500: 'amber-500', 600: 'amber-600' },
        danger: { 50: 'rose-50', 500: 'rose-500', 600: 'rose-600' },
        muted: { 50: 'slate-50', 100: 'slate-100', 200: 'slate-200', 400: 'slate-400', 500: 'slate-500', 600: 'slate-600', 900: 'slate-900' },
} as const;

// ── Touch targets (mobile) ──────────────────────────────────────
// Minimum 44×44 px per Apple HIG + WCAG 2.2 AA.
export const touchTarget = 44;

export type CityPaletteSlot = (typeof cityPalette)[number];

// ── Z-index hierarchy (named tokens) ────────────────────────────
// Replaces the wild z-10 / 40 / 50 / 80 / 100 / 200 / 1000 / 9999
// anarchy across components. Use the constant — never `z-[…]`.
//
//   base       — most content
//   raised     — hovered cards, sticky page headers
//   sticky     — sticky toolbars within a page
//   navbar     — top app navigation
//   dropdown   — open menus / popovers
//   mapOverlay — Leaflet UI on top of the map
//   modal      — single overlay layer for dialogs
//   modalOver  — confirm-modals stacked on top of an open modal
//   toast      — always above everything except tooltips
//   tooltip    — last layer, click-through
export const zIndex = {
        base: 1,
        raised: 10,
        sticky: 20,
        navbar: 40,
        dropdown: 50,
        mapOverlay: 60,
        modal: 100,
        modalOver: 110,
        toast: 200,
        tooltip: 300,
} as const;
export type ZIndexLayer = keyof typeof zIndex;

// ── Motion (canonical animation specs) ──────────────────────────
// Import these from `utils/motion.ts` (re-exports) instead of redefining
// keyframes per file. Goal: every animation in the product feels related.
export const motionDurations = {
        instant: 120,    // hover state
        quick: 180,      // toasts, badges
        base: 220,       // modals, page-enter
        slide: 260,      // carousel transitions
        deliberate: 360, // success / hero animations
} as const;
