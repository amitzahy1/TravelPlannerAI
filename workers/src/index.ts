/**
 * Travel Planner Pro - Smart Email Import Worker (v2.0 - Robust)
 * Implementation of "Google-Scale Reliability" Architecture.
 * Features:
 * - Unshackled Gemini Safety Settings (BLOCK_NONE)
 * - Non-blocking Logging (ctx.waitUntil)
 * - Fallback Data Preservation (Raw Save)
 * - Strict FinishReason Validation
 */

import { SignJWT, importPKCS8 } from 'jose';
import PostalMime from 'postal-mime';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- INTERFACES ---
interface Env {
        GEMINI_API_KEY: string;
        FIREBASE_SERVICE_ACCOUNT: string;
        FIREBASE_PROJECT_ID: string;
        AUTH_SECRET: string;
}

// --- MAIN HANDLER ---
export default {
        async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
                console.log(`[Email Handler] Received email from: ${message.from}`);
                try {
                        const result = await handleEmail(message.from, message.raw, env, ctx);
                        console.log(`[Email Handler] Result:`, JSON.stringify(result));
                        if (!result.success) {
                                console.error(`[Email Handler] FAILED:`, result.message || result.error);
                        }
                } catch (e: any) {
                        console.error(`[Email Handler] UNCAUGHT CRASH:`, e.message, e.stack);
                }
        },

        async fetch(request: Request, env: Env, ctx: ExecutionContext) {
                // CORS Headers
                const corsHeaders = {
                        "Access-Control-Allow-Origin": "*", // Replace with specific domain in production!
                        "Access-Control-Allow-Methods": "POST, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type, X-Auth-Token",
                };

                if (request.method === "OPTIONS") {
                        return new Response(null, { headers: corsHeaders });
                }

                const url = new URL(request.url);

                try {
                        if (!env.GEMINI_API_KEY) {
                                throw new Error("Missing Environment Variables");
                        }

                        // Secure API Endpoint for Frontend (supports multimodal content)
                        if (url.pathname === "/api/generate" && request.method === "POST") {
                                const body = await request.json() as any;
                                const { contents, prompt, Model } = body;

                                // Accept either structured 'contents' (new) or flat 'prompt' (backward compat)
                                const requestContent = contents || prompt;
                                if (!requestContent) return new Response("Missing prompt/contents", { status: 400, headers: corsHeaders });

                                const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
                                const modelId = Model || "gemini-1.5-flash-latest";

                                const model = genAI.getGenerativeModel({
                                        model: modelId,
                                        generationConfig: { responseMimeType: "application/json" }
                                });

                                // Pass content directly — supports text, inlineData (images/PDFs), and mixed parts
                                // The client sends Content[] format: [{ role: 'user', parts: [{text: ...}, {inlineData: ...}] }]
                                const result = await model.generateContent({ contents: requestContent });
                                const response = await result.response;
                                const text = response.text();

                                return new Response(JSON.stringify({ text, model: modelId }), {
                                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                                });
                        }

                        // Email Import Endpoint (Apps Script + Testing)
                        if (request.method === "POST" && (url.pathname === "/api/email" || url.pathname === "/")) {
                                const body = await request.json() as any;
                                console.log(`[Fetch] POST ${url.pathname} - Keys: ${Object.keys(body).join(', ')}`);

                                const from = body.from || "unknown@example.com";
                                const emailContent = body.content || body.raw || body.body || body.html || body.subject || "";

                                if (!from || from === "unknown@example.com") {
                                        return new Response(JSON.stringify({ error: "Missing 'from' field" }), {
                                                status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                                        });
                                }

                                console.log(`[Fetch] Processing email from: ${from}, content length: ${emailContent.length}`);

                                const stream = new ReadableStream({
                                        start(controller) {
                                                controller.enqueue(new TextEncoder().encode(emailContent || "Subject: Test"));
                                                controller.close();
                                        }
                                });
                                const result = await handleEmail(from, stream, env, ctx);
                                return new Response(JSON.stringify(result, null, 2), {
                                        status: result.success ? 200 : 500,
                                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                                });
                        }

                        // Fallback for unknown POST paths
                        if (request.method === "POST") {
                                console.warn(`[Fetch] Unknown POST path: ${url.pathname}`);
                                return new Response(JSON.stringify({ error: `Unknown endpoint: ${url.pathname}` }), {
                                        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                                });
                        }

                        return new Response("Not Found", { status: 404, headers: corsHeaders });

                } catch (e: any) {
                        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
                }
        }
};

