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
