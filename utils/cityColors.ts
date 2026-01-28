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
        // 0. Beach / Tropical (Orange) - Distinct
        {
                bg: 'bg-orange-50',
                border: 'border-orange-200',
                text: 'text-slate-800',
                textLight: 'text-slate-500',
                badge: 'bg-orange-100 text-slate-900', // Fixed to Black
                icon: 'text-orange-500'
        },
        // 1. Urban (Blue) - Distinct
        {
                bg: 'bg-blue-50',
                border: 'border-blue-200',
                text: 'text-slate-800',
                textLight: 'text-slate-500',
                badge: 'bg-blue-100 text-slate-900',
                icon: 'text-blue-500'
        },
        // 2. Nature (Emerald) - Distinct
        {
                bg: 'bg-emerald-50',
                border: 'border-emerald-200',
                text: 'text-slate-800',
                textLight: 'text-slate-500',
                badge: 'bg-emerald-100 text-slate-900',
                icon: 'text-emerald-500'
        },
        // 3. Romantic (Rose) - Distinct
        {
                bg: 'bg-rose-50',
                border: 'border-rose-200',
                text: 'text-slate-800',
                textLight: 'text-slate-500',
                badge: 'bg-rose-100 text-slate-900',
                icon: 'text-rose-500'
        },
        // 4. Nightlife (Violet) - Distinct
        {
                bg: 'bg-violet-50',
                border: 'border-violet-200',
                text: 'text-slate-800',
                textLight: 'text-slate-500',
                badge: 'bg-violet-100 text-slate-900',
                icon: 'text-violet-500'
        },
        // 5. Coastal (Sky/Cyan) - Boosted Intensity for visibility (Cebu fix)
        {
                bg: 'bg-sky-100', // Changed from 50 to 100 for visibility
                border: 'border-sky-300',
                text: 'text-slate-800',
                textLight: 'text-slate-500',
                badge: 'bg-sky-200 text-slate-900',
                icon: 'text-sky-600'
        },
        // 6. Historic (Amber) - New
        {
                bg: 'bg-amber-50',
                border: 'border-amber-200',
                text: 'text-slate-800',
                textLight: 'text-slate-500',
                badge: 'bg-amber-100 text-slate-900',
                icon: 'text-amber-600'
        },
        // 7. Modern (Fuchsia) - New
        {
                bg: 'bg-fuchsia-50',
                border: 'border-fuchsia-200',
                text: 'text-slate-800',
                textLight: 'text-slate-500',
                badge: 'bg-fuchsia-100 text-slate-900',
                icon: 'text-fuchsia-600'
        }
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
