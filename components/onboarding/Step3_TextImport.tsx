import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
        ClipboardPaste,
        Bot,
        FileText,
        Loader2,
        Hotel as HotelIcon,
        Plane,
        ArrowRight,
        AlertCircle,
        CheckCircle2,
        Sparkles,
        Copy,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { parseFreeTextTrip, FreeTextParseResult } from '../../services/freeTextImportService';

interface Step3TextImportProps {
        onComplete: (data: { freeTextResult: FreeTextParseResult; startDate?: string; endDate?: string; freeText: string }) => void;
        onBack: () => void;
        initialData?: {
                destination?: string;
                startDate?: string;
                endDate?: string;
                travelers?: number;
                freeText?: string;
                freeTextResult?: FreeTextParseResult;
        };
}

type Stage = 'idle' | 'analyzing' | 'error' | 'preview';

const MAX_CHARS = 20000;

const PLACEHOLDER = `לדוגמה:

יום 1 - 15/07/2026: טיסה אל על LY387 מ-TLV 10:30 ל-BKK 23:45
ליל 15-18/07 - מלון Shangri-La Bangkok, סוויטה משפחתית, 2 מבוגרים ו-2 ילדים
ליל 18-21/07 - צ'יאנג מאי, Anantara Resort, חדר דלוקס
21/07 טיסה חזור LY388 מ-BKK 01:15 ל-TLV 07:30

(אפשר גם להדביק טבלה או CSV – ה-AI יזהה את הפורמט לבד)`;

const EXAMPLE_TEXT = `יום 1 (15/07/2026): טיסה אל על LY387 מ-תל אביב (TLV) בשעה 10:30, נחיתה בבנגקוק (BKK) בשעה 23:45.
ליל 15-18/07 – מלון Shangri-La Bangkok, סוויטת משפחה (2 חדרי שינה), 2 מבוגרים + 2 ילדים.
ליל 18-21/07 – מלון Anantara Chiang Mai Resort, חדר דלוקס נוף לנהר, 2 מבוגרים + 2 ילדים.
21/07 (יום אחרון): טיסה אל על LY388 מ-בנגקוק (BKK) בשעה 01:15, נחיתה בתל אביב (TLV) בשעה 07:30.`;

const formatHebrewDate = (iso?: string) => {
        if (!iso) return '';
        const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return iso;
        return `${m[3]}/${m[2]}/${m[1]}`;
};

const parseISO = (s?: string): Date | null => {
        if (!s) return null;
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        const d = new Date(+m[1], +m[2] - 1, +m[3]);
        return isNaN(d.getTime()) ? null : d;
};

const daysBetween = (a: Date, b: Date) => Math.abs(Math.round((a.getTime() - b.getTime()) / 86400000));

const buildAiPromptForClipboard = (destination?: string, startDate?: string, endDate?: string) => {
        const dest = destination?.trim() || '[יעד הטיול]';
        const start = formatHebrewDate(startDate) || '[תאריך התחלה]';
        const end = formatHebrewDate(endDate) || '[תאריך סיום]';

        return `אני מתכנן טיול ל-${dest} בתאריכים ${start} עד ${end}.
מצורפים קבצים / מקורות של ההזמנות והתיאורים שלי.

בבקשה סכם אותם בטקסט אחד בעברית שכולל:
1. לכל מלון: שם, עיר, תאריך צ'ק-אין (DD/MM/YYYY), תאריך צ'ק-אאוט, סוג חדר, מספר מבוגרים וילדים לחדר, והערות אם יש.
2. לכל טיסה: חברת התעופה, מספר טיסה, מעיר לעיר (כולל קוד IATA אם ידוע), תאריך טיסה, שעת המראה, שעת נחיתה.
3. העברות / שאטלים / רכבים אם מוזכרים — כהערה בתוך המלון הרלוונטי.

אפשר להחזיר כטקסט מובנה או כטבלה. השתמשו בפורמט תאריך עקבי (DD/MM/YYYY).`;
};

