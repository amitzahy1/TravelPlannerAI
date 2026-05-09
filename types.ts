

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
  // Deep Extraction Fields
  cancellationPolicy?: string;
  mealPlan?: string; // "Meal included", "Buy on board"
  seat?: string;
  class?: string; // "Economy", "Business"
}

export interface TrainRide {
  id: string;
  provider: string; // "Eurostar", "Amtrak"
  trainNumber: string;
  fromStation: string;
  toStation: string;
  departureTime: string; // ISO
  arrivalTime: string; // ISO
  date: string;
  duration?: string;
  class?: string; // "Standard", "Premier"
  car?: string;
  seat?: string;
  platform?: string;
  price?: number;
  currency?: string;
  bookingReference?: string;
}

export interface Cruise {
  id: string;
  cruiseLine: string; // "Royal Caribbean"
  shipName: string;
  cabinNumber?: string;
  deck?: string;
  departurePort: string;
  arrivalPort: string;
  departureTime: string; // ISO
  arrivalTime: string; // ISO
  portsOfCall?: { name: string; arrival: string; departure: string }[];
  bookingReference?: string;
  mealPlan?: string; // "All Inclusive"
  price?: number;
}

export interface BusRide {
  id: string;
  provider: string; // "FlixBus"
  fromCity: string;
  toCity: string;
  departureTime: string;
  arrivalTime: string;
  price?: number;
  bookingReference?: string;
}

export interface FerryRide {
  id: string;
  provider: string;
  fromPort: string;
  toPort: string;
  departureTime: string;
  arrivalTime: string;
  vehicle?: string; // "Car", "Foot Passenger"
  price?: number;
}

/**
 * Unified transport leg. Replaces the parallel arrays (flights, trains,
 * buses, ferries, cruises) with a single Transport[] that any view can
 * read sorted by date+time. The legacy arrays still work — buildUnifiedTransports
 * mirrors them into Transport[] on read so old data keeps rendering.
 */
export type TransportMode = 'flight' | 'train' | 'bus' | 'ferry' | 'cruise' | 'transfer' | 'car_rental' | 'drive';

export interface Transport {
  id: string;
  mode: TransportMode;
  from: string;
  to: string;
  fromCode?: string;       // IATA / station / port code
  toCode?: string;
  date: string;            // ISO yyyy-mm-dd
  departureTime?: string;  // HH:MM or full ISO
  arrivalTime?: string;
  duration?: string;       // "2h 15m" / "45m" — display string
  provider?: string;       // airline / bus operator / ferry company
  bookingRef?: string;     // PNR / confirmation code
  price?: number;
  currency?: string;
  notes?: string;
  fromLat?: number; fromLng?: number;
  toLat?: number;   toLng?: number;
  // Display
  color?: string;          // explicit hex; if absent UI uses MODE_COLORS[mode]
  // Provenance — points back to whichever legacy array the leg came from
  // so updates can be written to the right place.
  sourceFlightSegmentIndex?: number; // index into trip.flights.segments
  sourceArrayKey?: 'flights' | 'trains' | 'buses' | 'ferries' | 'cruises' | 'transports';
  // Mode-specific extras (carried as-is, optional)
  flightNumber?: string;
  terminal?: string;
  gate?: string;
  vehicle?: string;        // ferry: "Car" / "Foot"; train: car number; transfer: "Van" / "Taxi"
  pickupPoint?: string;    // hotel pickup for transfers
}

export interface Ticket {
  passengers: string[]; // Supports multiple passengers per PNR
  pnr: string;
  segments: FlightSegment[];
  totalPrice?: number; // Total ticket cost
  currency?: string; // New: Store original currency
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

export interface HotelRoom {
  id: string;
  label?: string;        // Family name / room label, e.g. "משפחת כהן"
  roomType?: string;     // e.g. "Deluxe Double Room", "Junior Suite"
  adults: number;
  children: number;
  beds?: string;         // "King Bed", "Twin Beds", "Double Bed"
  notes?: string;        // Special requests / preferences
}

export interface HotelBooking {
  id: string;
  name: string;
  city?: string; // New field for context
  address: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  confirmationCode?: string;
  roomType?: string;
  price?: string; // String to allow currency symbols, parsed later
  costNumeric?: number; // Actual number for calc
  currency?: string; // New: Store original currency
  imageUrl?: string;
  // ... existing fields
  googleMapsUrl?: string;
  bookingSource?: 'Booking.com' | 'Agoda' | 'Airbnb' | 'Direct';
  notes?: string; // User notes
  lat?: number;
  lng?: number;
  // New AI Field
  locationVibe?: string; // Short AI description of the neighborhood
  locationVibeCheckedAt?: number; // epoch ms — TTL gate so the vibe doesn't re-fetch on every click
  // New Parsing Fields
  breakfastIncluded?: boolean; // Legacy boolean
  cancellationPolicy?: string;
  mealPlan?: string; // "Room Only", "Half Board", "All Inclusive"
  roomView?: string; // "Sea View"
  checkInInstructions?: string; // "Keybox 1234"
  guests?: string[]; // Multiple guests (legacy)
  rooms?: HotelRoom[]; // Detailed room breakdown
  phone?: string; // Hotel reception phone — used by the wallet for "call hotel"
}

export interface Restaurant {
  id: string;
  name: string;
  nameEnglish?: string; // Original Latin-script name — used for map markers / popups
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
  geocodeFailed?: boolean; // Set when all geocoding fallbacks exhausted; surfaces a UI warning

