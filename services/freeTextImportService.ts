import type { HotelBooking, FlightSegment, Transport, TransportMode } from '../types';
import { generateWithFallback, analyzeTripFiles } from './aiService';
import { parseJsonLenient } from './jsonSanitizer';
import { photonGeocodeRich, getCountryBbox, toEnglishCountryName } from '../utils/geocodePlaces';
import { AIRPORT_TIMEZONES, SMALL_AIRPORT_COORDS } from '../utils/airportTimezones';

export interface FreeTextParseHints {
  destination?: string;
  startDate?: string;     // YYYY-MM-DD
  endDate?: string;       // YYYY-MM-DD
  travelers?: number;
  /** Optional list of specific cities the user picked in the wizard's
   *  TripDetailsPanel. Biases the model to find hotels/flights in these
   *  cities when the text is ambiguous (e.g. "Albania" without a city). */
  cities?: string[];
  /** Trip type — replaces or augments the per-person `travelers` count. */
  groupType?: 'family' | 'couple' | 'friends' | 'solo' | 'business' | 'group';
}

export interface FreeTextParseResult {
  hotels: HotelBooking[];
  flights: FlightSegment[];
  /**
   * Non-flight transports — trains, ferries, buses, cruises, transfers, car rentals.
   * Critical for trips outside the flight-only mental model: a Renfe AVE,
   * a Buquebus ferry, a FlixBus ticket all land here so the map polyline
   * draws the right segment and the "missing transport" detector doesn't
   * falsely flag them. Empty if the input only mentions flights.
   */
  transports: Transport[];
  summary: string;
}

const buildPrompt = (text: string, hints?: FreeTextParseHints) => {
  const hasAnyHint = hints && (hints.destination || hints.startDate || hints.endDate || hints.travelers || hints.groupType || (hints.cities && hints.cities.length > 0));
  const hintBlock = hasAnyHint
    ? `
Trip context (provided by the user in the wizard):
- destination: ${hints!.destination || 'unknown'}
- specific cities to expect: ${hints!.cities && hints!.cities.length > 0 ? hints!.cities.join(', ') : 'not specified'}
- expected start date: ${hints!.startDate || 'unknown'}
- expected end date: ${hints!.endDate || 'unknown'}
- travelers (total): ${hints!.travelers ?? 'unknown'}
- trip type: ${hints!.groupType || 'unspecified'}
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
  ],
  "transports": [
    {
      "mode": "train | bus | ferry | cruise | transfer | car_rental | drive",
      "from": "departure city or station name",
      "to": "arrival city or station name",
      "fromAddress": "optional full address — e.g. 'Atocha Station, Madrid'",
      "toAddress": "optional full address — e.g. 'Sants Station, Barcelona'",
      "date": "YYYY-MM-DD",
      "departureTime": "HH:MM or 00:00",
      "arrivalTime": "HH:MM or 00:00",
      "duration": "as written or estimated — e.g. '2h 30m'",
      "provider": "company name — Renfe / FlixBus / Buquebus / SBB / Eurostar / etc.",
      "bookingRef": "PNR or ticket number if mentioned",
      "vehicle": "train / bus / ferry / cruise vehicle identifier — e.g. 'AVE 03051', 'ICE 1234', 'M/V Atlantic'",
      "pickupPoint": "platform / pier / bay / pickup location if mentioned",
      "notes": "any other free-form info"
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

TRANSPORTS — CRITICAL (follow these exactly):
- ANY non-flight ground/water transport must produce an entry in the transports[] array. NEVER collapse a train / bus / ferry / cruise / transfer / car-rental into a hotel notes field — they belong in transports[].
- Mode mapping:
  · "train" — Renfe (AVE, AVANT, Cercanías), Eurostar, ICE, TGV, Shinkansen, Amtrak, Indian Railways, BTS/MRT/Skytrain (single ride), JR
  · "bus" — FlixBus, Greyhound, intercity coach, charter bus
  · "ferry" — Buquebus, ferry crossings, hydrofoil, jetfoil, water taxi
  · "cruise" — multi-day cruise itinerary (Royal Caribbean, MSC, Carnival, Norwegian, Disney Cruise)
  · "transfer" — airport ↔ hotel shuttle / private van / hotel pickup
  · "car_rental" — Hertz / Avis / Sixt / Europcar / Discover Cars pickup itself (not the driving)
  · "drive" — explicit self-drive segment between cities (often paired with car_rental)
- Examples to recognise:
  · "Renfe AVE 03051 ממדריד אטוצ'ה לברצלונה סנטס, 14/06 09:00→11:30" → mode: 'train', provider: 'Renfe', vehicle: 'AVE 03051'
  · "Buquebus to Colonia, 7am" → mode: 'ferry', provider: 'Buquebus'
  · "FlixBus N123 to Prague" → mode: 'bus', provider: 'FlixBus', vehicle: 'N123'
  · "Sixt rental Madrid airport, return 18/06" → mode: 'car_rental', provider: 'Sixt'
  · "Private van pickup from BKK 14:00" → mode: 'transfer'
- If a date is given as a range, create one transport per direction (outbound + return).

OTHER:
- Flights: a "landing" (נחיתה) = arrival flight, "departure" (המראה) = departure flight
- If booking / reservation / confirmation number is given, put it in the appropriate "confirmationCode" or "bookingRef" field
- Always return valid JSON, never return markdown or extra text

Trip plan text:
${text}`;
};

