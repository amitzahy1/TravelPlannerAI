/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { SignJWT, importPKCS8 } from 'jose';

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

        // Added for HTTP Testing (since user has no domain)
        async fetch(request: Request, env: Env, ctx: ExecutionContext) {
                try {
                        // Check Env Vars logic
                        if (!env.GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY secret");
                        if (!env.FIREBASE_PROJECT_ID) throw new Error("Missing FIREBASE_PROJECT_ID secret");
                        if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error("Missing FIREBASE_SERVICE_ACCOUNT secret");

                        // SECURITY: Verify Shared Secret
                        // We strictly require this header to match the secret environment variable.
                        const authHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || request.headers.get("X-Auth-Token");
                        if (!env.AUTH_SECRET || authHeader !== env.AUTH_SECRET) {
                                // Use 401/403 to indicate unauthorized
                                return new Response(`Unauthorized`, { status: 401 });
                        }

                        if (request.method === "POST") {
                                const body = await request.json() as any;
                                const from = body.from || "test@example.com";
                                const content = body.content || "Subject: Test Trip\n\nI want to go to London next week.";

                                // Create a fake stream from the string content
                                const stream = new ReadableStream({
                                        start(controller) {
                                                controller.enqueue(new TextEncoder().encode(content));
                                                controller.close();
                                        }
                                });

                                const result = await handleEmail(from, stream, env);
                                return new Response(JSON.stringify(result, null, 2), {
                                        status: 200,
                                        headers: { 'Content-Type': 'application/json' }
                                });
                        }
                        return new Response("Send a POST with { from, content } to test", { status: 200 });
                } catch (e: any) {
                        return new Response(`Error: ${e.message}\nStack: ${e.stack}`, { status: 500 });
                }
        }
};

async function handleEmail(from: string, rawStream: ReadableStream, env: Env) {
        console.log(`[EmailPipe] Received email from: ${from}`);
        const logs: string[] = [`Processing email from ${from} at ${new Date().toISOString()}`];

        try {
                // 1. Get Access Token for Firebase
                logs.push("Authenticating with Firebase...");
                const token = await getFirebaseAccessToken(env, logs);
                if (!token) throw new Error("Failed to authenticate with Firebase. Check logs.");

                // 2. Map Sender to UID
                // FIX: Extract strictly the email address from "Name <email>" format. Supports aliases (e.g. user+tag@example.com)
                const emailMatch = from.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                const senderEmail = (emailMatch ? emailMatch[0] : from).toLowerCase().trim();

                logs.push(`Looking up user for email: ${senderEmail} (extracted from ${from})`);
                const uid = await getUserByEmail(senderEmail, env.FIREBASE_PROJECT_ID, token);

                if (!uid) {
                        logs.push(`FAILED: User not found for ${senderEmail}`);
                        console.error(`[EmailPipe] User lookup failed for ${senderEmail}`);
                        return { success: false, message: `User not found for email: ${senderEmail}. Ensure you are registered with this email.`, logs };
                }
                logs.push(`Found UID: ${uid}`);

                // 3. Parse Email Content
                logs.push("Parsing email stream...");
                const rawEmail = await streamToString(rawStream);
                logs.push(`Raw email length: ${rawEmail.length} chars`);

                // 4. Extract Trip Data with Gemini
                logs.push("Extracting data with Gemini AI...");
                const tripData = await extractTripDataWithGemini(rawEmail, env.GEMINI_API_KEY);

                if (!tripData) {
                        logs.push("FAILED: Gemini returned no data");
                        return { success: false, message: "Could not extract trip data from this email. Is it a booking confirmation?", logs };
                }
                logs.push(`Gemini extracted trip: ${tripData.name} to ${tripData.destination}`);

                // 5. Write to Firestore
                logs.push("Saving to Firestore...");
                const savedTrip = await writeTripToFirestore(uid, tripData, env.FIREBASE_PROJECT_ID, token);
                logs.push("SUCCESS: Trip saved to Firestore");

                return { success: true, message: `Successfully created trip for user ${uid}`, tripId: savedTrip.id, logs };

        } catch (error: any) {
                const errMsg = `Error at ${new Date().toISOString()}: ${error.message}`;
                console.error("[EmailPipe] Fatal Error:", error);
                logs.push(errMsg);
                return { success: false, error: error.message, logs };
        }
}

// --- HELPERS: AUTH ---

