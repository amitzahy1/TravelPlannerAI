/**
 * Background research — kicks off restaurant + attraction AI research for a
 * freshly-created trip without blocking the UI. Runs client-side while the
 * tab is open; persists results to Firestore as each city completes so the
 * user sees progressive data when they reach the tabs.
 *
 * NOTE: this is client-side. If the user closes the browser mid-research the
 * job stops — remaining cities simply won't be researched. That's acceptable
 * because the user can always click "Research All" manually later.
 */

import type { Trip, RestaurantCategory, AttractionCategory } from '../types';
import { generateWithFallback } from './aiService';
import { saveSingleTrip } from './storageService';
import { displayCityName, getTripCities } from '../utils/geoData';
import { stripChainRestaurants } from '../utils/chainRestaurants';
import { stripClosedPlaces } from '../utils/closedPlaceFilter';
import { looksLikeAddress } from '../utils/nameValidation';
import { verifyPlacesBatch, applyVerificationResult } from '../utils/placeVerification';
import { toast } from '../stores/useToastStore';
import { findCuisineProfile, buildAuthenticFoodSpec } from './localCuisineCatalog';

// Per-trip lock — prevents firing a second background research run for a
// trip that's already being researched (e.g. when the user hits the reset
// button twice, or when the module re-mounts).
const inFlightTrips = new Set<string>();

// Slim research prompts — Google Search grounding does the heavy lifting,
// so we don't enumerate worldwide authority sources or full chain lists.
const buildRestaurantPrompt = (city: string, countryHint?: string) => {
const currentDate = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const cuisineProfile = findCuisineProfile(city, countryHint);
const authenticSpec = buildAuthenticFoodSpec(cuisineProfile);
return `
Find the BEST restaurants in "${city}" as of ${currentDate}. Use Google Search
to verify each place is currently OPERATIONAL — omit "Permanently closed",
"Temporarily closed", or anything you're <90% sure is open today.

QUOTA: 6–8 real restaurants per category (aim 8 in major food cities).
Empty array only if the category genuinely has nothing. Every "location"
must be in or near "${city}".

CATEGORIES (use EXACTLY these Hebrew titles):
1. "אוכל מקומי אותנטי"  2. "יוקרה ומישלן"  3. "ברי קוקטיילים"
4. "מסעדות משפחתיות"  5. "ראמן"  6. "פיצה"
7. "המבורגר"  8. "בתי קפה וקינוחים"  9. "תאילנדי"  10. "יפני"

SPEC FOR "אוכל מקומי אותנטי":
${authenticSpec}

EXCLUDE GLOBAL/REGIONAL CHAINS — McDonald's, KFC, Burger King, Subway,
Pizza Hut, Domino's, Papa John's, Pizza Company, Pizza Marzano, Starbucks,
Costa, Krispy Kreme, Dunkin', etc. Better an empty category than chain-padded.

NAME INTEGRITY (CRITICAL): "name"/"nameEnglish" must be the venue display
name. NEVER use a street address, "Moo X", "Soi Y", or coordinates as the
name. If you can't find a real venue name, OMIT the entry.

For each restaurant set "recommendationSource" to the specific authority
where you found it (e.g. "Michelin Guide", "Time Out", "Wongnai", "r/Bangkok").
"Local Favorite" or "Top-Rated" only as last fallback.

For "googleMapsUrl": include the actual URL from search results, not a
guessed one. Omit the field if you don't have one.

For "cuisineTags": 1–4 lowercase-English markers (e.g. ["tom yum","pad thai"],
["pizza","napoletana"]).

Descriptions in HEBREW. "nameEnglish" REQUIRED = Latin-script display name.
"business_status" REQUIRED ∈ {OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY}.
OUTPUT JSON ONLY:
{ "categories": [ { "id", "title", "restaurants": [ { "name", "nameEnglish", "description", "location", "cuisine", "cuisineTags", "googleRating", "recommendationSource", "isHotelRestaurant", "googleMapsUrl", "business_status" } ] } ] }
`; };