const extractJson = (raw: string): any => {
  // Lenient parse handles unescaped control chars / quotes inside string values
  // (common LLM corruption). See services/jsonSanitizer.ts.
  try {
    return parseJsonLenient<any>(raw).value;
  } catch {
    const match = raw?.match(/\{[\s\S]*\}/);
    if (match) return parseJsonLenient<any>(match[0]).value;
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

  // Non-flight transports (trains / ferries / buses / cruises / transfers / car rentals).
  // The AI returns a clean Transport shape; we add the missing id and the
  // sourceArrayKey marker so buildUnifiedTransports merges them correctly.
  const VALID_MODES: TransportMode[] = ['flight', 'train', 'bus', 'ferry', 'cruise', 'transfer', 'car_rental', 'drive'];
  const transports: Transport[] = (parsed.transports || [])
    .filter((t: any) => t && typeof t.mode === 'string' && VALID_MODES.includes(t.mode))
    .filter((t: any) => t.mode !== 'flight') // flights live in `flights[]`, not `transports[]`
    .map((t: any) => ({
      id: `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      mode: t.mode as TransportMode,
      from: t.from || '',
      to: t.to || '',
      fromAddress: t.fromAddress || undefined,
      toAddress: t.toAddress || undefined,
      date: t.date || '',
      departureTime: t.departureTime || '',
      arrivalTime: t.arrivalTime || '',
      duration: t.duration || '',
      provider: t.provider || '',
      bookingRef: t.bookingRef || '',
      vehicle: t.vehicle || '',
      pickupPoint: t.pickupPoint || '',
      notes: t.notes || '',
      sourceArrayKey: 'transports',
    }));

  // Validation: if NOTHING came back, the AI either misunderstood the input
  // or the user typed something too vague. Surface this instead of silently
  // creating an empty trip.
  if (hotels.length === 0 && flights.length === 0 && transports.length === 0) {
    throw new Error('לא נמצאו מלונות, טיסות או העברות בטקסט. נסי להוסיף פרטים ספציפיים יותר (תאריכים, שמות מלונות, קודי טיסה).');
  }

  const summary: string = parsed.summary
    || `נמצאו ${hotels.length} מלונות, ${flights.length} טיסות ו-${transports.length} העברות`;

  // Auto-enrich extracted entities with real coordinates. Without this,
  // hotels land in the trip with no lat/lng → map shows nothing for them
  // → user has to manually run "verify all locations" after creation.
  // User explicitly asked 2026-05-24: "this should be part of the trip
  // creation process". So: parallel-Photon every hotel + airport here.
  const countryHint = hints?.destination || (parsed.destination as string | undefined) || '';
  await enrichExtractedData({ hotels, flights, transports }, countryHint);

  return { hotels, flights, transports, summary };
}

/**
 * Enrich extracted entities with real coordinates. For hotels: Photon
 * geocoding with country bbox bias. For flights: IATA code lookup against
 * our hand-curated airport tables. Mutates the inputs in place; returns
 * stats for logging. Failures don't throw — the trip still gets created
 * even if geocoding is degraded, and the user can fix individual items
 * later via the DataHealthPanel verify-all button.
 */
async function enrichExtractedData(
  data: { hotels: HotelBooking[]; flights: FlightSegment[]; transports: Transport[] },
  countryHint: string,
): Promise<{ hotelsResolved: number; airportsResolved: number }> {
  const countryEn = toEnglishCountryName(countryHint || '');
  const bbox = countryEn ? getCountryBbox(countryEn) : null;

  // Hotels — parallel Photon. Skip ones the AI already returned with
  // lat/lng. Country bbox bias prevents Photon from matching a same-named
  // place in another country.
  const hotelTasks = data.hotels.map(async h => {
    if (typeof h.lat === 'number' && typeof h.lng === 'number') return false;
    const query = [h.name, h.address, h.city, countryEn].filter(Boolean).join(', ');
    if (!query) return false;
    try {
      const feat = await photonGeocodeRich(query, bbox || undefined);
      if (feat) {
        h.lat = feat.lat;
        h.lng = feat.lng;
        if (!h.city && feat.city) h.city = feat.city;
        return true;
      }
    } catch {
      /* network failure — leave hotel without coords; DataHealthPanel can retry */
    }
    return false;
  });

  // Flights — IATA code → hardcoded airport coords lookup. Free, no network.
  let airportsResolved = 0;
  data.flights.forEach(f => {
    const fromUp = (f.fromCode || '').toUpperCase();
    const toUp = (f.toCode || '').toUpperCase();
    if (fromUp && SMALL_AIRPORT_COORDS[fromUp]) airportsResolved++;
    if (toUp && SMALL_AIRPORT_COORDS[toUp]) airportsResolved++;
    // Timezone tagging lets FlightCard compute TZ-aware durations correctly
    // even when the AI returned wall-clock times only. Done at extraction
    // time so the trip is born with the right data.
    if (fromUp && AIRPORT_TIMEZONES[fromUp]) (f as any).fromTimezone = AIRPORT_TIMEZONES[fromUp];
    if (toUp && AIRPORT_TIMEZONES[toUp]) (f as any).toTimezone = AIRPORT_TIMEZONES[toUp];
  });

  const hotelResults = await Promise.all(hotelTasks);
  const hotelsResolved = hotelResults.filter(Boolean).length;

  console.info(`🧭 [trip-create] enriched ${hotelsResolved}/${data.hotels.length} hotels via Photon, ` +
    `${airportsResolved}/${data.flights.length * 2} airports via IATA table (country hint: "${countryEn || '?'}").`);

  return { hotelsResolved, airportsResolved };
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

  // Route the analyzer's transport entries by mode: flights stay in flights[],
  // everything else lands in transports[] with the proper Transport shape.
  const allTransport = (raw?.categories?.transport || []) as any[];
  const flights: FlightSegment[] = allTransport
    .filter(t => !t?.data?.mode || t.data.mode === 'flight' || t?.data?.flightNumber || t?.data?.airline)
    .map((t: any) => ({
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

  const NON_FLIGHT_MODES = new Set<TransportMode>(['train', 'bus', 'ferry', 'cruise', 'transfer', 'car_rental', 'drive']);
  const transports: Transport[] = allTransport
    .filter(t => t?.data?.mode && NON_FLIGHT_MODES.has(t.data.mode as TransportMode))
    .map((t: any) => ({
      id: `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      mode: t.data.mode as TransportMode,
      from: t.data.departure?.city || t.data.departure?.station || '',
      to: t.data.arrival?.city || t.data.arrival?.station || '',
      fromAddress: t.data.departure?.address || undefined,
      toAddress: t.data.arrival?.address || undefined,
      date: t.data.departure?.isoDate || '',
      departureTime: t.data.departure?.displayTime || '',
      arrivalTime: t.data.arrival?.displayTime || '',
      duration: t.data.duration || '',
      provider: t.data.provider || t.data.operator || '',
      bookingRef: t.data.bookingId || t.data.bookingRef || '',
      vehicle: t.data.vehicle || t.data.trainNumber || t.data.busNumber || '',
      pickupPoint: t.data.pickupPoint || '',
      notes: t.data.notes || '',
      sourceArrayKey: 'transports',
    }));

  return {
    hotels,
    flights,
    transports,
    summary: `מקבצים: ${hotels.length} מלונות, ${flights.length} טיסות ו-${transports.length} העברות`,
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

  // Merge transports — dedupe by (mode, date, from→to). Two trains on the
  // same day with the same endpoints are considered the same booking.
  const norm = (s?: string) => (s || '').trim().toLowerCase();
  const transports = [...(existing.transports || [])];
  for (const inc of (incoming.transports || [])) {
    const dup = transports.find(t =>
      t.mode === inc.mode
      && (t.date || '') === (inc.date || '')
      && norm(t.from) === norm(inc.from)
      && norm(t.to) === norm(inc.to)
    );
    if (!dup) transports.push(inc);
  }

  return {
    hotels,
    flights,
    transports,
    summary: `סה"כ ${hotels.length} מלונות, ${flights.length} טיסות ו-${transports.length} העברות`,
  };
}
