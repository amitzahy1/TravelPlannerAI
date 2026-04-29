import React, { useEffect, useState } from 'react';
import { safeMapsUrl } from '../../utils/mapsUrl';
import { getFoodImage, getAttractionImage } from '../../services/imageMapper';
import { resolveRealPlaceImage } from '../../services/placeImageService';

const TYPE_CONFIG = {
    hotel:      { color: '#0ea5e9', gradient: ['#0ea5e9', '#0284c7'] as [string, string], label: 'מלון' },
    restaurant: { color: '#f97316', gradient: ['#f97316', '#ea580c'] as [string, string], label: 'מסעדה' },
    attraction: { color: '#8b5cf6', gradient: ['#8b5cf6', '#7c3aed'] as [string, string], label: 'אטרקציה' },
    airport:    { color: '#6366f1', gradient: ['#6366f1', '#4f46e5'] as [string, string], label: 'שדה תעופה' },
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
        return new Date(dateStr + 'T12:00:00').toLocaleDateString('he-IL', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        return d.toLocaleDateString('he-IL', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return dateStr;
};

interface Props {
    item: PopupItem;
    // When provided, render an "add to my list" CTA; the parent map view
    // wires this to its existing handleToggleRec, so saving from the map
    // matches saving from the list cards exactly.
    onAddToList?: () => void;
    isAdded?: boolean;
}

// Pick a stock image with the same helpers PlaceCard uses, then upgrade to a
// real photo from Wikipedia when available. Hotels keep the gradient header
// (no stock noise) so we only resolve images for restaurants/attractions.
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
        if (item.imageUrl) return; // already a real photo from the trip data
        if (item.type !== 'restaurant' && item.type !== 'attraction') return;
        let cancelled = false;
        resolveRealPlaceImage(item.name, item.address || '', item.type).then(real => {
            if (!cancelled && real) setImgSrc(real);
        });
        return () => { cancelled = true; };
    }, [item.name, item.address, item.type, item.imageUrl]);

    return imgSrc;
};

export const MapItemPopup: React.FC<Props> = ({ item, onAddToList, isAdded = false }) => {
    const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.hotel;
    const dateLabel = parseDateLabel(item.date);
    const mapsLink = safeMapsUrl(item.googleMapsUrl, item.name, item.address);
    const tagLabel = item.cuisine || item.category || cfg.label;
    const imageUrl = useFallbackImage(item);

    const headerStyle: React.CSSProperties = imageUrl
        ? {
            backgroundImage: `linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.2) 55%,transparent 90%),url('${imageUrl}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }
        : {
            background: `linear-gradient(135deg,${cfg.gradient[0]} 0%,${cfg.gradient[1]} 100%)`,
          };

    const showAddButton = !!onAddToList && item.source === 'ai';

    return (
        <div style={{ fontFamily: "'Rubik','Inter',sans-serif", direction: 'rtl', textAlign: 'right', width: 272, padding: 0 }}>

            {/* Image / gradient header */}
            <div style={{ position: 'relative', width: '100%', height: 168, overflow: 'hidden', flexShrink: 0, ...headerStyle }}>

                {/* Category chip — top right */}
                {tagLabel && (
                    <span dir="ltr" style={{
                        position: 'absolute', top: 8, right: 8,
                        background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)',
                        border: '1px solid rgba(255,255,255,0.18)', color: '#fff',
                        fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.4px',
                        padding: '3px 8px', borderRadius: 6,
                        maxWidth: '60%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {tagLabel}
                    </span>
                )}

                {/* Price chip — top left */}
                {item.priceRange && (
                    <span style={{
                        position: 'absolute', top: 8, left: 8,
                        background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)',
                        border: '1px solid rgba(255,255,255,0.18)', color: '#fff',
                        fontSize: 9, fontWeight: 900, padding: '3px 8px', borderRadius: 6,
                    }}>
                        {item.priceRange}
                    </span>
                )}

                {/* Bottom overlay: name + address + rating + source */}
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <h3 dir="ltr" style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fff', lineHeight: 1.2, textAlign: 'left', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                        {item.name}
                    </h3>
                    {item.address && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#cbd5e1', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                            📍&nbsp;<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.address}</span>
                        </div>
                    )}
                    {(typeof item.rating === 'number' && item.rating > 0 || item.recommendationSource) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            {typeof item.rating === 'number' && item.rating > 0 && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', color: '#fff', fontSize: 10, fontWeight: 900, padding: '2px 6px', borderRadius: 6, flexShrink: 0 }}>
                                    ⭐ {item.rating.toFixed(1)}
                                </span>
                            )}
                            {item.recommendationSource && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', color: '#fde047', fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3px', padding: '2px 6px', borderRadius: 6, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    🏆 {item.recommendationSource}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: '10px 12px' }}>
                {item.description && (
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 8, lineHeight: 1.5 }}>
                        {item.description}
                    </div>
                )}
                {item.notes && (
                    <div style={{ fontSize: 11, color: '#475569', background: '#fffaeb', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 10px', marginTop: 8, lineHeight: 1.5 }}>
                        📝 {item.notes}
                    </div>
                )}
                {dateLabel && (
                    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginTop: 8 }}>
                        📅 {dateLabel}
                    </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <a
                        href={mapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: '#2563eb', textDecoration: 'none', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '5px 10px', borderRadius: 8 }}
                    >
                        🧭 ניווט ב-Google Maps
                    </a>
                    {showAddButton && (
                        <button
                            onClick={e => { e.stopPropagation(); onAddToList!(); }}
                            disabled={isAdded}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                fontSize: 11, fontWeight: 800,
                                color: isAdded ? '#92400e' : '#fff',
                                background: isAdded ? '#fef3c7' : '#0f172a',
                                border: `1px solid ${isAdded ? '#fcd34d' : '#0f172a'}`,
                                padding: '5px 10px', borderRadius: 8,
                                cursor: isAdded ? 'default' : 'pointer',
                            }}
                        >
                            {isAdded ? '✓ ברשימה שלי' : '＋ הוסף לרשימה שלי'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
