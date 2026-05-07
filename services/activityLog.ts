/**
 * Activity log + soft-delete for collaborative trips.
 *
 * Single entry point: `withActivityLog(prev, next, actor)` returns a NEW
 * trip object with:
 *   1. Items deleted in `next` re-routed to trip.trash (soft delete)
 *   2. Activity entries appended to trip.activityLog
 *
 * Wrap App.tsx's handleUpdate with this — every save produces audit + undo.
 *
 * Activity entries include `prev` snapshots so a single entry can be undone
 * without rolling back the whole trip.
 */

import type { Trip, Restaurant, Attraction, HotelBooking, RestaurantCategory, AttractionCategory } from '../types';

export type ActivityAction =
    | 'add'
    | 'update'
    | 'delete'
    | 'restore';

export type ActivityEntityType =
    | 'restaurant'
    | 'attraction'
    | 'hotel'
    | 'itinerary'
    | 'note';

export interface ActivityEntry {
    id: string;
    ts: number;
    actorUid: string;
    actorName: string;
    action: ActivityAction;
    entityType: ActivityEntityType;
    entityId: string;
    entityName: string;
    /** For undo: previous full item (delete/update) or new item (add). */
    snapshot?: any;
    /** For categorized items, the category title that owned them. */
    categoryTitle?: string;
}

export interface TrashEntry {
    trashId: string;
    deletedAt: number;
    deletedBy: string;
    deletedByName: string;
    entityType: ActivityEntityType;
    /** Original category title (for restaurants/attractions). */
    categoryTitle?: string;
    item: any;
}

const ACTIVITY_LOG_CAP = 200;
const TRASH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const newId = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

interface Actor {
    uid: string;
    name: string;
}

const flattenRestaurants = (cats: RestaurantCategory[] = []) => {
    const out: Array<{ item: Restaurant; categoryTitle: string }> = [];
    cats.forEach(c => (c.restaurants || []).forEach(r => out.push({ item: r, categoryTitle: c.title })));
    return out;
};

const flattenAttractions = (cats: AttractionCategory[] = []) => {
    const out: Array<{ item: Attraction; categoryTitle: string }> = [];
    cats.forEach(c => (c.attractions || []).forEach(a => out.push({ item: a, categoryTitle: c.title })));
    return out;
};

/** Detect deletions / additions between prev and next sets keyed by id. */
const diffSet = <T extends { id: string }>(
    prevList: T[],
    nextList: T[]
): { added: T[]; removed: T[] } => {
    const prevIds = new Set(prevList.map(x => x.id));
    const nextIds = new Set(nextList.map(x => x.id));
    return {
        added: nextList.filter(x => !prevIds.has(x.id)),
        removed: prevList.filter(x => !nextIds.has(x.id)),
    };
};

/** Returns trip with items removed in `next` rerouted to trash + activity log entries. */
export const withActivityLog = (prev: Trip, next: Trip, actor: Actor): Trip => {
    const entries: ActivityEntry[] = [];
    const trash: TrashEntry[] = [...(next.trash || [])];
    const ts = Date.now();

    // ---- Restaurants (categorized) ----
    const prevR = flattenRestaurants(prev.restaurants);
    const nextR = flattenRestaurants(next.restaurants);
    const rDiff = diffSet(prevR.map(p => p.item), nextR.map(p => p.item));
    rDiff.removed.forEach(r => {
        const cat = prevR.find(p => p.item.id === r.id)?.categoryTitle;
        trash.push({
            trashId: newId('trash'), deletedAt: ts, deletedBy: actor.uid, deletedByName: actor.name,
            entityType: 'restaurant', categoryTitle: cat, item: r,
        });
        entries.push({
            id: newId('act'), ts, actorUid: actor.uid, actorName: actor.name,
            action: 'delete', entityType: 'restaurant', entityId: r.id, entityName: r.name,
            snapshot: r, categoryTitle: cat,
        });
    });
    rDiff.added.forEach(r => {
        const cat = nextR.find(p => p.item.id === r.id)?.categoryTitle;
        entries.push({
            id: newId('act'), ts, actorUid: actor.uid, actorName: actor.name,
            action: 'add', entityType: 'restaurant', entityId: r.id, entityName: r.name,
            snapshot: r, categoryTitle: cat,
        });
    });

    // ---- Attractions (categorized) ----
    const prevA = flattenAttractions(prev.attractions);
    const nextA = flattenAttractions(next.attractions);
    const aDiff = diffSet(prevA.map(p => p.item), nextA.map(p => p.item));
    aDiff.removed.forEach(a => {
        const cat = prevA.find(p => p.item.id === a.id)?.categoryTitle;
        trash.push({
            trashId: newId('trash'), deletedAt: ts, deletedBy: actor.uid, deletedByName: actor.name,
            entityType: 'attraction', categoryTitle: cat, item: a,
        });
        entries.push({
            id: newId('act'), ts, actorUid: actor.uid, actorName: actor.name,
            action: 'delete', entityType: 'attraction', entityId: a.id, entityName: a.name,
            snapshot: a, categoryTitle: cat,
        });
    });
    aDiff.added.forEach(a => {
        const cat = nextA.find(p => p.item.id === a.id)?.categoryTitle;
        entries.push({
            id: newId('act'), ts, actorUid: actor.uid, actorName: actor.name,
            action: 'add', entityType: 'attraction', entityId: a.id, entityName: a.name,
            snapshot: a, categoryTitle: cat,
        });
    });

    // ---- Hotels (flat list) ----
    const hotelsDiff = diffSet(prev.hotels || [], next.hotels || []);
    hotelsDiff.removed.forEach(h => {
        trash.push({
            trashId: newId('trash'), deletedAt: ts, deletedBy: actor.uid, deletedByName: actor.name,
            entityType: 'hotel', item: h,
        });
        entries.push({
            id: newId('act'), ts, actorUid: actor.uid, actorName: actor.name,
            action: 'delete', entityType: 'hotel', entityId: h.id, entityName: h.name,
            snapshot: h,
        });
    });
    hotelsDiff.added.forEach(h => {
        entries.push({
            id: newId('act'), ts, actorUid: actor.uid, actorName: actor.name,
            action: 'add', entityType: 'hotel', entityId: h.id, entityName: h.name,
            snapshot: h,
        });
    });

    if (entries.length === 0) return next;

    // Purge trash entries past retention window
    const cutoff = ts - TRASH_RETENTION_MS;
    const purgedTrash = trash.filter(t => t.deletedAt >= cutoff);

    const log = [...(next.activityLog || []), ...entries].slice(-ACTIVITY_LOG_CAP);

    return {
        ...next,
        activityLog: log,
        trash: purgedTrash,
    } as Trip;
};

