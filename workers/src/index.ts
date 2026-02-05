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
        console.log(`Received email from: ${from}`);
        const logs: string[] = [];

        try {
                // 1. Get Access Token for Firebase
                const token = await getFirebaseAccessToken(env, logs);
                if (!token) throw new Error("Failed to authenticate with Firebase. Check logs.");

                // 2. Map Sender to UID
                const senderEmail = from;
                const uid = await getUserByEmail(senderEmail, env.FIREBASE_PROJECT_ID, token);

                if (!uid) {
                        return { success: false, message: `User not found for email: ${senderEmail}`, logs };
                }

                // 3. Parse Email Content
                const rawEmail = await streamToString(rawStream);

                // 4. Extract Trip Data with Gemini
                const tripData = await extractTripDataWithGemini(rawEmail, env.GEMINI_API_KEY);

                if (!tripData) {
                        return { success: false, message: "No trip data found in email.", logs };
                }

                // 5. Write to Firestore
                await writeTripToFirestore(uid, tripData, env.FIREBASE_PROJECT_ID, token);

                return { success: true, message: `Successfully processed email for user ${uid}`, tripData, logs };

        } catch (error: any) {
                console.error("Error processing email:", error);
                return { success: false, error: error.message, stack: error.stack, logs };
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
        } catch (e) {
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
        // Create a new document in the user's trips collection
        // We'll map the clean JSON from Gemini to Firestore structure

        // Firestore REST API Endpoint
        // Structure: projects/{projectId}/databases/(default)/documents/users/{uid}/trips
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}/trips`;

        // Firestore requires a specific object format ("fields": { "key": { "stringValue": "val" } })
        // We will use a lightweight helper or just do simple conversion for the MVP fields.

        const firestoreDoc = mapJsonToFirestore(tripData);

        await fetch(url, {
                method: 'POST',
                headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(firestoreDoc)
        });
}

// --- HELPERS: GEMINI ---

async function extractTripDataWithGemini(emailText: string, apiKey: string): Promise<any> {
        // Gemini Flash 2.0 or 1.5
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
		},
		"hotels": [
			{ "name": "Hotel Name", "address": "string", "checkIn": "string", "checkOut": "string" }
		]
	}

	Email Content:
	${emailText.substring(0, 50000)} 
	`;
        // Limit text for context window if needed, though Flash has large context.

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

// Simplified Mapper for Firestore REST (Keys need to be mapped to types)
function mapJsonToFirestore(data: any): any {
        // Root object for Firestore create
        return {
                fields: {
                        name: { stringValue: data.name || "Imported Trip" },
                        destination: { stringValue: data.destination || "" },
                        dates: { stringValue: data.startDate ? `${data.startDate} - ${data.endDate}` : "" },
                        isShared: { booleanValue: false },
                        importedAt: { timestampValue: new Date().toISOString() },
                        // Complex objects like flights/hotels usually stored as maps or arrays of maps
                        // For MVP, we'll just store the raw JSON string or essential fields
                        flights: {
                                mapValue: {
                                        fields: {
                                                pnr: { stringValue: data.flights?.pnr || "" },
                                                passengerName: { stringValue: "Imported User" }
                                        }
                                }
                        }
                }
        };
}
