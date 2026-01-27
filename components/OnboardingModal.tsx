import React, { useState, useEffect } from 'react';
import { Layout, Sparkles, BrainCircuit, ShieldCheck, X, ArrowLeft, CheckCircle2, Zap, MapPin, Plus, Loader2, Plane, Bed } from 'lucide-react';
import { Trip, StagedTripData } from '../types';
import { MagicDropZone } from './MagicDropZone';
import { ImportsReviewModal } from './ImportsReviewModal';
import { analyzeTripFiles } from '../services/aiService';

interface OnboardingModalProps {
    trips?: Trip[];
    onSelectTrip?: (id: string) => void;
    onCreateNew?: () => void;
    onImportTrip?: (trip: Trip) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ trips = [], onSelectTrip, onCreateNew, onImportTrip }) => {
    const [isOpen, setIsOpen] = useState(false);
    // State Machine
    type OnboardingState = 'IDLE' | 'PROCESSING' | 'REVIEW' | 'SUBMITTING';
    const [state, setState] = useState<OnboardingState>('IDLE');

    // Sub-states for UI
    const [processingStep, setProcessingStep] = useState<'upload' | 'scan' | 'identify' | 'construct'>('upload');
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [stagedData, setStagedData] = useState<StagedTripData | null>(null);

    useEffect(() => {
        const hasSeen = localStorage.getItem('hasSeenOnboardingV3');
        if (!hasSeen) {
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        localStorage.setItem('hasSeenOnboardingV3', 'true');
        // Reset state
        setState('IDLE');
        setStagedData(null);
    };

    const handleSelectAndClose = (tripId: string) => {
        if (onSelectTrip) onSelectTrip(tripId);
        handleClose();
    };

    const handleLegacyCreate = () => {
        if (onCreateNew) onCreateNew();
        handleClose();
    };



    const handleFilesReady = async (files: File[]) => {
        setUploadedFiles(files);
        setState('PROCESSING');
        setProcessingStep('upload');

        // Simulate steps for Storytelling UX
        setTimeout(() => setProcessingStep('scan'), 1500);
        setTimeout(() => setProcessingStep('identify'), 3000);
        setTimeout(() => setProcessingStep('construct'), 4500);

        try {
            const result = await analyzeTripFiles(files);
            setStagedData(result);
            setState('REVIEW');
        } catch (error) {
            console.error("Analysis failed", error);
            // Should handle error state, but for now reset
            alert("Failed to analyze files. Please try again.");
            setState('IDLE');
        }
    };

    const handleImportConfirm = (finalData: StagedTripData) => {
        setState('SUBMITTING');
        // Convert StagedTripData to Trip
        const newTrip: Trip = {
            id: crypto.randomUUID(),
            name: finalData.tripMetadata.suggestedName,
            dates: finalData.tripMetadata.suggestedDates,
            destination: finalData.tripMetadata.mainDestination,
            coverImage: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80", // Default
            flights: {
                passengerName: "",
                pnr: "",
                segments: finalData.categories.logistics
                    .filter(i => i.type === 'flight')
                    .map(i => ({
                        fromCode: i.data.from || '',
                        toCode: i.data.to || '',
                        date: i.data.departureTime || '',
                        airline: i.data.airline || '',
                        flightNumber: i.data.flightNumber || '',
                        departureTime: i.data.departureTime || '',
                        arrivalTime: i.data.arrivalTime || '',
                        fromCity: i.data.from || '',
                        toCity: i.data.to || '',
                        duration: "0h",
                    }))
            },
            hotels: finalData.categories.logistics
                .filter(i => i.type === 'hotel')
                .map(i => ({
                    id: i.fileId,
                    name: i.data.name || 'Unknown Hotel',
                    address: i.data.address || '',
                    checkInDate: i.data.checkIn || '',
                    checkOutDate: i.data.checkOut || '',
                    nights: 0
                })),
            restaurants: processRestaurants(finalData.categories.experiences),
            attractions: processAttractions(finalData.categories.experiences),
            itinerary: [],
            documents: [], // Basic file names or references
            secureNotes: processWallet(finalData.categories.wallet), // New Secure Vault
            isShared: false
        };

        if (onImportTrip) {
            onImportTrip(newTrip);
            handleClose();
        } else {
            console.warn("onImportTrip not provided");
            handleLegacyCreate(); // Fallback
        }
    };



    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-6 animate-fade-in">
            {/* REVIEW / SUBMITTING STATE */}
            {(state === 'REVIEW' || state === 'SUBMITTING') && stagedData ? (
                <ImportsReviewModal
                    stagedData={stagedData}
                    files={uploadedFiles}
                    onConfirm={handleImportConfirm}
                    onCancel={() => setState('IDLE')}
                />
            ) : (
                /* IDLE / PROCESSING STATE */
                <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white/20 flex flex-col max-h-[90vh]">
                    <button onClick={handleClose} className="absolute top-6 right-6 z-10 p-2 bg-white/20 hover:bg-black/10 rounded-full transition-colors"><X className="w-6 h-6 text-slate-800" /></button>

                    {/* Dynamic Header */}
                    <div className={`transition-all duration-500 overflow-hidden relative flex flex-col items-center justify-center h-40 bg-slate-900`}>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>

                        <div className="relative z-10 bg-white/20 backdrop-blur-md p-4 rounded-full shadow-2xl border border-white/30 mb-2 animate-scale-in">
                            <Sparkles className="w-10 h-10 text-white drop-shadow-md" />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 text-center flex flex-col flex-grow overflow-y-auto">
                        {state === 'IDLE' ? (
                            // IDLE: Drop Zone
                            <div className="flex flex-col items-center justify-center h-full space-y-6">
                                <div className="w-full">
                                    <h2 className="text-2xl font-black text-slate-800 mb-2">Build Trip from Files</h2>
                                    <p className="text-slate-500 text-sm mb-6">Start your trip by dropping your files here. We'll build the itinerary for you.</p>
                                    <MagicDropZone
                                        onFilesReady={handleFilesReady}
                                        compact={false}
                                    />
                                    <button onClick={handleLegacyCreate} className="text-sm text-slate-400 mt-4 underline">Or create manually without files</button>
                                </div>
                            </div>
                        ) : (
                            // PROCESSING: Storytelling Loader
                            <div className="flex flex-col items-center justify-center h-full space-y-6">
                                <div className="w-full flex flex-col items-center animate-fade-in">
                                    {/* Step-by-Step Loader */}
                                    <div className="space-y-6 w-full max-w-xs text-left">
                                        <LoaderStep label={`Uploading ${uploadedFiles.length} files...`} isActive={processingStep === 'upload'} isDone={isDone(processingStep, 'upload')} />
                                        <LoaderStep label="Scanning for Flights..." isActive={processingStep === 'scan'} isDone={isDone(processingStep, 'scan')} icon={Plane} />
                                        <LoaderStep label="Identifying Hotels..." isActive={processingStep === 'identify'} isDone={isDone(processingStep, 'identify')} icon={Bed} />
                                        <LoaderStep label="Constructing Timeline..." isActive={processingStep === 'construct'} isDone={isDone(processingStep, 'construct')} icon={Layout} />
                                    </div>
                                    <div className="mt-8 text-center">
                                        <div className="text-slate-400 text-xs font-mono uppercase tracking-widest animate-pulse">Running AI Analysis...</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- HELPER FUNCTIONS FOR OMNI-IMPORT ---

const processWallet = (items: any[]): any[] => {
    return items.map(item => ({
        id: crypto.randomUUID(),
        title: item.title || item.type,
        value: item.data.expiryDate ? `Expires: ${item.data.expiryDate}` : 'Secured Document',
        category: item.type === 'passport' ? 'passport' : 'other'
    }));
};

const processRestaurants = (items: any[]): any[] => {
    const restaurants = items
        .filter(i => i.type === 'restaurant_reservation')
        .map(i => ({
            id: crypto.randomUUID(),
            name: i.data.name,
            description: "Imported from reservation",
            location: i.data.address || '',
            googleMapsUrl: '',
            categoryTitle: i.data.inferredCuisine || 'Imported',
            isFavorite: true, // Auto-pin
            reservationDate: i.data.reservationTime?.split('T')[0],
            reservationTime: i.data.reservationTime?.split('T')[1]?.slice(0, 5),
            tags: ['Imported']
        }));

    // Group by Category
    const categories: any[] = [];
    restaurants.forEach(r => {
        let cat = categories.find(c => c.title === r.categoryTitle);
        if (!cat) {
            cat = {
                id: crypto.randomUUID(),
                title: r.categoryTitle,
                region: 'Imported',
                restaurants: []
            };
            categories.push(cat);
        }
        cat.restaurants.push(r);
    });
    return categories;
};

const processAttractions = (items: any[]): any[] => {
    const attractions = items
        .filter(i => i.type === 'attraction_ticket' || i.type === 'event')
        .map(i => ({
            id: crypto.randomUUID(),
            name: i.data.name,
            description: "Imported ticket",
            location: i.data.address || '',
            scheduledDate: i.data.entryTime?.split('T')[0],
            scheduledTime: i.data.entryTime?.split('T')[1]?.slice(0, 5),
            isFavorite: true
        }));

    if (attractions.length === 0) return [];

    return [{
        id: crypto.randomUUID(),
        title: 'My Tickets',
        attractions
    }];
};
const LoaderStep = ({ label, isActive, isDone, icon: Icon }: any) => (
    <div className={`flex items-center gap-3 transition-all duration-500 ${isActive || isDone ? 'opacity-100' : 'opacity-30'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isDone ? 'bg-green-100 text-green-600' : isActive ? 'bg-blue-100 text-blue-600 animate-pulse' : 'bg-slate-100'}`}>
            {isDone ? <CheckCircle2 className="w-5 h-5" /> : Icon ? <Icon className="w-4 h-4" /> : <Loader2 className="w-4 h-4 animate-spin" />}
        </div>
        <div className={`font-bold ${isDone ? 'text-slate-800' : isActive ? 'text-blue-600' : 'text-slate-400'}`}>{label}</div>
    </div>
);

const isDone = (current: string, step: string) => {
    const order = ['upload', 'scan', 'identify', 'construct'];
    return order.indexOf(current) > order.indexOf(step);
};