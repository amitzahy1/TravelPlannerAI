import { Trip } from '../types';
// Comprehensive Database of Countries and Major Travel Destinations
// Including Islands and Major Tourist Cities
// Format: CountryCode: { name: CountryName, cities: [List of cities/islands] }

export const WORLD_DESTINATIONS: Record<string, string[]> = {
        // ASIA
        'Philippines': ['Manila', 'Cebu', 'Boracay', 'El Nido', 'Coron', 'Bohol', 'Siargao', 'Puerto Princesa', 'Davao', 'Makati', 'BGC', 'Taguig', 'Pasay', 'Quezon City'],
        'Thailand': ['Bangkok', 'Phuket', 'Chiang Mai', 'Ko Samui', 'Krabi', 'Pattaya', 'Hua Hin', 'Ayutthaya', 'Chiang Rai', 'Ko Tao', 'Ko Phi Phi', 'Ko Chang', 'Koh Chang'],
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
        'Iran': ['Tehran', 'Isfahan', 'Shiraz', 'Yazd'],
        'Pakistan': ['Islamabad', 'Lahore', 'Karachi'],
        'Bangladesh': ['Dhaka', 'Cox\'s Bazar'],
        'Nepal': ['Kathmandu', 'Pokhara', 'Chitwan'],
        'Bhutan': ['Thimphu', 'Paro', 'Punakha'],
        'Myanmar': ['Yangon', 'Bagan', 'Mandalay', 'Inle Lake'],
        'Laos': ['Vientiane', 'Luang Prabang', 'Vang Vieng'],
        'Brunei': ['Bandar Seri Begawan'],
        'Mongolia': ['Ulaanbaatar', 'Gobi Desert'],
        'Kazakhstan': ['Astana', 'Almaty'],
        'Uzbekistan': ['Tashkent', 'Samarkand', 'Bukhara', 'Khiva'],
        'Kyrgyzstan': ['Bishkek', 'Issyk-Kul'],
        'Tajikistan': ['Dushanbe'],
        'Turkmenistan': ['Ashgabat'],
        'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'AlUla'],
        'Qatar': ['Doha'],
        'Oman': ['Muscat', 'Salalah', 'Nizwa'],
        'Bahrain': ['Manama'],
        'Kuwait': ['Kuwait City'],
        'Lebanon': ['Beirut', 'Byblos', 'Baalbek'],
        'Cyprus': ['Nicosia', 'Paphos', 'Limassol', 'Ayia Napa', 'Larnaca'],

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
        'Hungary': ['Budapest', 'Debrecen', 'Eger'],
        'Croatia': ['Dubrovnik', 'Split', 'Hvar', 'Zagreb', 'Zadar'],
        'Belgium': ['Brussels', 'Bruges', 'Ghent', 'Antwerp'],
        'Ireland': ['Dublin', 'Cork', 'Galway', 'Killarney'],
        'Sweden': ['Stockholm', 'Gothenburg', 'Malmo'],
        'Norway': ['Oslo', 'Bergen', 'Tromso'],
        'Denmark': ['Copenhagen', 'Aarhus'],
        'Finland': ['Helsinki', 'Rovaniemi'],
        'Iceland': ['Reykjavik', 'Vik'],
        'Poland': ['Warsaw', 'Krakow', 'Gdansk', 'Wroclaw'],
        'Romania': ['Bucharest', 'Brasov', 'Cluj-Napoca'],
        'Russia': ['Moscow', 'Saint Petersburg'],
        'Bulgaria': ['Sofia', 'Plovdiv', 'Sunny Beach', 'Varna'],
        'Slovakia': ['Bratislava', 'High Tatras', 'Kosice'],
        'Slovenia': ['Ljubljana', 'Bled', 'Piran'],
        'Estonia': ['Tallinn', 'Parnu'],
        'Latvia': ['Riga', 'Jurmala'],
        'Lithuania': ['Vilnius', 'Kaunas'],
        'Ukraine': ['Kyiv', 'Lviv', 'Odesa'],
        'Albania': ['Tirana', 'Saranda', 'Ksamil', 'Berat'],
        'Serbia': ['Belgrade', 'Novi Sad'],
        'Montenegro': ['Kotor', 'Budva', 'Podgorica'],
        'Bosnia and Herzegovina': ['Sarajevo', 'Mostar'],
        'North Macedonia': ['Skopje', 'Ohrid'],
        'Luxembourg': ['Luxembourg City'],
        'Liechtenstein': ['Vaduz'],
        'Monaco': ['Monaco', 'Monte Carlo'],
        'Andorra': ['Andorra la Vella'],
        'Malta': ['Valletta', 'Mdina', 'Sliema', 'Gozo'],

        // NORTH AMERICA
        'United States': ['New York', 'Los Angeles', 'Las Vegas', 'Miami', 'Orlando', 'San Francisco', 'Chicago', 'Washington', 'Boston', 'Hawaii'],
        'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Quebec City', 'Calgary', 'Banff'],
        'Mexico': ['Mexico City', 'Cancun', 'Tulum', 'Playa del Carmen', 'Cabo San Lucas', 'Puerto Vallarta'],
        'Cuba': ['Havana', 'Varadero', 'Trinidad'],
        'Dominican Republic': ['Santo Domingo', 'Punta Cana', 'Puerto Plata'],
        'Jamaica': ['Kingston', 'Montego Bay', 'Negril'],
        'Bahamas': ['Nassau', 'Paradise Island', 'Exuma'],
        'Barbados': ['Bridgetown'],
        'Costa Rica': ['San Jose', 'Manuel Antonio', 'La Fortuna', 'Tamarindo'],
        'Panama': ['Panama City', 'Boquete', 'Bocas del Toro'],
        'Guatemala': ['Guatemala City', 'Antigua', 'Tikal', 'Lake Atitlan'],
        'Belize': ['Belize City', 'San Pedro', 'Caye Caulker'],
        'Honduras': ['Tegucigalpa', 'Roatan', 'Copan'],
        'Nicaragua': ['Managua', 'Granada', 'Ometepe'],
        'El Salvador': ['San Salvador', 'El Tunco'],
        'Puerto Rico': ['San Juan', 'Old San Juan'],
        'Trinidad and Tobago': ['Port of Spain'],

        // SOUTH AMERICA
        'Brazil': ['Rio de Janeiro', 'Sao Paulo', 'Salvador', 'Florianopolis', 'Foz do Iguacu'],
        'Argentina': ['Buenos Aires', 'Mendoza', 'Bariloche', 'Ushuaia'],
        'Peru': ['Lima', 'Cusco', 'Machu Picchu', 'Arequipa'],
        'Colombia': ['Bogota', 'Medellin', 'Cartagena'],
        'Chile': ['Santiago', 'Valparaiso', 'San Pedro de Atacama'],
        'Ecuador': ['Quito', 'Guayaquil', 'Galapagos', 'Cuenca'],
        'Bolivia': ['La Paz', 'Sucre', 'Uyuni'],
        'Uruguay': ['Montevideo', 'Punta del Este', 'Colonia del Sacramento'],
        'Paraguay': ['Asuncion'],
        'Venezuela': ['Caracas', 'Margarita Island'],

        // OCEANIA
        'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Gold Coast', 'Perth', 'Cairns'],
        'New Zealand': ['Auckland', 'Queenstown', 'Wellington', 'Christchurch'],
        'Fiji': ['Nadi', 'Suva'],
        'French Polynesia': ['Papeete', 'Bora Bora', 'Moorea'],
        'Samoa': ['Apia'],
        'Vanuatu': ['Port Vila'],
        'Solomon Islands': ['Honiara'],
        'Tonga': ['Nuku\'alofa'],

        // AFRICA
        'Egypt': ['Cairo', 'Luxor', 'Aswan', 'Hurghada', 'Sharm El Sheikh'],
        'South Africa': ['Cape Town', 'Johannesburg', 'Durban', 'Kruger National Park'],
        'Morocco': ['Marrakech', 'Casablanca', 'Fes', 'Chefchaouen', 'Tangier'],
        'Kenya': ['Nairobi', 'Mombasa', 'Maasai Mara'],
        'Tanzania': ['Zanzibar', 'Dar es Salaam', 'Serengeti'],
        'Tunisia': ['Tunis', 'Djerba', 'Hammamet', 'Sousse'],
        'Algeria': ['Algiers', 'Oran'],
        'Ethiopia': ['Addis Ababa', 'Lalibela'],
        'Ghana': ['Accra', 'Cape Coast'],
        'Senegal': ['Dakar'],
        'Namibia': ['Windhoek', 'Sossusvlei', 'Swakopmund'],
        'Botswana': ['Gaborone', 'Okavango Delta', 'Chobe'],
        'Zimbabwe': ['Harare', 'Victoria Falls'],
        'Mozambique': ['Maputo', 'Bazaruto'],
        'Madagascar': ['Antananarivo', 'Nosy Be'],
        'Mauritius': ['Port Louis', 'Grand Baie'],
        'Seychelles': ['Mahe', 'Praslin', 'La Digue'],
        'Rwanda': ['Kigali', 'Volcanoes National Park'],
        'Uganda': ['Kampala', 'Bwindi'],
        'Nigeria': ['Lagos', 'Abuja'],
        'Sudan': ['Khartoum']
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
        'chiang rai': "צ'יאנג ראי",
        'krabi': 'קראבי',
        'hua hin': 'חואה הין',
        'trat': 'טראט',
        'ayutthaya': 'איוטאיה',
        'ko phi phi': 'פיפי',
        // UAE
        'abu dhabi': 'אבו דאבי',
        'dubai': 'דובאי',
        'sharjah': 'שארג\'ה',
        // Israel
        'tel aviv': 'תל אביב',
        'tel-aviv': 'תל אביב',
        'jerusalem': 'ירושלים',
        'haifa': 'חיפה',
        'eilat': 'אילת',
        'dead sea': 'ים המלח',
        'nazareth': 'נצרת',
        'tiberias': 'טבריה',
        // Europe — Western
        'paris': 'פריז',
        'nice': 'ניס',
        'lyon': 'ליון',
        'marseille': 'מארסיי',
        'bordeaux': 'בורדו',
        'cannes': 'קאן',
        'chamonix': 'שאמוני',
        'london': 'לונדון',
        'edinburgh': 'אדינבורו',
        'manchester': 'מנצ\'סטר',
        'liverpool': 'ליברפול',
        'glasgow': 'גלזגו',
        'oxford': 'אוקספורד',
        'rome': 'רומא',
        'milan': 'מילאנו',
        'florence': 'פירנצה',
        'venice': 'ונציה',
        'naples': 'נאפולי',
        'turin': 'טורינו',
        'verona': 'ורונה',
        'bologna': 'בולוניה',
        'sicily': 'סיציליה',
        'sardinia': 'סרדיניה',
        'amalfi': 'אמאלפי',
        'barcelona': 'ברצלונה',
        'madrid': 'מדריד',
        'seville': 'סביליה',
        'valencia': 'ולנסיה',
        'granada': 'גרנדה',
        'mallorca': 'מיורקה',
        'ibiza': 'איביזה',
        'tenerife': 'טנריף',
        'malaga': 'מלאגה',
        'lisbon': 'ליסבון',
        'porto': 'פורטו',
        'algarve': 'אלגארב',
        'sintra': 'סינטרה',
        'madeira': 'מדיירה',
        'amsterdam': 'אמסטרדם',
        'rotterdam': 'רוטרדם',
        'utrecht': 'אוטרכט',
        'berlin': 'ברלין',
        'munich': 'מינכן',
        'hamburg': 'המבורג',
        'frankfurt': 'פרנקפורט',
        'cologne': 'קלן',
        'heidelberg': 'היידלברג',
        'zurich': 'ציריך',
        'geneva': 'ז\'נבה',
        'lucerne': 'לוצרן',
        'interlaken': 'אינטרלאקן',
        'zermatt': 'צרמט',
        'bern': 'ברן',
        'vienna': 'וינה',
        'salzburg': 'זלצבורג',
        'innsbruck': 'אינסברוק',
        'hallstatt': 'הלשטאט',
        'brussels': 'בריסל',
        'bruges': 'ברוז\'',
        'ghent': 'גנט',
        'antwerp': 'אנטוורפן',
        'dublin': 'דבלין',
        'cork': 'קורק',
        'galway': 'גאלוויי',
        // Europe — Central / Eastern
        'prague': 'פראג',
        'brno': 'ברנו',
        'budapest': 'בודפשט',
        'eger': 'אגר',
        'debrecen': 'דברצן',
        'athens': 'אתונה',
        'santorini': 'סנטוריני',
        'mykonos': 'מיקונוס',
        'crete': 'כרתים',
        'rhodes': 'רודוס',
        'corfu': 'קורפו',
        'thessaloniki': 'סלוניקי',
        'dubrovnik': 'דוברובניק',
        'split': 'ספליט',
        'hvar': 'חוואר',
        'zagreb': 'זאגרב',
        'zadar': 'זאדר',
        'warsaw': 'ורשה',
        'krakow': 'קרקוב',
        'gdansk': 'גדנסק',
        'wroclaw': 'ורוצלב',
        'bucharest': 'בוקרשט',
        'brasov': 'בראשוב',
        'moscow': 'מוסקבה',
        'saint petersburg': 'סנט פטרסבורג',
        'tallinn': 'טאלין',
        'riga': 'ריגה',
        'vilnius': 'וילנה',
        'kyiv': 'קייב',
        'lviv': 'לבוב',
        'sofia': 'סופיה',
        'plovdiv': 'פלובדיב',
        'varna': 'וארנה',
        'bratislava': 'ברטיסלבה',
        'ljubljana': 'לובליאנה',
        'bled': 'בלד',
        'tirana': 'טירנה',
        'saranda': 'סרנדה',
        'ksamil': 'קסמיל',
        'belgrade': 'בלגרד',
        'kotor': 'קוטור',
        'budva': 'בודבה',
        'sarajevo': 'סראייבו',
        'mostar': 'מוסטר',
        'skopje': 'סקופיה',
        'ohrid': 'אוחריד',
        'luxembourg city': 'לוקסמבורג',
        'monaco': 'מונקו',
        'monte carlo': 'מונטה קרלו',
        'valletta': 'ולטה',
        'gozo': 'גוזו',
        'sliema': 'סלימה',
        'mdina': 'מדינה',
        'reykjavik': 'רייקיאוויק',
        'helsinki': 'הלסינקי',
        'stockholm': 'שטוקהולם',
        'gothenburg': 'גטבורג',
        'oslo': 'אוסלו',
        'bergen': 'ברגן',
        'copenhagen': 'קופנהגן',
        // North America
        'new york': 'ניו יורק',
        'los angeles': 'לוס אנג\'לס',
        'miami': 'מיאמי',
        'orlando': 'אורלנדו',
        'san francisco': 'סן פרנסיסקו',
        'las vegas': 'לאס וגאס',
        'chicago': 'שיקגו',
        'washington': 'וושינגטון',
        'boston': 'בוסטון',
        'hawaii': 'הוואי',
        'toronto': 'טורונטו',
        'vancouver': 'ונקובר',
        'montreal': 'מונטריאול',
        'quebec city': 'קוויבק סיטי',
        'banff': 'באנף',
        'mexico city': 'מקסיקו סיטי',
        'cancun': 'קנקון',
        'tulum': 'טולום',
        'playa del carmen': 'פלאיה דל כרמן',
        'cabo san lucas': 'קאבו סן לוקאס',
        'havana': 'הוואנה',
        'varadero': 'ורדרו',
        'punta cana': 'פונטה קאנה',
        'nassau': 'נסאו',
        'san juan': 'סן חואן',
        'antigua': 'אנטיגואה',
        // South America
        'rio de janeiro': 'ריו דה ז\'ניירו',
        'sao paulo': 'סאו פאולו',
        'salvador': 'סלבדור',
        'foz do iguacu': 'איגואסו',
        'buenos aires': 'בואנוס איירס',
        'mendoza': 'מנדוסה',
        'bariloche': 'בריצ\'ה',
        'ushuaia': 'אושוואיה',
        'lima': 'לימה',
        'cusco': 'קוסקו',
        'machu picchu': 'מאצ\'ו פיצ\'ו',
        'bogota': 'בוגוטה',
        'medellin': 'מדיין',
        'cartagena': 'קרטחנה',
        'santiago': 'סנטיאגו',
        'quito': 'קיטו',
        'galapagos': 'גלפגוס',
        'la paz': 'לה פאס',
        'uyuni': 'אויוני',
        'montevideo': 'מונטווידאו',
        'punta del este': 'פונטה דל אסטה',
        // Asia — East / SE
        'tokyo': 'טוקיו',
        'kyoto': 'קיוטו',
        'osaka': 'אוסקה',
        'sapporo': 'סאפורו',
        'fukuoka': 'פוקואוקה',
        'nara': 'נארה',
        'okinawa': 'אוקינאווה',
        'hakone': 'האקונה',
        'hiroshima': 'הירושימה',
        'seoul': 'סיאול',
        'busan': 'בוסאן',
        'jeju city': 'ג\'ז\'ו',
        'incheon': 'אינצ\'און',
        'hong kong': 'הונג קונג',
        'macau': 'מקאו',
        'singapore': 'סינגפור',
        'sentosa': 'סנטוסה',
        'bali': 'באלי',
        'ubud': 'אובוד',
        'jakarta': 'ג\'קרטה',
        'yogyakarta': 'יוגיאקרטה',
        'lombok': 'לומבוק',
        'kuala lumpur': 'קואלה לומפור',
        'penang': 'פנאנג',
        'langkawi': 'לנגקאווי',
        'beijing': 'בייג\'ינג',
        'shanghai': 'שנגחאי',
        'xi\'an': 'שיאן',
        'hanoi': 'האנוי',
        'ho chi minh city': 'הו צ\'י מין',
        'da nang': 'דה נאנג',
        'hoi an': 'הוי אן',
        'phu quoc': 'פו קווק',
        'ha long bay': 'הא לונג',
        'phnom penh': 'פנום פן',
        'siem reap': 'סיאם ריאפ',
        'taipei': 'טאיפיי',
        'kaohsiung': 'קאוסיונג',
        // Asia — South / Indian Subcontinent
        'new delhi': 'ניו דלהי',
        'delhi': 'דלהי',
        'mumbai': 'מומבאי',
        'jaipur': 'ג\'איפור',
        'agra': 'אגרה',
        'goa': 'גואה',
        'varanasi': 'ורנאסי',
        'kerala': 'קראלה',
        'malé': 'מאלה',
        'male': 'מאלה',
        'colombo': 'קולומבו',
        'kandy': 'קנדי',
        'galle': 'גאלה',
        'kathmandu': 'קטמנדו',
        'pokhara': 'פוקרה',
        'thimphu': 'תימפו',
        'paro': 'פארו',
        // Asia — Caucasus / Central
        'tbilisi': 'טביליסי',
        'batumi': 'באטומי',
        'kazbegi': 'קזבגי',
        'kutaisi': 'קוטאיסי',
        'mestia': 'מסטיה',
        'borjomi': 'בורז\'ומי',
        'mtskheta': 'מצחתה',
        'yerevan': 'ירוואן',
        'gyumri': 'גיומרי',
        'dilijan': 'דיליז\'אן',
        'baku': 'באקו',
        'tashkent': 'טשקנט',
        'samarkand': 'סמרקנד',
        'bukhara': 'בוכרה',
        'almaty': 'אלמטי',
        'astana': 'אסטנה',
        'bishkek': 'בישקק',
        // Middle East
        'amman': 'עמאן',
        'petra': 'פטרה',
        'aqaba': 'עקבה',
        'wadi rum': 'ואדי רם',
        'beirut': 'ביירות',
        'doha': 'דוחה',
        'riyadh': 'ריאד',
        'jeddah': 'ג\'דה',
        'mecca': 'מכה',
        'medina': 'מדינה',
        'alula': 'אל עולא',
        'muscat': 'מוסקט',
        'manama': 'מנאמה',
        'kuwait city': 'כווית',
        'tehran': 'טהרן',
        'isfahan': 'איספהאן',
        'shiraz': 'שיראז',
        'istanbul': 'איסטנבול',
        'cappadocia': 'קפדוקיה',
        'antalya': 'אנטליה',
        'bodrum': 'בודרום',
        'izmir': 'איזמיר',
        'ankara': 'אנקרה',
        'nicosia': 'ניקוסיה',
        'paphos': 'פאפוס',
        'limassol': 'לימסול',
        'ayia napa': 'איה נאפה',
        'larnaca': 'לרנקה',
        // Philippines
        'manila': 'מנילה',
        'cebu': 'סבו',
        'boracay': 'בוראקאי',
        'el nido': 'אל נידו',
        'palawan': 'פלאוואן',
        'coron': 'קורון',
        'bohol': 'בוהול',
        'siargao': 'סיארגאו',
        // Africa
        'cairo': 'קהיר',
        'luxor': 'לוקסור',
        'aswan': 'אסואן',
        'hurghada': 'חורגדה',
        'sharm el sheikh': 'שארם א-שייח',
        'cape town': 'קייפטאון',
        'johannesburg': 'יוהנסבורג',
        'durban': 'דרבן',
        'marrakech': 'מרקש',
        'casablanca': 'קזבלנקה',
        'fes': 'פס',
        'chefchaouen': 'שפשאון',
        'tangier': 'טנג\'יר',
        'nairobi': 'ניירובי',
        'mombasa': 'מומבסה',
        'maasai mara': 'מאסאי מארה',
        'zanzibar': 'זנזיבר',
        'serengeti': 'סרנגטי',
        'tunis': 'תוניס',
        'djerba': 'ג\'רבה',
        'addis ababa': 'אדיס אבבה',
        'accra': 'אקרה',
        'windhoek': 'וינדהוק',
        'sossusvlei': 'סוסוסוולי',
        'victoria falls': 'מפלי ויקטוריה',
        'kigali': 'קיגלי',
        'mahe': 'מאהה',
        'praslin': 'פראסלין',
        // Oceania
        'sydney': 'סידני',
        'melbourne': 'מלבורן',
        'brisbane': 'בריסביין',
        'gold coast': 'גולד קוסט',
        'perth': 'פרת\'',
        'cairns': 'קיירנס',
        'auckland': 'אוקלנד',
        'queenstown': 'קווינסטאון',
        'wellington': 'וולינגטון',
        'christchurch': 'קרייסטצ\'רץ\'',
        'nadi': 'נאדי',
        'bora bora': 'בורה בורה',
        'papeete': 'פפיטה',
        // Countries (shown when only destination is set, or for country-level picks)
        'thailand': 'תאילנד',
        'israel': 'ישראל',
        'italy': 'איטליה',
        'france': 'צרפת',
        'greece': 'יוון',
        'japan': 'יפן',
        'georgia': 'גאורגיה',
        'philippines': 'הפיליפינים',
        'spain': 'ספרד',
        'germany': 'גרמניה',
        'united kingdom': 'אנגליה',
        'portugal': 'פורטוגל',
        'netherlands': 'הולנד',
        'switzerland': 'שווייץ',
        'austria': 'אוסטריה',
        'czech republic': 'צ\'כיה',
        'hungary': 'הונגריה',
        'croatia': 'קרואטיה',
        'belgium': 'בלגיה',
        'ireland': 'אירלנד',
        'sweden': 'שבדיה',
        'norway': 'נורבגיה',
        'denmark': 'דנמרק',
        'finland': 'פינלנד',
        'iceland': 'איסלנד',
        'poland': 'פולין',
        'romania': 'רומניה',
        'russia': 'רוסיה',
        'bulgaria': 'בולגריה',
        'slovakia': 'סלובקיה',
        'slovenia': 'סלובניה',
        'estonia': 'אסטוניה',
        'latvia': 'לטביה',
        'lithuania': 'ליטא',
        'ukraine': 'אוקראינה',
        'albania': 'אלבניה',
        'serbia': 'סרביה',
        'montenegro': 'מונטנגרו',
        'bosnia and herzegovina': 'בוסניה',
        'north macedonia': 'מקדוניה',
        'luxembourg': 'לוקסמבורג',
        'malta': 'מלטה',
        'cyprus': 'קפריסין',
        'vietnam': 'וייטנאם',
        'indonesia': 'אינדונזיה',
        'cambodia': 'קמבודיה',
        'malaysia': 'מלזיה',
        'maldives': 'האיים המלדיביים',
        'sri lanka': 'סרי לנקה',
        'taiwan': 'טייוואן',
        'china': 'סין',
        'south korea': 'דרום קוריאה',
        'india': 'הודו',
        'nepal': 'נפאל',
        'bhutan': 'בהוטן',
        'myanmar': 'מיאנמר',
        'laos': 'לאוס',
        'mongolia': 'מונגוליה',
        'kazakhstan': 'קזחסטן',
        'uzbekistan': 'אוזבקיסטן',
        'kyrgyzstan': 'קירגיזסטן',
        'iran': 'איראן',
        'turkey': 'טורקיה',
        'jordan': 'ירדן',
        'lebanon': 'לבנון',
        'saudi arabia': 'סעודיה',
        'qatar': 'קטאר',
        'oman': 'עומאן',
        'bahrain': 'בחריין',
        'kuwait': 'כווית',
        'united arab emirates': 'איחוד האמירויות',
        'egypt': 'מצרים',
        'morocco': 'מרוקו',
        'south africa': 'דרום אפריקה',
        'kenya': 'קניה',
        'tanzania': 'טנזניה',
        'tunisia': 'תוניסיה',
        'ethiopia': 'אתיופיה',
        'namibia': 'נמיביה',
        'botswana': 'בוטסואנה',
        'zimbabwe': 'זימבבואה',
        'mozambique': 'מוזמביק',
        'madagascar': 'מדגסקר',
        'mauritius': 'מאוריציוס',
        'seychelles': 'איי סיישל',
        'rwanda': 'רואנדה',
        'uganda': 'אוגנדה',
        'nigeria': 'ניגריה',
        'australia': 'אוסטרליה',
        'new zealand': 'ניו זילנד',
        'fiji': 'פיג\'י',
        'french polynesia': 'פולינזיה הצרפתית',
        'united states': 'ארה"ב',
        'canada': 'קנדה',
        'mexico': 'מקסיקו',
        'cuba': 'קובה',
        'dominican republic': 'הרפובליקה הדומיניקנית',
        'jamaica': 'ג\'מייקה',
        'bahamas': 'איי בהאמה',
        'costa rica': 'קוסטה ריקה',
        'panama': 'פנמה',
        'guatemala': 'גואטמלה',
        'belize': 'בליז',
        'puerto rico': 'פוארטו ריקו',
        'brazil': 'ברזיל',
        'argentina': 'ארגנטינה',
        'peru': 'פרו',
        'colombia': 'קולומביה',
        'chile': 'צ\'ילה',
        'ecuador': 'אקוודור',
        'bolivia': 'בוליביה',
        'uruguay': 'אורוגוואי',
        'venezuela': 'ונצואלה',
        'armenia': 'ארמניה',
        'azerbaijan': 'אזרבייג\'ן',
};

