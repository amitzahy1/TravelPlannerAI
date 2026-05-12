/** Realistic sample data for the design preview variants — Round 8.
 *  8-day itinerary, city-color map, premium design tokens. */

export interface PreviewPlace {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  rating: number;
  reviewCount: number;
  priceLevel: '$' | '$$' | '$$$' | '$$$$';
  photoUrl: string;
  recommendationSource: string;
  city: string;
  type: 'restaurant' | 'attraction';
  openingHours: string;
  isOpenNow: boolean;
  isFavorite?: boolean;
}

export interface PreviewHotel {
  id: string;
  name: string;
  city: string;
  address: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  photoUrl: string;
  rating: number;
  confirmationCode: string;
  roomCount: number;
  guestCount: number;
}

export interface PreviewFlight {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  airlineColor: string;
  airlineLogoUrl: string;
  fromCode: string;
  fromCity: string;
  toCode: string;
  toCity: string;
  date: string;
  dateDayOfWeek: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  pnr?: string;
  cabinClass?: string;
  status?: 'On Time' | 'Confirmed' | 'Delayed' | 'Boarding';
  terminal?: string;
  dayOfTrip?: number;
}

export interface PreviewDayPlan {
  id: string;
  day: number;
  date: string;
  dayOfWeek: string;
  city: string; // must be a key in CITY_COLORS
  events: Array<{
    id: string;
    time: string;
    title: string;
    subtitle?: string;
    type: 'hotel' | 'flight' | 'meal' | 'attraction' | 'transport';
  }>;
}

// ---- premium-travel design tokens (LOCKED — every variant respects these) ----
export const ACCENT = '#0F766E';      // teal-700, single accent across the app
export const ACCENT_SOFT = '#F0FDFA';  // teal-50
export const PAGE_BG = '#F8FAFC';      // slate-50
export const CARD_BG = '#FFFFFF';
export const TEXT_PRIMARY = '#0F172A';   // slate-900
export const TEXT_SECONDARY = '#475569'; // slate-600
export const TEXT_MUTED = '#94A3B8';     // slate-400
export const HAIRLINE = '#E2E8F0';       // slate-200

// One color per city for the itinerary — chosen to be muted/premium, never loud.
export const CITY_COLORS: Record<string, { accent: string; soft: string; label: string }> = {
  Bangkok:    { accent: '#0F766E', soft: '#F0FDFA', label: 'בנגקוק' },
  Pattaya:    { accent: '#B45309', soft: '#FFFBEB', label: 'פטאיה' },
  'Koh Chang':{ accent: '#7C2D12', soft: '#FEF3EC', label: 'קו צ׳אנג' },
};
export const getCityColor = (city: string) =>
  CITY_COLORS[city] || { accent: TEXT_SECONDARY, soft: '#F1F5F9', label: city };

export const TRIP_NAME = 'תאילנד 26';
export const TRIP_DATES = '6/8 – 26/8';
export const TRIP_COUNTDOWN_DAYS = 86;
export const TRIP_CITIES: { name: string; nights: number }[] = [
  { name: 'Bangkok', nights: 3 },
  { name: 'Pattaya', nights: 5 },
  { name: 'Koh Chang', nights: 10 },
];

