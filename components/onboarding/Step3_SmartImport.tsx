import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, FileText, ArrowRight, Loader2, Printer, MousePointerClick, Download, FileDown, Plane, Hotel, Home, Globe, Mail } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { analyzeTripFiles } from '../../services/aiService';
import { TripDetailsPanel } from './TripDetailsPanel';
import type { TravelersComposition } from '../../types';

interface Step3SmartProps {
        onComplete: (data: any) => void;
        onBack: () => void;
        country?: string;
        cities: string[];
        travelers: TravelersComposition;
        onCitiesChange: (next: string[]) => void;
        onTravelersChange: (next: TravelersComposition) => void;
}

const platforms = [
        {
                id: 'booking',
                name: 'Booking.com',
                icon: Hotel,
                color: 'bg-blue-600',
                textColor: 'text-blue-600',
                steps: [
                        { icon: MousePointerClick, text: 'היכנסו לחשבון שלכם', sub: 'באתר Booking.com או באפליקציה' },
                        { icon: FileText, text: 'פתחו את "ההזמנות שלי" ובחרו את ההזמנה הרלוונטית', sub: '"My Bookings" — לחצו על ההזמנה' },
                        { icon: Printer, text: 'בתוך ההזמנה — לחצו על "הדפס אישור"', sub: '"Print" / "Print confirmation"' },
                        { icon: FileDown, text: 'בחלון ההדפסה בחרו "Save as PDF" ושמרו', sub: 'במקום מדפסת אמיתית — בחרו PDF' }
                ]
        },
        {
                id: 'airbnb',
                name: 'Airbnb',
                icon: Home,
                color: 'bg-rose-500',
                textColor: 'text-rose-500',
                steps: [
                        { icon: Plane, text: 'באפליקציית Airbnb — פתחו את "נסיעות"', sub: '"Trips" בתפריט התחתון' },
                        { icon: MousePointerClick, text: 'לחצו על הנסיעה ואז על "פרטי הזמנה"', sub: '"Show booking details"' },
                        { icon: FileText, text: 'גללו למטה לכפתור "Get receipt" וקבלו את הקבלה', sub: 'מתחת לפרטי התשלום' },
                        { icon: Download, text: 'בעמוד הקבלה — לחצו "Download PDF" ושמרו', sub: 'במחשב או בטלפון' }
                ]
        },
        {
                id: 'skyscanner',
                name: 'Skyscanner',
                icon: Plane,
                color: 'bg-sky-500',
                textColor: 'text-sky-500',
                steps: [
                        { icon: Mail, text: 'פתחו את מייל האישור שקיבלתם מ-Skyscanner', sub: 'בדרך כלל מ-no-reply@skyscanner.net' },
                        { icon: Printer, text: 'בחרו "הדפסה" מהתפריט של המייל', sub: 'בג׳ימייל — שלוש נקודות → Print' },
                        { icon: FileDown, text: 'בחלון ההדפסה — בחרו "Save as PDF" ושמרו', sub: 'במחשב או בטלפון' },
                        { icon: UploadCloud, text: 'גררו את ה-PDF לחלון למעלה', sub: 'או לחצו "בחירת קבצים"' }
                ]
        },
        {
                id: 'trip',
                name: 'Trip.com',
                icon: Globe,
                color: 'bg-blue-500',
                textColor: 'text-blue-500',
                steps: [
                        { icon: FileText, text: 'באפליקציית Trip.com — פתחו "My Bookings"', sub: 'תחת "Account" / "Me"' },
                        { icon: MousePointerClick, text: 'לחצו על ההזמנה ואז "View Details"', sub: 'פותח את המסמך המלא' },
                        { icon: Download, text: 'לחצו "Email itinerary" או "Print" בראש העמוד', sub: 'יוצר גרסה להדפסה' },
                        { icon: FileDown, text: 'בחלון ההדפסה — שמרו כ-PDF והעלו לכאן', sub: 'Save as PDF → גררו למעלה' }
                ]
        }
];

