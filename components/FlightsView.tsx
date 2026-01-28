import React, { useRef } from 'react';
import { Trip, FlightSegment } from '../types';
import { Plane, FileText, FileImage, Download, Briefcase, UploadCloud, Edit, X, Save } from 'lucide-react';
import { formatDateTime, formatDateOnly } from '../utils/dateUtils';

export const FlightsView: React.FC<{ trip: Trip, onUpdateTrip?: (t: Trip) => void }> = ({ trip, onUpdateTrip }) => {
  const { flights, documents } = trip;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingSegment, setEditingSegment] = React.useState<{ segment: FlightSegment, index: number } | null>(null);

  const calculateDuration = (start?: string, end?: string) => {
    if (!start || !end) return null;
    try {
      const startTime = new Date(start).getTime();
      const endTime = new Date(end).getTime();
      if (isNaN(startTime) || isNaN(endTime)) return null;

      const diffMs = endTime - startTime;
      if (diffMs < 0) return null; // Invalid

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    } catch (e) { return null; }
  };

  const handleUpdateSegment = (updatedSeg: FlightSegment) => {
    if (editingSegment === null || !onUpdateTrip) return;
    const newSegments = [...flights.segments];
    newSegments[editingSegment.index] = updatedSeg;
    onUpdateTrip({
      ...trip,
      flights: { ...flights, segments: newSegments }
    });
    setEditingSegment(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onUpdateTrip) {
      const newDocs = Array.from(e.target.files).map((f: File) => f.name); // In a real app, upload to storage
      const updatedTrip = { ...trip, documents: [...(trip.documents || []), ...newDocs] };
      onUpdateTrip(updatedTrip);
    }
  };

  const renderSegment = (seg: FlightSegment, index: number) => (
    <div key={index} className="border-b border-gray-100 last:border-0 py-4 hover:bg-slate-50 transition-colors px-4 -mx-4 relative group">
      <button onClick={() => setEditingSegment({ segment: seg, index })} className="absolute top-4 left-4 text-slate-400 hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Edit className="w-4 h-4" /></button>

      <div className="flex flex-col md:flex-row items-center gap-6 w-full">

        {/* 1. Airline Info */}
        <div className="flex items-center gap-3 w-full md:w-1/4">
          <img src={`https://pics.avs.io/200/200/${(seg.flightNumber?.match(/^[A-Z0-9]{2}/i)?.[0] || seg.airline.substring(0, 2)).toUpperCase()}.png`} alt={seg.airline} onError={(e) => e.currentTarget.style.display = 'none'} className="w-8 h-8 rounded-full object-cover border border-slate-100" />
          <div className="flex flex-col text-left">
            <span className="text-sm font-bold text-slate-800">{seg.airline}</span>
            <span className="text-xs text-slate-400 font-mono">{seg.flightNumber}</span>
          </div>
        </div>

        {/* 2. Times & Duration */}
        <div className="flex-1 flex items-center justify-center gap-6 w-full md:w-auto">
          {/* Dep */}
          <div className="text-right">
            <div className="text-lg font-black text-slate-800 leading-none">
              {seg.departureTime?.includes('T') ? seg.departureTime.split('T')[1].substring(0, 5) : (seg.departureTime?.match(/\d{1,2}:\d{2}/)?.[0] || '00:00')}
            </div>
            <div className="text-xs text-slate-400 font-bold uppercase mt-1">
              {seg.fromCode || 'ORG'}
            </div>
          </div>

          {/* Duration Graph */}
          <div className="flex flex-col items-center w-32">
            <div className="text-xs font-bold text-slate-500 mb-1">
              {calculateDuration(seg.departureTime, seg.arrivalTime) || seg.duration || '0h 00m'}
            </div>
            <div className="w-full h-[2px] bg-slate-200 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1">
                <Plane className="w-3 h-3 text-slate-300 transform rotate-90" />
              </div>
            </div>
          </div>

          {/* Arr */}
          <div className="text-left">
            <div className="text-lg font-black text-slate-800 leading-none">
              {seg.arrivalTime?.includes('T') ? seg.arrivalTime.split('T')[1].substring(0, 5) : (seg.arrivalTime?.match(/\d{1,2}:\d{2}/)?.[0] || '00:00')}
            </div>
            <div className="text-xs text-slate-400 font-bold uppercase mt-1">
              {seg.toCode || 'DST'}
            </div>
          </div>
        </div>

        {/* 3. Date & Badge */}
        <div className="w-full md:w-1/6 text-right flex flex-col items-end">
          <span className="text-xs font-bold text-slate-600">
            {seg.date ? new Date(seg.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : ''}
          </span>
          {seg.baggage && (
            <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-1">{seg.baggage}</span>
          )}
        </div>

      </div>
    </div>
  );

  return (
    <div className="space-y-12 animate-fade-in">

      {/* Flights Section */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
          <Plane className="w-6 h-6 text-blue-600" /> כרטיסי טיסה
        </h2>
        {flights.segments.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
            <div className="bg-blue-900 px-6 py-4 flex justify-between items-center text-white">
              <div>
                <div className="text-sm opacity-80">שם הנוסע</div>
                <div className="font-bold text-lg">{flights.passengerName}</div>
              </div>
              <div className="text-left">
                <div className="text-sm opacity-80">קוד הזמנה</div>
                <div className="font-mono text-xl tracking-widest">{flights.pnr}</div>
              </div>
            </div>
            <div className="p-8">
              {flights.segments.map((seg, i) => renderSegment(seg, i))}
            </div>
          </div>
        ) : (
          <div className="text-center p-12 bg-white rounded-lg shadow border border-gray-200 text-gray-500">
            לא הוזנו פרטי טיסה לטיול זה.
          </div>
        )}
      </section>

      {/* Documents Gallery */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-600" /> מסמכים וקבצים
          </h2>
          {onUpdateTrip && (
            <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-purple-100 transition-colors">
              <UploadCloud className="w-4 h-4" /> העלה קובץ
            </button>
          )}
          <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
        </div>

        {documents && documents.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {documents.map((doc, idx) => {
              const isPdf = doc.toLowerCase().endsWith('.pdf');
              const isImage = doc.match(/\.(jpg|jpeg|png|webp)$/i);

              return (
                <div key={idx} className="group relative bg-white border border-gray-200 rounded-2xl p-2 hover:shadow-lg transition-all cursor-pointer aspect-square flex flex-col items-center justify-center text-center overflow-hidden">
                  {isImage ? (
                    <div className="absolute inset-0 bg-gray-100">
                      <img src="https://via.placeholder.com/150?text=Image" alt={doc} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ) : (
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-2 ${isPdf ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                      {isPdf ? <FileText className="w-8 h-8" /> : <FileImage className="w-8 h-8" />}
                    </div>
                  )}

                  <div className="relative z-10 w-full px-2">
                    {!isImage && <div className="text-xs font-bold text-gray-700 truncate w-full">{doc}</div>}
                  </div>

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                    <button className="bg-white text-gray-900 rounded-full p-2 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-400 font-medium cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <UploadCloud className="w-10 h-10 mx-auto mb-2 opacity-50" />
            גרור קבצים לכאן או לחץ להעלאה
          </div>
        )}
      </section>

      {editingSegment && (
        <FlightEditModal
          segment={editingSegment.segment}
          onClose={() => setEditingSegment(null)}
          onSave={(updated) => handleUpdateSegment(updated)}
        />
      )}
    </div>
  );
};

const FlightEditModal: React.FC<{
  segment: FlightSegment,
  onClose: () => void,
  onSave: (seg: FlightSegment) => void
}> = ({ segment, onClose, onSave }) => {
  const [formData, setFormData] = React.useState<FlightSegment>(segment);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-black text-slate-800 flex items-center gap-2"><Plane className="w-5 h-5 text-blue-600" /> עריכת טיסה</h3>
          <button onClick={onClose}><X className="w-6 h-6 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">מספר טיסה</label>
              <input className="w-full p-3 bg-slate-50 rounded-xl font-mono font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100" value={formData.flightNumber} onChange={e => setFormData({ ...formData, flightNumber: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">חברת תעופה</label>
              <input className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100" value={formData.airline} onChange={e => setFormData({ ...formData, airline: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">קוד מוצא</label>
              <input className="w-full p-3 bg-slate-50 rounded-xl font-mono font-black text-lg text-center outline-none focus:ring-2 focus:ring-blue-100" value={formData.fromCode} onChange={e => setFormData({ ...formData, fromCode: e.target.value })} maxLength={3} />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">עיר מוצא</label>
              <input className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100" value={formData.fromCity || ''} onChange={e => setFormData({ ...formData, fromCity: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">קוד יעד</label>
              <input className="w-full p-3 bg-slate-50 rounded-xl font-mono font-black text-lg text-center outline-none focus:ring-2 focus:ring-blue-100" value={formData.toCode} onChange={e => setFormData({ ...formData, toCode: e.target.value })} maxLength={3} />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">עיר יעד</label>
              <input className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100" value={formData.toCity || ''} onChange={e => setFormData({ ...formData, toCity: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">המראה</label>
              <input type="datetime-local" className="w-full p-3 bg-slate-50 rounded-xl font-mono font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100" value={formData.departureTime} onChange={e => setFormData({ ...formData, departureTime: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">נחיתה</label>
              <input type="datetime-local" className="w-full p-3 bg-slate-50 rounded-xl font-mono font-bold text-xs outline-none focus:ring-2 focus:ring-blue-100" value={formData.arrivalTime} onChange={e => setFormData({ ...formData, arrivalTime: e.target.value })} />
            </div>
          </div>

          <button onClick={() => onSave(formData)} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
            <Save className="w-5 h-5" /> שמור שינויים
          </button>
        </div>
      </div>
    </div>
  );
};