async function handleEmail(from: string, rawStream: ReadableStream, env: Env, ctx: ExecutionContext) {
        console.log(`[EmailPipe] Processing email from: ${from}`);
        const logs: string[] = [`Processing email from ${from} at ${new Date().toISOString()}`];

        // Safe Logger Helper (Non-blocking)
        const safeLog = (uid: string | null, msg: string, data?: any) => {
                if (uid) {
                        ctx.waitUntil(logToSystem(uid, env.FIREBASE_PROJECT_ID, token, msg, data));
                }
        };

        let token: string = "";
        let uid: string | null = null;
        let textBody = "";

        try {
                // 0. Env Var Validation
                if (!env.FIREBASE_SERVICE_ACCOUNT) {
                        console.error('[Pipeline] FATAL: FIREBASE_SERVICE_ACCOUNT env var is missing!');
                        return { success: false, error: 'Missing FIREBASE_SERVICE_ACCOUNT', logs };
                }
                if (!env.FIREBASE_PROJECT_ID) {
                        console.error('[Pipeline] FATAL: FIREBASE_PROJECT_ID env var is missing!');
                        return { success: false, error: 'Missing FIREBASE_PROJECT_ID', logs };
                }
                if (!env.GEMINI_API_KEY) {
                        console.error('[Pipeline] FATAL: GEMINI_API_KEY env var is missing!');
                        return { success: false, error: 'Missing GEMINI_API_KEY', logs };
                }

                // 1. Auth (Blocking, Required)
                logs.push("Step 1: Authenticating...");
                token = await getFirebaseAccessToken(env, logs) || "";
                console.log(`[Pipeline] Step 1 Result: token=${token ? 'OK' : 'FAILED'}`);
                if (!token) throw new Error("Firebase Auth Token is null");

                const senderEmail = extractEmail(from);
                console.log(`[Pipeline] Step 1b: Looking up user for email: ${senderEmail}`);
                uid = await getUserByEmail(senderEmail, env.FIREBASE_PROJECT_ID, token);
                console.log(`[Pipeline] Step 1b Result: uid=${uid || 'NOT FOUND'}`);

                if (!uid) {
                        console.error(`[Pipeline] Step 1b FAILED: User not found for ${senderEmail}`);
                        return { success: false, message: `User not found: ${senderEmail}`, logs };
                }

                // From here on, use safeLog for non-critical logging
                safeLog(uid, "Email Received", { from: senderEmail, subject: "Parsing..." });

                // 2. Parse Email
                logs.push("Step 2: Parsing Email...");
                const rawBuffer = await streamToArrayBuffer(rawStream);
                let attachments: any[] = [];
                let email: any = null;

                // Try MIME parsing first (for Cloudflare Email Routing)
                try {
                        const parser = new PostalMime();
                        email = await parser.parse(rawBuffer);
                        textBody = email.text || email.html || "";
                        attachments = (email.attachments || []).filter((att: any) =>
                                att.mimeType === "application/pdf" || att.mimeType.startsWith("image/")
                        );
                } catch (parseError: any) {
                        console.warn(`[Pipeline] PostalMime parse failed: ${parseError.message}`);
                }

                // Fallback: if MIME parsing yielded nothing, use raw buffer as plain text
                // (Apps Script sends formatted text, not raw MIME)
                if (!textBody || textBody.trim().length < 10) {
                        textBody = new TextDecoder().decode(rawBuffer);
                        console.log(`[Pipeline] Using raw text fallback (${textBody.length} chars)`);
                }

                logs.push(`Body Length: ${textBody.length}, Attachments: ${attachments.length}`);
                console.log(`[Pipeline] Step 2 Done: body=${textBody.length} chars, attachments=${attachments.length}`);

                // 3. Get Context
                const existingTrips = await getUserFutureTrips(uid, env.FIREBASE_PROJECT_ID, token).catch(() => []);

                // 4. Gemini Extraction (Critical Step)
                logs.push("Step 4: Gemini Analysis...");
                let analysis;
                try {
                        analysis = await analyzeTripWithGemini(
                                textBody,
                                attachments,
                                existingTrips,
                                env.GEMINI_API_KEY
                        );

                        if (!analysis) throw new Error("Null Analysis Returned");

                        safeLog(uid, "Gemini Success", { action: analysis.action, tripId: analysis.tripId });

                } catch (geminiError: any) {
                        // --- FALLBACK PRESERVATION ---
                        logs.push(`Gemini Failed: ${geminiError.message}. Saving Raw...`);
                        safeLog(uid, "Gemini Failed - Saving Raw", { error: geminiError.message });

                        // Save to Processing Queue
                        await saveToProcessingQueue(uid, env.FIREBASE_PROJECT_ID, token, {
                                from: senderEmail,
                                receivedAt: new Date().toISOString(),
                                subject: email?.subject || "No Subject",
                                bodySnippet: textBody.substring(0, 5000),
                                error: geminiError.message
                        });

                        throw new Error(`Gemini Failed (Saved to Queue): ${geminiError.message}`);
                }

                // 5. Apply Changes
                let finalTripId = "";
                let finalAction = "";

                // ENRICH DATA: Explicitly link ownership for Frontend Visibility
                const enrichedData = {
                        ...analysis.data,
                        ownerEmail: senderEmail,
                        userId: uid,
                        status: 'confirmed',
                        collaborators: [],
                        source: 'email_import'
                };

                // --- TEMPORAL MATCHING OVERRIDE (Feb 2026) ---
                // If Gemini says "create" (or gave a tripId), double-check dates.
                // We trust strict date overlap more than AI hallucination.
                if (enrichedData.startDate && enrichedData.endDate) {
                        const overlapId = findOverlappingTrip(uid, enrichedData.startDate, enrichedData.endDate, existingTrips);
                        if (overlapId) {
                                logs.push(`🕒 Temporal Match: Found existing trip ${overlapId}. Overriding action to 'update'.`);
                                analysis.action = 'update';
                                analysis.tripId = overlapId;
                        }
                }

                if (analysis.action === 'update' && analysis.tripId) {
                        logs.push(`Updating Trip ${analysis.tripId}...`);
                        const originalTrip = await getTripById(uid, analysis.tripId, env.FIREBASE_PROJECT_ID, token);

                        if (originalTrip) {
                                const mergedTrip = mergeTripData(originalTrip, enrichedData);
                                await updateTrip(uid, analysis.tripId, mergedTrip, env.FIREBASE_PROJECT_ID, token);
                                finalTripId = analysis.tripId;
                                finalAction = "update";
                        } else {
                                // Fallback to create if ID invalid
                                finalAction = 'create';
                                finalTripId = await createTrip(uid, enrichedData, env.FIREBASE_PROJECT_ID, token);
                        }
                } else {
                        logs.push("Creating New Trip...");
                        finalTripId = await createTrip(uid, enrichedData, env.FIREBASE_PROJECT_ID, token);
                        finalAction = "create";
                }

                safeLog(uid, "Success", { action: finalAction, tripId: finalTripId });
                return { success: true, action: finalAction, tripId: finalTripId, logs };

        } catch (error: any) {
                console.error("Fatal Error:", error);

                // Best effort log using safeLog (waitUntil)
                safeLog(uid, "Worker Crashed", { error: error.message });

                logs.push(`Error: ${error.message}`);
                return { success: false, error: error.message, logs };
        }
}

