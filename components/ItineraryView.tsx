import React, { useEffect, useState, useMemo } from 'react';
import { Trip, ManualExpense } from '../types';
import { 
  Calendar, MapPin, Plane, Car, 
  Hotel, Utensils, Ticket, ShoppingBag, Plus, Sparkles, X, 
  ArrowLeft, Edit2, BedDouble, Moon, ExternalLink, Map as MapIcon, Navigation, Trash2, DollarSign, User
} from 'lucide-react';

// --- Types ---
type TimelineEventType = 'flight' | 'hotel_stay' | 'hotel_checkin' | 'hotel_checkout' | 'food' | 'attraction' | 'activity' | 'shopping' | 'travel';

interface TimelineEvent {
    id: string;
    type: TimelineEventType;
    time: string; // HH:MM
    title: string;
    subtitle?: string;
    location?: string;
    price?: string;
    icon: any;
    colorClass: string;
    bgClass: string;
    externalLink?: string; // New field for maps
    // New fields for deletion
    isManual?: boolean;
    dayId?: string;
    activityIndex?: number;
}

interface DayPlan {
    dateIso: string; // YYYY-MM-DD for sorting
    displayDate: string; // "06 Aug"
    displayDayOfWeek: string; // "יום חמישי"
    locationContext: string; // "Bangkok", "Phuket", etc.
    events: TimelineEvent[];
    stats: { food: number, attr: number, flight: number, travel: number };
    hasHotel: boolean; 
}

interface Insight {
    id: string;
    type: 'warning' | 'suggestion' | 'info';
    title: string;
    description: string;
    actionLabel: string;
    action: () => void;
    icon: any;
}

// --- Date Parsing Helpers ---
const parseDateString = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    let d: Date | null = null;
    // Handle DD/MM/YYYY
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        // Force 12:00 to avoid timezone edge cases at midnight
        d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
    }
    // Handle YYYY-MM-DD strictly
    else if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts[0].length === 4) { // YYYY is first
             d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
        } else if (parts[2].length === 4) {
             d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
        }
    } else {
        d = new Date(dateStr);
        d.setHours(12,0,0,0);
    }
    
    return (d && !isNaN(d.getTime())) ? d : null;
};

const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const getDayOfWeek = (date: Date) => {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return `יום ${days[date.getDay()]}`;
};

