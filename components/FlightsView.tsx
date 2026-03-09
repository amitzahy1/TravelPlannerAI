import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trip, FlightSegment } from '../types';
import { Plane, FileText, FileImage, Download, UploadCloud, Clock, Calendar, ArrowRight, Briefcase, Edit2, X, Check, Lock, ShieldCheck, ChevronDown } from 'lucide-react';
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

const FlightRow: React.FC<{ segment: FlightSegment; onEdit?: () => void }> = ({ segment, onEdit }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const logoUrl = getAirlineLogo(segment.airline, segment.flightNumber);

  const durationDisplay = (segment.duration && segment.duration !== '0h' && segment.duration !== '0h 0m')
    ? segment.duration
    : calculateFlightDuration(segment.departureTime || '', segment.arrivalTime || '');

  const depTime = formatFlightTime(segment.departureTime);
  const arrTime = formatFlightTime(segment.arrivalTime);

  const depDate = (() => {
    try {
      let d: Date | null = null;
      if (segment.departureTime?.includes('T')) d = new Date(segment.departureTime);
      else if (segment.date) d = new Date(segment.date);
      return (d && !isNaN(d.getTime())) ? d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    } catch { return ''; }
  })();

  const arrDate = (() => {
    try {
      let d: Date | null = null;
      if (segment.arrivalTime?.includes('T')) d = new Date(segment.arrivalTime);
      else if (segment.date) d = new Date(segment.date);
      return (d && !isNaN(d.getTime())) ? d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) : '';
    } catch { return ''; }
  })();

  return (
    <div className="group/row">
      {/* ── Main compact row ── */}
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/70 transition-colors cursor-pointer select-none"
        onClick={() => setIsExpanded(v => !v)}
      >
        {/* Airline logo */}
        <img
          src={logoUrl}
          alt={segment.airline}
          onError={e => (e.currentTarget.style.display = 'none')}
          className="w-10 h-10 rounded-lg object-contain border border-slate-100 bg-white p-0.5 flex-shrink-0"
        />

        {/* Airline + flight# — desktop */}
        <div className="hidden sm:block w-28 flex-shrink-0">
          <div className="text-sm font-bold text-slate-800 truncate">{segment.airline}</div>
          <div className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md w-fit mt-0.5 border border-slate-100">{segment.flightNumber}</div>
        </div>

        {/* Route — main visual */}
        <div className="flex-grow flex items-center gap-2 min-w-0">
          <div className="text-right flex-shrink-0 min-w-[52px]">
            <div className="font-black text-slate-800 text-base leading-none">{segment.fromCode || segment.fromCity}</div>
            <div className="text-xs font-bold text-blue-600 font-mono mt-0.5" dir="ltr">{depTime}</div>
          </div>
          <div className="flex-grow flex items-center justify-center gap-1 min-w-[40px]">
            <div className="flex-1 h-px bg-slate-200" />
            <Plane className="w-3.5 h-3.5 text-sky-500 -scale-x-100 flex-shrink-0" />
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <div className="text-left flex-shrink-0 min-w-[52px]">
            <div className="font-black text-slate-800 text-base leading-none">{segment.toCode || segment.toCity}</div>
            <div className="text-xs font-bold text-blue-600 font-mono mt-0.5" dir="ltr">{arrTime}</div>
          </div>
        </div>

        {/* Duration badge */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-lg px-2.5 py-1.5 flex-shrink-0">
          <Clock className="w-3 h-3 text-slate-400" />
          <span className="text-xs font-bold text-slate-600 whitespace-nowrap">{durationDisplay}</span>
        </div>

        {/* Date */}
        {depDate && (
          <div className="hidden md:block text-xs font-semibold text-slate-500 flex-shrink-0 whitespace-nowrap">{depDate}</div>
        )}

        {/* Edit button */}
        {onEdit && (
          <button
            onClick={e => { e.stopPropagation(); onEdit(); }}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors opacity-100 md:opacity-0 md:group-hover/row:opacity-100 flex-shrink-0"
            title="ערוך טיסה"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
          </button>
        )}

        {/* Expand chevron */}
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      {/* ── Expanded panel ── */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 bg-slate-50/40 border-t border-slate-100">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">מוצא</div>
                  <div className="text-sm font-bold text-slate-700">{segment.fromCity}</div>
                  <div className="text-xs text-slate-400 font-mono">{segment.fromCode}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">יעד</div>
                  <div className="text-sm font-bold text-slate-700">{segment.toCity}</div>
                  <div className="text-xs text-slate-400 font-mono">{segment.toCode}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">תאריך נחיתה</div>
                  <div className="text-sm font-bold text-slate-700">{arrDate || '—'}</div>
                </div>
                {/* Airline on mobile */}
                <div className="sm:hidden">
                  <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">חברת תעופה</div>
                  <div className="text-sm font-bold text-slate-700">{segment.airline}</div>
                  <div className="text-xs font-mono text-slate-400">{segment.flightNumber}</div>
                </div>
                {segment.class && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">מחלקה</div>
                    <div className="text-sm font-bold text-slate-700">{segment.class}</div>
                  </div>
                )}
                {segment.seat && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">מושב</div>
                    <div className="text-sm font-bold text-slate-700 font-mono">{segment.seat}</div>
                  </div>
                )}
                {segment.baggage && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">כבודה</div>
                    <div className="text-sm font-bold text-slate-700 flex items-center gap-1"><Briefcase className="w-3 h-3 text-slate-400" />{segment.baggage}</div>
                  </div>
                )}
                {segment.terminal && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">טרמינל</div>
                    <div className="text-sm font-bold text-slate-700">{segment.terminal}</div>
                  </div>
                )}
                {segment.mealPlan && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">ארוחה</div>
                    <div className="text-sm font-bold text-slate-700">{segment.mealPlan}</div>
                  </div>
                )}
                {segment.status && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">סטטוס</div>
                    <div className={`text-xs font-bold px-2 py-1 rounded-lg w-fit ${
                      segment.status === 'ON_TIME' ? 'bg-emerald-100 text-emerald-700'
                      : segment.status === 'DELAYED' ? 'bg-amber-100 text-amber-700'
                      : segment.status === 'CANCELLED' ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-600'
                    }`}>
                      {segment.status === 'ON_TIME' ? 'בזמן' : segment.status === 'DELAYED' ? 'מאחר' : segment.status === 'CANCELLED' ? 'בוטל' : 'מתוכנן'}
                    </div>
                  </div>
                )}
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

