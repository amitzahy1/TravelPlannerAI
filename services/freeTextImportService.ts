import type { HotelBooking, FlightSegment } from '../types';
import { generateWithFallback } from './aiService';

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
      "notes": "transfer or arrival info if mentioned",
      "bookingSource": "Direct",
      "rooms": [
        {
          "id": "room-id-1",
          "roomType": "exact room type name e.g. 2 Bedroom Family Suite",
          "adults": number,
          "children": number,
          "notes": "any room preferences or notes"
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
- For room types: extract exactly as written (e.g. "2 Bedroom Family Suite", "Deluxe Room")
- If no room type is mentioned, use "Standard Room"
- If guest count not specified per room, distribute travelers evenly; default to 2 adults and 0 children per room when totally unknown
- Flights: a "landing" (נחיתה) = arrival flight, "departure" (המראה) = departure flight
- For transfers (vans, ferries) mentioned: put them in the hotel's notes field
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

  const summary: string = parsed.summary
    || `נמצאו ${hotels.length} מלונות ו-${flights.length} טיסות`;

  return { hotels, flights, summary };
}
