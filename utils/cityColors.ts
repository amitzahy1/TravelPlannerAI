export const CITY_COLORS = [
        'from-orange-50 to-amber-50 border-orange-100', // Beach / Tropical
        'from-blue-50 to-indigo-50 border-blue-100',    // Urban / Corporate
        'from-emerald-50 to-teal-50 border-emerald-100', // Nature / Forest
        'from-rose-50 to-pink-50 border-rose-100',       // Romantic / Floral
        'from-violet-50 to-purple-50 border-violet-100',  // Nightlife / Culture
        'from-cyan-50 to-sky-50 border-cyan-100',        // Coastal / Fresh
        'from-fuchsia-50 to-pink-50 border-fuchsia-100', // Vibrant
        'from-lime-50 to-green-50 border-lime-100'       // Fresh / Outdoors
];

export const getCityColorClass = (cityName: string) => {
        if (!cityName) return 'bg-white';

        // Deterministic hash
        let hash = 0;
        for (let i = 0; i < cityName.length; i++) {
                hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash) % CITY_COLORS.length;
        return `bg-gradient-to-br ${CITY_COLORS[index]}`;
};
