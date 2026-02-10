import React, { useState } from 'react';
import { HotelBooking } from '../types';
import { Sparkles, X, Loader2, Search, Hotel, Plus } from 'lucide-react';
import { generateWithFallback } from '../services/aiService';
import { CalendarDatePicker } from './CalendarDatePicker';

// Helper: Input Component for DD/MM/YYYY
// Duplicated here for standalone usage or could be imported if moved to utils/components
const DateInput: React.FC<{
        value: string, // ISO YYYY-MM-DD
        onChange: (isoDate: string) => void,
        className?: string,
        placeholder?: string,
        title?: string
}> = ({ value, onChange, className, placeholder, title }) => {
        const [showPicker, setShowPicker] = useState(false);

        const displayDate = value ? value.split('T')[0].split('-').reverse().join('/') : (placeholder || "בחר תאריך");

        return (
                <div className="relative w-full">
                        <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setShowPicker(true); }}
                                className={`${className} flex items-center justify-between text-right font-bold`}
                        >
                                <span>{displayDate}</span>
                        </button>

                        {showPicker && (
                                <CalendarDatePicker
                                        value={value ? value.split('T')[0] : ''}
                                        title={title}
                                        onChange={onChange}
                                        onClose={() => setShowPicker(false)}
                                />
                        )}
                </div>
        );
};

export const SmartHotelSearchModal: React.FC<{ onClose: () => void; onSave: (data: HotelBooking) => void }> = ({ onClose, onSave }) => {
        const [query, setQuery] = useState('');
        const [isSearching, setIsSearching] = useState(false);
        const [step, setStep] = useState<'SEARCH' | 'DATES'>('SEARCH');
        const [hotelData, setHotelData] = useState<Partial<HotelBooking>>({});
        const [checkIn, setCheckIn] = useState('');
        const [checkOut, setCheckOut] = useState('');

        const handleSearch = async () => {
                if (!query.trim()) return;
                setIsSearching(true);
                try {
                        const prompt = `Find details for hotel "${query}". Return JSON: { name, address, googleMapsUrl, description, imageUrl, locationVibe }. Verify address is real.`;
                        const response = await generateWithFallback(null, [prompt], { responseMimeType: 'application/json' }, 'FAST');

                        const text = typeof response.text === 'function' ? response.text() : response.text;
                        let data = {};
                        try {
                                data = JSON.parse(text);
                        } catch (e) {
                                const match = text.match(/\{[\s\S]*\}/);
                                if (match) data = JSON.parse(match[0]);
                        }

                        setHotelData(data);
                        setStep('DATES');
                } catch (e) {
                        console.error(e);
                        alert("לא הצלחנו למצוא את המלון. נסה שם אחר.");
                } finally {
                        setIsSearching(false);
                }
        };

        const handleFinalSave = () => {
                if (!hotelData.name || !checkIn || !checkOut) {
                        alert("נא למלא את כל הפרטים");
                        return;
                }
                onSave({
                        id: `h-${Date.now()}`,
                        name: hotelData.name || query,
                        address: hotelData.address || '',
                        checkInDate: checkIn,
                        checkOutDate: checkOut,
                        googleMapsUrl: hotelData.googleMapsUrl,
                        locationVibe: hotelData.locationVibe,
                        bookingSource: 'Smart Search',
                        price: '',
                        imageUrl: hotelData.imageUrl
                } as HotelBooking);
        };

        return (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
                        <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                                <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                                        <h3 className="text-xl font-black flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-200" /> חיפוש מלון חכם</h3>
                                        <button onClick={onClose}><X className="w-6 h-6 text-indigo-200 hover:text-white" /></button>
                                </div>

                                <div className="p-6 space-y-6">
                                        {step === 'SEARCH' ? (
                                                <>
                                                        <div className="space-y-2">
                                                                <label className="text-sm font-bold text-slate-500">שם המלון או יעד</label>
                                                                <div className="relative">
                                                                        <input
                                                                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold outline-none focus:border-indigo-500 pl-12"
                                                                                placeholder="למשל: Hilton Tel Aviv"
                                                                                value={query}
                                                                                onChange={e => setQuery(e.target.value)}
                                                                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                                                                autoFocus
                                                                        />
                                                                        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                                                                </div>
                                                        </div>
                                                        <button
                                                                onClick={handleSearch}
                                                                disabled={isSearching || !query}
                                                                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex justify-center items-center gap-2"
                                                        >
                                                                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                                                {isSearching ? 'מחפש...' : 'מצא פרטי מלון'}
                                                        </button>
                                                </>
                                        ) : (
                                                <div className="space-y-4">
                                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-3">
                                                                <div className="bg-white p-2 rounded-lg shadow-sm h-fit"><Hotel className="w-6 h-6 text-indigo-600" /></div>
                                                                <div>
                                                                        <h4 className="font-black text-slate-800">{hotelData.name}</h4>
                                                                        <p className="text-xs text-slate-500">{hotelData.address}</p>
                                                                </div>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-1">
                                                                        <label className="text-xs font-bold text-slate-400">צ'ק-אין</label>
                                                                        <DateInput value={checkIn} onChange={setCheckIn} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                        <label className="text-xs font-bold text-slate-400">צ'ק-אאוט</label>
                                                                        <DateInput value={checkOut} onChange={setCheckOut} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />
                                                                </div>
                                                        </div>

                                                        <button
                                                                onClick={handleFinalSave}
                                                                className="w-full py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 transition-all flex justify-center items-center gap-2 mt-4"
                                                        >
                                                                <Plus className="w-5 h-5" /> הוסף לטיול
                                                        </button>
                                                </div>
                                        )}
                                </div>
                        </div>
                </div>
        );
};