  // Photon-based verification metadata (free, no paid API). Populated by
  // utils/placeVerification.ts; written from backgroundResearch + lazy
  // map geocoding so the UI can show a verified/ambiguous/not_found badge.
  osmId?: string;                // "<osm_type>:<osm_id>" — stable OSM identifier
  verifiedCountry?: string;      // Photon properties.country
  verifiedCity?: string;         // Photon properties.city
  verificationStatus?: 'verified' | 'ambiguous' | 'not_found' | 'manual';
  verificationSource?: 'photon' | 'google_maps_url' | 'manual';
  verifiedAt?: number;
  verificationConfidence?: number;   // 0-1; <0.5 surfaces the "כדאי לבדוק" warning
  verificationReason?: string;       // human-readable Hebrew reason shown inside the warning           // epoch ms — used to skip re-verify within 30 days

  // UX Improvements
  matchScore?: number; // 1-100 score of how well it fits the user
  matchReason?: string; // "Good for families", "Near your hotel"
  tags?: string[]; // "Spicy", "Vegetarian Options", "View"
  isFavorite?: boolean; // New: Pin to top
  categoryTitle?: string; // New: For dynamic mapping

  // Real-Time Logic Upgrade (Jan 2026)
  vibe?: "Loud & Energetic" | "Quiet & Intimate" | "Business Casual" | "Romantic" | "Family Style" | string;
  must_try_dish?: string; // Specific dish recommendation
  googleSearchQuery?: string; // Pre-calculated for API
  bestTime?: "Lunch" | "Dinner" | "Breakfast" | "Late Night";
  reservationRequired?: boolean;
  priceLevel?: "$" | "$$" | "$$$" | "$$$$";

  // Fixes for build errors
  cuisine?: string;
  price?: string;
  region?: string;
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
  nameEnglish?: string; // Original Latin-script name — used for the map and any English UI surface
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
  geocodeFailed?: boolean; // Set when all geocoding fallbacks exhausted; surfaces a UI warning

  // Photon-based verification metadata (free, no paid API). Same shape as
  // Restaurant — kept in sync so utils/placeVerification.ts can write to
  // either entity through one helper.
  osmId?: string;
  verifiedCountry?: string;
  verifiedCity?: string;
  verificationStatus?: 'verified' | 'ambiguous' | 'not_found' | 'manual';
  verificationSource?: 'photon' | 'google_maps_url' | 'manual';
  verifiedAt?: number;
  verificationConfidence?: number;   // 0-1; <0.5 surfaces the "כדאי לבדוק" warning
  verificationReason?: string;       // human-readable Hebrew reason shown inside the warning

  // Added optional fields to fix TypeScript errors
  type?: string;
  recommendationSource?: string;
  isFavorite?: boolean; // New: Pin to top
  categoryTitle?: string; // New: For dynamic mapping
  imageUrl?: string;      // Manual/AI Image
  region?: string;        // Region/City context

