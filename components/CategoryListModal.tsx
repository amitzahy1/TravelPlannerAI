import React, { useMemo } from 'react';
import { X, Star, MapPin } from 'lucide-react';
import { Restaurant, Attraction, Trip } from '../types';
import { getPlaceImage } from '../services/imageMapper';


interface CategoryListModalProps {
        type: 'food' | 'attractions' | 'hotels';
        trip: Trip;
        onClose: () => void;
        onSelectItem: (item: any) => void;
}

export const CategoryListModal: React.FC<CategoryListModalProps> = ({ type, trip, onClose, onSelectItem }) => {

        const items = useMemo(() => {
                let rawItems: any[] = [];
                if (type === 'food') {
                        trip.restaurants?.forEach(cat => cat.restaurants.forEach(r => {
                                if (r.isFavorite) rawItems.push({ ...r, _type: 'food' });
                        }));
                } else if (type === 'attractions') {
                        trip.attractions?.forEach(cat => cat.attractions.forEach(a => {
                                if (a.isFavorite) rawItems.push({ ...a, _type: 'attraction' });
                        }));
                } else if (type === 'hotels') {
                        trip.hotels?.forEach(h => rawItems.push({ ...h, _type: 'hotel' }));
                }
                return rawItems;
        }, [trip, type]);

        const title = type === 'food' ? 'מסעדות' : type === 'attractions' ? 'אטרקציות' : 'מלונות';

        return (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
                        <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>

                                {/* Header */}
                                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                        <h2 className="text-xl font-black text-slate-800">{title} <span className="text-slate-400 font-medium text-sm">({items.length})</span></h2>
                                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                                </div>

                                {/* List */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/30">
                                        {items.map((item, idx) => {
                                                const tags = [(item.cuisine || item.type || ''), item.location || item.address];
                                                const image = getPlaceImage(item.name, type === 'food' ? 'food' : 'attraction', tags); // Hotels fallback to attraction logic or default

                                                return (
                                                        <div
                                                                key={item.id || idx}
                                                                onClick={() => onSelectItem({ item: item, type: type === 'food' ? 'food' : 'attraction' })}
                                                                className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group flex gap-3"
                                                        >
                                                                <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 relative">
                                                                        <img src={image} className="w-full h-full object-cover" alt="" />
                                                                        {(item.rating || item.googleRating) && (
                                                                                <div className="absolute top-1 right-1 bg-white/90 backdrop-blur px-1 rounded text-[10px] font-bold flex items-center gap-0.5 shadow-sm">
                                                                                        {item.rating || item.googleRating}<Star className="w-2 h-2 text-yellow-500 fill-yellow-500" />
                                                                                </div>
                                                                        )}
                                                                </div>
                                                                <div className="flex-1 min-w-0 py-1">
                                                                        <h3 className="font-bold text-slate-800 text-sm truncate">{item.name}</h3>
                                                                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{item.description || item.address || item.location}</p>
                                                                        <div className="mt-2 flex items-center gap-2">
                                                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                                                                                        {item.cuisine || (type === 'hotels' ? 'מלון' : 'אטרקציה')}
                                                                                </span>
                                                                        </div>
                                                                </div>
                                                        </div>
                                                )
                                        })}
                                        {items.length === 0 && (
                                                <div className="text-center py-10 text-slate-400">
                                                        <p>אין פריטים בקטגוריה זו</p>
                                                </div>
                                        )}
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
