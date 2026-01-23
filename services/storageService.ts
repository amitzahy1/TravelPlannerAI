import { Trip } from '../types';
import { INITIAL_DATA } from '../constants';
import { getUserTrips, saveTrip, saveAllTrips, deleteTrip as firestoreDeleteTrip, userHasTrips } from './firestoreService';

const STORAGE_KEY = 'travel_app_data_v1';

/**
 * Load trips from localStorage (fallback for unauthenticated users)
 */
export const loadTripsFromLocal = (): Trip[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load from localStorage", e);
  }
  return INITIAL_DATA;
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
 */
export const loadTrips = async (userId?: string): Promise<Trip[]> => {
  if (!userId) {
    return loadTripsFromLocal();
  }
  
  try {
    const hasTrips = await userHasTrips(userId);
    if (!hasTrips) {
      // First time user - check if they have local data to migrate
      const localTrips = loadTripsFromLocal();
      if (localTrips.length > 0 && localTrips !== INITIAL_DATA) {
        // Migrate local data to Firestore
        await saveAllTrips(userId, localTrips);
        // Clear local storage after migration
        localStorage.removeItem(STORAGE_KEY);
        return localTrips;
      }
      // No local data, return initial data and save it
      await saveAllTrips(userId, INITIAL_DATA);
      return INITIAL_DATA;
    }
    
    return await getUserTrips(userId);
  } catch (error) {
    console.error('Error loading trips from Firestore:', error);
    // Fallback to local storage on error
    return loadTripsFromLocal();
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
    await saveTrip(userId, trip);
  } catch (error) {
    console.error('Error saving trip to Firestore:', error);
    throw error;
  }
};

/**
 * Delete a trip - uses Firestore if userId provided, otherwise updates local storage
 */
export const deleteTrip = async (tripId: string, userId?: string): Promise<void> => {
  if (!userId) {
    const trips = loadTripsFromLocal();
    const filtered = trips.filter(t => t.id !== tripId);
    saveTripsToLocal(filtered);
    return;
  }
  
  try {
    await firestoreDeleteTrip(userId, tripId);
  } catch (error) {
    console.error('Error deleting trip from Firestore:', error);
    throw error;
  }
};
