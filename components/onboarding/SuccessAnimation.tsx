import React from 'react';
import { motion } from 'framer-motion';
import { Plane, Check, Sparkles } from 'lucide-react';

export const SuccessAnimation: React.FC = () => {
        return (
                <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                        <div className="relative w-40 h-40 mb-8">
                                {/* Pulse Rings */}
                                {[0, 1, 2].map((i) => (
                                        <motion.div
                                                key={i}
                                                initial={{ opacity: 0.5, scale: 0.8 }}
                                                animate={{ opacity: 0, scale: 2 }}
                                                transition={{
                                                        duration: 2,
                                                        repeat: Infinity,
                                                        delay: i * 0.6,
                                                        ease: "easeOut"
                                                }}
                                                className="absolute inset-0 bg-brand-action/20 rounded-full"
                                        />
                                ))}

                                {/* Main Circle */}
                                <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                        className="absolute inset-0 bg-brand-action rounded-full flex items-center justify-center shadow-lg shadow-brand-action/40"
                                >
                                        <Check className="w-16 h-16 text-white" strokeWidth={4} />
                                </motion.div>

                                {/* Flying Plane */}
                                <motion.div
                                        initial={{ x: -100, y: 50, opacity: 0, scale: 0.5 }}
                                        animate={{ x: 100, y: -100, opacity: [0, 1, 1, 0], scale: 1.2 }}
                                        transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
                                        className="absolute inset-0 flex items-center justify-center z-10"
                                >
                                        <Plane className="w-12 h-12 text-white fill-current transform -rotate-45" />
                                </motion.div>

                                {/* Sparkles */}
                                {[0, 1, 2, 3, 4].map((i) => (
                                        <motion.div
                                                key={`sparkle-${i}`}
                                                initial={{ opacity: 0, scale: 0 }}
                                                animate={{
                                                        opacity: [0, 1, 0],
                                                        scale: [0, 1, 0],
                                                        x: Math.random() * 100 - 50,
                                                        y: Math.random() * 100 - 50
                                                }}
                                                transition={{
                                                        duration: 0.8,
                                                        delay: 0.8 + (Math.random() * 0.5),
                                                        repeat: Infinity,
                                                        repeatDelay: 1
                                                }}
                                                className="absolute inset-0 flex items-center justify-center"
                                        >
                                                <Sparkles className="w-6 h-6 text-yellow-400 fill-current" />
                                        </motion.div>
                                ))}
                        </div>

                        <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                        >
                                <h2 className="text-3xl font-black text-brand-navy mb-2">Trip Created!</h2>
                                <p className="text-slate-500 font-medium text-lg">
                                        Pack your bags, we're going places.
                                </p>
                        </motion.div>
                </div>
        );
};
