import { Trip, Transport, FlightSegment, TrainRide, BusRide, FerryRide, Cruise } from '../types';

/**
 * Merge the legacy parallel arrays (flights, trains, buses, ferries,
 * cruises) plus the new unified `trip.transports` into a single list
 * sorted chronologically by date + departureTime.
 *
 * Works without touching the source data — old trips keep persisting
 * via `trip.flights.segments` etc., and the unified view reads the
 * same legs through a normalised lens. New manual additions (transfers,
 * pickups, off-airline ferries) live in `trip.transports`.
 */

const flightToTransport = (seg: FlightSegment, idx: number, ticket: { pnr?: string; passengers?: string[] }): Transport => ({
        id: `flight-seg-${idx}`,
        mode: 'flight',
        from: seg.fromCity || seg.fromCode || '',
        to: seg.toCity || seg.toCode || '',
        fromCode: seg.fromCode,
        toCode: seg.toCode,
        date: seg.date,
        departureTime: seg.departureTime,
        arrivalTime: seg.arrivalTime,
        duration: seg.duration,
        provider: seg.airline,
        bookingRef: ticket.pnr,
        price: seg.price,
        flightNumber: seg.flightNumber,
        terminal: seg.terminal,
        gate: seg.gate,
        toLat: seg.toLat,
        toLng: seg.toLng,
        sourceFlightSegmentIndex: idx,
        sourceArrayKey: 'flights',
});

const trainToTransport = (t: TrainRide): Transport => ({
        id: t.id || `train-${t.trainNumber || ''}-${t.date || ''}`,
        mode: 'train',
        from: t.fromStation,
        to: t.toStation,
        date: t.date,
        departureTime: t.departureTime,
        arrivalTime: t.arrivalTime,
        duration: t.duration,
        provider: t.provider,
        bookingRef: t.bookingReference,
        price: t.price,
        currency: t.currency,
        flightNumber: t.trainNumber,        // re-purposed for train number
        vehicle: t.car,
        sourceArrayKey: 'trains',
});

const busToTransport = (b: BusRide): Transport => ({
        id: b.id || `bus-${b.fromCity}-${b.toCity}-${b.departureTime}`,
        mode: 'bus',
        from: b.fromCity,
        to: b.toCity,
        date: (b.departureTime || '').slice(0, 10),
        departureTime: b.departureTime,
        arrivalTime: b.arrivalTime,
        provider: b.provider,
        bookingRef: b.bookingReference,
        price: b.price,
        sourceArrayKey: 'buses',
});

const ferryToTransport = (f: FerryRide): Transport => ({
        id: f.id || `ferry-${f.fromPort}-${f.toPort}-${f.departureTime}`,
        mode: 'ferry',
        from: f.fromPort,
        to: f.toPort,
        date: (f.departureTime || '').slice(0, 10),
        departureTime: f.departureTime,
        arrivalTime: f.arrivalTime,
        provider: f.provider,
        price: f.price,
        vehicle: f.vehicle,
        sourceArrayKey: 'ferries',
});

const cruiseToTransport = (c: Cruise): Transport => ({
        id: c.id || `cruise-${c.shipName}-${c.departureTime}`,
        mode: 'cruise',
        from: c.departurePort,
        to: c.arrivalPort,
        date: (c.departureTime || '').slice(0, 10),
        departureTime: c.departureTime,
        arrivalTime: c.arrivalTime,
        provider: c.cruiseLine,
        bookingRef: c.bookingReference,
        price: c.price,
        notes: c.shipName + (c.cabinNumber ? ` · תא ${c.cabinNumber}` : ''),
        sourceArrayKey: 'cruises',
});

const sortTimestamp = (t: Transport): number => {
        // Combine date + departureTime into a single comparable timestamp.
        // Falls back to date-only midnight for items without a time.
        const date = (t.date || '').slice(0, 10);
        if (!date) return 0;
        let timeStr = '';
        if (t.departureTime) {
                if (t.departureTime.includes('T')) {
                        // Full ISO — return its time directly.
                        const ms = new Date(t.departureTime).getTime();
                        if (!isNaN(ms)) return ms;
                        timeStr = t.departureTime.split('T')[1]?.slice(0, 5) || '';
                } else if (/^\d{1,2}:\d{2}/.test(t.departureTime)) {
                        timeStr = t.departureTime.slice(0, 5);
                }
        }
        const iso = `${date}T${timeStr || '00:00'}:00`;
        const ms = new Date(iso).getTime();
        return isNaN(ms) ? 0 : ms;
};

export const buildUnifiedTransports = (trip: Trip): Transport[] => {
        const out: Transport[] = [];
        const seen = new Set<string>();

        const push = (t: Transport) => {
                if (seen.has(t.id)) return;
                seen.add(t.id);
                out.push(t);
        };

        trip.flights?.segments?.forEach((seg, i) => push(flightToTransport(seg, i, trip.flights)));
        trip.trains?.forEach(t => push(trainToTransport(t)));
        trip.buses?.forEach(b => push(busToTransport(b)));
        trip.ferries?.forEach(f => push(ferryToTransport(f)));
        trip.cruises?.forEach(c => push(cruiseToTransport(c)));
        trip.transports?.forEach(t => push(t));

        return out.sort((a, b) => sortTimestamp(a) - sortTimestamp(b));
};
