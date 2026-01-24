import React from 'react';
import { Star, MapIcon, Trash2, CheckCircle2, Trophy, Hotel, AlertTriangle, Plus } from 'lucide-react';
import { getPlaceImage } from '../services/imageMapper';

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
        visualIcon?: string;
        visualBgColor?: string;
        mapsUrl: string;
        isAdded: boolean;
        onAdd: () => void;
        recommendationSource?: string;
        isHotelRestaurant?: boolean;
        verification_needed?: boolean;
}

/**
 * Visual PlaceCard Component
 * High-Impact visual design with deterministic cover images.
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
        mapsUrl,
        isAdded,
        onAdd,
        recommendationSource,
        isHotelRestaurant,
        verification_needed
}) => {
        // 1. Get Smart Visual
        const tags = [
                cuisine || '',
                attractionType || '',
                recommendationSource || '',
                isHotelRestaurant ? 'Hotel' : '',
                location
        ].filter(Boolean);

        // Prefer English name for better matching if available, otherwise name
        const searchName = nameEnglish || name;
        const coverImage = getPlaceImage(searchName, type, tags);
        const displayName = nameEnglish || name;

        const mainCategory = type === 'restaurant' ? (cuisine || 'Restaurant') : (attractionType || 'Attraction');

        return (
                <div className="group relative w-full h-48 rounded-xl overflow-hidden shadow-md bg-slate-900 transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">

                        {/* Background Image (Zoom Effect) */}
                        <img
                                src={coverImage}
                                alt={displayName}
                                className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-110"
                        />

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 transition-opacity duration-300 group-hover:via-black/50" />

                        {/* Content Container */}
                        <div className="absolute inset-0 p-4 flex flex-col justify-end z-10">

                                {/* Top Actions (Floating) */}
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-[-10px] group-hover:translate-y-0">
                                        <a
                                                href={mapsUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-white hover:bg-white hover:text-slate-900 transition-colors shadow-lg"
                                                title="View on Map"
                                        >
                                                <MapIcon className="w-4 h-4" />
                                        </a>
                                        <button
                                                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                                                className={`p-2 backdrop-blur-md border rounded-full transition-colors shadow-lg ${isAdded ? 'bg-green-500/80 border-green-400 text-white' : 'bg-white/20 border-white/30 text-white hover:bg-white hover:text-slate-900'}`}
                                                title={isAdded ? "Remove" : "Save"}
                                        >
                                                {isAdded ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                        </button>
                                </div>

                                {/* Rating Badge (Top Left) */}
                                {rating && (
                                        <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 shadow-sm">
                                                <span className="text-sm font-bold text-white">{rating}</span>
                                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                        </div>
                                )}

                                {/* Main Info */}
                                <div className="transform transition-transform duration-300 group-hover:translate-y-[-4px]">
                                        {/* Tags / Subtitle */}
                                        <div className="flex items-center gap-2 mb-1 text-slate-300 text-[10px] font-medium tracking-wide uppercase">
                                                {recommendationSource && (
                                                        <span className="flex items-center gap-1 text-yellow-400">
                                                                <Trophy className="w-3 h-3" />
                                                                {recommendationSource.replace('Bib', 'Michelin')}
                                                        </span>
                                                )}
                                                <span>•</span>
                                                <span>{mainCategory}</span>
                                                {price && (
                                                        <>
                                                                <span>•</span>
                                                                <span className="text-green-400">{price}</span>
                                                        </>
                                                )}
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-lg font-black text-white leading-tight line-clamp-2 drop-shadow-sm mb-1" dir="ltr">
                                                {displayName}
                                        </h3>

                                        {/* Location Badge (Brief) */}
                                        <div className="flex items-center gap-1 text-slate-400 text-xs truncate max-w-[85%]">
                                                <MapIcon className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">{location}</span>
                                        </div>
                                </div>
                        </div>
                </div>
        );
};
