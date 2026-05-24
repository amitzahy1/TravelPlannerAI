/**
 * External-AI paste modal — opens when the user clicks the new "📋 הדבק
 * מ-ChatGPT/Gemini" button next to "המלצות AI" in RestaurantsView /
 * AttractionsView. Lets the user copy a scoped prompt to ChatGPT /
 * Gemini Advanced / Claude.ai (their own subscription, not our worker
 * key), get richer results than our grounded SEARCH would produce,
 * and paste the JSON back. Zero Gemini API cost.
 *
 * Reuses services/externalAiImport.ts which has been wired into
 * AdminView for years — we're just exposing it from the trip-view
 * context with a scoped prompt for the active city / kind.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import {
    buildExternalAiPrompt,
    parseExternalAiResponse,
    mergeExternalAiIntoTrip,
    existingPlaceNames,
    type Kind,
} from '../services/externalAiImport';
import type { Trip } from '../types';
import { toast } from '../stores/useToastStore';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    trip: Trip;
    kind: Kind;                       // 'restaurants' | 'attractions'
    onApply: (updated: Trip) => void; // parent persists updated trip
    /** Optional scope — when set, the prompt focuses on this city only.
     *  When omitted, the prompt covers all trip cities. */
    scopeCity?: string;
    /** Optional category scope — when set, prompt asks for ONLY this
     *  category (e.g. "המבורגר"). Used by the per-category refresh menu. */
    scopeCategory?: string;
}

export const ExternalAiPasteModal: React.FC<Props> = ({ isOpen, onClose, trip, kind, onApply, scopeCity, scopeCategory }) => {
    const [pastedText, setPastedText] = useState('');
    const [parsing, setParsing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const prompt = useMemo(() => {
        if (!trip) return '';
        // Scope: if a specific city is selected we override `destination` so
        // the AI focuses on that city alone. Otherwise the prompt covers
        // every city in the trip (same behavior as the admin export).
        const dest = scopeCity || trip.destinationEnglish || trip.destination || '';
        return buildExternalAiPrompt(dest, kind, existingPlaceNames(trip, kind), scopeCategory);
    }, [trip, kind, scopeCity, scopeCategory]);

    useEffect(() => {
        if (!isOpen) {
            setPastedText('');
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen || !trip) return null;

    const copyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(prompt);
            toast.success('הפרומפט הועתק. הדבק אותו ב-ChatGPT / Gemini / Claude.');
        } catch {
            toast.error('הדפדפן חסם העתקה אוטומטית — בחר ידנית והעתק.');
        }
    };

    const openTab = (url: string) => () => window.open(url, '_blank', 'noopener,noreferrer');

    const apply = async () => {
        if (!pastedText.trim()) {
            setError('הדבק את ה-JSON מה-AI החיצוני לפני שתלחץ על "הוסף לטיול".');
            return;
        }
        setParsing(true);
        setError(null);
        try {
            const parsed = parseExternalAiResponse(pastedText.trim(), kind);
            const updated = mergeExternalAiIntoTrip(trip, parsed);
            onApply(updated);
            toast.success(`נוספו ${parsed.total} ${kind === 'attractions' ? 'אטרקציות' : 'מסעדות'} — ללא קריאת AI.`);
            parsed.warnings.forEach(w => toast.warning(w));
            onClose();
        } catch (err: any) {
            setError(err?.message?.slice(0, 200) || 'שגיאה בפענוח ה-JSON.');
        } finally {
            setParsing(false);
        }
    };

    const entityHe = kind === 'attractions' ? 'אטרקציות' : 'מסעדות';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={e => e.stopPropagation()}
                        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
                    >
                        {/* Floating close X — absolute-positioned so it's ALWAYS
                            visible regardless of scroll position or transforms.
                            The previous sticky-header approach hid behind the site
                            nav at certain viewport sizes (user-reported 2026-05-21). */}
                        <button
                            onClick={onClose}
                            aria-label="סגור"
                            title="סגור"
                            className="absolute top-3 left-3 z-10 p-2 bg-white border border-slate-200 rounded-full shadow-md hover:bg-slate-50 hover:shadow-lg transition-all"
                        >
                            <X className="w-5 h-5 text-slate-600" />
                        </button>

                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 pl-14 rounded-t-2xl">
                            <h2 className="text-lg font-black text-slate-900">
                                📋 הדבק {entityHe} מ-AI חיצוני
                            </h2>
                            <p className="text-2xs text-slate-500 mt-0.5">
                                הריצו את הפרומפט ב-ChatGPT / Gemini / Claude (חינם ב-tier שלכם) והדביקו את ה-JSON.
                                <strong> עלות לאתר: 0 ש"ח.</strong>
                            </p>
                        </div>

                        {/* Body */}
                        <div className="p-5 space-y-5">
                            {/* Step 1 — prompt + open buttons */}
                            <div>
                                <div className="font-bold text-slate-700 text-sm mb-2">
                                    1. העתק את הפרומפט
                                </div>
                                <div className="bg-slate-900 rounded-lg p-3 max-h-44 overflow-y-auto">
                                    <pre dir="ltr" className="text-2xs text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">{prompt}</pre>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <button
                                        onClick={copyPrompt}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                    >
                                        <Copy className="w-3.5 h-3.5" /> העתק
                                    </button>
                                    <button
                                        onClick={openTab('https://chat.openai.com/')}
                                        className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                                    >
                                        פתח ChatGPT ↗
                                    </button>
                                    <button
                                        onClick={openTab('https://gemini.google.com/')}
                                        className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                                    >
                                        פתח Gemini Advanced ↗
                                    </button>
                                    <button
                                        onClick={openTab('https://claude.ai/')}
                                        className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                                    >
                                        פתח Claude ↗
                                    </button>
                                </div>
                            </div>

                            {/* Step 2 — paste back */}
                            <div>
                                <div className="font-bold text-slate-700 text-sm mb-2">
                                    2. הדבק כאן את ה-JSON שחזר
                                </div>
                                <textarea
                                    value={pastedText}
                                    onChange={e => setPastedText(e.target.value)}
                                    placeholder='{ "kind": "restaurants", "categories": [...] }'
                                    dir="ltr"
                                    rows={10}
                                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400"
                                />
                                {error && (
                                    <div className="mt-2 flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-2 text-xs">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}
                            </div>

                            {/* Step 3 — apply */}
                            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                                <div className="text-2xs text-slate-500">
                                    בלי שאילתה ל-Gemini שלנו · בלי שריפת תקציב · האימות מתבצע אחרי הוספה
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                    >
                                        סגור
                                    </button>
                                    <button
                                        onClick={apply}
                                        disabled={parsing || !pastedText.trim()}
                                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-black bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        {parsing ? 'מעבד…' : `הוסף ${entityHe} לטיול`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
