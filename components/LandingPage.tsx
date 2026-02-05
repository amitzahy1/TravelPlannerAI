import React, { useEffect, useState } from 'react';
import { Sparkles, Users, Map, ArrowRight, Play, Pause, Plane } from 'lucide-react';
import { TermsOfServiceModal } from './TermsOfServiceModal';

interface LandingPageProps {
        onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
        const [isVisible, setIsVisible] = useState(false);
        const [isVideoPlaying, setIsVideoPlaying] = useState(true);
        const [isToSOpen, setIsToSOpen] = useState(false);

        useEffect(() => {
                setIsVisible(true);
        }, []);

        // Cycle through taglines
        const taglines = [
                "הטכנולוגיה שתקח אתכם רחוק יותר.",
                "הופכים כל חלום למסלול מדויק.",
                "העתיד של התכנון כבר כאן."
        ];
        const [taglineIndex, setTaglineIndex] = useState(0);

        useEffect(() => {
                const interval = setInterval(() => {
                        setTaglineIndex((prev) => (prev + 1) % taglines.length);
                }, 3000);
                return () => clearInterval(interval);
        }, []);

        return (
                <div className="min-h-screen w-full relative overflow-hidden font-rubik selection:bg-indigo-100 selection:text-indigo-900" dir="rtl">

                        {/* Video Background - Updated Source (Ship/Tropical) */}
                        <div className="absolute inset-0 z-0">
                                <video
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        className="absolute inset-0 w-full h-full object-cover"
                                        poster="https://images.unsplash.com/photo-1599640845513-53343599d630?auto=format&fit=crop&w=1920&q=80"
                                >
                                        <source src={`${import.meta.env.BASE_URL}video-bg.mp4`} type="video/mp4" />
                                        <source src="https://vjs.zencdn.net/v/oceans.mp4" type="video/mp4" />
                                </video>
                                {/* Gradient Overlay - Adjusted for better video visibility */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/30 via-purple-900/30 to-slate-900/40" />
                                <div className="absolute inset-0 bg-black/10" />
                        </div>

                        {/* Floating Particles Effect */}
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

                        {/* Full Logo (Absolute Top-Right for RTL) */}
                        <div className="absolute top-6 right-6 md:top-10 md:right-10 z-20 flex items-center gap-4 select-none group cursor-default">
                                <div className="bg-gradient-to-tr from-blue-600 to-sky-500 text-white p-3 md:p-4 rounded-[1.25rem] shadow-xl shadow-blue-500/30 backdrop-blur-md transform transition-transform group-hover:scale-110 duration-500">
                                        <Plane className="w-6 h-6 md:w-8 md:h-8" />
                                </div>
                                <div className="flex flex-col">
                                        <span className="font-black text-2xl md:text-3xl leading-none text-white tracking-tighter drop-shadow-xl">Travel Planner AI</span>
                                        <span className="text-[10px] md:text-[12px] font-bold text-sky-300 uppercase tracking-[0.2em] leading-none mt-1.5 drop-shadow-sm opacity-90">מהדורת פרימיום</span>
                                </div>
                        </div>

                        {/* Main Content */}
                        <div className="relative z-10 min-h-screen flex flex-col md:flex-row pb-20 md:pb-0">

                                {/* RIGHT SIDE: The Hook (Swapped for RTL) */}
                                <div className="flex-1 flex flex-col justify-center px-6 md:px-20 pt-24 md:pt-12 pb-8 md:pb-12 text-center md:text-right items-center md:items-start">

                                        {/* Desktop-only spacer to account for absolute logo */}
                                        <div className="hidden md:block h-12"></div>

                                        {/* Headline */}
                                        <h1 className={`text-4xl md:text-7xl font-black text-white leading-[1.1] tracking-tight mb-4 md:mb-6 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                                טיול החלומות שלך, <br />
                                                <span
                                                        key={taglineIndex}
                                                        className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 animate-fade-in"
                                                >
                                                        {taglines[taglineIndex]}
                                                </span>
                                        </h1>

                                        {/* Sub-headline */}
                                        <p className={`text-base md:text-xl text-white/80 leading-relaxed max-w-xl mb-8 md:mb-12 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                                תפסיקו לבזבז שעות על מחקר. קבלו מסלול טיול מותאם אישית עם מעקב תקציב חכם תוך <span className="text-white font-bold">שניות</span>.
                                        </p>

                                        {/* Feature Pills */}
                                        <div className={`flex flex-wrap gap-2 md:gap-3 justify-center md:justify-start transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                                <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/90 text-xs md:text-sm shadow-sm">
                                                        <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400" />
                                                        מבוסס AI
                                                </div>
                                                <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/90 text-xs md:text-sm shadow-sm">
                                                        <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-400" />
                                                        תכנון משותף
                                                </div>
                                                <div className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white/90 text-xs md:text-sm shadow-sm">
                                                        <Map className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" />
                                                        מפות חיות
                                                </div>
                                        </div>
                                </div>

                                {/* LEFT SIDE: The Action (Swapped for RTL) */}
                                <div className="flex-1 flex flex-col items-center justify-start md:justify-center p-6 md:p-20 pt-10 md:pt-20">

                                        <div className={`w-full max-w-sm md:max-w-md bg-white/10 backdrop-blur-2xl p-10 md:p-14 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] border border-white/20 transition-all duration-1000 delay-500 hover:bg-white/[0.12] ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 md:translate-x-[-3rem]'}`}>

                                                <div className="text-center mb-10 md:mb-14">
                                                        {/* Feature Icon in Card */}
                                                        <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-3xl mx-auto mb-6 md:mb-8 flex items-center justify-center shadow-2xl shadow-purple-500/40 transform -rotate-3 hover:rotate-0 transition-all duration-500 outline outline-4 outline-white/10">
                                                                <Users className="w-10 h-10 md:w-12 md:h-12 text-white" />
                                                        </div>
                                                        <h2 className="text-3xl md:text-4xl font-black text-white mb-3 md:mb-4 tracking-tight">התחילו את המסע</h2>
                                                        <p className="text-sm md:text-base text-white/70 font-medium leading-relaxed">הצטרפו לאלפי מטיילים שכבר <br className="hidden md:block" /> מתכננים חכם יותר עם AI.</p>
                                                </div>

                                                <div className="space-y-4">
                                                        <button
                                                                onClick={onLogin}
                                                                className="w-full flex items-center justify-center gap-4 py-4 md:py-5 px-8 bg-white rounded-2xl md:rounded-[1.5rem] shadow-xl hover:shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)] hover:-translate-y-1.5 active:scale-[0.98] transition-all duration-300 group overflow-hidden relative"
                                                        >
                                                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100 to-transparent -translate-x-full group-hover:animate-shimmer" />
                                                                {/* Google SVG Icon */}
                                                                <svg className="w-6 h-6 relative z-10" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                                                </svg>
                                                                <span className="font-extrabold text-slate-800 text-lg md:text-xl relative z-10 group-hover:text-brand-navy transition-colors">המשך עם Google</span>
                                                                <ArrowRight className="w-5 h-5 text-slate-400 relative z-10 group-hover:text-brand-navy group-hover:translate-x-1 transition-all transform rotate-180" />
                                                        </button>

                                                        <div className="text-center">
                                                                <button
                                                                        onClick={() => setIsToSOpen(true)}
                                                                        className="text-[11px] md:text-xs text-white/50 hover:text-white/90 hover:underline transition-all duration-300 py-2 inline-block font-medium tracking-wide"
                                                                >
                                                                        בהצטרפותך, אתה מסכים לתנאי השירות שלנו
                                                                </button>
                                                        </div>
                                                </div>
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

                        {/* Terms of Service Modal */}
                        <TermsOfServiceModal isOpen={isToSOpen} onClose={() => setIsToSOpen(false)} />
                </div>
        );
};
