import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Copy, Check, Hotel, Plane, Trash2, Plus, ChevronDown, ExternalLink, Sparkles, ArrowLeft } from 'lucide-react';
import { Trip } from '../types';
import { MAILBOX_FORWARD_ADDRESS, gmailComposeUrl, isMailboxTrip, claimMailboxTrip, mergeTripIntoTarget } from '../utils/mailbox';

interface MailboxProps {
        trips: Trip[];
        /** All trips (including non-mailbox) — used as merge targets. */
        onMergeIntoTrip: (sourceId: string, targetId: string) => void | Promise<void>;
        /** Promote a mailbox trip to a regular standalone trip. */
        onClaimAsTrip: (tripId: string) => void | Promise<void>;
        onDeleteTrip: (tripId: string) => void | Promise<void>;
        onOpenTrip: (tripId: string) => void;
        onClose?: () => void;
        /** Render in compact wizard mode (used by Step3_Mailbox). */
        variant?: 'panel' | 'wizard';
        title?: string;
}

const formatRelative = (raw?: string): string => {
        if (!raw) return '';
        const d = new Date(raw);
        if (isNaN(d.getTime())) return raw;
        return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const summarizeTrip = (t: Trip): { icon: React.ReactNode; title: string; subtitle: string } => {
        const hotelCount = t.hotels?.length || 0;
        const flightCount = t.flights?.segments?.length || 0;
        const firstHotel = t.hotels?.[0]?.name;
        const firstFlight = t.flights?.segments?.[0];
        if (hotelCount > 0) {
                return {
                        icon: <Hotel className="w-4 h-4" />,
                        title: firstHotel || 'מלון מתוך אישור הזמנה',
                        subtitle: `${hotelCount} מלונות${flightCount ? ` · ${flightCount} טיסות` : ''}${t.dates ? ` · ${t.dates}` : ''}`,
                };
        }
        if (flightCount > 0) {
                return {
                        icon: <Plane className="w-4 h-4" />,
                        title: `${firstFlight?.fromCode || ''} → ${firstFlight?.toCode || ''}`,
                        subtitle: `${flightCount} טיסות${t.dates ? ` · ${t.dates}` : ''}`,
                };
        }
        return {
                icon: <Mail className="w-4 h-4" />,
                title: t.name || 'מייל ללא תוכן מובנה',
                subtitle: t.destination || t.dates || '',
        };
};

export const Mailbox: React.FC<MailboxProps> = ({
        trips,
        onMergeIntoTrip,
        onClaimAsTrip,
        onDeleteTrip,
        onOpenTrip,
        onClose,
        variant = 'panel',
        title = 'תיבת הדואר שלי',
}) => {
        const mailboxTrips = useMemo(() => trips.filter(isMailboxTrip), [trips]);
        const targetTrips = useMemo(() => trips.filter(t => !isMailboxTrip(t)), [trips]);
        const [copied, setCopied] = useState(false);
        const [mergeForId, setMergeForId] = useState<string | null>(null);
        const [helpOpen, setHelpOpen] = useState(false);

        const handleCopy = async () => {
                try {
                        await navigator.clipboard.writeText(MAILBOX_FORWARD_ADDRESS);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                } catch {
                        // ignore — some mobile browsers block clipboard without user gesture
                }
        };

        return (
                <div className="flex flex-col h-full bg-white" dir="rtl">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                                                <Mail className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                                <h2 className="font-black text-brand-navy text-lg leading-none truncate">{title}</h2>
                                                <p className="text-xs text-slate-400 mt-1">
                                                        {mailboxTrips.length > 0
                                                                ? `${mailboxTrips.length} פריטים מהמייל`
                                                                : 'מאזין למיילים…'}
                                                </p>
                                        </div>
                                </div>
                                {onClose && (
                                        <button
                                                onClick={onClose}
                                                aria-label="סגור"
                                                className="shrink-0 w-9 h-9 rounded-pill hover:bg-slate-100 text-slate-400 hover:text-brand-navy transition-colors flex items-center justify-center"
                                        >
                                                <X className="w-5 h-5" />
                                        </button>
                                )}
                        </div>

                        {/* Forwarding address card — always visible */}
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                                <div className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
                                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                                                <Sparkles className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0 text-right">
                                                <div className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-0.5">העבר לכתובת</div>
                                                <code className="block font-mono text-sm font-bold text-brand-navy truncate text-left" dir="ltr">
                                                        {MAILBOX_FORWARD_ADDRESS}
                                                </code>
                                        </div>
                                        <button
                                                onClick={handleCopy}
                                                className="shrink-0 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow shadow-emerald-500/30"
                                                aria-label="העתק כתובת"
                                        >
                                                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                                {copied ? 'הועתק' : 'העתק'}
                                        </button>
                                </div>

                                <div className="flex gap-2 mt-2">
                                        <a
                                                href={gmailComposeUrl()}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
                                        >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                פתח Gmail
                                        </a>
                                        <button
                                                onClick={() => setHelpOpen(o => !o)}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                                        >
                                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${helpOpen ? 'rotate-180' : ''}`} />
                                                איך מעבירים?
                                        </button>
                                </div>

                                <AnimatePresence>
                                        {helpOpen && (
                                                <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="overflow-hidden"
                                                >
                                                        <ol className="list-decimal pr-5 mt-3 text-xs text-slate-600 space-y-1.5">
                                                                <li>פתח את אישור ההזמנה ב-Gmail (Booking, Airbnb, חברת תעופה…).</li>
                                                                <li>לחץ על האייקון השלוש-נקודות → <strong>Forward</strong> (העברה).</li>
                                                                <li>הדבק את הכתובת שלמעלה ושלח.</li>
                                                                <li>תוך כדקה תראה כאן את ההזמנה — ה-AI ינתח אותה אוטומטית.</li>
                                                        </ol>
                                                        <p className="text-2xs text-slate-400 mt-2">
                                                                💡 טיפ: צור פילטר ב-Gmail שיעביר אוטומטית כל מייל מ-booking.com / airbnb.com / skyscanner.com.
                                                        </p>
                                                </motion.div>
                                        )}
                                </AnimatePresence>
                        </div>

                        {/* Items list */}
                        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                                {mailboxTrips.length === 0 ? (
                                        <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center px-6 py-10">
                                                <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                                                        <Mail className="w-7 h-7 text-emerald-500" />
                                                </div>
                                                <div className="font-black text-brand-navy text-base mb-1">עדיין אין מיילים</div>
                                                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                                                        העבר אישור הזמנה לכתובת שלמעלה — כשהוא יגיע, נציג אותו כאן וניתן לבנות ממנו טיול בלחיצה.
                                                </p>
                                                <div className="flex items-center gap-2 mt-4 text-2xs text-emerald-700 font-bold">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                        מאזין למיילים בזמן אמת
                                                </div>
                                        </div>
                                ) : (
                                        <AnimatePresence>
                                                {mailboxTrips.map((trip) => {
                                                        const summary = summarizeTrip(trip);
                                                        const isMerging = mergeForId === trip.id;
                                                        return (
                                                                <motion.div
                                                                        key={trip.id}
                                                                        initial={{ opacity: 0, y: 6 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, x: 30 }}
                                                                        className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm"
                                                                >
                                                                        <div className="flex items-start gap-3">
                                                                                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                                                                                        {summary.icon}
                                                                                </div>
                                                                                <div className="flex-1 min-w-0 text-right">
                                                                                        <div className="font-bold text-brand-navy text-sm truncate">{summary.title}</div>
                                                                                        <div className="text-2xs text-slate-400 mt-0.5 truncate">{summary.subtitle}</div>
                                                                                </div>
                                                                        </div>

                                                                        {!isMerging ? (
                                                                                <div className="grid grid-cols-3 gap-1.5 mt-3">
                                                                                        <button
                                                                                                onClick={() => { onClaimAsTrip(trip.id); onOpenTrip(trip.id); onClose?.(); }}
                                                                                                className="px-2 py-2 rounded-lg bg-emerald-600 text-white text-2xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1 min-h-[36px]"
                                                                                        >
                                                                                                <Plus className="w-3 h-3" />
                                                                                                בנה טיול
                                                                                        </button>
                                                                                        <button
                                                                                                onClick={() => setMergeForId(trip.id)}
                                                                                                disabled={targetTrips.length === 0}
                                                                                                className="px-2 py-2 rounded-lg bg-slate-100 text-slate-700 text-2xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 min-h-[36px]"
                                                                                        >
                                                                                                <ArrowLeft className="w-3 h-3" />
                                                                                                מזג לטיול
                                                                                        </button>
                                                                                        <button
                                                                                                onClick={() => onDeleteTrip(trip.id)}
                                                                                                className="px-2 py-2 rounded-lg bg-rose-50 text-rose-700 text-2xs font-bold hover:bg-rose-100 transition-colors flex items-center justify-center gap-1 min-h-[36px]"
                                                                                                aria-label="מחק"
                                                                                        >
                                                                                                <Trash2 className="w-3 h-3" />
                                                                                                מחק
                                                                                        </button>
                                                                                </div>
                                                                        ) : (
                                                                                <div className="mt-3 bg-slate-50 rounded-xl p-2">
                                                                                        <div className="text-2xs font-bold text-slate-500 mb-2 px-1">בחר טיול לאיחוד:</div>
                                                                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                                                                                {targetTrips.map((target) => (
                                                                                                        <button
                                                                                                                key={target.id}
                                                                                                                onClick={async () => {
                                                                                                                        await onMergeIntoTrip(trip.id, target.id);
                                                                                                                        setMergeForId(null);
                                                                                                                }}
                                                                                                                className="w-full text-right px-3 py-2 rounded-lg bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-xs font-bold text-slate-700 transition-colors flex items-center justify-between gap-2"
                                                                                                        >
                                                                                                                <span className="truncate flex-1">{target.name}</span>
                                                                                                                <span className="text-2xs text-slate-400 truncate shrink-0">{target.dates}</span>
                                                                                                        </button>
                                                                                                ))}
                                                                                        </div>
                                                                                        <button
                                                                                                onClick={() => setMergeForId(null)}
                                                                                                className="w-full mt-2 px-3 py-1.5 rounded-lg text-2xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                                                                                        >
                                                                                                ביטול
                                                                                        </button>
                                                                                </div>
                                                                        )}
                                                                </motion.div>
                                                        );
                                                })}
                                        </AnimatePresence>
                                )}
                        </div>

                        {variant === 'wizard' && mailboxTrips.length > 0 && (
                                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/60 text-2xs text-slate-500 text-center">
                                        בחר פריט כדי לבנות טיול, או הוסף עוד מיילים — הם יופיעו כאן בזמן אמת.
                                </div>
                        )}
                </div>
        );
};
