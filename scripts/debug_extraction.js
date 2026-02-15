
import fs from "fs";
import path from "path";

// --- CONFIG ---
const WORKER_URL = "https://travelplannerai.amitzahy1.workers.dev/api/generate";
const PDF_PATH = "/Users/amitzahy/Documents/Draft/travel-planner-pro/itinerary-4299947-20251012-212733 (2).pdf";

// --- SCHEMA (Same as Worker) ---
const WORKER_TRIP_SCHEMA = {
        type: "OBJECT",
        properties: {
                tripMetadata: {
                        type: "OBJECT",
                        properties: {
                                suggestedName: { type: "STRING" },
                                mainDestination: { type: "STRING" },
                                mainCountry: { type: "STRING" },
                                startDate: { type: "STRING" },
                                endDate: { type: "STRING" }
                        },
                        required: ["suggestedName", "startDate", "endDate"]
                },
                categories: {
                        type: "OBJECT",
                        properties: {
                                transport: {
                                        type: "ARRAY",
                                        items: {
                                                type: "OBJECT",
                                                properties: {
                                                        type: { type: "STRING", enum: ["flight", "train", "bus", "ferry", "cruise", "car_rental", "other"] },
                                                        data: {
                                                                type: "OBJECT",
                                                                properties: {
                                                                        airline: { type: "STRING" },
                                                                        flightNumber: { type: "STRING" },
                                                                        pnr: { type: "STRING" },
                                                                        passengers: { type: "ARRAY", items: { type: "STRING" } },
                                                                        departure: {
                                                                                type: "OBJECT",
                                                                                properties: { city: { type: "STRING" }, iata: { type: "STRING" }, isoDate: { type: "STRING" }, time: { type: "STRING" } }
                                                                                // REMOVED required: ["isoDate", "time"] to allow partial extraction
                                                                        },
                                                                        arrival: {
                                                                                type: "OBJECT",
                                                                                properties: { city: { type: "STRING" }, iata: { type: "STRING" }, isoDate: { type: "STRING" }, time: { type: "STRING" } }
                                                                                // REMOVED required: ["isoDate", "time"]
                                                                        },
                                                                        price: { type: "OBJECT", properties: { amount: { type: "NUMBER" }, currency: { type: "STRING" } } }
                                                                }
                                                        }
                                                },
                                                required: ["type", "data"]
                                        }
                                }
                        }
                }
        }
};

const SYSTEM_PROMPT = `
You are an Elite Travel Document Intelligence System.

TASK: Extract travel details from the provided document into a structured JSON object.

CRITICAL RULES FOR THIS SPECIFIC TICKET (ISRAIR):
1.  **Dates**: The ticket uses "DD.MM.YYYY" (e.g., 30.03.2026). CONVERT TO ISO 8601 "YYYY-MM-DD" (2026-03-30).
2.  **Cities**:
    -   "TEL AVIV TERMINAL 3" -> City: "Tel Aviv", IATA: "TLV"
    -   "TBILISI" -> City: "Tbilisi", IATA: "TBS"
    -   "BATUMI" -> City: "Batumi", IATA: "BUS"
3.  **Flights**:
    -   Extract Airline (Israir), Flight Number (e.g., "6H 897"), Match PNR (e.g., "4299947").
    -   **Round Trip**: You MUST create TWO separate flight objects.
        -   Flight 1: Tel Aviv -> Tbilisi
        -   Flight 2: Tbilisi -> Tel Aviv (if found)
4.  **Passengers**: Extract all passenger names into a single unique list in the 'passengers' array. Do NOT create duplicate flight entries for each passenger.

OUTPUT FORMAT (JSON):
{
  "tripMetadata": {
    "suggestedName": "Trip to ...",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "mainCountry": "..."
  },
  "categories": {
    "transport": [
      {
        "type": "flight",
        "data": {
           "departure": { "city": "...", "iata": "...", "isoDate": "YYYY-MM-DD", "time": "HH:MM" },
           "arrival": { "city": "...", "iata": "...", "isoDate": "YYYY-MM-DD", "time": "HH:MM" },
           "airline": "...",
           "flightNumber": "...",
           "passengers": ["Name 1", "Name 2"]
        }
      }
    ]
  }
}
`;

async function main() {
        console.log("Checking PDF path...");
        if (!fs.existsSync(PDF_PATH)) {
                console.error("PDF not found:", PDF_PATH);
                return;
        }

        // Read PDF and convert to Base64
        const pdfBuffer = fs.readFileSync(PDF_PATH);
        const base64Data = pdfBuffer.toString("base64");
        console.log(`PDF read. Size: ${pdfBuffer.length} bytes.`);

        // Construct Payload
        const payload = {
                Model: "gemini-3-pro-preview",
                generationConfig: {
                        responseMimeType: "application/json"
                        // removed responseSchema to allow flexible extraction
                },
                contents: [{
                        role: "user",
                        parts: [
                                { text: SYSTEM_PROMPT },
                                {
                                        inlineData: {
                                                mimeType: "application/pdf",
                                                data: base64Data
                                        }
                                }
                        ]
                }]
        };

        console.log(`Sending to Worker: ${WORKER_URL}...`);
        try {
                const res = await fetch(WORKER_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                });

                if (!res.ok) {
                        console.error(`Worker Error: ${res.status} ${res.statusText}`);
                        const text = await res.text();
                        console.error(text);
                        return;
                }

                const data = await res.json();
                console.log("--- RAW AI RESPONSE ---");
                console.log(data.text); // This is the raw string from Gemini

                try {
                        const json = JSON.parse(data.text);
                        console.log("\n--- PARSED DATA STRUCTURE (FULL) ---");
                        console.log(JSON.stringify(json, null, 2)); // Log EVERYTHING

                        const transports = json.categories?.transport || [];
                        console.log(`\nFound ${transports.length} transport items.`);
                        transports.forEach((t, i) => {
                                console.log(`#${i + 1}: ${t.type} - ${t.data?.departure?.city} (${t.data?.departure?.iata}) to ${t.data?.arrival?.city} (${t.data?.arrival?.iata})`);
                        });

                } catch (e) {
                        console.error("JSON Parse Error:", e);
                }
        } catch (e) {
                console.error("Fetch Error:", e);
        }
}

main();