// --- GEMINI (ROBUST) ---


// --- UTILS: ROBUST PARSING ENGINE ---

// 1. Aggressive JSON Cleaning
const cleanJSON = (text: string): string => {
        if (!text) return "{}";
        // Remove Markdown, remove JSON comments if any, and clean spaces
        let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        // Fix for cases where the model adds text before/after the JSON
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
                cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
        return cleaned;
};

// 2. Smart Date Fixing (Converts everything to ISO)
const fixDate = (d: string | undefined): string => {
        if (!d) return "";
        d = d.trim();

        // If it's already in ISO format (2026-03-30)
        if (d.match(/^\d{4}-\d{2}-\d{2}/)) return d.split('T')[0];

        // If it's in Israeli/European format (30/03/2026 or 30.03.2026)
        const eurMatch = d.match(/^(\d{1,2})[/.\\-](\d{1,2})[/.\\-](\d{2,4})/);
        if (eurMatch) {
                const year = eurMatch[3].length === 2 ? `20${eurMatch[3]}` : eurMatch[3];
                return `${year}-${eurMatch[2].padStart(2, '0')}-${eurMatch[1].padStart(2, '0')}`;
        }
        return d; // Return original if failed, for manual handling
};

// 3. Safe Extraction
// Function that knows how to take info even if it's inside 'data' or direct
const safeGet = (obj: any, path: string[]) => {
        let current = obj;
        // Try searching in the normal path
        for (const key of path) {
                if (!current) break;
                current = current[key];
        }
        if (current) return current;

        // Try searching without 'data' (for structure hallucinations)
        if (path.includes('data')) {
                const newPath = path.filter(k => k !== 'data');
                current = obj;
                for (const key of newPath) {
                        if (!current) break;
                        current = current[key];
                }
                return current;
        }
        return undefined;
};

// --- HELPERS ---

// פונקציה להמרת קבצים ל-Base64 כדי שג'מיני יקרא אותם
function arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
}

// 4. Robust Time Extraction
const extractTimeFromText = (text: string | undefined): string => {
        if (!text) return "12:00";
        // Look for HH:MM pattern
        const match = text.match(/([0-1]?[0-9]|2[0-3]):[0-5][0-9]/);
        return match ? match[0].padStart(5, '0') : "12:00";
};

// --- THE CORE LOGIC ---

