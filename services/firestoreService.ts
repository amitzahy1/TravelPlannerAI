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

// --- SHARING FUNCTIONS ---

import {
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import type { SharedTripMetadata, UserTripRef } from '../types';

/**
 * Generate unique share ID
 */
const generateShareId = (): string => {
  return `share-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Add trip reference for user
 */
const addUserTripRef = async (
  userId: string,
  shareId: string,
  role: 'owner' | 'collaborator',
  tripName: string
): Promise<void> => {
  const refDoc = doc(db, USERS_COLLECTION, userId, 'shared-trip-refs', shareId);
  await setDoc(refDoc, {
    sharedTripId: shareId,
    role,
    joinedAt: Timestamp.now(),
    tripName
  });
};

/**
 * Create a shared trip
 */
export const createSharedTrip = async (
  userId: string,
  trip: Trip
): Promise<string> => {
  try {
    const shareId = generateShareId();

    const sharedTripRef = doc(db, 'shared-trips', shareId);
    await setDoc(sharedTripRef, {
      owner: userId,
      collaborators: [userId],
      shareId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      tripData: trip
    });

    // Add reference for user
    await addUserTripRef(userId, shareId, 'owner', trip.name);

    return shareId;
  } catch (error) {
    console.error('Error creating shared trip:', error);
    throw error;
  }
};

/**
 * Join a shared trip via share link
 */
export const joinSharedTrip = async (
  userId: string,
  shareId: string
): Promise<Trip> => {
  try {
    const tripRef = doc(db, 'shared-trips', shareId);
    const tripSnap = await getDoc(tripRef);

    if (!tripSnap.exists()) {
      throw new Error('Shared trip not found');
    }

    const data = tripSnap.data();

    // Check if already a collaborator
    if (data.collaborators.includes(userId)) {
      return data.tripData as Trip;
    }

    // Add user to collaborators
    await updateDoc(tripRef, {
      collaborators: arrayUnion(userId),
      updatedAt: Timestamp.now()
    });

    // Add reference for user
    await addUserTripRef(userId, shareId, 'collaborator', data.tripData.name);

    return data.tripData as Trip;
  } catch (error) {
    console.error('Error joining shared trip:', error);
    throw error;
  }
};

/**
 * Update shared trip (triggers real-time sync)
 */
export const updateSharedTrip = async (
  userId: string,
  shareId: string,
  trip: Trip
): Promise<void> => {
  try {
    const tripRef = doc(db, 'shared-trips', shareId);
    await updateDoc(tripRef, {
      tripData: trip,
      updatedAt: Timestamp.now(),
      updatedBy: userId
    });
  } catch (error) {
    console.error('Error updating shared trip:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates on a shared trip
 */
export const subscribeToSharedTrip = (
  shareId: string,
  callback: (trip: Trip, metadata: SharedTripMetadata) => void
): Unsubscribe => {
  const tripRef = doc(db, 'shared-trips', shareId);

  return onSnapshot(tripRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      const metadata: SharedTripMetadata = {
        owner: data.owner,
        collaborators: data.collaborators,
        shareId: data.shareId,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        updatedBy: data.updatedBy
      };
      callback(data.tripData as Trip, metadata);
    }
  });
};

/**
 * Get all shared trip references for a user
 */
export const getUserSharedTrips = async (userId: string): Promise<UserTripRef[]> => {
  try {
    const refsCollection = collection(db, USERS_COLLECTION, userId, 'shared-trip-refs');
    const querySnapshot = await getDocs(refsCollection);

    const refs: UserTripRef[] = [];
    querySnapshot.forEach((doc) => {
      refs.push(doc.data() as UserTripRef);
    });

    return refs;
  } catch (error) {
    console.error('Error getting shared trip refs:', error);
    return [];
  }
};
