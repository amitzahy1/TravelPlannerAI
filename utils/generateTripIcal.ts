import { Trip, FlightSegment, HotelBooking } from '../types';

/**
 * Generates an RFC 5545 iCalendar (.ics) file for the trip — flights
 * as `VEVENT`s with start/end in UTC, hotels as all-day stays, and
 * itinerary activities as events with approximate times. Opens in
 * Google Calendar / Apple Calendar / Outlook with a single tap.
 *
 * No external deps. Conformant to the minimum iCal spec so major
 * clients accept it without warnings.
 */

const pad = (n: number): string => n.toString().padStart(2, '0');

/** Escape text per iCal spec: backslash, comma, semicolon, newline. */
const esc = (s: string): string =>
        (s || '')
                .replace(/\\/g, '\\\\')
                .replace(/\n/g, '\\n')
                .replace(/,/g, '\\,')
                .replace(/;/g, '\\;');

const toUtcIso = (d: Date): string => {
        return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};

const toAllDay = (iso: string): string => {
        const d = new Date(iso);
        return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
};

/** Fold long lines per iCal (< 75 octets) — simple 72-char break with
 *  a space continuation. */
const fold = (line: string): string => {
        if (line.length <= 72) return line;
        const chunks: string[] = [];
        for (let i = 0; i < line.length; i += 72) {
                chunks.push((i === 0 ? '' : ' ') + line.slice(i, i + 72));
        }
        return chunks.join('\r\n');
};

const flightEvents = (trip: Trip): string[] => {
        const events: string[] = [];
        (trip.flights?.segments || []).forEach((seg: FlightSegment, idx: number) => {
                const date = seg.date;
                if (!date) return;
                const dep = seg.departureTime?.includes('T')
                        ? new Date(seg.departureTime)
                        : seg.departureTime && /^\d{1,2}:\d{2}/.test(seg.departureTime)
                                ? new Date(`${date}T${seg.departureTime.slice(0, 5)}:00`)
                                : new Date(date);
                const arrDate = seg.arrivalTime?.includes('T')
                        ? new Date(seg.arrivalTime)
                        : seg.arrivalTime && /^\d{1,2}:\d{2}/.test(seg.arrivalTime)
                                ? new Date(`${date}T${seg.arrivalTime.slice(0, 5)}:00`)
                                : new Date(dep.getTime() + 3 * 3600 * 1000);
                // If arrival < departure → overnight → +1 day
                if (arrDate.getTime() <= dep.getTime()) {
                        arrDate.setDate(arrDate.getDate() + 1);
                }
                const title = `✈ ${seg.fromCode || seg.fromCity || ''} → ${seg.toCode || seg.toCity || ''}`;
                const desc = [
                        seg.airline && `Airline: ${seg.airline}`,
                        seg.flightNumber && `Flight: ${seg.flightNumber}`,
                        seg.terminal && `Terminal: ${seg.terminal}`,
                        seg.gate && `Gate: ${seg.gate}`,
                        seg.duration && `Duration: ${seg.duration}`,
                ].filter(Boolean).join('\n');
                events.push([
                        'BEGIN:VEVENT',
                        fold(`UID:flight-${trip.id}-${idx}@travel-planner-pro`),
                        `DTSTAMP:${toUtcIso(new Date())}`,
                        `DTSTART:${toUtcIso(dep)}`,
                        `DTEND:${toUtcIso(arrDate)}`,
                        fold(`SUMMARY:${esc(title)}`),
                        fold(`DESCRIPTION:${esc(desc)}`),
                        fold(`LOCATION:${esc(seg.fromCity || '')}`),
                        'END:VEVENT',
                ].join('\r\n'));
        });
        return events;
};

const hotelEvents = (trip: Trip): string[] => {
        const events: string[] = [];
        (trip.hotels || []).forEach((h: HotelBooking, idx: number) => {
                if (!h.checkInDate || !h.checkOutDate) return;
                const title = `🏨 ${h.name}`;
                const desc = [
                        h.address && `Address: ${h.address}`,
                        h.confirmationCode && `Confirmation: ${h.confirmationCode}`,
                        h.price && `Price: ${h.price}${h.currency ? ' ' + h.currency : ''}`,
                        h.mealPlan && `Meal plan: ${h.mealPlan}`,
                ].filter(Boolean).join('\n');
                events.push([
                        'BEGIN:VEVENT',
                        fold(`UID:hotel-${trip.id}-${idx}@travel-planner-pro`),
                        `DTSTAMP:${toUtcIso(new Date())}`,
                        `DTSTART;VALUE=DATE:${toAllDay(h.checkInDate)}`,
                        `DTEND;VALUE=DATE:${toAllDay(h.checkOutDate)}`,
                        fold(`SUMMARY:${esc(title)}`),
                        fold(`DESCRIPTION:${esc(desc)}`),
                        fold(`LOCATION:${esc(h.address || h.city || '')}`),
                        'TRANSP:TRANSPARENT',
                        'END:VEVENT',
                ].join('\r\n'));
        });
        return events;
};

const itineraryEvents = (trip: Trip): string[] => {
        const events: string[] = [];
        (trip.itinerary || []).forEach((day, dayIdx) => {
                if (!day.date) return;
                const dateIso = /^\d{4}-\d{2}-\d{2}/.test(day.date) ? day.date.slice(0, 10) : null;
                if (!dateIso) return;
                (day.activities || []).forEach((act, actIdx) => {
                        const m = act.match(/^(\d{1,2}:\d{2})(?:-\d{1,2}:\d{2})?\s*(.*)/);
                        const time = m ? m[1] : '10:00';
                        const title = m ? m[2] : act;
                        if (!title) return;
                        const start = new Date(`${dateIso}T${time}:00`);
                        const end = new Date(start.getTime() + 60 * 60 * 1000);
                        events.push([
                                'BEGIN:VEVENT',
                                fold(`UID:activity-${trip.id}-${dayIdx}-${actIdx}@travel-planner-pro`),
                                `DTSTAMP:${toUtcIso(new Date())}`,
                                `DTSTART:${toUtcIso(start)}`,
                                `DTEND:${toUtcIso(end)}`,
                                fold(`SUMMARY:📍 ${esc(title.trim())}`),
                                fold(`LOCATION:${esc(day.title || trip.destination || '')}`),
                                'END:VEVENT',
                        ].join('\r\n'));
                });
        });
        return events;
};

export const generateTripIcal = (trip: Trip): string => {
        const body = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Travel Planner Pro//2026//EN',
                'CALSCALE:GREGORIAN',
                'METHOD:PUBLISH',
                fold(`X-WR-CALNAME:${esc(trip.name || 'Trip')}`),
                fold(`X-WR-CALDESC:${esc(`Trip to ${trip.destination || ''}`)}`),
                ...flightEvents(trip),
                ...hotelEvents(trip),
                ...itineraryEvents(trip),
                'END:VCALENDAR',
        ].join('\r\n');
        return body;
};

export const downloadTripIcal = (trip: Trip): void => {
        const ics = generateTripIcal(trip);
        const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(trip.name || 'trip').replace(/[^a-zA-Z0-9֐-׿ ]/g, '').trim() || 'trip'}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
};
