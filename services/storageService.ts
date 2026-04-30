import { Trip } from '../types';
import { INITIAL_DATA } from '../constants';
import { getUserTrips, getTripsByEmail, saveTrip, deleteTrip as firestoreDeleteTrip, deleteSharedTripRef, getUserSharedTrips, getSharedTrip, updateSharedTrip, leaveSharedTrip } from './firestoreService';

const STORAGE_KEY = 'travel_app_data_v1';

const normalizeTripText = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const getTripUpdatedMillis = (trip: Trip): number => {
  const raw = (trip as any).updatedAt || trip.sharing?.updatedAt || (trip as any).createdAt || trip.sharing?.createdAt;
  if (!raw) return 0;
  if (typeof raw.toMillis === 'function') return raw.toMillis();
  if (typeof raw.seconds === 'number') return raw.seconds * 1000;
  const parsed = raw instanceof Date ? raw.getTime() : new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const getTripContentKey = (trip: Trip): string => (
  [
    normalizeTripText(trip.name),
    normalizeTripText(trip.destination),
    normalizeTripText(trip.dates),
  ].join('|')
);

const isEmptyTripContentKey = (key: string) => key === '||';

const getTripCompletenessScore = (trip: Trip): number => {
  const countArray = (value?: unknown[]) => Array.isArray(value) ? value.length : 0;
  return [
    trip.name,
    trip.destination,
    trip.dates,
    trip.coverImage,
    trip.flights?.pnr,
  ].filter(Boolean).length
    + countArray(trip.flights?.segments) * 4
    + countArray(trip.hotels) * 4
    + countArray(trip.itinerary) * 3
    + countArray(trip.restaurants) * 2
    + countArray(trip.attractions) * 2
    + countArray(trip.documents)
    + countArray(trip.aiRestaurants)
    + countArray(trip.aiAttractions);
};

const choosePreferredTrip = (current: Trip, incoming: Trip): Trip => {
  if (!!incoming.isShared !== !!current.isShared) {
    return incoming.isShared ? incoming : current;
  }

  return getTripUpdatedMillis(incoming) >= getTripUpdatedMillis(current) ? incoming : current;
};

export const dedupeTrips = (trips: Trip[]): Trip[] => {
  const byId = new Map<string, Trip>();
  trips.forEach((trip) => {
    const existing = byId.get(trip.id);
    byId.set(trip.id, existing ? choosePreferredTrip(existing, trip) : trip);
  });

  const byContent = new Map<string, Trip>();
  Array.from(byId.values()).forEach((trip) => {
    const key = getTripContentKey(trip);
    if (isEmptyTripContentKey(key)) {
      byContent.set(`id:${trip.id}`, trip);
      return;
    }

    const existing = byContent.get(key);
    byContent.set(key, existing ? choosePreferredTrip(existing, trip) : trip);
  });

  return Array.from(byContent.values()).sort((a, b) => getTripUpdatedMillis(b) - getTripUpdatedMillis(a));
};

export interface DuplicateTripCleanupPlan {
  keepTripIds: string[];
  deletePrivateTripIds: string[];
  groups: Array<{
    key: string;
    keepTripId: string;
    deletePrivateTripIds: string[];
    tripIds: string[];
  }>;
}

const chooseCleanupKeeper = (group: Trip[], preferredTripId?: string): Trip => {
  const preferred = preferredTripId ? group.find(trip => trip.id === preferredTripId) : undefined;
  if (preferred) return preferred;

  const shared = group.find(trip => trip.isShared);
  if (shared) return shared;

  return [...group].sort((a, b) => {
    const scoreDelta = getTripCompletenessScore(b) - getTripCompletenessScore(a);
    if (scoreDelta !== 0) return scoreDelta;
    return getTripUpdatedMillis(b) - getTripUpdatedMillis(a);
  })[0];
};

export const planDuplicateTripCleanup = (trips: Trip[], preferredTripId?: string): DuplicateTripCleanupPlan => {
  const groupsByKey = new Map<string, Trip[]>();

  trips.forEach((trip) => {
    const key = getTripContentKey(trip);
    const groupKey = isEmptyTripContentKey(key) ? `id:${trip.id}` : key;
    groupsByKey.set(groupKey, [...(groupsByKey.get(groupKey) || []), trip]);
  });

  const groups = Array.from(groupsByKey.entries())
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => {
      const keeper = chooseCleanupKeeper(group, preferredTripId);
      const deletePrivateTripIds = group
        .filter(trip => !trip.isShared && trip.id !== keeper.id)
        .map(trip => trip.id);

      return {
        key,
        keepTripId: keeper.id,
        deletePrivateTripIds,
        tripIds: group.map(trip => trip.id),
      };
    })
    .filter(group => group.deletePrivateTripIds.length > 0);

  return {
    keepTripIds: groups.map(group => group.keepTripId),
    deletePrivateTripIds: Array.from(new Set(groups.flatMap(group => group.deletePrivateTripIds))),
    groups,
  };
};

