import React, { useRef, useState } from 'react';
import { Trip, FlightSegment } from '../types';
import { Plane, FileText, FileImage, Download, UploadCloud, Clock, Calendar, ArrowRight, Briefcase, Edit2, X, Check } from 'lucide-react';
import { formatDateTime, formatDateOnly, parseFlightTime, calculateFlightDuration, parseDateToIso } from '../utils/dateUtils';

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

interface FlightCardProps {
  segment: FlightSegment;
  isLast: boolean;
  onEdit?: () => void;
}

const FlightCard: React.FC<FlightCardProps> = ({ segment, isLast, onEdit }) => {
  const logoUrl = getAirlineLogo(segment.airline, segment.flightNumber);

  // Use the new timezone-aware duration calculator
  const durationDisplay = (segment.duration && segment.duration !== '0h' && segment.duration !== '0h 0m')
    ? segment.duration
    : calculateFlightDuration(segment.departureTime || '', segment.arrivalTime || '');

  // Extract display times - handle both ISO and raw formats
  const getDisplayTime = (timeStr?: string): string => {
    if (!timeStr) return '00:00';
    const parsed = parseFlightTime(timeStr);
    return parsed || '00:00';
  };

  const depTime = getDisplayTime(segment.departureTime);
  const arrTime = getDisplayTime(segment.arrivalTime);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow p-6 mb-4 relative overflow-hidden group">
      {/* Decorative Top Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

      {/* Edit Button */}
      {onEdit && (
        <button
          onClick={onEdit}
          className="absolute top-4 left-4 p-2 bg-slate-100 hover:bg-blue-100 rounded-full text-slate-500 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all z-10"
          title="ערוך טיסה"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">

        {/* 1. Airline Info (Left) */}
        <div className="md:col-span-3 flex flex-row md:flex-col items-center md:items-start gap-3">
          <img
            src={logoUrl}
            alt={segment.airline}
            onError={(e) => e.currentTarget.style.display = 'none'}
            className="w-16 h-16 rounded-full object-cover border border-slate-100 p-0.5 bg-white shadow-sm"
          />
          <div>
            <div className="font-black text-slate-800 text-sm md:text-lg leading-tight">{segment.airline}</div>
            <div className="text-[10px] md:text-xs font-bold text-slate-400 font-mono tracking-wider mt-0.5 bg-slate-50 px-1.5 md:px-2 py-0.5 rounded-md w-fit">
              {segment.flightNumber}
            </div>
          </div>
        </div>

        {/* 2. The Flight Timeline (Center - Main Visual) */}
        <div className="md:col-span-6 flex items-center justify-between gap-2 md:gap-8 w-full">

          {/* Departure */}
          <div className="text-right min-w-[70px] md:min-w-[130px]">
            <div className="text-xl md:text-3xl font-black text-slate-800 leading-none truncate max-w-[120px] md:max-w-[180px]" title={segment.fromCity}>
              {segment.fromCity || segment.fromCode || 'ORG'}
            </div>
            <div className="text-base md:text-xl font-bold text-blue-600 mt-1 md:mt-2 font-mono" dir="ltr">{depTime}</div>
            <div className="text-sm font-bold text-slate-600 mt-1 uppercase">
              {segment.departureTime
                ? new Date(segment.departureTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : (segment.date ? new Date(segment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '')}
            </div>
          </div>

          {/* Visual Path */}
          <div className="flex-1 flex flex-col items-center px-2 md:px-6 relative min-w-[80px]">
            <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-slate-100 shadow-sm z-10 whitespace-nowrap">
              <Clock className="w-3 h-3 text-slate-300" /> {durationDisplay}
            </div>
            <div className="w-full flex items-center relative h-6">
              {/* Line */}
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-0.5 bg-slate-200"></div>
              </div>
              {/* Plane Icon (RTL Aware: Pointing Left) */}
              <div className="absolute left-1/2 -translate-x-1/2 bg-white px-2 z-10">
                <Plane className="w-5 h-5 text-sky-500 transform -scale-x-100" />
              </div>
              {/* Dots at ends */}
              <div className="absolute right-0 w-2.5 h-2.5 bg-slate-300 rounded-full ring-2 ring-white"></div>
              <div className="absolute left-0 w-2.5 h-2.5 bg-blue-500 rounded-full ring-4 ring-blue-50"></div>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono tracking-widest uppercase">DIRECT</div>
          </div>

          {/* Arrival */}
          <div className="text-left min-w-[70px] md:min-w-[130px]">
            <div className="text-xl md:text-3xl font-black text-slate-800 leading-none truncate max-w-[120px] md:max-w-[180px]" title={segment.toCity}>
              {segment.toCity || segment.toCode || 'DES'}
            </div>
            <div className="text-base md:text-xl font-bold text-blue-600 mt-1 md:mt-2 font-mono" dir="ltr">{arrTime}</div>
            <div className="text-sm font-bold text-slate-600 mt-1 uppercase">
              {segment.arrivalTime ? formatDateOnly(segment.arrivalTime) : '---'}
            </div>
          </div>

        </div>

        {/* 3. Class & Status (Right) */}
        <div className="md:col-span-3 flex flex-row md:flex-col justify-end items-end gap-2 border-t md:border-t-0 md:border-r border-slate-100 pt-4 md:pt-0 md:pr-6">
          {segment.baggage && (
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <Briefcase className="w-3.5 h-3.5" /> {segment.baggage}
            </div>
          )}
        </div>
      </div>
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

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
              <Plane className="w-8 h-8" /> טיסות
            </h1>
            <p className="text-blue-100 text-lg font-medium opacity-90 max-w-2xl">
              כל פרטי הטיסות שלך, כרטיסי עלייה למטוס ומסמכים חשובים במקום אחד.
            </p>
          </div>
          <div className="text-left hidden md:block">
            <div className="text-sm font-bold opacity-60 uppercase tracking-widest mb-1">מספר הזמנה (PNR)</div>
            <div className="text-4xl font-mono font-black tracking-widest">{flights.pnr || '---'}</div>
          </div>
        </div>
      </div>

      {/* Flight Segments List */}
      <section className="max-w-5xl mx-auto -mt-6">
        {flights.segments.length > 0 ? (
          <div className="space-y-4">
            {flights.segments.map((seg, i) => (
              <FlightCard
                key={i}
                segment={seg}
                isLast={i === flights.segments.length - 1}
                onEdit={onUpdateTrip ? () => setEditingIndex(i) : undefined}
              />
            ))}
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

        {documents && documents.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {documents.map((doc, idx) => {
              const isPdf = doc.toLowerCase().endsWith('.pdf');
              const isImage = doc.match(/\.(jpg|jpeg|png|webp)$/i);

              return (
                <div key={idx} className="group relative bg-white border border-slate-200 rounded-2xl p-3 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer aspect-[4/5] flex flex-col items-center justify-center text-center overflow-hidden">
                  {isImage ? (
                    <div className="absolute inset-0 bg-slate-100">
                      <img src="https://via.placeholder.com/300?text=Image" alt={doc} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
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

                  {/* Actions */}
                  <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="bg-white/90 backdrop-blur text-slate-800 rounded-full p-2 shadow-sm hover:bg-white">
                      <Download className="w-4 h-4" />
                    </button>
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