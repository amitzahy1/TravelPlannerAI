import { Trip } from '../types';
// Comprehensive Database of Countries and Major Travel Destinations
// Including Islands and Major Tourist Cities
// Format: CountryCode: { name: CountryName, cities: [List of cities/islands] }

export const WORLD_DESTINATIONS: Record<string, string[]> = {
        // ASIA
        'Philippines': ['Manila', 'Cebu', 'Boracay', 'El Nido', 'Coron', 'Bohol', 'Siargao', 'Puerto Princesa', 'Davao', 'Makati', 'BGC', 'Taguig', 'Pasay', 'Quezon City'],
        'Thailand': ['Bangkok', 'Phuket', 'Chiang Mai', 'Ko Samui', 'Krabi', 'Pattaya', 'Hua Hin', 'Ayutthaya', 'Chiang Rai', 'Ko Tao', 'Ko Phi Phi'],
        'Vietnam': ['Hanoi', 'Ho Chi Minh City', 'Da Nang', 'Hoi An', 'Nha Trang', 'Phu Quoc', 'Hue', 'Sapa', 'Ha Long Bay'],
        'Japan': ['Tokyo', 'Osaka', 'Kyoto', 'Hiroshima', 'Sapporo', 'Fukuoka', 'Nara', 'Okinawa', 'Hakone'],
        'South Korea': ['Seoul', 'Busan', 'Jeju City', 'Incheon', 'Gyeongju', 'Daegu'],
        'Indonesia': ['Jakarta', 'Bali', 'Ubud', 'Yogyakarta', 'Lombok', 'Komodo', 'Surabaya', 'Bandung'],
        'China': ['Beijing', 'Shanghai', 'Xi\'an', 'Chengdu', 'Guangzhou', 'Shenzhen', 'Hangzhou', 'Hong Kong', 'Macau'],
        'Cambodia': ['Phnom Penh', 'Siem Reap', 'Sihanoukville', 'Battambang'],
        'Singapore': ['Singapore', 'Sentosa'],
        'Malaysia': ['Kuala Lumpur', 'Penang', 'Langkawi', 'Malacca', 'Kota Kinabalu'],
        'India': ['New Delhi', 'Mumbai', 'Jaipur', 'Agra', 'Goa', 'Varanasi', 'Kolkata', 'Bengaluru', 'Chennai', 'Kerala'],
        'Maldives': ['Malé', 'Maafushi', 'Hulhumale'],
        'Sri Lanka': ['Colombo', 'Kandy', 'Galle', 'Ella', 'Sigiriya'],
        'Taiwan': ['Taipei', 'Kaohsiung', 'Tainan', 'Taichung', 'Hualien'],
        'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah'],
        'Israel': ['Tel Aviv', 'Jerusalem', 'Haifa', 'Eilat', 'Dead Sea', 'Nazareth', 'Tiberias'],
        'Turkey': ['Istanbul', 'Cappadocia', 'Antalya', 'Bodrum', 'Izmir', 'Ankara'],
        'Georgia': ['Tbilisi', 'Batumi', 'Kutaisi', 'Napareuli', 'Lopota', 'Signagi', 'Kazbegi', 'Mestia', 'Borjomi', 'Gori', 'Mtskheta', 'Telavi', 'Kvareli', 'Stepantsminda'],
        'Armenia': ['Yerevan', 'Gyumri', 'Dilijan', 'Garni'],
        'Azerbaijan': ['Baku', 'Ganja', 'Sheki'],
        'Jordan': ['Amman', 'Petra', 'Aqaba', 'Wadi Rum'],

        // EUROPE
        'France': ['Paris', 'Nice', 'Lyon', 'Marseille', 'Bordeaux', 'Strasbourg', 'Cannes', 'Chamonix'],
        'Italy': ['Rome', 'Venice', 'Florence', 'Milan', 'Naples', 'Turin', 'Verona', 'Bologna', 'Sicily', 'Sardinia', 'Amalfi'],
        'United Kingdom': ['London', 'Edinburgh', 'Manchester', 'Liverpool', 'Glasgow', 'Bath', 'Oxford'],
        'Spain': ['Madrid', 'Barcelona', 'Seville', 'Valencia', 'Granada', 'Mallorca', 'Ibiza', 'Tenerife', 'Malaga'],
        'Germany': ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Heidelberg'],
        'Greece': ['Athens', 'Santorini', 'Mykonos', 'Crete', 'Rhodes', 'Corfu', 'Thessaloniki'],
        'Portugal': ['Lisbon', 'Porto', 'Algarve', 'Sintra', 'Faro', 'Madeira'],
        'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht'],
        'Switzerland': ['Zurich', 'Geneva', 'Lucerne', 'Interlaken', 'Zermatt', 'Bern'],
        'Austria': ['Vienna', 'Salzburg', 'Innsbruck', 'Hallstatt'],
        'Czech Republic': ['Prague', 'Brno', 'Cesky Krumlov'],
        'Hungary': ['Budapest', 'Debrecen'],
        'Croatia': ['Dubrovnik', 'Split', 'Hvar', 'Zagreb', 'Zadar'],
        'Belgium': ['Brussels', 'Bruges', 'Ghent', 'Antwerp'],
        'Ireland': ['Dublin', 'Cork', 'Galway', 'Killarney'],
        'Sweden': ['Stockholm', 'Gothenburg', 'Malmo'],
        'Norway': ['Oslo', 'Bergen', 'Tromso'],
        'Denmark': ['Copenhagen', 'Aarhus'],
        'Finland': ['Helsinki', 'Rovaniemi'],
        'Iceland': ['Reykjavik', 'Vik'],
        'Poland': ['Warsaw', 'Krakow', 'Gdansk'],
        'Romania': ['Bucharest', 'Brasov', 'Cluj-Napoca'],
        'Russia': ['Moscow', 'Saint Petersburg'],

        // NORTH AMERICA
        'United States': ['New York', 'Los Angeles', 'Las Vegas', 'Miami', 'Orlando', 'San Francisco', 'Chicago', 'Washington', 'Boston', 'Hawaii'],
        'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Quebec City', 'Calgary', 'Banff'],
        'Mexico': ['Mexico City', 'Cancun', 'Tulum', 'Playa del Carmen', 'Cabo San Lucas', 'Puerto Vallarta'],

        // SOUTH AMERICA
        'Brazil': ['Rio de Janeiro', 'Sao Paulo', 'Salvador', 'Florianopolis', 'Foz do Iguacu'],
        'Argentina': ['Buenos Aires', 'Mendoza', 'Bariloche', 'Ushuaia'],
        'Peru': ['Lima', 'Cusco', 'Machu Picchu', 'Arequipa'],
        'Colombia': ['Bogota', 'Medellin', 'Cartagena'],
        'Chile': ['Santiago', 'Valparaiso', 'San Pedro de Atacama'],

        // OCEANIA
        'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Gold Coast', 'Perth', 'Cairns'],
        'New Zealand': ['Auckland', 'Queenstown', 'Wellington', 'Christchurch'],
        'Fiji': ['Nadi', 'Suva'],

        // AFRICA
        'Egypt': ['Cairo', 'Luxor', 'Aswan', 'Hurghada', 'Sharm El Sheikh'],
        'South Africa': ['Cape Town', 'Johannesburg', 'Durban', 'Kruger National Park'],
        'Morocco': ['Marrakech', 'Casablanca', 'Fes', 'Chefchaouen', 'Tangier'],
        'Kenya': ['Nairobi', 'Mombasa', 'Maasai Mara'],
        'Tanzania': ['Zanzibar', 'Dar es Salaam', 'Serengeti']
};

