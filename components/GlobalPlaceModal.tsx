import React from 'react';
import { X, Star, MapPin, Calendar, Clock, Globe } from 'lucide-react';
import { PlaceIllustration } from './PlaceIllustration';
import { getPlaceImage } from '../services/imageMapper';

interface GlobalPlaceModalProps {
        item: any;
        type: 'food' | 'attraction';
        onClose: () => void;
        onAddToPlan: () => void;
}

export const GlobalPlaceModal: React.FC<GlobalPlaceModalProps> = ({ item, type, onClose, onAddToPlan }) => {
        if (!item) return null;

        // Get Smart Image
        const tags = [(item.cuisine || item.type || ''), item.location];
        const image = getPlaceImage(item.name, type, tags);

        return (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
                        {/* CARD (Centered, Elegant) */}
                        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200 relative" onClick={e => e.stopPropagation()}>

                                {/* HEAD IMAGE */}
                                <div className="h-56 relative group">
                                        <img src={image} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt={item.name} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                                        <button onClick={onClose} className="absolute top-3 right-3 bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-full text-white transition-all shadow-sm border border-white/10">
                                                <X className="w-5 h-5" />
                                        </button>

                                        <div className="absolute bottom-4 left-4 right-4 text-white">
                                                <div className="flex items-center gap-2 mb-1">
                                                        <span className="bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-white/10">
                                                                {type === 'food' ? 'Restaurant' : 'Attraction'}
                                                        </span>
                                                        <div className="flex items-center gap-1 text-yellow-400 bg-black/20 px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                                                                <span className="text-xs font-bold">{item.rating || item.googleRating || '5.0'}</span>
                                                                <Star className="w-3 h-3 fill-current" />
                                                        </div>
                                                </div>
                                                <h2 className="text-2xl font-black leading-tight drop-shadow-md">{item.name}</h2>
                                        </div>
                                </div>

                                {/* CONTENT */}
                                <div className="p-6 overflow-y-auto bg-white flex-1 custom-scrollbar">

                                        {/* Meta Data */}
                                        <div className="flex flex-wrap gap-2 mb-6">
                                                {(item.cuisine || item.type) && (
                                                        <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold border border-slate-100 flex items-center gap-1.5">
                                                                <Star className="w-3 h-3 text-slate-400" />
                                                                {item.cuisine || item.type}
                                                        </span>
                                                )}
                                                {item.location && (
                                                        <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold border border-slate-100 flex items-center gap-1.5">
                                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                                {item.location.split(',')[0]}
                                                        </span>
                                                )}
                                        </div>

                                        {/* Description (Mocked if missing) */}
                                        <div className="space-y-4">
                                                <div>
                                                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-2">אודות</h3>
                                                        <p className="text-sm text-slate-500 leading-relaxed">
                                                                {item.description || `המקום המושלם ליהנות מ${item.cuisine || 'חוויה ייחודית'} ב${item.location?.split(',')[0] || 'אזור'}. מומלץ מאוד על ידי מטיילים.`}
                                                        </p>
                                                </div>

                                                {(item.price || item.priceLevel) && (
                                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                                <span className="text-xs font-bold text-slate-500">רמת מחיר</span>
                                                                <span className="text-sm font-black text-slate-700">{item.price || item.priceLevel || '$$'}</span>
                                                        </div>
                                                )}
                                        </div>
                                </div>

                                {/* FOOTER ACTIONS */}
                                <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 flex-shrink-0 z-20">
                                        <button onClick={onAddToPlan} className="flex-1 py-3.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95 flex items-center justify-center gap-2">
                                                <Plus className="w-4 h-4" />
                                                הוסף לתוכנית
                                        </button>
                                        {(() => {
                                                // Robust Map Link Generation
                                                let mapUrl = item.googleMapsUrl;

                                                // 1. If no URL, or it's a broken dynamic link (goo.gl), or generic fallback
                                                const isSuspicious = !mapUrl || mapUrl.includes('goo.gl') || mapUrl.includes('google.com/maps/place//');

                                                if (isSuspicious) {
                                                        const query = encodeURIComponent(`${item.name} ${item.location || ''} ${type === 'food' ? 'Restaurant' : ''}`);
                                                        mapUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
                                                }

                                                return (
                                                        <a href={mapUrl} target="_blank" rel="noreferrer" className="p-3.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all font-bold text-sm flex items-center justify-center">
                                                                <MapPin className="w-5 h-5" />
                                                        </a>
                                                );
                                        })()}
                                </div>
                        </div>

                        <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
            `}</style>
                </div>
        );
};

// Helper for quick icon use
function Plus(props: any) {
        return (
                <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        {...props}
                >
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                </svg>
        )
}
