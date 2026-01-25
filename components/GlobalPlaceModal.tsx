import React from 'react';
import { Share2, Star, MapPin, Plus, Navigation, CheckCircle2 } from 'lucide-react';
import { getFoodImage, getAttractionImage } from '../services/imageMapper';
import { SlideOverPanel } from './SlideOverPanel';

interface GlobalPlaceModalProps {
        item: any;
        type: 'food' | 'attraction' | 'restaurant';
        onClose: () => void;
        onAddToPlan: () => void;
        isAdded?: boolean;
}

export const GlobalPlaceModal: React.FC<GlobalPlaceModalProps> = ({ item, type, onClose, onAddToPlan, isAdded }) => {
        if (!item) return null;

        // Smart Image Engine
        const tags = [(item.cuisine || item.type || ''), item.location];
        const { url: imageUrl, label: visualLabel } = (type === 'food' || type === 'restaurant')
                ? getFoodImage(item.name, item.description || '', tags)
                : getAttractionImage(item.name, item.description || '', tags);

        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + ' ' + (item.location || ''))}`;

        return (
                <SlideOverPanel
                        isOpen={true}
                        onClose={onClose}
                        heroImage={imageUrl}
                        heroLabel={visualLabel}
                        width="max-w-md md:max-w-lg" // Slightly wider for better readability
                        zIndex={60}
                >
                        <div className="p-6 space-y-8 pb-32">
                                {/* Header Section */}
                                <div>
                                        <div className="flex items-center gap-2 mb-2">
                                                <div className="flex items-center gap-1.5 text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-100 font-bold text-xs">
                                                        <span>{item.rating || item.googleRating || '4.8'}</span>
                                                        <Star className="w-3 h-3 fill-current" />
                                                </div>
                                                {item.priceLevel && (
                                                        <span className="text-xs font-black text-green-600 bg-green-50 px-2.5 py-0.5 rounded-lg border border-green-100">{item.priceLevel}</span>
                                                )}
                                                {item.rank && (
                                                        <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">#{item.rank} ברשימה</span>
                                                )}
                                        </div>

                                        <h2 className="text-3xl font-black text-slate-900 leading-tight mb-2" dir="auto">{item.name}</h2>

                                        <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                                                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                <span className="truncate" dir="auto">{item.location?.split(',')[0] || item.location}</span>
                                        </div>
                                </div>

                                {/* About / Description */}
                                <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100/50">
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                                                אודות המקום
                                        </h3>
                                        <p className="text-slate-700 leading-relaxed text-sm font-medium" dir="auto">
                                                {item.description || (type === 'food' || type === 'restaurant'
                                                        ? `מסעדה מומלצת המציעה חוויה קולינרית ייחודית ב${item.location || 'אזור'}. מקום נהדר לטעום את המטבח המקומי.`
                                                        : `אטרקציה מומלצת המהווה נקודת עניין מרכזית ב${item.location || 'אזור'}. שווה ביקור כחלק מהטיול.`)}
                                        </p>

                                        {/* Tags / Cuisines */}
                                        {(item.cuisine || item.tags) && (
                                                <div className="flex flex-wrap gap-2 mt-4">
                                                        {/* Normalize tags: handle both string (cuisine) and array (tags) */}
                                                        {(() => {
                                                                const rawTags = item.tags || (item.cuisine ? [item.cuisine] : []);
                                                                return rawTags.map((t: string, i: number) => (
                                                                        <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 shadow-sm">
                                                                                {t}
                                                                        </span>
                                                                ));
                                                        })()}
                                                </div>
                                        )}
                                </div>

                                {/* Action Buttons (Sticky Bottom in logical flow) */}
                                <div className="grid grid-cols-2 gap-3 pt-4">
                                        <button
                                                onClick={onAddToPlan}
                                                className={`py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 ${isAdded
                                                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-green-200'
                                                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                                                        }`}
                                        >
                                                {isAdded ? (
                                                        <><CheckCircle2 className="w-5 h-5" /> נוסף לתוכנית</>
                                                ) : (
                                                        <><Plus className="w-5 h-5" /> הוסף לתוכנית</>
                                                )}
                                        </button>

                                        <a
                                                href={googleMapsUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="py-3.5 rounded-xl bg-white border-2 border-slate-100 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-200 hover:text-blue-600 transition-all flex items-center justify-center gap-2 shadow-sm"
                                        >
                                                <Navigation className="w-5 h-5" />
                                                ניווט
                                        </a>
                                </div>

                                {/* Space filler for bottom scroll */}
                                <div className="h-10"></div>
                        </div>
                </SlideOverPanel>
        );
};
