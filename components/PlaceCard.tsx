import React, { useState, useEffect } from 'react';
import { Star, MapIcon, Trophy, Plus, Navigation, AlertTriangle, X } from 'lucide-react';
import { getFoodImage, getAttractionImage } from '../services/imageMapper';
import { getEnglishName } from '../utils/displayName';
import { useLazyPlaceImage } from '../hooks/useLazyPlaceImage';

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
        /** Optional CDN photo URL (e.g. Google Places). Takes precedence over the stock/Wiki photo. */
        photoUrl?: string;
        /** Set when Google Places couldn't find this place — shows a small X badge. */
        googleNotFound?: boolean;
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
        photoUrl,
        googleNotFound,
}) => {
        // Same OR as the modal banner so the badge and the "כדאי לבדוק" panel
        // appear together — never one without the other.
        const showVerificationBadge = !!verification_needed || !!geocodeFailed
                || verificationStatus === 'not_found' || verificationStatus === 'ambiguous';
        // 1. Get Context-Aware Visual (Isolated Paths)
        // NOTE: do not include `location` in tags — "Bangkok, Thailand" would
        // make every Bangkok venue match the Thai branch in getFoodImage,
        // even cocktail bars / cafes / sushi spots. Cuisine detection must
        // be driven by the cuisine field, not the address.
        const tags = [cuisine || attractionType || ''];
        const searchName = getEnglishName({ name, nameEnglish, location });

        // Strict Isolation: Never call a generic mapper
        const { url: initialUrl, label: visualLabel } = type === 'restaurant'
                ? getFoodImage(searchName, description, tags)
                : getAttractionImage(searchName, description, tags);

        // Google Places photo wins over stock + Wikipedia fallback when present.
        const [imgSrc, setImgSrc] = useState(photoUrl || initialUrl);
        const [realPhotoTried, setRealPhotoTried] = useState(!!photoUrl);

        useEffect(() => {
                setImgSrc(photoUrl || initialUrl);
                setRealPhotoTried(!!photoUrl);
        }, [photoUrl, initialUrl]);

        // Lazy upgrade to a Wikipedia photo — only fires when the card scrolls
        // into view, so a list of 80 cards doesn't burst 480 requests at mount.
        const { ref: lazyRef, resolvedUrl } = useLazyPlaceImage({
                name: searchName,
                city: location,
                type,
                skip: !!photoUrl,
                onResolved: () => setRealPhotoTried(true),
        });
        useEffect(() => {
                if (resolvedUrl) setImgSrc(resolvedUrl);
        }, [resolvedUrl]);

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
                        ref={lazyRef}
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
                                        <span
                                                dir="ltr"
                                                className="px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-md text-slate-900 text-[10px] font-bold uppercase tracking-[0.1em] truncate shadow-[0_4px_12px_-2px_rgba(0,0,0,0.35)] ring-1 ring-black/5"
                                        >
                                                {visualLabel}
                                        </span>
                                        {googleNotFound && (
                                                <span
                                                        title="לא נמצא ב-Google Maps — ייתכן שהמקום סגור או לא קיים"
                                                        aria-label="לא נמצא ב-Google Maps"
                                                        className="flex items-center px-1.5 py-0.5 rounded-md backdrop-blur-md bg-red-500/85 border border-red-300/70 text-[8.5px] font-black text-white flex-shrink-0"
                                                >
                                                        <X className="w-2.5 h-2.5" />
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

                        {/* Content Container — location row intentionally removed; full
                                 address is in the modal. */}
                        <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col gap-1 z-10 pointer-events-none">
                                <h3 className="text-base font-black text-white leading-tight line-clamp-2 drop-shadow-sm" dir="ltr">
                                        {displayName}
                                </h3>

                                {/* Bottom row: rating + recommendationSource on a single
                                         pill so the recommendation has the full width when
                                         present. The inner <span> is dir="ltr" so truncation
                                         drops the END of long URL-like sources (e.g.
                                         "IAMKOHCHANG.COM…") instead of the start. */}
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
                                                                <span dir="ltr" className="truncate text-start min-w-0">{recommendationSource.replace('Bib', 'Michelin')}</span>
                                                        </span>
                                                )}
                                        </div>
                                )}
                        </div>
                </div>
        );
};
