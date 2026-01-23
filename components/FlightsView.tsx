import React, { useRef } from 'react';
import { Trip, FlightSegment } from '../types';
import { Plane, FileText, FileImage, Download, CheckCircle2, Briefcase, UploadCloud } from 'lucide-react';

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
    <div key={index} className="border-b border-dashed border-gray-300 last:border-0 pb-6 mb-6 last:pb-0 last:mb-0 relative">
      <div className="flex justify-between items-start mb-4">
        <div>
          <span className="text-sm text-gray-500">{seg.date}</span>
          <div className="font-bold text-lg text-blue-800 flex items-center gap-2">
             {seg.airline} 
          </div>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{seg.flightNumber}</span>
        </div>
        <div className="text-left flex flex-col items-end gap-1">
           <span className="text-sm text-gray-500 block">משך: {seg.duration}</span>
           {seg.baggage && (
               <div className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded flex items-center gap-1 font-bold">
                   <Briefcase className="w-3 h-3" />
                   {seg.baggage}
               </div>
           )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="text-3xl font-bold text-gray-900">{seg.fromCode}</div>
          <div className="text-sm text-gray-600">{seg.fromCity}</div>
          <div className="text-xl font-medium mt-1">{seg.departureTime}</div>
        </div>

        <div className="flex-1 flex flex-col items-center px-4">
          <div className="w-full h-px bg-gray-300 relative top-3"></div>
          <Plane className="w-6 h-6 text-blue-500 transform rotate-180 bg-white z-10 p-1" />
        </div>

        <div className="flex-1 text-left">
          <div className="text-3xl font-bold text-gray-900">{seg.toCode}</div>
          <div className="text-sm text-gray-600">{seg.toCity}</div>
          <div className="text-xl font-medium mt-1">{seg.arrivalTime}</div>
        </div>
      </div>

      {(seg.terminal || seg.gate) && (
         <div className="flex gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm">
            {seg.terminal && (
               <div className="flex flex-col">
                  <span className="text-xs text-gray-500 uppercase font-bold">טרמינל</span>
                  <span className="font-mono font-bold text-gray-800">{seg.terminal}</span>
               </div>
            )}
            {seg.gate && (
               <div className="flex flex-col border-r border-gray-300 pr-4 mr-4">
                  <span className="text-xs text-gray-500 uppercase font-bold">שער</span>
                  <span className="font-mono font-bold text-gray-800">{seg.gate}</span>
               </div>
            )}
         </div>
      )}
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
    </div>
  );
};