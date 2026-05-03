/**
 * Single source of truth for "what can this user do with this trip?"
 *
 * Three relevant predicates:
 *   - isTripOwner    — only the original creator
 *   - canEditTrip    — owner OR editor (legacy: 'collaborator' counts as editor)
 *   - isViewerOnly   — joined via a viewer link, can't write to the shared doc
 *
 * Use these everywhere a click would write to the shared trip — instead of
 * reading `trip.sharing?.role` directly. Keeps the legacy back-compat with
 * already-joined collaborators in one place.
 */

import type { Trip } from '../types';

export const isTripOwner = (trip: Trip): boolean =>
        !trip.isShared || trip.sharing?.role === 'owner';

export const canEditTrip = (trip: Trip): boolean =>
        !trip.isShared
        || trip.sharing?.role === 'owner'
        || trip.sharing?.role === 'editor'
        || trip.sharing?.role === 'collaborator'; // legacy alias

export const isViewerOnly = (trip: Trip): boolean =>
        trip.isShared === true && trip.sharing?.role === 'viewer';

/** Default role for un-tagged join links (legacy fallback). */
export const DEFAULT_JOIN_ROLE: 'editor' | 'viewer' = 'editor';
