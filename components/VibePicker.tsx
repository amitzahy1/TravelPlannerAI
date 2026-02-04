import React, { useState } from 'react';
import { Palmtree, Mountain, Heart, Landmark, Sparkles, ChevronRight } from 'lucide-react';

export type VibeType = 'relaxed' | 'adventure' | 'romantic' | 'culture';

interface VibeOption {
        id: VibeType;
        label: string;
        labelHe: string;
        icon: React.ElementType;
        gradient: string;
        bgImage: string; // Unsplash URL
        description: string;
}

const VIBE_OPTIONS: VibeOption[] = [
        {
                id: 'relaxed',
                label: 'Relaxed',
                labelHe: 'רגוע',
                icon: Palmtree,
                gradient: 'from-cyan-400 to-blue-500',
                bgImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1920&q=80',
                description: 'Beaches, spas, and slow mornings'
        },
        {
                id: 'adventure',
                label: 'Adventure',
                labelHe: 'הרפתקה',
                icon: Mountain,
                gradient: 'from-orange-400 to-red-500',
                bgImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
                description: 'Hiking, diving, and adrenaline'
        },
        {
                id: 'romantic',
                label: 'Romantic',
                labelHe: 'רומנטי',
                icon: Heart,
                gradient: 'from-pink-400 to-rose-500',
                bgImage: 'https://images.unsplash.com/photo-1499678329028-101435549a4e?auto=format&fit=crop&w=1920&q=80',
                description: 'Sunsets, fine dining, and intimacy'
        },
        {
                id: 'culture',
                label: 'Culture',
                labelHe: 'תרבות',
                icon: Landmark,
                gradient: 'from-amber-400 to-yellow-500',
                bgImage: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1920&q=80',
                description: 'Museums, history, and local life'
        }
];

interface VibePickerProps {
        onSelect: (vibe: VibeType) => void;
        onSkip?: () => void;
}

export const VibePicker: React.FC<VibePickerProps> = ({ onSelect, onSkip }) => {
        const [hoveredVibe, setHoveredVibe] = useState<VibeType | null>(null);
        const [selectedVibe, setSelectedVibe] = useState<VibeType | null>(null);

        const activeVibe = selectedVibe || hoveredVibe;
        const activeBg = VIBE_OPTIONS.find(v => v.id === activeVibe)?.bgImage || VIBE_OPTIONS[0].bgImage;

        const handleSelect = (vibe: VibeType) => {
                setSelectedVibe(vibe);
                // Delay for animation
                setTimeout(() => onSelect(vibe), 400);
        };

        return (
                <div className="fixed inset-0 z-[250] overflow-hidden">
                        {/* Dynamic Background */}
                        <div className="absolute inset-0 transition-all duration-700 ease-out">
                                {VIBE_OPTIONS.map((vibe) => (
                                        <div
                                                key={vibe.id}
                                                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${activeVibe === vibe.id ? 'opacity-100' : 'opacity-0'}`}
                                                style={{ backgroundImage: `url(${vibe.bgImage})` }}
                                        />
                                ))}
                                {/* Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
                        </div>

                        {/* Content */}
                        <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 py-12">

                                {/* Header */}
                                <div className="text-center mb-12 animate-fade-in">
                                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full mb-6">
                                                <Sparkles className="w-4 h-4 text-amber-400" />
                                                <span className="text-sm font-bold text-white/90">Step 1 of 3</span>
                                        </div>
                                        <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
                                                How do you want to <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400">feel</span>?
                                        </h1>
                                        <p className="text-lg text-white/70 max-w-md mx-auto">
                                                Choose your travel vibe. This helps us personalize your experience.
                                        </p>
                                </div>

                                {/* Vibe Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl w-full mb-12">
                                        {VIBE_OPTIONS.map((vibe) => {
                                                const Icon = vibe.icon;
                                                const isSelected = selectedVibe === vibe.id;
                                                const isHovered = hoveredVibe === vibe.id;

                                                return (
                                                        <button
                                                                key={vibe.id}
                                                                onClick={() => handleSelect(vibe.id)}
                                                                onMouseEnter={() => setHoveredVibe(vibe.id)}
                                                                onMouseLeave={() => setHoveredVibe(null)}
                                                                className={`
                  relative group p-6 md:p-8 rounded-3xl backdrop-blur-md border-2 transition-all duration-300
                  ${isSelected
                                                                                ? `bg-gradient-to-br ${vibe.gradient} border-white shadow-2xl scale-105`
                                                                                : isHovered
                                                                                        ? 'bg-white/20 border-white/40 scale-102'
                                                                                        : 'bg-white/10 border-white/20 hover:bg-white/15'
                                                                        }
                `}
                                                        >
                                                                {/* Icon */}
                                                                <div className={`
                  w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4
                  ${isSelected ? 'bg-white/30' : `bg-gradient-to-br ${vibe.gradient}`}
                  transition-all duration-300
                `}>
                                                                        <Icon className={`w-7 h-7 md:w-8 md:h-8 ${isSelected ? 'text-white' : 'text-white'}`} />
                                                                </div>

                                                                {/* Labels */}
                                                                <div className="text-center">
                                                                        <div className="font-black text-white text-lg md:text-xl mb-1">{vibe.label}</div>
                                                                        <div className="text-white/60 text-sm font-medium">{vibe.labelHe}</div>
                                                                </div>

                                                                {/* Description on Hover */}
                                                                <div className={`
                  absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full
                  px-4 py-2 bg-black/80 backdrop-blur-md rounded-xl text-sm text-white/90 whitespace-nowrap
                  transition-all duration-300 pointer-events-none
                  ${isHovered && !isSelected ? 'opacity-100 translate-y-full' : 'opacity-0 translate-y-[120%]'}
                `}>
                                                                        {vibe.description}
                                                                </div>

                                                                {/* Selection Indicator */}
                                                                {isSelected && (
                                                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg animate-bounce">
                                                                                <ChevronRight className="w-5 h-5 text-slate-800" />
                                                                        </div>
                                                                )}
                                                        </button>
                                                );
                                        })}
                                </div>

                                {/* Skip Option */}
                                {onSkip && (
                                        <button
                                                onClick={onSkip}
                                                className="text-white/50 hover:text-white/80 text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                                Skip this step <ChevronRight className="w-4 h-4" />
                                        </button>
                                )}
                        </div>
                </div>
        );
};
