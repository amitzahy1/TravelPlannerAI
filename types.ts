

export enum FlightType {
  DEPARTURE = 'DEPARTURE',
  RETURN = 'RETURN'
}

export interface FlightSegment {
  fromCode: string;
  fromCity: string;
  toCode: string;
  toCity: string;
  departureTime: string; // ISO string or formatted string
  arrivalTime: string;
  flightNumber: string;
  airline: string;
  duration: string;
  date: string;
  // New Fields
  terminal?: string;
  gate?: string;
  status?: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'SCHEDULED';
  // Map support
  toLat?: number;
  toLng?: number;
  price?: number; // Cost estimate
  baggage?: string; // New: e.g. "2PCS SALE"
}

export interface Ticket {
  passengerName: string;
  pnr: string;
  segments: FlightSegment[];
  totalPrice?: number; // Total ticket cost
}

export type RestaurantIconType = 'ramen' | 'burger' | 'meat' | 'seafood' | 'michelin' | 'cafe' | 'street' | 'bar' | 'dessert';

export interface Reservation {
  id: string;
  restaurantId: string;
  restaurantName: string;
  date: string;
  time: string;
  people: number;
  confirmationCode?: string;
  status: 'CONFIRMED' | 'PENDING';
}

export interface HotelBooking {
  id: string;
  name: string;
  address: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  confirmationCode?: string;
  roomType?: string;
  price?: string; // String to allow currency symbols, parsed later
  costNumeric?: number; // Actual number for calc
  imageUrl?: string;
  googleMapsUrl?: string;
  bookingSource?: 'Booking.com' | 'Agoda' | 'Airbnb' | 'Direct';
  notes?: string; // User notes
  lat?: number;
  lng?: number;
  // New AI Field
  locationVibe?: string; // Short AI description of the neighborhood
  // New Parsing Fields
  breakfastIncluded?: boolean;
  cancellationPolicy?: string;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  priceRange?: string; // Optional now
  location: string;
  googleMapsUrl?: string;
  recommendedDishes?: string[];
  michelin?: boolean;
  rank?: number;
  imageUrl?: string;

  // New fields
  iconType?: RestaurantIconType;
  googleRating?: number;
  reviewCount?: number; // Added field
  recommendationSource?: string;
  notes?: string; // User notes/comments
  reservationDate?: string; // DD/MM/YYYY
  reservationTime?: string; // HH:MM
  lat?: number;
  lng?: number;
  estimatedCost?: number; // For budget

  // UX Improvements
  matchScore?: number; // 1-100 score of how well it fits the user
  matchReason?: string; // "Good for families", "Near your hotel"
  tags?: string[]; // "Spicy", "Vegetarian Options", "View"
  isFavorite?: boolean; // New: Pin to top
}

export interface RestaurantCategory {
  id: string;
  title: string;
  region: string;
  restaurants: Restaurant[];
}

export interface Attraction {
  id: string;
  name: string;
  description: string;
  location: string;
  googleMapsUrl?: string;
  price?: string; // Display string
  costNumeric?: number; // For budget
  rating?: number;
  reviewCount?: number; // Added field
  notes?: string; // User notes/comments
  scheduledDate?: string; // DD/MM/YYYY
  scheduledTime?: string; // HH:MM
  lat?: number;
  lng?: number;
  // Added optional fields to fix TypeScript errors
  type?: string;
  recommendationSource?: string;
  isFavorite?: boolean; // New: Pin to top
}

export interface AttractionCategory {
  id: string;
  title: string;
  attractions: Attraction[];
}

export interface ItineraryItem {
  id: string;
  day: number;
  date: string;
  title: string;
  activities: string[];
  notes?: string;
}

export interface WeatherForecast {
  date: string;
  dayName: string;
  temp: number; // Celsius
  condition: 'sunny' | 'cloudy' | 'rain' | 'storm' | 'partly-cloudy';
  rainMm?: number; // Rainfall in mm
  humidity?: number; // Humidity percentage
}

