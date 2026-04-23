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
import { getTripCities } from '../utils/geoData';
import { toast } from '../stores/useToastStore';

// Per-trip lock — prevents firing a second background research run for a
// trip that's already being researched (e.g. when the user hits the reset
// button twice, or when the module re-mounts).
const inFlightTrips = new Set<string>();

// Build the same prompt the RestaurantsView uses, inlined so this service
// is self-contained.
const buildRestaurantPrompt = (city: string) => `
You are a food expert helping someone find the BEST restaurants in
"${city}". Focus on top-rated places, award winners, spots with recent
widespread press, and iconic street-food / hole-in-the-wall legends.

**PART 1: QUOTA & SCOPE**
- For EACH of the 10 categories below, return 3-5 real restaurants
  (aim for 5 in a major food city). Empty array ONLY if the category
  truly has nothing. Total response for a major city = 30-50.
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

**PART 3: RECENCY CHECK (CRITICAL)**
Do NOT recommend places whose quality dropped in the last 12 months.
Skip lost Michelin stars, chef departures that hurt quality, closures,
bad new management. When in doubt, leave it out.

**PART 4: LOCAL AUTHORITY SOURCES**
Prefer Wongnai (Thailand), Tabelog (Japan), Dianping (China/HK),
OpenRice (HK/SG/MY/TH), Naver Map (Korea), Zomato (India) — plus
Michelin Guide, Asia's 50 Best, Eater, TimeOut, NYT food.
AVOID TripAdvisor as primary. Fallback: "Local Favorite" / "Top-Rated".

**PART 5: EXCLUDE**
Global fast-food chains (McDonald's, Starbucks, KFC, Subway, Burger King,
Pizza Hut, Domino's). Hotels without a named restaurant.

Descriptions in HEBREW. OUTPUT JSON ONLY:
{ "categories": [ { "id", "title", "restaurants": [ { "name", "nameEnglish", "description", "location", "cuisine", "googleRating", "recommendationSource", "isHotelRestaurant", "googleMapsUrl" } ] } ] }
`;

const buildAttractionPrompt = (city: string) => `
You are a travel expert helping a family plan a trip to "${city}".
Find the best, most-popular, and most-talked-about attractions —
INCLUDING famous tourist spots (tourists actually want to visit
iconic commercial attractions). Don't invent places.

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
Wongnai (Thailand), Tabelog+Jalan (Japan), Dianping (China/HK),
Naver Map (Korea), Klook/KKday, UNESCO, local tourism boards.
Use "Top-Rated" / "Local Favorite" when no specific source applies.

Include iconic commercial attractions — water parks, go-karting parks,
cabaret shows, aquariums, cultural villages, night markets. They're
highly rated for a reason.

OUTPUT JSON ONLY:
{ "categories": [ { "id", "title", "attractions": [ { "name", "description", "location", "rating", "type", "price", "recommendationSource" } ] } ] }
`;

interface ResearchOptions {
        onProgress?: (phase: 'food' | 'attractions', current: number, total: number) => void;
        onComplete?: (phase: 'food' | 'attractions') => void;
}

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
                try {
                        const prompt = buildRestaurantPrompt(city);
                        const response = await generateWithFallback(
                                null,
                                [{ role: 'user', parts: [{ text: prompt }] }],
                                { responseMimeType: 'application/json', temperature: 0.1 },
                                'SEARCH'
                        );
                        const rawData = JSON.parse(response.text || '{}');
                        const categoriesList = rawData.categories || (Array.isArray(rawData) ? rawData : []);
                        if (!categoriesList.length) continue;

                        const processed = categoriesList.map((c: any, idx: number) => ({
                                ...c,
                                id: c.id || `ai-food-cat-${city}-${idx}-${Date.now()}`,
                                region: city,
                                restaurants: (c.restaurants || []).map((r: any, j: number) => ({
                                        ...r,
                                        id: `ai-rec-${city}-${idx}-${Math.random().toString(36).slice(2, 7)}-${j}`,
                                        categoryTitle: c.title,
                                })),
                        }));

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
                        const partialTrip: Trip = { ...trip, aiRestaurants: accumulated };
                        try { await saveSingleTrip(partialTrip, userId); } catch (e) { console.warn('[bgResearch] partial save failed', e); }
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
                try {
                        const prompt = buildAttractionPrompt(city);
                        const response = await generateWithFallback(
                                null,
                                [{ role: 'user', parts: [{ text: prompt }] }],
                                { responseMimeType: 'application/json' },
                                'SEARCH'
                        );
                        const rawData = JSON.parse(response.text || '{}');
                        let categoriesList: any[] = [];
                        if (rawData.categories) {
                                categoriesList = Array.isArray(rawData.categories)
                                        ? rawData.categories
                                        : Object.values(rawData.categories);
                        } else if (Array.isArray(rawData)) {
                                categoriesList = rawData;
                        }
                        if (!categoriesList.length) continue;

                        const processed = categoriesList.map((c: any, idx: number) => ({
                                ...c,
                                id: c.id || `ai-cat-${city}-${idx}-${Date.now()}`,
                                attractions: (c.attractions || []).map((a: any, j: number) => ({
                                        ...a,
                                        id: `ai-attr-${city}-${idx}-${Math.random().toString(36).slice(2, 7)}-${j}`,
                                        categoryTitle: c.title,
                                })),
                        }));

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

                        const partialTrip: Trip = { ...trip, aiAttractions: accumulated };
                        try { await saveSingleTrip(partialTrip, userId); } catch (e) { console.warn('[bgResearch] partial save failed', e); }
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

        const opts: ResearchOptions = {
                onProgress: (phase, c, t) => console.log(`[bgResearch] ${phase} ${c}/${t}`),
                onComplete: (phase) => console.log(`[bgResearch] ${phase} done`),
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