// Aliases for matching (e.g. Metro Manila -> Manila)
export const CITY_ALIASES: Record<string, string> = {
        'makati': 'Manila',
        'bgc': 'Manila',
        'bonifacio global city': 'Manila',
        'pasay': 'Manila',
        'taguig': 'Manila',
        'quezon city': 'Manila',
        'metro manila': 'Manila',
        'mandaluyong': 'Manila',
        'parañaque': 'Manila',
        'paranaque': 'Manila',
        'las piñas': 'Manila',
        'las pinas': 'Manila',
        'alabang': 'Manila',

        // Thailand
        'patong': 'Phuket',
        'kata': 'Phuket',
        'karon': 'Phuket',
        'ratchathewi': 'Bangkok',
        'sukhumvit': 'Bangkok',
        'siam': 'Bangkok',

        // Japan
        'shinjuku': 'Tokyo',
        'shibuya': 'Tokyo',
        'minato': 'Tokyo',
        'chuo': 'Tokyo',

        // USA
        'manhattan': 'New York',
        'brooklyn': 'New York',
        'queens': 'New York',
        'hollywood': 'Los Angeles',
        'strip': 'Las Vegas'
};

/**
 * Resolves a raw geographical name (e.g. "Makati, Philippines" or "Patong Beach") 
 * to its standard city/island name (e.g. "Manila" or "Phuket").
 */
