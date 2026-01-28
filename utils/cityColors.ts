export interface CityTheme {
        bg: string;
        border: string;
        text: string;
        textLight: string; // לימים בשבוע
        badge: string;     // לרקע של התאריך
        icon: string;
}

const THEMES: CityTheme[] = [
        // 0. Beach / Tropical (Orange/Amber) - בורקאי/חופים
        {
                bg: 'bg-gradient-to-r from-orange-50 to-amber-50',
                border: 'border-orange-200',
                text: 'text-orange-900',
                textLight: 'text-orange-600',
                badge: 'bg-orange-100 text-orange-800',
                icon: 'text-orange-500'
        },
        // 1. Urban / Corporate (Blue/Indigo) - בנגקוק/ערים
        {
                bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
                border: 'border-blue-200',
                text: 'text-blue-900',
                textLight: 'text-blue-600',
                badge: 'bg-blue-100 text-blue-800',
                icon: 'text-blue-500'
        },
        // 2. Nature (Emerald/Teal) - צפון/טבע
        {
                bg: 'bg-gradient-to-r from-emerald-50 to-teal-50',
                border: 'border-emerald-200',
                text: 'text-emerald-900',
                textLight: 'text-emerald-600',
                badge: 'bg-emerald-100 text-emerald-800',
                icon: 'text-emerald-500'
        },
        // 3. Romantic / Soft (Rose/Pink)
        {
                bg: 'bg-gradient-to-r from-rose-50 to-pink-50',
                border: 'border-rose-200',
                text: 'text-rose-900',
                textLight: 'text-rose-600',
                badge: 'bg-rose-100 text-rose-800',
                icon: 'text-rose-500'
        },
        // 4. Nightlife (Violet/Purple)
        {
                bg: 'bg-gradient-to-r from-violet-50 to-purple-50',
                border: 'border-violet-200',
                text: 'text-purple-900',
                textLight: 'text-purple-600',
                badge: 'bg-purple-100 text-purple-800',
                icon: 'text-purple-500'
        },
        // 5. Coastal / Fresh (Cyan/Sky)
        {
                bg: 'bg-gradient-to-r from-cyan-50 to-sky-50',
                border: 'border-cyan-200',
                text: 'text-cyan-900',
                textLight: 'text-cyan-700',
                badge: 'bg-cyan-100 text-cyan-800',
                icon: 'text-cyan-600'
        }
];

export const getCityTheme = (cityName: string): CityTheme => {
        if (!cityName) {
                // ברירת מחדל אפורה/נקייה
                return {
                        bg: 'bg-white',
                        border: 'border-slate-200',
                        text: 'text-slate-800',
                        textLight: 'text-slate-500',
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