// Reverse map for fast Hebrew → English key lookup
const HEBREW_TO_ENGLISH_KEY: Record<string, string> = Object.entries(CITY_HEBREW_NAMES)
        .reduce((acc, [en, he]) => { acc[he] = en; return acc; }, {} as Record<string, string>);

// Simple Levenshtein distance for short strings (city names are ≤ ~20 chars).
// Used to collapse Hebrew transliteration variants like "פטאיה" / "פטאייה".
const levenshtein = (a: string, b: string): number => {
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;
        const row: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
        for (let i = 1; i <= a.length; i++) {
                let prev = i;
                for (let j = 1; j <= b.length; j++) {
                        const val = a[i - 1] === b[j - 1] ? row[j - 1] : 1 + Math.min(row[j - 1], row[j], prev);
                        row[j - 1] = prev;
                        prev = val;
                }
                row[b.length] = prev;
        }
        return row[b.length];
};

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
        // Fuzzy Hebrew match: an unrecognised Hebrew string that differs from a
        // known Hebrew city name by ≤ 1 char (≤ 2 for longer names) is almost
        // certainly a transliteration variant (e.g. "פטאיה" vs "פטאייה").
        // Collapse it to the known canonical English key instead of returning
        // a unique Hebrew key that would create a duplicate city entry.
        if (/[֐-׿]/.test(cleaned) && cleaned.length >= 4) {
                const maxDist = cleaned.length >= 6 ? 2 : 1;
                let bestEn = '';
                let bestDist = maxDist + 1;
                for (const [hebrew, en] of Object.entries(HEBREW_TO_ENGLISH_KEY)) {
                        const norm = normalizeCityRaw(hebrew);
                        const dist = levenshtein(cleaned, norm);
                        if (dist < bestDist) { bestDist = dist; bestEn = en; }
                }
                if (bestEn) return bestEn;
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

        // ALL English aliases that resolve to the same Hebrew form. The
        // canonical English picked by cityKey() is whichever alias the
        // lookup table iterates last (e.g. "ko chang" for קו צ'אנג even
        // when the actual location string says "Koh Chang"). Without
        // this loop, the substring check above misses the 'h' variant.
        if (hebrewForm) {
                for (const [en, he] of Object.entries(CITY_HEBREW_NAMES)) {
                        if (he === hebrewForm && locLower.includes(en)) return true;
                }
        }

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
        if (!address && !hotelName) return (trip.destination || '').split(/[-–—&,]/)[0].trim();

        // Build known cities database from trip data to help disambiguate
        const knownCities = new Set<string>();

        // From trip destination (e.g., "Georgia - Tbilisi & Batumi" or em-dash variants)
        (trip.destination || '').split(/[-–—&,]/).forEach(part => {
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

        // Final Candidate — use any common separator (ASCII hyphen, en/em-dash,
        // ampersand, comma) so multi-city destination strings get split.
        let candidate = (trip.destination || '').split(/[-–—&,]/)[0].trim();
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
                // Prefer display name from the canonical key when the raw input is an
                // unrecognised Hebrew variant (displayCityName would pass it through as-is).
                // Example: raw="פטאיה" → key="pattaya" → display="Pattaya" rather than "פטאיה".
                let display = displayCityName(raw, lang);
                if (lang === 'en' && /[֐-׿]/.test(display)) {
                        // Still Hebrew after lookup — use titlecased canonical key instead
                        display = key.replace(/\b\w/g, c => c.toUpperCase());
                }
                output.push(display);
        };

        // Pre-compute the set of hotel city KEYS so we can filter flight-only
        // destinations out when requested (language-agnostic comparison).
        const hotelCityKeys = new Set<string>();
        trip.hotels?.forEach(h => {
                const extracted = extractRobustCity(h.address || '', h.name || '', trip);
                if (extracted) hotelCityKeys.add(cityKey(extracted));
                if (h.city) hotelCityKeys.add(cityKey(h.city));
        });

        // 1. Wizard Destination — accept ASCII hyphen, en-dash, em-dash, ampersand,
        // comma as separators (with or without surrounding spaces) so multi-city
        // strings always split, regardless of how they were typed.
        if (trip.destination) {
                trip.destination.split(/\s*[-–—&,]\s*/).forEach(s => add(s.trim()));
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

// ============================================================================
// Country flag emojis — one entry per country in WORLD_DESTINATIONS. Used by
// the destination picker to render rich result rows. Keys are the same English
// country names that index WORLD_DESTINATIONS.
// ============================================================================
export const COUNTRY_FLAGS: Record<string, string> = {
        'Philippines': '🇵🇭', 'Thailand': '🇹🇭', 'Vietnam': '🇻🇳', 'Japan': '🇯🇵',
        'South Korea': '🇰🇷', 'Indonesia': '🇮🇩', 'China': '🇨🇳', 'Cambodia': '🇰🇭',
        'Singapore': '🇸🇬', 'Malaysia': '🇲🇾', 'India': '🇮🇳', 'Maldives': '🇲🇻',
        'Sri Lanka': '🇱🇰', 'Taiwan': '🇹🇼', 'United Arab Emirates': '🇦🇪',
        'Israel': '🇮🇱', 'Turkey': '🇹🇷', 'Georgia': '🇬🇪', 'Armenia': '🇦🇲',
        'Azerbaijan': '🇦🇿', 'Jordan': '🇯🇴', 'Iran': '🇮🇷', 'Pakistan': '🇵🇰',
        'Bangladesh': '🇧🇩', 'Nepal': '🇳🇵', 'Bhutan': '🇧🇹', 'Myanmar': '🇲🇲',
        'Laos': '🇱🇦', 'Brunei': '🇧🇳', 'Mongolia': '🇲🇳', 'Kazakhstan': '🇰🇿',
        'Uzbekistan': '🇺🇿', 'Kyrgyzstan': '🇰🇬', 'Tajikistan': '🇹🇯', 'Turkmenistan': '🇹🇲',
        'Saudi Arabia': '🇸🇦', 'Qatar': '🇶🇦', 'Oman': '🇴🇲', 'Bahrain': '🇧🇭',
        'Kuwait': '🇰🇼', 'Lebanon': '🇱🇧', 'Cyprus': '🇨🇾',
        'France': '🇫🇷', 'Italy': '🇮🇹', 'United Kingdom': '🇬🇧', 'Spain': '🇪🇸',
        'Germany': '🇩🇪', 'Greece': '🇬🇷', 'Portugal': '🇵🇹', 'Netherlands': '🇳🇱',
        'Switzerland': '🇨🇭', 'Austria': '🇦🇹', 'Czech Republic': '🇨🇿', 'Hungary': '🇭🇺',
        'Croatia': '🇭🇷', 'Belgium': '🇧🇪', 'Ireland': '🇮🇪', 'Sweden': '🇸🇪',
        'Norway': '🇳🇴', 'Denmark': '🇩🇰', 'Finland': '🇫🇮', 'Iceland': '🇮🇸',
        'Poland': '🇵🇱', 'Romania': '🇷🇴', 'Russia': '🇷🇺', 'Bulgaria': '🇧🇬',
        'Slovakia': '🇸🇰', 'Slovenia': '🇸🇮', 'Estonia': '🇪🇪', 'Latvia': '🇱🇻',
        'Lithuania': '🇱🇹', 'Ukraine': '🇺🇦', 'Albania': '🇦🇱', 'Serbia': '🇷🇸',
        'Montenegro': '🇲🇪', 'Bosnia and Herzegovina': '🇧🇦', 'North Macedonia': '🇲🇰',
        'Luxembourg': '🇱🇺', 'Liechtenstein': '🇱🇮', 'Monaco': '🇲🇨', 'Andorra': '🇦🇩',
        'Malta': '🇲🇹',
        'United States': '🇺🇸', 'Canada': '🇨🇦', 'Mexico': '🇲🇽', 'Cuba': '🇨🇺',
        'Dominican Republic': '🇩🇴', 'Jamaica': '🇯🇲', 'Bahamas': '🇧🇸', 'Barbados': '🇧🇧',
        'Costa Rica': '🇨🇷', 'Panama': '🇵🇦', 'Guatemala': '🇬🇹', 'Belize': '🇧🇿',
        'Honduras': '🇭🇳', 'Nicaragua': '🇳🇮', 'El Salvador': '🇸🇻', 'Puerto Rico': '🇵🇷',
        'Trinidad and Tobago': '🇹🇹',
        'Brazil': '🇧🇷', 'Argentina': '🇦🇷', 'Peru': '🇵🇪', 'Colombia': '🇨🇴',
        'Chile': '🇨🇱', 'Ecuador': '🇪🇨', 'Bolivia': '🇧🇴', 'Uruguay': '🇺🇾',
        'Paraguay': '🇵🇾', 'Venezuela': '🇻🇪',
        'Australia': '🇦🇺', 'New Zealand': '🇳🇿', 'Fiji': '🇫🇯', 'French Polynesia': '🇵🇫',
        'Samoa': '🇼🇸', 'Vanuatu': '🇻🇺', 'Solomon Islands': '🇸🇧', 'Tonga': '🇹🇴',
        'Egypt': '🇪🇬', 'South Africa': '🇿🇦', 'Morocco': '🇲🇦', 'Kenya': '🇰🇪',
        'Tanzania': '🇹🇿', 'Tunisia': '🇹🇳', 'Algeria': '🇩🇿', 'Ethiopia': '🇪🇹',
        'Ghana': '🇬🇭', 'Senegal': '🇸🇳', 'Namibia': '🇳🇦', 'Botswana': '🇧🇼',
        'Zimbabwe': '🇿🇼', 'Mozambique': '🇲🇿', 'Madagascar': '🇲🇬', 'Mauritius': '🇲🇺',
        'Seychelles': '🇸🇨', 'Rwanda': '🇷🇼', 'Uganda': '🇺🇬', 'Nigeria': '🇳🇬',
        'Sudan': '🇸🇩',
};

// ============================================================================
// Search helper for the destination picker.
//
// Returns ranked results matching `query` against:
//   - country names (English + Hebrew)
//   - city names (English + Hebrew)
//
// Each result carries enough info for the dropdown to render: the canonical
// city / country, the Hebrew label, the country flag, and a `kind` flag so
// the UI can show different icons for country vs city picks.
// ============================================================================
export type DestinationKind = 'country' | 'city';
export interface DestinationMatch {
        kind: DestinationKind;
        /** Canonical English name (e.g. "Budapest" or "Hungary") */
        canonical: string;
        /** Hebrew label if known, else canonical */
        hebrew: string;
        /** Owning country (English). For city kind only — equals canonical for country kind. */
        country: string;
        /** Owning country in Hebrew if known, else country */
        countryHebrew: string;
        flag: string;
        /** Lower is better. 0 = exact match, < 1 = strong prefix, etc. */
        score: number;
}

const stripDiacritics = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

const normalizeForSearch = (s: string): string => stripDiacritics(
        s.normalize('NFC').toLowerCase()
).replace(/[^a-z0-9֐-׿\s]/gi, '').trim();

const heLabel = (englishKey: string, fallback: string): string => CITY_HEBREW_NAMES[englishKey.toLowerCase()] || fallback;

/**
 * Score a candidate against a normalized query. Lower is better; Infinity = no match.
 *
 * Hierarchy:
 *   0       → exact match
 *   0.1     → starts-with match (longer candidate gets a slight penalty)
 *   0.5     → contains match
 *   1 + lev → fuzzy match within Levenshtein tolerance (≤ 2 for ≥6 chars, ≤ 1 otherwise)
 *   Infinity → no match
 */
const scoreCandidate = (candidate: string, query: string): number => {
        const c = normalizeForSearch(candidate);
        const q = normalizeForSearch(query);
        if (!c || !q) return Infinity;
        if (c === q) return 0;
        if (c.startsWith(q)) return 0.1 + (c.length - q.length) * 0.001;
        if (c.includes(q)) return 0.5 + (c.length - q.length) * 0.001;
        // Fuzzy fallback only for queries ≥ 4 chars to avoid junk matches
        if (q.length >= 4) {
                const maxDist = q.length >= 6 ? 2 : 1;
                const dist = levenshtein(c, q);
                if (dist <= maxDist) return 1 + dist;
        }
        return Infinity;
};

export const searchDestinations = (rawQuery: string, limit = 8): DestinationMatch[] => {
        const query = (rawQuery || '').trim();
        if (query.length < 1) return [];

        const seen = new Set<string>();
        const out: DestinationMatch[] = [];

        const push = (kind: DestinationKind, country: string, name: string, score: number) => {
                if (!isFinite(score)) return;
                const key = `${kind}:${name.toLowerCase()}|${country.toLowerCase()}`;
                if (seen.has(key)) return;
                seen.add(key);
                const flag = COUNTRY_FLAGS[country] || '🌐';
                const hebrew = kind === 'country'
                        ? heLabel(country, country)
                        : heLabel(name, name);
                const countryHebrew = heLabel(country, country);
                out.push({ kind, canonical: name, hebrew, country, countryHebrew, flag, score });
        };

        // Score every country (English + Hebrew)
        for (const country of Object.keys(WORLD_DESTINATIONS)) {
                const heCountry = heLabel(country, country);
                const sEn = scoreCandidate(country, query);
                const sHe = scoreCandidate(heCountry, query);
                const score = Math.min(sEn, sHe);
                if (isFinite(score)) push('country', country, country, score);

                // Score every city in the country (English + Hebrew)
                for (const city of WORLD_DESTINATIONS[country]) {
                        const heCity = heLabel(city, city);
                        const cEn = scoreCandidate(city, query);
                        const cHe = scoreCandidate(heCity, query);
                        const cScore = Math.min(cEn, cHe);
                        if (isFinite(cScore)) push('city', country, city, cScore);
                }
        }

        out.sort((a, b) => {
                if (a.score !== b.score) return a.score - b.score;
                // Tie-break: cities before countries (more specific wins)
                if (a.kind !== b.kind) return a.kind === 'city' ? -1 : 1;
                return a.canonical.length - b.canonical.length;
        });

        return out.slice(0, limit);
};