export const previewPlaces: PreviewPlace[] = [
  {
    id: 'p1',
    name: 'Sühring',
    description: 'פיין דיינינג גרמני בשני כוכבי מישלן. האחים סוהרינג מפרשים מחדש מסורת אירופאית עם רכיבים תאילנדים מקומיים ועונתיים.',
    cuisine: 'Modern German',
    rating: 4.7,
    reviewCount: 480,
    priceLevel: '$$$$',
    photoUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
    recommendationSource: "Asia's 50 Best 2025",
    city: 'Bangkok',
    type: 'restaurant',
    openingHours: '18:00 – 23:00',
    isOpenNow: true,
    isFavorite: true,
  },
  {
    id: 'p2',
    name: 'Manpu Seafood',
    description: 'המקום הטוב ביותר לטום-יום-נודלס באי, עם דגים שנתפסים ישירות מהסירות הסמוכות. אווירה כפרית ומחיר נמוך.',
    cuisine: 'Thai Seafood',
    rating: 5.0,
    reviewCount: 16,
    priceLevel: '$',
    photoUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&q=80',
    recommendationSource: 'iamkohchang.com',
    city: 'Koh Chang',
    type: 'restaurant',
    openingHours: '11:00 – 21:00',
    isOpenNow: true,
  },
  {
    id: 'p3',
    name: 'Wat Pho',
    description: 'המקדש הגדול ביותר בבנגקוק והבית למסה של 46 מטר של בודהה שוכב מצופה זהב. אתר UNESCO וביה״ס תאי המקורי לעיסוי.',
    cuisine: 'Buddhist Temple',
    rating: 4.6,
    reviewCount: 89000,
    priceLevel: '$',
    photoUrl: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=1200&q=80',
    recommendationSource: 'Lonely Planet',
    city: 'Bangkok',
    type: 'attraction',
    openingHours: '08:00 – 18:30',
    isOpenNow: true,
  },
  {
    id: 'p4',
    name: 'Bangkok Reflection',
    description: 'מצפה מראות 2 קומות שנפתח ספטמבר 2025. נוף פנורמי 360° לעיר ביום, תצוגה צבעונית בלילה.',
    cuisine: 'Observation Deck',
    rating: 4.4,
    reviewCount: 150,
    priceLevel: '$$',
    photoUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&q=80',
    recommendationSource: 'Time Out Bangkok',
    city: 'Bangkok',
    type: 'attraction',
    openingHours: '10:00 – 22:00',
    isOpenNow: true,
  },
];

export const previewHotels: PreviewHotel[] = [
  {
    id: 'h1',
    name: 'Holiday Inn Pattaya',
    city: 'Pattaya',
    address: '463/68 Pattaya Sai Nueang Rd',
    checkIn: '2026-08-07',
    checkOut: '2026-08-12',
    nights: 5,
    photoUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200&q=80',
    rating: 4.4,
    confirmationCode: 'HI-PAT-77492',
    roomCount: 3,
    guestCount: 6,
  },
];

export const previewFlights: PreviewFlight[] = [
  {
    id: 'f1',
    airline: 'Etihad Airways',
    airlineCode: 'EY',
    flightNumber: 'EY598',
    airlineColor: '#bf914b',
    airlineLogoUrl: 'https://pics.avs.io/200/200/EY.png',
    fromCode: 'TLV',
    fromCity: 'Tel Aviv',
    toCode: 'AUH',
    toCity: 'Abu Dhabi',
    date: '2026-08-06',
    dateDayOfWeek: 'חמישי',
    departureTime: '21:35',
    arrivalTime: '02:50',
    duration: '4ש 15ד',
    pnr: 'EYK7M2',
    cabinClass: 'Economy',
    status: 'Confirmed',
    terminal: '3',
    dayOfTrip: 1,
  },
];

