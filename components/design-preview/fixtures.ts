/** Realistic sample data for the design preview variants. */

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
  walkingMinutes: number;
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
  pricePerNight: number;
  rating: number;
  confirmationCode?: string;
  roomCount: number;
  guestCount: number;
}

export interface PreviewFlight {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  airlineColor: string; // hex
  airlineTextColor: string;
  fromCode: string;
  fromCity: string;
  toCode: string;
  toCity: string;
  date: string; // ISO
  departureTime: string; // HH:MM
  arrivalTime: string;
  duration: string;
  seat?: string;
  cabinClass: string;
  gate?: string;
  terminal?: string;
}

export interface PreviewDayPlan {
  id: string;
  day: number;
  date: string;
  dayOfWeek: string;
  city: string;
  events: Array<{
    id: string;
    time: string;
    title: string;
    subtitle?: string;
    type: 'hotel' | 'flight' | 'meal' | 'attraction' | 'transport';
    emoji: string;
  }>;
}

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
    recommendationSource: "Asia's 50 Best 2025 #11",
    city: 'Bangkok',
    type: 'restaurant',
    openingHours: '18:00 – 23:00',
    isOpenNow: true,
    walkingMinutes: 12,
    isFavorite: true,
  },
  {
    id: 'p2',
    name: 'Manpu Seafood',
    description: 'המקום הטוב ביותר לטום-יום-נודלס באי, עם דגים שנתפסים ישירות מהסירות הסמוכות.',
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
    walkingMinutes: 4,
  },
  {
    id: 'p3',
    name: 'Wat Pho',
    description: 'המקדש הגדול ביותר בבנגקוק והבית למסה של 46 מטר של בודהה שוכב מצופה זהב.',
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
    walkingMinutes: 8,
  },
  {
    id: 'p4',
    name: 'Bangkok Reflection',
    description: 'מצפה מראות 2 קומות שנפתח ספטמבר 2025. נוף פנורמי 360° לעיר.',
    cuisine: 'Observation Deck',
    rating: 4.4,
    reviewCount: 150,
    priceLevel: '$$',
    photoUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=1200&q=80',
    recommendationSource: 'Time Out Bangkok 2025',
    city: 'Bangkok',
    type: 'attraction',
    openingHours: '10:00 – 22:00',
    isOpenNow: true,
    walkingMinutes: 6,
  },
];

export const previewHotels: PreviewHotel[] = [
  {
    id: 'h1',
    name: 'Holiday Inn Pattaya',
    city: 'Pattaya',
    address: '463/68 Pattaya Sai Nueang Rd, Pattaya, Thailand',
    checkIn: '2026-08-07',
    checkOut: '2026-08-12',
    nights: 5,
    photoUrl: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200&q=80',
    pricePerNight: 175,
    rating: 4.4,
    confirmationCode: 'HI-PAT-77492',
    roomCount: 3,
    guestCount: 6,
  },
  {
    id: 'h2',
    name: 'Santhiya Tree Koh Chang Resort',
    city: 'Koh Chang',
    address: 'Klong Son, Koh Chang, Trat 23170',
    checkIn: '2026-08-12',
    checkOut: '2026-08-17',
    nights: 5,
    photoUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80',
    pricePerNight: 230,
    rating: 4.6,
    confirmationCode: 'ST-KCH-22841',
    roomCount: 3,
    guestCount: 6,
  },
  {
    id: 'h3',
    name: 'KC Grande Resort Koh Chang',
    city: 'Koh Chang',
    address: 'White Sand Beach, Koh Chang, Trat 23170',
    checkIn: '2026-08-17',
    checkOut: '2026-08-22',
    nights: 5,
    photoUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1200&q=80',
    pricePerNight: 195,
    rating: 4.5,
    confirmationCode: '592619088',
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
    airlineTextColor: '#FFFFFF',
    fromCode: 'TLV',
    fromCity: 'Tel Aviv',
    toCode: 'AUH',
    toCity: 'Abu Dhabi',
    date: '2026-08-06',
    departureTime: '21:35',
    arrivalTime: '02:50',
    duration: '4ש 15ד',
    seat: '24A',
    cabinClass: 'Economy',
    gate: 'C12',
    terminal: '3',
  },
  {
    id: 'f2',
    airline: 'Etihad Airways',
    airlineCode: 'EY',
    flightNumber: 'EY402',
    airlineColor: '#bf914b',
    airlineTextColor: '#FFFFFF',
    fromCode: 'AUH',
    fromCity: 'Abu Dhabi',
    toCode: 'BKK',
    toCity: 'Bangkok',
    date: '2026-08-07',
    departureTime: '04:25',
    arrivalTime: '13:55',
    duration: '6ש 30ד',
    seat: '32A',
    cabinClass: 'Economy',
    terminal: '1',
  },
  {
    id: 'f3',
    airline: 'Bangkok Airways',
    airlineCode: 'PG',
    flightNumber: 'PG306',
    airlineColor: '#7c2855',
    airlineTextColor: '#FFFFFF',
    fromCode: 'TDX',
    fromCity: 'Trat',
    toCode: 'BKK',
    toCity: 'Bangkok',
    date: '2026-08-22',
    departureTime: '11:55',
    arrivalTime: '13:00',
    duration: '1ש 5ד',
    cabinClass: 'Economy',
  },
];

