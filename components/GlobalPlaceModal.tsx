import React, { useState, useEffect, useRef } from 'react';
import { Share2, Star, MapPin, Plus, Navigation, CheckCircle2, X, Trophy, AlertTriangle, ExternalLink, Globe, RefreshCw } from 'lucide-react';
import { getFoodImage, getAttractionImage } from '../services/imageMapper';
import { resolveRealPlaceImage } from '../services/placeImageService';
import { safeMapsUrl } from '../utils/mapsUrl';
import { getEnglishName } from '../utils/displayName';
import { findSource, resolveSourceUrl } from '../utils/sourceCatalog';
import { detectCountryCode } from '../utils/countryCodes';
import { toast } from '../stores/useToastStore';
import { isPlacesDisabled } from '../services/placesService';


interface GlobalPlaceModalProps {
        item: any;
        type: 'food' | 'attraction' | 'restaurant';
        onClose: () => void;
        onAddToPlan: () => void;
        isAdded?: boolean;
        /** Apply a Google Places enrichment patch back to the parent's store.
         *  When provided, the modal renders a 🔄 refresh button in the action row. */
        onRefreshGoogle?: (patch: Record<string, any>) => void;
}

import { createPortal } from 'react-dom';

// Helper for Hebrew mapping
const HEBREW_TAGS: Record<string, string> = {
        "Burger": "המבורגר",
        "Pizza": "פיצה",
        "Italian": "איטלקי",
        "Sushi": "סושי",
        "Japanese": "יפני",
        "Thai": "תאילנדי",
        "Chinese": "סיני",
        "Mexican": "מקסיקני",
        "Indian": "הודי",
        "Vietnam": "וייטנאמי",
        "Cafe": "בית קפה",
        "Coffee": "קפה",
        "Dessert": "קינוחים",
        "Bar": "בר",
        "Cocktail": "קוקטיילים",
        "Wine": "יין",
        "Steak": "סטייק האוס",
        "Meat": "בשרים",
        "Seafood": "דגים",
        "Fish": "דגים",
        "Vegan": "טבעוני",
        "Vegetarian": "צמחוני",
        "Landmark": "אתר חובה",
        "Nature": "טבע",
        "Museum": "מוזיאון",
        "History": "היסטוריה",
        "Art": "אומנות",
        "Shopping": "קניות",
        "Market": "שוק",
        "Beach": "חוף",
        "Extreme": "אקסטרים",
        "Family": "משפחות",
        "Kids": "ילדים",
        "Nightlife": "חיי לילה",
        "Luxury": "יוקרה",
        "Fine Dining": "שף",
        "Local": "מקומי",
        "Authentic": "אותנטי",
        "Street Food": "אוכל רחוב",
        "Fine": "יוקרה",
        "Gourmet": "גורמה"
};

const getSmartSubtitle = (item: any) => {
        // Attempt to define sub-type based on keywords
        const desc = (item.description || '').toLowerCase();
        const name = (item.name || '').toLowerCase();

        if (item.cuisine === 'Burger' || item.type === 'Burger') {
                if (desc.includes('smash') || name.includes('smash')) return 'Smash Burger';
                if (desc.includes('classic') || name.includes('classic')) return 'Classic Burger';
                return 'Gourmet Burger';
        }
        if (item.cuisine === 'Pizza' || item.type === 'Pizza') {
                if (desc.includes('neapolitan') || desc.includes('wood')) return 'Neapolitan Pizza';
                if (desc.includes('roman') || desc.includes('slice')) return 'Roman Pizza';
                return 'Italian Pizza';
        }
        if (item.cuisine === 'Japanese' || item.type === 'Japanese') {
                if (desc.includes('sushi')) return 'Sushi Bar';
                if (desc.includes('ramen')) return 'Ramen Shop';
                return 'Japanese Kitchen';
        }
        return null;
};

