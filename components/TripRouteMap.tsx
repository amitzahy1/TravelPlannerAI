import React, { useState, useEffect } from 'react';
import { Trip } from '../types';
import { Navigation, MapPin, ArrowLeft } from 'lucide-react';

export const TripRouteMap: React.FC<{ trip: Trip }> = ({ trip }) => {
  const [viewLocation, setViewLocation] = useState(trip.destination);

  // Reset view when trip changes
  useEffect(() => {
     setViewLocation(trip.destination);
  }, [trip.destination]);

  // Safe encoding for the map URL
  const destinationQuery = encodeURIComponent(viewLocation);

  // Extract route/cities from destination string (e.g. "Bangkok - Pattaya - Samet")
  // Or fallback to just the destination name if no separator
  const routeStops = React.useMemo(() => {
     if (trip.destination.includes('-')) {
        return trip.destination.split('-').map(s => s.trim());
     }
     // Fallback: If no hyphen, just show the destination as one stop
     return [trip.destination];
  }, [trip.destination]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 mb-8 animate-fade-in">
      {/* Map Visualization */}
      <div className="w-full">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
           {/* Google Maps Embed - Dynamic based on selected city */}
           <div className="w-full h-64 lg:h-96 bg-gray-100 relative group">
             <iframe 
               width="100%" 
               height="100%" 
               frameBorder="0" 
               style={{ border: 0 }}
               src={`https://maps.google.com/maps?q=${destinationQuery}&t=&z=11&ie=UTF8&iwloc=&output=embed`}
               allowFullScreen
               title={`Map of ${viewLocation}`}
               className="opacity-90 group-hover:opacity-100 transition-opacity"
             ></iframe>
             <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-md text-sm font-bold text-gray-700 flex items-center">
                <Navigation className="w-4 h-4 ml-2 text-blue-600" />
                מבט על: {viewLocation}
             </div>
           </div>

           {/* Dynamic Route Display */}
           <div className="p-6 bg-gray-50 border-t border-gray-200">
              <h4 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center">
                 <MapPin className="w-4 h-4 ml-2" /> יעדים במסלול (לחץ לצפייה)
              </h4>
              
              <div className="flex flex-wrap items-center gap-2">
                 {routeStops.map((stop, idx) => {
                    const isActive = viewLocation.includes(stop);
                    return (
                       <div key={idx} className="flex items-center">
                          <button 
                             onClick={() => setViewLocation(stop)}
                             className={`flex items-center px-4 py-2 rounded-lg border text-sm font-bold shadow-sm transition-all transform active:scale-95 ${
                                isActive 
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105' 
                                : 'bg-white text-gray-800 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                             }`}
                          >
                             <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ml-2 ${
                                isActive ? 'bg-white text-blue-600' : 'bg-blue-100 text-blue-700'
                             }`}>
                                {idx + 1}
                             </span>
                             {stop}
                          </button>
                          {idx < routeStops.length - 1 && (
                             <ArrowLeft className="w-4 h-4 text-gray-300 mx-2" />
                          )}
                       </div>
                    );
                 })}
                 
                 {/* Reset Button */}
                 {viewLocation !== trip.destination && (
                    <button 
                       onClick={() => setViewLocation(trip.destination)}
                       className="text-xs text-gray-400 underline hover:text-blue-600 mr-2"
                    >
                       הצג מסלול מלא
                    </button>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};