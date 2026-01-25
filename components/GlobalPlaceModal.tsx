import React from 'react';
import { X, Star, MapPin, Plus, Navigation } from 'lucide-react';
import { getFoodImage, getAttractionImage } from '../services/imageMapper';

interface GlobalPlaceModalProps {
        item: any;
        type: 'food' | 'attraction';
        onClose: () => void;
        onAddToPlan: () => void;
        isAdded?: boolean;
}

export const GlobalPlaceModal: React.FC<GlobalPlaceModalProps> = ({ item, type, onClose, onAddToPlan, isAdded }) => {
        if (!item) return null;

        // Get Smart Image using isolated visual engine
        const tags = [(item.cuisine || item.type || ''), item.location];
        const { url: imageUrl, label: visualLabel } = type === 'food'
                ? getFoodImage(item.name, item.description || '', tags)
                : getAttractionImage(item.name, item.description || '', tags);

        return (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
                        {/* CINEMA MODAL CONTAINER (Landscape md+) */}
                        <div
                                className="bg-white w-full max-w-4xl h-full max-h-[600px] md:h-[500px] rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 relative"
                                onClick={e => e.stopPropagation()}
                        >
                                {/* LEFT SIDE: HERO IMAGE (Cinema View) */}
                                <div className="w-full h-48 md:h-full md:w-5/12 relative flex-shrink-0">
                                        <img src={imageUrl} className="w-full h-full object-cover" alt={item.name} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent md:bg-gradient-to-r md:from-transparent md:to-black/5" />

                                        {/* Floating Badges for Mobile */}
                                        <div className="absolute top-4 left-4 flex flex-col gap-2 md:hidden">
                                                <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 border border-white/20 shadow-sm">
                                                        {visualLabel}
                                                </span>
                                        </div>

                                        {/* Close Button (Hidden on md, shown on Mobile) */}
                                        <button onClick={onClose} className="md:hidden absolute top-4 right-4 bg-black/20 hover:bg-black/40 backdrop-blur-md p-2 rounded-full text-white transition-all z-30">
                                                <X className="w-5 h-5" />
                                        </button>
                                </div>

                                {/* RIGHT SIDE: CONTENT PANEL */}
                                <div className="flex-1 flex flex-col min-w-0 bg-white">
                                        {/* Header: Title & Badges */}
                                        <div className="px-8 pt-8 pb-4 flex-shrink-0 flex justify-between items-start">
                                                <div className="flex-1 min-w-0 pr-4">
                                                        <div className="flex items-center gap-2 mb-3">
                                                                <span className="hidden md:inline-flex bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200 shadow-sm">
                                                                        {visualLabel}
                                                                </span>
                                                                <div className="flex items-center gap-1.5 text-yellow-500 bg-yellow-50 px-2.5 py-1 rounded-xl border border-yellow-100">
                                                                        <span className="text-sm font-black">{item.rating || item.googleRating || '4.8'}</span>
                                                                        <Star className="w-3.5 h-3.5 fill-current" />
                                                                </div>
                                                                {item.priceLevel && (
                                                                        <span className="text-sm font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-xl border border-green-100">{item.priceLevel}</span>
                                                                )}
                                                        </div>
                                                        <h2 className="text-3xl font-black leading-tight text-slate-900 line-clamp-2 tracking-tight">{item.name}</h2>
                                                </div>

                                                {/* Desktop Close Button */}
                                                <button onClick={onClose} className="hidden md:flex p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                                        <X className="w-6 h-6" />
                                                </button>
                                        </div>

                                        {/* Body: Scrollable Content */}
                                        <div className="px-8 py-2 overflow-y-auto flex-1 custom-scrollbar">
                                                <div className="space-y-6">
                                                        {/* Meta Info */}
                                                        <div className="flex items-center gap-4 text-slate-400">
                                                                <div className="flex items-center gap-1.5 min-w-0">
                                                                        <MapPin className="w-4 h-4 text-slate-300 flex-shrink-0" />
                                                                        <span className="text-sm font-semibold truncate">{item.location}</span>
                                                                </div>
                                                                {item.cuisine && (
                                                                        <div className="flex items-center gap-1.5 border-l border-slate-100 pl-4">
                                                                                <span className="text-sm font-black text-slate-600">{item.cuisine}</span>
                                                                        </div>
                                                                )}
                                                        </div>

                                                        {/* Description Section */}
                                                        <div>
                                                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-3">אודות המקום</h3>
                                                                <p className="text-base text-slate-600 leading-relaxed font-medium">
                                                                        {item.description || (type === 'food' ? `מסעדה מומלצת המציעה חוויה קולינרית ייחודית ב${item.location || 'האזור'}.` : `אטרקציה מומלצת המהווה נקודת עניין מרכזית ב${item.location || 'האזור'}.`)}
                                                                </p>
                                                        </div>
                                                </div>
                                        </div>

                                        {/* Footer: Sticky Actions */}
                                        <div className="p-8 pt-4 border-t border-slate-50 bg-white flex-shrink-0 flex gap-4">
                                                <button
                                                        onClick={(e) => { e.stopPropagation(); onAddToPlan(); }}
                                                        className={`flex-[2] py-5 rounded-2xl font-black text-base transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${isAdded
                                                                        ? 'bg-yellow-400 text-yellow-950 shadow-yellow-100'
                                                                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                                                                }`}
                                                >
                                                        {isAdded ? (
                                                                <><Star className="w-5 h-5 fill-current" /> הסר מהתוכנית</>
                                                        ) : (
                                                                <><Plus className="w-5 h-5" /> הוסף לתוכנית</>
                                                        )}
                                                </button>
                                                <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + ' ' + (item.location || ''))}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex-1 rounded-2xl bg-slate-50 border-2 border-slate-100 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all flex items-center justify-center shadow-sm"
                                                >
                                                        <Navigation className="w-6 h-6" />
                                                </a>
                                        </div>
                                </div>
                        </div>

                        <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
                </div>
        );
};
