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
 * Create a shared trip
 */
export const createSharedTrip = async (
  userId: string,
  trip: Trip,
  userEmail: string,
  inviteEmail?: string
): Promise<string> => {
  try {
    const shareId = generateShareId();

    const sharedTripRef = doc(db, 'shared-trips', shareId);
    await setDoc(sharedTripRef, {
      owner: userId,
      collaborators: [userId],
      allowedEmails: inviteEmail ? [userEmail, inviteEmail] : [userEmail],
      shareId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      updatedBy: userId,
      tripData: cleanUndefined(trip)
    });

    // Add reference for user
    await addUserTripRef(userId, shareId, 'owner', trip.name);

    // [SECURE FLOW] Create Public Invite Metadata
    // This allows guests to "peek" at the trip details before having permission to read the full doc
    const inviteRef = doc(db, 'trip_invites', shareId);
    await setDoc(inviteRef, {
      shareId,
      // CRITICAL: originalTripId must match the shared trip Doc ID (which is shareId in our loop)
      originalTripId: shareId,
      tripName: trip.name,
      destination: trip.destination,
      dates: trip.dates,
      hostName: userEmail, // Or fetch display name if available
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
 * [SELF-HEALING] Ensure invite metadata exists for legacy shared trips
 * Call this when opening the Share Modal to fix "Missing Permissions" errors.
 * Implements "Public Read / Auth Write" Security Pattern.
 */
export const ensureSharedTripInvite = async (
  userId: string,
  trip: Trip,
  shareId: string,
  userEmail?: string
): Promise<void> => {
  try {
    // Reference strictly to 'trip_invites' collection (Public Read / Auth Write)
    const inviteRef = doc(db, 'trip_invites', shareId);

    // 1. Idempotency Check: Don't write if already exists to save costs/latency
    const snapshot = await getDoc(inviteRef);

    if (!snapshot.exists()) {
      console.log(`🔧 [Self-Healing] Creating missing trip-invites/${shareId}`);

      // 2. Data Snapshot: Store static metadata so unauth users can preview
      await setDoc(inviteRef, {
        shareId: shareId,
        // CRITICAL: originalTripId is the KEY to the Shared Document. In our system, that's often the shareId or the tripId depending on creation.
        // Assuming shareId IS the doc ID for the shared trip (as per createSharedTrip).
        originalTripId: shareId,
        tripName: trip.name,
        destination: trip.destination,
        dates: trip.dates,
        hostName: userEmail || 'Organizer',
        coverImage: trip.coverImage || '',
        ownerId: userId,
        createdAt: Timestamp.now(),
        // Security marker
        isPublicInvite: true
      });

      // 3. CRITICAL: Ensure Main Trip Doc has the 'shareId' key (for Security Rules)
      // This fixes legacy trips that might have been created before the "Secure Share" protocol.
      const mainTripRef = doc(db, 'shared-trips', shareId);
      await updateDoc(mainTripRef, {
        shareId: shareId
      });
    }
  } catch (error) {
    console.warn('Silent Error ensuresTripInvite:', error);
    // Silent fail is acceptable here as it might be a permission race, 
    // but the Rules should fix it.
  }
};

/**
 * Get a shared trip by ID (public/protected read)
 */
export const getSharedTrip = async (shareId: string): Promise<Trip | null> => {
  try {
    const tripRef = doc(db, 'shared-trips', shareId);
    const tripSnap = await getDoc(tripRef);

    if (tripSnap.exists()) {
      return tripSnap.data().tripData as Trip;
    }
    return null;
  } catch (error) {
    console.error('Error fetching shared trip:', error);
    return null;
  }
};

/**
 * Get shared trip INVITE metadata (Public/Auth Read)
 * SAFE to call before joining
 */
export const getSharedTripInvite = async (shareId: string): Promise<TripInvite | null> => {
  try {
    const inviteRef = doc(db, 'trip_invites', shareId);
    const inviteSnap = await getDoc(inviteRef);

    if (inviteSnap.exists()) {
      return inviteSnap.data() as TripInvite;
    }
    return null;
  } catch (error) {
    console.error('Error fetching trip invite:', error);
    return null;
  }
};

/**
 * Join a shared trip via share link
 */
/**
 * Join a shared trip via share link - SECURE IMPLEMENTATION
 */
export const joinSharedTrip = async (
  userId: string,
  shareId: string,
  userEmail?: string
): Promise<Trip> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Must be logged in to join");

    // 1. Locate Original Trip via Invite
    const inviteRef = doc(db, "trip_invites", shareId);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      throw new Error("Link expired or invalid.");
    }

    const { originalTripId } = inviteSnap.data();
    if (!originalTripId) throw new Error("Invalid trip mapping.");

    const tripRef = doc(db, "shared-trips", originalTripId);

    // 2. Add User to Collaborators (Firestore Rules check shareId presence!)
    await updateDoc(tripRef, {
      collaborators: arrayUnion(user.uid),
      // [SECURITY KEY PROOF] Explicitly sending the shareId proves we have the link/key.
      // This satisfies the rule: request.resource.data.shareId == resource.data.shareId
      shareId: shareId
    });

    // 3. Create User Reference
    await setDoc(doc(db, "users", user.uid, "shared-trip-refs", originalTripId), {
      sharedTripId: originalTripId, // Using correct field name for our schema
      tripId: originalTripId, // Backwards compat
      joinedAt: new Date().toISOString(),
      role: 'collaborator',
      tripName: inviteSnap.data().tripName || 'Shared Trip'
    });

    // 4. Return the Trip Data
    const updatedTripSnap = await getDoc(tripRef);
    return updatedTripSnap.data()?.tripData as Trip;

  } catch (error: any) {
    console.error("Error joining shared trip:", error);
    // Specific permission handling
    if (error.code === 'permission-denied') {
      throw new Error("Permission denied. The owner may have revoked sharing.");
    }
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