const buildAttractionPrompt = (city: string) => {
const currentDate = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
return `
Find the best, most-talked-about attractions in "${city}" as of ${currentDate}.
Include iconic tourist spots (water parks, cabaret shows, aquariums, night
markets, cultural villages) — they're highly rated for a reason. Use Google
Search to verify each place is operational; omit permanently closed or
indefinitely under-renovation venues.

QUOTA: 3–5 real attractions per category (aim 5). Empty array only if the
city truly has none. Every "location" must be in or near "${city}".

CATEGORIES (use EXACTLY these Hebrew titles):
1. "אתרי חובה"  2. "טבע ונופים"  3. "מוזיאונים ותרבות"  4. "קניות ושווקים"
5. "אקסטרים ופעילויות"  6. "חופים ומים"  7. "למשפחות וילדים"
8. "היסטוריה ודת"  9. "חיי לילה ואווירה"  10. "פינות נסתרות"

An attraction can appear in two categories if equally relevant.

NAME INTEGRITY (CRITICAL): "name"/"nameEnglish" must be the venue display
name (e.g. "Wat Pho", "Tiffany's Show Pattaya"). NEVER use a street address,
"Moo X", or coordinates as the name. Omit if no real venue name found.

"recommendationSource" = the specific source ("Lonely Planet", "Atlas Obscura",
"UNESCO", "Time Out", local tourism board). "Top-Rated"/"Local Favorite" only
as fallback.

"googleMapsUrl": only the actual URL from search results — never fabricated.

"nameEnglish" REQUIRED. "business_status" REQUIRED ∈ {OPERATIONAL,
CLOSED_TEMPORARILY, CLOSED_PERMANENTLY}.
OUTPUT JSON ONLY:
{ "categories": [ { "id", "title", "attractions": [ { "name", "nameEnglish", "description", "location", "rating", "type", "price", "recommendationSource", "googleMapsUrl", "business_status" } ] } ] }
`; };

interface ResearchOptions {
        onProgress?: (phase: 'food' | 'attractions', current: number, total: number) => void;
        onComplete?: (phase: 'food' | 'attractions') => void;
        persistPatch?: (patch: Pick<Partial<Trip>, 'aiRestaurants' | 'aiAttractions'>) => Promise<void>;
}

const extractCategoriesList = (rawData: any): any[] => {
        if (rawData?.categories) {
                return Array.isArray(rawData.categories)
                        ? rawData.categories
                        : Object.values(rawData.categories);
        }
        return Array.isArray(rawData) ? rawData : [];
};