// ----- 8-day itinerary with no emojis on event rows -----
export const previewItinerary: PreviewDayPlan[] = [
  {
    id: 'd1', day: 1, date: '2026-08-07', dayOfWeek: 'שישי', city: 'Bangkok',
    events: [
      { id: 'e11', time: '13:55', title: 'נחיתה ב-BKK', type: 'flight' },
      { id: 'e12', time: '15:30', title: 'הסעה לפטאיה', subtitle: 'Toyota Commuter ×3', type: 'transport' },
      { id: 'e13', time: '17:00', title: 'צ׳ק-אין Holiday Inn Pattaya', type: 'hotel' },
      { id: 'e14', time: '20:00', title: 'ארוחת ערב — Mum Aroi', subtitle: 'דגי ים', type: 'meal' },
    ],
  },
  {
    id: 'd2', day: 2, date: '2026-08-08', dayOfWeek: 'שבת', city: 'Pattaya',
    events: [
      { id: 'e21', time: '08:30', title: 'ארוחת בוקר במלון', type: 'meal' },
      { id: 'e22', time: '10:00', title: 'Sanctuary of Truth', subtitle: 'מקדש העץ הענק', type: 'attraction' },
      { id: 'e23', time: '13:00', title: 'Cabbages & Condoms', subtitle: 'ארוחת צהריים בגן', type: 'meal' },
      { id: 'e24', time: '20:00', title: 'מופע Tiffany Show', type: 'attraction' },
    ],
  },
  {
    id: 'd3', day: 3, date: '2026-08-09', dayOfWeek: 'ראשון', city: 'Pattaya',
    events: [
      { id: 'e31', time: '09:00', title: 'Nong Nooch Tropical Garden', subtitle: 'גן בוטני וגן דינוזאורים', type: 'attraction' },
      { id: 'e32', time: '13:30', title: 'ארוחה ב-Glass House', subtitle: 'דגים על החוף', type: 'meal' },
      { id: 'e33', time: '16:00', title: 'חוף ג׳ומטיין', type: 'attraction' },
      { id: 'e34', time: '20:30', title: 'Mae Sai Floating Market', type: 'meal' },
    ],
  },
  {
    id: 'd4', day: 4, date: '2026-08-10', dayOfWeek: 'שני', city: 'Pattaya',
    events: [
      { id: 'e41', time: '10:00', title: 'Cartoon Network Amazone', subtitle: 'פארק מים — יום שלם', type: 'attraction' },
      { id: 'e42', time: '14:00', title: 'ארוחת צהריים בפארק', type: 'meal' },
      { id: 'e43', time: '19:30', title: 'Punjab Grill — Central Festival', type: 'meal' },
    ],
  },
  {
    id: 'd5', day: 5, date: '2026-08-11', dayOfWeek: 'שלישי', city: 'Pattaya',
    events: [
      { id: 'e51', time: '09:00', title: 'Pattaya Floating Market', type: 'attraction' },
      { id: 'e52', time: '12:30', title: 'ארוחה ב-Casa Pascal', type: 'meal' },
      { id: 'e53', time: '15:00', title: 'נוף הפסל-הר Khao Chi Chan', type: 'attraction' },
    ],
  },
  {
    id: 'd6', day: 6, date: '2026-08-12', dayOfWeek: 'רביעי', city: 'Koh Chang',
    events: [
      { id: 'e61', time: '09:30', title: 'הסעה לטראט + מעבורת לקו צ׳אנג', type: 'transport' },
      { id: 'e62', time: '15:00', title: 'צ׳ק-אין Santhiya Tree Resort', type: 'hotel' },
      { id: 'e63', time: '19:00', title: 'Saaitara — ארוחה במלון', type: 'meal' },
    ],
  },
  {
    id: 'd7', day: 7, date: '2026-08-13', dayOfWeek: 'חמישי', city: 'Koh Chang',
    events: [
      { id: 'e71', time: '08:00', title: 'סנורקלינג בקוה ראנג', subtitle: 'שייט מ-Bang Bao', type: 'attraction' },
      { id: 'e72', time: '13:30', title: 'ארוחת צהריים על הסירה', type: 'meal' },
      { id: 'e73', time: '20:00', title: 'Manpu Seafood', subtitle: 'טום יום נודלס מקומי', type: 'meal' },
    ],
  },
  {
    id: 'd8', day: 8, date: '2026-08-14', dayOfWeek: 'שישי', city: 'Koh Chang',
    events: [
      { id: 'e81', time: '10:00', title: 'מפל Klong Plu', type: 'attraction' },
      { id: 'e82', time: '14:00', title: 'Kati Culinary — קארי תאי', type: 'meal' },
      { id: 'e83', time: '17:00', title: 'תצפית Kai Bae לשקיעה', type: 'attraction' },
      { id: 'e84', time: '20:30', title: 'BBQ על החוף — Cookies Resort', type: 'meal' },
    ],
  },
];

export const previewBudgetTotal = { spent: 3135, budget: 4200, currency: 'USD' };
export const previewBudget = [
  { id: 'b1', label: 'מסעדות', spent: 840, budget: 1500 },
  { id: 'b2', label: 'מלונות', spent: 1980, budget: 2000 },
  { id: 'b3', label: 'תחבורה', spent: 220, budget: 400 },
  { id: 'b4', label: 'אטרקציות', spent: 95, budget: 300 },
];

export const HERO_PHOTO = 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1600&q=80';
