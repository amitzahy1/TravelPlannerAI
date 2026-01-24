import React from 'react';
import {
        Utensils, Coffee, Pizza, Beer, Wine, GlassWater,
        Mountain, Palmtree, Tent, Camera, Ticket, Map,
        Landmark, Music, ShoppingBag, Sun, Building2
} from 'lucide-react';

interface PlaceIllustrationProps {
        type: 'restaurant' | 'attraction' | 'hotel' | 'shopping' | 'other';
        subType?: string; // cuisine or attraction type
        className?: string;
}

export const getPlaceIllustration = (props: PlaceIllustrationProps) => {
        const { type, subType = '', className = "w-12 h-12" } = props;
        const lowerSubType = subType.toLowerCase();

        // 1. RESTAURANTS
        if (type === 'restaurant') {
                if (lowerSubType.includes('coffee') || lowerSubType.includes('cafe')) {
                        return <div className={`p-4 rounded-full bg-amber-100 text-amber-600 ${className} flex items-center justify-center`}><Coffee className="w-[60%] h-[60%]" /></div>;
                }
                if (lowerSubType.includes('pizza') || lowerSubType.includes('italian')) {
                        return <div className={`p-4 rounded-full bg-red-100 text-red-600 ${className} flex items-center justify-center`}><Pizza className="w-[60%] h-[60%]" /></div>;
                }
                if (lowerSubType.includes('bar') || lowerSubType.includes('pub') || lowerSubType.includes('nightlife')) {
                        return <div className={`p-4 rounded-full bg-purple-100 text-purple-600 ${className} flex items-center justify-center`}><Beer className="w-[60%] h-[60%]" /></div>;
                }
                if (lowerSubType.includes('fine') || lowerSubType.includes('wine')) {
                        return <div className={`p-4 rounded-full bg-rose-100 text-rose-600 ${className} flex items-center justify-center`}><Wine className="w-[60%] h-[60%]" /></div>;
                }
                // Default Food
                return <div className={`p-4 rounded-full bg-orange-100 text-orange-500 ${className} flex items-center justify-center`}><Utensils className="w-[60%] h-[60%]" /></div>;
        }

        // 2. ATTRACTIONS
        if (type === 'attraction') {
                if (lowerSubType.includes('nature') || lowerSubType.includes('park') || lowerSubType.includes('garden')) {
                        return <div className={`p-4 rounded-full bg-green-100 text-green-600 ${className} flex items-center justify-center`}><Palmtree className="w-[60%] h-[60%]" /></div>;
                }
                if (lowerSubType.includes('mountain') || lowerSubType.includes('hike')) {
                        return <div className={`p-4 rounded-full bg-emerald-100 text-emerald-600 ${className} flex items-center justify-center`}><Mountain className="w-[60%] h-[60%]" /></div>;
                }
                if (lowerSubType.includes('museum') || lowerSubType.includes('history') || lowerSubType.includes('culture') || lowerSubType.includes('temple')) {
                        return <div className={`p-4 rounded-full bg-stone-100 text-stone-600 ${className} flex items-center justify-center`}><Landmark className="w-[60%] h-[60%]" /></div>;
                }
                if (lowerSubType.includes('beach') || lowerSubType.includes('sea')) {
                        return <div className={`p-4 rounded-full bg-cyan-100 text-cyan-600 ${className} flex items-center justify-center`}><Sun className="w-[60%] h-[60%]" /></div>;
                }
                if (lowerSubType.includes('show') || lowerSubType.includes('performance')) {
                        return <div className={`p-4 rounded-full bg-violet-100 text-violet-600 ${className} flex items-center justify-center`}><Music className="w-[60%] h-[60%]" /></div>;
                }
                // Default Attraction
                return <div className={`p-4 rounded-full bg-teal-100 text-teal-600 ${className} flex items-center justify-center`}><Ticket className="w-[60%] h-[60%]" /></div>;
        }

        // 3. SHOPPING
        if (type === 'shopping') {
                return <div className={`p-4 rounded-full bg-pink-100 text-pink-600 ${className} flex items-center justify-center`}><ShoppingBag className="w-[60%] h-[60%]" /></div>;
        }

        // 4. HOTELS
        if (type === 'hotel') {
                return <div className={`p-4 rounded-full bg-indigo-100 text-indigo-600 ${className} flex items-center justify-center`}><Building2 className="w-[60%] h-[60%]" /></div>;
        }

        // Default Fallback
        return <div className={`p-4 rounded-full bg-slate-100 text-slate-500 ${className} flex items-center justify-center`}><Map className="w-[60%] h-[60%]" /></div>;
};

export const PlaceIllustration: React.FC<PlaceIllustrationProps> = (props) => {
        return getPlaceIllustration(props);
};
