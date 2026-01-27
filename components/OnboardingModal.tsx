import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, X, Check, MapPin, Calendar, Plane, Bed, Shield, Star, AlertTriangle, Trash2, Eye, EyeOff, Utensils, Ticket, AlertCircle, ChevronRight, Wand2 } from 'lucide-react';
import { Trip, StagedTripData, StagedWalletItem } from '../types';
import { MagicDropZone } from './MagicDropZone';
import { analyzeTripFiles, TripAnalysisResult } from '../services/aiService';
import { ThinkingLoader } from './ThinkingLoader';

interface OnboardingModalProps {
    trips?: Trip[];
    onSelectTrip?: (id: string) => void;
    onCreateNew?: () => void;
    onImportTrip?: (trip: Trip) => void;
}

type ViewMode = 'UPLOAD' | 'PROCESSING' | 'REVIEW_FORM';

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ trips = [], onSelectTrip, onCreateNew, onImportTrip }) => {
    const [isOpen, setIsOpen] = useState(false);

    // Strict State Machine
    const [mode, setMode] = useState<ViewMode>('UPLOAD');

    // Data State
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [tripData, setTripData] = useState<TripAnalysisResult | null>(null);

    // Form State (Smart Review)
    const [formName, setFormName] = useState("");
    const [formDates, setFormDates] = useState("");
    const [formDestination, setFormDestination] = useState("");

    useEffect(() => {
        const hasSeen = localStorage.getItem('hasSeenOnboardingV3');
        if (!hasSeen) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('hasSeenOnboardingV3', 'true');
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
        // "Skip" flow: Empty form
        setMode('REVIEW_FORM');
        setTripData({
            metadata: { suggestedName: "", destination: "", startDate: "", endDate: "" },
            items: [],
            rawStagedData: {
                tripMetadata: { suggestedName: "", suggestedDates: "", mainDestination: "" },
                categories: { logistics: [], wallet: [], experiences: [] }
            }
        });
    };

    const handleFilesReady = async (files: File[]) => {
        setUploadedFiles(files);
        setMode('PROCESSING');

        try {
            const result = await analyzeTripFiles(files);
            setTripData(result);

            // Pre-fill form
            setFormName(result.metadata.suggestedName);
            setFormDestination(result.metadata.destination);
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
            mainDestination: formDestination
        };

        // If we have raw data, use its categories, otherwise empty
        const categories = tripData?.rawStagedData.categories || { logistics: [], wallet: [], experiences: [] };

        // Convert to proper Trip object (simplified mapping logic similar to previous implementation)
        const newTrip: Trip = {
            id: crypto.randomUUID(),
            name: finalMetadata.suggestedName || "New Trip",
            dates: finalMetadata.suggestedDates || "Dates TBD",
            destination: finalMetadata.mainDestination || "Unknown Destination",
            coverImage: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
            flights: {
                passengerName: "",
                pnr: "",
                segments: categories.logistics
                    .filter(i => i.type === 'flight')
                    .map(i => ({
                        fromCode: i.data.from || '', toCode: i.data.to || '',
                        date: i.data.departureTime || '', airline: i.data.airline || '',
                        flightNumber: i.data.flightNumber || '', departureTime: i.data.departureTime || '',
                        arrivalTime: i.data.arrivalTime || '', fromCity: i.data.from || '',
                        toCity: i.data.to || '', duration: "0h",
                    }))
            },
            hotels: categories.logistics
                .filter(i => i.type === 'hotel')
                .map(i => ({
                    id: i.fileId, name: i.data.name || 'Unknown Hotel',
                    address: i.data.address || '', checkInDate: i.data.checkIn || '',
                    checkOutDate: i.data.checkOut || '', nights: 0
                })),
            restaurants: [], // Simplify for now or map similarly
            attractions: [],
            itinerary: [],
            documents: [],
            secureNotes: [],
            isShared: false
        };

        onImportTrip(newTrip);
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-6 animate-fade-in">
            <div className={`bg-white w-full ${mode === 'REVIEW_FORM' ? 'max-w-5xl h-[90vh]' : 'max-w-lg h-auto'} transition-all duration-500 rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white/20 flex flex-col`}>

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
                        <h2 className="text-3xl font-black text-slate-800 mb-3 text-center">Let's build your trip</h2>
                        <p className="text-slate-500 text-center mb-10 max-w-sm">Drop your tickets, reservations, or itinerary files here. We'll handle the rest.</p>

                        <div className="w-full">
                            <MagicDropZone onFilesReady={handleFilesReady} compact={false} />
                        </div>

                        <button onClick={handleLegacyCreate} className="mt-8 text-sm text-slate-400 hover:text-slate-600 underline font-medium transition-colors">
                            Continue manually without files
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

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Trip Name</label>
                                        <div className="relative group">
                                            <input
                                                value={formName}
                                                onChange={(e) => setFormName(e.target.value)}
                                                className="w-full bg-white border-2 border-slate-100 focus:border-blue-500 rounded-xl px-4 py-3 font-bold text-slate-800 outline-none transition-all shadow-sm group-hover:border-slate-200"
                                                placeholder="e.g. Summer in Paris"
                                            />
                                            {tripData.metadata.suggestedName && <AIBadge />}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Destination</label>
                                        <div className="relative group">
                                            <div className="absolute left-3 top-3.5 text-slate-400"><MapPin className="w-5 h-5" /></div>
                                            <input
                                                value={formDestination}
                                                onChange={(e) => setFormDestination(e.target.value)}
                                                className="w-full bg-white border-2 border-slate-100 focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 font-bold text-slate-800 outline-none transition-all shadow-sm group-hover:border-slate-200"
                                                placeholder="City, Country"
                                            />
                                            {tripData.metadata.destination && <AIBadge />}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Dates</label>
                                        <div className="relative group">
                                            <div className="absolute left-3 top-3.5 text-slate-400"><Calendar className="w-5 h-5" /></div>
                                            <input
                                                value={formDates}
                                                onChange={(e) => setFormDates(e.target.value)}
                                                className="w-full bg-white border-2 border-slate-100 focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 font-bold text-slate-800 outline-none transition-all shadow-sm group-hover:border-slate-200"
                                                placeholder="YYYY-MM-DD - YYYY-MM-DD"
                                            />
                                            {tripData.metadata.startDate && <AIBadge />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Staging Area: Imports Review Logic */}
                        <div className="flex-1 overflow-y-auto bg-white p-8">
                            <div className="max-w-4xl mx-auto">
                                <StagedDataReview stagedData={tripData.rawStagedData} files={uploadedFiles} />
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-slate-100 flex justify-end gap-4 bg-white">
                            <button onClick={handleLegacyCreate} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button onClick={handleConfirmTrip} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 flex items-center gap-2 transform active:scale-95 transition-all">
                                <Check className="w-5 h-5" />
                                Create Trip
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- HELPER COMPONENTS ---

const AIBadge = () => (
    <div className="absolute right-2 top-2 p-1 bg-blue-50 rounded-lg animate-pulse" title="Auto-filled by AI">
        <Sparkles className="w-4 h-4 text-blue-500" />
    </div>
);

// Unified Review Component (Simplified from ImportsReviewModal)
const StagedDataReview = ({ stagedData, files }: { stagedData: StagedTripData, files: File[] }) => {
    const [activeTab, setActiveTab] = useState<'logistics' | 'wallet' | 'experiences'>('logistics');
    const { logistics, wallet, experiences } = stagedData.categories;

    return (
        <div>
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-8 bg-slate-100/50 p-1 rounded-xl w-fit">
                <TabButton active={activeTab === 'logistics'} onClick={() => setActiveTab('logistics')} icon={Plane} label="Itinerary" count={logistics.length} />
                <TabButton active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} icon={Shield} label="Wallet" count={wallet.length} />
                <TabButton active={activeTab === 'experiences'} onClick={() => setActiveTab('experiences')} icon={Star} label="Experiences" count={experiences.length} />
            </div>

            {/* Content */}
            <div className="space-y-4 animate-fade-in">
                {activeTab === 'logistics' && (
                    <>
                        {logistics.length === 0 && <EmptyState label="No logistics found" />}
                        {logistics.map((item, idx) => (
                            <div key={idx} className="bg-white border rounded-xl p-4 shadow-sm flex items-start gap-4">
                                <div className={`p-3 rounded-lg ${item.type === 'flight' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                                    {item.type === 'flight' ? <Plane className="w-6 h-6" /> : <Bed className="w-6 h-6" />}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800">{item.type === 'flight' ? item.data.airline : item.data.name}</div>
                                    <div className="text-sm text-slate-500">
                                        {item.type === 'flight' ? `${item.data.from} → ${item.data.to}` : item.data.address}
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
                        {experiences.length === 0 && <EmptyState label="No experiences found" />}
                        {experiences.map((item, idx) => (
                            <div key={idx} className="bg-white border rounded-xl p-4 shadow-sm flex items-center gap-4">
                                <div className="p-3 bg-orange-50 text-orange-600 rounded-lg"><Star className="w-6 h-6" /></div>
                                <div>
                                    <div className="font-bold text-slate-800">{item.title || item.data.name}</div>
                                    <div className="text-xs text-slate-400">Experience</div>
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