export const cleanupDuplicateStoredTrips = async (
  userId: string,
  userEmail?: string,
  preferredTripId?: string,
): Promise<DuplicateTripCleanupPlan> => {
  const privateTrips = await getUserTrips(userId);
  const sharedRefs = await getUserSharedTrips(userId);
  const sharedTrips = (await Promise.all(sharedRefs.map(async (ref) => {
    const trip = await getSharedTrip(ref.sharedTripId);
    if (!trip) return null;
    return {
      ...trip,
      id: ref.sharedTripId,
      isShared: true,
      sharing: {
        shareId: ref.sharedTripId,
        role: ref.role,
        owner: 'fetched',
        collaborators: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: 'system',
      },
    } as Trip;
  }))).filter((trip): trip is Trip => trip !== null);

  const plan = planDuplicateTripCleanup([...privateTrips, ...sharedTrips], preferredTripId);
  await Promise.all(plan.deletePrivateTripIds.map(tripId => firestoreDeleteTrip(userId, tripId)));

  if (userEmail) {
    const emailTrips = await getTripsByEmail(userEmail);
    const unreachableDuplicates = planDuplicateTripCleanup([...emailTrips, ...sharedTrips], preferredTripId)
      .deletePrivateTripIds
      .filter(tripId => !plan.deletePrivateTripIds.includes(tripId));

    if (unreachableDuplicates.length > 0) {
      console.warn('⚠️ [StorageService] Duplicate trips found outside the current user path; skipped safe deletion:', unreachableDuplicates);
    }
  }

  return plan;
};

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
 * Load trips - Hybrid Strategy (UID + Email)
 * CRITICAL: New users MUST start with empty trips, not demo data
 */
