import { Calendar } from "lucide-react";

export interface GoogleCalendarEvent {
        id: string;
        summary: string;
        description?: string;
        location?: string;
        start: { dateTime?: string; date?: string };
        end: { dateTime?: string; date?: string };
}


import { requestAccessToken } from './googleAuthService';

export const fetchCalendarEvents = async (timeMin: string, timeMax: string, accessToken?: string): Promise<GoogleCalendarEvent[]> => {
        // 1. Try passed token, then local storage
        let token = accessToken || localStorage.getItem('google_access_token');

        // Helper to perform the fetch
        const doFetch = async (authToken: string) => {
                const min = new Date(timeMin).toISOString();
                const max = new Date(timeMax).toISOString();
                return await fetch(
                        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${min}&timeMax=${max}&singleEvents=true&orderBy=startTime`,
                        {
                                headers: {
                                        'Authorization': `Bearer ${authToken}`,
                                        'Content-Type': 'application/json'
                                }
                        }
                );
        };

        try {
                if (!token) throw new Error('No access token found.');

                let response = await doFetch(token);

                // 2. Handle 401 Token Expired - Auto Refresh
                if (response.status === 401) {
                        console.warn("Token expired. Attempting silent refresh...");
                        try {
                                // Request new token silently
                                const newToken = await requestAccessToken(''); // Empty prompt = silent
                                if (newToken) {
                                        token = newToken;
                                        localStorage.setItem('google_access_token', newToken); // Update storage
                                        // Retry fetch with new token
                                        response = await doFetch(newToken);
                                }
                        } catch (refreshError) {
                                console.error("Silent refresh failed", refreshError);
                                throw new Error('Token expired. Please re-login.');
                        }
                }

                if (!response.ok) {
                        if (response.status === 401) throw new Error('Token expired');
                        if (response.status === 403) {
                                // CRITICAL: This specific error string is caught by the UI/AuthContext
                                throw new Error('NeedsReAuth');
                        }
                        throw new Error(`Calendar API Error: ${response.statusText}`);
                }

                const data = await response.json();
                return data.items || [];
        } catch (error) {
                console.error("Error fetching calendar events:", error);
                throw error;
        }
};

// Helper to extract city from address
const extractCity = (address?: string): string => {
        if (!address) return '';
        const parts = address.split(',').map(p => p.trim());
        // Heuristic: usually City is 2nd or 3rd from end? Or just take the largest non-number part?
        // Let's try to take the part before the country if possible, or just the 2nd part?
        // Simple heuristic: if > 2 parts, take 2nd to last (City, Country). If 2 parts, take 1st.
        if (parts.length >= 2) {
                // Filter out zip codes (numbers)
                const candidates = parts.filter(p => isNaN(Number(p)) && p.length > 2);
                if (candidates.length > 0) return candidates[candidates.length > 1 ? candidates.length - 2 : 0];
        }
        return parts[0] || '';
};

export const mapEventsToTimeline = (googleEvents: GoogleCalendarEvent[], startColor: string = 'text-green-600', startBg: string = 'bg-green-50') => {
        return googleEvents.map((ev, index) => {
                let startTime = '';
                let dateStr = '';

                // Robust Date Parsing
                if (ev.start.dateTime) {
                        const d = new Date(ev.start.dateTime);
                        // Force HH:MM format
                        const hours = d.getHours().toString().padStart(2, '0');
                        const minutes = d.getMinutes().toString().padStart(2, '0');
                        startTime = `${hours}:${minutes}`;

                        dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
                } else if (ev.start.date) {
                        // All Day Event
                        dateStr = ev.start.date;
                        startTime = ''; // Empty for all-day
                }

                // Type Inference based on keywords
                let type: any = 'activity';
                let displayTitle = ev.summary || 'אירוע ללא כותרת';
                let displaySubtitle = ev.description || '';

                const lowerSummary = (ev.summary || '').toLowerCase();
                if (lowerSummary.includes('flight') || lowerSummary.includes('טיסה')) type = 'flight';
                else if (lowerSummary.includes('hotel') || lowerSummary.includes('מלון') || lowerSummary.includes('stay')) {
                        type = 'hotel_stay';
                        // Semantic Title Logic (Task 2)
                        const city = extractCity(ev.location);
                        if (city) {
                                displayTitle = `Stay in ${city}`; // Or "שהייה ב" if Hebrew preferred
                                displaySubtitle = ev.summary; // Move hotel name to subtitle
                        }
                }
                else if (lowerSummary.includes('dinner') || lowerSummary.includes('lunch') || lowerSummary.includes('מסעדה')) type = 'food';

                return {
                        id: `gcal-${ev.id}`,
                        originalId: ev.id,
                        type: type,
                        time: startTime,
                        title: displayTitle,
                        subtitle: displaySubtitle,
                        location: ev.location || '',
                        icon: Calendar,
                        colorClass: startColor,
                        bgClass: startBg,
                        date: dateStr,
                        isExternal: true
                };
        });
};