export const GlobalPlaceModal: React.FC<GlobalPlaceModalProps> = ({ item, type, onClose, onAddToPlan, isAdded, onRefreshGoogle }) => {
        if (!item) return null;

        // Prefer the English name for display + for any lookup. AI returns `name`
        // in the local script (e.g. 'ร้านเจ๊ไฝ') plus `nameEnglish` (e.g. 'Jay
        // Fai'). The card uses nameEnglish — the modal must match, otherwise
        // users see Thai in the popup and an unrelated stock photo because the
        // Thai name doesn't match any Wikipedia title.
        const displayName: string = getEnglishName({ name: item.name || '', nameEnglish: item.nameEnglish, location: item.location });
        const searchName: string = displayName;

        // Smart Tag Logic
        const originalTag = item.cuisine || item.type || item.tags?.[0] || '';
        const hebrewTag = HEBREW_TAGS[originalTag] || originalTag;

        // Smart Subtitle (e.g. "Smash Burger") replacing duplicate tag
        const smartSubtitle = getSmartSubtitle(item);

        // Image — same resolver the card uses, so clicking a card doesn't swap
        // to a different image. Stock photo shows immediately; real photo from
        // Wikipedia upgrades in when available + validated against the type.
        const cuisineTagInputs: string[] = Array.isArray((item as any).cuisineTags) ? (item as any).cuisineTags : [];
        const { url: stockUrl, label: visualLabel } = (type === 'food' || type === 'restaurant')
                ? getFoodImage(searchName, item.description || '', [originalTag, ...cuisineTagInputs])
                : getAttractionImage(searchName, item.description || '', [originalTag]);

        const placeType = (type === 'food' || type === 'restaurant') ? 'restaurant' : 'attraction';
        // Priority: Google Places photo (live) → stock photo. Wikipedia upgrade
        // is skipped when Google already provided a photo. This matches the
        // small card's resolution order so the modal photo stays in sync after
        // a 🔄 refresh.
        const googlePhotoUrl: string | undefined = (item as any).googlePhotoUrl;
        const [imageUrl, setImageUrl] = useState<string>(googlePhotoUrl || stockUrl);
        const [refreshingGoogle, setRefreshingGoogle] = useState(false);
        const [sourceOpen, setSourceOpen] = useState(false);
        const sourcePopoverRef = useRef<HTMLDivElement>(null);
        useEffect(() => {
                if (!sourceOpen) return;
                const handleClick = (e: MouseEvent) => {
                        if (sourcePopoverRef.current && !sourcePopoverRef.current.contains(e.target as Node)) setSourceOpen(false);
                };
                const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSourceOpen(false); };
                document.addEventListener('mousedown', handleClick);
                document.addEventListener('keydown', handleEsc);
                return () => {
                        document.removeEventListener('mousedown', handleClick);
                        document.removeEventListener('keydown', handleEsc);
                };
        }, [sourceOpen]);
        useEffect(() => {
                setImageUrl(googlePhotoUrl || stockUrl);
                if (googlePhotoUrl) return; // Google photo wins — skip Wikipedia upgrade.
                let cancelled = false;
                resolveRealPlaceImage(searchName, item.location || '', placeType).then(real => {
                        if (!cancelled && real) setImageUrl(real);
                });
                return () => { cancelled = true; };
        }, [searchName, item.location, placeType, stockUrl, googlePhotoUrl]);

        const handleGoogleRefresh = onRefreshGoogle ? async (e: React.MouseEvent) => {
                e.stopPropagation();
                if (refreshingGoogle) return;
                setRefreshingGoogle(true);
                try {
                        const { enrichSavedPlace, PlacesQuotaExceededError, PlacesKeyError } = await import('../services/placesService');
                        const patch = await enrichSavedPlace({
                                name: item.name,
                                lat: item.lat,
                                lng: item.lng,
                                googlePlaceId: item.googlePlaceId,
                                googleEnrichedAt: item.googleEnrichedAt,
                        }, { force: true });
                        if (!patch) {
                                toast.info('לא נמצא תוצאה ב-Google Maps עבור המקום הזה');
                                return;
                        }
                        onRefreshGoogle(patch);
                        if (patch.googleNotFound) {
                                toast.info('לא נמצא ב-Google Maps — סומן ב-X');
                        } else {
                                toast.success('המקום עודכן מ-Google');
                        }
                } catch (err: any) {
                        const { PlacesQuotaExceededError, PlacesKeyError } = await import('../services/placesService');
                        if (err instanceof PlacesQuotaExceededError) toast.error(err.message);
                        else if (err instanceof PlacesKeyError) toast.error('Google Maps API key error — בדוק את ההגדרות');
                        else toast.error('נכשל לרענן מ-Google. נסה שוב.');
                        console.error('[GooglePlaces] modal refresh failed', err);
                } finally {
                        setRefreshingGoogle(false);
                }
        } : undefined;

        // Build the navigation address — append a category suffix for non-hotel
        // entries so Google Maps disambiguates "Sorn" the K-pop singer from
        // "Sorn" the Bangkok restaurant. safeMapsUrl handles parenthetical
        // stripping and URL validation.
        const isHotelLike = item.isHotelRestaurant || (type as string) === 'hotel' || displayName.toLowerCase().includes('hotel');
        const categorySuffix = isHotelLike ? '' : (type === 'food' || type === 'restaurant' ? 'Restaurant' : 'Tourist Attraction');
        const navAddress = [item.location, categorySuffix].filter(Boolean).join(' ');
        const navCity = item.verifiedCity || item.region || '';
        const navCountry = detectCountryCode(item.verifiedCountry, item.region, item.location);
        const googleMapsUrl = safeMapsUrl(item.googleMapsUrl, displayName, navAddress, navCity, navCountry);

        return createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" />
                        <div className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>

                                <button onClick={onClose} aria-label="סגירה" className="absolute top-3 left-3 z-20 p-2.5 bg-black/55 hover:bg-black/75 text-white rounded-full backdrop-blur-md ring-1 ring-white/30 shadow-lg transition-all active:scale-95">
                                        <X className="w-6 h-6" />
                                </button>

                                {handleGoogleRefresh && !isPlacesDisabled() && (
                                        <button
                                                onClick={handleGoogleRefresh}
                                                disabled={refreshingGoogle}
                                                aria-label="רענן מ-Google Maps"
                                                title={item.googleEnrichedAt
                                                        ? `רענן מ-Google (עודכן: ${new Date(item.googleEnrichedAt).toLocaleDateString('he-IL')})`
                                                        : 'רענן מ-Google Maps'}
                                                className={`absolute top-3 right-3 z-20 p-2.5 rounded-full backdrop-blur-md ring-1 shadow-lg transition-all active:scale-95 ${
                                                        item.googlePlaceId
                                                                ? 'bg-blue-500/85 hover:bg-blue-500 text-white ring-blue-300/60'
                                                                : 'bg-black/55 hover:bg-black/75 text-white ring-white/30'
                                                } ${refreshingGoogle ? 'opacity-70 cursor-wait' : ''}`}
                                        >
                                                <RefreshCw className={`w-5 h-5 ${refreshingGoogle ? 'animate-spin' : ''}`} />
                                        </button>
                                )}

                                <div className="h-44 sm:h-52 w-full relative flex-shrink-0">
                                        <img src={imageUrl} alt={displayName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                        <div className="absolute bottom-4 left-4 flex gap-2">
                                                {/* Primary Hebrew Tag */}
                                                {hebrewTag && (
                                                        <span className="text-xs font-bold text-white bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 shadow-sm">
                                                                {hebrewTag}
                                                        </span>
                                                )}
                                                {/* Secondary Smart Tag (English/Hebrew logic) or Visual Label if different */}
                                                {smartSubtitle && smartSubtitle !== originalTag && (
                                                        <span className="text-xs font-bold text-amber-300 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg border border-amber-500/30 shadow-sm">
                                                                {smartSubtitle}
                                                        </span>
                                                )}
                                        </div>
                                </div>

                                <div className="p-4 sm:p-6 overflow-y-auto">
                                        <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                        <h2 className="text-2xl font-black text-slate-800 leading-tight mb-1">{displayName}</h2>
                                                        {item.nameEnglish && item.name && item.name !== item.nameEnglish && (
                                                                <div className="text-xs font-medium text-slate-400 mb-1" dir="auto">{item.name}</div>
                                                        )}
                                                        <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                                                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                                <span className="truncate max-w-[200px]">{item.location}</span>
                                                        </div>
                                                </div>
                                                {(item.rating || item.googleRating) && (
                                                        <div className="flex flex-col items-center bg-yellow-50 px-3 py-1.5 rounded-xl border border-yellow-100 shadow-sm">
                                                                <span className="text-base font-black text-yellow-700">{item.rating || item.googleRating}</span>
                                                                <div className="flex gap-0.5 mt-0.5">
                                                                        {[1, 2, 3, 4, 5].map(i => (
                                                                                <Star key={i} className={`w-2 h-2 ${i <= Math.round(item.rating || item.googleRating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                                                                        ))}
                                                                </div>
                                                        </div>
                                                )}
                                        </div>

                                        {item.recommendationSource && (() => {
                                                const rawSource = String(item.recommendationSource).replace(/Bib/i, 'Michelin');
                                                const entry = findSource(rawSource);
                                                const cityHint = item.verifiedCity || item.location || '';
                                                const href = resolveSourceUrl(rawSource, item.nameEnglish || item.name || displayName, cityHint);
                                                return (
                                                        <div className="flex items-center gap-2 mb-4 -mt-1">
                                                                <a
                                                                        href={href}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        title={`פתח ב-${entry?.label || rawSource}`}
                                                                        className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 text-amber-800 text-2xs font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-sm hover:from-amber-100 hover:to-yellow-100 active:scale-95 transition-all"
                                                                >
                                                                        <Trophy className="w-3 h-3 text-amber-600" aria-hidden="true" />
                                                                        <span>{entry?.label || rawSource}</span>
                                                                        <ExternalLink className="w-3 h-3 text-amber-600 opacity-70" aria-hidden="true" />
                                                                </a>
                                                                <span className="text-2xs font-bold text-slate-400">מקור המלצה</span>
                                                        </div>
                                                );
                                        })()}

                                        <p className="text-sm text-slate-600 leading-relaxed mb-6 font-medium text-right" dir="auto">
                                                {/* Clean Description without prefix, assuming AI fixes language. If English detected, we just show it clean. */}
                                                {item.description || (type === 'food' || type === 'restaurant' ? 'מסעדה מצוינת ששווה בדיקה.' : 'אטרקציה שווה ביקור.')}
                                        </p>

                                        <div className="grid grid-cols-2 gap-3">
                                                <button onClick={onAddToPlan} className={`py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm transition-all active:scale-95 ${isAdded ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-900 text-white shadow-lg shadow-slate-200 hover:shadow-xl hover:-translate-y-0.5'}`}>
                                                        {isAdded ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                        {isAdded ? 'נוסף לטיול' : 'הוסף לטיול'}
                                                </button>
                                                <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 transition-all flex items-center justify-center gap-2 text-sm">
                                                        <Navigation className="w-4 h-4" />
                                                        ניווט
                                                </a>
                                        </div>
                                </div>
                        </div>
                </div>,
                document.body
        );
};
