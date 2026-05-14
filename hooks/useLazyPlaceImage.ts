import { useEffect, useRef, useState } from 'react';
import { resolveRealPlaceImage } from '../services/placeImageService';

type PlaceType = 'restaurant' | 'attraction' | 'hotel';

interface Options {
  name: string;
  city?: string;
  type: PlaceType;
  /** When true, skip the Wikipedia lookup entirely (e.g. a Google Places photo already exists). */
  skip?: boolean;
  onResolved?: (url: string) => void;
}

/**
 * Defer the (free, rate-limited) Wikipedia/Commons image lookup until the
 * card actually scrolls into the viewport. Eliminates the 429 storm that
 * happened when an attractions/restaurants page mounted dozens of cards at
 * once and fired all their image lookups in parallel.
 *
 * Returns a ref to attach to the card root and the resolved URL when found.
 */
export function useLazyPlaceImage(opts: Options) {
  const { name, city = '', type, skip, onResolved } = opts;
  const ref = useRef<HTMLDivElement | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (skip || !name || firedRef.current) return;
    const node = ref.current;
    if (!node) return;

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      let cancelled = false;
      resolveRealPlaceImage(name, city, type).then(url => {
        if (cancelled || !url) return;
        setResolvedUrl(url);
        onResolved?.(url);
      });
      return () => { cancelled = true; };
    };

    if (typeof IntersectionObserver === 'undefined') {
      fire();
      return;
    }

    const obs = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            obs.disconnect();
            fire();
            break;
          }
        }
      },
      { rootMargin: '200px' }, // start loading slightly before the card enters the viewport
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [name, city, type, skip]);

  return { ref, resolvedUrl };
}