const ANALYZING_MESSAGES = [
        'מעבד את תיאור הטיול...',
        'מזהה פורמט...',
        'מאתר בתי מלון...',
        'מזהה טיסות...',
        'בונה את המסלול...',
];

export const Step3_TextImport: React.FC<Step3TextImportProps> = ({ onComplete, onBack, initialData }) => {
        const [stage, setStage] = useState<Stage>(
                initialData?.freeTextResult ? 'preview' : 'idle'
        );
        const [text, setText] = useState(initialData?.freeText || '');
        const [result, setResult] = useState<FreeTextParseResult | null>(initialData?.freeTextResult || null);
        const [errorMessage, setErrorMessage] = useState<string>('');
        const [showExample, setShowExample] = useState(false);
        const [copied, setCopied] = useState(false);
        const [analyzingIdx, setAnalyzingIdx] = useState(0);
        const [useParsedDates, setUseParsedDates] = useState(true);

        // Rotate analyzing messages
        useEffect(() => {
                if (stage !== 'analyzing') return;
                const id = setInterval(() => {
                        setAnalyzingIdx((i) => (i + 1) % ANALYZING_MESSAGES.length);
                }, 1400);
                return () => clearInterval(id);
        }, [stage]);

        // Compute parsed-date range vs wizard dates
        const parsedDateRange = useMemo(() => {
                if (!result) return null;
                const allDates: string[] = [];
                result.hotels.forEach(h => {
                        if (h.checkInDate) allDates.push(h.checkInDate);
                        if (h.checkOutDate) allDates.push(h.checkOutDate);
                });
                result.flights.forEach(f => {
                        if (f.date) allDates.push(f.date);
                });
                const valid = allDates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
                if (valid.length === 0) return null;
                return { start: valid[0], end: valid[valid.length - 1] };
        }, [result]);

        const showDateMismatch = useMemo(() => {
                if (!parsedDateRange) return false;
                const wizardStart = parseISO(initialData?.startDate);
                const wizardEnd = parseISO(initialData?.endDate);
                const parsedStart = parseISO(parsedDateRange.start);
                const parsedEnd = parseISO(parsedDateRange.end);
                if (!wizardStart || !wizardEnd || !parsedStart || !parsedEnd) return false;
                return daysBetween(wizardStart, parsedStart) > 2 || daysBetween(wizardEnd, parsedEnd) > 2;
        }, [parsedDateRange, initialData?.startDate, initialData?.endDate]);

        const handleAnalyze = async () => {
                if (!text.trim()) return;
                setErrorMessage('');
                setStage('analyzing');
                try {
                        const parsed = await parseFreeTextTrip(text, {
                                destination: initialData?.destination,
                                startDate: initialData?.startDate,
                                endDate: initialData?.endDate,
                                travelers: initialData?.travelers,
                        });
                        setResult(parsed);
                        setStage('preview');
                } catch (e: any) {
                        console.error('Text import analyze failed:', e);
                        setErrorMessage(e?.message || 'לא הצלחנו לעבד את הטקסט.');
                        setStage('error');
                }
        };

        const handleCopyPrompt = async () => {
                const prompt = buildAiPromptForClipboard(
                        initialData?.destination,
                        initialData?.startDate,
                        initialData?.endDate
                );
                try {
                        await navigator.clipboard.writeText(prompt);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2200);
                } catch {
                        setCopied(false);
                }
        };

        const handleEditText = () => {
                setStage('idle');
                setResult(null);
        };

        const handleConfirm = () => {
                if (!result) return;
                const nextStartDate = useParsedDates && parsedDateRange ? parsedDateRange.start : initialData?.startDate;
                const nextEndDate = useParsedDates && parsedDateRange ? parsedDateRange.end : initialData?.endDate;
                onComplete({
                        freeTextResult: result,
                        startDate: nextStartDate,
                        endDate: nextEndDate,
                        freeText: text,
                });
        };

        return (
                <div className="w-full max-w-4xl mx-auto h-full flex flex-col pt-2" dir="rtl">
                        {/* Header */}
                        <div className="text-center mb-4 flex-shrink-0 px-4">
                                <h2 className="text-2xl md:text-3xl font-black text-brand-navy mb-1">
                                        תיאור הטיול במילים
                                </h2>
                                <p className="text-slate-500 text-sm md:text-base">
                                        הדביקו תיאור חופשי, טבלה או CSV של הטיול. ה-AI יזהה את הפורמט ויחלץ מלונות וטיסות.
                                </p>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-6 scrollbar-hide">
                                <AnimatePresence mode="wait">
                                        {stage === 'idle' || stage === 'error' ? (
                                                <motion.div
                                                        key="idle"
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="max-w-3xl mx-auto space-y-4"
                                                >
                                                        {/* Helper row */}
                                                        <div className="flex flex-wrap items-center gap-2">
                                                                <button
                                                                        type="button"
                                                                        onClick={handleCopyPrompt}
                                                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-sm transition-colors"
                                                                        title="השתמשו ב-ChatGPT / NotebookLM / Gemini: הדביקו את ה-prompt, הוסיפו את המסמכים שלכם, והעתיקו את הפלט חזרה לכאן"
                                                                >
                                                                        {copied ? (
                                                                                <>
                                                                                        <CheckCircle2 className="w-4 h-4" />
                                                                                        הועתק ✓
                                                                                </>
                                                                        ) : (
                                                                                <>
                                                                                        <Bot className="w-4 h-4" />
                                                                                        <Copy className="w-3.5 h-3.5" />
                                                                                        העתק prompt ל-AI
                                                                                </>
                                                                        )}
                                                                </button>
                                                                <button
                                                                        type="button"
                                                                        onClick={() => setShowExample(s => !s)}
                                                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors"
                                                                >
                                                                        <FileText className="w-4 h-4" />
                                                                        {showExample ? 'סגור דוגמה' : 'ראה דוגמה'}
                                                                </button>
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                                                                        <Sparkles className="w-3.5 h-3.5" />
                                                                        תומך גם בטקסט, גם בטבלאות וגם ב-CSV
                                                                </span>
                                                        </div>

                                                        {/* Example block */}
                                                        <AnimatePresence>
                                                                {showExample && (
                                                                        <motion.div
                                                                                initial={{ opacity: 0, height: 0 }}
                                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                                exit={{ opacity: 0, height: 0 }}
                                                                                className="overflow-hidden"
                                                                        >
                                                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
                                                                                        {EXAMPLE_TEXT}
                                                                                </div>
                                                                        </motion.div>
                                                                )}
                                                        </AnimatePresence>

                                                        {/* Textarea */}
                                                        <div className="relative">
                                                                <textarea
                                                                        value={text}
                                                                        onChange={(e) => setText(e.target.value)}
                                                                        placeholder={PLACEHOLDER}
                                                                        maxLength={MAX_CHARS}
                                                                        dir="rtl"
                                                                        className="w-full min-h-[320px] p-5 pb-10 rounded-2xl border-2 border-slate-200 focus:border-indigo-400 focus:outline-none resize-y bg-white text-brand-navy leading-relaxed font-medium text-[15px] shadow-sm placeholder:text-slate-400"
                                                                />
                                                                <div className="absolute bottom-3 left-4 text-xs text-slate-400 font-medium bg-white/80 px-2 py-0.5 rounded-md pointer-events-none">
                                                                        {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                                                                </div>
                                                        </div>

                                                        {/* Inline error */}
                                                        {stage === 'error' && (
                                                                <motion.div
                                                                        initial={{ opacity: 0, y: -5 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl p-4"
                                                                >
                                                                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                                                        <div className="flex-1 text-sm">
                                                                                <div className="font-bold mb-1">לא הצלחנו לעבד את הטקסט</div>
                                                                                <div className="text-red-700">
                                                                                        נסו שוב או ערכו את הטקסט. {errorMessage && <span className="opacity-80">({errorMessage})</span>}
                                                                                </div>
                                                                        </div>
                                                                </motion.div>
                                                        )}

                                                        {/* Action buttons */}
                                                        <div className="flex items-center justify-between gap-3 pt-2">
                                                                <button
                                                                        type="button"
                                                                        onClick={onBack}
                                                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-500 hover:text-brand-navy hover:bg-slate-100 font-bold text-sm transition-colors"
                                                                >
                                                                        <ArrowRight className="w-4 h-4 rotate-180" />
                                                                        חזור
                                                                </button>
                                                                <button
                                                                        type="button"
                                                                        onClick={handleAnalyze}
                                                                        disabled={!text.trim()}
                                                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all transform active:scale-95"
                                                                >
                                                                        <ClipboardPaste className="w-4 h-4" />
                                                                        {stage === 'error' ? 'נסה שוב' : 'נתח את הטקסט'}
                                                                </button>
                                                        </div>
                                                </motion.div>
                                        ) : stage === 'analyzing' ? (
                                                <motion.div
                                                        key="analyzing"
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className="max-w-2xl mx-auto"
                                                >
                                                        <GlassCard className="h-80 flex flex-col items-center justify-center">
                                                                <div className="flex flex-col items-center gap-6">
                                                                        <div className="relative">
                                                                                <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
                                                                                <div className="bg-white p-4 rounded-full shadow-xl relative z-10">
                                                                                        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                                                                </div>
                                                                        </div>
                                                                        <motion.p
                                                                                key={analyzingIdx}
                                                                                initial={{ opacity: 0, y: 10 }}
                                                                                animate={{ opacity: 1, y: 0 }}
                                                                                className="text-brand-navy font-black text-xl text-center"
                                                                        >
                                                                                {ANALYZING_MESSAGES[analyzingIdx]}
                                                                        </motion.p>
                                                                </div>
                                                        </GlassCard>
                                                </motion.div>
                                        ) : (
                                                <motion.div
                                                        key="preview"
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -10 }}
                                                        className="max-w-3xl mx-auto space-y-4"
                                                >
                                                        {/* Summary banner */}
                                                        <GlassCard className="p-5 bg-gradient-to-l from-indigo-50/80 to-violet-50/80 border border-indigo-100">
                                                                <div className="flex items-start gap-3">
                                                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                                                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                                        </div>
                                                                        <div className="flex-1">
                                                                                <div className="font-black text-brand-navy mb-1">
                                                                                        {result?.summary || 'הניתוח הושלם'}
                                                                                </div>
                                                                                <div className="text-sm text-slate-600 font-medium">
                                                                                        נמצאו {result?.hotels.length || 0} מלונות ו-{result?.flights.length || 0} טיסות.
                                                                                </div>
                                                                        </div>
                                                                </div>
                                                        </GlassCard>

                                                        {/* Date mismatch prompt */}
                                                        {showDateMismatch && parsedDateRange && (
                                                                <GlassCard className="p-4 border border-amber-200 bg-amber-50/60">
                                                                        <div className="flex items-start gap-3">
                                                                                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                                                                <div className="flex-1">
                                                                                        <div className="font-bold text-brand-navy mb-2 text-sm">
                                                                                                הזיהוי מצא תאריכים שונים
                                                                                                {' '}
                                                                                                ({formatHebrewDate(parsedDateRange.start)} – {formatHebrewDate(parsedDateRange.end)}).
                                                                                                באיזה תאריכים להשתמש?
                                                                                        </div>
                                                                                        <div className="flex gap-2 flex-wrap">
                                                                                                <button
                                                                                                        type="button"
                                                                                                        onClick={() => setUseParsedDates(true)}
                                                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${useParsedDates ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}
                                                                                                >
                                                                                                        השתמש בתאריכי הזיהוי ({formatHebrewDate(parsedDateRange.start)} – {formatHebrewDate(parsedDateRange.end)})
                                                                                                </button>
                                                                                                <button
                                                                                                        type="button"
                                                                                                        onClick={() => setUseParsedDates(false)}
                                                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!useParsedDates ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200'}`}
                                                                                                >
                                                                                                        השאר את התאריכים שהזנתי ({formatHebrewDate(initialData?.startDate)} – {formatHebrewDate(initialData?.endDate)})
                                                                                                </button>
                                                                                        </div>
                                                                                </div>
                                                                        </div>
                                                                </GlassCard>
                                                        )}

                                                        {/* Hotels list */}
                                                        {result && result.hotels.length > 0 && (
                                                                <div>
                                                                        <div className="flex items-center gap-2 mb-2 px-1">
                                                                                <HotelIcon className="w-4 h-4 text-indigo-500" />
                                                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">מלונות</span>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                                {result.hotels.map((h) => (
                                                                                        <div key={h.id} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3">
                                                                                                <div className="min-w-0 flex-1">
                                                                                                        <div className="font-bold text-brand-navy truncate">{h.name}</div>
                                                                                                        <div className="text-xs text-slate-500 truncate">
                                                                                                                {h.city || h.address || ''}
                                                                                                        </div>
                                                                                                </div>
                                                                                                <div className="text-xs text-slate-600 font-medium whitespace-nowrap">
                                                                                                        {formatHebrewDate(h.checkInDate)} → {formatHebrewDate(h.checkOutDate)}
                                                                                                </div>
                                                                                        </div>
                                                                                ))}
                                                                        </div>
                                                                </div>
                                                        )}

                                                        {/* Flights list */}
                                                        {result && result.flights.length > 0 && (
                                                                <div>
                                                                        <div className="flex items-center gap-2 mb-2 px-1">
                                                                                <Plane className="w-4 h-4 text-indigo-500" />
                                                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">טיסות</span>
                                                                        </div>
                                                                        <div className="space-y-2">
                                                                                {result.flights.map((f, idx) => (
                                                                                        <div key={`${f.flightNumber}-${f.date}-${idx}`} className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3">
                                                                                                <div className="min-w-0 flex-1">
                                                                                                        <div className="font-bold text-brand-navy truncate">
                                                                                                                {f.airline} {f.flightNumber}
                                                                                                        </div>
                                                                                                        <div className="text-xs text-slate-500 truncate">
                                                                                                                {f.fromCity || f.fromCode} → {f.toCity || f.toCode}
                                                                                                        </div>
                                                                                                </div>
                                                                                                <div className="text-xs text-slate-600 font-medium whitespace-nowrap">
                                                                                                        {formatHebrewDate(f.date)} · {f.departureTime}
                                                                                                </div>
                                                                                        </div>
                                                                                ))}
                                                                        </div>
                                                                </div>
                                                        )}

                                                        {/* Action buttons */}
                                                        <div className="flex items-center justify-between gap-3 pt-2">
                                                                <button
                                                                        type="button"
                                                                        onClick={handleEditText}
                                                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-500 hover:text-brand-navy hover:bg-slate-100 font-bold text-sm transition-colors"
                                                                >
                                                                        ערוך טקסט
                                                                </button>
                                                                <button
                                                                        type="button"
                                                                        onClick={handleConfirm}
                                                                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all transform active:scale-95"
                                                                >
                                                                        <Sparkles className="w-4 h-4" />
                                                                        בנה את הטיול
                                                                </button>
                                                        </div>
                                                </motion.div>
                                        )}
                                </AnimatePresence>
                        </div>
                </div>
        );
};