async function getFirebaseAccessToken(env: Env, logs: string[]): Promise<string | null> {
        try {
                if (!env.FIREBASE_SERVICE_ACCOUNT) {
                        logs.push("FIREBASE_SERVICE_ACCOUNT is undefined");
                        return null;
                }
                const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
                const privateKeyPEM = serviceAccount.private_key;
                const clientEmail = serviceAccount.client_email;

                // Import Key
                const algorithm = 'RS256';
                const privateKey = await importPKCS8(privateKeyPEM, algorithm);

                // Creating JWT for Google OAuth2
                const now = Math.floor(Date.now() / 1000);
                const jwt = await new SignJWT({
                        scope: 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit'
                })
                        .setProtectedHeader({ alg: algorithm, typ: 'JWT' })
                        .setIssuer(clientEmail)
                        .setSubject(clientEmail)
                        .setAudience('https://oauth2.googleapis.com/token')
                        .setIssuedAt(now)
                        .setExpirationTime(now + 3600)
                        .sign(privateKey);

                // Exchange JWT for Access Token
                const response = await fetch('https://oauth2.googleapis.com/token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                                assertion: jwt
                        })
                });

                const data: any = await response.json();
                return data.access_token;
        } catch (e: any) {
                logs.push(`Auth Error: ${e.message}`);
                console.error("Auth Error:", e);
                return null;
        }
}

// --- HELPERS: FIREBASE ---

async function getUserByEmail(email: string, projectId: string, token: string): Promise<string | null> {
        // Use Identity Toolkit API to lookup user
        const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`;

        const response = await fetch(url, {
                method: 'POST',
                headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: [email] })
        });

        const data: any = await response.json();
        if (data.users && data.users.length > 0) {
                return data.users[0].localId; // This is the UID
        }
        return null;
}

async function writeTripToFirestore(uid: string, tripData: any, projectId: string, token: string) {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/trips`;

        const firestoreDoc = mapJsonToFirestore(tripData);

        const response = await fetch(url, {
                method: 'POST',
                headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(firestoreDoc)
        });

        const result: any = await response.json();
        if (!response.ok) {
                throw new Error(`Firestore Write Failed: ${JSON.stringify(result)}`);
        }
        // Return the document name (ID is usually at the end)
        const nameParts = result.name.split('/');
        return { id: nameParts[nameParts.length - 1] };
}

// --- HELPERS: GEMINI ---

async function extractTripDataWithGemini(emailText: string, apiKey: string): Promise<any> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

        const prompt = `
	Extract travel details from this email. Return a JSON object strictly matching this structure (no markdown):
	{
		"name": "Suggested Trip Name (e.g. Flight to London)",
		"destination": "Main City",
		"startDate": "YYYY-MM-DD",
		"endDate": "YYYY-MM-DD",
		"flights": {
			"pnr": "string",
			"airline": "string",
			"flightNumber": "string"
		}
	}

	Email Content:
	${emailText.substring(0, 50000)} 
	`;

        const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { responseMimeType: "application/json" }
                })
        });

        const data: any = await response.json();
        try {
                const text = data.candidates[0].content.parts[0].text;
                return JSON.parse(text);
        } catch (e) {
                console.error("Gemini Parse Error:", e);
                return null;
        }
}

// --- UTILS ---

async function streamToString(stream: ReadableStream): Promise<string> {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let result = '';

        while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                result += decoder.decode(value, { stream: true });
        }
        result += decoder.decode();
        return result;
}

// Full Mapper for Firestore REST (Required arrays to prevent frontend crashes)
function mapJsonToFirestore(data: any): any {
        const now = new Date().toISOString();
        return {
                fields: {
                        name: { stringValue: data.name || "Imported Trip" },
                        destination: { stringValue: data.destination || "" },
                        dates: { stringValue: data.startDate ? `${data.startDate} - ${data.endDate}` : "" },
                        coverImage: { stringValue: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80" },
                        isShared: { booleanValue: false },
                        updatedAt: { timestampValue: now },
                        createdAt: { timestampValue: now },
                        importedAt: { timestampValue: now },
                        source: { stringValue: "email" },
                        // Required Arrays (Empty to satisfy TypeScript)
                        flights: {
                                mapValue: {
                                        fields: {
                                                pnr: { stringValue: data.flights?.pnr || "" },
                                                airline: { stringValue: data.flights?.airline || "" },
                                                flightNumber: { stringValue: data.flights?.flightNumber || "" },
                                                passengerName: { stringValue: "" },
                                                segments: { arrayValue: { values: [] } }
                                        }
                                }
                        },
                        hotels: { arrayValue: { values: [] } },
                        restaurants: { arrayValue: { values: [] } },
                        attractions: { arrayValue: { values: [] } },
                        itinerary: { arrayValue: { values: [] } },
                        documents: { arrayValue: { values: [] } },
                        weather: { arrayValue: { values: [] } },
                        news: { arrayValue: { values: [] } },
                        expenses: { arrayValue: { values: [] } },
                        shoppingItems: { arrayValue: { values: [] } },
                        secureNotes: { arrayValue: { values: [] } }
                }
        };
}