export const Step3_SmartImport: React.FC<Step3SmartProps> = ({
        onComplete,
        country,
        cities,
        travelers,
        onCitiesChange,
        onTravelersChange,
}) => {
        const [isDragging, setIsDragging] = useState(false);
        const [files, setFiles] = useState<File[]>([]);
        const [analysisState, setAnalysisState] = useState<'idle' | 'analyzing'>('idle');
        const [analysisMessage, setAnalysisMessage] = useState("קורא את המסמך...");
        const [activePlatform, setActivePlatform] = useState(platforms[0].id);

        const analysisMessages = [
                "קורא את המסמך...",
                "מזהה טיסות...",
                "מאתר בתי מלון...",
                "בונה את מסלול הטיול..."
        ];

        useEffect(() => {
                if (analysisState === 'analyzing') {
                        let i = 0;
                        const interval = setInterval(() => {
                                i = (i + 1) % analysisMessages.length;
                                setAnalysisMessage(analysisMessages[i]);
                        }, 1200);
                        return () => clearInterval(interval);
                }
        }, [analysisState]);

        const handleDrop = (e: React.DragEvent) => {
                e.preventDefault();
                setIsDragging(false);
                const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
                if (droppedFiles.length > 0) {
                        handleFiles(droppedFiles);
                }
        };

        const handleFiles = async (newFiles: File[]) => {
                setFiles(newFiles);
                setAnalysisState('analyzing');
                try {
                        // Thread the optional wizard hints into the AI extractor.
                        // Empty arrays / zeroed travelers are filtered out inside.
                        const result = await analyzeTripFiles(newFiles, {
                                destination: country,
                                cities: cities.length > 0 ? cities : undefined,
                                travelers: (travelers.adults + travelers.children + travelers.babies) > 0 ? travelers : undefined,
                        });
                        onComplete({ files: newFiles, analysisResult: result });
                } catch (error) {
                        console.error("Analysis Failed", error);
                        setAnalysisMessage("שגיאה בניתוח הקבצים. נסו שוב.");
                        setAnalysisState('idle');
                }
        };

        const currentPlatform = platforms.find(p => p.id === activePlatform) || platforms[0];

        return (
                <div className="w-full max-w-5xl mx-auto h-full flex flex-col pt-2" dir="rtl">

                        {/* Header */}
                        <div className="text-center mb-4 flex-shrink-0 px-4">
                                <h2 className="text-2xl md:text-3xl font-black text-brand-navy mb-1">בואו נעשה קצת קסמים ✨</h2>
                                <p className="text-slate-500 text-sm md:text-base">
                                        השתמשו בשיטה זו אם יש לכם אישור הזמנה בקובץ <span className="font-bold">PDF</span> מ-Booking, Airbnb, חברת תעופה וכד'. ה-AI יקרא את הקובץ ויבנה את הטיול.
                                </p>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 scrollbar-hide">
                                <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-6 max-w-3xl mx-auto"
                                >
                                        {analysisState === 'idle' ? (
                                                <>
                                                        {/* Drop Zone */}
                                                        <GlassCard
                                                                className={`relative h-56 border-2 border-dashed flex flex-col items-center justify-center transition-all duration-300 group ${isDragging ? 'border-brand-action bg-brand-action/5 scale-[1.02]' : 'border-slate-300 hover:border-brand-action/50 hover:bg-white/80'}`}
                                                        >
                                                                <div
                                                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                                                        onDragLeave={() => setIsDragging(false)}
                                                                        onDrop={handleDrop}
                                                                        className="absolute inset-0 z-10"
                                                                />
                                                                <div className="w-16 h-16 bg-blue-50 group-hover:bg-blue-100 rounded-2xl flex items-center justify-center mb-4 transition-colors">
                                                                        <UploadCloud className="w-8 h-8 text-brand-action" />
                                                                </div>
                                                                <h3 className="text-xl font-bold text-brand-navy mb-1">גררו לכאן קבצים</h3>
                                                                <p className="text-slate-400 text-sm mb-6">או בחרו קבצים מהמחשב (PDF בלבד)</p>
                                                                <label className="relative z-20 cursor-pointer">
                                                                        <input
                                                                                type="file"
                                                                                accept=".pdf"
                                                                                multiple
                                                                                onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                                                                                className="sr-only"
                                                                        />
                                                                        <div className="bg-brand-action text-white px-8 py-2.5 rounded-xl font-bold text-sm hover:bg-brand-action/90 shadow-lg shadow-brand-action/20 transition-all transform active:scale-95 flex items-center gap-2">
                                                                                <UploadCloud className="w-4 h-4" /> בחירת קבצים
                                                                        </div>
                                                                </label>
                                                        </GlassCard>

                                                        {/* Optional trip-details panel — collapsed by default. When the
                                                            user fills it in, the cities + travelers get passed as hints
                                                            to analyzeTripFiles so the AI biases the extraction to those
                                                            cities and group size. */}
                                                        <TripDetailsPanel
                                                                country={country}
                                                                cities={cities}
                                                                travelers={travelers}
                                                                onCitiesChange={onCitiesChange}
                                                                onTravelersChange={onTravelersChange}
                                                        />

                                                        {/* Separator */}
                                                        <div className="flex items-center gap-4 text-slate-300">
                                                                <div className="h-px bg-slate-200 flex-1"></div>
                                                                <span className="text-xs font-bold uppercase tracking-wider">איך מורידים את ה-PDF?</span>
                                                                <div className="h-px bg-slate-200 flex-1"></div>
                                                        </div>

                                                        {/* Platform Guides */}
                                                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                                                <div className="flex overflow-x-auto p-2 gap-2 border-b border-slate-100 scrollbar-hide">
                                                                        {platforms.map(p => {
                                                                                const Icon = p.icon;
                                                                                const isActive = activePlatform === p.id;
                                                                                return (
                                                                                        <button
                                                                                                key={p.id}
                                                                                                onClick={() => setActivePlatform(p.id)}
                                                                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all text-sm ${isActive ? `${p.color} text-white shadow-md` : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                                                                        >
                                                                                                <Icon className="w-4 h-4" />
                                                                                                {p.name}
                                                                                        </button>
                                                                                );
                                                                        })}
                                                                </div>
                                                                <div className="p-6 bg-slate-50/50">
                                                                        <div className="flex flex-col md:flex-row items-start gap-4">
                                                                                {currentPlatform.steps.map((step, idx) => {
                                                                                        const StepIcon = step.icon;
                                                                                        return (
                                                                                                <div key={idx} className="flex-1 w-full bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center md:flex-col md:text-center gap-3">
                                                                                                        <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full ${currentPlatform.color} bg-opacity-10 flex items-center justify-center flex-shrink-0`}>
                                                                                                                <StepIcon className={`w-4 h-4 md:w-5 md:h-5 ${currentPlatform.textColor}`} />
                                                                                                        </div>
                                                                                                        <div className="flex-1">
                                                                                                                <div className="font-bold text-brand-navy text-sm">{step.text}</div>
                                                                                                                {step.sub && <div className="text-xs text-slate-400 mt-0.5">{step.sub}</div>}
                                                                                                        </div>
                                                                                                        {idx < currentPlatform.steps.length - 1 && (
                                                                                                                <ArrowRight className="w-4 h-4 text-slate-300 md:hidden" />
                                                                                                        )}
                                                                                                </div>
                                                                                        );
                                                                                })}
                                                                        </div>
                                                                </div>
                                                        </div>
                                                </>
                                        ) : (
                                                <GlassCard className="h-80 flex flex-col items-center justify-center">
                                                        <div className="flex flex-col items-center gap-6">
                                                                <div className="relative">
                                                                        <div className="absolute inset-0 bg-brand-action rounded-full animate-ping opacity-20"></div>
                                                                        <div className="bg-white p-4 rounded-full shadow-xl relative z-10">
                                                                                <Loader2 className="w-10 h-10 text-brand-action animate-spin" />
                                                                        </div>
                                                                </div>
                                                                <motion.p
                                                                        key={analysisMessage}
                                                                        initial={{ opacity: 0, y: 10 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className="text-brand-navy font-black text-xl text-center"
                                                                >
                                                                        {analysisMessage}
                                                                </motion.p>
                                                        </div>
                                                </GlassCard>
                                        )}
                                </motion.div>
                        </div>
                </div>
        );
};
