/**
 * Registers a set of keyboard shortcuts while the host component is mounted.
 * Used by the unified-trip map for Google-Maps-style power-user controls
 * (Cmd+F search, +/- zoom, ESC close, 1-9 city focus, ? help).
 *
 * Skips events when the user is typing in a form field — wouldn't want
 * pressing "+" inside an `<input>` to zoom the map.
 */

import { useEffect } from 'react';

export type ShortcutMap = Record<string, (event: KeyboardEvent) => void>;

const isTypingTarget = (target: EventTarget | null): boolean => {
        if (!(target instanceof HTMLElement)) return false;
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
        if (target.isContentEditable) return true;
        return false;
};

/**
 * Build a string key from a KeyboardEvent that matches a shortcut entry.
 * Examples:
 *   "cmd+f" / "ctrl+f" — modifier + key
 *   "+" / "-" / "?"     — bare key
 *   "escape" / "1".."9" — bare named key
 */
const eventToKey = (e: KeyboardEvent): string[] => {
        const keys: string[] = [];
        const k = e.key.toLowerCase();

        if ((e.metaKey || e.ctrlKey) && k.length === 1 && /[a-z0-9]/.test(k)) {
                keys.push(`mod+${k}`);
                if (e.metaKey) keys.push(`cmd+${k}`);
                if (e.ctrlKey) keys.push(`ctrl+${k}`);
        }

        // Bare keys — important: e.key is "+" on shift+= for most layouts
        keys.push(k);

        // Aliases for usability — "/?" pair on US layout, ESC abbreviation
        if (e.key === '?') keys.push('?');
        if (k === 'escape') keys.push('esc');
        return keys;
};

export const useKeyboardShortcuts = (shortcuts: ShortcutMap, enabled = true) => {
        useEffect(() => {
                if (!enabled) return;
                const handler = (e: KeyboardEvent) => {
                        if (isTypingTarget(e.target)) return;
                        const candidates = eventToKey(e);
                        for (const k of candidates) {
                                const fn = shortcuts[k];
                                if (fn) {
                                        e.preventDefault();
                                        fn(e);
                                        return;
                                }
                        }
                };
                window.addEventListener('keydown', handler);
                return () => window.removeEventListener('keydown', handler);
        }, [shortcuts, enabled]);
};
