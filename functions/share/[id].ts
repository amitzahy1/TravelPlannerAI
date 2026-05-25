/**
 * Cloudflare Pages Function — share-link OG preview for WhatsApp /
 * Facebook / Twitter etc.
 *
 * Mirrors the existing Worker /share route but serves it from the same
 * domain as the SPA (Pages), so the URL the user copies doesn't expose
 * the Cloudflare account name ("amitzahy1") that's baked into the
 * default `<account>.workers.dev` host. Pages domains are of the form
 * `<project>.pages.dev` — no account name.
 *
 * Reads `trip_invites/{shareId}` from Firestore using the PUBLIC Web
 * API key (intentionally exposed; the trip_invites collection has
 * `allow get: if true` so any client can read by exact ID). No service
 * account needed.
 */

interface Env {
        FIREBASE_PROJECT_ID: string;
        FIREBASE_API_KEY: string;
        // Optional override — useful for non-production deploys. Defaults to
        // the current request origin so the redirect always lands the user
        // back on the same host they came from.
        APP_HOST?: string;
}

const htmlEscape = (raw: string | undefined | null): string => {
        if (raw === null || raw === undefined) return "";
        return String(raw)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
};

interface ShareInvite {
        tripName?: string;
        destination?: string;
        dates?: string;
        coverImage?: string;
        hostName?: string;
}

async function fetchShareInvite(shareId: string, env: Env): Promise<ShareInvite | null> {
        if (!shareId || !env.FIREBASE_PROJECT_ID || !env.FIREBASE_API_KEY) {
                console.warn(`[share] missing config: shareId=${!!shareId} projectId=${!!env.FIREBASE_PROJECT_ID} apiKey=${!!env.FIREBASE_API_KEY}`);
                return null;
        }
        const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/trip_invites/${encodeURIComponent(shareId)}?key=${encodeURIComponent(env.FIREBASE_API_KEY)}`;
        const res = await fetch(url);
        if (!res.ok) {
                const body = await res.text().catch(() => '<unreadable>');
                console.warn(`[share] trip_invites/${shareId} → ${res.status} ${res.statusText} body=${body.slice(0, 300)}`);
                return null;
        }
        const data: any = await res.json();
        const f = data?.fields || {};
        return {
                tripName: f.tripName?.stringValue,
                destination: f.destination?.stringValue,
                dates: f.dates?.stringValue,
                coverImage: f.coverImage?.stringValue,
                hostName: f.hostName?.stringValue,
        };
}

function renderSharePreviewHtml(shareId: string, role: string, invite: ShareInvite | null, appHost: string): string {
        const safeShareId = encodeURIComponent(shareId);
        const safeRole = encodeURIComponent(role || "viewer");
        // SPA uses hash routing — the hash is never sent to the server, so
        // social scrapers always end up here. Humans get redirected to the
        // hash route, which the SPA's router picks up.
        const target = `${appHost.replace(/\/$/, '')}/#/join/${safeShareId}?role=${safeRole}`;

        const tripName = invite?.tripName?.trim();
        const destination = invite?.destination?.trim();
        const dates = invite?.dates?.trim();
        const cover = invite?.coverImage?.trim();

        const containsCI = (haystack: string, needle: string) =>
                haystack.toLowerCase().includes(needle.toLowerCase());
        let title: string;
        if (tripName && destination) {
                if (containsCI(tripName, destination) || containsCI(destination, tripName)) {
                        title = tripName.length >= destination.length ? tripName : destination;
                } else {
                        title = `${tripName} · ${destination}`;
                }
        } else {
                title = tripName || destination || "WeTravel — שיתוף טיול";
        }

        const description = dates || "פתח את הקישור כדי לצפות בפרטי הטיול";

        const ogImage = cover || `${appHost.replace(/\/$/, '')}/og-default.png`;

        const safeTitle = htmlEscape(title);
        const safeDesc = htmlEscape(description);
        const safeImage = htmlEscape(ogImage);
        const safeTarget = htmlEscape(target);

        return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeTitle}</title>
<meta name="description" content="${safeDesc}" />

<meta property="og:type" content="website" />
<meta property="og:site_name" content="WeTravel" />
<meta property="og:title" content="${safeTitle}" />
<meta property="og:description" content="${safeDesc}" />
<meta property="og:image" content="${safeImage}" />
<meta property="og:image:alt" content="${safeTitle}" />
<meta property="og:url" content="${safeTarget}" />
<meta property="og:locale" content="he_IL" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${safeTitle}" />
<meta name="twitter:description" content="${safeDesc}" />
<meta name="twitter:image" content="${safeImage}" />

<link rel="canonical" href="${safeTarget}" />
<meta http-equiv="refresh" content="0; url=${safeTarget}" />
<script>window.location.replace(${JSON.stringify(target)});</script>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Heebo, Rubik, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 48px 24px; text-align: center; }
.card { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(15,23,42,0.08); }
h1 { margin: 0 0 8px; font-size: 20px; }
p { margin: 4px 0; color: #475569; }
a { color: #2563eb; text-decoration: none; font-weight: bold; }
</style>
</head>
<body>
<div class="card">
<h1>${safeTitle}</h1>
<p>${safeDesc}</p>
<p style="margin-top:16px"><a href="${safeTarget}">פתח את הטיול</a></p>
</div>
</body>
</html>`;
}

// Pages Function entry — typed inline so we don't need to install
// @cloudflare/workers-types in the SPA project (the runtime provides
// PagesFunction at execution time).
interface PagesFunctionContext {
        request: Request;
        env: Env;
        params: { id: string };
}

export const onRequestGet = async ({ request, env, params }: PagesFunctionContext): Promise<Response> => {
        const shareId = decodeURIComponent(String(params.id || ""));
        const url = new URL(request.url);
        const role = (url.searchParams.get("role") || "viewer").toLowerCase();

        // Redirect back to whichever host the scraper hit us at. That keeps
        // the SPA + share preview on the same domain end-to-end.
        const appHost = env.APP_HOST?.trim() || `${url.protocol}//${url.host}`;

        const headers = {
                "Content-Type": "text/html; charset=utf-8",
                // Edge-cache OG responses for a minute so a flurry of scraper
                // hits from one shared link doesn't slam Firestore.
                "Cache-Control": "public, max-age=60",
        };
        if (!shareId) {
                return new Response(renderSharePreviewHtml("", role, null, appHost), { status: 404, headers });
        }
        const invite = await fetchShareInvite(shareId, env);
        return new Response(renderSharePreviewHtml(shareId, role, invite, appHost), {
                status: invite ? 200 : 404,
                headers,
        });
};
