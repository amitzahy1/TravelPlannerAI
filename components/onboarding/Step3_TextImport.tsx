import React, { useEffect, useMemo, useRef, useState } from 'react';
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
        Pencil,
        Trash2,
        Plus,
        X,
        Save,
        UploadCloud,
        TextCursor,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { VoiceInputButton } from '../shared';
import {
        parseFreeTextTrip,
        parseFilesToFreeText,
        mergeFreeTextResults,
        FreeTextParseResult,
} from '../../services/freeTextImportService';
import type { HotelBooking, FlightSegment } from '../../types';

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
type AddMoreTab = 'text' | 'files';

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

לכל מלון: שם, עיר, תאריך צ'ק-אין (DD/MM/YYYY), תאריך צ'ק-אאוט, סוג חדר, מספר מבוגרים וילדים לחדר, והערות אם יש.
תוסיף את כל סוגי החדרים שיש בשורה בנפרדת לכל מלון וכמה אורחים יש שם בכל חדר ומה השם של החדר וכל הנתונים שיש.

לכל טיסה: חברת התעופה, מספר טיסה, מעיר לעיר (כולל קוד IATA אם ידוע), תאריך טיסה, שעת המראה, שעת נחיתה.

העברות / שאטלים / רכבים אם מוזכרים — כהערה בתוך המלון הרלוונטי.

