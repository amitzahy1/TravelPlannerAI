import { useRef } from 'react';

interface Options {
    /** Hold time in ms before the long-press fires. Default 500. */
    ms?: number;
    /** Right-click on desktop also triggers the handler. Default true. */
    bindContextMenu?: boolean;
}

/**
 * Long-press detection that works on touch + mouse. Returns event handler
 * props you spread onto a target element. The normal click handler still
 * fires on a short tap because we don't intercept the click event itself —
 * `wasLongPress` lets the click handler bail out if the press was long.
 *
 * Usage:
 *   const longPress = useLongPress(() => openRefreshMenu(category));
 *   <button {...longPress.handlers} onClick={() => { if (longPress.wasLongPress()) return; selectCategory(); }}>...
 */
export const useLongPress = (handler: () => void, opts: Options = {}) => {
    const { ms = 500, bindContextMenu = true } = opts;
    const timer = useRef<number | null>(null);
    const fired = useRef(false);

    const start = () => {
        fired.current = false;
        if (timer.current) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
            fired.current = true;
            handler();
        }, ms);
    };
    const cancel = () => {
        if (timer.current) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }
    };

    const handlers: React.HTMLAttributes<HTMLElement> = {
        onTouchStart: start,
        onTouchEnd: cancel,
        onTouchCancel: cancel,
        onTouchMove: cancel,
        onMouseDown: start,
        onMouseUp: cancel,
        onMouseLeave: cancel,
    };
    if (bindContextMenu) {
        handlers.onContextMenu = (e: React.MouseEvent) => {
            e.preventDefault();
            cancel();
            fired.current = true;
            handler();
        };
    }

    return {
        handlers,
        wasLongPress: () => fired.current,
        reset: () => { fired.current = false; },
    };
};