export const previewItinerary: PreviewDayPlan[] = [
  {
    id: 'd1',
    day: 1,
    date: '2026-08-07',
    dayOfWeek: 'שישי',
    city: 'Bangkok',
    events: [
      { id: 'e1', time: '13:55', title: 'נחיתה ב-BKK', type: 'flight', emoji: '✈️' },
      { id: 'e2', time: '15:30', title: 'הסעה לפטאיה', subtitle: 'Toyota Commuter ×3', type: 'transport', emoji: '🚗' },
      { id: 'e3', time: '17:00', title: 'צ׳ק-אין Holiday Inn Pattaya', type: 'hotel', emoji: '🏨' },
      { id: 'e4', time: '20:00', title: 'ארוחת ערב — Mum Aroi', subtitle: 'מסעדת ים מקומית', type: 'meal', emoji: '🍽️' },
    ],
  },
  {
    id: 'd2',
    day: 2,
    date: '2026-08-08',
    dayOfWeek: 'שבת',
    city: 'Pattaya',
    events: [
      { id: 'e5', time: '08:30', title: 'ארוחת בוקר במלון', type: 'meal', emoji: '🥐' },
      { id: 'e6', time: '10:00', title: 'Sanctuary of Truth', subtitle: 'מקדש העץ הענק', type: 'attraction', emoji: '🛕' },
      { id: 'e7', time: '13:00', title: 'Cabbages & Condoms', subtitle: 'ארוחת צהריים בגן', type: 'meal', emoji: '🍽️' },
      { id: 'e8', time: '20:00', title: 'מופע Tiffany Show', type: 'attraction', emoji: '🎭' },
    ],
  },
];

export const previewBudgetTotal = { spent: 3135, budget: 4200, currency: 'USD' };
export const previewBudget = [
  { id: 'b1', label: 'מסעדות', spent: 840, budget: 1500, emoji: '🍽️' },
  { id: 'b2', label: 'מלונות', spent: 1980, budget: 2000, emoji: '🏨' },
  { id: 'b3', label: 'תחבורה', spent: 220, budget: 400, emoji: '🚗' },
  { id: 'b4', label: 'אטרקציות', spent: 95, budget: 300, emoji: '🎟️' },
];

// Premium-travel accent palette — shared across all variants.
export const ACCENT = '#0F766E'; // teal-700 — premium-travel feel
export const ACCENT_SOFT = '#F0FDFA';
export const HERO_PHOTO = 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1600&q=80';
