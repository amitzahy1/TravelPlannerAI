import React, { useRef } from 'react';
import { Trip, FlightSegment } from '../types';
import { Plane, FileText, FileImage, Download, Briefcase, UploadCloud } from 'lucide-react';
import { formatDateTime, formatDateOnly } from '../utils/dateUtils';

export const FlightsView: React.FC<{ trip: Trip, onUpdateTrip?: (t: Trip) => void }> = ({ trip, onUpdateTrip }) => {
  const { flights, documents } = trip;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onUpdateTrip) {
      const newDocs = Array.from(e.target.files).map((f: File) => f.name); // In a real app, upload to storage
      const updatedTrip = { ...trip, documents: [...(trip.documents || []), ...newDocs] };
      onUpdateTrip(updatedTrip);
    }
  };

  const renderSegment = (seg: FlightSegment, index: number) => (
    <div key={index} className="border-b border-dashed border-gray-300 last:border-0 pb-4 mb-4 last:pb-0 last:mb-0 relative">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-400 font-mono">{formatDateOnly(seg.date)}</div>
          <div className="font-bold text-sm text-blue-800 flex items-center gap-3">
            <img src={`https://pics.avs.io/200/200/${(seg.flightNumber?.match(/^[A-Z0-9]{2}/i)?.[0] || seg.airline.substr(0, 2)).toUpperCase()}.png`} alt={seg.airline} onError={(e) => e.currentTarget.style.display = 'none'} className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-100" />
            {seg.airline}
          </div>
          <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono tracking-wider">{seg.flightNumber}</span>
        </div>
        </div>
        <div className="text-left flex items-center gap-2">
          <span className="text-xs text-gray-400">משך: {seg.duration}</span>
          {seg.baggage && (
            <div className="text-[10px] bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-1 font-bold border border-slate-100">
              <Briefcase className="w-2.5 h-2.5" />
              {seg.baggage}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex-1">
          <div className="text-xl font-black text-gray-800 leading-none">{seg.fromCode || (seg.fromCity ? seg.fromCity.substring(0, 3).toUpperCase() : 'ORG')}</div>
          <div className="text-xs text-gray-500 mt-0.5">{seg.fromCity}</div>
          <div className="text-base font-bold text-gray-700 mt-1" dir="ltr">{formatDateTime(seg.departureTime)}</div>
        </div>

        <div className="flex-1 flex flex-col items-center px-2">
          <div className="w-full h-px bg-gray-200 relative top-2.5"></div>
          <Plane className="w-5 h-5 text-blue-400 transform rotate-180 bg-white z-10 p-0.5" />
        </div>

        <div className="flex-1 text-left">
          <div className="text-xl font-black text-gray-800 leading-none">{seg.toCode || (seg.toCity ? seg.toCity.substring(0, 3).toUpperCase() : 'DST')}</div>
          <div className="text-xs text-gray-500 mt-0.5">{seg.toCity}</div>
          <div className="text-base font-bold text-gray-700 mt-1" dir="ltr">{formatDateTime(seg.arrivalTime)}</div>
        </div>
      </div>

      {
    (seg.terminal || seg.gate) && (
      <div className="flex gap-3 bg-gray-50 p-2 rounded-lg border border-gray-100 text-xs w-fit">
        {seg.terminal && (
          <div className="flex flex-col">
            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">טרמינל</span>
            <span className="font-mono font-bold text-gray-700">{seg.terminal}</span>
          </div>
        )}
        {seg.gate && (
          <div className="flex flex-col border-r border-gray-200 pr-3 mr-3">
            <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">שער</span>
            <span className="font-mono font-bold text-gray-700">{seg.gate}</span>
          </div>
        )}
      </div>
    )
  }
    </div >
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
  </div>
);
};