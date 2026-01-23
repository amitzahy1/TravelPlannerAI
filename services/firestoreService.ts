import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query,
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import { Trip } from '../types';

// Collection paths
const USERS_COLLECTION = 'users';
const TRIPS_SUBCOLLECTION = 'trips';

/**
 * Get the trips collection reference for a user
 */
const getTripsCollection = (userId: string) => {
  return collection(db, USERS_COLLECTION, userId, TRIPS_SUBCOLLECTION);
};

/**
 * Get all trips for a specific user
 */
export const getUserTrips = async (userId: string): Promise<Trip[]> => {
  try {
    const tripsRef = getTripsCollection(userId);
    const q = query(tripsRef, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const trips: Trip[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      trips.push({
        ...data,
        id: doc.id,
      } as Trip);
    });
    
    return trips;
  } catch (error) {
    console.error('Error fetching user trips:', error);
    throw error;
  }
};

/**
 * Save or update a single trip for a user
 */
export const saveTrip = async (userId: string, trip: Trip): Promise<void> => {
  try {
    const tripRef = doc(db, USERS_COLLECTION, userId, TRIPS_SUBCOLLECTION, trip.id);
    await setDoc(tripRef, {
      ...trip,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error saving trip:', error);
    throw error;
  }
};

/**
 * Save multiple trips for a user (batch operation)
 */
export const saveAllTrips = async (userId: string, trips: Trip[]): Promise<void> => {
  try {
    const promises = trips.map(trip => saveTrip(userId, trip));
    await Promise.all(promises);
  } catch (error) {
    console.error('Error saving all trips:', error);
    throw error;
  }
};

/**
 * Delete a trip for a user
 */
export const deleteTrip = async (userId: string, tripId: string): Promise<void> => {
  try {
    const tripRef = doc(db, USERS_COLLECTION, userId, TRIPS_SUBCOLLECTION, tripId);
    await deleteDoc(tripRef);
  } catch (error) {
    console.error('Error deleting trip:', error);
    throw error;
  }
};

/**
 * Check if user has any trips
 */
export const userHasTrips = async (userId: string): Promise<boolean> => {
  try {
    const tripsRef = getTripsCollection(userId);
    const querySnapshot = await getDocs(tripsRef);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking user trips:', error);
    return false;
  }
};
