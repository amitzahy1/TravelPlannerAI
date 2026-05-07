import React, { useEffect, useState } from 'react';
import { MapPin, Star, Trophy, Calendar, ChevronLeft, Plus, Check, Hotel, Utensils, Plane, Camera, Crosshair, Navigation } from 'lucide-react';
import { safeMapsUrl } from '../../utils/mapsUrl';
import { getFoodImage, getAttractionImage } from '../../services/imageMapper';
import { resolveRealPlaceImage } from '../../services/placeImageService';

const TYPE_CONFIG = {
        hotel: { color: '#0ea5e9', gradient: 'linear-gradient(135deg,#0ea5e9,#0284c7)', accent: 'bg-sky-500', accentText: 'text-sky-700', tint: 'bg-sky-50 border-sky-100', label: 'מלון', Icon: Hotel },
        restaurant: { color: '#f97316', gradient: 'linear-gradient(135deg,#fb923c,#ea580c)', accent: 'bg-orange-500', accentText: 'text-orange-700', tint: 'bg-orange-50 border-orange-100', label: 'מסעדה', Icon: Utensils },
        attraction: { color: '#8b5cf6', gradient: 'linear-gradient(135deg,#a78bfa,#7c3aed)', accent: 'bg-violet-500', accentText: 'text-violet-700', tint: 'bg-violet-50 border-violet-100', label: 'אטרקציה', Icon: Camera },
        airport: { color: '#6366f1', gradient: 'linear-gradient(135deg,#818cf8,#4f46e5)', accent: 'bg-indigo-500', accentText: 'text-indigo-700', tint: 'bg-indigo-50 border-indigo-100', label: 'שדה תעופה', Icon: Plane },
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
                        style={{ width: 280, fontFamily: "'Rubik','Inter',sans-serif" }}
                        dir="rtl"
                >
                        {/* Hero image */}
                        <div
                                className="relative w-full h-[120px]"
                                style={imageUrl
                                        ? { backgroundImage: `url('${imageUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
                                        : { background: cfg.gradient }
                                }
                        >
                                {!imageUrl && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                                <Icon className="w-10 h-10 text-white/85" />
                                        </div>
                                )}
                                {/* Bottom scrim for legibility */}
                                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/55 to-transparent" />

                                {/* Type pill */}
                                <span className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${cfg.accent} text-white text-[10px] font-black shadow-md tracking-wide`}>
                                        <Icon className="w-3 h-3" />
                                        {cfg.label}
                                </span>

                                {/* Rating chip */}
                                {typeof item.rating === 'number' && item.rating > 0 && (
                                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-sm text-amber-700 text-[10px] font-black shadow-md">
                                                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                                {item.rating.toFixed(1)}
                                        </span>
                                )}

                                {/* Date pill */}
                                {dateLabel && (
                                        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/95 backdrop-blur-sm text-slate-700 text-[10px] font-black shadow-md">
                                                <Calendar className="w-3 h-3 text-slate-500" />
                                                {dateLabel}
                                        </span>
                                )}
                        </div>

                        {/* Body */}
                        <div className="px-3 pt-2.5 pb-2.5">
                                <h3 className="text-[15px] font-black text-slate-900 leading-tight line-clamp-2 mb-1" dir="ltr">
                                        {item.name}
                                </h3>

                                {item.address && (
                                        <div className="flex items-start gap-1 text-[11px] text-slate-500 mb-2 leading-snug" dir="ltr">
                                                <MapPin className="w-3 h-3 shrink-0 text-slate-400 mt-0.5" />
                                                <span className="line-clamp-2">{item.address}</span>
                                        </div>
                                )}

                                {(tagLabel || item.priceRange || item.recommendationSource) && (
                                        <div className="flex items-center gap-1 flex-wrap mb-1">
                                                {item.recommendationSource && (
                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-black border border-amber-200">
                                                                <Trophy className="w-2.5 h-2.5" />
                                                                <span className="max-w-[100px] truncate">{item.recommendationSource}</span>
                                                        </span>
                                                )}
                                                {item.priceRange && (
                                                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200">
                                                                {item.priceRange}
                                                        </span>
                                                )}
                                                {tagLabel && (
                                                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black border ${cfg.tint} ${cfg.accentText} max-w-[110px] truncate`} dir="ltr">
                                                                {tagLabel}
                                                        </span>
                                                )}
                                        </div>
                                )}

                                {noteSummary.short && (
                                        <div
                                                title={noteSummary.truncated ? item.notes : undefined}
                                                className="text-[11px] text-slate-600 leading-snug bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 mt-1"
                                                style={{
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden',
                                                }}
                                                dir="rtl"
                                        >
                                                <span className="font-black text-slate-700">📝 </span>{noteSummary.short}
                                        </div>
                                )}
                        </div>

                        {/* Action row */}
                        <div className="px-3 pb-3 pt-0 flex items-center gap-2">
                                {showAddButton && (
                                        <button
                                                onClick={(e) => { e.stopPropagation(); onAddToList!(); }}
                                                disabled={isAdded}
                                                className={`inline-flex items-center justify-center gap-1 text-xs font-black py-2 rounded-xl border flex-1 transition-all active:scale-95 ${isAdded
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-sm'}`}
                                        >
                                                {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                                {isAdded ? 'נשמר' : 'הוסף'}
                                        </button>
                                )}
                                {onFixLocation && item.type === 'hotel' && (
                                        <button
                                                onClick={(e) => { e.stopPropagation(); onFixLocation(); }}
                                                title="תקן מיקום על ידי הדבקת קישור Google Maps"
                                                className="inline-flex items-center justify-center gap-1 text-xs font-black py-2 rounded-xl border bg-white text-slate-700 border-slate-300 hover:bg-slate-50 transition-all active:scale-95"
                                        >
                                                <Crosshair className="w-3.5 h-3.5" />
                                        </button>
                                )}
                                <a
                                        href={mapsLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center justify-center gap-1.5 text-xs font-black py-2 rounded-xl shadow-md flex-1 transition-all active:scale-95 hover:brightness-110"
                                        style={{ background: cfg.gradient, color: '#ffffff' }}
                                >
                                        <Navigation className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
                                        <span style={{ color: '#ffffff' }}>ניווט</span>
                                        <ChevronLeft className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
                                </a>
                        </div>
                </div>
        );
};
