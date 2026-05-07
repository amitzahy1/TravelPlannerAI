/**
 * Single source of truth for "what can this user do with this trip?"
 *
 * Three relevant predicates:
 *   - isTripOwner    — only the original creator
 *   - canEditTrip    — owner OR editor (legacy: 'collaborator' counts as editor)
 *   - isViewerOnly   — joined via a viewer link, can't write to the shared doc
 *
 * Pass the logged-in user's UID so the owner is recognized even when they
 * opened the trip via a /join/<shareId> link with a viewer-role ref.
 *
 * Use these everywhere a click would write to the shared trip — instead of
 * reading `trip.sharing?.role` directly. Keeps the legacy back-compat with
 * already-joined collaborators in one place.
 */

import type { Trip } from '../types';

const matchesOwnerUid = (trip: Trip, currentUserUid?: string): boolean =>
        !!currentUserUid && !!trip.ownerUid && trip.ownerUid === currentUserUid;

export const isTripOwner = (trip: Trip, currentUserUid?: string): boolean =>
        !trip.isShared
        || trip.sharing?.role === 'owner'
        || matchesOwnerUid(trip, currentUserUid);

export const canEditTrip = (trip: Trip, currentUserUid?: string): boolean =>
        !trip.isShared
        || trip.sharing?.role === 'owner'
        || trip.sharing?.role === 'editor'
        || trip.sharing?.role === 'collaborator' // legacy alias
        || matchesOwnerUid(trip, currentUserUid);

export const isViewerOnly = (trip: Trip, currentUserUid?: string): boolean =>
        trip.isShared === true
        && trip.sharing?.role === 'viewer'
        && !matchesOwnerUid(trip, currentUserUid);

/** Default role for un-tagged join links (legacy fallback). */
export const DEFAULT_JOIN_ROLE: 'editor' | 'viewer' = 'editor';
