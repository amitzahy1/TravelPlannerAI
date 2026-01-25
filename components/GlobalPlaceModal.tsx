import React from 'react';
import { Share2, Star, MapPin, Plus, Navigation, CheckCircle2, X } from 'lucide-react';
import { getFoodImage, getAttractionImage } from '../services/imageMapper';


interface GlobalPlaceModalProps {
        item: any;
        type: 'food' | 'attraction' | 'restaurant';
        onClose: () => void;
        onAddToPlan: () => void;
        isAdded?: boolean;
}

import { createPortal } from 'react-dom';

export const GlobalPlaceModal: React.FC<GlobalPlaceModalProps> = ({ item, type, onClose, onAddToPlan, isAdded }) => {
        if (!item) return null;

        // Smart Image Engine
        const tags = [(item.cuisine || item.type || ''), item.location];
        const { url: imageUrl, label: visualLabel } = (type === 'food' || type === 'restaurant')
                ? getFoodImage(item.name, item.description || '', tags)
                : getAttractionImage(item.name, item.description || '', tags);

        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + ' ' + (item.location || ''))}`;

        return createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <div
                                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in"
                                onClick={onClose}
                        />

                        {/* Card Modal */}
                        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 border border-white/20">

                                {/* Close Button - Floats on top image */}
                                <button
                                        onClick={onClose}
                                        className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all"
                                >
                                        <X className="w-5 h-5" />
                                </button>

                                {/* Hero Image */}
                                <div className="h-48 w-full relative">
                                        <img
                                                src={imageUrl}
                                                alt={visualLabel}
                                                className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                        <div className="absolute bottom-3 left-4 flex gap-2">
                                                {(item.cuisine || item.tags?.[0]) && (
                                                        <span className="text-[10px] font-bold text-white/90 bg-black/30 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                                                                {item.cuisine || item.tags?.[0]}
                                                        </span>
                                                )}
                                                <span className="text-[10px] font-bold text-white/90 bg-black/30 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1">
                                                        {visualLabel}
                                                </span>
                                        </div>
                                </div>

                                <div className="p-6">
                                        {/* Header */}
                                        <div className="flex justify-between items-start mb-4">
                                                <div>
                                                        <h2 className="text-2xl font-black text-slate-800 leading-none mb-1">{item.name}</h2>
                                                        <div className="flex items-center gap-1 text-sm text-slate-500 font-medium">
                                                                <MapPin className="w-3.5 h-3.5" />
                                                                {item.location?.split(',')[0]}
                                                        </div>
                                                </div>
                                                {(item.rating || item.googleRating) && (
                                                        <div className="flex flex-col items-center bg-yellow-50 px-2.5 py-1 rounded-xl border border-yellow-100">
                                                                <span className="text-sm font-black text-yellow-700">{item.rating || item.googleRating}</span>
                                                                <div className="flex gap-0.5">
                                                                        {[1, 2, 3, 4, 5].map(i => (
                                                                                <Star key={i} className={`w-2 h-2 ${i <= Math.round(item.rating || item.googleRating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                                                                        ))}
                                                                </div>
                                                        </div>
                                                )}
                                        </div>

                                        {/* Description */}
                                        <p className="text-sm text-slate-600 leading-relaxed mb-6 font-medium">
                                                {item.description || (type === 'food' ? 'חוויה קולינרית מומלצת.' : 'אטרקציה שווה ביקור.')}
                                        </p>

                                        {/* Actions */}
                                        <div className="grid grid-cols-2 gap-3">
                                                <button
                                                        onClick={onAddToPlan}
                                                        className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all active:scale-95 ${isAdded
                                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                                : 'bg-slate-900 text-white shadow-lg shadow-slate-200 hover:shadow-xl hover:-translate-y-0.5'
                                                                }`}
                                                >
                                                        {isAdded ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                        {isAdded ? 'נוסף לטיול' : 'הוסף לטיול'}
                                                </button>

                                                <a
                                                        href={googleMapsUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 transition-all flex items-center justify-center gap-2 text-sm"
                                                >
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
