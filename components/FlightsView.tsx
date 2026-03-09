import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trip, FlightSegment } from '../types';
import { Plane, FileText, FileImage, Download, UploadCloud, Clock, Calendar, ArrowRight, Briefcase, Edit2, X, Check, Lock, ShieldCheck, ChevronDown, Trash2, AlertTriangle } from 'lucide-react';
import { formatDateTime, formatDateOnly, parseFlightTime, calculateFlightDuration, parseDateToIso, formatFlightTime } from '../utils/dateUtils';

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

const FlightRow: React.FC<{ segment: FlightSegment; onEdit?: () => void; onDelete?: () => void; isStale?: boolean }> = ({ segment, onEdit, onDelete, isStale }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const logoUrl = getAirlineLogo(segment.airline, segment.flightNumber);

  const durationDisplay = (segment.duration && segment.duration !== '0h' && segment.duration !== '0h 0m')
    ? segment.duration
    : calculateFlightDuration(segment.departureTime || '', segment.arrivalTime || '');

  const depTime = formatFlightTime(segment.departureTime);
  const arrTime = formatFlightTime(segment.arrivalTime);

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

  const depDateShort = depDateObj?.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) || '';
  const depYear = depDateObj?.getFullYear();
  const arrDateShort = arrDateObj?.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) || '';

  // detect +1 or +2 day arrival
  const dayDiff = depDateObj && arrDateObj
    ? Math.round((arrDateObj.setHours(12) - depDateObj.setHours(12)) / 86400000)
    : 0;

  const statusConfig = {
    ON_TIME:   { label: 'בזמן',   cls: 'bg-emerald-100 text-emerald-700' },
    DELAYED:   { label: 'מאחר',   cls: 'bg-amber-100 text-amber-700' },
    CANCELLED: { label: 'בוטל',   cls: 'bg-red-100 text-red-700' },
    SCHEDULED: { label: 'מתוכנן', cls: 'bg-sky-100 text-sky-700' },
  };

  return (
    <div className={`group/row ${isStale ? 'opacity-70' : ''}`}>
      {/* ── Main row — dir=ltr for clean left→right reading ── */}
      <div
        dir="ltr"
        className={`flex items-center gap-4 px-5 py-4 cursor-pointer select-none transition-colors ${isStale ? 'bg-amber-50/70 hover:bg-amber-50' : 'hover:bg-slate-50/50'}`}
        onClick={() => setIsExpanded(v => !v)}
      >
        {/* ── Airline column ── */}
        <div className="flex flex-col items-center gap-1.5 w-14 flex-shrink-0">
          <div className="w-11 h-11 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden flex items-center justify-center p-0.5">
            <img src={logoUrl} alt={segment.airline}
              onError={e => (e.currentTarget.style.display = 'none')}
              className="w-full h-full object-contain" />
          </div>
          <span className="text-[9px] font-black text-slate-400 font-mono tracking-widest leading-none text-center">{segment.flightNumber}</span>
        </div>

        {/* ── Route hero ── */}
        <div className="flex-grow flex items-center gap-2 min-w-0">

          {/* Departure block */}
          <div className="flex-shrink-0 text-left" style={{ minWidth: '72px' }}>
            <div className="text-[28px] font-black text-slate-900 leading-none tracking-tighter font-mono tabular-nums">{depTime || '—'}</div>
            <div className="text-base font-black text-slate-400 leading-none mt-0.5 tracking-wide">{segment.fromCode || segment.fromCity}</div>
            {depDateShort && <div className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap font-medium">{depDateShort}</div>}
          </div>

          {/* Timeline */}
          <div className="flex-grow flex flex-col items-center min-w-[40px]">
            {durationDisplay && (
              <span className="text-[10px] font-bold text-slate-400 mb-1.5 whitespace-nowrap">{durationDisplay}</span>
            )}
            <div className="w-full flex items-center gap-1">
              <div className="flex-1 border-t-2 border-dashed border-slate-200" />
              <Plane className="w-3.5 h-3.5 text-blue-400 -scale-x-100 flex-shrink-0" />
              <div className="flex-1 border-t-2 border-dashed border-slate-200" />
            </div>
            <span className="hidden md:block text-[9px] text-slate-300 mt-1.5 truncate max-w-full">{segment.airline}</span>
          </div>

          {/* Arrival block */}
          <div className="flex-shrink-0 text-right" style={{ minWidth: '72px' }}>
            <div className="text-[28px] font-black text-slate-900 leading-none tracking-tighter font-mono tabular-nums inline-flex items-start gap-1">
              {arrTime || '—'}
              {dayDiff > 0 && <span className="text-[13px] font-black text-orange-500 mt-0.5">+{dayDiff}</span>}
            </div>
            <div className="text-base font-black text-slate-400 leading-none mt-0.5 tracking-wide">{segment.toCode || segment.toCity}</div>
            {arrDateShort && <div className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap font-medium">{arrDateShort}</div>}
          </div>
        </div>

        {/* ── Right: badges + actions ── */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {depYear && (
            <span className="hidden lg:block text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">{depYear}</span>
          )}
          {segment.status && segment.status !== 'SCHEDULED' && (
            <span className={`hidden sm:block text-[10px] font-black px-2 py-1 rounded-lg ${statusConfig[segment.status]?.cls || 'bg-slate-100 text-slate-600'}`}>
              {statusConfig[segment.status]?.label}
            </span>
          )}
          {isStale && (
            <span className="hidden sm:flex items-center gap-1 bg-amber-200 text-amber-800 text-[10px] font-bold px-2 py-1 rounded-lg">
              <AlertTriangle className="w-3 h-3" /> Old
            </span>
          )}
          <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover/row:opacity-100 transition-opacity">
            {onEdit && <button onClick={e => { e.stopPropagation(); onEdit(); }} className="p-1.5 rounded-lg hover:bg-slate-100"><Edit2 className="w-3.5 h-3.5 text-slate-400" /></button>}
            {onDelete && <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>}
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-300 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* ── Expanded details panel ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 bg-slate-50/60 border-t border-slate-100">
              {/* Chips row */}
              <div className="flex flex-wrap gap-2 mb-3">
                {segment.class && (
                  <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {segment.class}
                  </span>
                )}
                {segment.seat && (
                  <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-mono">
                    💺 {segment.seat}
                  </span>
                )}
                {segment.baggage && (
                  <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <Briefcase className="w-3 h-3" /> {segment.baggage}
                  </span>
                )}
                {segment.terminal && (
                  <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                    טרמינל {segment.terminal}
                  </span>
                )}
                {segment.mealPlan && (
                  <span className="text-xs font-bold bg-orange-50 text-orange-700 px-2.5 py-1 rounded-lg border border-orange-100">
                    🍽 {segment.mealPlan}
                  </span>
                )}
                {segment.status && (
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${statusConfig[segment.status]?.cls || 'bg-slate-100 text-slate-600'}`}>
                    {statusConfig[segment.status]?.label || segment.status}
                  </span>
                )}
              </div>

              {/* From / To cities */}
              <div className="grid grid-cols-2 gap-3" dir="ltr">
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Origin</div>
                  <div className="text-sm font-black text-slate-800">{segment.fromCity || segment.fromCode}</div>
                  <div className="text-xs font-mono text-slate-400">{segment.fromCode}</div>
                </div>
                <div className="bg-white rounded-xl p-3 border border-slate-100">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Destination</div>
                  <div className="text-sm font-black text-slate-800">{segment.toCity || segment.toCode}</div>
                  <div className="text-xs font-mono text-slate-400">{segment.toCode}</div>
                </div>
              </div>

              {segment.cancellationPolicy && (
                <div className="mt-3 bg-red-50 border border-red-100 rounded-xl px-3 py-2 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
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

  const tripYear = getTripYear(trip);

  const isSegmentStale = (seg: FlightSegment): boolean => {
    if (!tripYear) return false;
    const y = seg.date?.match(/^(\d{4})/)?.[1] || seg.departureTime?.match(/^(\d{4})/)?.[1];
    return !!y && parseInt(y) !== tripYear;
  };

  const staleCount = flights.segments.filter(isSegmentStale).length;

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
  };

  const handleCleanStale = () => {
    if (!onUpdateTrip) return;
    const cleaned = flights.segments.filter(seg => !isSegmentStale(seg));
    onUpdateTrip({ ...trip, flights: { ...trip.flights, segments: cleaned } });
  };

  return (
    <div className="space-y-12 animate-fade-in pb-20">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
            <span className="bg-blue-100 p-2 rounded-xl text-blue-600 shadow-sm flex-shrink-0"><Plane className="w-6 h-6 md:w-7 md:h-7" /></span>
            My Flights
          </h2>
          <p className="text-slate-400 text-sm font-medium mt-0.5 mr-14">{flights.segments.length} {flights.segments.length === 1 ? 'segment' : 'segments'}</p>
        </div>
        {(flights.pnr || (flights.passengers && flights.passengers.length > 0)) && (
          <div dir="ltr" className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm">
            {flights.pnr && (
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Booking Ref</div>
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

      {/* Stale flights warning banner */}
      {staleCount > 0 && onUpdateTrip && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-bold text-amber-800">
              {staleCount} outdated {staleCount === 1 ? 'segment' : 'segments'} found from a different year
              {tripYear ? ` (not ${tripYear})` : ''} — likely imported by mistake
            </span>
          </div>
          <button onClick={handleCleanStale}
            className="flex-shrink-0 text-xs font-bold bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors">
            Remove all
          </button>
        </div>
      )}

      {/* Flight Segments List */}
      <section>
        {flights.segments.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {flights.segments.map((seg, i) => {
              const isMissingData = !seg.departureTime || !seg.arrivalTime || seg.departureTime === 'INVALID DATE';
              const stale = isSegmentStale(seg);
              return (
                <div key={i}>
                  {isMissingData && onUpdateTrip && !stale && (
                    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-amber-800">חסרים פרטי טיסה חיוניים</span>
                      </div>
                      <button onClick={() => setEditingIndex(i)} className="text-xs bg-amber-200 text-amber-900 px-3 py-1 rounded-lg font-bold hover:bg-amber-300 transition-colors">השלם פרטים</button>
                    </div>
                  )}
                  <FlightRow
                    segment={seg}
                    isStale={stale}
                    onEdit={onUpdateTrip ? () => setEditingIndex(i) : undefined}
                    onDelete={onUpdateTrip ? () => handleDeleteSegment(i) : undefined}
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
                    <div className={`text-[10px] font-medium uppercase mt-1 ${isImage ? 'text-white/80' : 'text-slate-400'}`}>{isPdf ? 'PDF DOC' : 'IMAGE'}</div>
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
    </div>
  );
};