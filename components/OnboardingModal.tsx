import React, { useState, useEffect } from 'react';
import { Layout, Sparkles, BrainCircuit, ShieldCheck, X, ArrowLeft, CheckCircle2, Zap, MapPin, Plus } from 'lucide-react';
import { Trip } from '../types';

interface OnboardingModalProps {
  trips?: Trip[];
  onSelectTrip?: (id: string) => void;
  onCreateNew?: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ trips = [], onSelectTrip, onCreateNew }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeen = localStorage.getItem('hasSeenOnboardingV3'); 
    if (!hasSeen) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenOnboardingV3', 'true');
  };

  const handleSelectAndClose = (tripId: string) => {
      if (onSelectTrip) onSelectTrip(tripId);
      handleClose();
  };

  const handleCreateAndClose = () => {
      if (onCreateNew) onCreateNew();
      handleClose();
  };

  const steps = [
    {
      title: "הסוף לבלגן בווטסאפ ובמייל",
      desc: "כל הטיול שלך במקום אחד: טיסות, מלונות, כרטיסים ואטרקציות. המערכת מסדרת הכל על ציר זמן ויזואלי ומפה אינטראקטיבית.",
      icon: Layout,
      color: "bg-blue-600"
    },
    {
      title: "ה-AI בונה לך את הטיול",
      desc: "גרור את קבצי ה-PDF או צילומי המסך של הכרטיסים והמלונות – הבינה המלאכותית שלנו תחלץ את התאריכים והמחירים ותבנה את הלו\"ז.",
      icon: Sparkles,
      color: "bg-purple-600"
    },
    {
      title: "מזהה מה חסר לך",
      desc: "המערכת מזהה 'חורים' בתוכנית (כמו הסעות חסרות או זמן פנוי בין צ'ק אאוט לטיסה) ומציעה פתרונות חכמים.",
      icon: BrainCircuit,
      color: "bg-orange-500"
    },
    {
      title: "הכל איתך, גם בלי קליטה",
      desc: "ארנק דיגיטלי מאובטח לדרכונים ושוברים שזמין Offline. נהל תקציב, עקוב אחרי הוצאות והחזרי מס בראש שקט.",
      icon: ShieldCheck,
      color: "bg-emerald-600"
    }
  ];

  // Final Step: Trip Selection
  const isSelectionStep = step === steps.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-6 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative border border-white/20 flex flex-col max-h-[90vh]">
        <button onClick={handleClose} className="absolute top-6 right-6 z-10 p-2 bg-white/20 hover:bg-black/10 rounded-full transition-colors"><X className="w-6 h-6 text-slate-800" /></button>
        
        {/* Dynamic Header */}
        <div className={`transition-all duration-500 overflow-hidden relative flex flex-col items-center justify-center ${isSelectionStep ? 'h-40 bg-slate-900' : `h-72 ${steps[step].color}`}`}>
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20"></div>
           
           <div className="relative z-10 bg-white/20 backdrop-blur-md p-4 rounded-full shadow-2xl border border-white/30 mb-2 animate-scale-in">
                {isSelectionStep ? (
                    <MapPin className="w-10 h-10 text-white drop-shadow-md" />
                ) : (
                    React.createElement(steps[step].icon, { className: "w-16 h-16 text-white drop-shadow-md" })
                )}
           </div>
           
           {!isSelectionStep && (
               <div className="absolute bottom-6 flex gap-2">
                    {steps.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}></div>
                    ))}
               </div>
           )}
        </div>
        
        {/* Content */}
        <div className="p-8 text-center flex flex-col flex-grow overflow-y-auto">
            {isSelectionStep ? (
                <div className="space-y-4 animate-fade-in">
                    <h2 className="text-2xl font-black text-slate-800">לאן טסים הפעם?</h2>
                    <p className="text-slate-500 font-medium text-sm mb-4">בחר את הטיול שברצונך לנהל או צור אחד חדש</p>
                    
                    <div className="grid gap-3">
                        {trips.map(trip => (
                            <button 
                                key={trip.id}
                                onClick={() => handleSelectAndClose(trip.id)}
                                className="flex items-center gap-4 p-3 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all group text-right"
                            >
                                <div className="w-12 h-12 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0">
                                    {trip.coverImage ? (
                                        <img src={trip.coverImage} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500"><MapPin className="w-5 h-5" /></div>
                                    )}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 group-hover:text-blue-700">{trip.name}</div>
                                    <div className="text-xs text-slate-500">{trip.dates || 'ללא תאריך'}</div>
                                </div>
                                <div className="mr-auto text-slate-300 group-hover:text-blue-500">
                                    <ArrowLeft className="w-5 h-5" />
                                </div>
                            </button>
                        ))}
                        
                        <button 
                            onClick={handleCreateAndClose}
                            className="flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all font-bold"
                        >
                            <Plus className="w-5 h-5" /> צור טיול חדש
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight leading-tight">{steps[step].title}</h2>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed">{steps[step].desc}</p>
                    
                    <div className="mt-auto pt-6">
                        <button 
                            onClick={() => setStep(step + 1)}
                            className={`w-full py-4 rounded-2xl font-bold text-xl text-white shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl flex items-center justify-center gap-2 ${steps[step].color}`}
                        >
                            {step < steps.length - 1 ? (
                                <>הבא <ArrowLeft className="w-5 h-5 rotate-180" /></>
                            ) : (
                                <>מתחילים <Zap className="w-5 h-5" /></>
                            )}
                        </button>
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
};