import React, { useEffect, useState } from 'react';
import { MapPin, Star, Trophy, Calendar, ChevronLeft, Plus, Check, Hotel, Utensils, Plane, Camera, Crosshair } from 'lucide-react';
import { safeMapsUrl } from '../../utils/mapsUrl';
import { getFoodImage, getAttractionImage } from '../../services/imageMapper';
import { resolveRealPlaceImage } from '../../services/placeImageService';

const TYPE_CONFIG = {
        hotel: { color: '#0ea5e9', accent: 'bg-sky-500', accentText: 'text-sky-600', label: 'מלון', Icon: Hotel },
        restaurant: { color: '#f97316', accent: 'bg-orange-500', accentText: 'text-orange-600', label: 'מסעדה', Icon: Utensils },
        attraction: { color: '#8b5cf6', accent: 'bg-violet-500', accentText: 'text-violet-600', label: 'אטרקציה', Icon: Camera },
        airport: { color: '#6366f1', accent: 'bg-indigo-500', accentText: 'text-indigo-600', label: 'שדה תעופה', Icon: Plane },
} as const;

export interface PopupItem {
        id: string;
        type: 'hotel' | 'restaurant' | 'attraction' | 'airport';
        name: string;
        description?: string;
        address?: string;
        date?: string;
        rating?: number;
        cuisine?: string;
        category?: string;
        recommendationSource?: string;
        priceRange?: string;
        imageUrl?: string;
        notes?: string;
        googleMapsUrl?: string;
        source?: 'saved' | 'ai';
}

const parseDateLabel = (dateStr?: string): string => {
        if (!dateStr) return '';
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return new Date(dateStr + 'T12:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: 'short' });
        }
        const parts = dateStr.split('/');
        if (parts.length === 3) {
                const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                return d.toLocaleDateString('he-IL', { day: '2-digit', month: 'short' });
        }
        return dateStr;
};

interface Props {
        item: PopupItem;
        onAddToList?: () => void;
        isAdded?: boolean;
        // Hotel-only — wired by UnifiedMapView when the parent provides
        // onUpdateTrip. Lets the user paste a Google Maps URL to override
        // a wrong auto-geocode (e.g. KC Grande Resort Koh Chang showing
        // south of the island).
        onFixLocation?: () => void;
}

const useFallbackImage = (item: PopupItem): string | null => {
        const initial = (() => {
                if (item.imageUrl) return item.imageUrl;
                if (item.type === 'restaurant') {
                        return getFoodImage(item.name, item.description || '', [item.cuisine || '', item.address || '']).url;
                }
                if (item.type === 'attraction') {
                        return getAttractionImage(item.name, item.description || '', [item.category || '', item.address || '']).url;
                }
                return null;
        })();

        const [imgSrc, setImgSrc] = useState<string | null>(initial);

        useEffect(() => { setImgSrc(initial); }, [initial]);

        useEffect(() => {
                if (item.imageUrl) return;
                if (item.type !== 'restaurant' && item.type !== 'attraction') return;
                let cancelled = false;
                resolveRealPlaceImage(item.name, item.address || '', item.type).then(real => {
                        if (!cancelled && real) setImgSrc(real);
                });
                return () => { cancelled = true; };
        }, [item.name, item.address, item.type, item.imageUrl]);

        return imgSrc;
};

// Notes are user / AI-extracted free text. In the popup we show only a short
// summary so a multi-paragraph transport note doesn't drown the card.
const summarizeNote = (raw: string): { short: string; truncated: boolean } => {
        if (!raw) return { short: '', truncated: false };
        const flat = raw.replace(/\s+/g, ' ').trim();
        const m = flat.match(/^[^.!?\n。;]+[.!?。;]?/);
        let candidate = (m?.[0] || flat).trim();
        if (candidate.length > 60) candidate = candidate.slice(0, 57).trimEnd() + '…';
        return { short: candidate, truncated: candidate !== flat };
};

/**
 * Horizontal map popup — image on the right (RTL), info column on the left,
 * action strip across the bottom. Compact, scannable, consistent across the
 * four item types (hotel / restaurant / attraction / airport). Type-specific
 * colour comes from TYPE_CONFIG.
 */
