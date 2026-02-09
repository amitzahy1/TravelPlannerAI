import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Mail, FileText, ArrowRight, Loader2, CheckCircle2, Printer, MousePointerClick, Download, Share, FileDown, Plane, Hotel, Home, Globe } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { analyzeTripFiles, TripAnalysisResult } from '../../services/aiService';

interface Step3SmartProps {
        onComplete: (data: any) => void;
        onBack: () => void;
}

const platforms = [
        {
                id: 'booking',
                name: 'Booking.com',
                icon: Hotel,
                color: 'bg-blue-600',
                textColor: 'text-blue-600',
                steps: [
                        { icon: MousePointerClick, text: 'היכנסו ל"הזמנות שלי"', sub: 'באתר או באפליקציה' },
                        { icon: FileText, text: 'בחרו את ההזמנה', sub: 'לחצו על "הצג אישור"' },
                        { icon: Printer, text: 'לחצו על "הדפסה"', sub: 'בחלון שנפתח' },
                        { icon: FileDown, text: 'שמרו כ-PDF', sub: 'בחרו "Save as PDF"' }
                ]
        },
        {
                id: 'airbnb',
                name: 'Airbnb',
                icon: Home,
                color: 'bg-rose-500',
                textColor: 'text-rose-500',
                steps: [
                        { icon: Plane, text: 'לכו ל"נסיעות"', sub: 'Trips' },
                        { icon: MousePointerClick, text: 'פרטי נסיעה', sub: 'Details' },
                        { icon: FileText, text: 'קבלת קבלה', sub: 'Get Receipt' },
                        { icon: Download, text: 'הורידו כ-PDF', sub: 'Download PDF' }
                ]
        },
        {
                id: 'skyscanner',
                name: 'Skyscanner',
                icon: Plane,
                color: 'bg-sky-500',
                textColor: 'text-sky-500',
                steps: [
                        { icon: Mail, text: 'פתחו את המייל', sub: 'שקיבלתם מ-Skyscanner' },
                        { icon: Printer, text: 'הדפסה (Print)', sub: 'מתפריט המייל' },
                        { icon: FileDown, text: 'שמרו כ-PDF', sub: 'בחרו ביעד "Save as PDF"' },
                        { icon: UploadCloud, text: 'העלו את הקובץ', sub: 'כאן למטה' }
                ]
        },
        {
                id: 'trip',
                name: 'Trip.com',
                icon: Globe,
                color: 'bg-blue-500',
                textColor: 'text-blue-500',
                steps: [
                        { icon: FileText, text: 'My Bookings', sub: 'All Bookings' },
                        { icon: MousePointerClick, text: 'View Detail', sub: '' },
                        { icon: Download, text: 'Email/Print', sub: '' },
                        { icon: FileDown, text: 'Save PDF', sub: '' }
                ]
        }
];

