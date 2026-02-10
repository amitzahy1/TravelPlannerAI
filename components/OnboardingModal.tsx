import React, { useState, useEffect } from 'react';
import { Sparkles, X, Check, MapPin, Calendar, Plane, Bed, Shield, Star, Wand2, Bus, Utensils, Globe, Edit2, CloudRain, Mail, Loader2, Link, ChevronRight, ArrowLeft } from 'lucide-react';
import { Trip, StagedTripData, StagedWalletItem } from '../types';
import { MagicDropZone } from './MagicDropZone';
import { analyzeTripFiles, TripAnalysisResult, generateWithFallback } from '../services/aiService';
import { mapAnalysisToTrip } from '../services/tripService';
import { ThinkingLoader } from './ThinkingLoader';


interface OnboardingModalProps {
    trips?: Trip[];
    onSelectTrip?: (id: string) => void;
    onCreateNew?: () => void;
    onImportTrip?: (trip: Trip) => void;
    isOpen?: boolean;        // Controlled prop
    onClose?: () => void;       // Notify parent
}

// Updated State Machine: DESTINATION -> METHOD -> [MANUAL | CONTEXT] -> PROCESSING -> REVIEW
type ViewMode = 'DESTINATION' | 'METHOD_SELECTION' | 'MANUAL_DATE' | 'CONTEXT' | 'PROCESSING' | 'REVIEW_FORM';

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ trips = [], onSelectTrip, onCreateNew, onImportTrip, isOpen = false, onClose }) => {

    // Strict State Machine
    const [mode, setMode] = useState<ViewMode>('DESTINATION');

    // Data State
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [tripData, setTripData] = useState<TripAnalysisResult | null>(null);

    // Form State (Smart Review)
    const [formName, setFormName] = useState("");
    const [formDates, setFormDates] = useState("");
    const [formDestination, setFormDestination] = useState("");

    // Input States
    const [destinationInput, setDestinationInput] = useState("");
    const [magicInput, setMagicInput] = useState("");
    const [isMagicProcessing, setIsMagicProcessing] = useState(false);

    useEffect(() => {
        if (tripData?.metadata) {
            setFormName(tripData.metadata.suggestedName || '');
            setFormDestination(cleanCityName(tripData.metadata.destination || ''));

            // Format dates as "YYYY-MM-DD - YYYY-MM-DD"
            const dates = tripData.metadata.startDate && tripData.metadata.endDate
                ? `${tripData.metadata.startDate} - ${tripData.metadata.endDate}`
                : tripData.metadata.startDate || '';
            setFormDates(dates);
        }
    }, [tripData]);

    const handleClose = () => {
        if (onClose) onClose();

        // Reset to initial state (DESTINATION)
        setTimeout(() => {
            setMode('DESTINATION');
            setTripData(null);
            setUploadedFiles([]);
            setFormName("");
            setFormDates("");
            setFormDestination("");
            setDestinationInput("");
            setMagicInput("");
            setIsMagicProcessing(false);
        }, 300);
    };

    const handleLegacyCreate = () => {
        // "Skip" flow: Create empty trip immediately without wizard
        if (!onImportTrip) return;

        const newTrip: Trip = {
            id: crypto.randomUUID(),
            name: destinationInput ? `${destinationInput} Trip` : "My New Trip",
            dates: formDates || "", // Use formDates if set (manual flow)
            destination: destinationInput || "",
            coverImage: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
            flights: { passengerName: "", pnr: "", segments: [] },
            hotels: [],
            restaurants: [],
            attractions: [],
            itinerary: [],
            documents: [],
            secureNotes: [],
            isShared: false
        };

        onImportTrip(newTrip);
        handleClose();
    };

    const handleFilesReady = async (files: File[]) => {
        setUploadedFiles(files);
        setMode('PROCESSING');

        try {
            // Pass the destination hint to analysis service if possible
            const result = await analyzeTripFiles(files);
            setTripData(result);

            // Pre-fill form
            setFormName(result.metadata.suggestedName);
            // Fix: Use the smart route (City - City) if available, otherwise country, fallback to user input
            setFormDestination(result.metadata.cities && result.metadata.cities.length > 0
                ? result.metadata.cities.join(' - ')
                : result.metadata.destination || destinationInput);

            if (result.metadata.startDate && result.metadata.endDate) {
                setFormDates(`${result.metadata.startDate} - ${result.metadata.endDate}`);
            } else {
                setFormDates(result.metadata.startDate || "");
            }

            setMode('REVIEW_FORM');
        } catch (error) {
            console.error("Analysis failed", error);
            alert("Failed to analyze files. Switching to manual mode.");
            handleLegacyCreate();
        }
    };

    const handleManualDescription = async () => {
        if (!magicInput.trim()) {
            handleLegacyCreate();
            return;
        }

        setIsMagicProcessing(true);
        setMode('PROCESSING');

        try {
            const prompt = `Parse this trip description into structured data. 
            User Context: The user wants to go to "${destinationInput}".
            
            Return JSON:
            {
              "tripName": "string",
              "destination": "main city/country",
              "cities": ["city1", "city2"],
              "startDate": "YYYY-MM-DD or empty",
              "endDate": "YYYY-MM-DD or empty"
            }

            User Input: "${magicInput}"`;

            const response = await generateWithFallback(null, prompt, {}, 'FAST');
            const parsed = JSON.parse(response.text);

            setFormName(parsed.tripName || (destinationInput ? `${destinationInput} Adventure` : "My Dream Trip"));
            setFormDestination(parsed.cities?.join(' - ') || parsed.destination || destinationInput || "");
            if (parsed.startDate && parsed.endDate) {
                setFormDates(`${parsed.startDate} - ${parsed.endDate}`);
            }

            // Create empty trip data structure
            setTripData({
                metadata: {
                    suggestedName: parsed.tripName,
                    destination: parsed.destination,
                    startDate: parsed.startDate,
                    endDate: parsed.endDate,
                    cities: parsed.cities || []
                },
                rawStagedData: {
                    tripMetadata: { suggestedName: parsed.tripName, suggestedDates: '', mainDestination: parsed.destination, uniqueCityNames: parsed.cities || [] },
                    processedFileIds: [],
                    unprocessedFiles: [],
                    categories: { transport: [], accommodation: [], carRental: [], wallet: [], dining: [], activities: [] }
                }
            });

            setMode('REVIEW_FORM');
        } catch (error) {
            console.error("Magic parse failed:", error);
            handleLegacyCreate();
        } finally {
            setIsMagicProcessing(false);
        }
    };

    const handleConfirmTrip = () => {
        if (!onImportTrip) return;

        const finalMetadata = {
            suggestedName: formName,
            suggestedDates: formDates,
            mainDestination: formDestination,
            cities: tripData?.metadata?.cities || []
        };

        const categories = tripData?.rawStagedData.categories || {
            transport: [],
            accommodation: [],
            wallet: [],
            dining: [],
            activities: []
        };

        const partialTrip = mapAnalysisToTrip(tripData);

        const newTrip: Trip = {
            id: crypto.randomUUID(),
            name: finalMetadata.suggestedName || "New Trip",
            dates: finalMetadata.suggestedDates || "Dates TBD",
            destination: (finalMetadata.cities && finalMetadata.cities.length > 0)
                ? finalMetadata.cities.join(' - ')
                : finalMetadata.mainDestination || "Unknown Destination",
            coverImage: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
            flights: partialTrip.flights || { passengerName: "", pnr: "", segments: [] },
            hotels: partialTrip.hotels || [],
            secureNotes: partialTrip.secureNotes || [],
            restaurants: [{
                id: crypto.randomUUID(),
                title: "Imported Restaurants",
                region: finalMetadata.mainDestination,
                restaurants: categories.dining.map(i => ({
                    id: crypto.randomUUID(),
                    name: i.data.name || '',
                    description: "Imported via AI",
                    location: i.data.address || '',
                    reservationTime: i.data.displayTime || '',
                    iconType: 'ramen' as const
                }))
            }],
            attractions: [{
                id: crypto.randomUUID(),
                title: "Imported Activities",
                attractions: categories.activities.map(i => ({
                    id: crypto.randomUUID(),
                    name: i.data.name || '',
                    description: "Imported via AI",
                    location: i.data.address || '',
                    scheduledTime: i.data.displayTime || ''
                }))
            }],
            itinerary: [],
            documents: [],
            isShared: false
        };

        onImportTrip(newTrip);
        handleClose();
    };

    // --- RENDERERS ---

    const renderDestinationStep = () => (
        <div className="space-y-8 p-8 flex flex-col items-center justify-center min-h-[400px] animate-fade-in">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-2 animate-bounce-short">
                <Globe className="w-10 h-10 text-blue-500" />
            </div>

            <div className="text-center space-y-2">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">לאן טסים?</h3>
                <p className="text-slate-500 font-medium">הכנס את שם המדינה או היעד המרכזי</p>
            </div>

            <div className="relative w-full max-w-sm group">
                <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                <input
                    autoFocus
                    value={destinationInput}
                    onChange={(e) => setDestinationInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && destinationInput.trim() && setMode('METHOD_SELECTION')}
                    className="w-full text-right pr-12 pl-4 py-4 text-xl font-bold bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 focus:bg-white transition-all outline-none placeholder:font-normal shadow-sm"
                    placeholder="לדוגמה: יפן, איטליה..."
                />
            </div>

            <button
                onClick={() => setMode('METHOD_SELECTION')}
                disabled={!destinationInput.trim()}
                className="w-full max-w-sm py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-300 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 transform active:scale-95"
            >
                המשך
                <ArrowLeft className="w-5 h-5" />
            </button>
        </div>
    );

    const renderMethodSelectionStep = () => (
        <div className="space-y-8 p-8 min-h-[400px] animate-fade-in">
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-800">איך תרצה לתכנן את הטיול ל{destinationInput}?</h3>
                <p className="text-slate-500 font-medium">בחר את הדרך הנוחה לך</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: AI Auto */}
                <button
                    onClick={() => setMode('CONTEXT')}
                    className="relative group p-6 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 hover:bg-white hover:border-indigo-400 hover:shadow-xl transition-all text-right flex flex-col items-center md:items-start"
                >
                    <div className="absolute top-3 left-3 bg-indigo-200 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">מומלץ</div>
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                        <Sparkles className="w-7 h-7 text-indigo-600" />
                    </div>
                    <h4 className="text-lg font-black text-slate-800 mb-1">יש לי כרטיסים</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        העלה כרטיסי טיסה ומלונות (PDF) וה-AI יבנה את הטיול אוטומטית.
                    </p>
                </button>

                {/* Option 2: Manual */}
                <button
                    onClick={() => setMode('MANUAL_DATE')}
                    className="group p-6 rounded-2xl border-2 border-slate-100 bg-white hover:border-slate-300 hover:shadow-lg transition-all text-right flex flex-col items-center md:items-start"
                >
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform">
                        <Edit2 className="w-7 h-7 text-slate-600" />
                    </div>
                    <h4 className="text-lg font-black text-slate-800 mb-1">בנה מאפס</h4>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        הזן תאריכים ויעדים ידנית ללא מסמכים.
                    </p>
                </button>
            </div>

            <button
                onClick={() => setMode('DESTINATION')}
                className="w-full py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors flex items-center justify-center gap-1"
            >
                <ChevronRight className="w-4 h-4" />
                חזרה
            </button>
        </div>
    );

    const renderManualDateStep = () => (
        <div className="space-y-8 p-8 min-h-[400px] animate-fade-in flex flex-col items-center justify-center">
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-orange-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-800">מתי טסים?</h3>
                <p className="text-slate-500">הכנס תאריכים (אופציונלי)</p>
            </div>

            <div className="w-full max-w-sm bg-slate-50 p-6 rounded-2xl border border-slate-100 group focus-within:bg-white focus-within:border-orange-200 transition-colors">
                <input
                    type="text"
                    value={formDates}
                    onChange={(e) => setFormDates(e.target.value)}
                    className="w-full text-center text-xl font-black bg-transparent outline-none placeholder:text-slate-300 tracking-wider text-slate-800"
                    placeholder="DD/MM/YYYY - DD/MM/YYYY"
                />
                <p className="text-center text-xs text-slate-400 mt-2">או השאר ריק אם טרם הוחלט</p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-sm">
                <button
                    onClick={() => {
                        // Create Empty Trip with Manual Data
                        setTripData({
                            metadata: {
                                suggestedName: `${destinationInput} Adventure`,
                                destination: destinationInput,
                                startDate: formDates.split('-')[0]?.trim(),
                                endDate: formDates.split('-')[1]?.trim(),
                                cities: []
                            },
                            rawStagedData: {
                                tripMetadata: { suggestedName: `${destinationInput} Adventure`, suggestedDates: formDates, mainDestination: destinationInput, uniqueCityNames: [] },
                                processedFileIds: [],
                                unprocessedFiles: [],
                                categories: { transport: [], accommodation: [], carRental: [], wallet: [], dining: [], activities: [] }
                            }
                        });
                        setFormName(`${destinationInput} Adventure`);
                        setFormDestination(destinationInput);
                        setMode('REVIEW_FORM');
                    }}
                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2"
                >
                    צור טיוטה
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setMode('METHOD_SELECTION')}
                    className="w-full py-2 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                    חזרה
                </button>
            </div>
        </div>
    );

    const renderContextStep = () => (
        <div className="space-y-6 p-8 animate-fade-in">
            <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CloudRain className="w-8 h-8 text-indigo-500" />
                </div>
                <h3 className="text-xl font-black text-slate-800">העלאת מסמכים חכמה</h3>
                <p className="text-slate-500 text-sm">גרור לכאן את כל אישורי ההזמנות שלך</p>
            </div>

            {/* AI Upload Zone */}
            <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
                <MagicDropZone
                    activeTrip={null}
                    onUpdate={() => { }}
                    // @ts-ignore
                    onFilesReady={handleFilesReady}
                    compact={false}
                />
            </div>

            {/* Email Instructions */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right">
                <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-slate-700 text-sm">או שלח את הכרטיסים במייל</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed mb-2">
                    העבר את אישורי ההזמנות (Booking, Flight confirmation) לכתובת:
                </p>
                <div className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200 group cursor-pointer hover:border-indigo-300 transition-colors" onClick={() => navigator.clipboard.writeText("travelplanneraiagent@gmail.com")}>
                    <code className="text-indigo-600 font-mono text-sm">travelplanneraiagent@gmail.com</code>
                    <span className="text-[10px] text-slate-400 uppercase font-bold group-hover:text-indigo-500">Copy</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-2 text-center">(הטיול יופיע אוטומטית במסך הראשי תוך דקה)</span>
            </div>

            <button
                onClick={() => setMode('METHOD_SELECTION')}
                className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
            >
                חזרה
            </button>
        </div>
    );

    const renderProcessingStep = () => (
        <div className="p-10 flex flex-col items-center justify-center h-full min-h-[500px]">
            <ThinkingLoader
                texts={["מנתח את היעד...", "קורא את הקבצים...", "בונה מסלול חכם...", "מוסיף מידע על מיקומים...", "מסיים את הפרטים האחרונים..."]}
                speed={1500}
            />
        </div>
    );

    const renderReviewForm = () => (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-6 flex-shrink-0">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                            <Wand2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">פרטי הטיול</h2>
                            <p className="text-slate-500 text-sm">אנא וודא שהפרטים נכונים לפני היצירה</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">שם הטיול</label>
                            <input
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-4 py-3 font-bold text-slate-800 outline-none transition-all text-sm"
                                placeholder="למשל: סופ״ש בפריז"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">יעד</label>
                            <input
                                value={formDestination}
                                onChange={(e) => setFormDestination(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-4 py-3 font-bold text-slate-800 outline-none transition-all text-sm"
                                placeholder="עיר, מדינה"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">תאריכים</label>
                            <input
                                value={formDates}
                                onChange={(e) => setFormDates(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl px-4 py-3 font-bold text-slate-800 outline-none transition-all text-sm"
                                placeholder="YYYY-MM-DD - YYYY-MM-DD"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Staging Content */}
            {tripData && (
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-4xl mx-auto">
                        <StagedDataReview stagedData={tripData.rawStagedData} files={uploadedFiles} />
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 flex justify-between items-center bg-white flex-shrink-0 z-10">
                <button onClick={handleClose} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">
                    בטל
                </button>
                <button onClick={handleConfirmTrip} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 flex items-center gap-2 transform active:scale-95 transition-all">
                    <Check className="w-5 h-5" />
                    צור טיול
                </button>
            </div>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 md:p-6 animate-fade-in" onClick={handleClose}>
            <div
                className={`bg-white w-full ${mode === 'REVIEW_FORM' ? 'max-w-5xl h-[90vh]' : 'max-w-xl h-auto'} transition-all duration-500 rounded-[2rem] shadow-2xl overflow-hidden relative border border-white/20 flex flex-col`}
                onClick={(e) => e.stopPropagation()}
                dir="rtl"
            >
                {/* Close Button UI - flipped for RTL (Left side) */}
                {mode !== 'REVIEW_FORM' && (
                    <button onClick={handleClose} className="absolute top-6 left-6 z-30 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                )}

                {/* State Rendering */}
                {mode === 'DESTINATION' && renderDestinationStep()}
                {mode === 'METHOD_SELECTION' && renderMethodSelectionStep()}
                {mode === 'MANUAL_DATE' && renderManualDateStep()}
                {mode === 'CONTEXT' && renderContextStep()}
                {mode === 'PROCESSING' && renderProcessingStep()}
                {mode === 'REVIEW_FORM' && renderReviewForm()}

            </div>
        </div>
    );
};

// --- HELPER COMPONENTS ---

const cleanCityName = (city: string) => {
    if (!city) return '';
    return city.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
};

const StagedDataReview = ({ stagedData, files }: { stagedData: StagedTripData, files: File[] }) => {
    const [activeTab, setActiveTab] = useState<'transport' | 'accommodation' | 'wallet' | 'experiences'>('transport');
    const { transport, accommodation, wallet, dining, activities } = stagedData.categories;

    return (
        <div>
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-8 bg-slate-100 p-1.5 rounded-2xl w-fit overflow-x-auto scrollbar-hide">
                <TabButton active={activeTab === 'transport'} onClick={() => setActiveTab('transport')} icon={Plane} label="טיסות" count={transport.length} />
                <TabButton active={activeTab === 'accommodation'} onClick={() => setActiveTab('accommodation')} icon={Bed} label="מלונות" count={accommodation.length} />
                <TabButton active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} icon={Shield} label="מסמכים" count={wallet.length} />
                <TabButton active={activeTab === 'experiences'} onClick={() => setActiveTab('experiences')} icon={Star} label="חוויות" count={dining.length + activities.length} />
            </div>

            {/* Content */}
            <div className="space-y-4 animate-fade-in min-h-[200px]">
                {activeTab === 'transport' && (
                    <>
                        {transport.length === 0 && <EmptyState label="לא נמצאו טיסות" />}
                        {transport.map((item, idx) => {
                            const isFlight = item.type === 'flight';
                            const title = item.data.journeyTitle || (item.data.segments ? item.data.segments[0]?.airline : item.data.airline) || 'Transport';

                            return (
                                <div key={idx} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-start gap-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                        {isFlight ? <Plane className="w-6 h-6" /> : <Bus className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{isFlight ? `טיסה: ${title}` : title}</div>
                                        <div className="text-sm text-slate-500 mt-1">
                                            פרטי טיסה מזוהים
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
                {activeTab === 'accommodation' && (
                    <>
                        {accommodation.length === 0 && <EmptyState label="לא נמצאו מלונות" />}
                        {accommodation.map((item, idx) => (
                            <div key={idx} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex items-start gap-4">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Bed className="w-6 h-6" /></div>
                                <div>
                                    <div className="font-bold text-slate-800">{item.data.hotelName}</div>
                                    <div className="text-sm text-slate-500 mt-1">
                                        {item.data.address}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
                {activeTab === 'wallet' && (
                    <>
                        {wallet.length === 0 && <EmptyState label="לא נמצאו מסמכים" />}
                        {/* Wallet rendering logic */}
                    </>
                )}
                {activeTab === 'experiences' && (
                    <>
                        {[...dining, ...activities].length === 0 && <EmptyState label="לא נמצאו חוויות" />}
                        {/* experience rendering logic */}
                    </>
                )}
            </div>

            {files.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">קבצי מקור</h4>
                    <div className="flex flex-wrap gap-2">
                        {files.map((f, i) => (
                            <div key={i} className="px-2 py-1 bg-slate-50 rounded border border-slate-200 text-xs font-medium text-slate-600 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                {f.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const TabButton = ({ active, onClick, icon: Icon, label, count }: any) => (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${active ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-bold">{label}</span>
        {count > 0 && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-slate-300/50 text-slate-600'}`}>{count}</span>}
    </button>
);

const EmptyState = ({ label }: { label: string }) => (
    <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
        <div className="text-slate-400 font-medium text-sm">{label}</div>
    </div>
);