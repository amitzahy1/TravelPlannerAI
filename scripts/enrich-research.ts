/**
 * One-time enrichment of research/all-{attractions,restaurants}.json with
 * Pro-tier Google Places data (placeId, opening hours, phone, website, price level).
 *
 * Run:
 *   GOOGLE_MAPS_API_KEY=AIza... npx tsx scripts/enrich-research.ts
 *
 * Options:
 *   --only=attractions | restaurants    Process one file only
 *   --limit=N                           Stop after N enrichments (testing)
 *   --force                             Re-enrich entries even if they already have googlePlaceId
 *
 * Costs:
 *   ~260 entries × 2 Pro calls = ~520 Pro calls. Pro free tier is 5,000/month —
 *   so this should be ₪0 unless other code already burned the Pro quota this month.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ATTRACTIONS_PATH = resolve(ROOT, 'research/all-attractions.json');
const RESTAURANTS_PATH = resolve(ROOT, 'research/all-restaurants.json');

const API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? process.env.VITE_GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  console.error('Missing GOOGLE_MAPS_API_KEY (or VITE_GOOGLE_MAPS_API_KEY) env var');
  process.exit(1);
}

const args = process.argv.slice(2);
const only = args.find(a => a.startsWith('--only='))?.split('=')[1] as 'attractions' | 'restaurants' | undefined;
const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1];
const LIMIT = limitArg ? Number(limitArg) : Infinity;
const FORCE = args.includes('--force');

const PLACES_HOST = 'https://places.googleapis.com';
const SEARCH_FIELD_MASK = ['places.id', 'places.displayName', 'places.location'].join(',');
const DETAILS_FIELD_MASK = [
  'id', 'displayName',
  'regularOpeningHours', 'currentOpeningHours',
  'internationalPhoneNumber', 'websiteUri',
  'googleMapsUri', 'priceLevel',
].join(',');

interface ResearchEntry {
  name: string;
  lat?: number;
  lng?: number;
  googlePlaceId?: string;
  googleOpeningHours?: string[];
  googlePhone?: string;
  googleWebsiteUri?: string;
  googlePriceLevel?: string;
  googleEnrichedAt?: number;
  googleNotFound?: boolean;
  [k: string]: any;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

class QuotaExceededError extends Error { constructor() { super('Quota exceeded'); } }

async function findPlaceId(name: string, lat: number, lng: number): Promise<string | null> {
  const body = {
    textQuery: name,
    locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 500 } },
    maxResultCount: 1,
  };
  const res = await fetch(`${PLACES_HOST}/v1/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY!,
      'X-Goog-FieldMask': SEARCH_FIELD_MASK,
      'Referer': 'http://localhost:5173/',
    },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new QuotaExceededError();
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`searchText ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json() as any;
  return data?.places?.[0]?.id ?? null;
}

async function getPlaceDetails(placeId: string) {
  const res = await fetch(`${PLACES_HOST}/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY!,
      'X-Goog-FieldMask': DETAILS_FIELD_MASK,
      'Referer': 'http://localhost:5173/',
    },
  });
  if (res.status === 429) throw new QuotaExceededError();
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`details ${res.status}: ${txt.slice(0, 200)}`);
  }
  return await res.json() as any;
}

async function enrichEntry(entry: ResearchEntry): Promise<{ status: 'updated' | 'skipped' | 'notFound' | 'noCoords' }> {
  if (!FORCE && entry.googlePlaceId) return { status: 'skipped' };
  if (typeof entry.lat !== 'number' || typeof entry.lng !== 'number') return { status: 'noCoords' };

  let placeId = FORCE ? undefined : entry.googlePlaceId;
  if (!placeId) {
    placeId = await findPlaceId(entry.name, entry.lat, entry.lng) ?? undefined;
    await sleep(450);
  }
  if (!placeId) {
    entry.googleNotFound = true;
    entry.googleEnrichedAt = Date.now();
    return { status: 'notFound' };
  }
  const details = await getPlaceDetails(placeId);
  await sleep(450);

  entry.googlePlaceId = details.id;
  entry.googleOpeningHours = details.regularOpeningHours?.weekdayDescriptions;
  entry.googlePhone = details.internationalPhoneNumber;
  entry.googleWebsiteUri = details.websiteUri;
  entry.googlePriceLevel = details.priceLevel;
  if (details.googleMapsUri && !entry.googleMapsUrl) entry.googleMapsUrl = details.googleMapsUri;
  entry.googleEnrichedAt = Date.now();
  delete entry.googleNotFound;
  return { status: 'updated' };
}

async function processFile(path: string, key: 'attractions' | 'restaurants') {
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const list: ResearchEntry[] = raw[key];
  console.log(`\n[${key}] ${list.length} entries in ${path}`);

  const stats = { updated: 0, skipped: 0, notFound: 0, noCoords: 0, failed: 0, quotaStopped: false };
  let processedThisRun = 0;

  for (let i = 0; i < list.length; i++) {
    if (processedThisRun >= LIMIT) break;
    const entry = list[i];
    const skippable = !FORCE && entry.googlePlaceId;
    try {
      const { status } = await enrichEntry(entry);
      stats[status]++;
      if (status !== 'skipped' && status !== 'noCoords') processedThisRun++;
      const tag = status === 'updated' ? '✓' : status === 'notFound' ? '✗' : status === 'noCoords' ? '○' : '·';
      console.log(`  ${tag} [${i + 1}/${list.length}] ${entry.name}`);
    } catch (err: any) {
      if (err instanceof QuotaExceededError) {
        console.error(`  ! quota exceeded — stopping at index ${i}`);
        stats.quotaStopped = true;
        break;
      }
      stats.failed++;
      processedThisRun++;
      console.warn(`  ! [${i + 1}/${list.length}] ${entry.name} — ${err.message.slice(0, 120)}`);
    }

    // Persist every 10 successful enrichments so we can resume safely
    if (!skippable && processedThisRun % 10 === 0 && processedThisRun > 0) {
      writeFileSync(path, JSON.stringify(raw, null, 2));
    }
  }

  writeFileSync(path, JSON.stringify(raw, null, 2));
  console.log(`[${key}] done · updated=${stats.updated} skipped=${stats.skipped} notFound=${stats.notFound} noCoords=${stats.noCoords} failed=${stats.failed}${stats.quotaStopped ? ' QUOTA-STOPPED' : ''}`);
  return stats;
}

(async () => {
  console.log(`enrich-research · key=${API_KEY!.slice(0, 6)}…${API_KEY!.slice(-4)} only=${only ?? 'both'} limit=${LIMIT} force=${FORCE}`);
  if (only !== 'restaurants') await processFile(ATTRACTIONS_PATH, 'attractions');
  if (only !== 'attractions') await processFile(RESTAURANTS_PATH, 'restaurants');
  console.log('\ndone.');
})();
