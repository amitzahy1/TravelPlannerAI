export interface CityTheme {
        bg: string;
        border: string;
        text: string;
        textLight: string; // לימים בשבוע
        badge: string;     // לרקע של התאריך
        icon: string;
}

// Google Style: Neutral texts, pastel backgrounds, color accents on badges/icons
// Badge Text set to slate-900 (Black) per user request
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
        { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-white', textLight: 'text-amber-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 7. Modern (Fuchsia)
        { bg: 'bg-fuchsia-600', border: 'border-fuchsia-700', text: 'text-white', textLight: 'text-fuchsia-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 8. Forest (Green)
        { bg: 'bg-green-600', border: 'border-green-700', text: 'text-white', textLight: 'text-green-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 9. Royal (Indigo)
        { bg: 'bg-indigo-600', border: 'border-indigo-700', text: 'text-white', textLight: 'text-indigo-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 10. Sunset (Red)
        { bg: 'bg-red-500', border: 'border-red-600', text: 'text-white', textLight: 'text-red-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 11. Aqua (Cyan)
        { bg: 'bg-cyan-600', border: 'border-cyan-700', text: 'text-white', textLight: 'text-cyan-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 12. Lavender (Purple)
        { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-white', textLight: 'text-purple-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 13. Earth (Stone/Yellow)
        { bg: 'bg-yellow-500', border: 'border-yellow-600', text: 'text-white', textLight: 'text-yellow-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 14. Berry (Pink)
        { bg: 'bg-pink-600', border: 'border-pink-700', text: 'text-white', textLight: 'text-pink-100', badge: 'bg-white/20 text-white', icon: 'text-white' },
        // 15. Ocean (Teal)
        { bg: 'bg-teal-600', border: 'border-teal-700', text: 'text-white', textLight: 'text-teal-100', badge: 'bg-white/20 text-white', icon: 'text-white' }
];

export const getCityTheme = (cityName: string): CityTheme => {
        if (!cityName) {
                // Return a default theme that is NOT white, preventing "blank" look
                // Using Slate theme as default fallback
                return {
                        bg: 'bg-slate-50',
                        border: 'border-slate-200',
                        text: 'text-slate-800',
                        textLight: 'text-slate-500',
                        badge: 'bg-slate-200 text-slate-900',
                        icon: 'text-slate-500'
                };
        }

        let hash = 0;
        for (let i = 0; i < cityName.length; i++) {
                hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % THEMES.length;
        return THEMES[index];
};
