/**
 * Centralized Date & Time Formatter (Project Genesis)
 */

export const formatDateTime = (isoString?: string) => {
        if (!isoString) return 'TBD';
        try {
                // Fix for common malformations like "2026-01-28T19:30:00/01/2026" or similar
                // We take only the valid ISO part (up to the first T + 8 chars for time)
                const cleanIso = isoString.split('/')[0].split(' ')[0];

                const date = new Date(cleanIso);
                if (isNaN(date.getTime())) return isoString; // Return original if invalid

                return new Intl.DateTimeFormat('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                }).format(date);
        } catch (e) {
                return isoString;
        }
};

export const formatDateOnly = (isoString?: string) => {
        if (!isoString) return 'TBD';
        try {
                // FORCE strip time component to prevent timezone issues shifting the day
                const cleanIso = isoString.split('T')[0].split(' ')[0].split('/')[0];
                const date = new Date(cleanIso);
                if (isNaN(date.getTime())) return isoString;
                return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
        } catch (e) {
                return isoString;
        }
};

export const formatTimeOnly = (isoString?: string) => {
        if (!isoString) return 'TBD';
        try {
                const date = new Date(isoString);
                if (isNaN(date.getTime())) {
                        // Check if it's already HH:MM
                        if (isoString.match(/^\d{2}:\d{2}$/)) return isoString;
                        return isoString;
                }
                return new Intl.DateTimeFormat('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                }).format(date);
        } catch (e) {
                return isoString;
        }
};

/**
 * Extract time (HH:MM) from various formats including malformed ISO strings
 * Handles: "2026-02-15T00:30:00", "00:30", "2026-02-15T00:30:00+04:00", etc.
 */
/**
 * Robustly format flight time from multiple inputs:
 * - "HH:MM" string
 * - ISO Date string
 * - Firestore Timestamp object (has .toDate())
 * - Date object
 */
export const formatFlightTime = (input: any): string => {
        if (!input) return '00:00';

        // 1. Handle Firestore Timestamp / Object with toDate
        if (typeof input === 'object' && typeof input.toDate === 'function') {
                try {
                        const date = input.toDate();
                        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                } catch (e) { console.error("Timestamp parse fail", e); }
        }

        // 2. Handle standard Date object
        if (input instanceof Date) {
                return input.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        }

        // 3. Handle Strings
        if (typeof input === 'string') {
                // "10:00" or "10:00:00"
                if (input.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
                        return input.substring(0, 5);
                }

                // ISO String "2026-01-01T10:00:00"
                if (input.includes('T')) {
                        try {
                                const date = new Date(input);
                                if (!isNaN(date.getTime())) {
                                        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                                }
                        } catch (e) { }
                }
        }

        console.warn("formatFlightTime could not parse:", input);
        return '00:00';
};

/**
 * Extract time (HH:MM) from various formats including malformed ISO strings
 * Handles: "2026-02-15T00:30:00", "00:30", "2026-02-15T00:30:00+04:00", etc.
 * @deprecated Use formatFlightTime for UI display
 */
export const parseFlightTime = (timeString?: string): string => {
        return formatFlightTime(timeString);
};

/**
 * Calculate flight duration from ISO strings, with timezone awareness.
 * Returns format like "6h 30m" or "משך לא ידוע" if calculation fails.
 */
export const calculateFlightDuration = (departureIso?: string, arrivalIso?: string): string => {
        if (!departureIso || !arrivalIso) return 'משך לא ידוע';

        try {
                const depDate = new Date(departureIso);
                const arrDate = new Date(arrivalIso);

                if (isNaN(depDate.getTime()) || isNaN(arrDate.getTime())) {
                        return 'משך לא ידוע';
                }

                // Calculate difference (automatically handles timezones if ISO has offset)
                let diffMs = arrDate.getTime() - depDate.getTime();

                // Handle overnight/negative
                if (diffMs < 0) {
                        diffMs += 24 * 60 * 60 * 1000;
                }

                // Sanity: flights max 24h
                if (diffMs > 24 * 60 * 60 * 1000) {
                        return 'משך לא ידוע';
                }

                const totalMinutes = Math.round(diffMs / (1000 * 60));
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;

                if (hours === 0) return `${minutes}m`;
                return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;

        } catch (e) {
                return 'משך לא ידוע';
        }
};

/**
 * Parse date from various string formats, returning YYYY-MM-DD
 */
export const parseDateToIso = (dateStr?: string): string => {
        if (!dateStr) return '';

        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;

        const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (dmyMatch) {
                return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
        }

        const isoMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) return isoMatch[1];

        try {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                        return date.toISOString().split('T')[0];
                }
        } catch (e) { }

        return '';
};
