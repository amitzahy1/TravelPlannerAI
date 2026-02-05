import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, X } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { RippleButton } from '../ui/RippleButton';

interface Step1Props {
        onNext: (data: { destination: string }) => void;
        initialData?: { destination: string };
}

// Mock top destinations for "Chips"
const POPULAR_DESTINATIONS = [
        { name: "Thailand", flag: "🇹🇭" },
        { name: "Japan", flag: "🇯🇵" },
        { name: "Italy", flag: "🇮🇹" },
        { name: "France", flag: "🇫🇷" },
        { name: "USA", flag: "🇺🇸" },
        { name: "Greece", flag: "🇬🇷" },
];

export const Step1_Destination: React.FC<Step1Props> = ({ onNext, initialData }) => {
        const [searchTerm, setSearchTerm] = useState(initialData?.destination || '');

        const handleSearch = (e: React.FormEvent) => {
                e.preventDefault();
                if (searchTerm.trim()) {
                        onNext({ destination: searchTerm });
                }
        };

        return (
                <div className="w-full max-w-2xl mx-auto text-center">
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
                                        Where is your next<br />adventure taking you?
                                </h2>
                                <p className="text-lg text-slate-500 font-medium">
                                        Start with a country or city. We'll handle the rest.
                                </p>
                        </motion.div>

                        {/* Main Search Input */}
                        <motion.form
                                onSubmit={handleSearch}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                                className="relative max-w-xl mx-auto mb-12"
                        >
                                <div className="relative group">
                                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-brand-action transition-colors" />
                                        <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Try 'Tokyo' or 'Iceland'..."
                                                className="w-full bg-white border border-slate-200 text-slate-800 text-xl font-medium placeholder:text-slate-300 rounded-2xl py-5 pl-14 pr-4 shadow-xl shadow-brand-navy/5 focus:outline-none focus:ring-4 focus:ring-brand-action/10 focus:border-brand-action/50 transition-all hover:shadow-2xl hover:shadow-brand-navy/10"
                                                autoFocus
                                        />
                                        {searchTerm && (
                                                <button
                                                        type="button"
                                                        onClick={() => setSearchTerm('')}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                        <X className="w-5 h-5" />
                                                </button>
                                        )}
                                </div>

                                {/* Continue Floating Button */}
                                <AnimatePresence>
                                        {searchTerm.length > 1 && (
                                                <motion.div
                                                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                        className="absolute -bottom-20 left-0 right-0 flex justify-center"
                                                >
                                                        <RippleButton
                                                                type="submit"
                                                                className="px-10 py-4 text-lg shadow-brand-action/40"
                                                        >
                                                                Continue to Plan
                                                        </RippleButton>
                                                </motion.div>
                                        )}
                                </AnimatePresence>
                        </motion.form>

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
                                                        setSearchTerm(dest.name);
                                                        // Optional: auto-submit or just fill
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
