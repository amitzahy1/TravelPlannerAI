/**
 * Travel Planner Pro - Smart Email Import Worker (v2)
 * Handles incoming emails, parses attachments coverage (PDF/Image),
 * checks for existing future trips, and intelligently merges data.
 */

import { SignJWT, importPKCS8 } from 'jose';
import PostalMime from 'postal-mime';

// --- INTERFACES ---
interface Env {
        GEMINI_API_KEY: string;
        FIREBASE_SERVICE_ACCOUNT: string; // JSON string
        FIREBASE_PROJECT_ID: string;
        AUTH_SECRET: string;
}

// --- MAIN HANDLER ---
export default {
        async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext) {
                await handleEmail(message.from, message.raw, env);
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
                                // Create stream for test
                                const stream = new ReadableStream({
                                        start(controller) {
                                                controller.enqueue(new TextEncoder().encode(body.content || "Subject: Test"));
                                                controller.close();
                                        }
                                });
                                const result = await handleEmail(from, stream, env);
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

async function handleEmail(from: string, rawStream: ReadableStream, env: Env) {
        console.log(`[EmailPipe] Processing email from: ${from}`);
        const logs: string[] = [`Processing email from ${from} at ${new Date().toISOString()}`];

        try {
                // 1. Auth
                logs.push("Step 1: Authenticating...");
                const token = await getFirebaseAccessToken(env, logs).catch(e => { throw new Error(`Auth Failed: ${e.message}`) });
                if (!token) throw new Error("Firebase Auth Token is null");
                logs.push("Step 1: Auth OK");

                const senderEmail = extractEmail(from);
                logs.push(`Step 1.1: Lookup User ${senderEmail}...`);
                const uid = await getUserByEmail(senderEmail, env.FIREBASE_PROJECT_ID, token).catch(e => { throw new Error(`User Lookup Failed: ${e.message}`) });

                if (!uid) {
                        console.error(`User not found for ${senderEmail}`);
                        return { success: false, message: `User not found: ${senderEmail}`, logs };
                }

                await logToSystem(uid, env.FIREBASE_PROJECT_ID, token, "Email Received", { from: senderEmail, subject: "N/A" });
                logs.push(`Identify User: ${uid}`);

                // 2. Parse Email
                logs.push("Step 2: Parsing Email...");
                const parser = new PostalMime();
                const rawBuffer = await streamToArrayBuffer(rawStream).catch(e => { throw new Error(`Stream Read Failed: ${e.message}`) });
                logs.push(`Step 2: Buffer Size: ${rawBuffer.byteLength}`);

                const email = await parser.parse(rawBuffer).catch(e => { throw new Error(`Mime Parse Failed: ${e.message}`) });
                logs.push("Step 2: Parse OK");

                const textBody = email.text || email.html || "";
                const attachments = email.attachments.filter(att =>
                        att.mimeType === "application/pdf" || att.mimeType.startsWith("image/")
                );
                logs.push(`Attachments found: ${attachments.length}`);

                // 3. Get Existing Trips
                logs.push("Step 3: Fetching Existing Trips...");
                const existingTrips = await getUserFutureTrips(uid, env.FIREBASE_PROJECT_ID, token).catch(e => {
                        logs.push(`Step 3 Error: ${e.message}`);
                        return []; // Recoverable?
                });
                logs.push(`Step 3: Found ${existingTrips.length} trips`);

                // 4. Gemini Extraction
                logs.push("Step 4: Analyzing with Gemini...");
                const analysis = await analyzeTripWithGemini(
                        textBody,
                        attachments,
                        existingTrips,
                        env.GEMINI_API_KEY
                ).catch(e => { throw new Error(`Gemini Analysis Crashed: ${e.message}`) });

                logs.push("Step 4: Gemini returned. Checking result...");

                if (!analysis) {
                        await logToSystem(uid, env.FIREBASE_PROJECT_ID, token, "Gemini Analysis Failed", { error: "Returned null" });
                        throw new Error("Gemini Analysis Failed");
                }

                await logToSystem(uid, env.FIREBASE_PROJECT_ID, token, "AI Analysis Complete", { action: analysis.action, tripId: analysis.tripId || "NEW", dataPreview: analysis.data.name });
                logs.push(`Action: ${analysis.action.toUpperCase()} ${analysis.tripId ? `(ID: ${analysis.tripId})` : ''}`);

                let finalTripId = analysis.tripId;
                let finalAction = analysis.action;

                if (analysis.action === 'update' && analysis.tripId) {
                        // --- MERGE FLOW ---
                        logs.push(`Fetching Trip ${analysis.tripId} for merge...`);
                        const originalTrip = await getTripById(uid, analysis.tripId, env.FIREBASE_PROJECT_ID, token);

                        if (originalTrip) {
                                const mergedTrip = mergeTripData(originalTrip, analysis.data);
                                logs.push("Merging data...");
                                await updateTrip(uid, analysis.tripId, mergedTrip, env.FIREBASE_PROJECT_ID, token);
                                await logToSystem(uid, env.FIREBASE_PROJECT_ID, token, "Trip Updated (Merge)", { tripId: analysis.tripId });
                                logs.push("Merger saved.");
                        } else {
                                // Fallback
                                logs.push("Trip not found, creating new instead.");
                                await logToSystem(uid, env.FIREBASE_PROJECT_ID, token, "Merge Failed - Trip Not Found", { targetId: analysis.tripId });
                                finalAction = 'create';
                                finalTripId = await createTrip(uid, analysis.data, env.FIREBASE_PROJECT_ID, token);
                        }
                } else {
                        // --- CREATE FLOW ---
                        logs.push("Creating new trip...");
                        finalTripId = await createTrip(uid, analysis.data, env.FIREBASE_PROJECT_ID, token);
                        await logToSystem(uid, env.FIREBASE_PROJECT_ID, token, "New Trip Created", { tripId: finalTripId });
                }

                return { success: true, action: finalAction, tripId: finalTripId, logs };

        } catch (error: any) {
                console.error("Fatal Error:", error);
                // Try logging failure if we have token/uid, otherwise just return
                logs.push(`Error: ${error.message}`);
                return { success: false, error: error.message, logs };
        }
}

// --- LOGIC HELPER: MERGE ---

function mergeTripData(original: any, newData: any): any {
        // Clone original
        const merged = { ...original };

        // Arrays to append
        const arrayFields = ['hotels', 'restaurants', 'attractions', 'itinerary', 'documents'];

        arrayFields.forEach(field => {
                if (newData[field] && Array.isArray(newData[field])) {
                        merged[field] = [...(merged[field] || []), ...newData[field]];
                }
        });

        // Flights Logic (Complex: Object vs Array)
        // If original has flights object, try to merge segments.
        if (newData.flights) {
                if (!merged.flights) merged.flights = {};

                // Update PNR/Airline if missing
                if (!merged.flights.pnr && newData.flights.pnr) merged.flights.pnr = newData.flights.pnr;
                if (!merged.flights.airline && newData.flights.airline) merged.flights.airline = newData.flights.airline;

                // Append segments
                if (newData.flights.segments && Array.isArray(newData.flights.segments)) {
                        merged.flights.segments = [...(merged.flights.segments || []), ...newData.flights.segments];
                }
        }

        // Dates (Expand range if needed)
        // Logic: if new start < old start, update. if new end > old end, update. 
        // (Simplified for now: keep original dates unless missing)
        if (!merged.startDate && newData.startDate) merged.startDate = newData.startDate;
        if (!merged.endDate && newData.endDate) merged.endDate = newData.endDate;

        merged.updatedAt = new Date().toISOString();
        return merged;
}

// --- FIREBASE API ---

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
        // List last 20 trips
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
                        startDate: f.startDate?.stringValue || "", // Assuming we started saving split dates
                        endDate: f.endDate?.stringValue || "", // Assuming
                        dates: f.dates?.stringValue || "" // Legacy
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

// --- GEMINI ---

async function analyzeTripWithGemini(text: string, attachments: any[], existingTrips: any[], apiKey: string) {
        const model = "gemini-1.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const parts: any[] = [{
                text: `
    You are a Travel Assistant API.
    Analyze this email content and attachments.
    
    EXISTING TRIPS:
    ${JSON.stringify(existingTrips)}

    TASK:
    1. Extract all travel details:
       - Trip Name, Destination, Dates (YYYY-MM-DD)
       - FLIGHTS: Extract full segments (departure/arrival airports, times, flight #). 
       - HOTELS: Extract name, address, dates.
    2. DECISION: Does this info belong to an existing trip (dates/loc overlap)?
       - Return action="update" with tripId.
       - Else action="create".

    IMPORTANT: For FLIGHTS, ALWAYS extract "departureTime" and "arrivalTime" in HH:mm format (24h).

    OUTPUT JSON:
    {
       "action": "create" | "update",
       "tripId": "string (if update)",
       "data": {
           "name": "Trip Name",
           "destination": "City, Country",
           "startDate": "YYYY-MM-DD",
           "endDate": "YYYY-MM-DD",
           "flights": { 
               "pnr": "string", "airline": "string", 
               "segments": [ { "from": "TLV", "to": "LHR", "date": "...", "departureTime": "10:00", "arrivalTime": "14:30", "flight": "..." } ] 
           },
           "hotels": [ { "name": "...", "address": "...", "checkIn": "...", "checkOut": "..." } ]
       }
    }
    ` }];

        for (const att of attachments) {
                const b64 = uint8ArrayToBase64(att.content);
                if (b64) {
                        parts.push({
                                inline_data: { mime_type: att.mimeType, data: b64 }
                        });
                }
        }

        parts.push({ text: `Email:\n${text.substring(0, 30000)}` });

        const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                        contents: [{ parts }],
                        generationConfig: { responseMimeType: "application/json" }
                })
        });

        const json: any = await res.json();

        if (!res.ok) {
                console.error("Gemini API Error:", json);
                throw new Error(`Gemini API Error: ${res.statusText} - ${JSON.stringify(json)}`);
        }

        try {
                if (!json.candidates || !json.candidates[0] || !json.candidates[0].content) {
                        throw new Error(`Gemini Validation Error: No candidates returned. Response: ${JSON.stringify(json)}`);
                }
                const txt = json.candidates[0].content.parts[0].text;
                return JSON.parse(txt);
        } catch (e: any) {
                console.error("Gemini Parse Error:", e);
                throw new Error(`Gemini Parse Error: ${e.message}`);
        }
}