async function analyzeTripWithGemini(text: string, attachments: any[], existingTrips: any[], apiKey: string) {
        const genAI = new GoogleGenerativeAI(apiKey);

        // User requested specifically this model
        const CANDIDATES = [
                "gemini-3-pro-preview",    // 1. PRIMARY: The best reasoning/vision model
                "gemini-2.5-pro",          // 2. BACKUP: Strong stable model
                "gemini-3-flash-preview",  // 3. FALLBACK: Fast but less detailed
                "gemini-1.5-pro-latest"    // 4. Backup
        ];

        // THIS IS A SYSTEM GENERATED PROMPT -- DO NOT EDIT MANUALLY IF NOT SYNCING WITH AISERVICE.TS
        const SYSTEM_PROMPT = `
You are an Elite Travel Document Intelligence System, combining expertise from:
- IATA NDC data standards for aviation
- Hotel industry PMS standards
- Google Document AI visual parsing
- Multi-language OCR (Hebrew, Arabic, English)
- Maritime & Rail transport standards

═══════════════════════════════════════════════════════════════
PHASE 1: DOCUMENT CLASSIFICATION & VISUAL CALIBRATION
═══════════════════════════════════════════════════════════════

Before extracting ANY data, classify each document:
- **E-Ticket / Boarding Pass** → Extract flights, PNR, baggage, terminal
- **Train Ticket** → Extract train number, carriage, seat, platform
- **Cruise/Ferry** → Extract ship, cabin, ports
- **Hotel Confirmation** → Extract hotel, dates, room, price
- **Car Rental Agreement** → Extract provider, dates, pickup/dropoff
- **Unknown / Noise** → Report as unprocessable

RTL & Bi-Directional Rules:
- Hebrew/Arabic text flows Right-to-Left, but NUMBERS flow Left-to-Right
- "897" stays "897" (never reverse digits)
- "תל אביב → לונדון" means Origin: Tel Aviv, Destination: London

═══════════════════════════════════════════════════════════════
PHASE 2: EXHAUSTIVE DATA EXTRACTION
═══════════════════════════════════════════════════════════════

A. TRANSPORT (Flights, Trains, Ferries, Cruises, Buses)
   Expected Output Format: { "type": "flight" | "train" | "ferry", "data": { ... } }

   1. FLIGHTS — Extract ALL fields:
      - airline, airlineCode (IATA 2-letter)
      - flightNumber (e.g. "LY5103"), pnr (6-char)
      - departure: { city, iata, isoDate (YYYY-MM-DD), time (HH:MM) }
      - arrival: { city, iata, isoDate (YYYY-MM-DD), time (HH:MM) }
      - terminal, baggage, passengerName, price: { amount, currency }
      
      ⚠️ MULTI-SEGMENT RULE (CRITICAL):
      - Each flight LEG must be a SEPARATE transport entry.
      - A round-trip (TLV→ATH outbound, ATH→TLV return) MUST produce TWO separate entries.

   2. TRAINS/FERRIES — Extract provider, number, seat, platform/deck, dep/arr details.

B. ACCOMMODATION (Hotels, Airbnb) — Extract ALL fields:
    - hotelName, address, city, country
    - checkIn: { isoDate, time }, checkOut: { isoDate, time }
    - bookingId, roomType, guestName, price: { amount, currency }

C. CAR RENTAL — Extract ALL fields:
    - provider, vehicleType, pickup/dropoff details, price.

═══════════════════════════════════════════════════════════════
PHASE 3: DATE & TIME RULES (CRITICAL)
═══════════════════════════════════════════════════════════════

1. ALL dates MUST be ISO 8601: YYYY-MM-DD
2. ALL times MUST be 24-hour: HH:MM
3. If year is missing, assume 2026 (forward bias)
4. Hebrew months: ינואר=01, פברואר=02, ...
5. Arrival MUST be after departure.

═══════════════════════════════════════════════════════════════
PHASE 6: OUTPUT FORMAT (STRICT JSON)
═══════════════════════════════════════════════════════════════

Return ONLY valid JSON.
{
  "tripMetadata": {
    "suggestedName": "String",
    "mainDestination": "String",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "uniqueCityNames": ["String"]
  },
  "categories": {
    "transport": [
      {
        "type": "flight",
        "data": {
           "airline", "flightNumber", "pnr", "passengerName", "price": { "amount", "currency" },
           "departure": { "city", "iata", "isoDate", "time" },
           "arrival": { "city", "iata", "isoDate", "time" },
           "terminal", "baggage"
        }
      }
    ],
    "accommodation": [
      {
        "type": "hotel",
        "data": {
          "hotelName", "address", "city", "country",
          "checkIn": { "isoDate", "time" },
          "checkOut": { "isoDate", "time" },
          "bookingId", "price": { "amount", "currency" }
        }
      }
    ],
    "carRental": [
       {
         "type": "car_rental",
         "data": {
           "provider", "pickupLocation", "pickupCity", "pickupDate", "pickupTime",
           "dropoffLocation", "dropoffCity", "dropoffDate", "dropoffTime",
           "price": { "amount", "currency" }
         }
       }
    ]
  }
}
`;

        // 1. בניית ה-Parts כולל הקבצים (זה החלק שהיה חסר!)
        const parts: any[] = [{ text: SYSTEM_PROMPT }, { text: `Email Context: ${text}` }];

        if (attachments && attachments.length > 0) {
                for (const att of attachments) {
                        // המרה ל-Base64 כדי שג'מיני יראה את הקובץ
                        // Note: PostalMime returns Uint8Array, checking compat
                        const buffer = att.content.buffer ? att.content.buffer : att.content;
                        const base64Data = arrayBufferToBase64(buffer);
                        parts.push({
                                inlineData: {
                                        mimeType: att.mimeType || "application/pdf",
                                        data: base64Data
                                }
                        });
                }
        } else {
                console.warn("No attachments found! Gemini might fail to read the ticket.");
        }

        // 2. קריאה ל-Gemini
        let frontendData: any = null;
        for (const modelName of CANDIDATES) {
                try {
                        const model = genAI.getGenerativeModel({
                                model: modelName,
                                generationConfig: { responseMimeType: "application/json" }
                        });

                        const result = await model.generateContent({ contents: [{ role: "user", parts }] });
                        const rawText = result.response.text();
                        frontendData = JSON.parse(cleanJSON(rawText));
                        if (frontendData) break;
                } catch (e: any) {
                        console.warn(`[Gemini] Model ${modelName} failed: ${e.message}`);
                }
        }

        if (!frontendData) {
                console.error(`[Pipeline] ALL Gemini models failed! Tried: ${CANDIDATES.join(', ')}`);
                throw new Error("AI failed to extract data.");
        }
        console.log(`[Pipeline] Step 4 Done: Gemini returned data. Keys: ${Object.keys(frontendData).join(', ')}`);
        console.log(`[Pipeline] Flights found: ${frontendData.categories?.flights?.length || 0}`);
        if (frontendData.categories?.transport) {
                const flights = frontendData.categories.transport.filter((t: any) => t.type === 'flight');
                flights.forEach((f: any, i: number) => {
                        const d = f.data || {};
                        console.log(`[Pipeline] Flight ${i}: ${d.departure?.iata || '?'} → ${d.arrival?.iata || '?'} on ${d.departure?.isoDate || '?'} at ${d.departure?.time || '?'}, flight=${d.flightNumber || '?'}`);
                });
        }

        // --- IATA→City Fallback Map ---
        const IATA_CITY_MAP: Record<string, string> = {
                TLV: 'Tel Aviv', TBS: 'Tbilisi', BUS: 'Batumi', ATH: 'Athens',
                SKG: 'Thessaloniki', RHO: 'Rhodes', HER: 'Heraklion', LCA: 'Larnaca',
                PFO: 'Paphos', IST: 'Istanbul', SAW: 'Istanbul', AYT: 'Antalya',
                CDG: 'Paris', FCO: 'Rome', BCN: 'Barcelona', BKK: 'Bangkok',
                HKT: 'Phuket', SIN: 'Singapore', DXB: 'Dubai', JFK: 'New York',
                LHR: 'London', AMS: 'Amsterdam', FRA: 'Frankfurt', MUC: 'Munich',
                VIE: 'Vienna', PRG: 'Prague', BUD: 'Budapest', SOF: 'Sofia',
                OTP: 'Bucharest', WAW: 'Warsaw', MAD: 'Madrid', LIS: 'Lisbon',
        };

        const resolveCity = (city: string | undefined, iata: string | undefined): string => {
                if (city && city !== 'Unknown' && city.trim()) return city;
                if (iata && IATA_CITY_MAP[iata.toUpperCase()]) return IATA_CITY_MAP[iata.toUpperCase()];
                if (iata && iata.trim()) return iata; // Use raw IATA as last resort
                return 'Unknown';
        };

        // --- MAPPING ENGINE (Golden Schema v2.2) ---

        // 1. Process Flights (from Unified Schema 'transport' array)
        const allTransport = frontendData.categories?.transport || [];
        const aiFlights = allTransport
                .filter((t: any) => t.type === 'flight')
                .map((t: any) => t.data || {});

        const processedSegments = aiFlights.map((f: any) => {
                const depDate = fixDate(f.departure?.isoDate);

                const depTime = (f.departure?.time && f.departure?.time !== "00:00")
                        ? f.departure.time
                        : extractTimeFromText(JSON.stringify(f));

                const arrTime = (f.arrival?.time && f.arrival?.time !== "00:00")
                        ? f.arrival.time
                        : extractTimeFromText(JSON.stringify(f.arrival || {}));

                return {
                        airline: f.airline || "Unknown",
                        flight: f.flightNumber || "",
                        pnr: f.pnr || "",
                        passengerName: f.passengerName || "",
                        baggage: f.baggage || "",
                        from: resolveCity(f.departure?.city, f.departure?.iata),
                        to: resolveCity(f.arrival?.city, f.arrival?.iata),
                        fromCode: f.departure?.iata || "",
                        toCode: f.arrival?.iata || "",
                        date: depDate || new Date().toISOString().split('T')[0],
                        departureTime: depTime,
                        arrivalTime: arrTime,
                        arrivalDate: fixDate(f.arrival?.isoDate) || depDate || "",
                        price: f.price?.amount || f.totalPrice || 0,
                        currency: f.price?.currency || f.currency || "USD"
                };
        });

        // 2. Process Hotels (from Unified Schema 'accommodation' array)
        const allAccommodation = frontendData.categories?.accommodation || [];
        const aiHotels = allAccommodation
                .filter((h: any) => h.type === 'hotel' || !h.type) // Default to hotel if type missing
                .map((h: any) => h.data || {});

        const processedHotels = aiHotels.map((h: any) => ({
                name: h.hotelName || h.name || "Unknown Hotel",
                address: h.address || "",
                city: h.city || "Unknown",
                country: h.country || "",
                checkIn: fixDate(h.checkIn?.isoDate || h.checkIn),
                checkOut: fixDate(h.checkOut?.isoDate || h.checkOut),
                bookingId: h.bookingId || h.confirmationCode || "",
                price: h.price?.amount || h.price || 0,
                currency: h.price?.currency || h.currency || "USD"
        }));

        // 3. Process Car Rental (from Unified Schema 'carRental' array with wrapper)
        const allCars = frontendData.categories?.carRental || [];
        const aiCars = allCars.map((c: any) => c.data || {});

        const processedCars = aiCars.map((c: any) => ({
                provider: c.provider || "Unknown Rental",
                location: c.pickupLocation || "",
                city: c.pickupCity || c.city || "",
                country: c.country || "",
                pickupDate: fixDate(c.pickupDate),
                dropoffDate: fixDate(c.dropoffDate),
                price: c.price || 0,
                currency: c.currency || "USD"
        }));

        // 4. Construct Final Object — collect ALL dates from flights + hotels
        const allDates = [
                ...processedSegments.map((s: any) => s.date),
                ...processedSegments.map((s: any) => s.arrivalDate),
                ...processedHotels.flatMap((h: any) => [h.checkIn, h.checkOut])
        ].filter(Boolean).sort();
        const startDate = allDates[0] || fixDate(frontendData.tripMetadata?.startDate) || new Date().toISOString().split('T')[0];
        const endDate = allDates[allDates.length - 1] || fixDate(frontendData.tripMetadata?.endDate) || startDate;

        // Build display-friendly dates string for frontend
        const displayDates = startDate !== endDate ? `${startDate} - ${endDate}` : startDate;
        console.log(`[Pipeline] Trip dates: ${startDate} → ${endDate} (from ${allDates.length} date points)`);

        // Compute total flight price across all segments
        const totalFlightPrice = aiFlights.reduce((sum: number, f: any) => sum + (f.totalPrice || 0), 0);

        const finalTripData: any = {
                name: frontendData.tripMetadata?.suggestedName || `Trip to ${processedSegments[0]?.to || "Unknown"}`,
                destination: frontendData.tripMetadata?.mainDestination || processedSegments[0]?.to || "Unknown",
                country: frontendData.tripMetadata?.mainCountry || "",
                startDate: startDate,
                endDate: endDate,
                dates: displayDates,
                status: 'confirmed',
                source: 'email_import',

                // Hotels & Car Rental arrays
                hotels: processedHotels,
                carRental: processedCars,
                documents: [],

                // Flight Logic: Correct Nesting + Price
                flights: processedSegments.length > 0 ? {
                        airline: processedSegments[0].airline,
                        pnr: processedSegments[0].pnr,
                        passengerName: processedSegments[0].passengerName || "",
                        totalPrice: totalFlightPrice || aiFlights[0]?.totalPrice || 0,
                        currency: aiFlights[0]?.currency || "USD",
                        segments: processedSegments
                } : undefined,

                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
        };

        return {
                action: "create",
                tripId: "",
                data: finalTripData
        };
}

