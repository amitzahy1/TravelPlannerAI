import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ThinkingLoaderProps {
        texts: string[];
        speed?: number;
}

export const ThinkingLoader: React.FC<ThinkingLoaderProps> = ({ texts, speed = 2000 }) => {
        const [index, setIndex] = useState(0);

        useEffect(() => {
                const interval = setInterval(() => {
                        setIndex((prev) => (prev + 1) % texts.length);
                }, speed);
                return () => clearInterval(interval);
        }, [texts, speed]);

        return (
                <div className="flex flex-col items-center justify-center py-12 animate-fade-in text-center">
                        <div className="relative mb-4">
                                <div className="absolute inset-0 bg-purple-100 rounded-full animate-ping opacity-75"></div>
                                <div className="relative bg-white p-3 rounded-full shadow-md border border-purple-100">
                                        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                                </div>
                        </div>

                        <div className="h-6 flex items-center justify-center">
                                <p key={index} className="text-sm font-bold text-gray-500 animate-slide-up">
                                        {texts[index]}
                                </p>
                        </div>
                </div>
        );
};
