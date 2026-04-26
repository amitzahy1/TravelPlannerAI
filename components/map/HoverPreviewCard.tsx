/**
 * Lightweight card that floats above a map pin on desktop hover.
 * Intentionally compact — no image, just name + category + rating.
 * Rendered as a React overlay inside UnifiedMapView's container div.
 */

import React from 'react';
import { Star } from 'lucide-react';

interface HoverPreviewCardProps {
        type: 'hotel' | 'restaurant' | 'attraction' | 'airport';
        name: string;
        rating?: number;
        cuisine?: string;
        category?: string;
        priceRange?: string;
}

const TYPE_META: Record<string, { color: string; label: string }> = {
        hotel:      { color: '#0ea5e9', label: 'מלון' },
        restaurant: { color: '#f97316', label: 'מסעדה' },
        attraction: { color: '#8b5cf6', label: 'אטרקציה' },
        airport:    { color: '#64748b', label: 'שדה תעופה' },
};

export const HoverPreviewCard: React.FC<HoverPreviewCardProps> = ({
        type, name, rating, cuisine, category, priceRange,
}) => {
        const meta = TYPE_META[type] ?? TYPE_META.restaurant;
        const subtitle = cuisine || category || meta.label;

        return (
                <div
                        className="bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-100/80 px-3 py-2.5 min-w-[150px] max-w-[200px] pointer-events-none select-none"
                        dir="rtl"
                >
                        <div className="flex items-start gap-2">
                                <div
                                        className="w-2 h-2 rounded-full mt-[5px] flex-shrink-0"
                                        style={{ background: meta.color }}
                                />
                                <div className="min-w-0 flex-1">
                                        <div className="text-sm font-black text-slate-800 leading-snug line-clamp-2">
                                                {name}
                                        </div>
                                        {subtitle && (
                                                <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                                                        {subtitle}
                                                </div>
                                        )}
                                        {rating != null && rating > 0 && (
                                                <div className="flex items-center gap-1 mt-1">
                                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                                                        <span className="text-[11px] font-bold text-slate-700">
                                                                {rating.toFixed(1)}
                                                        </span>
                                                        {priceRange && (
                                                                <span className="text-[11px] text-slate-400">
                                                                        · {priceRange}
                                                                </span>
                                                        )}
                                                </div>
                                        )}
                                </div>
                        </div>
                </div>
        );
};
