import React, { useState, useEffect } from 'react';
import { Star, MapIcon, Trophy, Plus, Navigation } from 'lucide-react';
import { getFoodImage, getAttractionImage } from '../services/imageMapper';

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
        mapsUrl: string;
        isAdded: boolean;
        onAdd: () => void;
        onClick?: () => void;
        recommendationSource?: string;
        isHotelRestaurant?: boolean;
        verification_needed?: boolean;
}

/**
 * Titanium Interactive PlaceCard
 * Tactile, Context-Aware, and Visually Stunning.
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
        mapsUrl,
        isAdded,
        onAdd,
        onClick,
        recommendationSource,
        isHotelRestaurant
}) => {
        // 1. Get Context-Aware Visual (Isolated Paths)
        const tags = [cuisine || attractionType || '', location];
        const searchName = nameEnglish || name;

        // Strict Isolation: Never call a generic mapper
        const { url: initialUrl, label: visualLabel } = type === 'restaurant'
                ? getFoodImage(searchName, description, tags)
                : getAttractionImage(searchName, description, tags);

        const [imgSrc, setImgSrc] = useState(initialUrl);

        useEffect(() => {
                setImgSrc(initialUrl);
        }, [initialUrl]);

        const handleError = () => {
                // Self-Healing Fallback
                setImgSrc(type === 'restaurant'
                        ? 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80'
                        : 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80');
        };

        const displayName = nameEnglish || name;

        return (
                <div
                        onClick={onClick}
                        className={`group relative w-full h-48 rounded-2xl overflow-hidden shadow-sm bg-slate-100 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]' : ''}`}
                >
                        {/* Background Image (Zoom Effect) */}
                        <img
                                src={imgSrc}
                                alt={displayName}
                                onError={handleError}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 brightness-110"
                        />

                        {/* Premium Scrim (Bottom-up) */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                        {/* Top Actions (Floating) */}
                        <div className="absolute top-3 right-3 flex gap-2 z-30">
                                <a
                                        href={mapsUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2.5 bg-black/20 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white hover:text-slate-900 transition-all active:scale-90"
                                >
                                        <Navigation className="w-4 h-4" />
                                </a>
                                <button
                                        onClick={(e) => { e.stopPropagation(); onAdd(); }}
                                        className={`p-2.5 backdrop-blur-md border rounded-full transition-all shadow-lg active:scale-90 ${isAdded ? 'bg-yellow-400 border-yellow-500 text-yellow-900' : 'bg-black/20 border-white/10 text-white hover:bg-white hover:text-slate-900'}`}
                                >
                                        {isAdded ? <Star className="w-4 h-4 fill-current" /> : <Star className="w-4 h-4" />}
                                </button>
                        </div>

                        {/* Context Badge (Top Left) */}
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 z-20">
                                <span className="text-[10px] font-black text-white uppercase tracking-wider">{visualLabel}</span>
                        </div>

                        {/* Content Container */}
                        <div className="absolute inset-0 p-4 flex flex-col justify-end z-10 pointer-events-none">
                                <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                                {recommendationSource && (
                                                        <span className="flex items-center gap-1 text-yellow-400 text-[9px] font-black uppercase tracking-tighter bg-black/20 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                                                                <Trophy className="w-2.5 h-2.5" />
                                                                {recommendationSource.replace('Bib', 'Michelin')}
                                                        </span>
                                                )}
                                                {rating && (
                                                        <div className="flex items-center gap-0.5 text-white text-[10px] font-black bg-black/20 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                                                                <span>{rating}</span>
                                                                <Star className="w-2.5 h-2.5 fill-current text-yellow-400" />
                                                        </div>
                                                )}
                                        </div>

                                        <h3 className="text-base font-black text-white leading-tight line-clamp-2 drop-shadow-sm" dir="ltr">
                                                {displayName}
                                        </h3>

                                        <div className="flex items-center gap-1 text-slate-300 text-[10px] font-medium opacity-90">
                                                <Navigation className="w-2.5 h-2.5" />
                                                <span className="truncate">{location}</span>
                                        </div>
                                </div>
                        </div>
                </div>
        );
};
