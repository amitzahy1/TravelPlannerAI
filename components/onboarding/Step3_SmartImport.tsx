import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, Mail, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { RippleButton } from '../ui/RippleButton';

interface Step3SmartProps {
        onComplete: (files: File[]) => void;
        onBack: () => void;
}

export const Step3_SmartImport: React.FC<Step3SmartProps> = ({ onComplete, onBack }) => {
        const [activeTab, setActiveTab] = useState<'upload' | 'email'>('upload');
        const [isDragging, setIsDragging] = useState(false);
        const [files, setFiles] = useState<File[]>([]);
        const [analysisState, setAnalysisState] = useState<'idle' | 'analyzing'>('idle');
        const [analysisMessage, setAnalysisMessage] = useState("Reading document...");

        const analysisMessages = [
                "Reading document...",
                "Identifying flights...",
                "Locating hotels...",
                "Building itinerary..."
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

        const handleFiles = (newFiles: File[]) => {
                setFiles(newFiles);
                setAnalysisState('analyzing');
                // Simulate analysis for now
                setTimeout(() => {
                        onComplete(newFiles);
                }, 4000);
        };

        return (
                <div className="w-full max-w-4xl mx-auto h-full flex flex-col">
                        <div className="text-center mb-8">
                                <h2 className="text-3xl font-black text-brand-navy mb-2">Let's work some magic</h2>
                                <p className="text-slate-500">We'll scan your documents and build the plan for you.</p>
                        </div>

                        <div className="flex-1 flex flex-col items-center justify-center">
                                {/* Tabs */}
                                <div className="flex bg-slate-100 p-1 rounded-xl mb-8">
                                        <button
                                                onClick={() => setActiveTab('upload')}
                                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'upload' ? 'bg-white text-brand-action shadow-sm' : 'text-slate-500 hover:text-brand-navy'}`}
                                        >
                                                Upload PDF
                                        </button>
                                        <button
                                                onClick={() => setActiveTab('email')}
                                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'email' ? 'bg-white text-brand-action shadow-sm' : 'text-slate-500 hover:text-brand-navy'}`}
                                        >
                                                Forward Email
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
                                                                <GlassCard
                                                                        className={`
                                        h-80 border-2 border-dashed flex flex-col items-center justify-center
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
                                                                                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                                                                                        <UploadCloud className="w-10 h-10 text-brand-action" />
                                                                                </div>
                                                                                <h3 className="text-xl font-bold text-brand-navy mb-2">Drag & Drop Booking PDF</h3>
                                                                                <p className="text-slate-400 text-sm mb-6 max-w-xs text-center">
                                                                                        Flights, Hotels, or Itineraries from Booking.com, Expedia, etc.
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
                                                                                                Browse Files
                                                                                        </RippleButton>
                                                                                </div>
                                                                        </div>
                                                                </GlassCard>
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
                                                                <h3 className="text-xl font-bold text-brand-navy mb-4">Forward your confirmation</h3>
                                                                <p className="text-slate-500 mb-6">
                                                                        Send your booking emails directly to our AI agent.
                                                                </p>

                                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center gap-3 w-full mb-6 group cursor-pointer hover:border-brand-action/30 transition-colors"
                                                                        onClick={() => navigator.clipboard.writeText("travelplanneraiagent@gmail.com")}
                                                                >
                                                                        <code className="flex-1 font-mono text-slate-700 text-sm">travelplanneraiagent@gmail.com</code>
                                                                        <span className="text-xs font-bold text-brand-action opacity-0 group-hover:opacity-100 transition-opacity">COPY</span>
                                                                </div>

                                                                <div className="text-left w-full bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                                                        <h4 className="font-bold text-brand-navy text-sm mb-2 flex items-center gap-2">
                                                                                <FileText className="w-4 h-4 text-brand-action" />
                                                                                Instructions:
                                                                        </h4>
                                                                        <ol className="list-decimal list-inside text-sm text-slate-600 space-y-1">
                                                                                <li>Open your booking email</li>
                                                                                <li>Forward it to the address above</li>
                                                                                <li>Wait ~30 seconds for magic 🪄</li>
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
