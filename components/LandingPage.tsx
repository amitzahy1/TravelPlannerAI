import React, { useEffect, useState } from 'react';
import { Sparkles, Calendar, Map, CheckCircle2, ArrowRight } from 'lucide-react';

interface LandingPageProps {
        onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
        const [isVisible, setIsVisible] = useState(false);

        useEffect(() => {
                setIsVisible(true);
        }, []);

        return (
                <div className="min-h-screen w-full flex flex-col md:flex-row bg-gradient-to-br from-indigo-50 via-white to-blue-50 relative overflow-hidden font-rubik selection:bg-indigo-100 selection:text-indigo-900">

                        {/* Abstract Background Shapes */}
                        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-3xl mix-blend-multiply animate-blob"></div>
                        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000"></div>
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.3] pointer-events-none"></div>

                        {/* LEFT SIDE: The Hook */}
                        <div className="flex-1 flex flex-col justify-center px-8 md:px-20 py-12 relative z-10">

                                {/* Badge */}
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-100 shadow-sm w-fit mb-8 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                        <span className="text-[10px] sm:text-xs font-bold text-slate-600 tracking-wide uppercase">Travel Planner AI 2.0</span>
                                </div>

                                {/* Headline */}
                                <h1 className={`text-5xl md:text-7xl font-black text-slate-900 leading-[1.1] tracking-tight mb-6 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                        Your Dream Trip, <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">Planned by AI.</span>
                                </h1>

                                {/* Sub-headline */}
                                <p className={`text-lg md:text-xl text-slate-500 leading-relaxed max-w-xl mb-12 transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                        Stop wasting hours on research. Get a personalized itinerary, synced to your calendar, with smart budget tracking in seconds.
                                </p>

                                {/* Feature Grid */}
                                <div className={`grid grid-cols-1 gap-6 max-w-lg transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

                                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/50 border border-white/60 hover:bg-white hover:shadow-md transition-all group">
                                                <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                        <Sparkles className="w-6 h-6" />
                                                </div>
                                                <div>
                                                        <h3 className="font-bold text-slate-800 text-lg">Smart AI</h3>
                                                        <p className="text-slate-500 text-sm mt-1">Personalized recommendations based on your style.</p>
                                                </div>
                                        </div>

                                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/50 border border-white/60 hover:bg-white hover:shadow-md transition-all group">
                                                <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                        <Calendar className="w-6 h-6" />
                                                </div>
                                                <div>
                                                        <h3 className="font-bold text-slate-800 text-lg">Auto-Sync</h3>
                                                        <p className="text-slate-500 text-sm mt-1">Direct integration with your Google Calendar.</p>
                                                </div>
                                        </div>

                                        <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/50 border border-white/60 hover:bg-white hover:shadow-md transition-all group">
                                                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                                        <Map className="w-6 h-6" />
                                                </div>
                                                <div>
                                                        <h3 className="font-bold text-slate-800 text-lg">Live Maps</h3>
                                                        <p className="text-slate-500 text-sm mt-1">Interactive city navigation & route planning.</p>
                                                </div>
                                        </div>

                                </div>
                        </div>

                        {/* RIGHT SIDE: The Action */}
                        <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-20 relative z-10">

                                <div className={`w-full max-w-md bg-white/70 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/80 transition-all duration-1000 delay-500 hover:shadow-indigo-100/50 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'}`}>

                                        <div className="text-center mb-10">
                                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-indigo-200">
                                                        <Sparkles className="w-8 h-8 text-white" />
                                                </div>
                                                <h2 className="text-3xl font-black text-slate-900 mb-3">Get Started</h2>
                                                <p className="text-slate-500">Join thousands of travelers planning smarter.</p>
                                        </div>

                                        <button
                                                onClick={onLogin}
                                                className="w-full flex items-center justify-center gap-4 py-4 px-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-lg hover:border-indigo-200 hover:-translate-y-1 transition-all group"
                                        >
                                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="G" />
                                                <span className="font-bold text-slate-700 text-lg group-hover:text-indigo-600 transition-colors">Continue with Google</span>
                                        </button>

                                        <p className="text-center text-xs text-slate-400 mt-8 leading-relaxed">
                                                By joining, you agree to our Terms of Service.<br />
                                                We only access your calendar to add trip details.
                                        </p>
                                </div>

                        </div>

                </div>
        );
};
