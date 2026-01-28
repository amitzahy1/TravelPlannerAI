export interface CityTheme {
        bg: string;
        border: string;
        text: string;
        textLight: string; // לימים בשבוע
        badge: string;     // לרקע של התאריך
        icon: string;
}

// Google Style: Neutral texts, pastel backgrounds, color accents only on badges/icons
const THEMES: CityTheme[] = [
        // 0. Beach / Tropical (Orange/Amber)
        {
                bg: 'bg-orange-50', // צבע שטוח ובהיר מאוד במקום גרדיינט
                border: 'border-orange-100',
                text: 'text-slate-800', // Google Style: טקסט כהה וקריא
                textLight: 'text-slate-500',
                badge: 'bg-orange-100 text-orange-700',
                icon: 'text-orange-500'
        },
        // 1. Urban / Corporate (Blue/Indigo)
        {
                bg: 'bg-blue-50',
                border: 'border-blue-100',
                text: 'text-slate-800',
                textLight: 'text-slate-500',
                badge: 'bg-blue-100 text-blue-700',
                icon: 'text-blue-500'
        },
        // 2. Nature (Emerald/Teal)
        {
                bg: 'bg-emerald-50',
                border: 'border-emerald-100',
                text: 'text-slate-800',
                textLight: 'text-slate-500',
                badge: 'bg-emerald-100 text-emerald-700',
                icon: 'text-emerald-500'
        },
        // 3. Romantic / Soft (Rose/Pink)
        {
                bg: 'bg-rose-50',
                border: 'border-rose-100',
                text: 'text-slate-800',
                textLight: 'text-slate-500',
                badge: 'bg-rose-100 text-rose-700',
                icon: 'text-rose-500'
        },
        // 4. Nightlife (Violet/Purple)
        {
                bg: 'bg-violet-50',
                border: 'border-violet-100',
                text: 'text-slate-800',
                textLight: 'text-slate-500',
                badge: 'bg-violet-100 text-violet-700',
                icon: 'text-violet-500'
        },
        // 5. Coastal / Fresh (Cyan/Sky)
        {
                bg: 'bg-cyan-50',
                border: 'border-cyan-100',
                text: 'text-slate-800',
                textLight: 'text-slate-500',
                badge: 'bg-cyan-100 text-cyan-700',
                icon: 'text-cyan-600'
        }
];

export const getCityTheme = (cityName: string): CityTheme => {
        if (!cityName) {
                return {
                        bg: 'bg-white',
                        border: 'border-slate-100',
                        text: 'text-slate-800',
                        textLight: 'text-slate-400',
                        badge: 'bg-slate-100 text-slate-600',
                        icon: 'text-slate-400'
                };
        }

        let hash = 0;
        for (let i = 0; i < cityName.length; i++) {
                hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % THEMES.length;
        return THEMES[index];
};
