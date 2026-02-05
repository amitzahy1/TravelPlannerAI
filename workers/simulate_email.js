const https = require('https');

const WORKER_URL = "https://travelplannerai.amitzahy1.workers.dev";

// Generate a random sender to ensure we don't hit "User not found" permanently
const SENDER_EMAIL = process.argv[2] || "test-traveler@example.com";

// SECRET CONFIGURATION
// This must match the 'AUTH_SECRET' you set in Cloudflare
const AUTH_SECRET = process.argv[3] || "MySecurePassword123";

const data = JSON.stringify({
        from: SENDER_EMAIL,
        content: `
From: bookings@airline.com
To: ${SENDER_EMAIL}
Subject: Flight Confirmation to London

Dear Traveler,
Your flight to London (LHR) is confirmed.
Date: 2025-06-15
Return: 2025-06-22
Airline: British Airways
Flight: BA123
PNR: TEST_PNR_${Date.now()}

Hotel: The Ritz London
Check-in: 2025-06-15
Check-out: 2025-06-22
Address: 150 Piccadilly, St. James's, London W1J 9BR
`
});

console.log(`🚀 Sending Trip Data to: ${WORKER_URL}`);
console.log(`📧 Sender: ${SENDER_EMAIL}`);
console.log(`🔑 Auth Secret: ${AUTH_SECRET.substring(0, 3)}...`);
console.log(`📦 Payload size: ${data.length} bytes`);

const req = https.request(WORKER_URL, {
        method: 'POST',
        headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length,
                'X-Auth-Token': AUTH_SECRET
        }
}, (res) => {
        let responseBody = '';

        res.on('data', (chunk) => {
                responseBody += chunk;
        });

        res.on('end', () => {
                console.log(`\nStatus Code: ${res.statusCode}`);
                console.log("Response Body:");
                console.log(responseBody);

                if (res.statusCode === 200) {
                        console.log("\n✅ Success! Check the response details above.");
                } else if (res.statusCode === 401) {
                        console.log("\n❌ Unauthorized! Check that AUTH_SECRET matches in Cloudflare and this script.");
                } else {
                        console.log("\n❌ Failed. Read the error message above to debug.");
                }
        });
});

req.on('error', (error) => {
        console.error(`Error sending request: ${error.message}`);
});

req.write(data);
req.end();