אפשר להחזיר כטקסט מובנה או כטבלה. השתמשו בפורמט תאריך עקבי (DD/MM/YYYY).`;
};

const ANALYZING_MESSAGES = [
        'מעבד את תיאור הטיול...',
        'מזהה פורמט...',
        'מאתר בתי מלון...',
        'מזהה טיסות...',
        'בונה את המסלול...',
];

// ============================================================================
// Inline edit forms
// ============================================================================

const inputClass =
        'w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-indigo-400 focus:outline-none text-sm text-brand-navy bg-white';

const labelClass = 'block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider';

const emptyHotel = (): HotelBooking => ({
        id: crypto.randomUUID(),
        name: '',
        city: '',
        address: '',
        checkInDate: '',
        checkOutDate: '',
        nights: 0,
        bookingSource: 'Direct',
        rooms: [{ id: crypto.randomUUID(), adults: 2, children: 0 }],
});

const emptyFlight = (): FlightSegment => ({
        fromCode: '',
        fromCity: '',
        toCode: '',
        toCity: '',
        departureTime: '',
        arrivalTime: '',
        flightNumber: '',
        airline: '',
        duration: '',
        date: '',
});

const HotelEditForm: React.FC<{
        initial: HotelBooking;
        onSave: (h: HotelBooking) => void;
        onCancel: () => void;
}> = ({ initial, onSave, onCancel }) => {
        const [draft, setDraft] = useState<HotelBooking>(initial);
        const firstRoom = draft.rooms?.[0] || { id: crypto.randomUUID(), adults: 2, children: 0 };

        const update = (patch: Partial<HotelBooking>) => setDraft({ ...draft, ...patch });
        const updateRoom = (patch: Partial<NonNullable<HotelBooking['rooms']>[number]>) =>
                setDraft({ ...draft, rooms: [{ ...firstRoom, ...patch }] });

        return (
                <div className="bg-white rounded-xl border-2 border-indigo-300 p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                        <label className={labelClass}>שם המלון</label>
                                        <input
                                                className={inputClass}
                                                value={draft.name}
                                                onChange={e => update({ name: e.target.value })}
                                                placeholder="Shangri-La Bangkok"
                                        />
                                </div>
                                <div>
                                        <label className={labelClass}>עיר</label>
                                        <input
                                                className={inputClass}
                                                value={draft.city || ''}
                                                onChange={e => update({ city: e.target.value })}
                                                placeholder="בנגקוק"
                                        />
                                </div>
                                <div>
                                        <label className={labelClass}>סוג חדר</label>
                                        <input
                                                className={inputClass}
                                                value={firstRoom.roomType || ''}
                                                onChange={e => updateRoom({ roomType: e.target.value })}
                                                placeholder="Standard Room"
                                        />
                                </div>
                                <div>
                                        <label className={labelClass}>צ'ק-אין</label>
                                        <input
                                                type="date"
                                                className={inputClass}
                                                value={draft.checkInDate}
                                                onChange={e => update({ checkInDate: e.target.value })}
                                        />
                                </div>
                                <div>
                                        <label className={labelClass}>צ'ק-אאוט</label>
                                        <input
                                                type="date"
                                                className={inputClass}
                                                value={draft.checkOutDate}
                                                onChange={e => update({ checkOutDate: e.target.value })}
                                        />
                                </div>
                                <div>
                                        <label className={labelClass}>מבוגרים</label>
                                        <input
                                                type="number"
                                                min={0}
                                                className={inputClass}
                                                value={firstRoom.adults}
                                                onChange={e => updateRoom({ adults: parseInt(e.target.value) || 0 })}
                                        />
                                </div>
                                <div>
                                        <label className={labelClass}>ילדים</label>
                                        <input
                                                type="number"
                                                min={0}
                                                className={inputClass}
                                                value={firstRoom.children}
                                                onChange={e => updateRoom({ children: parseInt(e.target.value) || 0 })}
                                        />
                                </div>
                                <div className="col-span-2">
                                        <label className={labelClass}>הערות</label>
                                        <input
                                                className={inputClass}
                                                value={draft.notes || ''}
                                                onChange={e => update({ notes: e.target.value })}
                                                placeholder="העברה משדה התעופה וכו'"
                                        />
                                </div>
                        </div>
                        <div className="flex justify-end gap-2">
                                <button
                                        type="button"
                                        onClick={onCancel}
                                        className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-sm font-bold"
                                >
                                        ביטול
                                </button>
                                <button
                                        type="button"
                                        onClick={() => onSave(draft)}
                                        disabled={!draft.name.trim()}
                                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                        <Save className="w-3.5 h-3.5" />
                                        שמור
                                </button>
                        </div>
                </div>
        );
};

const FlightEditForm: React.FC<{
        initial: FlightSegment;
        onSave: (f: FlightSegment) => void;
        onCancel: () => void;
}> = ({ initial, onSave, onCancel }) => {
        const [draft, setDraft] = useState<FlightSegment>(initial);
        const update = (patch: Partial<FlightSegment>) => setDraft({ ...draft, ...patch });

        return (
                <div className="bg-white rounded-xl border-2 border-indigo-300 p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                                <div>
                                        <label className={labelClass}>חברת תעופה</label>
                                        <input
                                                className={inputClass}
                                                value={draft.airline}
                                                onChange={e => update({ airline: e.target.value })}
                                                placeholder="אל על"
                                        />
                                </div>
                                <div>
                                        <label className={labelClass}>מספר טיסה</label>
                                        <input
                                                className={inputClass}
                                                value={draft.flightNumber}
                                                onChange={e => update({ flightNumber: e.target.value })}
                                                placeholder="LY387"
                                        />
                                </div>
                                <div>
                                        <label className={labelClass}>מאיפה (עיר)</label>
                                        <input
                                                className={inputClass}
                                                value={draft.fromCity}
                                                onChange={e => update({ fromCity: e.target.value })}
                                                placeholder="תל אביב"
                                        />
                                </div>
                                <div>
                                        <label className={labelClass}>לאן (עיר)</label>
                                        <input
                                                className={inputClass}
                                                value={draft.toCity}
                                                onChange={e => update({ toCity: e.target.value })}
                                                placeholder="בנגקוק"
                                        />
                                </div>
                                <div>
                                        <label className={labelClass}>קוד IATA מוצא</label>
                                        <input
                                                className={inputClass}
                                                value={draft.fromCode}
                                                onChange={e => update({ fromCode: e.target.value.toUpperCase() })}
                                                placeholder="TLV"
                                                maxLength={3}
                                        />
                                </div>
                                <div>
                                        <label className={labelClass}>קוד IATA יעד</label>
                                        <input
                                                className={inputClass}
                                                value={draft.toCode}
                                                onChange={e => update({ toCode: e.target.value.toUpperCase() })}
                                                placeholder="BKK"
                                                maxLength={3}
                                        />
                                </div>
                                <div>
                                        <label className={labelClass}>תאריך</label>
                                        <input
                                                type="date"
                                                className={inputClass}
                                                value={draft.date}
                                                onChange={e => update({ date: e.target.value })}
                                        />
                                </div>
                                <div>
                                        <label className={labelClass}>שעת המראה</label>
                                        <input
                                                type="time"
                                                className={inputClass}
                                                value={draft.departureTime}
                                                onChange={e => update({ departureTime: e.target.value })}
                                        />
                                </div>
                                <div className="col-span-2">
                                        <label className={labelClass}>שעת נחיתה</label>
                                        <input
                                                type="time"
                                                className={inputClass}
                                                value={draft.arrivalTime}
                                                onChange={e => update({ arrivalTime: e.target.value })}
                                        />
                                </div>
                        </div>
                        <div className="flex justify-end gap-2">
                                <button
                                        type="button"
                                        onClick={onCancel}
                                        className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-sm font-bold"
                                >
                                        ביטול
                                </button>
                                <button
                                        type="button"
                                        onClick={() => onSave(draft)}
                                        disabled={!draft.flightNumber.trim() && !draft.airline.trim()}
                                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                        <Save className="w-3.5 h-3.5" />
                                        שמור
                                </button>
                        </div>
                </div>
        );
};

// ============================================================================
// Main component
// ============================================================================

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

        // Preview CRUD state
        const [editingHotelId, setEditingHotelId] = useState<string | null>(null);
        const [editingFlightIdx, setEditingFlightIdx] = useState<number | null>(null);
        const [showAddHotel, setShowAddHotel] = useState(false);
        const [showAddFlight, setShowAddFlight] = useState(false);

        // Add-more panel state
        const [showAddMore, setShowAddMore] = useState(false);
        const [addMoreTab, setAddMoreTab] = useState<AddMoreTab>('text');
        const [addMoreText, setAddMoreText] = useState('');
        const [isAppending, setIsAppending] = useState(false);
        const [appendError, setAppendError] = useState<string>('');
        const fileInputRef = useRef<HTMLInputElement>(null);

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
                setEditingHotelId(null);
                setEditingFlightIdx(null);
                setShowAddHotel(false);
                setShowAddFlight(false);
                setShowAddMore(false);
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

        // CRUD handlers
        const updateResult = (patch: (r: FreeTextParseResult) => FreeTextParseResult) => {
                setResult(r => (r ? patch(r) : r));
        };

        const handleSaveHotel = (h: HotelBooking) => {
                updateResult(r => {
                        const idx = r.hotels.findIndex(x => x.id === h.id);
                        if (idx < 0) return { ...r, hotels: [...r.hotels, h] };
                        const next = [...r.hotels];
                        next[idx] = h;
                        return { ...r, hotels: next };
                });
                setEditingHotelId(null);
                setShowAddHotel(false);
        };

        const handleDeleteHotel = (id: string) => {
                updateResult(r => ({ ...r, hotels: r.hotels.filter(h => h.id !== id) }));
        };

        const handleSaveFlight = (f: FlightSegment, idx: number | null) => {
                updateResult(r => {
                        if (idx === null) return { ...r, flights: [...r.flights, f] };
                        const next = [...r.flights];
                        next[idx] = f;
                        return { ...r, flights: next };
                });
                setEditingFlightIdx(null);
                setShowAddFlight(false);
        };

        const handleDeleteFlight = (idx: number) => {
                updateResult(r => ({ ...r, flights: r.flights.filter((_, i) => i !== idx) }));
        };

        const handleAppendText = async () => {
                if (!addMoreText.trim() || !result) return;
                setAppendError('');
                setIsAppending(true);
                try {
                        const more = await parseFreeTextTrip(addMoreText, {
                                destination: initialData?.destination,
                                startDate: initialData?.startDate,
                                endDate: initialData?.endDate,
                                travelers: initialData?.travelers,
                        });
                        const merged = mergeFreeTextResults(result, more);
                        setResult(merged);
                        setAddMoreText('');
                        setShowAddMore(false);
                } catch (e: any) {
                        console.error('Append text failed:', e);
                        setAppendError(e?.message || 'לא הצלחנו לעבד את הטקסט הנוסף');
                } finally {
                        setIsAppending(false);
                }
        };

        const handleAppendFiles = async (files: File[]) => {
                if (!files.length || !result) return;
                setAppendError('');
                setIsAppending(true);
                try {
                        const more = await parseFilesToFreeText(files);
                        const merged = mergeFreeTextResults(result, more);
                        setResult(merged);
                        setShowAddMore(false);
                } catch (e: any) {
                        console.error('Append files failed:', e);
                        setAppendError(e?.message || 'לא הצלחנו לעבד את הקבצים');
                } finally {
                        setIsAppending(false);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                }
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
                                                                {/* Voice dictation — rendered only when the browser supports
                                                                     the Web Speech API. Appends finalised speech to the text
                                                                     buffer; interim results ignore so users aren't spammed. */}
                                                                <VoiceInputButton
                                                                        className="absolute top-3 left-3 w-10 h-10"
                                                                        onTranscript={(chunk, isFinal) => {
                                                                                if (!isFinal) return;
                                                                                setText((prev) => {
                                                                                        const trimmed = prev.trimEnd();
                                                                                        const sep = trimmed.length > 0 && !/[\s\.\,\!\?]$/.test(trimmed) ? ' ' : '';
                                                                                        return (trimmed + sep + chunk).slice(0, MAX_CHARS);
                                                                                });
                                                                        }}
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

                                                        {/* Action buttons — sticky */}
                                                        <div className="sticky bottom-0 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-between gap-3 z-20 shadow-[0_-8px_24px_rgba(0,0,0,0.04)]">
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
                                                                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-base shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all transform active:scale-95"
                                                                >
                                                                        <ClipboardPaste className="w-5 h-5" />
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
                                                                                        נמצאו {result?.hotels.length || 0} מלונות ו-{result?.flights.length || 0} טיסות. אפשר לערוך, למחוק או להוסיף לפני שממשיכים.
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
                                                        <div>
                                                                <div className="flex items-center justify-between mb-2 px-1">
                                                                        <div className="flex items-center gap-2">
                                                                                <HotelIcon className="w-4 h-4 text-indigo-500" />
                                                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">מלונות</span>
                                                                        </div>
                                                                        <button
                                                                                type="button"
                                                                                onClick={() => { setShowAddHotel(true); setEditingHotelId(null); }}
                                                                                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                                                        >
                                                                                <Plus className="w-3.5 h-3.5" />
                                                                                הוסף ידנית
                                                                        </button>
                                                                </div>
                                                                <div className="space-y-2">
                                                                        {result?.hotels.map((h) =>
                                                                                editingHotelId === h.id ? (
                                                                                        <HotelEditForm
                                                                                                key={h.id}
                                                                                                initial={h}
                                                                                                onSave={handleSaveHotel}
                                                                                                onCancel={() => setEditingHotelId(null)}
                                                                                        />
                                                                                ) : (
                                                                                        <div key={h.id} className="group bg-white rounded-xl border border-slate-200 hover:border-indigo-200 p-3 transition-colors">
                                                                                                <div className="flex items-start justify-between gap-3">
                                                                                                        <div className="min-w-0 flex-1">
                                                                                                                <div className="font-bold text-brand-navy truncate">{h.name || '(ללא שם)'}</div>
                                                                                                                <div className="text-xs text-slate-500 truncate">
                                                                                                                        {h.city || h.address || ''}
                                                                                                                        {h.confirmationCode && (
                                                                                                                                <span className="text-slate-400 font-mono"> · #{h.confirmationCode}</span>
                                                                                                                        )}
                                                                                                                </div>
                                                                                                        </div>
                                                                                                        <div className="text-xs text-slate-600 font-medium whitespace-nowrap pt-0.5">
                                                                                                                {formatHebrewDate(h.checkInDate)} → {formatHebrewDate(h.checkOutDate)}
                                                                                                        </div>
                                                                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                                                                                <button
                                                                                                                        type="button"
                                                                                                                        onClick={() => { setEditingHotelId(h.id); setShowAddHotel(false); }}
                                                                                                                        className="w-8 h-8 rounded-lg hover:bg-indigo-50 text-indigo-600 flex items-center justify-center"
                                                                                                                        title="ערוך"
                                                                                                                >
                                                                                                                        <Pencil className="w-4 h-4" />
                                                                                                                </button>
                                                                                                                <button
                                                                                                                        type="button"
                                                                                                                        onClick={() => handleDeleteHotel(h.id)}
                                                                                                                        className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center"
                                                                                                                        title="מחק"
                                                                                                                >
                                                                                                                        <Trash2 className="w-4 h-4" />
                                                                                                                </button>
                                                                                                        </div>
                                                                                                </div>

                                                                                                {/* Rooms detail */}
                                                                                                {h.rooms && h.rooms.length > 0 && (
                                                                                                        <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                                                                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                                                                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                                                                                                {h.rooms.length} {h.rooms.length === 1 ? 'חדר' : 'חדרים'}
                                                                                                                        </span>
                                                                                                                        <span className="text-[11px] text-slate-500">
                                                                                                                                {h.rooms.reduce((a, r) => a + (r.adults || 0), 0)} מבוגרים · {h.rooms.reduce((a, r) => a + (r.children || 0), 0)} ילדים
                                                                                                                        </span>
                                                                                                                </div>
                                                                                                                <ul className="space-y-1">
                                                                                                                        {h.rooms.map((r, idx) => (
                                                                                                                                <li key={r.id || idx} className="flex items-start gap-2 text-[11px]">
                                                                                                                                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{idx + 1}</span>
                                                                                                                                        <div className="flex-1 min-w-0">
                                                                                                                                                <span className="font-bold text-slate-700">{r.roomType || 'חדר'}</span>
                                                                                                                                                {r.label && <span className="text-slate-400"> · {r.label}</span>}
                                                                                                                                                <span className="text-slate-500"> · {r.adults || 0}+{r.children || 0}</span>
                                                                                                                                                {r.beds && <span className="text-slate-400"> · {r.beds}</span>}
                                                                                                                                                {r.notes && <span className="text-slate-400"> · {r.notes}</span>}
                                                                                                                                        </div>
                                                                                                                                </li>
                                                                                                                        ))}
                                                                                                                </ul>
                                                                                                        </div>
                                                                                                )}
                                                                                        </div>
                                                                                )
                                                                        )}
                                                                        {showAddHotel && (
                                                                                <HotelEditForm
                                                                                        initial={emptyHotel()}
                                                                                        onSave={handleSaveHotel}
                                                                                        onCancel={() => setShowAddHotel(false)}
                                                                                />
                                                                        )}
                                                                        {result?.hotels.length === 0 && !showAddHotel && (
                                                                                <div className="text-center text-sm text-slate-400 py-4">
                                                                                        לא נמצאו מלונות. אפשר להוסיף ידנית.
                                                                                </div>
                                                                        )}
                                                                </div>
                                                        </div>

                                                        {/* Flights list */}
                                                        <div>
                                                                <div className="flex items-center justify-between mb-2 px-1">
                                                                        <div className="flex items-center gap-2">
                                                                                <Plane className="w-4 h-4 text-indigo-500" />
                                                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">טיסות</span>
                                                                        </div>
                                                                        <button
                                                                                type="button"
                                                                                onClick={() => { setShowAddFlight(true); setEditingFlightIdx(null); }}
                                                                                className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                                                        >
                                                                                <Plus className="w-3.5 h-3.5" />
                                                                                הוסף ידנית
                                                                        </button>
                                                                </div>
                                                                <div className="space-y-2">
                                                                        {result?.flights.map((f, idx) =>
                                                                                editingFlightIdx === idx ? (
                                                                                        <FlightEditForm
                                                                                                key={`edit-${idx}`}
                                                                                                initial={f}
                                                                                                onSave={(next) => handleSaveFlight(next, idx)}
                                                                                                onCancel={() => setEditingFlightIdx(null)}
                                                                                        />
                                                                                ) : (
                                                                                        <div key={`${f.flightNumber}-${f.date}-${idx}`} className="group bg-white rounded-xl border border-slate-200 hover:border-indigo-200 p-3 flex items-center justify-between gap-3 transition-colors">
                                                                                                <div className="min-w-0 flex-1">
                                                                                                        <div className="font-bold text-brand-navy truncate">
                                                                                                                {f.airline || '(ללא חברה)'} {f.flightNumber}
                                                                                                        </div>
                                                                                                        <div className="text-xs text-slate-500 truncate">
                                                                                                                {f.fromCity || f.fromCode || '?'} → {f.toCity || f.toCode || '?'}
                                                                                                        </div>
                                                                                                </div>
                                                                                                <div className="text-xs text-slate-600 font-medium whitespace-nowrap">
                                                                                                        {formatHebrewDate(f.date)} {f.departureTime && `· ${f.departureTime}`}
                                                                                                </div>
                                                                                                <div className="flex items-center gap-1">
                                                                                                        <button
                                                                                                                type="button"
                                                                                                                onClick={() => { setEditingFlightIdx(idx); setShowAddFlight(false); }}
                                                                                                                className="w-8 h-8 rounded-lg hover:bg-indigo-50 text-indigo-600 flex items-center justify-center"
                                                                                                                title="ערוך"
                                                                                                        >
                                                                                                                <Pencil className="w-4 h-4" />
                                                                                                        </button>
                                                                                                        <button
                                                                                                                type="button"
                                                                                                                onClick={() => handleDeleteFlight(idx)}
                                                                                                                className="w-8 h-8 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center"
                                                                                                                title="מחק"
                                                                                                        >
                                                                                                                <Trash2 className="w-4 h-4" />
                                                                                                        </button>
                                                                                                </div>
                                                                                        </div>
                                                                                )
                                                                        )}
                                                                        {showAddFlight && (
                                                                                <FlightEditForm
                                                                                        initial={emptyFlight()}
                                                                                        onSave={(next) => handleSaveFlight(next, null)}
                                                                                        onCancel={() => setShowAddFlight(false)}
                                                                                />
                                                                        )}
                                                                        {result?.flights.length === 0 && !showAddFlight && (
                                                                                <div className="text-center text-sm text-slate-400 py-4">
                                                                                        לא נמצאו טיסות. אפשר להוסיף ידנית.
                                                                                </div>
                                                                        )}
                                                                </div>
                                                        </div>

                                                        {/* Add more from text / files */}
                                                        <div>
                                                                {!showAddMore ? (
                                                                        <button
                                                                                type="button"
                                                                                onClick={() => { setShowAddMore(true); setAppendError(''); }}
                                                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-300 hover:bg-indigo-50/30 text-slate-600 hover:text-indigo-700 font-bold text-sm transition-colors"
                                                                        >
                                                                                <Plus className="w-4 h-4" />
                                                                                הוסף עוד מידע (טקסט נוסף או קבצים)
                                                                        </button>
                                                                ) : (
                                                                        <div className="bg-white rounded-2xl border-2 border-indigo-200 p-4 space-y-3">
                                                                                <div className="flex items-center justify-between">
                                                                                        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                                                                                                <button
                                                                                                        type="button"
                                                                                                        onClick={() => setAddMoreTab('text')}
                                                                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${addMoreTab === 'text' ? 'bg-white shadow-sm text-brand-navy' : 'text-slate-500 hover:text-brand-navy'}`}
                                                                                                >
                                                                                                        <TextCursor className="w-3.5 h-3.5" />
                                                                                                        הדבק טקסט
                                                                                                </button>
                                                                                                <button
                                                                                                        type="button"
                                                                                                        onClick={() => setAddMoreTab('files')}
                                                                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${addMoreTab === 'files' ? 'bg-white shadow-sm text-brand-navy' : 'text-slate-500 hover:text-brand-navy'}`}
                                                                                                >
                                                                                                        <UploadCloud className="w-3.5 h-3.5" />
                                                                                                        העלה קבצים
                                                                                                </button>
                                                                                        </div>
                                                                                        <button
                                                                                                type="button"
                                                                                                onClick={() => { setShowAddMore(false); setAddMoreText(''); setAppendError(''); }}
                                                                                                className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 flex items-center justify-center"
                                                                                        >
                                                                                                <X className="w-4 h-4" />
                                                                                        </button>
                                                                                </div>

                                                                                {addMoreTab === 'text' ? (
                                                                                        <>
                                                                                                <textarea
                                                                                                        value={addMoreText}
                                                                                                        onChange={e => setAddMoreText(e.target.value)}
                                                                                                        placeholder="הדביקו כאן עוד טקסט – למשל מלון שלא זוהה, טיסת המשך, או תיקון לפרטים קיימים."
                                                                                                        maxLength={MAX_CHARS}
                                                                                                        dir="rtl"
                                                                                                        disabled={isAppending}
                                                                                                        className="w-full min-h-[140px] p-3 rounded-lg border border-slate-200 focus:border-indigo-400 focus:outline-none resize-y bg-white text-sm text-brand-navy placeholder:text-slate-400 disabled:opacity-60"
                                                                                                />
                                                                                                <div className="flex justify-end">
                                                                                                        <button
                                                                                                                type="button"
                                                                                                                onClick={handleAppendText}
                                                                                                                disabled={isAppending || !addMoreText.trim()}
                                                                                                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                                                        >
                                                                                                                {isAppending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                                                                                נתח והוסף
                                                                                                        </button>
                                                                                                </div>
                                                                                        </>
                                                                                ) : (
                                                                                        <div className="flex flex-col items-center justify-center gap-3 py-6 px-4 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                                                                                <UploadCloud className="w-8 h-8 text-indigo-500" />
                                                                                                <p className="text-sm text-slate-600 text-center">
                                                                                                        העלו PDF של הזמנה / אישור נוסף. ה-AI יחלץ ממנו את הנתונים וישלב עם מה שכבר זוהה.
                                                                                                </p>
                                                                                                <input
                                                                                                        ref={fileInputRef}
                                                                                                        type="file"
                                                                                                        accept=".pdf,image/*"
                                                                                                        multiple
                                                                                                        onChange={(e) => e.target.files && handleAppendFiles(Array.from(e.target.files))}
                                                                                                        className="sr-only"
                                                                                                        disabled={isAppending}
                                                                                                />
                                                                                                <button
                                                                                                        type="button"
                                                                                                        onClick={() => fileInputRef.current?.click()}
                                                                                                        disabled={isAppending}
                                                                                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-40"
                                                                                                >
                                                                                                        {isAppending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                                                                                                        {isAppending ? 'מעבד קבצים...' : 'בחר קבצים'}
                                                                                                </button>
                                                                                        </div>
                                                                                )}

                                                                                {appendError && (
                                                                                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
                                                                                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                                                                <span>{appendError}</span>
                                                                                        </div>
                                                                                )}
                                                                        </div>
                                                                )}
                                                        </div>

                                                        {/* Action buttons — sticky at the bottom so they're always reachable */}
                                                        <div className="sticky bottom-0 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-between gap-3 z-20 shadow-[0_-8px_24px_rgba(0,0,0,0.04)]">
                                                                <button
                                                                        type="button"
                                                                        onClick={handleEditText}
                                                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-slate-500 hover:text-brand-navy hover:bg-slate-100 font-bold text-sm transition-colors"
                                                                >
                                                                        ערוך טקסט מקור
                                                                </button>
                                                                <button
                                                                        type="button"
                                                                        onClick={handleConfirm}
                                                                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black text-base shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 transition-all transform active:scale-95"
                                                                >
                                                                        <Sparkles className="w-5 h-5" />
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