// --- Main Component ---
export const ItineraryView: React.FC<{ 
    trip: Trip, 
    onUpdateTrip: (updatedTrip: Trip) => void,
    onSwitchTab?: (tab: string) => void 
}> = ({ trip, onUpdateTrip, onSwitchTab }) => {
   
   const [timeline, setTimeline] = useState<DayPlan[]>([]);
   const [selectedDateIso, setSelectedDateIso] = useState<string>('');
   const [quickAddModal, setQuickAddModal] = useState<string | null>(null);
   const [transferModal, setTransferModal] = useState<{ date: string, defaultTime: string } | null>(null);
   const [insights, setInsights] = useState<Insight[]>([]);

   // --- Core Logic: Build the Timeline ---
   useEffect(() => {
       const generateTimeline = () => {
           let startDate = new Date();
           startDate.setHours(12, 0, 0, 0);
           let endDate = new Date();
           endDate.setDate(startDate.getDate() + 7);
           endDate.setHours(12, 0, 0, 0);

           if (trip.dates) {
               const rangeParts = trip.dates.split('-').map(s => s.trim());
               if (rangeParts.length === 2) {
                   const s = parseDateString(rangeParts[0]);
                   const e = parseDateString(rangeParts[1]);
                   if (s && e) {
                       startDate = s;
                       endDate = e;
                   }
               }
           }

           const dayMap = new Map<string, DayPlan>();
           const loopDate = new Date(startDate);
           
           // Generate empty days
           while (loopDate <= endDate) {
               const isoDate = `${loopDate.getFullYear()}-${(loopDate.getMonth()+1).toString().padStart(2,'0')}-${loopDate.getDate().toString().padStart(2,'0')}`;
               dayMap.set(isoDate, {
                   dateIso: isoDate,
                   displayDate: formatDateDisplay(loopDate),
                   displayDayOfWeek: getDayOfWeek(loopDate),
                   // Default fallback logic later
                   locationContext: '', 
                   events: [],
                   stats: { food: 0, attr: 0, flight: 0, travel: 0 },
                   hasHotel: false
               });
               loopDate.setDate(loopDate.getDate() + 1);
           }

           const addToDay = (dateStr: string, event: TimelineEvent) => {
               const d = parseDateString(dateStr);
               if (!d) return;
               const isoKey = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
               
               // Auto-expand timeline if event is outside range
               if (!dayMap.has(isoKey)) {
                   dayMap.set(isoKey, {
                       dateIso: isoKey,
                       displayDate: formatDateDisplay(d),
                       displayDayOfWeek: getDayOfWeek(d),
                       locationContext: '',
                       events: [],
                       stats: { food: 0, attr: 0, flight: 0, travel: 0 },
                       hasHotel: false
                   });
               }
               
               dayMap.get(isoKey)?.events.push(event);
           };

           // --- Ingest Data (Flights, Hotels, Activities) ---
           trip.flights?.segments?.forEach(seg => {
               addToDay(seg.date, {
                   id: `flight-dep-${seg.flightNumber}`,
                   type: 'flight',
                   time: seg.departureTime,
                   title: `טיסה ל${seg.toCity || seg.toCode || 'יעד'}`,
                   subtitle: `המראה: ${seg.airline} ${seg.flightNumber}`,
                   location: `${seg.fromCode} ➔ ${seg.toCode}`,
                   icon: Plane,
                   colorClass: 'text-blue-600',
                   bgClass: 'bg-blue-50 border-blue-100'
               });
               const d = parseDateString(seg.date);
               if (d) {
                   const isoKey = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
                   const plan = dayMap.get(isoKey);
                   if (plan) plan.locationContext = "טיסה";
               }
           });

           trip.hotels?.forEach(hotel => {
               const mapsUrl = hotel.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name + " " + hotel.address)}`;

               // Check-in
               addToDay(hotel.checkInDate, {
                   id: `hotel-in-${hotel.id}`,
                   type: 'hotel_checkin',
                   time: '14:00',
                   title: `Check-in: ${hotel.name}`,
                   location: hotel.address,
                   icon: Hotel,
                   colorClass: 'text-indigo-600',
                   bgClass: 'bg-indigo-50 border-indigo-100',
                   externalLink: mapsUrl
               });
               
               // Check-out
               addToDay(hotel.checkOutDate, {
                   id: `hotel-out-${hotel.id}`,
                   type: 'hotel_checkout',
                   time: '11:00',
                   title: `Check-out: ${hotel.name}`,
                   icon: Hotel,
                   colorClass: 'text-slate-500',
                   bgClass: 'bg-slate-50 border-slate-100',
                   externalLink: mapsUrl
               });

               // Mark stay range
               const start = parseDateString(hotel.checkInDate);
               const end = parseDateString(hotel.checkOutDate);
               const city = hotel.address ? hotel.address.split(',')[0].trim() : hotel.name;
               
               if (start && end) {
                   const current = new Date(start);
                   
                   // Loop until checkout day (inclusive) to set context
                   while (current <= end) {
                       const isoKey = `${current.getFullYear()}-${(current.getMonth()+1).toString().padStart(2, '0')}-${current.getDate().toString().padStart(2, '0')}`;
                       const plan = dayMap.get(isoKey);
                       
                       if (plan) {
                           // Mark hasHotel for all nights we are sleeping there (excluding checkout day ideally, but visually usually inclusive for context)
                           // To fix "missing dot on checkin day", we ensure checkin day gets it.
                           const isCheckOutDay = current.getTime() === end.getTime();
                           if (!isCheckOutDay) {
                               plan.hasHotel = true;
                           }

                           // Set context to the Hotel Location/City
                           if (!plan.locationContext || plan.locationContext === 'טיסה') {
                               plan.locationContext = city;
                           }
                           
                           // Add explicit Stay event to show hotel info daily
                           // Filter out if already exists to prevent dupes if multiple updates
                           // Also don't show "Stay at" on check-in day (redundant with Check-in event) or check-out day
                           const isCheckInDay = current.getTime() === start.getTime();
                           
                           if (!isCheckInDay && !isCheckOutDay) {
                               const stayId = `stay-${hotel.id}-${isoKey}`;
                               if (!plan.events.find(e => e.id === stayId)) {
                                   plan.events.unshift({
                                       id: stayId,
                                       type: 'hotel_stay',
                                       time: '',
                                       title: `לנים ב-${hotel.name}`,
                                       location: hotel.address,
                                       icon: BedDouble,
                                       colorClass: 'text-indigo-500',
                                       bgClass: 'bg-indigo-50/30 border-indigo-100',
                                       externalLink: mapsUrl
                                   });
                               }
                           }
                       }
                       current.setDate(current.getDate() + 1);
                   }
               }
           });

           trip.restaurants?.forEach(cat => cat.restaurants.forEach(res => {
               if (res.reservationDate) {
                   addToDay(res.reservationDate, {
                       id: res.id,
                       type: 'food',
                       time: res.reservationTime || '20:00',
                       title: res.name,
                       subtitle: res.cuisine,
                       location: res.location,
                       icon: Utensils,
                       colorClass: 'text-orange-600',
                       bgClass: 'bg-orange-50 border-orange-100'
                   });
               }
           }));

           trip.attractions?.forEach(cat => cat.attractions.forEach(attr => {
               if (attr.scheduledDate) {
                   addToDay(attr.scheduledDate, {
                       id: attr.id,
                       type: 'attraction',
                       time: attr.scheduledTime || '10:00',
                       title: attr.name,
                       price: attr.price,
                       location: attr.location,
                       icon: Ticket,
                       colorClass: 'text-purple-600',
                       bgClass: 'bg-purple-50 border-purple-100'
                   });
               }
           }));

           trip.itinerary?.forEach(day => {
               day.activities.forEach((act, idx) => {
                   const timeMatch = act.match(/^(\d{1,2}:\d{2})\s*-?\s*(.*)/);
                   const time = timeMatch ? timeMatch[1] : '';
                   const text = timeMatch ? timeMatch[2] : act;
                   let type: TimelineEventType = 'activity';
                   let icon = Sparkles;
                   let color = 'text-emerald-600';
                   let bg = 'bg-emerald-50 border-emerald-100';
                   const textLower = text.toLowerCase();
                   if(textLower.includes('טיסה') || textLower.includes('flight')) { type = 'flight'; icon = Plane; color = 'text-blue-600'; bg = 'bg-blue-50 border-blue-100'; }
                   else if(textLower.includes('נסיעה') || textLower.includes('driver') || textLower.includes('הסעה') || textLower.includes('transfer')) { type = 'travel'; icon = Car; color = 'text-gray-600'; bg = 'bg-gray-50 border-gray-100'; }
                   addToDay(day.date, { 
                       id: `manual-${day.id}-${idx}`, 
                       type, time, title: text, icon, colorClass: color, bgClass: bg,
                       isManual: true, // Flag for deletion
                       dayId: day.id,
                       activityIndex: idx
                   });
               });
           });

           const sortedTimeline = Array.from(dayMap.values()).sort((a, b) => a.dateIso.localeCompare(b.dateIso));
           
           // Final pass: Fill empty location contexts
           const mainDest = trip.destinationEnglish || trip.destination.split('-')[0].trim();
           sortedTimeline.forEach(day => {
               if (!day.locationContext) {
                   if (day.hasHotel) {
                       // Should have been set in loop, but fallback just in case
                       day.locationContext = mainDest; 
                   } else {
                       // Truly no context = default trip destination, avoid "Transit" unless explicit
                       day.locationContext = mainDest; 
                   }
               }
               
               day.events.sort((a, b) => {
                   // Ensure 'hotel_stay' (all day) comes first if no time
                   if (a.type === 'hotel_stay' && !a.time) return -1;
                   if (b.type === 'hotel_stay' && !b.time) return 1;
                   return (a.time || '00:00').localeCompare(b.time || '00:00')
               });
               
               day.stats = {
                   food: day.events.filter(e => e.type === 'food').length,
                   attr: day.events.filter(e => e.type === 'attraction').length,
                   flight: day.events.filter(e => e.type === 'flight').length,
                   travel: day.events.filter(e => e.type === 'travel').length
               };
           });

           setTimeline(sortedTimeline);
           if (!selectedDateIso && sortedTimeline.length > 0) setSelectedDateIso(sortedTimeline[0].dateIso);

           // Insights logic...
           const newInsights: Insight[] = [];
           trip.flights?.segments?.forEach(seg => {
               const d = parseDateString(seg.date);
               if(d) {
                   const iso = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
                   const dayPlan = dayMap.get(iso);
                   if(dayPlan && !dayPlan.events.some(e => e.type === 'travel')) {
                       newInsights.push({
                           id: `flight-transfer-${seg.flightNumber}`,
                           type: 'warning',
                           title: 'הסעה לטיסה',
                           description: `טיסה ב-${seg.date}. האם סגרת הסעה?`,
                           actionLabel: 'הוסף',
                           // Open Transfer Modal
                           action: () => setTransferModal({ date: seg.date, defaultTime: seg.departureTime }),
                           icon: Car
                       });
                   }
               }
           });
           setInsights(newInsights);
       };

       generateTimeline();
   }, [trip]);

   const activeDayPlan = useMemo(() => timeline.find(d => d.dateIso === selectedDateIso), [timeline, selectedDateIso]);

   const handleManualAdd = (text: string, dateOverride?: string) => {
       let targetDateStr = dateOverride;
       if (!targetDateStr && activeDayPlan) {
           const [y, m, d] = activeDayPlan.dateIso.split('-');
           targetDateStr = `${d}/${m}/${y}`;
       }
       if (!targetDateStr) return;
       let newItinerary = [...trip.itinerary];
       let dayIndex = newItinerary.findIndex(d => d.date === targetDateStr);
       if (dayIndex === -1) {
           newItinerary.push({ id: `day-${Date.now()}`, day: 0, date: targetDateStr, title: 'יום חדש', activities: [text] });
       } else {
           newItinerary[dayIndex].activities.push(text);
       }
       onUpdateTrip({ ...trip, itinerary: newItinerary });
       setQuickAddModal(null);
   };

   const handleDeleteActivity = (dayId: string, index: number) => {
        if (!window.confirm("למחוק פעילות זו?")) return;
        const newItinerary = trip.itinerary.map(day => {
            if (day.id === dayId) {
                return { ...day, activities: day.activities.filter((_, i) => i !== index) };
            }
            return day;
        });
        onUpdateTrip({ ...trip, itinerary: newItinerary });
   };

   const handleSaveTransfer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!transferModal) return;
        
        const formData = new FormData(e.target as HTMLFormElement);
        const description = formData.get('description') as string;
        const time = formData.get('time') as string;
        const priceStr = formData.get('price') as string;
        const notes = formData.get('notes') as string;
        
        const activityText = `${time} ${description} ${notes ? `- ${notes}` : ''}`;
        
        // Add to itinerary
        let newItinerary = [...trip.itinerary];
        
        // Attempt to find day or create one
        const targetDate = transferModal.date;
        let dayIndex = newItinerary.findIndex(d => d.date === targetDate);
        
        // If exact string match failed, try to parse
        if (dayIndex === -1) {
             const d = parseDateString(targetDate);
             if (d) {
                 const formatted = d.toLocaleDateString('en-GB'); // DD/MM/YYYY
                 dayIndex = newItinerary.findIndex(d => d.date === formatted);
                 if (dayIndex === -1) {
                     newItinerary.push({ 
                         id: `day-${Date.now()}`, 
                         day: 0, 
                         date: formatted, 
                         title: 'יום חדש', 
                         activities: [activityText] 
                     });
                 } else {
                     newItinerary[dayIndex] = { ...newItinerary[dayIndex], activities: [...newItinerary[dayIndex].activities, activityText] };
                 }
             } else {
                 newItinerary.push({ id: `day-${Date.now()}`, day: 0, date: targetDate, title: 'יום חדש', activities: [activityText] });
             }
        } else {
             newItinerary[dayIndex] = { ...newItinerary[dayIndex], activities: [...newItinerary[dayIndex].activities, activityText] };
        }

        // Add expense
        let newExpenses = trip.expenses || [];
        if (priceStr) {
            const amount = parseFloat(priceStr);
            if (!isNaN(amount) && amount > 0) {
                newExpenses = [...newExpenses, {
                    id: `exp-${Date.now()}`,
                    title: description || 'הסעה',
                    amount: amount,
                    category: 'transport'
                }];
            }
        }

        onUpdateTrip({ ...trip, itinerary: newItinerary, expenses: newExpenses });
        setTransferModal(null);
   };

   const handleChangeCover = () => {
       const url = prompt("הכנס קישור לתמונה חדשה:");
       if (url) onUpdateTrip({ ...trip, coverImage: url });
   };

   const totalStats = useMemo(() => {
       return {
           flights: trip.flights?.segments?.length || 0,
           hotels: trip.hotels?.length || 0,
           restaurants: trip.restaurants?.reduce((acc, cat) => acc + cat.restaurants.length, 0) || 0,
           attractions: trip.attractions?.reduce((acc, cat) => acc + cat.attractions.length, 0) || 0
       };
   }, [trip]);

   return (
      <div className="space-y-6 animate-fade-in pb-24">
         
         {/* 1. COMPACT HEADER */}
         <div className="relative h-[220px] rounded-[2rem] overflow-hidden shadow-xl group mx-1">
             <img 
                src={trip.coverImage || 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&q=80'} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
                alt="Trip Cover" 
             />
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent"></div>
             
             <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col md:flex-row justify-between items-end gap-4">
                 <div className="space-y-1 max-w-xl">
                     <div className="flex items-center gap-3 text-white/80 font-bold text-xs uppercase tracking-widest bg-white/10 backdrop-blur-md px-3 py-1 rounded-full w-fit border border-white/20">
                         <Calendar className="w-3.5 h-3.5" /> {trip.dates}
                     </div>
                     <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight drop-shadow-md">
                         {trip.name}
                     </h1>
                     <div className="flex items-center gap-2 text-lg font-medium text-white/90">
                         <MapPin className="w-4 h-4 text-blue-400" /> {trip.destination}
                     </div>
                 </div>

                 {/* Stats */}
                 <div className="hidden md:flex gap-6 bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-3xl">
                     <div className="flex flex-col items-center min-w-[60px]">
                         <Plane className="w-8 h-8 text-blue-400 mb-1" />
                         <span className="text-3xl font-black text-white leading-none">{totalStats.flights}</span>
                         <span className="text-[10px] text-white/80 font-bold uppercase tracking-wide mt-1">טיסות</span>
                     </div>
                     <div className="w-px bg-white/20"></div>
                     <div className="flex flex-col items-center min-w-[60px]">
                         <Hotel className="w-8 h-8 text-indigo-400 mb-1" />
                         <span className="text-3xl font-black text-white leading-none">{totalStats.hotels}</span>
                         <span className="text-[10px] text-white/80 font-bold uppercase tracking-wide mt-1">מלונות</span>
                     </div>
                     <div className="w-px bg-white/20"></div>
                     <div className="flex flex-col items-center min-w-[60px]">
                         <Utensils className="w-8 h-8 text-orange-400 mb-1" />
                         <span className="text-3xl font-black text-white leading-none">{totalStats.restaurants}</span>
                         <span className="text-[10px] text-white/80 font-bold uppercase tracking-wide mt-1">מסעדות</span>
                     </div>
                     <div className="w-px bg-white/20"></div>
                     <div className="flex flex-col items-center min-w-[60px]">
                         <Ticket className="w-8 h-8 text-purple-400 mb-1" />
                         <span className="text-3xl font-black text-white leading-none">{totalStats.attractions}</span>
                         <span className="text-[10px] text-white/80 font-bold uppercase tracking-wide mt-1">אטרקציות</span>
                     </div>
                 </div>
             </div>
             <button onClick={handleChangeCover} className="absolute top-4 left-4 p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="w-4 h-4" /></button>
         </div>

         {/* 2. INSIGHTS */}
         {insights.length > 0 && (
             <div className="px-2">
                 <div className="flex items-center gap-2 mb-3 px-2">
                     <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
                     <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">ההמלצות של העוזר האישי</h3>
                 </div>
                 <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                     {insights.map(insight => (
                         <div key={insight.id} className="min-w-[280px] bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                             <div className={`absolute top-0 right-0 w-1.5 h-full ${insight.type === 'warning' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                             <div className="flex items-start gap-3">
                                 <div className={`p-2.5 rounded-xl ${insight.type === 'warning' ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'}`}><insight.icon className="w-5 h-5" /></div>
                                 <div>
                                     <h4 className="font-bold text-slate-800 text-sm mb-1">{insight.title}</h4>
                                     <p className="text-xs text-slate-500 leading-snug mb-3">{insight.description}</p>
                                     <button onClick={insight.action} className="text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">{insight.actionLabel} <ArrowLeft className="w-3 h-3" /></button>
                                 </div>
                             </div>
                         </div>
                     ))}
                 </div>
             </div>
         )}

         {/* 3. NEW COMPACT GRID DAY SELECTOR */}
         <div className="relative px-2">
             <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                 {timeline.length === 0 ? (
                     <div className="col-span-full text-center text-slate-400 py-4">טוען תאריכים...</div>
                 ) : (
                     timeline.map((day) => {
                         const isSelected = selectedDateIso === day.dateIso;
                         return (
                             <button
                                 key={day.dateIso}
                                 onClick={() => setSelectedDateIso(day.dateIso)}
                                 className={`flex flex-col items-center justify-between py-2 px-1 rounded-xl border-2 transition-all duration-200 h-20 relative overflow-hidden ${
                                     isSelected 
                                     ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-105 z-10' 
                                     : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                 }`}
                             >
                                 {day.hasHotel && !isSelected && (
                                     <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-sm ring-1 ring-white"></div>
                                 )}
                                 <div className={`text-[9px] font-black uppercase tracking-wider mb-0.5 px-1 rounded w-full text-center line-clamp-2 leading-tight ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                                     {day.locationContext.split(' ')[0] || 'טיול'}
                                 </div>
                                 <div className="flex flex-col items-center">
                                     <span className="text-lg font-black leading-none">{day.displayDate.split(' ')[0]}</span>
                                     <span className="text-[9px] font-bold uppercase opacity-80">{day.displayDate.split(' ')[1]}</span>
                                 </div>
                                 
                                 {/* Dots */}
                                 <div className="flex gap-0.5 mt-1 h-1">
                                     {day.stats.flight > 0 && <div className="w-1 h-1 rounded-full bg-blue-400"></div>}
                                     {day.stats.food > 0 && <div className="w-1 h-1 rounded-full bg-orange-400"></div>}
                                     {day.stats.attr > 0 && <div className="w-1 h-1 rounded-full bg-purple-400"></div>}
                                 </div>
                             </button>
                         );
                     })
                 )}
             </div>
         </div>

         {/* 4. DAILY VIEW */}
         {activeDayPlan ? (
             <div className="animate-fade-in px-2">
                 <div className="flex justify-between items-end mb-6">
                     <div>
                         <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest mb-1">
                             <Calendar className="w-4 h-4" /> {activeDayPlan.displayDayOfWeek}, {activeDayPlan.displayDate}
                         </div>
                         <h2 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-2">
                             {activeDayPlan.locationContext || 'יום בטיול'}
                         </h2>
                     </div>
                     <button 
                        onClick={() => setQuickAddModal('open')}
                        className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 flex items-center gap-2 transition-transform hover:scale-105"
                     >
                         <Plus className="w-4 h-4" /> הוסף
                     </button>
                 </div>

                 {activeDayPlan.events.length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                         {activeDayPlan.events.map((event, i) => (
                             <div 
                                 key={`${event.id}-${i}`} 
                                 className={`p-5 rounded-[1.5rem] border shadow-sm transition-all hover:shadow-md flex flex-col justify-between h-full min-h-[160px] relative overflow-hidden group ${event.bgClass}`}
                             >
                                 <div className={`absolute -right-4 -top-4 w-28 h-28 rounded-full opacity-10 ${event.colorClass.replace('text-', 'bg-')}`}></div>
                                 
                                 {/* DELETE BUTTON for manual items */}
                                 {event.isManual && event.dayId && event.activityIndex !== undefined && (
                                     <button 
                                        onClick={() => handleDeleteActivity(event.dayId!, event.activityIndex!)} 
                                        className="absolute top-3 left-3 p-1.5 bg-white/70 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-lg transition-colors z-20 backdrop-blur-sm"
                                        title="מחק פעילות"
                                     >
                                        <Trash2 className="w-4 h-4" />
                                     </button>
                                 )}

                                 <div className="relative z-10 flex flex-col h-full">
                                     <div className="flex justify-between items-start mb-3">
                                         {event.time ? (
                                             <span className="font-mono text-xs font-black bg-white/80 px-2 py-1 rounded-lg backdrop-blur-sm shadow-sm border border-black/5">
                                                 {event.time}
                                             </span>
                                         ) : <div />}
                                         
                                         <event.icon className={`w-6 h-6 ${event.colorClass}`} />
                                     </div>
                                     
                                     <h3 className="text-xl font-black text-slate-900 leading-tight mb-1">{event.title}</h3>
                                     
                                     {event.subtitle && <p className="text-xs font-bold text-slate-500 mb-3">{event.subtitle}</p>}
                                     
                                     <div className="mt-auto flex items-end justify-between pt-4">
                                         <div className="flex flex-wrap gap-2">
                                             {event.location && (
                                                 <div className="flex items-center text-[10px] font-bold text-slate-500 bg-white/60 px-2 py-1 rounded-lg backdrop-blur-sm">
                                                     <MapPin className="w-3 h-3 ml-1" /> {event.location}
                                                 </div>
                                             )}
                                             {event.price && (
                                                 <div className="flex items-center text-[10px] font-bold text-slate-500 bg-white/60 px-2 py-1 rounded-lg backdrop-blur-sm">
                                                     <Ticket className="w-3 h-3 ml-1" /> {event.price}
                                                 </div>
                                             )}
                                         </div>
                                         
                                         {event.externalLink && (
                                             <a 
                                                href={event.externalLink} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-700 shadow-md transition-all hover:scale-105"
                                             >
                                                 <Navigation className="w-3 h-3" />
                                                 ניווט למלון
                                             </a>
                                         )}
                                     </div>
                                 </div>
                             </div>
                         ))}
                     </div>
                 ) : (
                     <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                         <div className="flex flex-col items-center text-center mb-8">
                            <div className="bg-white p-4 rounded-full shadow-sm mb-3"><Moon className="w-10 h-10 text-slate-400" /></div>
                            <h3 className="text-2xl font-black text-slate-800">
                                {activeDayPlan.hasHotel ? `יום חופשי ב${activeDayPlan.locationContext}` : `יום חופשי`}
                            </h3>
                            <p className="text-slate-500 font-medium text-sm">היומן ריק. איך תרצו למלא את היום?</p>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <button onClick={() => handleManualAdd('מנוחה במלון')} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-right group">
                                 <div className="bg-indigo-50 w-10 h-10 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-100 text-indigo-600"><BedDouble className="w-5 h-5" /></div>
                                 <div className="font-bold text-slate-800">זמן מנוחה</div>
                                 <div className="text-xs text-slate-500">הוסף "מנוחה במלון" ללו"ז</div>
                             </button>
                             
                             <button onClick={() => onSwitchTab && onSwitchTab('attractions')} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all text-right group">
                                 <div className="bg-purple-50 w-10 h-10 rounded-full flex items-center justify-center mb-3 group-hover:bg-purple-100 text-purple-600"><Ticket className="w-5 h-5" /></div>
                                 <div className="font-bold text-slate-800">מצא אטרקציה</div>
                                 <div className="text-xs text-slate-500">חפש פעילויות באזור</div>
                             </button>
                             
                             <button onClick={() => onSwitchTab && onSwitchTab('restaurants')} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all text-right group">
                                 <div className="bg-orange-50 w-10 h-10 rounded-full flex items-center justify-center mb-3 group-hover:bg-orange-100 text-orange-600"><Utensils className="w-5 h-5" /></div>
                                 <div className="font-bold text-slate-800">איפה אוכלים?</div>
                                 <div className="text-xs text-slate-500">גלה מסעדות מומלצות</div>
                             </button>
                         </div>
                     </div>
                 )}
             </div>
         ) : (
             <div className="flex items-center justify-center h-40 text-slate-400 font-bold">
                 טוען נתונים...
             </div>
         )}

         {/* Quick Add Modal */}
         {quickAddModal && (
             <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                 <div className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
                     <div className="flex justify-between items-center mb-6 relative z-10">
                         <div>
                             <h3 className="text-2xl font-black text-slate-800">הוספה ללו"ז</h3>
                             <p className="text-xs text-slate-400 font-bold">{activeDayPlan?.displayDayOfWeek}, {activeDayPlan?.displayDate}</p>
                         </div>
                         <button onClick={() => setQuickAddModal(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button>
                     </div>
                     <input 
                        autoFocus
                        placeholder="למשל: 19:00 ארוחת ערב"
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg text-slate-800 placeholder:text-slate-300 relative z-10"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleManualAdd(e.currentTarget.value);
                            }
                        }}
                     />
                     <div className="mt-4 flex gap-2 overflow-x-auto pb-2 relative z-10 no-scrollbar">
                         {['✈️ טיסה', '🏨 מלון', '🍽️ אוכל', '🎟️ אטרקציה', '🚗 נסיעה'].map(suggestion => (
                             <button 
                                key={suggestion}
                                onClick={() => handleManualAdd(`${suggestion} ב...`)}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 whitespace-nowrap transition-colors"
                             >
                                 {suggestion}
                             </button>
                         ))}
                     </div>
                 </div>
             </div>
         )}

        {/* Transfer Details Modal */}
        {transferModal && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <form onSubmit={handleSaveTransfer} className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Car className="w-6 h-6 text-emerald-600" /> פרטי הסעה</h3>
                        <button type="button" onClick={() => setTransferModal(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1">תיאור</label>
                            <input name="description" defaultValue="הסעה לשדה" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-emerald-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 block mb-1">שעה</label>
                                <input name="time" type="time" defaultValue={transferModal.defaultTime} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-emerald-500" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 block mb-1">מחיר (אופציונלי)</label>
                                <div className="relative">
                                    <input name="price" type="number" placeholder="0" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-emerald-500 pl-8" />
                                    <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-400 block mb-1">הערות / פרטי נהג</label>
                            <div className="relative">
                                <textarea name="notes" placeholder="שם הנהג, טלפון, נקודת איסוף..." rows={3} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 outline-none focus:border-emerald-500 resize-none pl-10" />
                                <User className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                            </div>
                        </div>
                        
                        <button type="submit" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all mt-2 flex items-center justify-center gap-2">
                            <Car className="w-5 h-5" /> שמור הסעה
                        </button>
                    </div>
                </form>
            </div>
        )}

      </div>
   );
};