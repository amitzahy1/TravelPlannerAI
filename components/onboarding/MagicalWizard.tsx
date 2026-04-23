import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Step1_Destination } from './Step1_Destination';
import { Step1_5_Dates } from './Step1_5_Dates';
import { Step2_ChoosePath } from './Step2_ChoosePath';
import { Step3_SmartImport } from './Step3_SmartImport';
import { Step3_TextImport } from './Step3_TextImport';
import { SuccessAnimation } from './SuccessAnimation';

interface MagicalWizardProps {
        isOpen: boolean;
        onClose: () => void;
        onComplete: (tripData: any) => void;
}

export const MagicalWizard: React.FC<MagicalWizardProps> = ({ isOpen, onClose, onComplete }) => {
        const [step, setStep] = useState(0);
        const [tripData, setTripData] = useState<any>({});

        // Animation variants for slide transition
        const slideVariants = {
                enter: (direction: number) => ({
                        x: direction > 0 ? -1000 : 1000, // Reversed for RTL
                        opacity: 0,
                        scale: 0.95
                }),
                center: {
                        zIndex: 1,
                        x: 0,
                        opacity: 1,
                        scale: 1
                },
                exit: (direction: number) => ({
                        zIndex: 0,
                        x: direction < 0 ? -1000 : 1000, // Reversed for RTL
                        opacity: 0,
                        scale: 0.95
                })
        };

        const handleStep1Next = (data: { destination: string }) => {
                setTripData((prev: any) => ({ ...prev, ...data }));
                setStep(1); // Go to Dates
        };

        const handleDatesNext = (data: { startDate: string; endDate: string }) => {
                setTripData((prev: any) => ({ ...prev, ...data }));
                setStep(2); // Go to Method
        };

        const handleStep2Select = (method: 'smart' | 'manual' | 'text') => {
                setTripData((prev: any) => ({ ...prev, method }));
                setStep(3); // Go to Final Step (Smart / Manual / Text)
        };

        const handleStep3Back = () => {
                setStep(2); // Back to Method
        };

        const handleStep3Complete = (finalData: any) => {
                const completeData = { ...tripData, ...finalData };
                setTripData(completeData); // Store final data
                setStep(4); // Show Success Screen

                // Auto-close after animation
                setTimeout(() => {
                        onComplete(completeData);
                }, 2500);
        };

        if (!isOpen) return null;

        return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-rubik" dir="rtl">
                        {/* Backdrop */}
                        <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={onClose}
                                className="absolute inset-0 bg-brand-navy/60 backdrop-blur-md"
                        />

                        {/* Wizard Card Container */}
                        <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                transition={{ type: "spring", duration: 0.6, bounce: 0.2 }}
                                className="relative w-full max-w-5xl h-[85vh] max-h-[800px] bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
                        >
                                {/* Top Navigation / Progress (Hide on Success) */}
                                {step < 4 && (
                                        <div className="flex items-center justify-between px-5 py-4 md:px-8 md:py-5 z-20">
                                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        {/* Progress bar + step counter */}
                                                        <div className="flex items-center gap-3 min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                        {[0, 1, 2, 3].map((i) => (
                                                                                <div
                                                                                        key={i}
                                                                                        className={`h-1.5 rounded-pill transition-all duration-500 ${
                                                                                                i === step ? 'w-8 bg-brand-action' :
                                                                                                i < step ? 'w-2.5 bg-brand-action/60' :
                                                                                                'w-2 bg-slate-200'
                                                                                        }`}
                                                                                />
                                                                        ))}
                                                                </div>
                                                                <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                                                        שלב {step + 1} מ-4
                                                                </span>
                                                        </div>

                                                        {/* Destination pill */}
                                                        <AnimatePresence>
                                                                {step > 0 && tripData.destination && (
                                                                        <motion.div
                                                                                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                                                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                                                exit={{ opacity: 0, scale: 0.8 }}
                                                                                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1.5 bg-slate-100 rounded-pill text-2xs md:text-xs font-bold text-brand-navy whitespace-nowrap min-w-0"
                                                                        >
                                                                                <span>📍</span>
                                                                                <span className="truncate max-w-[200px]">{tripData.destination}</span>
                                                                        </motion.div>
                                                                )}
                                                        </AnimatePresence>
                                                </div>
                                                <button
                                                        onClick={onClose}
                                                        aria-label="סגור אשף"
                                                        className="shrink-0 w-9 h-9 rounded-pill hover:bg-slate-100 text-slate-400 hover:text-brand-navy transition-colors flex items-center justify-center"
                                                >
                                                        <X className="w-5 h-5" />
                                                </button>
                                        </div>
                                )}

                                {/* Content Area */}
                                <div className="flex-1 relative overflow-hidden flex items-center justify-center p-6 md:p-12">
                                        <AnimatePresence mode="wait" custom={step}>
                                                {step === 0 && (
                                                        <motion.div
                                                                key="step1"
                                                                custom={step}
                                                                variants={slideVariants}
                                                                initial="enter"
                                                                animate="center"
                                                                exit="exit"
                                                                transition={{
                                                                        x: { type: "spring", stiffness: 300, damping: 30 },
                                                                        opacity: { duration: 0.2 }
                                                                }}
                                                                className="absolute inset-0 w-full overflow-y-auto"
                                                        >
                                                                <div className="min-h-full flex items-center justify-center p-4 md:p-8">
                                                                        <Step1_Destination
                                                                                onNext={handleStep1Next}
                                                                                initialData={tripData}
                                                                        />
                                                                </div>
                                                        </motion.div>
                                                )}
                                                {step === 1 && (
                                                        <motion.div
                                                                key="step_dates"
                                                                custom={step}
                                                                variants={slideVariants}
                                                                initial="enter"
                                                                animate="center"
                                                                exit="exit"
                                                                transition={{
                                                                        x: { type: "spring", stiffness: 300, damping: 30 },
                                                                        opacity: { duration: 0.2 }
                                                                }}
                                                                className="absolute inset-0 w-full overflow-y-auto"
                                                        >
                                                                <div className="min-h-full flex items-center justify-center p-4 md:p-8">
                                                                        <Step1_5_Dates
                                                                                onNext={handleDatesNext}
                                                                                onBack={() => setStep(0)}
                                                                                initialData={tripData}
                                                                        />
                                                                </div>
                                                        </motion.div>
                                                )}
                                                {step === 2 && (
                                                        <motion.div
                                                                key="step2"
                                                                custom={step}
                                                                variants={slideVariants}
                                                                initial="enter"
                                                                animate="center"
                                                                exit="exit"
                                                                transition={{
                                                                        x: { type: "spring", stiffness: 300, damping: 30 },
                                                                        opacity: { duration: 0.2 }
                                                                }}
                                                                className="absolute inset-0 w-full overflow-y-auto"
                                                        >
                                                                <div className="min-h-full flex items-center justify-center p-4 md:p-8">
                                                                        <Step2_ChoosePath
                                                                                onSelect={handleStep2Select}
                                                                                onBack={() => setStep(1)} // Back to Dates
                                                                        />
                                                                </div>
                                                        </motion.div>
                                                )}
                                                {step === 3 && (
                                                        <motion.div
                                                                key="step3"
                                                                custom={step}
                                                                variants={slideVariants}
                                                                initial="enter"
                                                                animate="center"
                                                                exit="exit"
                                                                transition={{
                                                                        x: { type: "spring", stiffness: 300, damping: 30 },
                                                                        opacity: { duration: 0.2 }
                                                                }}
                                                                className="absolute inset-0 w-full h-full flex"
                                                        >
                                                                {tripData.method === 'text' ? (
                                                                        <Step3_TextImport
                                                                                onComplete={handleStep3Complete}
                                                                                onBack={handleStep3Back}
                                                                                initialData={tripData}
                                                                        />
                                                                ) : (
                                                                        <Step3_SmartImport
                                                                                onComplete={(data) => handleStep3Complete(data)}
                                                                                onBack={handleStep3Back}
                                                                        />
                                                                )}
                                                        </motion.div>
                                                )}
                                                {step === 4 && (
                                                        <motion.div
                                                                key="success"
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                className="w-full absolute h-full"
                                                        >
                                                                <SuccessAnimation />
                                                        </motion.div>
                                                )}
                                        </AnimatePresence>
                                </div>

                                {/* Decorative Elements */}
                                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-action/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-aurora/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                        </motion.div>
                </div>
        );
};