export const resolveLocationName = (rawInput: string): string => {
        if (!rawInput) return '';
        const lowerInput = rawInput.toLowerCase().trim();

        // 1. Direct Alias Match
        for (const [alias, target] of Object.entries(CITY_ALIASES)) {
                if (lowerInput.includes(alias)) return target;
        }

        // 2. Database Match (Check if input contains any known major city)
        for (const locations of Object.values(WORLD_DESTINATIONS)) {
                for (const loc of locations) {
                        if (lowerInput.includes(loc.toLowerCase())) {
                                return loc;
                        }
                }
        }

        // 3. Country fallback
        // If input matches a country name directly, return it (capitalized)
        for (const country of Object.keys(WORLD_DESTINATIONS)) {
                if (country.toLowerCase() === lowerInput) return WORLD_DESTINATIONS[country][0]; // Return capital/first city? Or just handle country?
                // Actually, resolveLocationName is for *Cities*. 
                // If it's a country, maybe we want to map to Capital?
                // The previous code did that.
                // Let's stick to returning cities.
        }

        return '';
};

/**
 * Returns the country name for a given city/island if found in the database.
 */
export const getCountryForCity = (city: string): string | null => {
        if (!city) return null;
        const lowerCity = city.toLowerCase().trim();

        for (const [country, cities] of Object.entries(WORLD_DESTINATIONS)) {
                if (cities.some(c => c.toLowerCase() === lowerCity)) {
                        return country;
                }
        }
        return null;
};
// ... existing code ...

/**
 * Standard utility to clean city names (remove zip codes, numbers, "City" suffix)
 */
export const cleanCityName = (name: string): string => {
        if (!name) return '';
        let cleaned = name.replace(/\b\d{3,}\b/g, '').trim(); // Remove 3+ digit numbers
        cleaned = cleaned.replace(/\s+/g, ' '); // Clean double spaces
        // Remove "City" suffix if present (e.g. "Tbilisi City" -> "Tbilisi")
        cleaned = cleaned.replace(/\s+City$/i, '');
        return cleaned;
};

