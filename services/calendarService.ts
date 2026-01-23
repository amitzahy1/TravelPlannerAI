import { Calendar } from "lucide-react";

export interface GoogleCalendarEvent {
        id: string;
        summary: string;
        description?: string;
        location?: string;
        start: { dateTime?: string; date?: string };
        end: { dateTime?: string; date?: string };
}

export const fetchCalendarEvents = async (timeMin: string, timeMax: string): Promise<GoogleCalendarEvent[]> => {
        const token = localStorage.getItem('google_access_token');
        if (!token) {
                throw new Error('No access token found. Please sign in again.');
        }

        try {
                // Format dates to RFC3339 (e.g., 2023-10-01T00:00:00Z)
                const min = new Date(timeMin).toISOString();
                const max = new Date(timeMax).toISOString();

                const response = await fetch(
                        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${min}&timeMax=${max}&singleEvents=true&orderBy=startTime`,
                        {
                                headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Content-Type': 'application/json'
                                }
                        }
                );

                if (!response.ok) {
                        if (response.status === 401) {
                                throw new Error('Token expired. Please sign out and in again.');
                        }
                        if (response.status === 403) {
                                throw new Error('Permission denied. Please Sign Out and Sign In again to grant Calendar access.');
                        }
                        throw new Error('Failed to fetch events');
                }

                const data = await response.json();
                return data.items || [];
        } catch (error) {
                console.error("Error fetching calendar events:", error);
                throw error;
        }
};

export const mapEventsToTimeline = (googleEvents: GoogleCalendarEvent[], startColor: string = 'text-green-600', startBg: string = 'bg-green-50') => {
        return googleEvents.map((ev, index) => {
                const startTime = ev.start.dateTime
                        ? new Date(ev.start.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                        : 'All Day';

                // Extract date YYYY-MM-DD
                let dateStr = '';
                if (ev.start.dateTime) {
                        const d = new Date(ev.start.dateTime);
                        dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
                } else if (ev.start.date) {
                        dateStr = ev.start.date;
                }

                return {
                        id: `gcal-${ev.id}`,
                        originalId: ev.id,
                        type: 'activity', // generic type
                        time: startTime === 'All Day' ? '' : startTime,
                        title: ev.summary || 'אירוע ללא כותרת',
                        subtitle: ev.description,
                        location: ev.location,
                        icon: Calendar,
                        colorClass: startColor,
                        bgClass: startBg,
                        date: dateStr,
                        isExternal: true // flag for UI distinction
                };
        });
};
