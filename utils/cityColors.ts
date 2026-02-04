import { getCountryForCity } from './geoData';

export interface CityTheme {
        bg: string;
        border: string;
        text: string;
        textLight: string; // לימים בשבוע
        badge: string;     // לרקע של התאריך
        icon: string;
}

// Google Style: Neutral texts, pastel backgrounds, color accents on badges/icons
// 20+ UNIQUE COLORS (excluding yellow, white, gray)
const THEMES: CityTheme[] = [
        // 0. Beach / Tropical (Orange)
        { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-white', textLight: 'text-orange-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 1. Urban (Blue)
        { bg: 'bg-blue-600', border: 'border-blue-700', text: 'text-white', textLight: 'text-blue-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 2. Nature (Emerald)
        { bg: 'bg-emerald-600', border: 'border-emerald-700', text: 'text-white', textLight: 'text-emerald-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 3. Romantic (Rose)
        { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-white', textLight: 'text-rose-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 4. Nightlife (Violet)
        { bg: 'bg-violet-600', border: 'border-violet-700', text: 'text-white', textLight: 'text-violet-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 5. Coastal (Sky)
        { bg: 'bg-sky-500', border: 'border-sky-600', text: 'text-white', textLight: 'text-sky-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 6. Historic (Amber)
        { bg: 'bg-amber-600', border: 'border-amber-700', text: 'text-white', textLight: 'text-amber-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 7. Modern (Fuchsia)
        { bg: 'bg-fuchsia-600', border: 'border-fuchsia-700', text: 'text-white', textLight: 'text-fuchsia-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 8. Forest (Green) - USED FOR BOHOL
        { bg: 'bg-green-600', border: 'border-green-700', text: 'text-white', textLight: 'text-green-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 9. Royal (Indigo)
        { bg: 'bg-indigo-600', border: 'border-indigo-700', text: 'text-white', textLight: 'text-indigo-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 10. Sunset (Red)
        { bg: 'bg-red-500', border: 'border-red-600', text: 'text-white', textLight: 'text-red-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 11. Aqua (Cyan)
        { bg: 'bg-cyan-600', border: 'border-cyan-700', text: 'text-white', textLight: 'text-cyan-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 12. Lavender (Purple) - USED FOR CEBU
        { bg: 'bg-purple-600', border: 'border-purple-700', text: 'text-white', textLight: 'text-purple-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 13. Berry (Pink)
        { bg: 'bg-pink-600', border: 'border-pink-700', text: 'text-white', textLight: 'text-pink-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 14. Ocean (Teal)
        { bg: 'bg-teal-600', border: 'border-teal-700', text: 'text-white', textLight: 'text-teal-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 15. Desert (Orange-600) - FOR ABU DHABI/DUBAI
        { bg: 'bg-orange-600', border: 'border-orange-700', text: 'text-white', textLight: 'text-orange-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 16. Wine (Rose-600)
        { bg: 'bg-rose-600', border: 'border-rose-700', text: 'text-white', textLight: 'text-rose-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 17. Deep Ocean (Blue-700)
        { bg: 'bg-blue-700', border: 'border-blue-800', text: 'text-white', textLight: 'text-blue-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 18. Autumn (Orange-700)
        { bg: 'bg-orange-700', border: 'border-orange-800', text: 'text-white', textLight: 'text-orange-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 19. Jungle (Lime-600)
        { bg: 'bg-lime-600', border: 'border-lime-700', text: 'text-white', textLight: 'text-lime-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 20. Galaxy (Slate-700)
        { bg: 'bg-slate-700', border: 'border-slate-800', text: 'text-white', textLight: 'text-slate-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 21. Coral (Red-400)
        { bg: 'bg-red-400', border: 'border-red-500', text: 'text-white', textLight: 'text-red-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 22. Deep Purple (Violet-700)
        { bg: 'bg-violet-700', border: 'border-violet-800', text: 'text-white', textLight: 'text-violet-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 23. Sapphire (Indigo-700)
        { bg: 'bg-indigo-700', border: 'border-indigo-800', text: 'text-white', textLight: 'text-indigo-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
];

// Explicit City Overrides to ensure distinct colors for popular destinations
const CITY_OVERRIDES: Record<string, number> = {
        // Philippines
        'manila': 1, // Urban Blue
        'makati': 1,
        'cebu': 12, // Lavender (Purple)
        'boracay': 0, // Tropical Orange
        'boracay island': 0,
        'boracay beach': 0,
        'el nido': 2, // Emerald
        'coron': 11, // Aqua
        'bohol': 8, // Forest Green - UNIQUE
        'siargao': 0,

        // Thailand (ALL DIFFERENT FROM PHILIPPINES)
        'bangkok': 6, // Amber (Historic/Temple)
        'phuket': 10, // Sunset Red
        'ko samui': 5, // Coastal Sky
        'chiang mai': 19, // Jungle Lime - CHANGED from 8 to avoid collision

        // UAE (UNIQUE DESERT COLORS)
        'abu dhabi': 15, // Desert Orange-600
        'dubai': 18, // Autumn Orange-700

        // General
        'tel aviv': 5, // Coastal
        'jerusalem': 9, // Royal
        'london': 17, // Deep Ocean Blue
        'paris': 3, // Romantic
        'new york': 20, // Galaxy Slate
        'tokyo': 7, // Modern Fuchsia
};

// Country-Level Defaults (Fallback if City not found)
const COUNTRY_THEMES: Record<string, number> = {
        'Philippines': 1, // Default Blue (matches Manila)
        'Thailand': 6,    // Default Amber (matches Bangkok)
        'Japan': 7,       // Modern
        'France': 3,      // Romantic
        'Italy': 16,      // Wine Rose - CHANGED
        'United Kingdom': 9, // Royal
        'United States': 1,  // Urban
        'United Arab Emirates': 15, // Desert Orange - CHANGED
        'Greece': 5,      // Coastal Blue
        'Maldives': 11,   // Aqua
        'Switzerland': 2, // Nature/Green
        'Israel': 5       // Coastal
};

export const getCityTheme = (cityName: string): CityTheme => {
        if (!cityName) {
                // Return a default theme that is NOT white, preventing "blank" look
                // Using Slate-600 (Dark Grey) as default fallback to ensure text-white is visible
                return {
                        bg: 'bg-slate-600',
                        border: 'border-slate-700',
                        text: 'text-white',
                        textLight: 'text-slate-300',
                        badge: 'bg-white/20 text-white',
                        icon: 'text-slate-300'
                };
        }

        const lowerName = cityName.trim().toLowerCase();

        // 1. Check for specific city overrides first (Priority: High)
        if (lowerName in CITY_OVERRIDES) {
                return THEMES[CITY_OVERRIDES[lowerName]];
        }

        // 2. Check for partial matches in overrides (e.g. "metro manila" -> match "manila")
        for (const [key, index] of Object.entries(CITY_OVERRIDES)) {
                if (lowerName.includes(key)) return THEMES[index];
        }

        // 3. Check for Country Theme (Priority: Medium)
        const country = getCountryForCity(cityName);
        if (country && COUNTRY_THEMES[country] !== undefined) {
                return THEMES[COUNTRY_THEMES[country]];
        }

        // 4. Fallback to consistent hash (Priority: Low)
        let hash = 0;
        for (let i = 0; i < cityName.length; i++) {
                hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % THEMES.length;
        return THEMES[index];
};