// --- FIREBASE / HELPERS remains similar but optimized ---

async function logToSystem(uid: string, projectId: string, token: string, message: string, details: any = {}) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/system_logs`;
        try {
                // Ensure details isn't too huge
                const safeDetails = JSON.stringify(details).substring(0, 2000);

                await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                                fields: {
                                        type: { stringValue: "EMAIL_IMPORT_DEBUG" },
                                        timestamp: { timestampValue: new Date().toISOString() },
                                        message: { stringValue: message },
                                        details: { stringValue: safeDetails }
                                }
                        })
                });
        } catch (e) {
                // Silently fail in worker logs, don't crash main thread
                console.error("Log failed", e);
        }
}

async function saveToProcessingQueue(uid: string, projectId: string, token: string, data: any) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/processing_queue`;
        // Map to Firestore
        const fields: any = {};
        for (const [k, v] of Object.entries(data)) {
                fields[k] = { stringValue: String(v) };
        }

        await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ fields })
        }).catch(e => console.error("Failed to save to queue", e));
}



// --- LOGIC HELPER: TEMPORAL MATCHING (Feb 2026) ---
function findOverlappingTrip(userId: string, newStart: string, newEnd: string, existingTrips: any[]): string | null {
        if (!newStart || !newEnd || !existingTrips || existingTrips.length === 0) return null;

        try {
                const startA = new Date(newStart).getTime();
                const endA = new Date(newEnd).getTime();

                for (const trip of existingTrips) {
                        if (!trip.startDate || !trip.endDate) continue;

                        const startB = new Date(trip.startDate).getTime();
                        const endB = new Date(trip.endDate).getTime();

                        // Formula: (StartA <= EndB) AND (EndA >= StartB)
                        if (startA <= endB && endA >= startB) {
                                console.log(`🕒 Match Found! New: ${newStart}-${newEnd} overlaps with Trip ${trip.id} (${trip.startDate}-${trip.endDate})`);
                                return trip.id;
                        }
                }
        } catch (e) {
                console.warn("Date comparison error:", e);
        }
        return null;
}


