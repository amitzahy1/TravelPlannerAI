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

// Build the same prompt the RestaurantsView uses, inlined so this service
// is self-contained.
const buildRestaurantPrompt = (city: string, countryHint?: string) => {
const currentDate = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
const cuisineProfile = findCuisineProfile(city, countryHint);
const authenticSpec = buildAuthenticFoodSpec(cuisineProfile);
return `
You are a food expert helping someone find the BEST restaurants in
"${city}" as of ${currentDate}. Focus on top-rated places, award winners,
spots with recent widespread press, and iconic street-food / hole-in-the-wall legends.

**TODAY'S DATE: ${currentDate}** — use this to judge "currently open" and
"recent reviews". Search Google Maps for each restaurant before including it.
Do NOT rely on training data alone — verify each place is open right now.

**PART 0: OPERATIONAL VERIFICATION — HARD RULE (READ FIRST)**
Every place you return MUST currently be operating as of ${currentDate}.
OMIT any restaurant where:
- Google Maps shows "Permanently closed" or "Temporarily closed"
- You are not >90% confident the place is open right now
- Recent reviews (last 6 months) report closure or prolonged shutdown
Critical: an empty category is fine; a closed listing is a failure of the system.

**PART 1: QUOTA & SCOPE**
- For EACH of the 10 categories below, return 6-8 real restaurants
  (aim for 8 in a major food city). Empty array ONLY if the category
  truly has nothing. Total response for a major city = 60-80.
- Every "location" MUST be in or near "${city}".

**PART 2: CATEGORIES (use EXACTLY these Hebrew titles):**
1. "אוכל מקומי אותנטי"
2. "יוקרה ומישלן"
3. "ברי קוקטיילים"
4. "מסעדות משפחתיות"
5. "ראמן"
6. "פיצה"
7. "המבורגר"
8. "בתי קפה וקינוחים"
9. "תאילנדי"
10. "יפני"

**PART 2A: SPEC FOR "אוכל מקומי אותנטי" (READ CAREFULLY)**
${authenticSpec}

**PART 2B: SPEC FOR "פיצה" — broaden the search net.**
For pizza, search ALL of: TripAdvisor "best pizza in ${city}", local expat
forums (e.g. for Pattaya: PattayaForums, Pattaya Daily News food posts),
Wongnai / Tabelog / OpenRice pizza sub-categories, Time Out city guide,
Eater city guide if available, and Google reviews with ≥4.3 + ≥150 ratings.
Return AT LEAST 5 places when the city has them; an honest empty array is
fine, but "1 result" almost certainly means insufficient search.
EXCLUDE: Pizza Company, Pizza Hut, Domino's, Papa John's, Pizza Inn, Pizza Marzano.

**PART 3: RECENCY CHECK (CRITICAL)**
Do NOT recommend places whose quality dropped in the last 12 months.
Skip lost Michelin stars, chef departures that hurt quality, closures,
bad new management. When in doubt, leave it out.

**PART 4: LOCAL AUTHORITY SOURCES (use the ones that match the region)**
- SE Asia: Wongnai (Thailand), Tabelog (Japan), Dianping (China/HK),
  OpenRice (HK/SG/MY/TH), Naver Map (Korea), Zomato (India), Burpple
  (Singapore/Malaysia), Foodpanda highlights, Phuket/Pattaya/Bangkok
  expat forums and Reddit threads (r/Thailand, r/Bangkok, etc.).
- UK / Ireland: Time Out London, Square Meal, Hardens, Observer Food
  Monthly, Guardian restaurant reviews.
- Europe: Gault & Millau (France), Gambero Rosso (Italy), Michelin
  Guide (continental), 50 Best Restaurants, The Fork ratings, local
  city blogs, regional cuisine bloggers.
- Americas: Eater (US cities), Yelp Elite, NYT food, Bon Appétit,
  Infatuation, OpenTable Diners' Choice, Reddit r/<city>food.
- Africa: Eat Out (South Africa), Rosetta Awards, SA Tourism picks,
  Afar magazine, Conde Nast Traveler Africa.
- Middle East: Time Out (Tel Aviv / Dubai), Rest magazine, Gault &
  Millau ME.
Plus globally: Michelin Guide, World's 50 Best, Asia's 50 Best, Eater,
TimeOut, Atlas Obscura (for unique food experiences).
For each restaurant set "recommendationSource" to the SPECIFIC source you
found it in (e.g. "Wongnai", "Michelin Guide", "Burpple", "Time Out",
"r/Bangkok"). If multiple, pick the most authoritative for that cuisine.
Fallback only when no specific source applies: "Local Favorite" / "Top-Rated".
AVOID TripAdvisor as primary EXCEPT for the "פיצה" category in cities where
Western/expat reviews are the only signal of pizza quality.

**PART 5: HARD EXCLUSIONS — CHAIN RESTAURANTS (CRITICAL)**
You MUST NOT include any of the following types of places, even if locals
sometimes eat there. The user has explicitly rejected chain food:
- Global fast-food chains: McDonald's, Burger King, KFC, Subway, Wendy's,
  Taco Bell, Hardee's, Carl's Jr, Five Guys, Wingstop, Chick-fil-A,
  Popeyes, Jollibee, Dairy Queen, Arby's
- Global pizza chains: Pizza Hut, Domino's, Papa John's, Little Caesars,
  Pizza Inn, Round Table Pizza
- Regional fast-food pizza chains positioned LIKE Domino's: **Pizza
  Company** (Thailand), Pizza Marzano (mass-market casual), any chain
  with 50+ outlets aimed at quick delivery
- Global coffee chains: Starbucks, Costa Coffee, Café Nero, Tim Hortons
- Global bakery/dessert chains: Krispy Kreme, Dunkin', Cold Stone
- Hotels without a named, locally-known restaurant
If only a chain came to mind for a category, return FEWER results
(or empty array) rather than padding with chains. Quality over quantity.

**PART 6: QUALITY FLOOR (CRITICAL)**
For every category you return, include AT LEAST 3 places — and each
must be a strong recommendation, not a filler. If you genuinely cannot
find 3 quality independent options for a category in this city,
return an empty array for that category. Better empty than bad.

For "googleMapsUrl": include the actual URL from your Google Search
results, not a guessed one. Omit the field if you can't find a real URL.

**PART 7: NAME INTEGRITY (CRITICAL)**
"name" and "nameEnglish" MUST be the establishment's display name
(e.g. "Tiffany's Show Pattaya", "Wat Pho", "Pa Tiu", "Som Sak Boo Ob").
NEVER use a street address, road name, building number, "Moo X", "Soi Y",
coordinates, or any address fragment as the name. If you can only find
an address and no real venue name — OMIT the entry entirely. Bad: name="464 Moo 9".

**PART 8: CUISINE TAGS (FOR IMAGE MATCHING)**
For each restaurant, set "cuisineTags" = an array of 1-4 specific dishes
or cuisine markers the place is known for, taken from the country's local
cuisine list when applicable. Examples for Thailand:
["tom yum", "pad thai"], ["seafood", "thai"], ["khao soi"]. For Italy:
["pizza", "napoletana"], ["pasta", "carbonara"]. Use lowercase English.

Descriptions in HEBREW. "nameEnglish" REQUIRED = official Latin-script name (not a Hebrew transliteration). "business_status" REQUIRED ∈ {OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY}. OUTPUT JSON ONLY:
{ "categories": [ { "id", "title", "restaurants": [ { "name", "nameEnglish", "description", "location", "cuisine", "cuisineTags", "googleRating", "recommendationSource", "isHotelRestaurant", "googleMapsUrl", "business_status" } ] } ] }
`; };

