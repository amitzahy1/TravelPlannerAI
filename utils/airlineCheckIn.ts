/**
 * Airline online check-in deep links.
 * Returns a URL the user can tap from the wallet to land directly on
 * the airline's check-in form (some airlines pre-fill PNR + last name).
 *
 * For airlines we don't have curated, falls back to a Google search
 * "{airline} online check-in" so the user gets to the right page in
 * one extra tap.
 */

interface CheckInBuilder {
  /** Either a static URL or a function that builds one with PNR/last name. */
  build: (ctx: { pnr?: string; lastName?: string }) => string;
  label: string;
}

const enc = (s: string | undefined) => encodeURIComponent((s || '').trim());

const TABLE: Record<string, CheckInBuilder> = {
  // Code → builder. Match by IATA code (EY, LY, BA), ICAO (ETD, ELY), or
  // freeform airline name (case-insensitive substring).
  EY: { label: 'Etihad', build: ({ pnr, lastName }) => `https://www.etihad.com/en/manage/check-in?bookingReference=${enc(pnr)}&lastName=${enc(lastName)}` },
  LY: { label: 'El Al', build: ({ pnr, lastName }) => `https://www.elal.com/en/online-services/check-in/?recordLocator=${enc(pnr)}&lastName=${enc(lastName)}` },
  BA: { label: 'British Airways', build: ({ pnr, lastName }) => `https://www.britishairways.com/travel/managebooking/public/en?bookingRef=${enc(pnr)}&lastName=${enc(lastName)}` },
  AA: { label: 'American', build: ({ pnr, lastName }) => `https://www.aa.com/checkin?lastName=${enc(lastName)}&recordLocator=${enc(pnr)}` },
  UA: { label: 'United', build: ({ pnr, lastName }) => `https://www.united.com/en/us/checkin?confirmationNumber=${enc(pnr)}&lastName=${enc(lastName)}` },
  DL: { label: 'Delta', build: ({ pnr, lastName }) => `https://www.delta.com/checkin?confirmationNumber=${enc(pnr)}&lastName=${enc(lastName)}` },
  AF: { label: 'Air France', build: ({ pnr, lastName }) => `https://wwws.airfrance.com/cgi-bin/AF/US/en/local/process/checkin/Initialize.do?bookingReference=${enc(pnr)}&lastName=${enc(lastName)}` },
  KL: { label: 'KLM', build: ({ pnr, lastName }) => `https://www.klm.com/checkin?bookingReference=${enc(pnr)}&lastName=${enc(lastName)}` },
  LH: { label: 'Lufthansa', build: ({ pnr, lastName }) => `https://www.lufthansa.com/de/en/online-check-in?BookingCode=${enc(pnr)}&LastName=${enc(lastName)}` },
  TK: { label: 'Turkish Airlines', build: ({ pnr, lastName }) => `https://www.turkishairlines.com/en-int/flights/manage-booking/?surname=${enc(lastName)}&pnr=${enc(pnr)}` },
  EK: { label: 'Emirates', build: ({ pnr, lastName }) => `https://www.emirates.com/manage-booking?bookingReference=${enc(pnr)}&lastName=${enc(lastName)}` },
  QR: { label: 'Qatar', build: ({ pnr, lastName }) => `https://www.qatarairways.com/en/manage-booking.html?bookingReference=${enc(pnr)}&lastName=${enc(lastName)}` },
  SQ: { label: 'Singapore Airlines', build: ({ pnr, lastName }) => `https://www.singaporeair.com/en_UK/sg/check-in/?recordLocator=${enc(pnr)}&lastName=${enc(lastName)}` },
  CX: { label: 'Cathay Pacific', build: ({ pnr, lastName }) => `https://www.cathaypacific.com/cx/en_HK/manage-booking.html?bookingReference=${enc(pnr)}&lastName=${enc(lastName)}` },
  TG: { label: 'Thai Airways', build: ({ pnr, lastName }) => `https://www.thaiairways.com/en/manage_booking/index.page?bookingReference=${enc(pnr)}&lastName=${enc(lastName)}` },
  W6: { label: 'Wizz Air', build: ({ pnr, lastName }) => `https://wizzair.com/en-gb/check-in?confirmationNumber=${enc(pnr)}&lastName=${enc(lastName)}` },
  FR: { label: 'Ryanair', build: ({ pnr, lastName }) => `https://www.ryanair.com/gb/en/check-in?bookingReference=${enc(pnr)}&lastName=${enc(lastName)}` },
  U2: { label: 'easyJet', build: ({ pnr, lastName }) => `https://www.easyjet.com/en/check-in?bookingReference=${enc(pnr)}&lastName=${enc(lastName)}` },
};

const NAME_TO_CODE: Array<[RegExp, string]> = [
  [/etihad/i, 'EY'],
  [/el\s?al|אל\s?על/i, 'LY'],
  [/british\s?airways/i, 'BA'],
  [/american\s?airlines/i, 'AA'],
  [/united\s?airlines/i, 'UA'],
  [/delta/i, 'DL'],
  [/air\s?france/i, 'AF'],
  [/\bklm\b/i, 'KL'],
  [/lufthansa/i, 'LH'],
  [/turkish\s?airlines/i, 'TK'],
  [/emirates/i, 'EK'],
  [/qatar/i, 'QR'],
  [/singapore\s?airlines/i, 'SQ'],
  [/cathay/i, 'CX'],
  [/thai\s?airways/i, 'TG'],
  [/wizz/i, 'W6'],
  [/ryanair/i, 'FR'],
  [/easyjet/i, 'U2'],
];

const resolveAirlineCode = (raw: string | undefined | null): string | null => {
  const s = (raw || '').trim();
  if (!s) return null;
  const codeMatch = s.match(/^[A-Z0-9]{2,3}$/);
  if (codeMatch) return codeMatch[0].toUpperCase();
  for (const [pattern, code] of NAME_TO_CODE) if (pattern.test(s)) return code;
  return null;
};

/**
 * Returns a URL + display label for online check-in. If the airline isn't
 * in the curated table, falls back to a Google search link.
 */
export const getCheckInUrl = (
  airline: string | undefined | null,
  pnr?: string,
  lastName?: string,
): { url: string; label: string; isFallback: boolean } => {
  const code = resolveAirlineCode(airline);
  if (code && TABLE[code]) {
    const builder = TABLE[code];
    return { url: builder.build({ pnr, lastName }), label: `צ'ק-אין ב-${builder.label}`, isFallback: false };
  }
  const q = encodeURIComponent(`${airline || ''} online check-in${pnr ? ` ${pnr}` : ''}`.trim());
  return { url: `https://www.google.com/search?q=${q}`, label: 'מצא צ\'ק-אין', isFallback: true };
};
