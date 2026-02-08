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
                await handleEmail(message.from, message.raw, env, ctx);
        },

        async fetch(request: Request, env: Env, ctx: ExecutionContext) {
                try {
                        if (!env.GEMINI_API_KEY || !env.FIREBASE_PROJECT_ID || !env.FIREBASE_SERVICE_ACCOUNT) {
                                throw new Error("Missing Environment Variables");
                        }

                        const authHeader = request.headers.get("X-Auth-Token");
                        if (env.AUTH_SECRET && authHeader !== env.AUTH_SECRET) {
                                return new Response(`Unauthorized`, { status: 401 });
                        }

                        if (request.method === "POST") {
                                const body = await request.json() as any;
                                const from = body.from || "test@example.com";
                                const stream = new ReadableStream({
                                        start(controller) {
                                                controller.enqueue(new TextEncoder().encode(body.content || "Subject: Test"));
                                                controller.close();
                                        }
                                });
                                const result = await handleEmail(from, stream, env, ctx);
                                return new Response(JSON.stringify(result, null, 2), {
                                        status: 200,
                                        headers: { 'Content-Type': 'application/json' }
                                });
                        }
                        return new Response("Send POST for test", { status: 200 });
                } catch (e: any) {
                        return new Response(`Error: ${e.message}`, { status: 500 });
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
                // 1. Auth (Blocking, Required)
                logs.push("Step 1: Authenticating...");
                token = await getFirebaseAccessToken(env, logs) || "";
                if (!token) throw new Error("Firebase Auth Token is null");

                const senderEmail = extractEmail(from);
                uid = await getUserByEmail(senderEmail, env.FIREBASE_PROJECT_ID, token);

                if (!uid) {
                        console.error(`User not found for ${senderEmail}`);
                        return { success: false, message: `User not found: ${senderEmail}`, logs };
                }

                // From here on, use safeLog for non-critical logging
                safeLog(uid, "Email Received", { from: senderEmail, subject: "Parsing..." });

                // 2. Parse Email
                logs.push("Step 2: Parsing Email...");
                const parser = new PostalMime();
                const rawBuffer = await streamToArrayBuffer(rawStream);
                const email = await parser.parse(rawBuffer);

                textBody = email.text || email.html || "";
                const attachments = email.attachments.filter(att =>
                        att.mimeType === "application/pdf" || att.mimeType.startsWith("image/")
                );

                logs.push(`Body Length: ${textBody.length}, Attachments: ${attachments.length}`);

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
                                subject: email.subject || "No Subject",
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

async function analyzeTripWithGemini(text: string, attachments: any[], existingTrips: any[], apiKey: string) {

        // --- MODEL CONFIGURATION (Feb 2026) ---
        // Mirroring frontend FAST_CANDIDATES for maximum reliability
        const CANDIDATES = [
                "gemini-3-flash-preview",  // 1. Fastest
                "gemini-2.5-flash",        // 2. Stable
                "gemini-2.5-flash-lite",   // 3. Ultra Lite
                "gemini-1.5-flash-latest"  // 4. Veteran Fallback
        ];

        // Safety Settings: BLOCK_NONE (Critical for reliability)
        const safetySettings = [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_CIVIC_INTEGRITY", threshold: "BLOCK_NONE" }
        ];

        // --- FRONTEND GOLDEN PROMPT (IDENTICAL COPY) ---
        const SYSTEM_PROMPT = `
Role: You are the Lead Data Architect for a Travel App.
Mission: Parse uploaded travel documents into a STRICTLY STRUCTURED JSON format.

--- CRITICAL CONTEXT: ANCHOR YEAR 2026 ---
1. **CURRENT REFERENCE**: Today is Jan 2026.
2. **FUTURE BIAS**: All flights are for 2026 or 2027.
3. **MISSING YEAR RULE**: If a document says "04 Feb" and contains NO year, assign **2026**.
4. **THE "1930" TRAP (CRITICAL)**: In airline tickets, a 4-digit number after a month (e.g., "28JAN 1930") is OFTEN THE TIME (19:30), NOT THE YEAR 1930.
   - CHECK: Is the number between 0000 and 2359? Treat as TIME.
   - CHECK: Is the number 2025, 2026, 2027? Treat as YEAR.
   - NEVER output a year before 2025.

--- OUTPUT JSON SCHEMA ---
Return ONLY raw JSON.
For every date, you MUST provide:
1. "rawText": The exact string you saw in the file (e.g., "28JAN 1930").
2. "isoDate": The strictly formatted ISO string (YYYY-MM-DDTHH:mm:ss).

Structure:
{
  "tripMetadata": {
    "suggestedName": "String",
    "mainDestination": "String",
    "uniqueCityNames": ["City1"]
  },
  "processedFileIds": ["file1.pdf"],
  "unprocessedFiles": [],
  "categories": {
    "transport": [
      {
        "type": "flight",
        "data": {
          "airline": "String",
          "flightNumber": "String",
          "totalPrice": Number,
          "currency": "String (e.g. USD, EUR, ILS)",
          "departure": {
            "city": "String",
            "iata": "ABC",
            "rawDateText": "String (DEBUG)",
            "isoDate": "YYYY-MM-DDTHH:mm:ss",
            "displayTime": "HH:MM"
          },
          "arrival": {
             "city": "String",
             "iata": "ABC",
             "rawDateText": "String (DEBUG)",
             "isoDate": "YYYY-MM-DDTHH:mm:ss",
             "displayTime": "HH:MM"
          }
        },
        "sourceFileIds": []
      }
    ],
    "accommodation": [
      {
         "type": "hotel",
         "data": {
            "hotelName": "String",
            "address": "String",
            "checkIn": "YYYY-MM-DD",
            "checkOut": "YYYY-MM-DD",
            "totalPrice": Number,
            "currency": "String",
            "bookingId": "String"
         }
      }
    ],
    "wallet": [],
    "dining": [],
    "activities": []
  }
}
`;

        const parts: any[] = [{
                text: `${SYSTEM_PROMPT}

    --- WORKER CONTEXT ---
    You are running in a background worker.
    Analyze the EMAIL CONTENT and ATTACHMENTS below using the rules above.

    OUTPUT: Return the JSON structure defined in the schema above.
    ` }];

        for (const att of attachments) {
                const b64 = uint8ArrayToBase64(att.content);
                if (b64) {
                        parts.push({
                                inline_data: { mime_type: att.mimeType, data: b64 }
                        });
                }
        }

        parts.push({
                text: `Email: \n${text.substring(0, 30000)
                        } `
        });

        // --- FALLBACK LOOP ---
        let lastError = null;

        for (const model of CANDIDATES) {
                console.log(`🤖 Attempting model: ${model} `);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

                try {
                        const res = await fetch(url, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                        contents: [{ parts }],
                                        safetySettings, // Apply Safety Settings
                                        generationConfig: { responseMimeType: "application/json" }
                                })
                        });

                        const json: any = await res.json();

                        if (!res.ok) {
                                // If 404 (Model not found) or 503 (Overloaded), continue to next
                                console.warn(`⚠️ Model ${model} failed: ${res.status} ${JSON.stringify(json)}`);
                                lastError = new Error(`Gemini API Error (${model}): ${res.statusText}`);
                                continue;
                        }

                        // Strict Validation
                        if (!json.candidates || json.candidates.length === 0) {
                                lastError = new Error(`Gemini (${model}) No Candidates.`);
                                continue;
                        }

                        const candidate = json.candidates[0];

                        // Safety Check
                        if (candidate.finishReason === "SAFETY") {
                                lastError = new Error(`Gemini (${model}) Blocked due to SAFETY.`);
                                continue;
                        }

                        if (!candidate.content || !candidate.content.parts) {
                                lastError = new Error(`Gemini (${model}) Empty content. FinishReason: ${candidate.finishReason}`);
                                continue;
                        }

                        // Success! Parse and return
                        console.log(`✅ Success with ${model}`);
                        const txt = candidate.content.parts[0].text;
                        const cleanedTxt = cleanJSON(txt); // Sanitize
                        const frontendData = JSON.parse(cleanedTxt);

                        // --- DEBUG LOGGING (User Request) ---
                        console.log("🔍 [Worker Extracted]:", JSON.stringify(frontendData).substring(0, 1000));

                        // --- MAPPING: FRONTEND SCHEMA -> WORKER SCHEMA ---
                        // We map the robust Frontend output back to the simple Worker format
                        // so legacy logic (and temporal matching) continues to work.

                        // 1. Extract Dates
                        const transportDates = frontendData.categories?.transport?.map((t: any) => t.data.departure?.isoDate).filter(Boolean) || [];
                        const hotelDates = frontendData.categories?.accommodation?.map((h: any) => h.data.checkIn).filter(Boolean) || [];
                        const allDates = [...transportDates, ...hotelDates].sort();

                        const startDate = allDates[0] ? allDates[0].split('T')[0] : (frontendData.tripMetadata?.startDate || "");
                        const endDate = allDates.length > 0 ? allDates[allDates.length - 1].split('T')[0] : (frontendData.tripMetadata?.endDate || "");

                        // 2. Map Flights
                        const segments = frontendData.categories?.transport?.map((t: any) => ({
                                from: t.data.departure?.city || t.data.departure?.iata || "",
                                to: t.data.arrival?.city || t.data.arrival?.iata || "",
                                date: t.data.departure?.isoDate ? t.data.departure?.isoDate.split('T')[0] : "",
                                departureTime: t.data.departure?.displayTime || "00:00",
                                arrivalTime: t.data.arrival?.displayTime || "00:00",
                                flight: t.data.flightNumber || "",
                                airline: t.data.airline || ""
                        })) || [];

                        // 3. Map Hotels
                        const hotels = frontendData.categories?.accommodation?.map((h: any) => ({
                                name: h.data.hotelName,
                                address: h.data.address,
                                checkInDate: h.data.checkIn,
                                checkOutDate: h.data.checkOut
                        })) || [];

                        return {
                                action: "create", // Default, will be overridden by Temporal Matching
                                tripId: "",
                                data: {
                                        name: frontendData.tripMetadata?.suggestedName || "New Trip",
                                        destination: frontendData.tripMetadata?.mainDestination || "",
                                        startDate,
                                        endDate,
                                        flights: { segments: segments }, // Worker expects 'flights' object with segments array
                                        hotels: hotels
                                }
                        };

                } catch (e: any) {
                        console.error(`❌ Crash with ${model}:`, e);
                        lastError = e;
                        // Move to next candidate
                }
        }

        // If all failed
        throw lastError || new Error("All Gemini models failed to process the email.");
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

