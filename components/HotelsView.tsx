import React, { useState, useRef } from 'react';
import { Trip, HotelBooking } from '../types';
import { Hotel, MapPin, Calendar, ExternalLink, BedDouble, CheckCircle, StickyNote, Edit, Plus, Trash2, X, Save, DollarSign, Image as ImageIcon, Link as LinkIcon, Globe, Sparkles, Loader2, Navigation, Search, UploadCloud, FileText, Coffee, ShieldCheck } from 'lucide-react';
import { getAI, AI_MODEL, generateWithFallback } from '../services/aiService';

// Helper to determine placeholder image based on address
const getPlaceImage = (address: string): string => {
    const lowerAddr = (address || '').toLowerCase();

    // Thailand
    if (lowerAddr.includes('bangkok') || lowerAddr.includes('bkk')) return 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('phuket')) return 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('samui') || lowerAddr.includes('koh samui')) return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('pattaya')) return 'https://images.unsplash.com/photo-1598970434795-0c54fe7c0648?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('chiang mai')) return 'https://images.unsplash.com/photo-1598135753163-6167c1a1ad65?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('krabi')) return 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('koh chang')) return 'https://images.unsplash.com/photo-1559530432-62dc0442c549?auto=format&fit=crop&q=80'; // Beachy island
    if (lowerAddr.includes('tao') || lowerAddr.includes('koh tao')) return 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80';

    // Europe
    if (lowerAddr.includes('london') || lowerAddr.includes('uk')) return 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('paris') || lowerAddr.includes('france')) return 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('rome') || lowerAddr.includes('italy')) return 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80';
    if (lowerAddr.includes('barcelona') || lowerAddr.includes('spain')) return 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&q=80';

    // US
    if (lowerAddr.includes('new york') || lowerAddr.includes('nyc')) return 'https://images.unsplash.com/photo-1496442226666-8d4a0e62e6e9?auto=format&fit=crop&q=80';

    // General
    if (lowerAddr.includes('beach') || lowerAddr.includes('resort') || lowerAddr.includes('island')) return 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&q=80'; // General Resort

    // Default City
    return 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&q=80'; // General City
};

