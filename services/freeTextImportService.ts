import type { HotelBooking, FlightSegment } from '../types';
import { generateWithFallback, analyzeTripFiles } from './aiService';

export interface FreeTextParseHints {
  destination?: string;
  startDate?: string;     // YYYY-MM-DD
  endDate?: string;       // YYYY-MM-DD
  travelers?: number;
}

export interface FreeTextParseResult {
  hotels: HotelBooking[];
  flights: FlightSegment[];
  summary: string;
}

const buildPrompt = (text: string, hints?: FreeTextParseHints) => {
  const hintBlock = hints && (hints.destination || hints.startDate || hints.endDate || hints.travelers)
    ? `
Trip context (provided by the user in the wizard):
- destination: ${hints.destination || 'unknown'}
- expected start date: ${hints.startDate || 'unknown'}
- expected end date: ${hints.endDate || 'unknown'}
- travelers: ${hints.travelers ?? 'unknown'}
If the text is ambiguous about year, city, or guest counts, prefer these values. Never discard structured data from the text in favor of hints — hints only fill gaps.
`
    : '';

  return `You are a travel data extractor. Parse the following trip plan and extract structured data.

The input may be in any of these formats, possibly mixed:
(a) Free-form natural language in Hebrew or English.
(b) A Markdown or plain-text table.
(c) CSV or TSV (comma- or tab-separated values).
(d) Rows copied from Excel or Google Sheets.
(e) JSON.
Auto-detect the format(s) in the input. For tabular input, infer column meanings from headers or context (e.g. hotel / city / check-in / check-out / guests / flight / date / time).
${hintBlock}
Return ONLY valid JSON in this exact structure:
{
  "summary": "one line Hebrew summary of what was found",
  "hotels": [
    {
      "id": "unique-id-1",
      "name": "Hotel Name",
      "city": "City",
      "address": "Hotel Name, City, Country",
      "checkInDate": "YYYY-MM-DD",
      "checkOutDate": "YYYY-MM-DD",
      "nights": number,
      "confirmationCode": "booking/reservation number if mentioned",
      "notes": "transfer or arrival info if mentioned",
      "bookingSource": "Direct",
      "rooms": [
        {
          "id": "room-id-1",
          "label": "optional family/guest label, e.g. 'משפחת כהן' or 'Room 1'",
          "roomType": "exact room type name e.g. '2 Bedroom Family Suite', 'Sea View Grande Deluxe', 'Premium'",
          "adults": number,
          "children": number,
          "beds": "optional bed config if mentioned, e.g. 'King', 'Twin', '2 Queens'",
          "notes": "any preferences or per-room notes"
        }
      ]
    }
  ],
  "flights": [
    {
      "fromCode": "IATA or ???",
      "toCode": "IATA or ???",
      "fromCity": "departure city",
      "toCity": "arrival city",
      "date": "YYYY-MM-DD",
      "departureTime": "HH:MM or 00:00",
      "arrivalTime": "HH:MM or 00:00",
      "airline": "airline name or Unknown",
      "flightNumber": "number or TBD",
      "duration": "estimated or Unknown"
    }
  ]
}

Rules:
- For months in Hebrew: ינואר=01, פברואר=02, מרץ=03, אפריל=04, מאי=05, יוני=06, יולי=07, אוגוסט=08, ספטמבר=09, אוקטובר=10, נובמבר=11, דצמבר=12
- If year is not mentioned, use the current year or next year based on context (and prefer the expected dates from the hints block above if present)
- Extract ALL hotels mentioned, including ones where "hotel will be chosen later"

ROOMS — CRITICAL (follow these exactly):
- Create ONE entry in the rooms[] array per physical room. If a hotel says "5 rooms" or "3 premium + 2 suites", produce 5 room entries total (3 with roomType="Premium", 2 with roomType="Suite").
- Even when only a summary is given (e.g. "5 חדרים ל-9 מבוגרים ו-6 ילדים"), still create 5 room entries and distribute the guests as evenly as possible across them (e.g. 2+1, 2+1, 2+1, 2+2, 1+1 to sum to 9 adults / 6 children).
- Preserve the EXACT room name as written in the text (Hebrew or English, keep brand-specific names like "Sea View Grande Deluxe", "Junior Suite", "Villa", "2 Bedroom Family Suite").
- If per-room bed/view/floor details are given (e.g. "King Bed, Sea View, 5th floor"), put them in the room's "beds" or "notes" field.
- If per-room adult/child breakdown is given explicitly, use it exactly. Only fall back to even distribution when no per-room breakdown exists.
- If guest count is totally unknown for a room, default to 2 adults and 0 children.
- If no room type at all is mentioned for a hotel, use "Standard Room".

OTHER:
- Flights: a "landing" (נחיתה) = arrival flight, "departure" (המראה) = departure flight
- For transfers (vans, ferries) mentioned: put them in the hotel's notes field
- If booking / reservation / confirmation number is given, put it in the hotel's "confirmationCode" field
- Always return valid JSON, never return markdown or extra text

Trip plan text:
${text}`;
};

