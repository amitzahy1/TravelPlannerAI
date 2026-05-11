/**
 * Sample data for the design preview. Re-uses real entries from the user's
 * Thailand trip so each style is rendering authentic content rather than
 * synthetic lorem-ipsum — makes the visual comparison honest.
 */

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
  openingHours?: string;
  isOpenNow?: boolean;
  walkingMinutes?: number;
}

export interface PreviewHotel {
  id: string;
  name: string;
  city: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  photoUrl: string;
  pricePerNight: number;
  rating: number;
}

export interface PreviewItineraryItem {
  id: string;
  day: number;
  date: string;
  time: string;
  title: string;
  type: 'meal' | 'attraction' | 'transport' | 'hotel';
  notes?: string;
}

export interface PreviewBudgetCategory {
  id: string;
  label: string;
  spent: number;
  budget: number;
  emoji: string;
}

// 5 real places from the user's Thailand trip
export const previewPlaces: PreviewPlace[] = [
  {
    id: 'preview-1',
    name: 'Sühring',
    description: 'פיין דיינינג גרמני בשתי כוכבי מישלן. האחים סוהרינג מפרשים מחדש מסורת אירופאית עם רכיבים תאילנדים מקומיים ועונתיים.',
    cuisine: 'Modern German',
    rating: 4.7,
    reviewCount: 480,
    priceLevel: '$$$$',
    photoUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    recommendationSource: "Asia's 50 Best 2025 #11",
    city: 'Bangkok',
    type: 'restaurant',
    openingHours: '18:00 – 23:00',
    isOpenNow: true,
    walkingMinutes: 12,
  },
  {
    id: 'preview-2',
    name: 'Manpu Seafood',
    description: 'המקום הטוב ביותר לטום-יום-נודלס באי, עם דגים שנתפסים ישירות מהסירות הסמוכות. מחיר נמוך מאוד, איכות עולה על מסעדות התיירים.',
    cuisine: 'Thai Seafood',
    rating: 5.0,
    reviewCount: 16,
    priceLevel: '$',
    photoUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80',
    recommendationSource: 'iamkohchang.com',
    city: 'Koh Chang',
    type: 'restaurant',
    openingHours: '11:00 – 21:00',
    isOpenNow: true,
    walkingMinutes: 4,
  },
  {
    id: 'preview-3',
    name: 'Wat Pho (Reclining Buddha)',
    description: 'המקדש הגדול ביותר בבנגקוק והבית למסה של 46 מטר של בודהה שוכב מצופה זהב. בית הספר התאי המקורי לעיסוי.',
    cuisine: 'Buddhist Temple',
    rating: 4.6,
    reviewCount: 89000,
    priceLevel: '$',
    photoUrl: 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=800&q=80',
    recommendationSource: 'Lonely Planet',
    city: 'Bangkok',
    type: 'attraction',
    openingHours: '08:00 – 18:30',
    isOpenNow: true,
    walkingMinutes: 8,
  },
  {
    id: 'preview-4',
    name: 'Bangkok Reflection',
    description: 'מצפה מראות 2 קומות שנפתח ספטמבר 2025 ב-One City Center — נוף פנורמי 360° לעיר ביום, תצוגה צבעונית בלילה.',
    cuisine: 'Observation Deck',
    rating: 4.4,
    reviewCount: 150,
    priceLevel: '$$',
    photoUrl: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80',
    recommendationSource: 'Time Out Bangkok 2025',
    city: 'Bangkok',
    type: 'attraction',
    openingHours: '10:00 – 22:00',
    isOpenNow: true,
    walkingMinutes: 6,
  },
  {
    id: 'preview-5',
    name: 'Kati Culinary',
    description: 'המקום לקארי תאי אמיתי. כל משחות הקארי נעשות במקום מאפס — Massaman חריף, עוף מטוגן עם עשב לימון פריך.',
    cuisine: 'Thai (Curry)',
    rating: 4.6,
    reviewCount: 1100,
    priceLevel: '$$',
    photoUrl: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&q=80',
    recommendationSource: 'iamkohchang.com',
    city: 'Koh Chang',
    type: 'restaurant',
    openingHours: '12:00 – 22:00',
    isOpenNow: false,
    walkingMinutes: 22,
  },
];

export const previewHotels: PreviewHotel[] = [
  {
    id: 'hotel-1',
    name: 'Mandarin Oriental Bangkok',
    city: 'Bangkok',
    checkIn: '2026-06-15',
    checkOut: '2026-06-18',
    nights: 3,
    photoUrl: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
    pricePerNight: 420,
    rating: 4.8,
  },
  {
    id: 'hotel-2',
    name: 'Santhiya Tree Koh Chang Resort',
    city: 'Koh Chang',
    checkIn: '2026-06-18',
    checkOut: '2026-06-22',
    nights: 4,
    photoUrl: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80',
    pricePerNight: 180,
    rating: 4.6,
  },
];

export const previewItinerary: PreviewItineraryItem[] = [
  { id: 'day1-1', day: 1, date: '2026-06-15', time: '09:00', title: 'Check-in: Mandarin Oriental', type: 'hotel', notes: 'Early check-in arranged' },
  { id: 'day1-2', day: 1, date: '2026-06-15', time: '11:30', title: 'Wat Pho — Reclining Buddha', type: 'attraction' },
  { id: 'day1-3', day: 1, date: '2026-06-15', time: '14:00', title: 'Lunch at Kati Culinary', type: 'meal', notes: 'Tom kha gai must-try' },
  { id: 'day1-4', day: 1, date: '2026-06-15', time: '19:30', title: 'Dinner at Sühring', type: 'meal', notes: 'Reservation #4521' },
  { id: 'day2-1', day: 2, date: '2026-06-16', time: '10:00', title: 'Bangkok Reflection observatory', type: 'attraction' },
  { id: 'day2-2', day: 2, date: '2026-06-16', time: '13:00', title: 'Lunch at Manpu Seafood', type: 'meal' },
];

export const previewBudget: PreviewBudgetCategory[] = [
  { id: 'b-meals', label: 'מסעדות', spent: 840, budget: 1500, emoji: '🍽️' },
  { id: 'b-hotels', label: 'מלונות', spent: 1980, budget: 2000, emoji: '🏨' },
  { id: 'b-transport', label: 'תחבורה', spent: 220, budget: 400, emoji: '🚗' },
  { id: 'b-attractions', label: 'אטרקציות', spent: 95, budget: 300, emoji: '🎟️' },
];

export const previewBudgetTotal = {
  spent: previewBudget.reduce((s, b) => s + b.spent, 0),
  budget: previewBudget.reduce((s, b) => s + b.budget, 0),
  currency: 'USD',
};
