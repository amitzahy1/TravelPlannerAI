/**
 * Per-user "last seen release version" tracking.
 *
 * Strategy: store on Firestore at `users/{uid}.lastSeenReleaseVersion` so
 * the cursor follows the user across devices. Cache in localStorage so
 * we don't fight the network on every app load — the localStorage value
 * is checked first as the fast path.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

const LS_KEY = 'tp:lastSeenReleaseVersion:v1';

const lsGet = (uid: string): string | null => {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const map: Record<string, string> = JSON.parse(raw);
    return map[uid] || null;
  } catch {
    return null;
  }
};

const lsSet = (uid: string, version: string) => {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(LS_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[uid] = version;
    localStorage.setItem(LS_KEY, JSON.stringify(map));
  } catch { /* quota */ }
};

/**
 * Returns the last release-notes version this user dismissed, or null
 * if they haven't seen any yet. Reads localStorage first (instant) and
 * falls back to Firestore.
 */
export const getLastSeenReleaseVersion = async (uid: string): Promise<string | null> => {
  if (!uid) return null;
  const cached = lsGet(uid);
  if (cached) return cached;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const remote = (snap.data() as any)?.lastSeenReleaseVersion;
    if (typeof remote === 'string' && remote.length) {
      lsSet(uid, remote);
      return remote;
    }
  } catch {
    // Firestore not reachable — return null and let the modal show. The
    // setter will retry persistence on dismissal.
  }
  return null;
};

/**
 * Persist the last-seen version both locally and to Firestore. Failures on
 * the Firestore write are not fatal — localStorage keeps the user from
 * seeing the popup again on this device.
 */
export const setLastSeenReleaseVersion = async (uid: string, version: string): Promise<void> => {
  if (!uid || !version) return;
  lsSet(uid, version);
  try {
    await setDoc(doc(db, 'users', uid), { lastSeenReleaseVersion: version }, { merge: true });
  } catch {
    // ignore — local cache is enough for the show-once contract.
  }
};