export const HotelsView: React.FC<{ trip: Trip, onUpdateTrip: (t: Trip) => void }> = ({ trip, onUpdateTrip }) => {
    const { hotels } = trip;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSmartAddOpen, setIsSmartAddOpen] = useState(false);
    const [editingHotel, setEditingHotel] = useState<HotelBooking | null>(null);

    const handleNoteUpdate = (hotelId: string, newNote: string) => {
        const updatedHotels = (trip.hotels || []).map(h => h.id === hotelId ? { ...h, notes: newNote } : h);
        onUpdateTrip({ ...trip, hotels: updatedHotels });
    };
    const handleVibeUpdate = (hotelId: string, vibe: string) => {
        const updatedHotels = (trip.hotels || []).map(h => h.id === hotelId ? { ...h, locationVibe: vibe } : h);
        onUpdateTrip({ ...trip, hotels: updatedHotels });
    };
    const handleDeleteHotel = (hotelId: string) => {
        if (window.confirm("האם אתה בטוח שברצונך למחוק מלון זה?")) {
            const updatedHotels = (trip.hotels || []).filter(h => h.id !== hotelId);
            onUpdateTrip({ ...trip, hotels: updatedHotels });
        }
    };
    const handleEditHotel = (hotel: HotelBooking) => { setEditingHotel(hotel); setIsModalOpen(true); };
    const handleAddNew = () => { setEditingHotel(null); setIsModalOpen(true); };

    const handleSmartAdd = (hotelData: HotelBooking) => {
        const newHotels = [...(trip.hotels || []), { ...hotelData, id: `h-${Date.now()}` }];
        onUpdateTrip({ ...trip, hotels: newHotels });
        setIsSmartAddOpen(false);
    };

    const handleSaveHotel = (hotelData: HotelBooking) => {
        let newHotels = [...(trip.hotels || [])];
        if (editingHotel) { newHotels = newHotels.map(h => h.id === hotelData.id ? hotelData : h); }
        else { newHotels.push({ ...hotelData, id: `h-${Date.now()}` }); }
        onUpdateTrip({ ...trip, hotels: newHotels });
        setIsModalOpen(false);
        setEditingHotel(null);
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">

            {hotels && hotels.length > 0 ? (
                <>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-3xl font-extrabold text-slate-800 flex items-center tracking-tight">
                            <span className="bg-indigo-100 p-2 rounded-xl ml-3 text-indigo-600 shadow-sm"><Hotel className="w-7 h-7" /></span>
                            המלונות שלי
                        </h2>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={() => setIsSmartAddOpen(true)} className="flex-1 md:flex-none bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg">
                                <Sparkles className="w-5 h-5" /> הוספה חכמה (AI)
                            </button>
                            <button onClick={handleAddNew} className="flex-1 md:flex-none bg-white text-indigo-600 border border-indigo-100 px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-indigo-50">
                                <Plus className="w-5 h-5" /> ידני
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        {hotels.map((hotel, index) => (
                            <HotelCard key={hotel.id || index} data={hotel} onSaveNote={(note) => handleNoteUpdate(hotel.id, note)} onSaveVibe={(vibe) => handleVibeUpdate(hotel.id, vibe)} onDelete={() => handleDeleteHotel(hotel.id)} onEdit={() => handleEditHotel(hotel)} />
                        ))}
                    </div>
                </>
            ) : (
                /* PREMIUM EMPTY STATE */
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-indigo-200 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-100 relative z-10 transform -rotate-3 transition-transform hover:rotate-0 duration-500 border border-indigo-50">
                            <Hotel className="w-24 h-24 text-indigo-500" strokeWidth={1.5} />
                        </div>
                    </div>

                    <div className="space-y-3 max-w-md">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tight">איפה ישנים?</h2>
                        <p className="text-slate-500 text-lg font-medium leading-relaxed">
                            עדיין לא הזנתם מלונות. אפשר להדביק את אישור ההזמנה כאן וה-AI יעשה את השאר.
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 w-full max-w-sm md:max-w-none justify-center">
                        <button onClick={() => setIsSmartAddOpen(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3">
                            <Sparkles className="w-6 h-6" /> הדבק אישור הזמנה (AI)
                        </button>
                        <button onClick={handleAddNew} className="bg-white text-slate-600 border border-slate-200 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-3">
                            <Plus className="w-6 h-6" /> הוסף ידנית
                        </button>
                    </div>
                </div>
            )}

            {isModalOpen && <HotelFormModal initialData={editingHotel} onClose={() => setIsModalOpen(false)} onSave={handleSaveHotel} />}
            {isSmartAddOpen && <SmartHotelAddModal onClose={() => setIsSmartAddOpen(false)} onSave={handleSmartAdd} />}
        </div>
    );
};

const HotelCard: React.FC<{
    data: HotelBooking,
    onSaveNote: (n: string) => void,
    onSaveVibe: (v: string) => void,
    onDelete: () => void,
    onEdit: () => void
}> = ({ data, onSaveNote, onSaveVibe, onDelete, onEdit }) => {
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState(data.notes || '');
    const [analyzing, setAnalyzing] = useState(false);
    const saveNote = () => { onSaveNote(noteText); setIsEditingNote(false); };
    const analyzeLocation = async () => {
        setAnalyzing(true);
        try {
            const ai = getAI();
            const prompt = `Analyze location: "${data.name}", "${data.address}". Short Hebrew "Vibe Check" (max 15 words). e.g. "מרכזי, קרוב לרכבת, אזור בילויים".`;
            const response = await generateWithFallback(ai, prompt);
            if (response.text) onSaveVibe(response.text);
        } catch (e) { console.error(e); } finally { setAnalyzing(false); }
    };

    // Use smart image selection
    const displayImage = data.imageUrl || getPlaceImage(data.address || data.name);

    return (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row group relative">
            <div className="absolute top-4 left-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onEdit} className="bg-white/90 p-2 rounded-xl text-slate-600 hover:text-blue-600 shadow-md backdrop-blur-sm"><Edit className="w-4 h-4" /></button>
                <button onClick={onDelete} className="bg-white/90 p-2 rounded-xl text-slate-600 hover:text-red-600 shadow-md backdrop-blur-sm"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="md:w-1/3 h-56 md:h-auto relative bg-slate-100">
                <img src={displayImage} alt={data.name} className="w-full h-full object-cover" />

                {/* Badges Overlay */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                    <div className="bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-800 shadow-sm flex items-center"><CheckCircle className="w-3 h-3 ml-1 text-green-500" />{data.bookingSource}</div>
                    {data.breakfastIncluded && (
                        <div className="bg-orange-100/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-orange-700 shadow-sm flex items-center"><Coffee className="w-3 h-3 ml-1" />ארוחת בוקר</div>
                    )}
                </div>
            </div>
            <div className="p-6 md:w-2/3 flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start pl-10">
                        <div><h3 className="text-2xl font-black text-slate-900 mb-1">{data.name}</h3><div className="flex items-start text-sm text-slate-500 mb-4 font-medium"><MapPin className="w-4 h-4 ml-1 flex-shrink-0 mt-0.5 text-slate-400" />{data.address}</div></div>
                        {data.confirmationCode && <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500 border border-slate-200">#{data.confirmationCode}</span>}
                    </div>

                    {data.cancellationPolicy && (
                        <div className="mb-3 text-xs text-red-500 bg-red-50 px-3 py-2 rounded-xl border border-red-100 flex items-start gap-2">
                            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                            <span className="font-bold">{data.cancellationPolicy}</span>
                        </div>
                    )}

                    <div className="mb-4">
                        {data.locationVibe ? (
                            <div className="bg-purple-50 border border-purple-100 p-3 rounded-2xl flex items-start gap-3">
                                <div className="bg-white p-1.5 rounded-full shadow-sm"><Sparkles className="w-4 h-4 text-purple-600" /></div>
                                <div><div className="text-[10px] font-bold text-purple-700 uppercase mb-0.5">ניתוח מיקום (AI)</div><p className="text-sm text-purple-900 leading-snug font-medium">{data.locationVibe}</p></div>
                            </div>
                        ) : (
                            <button onClick={analyzeLocation} disabled={analyzing} className="flex items-center gap-2 text-xs font-bold text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-xl transition-colors border border-dashed border-purple-200 w-full justify-center">{analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}{analyzing ? 'מנתח...' : 'מה ה-Vibe של האזור?'}</button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100"><div className="text-[10px] text-indigo-600 font-bold uppercase mb-1">צ'ק אין</div><div className="font-bold text-slate-900 flex items-center text-lg"><Calendar className="w-4 h-4 ml-2 text-indigo-400" />{data.checkInDate}</div></div>
                        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200"><div className="text-[10px] text-slate-500 font-bold uppercase mb-1">צ'ק אאוט</div><div className="font-bold text-slate-900 flex items-center text-lg"><Calendar className="w-4 h-4 ml-2 text-slate-400" />{data.checkOutDate}</div></div>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-dashed border-slate-200 flex items-center justify-between">
                    {isEditingNote ? (<div className="flex-grow bg-yellow-50 p-2 rounded-xl border border-yellow-200 mr-4"><textarea className="w-full bg-transparent border-none outline-none text-sm text-slate-800 resize-none" rows={1} placeholder="הוסף הערה..." value={noteText} onChange={e => setNoteText(e.target.value)} /><div className="flex justify-end gap-2 mt-1"><button onClick={() => setIsEditingNote(false)} className="text-xs text-slate-500">ביטול</button><button onClick={saveNote} className="text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded font-bold">שמור</button></div></div>) : (<div onClick={() => setIsEditingNote(true)} className={`flex-grow p-2 rounded-xl border text-xs flex items-center gap-2 cursor-pointer transition-colors mr-4 ${data.notes ? 'bg-yellow-50 border-yellow-100 text-yellow-900 hover:bg-yellow-100' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100 border-dashed border-slate-200'}`}><StickyNote className={`w-3.5 h-3.5 flex-shrink-0 ${data.notes ? 'text-yellow-600' : 'text-slate-400'}`} /><span className="truncate font-medium">{data.notes || 'הערות אישיות'}</span></div>)}
                    {data.googleMapsUrl && (<a href={data.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"><ExternalLink className="w-4 h-4" /> ניווט</a>)}
                </div>
            </div>
        </div>
    );
};

const HotelFormModal: React.FC<{ initialData: HotelBooking | null; onClose: () => void; onSave: (data: HotelBooking) => void; }> = ({ initialData, onClose, onSave }) => {
    // ... existing modal logic ...
    const [formData, setFormData] = useState<Partial<HotelBooking>>(initialData || { name: '', address: '', checkInDate: '', checkOutDate: '', bookingSource: 'Direct', price: '' });
    const toInputDate = (d?: string) => d?.split('/').reverse().join('-') || '';
    const fromInputDate = (d: string) => d.split('-').reverse().join('/');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData as HotelBooking); };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center"><h3 className="text-xl font-black text-slate-800">הוספת מלון ידנית</h3><button onClick={onClose}><X className="w-6 h-6 text-slate-400" /></button></div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <input required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-lg outline-none focus:ring-2 focus:ring-indigo-100" placeholder="שם המלון" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    <input className="w-full p-4 bg-slate-50 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-indigo-100" placeholder="כתובת" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={toInputDate(formData.checkInDate)} onChange={e => setFormData({ ...formData, checkInDate: fromInputDate(e.target.value) })} />
                        <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" value={toInputDate(formData.checkOutDate)} onChange={e => setFormData({ ...formData, checkOutDate: fromInputDate(e.target.value) })} />
                    </div>

                    <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-2xl">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="w-5 h-5" checked={formData.breakfastIncluded || false} onChange={e => setFormData({ ...formData, breakfastIncluded: e.target.checked })} />
                            <span className="font-bold text-indigo-900">ארוחת בוקר כלולה?</span>
                        </label>
                    </div>

                    <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:scale-[1.02] transition-transform">שמור</button>
                </form>
            </div>
        </div>
    );
};

const SmartHotelAddModal: React.FC<{ onClose: () => void; onSave: (data: HotelBooking) => void }> = ({ onClose, onSave }) => {
    const [textInput, setTextInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processContent = async (text: string, files?: FileList) => {
        setIsProcessing(true);
        try {
            const ai = getAI();
            const contentParts: any[] = [
                {
                    text: `Extract a SINGLE Hotel Booking from this content.
                Return JSON in 'HotelBooking' format: { name, address, checkInDate (DD/MM/YYYY), checkOutDate (DD/MM/YYYY), bookingSource, price, roomType, confirmationCode, breakfastIncluded (boolean), cancellationPolicy (string) }.
                If details are missing, omit them or guess logically.` }
            ];

            if (text) contentParts.push({ text: `Text: ${text}` });

            if (files) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const reader = new FileReader();
                    const promise = new Promise<any>((resolve) => {
                        if (file.type === 'text/plain') {
                            reader.onload = () => resolve({ text: reader.result });
                            reader.readAsText(file);
                        } else {
                            reader.onload = () => resolve({ inlineData: { mimeType: file.type, data: (reader.result as string).split(',')[1] } });
                            reader.readAsDataURL(file);
                        }
                    });
                    const part = await promise;
                    contentParts.push(part);
                }
            }

            const response = await generateWithFallback(
                ai,
                { role: 'user', parts: contentParts },
                { responseMimeType: 'application/json' }
            );

            const textContent = typeof response.text === 'function' ? response.text() : response.text;

            let hotelData;
            try {
                hotelData = JSON.parse(textContent);
            } catch (e) {
                const jsonMatch = textContent.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    hotelData = JSON.parse(jsonMatch[0]);
                } else {
                    throw new Error('Could not extract JSON from response');
                }
            }
            onSave(hotelData);
        } catch (e) {
            console.error(e);
            alert('שגיאה בפענוח הנתונים.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col relative">
                <div className="bg-indigo-50 p-6 border-b border-indigo-100 flex justify-between items-center"><h3 className="text-xl font-black text-indigo-900 flex items-center gap-2"><Sparkles className="w-5 h-5" /> הוספה חכמה</h3><button onClick={onClose}><X className="w-6 h-6 text-indigo-300 hover:text-indigo-600" /></button></div>

                <div className="p-6 space-y-6">
                    {isProcessing ? (
                        <div className="py-10 text-center">
                            <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                            <p className="font-bold text-slate-500">ה-AI קורא את ההזמנה שלך...</p>
                        </div>
                    ) : (
                        <>
                            <textarea
                                className="w-full h-32 p-4 bg-slate-50 rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 resize-none font-medium"
                                placeholder="הדבק כאן את תוכן המייל או הודעת האישור..."
                                value={textInput}
                                onChange={e => setTextInput(e.target.value)}
                            />

                            <div className="flex items-center gap-4">
                                <div className="h-px bg-slate-200 flex-grow"></div>
                                <span className="text-xs font-bold text-slate-400">או</span>
                                <div className="h-px bg-slate-200 flex-grow"></div>
                            </div>

                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-indigo-200 bg-indigo-50/50 rounded-2xl p-6 flex flex-col items-center cursor-pointer hover:bg-indigo-50 transition-colors"
                            >
                                <UploadCloud className="w-8 h-8 text-indigo-400 mb-2" />
                                <span className="font-bold text-indigo-700 text-sm">העלה צילום מסך או PDF</span>
                                <input type="file" multiple className="hidden" ref={fileInputRef} onChange={e => e.target.files && processContent("", e.target.files)} />
                            </div>

                            <button
                                onClick={() => processContent(textInput)}
                                disabled={!textInput.trim()}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                צור מלון
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};