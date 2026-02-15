import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Step1_Destination } from './Step1_Destination';
import { Step1_5_Dates } from './Step1_5_Dates';
import { Step2_ChoosePath } from './Step2_ChoosePath';
import { Step3_SmartImport } from './Step3_SmartImport';
import { Step3_ManualBuild } from './Step3_ManualBuild';
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

        const handleStep2Select = (method: 'smart' | 'manual') => {
                setTripData((prev: any) => ({ ...prev, method }));
                setStep(3); // Go to Final Step (Smart/Manual)
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
                                        <div className="flex items-center justify-between p-8 z-20">
                                                <div className="flex items-center gap-4">
                                                        {/* Progress Dots */}
                                                        <div className="flex items-center gap-2">
                                                                {[0, 1, 2, 3].map((i) => (
                                                                        <div
                                                                                key={i}
                                                                                className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-brand-action' :
                                                                                        i < step ? 'w-2 bg-brand-action/40' : 'w-2 bg-slate-200'
                                                                                        }`}
                                                                        />
                                                                ))}
                                                        </div>

                                                        {/* Destination Context Pill (Visible on Step 2+) */}
                                                        <AnimatePresence>
                                                                {step > 0 && tripData.destination && (
                                                                        <motion.div
                                                                                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                                                                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                                                                exit={{ opacity: 0, scale: 0.8 }}
                                                                                className="flex items-center gap-1.5 px-2.5 py-1 md:gap-2 md:px-3 md:py-1.5 bg-slate-100 rounded-full text-[10px] md:text-xs font-bold text-brand-navy whitespace-nowrap"
                                                                        >
                                                                                <span>📍</span>
                                                                                <span className="max-w-[100px] truncate md:max-w-none">{tripData.destination}</span>
                                                                        </motion.div>
                                                                )}
                                                        </AnimatePresence>
                                                </div>
                                                <button
                                                        onClick={onClose}
                                                        className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-brand-navy transition-colors"
                                                >
                                                        <X className="w-6 h-6" />
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
                                                                className="w-full absolute"
                                                        >
                                                                <Step1_Destination
                                                                        onNext={handleStep1Next}
                                                                        initialData={tripData}
                                                                />
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
                                                                className="w-full absolute"
                                                        >
                                                                <Step1_5_Dates
                                                                        onNext={handleDatesNext}
                                                                        onBack={() => setStep(0)}
                                                                        initialData={tripData}
                                                                />
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
                                                                className="w-full absolute"
                                                        >
                                                                <Step2_ChoosePath
                                                                        onSelect={handleStep2Select}
                                                                        onBack={() => setStep(1)} // Back to Dates
                                                                />
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
                                                                className="w-full absolute"
                                                        >
                                                                {tripData.method === 'smart' ? (
                                                                        <Step3_SmartImport
                                                                                onComplete={(data) => handleStep3Complete(data)}
                                                                                onBack={handleStep3Back}
                                                                        />
                                                                ) : (
                                                                        <Step3_ManualBuild
                                                                                onComplete={handleStep3Complete}
                                                                                onBack={handleStep3Back}
                                                                                initialData={tripData}
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