// --- HELPER: CLEAN JSON (CRITICAL FOR GEMINI) ---
function cleanJSON(text: string): string {
        if (!text) return "{}";
        return text.replace(/```json/g, '').replace(/```/g, '').trim();
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


// --- LOGIC HELPER: MERGE (Unchanged) ---
function mergeTripData(original: any, newData: any): any {
        const merged = { ...original };
        const arrayFields = ['hotels', 'restaurants', 'attractions', 'itinerary', 'documents'];
        arrayFields.forEach(field => {
                if (newData[field] && Array.isArray(newData[field])) {
                        merged[field] = [...(merged[field] || []), ...newData[field]];
                }
        });
        if (newData.flights) {
                if (!merged.flights) merged.flights = {};
                if (!merged.flights.pnr && newData.flights.pnr) merged.flights.pnr = newData.flights.pnr;
                if (!merged.flights.airline && newData.flights.airline) merged.flights.airline = newData.flights.airline;
                if (newData.flights.segments && Array.isArray(newData.flights.segments)) {
                        merged.flights.segments = [...(merged.flights.segments || []), ...newData.flights.segments];
                }
        }
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
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email: [email] })
        });
        const data: any = await res.json();
        return data.users?.[0]?.localId || null;
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
        if (!res.ok) throw new Error("Create Failed");
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
        if (!res.ok) throw new Error("Update Failed");
}