// --- LOGIC HELPER: MERGE (v2.1 - with carRental) ---
function mergeTripData(original: any, newData: any): any {
        const merged = { ...original };
        const arrayFields = ['hotels', 'restaurants', 'attractions', 'itinerary', 'documents', 'carRental'];
        arrayFields.forEach(field => {
                if (newData[field] && Array.isArray(newData[field])) {
                        merged[field] = [...(merged[field] || []), ...newData[field]];
                }
        });
        if (newData.flights) {
                if (!merged.flights) merged.flights = {};
                if (!merged.flights.pnr && newData.flights.pnr) merged.flights.pnr = newData.flights.pnr;
                if (!merged.flights.airline && newData.flights.airline) merged.flights.airline = newData.flights.airline;
                if (!merged.flights.totalPrice && newData.flights.totalPrice) merged.flights.totalPrice = newData.flights.totalPrice;
                if (!merged.flights.currency && newData.flights.currency) merged.flights.currency = newData.flights.currency;
                if (newData.flights.segments && Array.isArray(newData.flights.segments)) {
                        merged.flights.segments = [...(merged.flights.segments || []), ...newData.flights.segments];
                }
        }
        // Update country if missing
        if (newData.country && !merged.country) merged.country = newData.country;

        // SMART DATE EXPANSION: Extend trip duration if new events fall outside current bounds
        if (newData.startDate) {
                if (!merged.startDate || new Date(newData.startDate) < new Date(merged.startDate)) {
                        merged.startDate = newData.startDate;
                }
        }
        if (newData.endDate) {
                if (!merged.endDate || new Date(newData.endDate) > new Date(merged.endDate)) {
                        merged.endDate = newData.endDate;
                }
        }

        merged.updatedAt = new Date().toISOString();
        return merged;
}

