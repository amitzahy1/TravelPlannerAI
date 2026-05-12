/**
 * Map of IATA airline codes → brand hex color, used for the Round-11
 * boarding-pass header strip in FlightsView. Unknown airlines fall back
 * to a neutral teal (the site's accent color) so the card still feels
 * on-brand even when we don't know the airline.
 *
 * Add entries here as new airlines come up — keep the comment naming
 * the airline so future readers can sanity-check.
 */
const AIRLINE_BRAND_COLOR: Record<string, string> = {
        EY: '#bf914b', // Etihad — gold
        LY: '#0F2A6E', // EL AL — navy
        LX: '#cc0000', // Swiss — red
        SQ: '#003876', // Singapore Airlines — navy
        EK: '#D71921', // Emirates — red
        QR: '#5C0F3C', // Qatar — burgundy
        LH: '#05164D', // Lufthansa — navy
        BA: '#075AAA', // British Airways — blue
        AF: '#002157', // Air France — navy
        KL: '#00A1DE', // KLM — sky blue
        TG: '#5B0F4E', // Thai Airways — purple
        TK: '#C70A0C', // Turkish Airlines — red
        UA: '#1E1E68', // United — navy
        AA: '#0078D2', // American — blue
        DL: '#9B1B30', // Delta — red
        AC: '#D22630', // Air Canada — red
        QF: '#EE0000', // Qantas — red
        CX: '#006564', // Cathay Pacific — green
        EL: '#0F2A6E', // (defensive) EL AL alt-code
};

const ACCENT_FALLBACK = '#0F766E'; // teal-700 (site accent)

/**
 * Resolve an airline brand color from a flight number (e.g. "EY598") or
 * airline code. Returns the site accent if unknown.
 */
export function getAirlineBrandColor(flightNumberOrCode: string | undefined | null): string {
        if (!flightNumberOrCode) return ACCENT_FALLBACK;
        const code = String(flightNumberOrCode).trim().slice(0, 2).toUpperCase();
        return AIRLINE_BRAND_COLOR[code] || ACCENT_FALLBACK;
}
