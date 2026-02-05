import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Mail, FileText, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { RippleButton } from '../ui/RippleButton';
import { db } from '../../services/firebaseConfig';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';

interface Step3SmartProps {
        onComplete: (files: File[]) => void;
        onBack: () => void;
}

export const Step3_SmartImport: React.FC<Step3SmartProps> = ({ onComplete, onBack }) => {
        const [activeTab, setActiveTab] = useState<'upload' | 'email'>('upload');
        const [isDragging, setIsDragging] = useState(false);
        const [files, setFiles] = useState<File[]>([]);
        const [analysisState, setAnalysisState] = useState<'idle' | 'analyzing'>('idle');
        const [analysisMessage, setAnalysisMessage] = useState("קורא את המסמך...");
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

                // Listen for new trips from this user with source="email"
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
                                // Delay slightly for effect then proceed
                                setTimeout(() => {
                                        onComplete([]); // Proceed with empty file list (it's in DB)
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

        const handleFiles = (newFiles: File[]) => {
                setFiles(newFiles);
                setAnalysisState('analyzing');
                // Simulate analysis for now
                setTimeout(() => {
                        onComplete(newFiles);
                }, 4000);
        };

        return (
                <div className="w-full max-w-4xl mx-auto h-full flex flex-col" dir="rtl">
                        <div className="text-center mb-8">
                                <h2 className="text-3xl font-black text-brand-navy mb-2">בואו נעשה קצת קסמים</h2>
                                <p className="text-slate-500">אנחנו נסרוק את המסמכים שלכם ונבנה את התוכנית עבורכם.</p>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center">
                                {/* Tabs */}
                                <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
                                        <button
                                                onClick={() => setActiveTab('upload')}
                                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'upload' ? 'bg-white text-brand-action shadow-sm' : 'text-slate-500 hover:text-brand-navy'}`}
                                        >
                                                העלאת PDF
                                        </button>
                                        <button
                                                onClick={() => setActiveTab('email')}
                                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'email' ? 'bg-white text-brand-action shadow-sm' : 'text-slate-500 hover:text-brand-navy'}`}
                                        >
                                                העברת אימייל
                                        </button>
                                </div>

                                <AnimatePresence mode="wait">
                                        {activeTab === 'upload' ? (
                                                <motion.div
                                                        key="upload"
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 20 }}
                                                        className="w-full max-w-xl"
                                                >
                                                        {analysisState === 'idle' ? (
                                                                <div className="space-y-6">
                                                                        <GlassCard
                                                                                className={`
                                                h-72 border-2 border-dashed flex flex-col items-center justify-center
                                                transition-all duration-300
                                                ${isDragging ? 'border-brand-action bg-brand-action/5 scale-105' : 'border-slate-300 hover:border-brand-action/50'}
                                            `}
                                                                        >
                                                                                <div
                                                                                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                                                                        onDragLeave={() => setIsDragging(false)}
                                                                                        onDrop={handleDrop}
                                                                                        className="w-full h-full flex flex-col items-center justify-center p-8"
                                                                                >
                                                                                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                                                                                <UploadCloud className="w-8 h-8 text-brand-action" />
                                                                                        </div>
                                                                                        <h3 className="text-xl font-bold text-brand-navy mb-2">גררו אישור הזמנה (PDF)</h3>
                                                                                        <p className="text-slate-400 text-sm mb-6 max-w-xs text-center">
                                                                                                טיסות, מלונות או מסלולים מ-Booking, Airbnb וכו'.
                                                                                        </p>
                                                                                        <div className="relative">
                                                                                                <input
                                                                                                        type="file"
                                                                                                        accept=".pdf"
                                                                                                        multiple
                                                                                                        onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                                                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                                                />
                                                                                                <RippleButton variant="secondary" className="scale-90">
                                                                                                        בחירת קבצים
                                                                                                </RippleButton>
                                                                                        </div>
                                                                                </div>
                                                                        </GlassCard>

                                                                        {/* Platform Help Guide */}
                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                                                                {[
                                                                                        {
                                                                                                name: 'Booking.com',
                                                                                                icon: '🏨',
                                                                                                steps: [
                                                                                                        'כנסו ל"הזמנות שלי"',
                                                                                                        'בחרו את המלון הרצוי',
                                                                                                        'לחצו על "הצגת אישור"',
                                                                                                        'בתפריט (3 נקודות) בחרו "הדפסה ל-PDF"'
                                                                                                ]
                                                                                        },
                                                                                        {
                                                                                                name: 'Airbnb',
                                                                                                icon: '🏠',
                                                                                                steps: [
                                                                                                        'פתחו את "נסיעות"',
                                                                                                        'לחצו על "פרטי נסיעה"',
                                                                                                        'גללו ל"קבלת קבלה"',
                                                                                                        'שמרו את הדף כ-PDF במכשיר'
                                                                                                ]
                                                                                        },
                                                                                        {
                                                                                                name: 'Skyscanner',
                                                                                                icon: '✈️',
                                                                                                steps: [
                                                                                                        'פתחו את אימייל אישור ההזמנה',
                                                                                                        'לחצו על "הדפס אישור"',
                                                                                                        'בחרו במדפסת "שמור כ-PDF"',
                                                                                                        'העלו את הקובץ לכאן'
                                                                                                ]
                                                                                        },
                                                                                        {
                                                                                                name: 'Trip.com',
                                                                                                icon: '🌏',
                                                                                                steps: [
                                                                                                        'כנסו ל"חשבון" -> "הזמנות"',
                                                                                                        'לחצו על פרטי ההזמנה',
                                                                                                        'בחרו באופציה "ייצא ל-PDF"',
                                                                                                        'שמרו והעלו את הקובץ'
                                                                                                ]
                                                                                        }
                                                                                ].map((p) => (
                                                                                        <div key={p.name} className="bg-white/60 border border-slate-200 p-5 rounded-[1.5rem] group hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
                                                                                                <div className="flex items-center gap-4 mb-3">
                                                                                                        <span className="text-4xl filter drop-shadow-sm">{p.icon}</span>
                                                                                                        <div className="text-right">
                                                                                                                <h4 className="font-black text-brand-navy text-lg">{p.name}</h4>
                                                                                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">מדריך שלב אחר שלב</p>
                                                                                                        </div>
                                                                                                </div>
                                                                                                <ul className="space-y-2">
                                                                                                        {p.steps.map((step, idx) => (
                                                                                                                <li key={idx} className="flex items-start gap-2 text-sm text-slate-600 font-medium">
                                                                                                                        <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-500 text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                                                                                                                                {idx + 1}
                                                                                                                        </span>
                                                                                                                        <span>{step}</span>
                                                                                                                </li>
                                                                                                        ))}
                                                                                                </ul>
                                                                                        </div>
                                                                                ))}
                                                                        </div>
                                                                </div>
                                                        ) : (
                                                                <GlassCard className="h-80 flex flex-col items-center justify-center">
                                                                        {/* Shimmering Skeleton Loader simulation */}
                                                                        <div className="w-64 space-y-4 mb-8">
                                                                                <div className="h-4 bg-slate-200 rounded-full w-3/4 animate-pulse mx-auto" />
                                                                                <div className="h-4 bg-slate-200 rounded-full w-full animate-pulse" />
                                                                                <div className="h-4 bg-slate-200 rounded-full w-5/6 animate-pulse mx-auto" />
                                                                        </div>

                                                                        <div className="flex flex-col items-center gap-3">
                                                                                <Loader2 className="w-8 h-8 text-brand-action animate-spin" />
                                                                                <motion.p
                                                                                        key={analysisMessage}
                                                                                        initial={{ opacity: 0, y: 10 }}
                                                                                        animate={{ opacity: 1, y: 0 }}
                                                                                        className="text-brand-navy font-bold text-lg"
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
                                                        initial={{ opacity: 0, x: 20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -20 }}
                                                        className="w-full max-w-xl"
                                                >
                                                        <GlassCard className="p-8 text-center flex flex-col items-center">
                                                                <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
                                                                        <Mail className="w-8 h-8 text-white" />
                                                                </div>
                                                                <h3 className="text-xl font-bold text-brand-navy mb-4">העבירו לנו את אישור ההזמנה במייל</h3>
                                                                <p className="text-slate-500 mb-6">
                                                                        שלחו את אישורי ההזמנה ישירות לסוכן ה-AI שלנו.
                                                                </p>

                                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 w-full mb-6 group cursor-pointer hover:border-brand-action/30 transition-colors"
                                                                        onClick={() => {
                                                                                navigator.clipboard.writeText("travelplanneraiagent@gmail.com");
                                                                        }}
                                                                >
                                                                        <code className="flex-1 font-mono text-slate-700 text-sm">travelplanneraiagent@gmail.com</code>
                                                                        <span className="text-xs font-bold text-brand-action opacity-0 group-hover:opacity-100 transition-opacity uppercase">העתקה</span>
                                                                </div>

                                                                {/* Real-time Status Area */}
                                                                <div className="w-full mb-8">
                                                                        <AnimatePresence mode="wait">
                                                                                {emailStatus === 'waiting' ? (
                                                                                        <motion.div
                                                                                                key="waiting"
                                                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                                                animate={{ opacity: 1, scale: 1 }}
                                                                                                className="flex flex-col items-center p-6 bg-blue-50/50 rounded-2xl border border-blue-100/50"
                                                                                        >
                                                                                                <div className="relative mb-3">
                                                                                                        <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20" />
                                                                                                        <div className="relative bg-blue-500 p-3 rounded-full">
                                                                                                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                                                                        </div>
                                                                                                </div>
                                                                                                <h4 className="text-blue-600 font-black text-lg">מחכה למייל שלכם...</h4>
                                                                                                <p className="text-blue-400 text-sm">ברגע שתשלחו, הקסם יתחיל אוטומטית</p>
                                                                                        </motion.div>
                                                                                ) : emailStatus === 'detected' ? (
                                                                                        <motion.div
                                                                                                key="detected"
                                                                                                initial={{ opacity: 0, y: 10 }}
                                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                                className="flex flex-col items-center p-6 bg-emerald-50 rounded-2xl border border-emerald-100"
                                                                                        >
                                                                                                <div className="bg-emerald-500 p-3 rounded-full mb-3 shadow-lg shadow-emerald-500/20">
                                                                                                        <CheckCircle2 className="w-6 h-6 text-white" />
                                                                                                </div>
                                                                                                <h4 className="text-emerald-600 font-black text-lg">המייל התקבל! הקסם התחיל</h4>
                                                                                                <p className="text-emerald-400 text-sm">מעבד את פרטי הטיול שלכם...</p>
                                                                                        </motion.div>
                                                                                ) : null}
                                                                        </AnimatePresence>
                                                                </div>

                                                                <div className="text-right w-full bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                                                                        <h4 className="font-black text-brand-navy text-lg mb-4 flex items-center gap-3">
                                                                                <FileText className="w-6 h-6 text-brand-action" />
                                                                                איך זה עובד?
                                                                        </h4>
                                                                        <ol className="space-y-4">
                                                                                {[
                                                                                        'פתחו את אימייל אישור ההזמנה שלכם (מ-Booking, Airbnb וכו\')',
                                                                                        'לחצו על "העבר" (Forward)',
                                                                                        'שלחו לכתובת שמופיעה למעלה',
                                                                                        'אנחנו כבר נעדכן אתכם כאן ברגע שהמייל יגיע!'
                                                                                ].map((step, i) => (
                                                                                        <li key={i} className="flex items-center gap-3 text-slate-600 font-bold">
                                                                                                <span className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-brand-action shadow-sm">{i + 1}</span>
                                                                                                <span>{step}</span>
                                                                                        </li>
                                                                                ))}
                                                                        </ol>
                                                                </div>
                                                        </GlassCard>
                                                </motion.div>
                                        )}
                                </AnimatePresence>
                        </div>
                </div>
        );
};