function mapJsonToFirestore(data: any): any {
        const fields: any = {};
        const stringFields = ['name', 'destination', 'startDate', 'endDate', 'dates', 'coverImage', 'source', 'ownerEmail', 'userId', 'status'];
        const timeFields = ['createdAt', 'updatedAt', 'importedAt'];

        stringFields.forEach(k => {
                if (data[k] !== undefined && data[k] !== null) fields[k] = { stringValue: String(data[k]) }
        });

        // CRITICAL FIX: Always ensure timestamps exist, otherwise Firestore orderBy() hides the doc
        timeFields.forEach(k => {
                fields[k] = { timestampValue: data[k] || new Date().toISOString() };
        });
        ['hotels', 'restaurants', 'attractions', 'itinerary', 'documents'].forEach(k => {
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
        ['name', 'destination', 'startDate', 'endDate', 'dates', 'coverImage', 'source', 'createdAt', 'updatedAt'].forEach(k => {
                if (f[k]) obj[k] = f[k].stringValue || f[k].timestampValue;
        });
        ['hotels', 'restaurants', 'attractions', 'itinerary', 'documents'].forEach(k => {
                if (f[k] && f[k].arrayValue && f[k].arrayValue.values) {
                        obj[k] = f[k].arrayValue.values.map((v: any) => unmapSimpleObject(v.mapValue.fields));
                } else { obj[k] = []; }
        });
        if (f.flights && f.flights.mapValue && f.flights.mapValue.fields) {
                const ff = f.flights.mapValue.fields;
                obj.flights = {
                        pnr: ff.pnr?.stringValue || "",
                        airline: ff.airline?.stringValue || "",
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