/** Restore a trashed item back into its rightful collection on the trip. */
export const restoreFromTrash = (trip: Trip, trashId: string, actor: Actor): Trip => {
    const trash = trip.trash || [];
    const entry = trash.find(t => t.trashId === trashId);
    if (!entry) return trip;

    let nextTrip = { ...trip };
    const ts = Date.now();
    const restoreEntry: ActivityEntry = {
        id: newId('act'), ts, actorUid: actor.uid, actorName: actor.name,
        action: 'restore', entityType: entry.entityType,
        entityId: (entry.item as any).id || newId('item'),
        entityName: (entry.item as any).name || '—',
        snapshot: entry.item, categoryTitle: entry.categoryTitle,
    };

    switch (entry.entityType) {
        case 'restaurant': {
            const cats = [...(nextTrip.restaurants || [])];
            const idx = cats.findIndex(c => c.title === entry.categoryTitle);
            if (idx >= 0) {
                cats[idx] = { ...cats[idx], restaurants: [...(cats[idx].restaurants || []), entry.item] };
            } else {
                cats.push({
                    id: newId('cat'),
                    title: entry.categoryTitle || 'מסעדות',
                    restaurants: [entry.item],
                } as RestaurantCategory);
            }
            nextTrip.restaurants = cats;
            break;
        }
        case 'attraction': {
            const cats = [...(nextTrip.attractions || [])];
            const idx = cats.findIndex(c => c.title === entry.categoryTitle);
            if (idx >= 0) {
                cats[idx] = { ...cats[idx], attractions: [...(cats[idx].attractions || []), entry.item] };
            } else {
                cats.push({
                    id: newId('cat'),
                    title: entry.categoryTitle || 'אטרקציות',
                    attractions: [entry.item],
                } as AttractionCategory);
            }
            nextTrip.attractions = cats;
            break;
        }
        case 'hotel': {
            nextTrip.hotels = [...(nextTrip.hotels || []), entry.item as HotelBooking];
            break;
        }
    }

    nextTrip.trash = trash.filter(t => t.trashId !== trashId);
    nextTrip.activityLog = [...(nextTrip.activityLog || []), restoreEntry].slice(-ACTIVITY_LOG_CAP);

    return nextTrip;
};

/** Undo a single delete entry from the activity log: restore item to original collection. */
export const undoActivityEntry = (trip: Trip, entryId: string, actor: Actor): Trip => {
    const entry = (trip.activityLog || []).find(e => e.id === entryId);
    if (!entry) return trip;

    if (entry.action === 'delete') {
        // Find matching trash entry and restore it
        const matching = (trip.trash || []).find(t =>
            t.entityType === entry.entityType && (t.item as any).id === entry.entityId
        );
        if (matching) return restoreFromTrash(trip, matching.trashId, actor);
        return trip;
    }
    if (entry.action === 'add') {
        // Remove the added item from its collection (this will re-trigger soft-delete via diff)
        let nextTrip = { ...trip };
        if (entry.entityType === 'restaurant') {
            nextTrip.restaurants = (nextTrip.restaurants || []).map(c => ({
                ...c,
                restaurants: (c.restaurants || []).filter(r => r.id !== entry.entityId),
            }));
        } else if (entry.entityType === 'attraction') {
            nextTrip.attractions = (nextTrip.attractions || []).map(c => ({
                ...c,
                attractions: (c.attractions || []).filter(a => a.id !== entry.entityId),
            }));
        } else if (entry.entityType === 'hotel') {
            nextTrip.hotels = (nextTrip.hotels || []).filter(h => h.id !== entry.entityId);
        }
        return nextTrip;
    }
    return trip;
};

export const TRASH_RETENTION_DAYS = 30;