const extractJson = (raw: string): any => {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw?.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Could not parse AI response');
  }
};

export async function parseFreeTextTrip(
  text: string,
  hints?: FreeTextParseHints
): Promise<FreeTextParseResult> {
  if (!text?.trim()) {
    throw new Error('Empty input text');
  }

  const prompt = buildPrompt(text, hints);

  const response = await generateWithFallback(
    null,
    [prompt],
    { responseMimeType: 'application/json' },
    'SMART'
  );

  const textContent = typeof response.text === 'function' ? response.text() : response.text;
  const parsed = extractJson(textContent);

  const hotels: HotelBooking[] = (parsed.hotels || []).map((h: any) => ({
    ...h,
    id: crypto.randomUUID(),
    rooms: (h.rooms || []).map((r: any) => ({
      ...r,
      id: crypto.randomUUID(),
      adults: r.adults ?? 2,
      children: r.children ?? 0,
    })),
  }));

  const flights: FlightSegment[] = parsed.flights || [];

  // Validation: if BOTH hotels and flights came back empty the AI
  // either misunderstood the input or the user typed something too
  // vague. Surface this instead of silently creating an empty trip.
  if (hotels.length === 0 && flights.length === 0) {
    throw new Error('לא נמצאו מלונות או טיסות בטקסט. נסי להוסיף פרטים ספציפיים יותר (תאריכים, שמות מלונות, קודי טיסה).');
  }

  const summary: string = parsed.summary
    || `נמצאו ${hotels.length} מלונות ו-${flights.length} טיסות`;

  return { hotels, flights, summary };
}

/**
 * Parse uploaded PDF / image files and return the same shape as parseFreeTextTrip.
 * Lets callers reuse the free-text merge pipeline for mixed text + file inputs.
 */
export async function parseFilesToFreeText(files: File[]): Promise<FreeTextParseResult> {
  const analysis = await analyzeTripFiles(files);
  const raw = analysis.rawStagedData;

  const hotels: HotelBooking[] = (raw?.categories?.accommodation || []).map((h: any) => ({
    id: crypto.randomUUID(),
    name: h.data.hotelName || 'Hotel',
    city: h.data.city || '',
    address: h.data.address || '',
    checkInDate: h.data.checkIn?.isoDate || '',
    checkOutDate: h.data.checkOut?.isoDate || '',
    nights: h.data.nights || 0,
    bookingSource: 'Direct',
    confirmationCode: h.data.bookingId || undefined,
    price: h.data.price?.amount ? `${h.data.price.amount} ${h.data.price.currency || ''}`.trim() : undefined,
    rooms: [],
  }));

  const flights: FlightSegment[] = (raw?.categories?.transport || []).map((t: any) => ({
    fromCode: t.data.departure?.iata || '',
    fromCity: t.data.departure?.city || '',
    toCode: t.data.arrival?.iata || '',
    toCity: t.data.arrival?.city || '',
    departureTime: t.data.departure?.displayTime || '',
    arrivalTime: t.data.arrival?.displayTime || '',
    flightNumber: t.data.flightNumber || '',
    airline: t.data.airline || '',
    duration: '',
    date: t.data.departure?.isoDate || '',
  }));

  return {
    hotels,
    flights,
    summary: `מקבצים: ${hotels.length} מלונות ו-${flights.length} טיסות`,
  };
}

/**
 * Merge two parse results by deduplicating:
 * - Hotels: same name (case-insensitive) + same checkInDate
 * - Flights: same flightNumber + same date
 * When a hotel duplicate is detected, the incoming one enriches the existing one
 * only in fields that were empty.
 */
export function mergeFreeTextResults(
  existing: FreeTextParseResult,
  incoming: FreeTextParseResult
): FreeTextParseResult {
  const hotels = [...existing.hotels];
  for (const inc of incoming.hotels) {
    const idx = hotels.findIndex(h =>
      h.name.trim().toLowerCase() === inc.name.trim().toLowerCase() &&
      (!h.checkInDate || !inc.checkInDate || h.checkInDate === inc.checkInDate)
    );
    if (idx < 0) {
      hotels.push(inc);
    } else {
      const cur = hotels[idx];
      hotels[idx] = {
        ...cur,
        city: cur.city || inc.city,
        address: cur.address || inc.address,
        checkInDate: cur.checkInDate || inc.checkInDate,
        checkOutDate: cur.checkOutDate || inc.checkOutDate,
        nights: cur.nights || inc.nights,
        confirmationCode: cur.confirmationCode || inc.confirmationCode,
        price: cur.price || inc.price,
        rooms: cur.rooms?.length ? cur.rooms : inc.rooms,
        notes: cur.notes || inc.notes,
      };
    }
  }

  const flights = [...existing.flights];
  for (const inc of incoming.flights) {
    const dup = flights.find(f => f.flightNumber === inc.flightNumber && f.date === inc.date);
    if (!dup) flights.push(inc);
  }

  return {
    hotels,
    flights,
    summary: `סה"כ ${hotels.length} מלונות ו-${flights.length} טיסות`,
  };
}
