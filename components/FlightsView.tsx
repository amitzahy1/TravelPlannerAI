import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trip, FlightSegment } from '../types';
import { Plane, FileText, FileImage, Download, UploadCloud, Clock, Calendar, ArrowRight, Briefcase, Edit2, X, Check, Lock, ShieldCheck, ChevronDown, Trash2, AlertTriangle } from 'lucide-react';
import { formatDateTime, formatDateOnly, parseFlightTime, calculateFlightDuration, parseDateToIso, formatFlightTime } from '../utils/dateUtils';
import { ConfirmModal } from './ConfirmModal';
import { localTimeAtAirportToUTC, AIRPORT_TIMEZONES } from '../utils/airportTimezones';
import { generateWithFallback } from '../services/aiService';
import { toast } from '../stores/useToastStore';
import { Sparkles } from 'lucide-react';

const formatDurationMs = (ms: number): string => {
  if (!isFinite(ms) || ms <= 0) return '';
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// Strip placeholder/unknown values the AI sometimes sets. Returns undefined for
// empty / "unknown" / "N/A" / "—" / "0h" so display code can simply skip them.
const clean = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const v = String(value).trim();
  if (!v) return undefined;
  const lower = v.toLowerCase();
  if (['unknown', 'n/a', 'tbd', 'tba', '—', '-', '---', '0h', '0h 0m', 'not specified', 'לא ידוע', 'לא צוין', 'לא צוין במקור'].includes(lower)) {
    return undefined;
  }
  return v;
};

// --- Assets & Helpers ---

const getAirlineLogo = (airlineName: string, flightNumber: string) => {
  const iata = flightNumber?.match(/^[A-Z0-9]{2}/i)?.[0] || airlineName.substring(0, 2);
  return `https://pics.avs.io/200/200/${iata.toUpperCase()}.png`;
};

// --- Edit Modal ---
interface EditFlightModalProps {
  segment: FlightSegment;
  onSave: (updated: FlightSegment) => void;
  onClose: () => void;
}

