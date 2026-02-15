
async function test() {
        try {
                const response = await fetch("https://travelplannerai.amitzahy.workers.dev/api/generate", {
                        method: "OPTIONS"
                });
                console.log("Status:", response.status);
        } catch (e) {
                console.error("Error:", e.message);
                if (e.cause) console.error("Cause:", e.cause);
        }
}
test();