const researchRestaurantsForTrip = async (
        trip: Trip,
        userId: string | undefined,
        opts: ResearchOptions
): Promise<Trip> => {
        const cities = getTripCities(trip, { excludeFlightOnly: true });
        if (cities.length === 0) return trip;

        let accumulated: RestaurantCategory[] = [...(trip.aiRestaurants || [])];

        for (let i = 0; i < cities.length; i++) {
                opts.onProgress?.('food', i + 1, cities.length);
                const city = cities[i];
                const cityEn = displayCityName(city, 'en');
                try {
                        // First pass: standard prompt
                        const firstPrompt = buildRestaurantPrompt(cityEn, trip.destinationEnglish || trip.destination);
                        let response = await generateWithFallback(
                                null,
                                [{ role: 'user', parts: [{ text: firstPrompt }] }],
                                { responseMimeType: 'application/json', temperature: 0.1 },
                                'SEARCH'
                        );
                        let rawData = JSON.parse(response.text || '{}');
                        let categoriesList = extractCategoriesList(rawData);

                        // Count restaurants in this first pass
                        const firstCount = categoriesList.reduce((sum: number, c: any) => sum + (c.restaurants?.length || 0), 0);

                        // Retry path: if a city returned < 8 restaurants total
                        // (Koh Chang / Trat / smaller islands), re-prompt asking
                        // the AI to search harder and include smaller local
                        // shops, ferry-pier eateries, markets.
                        if (firstCount < 8) {
                                console.log(`[bgResearch] ${city} first pass = ${firstCount}, retrying`);
                                const retryPrompt = `${firstPrompt}

⚠️ RETRY CONTEXT: Previous search for "${cityEn}" returned only ${firstCount} restaurants. This city is smaller/less documented. Search HARDER this time — include:
- Small local shops, street food legends, ferry-pier eateries
- Hotel restaurants (flag isHotelRestaurant: true)
- Market food courts and night markets
- Beach shacks and roadside stops worth trying
- Traveller-favourite spots from forums (Rick Steves, Reddit r/thailand, blog reviews)

Still return the same 10-category JSON shape, but aim for 15-25 total restaurants minimum.`;
                                try {
                                        const retry = await generateWithFallback(
                                                null,
                                                [{ role: 'user', parts: [{ text: retryPrompt }] }],
                                                { responseMimeType: 'application/json', temperature: 0.2 },
                                                'SEARCH'
                                        );
                                        const retryData = JSON.parse(retry.text || '{}');
                                        const retryList = extractCategoriesList(retryData);
                                        const retryCount = retryList.reduce((sum: number, c: any) => sum + (c.restaurants?.length || 0), 0);
                                        if (retryCount > firstCount) {
                                                categoriesList = retryList;
                                                console.log(`[bgResearch] ${city} retry ${retryCount} > first ${firstCount}; using retry`);
                                        }
                                } catch (retryErr) {
                                        console.warn(`[bgResearch] retry for ${city} failed, using first pass`, retryErr);
                                }
                        }
                        if (!categoriesList.length) continue;

                        const processed = categoriesList.map((c: any, idx: number) => ({
                                ...c,
                                id: c.id || `ai-food-cat-${city}-${idx}-${Date.now()}`,
                                region: city,
                                // Frontend safety-net: even with the prompt's hard exclusion list,
                                // the model occasionally slips chains through (Pizza Company,
                                // Burger King observed). Strip them here so they never reach the UI.
                                restaurants: stripClosedPlaces(stripChainRestaurants(c.restaurants || []) as any[])
                                        .filter((r: any) => !(looksLikeAddress(r.name) && looksLikeAddress(r.nameEnglish || '')))
                                        .map((r: any, j: number) => ({
                                        ...r,
                                        region: r.region || city,
                                        id: `ai-rec-${city}-${idx}-${Math.random().toString(36).slice(2, 7)}-${j}`,
                                        categoryTitle: c.title,
                                })),
                        }));

                        // Verify + geocode this city's restaurants BEFORE the merge.
                        // Photon-based, free; mutates each item in place with lat/lng,
                        // osmId, verificationStatus, verifiedAt. Failed items get
                        // geocodeFailed: true so the Data Health panel can count them.
                        const flatRestaurants = processed.flatMap((c: any) => c.restaurants || []);
                        await verifyPlacesBatch(
                                flatRestaurants.map((r: any) => ({
                                        id: r.id,
                                        name: r.name,
                                        location: r.location,
                                        googleMapsUrl: r.googleMapsUrl,
                                        countryHint: cityEn,
                                })),
                                trip,
                                (id, result) => {
                                        const target = flatRestaurants.find((r: any) => r.id === id);
                                        if (target) applyVerificationResult(target, result);
                                },
                                {
                                        onFail: (id) => {
                                                const target = flatRestaurants.find((r: any) => r.id === id);
                                                if (target) target.geocodeFailed = true;
                                        },
                                },
                        );

                        // Per-category retry — count verified items per category;
                        // if any category has <5, run a targeted second pass at
                        // higher temperature with an "expand to neighborhoods +
                        // long-tail sources" addendum. Catches the "1 pizza in
                        // Pattaya" failure mode where the model gave up early.
                        const undersized = processed.filter((c: any) => {
                                const verified = (c.restaurants || []).filter((r: any) => r.verificationStatus === 'verified').length;
                                return verified < 5 && (c.restaurants || []).length < 8;
                        });
                        if (undersized.length > 0) {
                                const titles = undersized.map((c: any) => c.title).join(', ');
                                console.log(`[bgResearch] ${city} undersized categories: ${titles} — running per-category retry`);
                                const retryPrompt = `Retry only these categories for "${cityEn}" — they came back with too few real, verified results in the first pass: ${titles}.

Cast a wider net this time:
- Search neighborhood-level (not just city-level): include suburbs, beach areas, market districts, expat hubs.
- Include long-tail aggregators: TripAdvisor city subforum, Reddit r/<city>, local FB food groups, Burpple, Foodpanda highlights, Wongnai sub-categories, expat blog posts.
- Aim for 6-8 places per category. Better to over-shoot and let downstream verification cut.
- All other rules from the original prompt still apply (no closed places, real venue names not addresses, business_status REQUIRED, cuisineTags array, etc.).
- Return JSON in the SAME shape as before, but only for these categories: ${titles}.`;

                                try {
                                        const retryResp = await generateWithFallback(
                                                null,
                                                [{ role: 'user', parts: [{ text: `${firstPrompt}\n\n${retryPrompt}` }] }],
                                                { responseMimeType: 'application/json', temperature: 0.3 },
                                                'SEARCH',
                                        );
                                        const retryData = JSON.parse(retryResp.text || '{}');
                                        const retryCats = extractCategoriesList(retryData);
                                        let retryAddCount = 0;
                                        retryCats.forEach((rc: any) => {
                                                const target = processed.find((p: any) => p.title === rc.title);
                                                if (!target) return;
                                                const existingNames = new Set(target.restaurants.map((r: any) => (r.name || '').trim().toLowerCase()));
                                                const cleaned = stripClosedPlaces(stripChainRestaurants(rc.restaurants || []) as any[])
                                                        .filter((r: any) => !(looksLikeAddress(r.name) && looksLikeAddress(r.nameEnglish || '')))
                                                        .filter((r: any) => !existingNames.has((r.name || '').trim().toLowerCase()));
                                                cleaned.forEach((r: any, j: number) => {
                                                        target.restaurants.push({
                                                                ...r,
                                                                region: r.region || city,
                                                                id: `ai-rec-retry-${city}-${rc.title}-${Math.random().toString(36).slice(2, 7)}-${j}`,
                                                                categoryTitle: rc.title,
                                                        });
                                                        retryAddCount++;
                                                });
                                        });
                                        if (retryAddCount > 0) {
                                                // Re-verify only the new items.
                                                const newItems = processed.flatMap((c: any) => (c.restaurants || []).filter((r: any) => !r.verificationStatus));
                                                if (newItems.length > 0) {
                                                        await verifyPlacesBatch(
                                                                newItems.map((r: any) => ({ id: r.id, name: r.name, location: r.location, googleMapsUrl: r.googleMapsUrl, countryHint: cityEn })),
                                                                trip,
                                                                (id, result) => {
                                                                        const t = newItems.find((r: any) => r.id === id);
                                                                        if (t) applyVerificationResult(t, result);
                                                                },
                                                                { onFail: (id) => { const t = newItems.find((r: any) => r.id === id); if (t) t.geocodeFailed = true; } },
                                                        );
                                                }
                                                console.log(`[bgResearch] ${city} per-category retry added ${retryAddCount} items across ${retryCats.length} categories`);
                                        } else {
                                                console.log(`[bgResearch] ${city} per-category retry returned 0 new items`);
                                        }
                                } catch (retryErr) {
                                        console.warn(`[bgResearch] per-category retry for ${city} failed`, retryErr);
                                }
                        }

                        processed.forEach((newCat: any) => {
                                const existingIdx = accumulated.findIndex(c => c.title === newCat.title);
                                if (existingIdx !== -1) {
                                        const existing = accumulated[existingIdx].restaurants;
                                        newCat.restaurants.forEach((nr: any) => {
                                                if (!existing.some(er => er.name === nr.name)) existing.push(nr);
                                        });
                                } else {
                                        accumulated.push(newCat);
                                }
                        });

                        // Structured per-city summary so we can audit quality across
                        // runs (where did the AI struggle? which categories came back
                        // small?). Single console.log of structured JSON keeps it
                        // grep-friendly.
                        const summary = {
                                kind: 'bgResearch.foodCityComplete',
                                city,
                                totalCategories: processed.length,
                                totalItems: processed.reduce((s: number, c: any) => s + (c.restaurants?.length || 0), 0),
                                verified: processed.reduce((s: number, c: any) => s + (c.restaurants || []).filter((r: any) => r.verificationStatus === 'verified').length, 0),
                                ambiguous: processed.reduce((s: number, c: any) => s + (c.restaurants || []).filter((r: any) => r.verificationStatus === 'ambiguous').length, 0),
                                notFound: processed.reduce((s: number, c: any) => s + (c.restaurants || []).filter((r: any) => r.verificationStatus === 'not_found').length, 0),
                                undersizedCategories: processed
                                        .filter((c: any) => (c.restaurants || []).filter((r: any) => r.verificationStatus === 'verified').length < 5)
                                        .map((c: any) => `${c.title}(${(c.restaurants || []).length})`),
                        };
                        console.log('[bgResearch] city summary', JSON.stringify(summary));

                        // Persist after every city so the UI sees partial results
                        try {
                                if (opts.persistPatch) await opts.persistPatch({ aiRestaurants: accumulated });
                                else await saveSingleTrip({ ...trip, aiRestaurants: accumulated }, userId);
                        } catch (e) { console.warn('[bgResearch] partial save failed', e); }
                } catch (cityErr) {
                        console.error(`[bgResearch] food research for ${city} failed`, cityErr);
                }
        }

        opts.onComplete?.('food');
        return { ...trip, aiRestaurants: accumulated };
};