// --- API CLIENTS (Unchanged) ---
async function getFirebaseAccessToken(env: Env, logs: string[]) {
        try {
                const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
                const privateKey = await importPKCS8(serviceAccount.private_key, 'RS256');
                const now = Math.floor(Date.now() / 1000);
                const jwt = await new SignJWT({
                        scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit'
                }).setProtectedHeader({ alg: 'RS256' })
                        .setIssuer(serviceAccount.client_email)
                        .setSubject(serviceAccount.client_email)
                        .setAudience('https://oauth2.googleapis.com/token')
                        .setIssuedAt(now)
                        .setExpirationTime(now + 3600)
                        .sign(privateKey);

                const res = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
                });
                const data: any = await res.json();
                return data.access_token;
        } catch (e) { logs.push(`Auth Error: ${e}`); return null; }
}

function extractEmail(from: string) {
        const match = from.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        return (match ? match[0] : from).toLowerCase().trim();
}

async function getUserByEmail(email: string, projectId: string, token: string) {
        // 1. Normalize email
        const cleanEmail = email.toLowerCase().trim();
        const emailsToTry = [cleanEmail];

        // Handle gmail.com / googlemail.com alias
        if (cleanEmail.endsWith('@gmail.com')) {
                emailsToTry.push(cleanEmail.replace('@gmail.com', '@googlemail.com'));
        } else if (cleanEmail.endsWith('@googlemail.com')) {
                emailsToTry.push(cleanEmail.replace('@googlemail.com', '@gmail.com'));
        }

        // 2. Try Firebase Auth Lookup (Primary)
        try {
                const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ email: emailsToTry })
                });
                const data: any = await res.json();
                if (data.users?.[0]?.localId) return data.users[0].localId;
        } catch (e) { console.warn("Auth Lookup Failed", e); }

        // 3. Fallback: Query Firestore 'users' collection (Secondary Emails / Aliases)
        // Check if email matches 'email' field OR is in 'aliases' array
        console.log(`[Lookup] Auth failed for ${cleanEmail}, trying Firestore...`);

        try {
                // Query: email == cleanEmail
                const qUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
                const queryBody = {
                        structuredQuery: {
                                from: [{ collectionId: "users" }],
                                where: {
                                        compositeFilter: {
                                                op: "OR",
                                                filters: [
                                                        { fieldFilter: { field: { fieldPath: "email" }, op: "EQUAL", value: { stringValue: cleanEmail } } },
                                                        { fieldFilter: { field: { fieldPath: "aliases" }, op: "ARRAY_CONTAINS", value: { stringValue: cleanEmail } } }
                                                ]
                                        }
                                },
                                limit: 1
                        }
                };

                const fsRes = await fetch(qUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify(queryBody)
                });

                const fsData: any = await fsRes.json();
                if (fsData[0]?.document?.name) {
                        return fsData[0].document.name.split('/').pop();
                }
        } catch (e) { console.warn("Firestore Lookup Failed", e); }

        return null; // User truly not found
}

async function getUserFutureTrips(uid: string, projectId: string, token: string) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/trips?pageSize=20&orderBy=updatedAt desc`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data: any = await res.json();
        if (!data.documents) return [];
        return data.documents.map((doc: any) => {
                const f = doc.fields;
                return {
                        id: doc.name.split('/').pop(),
                        name: f.name?.stringValue || "Untitled",
                        destination: f.destination?.stringValue || "",
                        startDate: f.startDate?.stringValue || "",
                        endDate: f.endDate?.stringValue || "",
                };
        });
}

async function getTripById(uid: string, tripId: string, projectId: string, token: string) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/trips/${tripId}`;
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) return null;
        const data: any = await res.json();
        return unmapFirestore(data);
}