const buildAttractionPrompt = (city: string) => {
const currentDate = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
return `
You are a travel expert helping a family plan a trip to "${city}" as of ${currentDate}.
Find the best, most-popular, and most-talked-about attractions —
INCLUDING famous tourist spots (tourists actually want to visit
iconic commercial attractions). Don't invent places.

**TODAY'S DATE: ${currentDate}** — verify each attraction is still open.
Omit anything permanently closed or under indefinite renovation.
Search Google Maps for current operational status before including.

For EACH of the 10 categories below, return 3-5 real attractions
(aim for 5). Return empty array ONLY if the city genuinely has no
such places. Every "location" MUST be in or near "${city}".

CATEGORIES (use EXACTLY these Hebrew titles):
1. "אתרי חובה"
2. "טבע ונופים"
3. "מוזיאונים ותרבות"
4. "קניות ושווקים"
5. "אקסטרים ופעילויות"
6. "חופים ומים"
7. "למשפחות וילדים"
8. "היסטוריה ודת"
9. "חיי לילה ואווירה"
10. "פינות נסתרות"

Let the AI pick the best-fitting category — don't force mappings.
An attraction can appear in two categories if equally relevant.

Sources: Google Reviews, TripAdvisor, Lonely Planet, Atlas Obscura,
UNESCO, local tourism boards. Plus region-specific:
- Asia: Wongnai, Tabelog + Jalan, Dianping, Naver Map, Klook/KKday.
- UK: Visit Britain, Time Out London, English Heritage, National Trust.
- Europe: Rick Steves, Visit Europe guides, official national tourism.
- Americas: NPS (US national parks), Atlas Obscura, Visit a state.
- Africa: SANParks (South Africa), Safari Bookings, Bradt Guides,
  Afar Africa collection.
- Middle East: Visit Dubai, Tourist Israel, Jordan Tourism.
Use "Top-Rated" / "Local Favorite" when no specific source applies.

Include iconic commercial attractions — water parks, go-karting parks,
cabaret shows, aquariums, cultural villages, night markets. They're
highly rated for a reason.

For each attraction include "googleMapsUrl" — the actual URL from
your Google Search results, NOT a guessed one. If you cannot find
a real URL, omit the field entirely; do not fabricate.

**NAME INTEGRITY (CRITICAL)**
"name" and "nameEnglish" MUST be the attraction's display name
(e.g. "Tiffany's Show Pattaya", "Wat Pho", "Nong Nooch Tropical Garden").
NEVER use a street address, road name, building number, "Moo X", "Soi Y",
coordinates, or any address fragment as the name. If you can only find an
address and no real venue name — OMIT the entry entirely.
Bad: name="464 Moo 9".

"nameEnglish" REQUIRED = official Latin-script name (e.g. "Wat Pho", "Tiffany's Show Pattaya").
"business_status" REQUIRED ∈ {OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY}.
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