export const MapItemPopup: React.FC<Props> = ({ item, onAddToList, isAdded = false, onFixLocation }) => {
        const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.hotel;
        const dateLabel = parseDateLabel(item.date);
        const mapsLink = safeMapsUrl(item.googleMapsUrl, item.name, item.address);
        const tagLabel = item.cuisine || item.category;
        const imageUrl = useFallbackImage(item);
        const noteSummary = summarizeNote(item.notes || '');
        const showAddButton = !!onAddToList && item.source === 'ai';
        const Icon = cfg.Icon;

        return (
                <div
                        className="bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
                        style={{ width: 300, fontFamily: "'Rubik','Inter',sans-serif" }}
                        dir="rtl"
                >
                        {/* Top row: image (right in RTL) + info column (left) */}
                        <div className="flex">
                                {/* Image / gradient block */}
                                <div
                                        className="w-[88px] h-[88px] flex-shrink-0 relative"
                                        style={imageUrl
                                                ? { backgroundImage: `url('${imageUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
                                                : { background: `linear-gradient(135deg,${cfg.color},${cfg.color}cc)` }
                                        }
                                >
                                        {!imageUrl && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                        <Icon className="w-9 h-9 text-white/85" />
                                                </div>
                                        )}
                                        {/* Type pill at the top of image */}
                                        <span className={`absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${cfg.accent} text-white text-[9px] font-black shadow-sm`}>
                                                {cfg.label}
                                        </span>
                                </div>

                                {/* Info column */}
                                <div className="flex-1 p-2.5 min-w-0">
                                        <div className="flex items-start justify-between gap-1.5">
                                                <h3 className="text-sm font-black text-brand-navy leading-tight truncate flex-1" dir="ltr">
                                                        {item.name}
                                                </h3>
                                                {typeof item.rating === 'number' && item.rating > 0 && (
                                                        <span className="inline-flex items-center gap-0.5 text-2xs font-black text-amber-700 shrink-0">
                                                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                                                {item.rating.toFixed(1)}
                                                        </span>
                                                )}
                                        </div>

                                        {item.address && (
                                                <div className="flex items-center gap-1 text-2xs text-slate-500 mt-0.5" dir="ltr">
                                                        <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                                                        <span className="truncate">{item.address}</span>
                                                </div>
                                        )}

                                        {(tagLabel || item.priceRange || item.recommendationSource) && (
                                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                                        {tagLabel && (
                                                                <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-700 text-[10px] font-bold border border-slate-200 max-w-[110px] truncate" dir="ltr">
                                                                        {tagLabel}
                                                                </span>
                                                        )}
                                                        {item.priceRange && (
                                                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                                                        {item.priceRange}
                                                                </span>
                                                        )}
                                                        {item.recommendationSource && (
                                                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                                                                        <Trophy className="w-2.5 h-2.5" />
                                                                        <span className="max-w-[90px] truncate">{item.recommendationSource}</span>
                                                                </span>
                                                        )}
                                                </div>
                                        )}
                                </div>
                        </div>

                        {/* Optional note row — only when there's a meaningful summary */}
                        {noteSummary.short && (
                                <div
                                        title={noteSummary.truncated ? item.notes : undefined}
                                        className="px-2.5 pb-2 text-[10px] text-slate-600 leading-snug"
                                        style={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                        }}
                                        dir="rtl"
                                >
                                        <span className="font-bold text-slate-700">📝 </span>{noteSummary.short}
                                </div>
                        )}

                        {/* Action strip */}
                        <div className="border-t border-slate-100 px-2.5 py-2 flex items-center justify-between gap-2 bg-slate-50">
                                <span className="text-[10px] text-slate-500 font-bold inline-flex items-center gap-1 min-w-0">
                                        {dateLabel ? (
                                                <>
                                                        <Calendar className="w-3 h-3 shrink-0" />
                                                        <span className="truncate">{dateLabel}</span>
                                                </>
                                        ) : (
                                                <span className="text-slate-400">—</span>
                                        )}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                        {showAddButton && (
                                                <button
                                                        onClick={(e) => { e.stopPropagation(); onAddToList!(); }}
                                                        disabled={isAdded}
                                                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border ${isAdded ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'} ${isAdded ? 'cursor-default' : 'cursor-pointer'}`}
                                                >
                                                        {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                                        {isAdded ? 'נשמר' : 'הוסף'}
                                                </button>
                                        )}
                                        {onFixLocation && item.type === 'hotel' && (
                                                <button
                                                        onClick={(e) => { e.stopPropagation(); onFixLocation(); }}
                                                        title="תקן מיקום על ידי הדבקת קישור Google Maps"
                                                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                                                >
                                                        <Crosshair className="w-3 h-3" />
                                                        תקן מיקום
                                                </button>
                                        )}
                                        <a
                                                href={mapsLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md text-white shadow-sm"
                                                style={{ background: cfg.color }}
                                        >
                                                <MapPin className="w-3 h-3" />
                                                ניווט
                                                <ChevronLeft className="w-3 h-3" />
                                        </a>
                                </div>
                        </div>
                </div>
        );
};
