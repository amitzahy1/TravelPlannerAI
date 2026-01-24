import React from 'react';
import { Sparkles, Map, Wallet, ShieldCheck, ArrowLeft, Globe } from 'lucide-react';

interface LandingViewProps {
        onLogin: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onLogin }) => {
        return (
                <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden font-rubik">
                        {/* Background Decorations */}
                        <div className="absolute inset-0 z-0">
                                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-blob"></div>
                                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-100/50 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-blob animation-delay-2000"></div>
                                <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-indigo-100/30 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-blob animation-delay-4000"></div>
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.4]"></div>
                        </div>

                        {/* Main Card */}
                        <div className="relative z-10 bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/60 max-w-5xl w-full mx-4 flex flex-col md:flex-row shadow-slate-200/50 animate-fade-in-up">

                                {/* Right Side: Hero Content */}
                                <div className="md:w-1/2 flex flex-col justify-center items-start md:pr-8 mb-8 md:mb-0">
                                        <div className="bg-blue-50 p-2.5 rounded-2xl inline-flex items-center gap-2 mb-6 border border-blue-100">
                                                <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">New</span>
                                                <span className="text-blue-900 text-xs font-bold">AI Travel Planning 2.0</span>
                                        </div>

                                        <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-4 leading-tight">
                                                הטיול המושלם <br />
                                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">מתחיל כאן.</span>
                                        </h1>

                                        <p className="text-slate-500 text-lg mb-8 leading-relaxed max-w-md">
                                                פלטפורמה חכמה לתכנון, ניהול ותקצוב הטיול שלך.
                                                <br />
                                                כל המידע, הטיסות והמקומות במקום אחד.
                                        </p>

                                        <div className="flex flex-col gap-4 w-full md:max-w-xs">
                                                <button
                                                        onClick={onLogin}
                                                        className="group relative w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                                                >
                                                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 bg-white rounded-full p-0.5" alt="G" />
                                                        <span>התחבר עם Google</span>
                                                        <ArrowLeft className="w-4 h-4 opacity-50 group-hover:translate-x-[-4px] transition-transform" />
                                                </button>
                                                <p className="text-center text-[10px] text-slate-400">
                                                        בהתחברותך את/ה מסכים/ה לתנאי השימוש
                                                </p>
                                        </div>
                                </div>

                                {/* Left Side: Visual Features Grid */}
                                <div className="md:w-1/2 bg-gradient-to-br from-slate-50 to-white rounded-[2rem] border border-slate-100 p-8 grid grid-cols-1 md:grid-cols-2 gap-4 relative overflow-hidden">
                                        {/* Decorative Circle */}
                                        <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-yellow-100 rounded-full blur-2xl opacity-50"></div>

                                        {/* Feature 1 */}
                                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition-colors flex flex-col gap-3">
                                                <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center text-blue-600"><Sparkles className="w-5 h-5" /></div>
                                                <div>
                                                        <h3 className="font-bold text-slate-800 text-sm">תכנון חכם (AI)</h3>
                                                        <p className="text-xs text-slate-400 mt-1">מסלולים מותאמים אישית ברגע</p>
                                                </div>
                                        </div>

                                        {/* Feature 2 */}
                                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-emerald-200 transition-colors flex flex-col gap-3">
                                                <div className="bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center text-emerald-600"><Wallet className="w-5 h-5" /></div>
                                                <div>
                                                        <h3 className="font-bold text-slate-800 text-sm">ניהול תקציב</h3>
                                                        <p className="text-xs text-slate-400 mt-1">מעקב הוצאות בזמן אמת</p>
                                                </div>
                                        </div>

                                        {/* Feature 3 */}
                                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors flex flex-col gap-3">
                                                <div className="bg-indigo-50 w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600"><Map className="w-5 h-5" /></div>
                                                <div>
                                                        <h3 className="font-bold text-slate-800 text-sm">מפה אינטראקטיבית</h3>
                                                        <p className="text-xs text-slate-400 mt-1">כל הנקודות פרוסות מולך</p>
                                                </div>
                                        </div>

                                        {/* Feature 4 */}
                                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-purple-200 transition-colors flex flex-col gap-3">
                                                <div className="bg-purple-50 w-10 h-10 rounded-xl flex items-center justify-center text-purple-600"><Globe className="w-5 h-5" /></div>
                                                <div>
                                                        <h3 className="font-bold text-slate-800 text-sm">גישה מכל מקום</h3>
                                                        <p className="text-xs text-slate-400 mt-1">מסנכרן לנייד אוטומטית</p>
                                                </div>
                                        </div>
                                </div>
                        </div>

                        {/* Footer */}
                        <div className="absolute bottom-4 text-center text-slate-400 text-xs font-medium">
                                © 2024 Travel Planner Pro • Built with ❤️ by Amit Zahy
                        </div>
                </div>
        );
};