// Hebrew display names for common tourist cities. Used to normalise a
// city-name list so the same city doesn't appear twice in different
// languages (e.g. 'Bangkok' and 'בנגקוק'). Keys are lowercase English; add
// more pairs as the app expands into new regions.
const CITY_HEBREW_NAMES: Record<string, string> = {
        // Thailand
        'bangkok': 'בנגקוק',
        'koh chang': "קו צ'אנג",
        'ko chang': "קו צ'אנג",
        'pattaya': 'פטאיה',
        'phuket': 'פוקט',
        'ko samui': 'קו סאמוי',
        'koh samui': 'קו סאמוי',
        'samui': 'קו סאמוי',
        'chiang mai': "צ'יאנג מאי",
        'krabi': 'קראבי',
        'hua hin': 'חואה הין',
        'trat': 'טראט',
        // UAE
        'abu dhabi': 'אבו דאבי',
        'dubai': 'דובאי',
        // Israel
        'tel aviv': 'תל אביב',
        'tel-aviv': 'תל אביב',
        'jerusalem': 'ירושלים',
        'haifa': 'חיפה',
        'eilat': 'אילת',
        // Europe
        'paris': 'פריז',
        'london': 'לונדון',
        'rome': 'רומא',
        'milan': 'מילאנו',
        'florence': 'פירנצה',
        'venice': 'ונציה',
        'barcelona': 'ברצלונה',
        'madrid': 'מדריד',
        'lisbon': 'ליסבון',
        'porto': 'פורטו',
        'amsterdam': 'אמסטרדם',
        'berlin': 'ברלין',
        'munich': 'מינכן',
        'vienna': 'וינה',
        'prague': 'פראג',
        'budapest': 'בודפשט',
        'athens': 'אתונה',
        // North America
        'new york': 'ניו יורק',
        'los angeles': 'לוס אנג\'לס',
        'miami': 'מיאמי',
        'san francisco': 'סן פרנסיסקו',
        'las vegas': 'לאס וגאס',
        // Asia
        'tokyo': 'טוקיו',
        'kyoto': 'קיוטו',
        'osaka': 'אוסקה',
        'seoul': 'סיאול',
        'hong kong': 'הונג קונג',
        'singapore': 'סינגפור',
        'bali': 'באלי',
        'kuala lumpur': 'קואלה לומפור',
        // Philippines
        'manila': 'מנילה',
        'cebu': 'סבו',
        'boracay': 'בוראקאי',
        'el nido': 'אל נידו',
        'palawan': 'פלאוואן',
        // Georgia
        'tbilisi': 'טביליסי',
        'batumi': 'באטומי',
        'kazbegi': 'קזבגי',
        'kutaisi': 'קוטאיסי',
        // Countries (shown when only destination is set)
        'thailand': 'תאילנד',
        'israel': 'ישראל',
        'italy': 'איטליה',
        'france': 'צרפת',
        'greece': 'יוון',
        'japan': 'יפן',
        'georgia': 'גאורגיה',
        'philippines': 'הפיליפינים',
};

// Reverse map for fast Hebrew → English key lookup
const HEBREW_TO_ENGLISH_KEY: Record<string, string> = Object.entries(CITY_HEBREW_NAMES)
        .reduce((acc, [en, he]) => { acc[he] = en; return acc; }, {} as Record<string, string>);

/**
 * Normalise a city name to a canonical key (lowercase English) when we know it,
 * else to its cleaned form. Use this to detect that 'Bangkok' and 'בנגקוק' are
 * the same city, without deciding on a display language.
 */
