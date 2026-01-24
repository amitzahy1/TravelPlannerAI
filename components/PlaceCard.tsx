import React from 'react';
import { Star, MapIcon, Plus, CheckCircle2, Trophy, Hotel, AlertTriangle } from 'lucide-react';

export interface PlaceCardProps {
        type: 'restaurant' | 'attraction';
        name: string;
        nameEnglish?: string;
        description: string;
        location: string;
        rating?: number;
        cuisine?: string;
        attractionType?: string;
        price?: string;
        badges?: Array<{ label: string; icon?: any; color: string; bgColor: string; borderColor: string }>;
        visualIcon: string;
        visualBgColor: string;
        mapsUrl: string;
        isAdded: boolean;
        onAdd: () => void;
        recommendationSource?: string;
        isHotelRestaurant?: boolean;
        verification_needed?: boolean;
}

/**
 * Unified PlaceCard Component
 * Used for both Restaurant and Attraction search results
 * Ensures consistent "Smart Edition" premium look across all searches
 */
export const PlaceCard: React.FC<PlaceCardProps> = ({
        type,
        name,
        nameEnglish,
        description,
        location,
        rating,
        cuisine,
        attractionType,
        price,
        badges,
        visualIcon,
        visualBgColor,
        mapsUrl,
        isAdded,
        onAdd,
        recommendationSource,
        isHotelRestaurant,
        verification_needed
}) => {
        // Display Name (Prefer English for maps compatibility)
        const displayName = nameEnglish || name;

        // Determine button colors based on type
        const buttonColor = type === 'restaurant'
                ? 'bg-orange-600 hover:bg-orange-700'
                : 'bg-blue-600 hover:bg-blue-700';

        return (
                <div className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col border border-slate-100 h-full group">

                        {/* Icon Header */}
                        <div
                                className={`h-28 ${visualBgColor} relative flex items-center justify-center rounded-t-2xl overflow-hidden group-hover:opacity-90 transition-all`}
                        >
                                <span className="text-4xl filter drop-shadow-sm transform group-hover:scale-110 transition-transform duration-300">
                                        {visualIcon}
                                </span>

                                {/* Rating Badge */}
                                {rating && (
                                        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 shadow-sm border border-slate-100">
                                                <span className="text-xs font-bold text-slate-800">{rating}</span>
                                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                        </div>
                                )}

                                {/* Verification Warning */}
                                {verification_needed && (
                                        <div className="absolute top-2 left-2 bg-amber-50 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 shadow-sm border border-amber-200">
                                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                                <span className="text-[9px] font-medium text-amber-700">נדרש אימות</span>
                                        </div>
                                )}
                        </div>

                        {/* Content */}
                        <div className="p-3 flex flex-col flex-grow relative">

                                {/* Title */}
                                <h3 className="text-base font-bold text-slate-900 leading-tight mb-1 line-clamp-2" dir="ltr">
                                        {displayName}
                                </h3>

                                {/* Badges */}
                                <div className="flex flex-wrap gap-1 mb-2">
                                        {recommendationSource && (
                                                <span className={`text-[9px] font-medium ${type === 'restaurant' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 'bg-purple-50 text-purple-700 border-purple-100'} px-2 py-0.5 rounded-full flex items-center gap-1 border`}>
                                                        <Trophy className="w-2.5 h-2.5" />
                                                        {recommendationSource.replace('Bib', 'Michelin')}
                                                </span>
                                        )}
                                        {isHotelRestaurant && (
                                                <span className="text-[9px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1 border border-indigo-100">
                                                        <Hotel className="w-2.5 h-2.5" /> במלון
                                                </span>
                                        )}
                                        {(cuisine || attractionType) && (
                                                <span className="text-[9px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                                        {cuisine || attractionType}
                                                </span>
                                        )}
                                        {price && (
                                                <span className="text-[9px] font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100">
                                                        {price}
                                                </span>
                                        )}
                                        {/* Custom badges */}
                                        {badges?.map((badge, idx) => (
                                                <span
                                                        key={idx}
                                                        className={`text-[9px] font-medium ${badge.bgColor} ${badge.color} px-2 py-0.5 rounded-full flex items-center gap-1 border ${badge.borderColor}`}
                                                >
                                                        {badge.icon && <badge.icon className="w-2.5 h-2.5" />}
                                                        {badge.label}
                                                </span>
                                        ))}
                                </div>

                                {/* Description */}
                                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-3 flex-grow" dir="rtl">
                                        {description}
                                </p>

                                {/* Footer Buttons */}
                                <div className="flex gap-2 mt-auto">
                                        <a
                                                href={mapsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg py-1.5 flex items-center justify-center gap-1.5 transition-colors text-[10px] font-bold"
                                        >
                                                <MapIcon className="w-3.5 h-3.5" /> מפה
                                        </a>
                                        <button
                                                onClick={onAdd}
                                                disabled={isAdded}
                                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${isAdded
                                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                                : `${buttonColor} text-white`
                                                        }`}
                                        >
                                                {isAdded ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                                {isAdded ? 'נשמר' : 'שמור'}
                                        </button>
                                </div>
                        </div>
                </div>
        );
};
