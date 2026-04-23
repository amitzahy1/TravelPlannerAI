import React, { useEffect, useState } from 'react';
import { resolveRealPlaceImage } from '../../services/placeImageService';

interface PlaceImageProps {
        name: string;
        /** Location / city — used to disambiguate generic restaurant names like 'Joe's'. */
        city?: string;
        /** Optional fallback image URL (e.g. from the category-based imageMapper). */
        fallbackUrl: string;
        /** Explicit override URL if a caller has already resolved one. */
        overrideUrl?: string;
        /** Tailwind classes for the <img>. */
        className?: string;
        alt?: string;
        /** If true, show the fallback immediately and upgrade to real photo once fetched. */
        progressive?: boolean;
}

/**
 * Image element that tries to fetch a REAL photo of the place from Wikipedia
 * first, then falls back to a category-based stock photo. Render is
 * synchronous — fallback shows immediately and swaps in a real photo once
 * the async resolver returns.
 */
export const PlaceImage: React.FC<PlaceImageProps> = ({
        name,
        city,
        fallbackUrl,
        overrideUrl,
        className,
        alt,
        progressive = true,
}) => {
        const [src, setSrc] = useState<string>(overrideUrl || fallbackUrl);
        const [broke, setBroke] = useState(false);

        useEffect(() => {
                if (overrideUrl) {
                        setSrc(overrideUrl);
                        return;
                }
                if (!progressive) return;
                let cancelled = false;
                resolveRealPlaceImage(name, city).then(realUrl => {
                        if (!cancelled && realUrl) setSrc(realUrl);
                });
                return () => { cancelled = true; };
        }, [name, city, overrideUrl, progressive]);

        return (
                <img
                        src={broke ? fallbackUrl : src}
                        alt={alt || name}
                        className={className}
                        loading="lazy"
                        onError={() => {
                                // If a Wikipedia URL 404s or is geo-blocked, fall back to the stock photo
                                if (!broke) setBroke(true);
                        }}
                />
        );
};
