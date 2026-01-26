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

// Helper for Hebrew mapping
const HEBREW_TAGS: Record<string, string> = {
        "Burger": "המבורגר",
        "Pizza": "פיצה",
        "Italian": "איטלקי",
        "Sushi": "סושי",
        "Japanese": "יפני",
        "Thai": "תאילנדי",
        "Chinese": "סיני",
        "Mexican": "מקסיקני",
        "Indian": "הודי",
        "Vietnam": "וייטנאמי",
        "Cafe": "בית קפה",
        "Coffee": "קפה",
        "Dessert": "קינוחים",
        "Bar": "בר",
        "Cocktail": "קוקטיילים",
        "Wine": "יין",
        "Steak": "סטייק האוס",
        "Meat": "בשרים",
        "Seafood": "דגים",
        "Fish": "דגים",
        "Vegan": "טבעוני",
        "Vegetarian": "צמחוני",
        "Landmark": "אתר חובה",
        "Nature": "טבע",
        "Museum": "מוזיאון",
        "History": "היסטוריה",
        "Art": "אומנות",
        "Shopping": "קניות",
        "Market": "שוק",
        "Beach": "חוף",
        "Extreme": "אקסטרים",
        "Family": "משפחות",
        "Kids": "ילדים",
        "Nightlife": "חיי לילה",
        "Luxury": "יוקרה",
        "Fine Dining": "שף",
        "Local": "מקומי",
        "Authentic": "אותנטי",
        "Street Food": "אוכל רחוב"
};

const getSmartSubtitle = (item: any) => {
        // Attempt to define sub-type based on keywords
        const desc = (item.description || '').toLowerCase();
        const name = (item.name || '').toLowerCase();

        if (item.cuisine === 'Burger' || item.type === 'Burger') {
                if (desc.includes('smash') || name.includes('smash')) return 'Smash Burger';
                if (desc.includes('classic') || name.includes('classic')) return 'Classic Burger';
                return 'Gourmet Burger';
        }
        if (item.cuisine === 'Pizza' || item.type === 'Pizza') {
                if (desc.includes('neapolitan') || desc.includes('wood')) return 'Neapolitan Pizza';
                if (desc.includes('roman') || desc.includes('slice')) return 'Roman Pizza';
                return 'Italian Pizza';
        }
        if (item.cuisine === 'Japanese' || item.type === 'Japanese') {
                if (desc.includes('sushi')) return 'Sushi Bar';
                if (desc.includes('ramen')) return 'Ramen Shop';
                return 'Japanese Kitchen';
        }
        return null;
};

export const GlobalPlaceModal: React.FC<GlobalPlaceModalProps> = ({ item, type, onClose, onAddToPlan, isAdded }) => {
        if (!item) return null;

        // Smart Tag Logic
        const originalTag = item.cuisine || item.type || item.tags?.[0] || '';
        const hebrewTag = HEBREW_TAGS[originalTag] || originalTag;

        // Smart Subtitle (e.g. "Smash Burger") replacing duplicate tag
        const smartSubtitle = getSmartSubtitle(item);

        // Image & Map
        const { url: imageUrl, label: visualLabel } = (type === 'food' || type === 'restaurant')
                ? getFoodImage(item.name, item.description || '', [originalTag])
                : getAttractionImage(item.name, item.description || '', [originalTag]);

        // Fix Navigation: Ensure we search in the context of the location provided
        // If location is just "Old Tbilisi", Google might fail. We rely on the input location.
        // We add "Restaurant" or "Attraction" to the query to narrow it down.
        const categorySuffix = type === 'food' || type === 'restaurant' ? 'Restaurant' : 'Tourist Attraction';
        const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.name} ${item.location || ''} ${categorySuffix}`)}`;

        return createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" />
                        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>

                                <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all">
                                        <X className="w-5 h-5" />
                                </button>

                                <div className="h-52 w-full relative">
                                        <img src={imageUrl} alt={visualLabel} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                        <div className="absolute bottom-4 left-4 flex gap-2">
                                                {/* Primary Hebrew Tag */}
                                                {hebrewTag && (
                                                        <span className="text-xs font-bold text-white bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 shadow-sm">
                                                                {hebrewTag}
                                                        </span>
                                                )}
                                                {/* Secondary Smart Tag (English/Hebrew logic) or Visual Label if different */}
                                                {smartSubtitle && smartSubtitle !== originalTag && (
                                                        <span className="text-xs font-bold text-amber-300 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg border border-amber-500/30 shadow-sm">
                                                                {smartSubtitle}
                                                        </span>
                                                )}
                                        </div>
                                </div>

                                <div className="p-6">
                                        <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                        <h2 className="text-2xl font-black text-slate-800 leading-tight mb-1">{item.name}</h2>
                                                        <div className="flex items-center gap-1.5 text-sm text-slate-500 font-medium">
                                                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                                                <span className="truncate max-w-[200px]">{item.location}</span>
                                                        </div>
                                                </div>
                                                {(item.rating || item.googleRating) && (
                                                        <div className="flex flex-col items-center bg-yellow-50 px-3 py-1.5 rounded-xl border border-yellow-100 shadow-sm">
                                                                <span className="text-base font-black text-yellow-700">{item.rating || item.googleRating}</span>
                                                                <div className="flex gap-0.5 mt-0.5">
                                                                        {[1, 2, 3, 4, 5].map(i => (
                                                                                <Star key={i} className={`w-2 h-2 ${i <= Math.round(item.rating || item.googleRating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} />
                                                                        ))}
                                                                </div>
                                                        </div>
                                                )}
                                        </div>

                                        <p className="text-sm text-slate-600 leading-relaxed mb-6 font-medium text-right" dir="auto">
                                                {/* Fallback for English descriptions if client-side */}
                                                {(item.description && /^[A-Za-z]/.test(item.description))
                                                        ? (type === 'food' || type === 'restaurant'
                                                                ? `מסעדה מומלצת: ${item.description}`
                                                                : `אטרקציה מומלצת: ${item.description}`)
                                                        : (item.description || (type === 'food' || type === 'restaurant' ? 'מסעדה מצוינת ששווה בדיקה.' : 'אטרקציה שווה ביקור.'))
                                                }
                                        </p>

                                        <div className="grid grid-cols-2 gap-3">
                                                <button onClick={onAddToPlan} className={`py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 text-sm transition-all active:scale-95 ${isAdded ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-900 text-white shadow-lg shadow-slate-200 hover:shadow-xl hover:-translate-y-0.5'}`}>
                                                        {isAdded ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                                        {isAdded ? 'נוסף לטיול' : 'הוסף לטיול'}
                                                </button>
                                                <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 transition-all flex items-center justify-center gap-2 text-sm">
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
