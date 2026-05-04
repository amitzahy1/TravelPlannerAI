import { Trip } from '../types';
import { cleanUndefined } from './cleanUndefined';

/**
 * The single source of truth for the mailbox forwarding address.
 * The Cloudflare Worker email handler at workers/src/index.ts listens for
 * messages sent to this address, identifies the user by sender email, runs
 * Gemini extraction, and writes a Trip with `source: 'email_import'`.
 */
export const MAILBOX_FORWARD_ADDRESS = 'travelplanneraiagent@gmail.com';

/**
 * Public Gmail compose URL with the address pre-filled — used by mobile and
 * desktop "פתח Gmail" buttons in the mailbox UI to short-cut the forwarding
 * step. (Web Gmail respects the `to` query param; on iOS this falls through to
 * the user's default mail client.)
 */
export const gmailComposeUrl = (subject = ''): string => {
        const params = new URLSearchParams({
                view: 'cm',
                fs: '1',
                to: MAILBOX_FORWARD_ADDRESS,
        });
        if (subject) params.set('su', subject);
        return `https://mail.google.com/mail/?${params.toString()}`;
};

/**
 * Detect a trip that originated from a forwarded email. The Worker stamps
 * `source: 'email_import'` on every trip it creates.
 */
export const isMailboxTrip = (trip: Trip): boolean => (trip as any).source === 'email_import';

/**
 * Soft-delete: remove the email_import marker so the trip stops appearing in
 * the mailbox view but stays in the user's trip list.
 */
export const claimMailboxTrip = (trip: Trip): Trip => {
        const next: any = { ...trip };
        delete next.source;
        return cleanUndefined(next) as Trip;
};

/**
 * Merge two trips: copy hotels, flight segments, transports, and shopping
 * items from `source` into `target`, deduping where we can identify it. Caller
 * should then delete `source`.
 *
 * Used by the mailbox "הוסף לטיול קיים" flow to fold a one-off email-created
 * trip into the user's main itinerary.
 *
 * Restaurants and attractions are intentionally NOT merged here — they live in
 * category buckets, and email imports almost never produce them. If that
 * changes we'll wire it up.
 */
export const mergeTripIntoTarget = (target: Trip, source: Trip): Trip => {
        const t: any = { ...target };
        const s: any = source;

        const dedupById = <T extends { id?: string; name?: string }>(existing: T[] | undefined, incoming: T[] | undefined): T[] => {
                const out: T[] = [...(existing || [])];
                const seen = new Set<string>(out.map(x => x.id || (x.name || '').toLowerCase()).filter(Boolean));
                for (const item of incoming || []) {
                        const key = item.id || (item.name || '').toLowerCase();
                        if (key && seen.has(key)) continue;
                        out.push(item);
                        if (key) seen.add(key);
                }
                return out;
        };

        if (s.hotels?.length) t.hotels = dedupById(t.hotels, s.hotels);
        if (s.shoppingItems?.length) t.shoppingItems = dedupById(t.shoppingItems, s.shoppingItems);
        if (s.transports?.length) t.transports = dedupById(t.transports, s.transports);
        if (s.trains?.length) t.trains = dedupById(t.trains, s.trains);
        if (s.cruises?.length) t.cruises = dedupById(t.cruises, s.cruises);
        if (s.buses?.length) t.buses = dedupById(t.buses, s.buses);
        if (s.ferries?.length) t.ferries = dedupById(t.ferries, s.ferries);

        // Flights: each Trip has one `flights: Ticket` with a `segments` array.
        // Concat segments, dedup by flightNumber+date (since segment IDs are not
        // always set by parsers).
        if (s.flights?.segments?.length) {
                const existing = t.flights?.segments || [];
                const seen = new Set<string>(existing.map((f: any) => `${f.flightNumber || ''}|${f.date || ''}`));
                const merged = [...existing];
                for (const seg of s.flights.segments) {
                        const k = `${seg.flightNumber || ''}|${seg.date || ''}`;
                        if (k && seen.has(k)) continue;
                        merged.push(seg);
                        if (k) seen.add(k);
                }
                t.flights = {
                        ...(t.flights || { passengers: [], pnr: '', segments: [] }),
                        segments: merged,
                };
        }

        return cleanUndefined(t) as Trip;
};
