/**
 * STRICT JSON Schema for Gemini Structured Outputs.
 * Mirrors the TransformedTripData interface but with strict typing.
 */

export const TRIP_OUTPUT_SCHEMA = {
        type: "OBJECT",
        description: "A structured comprehensive travel itinerary extracted from documents.",
        properties: {
                tripMetadata: {
                        type: "OBJECT",
                        description: "High-level details about the trip",
                        properties: {
                                suggestedName: { type: "STRING", description: "A creative, short name for the trip (e.g. 'Weekend in Rome')" },
                                mainDestination: { type: "STRING", description: "The primary city/region visited" },
                                mainCountry: { type: "STRING", description: "Primary country visited" },
                                startDate: { type: "STRING", description: "ISO 8601 (YYYY-MM-DD). If year missing, assume 2026." },
                                endDate: { type: "STRING", description: "ISO 8601 (YYYY-MM-DD)." },
                                uniqueCityNames: { type: "ARRAY", items: { type: "STRING" }, description: "List of unique cities visited" }
                        },
                        required: ["suggestedName", "startDate", "endDate", "mainDestination"]
                },
                categories: {
                        type: "OBJECT",
                        description: "Extracted travel components",
                        properties: {
                                transport: {
                                        type: "ARRAY",
                                        description: "All transport segments (Flights, Trains, Buses, Ferries, Cruises)",
                                        items: {
                                                type: "OBJECT",
                                                properties: {
                                                        type: { type: "STRING", enum: ["flight", "train", "bus", "ferry", "cruise", "car_rental", "other"] },
                                                        confidence: { type: "NUMBER", description: "Confidence score 0.0-1.0" },
                                                        data: {
                                                                type: "OBJECT",
                                                                description: "Polymorphic data object containing fields for all transport types",
                                                                properties: {
                                                                        // Common Fields
                                                                        airline: { type: "STRING", description: "Airline or Operator Name" },
                                                                        flightNumber: { type: "STRING", description: "Full code (e.g. LY103) or Train Number" },
                                                                        pnr: { type: "STRING", description: "Booking Reference / PNR" },
                                                                        ticketNumber: { type: "STRING" },

                                                                        // Multi-Passenger Support (New Requirement)
                                                                        passengers: {
                                                                                type: "ARRAY",
                                                                                items: { type: "STRING" },
                                                                                description: "List of ALL passenger names found on the ticket"
                                                                        },

                                                                        // Departure
                                                                        departure: {
                                                                                type: "OBJECT",
                                                                                properties: {
                                                                                        city: { type: "STRING", description: "City Name" },
                                                                                        iata: { type: "STRING", description: "IATA Code (3 chars). TLV=Tel Aviv, ATH=Athens, etc." },
                                                                                        isoDate: { type: "STRING", description: "YYYY-MM-DD" },
                                                                                        time: { type: "STRING", description: "HH:MM (24h)" },
                                                                                        terminal: { type: "STRING" },
                                                                                        gate: { type: "STRING" }
                                                                                },
                                                                                required: ["city", "isoDate", "time"]
                                                                        },

                                                                        // Arrival
                                                                        arrival: {
                                                                                type: "OBJECT",
                                                                                properties: {
                                                                                        city: { type: "STRING" },
                                                                                        iata: { type: "STRING" },
                                                                                        isoDate: { type: "STRING" },
                                                                                        time: { type: "STRING" },
                                                                                        terminal: { type: "STRING" }
                                                                                },
                                                                                required: ["city", "isoDate", "time"]
                                                                        },

                                                                        // Price
                                                                        price: {
                                                                                type: "OBJECT",
                                                                                properties: {
                                                                                        amount: { type: "NUMBER" },
                                                                                        currency: { type: "STRING", description: "ISO 3-letter (USD, EUR, ILS)" }
                                                                                }
                                                                        },

                                                                        // Deep Extraction
                                                                        baggage: { type: "STRING" },
                                                                        fareClass: { type: "STRING" },
                                                                        seat: { type: "STRING" },
                                                                        cancellationPolicy: { type: "STRING" },
                                                                        mealPlan: { type: "STRING" },

                                                                        // Specific Types
                                                                        trainNumber: { type: "STRING" },
                                                                        shipName: { type: "STRING" },
                                                                        cabinNumber: { type: "STRING" },
                                                                        platform: { type: "STRING" }
                                                                },
                                                                required: ["departure", "arrival"]
                                                        }
                                                },
                                                required: ["type", "data"]
                                        }
                                },
                                accommodation: {
                                        type: "ARRAY",
                                        items: {
                                                type: "OBJECT",
                                                properties: {
                                                        type: { type: "STRING", enum: ["hotel", "airbnb", "hostel", "resort", "other"] },
                                                        confidence: { type: "NUMBER" },
                                                        data: {
                                                                type: "OBJECT",
                                                                properties: {
                                                                        hotelName: { type: "STRING" },
                                                                        address: { type: "STRING" },
                                                                        city: { type: "STRING" },
                                                                        country: { type: "STRING" },
                                                                        checkIn: {
                                                                                type: "OBJECT",
                                                                                properties: { isoDate: { type: "STRING" }, time: { type: "STRING" } },
                                                                                required: ["isoDate"]
                                                                        },
                                                                        checkOut: {
                                                                                type: "OBJECT",
                                                                                properties: { isoDate: { type: "STRING" }, time: { type: "STRING" } },
                                                                                required: ["isoDate"]
                                                                        },
                                                                        bookingId: { type: "STRING" },
                                                                        roomType: { type: "STRING" },
                                                                        guests: { type: "ARRAY", items: { type: "STRING" } }, // Multi-Passenger for Hotels
                                                                        price: {
                                                                                type: "OBJECT",
                                                                                properties: { amount: { type: "NUMBER" }, currency: { type: "STRING" } }
                                                                        },
                                                                        // Deep Extraction
                                                                        mealPlan: { type: "STRING", description: "e.g. 'Breakfast Included', 'Half Board'" },
                                                                        cancellationPolicy: { type: "STRING" },
                                                                        checkInInstructions: { type: "STRING" }
                                                                },
                                                                required: ["hotelName", "checkIn", "checkOut"]
                                                        }
                                                },
                                                required: ["type", "data"]
                                        }
                                },
                                carRental: {
                                        type: "ARRAY",
                                        items: {
                                                type: "OBJECT",
                                                properties: {
                                                        type: { type: "STRING", enum: ["car_rental"] },
                                                        data: {
                                                                type: "OBJECT",
                                                                properties: {
                                                                        provider: { type: "STRING" },
                                                                        pickupLocation: { type: "STRING" },
                                                                        dropoffLocation: { type: "STRING" },
                                                                        pickupDate: { type: "STRING" },
                                                                        pickupTime: { type: "STRING" },
                                                                        dropoffDate: { type: "STRING" },
                                                                        dropoffTime: { type: "STRING" },
                                                                        driverName: { type: "STRING" },
                                                                        price: {
                                                                                type: "OBJECT",
                                                                                properties: { amount: { type: "NUMBER" }, currency: { type: "STRING" } }
                                                                        },
                                                                        insurance: { type: "STRING" },
                                                                        vehicleType: { type: "STRING" }
                                                                },
                                                                required: ["provider", "pickupDate", "dropoffDate"]
                                                        }
                                                },
                                                required: ["type", "data"]
                                        }
                                }
                        }
                }
        }
};
