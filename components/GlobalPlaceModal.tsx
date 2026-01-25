import React from 'react';
import { X, Star, MapPin, Plus } from 'lucide-react';
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
        const { url: imageUrl } = getPlaceImage(item.name, type, tags);

        return (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
                        {/* CARD (Centered, Elegant) */}
                        <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 relative" onClick={e => e.stopPropagation()}>

                                {/* HERO IMAGE (Clean, No Overlay) */}
                                <div className="h-56 relative overflow-hidden flex-shrink-0">
                                        <img src={imageUrl} className="w-full h-full object-cover" alt={item.name} />

                                        {/* Close Button (Glassmorphism) */}
                                        <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 backdrop-blur-md p-2 rounded-full text-white transition-all shadow-sm border border-white/10 z-30">
                                                <X className="w-5 h-5" />
                                        </button>

                                        {/* Type Chip (Top Left) */}
                                        <div className="absolute top-4 left-4 z-30">
                                                <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 border border-white/20 shadow-sm">
                                                        {type === 'food' ? 'Restaurant' : 'Attraction'}
                                                </span>
                                        </div>
                                </div>

                                {/* HEADER SECTION (Title & Rating - Out of Image) */}
                                <div className="px-6 pt-6 pb-2 bg-white flex-shrink-0">
                                        <div className="flex items-center gap-2 mb-2">
                                                <div className="flex items-center gap-1 text-yellow-500 bg-yellow-50 px-2 py-0.5 rounded-lg border border-yellow-100">
                                                        <span className="text-xs font-black">{item.rating || item.googleRating || '5.0'}</span>
                                                        <Star className="w-3 h-3 fill-current" />
                                                </div>
                                                {(item.cuisine || item.type) && (
                                                        <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold border border-slate-100">
                                                                {item.cuisine || item.type}
                                                        </span>
                                                )}
                                        </div>
                                        <h2 className="text-2xl font-black leading-tight text-slate-900 mb-1">{item.name}</h2>

                                        {item.location && (
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-medium">{item.location}</span>
                                                </div>
                                        )}
                                </div>

                                {/* CONTENT BODY */}
                                <div className="px-6 py-4 overflow-y-auto bg-white flex-1 custom-scrollbar">
                                        {/* Description */}
                                        <div className="space-y-6">
                                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">אודות</h3>
                                                        <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                                                {item.description || (type === 'food' ? `מסעדה מומלצת ב${item.location || 'האזור'}` : `אטרקציה מומלצת ב${item.location || 'האזור'}`)}
                                                        </p>
                                                </div>

                                                {(item.price || item.priceLevel) && (
                                                        <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                                                <div className="flex flex-col">
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">רמת מחיר</span>
                                                                        <span className="text-sm font-black text-slate-900 mt-0.5">{item.price || item.priceLevel || '$$'}</span>
                                                                </div>
                                                                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                                                                        <div className="text-sm font-black">$</div>
                                                                </div>
                                                        </div>
                                                )}
                                        </div>
                                </div>

                                {/* FOOTER ACTIONS */}
                                <div className="px-6 py-5 border-t border-slate-50 bg-white flex gap-3 flex-shrink-0 z-20">
                                        <button onClick={onAddToPlan} className="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95 flex items-center justify-center gap-2">
                                                <Plus className="w-4 h-4" />
                                                הוסף לתוכנית
                                        </button>
                                        {(() => {
                                                const query = encodeURIComponent(`${item.name} ${item.location || ''}`);
                                                const mapUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

                                                return (
                                                        <a href={mapUrl} target="_blank" rel="noreferrer" className="w-14 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center shadow-sm">
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
