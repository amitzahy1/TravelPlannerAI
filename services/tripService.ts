import { Trip, FlightSegment, HotelBooking, SecureNote, Restaurant, Attraction } from '../types';
import { TripAnalysisResult } from './aiService';

/**
 * Maps the AI TripAnalysisResult into a partial Trip object.
 * Handles ALL field name variations from different AI outputs.
 * 
 * Key fixes over v1:
 * - Hotel dates: reads from BOTH checkIn.isoDate AND checkInDate (backwards compat)
 * - Hotel price: reads from BOTH price.amount AND totalPrice
 * - Car rental: maps to transport segments (type: car_rental)
 * - Passenger/guest names: properly mapped
 * - Booking source detection
 */
export const mapAnalysisToTrip = (analysis: TripAnalysisResult): Partial<Trip> => {
        const categories = analysis.rawStagedData.categories || {
                transport: [],
                accommodation: [],
                carRental: [],
                wallet: [],
                dining: [],
                activities: []
        };

        // --- FLIGHTS ---
        const flights: FlightSegment[] = categories.transport
                .filter(i => i.type === 'flight')
                .flatMap(i => {
                        const d = i.data || {};
                        const dep = d.departure || {};
                        const arr = d.arrival || {};

                        // Priority chain for dates: nested ISO > flat ISO > current date
                        const departureDate = dep.isoDate || d.departureDate || d.isoDate || d.date || "";
                        const arrivalDate = arr.isoDate || d.arrivalDate || departureDate;

                        // Priority chain for times: nested displayTime > flat time > extract from ISO
                        const departureTime = dep.displayTime || dep.time || d.departureTime || departureDate.split('T')[1]?.substring(0, 5) || '00:00';
                        const arrivalTime = arr.displayTime || arr.time || d.arrivalTime || arrivalDate.split('T')[1]?.substring(0, 5) || '00:00';

                        return [{
                                fromCode: dep.iata || d.fromCode || 'ORG',
                                toCode: arr.iata || d.toCode || 'DST',
                                date: departureDate.split('T')[0], // Ensure date-only
                                airline: d.airline || d.airlineName || 'Unknown Airline',
                                flightNumber: d.flightNumber || d.flight || '',
                                departureTime,
                                arrivalTime,
                                fromCity: dep.city || d.fromCity || d.from || '',
                                toCity: arr.city || d.toCity || d.to || '',
                                duration: d.duration || "0h",
                                terminal: d.terminal || dep.terminal || '',
                                gate: d.gate || dep.gate || '',
                                baggage: d.baggage || '',
                                price: d.price?.amount || d.totalPrice || 0,
                        }];
                });

        // --- HOTELS ---
        // CRITICAL FIX: Handle BOTH checkIn.isoDate (from new prompt) AND checkInDate (from old prompt)
        const hotels: HotelBooking[] = categories.accommodation.map(i => {
                const d: any = i.data || {};

                // Date extraction with multiple fallback paths
                const checkInDate = d.checkInDate
                        || d.checkIn?.isoDate
                        || (typeof d.checkIn === 'string' ? d.checkIn : '')
                        || '';
                const checkOutDate = d.checkOutDate
                        || d.checkOut?.isoDate
                        || (typeof d.checkOut === 'string' ? d.checkOut : '')
                        || '';

                // Price extraction with multiple fallback paths
                const priceAmount = d.totalPrice
                        || d.price?.amount
                        || (typeof d.price === 'number' ? d.price : 0)
                        || d.costNumeric
                        || 0;
                const priceCurrency = d.currency
                        || d.price?.currency
                        || 'USD';

                // Calculate nights
                let nights = 1;
                if (checkInDate && checkOutDate) {
                        const diff = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
                        if (diff > 0) nights = Math.ceil(diff / (1000 * 60 * 60 * 24));
                }

                return {
                        id: crypto.randomUUID(),
                        name: d.hotelName || d.name || '',
                        checkInDate: checkInDate.split('T')[0],
                        checkOutDate: checkOutDate.split('T')[0],
                        address: d.address || '',
                        confirmationCode: d.bookingId || d.confirmationCode || '',
                        roomType: d.roomType || '',
                        nights,
                        costNumeric: priceAmount,
                        price: priceAmount ? `${priceAmount} ${priceCurrency}` : '',
                        locationVibe: '',
                        breakfastIncluded: d.breakfastIncluded || false,
                        cancellationPolicy: d.cancellationPolicy || '',
                        bookingSource: d.bookingSource || undefined,
                };
        });

        // --- CAR RENTAL → mapped as transport segments ---
        const carRentalSegments: FlightSegment[] = ((categories as any).carRental || []).map((i: any) => {
                const d = i.data || {};
                return {
                        fromCode: '',
                        toCode: '',
                        fromCity: d.pickupCity || d.pickupLocation || d.from || '',
                        toCity: d.dropoffCity || d.dropoffLocation || d.to || '',
                        date: d.pickupDate || '',
                        airline: d.provider || 'Car Rental',
                        flightNumber: d.confirmationCode || '',
                        departureTime: d.pickupTime || '10:00',
                        arrivalTime: d.dropoffTime || '10:00',
                        duration: '',
                        price: d.price?.amount || 0,
                };
        });

        // --- WALLET ---
        const wallet: SecureNote[] = categories.wallet.map(i => ({
                id: crypto.randomUUID(),
                title: i.title || i.data.documentName || 'Document',
                value: i.data.displayTime || i.data.holderName || 'No details',
                category: (i.type === 'passport' || i.type === 'visa' || i.type === 'insurance')
                        ? i.type as 'passport' | 'visa' | 'insurance'
                        : 'other'
        }));

        // --- DINING ---
        const restaurants: Restaurant[] = categories.dining.map(i => ({
                id: crypto.randomUUID(),
                name: i.data.name || '',
                description: i.data.cuisine ? `${i.data.cuisine} Restaurant` : "Imported via AI",
                location: i.data.address || i.data.city || '',
                reservationDate: i.data.reservationDate || '',
                reservationTime: i.data.reservationTime || '',
                iconType: 'ramen' as const,
                cuisine: i.data.cuisine || '',
        }));

        // --- ACTIVITIES ---
        const attractions: Attraction[] = categories.activities.map(i => ({
                id: crypto.randomUUID(),
                name: i.data.name || '',
                description: "Imported via AI",
                location: i.data.address || i.data.city || '',
                scheduledDate: i.data.reservationDate || '',
                scheduledTime: i.data.reservationTime || '',
        }));

        // Merge all transport (flights + car rentals)
        const allSegments = [...flights, ...carRentalSegments];

        // Extract passenger names from first flight if available
        const passengers = categories.transport[0]?.data?.passengers || [];

        return {
                flights: {
                        passengers,
                        pnr: categories.transport[0]?.data?.pnr || '',
                        segments: allSegments,
                        totalPrice: allSegments.reduce((sum, s) => sum + (s.price || 0), 0),
                },
                hotels,
                secureNotes: wallet,
        };
};

