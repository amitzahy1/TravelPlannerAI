import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth } from './firebaseConfig';
import { Trip, SharedTripMetadata, UserTripRef, TripInvite } from '../types';
import { cleanUndefined } from '../utils/cleanUndefined';

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
      ...cleanUndefined(trip),
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
 * Create a shared trip (Magic Link Model)
 */
export const createSharedTrip = async (
  userId: string,
  trip: Trip,
  userEmail: string,
  inviteEmail?: string
): Promise<string> => {
  try {
    const shareId = generateShareId();

    // 1. Create the Shared Trip Document
    const sharedTripRef = doc(db, 'shared-trips', shareId);
    await setDoc(sharedTripRef, {
      owner: userId,
      collaborators: [userId],
      allowedEmails: inviteEmail ? [userEmail, inviteEmail] : [userEmail],
      shareId: shareId, // CRITICAL: Burn shareId into the doc for Security Rules
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      tripData: cleanUndefined(trip)
    });

    // 2. Add reference for user
    await addUserTripRef(userId, shareId, 'owner', trip.name);

    // 3. Create Public Invite Metadata (Public Read Access)
    const inviteRef = doc(db, 'trip_invites', shareId);
    await setDoc(inviteRef, {
      shareId,
      originalTripId: shareId,
      tripName: trip.name,
      destination: trip.destination,
      dates: trip.dates,
      hostName: userEmail,
      coverImage: trip.coverImage,
      ownerId: userId,
      createdAt: Timestamp.now()
    });

    return shareId;
  } catch (error) {
    console.error('Error creating shared trip:', error);
    throw error;
  }
};

/**
 * Join a shared trip (Magic Link Model)
 */
export const joinSharedTrip = async (
  userId: string,
  shareId: string,
  userEmail?: string
): Promise<Trip> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in to join");

    // 1. Locate Original Trip via Invite (Publicly accessible)
    const inviteRef = doc(db, "trip_invites", shareId);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error("קישור השיתוף אינו תקין או שפג תוקפו");
    }

    const { originalTripId } = inviteSnap.data();
    const tripRef = doc(db, "shared-trips", originalTripId);

    // 2. Add User to Collaborators
    // The rule (request.resource.data.shareId == resource.data.shareId) 
    // will pass if we don't change shareId (it's unchanged in the merge)
    // PROVIDED the doc already has a shareId.
    try {
      await updateDoc(tripRef, {
        collaborators: arrayUnion(user.uid),
        // Just in case, we also explicitly provide it to fulfill strict rules on new joins
        shareId: shareId
      });
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        throw new Error("אין הרשאה להצטרף. ייתכן שהבעלים ביטל את השיתוף או שמדובר בטיול ישן שיש לשתף מחדש.");
      }
      throw err;
    }

    // 3. Create User Reference
    await setDoc(doc(db, "users", user.uid, "shared-trip-refs", originalTripId), {
      sharedTripId: originalTripId,
      tripId: originalTripId,
      joinedAt: new Date().toISOString(),
      role: 'collaborator',
      tripName: inviteSnap.data().tripName || 'Shared Trip'
    });

    // 4. Return the Trip Data
    const updatedTripSnap = await getDoc(tripRef);
    return updatedTripSnap.data()?.tripData as Trip;

  } catch (error: any) {
    console.error("Error joining shared trip:", error);
    throw error;
  }
};

/**
 * Leave a shared trip
 */
export const leaveSharedTrip = async (
  userId: string,
  shareId: string
): Promise<void> => {
  try {
    const tripRef = doc(db, 'shared-trips', shareId);

    // Remove user from collaborators
    await updateDoc(tripRef, {
      collaborators: arrayRemove(userId),
      updatedAt: Timestamp.now()
    });

    // Remove reference for user
    const refDoc = doc(db, USERS_COLLECTION, userId, 'shared-trip-refs', shareId);
    await deleteDoc(refDoc);

  } catch (error) {
    console.error('Error leaving shared trip:', error);
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
      tripData: cleanUndefined(trip),
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

/**
 * Delete shared trip reference (Clean up for Zombie Trip Fix)
 */
export const deleteSharedTripRef = async (userId: string, shareId: string): Promise<void> => {
  try {
    const refDoc = doc(db, USERS_COLLECTION, userId, 'shared-trip-refs', shareId);
    await deleteDoc(refDoc);
    console.log(`🧹 Deleted shared trip ref: ${shareId}`);
  } catch (error) {
    console.warn('Error deleting shared trip ref (might not exist):', error);
  }
};
