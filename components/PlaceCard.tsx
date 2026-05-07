import React, { useState, useEffect } from 'react';
import { Star, MapIcon, Trophy, Plus, Navigation, AlertTriangle } from 'lucide-react';
import { getFoodImage, getAttractionImage } from '../services/imageMapper';
import { resolveRealPlaceImage } from '../services/placeImageService';
import { getEnglishName } from '../utils/displayName';

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
        geocodeFailed?: boolean;
        verificationStatus?: 'verified' | 'ambiguous' | 'not_found' | 'manual';
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
        isHotelRestaurant,
        verification_needed,
        geocodeFailed,
        verificationStatus,
}) => {
        // Same OR as the modal banner so the badge and the "כדאי לבדוק" panel
        // appear together — never one without the other.
        const showVerificationBadge = !!verification_needed || !!geocodeFailed
                || verificationStatus === 'not_found' || verificationStatus === 'ambiguous';
        // 1. Get Context-Aware Visual (Isolated Paths)
        const tags = [cuisine || attractionType || '', location];
        const searchName = getEnglishName({ name, nameEnglish, location });

        // Strict Isolation: Never call a generic mapper
        const { url: initialUrl, label: visualLabel } = type === 'restaurant'
                ? getFoodImage(searchName, description, tags)
                : getAttractionImage(searchName, description, tags);

        const [imgSrc, setImgSrc] = useState(initialUrl);
        const [realPhotoTried, setRealPhotoTried] = useState(false);

        useEffect(() => {
                setImgSrc(initialUrl);
                setRealPhotoTried(false);
        }, [initialUrl]);

        // Try to upgrade the stock-photo fallback to a real photo from Wikipedia.
        // Pass the explicit place type so the resolver validates results against
        // it — 'Sorn' the K-pop singer doesn't get returned when we're asking
        // about 'Sorn' the Bangkok restaurant.
        useEffect(() => {
                let cancelled = false;
                resolveRealPlaceImage(searchName, location, type).then(real => {
                        if (!cancelled && real) setImgSrc(real);
                        if (!cancelled) setRealPhotoTried(true);
                });
                return () => { cancelled = true; };
        }, [searchName, location, type]);

        const handleError = () => {
                // Self-Healing Fallback — if the Wikipedia image 404s, go back to
                // the category stock photo; if THAT breaks, use a global default.
                if (imgSrc !== initialUrl && realPhotoTried) {
                        setImgSrc(initialUrl);
                        return;
                }
                setImgSrc(type === 'restaurant'
                        ? 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80'
                        : 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80');
        };

        const displayName = getEnglishName({ name, nameEnglish, location });

        return (
                <div
                        onClick={onClick}
                        className={`group relative w-full h-36 sm:h-44 md:h-48 rounded-xl md:rounded-2xl overflow-hidden shadow-sm bg-slate-100 transition-all duration-300 ${onClick ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]' : ''}`}
                >
                        {/* Background Image (Zoom Effect) */}
                        <img
                                src={imgSrc}
                                alt={displayName}
                                onError={handleError}
                                loading="lazy"
                                decoding="async"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 brightness-110"
                        />

                        {/* Premium Scrim (Bottom-up) */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                        {/* Top Row: cuisine chip (right in RTL) + actions (left in RTL).
                                 Buttons kept compact (w-7 = 28px) so the cuisine label
                                 has room. The chip is `dir="ltr"` so truncation cuts
                                 the END of the text (right side visually) instead of
                                 the START — matches reading order for English labels
                                 like "FINE DINING 💎" / "MICHELIN GUIDE". */}
                        <div className="absolute top-2 inset-x-2 flex items-start justify-between gap-1.5 z-30 pointer-events-none">
                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                        <span dir="ltr" className="px-2 py-0.5 rounded-md backdrop-blur-md bg-black/30 border border-white/15 text-[9px] font-black text-white uppercase tracking-wide truncate text-center">
                                                {visualLabel}
                                        </span>
                                        {showVerificationBadge && (
                                                <span
                                                        title="כדאי לוודא שעות פתיחה / זמינות לפני הביקור"
                                                        aria-label="כדאי לבדוק לפני הביקור"
                                                        className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md backdrop-blur-md bg-amber-500/85 border border-amber-300/70 text-[8.5px] font-black text-white uppercase tracking-wide flex-shrink-0"
                                                >
                                                        <AlertTriangle className="w-2.5 h-2.5" />
                                                        <span>בדוק</span>
                                                </span>
                                        )}
                                </div>
                                <div className="flex gap-1 pointer-events-auto flex-shrink-0">
                                        <a
                                                href={mapsUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-7 h-7 flex items-center justify-center bg-black/30 backdrop-blur-md border border-white/15 rounded-full text-white hover:bg-white hover:text-slate-900 transition-all active:scale-90"
                                                aria-label="ניווט"
                                        >
                                                <Navigation className="w-3 h-3" />
                                        </a>
                                        <button
                                                onClick={(e) => { e.stopPropagation(); onAdd(); }}
                                                className={`w-7 h-7 flex items-center justify-center backdrop-blur-md border rounded-full transition-all shadow-lg active:scale-90 ${isAdded ? 'bg-yellow-400 border-yellow-500 text-yellow-900' : 'bg-black/30 border-white/15 text-white hover:bg-white hover:text-slate-900'}`}
                                                aria-label={isAdded ? 'הסר מהמועדפים' : 'הוסף למועדפים'}
                                        >
                                                <Star className={`w-3 h-3 ${isAdded ? 'fill-current' : ''}`} />
                                        </button>
                                </div>
                        </div>

                        {/* Content Container */}
                        <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col gap-1 z-10 pointer-events-none">
                                <h3 className="text-base font-black text-white leading-tight line-clamp-2 drop-shadow-sm" dir="ltr">
                                        {displayName}
                                </h3>

                                <div className="flex items-center gap-1 text-slate-300 text-[10px] font-medium opacity-90">
                                        <Navigation className="w-2.5 h-2.5 flex-shrink-0" />
                                        <span className="truncate">{location}</span>
                                </div>

                                {/* Bottom row: rating + recommendationSource on a single
                                         pill so the recommendation has the full width when
                                         present. Rating sits inline with the source — saves
                                         a row and lets the long Michelin / Asia 50 Best
                                         text use almost the entire card width. */}
                                {(rating || recommendationSource) && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                                {rating && (
                                                        <span className="flex items-center gap-0.5 text-white text-[10px] font-black bg-black/45 px-1.5 py-0.5 rounded-md backdrop-blur-sm flex-shrink-0">
                                                                <Star className="w-2.5 h-2.5 fill-current text-yellow-400" />
                                                                <span>{rating}</span>
                                                        </span>
                                                )}
                                                {recommendationSource && (
                                                        <span className="flex items-center gap-1 text-yellow-300 text-[9px] font-black uppercase tracking-tight bg-black/45 px-1.5 py-0.5 rounded-md backdrop-blur-sm min-w-0 flex-1">
                                                                <Trophy className="w-2.5 h-2.5 flex-shrink-0" />
                                                                <span className="truncate">{recommendationSource.replace('Bib', 'Michelin')}</span>
                                                        </span>
                                                )}
                                        </div>
                                )}
                        </div>
                </div>
        );
};