  // Unified Engine Upgrade (Jan 2026)
  best_time_to_visit?: string; // "Sunset", "Early Morning"
  activity_type?: "Adventure" | "Culture" | "Relaxation" | "Shopping" | string;
  duration?: string; // "1-2 hours"
  visual_tag?: string; // "temple_gold", "beach_sunset" for Image Mapper
}

export interface AttractionCategory {
  id: string;
  title: string;
  region?: string;
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
  currency?: string; // New: Store original currency
  category: 'food' | 'shopping' | 'transport' | 'other';
}

export interface SecureNote {
  id: string;
  title: string; // e.g. "Passport Number"
  value: string; // The secret value
  category: 'passport' | 'insurance' | 'credit_card' | 'visa' | 'other';
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
  role?: TripRole; // UI helper field
}

// 'collaborator' is a legacy synonym for 'editor' kept for back-compat with
// already-joined trips. New joins set 'editor' or 'viewer' explicitly.
export type TripRole = 'owner' | 'editor' | 'viewer' | 'collaborator';

export interface UserTripRef {
  sharedTripId: string;
  role: TripRole;
  joinedAt: Date;
  tripName: string;           // cached trip name for display
}

export interface TripInvite {
  shareId: string;
  tripName: string;
  destination: string;
  dates: string;
  hostName: string; // "Amit Zahy" or email
  coverImage: string;
  ownerId: string;
  createdAt: Date;
}

export interface Trip {
  id: string;
  name: string;
  dates: string;
  destination: string;
  days?: number; // Total duration in days
  destinationEnglish?: string; // New field for Weather API
  coverImage: string;
  /** Focal point for the cover image, in percent (0-100). Lets the user pick
   *  which part of a wide photo shows in the hero on narrow screens. */
  coverFocal?: { x: number; y: number };
  groupType?: 'family' | 'couple' | 'friends' | 'solo' | 'business';
  travelers?: TravelersComposition; // Detailed composition
  flights: Ticket; // Legacy name, maybe rename to 'transport'?
  trains?: TrainRide[];
  cruises?: Cruise[];
  buses?: BusRide[];
  ferries?: FerryRide[];
  /** Unified transport list — additive to the legacy arrays above. Holds
   *  manual / AI-extracted transfers, ferries, drives that aren't in the
   *  classic flight/train/bus/ferry shape. buildUnifiedTransports merges
   *  this with the legacy arrays for views that want a single sorted list. */
  transports?: Transport[];
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
  /** UID of the actual creator of the shared trip doc. Populated by
   *  getSharedTrip from the outer doc's `owner` field so callers can
   *  detect "this is my own trip" even when they joined via a viewer link. */
  ownerUid?: string;

  // NEW: Dynamic Categories (Task 3)
  customFoodCategories?: string[];       // User-created food search categories
  customAttractionCategories?: string[]; // User-created attraction search categories

  // Collaborative audit + soft delete (Phase 2)
  activityLog?: any[]; // ActivityEntry[] from services/activityLog.ts — kept loose to avoid circular import
  trash?: any[];       // TrashEntry[]
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

// --- NEW: Staged Trip Data (Omni-Import System) ---
export interface TripMetadata {
  suggestedName: string;
  suggestedDates: string;
  mainDestination: string;
  visitedDestinations?: string[]; // Legacy
  uniqueCityNames: string[]; // List of unique cities visited (e.g. ["Manila", "Boracay"])
}

// 1. Transport (Flights, Trains, etc.)
export interface StagedTransportItem {
  type: 'flight' | 'train' | 'ferry' | 'bus' | 'car_rental' | 'cruise' | 'other';
  sourceFileIds: string[];
  data: {
    airline?: string;
    flightNumber?: string;
    departureTime?: string;
    displayTime?: string;
    from?: string;
    to?: string;
    [key: string]: any;
  };
  confidence: number;
}

// 2. Accommodation (Hotels, Airbnbs)
export interface StagedAccommodationItem {
  type: 'hotel' | 'airbnb' | 'hostel' | 'resort' | 'other';
  sourceFileIds: string[];
  data: {
    hotelName: string;
    checkInDate: string;
    checkOutDate?: string;
    displayTime: string;
    address?: string;
    [key: string]: any;
  };
  confidence: number;
}

// 3. Wallet (Passports, Visas, Permits)
export interface StagedWalletItem {
  type: 'passport' | 'visa' | 'insurance' | 'entry_permit' | 'other';
  sourceFileIds: string[];
  title?: string;
  data: {
    documentName?: string;
    expiryDate?: string;
    validUntil?: string;
    displayTime?: string;
    [key: string]: any;
  };
  isSensitive: boolean;
  uiMessage?: string;
}

// 4. Dining & Activities
export interface StagedExperienceItem {
  type: 'dining' | 'activity' | 'event' | 'other';
  sourceFileIds: string[];
  title?: string;
  data: {
    name: string;
    reservationTime?: string;
    displayTime: string;
    address?: string;
    [key: string]: any;
  };
  uiMessage?: string;
}

export interface UnprocessedFile {
  fileName: string;
  reason: string;
}

export interface StagedCategories {
  transport: StagedTransportItem[];
  accommodation: StagedAccommodationItem[];
  carRental: StagedTransportItem[];
  wallet: StagedWalletItem[];
  dining: StagedExperienceItem[];
  activities: StagedExperienceItem[];
}

export interface StagedTripData {
  tripMetadata: TripMetadata;
  processedFileIds: string[];
  unprocessedFiles: UnprocessedFile[];
  categories: StagedCategories;
}
