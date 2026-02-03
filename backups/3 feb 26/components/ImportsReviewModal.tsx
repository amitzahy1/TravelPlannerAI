import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Plane, Bed, AlertTriangle, FileText, ChevronRight, Calendar, MapPin, AlertCircle, Trash2, Shield, Eye, EyeOff, Utensils, Star, Ticket, Info } from 'lucide-react';
import { StagedTripData, StagedLogisticsItem, StagedWalletItem, StagedExperienceItem, StagedCategories } from '../types';
import { formatDateTime, formatDateOnly } from '../utils/dateUtils';

interface ImportsReviewModalProps {
        stagedData: StagedTripData;
        files: File[];
        onConfirm: (finalData: StagedTripData) => void;
        onCancel: () => void;
}

type TabType = 'logistics' | 'wallet' | 'experiences';

export const ImportsReviewModal: React.FC<ImportsReviewModalProps> = ({ stagedData, files, onConfirm, onCancel }) => {
        const [tripName, setTripName] = useState(stagedData.tripMetadata.suggestedName);
        const [tripDates, setTripDates] = useState(stagedData.tripMetadata.suggestedDates);
        const [destination, setDestination] = useState(stagedData.tripMetadata.mainDestination);
        const [categories, setCategories] = useState<StagedCategories>(stagedData.categories);
        const [activeTab, setActiveTab] = useState<TabType>('logistics');
        const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

        // Memoize file URLs
        const fileUrls = useMemo(() => {
                return files.map(f => ({ name: f.name, url: URL.createObjectURL(f) }));
        }, [files]);

        // Calculate Missed Files with Reasons
        const missedFilesReport = useMemo(() => {
                const processedSet = new Set(stagedData.processedFileIds || []);
                const aiReported = stagedData.unprocessedFiles || [];

                // Files that aren't in processed list AND aren't in AI rejection report
                const silentFailures = files
                        .filter(f => !processedSet.has(f.name) && !aiReported.some(u => u.fileName === f.name))
                        .map(f => ({ fileName: f.name, reason: 'Unknown / No data found' }));

                return [...aiReported, ...silentFailures];
        }, [files, stagedData.processedFileIds, stagedData.unprocessedFiles]);

        useEffect(() => {
                return () => {
                        fileUrls.forEach(f => URL.revokeObjectURL(f.url));
                };
        }, [fileUrls]);

        const getFileUrl = (fileName: string) => {
                return fileUrls.find(f => f.name === fileName)?.url;
        };

        const removeItem = (type: TabType, id: string) => { // id is usually fileId or index, but here we iterate
                // Generic remover for simplicity (would need proper IDs in prod)
                if (type === 'logistics') {
                        setCategories(prev => ({ ...prev, logistics: prev.logistics.filter((_, i) => i !== Number(id)) }));
                } else if (type === 'wallet') {
                        setCategories(prev => ({ ...prev, wallet: prev.wallet.filter((_, i) => i !== Number(id)) }));
                } else {
                        setCategories(prev => ({ ...prev, experiences: prev.experiences.filter((_, i) => i !== Number(id)) }));
                }
        };

        const finalizeTrip = () => {
                const finalData: StagedTripData = {
                        tripMetadata: {
                                ...stagedData.tripMetadata,
                                suggestedName: tripName,
                                suggestedDates: tripDates,
                                mainDestination: destination
                        },
                        categories
                };
                onConfirm(finalData);
        };

        const renderLogistics = () => (
                <div className="space-y-4">
                        {categories.logistics.map((item, idx) => (
                                <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
                                        <div className={`p-3 rounded-xl flex-shrink-0 ${item.type === 'flight' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                                {item.type === 'flight' ? <Plane className="w-6 h-6" /> : <Bed className="w-6 h-6" />}
                                        </div>
                                        <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                        <div>
                                                                <div className="text-xs font-bold text-slate-400 uppercase">{item.type}</div>
                                                                <div className="font-bold text-slate-800 text-lg">
                                                                        {item.type === 'flight' ? item.data.airline : item.data.name}
                                                                </div>
                                                        </div>
                                                        {item.confidence < 0.8 && (
                                                                <div className="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                                                                        <AlertTriangle className="w-3 h-3" /> Verify
                                                                </div>
                                                        )}
                                                </div>

                                                <div className="mt-4 grid grid-cols-2 gap-4">
                                                        {item.type === 'flight' && (
                                                                <>
                                                                        <div>
                                                                                <span className="text-xs text-slate-400 block">Flight</span>
                                                                                <span className="font-mono font-bold text-slate-700">{item.data.flightNumber}</span>
                                                                        </div>
                                                                        <div>
                                                                                <span className="text-xs text-slate-400 block">Time</span>
                                                                                <span className="font-mono font-bold text-slate-700">{item.data.displayTime || formatDateTime(item.data.departureTime)}</span>
                                                                        </div>
                                                                        <div className="col-span-2 flex items-center gap-2 bg-slate-50 p-2 rounded-lg">
                                                                                <span className="font-bold text-lg">{item.data.from}</span>
                                                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                                                                <span className="font-bold text-lg">{item.data.to}</span>
                                                                        </div>
                                                                </>
                                                        )}
                                                        {item.type === 'hotel' && (
                                                                <>
                                                                        <div>
                                                                                <span className="text-xs text-slate-400 block">Check-In</span>
                                                                                <span className="font-bold text-slate-700">{formatDateOnly(item.data.checkInDate || item.data.checkIn)}</span>
                                                                        </div>
                                                                        <div>
                                                                                <span className="text-xs text-slate-400 block">Check-Out</span>
                                                                                <span className="font-bold text-slate-700">{formatDateOnly(item.data.checkOutDate || item.data.checkOut)}</span>
                                                                        </div>
                                                                        <div className="col-span-2 text-left">
                                                                                <span className="text-xs text-slate-400 block">Address</span>
                                                                                <span className="text-sm text-slate-600 truncate block">{item.data.address || item.data.location || item.data.city || 'Unknown Location'}</span>
                                                                        </div>
                                                                </>
                                                        )}
                                                </div>
                                                <SourceChips ids={item.sourceFileIds || (item as any).fileId ? [(item as any).fileId] : []} />
                                        </div>
                                        <button onClick={() => removeItem('logistics', idx.toString())} className="text-slate-300 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
                                </div>
                        ))}
                        {categories.logistics.length === 0 && <EmptyState type="logistics" />}
                </div>
        );

        const renderWallet = () => (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {categories.wallet.map((item, idx) => (
                                <WalletCard key={idx} item={item} onRemove={() => removeItem('wallet', idx.toString())} />
                        ))}
                        {categories.wallet.length === 0 && <div className="col-span-2"><EmptyState type="wallet" /></div>}
                </div>
        );

        const renderExperiences = () => (
                <div className="space-y-4">
                        {categories.experiences.map((item, idx) => (
                                <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                                        <div className="w-20 h-20 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                {item.type === 'restaurant_reservation' ? <Utensils className="w-8 h-8 text-orange-400" /> : <Ticket className="w-8 h-8 text-emerald-400" />}
                                        </div>
                                        <div className="flex-1">
                                                <div className="flex justify-between">
                                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.data.inferredCuisine || 'Experience'}</div>
                                                        <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                <Check className="w-3 h-3" /> Synced
                                                        </span>
                                                </div>
                                                <h3 className="font-bold text-slate-800 text-lg leading-tight">{item.data.name}</h3>
                                                <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" /> {item.data.address || 'Unknown Location'}
                                                </div>
                                                {(item.data.displayTime || item.data.reservationTime) && (
                                                        <div className="text-sm font-medium text-slate-700 mt-2 bg-slate-50 inline-block px-2 py-1 rounded-md">
                                                                {item.data.displayTime || item.data.reservationTime?.replace('T', ' @ ')}
                                                        </div>
                                                )}
                                                <SourceChips ids={item.sourceFileIds || (item as any).fileId ? [(item as any).fileId] : []} />
                                        </div>
                                        <button onClick={() => removeItem('experiences', idx.toString())} className="text-slate-300 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
                                </div>
                        ))}
                        {categories.experiences.length === 0 && <EmptyState type="experiences" />}
                </div>
        );

        return (
                <div className="fixed inset-0 z-[200] flex bg-slate-50/95 backdrop-blur-sm animate-fade-in flex-col h-full">
                        {/* Header */}
                        <div className="h-16 bg-white border-b border-slate-200 flex justify-between items-center px-6 shadow-sm flex-shrink-0 z-20">
                                <div className="flex items-center gap-4">
                                        <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                                                <X className="w-6 h-6" />
                                        </button>
                                        <div className="flex flex-col">
                                                <input
                                                        value={tripName}
                                                        onChange={(e) => setTripName(e.target.value)}
                                                        className="text-lg font-black text-slate-800 bg-transparent border-none focus:ring-0 p-0 placeholder:text-slate-300"
                                                        placeholder="Trip Name"
                                                />
                                                <input
                                                        value={tripDates}
                                                        onChange={(e) => setTripDates(e.target.value)}
                                                        className="text-xs text-slate-500 font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors w-full"
                                                        placeholder="Dates (e.g. 2026-05-01 - 2026-05-10)"
                                                />
                                                <input
                                                        value={destination}
                                                        onChange={(e) => setDestination(e.target.value)}
                                                        className="text-xs text-slate-500 font-medium bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors w-full"
                                                        placeholder="Destination"
                                                />
                                        </div>
                                </div>

                                <button
                                        onClick={finalizeTrip}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-blue-200 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                                >
                                        <Check className="w-5 h-5" />
                                        Create Trip & Sync All
                                </button>
                        </div>

                        {/* Tabs */}
                        <div className="bg-white border-b border-slate-200 px-6 flex items-center gap-6">
                                <TabButton active={activeTab === 'logistics'} onClick={() => setActiveTab('logistics')} icon={Plane} label="Itinerary" count={categories.logistics.length} />
                                <TabButton active={activeTab === 'wallet'} onClick={() => setActiveTab('wallet')} icon={Shield} label="Wallet" count={categories.wallet.length} isSecure />
                                <TabButton active={activeTab === 'experiences'} onClick={() => setActiveTab('experiences')} icon={Star} label="Experiences" count={categories.experiences.length} isNew />
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
                                <div className="mb-6 flex justify-between items-start">
                                        <div>
                                                <h2 className="text-2xl font-black text-slate-800 mb-2 capitalize">{activeTab} Review</h2>
                                                <p className="text-slate-500">Review extracted data before creating your trip.</p>
                                        </div>
                                        {missedFilesReport.length > 0 && (
                                                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 animate-bounce-subtle max-w-sm">
                                                        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                                                        <div className="text-xs">
                                                                <span className="font-bold text-amber-800">{missedFilesReport.length} files could not be fully read</span>
                                                                <div className="mt-1 space-y-1 max-h-[60px] overflow-y-auto pr-2">
                                                                        {missedFilesReport.map((m, i) => (
                                                                                <div key={i} className="text-amber-600 opacity-80 flex gap-2">
                                                                                        <span className="font-bold whitespace-nowrap">{m.fileName}:</span>
                                                                                        <span>{m.reason}</span>
                                                                                </div>
                                                                        ))}
                                                                </div>
                                                        </div>
                                                </div>
                                        )}
                                </div>

                                {activeTab === 'logistics' && renderLogistics()}
                                {activeTab === 'wallet' && renderWallet()}
                                {activeTab === 'experiences' && renderExperiences()}
                        </div>
                </div>
        );
};

const TabButton = ({ active, onClick, icon: Icon, label, count, isSecure, isNew }: any) => (
        <button
                onClick={onClick}
                className={`relative h-14 flex items-center gap-2 px-2 border-b-2 transition-all ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
                <Icon className="w-5 h-5" />
                <span className="font-bold text-sm">{label}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{count}</span>

                {isSecure && <span className="absolute top-2 right-0 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>}
                {isNew && <span className="absolute -top-1 -right-2 bg-amber-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">NEW</span>}
        </button>
);

const SourceChips: React.FC<{ ids?: string[] }> = ({ ids }) => {
        if (!ids || ids.length === 0) return null;
        return (
                <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-50">
                        {ids.map((id, i) => (
                                <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-1 max-w-[120px] truncate">
                                        <FileText className="w-2 h-2 flex-shrink-0" />
                                        {id}
                                </span>
                        ))}
                </div>
        );
};

const WalletCard: React.FC<{ item: StagedWalletItem, onRemove: () => void }> = ({ item, onRemove }) => {
        const [revealed, setRevealed] = useState(false);
        return (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all group">
                        <div className="h-32 bg-slate-100 relative overflow-hidden flex items-center justify-center">
                                <div className={`absolute inset-0 bg-slate-900/10 backdrop-blur-md transition-all duration-500 ${revealed ? 'backdrop-blur-none bg-slate-900/0' : 'backdrop-blur-xl'}`}></div>
                                <Shield className="w-10 h-10 text-slate-300 relative z-10" />
                                <button onClick={() => setRevealed(!revealed)} className="absolute bottom-2 right-2 p-1.5 bg-white/80 rounded-full hover:bg-white transition-colors z-20 shadow-sm">
                                        {revealed ? <EyeOff className="w-4 h-4 text-slate-600" /> : <Eye className="w-4 h-4 text-slate-600" />}
                                </button>
                        </div>
                        <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                <Shield className="w-3 h-3" /> Secure Storage
                                        </span>
                                        <button onClick={onRemove} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                                </div>
                                <h3 className="font-bold text-slate-800">{item.title || item.type}</h3>
                                <div className="mt-2 space-y-1">
                                        {item.data.holderName && <div className="text-sm text-slate-500">Holder: <span className="text-slate-700 font-medium">{item.data.holderName}</span></div>}
                                        {item.data.expiryDate && <div className="text-sm text-slate-500">Expires: <span className={`font-mono font-medium ${new Date(item.data.expiryDate) < new Date('2026-12-31') ? 'text-red-500' : 'text-slate-700'}`}>{item.data.expiryDate}</span></div>}
                                </div>
                                <div className="mt-3 text-xs text-slate-400 italic flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {item.uiMessage || "Stored locally on device"}
                                </div>
                                <SourceChips ids={item.sourceFileIds || (item as any).fileId ? [(item as any).fileId] : []} />
                        </div>
                </div>
        );
};

const EmptyState = ({ type }: { type: string }) => (
        <div className="text-center py-10 opacity-50 border-2 border-dashed border-slate-200 rounded-xl">
                <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 text-slate-400">
                        {type === 'logistics' ? <Plane /> : type === 'wallet' ? <Shield /> : <Star />}
                </div>
                <p className="font-medium text-slate-500">No {type} items found</p>
        </div>
);