export interface NewsItem {
  id: string;
  text: string;
  severity: 'info' | 'warning' | 'alert';
}

export interface TravelersComposition {
  adults: number;
  children: number;
  babies: number;
}

export interface ManualExpense {
  id: string;
  title: string;
  amount: number;
  category: 'food' | 'shopping' | 'transport' | 'other';
}

export interface SecureNote {
  id: string;
  title: string; // e.g. "Passport Number"
  value: string; // The secret value
  category: 'passport' | 'insurance' | 'credit_card' | 'other';
}

export type VatStatus = 'NEED_FORM' | 'HAVE_FORM' | 'STAMPED_AT_CUSTOMS' | 'REFUNDED';

export interface ShoppingItem {
  id: string;
  name: string; // Product name
  shopName: string;
  price: number;
  currency: string; // 'THB', 'USD', 'ILS'
  purchaseDate: string;

  // Media
  receiptImageUrl?: string; // Base64 or URL
  productImageUrl?: string; // Base64 or URL

  // VAT Refund Logic
  isVatEligible: boolean;
  vatStatus?: VatStatus;
  refundAmountEstimated?: number;

  notes?: string;
}

// --- NEW: Trip Sharing Types ---
export interface SharedTripMetadata {
  owner: string;              // userId of the owner
  collaborators: string[];    // list of userId who can edit
  shareId: string;            // unique share identifier
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;          // userId of last editor
}

export interface UserTripRef {
  sharedTripId: string;
  role: 'owner' | 'collaborator';
  joinedAt: Date;
  tripName: string;           // cached trip name for display
}

export interface Trip {
  id: string;
  name: string;
  dates: string;
  destination: string;
  destinationEnglish?: string; // New field for Weather API
  coverImage: string;
  groupType?: 'family' | 'couple' | 'friends' | 'solo' | 'business';
  travelers?: TravelersComposition; // Detailed composition
  flights: Ticket;
  hotels: HotelBooking[];
  restaurants: RestaurantCategory[];
  reservations?: Reservation[];
  attractions: AttractionCategory[];
  itinerary: ItineraryItem[];
  documents: string[];
  weather?: WeatherForecast[];
  news?: NewsItem[];
  currency?: string;
  budgetLimit?: number;

  expenses?: ManualExpense[]; // Added for manual budget tracking
  shoppingItems?: ShoppingItem[]; // NEW: Detailed shopping tracker

  secureNotes?: SecureNote[]; // LOCAL ONLY - Secure Vault

  // Caching for AI Recommendations
  aiRestaurants?: RestaurantCategory[];
  aiAttractions?: AttractionCategory[];

  // NEW: Trip Sharing
  isShared?: boolean;           // Whether trip is shared
  sharing?: SharedTripMetadata; // Sharing metadata

  // NEW: Dynamic Categories (Task 3)
  customFoodCategories?: string[];       // User-created food search categories
  customAttractionCategories?: string[]; // User-created attraction search categories
}

export interface AppState {
  trips: Trip[];
  activeTripId: string;
}

// --- Timeline Types (Shared for TripDateSelector) ---
export type TimelineEventType = 'flight' | 'hotel_stay' | 'hotel_checkin' | 'hotel_checkout' | 'food' | 'attraction' | 'activity' | 'shopping' | 'travel';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  time: string; // HH:MM
  title: string;
  subtitle?: string;
  location?: string;
  price?: string;
  icon: any; // Lucide Icon
  colorClass: string;
  bgClass: string;
  externalLink?: string;
  isManual?: boolean;
  dayId?: string;
  activityIndex?: number;
  isExternal?: boolean;
}

export interface DayPlan {
  dateIso: string;
  displayDate: string;
  displayDayOfWeek: string;
  locationContext: string;
  events: TimelineEvent[];
  stats: { food: number, attr: number, flight: number, travel: number, hotel: number };
  hasHotel: boolean;
}