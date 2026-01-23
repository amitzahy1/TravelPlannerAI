import { Calendar } from "lucide-react";

export interface GoogleCalendarEvent {
        id: string;
        summary: string;
        description?: string;
        location?: string;
        start: { dateTime?: string; date?: string };
        end: { dateTime?: string; date?: string };
}


export const fetchCalendarEvents = async (timeMin: string, timeMax: string, accessToken?: string): Promise<GoogleCalendarEvent[]> => {
        // 1. Try passed token, then local storage, then fail
        const token = accessToken || localStorage.getItem('google_access_token');
        if (!token) {
                throw new Error('No access token found.');
        }

        try {
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
                                throw new Error('Token expired');
                        }
                        if (response.status === 403) {
                                throw new Error('Permission denied. Please Re-Authorize Google Calendar.');
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
                const lowerSummary = (ev.summary || '').toLowerCase();
                if (lowerSummary.includes('flight') || lowerSummary.includes('טיסה')) type = 'flight';
                else if (lowerSummary.includes('hotel') || lowerSummary.includes('מלון')) type = 'hotel_stay';
                else if (lowerSummary.includes('dinner') || lowerSummary.includes('lunch') || lowerSummary.includes('מסעדה')) type = 'food';

                return {
                        id: `gcal-${ev.id}`,
                        originalId: ev.id,
                        type: type,
                        time: startTime,
                        title: ev.summary || 'אירוע ללא כותרת',
                        subtitle: ev.description || '',
                        location: ev.location || '',
                        icon: Calendar,
                        colorClass: startColor,
                        bgClass: startBg,
                        date: dateStr,
                        isExternal: true
                };
        });
};
