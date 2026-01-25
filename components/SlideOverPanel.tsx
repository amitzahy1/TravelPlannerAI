import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface SlideOverPanelProps {
        isOpen: boolean;
        onClose: () => void;
        title?: string;
        children: React.ReactNode;
        heroImage?: string;
        heroLabel?: string; // Floating badge label (e.g., "RAMEN")
        width?: string; // custom max-width class (default max-w-md)
        zIndex?: number;
}

export const SlideOverPanel: React.FC<SlideOverPanelProps> = ({
        isOpen,
        onClose,
        title,
        children,
        heroImage,
        heroLabel,
        width = 'max-w-md',
        zIndex = 50
}) => {
        const [isVisible, setIsVisible] = useState(false);

        useEffect(() => {
                if (isOpen) {
                        setIsVisible(true);
                        // Prevent body scroll
                        document.body.style.overflow = 'hidden';
                } else {
                        const timer = setTimeout(() => setIsVisible(false), 300); // Wait for animation
                        document.body.style.overflow = 'unset';
                        return () => clearTimeout(timer);
                }
        }, [isOpen]);

        if (!isVisible && !isOpen) return null;

        return (
                <div className={`fixed inset-0 z-[${zIndex}] flex justify-end`} role="dialog" aria-modal="true">
                        {/* Backdrop */}
                        <div
                                className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                                onClick={onClose}
                        />

                        {/* Panel */}
                        <div
                                className={`relative w-full ${width} bg-white h-full shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                        >
                                {/* Hero Image Section (Optional) */}
                                {heroImage && (
                                        <div className="relative w-full h-48 sm:h-64 flex-shrink-0">
                                                <img
                                                        src={heroImage}
                                                        alt={title || 'Cover'}
                                                        className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                                                {/* Floating Label */}
                                                {heroLabel && (
                                                        <div className="absolute bottom-4 left-4">
                                                                <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-900 shadow-sm border border-white/20">
                                                                        {heroLabel}
                                                                </span>
                                                        </div>
                                                )}

                                                {/* Close Button on Image */}
                                                <button
                                                        onClick={onClose}
                                                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-all transform hover:rotate-90"
                                                >
                                                        <X className="w-5 h-5" />
                                                </button>
                                        </div>
                                )}

                                {/* Header (If no hero image, or supplementary) */}
                                {!heroImage && (
                                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                                                <h2 className="text-xl font-black text-slate-800">{title}</h2>
                                                <button
                                                        onClick={onClose}
                                                        className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                        <X className="w-5 h-5" />
                                                </button>
                                        </div>
                                )}

                                {/* Scrollable Content */}
                                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white">
                                        {children}
                                </div>
                        </div>

                        <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}</style>
                </div>
        );
};