// --- FIRESTORE MAPPING ---

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
        // Overwrite method (since we merged in memory)
        // Note: To preserve other fields not in 'data', we should have deep merged. 
        // But `mergeTripData` takes `original` and returns full object. So `data` here IS the full object.
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/trips/${tripId}`;
        const doc = mapJsonToFirestore(data);

        // Use PATCH with mask? No, just replace fields we send? 
        // If we send everything, we replace.
        // Let's use updateMask to be safe? 
        // Actually, simply PATCHing the resource updates the fields provided.

        const res = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(doc)
        });
        if (!res.ok) throw new Error("Update Failed");
}

function mapJsonToFirestore(data: any): any {
        const fields: any = {};
        const stringFields = ['name', 'destination', 'startDate', 'endDate', 'dates', 'coverImage', 'source'];
        const timeFields = ['createdAt', 'updatedAt', 'importedAt'];

        stringFields.forEach(k => { if (data[k]) fields[k] = { stringValue: data[k] } });
        timeFields.forEach(k => { if (data[k]) fields[k] = { timestampValue: data[k] || new Date().toISOString() } });

        // Arrays
        ['hotels', 'restaurants', 'attractions', 'itinerary', 'documents'].forEach(k => {
                const arr = data[k] || [];
                fields[k] = { arrayValue: { values: arr.map((item: any) => ({ mapValue: { fields: mapSimpleObject(item) } })) } };
        });

        // Flights (Object)
        if (data.flights) {
                fields.flights = {
                        mapValue: {
                                fields: {
                                        pnr: { stringValue: data.flights.pnr || "" },
                                        airline: { stringValue: data.flights.airline || "" },
                                        // Nested array
                                        segments: {
                                                arrayValue: {
                                                        values: (data.flights.segments || []).map((seg: any) => ({ mapValue: { fields: mapSimpleObject(seg) } }))
                                                }
                                        }
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

        // Strings
        ['name', 'destination', 'startDate', 'endDate', 'dates', 'coverImage', 'source', 'createdAt', 'updatedAt'].forEach(k => {
                if (f[k]) obj[k] = f[k].stringValue || f[k].timestampValue;
        });

        // Arrays
        ['hotels', 'restaurants', 'attractions', 'itinerary', 'documents'].forEach(k => {
                if (f[k] && f[k].arrayValue && f[k].arrayValue.values) {
                        obj[k] = f[k].arrayValue.values.map((v: any) => unmapSimpleObject(v.mapValue.fields));
                } else {
                        obj[k] = [];
                }
        });

        // Flights
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
// --- LOGGING ---

async function logToSystem(uid: string, projectId: string, token: string, message: string, details: any = {}) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/system_logs`;
        try {
                await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                                fields: {
                                        type: { stringValue: "EMAIL_IMPORT_DEBUG" },
                                        timestamp: { timestampValue: new Date().toISOString() },
                                        message: { stringValue: message },
                                        details: { stringValue: JSON.stringify(details).substring(0, 1500) } // Limit size
                                }
                        })
                });
        } catch (e) { console.error("Log failed", e); }
}

// ... existing createTrip / updateTrip ...

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

// Support
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