// Normalise punctuation + invisibles + Unicode form so subtle character
// differences ("קו צ'אנג" vs "קו צ׳אנג" vs "קו צ’אנג" vs same with a
// stray ZWSP) all collapse to the same canonical form. Without this,
// the city filter listed "קו צ'אנג" twice — same city, two encodings.
const normalizeCityRaw = (s: string): string => s
        .normalize('NFC')
        // Strip zero-width / formatting / direction marks
        .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
        // All apostrophe / geresh / prime variants → ASCII '
        .replace(/[‘’״׳′‵`´]/g, "'")
        // Collapse whitespace
        .replace(/\s+/g, ' ')
        .trim();

export const cityKey = (name: string): string => {
        if (!name) return '';
        const cleaned = normalizeCityRaw(cleanCityName(name));
        if (!cleaned) return '';
        const lower = cleaned.toLowerCase();
        // English match → bounce through the Hebrew form to canonicalise across
        // English alias variants. Multiple English keys can map to the SAME
        // Hebrew (e.g. "Koh Chang" + "Ko Chang" → "קו צ'אנג"), so we look up
        // the Hebrew, then look up the canonical English back. That collapses
        // every alias to whichever English form the lookup table picks last
        // (the de facto canonical). Without this round-trip, the city filter
        // listed "קו צ'אנג" twice — same Hebrew display, different keys.
        const hebrewFromLower = CITY_HEBREW_NAMES[lower];
        if (hebrewFromLower) return HEBREW_TO_ENGLISH_KEY[hebrewFromLower] || lower;
        // Hebrew match (try cleaned + a punctuation-stripped variant)
        if (HEBREW_TO_ENGLISH_KEY[cleaned]) return HEBREW_TO_ENGLISH_KEY[cleaned];
        const stripped = cleaned.replace(/[׳'′]/g, '');
        if (HEBREW_TO_ENGLISH_KEY[stripped]) return HEBREW_TO_ENGLISH_KEY[stripped];
        // Try a relaxed match: normalise both sides of the lookup table
        for (const [hebrew, en] of Object.entries(HEBREW_TO_ENGLISH_KEY)) {
                if (normalizeCityRaw(hebrew) === cleaned) return en;
        }
        // Unknown — use lowercase cleaned as the key
        return lower;
};

/**
 * Build a lowercase lookup: country key → cities-in-country list. So
 * 'thailand' maps to ['bangkok', 'phuket', 'pattaya', ...] and we can tell
 * a restaurant in 'Sukhumvit, Bangkok' belongs to the 'thailand' scope.
 */
const COUNTRY_KEY_TO_CITIES: Record<string, string[]> = (() => {
        const map: Record<string, string[]> = {};
        for (const [country, cities] of Object.entries(WORLD_DESTINATIONS)) {
                map[country.toLowerCase()] = cities.map(c => c.toLowerCase());
        }
        return map;
})();

/**
 * Does a free-form location string (e.g. 'Bangkok, Thailand' or 'רחוב סילום,
 * בנגקוק') refer to the given city/country (in either language)?
 *
 * Accepts both cities AND countries — critical, because the trip's wizard
 * destination is often a country ('תאילנד'). Previous version dropped
 * every restaurant whose location said 'Sukhumvit, Bangkok' when the user
 * filtered by 'תאילנד' because 'bangkok' doesn't contain the substring
 * 'thailand'. Now we expand country filters to any of the country's known
 * major cities.
 */
export const locationMatchesCity = (location: string, cityDisplayName: string): boolean => {
        if (!location || !cityDisplayName) return false;
        const targetKey = cityKey(cityDisplayName);
        if (!targetKey) return false;

        const locLower = location.toLowerCase().trim();

        // Direct substring match of the canonical key
        if (locLower.includes(targetKey)) return true;

        // Hebrew form of a known city
        const hebrewForm = CITY_HEBREW_NAMES[targetKey];
        if (hebrewForm && location.includes(hebrewForm)) return true;

        // Country-level filter: match any major city in the country.
        // 'thailand' → matches 'Bangkok', 'Pattaya', 'Chiang Mai', etc.
        const countryCities = COUNTRY_KEY_TO_CITIES[targetKey];
        if (countryCities) {
                if (countryCities.some(c => locLower.includes(c))) return true;
                // Also try the Hebrew forms of each city in the country
                for (const cityLower of countryCities) {
                        const he = CITY_HEBREW_NAMES[cityLower];
                        if (he && location.includes(he)) return true;
                }
        }

        return false;
};

/**
 * Pick the preferred display form for a city name. Defaults to Hebrew because
 * the app UI is Hebrew-first; passes unknown cities through unchanged so we
 * never drop user-provided names.
 */
export const displayCityName = (name: string, lang: 'he' | 'en' = 'he'): string => {
        if (!name) return '';
        // Same normalisation pipeline as cityKey() so Unicode-variant inputs
        // (Hebrew geresh ׳ vs ASCII ', stray ZWSP, etc.) hit the lookup table.
        // Without this, two raw forms of "קו צ'אנג" produce two display labels
        // even though cityKey() correctly collapses them — and the city filter
        // ends up showing the same city twice.
        const cleaned = normalizeCityRaw(cleanCityName(name));
        const lower = cleaned.toLowerCase();
        if (lang === 'he') {
                if (CITY_HEBREW_NAMES[lower]) return CITY_HEBREW_NAMES[lower];
                if (HEBREW_TO_ENGLISH_KEY[cleaned]) return cleaned; // already Hebrew we recognise
                // Last-chance Hebrew lookup — try matching against any normalised
                // key in the table, so unrecognised apostrophe variants still find
                // their canonical Hebrew form.
                for (const [hebrew, en] of Object.entries(HEBREW_TO_ENGLISH_KEY)) {
                        if (normalizeCityRaw(hebrew) === cleaned) return hebrew;
                }
                return cleaned;
        } else {
                if (CITY_HEBREW_NAMES[lower]) return cleaned; // already English we recognise
                const englishKey = HEBREW_TO_ENGLISH_KEY[cleaned];
                if (englishKey) {
                        return englishKey.replace(/\b\w/g, c => c.toUpperCase());
                }
                // Last-chance English lookup — same idea as the Hebrew block.
                for (const [hebrew, en] of Object.entries(HEBREW_TO_ENGLISH_KEY)) {
                        if (normalizeCityRaw(hebrew) === cleaned) {
                                return en.replace(/\b\w/g, c => c.toUpperCase());
                        }
                }
                return cleaned;
        }
};

/**
 * SMART City Extraction - finds actual city from hotel address or context
 * Refactored from ItineraryView to be shared across the app
 */
export const extractRobustCity = (address: string, hotelName: string, trip: Trip): string => {
        if (!address && !hotelName) return (trip.destination || '').split('-')[0].trim();

        // Build known cities database from trip data to help disambiguate
        const knownCities = new Set<string>();

        // From trip destination (e.g., "Georgia - Tbilisi & Batumi")
        (trip.destination || '').split(/[-&,]/).forEach(part => {
                const city = part.trim().toLowerCase();
                if (city && city.length > 2 && !['and', 'the'].includes(city)) {
                        knownCities.add(city);
                }
        });

        // From English destination if exists
        if (trip.destinationEnglish) {
                trip.destinationEnglish.split(/[-&,]/).forEach(part => {
                        const city = part.trim().toLowerCase();
                        if (city && city.length > 2) knownCities.add(city);
                });
        }

        // From flight segments
        trip.flights?.segments?.forEach(seg => {
                if (seg.toCity) knownCities.add(seg.toCity.toLowerCase());
                // We typically exclude origin here, but for "knownCities" context it's okay to have them for matching
        });

        // 1. Try to resolve using robust Geo Database
        const resolvedCity = resolveLocationName(address);
        if (resolvedCity) return resolvedCity;

        // 2. Fallback Parsing
        const addressParts = address ? address.split(',').map(p => p.trim()).filter(Boolean) : [];
        const capitalMap: Record<string, string> = {
                'georgia': 'Tbilisi', 'philippines': 'Manila', 'thailand': 'Bangkok',
                'vietnam': 'Hanoi', 'indonesia': 'Jakarta', 'japan': 'Tokyo',
                'south korea': 'Seoul', 'israel': 'Tel Aviv', 'greece': 'Athens'
        };

        // Try to match against known cities in address
        for (const part of addressParts) {
                const partLower = part.toLowerCase();
                for (const known of knownCities) {
                        if (partLower.includes(known) || known.includes(partLower)) {
                                return part.charAt(0).toUpperCase() + part.slice(1);
                        }
                }
        }

        // Look for city after street number pattern — but skip pure postal codes
        if (addressParts.length >= 2) {
                for (let i = 1; i < addressParts.length; i++) {
                        const part = addressParts[i];
                        const partLower = part.toLowerCase();
                        // Skip if it's purely a number (postal code)
                        if (/^\d+$/.test(part.trim())) continue;
                        // Skip known country names
                        const countries = ['georgia', 'philippines', 'thailand', 'vietnam', 'indonesia', 'japan', 'israel', 'greece', 'usa', 'uk', 'armenia', 'azerbaijan', 'turkey'];
                        if (countries.some(c => partLower.includes(c))) continue;
                        // Strip leading/trailing postal code digits from city names like "2200 Napareuli" or "Napareuli 2200"
                        const cleaned = part.trim().replace(/^\d+\s+/, '').replace(/\s+\d+$/, '').trim();
                        if (cleaned.length > 1) return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
                }
        }

        // Fallback: check if hotel name contains a known city
        const hotelLower = hotelName.toLowerCase();
        for (const [country, capital] of Object.entries(capitalMap)) {
                if (hotelLower.includes(country) || address.toLowerCase().includes(country)) {
                        return capital;
                }
        }

        // Final Candidate
        let candidate = (trip.destination || '').split('-')[0].trim();
        return cleanCityName(candidate);
};

/**
 * Centralized Logic to get the unique list of cities for a trip.
 * Aggregates from: Destination String, Flights, Hotels
 *
 * @param opts.excludeFlightOnly
 *   When true, skips flight arrival cities that don't also have a hotel
 *   booked in them. Intended for AI market research (food / attractions)
 *   which should only search places the user is actually staying in,
 *   not layover / transit airports like AUH.
 */
export const getTripCities = (
        trip: Trip,
        opts?: { excludeFlightOnly?: boolean; lang?: 'he' | 'en' }
): string[] => {
        const lang: 'he' | 'en' = opts?.lang ?? 'he';
        // Dedupe by canonical key (language-agnostic); display in chosen language.
        const seenKeys = new Set<string>();
        const output: string[] = [];
        const add = (raw: string) => {
                if (!raw) return;
                const key = cityKey(raw);
                if (!key || seenKeys.has(key)) return;
                seenKeys.add(key);
                output.push(displayCityName(raw, lang));
        };

        // Pre-compute the set of hotel city KEYS so we can filter flight-only
        // destinations out when requested (language-agnostic comparison).
        const hotelCityKeys = new Set<string>();
        trip.hotels?.forEach(h => {
                const extracted = extractRobustCity(h.address || '', h.name || '', trip);
                if (extracted) hotelCityKeys.add(cityKey(extracted));
                if (h.city) hotelCityKeys.add(cityKey(h.city));
        });

        // 1. Wizard Destination
        if (trip.destination) {
                trip.destination.split(/ - | & |, /).forEach(s => add(s.trim()));
        }

        // 2. Flight Destinations (Arrivals) — skipped for non-hotel cities when
        // excludeFlightOnly is on, so layover / transit cities don't pollute
        // AI research for food + attractions.
        const originKey = trip.flights?.segments?.[0]?.fromCity
                ? cityKey(trip.flights.segments[0].fromCity)
                : '';
        trip.flights?.segments?.forEach(s => {
                if (!s.toCity) return;
                const k = cityKey(s.toCity);
                if (!k || k === originKey) return;
                if (opts?.excludeFlightOnly && !hotelCityKeys.has(k)) return;
                add(s.toCity);
        });

        // 3. Hotel Cities (Using Robust Extraction)
        trip.hotels?.forEach(h => {
                const extracted = extractRobustCity(h.address || '', h.name || '', trip);
                if (extracted) add(extracted);
                if (h.city) add(h.city);
        });

        // 4. Drop country-level entries when actual cities are also present.
        // Why: research/scan should target specific cities the user is staying
        // in, not the country as a whole. Without this, "תאילנד" + "בנגקוק" +
        // "פטאיה" + "קו צ'אנג" produces 4 AI calls and a useless country-wide
        // search. With this, only the 3 cities are scanned.
        const filtered = output.filter(Boolean);
        const cityEntries = filtered.filter(name => !COUNTRY_KEY_TO_CITIES[cityKey(name)]);
        if (cityEntries.length > 0 && cityEntries.length < filtered.length) {
                return cityEntries;
        }
        return filtered;
};
