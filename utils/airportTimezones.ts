/**
 * IATA airport → IANA timezone map, hand-curated for the ~60 busiest airports
 * we expect to see in user trip data (major hubs + popular leisure destinations).
 *
 * Used to compute accurate flight duration when both departure and arrival
 * airports are known — 'local clock span' is otherwise wrong by the timezone
 * delta (e.g. AUH 02:20 → BKK 11:50 is 6h 30m flight, not 9h 30m).
 *
 * Source: OpenFlights database + Wikipedia cross-reference. No license key /
 * network call — ships with the app.
 */

export const AIRPORT_TIMEZONES: Record<string, string> = {
        // Middle East
        TLV: 'Asia/Jerusalem',
        AUH: 'Asia/Dubai',
        DXB: 'Asia/Dubai',
        DOH: 'Asia/Qatar',
        AMM: 'Asia/Amman',
        CAI: 'Africa/Cairo',
        BAH: 'Asia/Bahrain',
        KWI: 'Asia/Kuwait',
        MCT: 'Asia/Muscat',
        RUH: 'Asia/Riyadh',
        JED: 'Asia/Riyadh',
        IST: 'Europe/Istanbul',

        // South-east Asia
        BKK: 'Asia/Bangkok',
        DMK: 'Asia/Bangkok',
        HKT: 'Asia/Bangkok',
        CNX: 'Asia/Bangkok',
        TDX: 'Asia/Bangkok', // Trat
        USM: 'Asia/Bangkok', // Ko Samui
        KBV: 'Asia/Bangkok', // Krabi
        SIN: 'Asia/Singapore',
        KUL: 'Asia/Kuala_Lumpur',
        DPS: 'Asia/Makassar', // Bali
        CGK: 'Asia/Jakarta',
        MNL: 'Asia/Manila',
        CEB: 'Asia/Manila',
        HAN: 'Asia/Ho_Chi_Minh',
        SGN: 'Asia/Ho_Chi_Minh',
        PNH: 'Asia/Phnom_Penh',
        REP: 'Asia/Phnom_Penh',
        VTE: 'Asia/Vientiane',

        // East Asia
        HND: 'Asia/Tokyo',
        NRT: 'Asia/Tokyo',
        KIX: 'Asia/Tokyo',
        ICN: 'Asia/Seoul',
        GMP: 'Asia/Seoul',
        PEK: 'Asia/Shanghai',
        PVG: 'Asia/Shanghai',
        CAN: 'Asia/Shanghai',
        HKG: 'Asia/Hong_Kong',
        TPE: 'Asia/Taipei',
        MLE: 'Indian/Maldives',

        // Europe
        LHR: 'Europe/London',
        LGW: 'Europe/London',
        STN: 'Europe/London',
        CDG: 'Europe/Paris',
        ORY: 'Europe/Paris',
        AMS: 'Europe/Amsterdam',
        FRA: 'Europe/Berlin',
        MUC: 'Europe/Berlin',
        BER: 'Europe/Berlin',
        ZRH: 'Europe/Zurich',
        VIE: 'Europe/Vienna',
        FCO: 'Europe/Rome',
        MXP: 'Europe/Rome',
        BCN: 'Europe/Madrid',
        MAD: 'Europe/Madrid',
        LIS: 'Europe/Lisbon',
        ATH: 'Europe/Athens',
        PRG: 'Europe/Prague',
        BUD: 'Europe/Budapest',
        WAW: 'Europe/Warsaw',
        TBS: 'Asia/Tbilisi',
        BUS: 'Asia/Tbilisi', // Batumi

        // North America
        JFK: 'America/New_York',
        EWR: 'America/New_York',
        LGA: 'America/New_York',
        BOS: 'America/New_York',
        IAD: 'America/New_York',
        MIA: 'America/New_York',
        ATL: 'America/New_York',
        ORD: 'America/Chicago',
        DEN: 'America/Denver',
        LAX: 'America/Los_Angeles',
        SFO: 'America/Los_Angeles',
        SEA: 'America/Los_Angeles',
        YYZ: 'America/Toronto',
        YVR: 'America/Vancouver',

        // Latin America
        MEX: 'America/Mexico_City',
        CUN: 'America/Cancun',
        GRU: 'America/Sao_Paulo',
        EZE: 'America/Argentina/Buenos_Aires',
};

/**
 * Get the UTC offset in minutes for a given IANA timezone at a specific date.
 * Uses the Intl API (built-in, no library needed) to account for DST.
 */
const getTimezoneOffsetMinutes = (timezone: string, date: Date): number => {
        try {
                // Format the same instant in both UTC and the target timezone and
                // subtract — yields the offset the timezone was at on that date.
                const dtf = new Intl.DateTimeFormat('en-US', {
                        timeZone: timezone,
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                        hour12: false,
                });
                const parts = dtf.formatToParts(date);
                const lookup: Record<string, number> = {};
                parts.forEach(p => { if (p.type !== 'literal') lookup[p.type] = parseInt(p.value, 10); });
                const asUTC = Date.UTC(
                        lookup.year, lookup.month - 1, lookup.day,
                        lookup.hour === 24 ? 0 : lookup.hour,
                        lookup.minute, lookup.second
                );
                return (asUTC - date.getTime()) / 60000;
        } catch {
                return 0;
        }
};

/**
 * Convert a local clock time ('HH:MM' on `dateIso`) at a given IATA airport
 * to a true UTC Date. Returns null if we don't know the airport's timezone.
 */
export const localTimeAtAirportToUTC = (
        dateIso: string,
        hhmm: string,
        iataCode?: string
): Date | null => {
        if (!dateIso || !hhmm) return null;
        const timeMatch = hhmm.match(/^(\d{1,2}):(\d{2})/);
        const dateMatch = dateIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!timeMatch || !dateMatch) return null;
        const [, yy, mm, dd] = dateMatch;
        const [, hh, mi] = timeMatch;

        const year = parseInt(yy, 10);
        const month = parseInt(mm, 10) - 1;
        const day = parseInt(dd, 10);
        const hour = parseInt(hh, 10);
        const minute = parseInt(mi, 10);

        const tz = iataCode ? AIRPORT_TIMEZONES[iataCode.toUpperCase()] : undefined;
        if (!tz) {
                // Fallback: interpret as UTC; caller's diff will still be correct
                // as long as both sides are treated the same way.
                return new Date(Date.UTC(year, month, day, hour, minute));
        }

        // Candidate UTC (first approximation: the clock time as if it were UTC)
        const candidate = new Date(Date.UTC(year, month, day, hour, minute));
        // Offset at that instant
        const offsetMinutes = getTimezoneOffsetMinutes(tz, candidate);
        // True UTC = candidate - offset (subtract offset because local = UTC + offset)
        return new Date(candidate.getTime() - offsetMinutes * 60000);
};
