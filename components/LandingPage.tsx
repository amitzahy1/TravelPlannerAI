import React, { useEffect, useState } from 'react';
import { Sparkles, Users, Map, ArrowRight, Play, Pause } from 'lucide-react';

interface LandingPageProps {
        onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
        const [isVisible, setIsVisible] = useState(false);
        const [isVideoPlaying, setIsVideoPlaying] = useState(true);

        useEffect(() => {
                setIsVisible(true);
        }, []);

        // Cycle through taglines
        const taglines = [
                "Planned by AI.",
                "Built for You.",
                "Ready in Seconds."
        ];
        const [taglineIndex, setTaglineIndex] = useState(0);

        useEffect(() => {
                const interval = setInterval(() => {
                        setTaglineIndex((prev) => (prev + 1) % taglines.length);
                }, 3000);
                return () => clearInterval(interval);
        }, []);

        return (
                <div className="min-h-screen w-full relative overflow-hidden font-rubik selection:bg-indigo-100 selection:text-indigo-900">

                        {/* Video Background */}
                        <div className="absolute inset-0 z-0">
                                <video
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        className="absolute inset-0 w-full h-full object-cover"
                                        poster="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1920&q=80"
                                >
                                        <source src="https://videos.pexels.com/video-files/3015510/3015510-uhd_2560_1440_24fps.mp4" type="video/mp4" />
                                </video>
                                {/* Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-slate-900/70 to-purple-900/80" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                        </div>

                        {/* Floating Particles Effect (CSS only) */}
                        <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
                                {[...Array(20)].map((_, i) => (
                                        <div
                                                key={i}
                                                className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
                                                style={{
                                                        left: `${Math.random() * 100}%`,
                                                        top: `${Math.random() * 100}%`,
                                                        animationDelay: `${Math.random() * 5}s`,
                                                        animationDuration: `${5 + Math.random() * 10}s`
                                                }}
                                        />
                                ))}
                        </div>

                        {/* Main Content */}
                        <div className="relative z-10 min-h-screen flex flex-col md:flex-row">

                                {/* LEFT SIDE: The Hook */}
                                <div className="flex-1 flex flex-col justify-center px-8 md:px-20 py-12">

                                        {/* Badge */}
                                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 w-fit mb-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                                <span className="text-xs font-bold text-white/90 tracking-wide uppercase">Travel Planner AI 2.0</span>
                                        </div>

                                        {/* Headline */}
                                        <h1 className={`text-5xl md:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                                Your Dream Trip, <br />
                                                <span
                                                        key={taglineIndex}
                                                        className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 animate-fade-in"
                                                >
                                                        {taglines[taglineIndex]}
                                                </span>
                                        </h1>

                                        {/* Sub-headline */}
                                        <p className={`text-lg md:text-xl text-white/70 leading-relaxed max-w-xl mb-12 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                                Stop wasting hours on research. Get a personalized itinerary with smart budget tracking in <span className="text-white font-bold">seconds</span>.
                                        </p>

                                        {/* Feature Pills */}
                                        <div className={`flex flex-wrap gap-3 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 text-sm">
                                                        <Sparkles className="w-4 h-4 text-amber-400" />
                                                        AI-Powered
                                                </div>
                                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 text-sm">
                                                        <Users className="w-4 h-4 text-blue-400" />
                                                        Plan Together
                                                </div>
                                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/80 text-sm">
                                                        <Map className="w-4 h-4 text-emerald-400" />
                                                        Live Maps
                                                </div>
                                        </div>
                                </div>

                                {/* RIGHT SIDE: The Action */}
                                <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-20">

                                        <div className={`w-full max-w-md bg-white/10 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/20 transition-all duration-1000 delay-500 hover:bg-white/15 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>

                                                <div className="text-center mb-10">
                                                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-purple-500/30 rotate-3 hover:rotate-0 transition-transform">
                                                                <Sparkles className="w-10 h-10 text-white" />
                                                        </div>
                                                        <h2 className="text-3xl font-black text-white mb-3">Start Your Journey</h2>
                                                        <p className="text-white/60">Join thousands of travelers planning smarter.</p>
                                                </div>

                                                <button
                                                        onClick={onLogin}
                                                        className="w-full flex items-center justify-center gap-4 py-4 px-6 bg-white rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group"
                                                >
                                                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="G" />
                                                        <span className="font-bold text-slate-700 text-lg group-hover:text-indigo-600 transition-colors">Continue with Google</span>
                                                        <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                                </button>

                                                <p className="text-center text-xs text-white/40 mt-8 leading-relaxed">
                                                        By joining, you agree to our Terms of Service.
                                                </p>
                                        </div>

                                </div>

                        </div>

                        {/* Video Control */}
                        <button
                                onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                                className="fixed bottom-6 right-6 z-20 p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white/60 hover:text-white hover:bg-white/20 transition-all"
                        >
                                {isVideoPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                        </button>
                </div>
        );
};

