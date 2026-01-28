import { Trip } from '../types';
import { INITIAL_DATA } from '../constants';
import { getUserTrips, saveTrip, saveAllTrips, deleteTrip as firestoreDeleteTrip, deleteSharedTripRef, userHasTrips, getUserSharedTrips, getSharedTrip, updateSharedTrip, leaveSharedTrip } from './firestoreService';

const STORAGE_KEY = 'travel_app_data_v1';

/**
 * Load trips from localStorage (fallback for unauthenticated users)
 */
export const loadTripsFromLocal = (): Trip[] => {
  try {
    const hasInitialized = localStorage.getItem('app_initialized');
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      return JSON.parse(stored);
    }

    // If we've never initialized, return INITIAL_DATA and mark as initialized
    if (!hasInitialized) {
      localStorage.setItem('app_initialized', 'true');
      // Save INITIAL_DATA to local storage so it can be truly deleted
      saveTripsToLocal(INITIAL_DATA);
      return INITIAL_DATA;
    }
  } catch (e) {
    console.error("Failed to load from localStorage", e);
  }
  return []; // Return empty instead of INITIAL_DATA if already initialized
};

/**
 * Save trips to localStorage (fallback for unauthenticated users)
 */
export const saveTripsToLocal = (trips: Trip[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  } catch (e) {
    console.error("Failed to save to localStorage", e);
  }
};

/**
 * Load trips - uses Firestore if userId provided, otherwise localStorage
 * CRITICAL: New users MUST start with empty trips, not demo data
 */
export const loadTrips = async (userId?: string): Promise<Trip[]> => {
  if (!userId) {
    return loadTripsFromLocal();
  }

  try {
    // ZOMBIE FIX REVISED: Always attempt to load from Firestore.
    // Do NOT return INITIAL_DATA if firebase returns empty.
    // Just return empty array.


    // 1. Fetch Private Trips
    const privateTrips = await getUserTrips(userId);

    // 2. Fetch Shared Trips (Project Genesis 2.0)
    const sharedRefs = await getUserSharedTrips(userId);
    const sharedTripPromises = sharedRefs.map(async (ref) => {
      const trip = await getSharedTrip(ref.sharedTripId);
      if (trip) {
        return {
          ...trip,
          isShared: true,
          sharing: {
            shareId: ref.sharedTripId,
            role: ref.role,
            // Mock metadata if missing, real sync happens in App.tsx
            owner: 'fetched',
            collaborators: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            updatedBy: 'system'
          }
        } as Trip;
      }
      return null;
    });

    const sharedTrips = (await Promise.all(sharedTripPromises)).filter((t): t is Trip => t !== null);

    // 3. Merge & Dedupe (Prefer Shared version if ID conflict exists? Usually IDs are unique)
    return [...privateTrips, ...sharedTrips];
  } catch (error) {
    console.error('Error loading trips from Firestore:', error);
    // On error, still return empty for logged-in users to prevent data leak
    // Only use localStorage for truly offline/anonymous users
    console.warn('⚠️ Firestore error - returning empty trips (not falling back to local storage for security)');
    return [];
  }
};

/**
 * Save all trips - uses Firestore if userId provided, otherwise localStorage
 */
export const saveTrips = async (trips: Trip[], userId?: string): Promise<void> => {
  if (!userId) {
    saveTripsToLocal(trips);
    return;
  }

  try {
    await saveAllTrips(userId, trips);
  } catch (error) {
    console.error('Error saving trips to Firestore:', error);
    // Fallback to local storage on error
    saveTripsToLocal(trips);
  }
};

/**
 * Save a single trip - uses Firestore if userId provided, otherwise updates local storage
 */
export const saveSingleTrip = async (trip: Trip, userId?: string): Promise<void> => {
  if (!userId) {
    const trips = loadTripsFromLocal();
    const index = trips.findIndex(t => t.id === trip.id);
    if (index >= 0) {
      trips[index] = trip;
    } else {
      trips.push(trip);
    }
    saveTripsToLocal(trips);
    return;
  }

  try {
    // Project Genesis 2.0: Shared Trip Handling
    if (trip.isShared && trip.sharing?.shareId) {
      // If we are the owner or an editor, we update the shared doc
      await updateSharedTrip(userId, trip.sharing.shareId, trip);
    } else {
      // Standard Private Trip
      await saveTrip(userId, trip);
    }
  } catch (error) {
    console.error('Error saving trip to Firestore:', error);
    throw error;
  }
};

/**
 * Delete a trip - uses Firestore if userId provided, otherwise updates local storage
 */
export const deleteTrip = async (tripId: string, userId?: string, shareId?: string): Promise<void> => {
  // Always clean up local storage first to prevent zombie data
  try {
    const local = loadTripsFromLocal();
    if (local.find(t => t.id === tripId)) {
      const filtered = local.filter(t => t.id !== tripId);
      saveTripsToLocal(filtered);
      console.log('🧹 Cleaned up deleted trip from localStorage backup');
    }
  } catch (e) {
    console.warn('Failed to clean localStorage during delete relying on optimstic UI', e);
  }

  if (!userId) {
    return;
  }

  try {
    // 1. Try deleting as Private Trip
    await firestoreDeleteTrip(userId, tripId);

    // 2. Try deleting as Shared Trip Reference (Zombie Fix)
    // CRITICAL FIX: Must use shareId if available, otherwise fallback to tripId (only works if they match)
    if (shareId) {
      await deleteSharedTripRef(userId, shareId);
    } else {
      // Fallback for legacy cases or private trips
      await deleteSharedTripRef(userId, tripId);
    }
  } catch (error: any) {
    console.error('Error deleting trip from Firestore:', error);
    // ZOMBIE FIX: Access denied means we probably aren't the owner or it's a ghost.
    // We should still throw to let the UI decide, but we ensure we tried our best.
    throw error;
  }
};

/**
 * Leave a shared trip
 */
export const leaveTrip = async (tripId: string, shareId: string, userId?: string): Promise<void> => {
  if (!userId) return;

  try {
    await leaveSharedTrip(userId, shareId);
    console.log('✅ Left shared trip successfully');
  } catch (error) {
    console.error('Error leaving trip:', error);
    throw error;
  }
};
