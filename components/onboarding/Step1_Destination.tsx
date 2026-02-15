import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, X, Plus } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { RippleButton } from '../ui/RippleButton';

interface Step1Props {
        onNext: (data: { destination: string }) => void;
        initialData?: { destination: string };
}

// Mock top destinations for "Chips"
const POPULAR_DESTINATIONS = [
        { name: "תאילנד", flag: "🇹🇭" },
        { name: "יפן", flag: "🇯🇵" },
        { name: "איטליה", flag: "🇮🇹" },
        { name: "צרפת", flag: "🇫🇷" },
        { name: "ארה\"ב", flag: "🇺🇸" },
        { name: "יוון", flag: "🇬🇷" },
        { name: "דובאי", flag: "🇦🇪" },
        { name: "פורטוגל", flag: "🇵🇹" },
        { name: "ספרד", flag: "🇪🇸" },
        { name: "ישראל", flag: "🇮🇱" },
];

export const Step1_Destination: React.FC<Step1Props> = ({ onNext, initialData }) => {
        const [inputValue, setInputValue] = useState("");
        const [destinations, setDestinations] = useState<string[]>(
                initialData?.destination ? initialData.destination.split(' - ').filter(Boolean) : []
        );

        const handleAdd = () => {
                if (inputValue.trim()) {
                        setDestinations([...destinations, inputValue.trim()]);
                        setInputValue("");
                }
        };

        const handleRemove = (index: number) => {
                setDestinations(destinations.filter((_, i) => i !== index));
        };

        const handleContinue = (e?: React.FormEvent) => {
                if (e) e.preventDefault();
                // If there's pending input, add it first
                const finalDestinations = inputValue.trim() ? [...destinations, inputValue.trim()] : destinations;

                if (finalDestinations.length > 0) {
                        onNext({ destination: finalDestinations.join(' - ') });
                }
        };

        return (
                <div className="w-full max-w-2xl mx-auto text-center" dir="rtl">
                        {/* Header with staggered animation */}
                        <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="mb-10"
                        >
                                <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm"
                                >
                                        <MapPin className="w-8 h-8 text-brand-action" />
                                </motion.div>

                                <h2 className="text-4xl md:text-5xl font-black text-brand-navy mb-4 tracking-tight">
                                        לאן ההרפתקה הבאה<br />תיקח אתכם?
                                </h2>
                                <p className="text-lg text-slate-500 font-medium">
                                        הקלידו יעדים ולחצו Enter (אפשר להוסיף כמה!)
                                </p>
                        </motion.div>

                        {/* Main Search Input */}
                        <div className="relative max-w-xl mx-auto mb-12">
                                <div className="relative group">
                                        <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-brand-action transition-colors" />
                                        <input
                                                type="text"
                                                value={inputValue}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleAdd();
                                                        }
                                                }}
                                                placeholder={destinations.length === 0 ? "נסו 'טוקיו' או 'איסלנד'..." : "הוסיפו יעד נוסף..."}
                                                className="w-full bg-white border border-slate-200 text-slate-800 text-xl font-medium placeholder:text-slate-300 rounded-2xl py-5 pr-14 pl-4 shadow-xl shadow-brand-navy/5 focus:outline-none focus:ring-4 focus:ring-brand-action/10 focus:border-brand-action/50 transition-all hover:shadow-2xl hover:shadow-brand-navy/10 text-right"
                                                autoFocus
                                        />
                                        {inputValue && (
                                                <button
                                                        type="button"
                                                        onClick={handleAdd}
                                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                                >
                                                        <Plus className="w-5 h-5" />
                                                </button>
                                        )}
                                </div>

                                {/* Selected Chips */}
                                <div className="flex flex-wrap gap-2 justify-center mt-4">
                                        <AnimatePresence>
                                                {destinations.map((dest, idx) => (
                                                        <motion.div
                                                                key={`${dest}-${idx}`}
                                                                initial={{ opacity: 0, scale: 0.8 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.8 }}
                                                                className="flex items-center gap-1.5 bg-brand-navy/5 text-brand-navy px-4 py-2 rounded-full text-base font-bold border border-brand-navy/10"
                                                        >
                                                                <span>{dest}</span>
                                                                <button onClick={() => handleRemove(idx)} className="hover:bg-black/5 rounded-full p-0.5 transition-colors">
                                                                        <X className="w-4 h-4" />
                                                                </button>
                                                        </motion.div>
                                                ))}
                                        </AnimatePresence>
                                </div>

                                {/* Continue Floating Button */}
                                <AnimatePresence>
                                        {(destinations.length > 0 || inputValue.length > 1) && (
                                                <motion.div
                                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                        className="absolute -bottom-24 left-0 right-0 flex justify-center"
                                                >
                                                        <RippleButton
                                                                onClick={handleContinue}
                                                                className="px-10 py-4 text-lg shadow-brand-action/40"
                                                        >
                                                                המשך לתאריכים
                                                        </RippleButton>
                                                </motion.div>
                                        )}
                                </AnimatePresence>
                        </div>

                        {/* Popular Destinations Chips */}
                        <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="flex flex-wrap justify-center gap-3"
                        >
                                {POPULAR_DESTINATIONS.map((dest, i) => (
                                        <motion.button
                                                key={dest.name}
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.6 + (i * 0.1) }}
                                                whileHover={{ scale: 1.05, backgroundColor: '#f1f5f9' }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => {
                                                        // Prevent duplicate adds
                                                        if (!destinations.includes(dest.name)) {
                                                                setDestinations([...destinations, dest.name]);
                                                        }
                                                }}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-100 rounded-full shadow-sm text-slate-600 font-medium hover:border-brand-action/30 hover:text-brand-action transition-all"
                                        >
                                                <span className="text-xl">{dest.flag}</span>
                                                <span>{dest.name}</span>
                                        </motion.button>
                                ))}
                        </motion.div>
                </div>
        );
};
