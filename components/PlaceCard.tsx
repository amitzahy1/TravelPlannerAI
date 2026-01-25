import React, { useState, useEffect } from 'react';
import { Star, MapIcon, Trash2, CheckCircle2, Trophy, Hotel, AlertTriangle, Plus, Utensils, Landmark, Moon, Navigation } from 'lucide-react';
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

// Helper to get Smart Chip styling based on category
const getSmartChipStyle = (type: string, cuisine?: string, attractionType?: string) => {
        const category = (cuisine || attractionType || '').toLowerCase();

        // Food categories
        if (type === 'restaurant' || cuisine) {
                if (category.includes('bar') || category.includes('nightlife') || category.includes('pub')) {
                        return { bg: 'bg-indigo-500/90', icon: Moon, label: cuisine || 'Nightlife' };
                }
                if (category.includes('cafe') || category.includes('coffee')) {
                        return { bg: 'bg-amber-500/90', icon: Utensils, label: cuisine || 'Cafe' };
                }
                return { bg: 'bg-orange-500/90', icon: Utensils, label: cuisine || 'Restaurant' };
        }

        // Attraction categories
        if (category.includes('museum') || category.includes('temple') || category.includes('history') || category.includes('culture')) {
                return { bg: 'bg-purple-500/90', icon: Landmark, label: attractionType || 'Culture' };
        }
        if (category.includes('nature') || category.includes('park') || category.includes('beach') || category.includes('garden')) {
                return { bg: 'bg-emerald-500/90', icon: MapIcon, label: attractionType || 'Nature' };
        }

        return { bg: 'bg-blue-500/90', icon: MapIcon, label: attractionType || 'Attraction' };
};

/**
 * Visual PlaceCard Component
 * High-Impact visual design with deterministic cover images.
 * Titanium UX: Vivid images, bottom-only gradient, glassmorphism Smart Chips.
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
        const { url: coverImage, label: visualLabel } = getPlaceImage(searchName, type, tags);
        const [imgSrc, setImgSrc] = useState(coverImage);
        const [hasError, setHasError] = useState(false);

        // Sync local source when external coverImage changes (e.g. category switch)
        useEffect(() => {
                setImgSrc(coverImage);
                setHasError(false);
        }, [coverImage]);

        const handleError = () => {
                if (!hasError) {
                        setHasError(true);
                        // Bulletproof permanent fallback (Very reliable Unsplash stock travel photo)
                        setImgSrc('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80');
                }
        };

        const displayName = nameEnglish || name;

        // Get Smart Chip styling (Legacy logic for color coordination)
        const chipStyle = getSmartChipStyle(type, cuisine, attractionType);
        const ChipIcon = chipStyle.icon;

        return (
                <div className="group relative w-full h-48 rounded-xl overflow-hidden shadow-md bg-slate-900 transition-all duration-300 hover:shadow-xl hover:scale-[1.01]">

                        {/* Background Image (Zoom Effect) - FIXED SOURCE PRIORITY + SELF HEALING */}
                        <img
                                src={imgSrc}
                                alt={displayName}
                                onError={handleError}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 brightness-110"
                        />

                        {/* Gradient Floor - PREMIUM MATERIAL 3 SCRIM */}
                        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />

                        {/* Content Container */}
                        <div className="absolute inset-0 p-4 flex flex-col justify-end z-10">

                                {/* Top Actions (Floating) - PERMANENTLY VISIBLE FOR ACCESSIBILITY */}
                                <div className="absolute top-3 right-3 flex gap-2 z-30">
                                        <a
                                                href={mapsUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2.5 bg-black/40 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white hover:text-slate-900 transition-all shadow-lg active:scale-90"
                                                title="View on Map"
                                        >
                                                <Navigation className="w-4 h-4" />
                                        </a>
                                        <button
                                                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                                                className={`p-2.5 backdrop-blur-md border rounded-full transition-all shadow-lg relative z-20 active:scale-90 ${isAdded ? 'bg-yellow-400 border-yellow-500 text-yellow-900' : 'bg-black/40 border-white/20 text-white hover:bg-white hover:text-slate-900'}`}
                                                title={isAdded ? "Remove" : "Save"}
                                        >
                                                {isAdded ? <Star className="w-4 h-4 fill-current" /> : <Star className="w-4 h-4" />}
                                        </button>
                                </div>

                                {/* Semantic Category Badge (Material 3 Glassmorphism) */}
                                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl backdrop-blur-md bg-white/15 border border-white/30 shadow-xl z-20 flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-white drop-shadow-lg whitespace-nowrap">{visualLabel}</span>
                                </div>

                                {/* Rating Badge (Optimized Placement) */}
                                {rating && (
                                        <div className="absolute top-[54px] left-3 flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 shadow-sm">
                                                <span className="text-sm font-bold text-white drop-shadow-md">{rating}</span>
                                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
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
                                                {price && (
                                                        <>
                                                                <span>•</span>
                                                                <span className="text-green-400">{price}</span>
                                                        </>
                                                )}
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-lg font-black text-white leading-tight line-clamp-2 drop-shadow-md mb-1" dir="ltr">
                                                {displayName}
                                        </h3>

                                        {/* Location Badge (Brief) */}
                                        <div className="flex items-center gap-1 text-slate-300 text-xs truncate max-w-[85%] drop-shadow-sm">
                                                <Navigation className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">{location}</span>
                                        </div>
                                </div>
                        </div>
                </div>
        );
};