const researchAttractionsForTrip = async (
        trip: Trip,
        userId: string | undefined,
        opts: ResearchOptions
): Promise<Trip> => {
        const cities = getTripCities(trip, { excludeFlightOnly: true });
        if (cities.length === 0) return trip;

        let accumulated: AttractionCategory[] = [...(trip.aiAttractions || [])];

        for (let i = 0; i < cities.length; i++) {
                opts.onProgress?.('attractions', i + 1, cities.length);
                const city = cities[i];
                const cityEn = displayCityName(city, 'en');
                try {
                        const prompt = buildAttractionPrompt(cityEn);
                        const response = await generateWithFallback(
                                null,
                                [{ role: 'user', parts: [{ text: prompt }] }],
                                { temperature: 0.2 },
                                'SEARCH'
                        );
                        const rawData = JSON.parse(response.text || '{}');
                        let categoriesList = extractCategoriesList(rawData);
                        if (!categoriesList.length) continue;

                        const processed = categoriesList.map((c: any, idx: number) => ({
                                ...c,
                                id: c.id || `ai-cat-${city}-${idx}-${Date.now()}`,
                                region: city,
                                attractions: stripClosedPlaces(c.attractions || [])
                                        .filter((a: any) => !(looksLikeAddress(a.name) && looksLikeAddress(a.nameEnglish || '')))
                                        .map((a: any, j: number) => ({
                                        ...a,
                                        region: a.region || city,
                                        id: `ai-attr-${city}-${idx}-${Math.random().toString(36).slice(2, 7)}-${j}`,
                                        categoryTitle: c.title,
                                })),
                        }));

                        // Same verification step as the restaurants path.
                        const flatAttractions = processed.flatMap((c: any) => c.attractions || []);
                        await verifyPlacesBatch(
                                flatAttractions.map((a: any) => ({
                                        id: a.id,
                                        name: a.name,
                                        location: a.location,
                                        googleMapsUrl: a.googleMapsUrl,
                                        countryHint: cityEn,
                                })),
                                trip,
                                (id, result) => {
                                        const target = flatAttractions.find((a: any) => a.id === id);
                                        if (target) applyVerificationResult(target, result);
                                },
                                {
                                        onFail: (id) => {
                                                const target = flatAttractions.find((a: any) => a.id === id);
                                                if (target) target.geocodeFailed = true;
                                        },
                                },
                        );

                        processed.forEach((newCat: any) => {
                                const existingIdx = accumulated.findIndex(c => c.title === newCat.title);
                                if (existingIdx !== -1) {
                                        const existing = accumulated[existingIdx].attractions;
                                        newCat.attractions.forEach((na: any) => {
                                                if (!existing.some(ea => ea.name === na.name)) existing.push(na);
                                        });
                                } else {
                                        accumulated.push(newCat);
                                }
                        });

                        try {
                                if (opts.persistPatch) await opts.persistPatch({ aiAttractions: accumulated });
                                else await saveSingleTrip({ ...trip, aiAttractions: accumulated }, userId);
                        } catch (e) { console.warn('[bgResearch] partial save failed', e); }
                } catch (cityErr) {
                        console.error(`[bgResearch] attraction research for ${city} failed`, cityErr);
                }
        }

        opts.onComplete?.('attractions');
        return { ...trip, aiAttractions: accumulated };
};

