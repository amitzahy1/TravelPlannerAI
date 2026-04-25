import { TransportMode } from '../types';

/**
 * Single source of truth for the colour + emoji + Hebrew label of every
 * transport mode. Used by:
 *   - the unified Transport list view (chip backgrounds)
 *   - the map polylines (line colour per mode)
 *   - the Discover map pins (when a transport pin lands there)
 *
 * `bg` / `fg` — chip backgrounds and text. `line` — saturated map polyline.
 */
export interface ModeStyle {
        bg: string;
        fg: string;
        line: string;
        emoji: string;
        label: string;
}

export const MODE_COLORS: Record<TransportMode, ModeStyle> = {
        flight:     { bg: '#dbeafe', fg: '#1e3a8a', line: '#2563eb', emoji: '✈️', label: 'טיסה' },
        train:      { bg: '#fae8ff', fg: '#581c87', line: '#a855f7', emoji: '🚆', label: 'רכבת' },
        bus:        { bg: '#fef3c7', fg: '#854d0e', line: '#ca8a04', emoji: '🚌', label: 'אוטובוס' },
        ferry:      { bg: '#cffafe', fg: '#155e75', line: '#0891b2', emoji: '⛴',  label: 'מעבורת' },
        cruise:     { bg: '#e0f2fe', fg: '#0c4a6e', line: '#0284c7', emoji: '🛳',  label: 'שיט' },
        transfer:   { bg: '#fed7aa', fg: '#7c2d12', line: '#ea580c', emoji: '🚐', label: 'הסעה' },
        car_rental: { bg: '#dcfce7', fg: '#14532d', line: '#16a34a', emoji: '🚗', label: 'השכרת רכב' },
        drive:      { bg: '#f1f5f9', fg: '#475569', line: '#64748b', emoji: '🚗', label: 'נסיעה' },
};

export const styleForMode = (mode: TransportMode): ModeStyle => MODE_COLORS[mode] || MODE_COLORS.drive;