const EditFlightModal: React.FC<EditFlightModalProps> = ({ segment, onSave, onClose }) => {
  const [form, setForm] = useState({
    fromCity: segment.fromCity || '',
    fromCode: segment.fromCode || '',
    toCity: segment.toCity || '',
    toCode: segment.toCode || '',
    departureTime: parseFlightTime(segment.departureTime) || '',
    arrivalTime: parseFlightTime(segment.arrivalTime) || '',
    date: parseDateToIso(segment.date) || '',
    arrivalDate: parseDateToIso(segment.arrivalTime) || parseDateToIso(segment.date) || '', // Initialize Arrival Date
    airline: segment.airline || '',
    flightNumber: segment.flightNumber || '',
    duration: segment.duration || ''
  });

  const handleSave = () => {
    const updated: FlightSegment = {
      ...segment,
      fromCity: form.fromCity,
      fromCode: form.fromCode,
      toCity: form.toCity,
      toCode: form.toCode,
      departureTime: form.date && form.departureTime
        ? `${form.date}T${form.departureTime}:00`
        : form.departureTime,
      arrivalTime: form.arrivalDate && form.arrivalTime
        ? `${form.arrivalDate}T${form.arrivalTime}:00`
        : form.arrivalTime,
      date: form.date,
      airline: form.airline,
      flightNumber: form.flightNumber,
      duration: form.duration
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800">עריכת פרטי טיסה</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Airline & Flight Number */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">חברת תעופה</label>
              <input
                type="text"
                value={form.airline}
                onChange={e => setForm({ ...form, airline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">מספר טיסה</label>
              <input
                type="text"
                value={form.flightNumber}
                onChange={e => setForm({ ...form, flightNumber: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                dir="ltr"
              />
            </div>
          </div>

          {/* From */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">עיר מוצא</label>
              <input
                type="text"
                value={form.fromCity}
                onChange={e => setForm({ ...form, fromCity: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">קוד נמל (IATA)</label>
              <input
                type="text"
                value={form.fromCode}
                onChange={e => setForm({ ...form, fromCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase"
                dir="ltr"
                maxLength={3}
              />
            </div>
          </div>

          {/* To */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">עיר יעד</label>
              <input
                type="text"
                value={form.toCity}
                onChange={e => setForm({ ...form, toCity: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">קוד נמל (IATA)</label>
              <input
                type="text"
                value={form.toCode}
                onChange={e => setForm({ ...form, toCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono uppercase"
                dir="ltr"
                maxLength={3}
              />
            </div>
          </div>

          {/* Date & Times */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">תאריך המראה</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">שעת המראה</label>
              <input
                type="time"
                value={form.departureTime}
                onChange={e => setForm({ ...form, departureTime: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">תאריך נחיתה</label>
              <input
                type="date"
                value={form.arrivalDate}
                onChange={e => setForm({ ...form, arrivalDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">שעת נחיתה</label>
              <input
                type="time"
                value={form.arrivalTime}
                onChange={e => setForm({ ...form, arrivalTime: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Duration (optional override) */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">משך טיסה (אופציונלי, לדרוס חישוב)</label>
            <input
              type="text"
              value={form.duration}
              onChange={e => setForm({ ...form, duration: e.target.value })}
              placeholder="לדוגמא: 6h 30m"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              dir="ltr"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            שמירה
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Sub-components ---

const FlightRow: React.FC<{
  segment: FlightSegment;
  onEdit?: () => void;
  onDelete?: () => void;
  onApplyDuration?: (d: string) => void;
  isStale?: boolean;
}> = ({ segment, onEdit, onDelete, onApplyDuration, isStale }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAskingAi, setIsAskingAi] = useState(false);
  const logoUrl = getAirlineLogo(segment.airline, segment.flightNumber);

  const airline = clean(segment.airline);
  const flightNumber = clean(segment.flightNumber);
  const durationRaw = clean(segment.duration);

  const depTime = formatFlightTime(segment.departureTime);
  const arrTime = formatFlightTime(segment.arrivalTime);

  // Build full ISO strings so calculateFlightDuration works even when the
  // AI only gave us HH:MM times. Handles cross-midnight arrivals by
  // advancing the arrival date when arrTime < depTime.
  const buildIsoFromTime = (date?: string, hhmm?: string): string => {
    if (!date || !hhmm) return '';
    if (hhmm.includes('T')) return hhmm; // already ISO
    if (!/^\d{1,2}:\d{2}/.test(hhmm)) return '';
    const [h, m] = hhmm.split(':');
    return `${date}T${h.padStart(2, '0')}:${m.padStart(2, '0')}:00`;
  };

  // TZ-aware duration: convert local departure + arrival to true UTC via
  // IATA → IANA timezone map, then subtract. This fixes the "TLV 20:10 →
  // AUH 00:25 = 1h 15m" bug — without TZ correction the code was treating
  // both clock times as if they were UTC, losing the +4h offset TLV ↔ AUH.
  const computeTzAwareDuration = (): string | undefined => {
    const depDateStr = (segment.date || segment.departureTime?.split('T')?.[0] || '').slice(0, 10);
    const arrDateStr = segment.arrivalTime?.includes('T')
      ? segment.arrivalTime.split('T')[0]
      : depDateStr;
    if (!depDateStr || !depTime || !arrTime) return undefined;

    const depUtc = localTimeAtAirportToUTC(depDateStr, depTime, segment.fromCode);
    let arrUtc = localTimeAtAirportToUTC(arrDateStr, arrTime, segment.toCode);
    if (!depUtc || !arrUtc) return undefined;

    // If arrival falls before departure in UTC, the flight crossed midnight
    // (local clock arrival < local clock departure). Advance by 24 h.
    if (arrUtc.getTime() <= depUtc.getTime()) {
      arrUtc = new Date(arrUtc.getTime() + 24 * 60 * 60 * 1000);
    }
    const ms = arrUtc.getTime() - depUtc.getTime();
    // Guardrail: real scheduled flights are between ~20 min and ~20 h.
    if (ms < 15 * 60 * 1000 || ms > 22 * 60 * 60 * 1000) return undefined;
    return formatDurationMs(ms);
  };

  const depIsoForDuration = segment.departureTime?.includes('T')
    ? segment.departureTime
    : buildIsoFromTime(segment.date, depTime);

  const arrIsoForDuration = (() => {
    if (segment.arrivalTime?.includes('T')) return segment.arrivalTime;
    const baseIso = buildIsoFromTime(segment.date, arrTime);
    if (!baseIso || !depIsoForDuration) return baseIso;
    if (new Date(baseIso).getTime() < new Date(depIsoForDuration).getTime()) {
      // Arrival is the next day (e.g. dep 20:10, arr 00:25)
      const d = new Date(baseIso);
      d.setDate(d.getDate() + 1);
      return d.toISOString().replace('Z', '');
    }
    return baseIso;
  })();

  // Priority order: (1) user-saved duration, (2) TZ-aware calculation from
  // IATA codes, (3) naive fallback for flights without known airports.
  const duration = durationRaw
    || computeTzAwareDuration()
    || calculateFlightDuration(depIsoForDuration, arrIsoForDuration)
    || undefined;

  const depDateObj = (() => {
    try {
      const d = segment.departureTime?.includes('T') ? new Date(segment.departureTime) : segment.date ? new Date(segment.date) : null;
      return (d && !isNaN(d.getTime())) ? d : null;
    } catch { return null; }
  })();

  const arrDateObj = (() => {
    try {
      const d = segment.arrivalTime?.includes('T') ? new Date(segment.arrivalTime) : segment.date ? new Date(segment.date) : null;
      return (d && !isNaN(d.getTime())) ? d : null;
    } catch { return null; }
  })();

  // Hebrew full date — the HERO of the card (e.g. "יום חמישי, 6 באוגוסט 2026")
  const heroDate = depDateObj?.toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) || '';
  const arrDateShort = arrDateObj?.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) || '';

  // +1 / +2 day arrival detection
  const dayDiff = depDateObj && arrDateObj
    ? Math.round((arrDateObj.setHours(12) - depDateObj.setHours(12)) / 86400000)
    : 0;

  const statusConfig = {
    ON_TIME:   { label: 'בזמן',   cls: 'bg-emerald-100 text-emerald-700' },
    DELAYED:   { label: 'מאחר',   cls: 'bg-amber-100 text-amber-700' },
    CANCELLED: { label: 'בוטל',   cls: 'bg-red-100 text-red-700' },
    SCHEDULED: { label: 'מתוכנן', cls: 'bg-sky-100 text-sky-700' },
  };

  const fromLabel = segment.fromCity || segment.fromCode;
  const toLabel = segment.toCity || segment.toCode;

  return (
    <div className={`group/row ${isStale ? 'opacity-70' : ''}`}>
      {/* ── Main row — date is the hero ── */}
      <div
        className={`px-4 sm:px-5 py-4 cursor-pointer select-none transition-colors ${isStale ? 'bg-amber-50/70 hover:bg-amber-50' : 'hover:bg-slate-50/50'}`}
        onClick={() => setIsExpanded(v => !v)}
      >
        {/* Row 1 — hero date + actions */}
        <div className="flex items-center justify-between gap-3 mb-3" dir="rtl">
          <div className="min-w-0 flex-1">
            <div className="text-lg sm:text-xl font-black text-slate-900 leading-tight truncate">
              {heroDate || 'תאריך לא זמין'}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {airline && <span className="text-xs font-bold text-slate-500">{airline}</span>}
              {flightNumber && <span className="text-xs font-mono font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">{flightNumber}</span>}
              {segment.status && segment.status !== 'SCHEDULED' && (
                <span className={`text-2xs font-black px-2 py-0.5 rounded-md ${statusConfig[segment.status]?.cls || 'bg-slate-100 text-slate-600'}`}>
                  {statusConfig[segment.status]?.label}
                </span>
              )}
              {isStale && (
                <span className="inline-flex items-center gap-1 bg-amber-200 text-amber-800 text-2xs font-bold px-2 py-0.5 rounded-md">
                  <AlertTriangle className="w-3 h-3" /> Old
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onEdit && (
              <button
                onClick={e => { e.stopPropagation(); onEdit(); }}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                title="ערוך טיסה"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(); }}
                className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600"
                title="מחק טיסה"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <ChevronDown className={`w-4 h-4 text-slate-300 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </div>
        </div>

        {/* Row 2 — boarding-pass route strip (dir=ltr for natural time→time read) */}
        <div dir="ltr" className="relative flex items-center gap-3 bg-gradient-to-l from-slate-50 to-white rounded-2xl p-3 border border-slate-100">
          {/* Left accent strip (boarding-pass feel) */}
          <span aria-hidden className="absolute left-0 top-3 bottom-3 w-1 rounded-pill bg-gradient-to-b from-blue-500 to-sky-400" />

          <div className="w-10 h-10 rounded-xl border border-slate-100 bg-white shadow-card overflow-hidden flex items-center justify-center p-0.5 shrink-0 ml-1">
            <img src={logoUrl} alt={airline || 'airline'}
              onError={e => (e.currentTarget.style.display = 'none')}
              loading="lazy" decoding="async"
              className="w-full h-full object-contain" />
          </div>

          {/* Departure */}
          <div className="shrink-0 text-left min-w-0" style={{ minWidth: '76px' }}>
            <div className="text-2xl font-black text-slate-900 leading-none tracking-[0.04em] font-mono tabular-nums">{segment.fromCode || '—'}</div>
            <div className="text-xs font-bold text-slate-600 leading-none mt-1 font-mono tabular-nums">{depTime || '—'}</div>
            <div className="text-2xs text-slate-400 mt-0.5 truncate max-w-[90px]">{fromLabel}</div>
          </div>

          {/* Timeline */}
          <div className="grow flex flex-col items-center min-w-[44px]">
            {duration ? (
              <span className="text-2xs font-bold text-slate-500 mb-1 whitespace-nowrap bg-white px-1.5 py-0.5 rounded-pill border border-slate-100 shadow-card">
                {duration}
              </span>
            ) : onApplyDuration ? (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (isAskingAi) return;
                  setIsAskingAi(true);
                  try {
                    const prompt = `Flight ${airline || ''} ${flightNumber || ''} from ${fromLabel || segment.fromCode} (${segment.fromCode || ''}) to ${toLabel || segment.toCode} (${segment.toCode || ''}). Reply ONLY with the typical scheduled block-time duration in the format "Xh Ym" (e.g. "6h 25m"). No other words, no punctuation.`;
                    const res = await generateWithFallback(
                      null,
                      [{ role: 'user', parts: [{ text: prompt }] }],
                      { temperature: 0.1 },
                      'FAST'
                    );
                    const raw = (res.text || '').trim();
                    const match = raw.match(/(\d{1,2})\s*h(?:\s*(\d{1,2}))?\s*m?|(\d{1,2})\s*m/i);
                    let normalized = '';
                    if (match) {
                      const h = parseInt(match[1] || '0', 10);
                      const m = parseInt(match[2] || match[3] || '0', 10);
                      normalized = h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
                    } else if (/^\d+h\s*\d+m$/i.test(raw)) {
                      normalized = raw;
                    }
                    if (!normalized) {
                      toast.error('לא הצלחנו לקבל משך טיסה. נסי לערוך ידנית.', 4000);
                      return;
                    }
                    onApplyDuration(normalized);
                    toast.success(`✓ משך הטיסה נקבע: ${normalized}`, 2500);
                  } catch (err) {
                    console.error('AI duration failed', err);
                    toast.error('שגיאה בבדיקת משך הטיסה');
                  } finally {
                    setIsAskingAi(false);
                  }
                }}
                title="בדיקת משך טיסה עם AI"
                aria-label="בדיקת משך טיסה עם AI"
                disabled={isAskingAi}
                className="text-2xs font-bold mb-1 whitespace-nowrap bg-blue-50 text-blue-700 px-2 py-0.5 rounded-pill border border-blue-200 hover:bg-blue-100 active:scale-95 transition-all flex items-center gap-1 disabled:opacity-60"
              >
                <Sparkles className={`w-2.5 h-2.5 ${isAskingAi ? 'animate-pulse' : ''}`} aria-hidden="true" />
                {isAskingAi ? 'מחשב…' : 'משך עם AI'}
              </button>
            ) : null}
            <div className="w-full flex items-center gap-0.5">
              <div className="flex-1 border-t-2 border-dashed border-slate-300" />
              <Plane className="w-3.5 h-3.5 text-blue-500 -scale-x-100 shrink-0" aria-hidden="true" />
              <div className="flex-1 border-t-2 border-dashed border-slate-300" />
            </div>
          </div>

          {/* Arrival */}
          <div className="shrink-0 text-right min-w-0" style={{ minWidth: '76px' }}>
            <div className="text-2xl font-black text-slate-900 leading-none tracking-[0.04em] font-mono tabular-nums inline-flex items-start gap-0.5 justify-end">
              {segment.toCode || '—'}
              {dayDiff > 0 && <span className="text-2xs font-black text-orange-500 mt-0.5">+{dayDiff}</span>}
            </div>
            <div className="text-xs font-bold text-slate-600 leading-none mt-1 font-mono tabular-nums">{arrTime || '—'}</div>
            <div className="text-2xs text-slate-400 mt-0.5 truncate max-w-[90px]">{toLabel}</div>
          </div>
        </div>

        {/* Row 3 — inline chips showing extra details (always visible when populated) */}
        {(segment.class || segment.seat || segment.baggage || segment.terminal || segment.mealPlan || segment.price) && (
          <div dir="rtl" className="flex flex-wrap gap-1.5 mt-3">
            {clean(segment.class) && (
              <span className="text-2xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 inline-flex items-center gap-1">
                <Lock className="w-3 h-3" /> {segment.class}
              </span>
            )}
            {clean(segment.seat) && (
              <span className="text-2xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">💺 {segment.seat}</span>
            )}
            {clean(segment.baggage) && (
              <span className="text-2xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                <Briefcase className="w-3 h-3" /> {segment.baggage}
              </span>
            )}
            {clean(segment.terminal) && (
              <span className="text-2xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">טרמינל {segment.terminal}</span>
            )}
            {clean(segment.mealPlan) && (
              <span className="text-2xs font-bold bg-orange-50 text-orange-700 px-2 py-0.5 rounded-md border border-orange-100">🍽 {segment.mealPlan}</span>
            )}
            {segment.price != null && segment.price > 0 && (
              <span className="text-2xs font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">
                ${Number(segment.price).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Expanded details panel — deep details like gate/cancellation policy ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-3 bg-slate-50/60 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-2 gap-3" dir="ltr">
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <div className="text-2xs font-bold text-slate-400 uppercase mb-1">מוצא</div>
                  <div className="text-sm font-black text-slate-800">{fromLabel}</div>
                  {segment.fromCode && <div className="text-xs font-mono text-slate-400">{segment.fromCode}</div>}
                  {arrDateShort && depDateObj && (
                    <div className="text-2xs text-slate-400 mt-1">{depDateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  )}
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <div className="text-2xs font-bold text-slate-400 uppercase mb-1">יעד</div>
                  <div className="text-sm font-black text-slate-800">{toLabel}</div>
                  {segment.toCode && <div className="text-xs font-mono text-slate-400">{segment.toCode}</div>}
                  {arrDateShort && arrDateObj && (
                    <div className="text-2xs text-slate-400 mt-1">{arrDateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}{dayDiff > 0 && ` (+${dayDiff})`}</div>
                  )}
                </div>
              </div>

              {clean(segment.gate) && (
                <div className="bg-white rounded-xl p-3 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">גייט</span>
                  <span className="text-sm font-black text-slate-800 font-mono">{segment.gate}</span>
                </div>
              )}

              {clean(segment.cancellationPolicy) && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-start gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-red-700">{segment.cancellationPolicy}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Detect the "expected year" of the trip from trip.dates or flight segments
const getTripYear = (trip: Trip): number | null => {
  if (trip.dates) {
    const m = trip.dates.match(/\b(20\d{2})\b/);
    if (m) return parseInt(m[1]);
  }
  // Fallback: majority year among segments
  const years: number[] = [];
  trip.flights?.segments?.forEach(seg => {
    const y = seg.date?.match(/^(\d{4})/)?.[1] || seg.departureTime?.match(/^(\d{4})/)?.[1];
    if (y) years.push(parseInt(y));
  });
  if (years.length === 0) return null;
  const freq: Record<number, number> = {};
  years.forEach(y => (freq[y] = (freq[y] || 0) + 1));
  return parseInt(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0]);
};

export const FlightsView: React.FC<{ trip: Trip, onUpdateTrip?: (t: Trip) => void }> = ({ trip, onUpdateTrip }) => {
  const { flights, documents } = trip;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  const tripYear = getTripYear(trip);

  const isSegmentStale = (seg: FlightSegment): boolean => {
    if (!tripYear) return false;
    const y = seg.date?.match(/^(\d{4})/)?.[1] || seg.departureTime?.match(/^(\d{4})/)?.[1];
    return !!y && parseInt(y) !== tripYear;
  };

  const activeSegments = flights.segments.filter(seg => !isSegmentStale(seg));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onUpdateTrip) {
      const newDocs = Array.from(e.target.files).map((f: File) => f.name);
      const updatedTrip = { ...trip, documents: [...(trip.documents || []), ...newDocs] };
      onUpdateTrip(updatedTrip);
    }
  };

  const handleSaveSegment = (index: number, updatedSegment: FlightSegment) => {
    if (!onUpdateTrip) return;
    const newSegments = [...flights.segments];
    newSegments[index] = updatedSegment;
    onUpdateTrip({ ...trip, flights: { ...trip.flights, segments: newSegments } });
    setEditingIndex(null);
  };

  const handleDeleteSegment = (index: number) => {
    if (!onUpdateTrip) return;
    const newSegments = flights.segments.filter((_, i) => i !== index);
    onUpdateTrip({ ...trip, flights: { ...trip.flights, segments: newSegments } });
    setDeletingIndex(null);
  };

  const handleApplyDuration = (index: number, duration: string) => {
    if (!onUpdateTrip) return;
    const newSegments = [...flights.segments];
    newSegments[index] = { ...newSegments[index], duration };
    onUpdateTrip({ ...trip, flights: { ...trip.flights, segments: newSegments } });
  };

  const flightToDelete = deletingIndex !== null ? flights.segments[deletingIndex] : null;

  return (
    <div className="space-y-12 animate-fade-in pb-20">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
            <span className="bg-blue-100 p-2 rounded-xl text-blue-600 shadow-sm flex-shrink-0"><Plane className="w-6 h-6 md:w-7 md:h-7" /></span>
            הטיסות שלי
          </h2>
          <p className="text-slate-400 text-sm font-medium mt-0.5 mr-14">{activeSegments.length} {activeSegments.length === 1 ? 'טיסה' : 'טיסות'}</p>
        </div>
        {(flights.pnr || (flights.passengers && flights.passengers.length > 0)) && (
          <div dir="ltr" className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm">
            {flights.pnr && (
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">מספר הזמנה</div>
                <div className="text-lg font-mono font-black text-slate-800 tracking-widest">{flights.pnr}</div>
              </div>
            )}
            {flights.passengers && flights.passengers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-l border-slate-100 pl-3">
                {flights.passengers.map((p, idx) => (
                  <span key={idx} className="bg-blue-50 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">{p}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Flight Segments List */}
      <section>
        {activeSegments.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {activeSegments.map((seg, i) => {
              // find real index in flights.segments for edit/delete handlers
              const realIndex = flights.segments.indexOf(seg);
              const isMissingData = !seg.departureTime || !seg.arrivalTime || seg.departureTime === 'INVALID DATE';
              return (
                <div key={i}>
                  {isMissingData && onUpdateTrip && (
                    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-amber-800">חסרים פרטי טיסה חיוניים</span>
                      </div>
                      <button onClick={() => setEditingIndex(realIndex)} className="text-xs bg-amber-200 text-amber-900 px-3 py-1 rounded-lg font-bold hover:bg-amber-300 transition-colors">השלם פרטים</button>
                    </div>
                  )}
                  <FlightRow
                    segment={seg}
                    onEdit={onUpdateTrip ? () => setEditingIndex(realIndex) : undefined}
                    onDelete={onUpdateTrip ? () => setDeletingIndex(realIndex) : undefined}
                    onApplyDuration={onUpdateTrip ? (d) => handleApplyDuration(realIndex, d) : undefined}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center p-16 bg-white rounded-3xl shadow-sm border border-slate-200">
            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plane className="w-10 h-10 text-blue-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">טרם נוספו טיסות</h3>
            <p className="text-slate-500 mb-8">הוסף את פרטי הטיסה שלך דרך מסך הניהול או יבא קובץ PDF.</p>
          </div>
        )}
      </section>

      {/* Documents Section */}
      <section className="max-w-6xl mx-auto pt-8 border-t border-slate-100">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-800">מסמכים מצורפים</h2>
            <p className="text-slate-500 text-sm">כרטיסי טיסה, דרכונים, אישורי הזמנה וקבלות</p>
          </div>
          {onUpdateTrip && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
            >
              <UploadCloud className="w-4 h-4" /> העלה קובץ
            </button>
          )}
          <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
        </div>

        {/* Privacy Notice Banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
          <div className="bg-white p-1.5 rounded-full shadow-sm text-blue-600 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-blue-900">הגנת פרטיות מופעלת</h4>
            <p className="text-xs text-blue-700 mt-1">
              המסמכים שלך נשמרים בצורה מאובטחת ומקומית. לצורך הגנה על המידע האישי שלך, לא ניתן לפתוח את המסמכים ישירות מהממשק.
              הם משמשים את ה-AI לניתוח הנתונים בלבד.
            </p>
          </div>
        </div>

        {documents && documents.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {documents.map((doc, idx) => {
              const isPdf = doc.toLowerCase().endsWith('.pdf');
              const isImage = doc.match(/\.(jpg|jpeg|png|webp)$/i);

              return (
                <div key={idx} className="group relative bg-white border border-slate-200 rounded-2xl p-3 aspect-[4/5] flex flex-col items-center justify-center text-center overflow-hidden opacity-90 hover:opacity-100 transition-opacity">
                  {isImage ? (
                    <div className="absolute inset-0 bg-slate-100">
                      <img src="https://via.placeholder.com/300?text=Protected" alt="Protected Document" className="w-full h-full object-cover blur-sm opacity-50" />
                      <div className="absolute inset-0 bg-slate-100/50"></div>
                    </div>
                  ) : (
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm z-10 ${isPdf ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                      {isPdf ? <FileText className="w-8 h-8" /> : <FileImage className="w-8 h-8" />}
                    </div>
                  )}

                  <div className="relative z-10 w-full px-2">
                    <div className={`text-xs font-bold truncate w-full ${isImage ? 'text-white drop-shadow-md' : 'text-slate-700'}`}>{doc}</div>
                    <div className={`text-2xs font-medium uppercase mt-1 ${isImage ? 'text-white/80' : 'text-slate-400'}`}>{isPdf ? 'PDF DOC' : 'IMAGE'}</div>
                  </div>

                  {/* Actions - Locked */}
                  <div className="absolute top-2 right-2 z-20">
                    <div className="bg-slate-100/80 backdrop-blur text-slate-400 rounded-full p-1.5 shadow-sm" title="קובץ מוגן">
                      <Lock className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-3 border-dashed border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-blue-50/50 rounded-3xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer group min-h-[200px]"
          >
            <div className="bg-white p-4 rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-8 h-8 text-blue-400" />
            </div>
            <span className="text-slate-400 font-bold group-hover:text-blue-500 transition-colors">לחץ כאן להוספת קבצים</span>
          </div>
        )}
      </section>

      {/* Edit Modal */}
      {editingIndex !== null && flights.segments[editingIndex] && (
        <EditFlightModal
          segment={flights.segments[editingIndex]}
          onSave={(updated) => handleSaveSegment(editingIndex, updated)}
          onClose={() => setEditingIndex(null)}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deletingIndex !== null}
        title="למחוק את הטיסה?"
        message={
          flightToDelete
            ? `טיסת ${clean(flightToDelete.airline) || ''} ${clean(flightToDelete.flightNumber) || ''} מ-${flightToDelete.fromCode || flightToDelete.fromCity || '?'} ל-${flightToDelete.toCode || flightToDelete.toCity || '?'} תימחק לצמיתות. לא ניתן לבטל את הפעולה.`
            : 'הטיסה תימחק לצמיתות. לא ניתן לבטל את הפעולה.'
        }
        confirmText="מחק טיסה"
        cancelText="ביטול"
        isDangerous
        onConfirm={() => deletingIndex !== null && handleDeleteSegment(deletingIndex)}
        onClose={() => setDeletingIndex(null)}
      />
    </div>
  );
};