/**
 * Fire-and-forget background research for a freshly-created trip.
 * Runs food + attraction research in parallel so they finish in roughly
 * the time of the longer of the two, not sequentially.
 *
 * Skips research for a data type if it's already populated (lets the user
 * preserve their existing curated research across trip edits).
 */
export const runBackgroundResearch = (
        trip: Trip,
        userId: string | undefined
): Promise<void> => {
        if (inFlightTrips.has(trip.id)) {
                console.log('[bgResearch] already running for', trip.id);
                return Promise.resolve();
        }

        const needsFood = !trip.aiRestaurants || trip.aiRestaurants.length === 0;
        const needsAttractions = !trip.aiAttractions || trip.aiAttractions.length === 0;
        if (!needsFood && !needsAttractions) {
                console.log('[bgResearch] nothing to do for', trip.id);
                return Promise.resolve();
        }

        inFlightTrips.add(trip.id);
        console.log('[bgResearch] starting for trip', trip.id);
        toast.info('🔍 מחקר אוכל ואטרקציות רץ ברקע…', 4000);

        let latestTrip: Trip = { ...trip };
        let saveQueue = Promise.resolve();
        const persistPatch: ResearchOptions['persistPatch'] = async (patch) => {
                latestTrip = { ...latestTrip, ...patch };
                const snapshot = latestTrip;
                saveQueue = saveQueue.catch(() => undefined).then(() => saveSingleTrip(snapshot, userId));
                return saveQueue;
        };

        const opts: ResearchOptions = {
                onProgress: (phase, c, t) => console.log(`[bgResearch] ${phase} ${c}/${t}`),
                onComplete: (phase) => console.log(`[bgResearch] ${phase} done`),
                persistPatch,
        };

        let foodFailed = false;
        let attractionsFailed = false;

        const tasks: Promise<any>[] = [];
        if (needsFood) {
                tasks.push(researchRestaurantsForTrip(trip, userId, opts).catch(e => {
                        console.error('[bgResearch] food failed', e);
                        foodFailed = true;
                }));
        }
        if (needsAttractions) {
                tasks.push(researchAttractionsForTrip(trip, userId, opts).catch(e => {
                        console.error('[bgResearch] attractions failed', e);
                        attractionsFailed = true;
                }));
        }

        return Promise.all(tasks)
                .then(() => saveQueue.catch(() => undefined))
                .then(() => {
                        console.log('[bgResearch] all phases complete for trip', trip.id);
                        if (foodFailed && attractionsFailed) {
                                toast.error('המחקר האוטומטי נכשל — אפשר להריץ שוב ידנית מתוך הדפים אוכל/אטרקציות.', 6000);
                        } else if (foodFailed) {
                                toast.warning('מחקר האוכל נכשל — אפשר להריץ שוב מדף האוכל. האטרקציות נשמרו.', 6000);
                        } else if (attractionsFailed) {
                                toast.warning('מחקר האטרקציות נכשל — אפשר להריץ שוב מדף האטרקציות. האוכל נשמר.', 6000);
                        } else {
                                toast.success('✅ המחקר הושלם — אוכל ואטרקציות מוכנים');
                        }
                })
                .finally(() => {
                        inFlightTrips.delete(trip.id);
                });
};