export const FlightsView: React.FC<{ trip: Trip, onUpdateTrip?: (t: Trip) => void }> = ({ trip, onUpdateTrip }) => {
  const { flights, documents } = trip;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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

    const updatedTrip: Trip = {
      ...trip,
      flights: {
        ...trip.flights,
        segments: newSegments
      }
    };

    onUpdateTrip(updatedTrip);
    setEditingIndex(null);
  };

  return (
    <div className="space-y-12 animate-fade-in pb-20">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
            <span className="bg-blue-100 p-2 rounded-xl text-blue-600 shadow-sm flex-shrink-0"><Plane className="w-6 h-6 md:w-7 md:h-7" /></span>
            טיסות
          </h2>
          <p className="text-slate-400 text-sm font-medium mt-0.5 mr-14">{flights.segments.length} {flights.segments.length === 1 ? 'טיסה' : 'טיסות'}</p>
        </div>
        {flights.pnr && (
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">מספר הזמנה (PNR)</div>
              <div className="text-lg font-mono font-black text-slate-800 tracking-widest">{flights.pnr}</div>
            </div>
            {flights.passengers && flights.passengers.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
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
        {flights.segments.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
            {flights.segments.map((seg, i) => {
              const isMissingData = !seg.departureTime || !seg.arrivalTime || seg.departureTime === 'INVALID DATE';
              return (
                <div key={i}>
                  {isMissingData && onUpdateTrip && (
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
                    onEdit={onUpdateTrip ? () => setEditingIndex(i) : undefined}
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