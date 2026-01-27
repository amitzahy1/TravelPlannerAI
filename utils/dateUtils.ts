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
                const cleanIso = isoString.split('/')[0].split(' ')[0];
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