export const Step3_SmartImport: React.FC<Step3SmartProps> = ({ onComplete, onBack }) => {
        const [activeTab, setActiveTab] = useState<'upload' | 'email'>('upload');
        const [isDragging, setIsDragging] = useState(false);
        const [files, setFiles] = useState<File[]>([]);
        const [analysisState, setAnalysisState] = useState<'idle' | 'analyzing'>('idle');
        const [analysisMessage, setAnalysisMessage] = useState("קורא את המסמך...");
        const [activePlatform, setActivePlatform] = useState(platforms[0].id);
        const [emailStatus, setEmailStatus] = useState<'idle' | 'waiting' | 'detected'>('idle');
        const { user } = useAuth();

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

        // Real-time Email Listener
        useEffect(() => {
                if (activeTab !== 'email' || !user) return;

                const startTime = Timestamp.now();
                setEmailStatus('waiting');

                const q = query(
                        collection(db, 'users', user.uid, 'trips'),
                        where('source', '==', 'email'),
                        where('importedAt', '>=', startTime),
                        orderBy('importedAt', 'desc'),
                        limit(1)
                );

                const unsubscribe = onSnapshot(q, (snapshot) => {
                        if (!snapshot.empty) {
                                setEmailStatus('detected');
                                setTimeout(() => {
                                        onComplete([]);
                                }, 2000);
                        }
                });

                return () => unsubscribe();
        }, [activeTab, user, onComplete]);

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
                        const result = await analyzeTripFiles(newFiles);
                        // Pass both the files and the result
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

                        {/* Header Area */}
                        <div className="text-center mb-4 flex-shrink-0 px-4">
                                <h2 className="text-2xl md:text-3xl font-black text-brand-navy mb-1">בואו נעשה קצת קסמים ✨</h2>
                                <p className="text-slate-500 text-sm md:text-base">העלו את אישורי ההזמנה שלכם (PDF) וה-AI יבנה לכם את הטיול.</p>
                        </div>

                        {/* Main Layout */}
                        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

                                {/* Tabs Switcher */}
                                <div className="flex justify-center mb-4 flex-shrink-0 px-4">
                                        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                                                <button
                                                        onClick={() => setActiveTab('upload')}
                                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'upload' ? 'bg-white text-brand-action shadow-sm scale-105' : 'text-slate-400 hover:text-brand-navy'}`}
                                                >
                                                        <UploadCloud className="w-4 h-4" />
                                                        העלאת PDF
                                                </button>
                                                <button
                                                        onClick={() => setActiveTab('email')}
                                                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'email' ? 'bg-white text-brand-action shadow-sm scale-105' : 'text-slate-400 hover:text-brand-navy'}`}
                                                >
                                                        <Mail className="w-4 h-4" />
                                                        העברת אימייל
                                                </button>
                                        </div>
                                </div>

                                {/* Content Area - Scrollable */}
                                <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-8 scrollbar-hide">
                                        <AnimatePresence mode="wait">
                                                {activeTab === 'upload' ? (
                                                        <motion.div
                                                                key="upload"
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -10 }}
                                                                className="space-y-6 max-w-3xl mx-auto"
                                                        >
                                                                {analysisState === 'idle' ? (
                                                                        <>
                                                                                {/* Drop Zone */}
                                                                                <GlassCard
                                                                                        className={`
                                                relative h-56 border-2 border-dashed flex flex-col items-center justify-center
                                                transition-all duration-300 group
                                                ${isDragging ? 'border-brand-action bg-brand-action/5 scale-[1.02]' : 'border-slate-300 hover:border-brand-action/50 hover:bg-white/80'}
                                            `}
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

                                                                                {/* Separator */}
                                                                                <div className="flex items-center gap-4 text-slate-300">
                                                                                        <div className="h-px bg-slate-200 flex-1"></div>
                                                                                        <span className="text-xs font-bold uppercase tracking-wider">איך מורידים את ה-PDF?</span>
                                                                                        <div className="h-px bg-slate-200 flex-1"></div>
                                                                                </div>

                                                                                {/* Platform Guides */}
                                                                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                                                                        {/* Platform Selector Tabs */}
                                                                                        <div className="flex overflow-x-auto p-2 gap-2 border-b border-slate-100 scrollbar-hide">
                                                                                                {platforms.map(p => {
                                                                                                        const Icon = p.icon;
                                                                                                        const isActive = activePlatform === p.id;
                                                                                                        return (
                                                                                                                <button
                                                                                                                        key={p.id}
                                                                                                                        onClick={() => setActivePlatform(p.id)}
                                                                                                                        className={`
                                                                flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold whitespace-nowrap transition-all text-sm
                                                                ${isActive
                                                                                                                                        ? `${p.color} text-white shadow-md`
                                                                                                                                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}
                                                            `}
                                                                                                                >
                                                                                                                        <Icon className="w-4 h-4" />
                                                                                                                        {p.name}
                                                                                                                </button>
                                                                                                        );
                                                                                                })}
                                                                                        </div>

                                                                                        {/* Guide Content */}
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
                                                ) : (
                                                        <motion.div
                                                                key="email"
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -10 }}
                                                                className="max-w-2xl mx-auto"
                                                        >
                                                                <GlassCard className="p-8 text-center flex flex-col items-center relative overflow-hidden">
                                                                        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                                                                        <div className="w-20 h-20 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-purple-500/20 rotate-3">
                                                                                <Mail className="w-10 h-10 text-white" />
                                                                        </div>

                                                                        <h3 className="text-2xl font-black text-brand-navy mb-2">פשוט להעביר במייל 💌</h3>
                                                                        <p className="text-slate-500 mb-8 font-medium">
                                                                                יש לכם אישור הזמנה במייל? עשו <span className="font-bold text-slate-700">Forward</span> לכתובת שלנו:
                                                                        </p>

                                                                        <div
                                                                                onClick={() => navigator.clipboard.writeText("travelplanneraiagent@gmail.com")}
                                                                                className="bg-white border-2 border-slate-100 hover:border-purple-200 hover:shadow-lg rounded-2xl p-4 flex items-center gap-4 w-full mb-8 group cursor-pointer transition-all duration-300 transform hover:-translate-y-1"
                                                                        >
                                                                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-purple-600 transition-colors">
                                                                                        <Download className="w-5 h-5" />
                                                                                </div>
                                                                                <code className="flex-1 font-mono text-slate-700 font-bold text-left md:text-center text-sm md:text-base truncate">travelplanneraiagent@gmail.com</code>
                                                                                <span className="text-xs font-black text-white bg-purple-600 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-purple-200">העתק</span>
                                                                        </div>

                                                                        <div className="w-full bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                                                                <div className="flex items-center gap-3 mb-4">
                                                                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                                                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">סטטוס חיבור</span>
                                                                                </div>

                                                                                <AnimatePresence mode="wait">
                                                                                        {emailStatus === 'waiting' ? (
                                                                                                <motion.div
                                                                                                        key="waiting"
                                                                                                        initial={{ opacity: 0 }}
                                                                                                        animate={{ opacity: 1 }}
                                                                                                        className="flex items-center gap-3 text-brand-navy font-bold"
                                                                                                >
                                                                                                        <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                                                                                                        אנחנו מחכים למייל שלכם...
                                                                                                </motion.div>
                                                                                        ) : emailStatus === 'detected' ? (
                                                                                                <motion.div
                                                                                                        key="detected"
                                                                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                                                                        animate={{ opacity: 1, scale: 1 }}
                                                                                                        className="flex items-center gap-3 text-emerald-600 font-black"
                                                                                                >
                                                                                                        <CheckCircle2 className="w-6 h-6" />
                                                                                                        המייל התקבל! מתחילים לעבד...
                                                                                                </motion.div>
                                                                                        ) : (
                                                                                                <div className="text-slate-400 text-sm font-medium">
                                                                                                        שלחו מייל כדי לראות את הקסם קורה
                                                                                                </div>
                                                                                        )}
                                                                                </AnimatePresence>
                                                                        </div>
                                                                </GlassCard>
                                                        </motion.div>
                                                )}
                                        </AnimatePresence>
                                </div>
                        </div>
                </div>
        );
};
