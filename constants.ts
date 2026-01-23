import { Trip } from './types';

export const INITIAL_DATA: Trip[] = [
  {
    id: 'trip-1',
    name: 'תאילנד - אוגוסט 2026',
    dates: '06/08/2026 - 26/08/2026',
    destination: 'בנגקוק - פטאייה - קו סמט',
    destinationEnglish: 'Bangkok',
    coverImage: 'https://images.unsplash.com/photo-1590523741831-ab7e8b8f9c7f?q=80&w=2574&auto=format&fit=crop',
    documents: [],
    flights: {
      passengerName: 'Traveler Name',
      pnr: '75PCS6',
      segments: [
        {
          fromCode: 'TLV', fromCity: 'תל אביב', toCode: 'AUH', toCity: 'אבו דאבי',
          departureTime: '20:10', arrivalTime: '00:25', duration: '03h 15m',
          flightNumber: 'EY598', airline: 'Etihad Airways', date: '06 Aug 2026',
          terminal: '3', gate: 'B6'
        },
        {
          fromCode: 'AUH', fromCity: 'אבו דאבי', toCode: 'BKK', toCity: 'בנגקוק',
          departureTime: '02:20', arrivalTime: '11:50', duration: '06h 30m',
          flightNumber: 'EY404', airline: 'Etihad Airways', date: '07 Aug 2026',
          terminal: 'A', gate: '12'
        }
      ]
    },
    hotels: [],
    reservations: [],
    itinerary: [],
    restaurants: [],
    attractions: []
  }
];