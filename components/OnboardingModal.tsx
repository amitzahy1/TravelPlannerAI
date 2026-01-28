import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, X, Check, MapPin, Calendar, Plane, Bed, Shield, Star, AlertTriangle, Trash2, Eye, EyeOff, Utensils, Ticket, AlertCircle, ChevronRight, Wand2, Bus } from 'lucide-react';
import { Trip, StagedTripData, StagedWalletItem } from '../types';
import { MagicDropZone } from './MagicDropZone';
import { analyzeTripFiles, TripAnalysisResult } from '../services/aiService';
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

type ViewMode = 'UPLOAD' | 'PROCESSING' | 'REVIEW_FORM';

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ trips = [], onSelectTrip, onCreateNew, onImportTrip, isOpen = false, onClose }) => {
    // We can still have internal state if we want, but for App.tsx we'll use the prop.
    // However, the component relies on internal setIsOpen(false) in handleClose.
    // We should call onClose instead.

    // Strict State Machine: FILE-FIRST FLOW (Master Prompt Requirement)
    // 1. UPLOAD: Show DropZone (Start here)
    // 2. PROCESSING: Thinking Loader
    // 3. REVIEW_FORM: Smart Form + Staging Area
    const [mode, setMode] = useState<ViewMode>('UPLOAD');

    // Data State
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [tripData, setTripData] = useState<TripAnalysisResult | null>(null);

    // Form State (Smart Review)
    const [formName, setFormName] = useState("");
    const [formDates, setFormDates] = useState("");
    const [formDestination, setFormDestination] = useState("");

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

        // Reset
        setTimeout(() => {
            setMode('UPLOAD');
            setTripData(null);
            setUploadedFiles([]);
            setFormName("");
            setFormDates("");
            setFormDestination("");
        }, 300);
    };

    const handleLegacyCreate = () => {
        // "Skip" flow: Create empty trip immediately without wizard
        if (!onImportTrip) return;

        const newTrip: Trip = {
            id: crypto.randomUUID(),
            name: "My New Trip",
            dates: "",
            destination: "",
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
            const result = await analyzeTripFiles(files);
            setTripData(result);

            // Pre-fill form
            setFormName(result.metadata.suggestedName);
            // Fix: Use the smart route (City - City) if available, otherwise country
            setFormDestination(result.metadata.cities && result.metadata.cities.length > 0
                ? result.metadata.cities.join(' - ')
                : result.metadata.destination);

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

    const handleConfirmTrip = () => {
        // Construct final trip
        if (!onImportTrip) return;

        // Use staged data but override with form values
        const finalMetadata = {
            suggestedName: formName,
            suggestedDates: formDates,
            mainDestination: formDestination,
            cities: tripData?.metadata?.cities || []
        };

        // If we have raw data, use its categories, otherwise empty
        const categories = tripData?.rawStagedData.categories || {
            transport: [],
            accommodation: [],
            wallet: [],
            dining: [],
            activities: []
        };

        // Use centralized mapping logic to ensure consistent behavior with tripService
        const partialTrip = mapAnalysisToTrip(tripData);

        // Convert to proper Trip object
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

            // Keeping Restaurant/Attractions manual mapping for now as they are not returned by mapAnalysisToTrip yet
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
                    iconType: 'ramen'
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-6 animate-fade-in" onClick={handleClose}>
            <div
                className={`bg-white w-full ${mode === 'REVIEW_FORM' ? 'max-w-5xl h-[90vh]' : 'max-w-lg h-auto'} transition-all duration-500 rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white/20 flex flex-col`}
                onClick={(e) => e.stopPropagation()}
            >

                {/* Close Button */}
                <button onClick={handleClose} className="absolute top-6 right-6 z-30 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-500" />
                </button>

                {/* --- STATE A: UPLOAD --- */}
                {mode === 'UPLOAD' && (
                    <div className="p-10 flex flex-col items-center justify-center h-full min-h-[500px]">
                        <div className="mb-8 relative">
                            <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full"></div>
                            <Sparkles className="w-16 h-16 text-blue-600 relative z-10" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-3 text-center">Start with your files</h2>
                        <p className="text-slate-500 text-center mb-10 max-w-sm">Drop tickets & reservations here to auto-build your trip.</p>

                        <div className="w-full">
                            <MagicDropZone onFilesReady={handleFilesReady} compact={false} />
                        </div>

                        <button onClick={handleLegacyCreate} className="mt-8 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all transform active:scale-95 flex items-center gap-2">
                            Start Manually (Skip Upload) <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                )}

                {/* --- STATE B: PROCESSING --- */}
                {mode === 'PROCESSING' && (
                    <div className="p-10 flex flex-col items-center justify-center h-full min-h-[500px]">
                        <ThinkingLoader
                            texts={["Reading PDF...", "Extracting Dates...", "Identifying Hotels...", "Generating Trip Name...", "Checking Flights..."]}
                            speed={1500}
                        />
                    </div>
                )}

                {/* --- STATE C: SMART REVIEW --- */}
                {mode === 'REVIEW_FORM' && tripData && (
                    <div className="flex flex-col h-full">
                        {/* Header: Smart Form */}
                        <div className="bg-slate-50/50 backdrop-blur-xl border-b border-slate-200 p-8 flex-shrink-0">
                            <div className="max-w-4xl mx-auto">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                                        <Wand2 className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-800">Trip Details</h2>
                                        <p className="text-slate-500 text-sm">Review the details we extracted for you</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trip Name</label>
                                            {tripData.metadata.suggestedName && <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase">AI ✨</span>}
                                        </div>
                                        <div className="relative group">
                                            <input
                                                value={formName}
                                                onChange={(e) => setFormName(e.target.value)}
                                                className="w-full bg-white border-2 border-slate-100 focus:border-blue-500 rounded-2xl px-4 py-3.5 font-bold text-slate-800 outline-none transition-all shadow-sm group-hover:border-slate-200 text-sm"
                                                placeholder="e.g. Summer in Paris"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destination</label>
                                            {tripData.metadata.destination && <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase">AI ✨</span>}
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute left-3 top-4 text-slate-400"><MapPin className="w-5 h-5" /></div>
                                            <input
                                                value={formDestination}
                                                onChange={(e) => setFormDestination(e.target.value)}
                                                className="w-full bg-white border-2 border-slate-100 focus:border-blue-500 rounded-2xl pl-10 pr-4 py-3.5 font-bold text-slate-800 outline-none transition-all shadow-sm group-hover:border-slate-200 text-sm"
                                                placeholder="City, Country"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dates</label>
                                            {tripData.metadata.startDate && <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase">AI ✨</span>}
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute left-3 top-4 text-slate-400"><Calendar className="w-5 h-5" /></div>
                                            <input
                                                value={formDates}
                                                onChange={(e) => setFormDates(e.target.value)}
                                                className="w-full bg-white border-2 border-slate-100 focus:border-blue-500 rounded-2xl pl-10 pr-4 py-3.5 font-bold text-slate-800 outline-none transition-all shadow-sm group-hover:border-slate-200 text-sm"
                                                placeholder="YYYY-MM-DD - YYYY-MM-DD"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Staging Area: Imports Review Logic */}
                        <div className="flex-1 overflow-y-auto bg-slate-50/30 p-4 md:p-8">
                            <div className="max-w-4xl mx-auto">
                                <section className="mb-6">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 px-1">
                                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                        Review Extracted Items
                                    </h3>
                                    <StagedDataReview stagedData={tripData.rawStagedData} files={uploadedFiles} />
                                </section>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-white">
                            <DebugToggle tripData={tripData} />
                            <div className="flex gap-4">
                                <button onClick={handleLegacyCreate} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button onClick={handleConfirmTrip} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 flex items-center gap-2 transform active:scale-95 transition-all">
                                    <Check className="w-5 h-5" />
                                    Create Trip
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- HELPER COMPONENTS ---

// Helper to clean city names (remove postal codes, building numbers)
const cleanCityName = (city: string) => {
    if (!city) return '';
    // Remove digits and common postal code patterns (e.g., "Manila 1228" -> "Manila")
    return city.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
};

const AIBadge = () => (
    <div className="absolute right-2 top-2 px-2 py-1 bg-blue-50 border border-blue-100 rounded-lg animate-pulse flex items-center gap-1.5 shadow-sm" title="Auto-filled by AI">
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">✨ Auto-filled</span>
    </div>
);

// Unified Review Component (Simplified from ImportsReviewModal)
const StagedDataReview = ({ stagedData, files }: { stagedData: StagedTripData, files: File[] }) => {
    const [activeTab, setActiveTab] = useState<'transport' | 'accommodation' | 'wallet' | 'experiences'>('transport');
    const { transport, accommodation, wallet, dining, activities } = stagedData.categories;

    return (
        <div>
            {/* Tabs */}
            <div className="flex items-center gap-1 mb-8 bg-slate-100/50 p-1.5 rounded-2xl w-fit overflow-x-auto scrollbar-hide">
                <TabButton active={activeTab === 'transport'} onClick={() => setActiveTab('transport')} icon={Plane} label="Transport" count={transport.length} />
                <TabButton active={activeTab === 'accommodation'} onClick={() => setActiveTab('accommodation')} icon={Bed} label="Hotels" count={accommodation.length} />
                <TabButton active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} icon={Shield} label="Wallet" count={wallet.length} />
                <TabButton active={activeTab === 'experiences'} onClick={() => setActiveTab('experiences')} icon={Star} label="Experiences" count={dining.length + activities.length} />
            </div>

            {/* Content */}
            <div className="space-y-4 animate-fade-in">
                {activeTab === 'transport' && (
                    <>
                        {transport.length === 0 && <EmptyState label="No transport found" />}
                        {transport.map((item, idx) => {
                            // Helper to extract display data whether it's grouped or single
                            const isFlight = item.type === 'flight';
                            const title = item.data.journeyTitle || (item.data.segments ? item.data.segments[0]?.airline : item.data.airline) || item.data.flightNumber || 'Transport';
                            const subText = item.data.segments
                                ? `${item.data.segments[0]?.displayDepartureTime || 'Time TBA'} • ${item.data.segments[0]?.departureCity || item.data.segments[0]?.fromCode || 'Origin'} → ${item.data.segments[item.data.segments.length - 1]?.arrivalCity || item.data.segments[item.data.segments.length - 1]?.toCode || 'Dest'}`
                                : `${item.data.displayTime || item.data.departureTime || 'Time TBA'} • ${item.data.from || item.data.fromCode || 'Origin'} → ${item.data.to || item.data.toCode || 'Dest'}`;

                            return (
                                <div key={idx} className="bg-white border rounded-xl p-4 shadow-sm flex items-start gap-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                        {isFlight ? <Plane className="w-6 h-6" /> : <Bus className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{isFlight ? `Flight: ${title}` : title}</div>
                                        <div className="text-sm text-slate-500">
                                            {/* Robust Rendering for both Flat and Nested structures */}
                                            {(() => {
                                                if (item.data.segments && item.data.segments[0]) {
                                                    const seg = item.data.segments[0];
                                                    const lastSeg = item.data.segments[item.data.segments.length - 1];
                                                    const depTime = seg.departure?.displayTime || (seg as any).displayDepartureTime || seg.display_departure_time || 'Time TBA';
                                                    const depCity = seg.departure?.city || seg.departureCity || seg.fromCode || 'Origin';
                                                    const arrCity = lastSeg.arrival?.city || lastSeg.arrivalCity || lastSeg.toCode || 'Dest';
                                                    return `${depTime} • ${depCity} → ${arrCity}`;
                                                }
                                                // Flat Fallback
                                                const depTime = item.data.departure?.displayTime || item.data.displayTime || item.data.departureTime || 'Time TBA';
                                                const depCity = item.data.departure?.city || item.data.from || 'Origin';
                                                const arrCity = item.data.arrival?.city || item.data.to || 'Dest';
                                                return `${depTime} • ${depCity} → ${arrCity}`;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
                {activeTab === 'accommodation' && (
                    <>
                        {accommodation.length === 0 && <EmptyState label="No accommodations found" />}
                        {accommodation.map((item, idx) => (
                            <div key={idx} className="bg-white border rounded-xl p-4 shadow-sm flex items-start gap-4">
                                <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Bed className="w-6 h-6" /></div>
                                <div>
                                    <div className="font-bold text-slate-800">{item.data.hotelName}</div>
                                    <div className="text-sm text-slate-500">
                                        {item.data.displayTime || (item.data.displayCheckInTime ? `${item.data.displayCheckInTime} - ${item.data.displayCheckOutTime || ''}` : '')} • {item.data.address}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
                {activeTab === 'wallet' && (
                    <>
                        {wallet.length === 0 && <EmptyState label="No wallet items found" />}
                        {wallet.map((item, idx) => (
                            <div key={idx} className="bg-white border rounded-xl p-4 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Shield className="w-6 h-6" /></div>
                                <div>
                                    <div className="font-bold text-slate-800">{item.title}</div>
                                    <div className="text-xs text-slate-400">Secure Document</div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
                {activeTab === 'experiences' && (
                    <>
                        {[...dining, ...activities].length === 0 && <EmptyState label="No experiences found" />}
                        {[...dining, ...activities].map((item, idx) => (
                            <div key={idx} className="bg-white border rounded-xl p-4 shadow-sm flex items-center gap-4">
                                <div className={`p-3 rounded-lg ${item.type === 'dining' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {item.type === 'dining' ? <Utensils className="w-6 h-6" /> : <Star className="w-6 h-6" />}
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-slate-800">{item.data.name}</div>
                                    <div className="text-xs text-slate-400 capitalize">{item.type} • {item.data.displayTime}</div>
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* File References */}
            {files.length > 0 && (
                <div className="mt-12 pt-8 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Source Files</h4>
                    <div className="flex flex-wrap gap-2">
                        {files.map((f, i) => (
                            <div key={i} className="px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
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
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${active ? 'bg-white shadow text-slate-800 font-bold' : 'text-slate-500 hover:bg-slate-200/50'}`}>
        <Icon className="w-4 h-4" />
        {label}
        {count > 0 && <span className="bg-slate-200 px-1.5 py-0.5 rounded-full text-[10px]">{count}</span>}
    </button>
);

const EmptyState = ({ label }: { label: string }) => (
    <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
        <div className="text-slate-300 font-medium">{label}</div>
    </div>
);

const DebugToggle = ({ tripData }: { tripData: any }) => {
    const [showDebug, setShowDebug] = useState(false);

    if (!showDebug) {
        return (
            <button onClick={() => setShowDebug(true)} className="text-xs font-mono text-slate-300 hover:text-slate-400">
                Show Raw Data
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center p-10" onClick={() => setShowDebug(false)}>
            <div className="bg-slate-900 w-full max-w-4xl h-[80vh] rounded-2xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                    <h3 className="text-white font-mono font-bold">Raw AI Output</h3>
                    <button onClick={() => setShowDebug(false)} className="px-3 py-1 bg-slate-800 text-slate-300 rounded hover:bg-slate-700">Close</button>
                </div>
                <div className="flex-1 overflow-auto p-4">
                    <pre className="text-green-400 font-mono text-xs whitespace-pre-wrap">
                        {JSON.stringify(tripData, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
};