export const loadTrips = async (userId?: string, userEmail?: string): Promise<Trip[]> => {
  if (!userId) {
    console.log('📦 [StorageService] No userId - loading from localStorage');
    const localTrips = loadTripsFromLocal();
    console.log(`📦 [StorageService] Loaded ${localTrips.length} trips from localStorage`);
    return localTrips;
  }

  try {
    console.log(`🔥 [StorageService] Loading trips for user: ${userId} (Email: ${userEmail})`);

    // 1. Fetch Private Trips (Standard UID Query)
    const uidPromise = getUserTrips(userId);

    // 2. Fetch Orphaned Trips (Email Query)
    const emailPromise = userEmail ? getTripsByEmail(userEmail) : Promise.resolve([]);

    const [rawPrivateTrips, emailTrips] = await Promise.all([uidPromise, emailPromise]);

    // MERGE STRATEGY: Combine lines based on ID to remove duplicates
    const allRawTripsMap = new Map<string, Trip>();

    [...rawPrivateTrips, ...emailTrips].forEach(t => {
      allRawTripsMap.set(t.id, t);
    });

    const mergedRawTrips = Array.from(allRawTripsMap.values());
    console.log(`🔥 [StorageService] Merged: ${rawPrivateTrips.length} UID trips + ${emailTrips.length} Email trips => ${mergedRawTrips.length} Total Unique`);

    // FORCE OWNERSHIP & PRIVATE STATUS: Private trips in my collection are MINE.
    // We override isShared to false to fix "Zombie Legacy Trips" that think they are shared but have no sharing data.
    const privateTrips = mergedRawTrips.map(t => ({
      ...t,
      userId,
      isShared: false,
      sharing: undefined
    }));
    console.log(`🔥 [StorageService] Finalized ${privateTrips.length} private trips`);

    // 2. Fetch Shared Trips (Project Genesis 2.0)
    const sharedRefs = await getUserSharedTrips(userId);
    console.log(`🔥 [StorageService] Found ${sharedRefs.length} shared trip refs:`, sharedRefs.map(r => r.sharedTripId));

    const sharedTripPromises = sharedRefs.map(async (ref) => {
      try {
        const trip = await getSharedTrip(ref.sharedTripId);
        if (trip) {
          return {
            ...trip,
            id: ref.sharedTripId, // CRITICAL: Use ShareID as the specific ID to prevent duplicates with private trips
            isShared: true,
            sharing: {
              shareId: ref.sharedTripId,
              role: ref.role,
              owner: 'fetched',
              collaborators: [],
              createdAt: new Date(),
              updatedAt: new Date(),
              updatedBy: 'system'
            }
          } as Trip;
        }
        console.warn(`⚠️ [StorageService] Shared trip ref ${ref.sharedTripId} has no trip data - ORPHAN REF`);
        // SELF-HEALING: Orphan refs (doc exists but is empty/null which logic says shouldn't happen, or getSharedTrip returned null)
        if (userId) {
          console.log(`🧹 [Self-Healing] Removing orphan shared trip ref: ${ref.sharedTripId}`);
          await deleteSharedTripRef(userId, ref.sharedTripId);
        }
        return null;
      } catch (err) {
        console.warn(`⚠️ [StorageService] Failed to load shared trip ${ref.sharedTripId} (likely permission error or deleted)`, err);
        // SELF-HEALING: If we can't load it, we should properly remove the reference so it doesn't persist as a zombie
        try {
          if (userId) {
            console.log(`🧹 [Self-Healing] Removing broken shared trip ref: ${ref.sharedTripId}`);
            await deleteSharedTripRef(userId, ref.sharedTripId);
          }
        } catch (cleanupErr) {
          console.warn('Failed to cleanup broken ref:', cleanupErr);
        }
        return null; // Return null so it's filtered out
      }
    });


    const sharedTrips = (await Promise.all(sharedTripPromises)).filter((t): t is Trip => t !== null);
    console.log(`🔥 [StorageService] Loaded ${sharedTrips.length} valid shared trips`);

    // 3. Merge & Return
    const allTrips = dedupeTrips([...privateTrips, ...sharedTrips]);
    console.log(`🔥 [StorageService] Total trips to return: ${allTrips.length}`);
    return allTrips;
  } catch (error) {
    console.error('❌ [StorageService] Error loading trips from Firestore:', error);
    console.warn('⚠️ [StorageService] Returning empty trips (not falling back to localStorage for security)');
    return [];
  }
};

/**
 * Save all trips - uses Firestore if userId provided, otherwise localStorage
 */
export const saveTrips = async (trips: Trip[], userId?: string): Promise<void> => {
  const uniqueTrips = dedupeTrips(trips);

  if (!userId) {
    saveTripsToLocal(uniqueTrips);
    return;
  }

  try {
    await Promise.all(uniqueTrips.map(trip => saveSingleTrip(trip, userId)));
  } catch (error) {
    console.error('Error saving trips to Firestore:', error);
    // Fallback to local storage on error
    saveTripsToLocal(uniqueTrips);
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
  } catch (error) {
    console.error('Error deleting trip from Firestore:', error);
    throw error;
  }
};

/**
 * Leave a shared trip
 */
export const leaveTrip = async (tripId: string, shareId: string, userId?: string): Promise<void> => {
  if (!userId) return;

  // Clean up localStorage to prevent ghost data
  try {
    const local = loadTripsFromLocal();
    if (local.find(t => t.id === tripId)) {
      const filtered = local.filter(t => t.id !== tripId);
      saveTripsToLocal(filtered);
      console.log('🧹 Cleaned up left trip from localStorage');
    }
  } catch (e) {
    console.warn('Failed to clean localStorage during leave', e);
  }

  try {
    await leaveSharedTrip(userId, shareId);
    console.log('✅ Left shared trip successfully');
  } catch (error) {
    console.error('Error leaving trip:', error);
    throw error;
  }
};