/**
 * Smartly merges new analysis data into an existing Trip, preventing duplicates.
 * Uses multi-signal deduplication:
 * - Flights: same flight number + same date, OR same route + same time
 * - Hotels: same name + same check-in date (fuzzy name match)
 * - Wallet: same title
 */
export const mergeTripData = (existing: Trip, analysis: TripAnalysisResult): Trip => {
        const newPartial = mapAnalysisToTrip(analysis);

        // 1. Flights Deduplication
        const newSegments = newPartial.flights?.segments || [];
        const existingSegments = existing.flights?.segments || [];
        const uniqueSegments = [...existingSegments];

        newSegments.forEach(newSeg => {
                const isDuplicate = existingSegments.some(ex => {
                        // Signal 1: Same flight number + same date
                        if (ex.flightNumber && newSeg.flightNumber &&
                                ex.flightNumber === newSeg.flightNumber &&
                                ex.date === newSeg.date) return true;

                        // Signal 2: Same route + same departure time (for flights without numbers)
                        if (ex.fromCode === newSeg.fromCode &&
                                ex.toCode === newSeg.toCode &&
                                ex.date === newSeg.date &&
                                ex.departureTime === newSeg.departureTime) return true;

                        // Signal 3: Same origin city + dest city + same date (fuzzy)
                        if (ex.fromCity && newSeg.fromCity &&
                                ex.fromCity.toLowerCase() === newSeg.fromCity.toLowerCase() &&
                                ex.toCity?.toLowerCase() === newSeg.toCity?.toLowerCase() &&
                                ex.date === newSeg.date) return true;

                        return false;
                });
                if (!isDuplicate) {
                        uniqueSegments.push(newSeg);
                }
        });

        // 2. Hotels Deduplication (with fuzzy name matching)
        const newHotels = newPartial.hotels || [];
        const existingHotels = existing.hotels || [];
        const uniqueHotels = [...existingHotels];

        const fuzzyNameMatch = (a: string, b: string): boolean => {
                const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
                const na = normalize(a);
                const nb = normalize(b);
                return na === nb || na.includes(nb) || nb.includes(na);
        };

        newHotels.forEach(newHotel => {
                const isDuplicate = existingHotels.some(ex =>
                        fuzzyNameMatch(ex.name, newHotel.name) &&
                        ex.checkInDate === newHotel.checkInDate
                );
                if (!isDuplicate) {
                        uniqueHotels.push(newHotel);
                }
        });

        // 3. Wallet Deduplication
        const newWallet = newPartial.secureNotes || [];
        const existingWallet = existing.secureNotes || [];
        const uniqueWallet = [...existingWallet];

        newWallet.forEach(newDoc => {
                const isDuplicate = existingWallet.some(ex =>
                        ex.title === newDoc.title ||
                        (ex.category === newDoc.category && ex.value === newDoc.value)
                );
                if (!isDuplicate) {
                        uniqueWallet.push(newDoc);
                }
        });

        return {
                ...existing,
                flights: {
                        ...existing.flights,
                        passengers: Array.from(new Set([...(existing.flights?.passengers || []), ...(newPartial.flights?.passengers || [])])),
                        pnr: existing.flights?.pnr || newPartial.flights?.pnr || '',
                        segments: uniqueSegments
                },
                hotels: uniqueHotels,
                secureNotes: uniqueWallet,
                documents: Array.from(new Set([...(existing.documents || []), ...(analysis.processedFileIds || [])]))
        };
};