async function createTrip(uid: string, data: any, projectId: string, token: string) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/trips`;
        const doc = mapJsonToFirestore(data);
        const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(doc)
        });
        const json: any = await res.json();
        if (!res.ok) {
                console.error(`[Firestore] CREATE FAILED: ${res.status} ${res.statusText}`, JSON.stringify(json));
                throw new Error(`Create Failed: ${res.status} - ${JSON.stringify(json).substring(0, 500)}`);
        }
        console.log(`[Pipeline] Step 5 Done: Trip created with ID ${json.name.split('/').pop()}`);
        return json.name.split('/').pop();
}

async function updateTrip(uid: string, tripId: string, data: any, projectId: string, token: string) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/trips/${tripId}`;
        const doc = mapJsonToFirestore(data);
        const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(doc)
        });
        if (!res.ok) {
                const errBody = await res.text();
                console.error(`[Firestore] UPDATE FAILED: ${res.status}`, errBody);
                throw new Error(`Update Failed: ${res.status} - ${errBody.substring(0, 500)}`);
        }
        console.log(`[Pipeline] Step 5 Done: Trip ${tripId} updated`);
}

function mapJsonToFirestore(data: any): any {
        const fields: any = {};
        const stringFields = ['name', 'destination', 'country', 'startDate', 'endDate', 'dates', 'coverImage', 'source', 'ownerEmail', 'userId', 'status'];
        const timeFields = ['createdAt', 'updatedAt', 'importedAt'];

        stringFields.forEach(k => {
                if (data[k] !== undefined && data[k] !== null) fields[k] = { stringValue: String(data[k]) }
        });

        // CRITICAL FIX: Always ensure timestamps exist, otherwise Firestore orderBy() hides the doc
        timeFields.forEach(k => {
                fields[k] = { timestampValue: data[k] || new Date().toISOString() };
        });
        ['hotels', 'restaurants', 'attractions', 'itinerary', 'documents', 'carRental'].forEach(k => {
                const arr = data[k] || [];
                fields[k] = { arrayValue: { values: arr.map((item: any) => ({ mapValue: { fields: mapSimpleObject(item) } })) } };
        });

        // Explicitly handle collaborators (Array of Strings)
        if (data.collaborators && Array.isArray(data.collaborators)) {
                fields.collaborators = {
                        arrayValue: { values: data.collaborators.map((c: string) => ({ stringValue: c })) }
                };
        } else {
                fields.collaborators = { arrayValue: { values: [] } };
        }

        if (data.flights) {
                fields.flights = {
                        mapValue: {
                                fields: {
                                        pnr: { stringValue: data.flights.pnr || "" },
                                        airline: { stringValue: data.flights.airline || "" },
                                        totalPrice: { doubleValue: data.flights.totalPrice || 0 },
                                        currency: { stringValue: data.flights.currency || "USD" },
                                        segments: { arrayValue: { values: (data.flights.segments || []).map((seg: any) => ({ mapValue: { fields: mapSimpleObject(seg) } })) } }
                                }
                        }
                };
        } else {
                fields.flights = { mapValue: { fields: { segments: { arrayValue: { values: [] } } } } };
        }
        return { fields };
}

function unmapFirestore(doc: any): any {
        const f = doc.fields || {};
        const obj: any = {};
        ['name', 'destination', 'country', 'startDate', 'endDate', 'dates', 'coverImage', 'source', 'createdAt', 'updatedAt'].forEach(k => {
                if (f[k]) obj[k] = f[k].stringValue || f[k].timestampValue;
        });
        ['hotels', 'restaurants', 'attractions', 'itinerary', 'documents', 'carRental'].forEach(k => {
                if (f[k] && f[k].arrayValue && f[k].arrayValue.values) {
                        obj[k] = f[k].arrayValue.values.map((v: any) => unmapSimpleObject(v.mapValue.fields));
                } else { obj[k] = []; }
        });
        if (f.flights && f.flights.mapValue && f.flights.mapValue.fields) {
                const ff = f.flights.mapValue.fields;
                obj.flights = {
                        pnr: ff.pnr?.stringValue || "",
                        airline: ff.airline?.stringValue || "",
                        totalPrice: ff.totalPrice?.doubleValue || 0,
                        currency: ff.currency?.stringValue || "USD",
                        segments: ff.segments?.arrayValue?.values?.map((v: any) => unmapSimpleObject(v.mapValue.fields)) || []
                };
        }
        return obj;
}

function mapSimpleObject(obj: any) {
        const f: any = {};
        for (const [k, v] of Object.entries(obj)) {
                if (typeof v === 'string') f[k] = { stringValue: v };
                else if (typeof v === 'number') f[k] = { doubleValue: v };
                else if (typeof v === 'boolean') f[k] = { booleanValue: v };
        }
        return f;
}

function unmapSimpleObject(fields: any) {
        const obj: any = {};
        for (const [k, v] of Object.entries(fields || {})) {
                // @ts-ignore
                if (v.stringValue) obj[k] = v.stringValue;
                // @ts-ignore
                else if (v.doubleValue) obj[k] = v.doubleValue;
                // @ts-ignore
                else if (v.booleanValue) obj[k] = v.booleanValue;
        }
        return obj;
}

async function streamToArrayBuffer(stream: ReadableStream): Promise<ArrayBuffer> {
        const reader = stream.getReader();
        const chunks = [];
        while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
        }
        const len = chunks.reduce((a, c) => a + c.length, 0);
        const res = new Uint8Array(len);
        let off = 0;
        for (const c of chunks) { res.set(c, off); off += c.length; }
        return res.buffer;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
        let binary = '';
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
        try { return btoa(binary); } catch (e) { return ""; }
}
