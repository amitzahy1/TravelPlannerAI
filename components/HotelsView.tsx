import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trip, HotelBooking } from '../types';
import { Hotel, MapPin, Calendar, ExternalLink, BedDouble, CheckCircle, StickyNote, Edit, Plus, Trash2, X, Save, DollarSign, Image as ImageIcon, Link as LinkIcon, Globe, Sparkles, Loader2, Navigation, Search, UploadCloud, FileText, Coffee, ShieldCheck, Lock } from 'lucide-react';
import { generateWithFallback } from '../services/aiService';
import { CalendarDatePicker } from './CalendarDatePicker';
import { ConfirmModal } from './ConfirmModal';


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
    const [hotelToDelete, setHotelToDelete] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newDocs = Array.from(e.target.files).map((f: File) => f.name);
            const updatedTrip = { ...trip, documents: [...(trip.documents || []), ...newDocs] };
            onUpdateTrip(updatedTrip);
        }
    };


    const handleNoteUpdate = (hotelId: string, newNote: string) => {
        const updatedHotels = (trip.hotels || []).map(h => h.id === hotelId ? { ...h, notes: newNote } : h);
        onUpdateTrip({ ...trip, hotels: updatedHotels });
    };
    const handleVibeUpdate = (hotelId: string, vibe: string) => {
        const updatedHotels = (trip.hotels || []).map(h => h.id === hotelId ? { ...h, locationVibe: vibe } : h);
        onUpdateTrip({ ...trip, hotels: updatedHotels });
    };
    const handleDeleteHotel = (hotelId: string) => {
        setHotelToDelete(hotelId);
    };

    const confirmDeleteHotel = () => {
        if (hotelToDelete) {
            const updatedHotels = (trip.hotels || []).filter(h => h.id !== hotelToDelete);
            onUpdateTrip({ ...trip, hotels: updatedHotels });
            setHotelToDelete(null);
        }
    };

    const handleEditHotel = (hotel: HotelBooking) => { setEditingHotel(hotel); setIsModalOpen(true); };
    const handleAddNew = () => { setEditingHotel(null); setIsModalOpen(true); };

    const handleSmartAdd = (hotelData: HotelBooking) => {
        const newHotels = [...(trip.hotels || []), { ...hotelData, id: crypto.randomUUID() }];
        onUpdateTrip({ ...trip, hotels: newHotels });
        setIsSmartAddOpen(false);
    };

    const handleSaveHotel = (hotelData: HotelBooking) => {
        let newHotels = [...(trip.hotels || [])];
        if (editingHotel) { newHotels = newHotels.map(h => h.id === hotelData.id ? hotelData : h); }
        else { newHotels.push({ ...hotelData, id: crypto.randomUUID() }); }
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
                            <button onClick={() => setIsSmartAddOpen(true)} className="flex-1 md:flex-none bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-3 py-2 md:px-5 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 md:gap-2 transition-all shadow-md hover:shadow-lg">
                                <Sparkles className="w-4 h-4 md:w-5 md:h-5" /> <span className="hidden xs:inline">הוספה חכמה</span><span className="xs:hidden">חכם +</span>
                            </button>
                            <button onClick={handleAddNew} className="flex-1 md:flex-none bg-white text-indigo-600 border border-indigo-200 px-3 py-2 md:px-5 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-1.5 md:gap-2 transition-all hover:bg-indigo-50">
                                <Plus className="w-4 h-4 md:w-5 md:h-5" /> ידני
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                        {hotels.map((hotel, index) => (
                            <motion.div
                                key={hotel.id || index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    delay: index * 0.1,
                                    type: 'spring',
                                    stiffness: 300,
                                    damping: 25
                                }}
                            >
                                <HotelCard data={hotel} tripDestination={trip.destination} onSaveNote={(note) => handleNoteUpdate(hotel.id, note)} onSaveVibe={(vibe) => handleVibeUpdate(hotel.id, vibe)} onDelete={() => handleDeleteHotel(hotel.id)} onEdit={() => handleEditHotel(hotel)} />
                            </motion.div>
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

                    <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-lg justify-center">
                        <button onClick={() => setIsSmartAddOpen(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-xl font-bold text-sm md:text-base shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
                            <Sparkles className="w-5 h-5" /> הדבק אישור (AI)
                        </button>
                        <button onClick={handleAddNew} className="bg-white text-slate-600 border border-slate-200 px-5 py-3 rounded-xl font-bold text-sm md:text-base hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                            <Plus className="w-5 h-5" /> הוסף ידנית
                        </button>
                    </div>
                </div>
            )}

            {isModalOpen && <HotelFormModal initialData={editingHotel} onClose={() => setIsModalOpen(false)} onSave={handleSaveHotel} />}
            {isSmartAddOpen && <SmartHotelAddModal onClose={() => setIsSmartAddOpen(false)} onSave={handleSmartAdd} />}

            {/* Documents Section */}
            <section className="max-w-6xl mx-auto pt-8 border-t border-slate-100">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800">מסמכים מצורפים</h2>
                        <p className="text-slate-500 text-sm">אישורי הזמנת מלון, שוברים וקבלות</p>
                    </div>
                    {onUpdateTrip && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                        >
                            <UploadCloud className="w-4 h-4" /> העלה קובץ
                        </button>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                </div>

                {/* Privacy Notice Banner */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <div className="bg-white p-1.5 rounded-full shadow-sm text-blue-600 mt-0.5">
                        <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-blue-900">הגנת פרטיות מופעלת</h4>
                        <p className="text-xs text-blue-700 mt-1">
                            המסמכים שלך נשמרים בצורה מאובטחת ומקומית. לצורך הגנה על המידע האישי שלך, לא ניתן לפתוח את המסמכים ישירות מהממשק.
                            הם משמשים את ה-AI לניתוח הנתונים בלבד.
                        </p>
                    </div>
                </div>

                {trip.documents && trip.documents.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {trip.documents.map((doc, idx) => {
                            const isPdf = doc.toLowerCase().endsWith('.pdf');
                            const isImage = doc.match(/\.(jpg|jpeg|png|webp)$/i);

                            return (
                                <div key={idx} className="group relative bg-white border border-slate-200 rounded-2xl p-3 aspect-[4/5] flex flex-col items-center justify-center text-center overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
                                    {isImage ? (
                                        <div className="absolute inset-0 bg-slate-100">
                                            <img src="https://via.placeholder.com/300?text=Protected" alt="Protected Document" className="w-full h-full object-cover blur-sm opacity-50" />
                                            <div className="absolute inset-0 bg-slate-100/50"></div>
                                        </div>
                                    ) : (
                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm z-10 ${isPdf ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                            {isPdf ? <FileText className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-sm border border-slate-100">
                                                <Lock className="w-3 h-3 text-slate-400" />
                                            </div>
                                        </div>
                                    )}

                                    <div className="relative z-10 w-full px-2">
                                        <div className={`text-xs font-bold truncate w-full ${isImage ? 'text-white drop-shadow-md' : 'text-slate-700'}`}>{doc}</div>
                                        <div className={`text-[10px] font-medium uppercase mt-1 ${isImage ? 'text-white/80' : 'text-slate-400'}`}>{isPdf ? 'PDF DOC' : 'IMAGE'}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-3 border-dashed border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-blue-50/50 rounded-3xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer group min-h-[200px]"
                    >
                        <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-8 h-8 text-blue-400" />
                        </div>
                        <span className="text-slate-400 font-bold group-hover:text-blue-500 transition-colors">לחץ כאן להוספת קבצים</span>
                    </div>
                )}
            </section>

            <ConfirmModal
                isOpen={!!hotelToDelete}
                title="מחיקת מלון"
                message="האם אתה בטוח שברצונך למחוק את המלון מהרשימה?"
                confirmText="מחק"
                cancelText="ביטול"
                onConfirm={confirmDeleteHotel}
                onClose={() => setHotelToDelete(null)}
                isDangerous={true}
            />
        </div>
    );
};

const HotelCard: React.FC<{
    data: HotelBooking,
    tripDestination: string,
    onSaveNote: (n: string) => void,
    onSaveVibe: (v: string) => void,
    onDelete: () => void,
    onEdit: () => void
}> = ({ data, tripDestination, onSaveNote, onSaveVibe, onDelete, onEdit }) => {
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteText, setNoteText] = useState(data.notes || '');
    const [analyzing, setAnalyzing] = useState(false);
    const saveNote = () => { onSaveNote(noteText); setIsEditingNote(false); };
    const analyzeLocation = async () => {
        setAnalyzing(true);
        try {
            const prompt = `Analyze location: "${data.name}", "${data.address}". Short Hebrew "Vibe Check" (max 15 words). e.g. "מרכזי, קרוב לרכבת, אזור בילויים".`;
            // Using FAST intent as requested for "Vibe"
            const response = await generateWithFallback(null, [prompt], {}, 'FAST');
            if (response.text) onSaveVibe(response.text);
        } catch (e) { console.error(e); } finally { setAnalyzing(false); }
    };

    // Use smart image selection
    const displayImage = data.imageUrl || getPlaceImage(data.address || data.name);

    return (
        <div className="bg-white rounded-xl md:rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-row group relative h-28 md:h-[200px]">
            <div className="absolute top-1.5 left-1.5 md:top-2 md:left-2 z-20 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={onEdit} className="bg-white/90 p-1 md:p-1.5 rounded-md md:rounded-lg text-slate-600 hover:text-blue-600 shadow-md backdrop-blur-sm"><Edit className="w-3 h-3 md:w-3.5 md:h-3.5" /></button>
                <button onClick={onDelete} className="bg-white/90 p-1 md:p-1.5 rounded-md md:rounded-lg text-slate-600 hover:text-red-600 shadow-md backdrop-blur-sm"><Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" /></button>
            </div>

            {/* Image Section - Compact Square on Mobile */}
            <div className="w-24 md:w-48 h-full relative bg-slate-100 flex-shrink-0">
                <img src={displayImage} alt={data.name} className="w-full h-full object-cover" />

                {/* Badges Overlay - Hidden on Mobile for density */}
                <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 flex flex-col gap-1 items-end">
                    <div className="hidden md:flex bg-white/90 backdrop-blur px-2 py-0.5 rounded-full text-[10px] font-bold text-slate-800 shadow-sm items-center"><CheckCircle className="w-2.5 h-2.5 ml-1 text-green-500" />{data.bookingSource}</div>
                    {data.breakfastIncluded && (
                        <div className="bg-orange-100/90 backdrop-blur px-1.5 md:px-2 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold text-orange-700 shadow-sm flex items-center"><Coffee className="w-2 h-2 md:w-2.5 md:h-2.5 ml-0.5 md:ml-1" /><span className="hidden md:inline">ארוחת בוקר</span><span className="md:hidden">בוקר</span></div>
                    )}
                </div>
            </div>

            {/* Content - Compact for Mobile */}
            <div className="p-2 md:p-4 flex-grow flex flex-col justify-between min-w-0 overflow-hidden">
                {/* Top: Name & Address */}
                <div>
                    <div className="flex justify-between items-start">
                        <div className="flex-grow min-w-0">
                            <h3 className="text-sm md:text-lg font-bold md:font-black text-slate-900 mb-0 md:mb-0.5 truncate leading-tight">{data.name}</h3>
                            <div className="flex items-center text-[10px] md:text-xs text-slate-500 font-medium truncate">
                                <MapPin className="w-2.5 h-2.5 md:w-3 md:h-3 ml-0.5 md:ml-1 flex-shrink-0 text-slate-400" />
                                <span className="truncate">{data.address}</span>
                            </div>
                        </div>
                        <span className="hidden md:block flex-shrink-0 text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200 ml-2">#{data.confirmationCode}</span>
                    </div>

                    {/* Desktop Only: Vibe & Cancellation */}
                    <div className="hidden md:block mt-2">
                        {data.cancellationPolicy && (
                            <div className="mb-2 text-[10px] text-red-500 bg-red-50 px-2 py-1 rounded-lg border border-red-100 flex items-start gap-1.5 w-fit">
                                <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                                <span className="font-bold">{data.cancellationPolicy}</span>
                            </div>
                        )}
                        {data.locationVibe ? (
                            <div className="bg-purple-50 border border-purple-100 p-2 rounded-xl flex items-start gap-2">
                                <div className="bg-white p-1 rounded-full shadow-sm flex-shrink-0"><Sparkles className="w-3 h-3 text-purple-600" /></div>
                                <div className="min-w-0"><div className="text-[9px] font-bold text-purple-700 uppercase mb-0 leading-none">Vibe Check</div><p className="text-xs text-purple-900 leading-tight font-medium line-clamp-2">{data.locationVibe}</p></div>
                            </div>
                        ) : (
                            <button onClick={analyzeLocation} disabled={analyzing} className="flex items-center gap-1.5 text-[10px] font-bold text-purple-600 hover:bg-purple-50 px-2 py-1.5 rounded-lg transition-colors border border-dashed border-purple-200 w-full justify-center">{analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}{analyzing ? 'מנתח...' : 'מה ה-Vibe של האזור?'}</button>
                        )}
                    </div>
                </div>

                {/* Bottom: Dates & Actions */}
                <div className="flex items-center justify-between mt-1 md:mt-0 md:border-t md:border-dashed md:border-slate-200 md:pt-3">
                    <div className="flex gap-1 md:gap-2 flex-wrap">
                        <div className="bg-indigo-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded md:rounded-lg border border-indigo-100 flex items-center gap-1 md:gap-2">
                            <div className="text-[8px] md:text-[9px] text-indigo-600 font-bold uppercase">IN</div>
                            <div className="font-bold text-slate-900 text-[10px] md:text-sm flex items-center">{
                                // Inline formatter for display
                                data.checkInDate?.split('T')[0].split('-').reverse().join('/') || ''
                            }</div>
                        </div>
                        <div className="bg-slate-50 px-1.5 md:px-2 py-0.5 md:py-1 rounded md:rounded-lg border border-slate-200 flex items-center gap-1 md:gap-2">
                            <div className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase">OUT</div>
                            <div className="font-bold text-slate-900 text-[10px] md:text-sm flex items-center">{
                                data.checkOutDate?.split('T')[0].split('-').reverse().join('/') || ''
                            }</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 md:gap-2">
                        {/* Note - Hidden on Mobile */}
                        <div className="hidden md:block">
                            {isEditingNote ? (
                                <div className="flex bg-yellow-50 p-1 rounded-lg border border-yellow-200 w-48">
                                    <input className="w-full bg-transparent border-none outline-none text-xs text-slate-800" placeholder="הוסף הערה..." value={noteText} onChange={e => setNoteText(e.target.value)} />
                                    <button onClick={saveNote} className="text-[10px] bg-yellow-400 text-yellow-900 px-1.5 rounded font-bold whitespace-nowrap ml-1">שמור</button>
                                </div>
                            ) : (
                                <div onClick={() => setIsEditingNote(true)} className={`px-2 py-1.5 rounded-lg border text-[10px] flex items-center gap-1.5 cursor-pointer max-w-[150px] ${data.notes ? 'bg-yellow-50 border-yellow-100 text-yellow-900 hover:bg-yellow-100' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100 border-dashed border-slate-200'}`}>
                                    <StickyNote className={`w-3 h-3 flex-shrink-0 ${data.notes ? 'text-yellow-600' : 'text-slate-400'}`} />
                                    <span className="truncate font-medium">{data.notes || 'הערה'}</span>
                                </div>
                            )}
                        </div>

                        <a href={data.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${data.name} ${data.address || ''} ${tripDestination || ''}`)}`} target="_blank" rel="noopener noreferrer" className="bg-indigo-600 text-white p-1.5 md:p-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"><MapPin className="w-3 h-3 md:w-4 md:h-4" /></a>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HotelFormModal: React.FC<{ initialData: HotelBooking | null; onClose: () => void; onSave: (data: HotelBooking) => void; }> = ({ initialData, onClose, onSave }) => {
    const [formData, setFormData] = useState<Partial<HotelBooking>>(initialData || { name: '', address: '', checkInDate: '', checkOutDate: '', bookingSource: 'Direct', price: '' });
    const [showInPicker, setShowInPicker] = useState(false);
    const [showOutPicker, setShowOutPicker] = useState(false);

    const formatForDisplay = (d?: string) => {
        if (!d) return "בחר תאריך";
        // Handle YYYY-MM-DD with optional time part
        if (d.match(/^\d{4}-\d{2}-\d{2}/)) {
            const datePart = d.split('T')[0];
            const [y, m, day] = datePart.split('-');
            return `${day}/${m}/${y}`;
        }
        return d;
    };

    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave(formData as HotelBooking); };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-800">{initialData ? 'עריכת מלון' : 'הוספת מלון ידנית'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 mr-2">שם המלון</label>
                        <input required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-lg outline-none focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="שם המלון" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 mr-2">כתובת</label>
                        <input className="w-full p-4 bg-slate-50 rounded-2xl font-medium outline-none focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="כתובת" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 relative">
                            <label className="text-xs font-bold text-slate-400 mr-2">צ'ק-אין</label>
                            <button
                                type="button"
                                onClick={() => setShowInPicker(true)}
                                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm text-right flex items-center justify-between hover:bg-indigo-50 transition-colors"
                            >
                                <span>{formatForDisplay(formData.checkInDate)}</span>
                                <Calendar className="w-4 h-4 text-slate-400" />
                            </button>
                            {showInPicker && (
                                <CalendarDatePicker
                                    value={formData.checkInDate || ''}
                                    title="צ'ק-אין"
                                    onChange={(iso) => setFormData({ ...formData, checkInDate: iso })}
                                    onClose={() => setShowInPicker(false)}
                                />
                            )}
                        </div>
                        <div className="space-y-1 relative">
                            <label className="text-xs font-bold text-slate-400 mr-2">צ'ק-אאוט</label>
                            <button
                                type="button"
                                onClick={() => setShowOutPicker(true)}
                                className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm text-right flex items-center justify-between hover:bg-indigo-50 transition-colors"
                            >
                                <span>{formatForDisplay(formData.checkOutDate)}</span>
                                <Calendar className="w-4 h-4 text-slate-400" />
                            </button>
                            {showOutPicker && (
                                <CalendarDatePicker
                                    value={formData.checkOutDate || ''}
                                    title="צ'ק-אאוט"
                                    onChange={(iso) => setFormData({ ...formData, checkOutDate: iso })}
                                    onClose={() => setShowOutPicker(false)}
                                />
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 bg-indigo-50 p-4 rounded-2xl">
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                            <input type="checkbox" className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500" checked={formData.breakfastIncluded || false} onChange={e => setFormData({ ...formData, breakfastIncluded: e.target.checked })} />
                            <span className="font-bold text-indigo-900">ארוחת בוקר כלולה?</span>
                        </label>
                    </div>

                    <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98] transition-all">שמור</button>
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
                null,
                [{ role: 'user', parts: contentParts }],
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