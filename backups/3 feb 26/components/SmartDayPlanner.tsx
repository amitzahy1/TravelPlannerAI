import React, { useState } from 'react';
import { Sparkles, Loader2, CalendarCheck } from 'lucide-react';
import { planFullDay } from '../services/aiService';

interface SmartDayPlannerProps {
        city: string;
        date: string;
        tripNotes?: string;
        onPlanGenerated: (activities: string[]) => void;
}

export const SmartDayPlanner: React.FC<SmartDayPlannerProps> = ({ city, date, tripNotes, onPlanGenerated }) => {
        const [loading, setLoading] = useState(false);

        const handlePlan = async () => {
                setLoading(true);
                try {
                        const result = await planFullDay(city, date, tripNotes);
                        const data = JSON.parse(result.text);
                        if (data.activities) {
                                onPlanGenerated(data.activities);
                        }
                } catch (error) {
                        console.error("Failed to plan day:", error);
                        alert("מצטערים, חלה שגיאה בתכנון היום. נסה שוב.");
                } finally {
                        setLoading(false);
                }
        };

        return (
                <div className="h-full flex flex-col items-center justify-center p-2 text-center">
                        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-2xl p-4 border border-indigo-100/50 backdrop-blur-sm group hover:border-indigo-300 transition-all duration-300 cursor-pointer" onClick={handlePlan}>
                                <div className="relative mb-2">
                                        <Sparkles className={`w-6 h-6 text-indigo-500 mx-auto ${loading ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
                                        {loading && <Loader2 className="w-6 h-6 text-indigo-500 absolute inset-0 animate-spin" />}
                                </div>
                                <h4 className="text-[11px] font-black text-slate-800 mb-0.5">יום חופשי בלו"ז</h4>
                                <p className="text-[9px] text-slate-500 font-bold mb-2 leading-tight line-clamp-2">רוצה שה-AI יתכנן לך <br />יום מושלם ב{city}?</p>

                                <button
                                        disabled={loading}
                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg shadow-indigo-100 flex items-center gap-1 mx-auto transition-all"
                                >
                                        {loading ? 'מתכנן...' : 'תכנן לי את היום'}
                                        {!loading && <CalendarCheck className="w-3 h-3" />}
                                </button>
                        </div>
                </div>
        );
};
