# Firestore schema

Single source of truth for what lives where in the Cloud Firestore
database. Update this file whenever a new collection or material field
is added. Keeps future contributors from guessing.

## Collections

### `/users/{uid}/trips/{tripId}`
**Purpose**: the user's private trips. One doc per trip.
**Write access**: owner only.
**Schema** (matches `Trip` in `types.ts`):
- Identity: `id`, `name`, `destination`, `dates`, `coverImage`
- Travelers: `travelers`, `travelersComposition`
- Flights: `flights.segments[]`, `flights.passengers[]`, `flights.pnr`
- Hotels: `hotels[]` (each with `id`, `name`, `address`, `checkInDate`,
  `checkOutDate`, `lat`, `lng`, `rooms[]`, `confirmationCode`, …)
- Content: `itinerary[]`, `restaurants[]`, `attractions[]`,
  `aiRestaurants[]`, `aiAttractions[]`
- Metadata: `createdAt`, `updatedAt`, `source` (`'email' | 'wizard' | …`)
- Legacy/dormant: `expenses[]`, `shoppingItems[]` (UI removed, fields
  kept for back-compat)

### `/users/{uid}/shared-trip-refs/{shareId}`
**Purpose**: pointer to a shared trip the user has joined.
**Schema**: `{ shareId, joinedAt, role: 'editor' }`.
**Why separate**: avoids scanning every shared-trips doc to find a
user's references. Keeps personal list fast.

### `/users/{uid}/system_logs/{logId}`
**Purpose**: client-side debug events + AI failures.
**Write access**: owner only.

### `/shared-trips/{shareId}`
**Purpose**: trip data visible to a collaborator pool.
**Fields**: `owner`, `collaborators[]`, `shareId`, `allowedEmails[]`,
  `tripData` (a full `Trip` snapshot), `createdAt`, `updatedAt`,
  `updatedBy`.
**Read access**: owner || in collaborators || email in allowedEmails.
**Write access**: same — caller must already have access.
**Notes**: still mutable by any collaborator, which effectively means
every joiner is an editor. View-only mode is proposed in
[docs/share-flow.md](./share-flow.md) but not yet shipped.

### `/trip_invites/{shareId}`
**Purpose**: minimal public preview of a shared trip so recipients can
see what they're about to join without signing in.
**Fields**: `shareId`, `tripId`, `tripName`, `destination`, `dates`,
  `ownerEmail`, `ownerDisplayName`, `createdAt`.
**Rules**: `get: true`, `list: false`, `create/update: authenticated`,
  `delete: false`. The `shareId` is an unguessable UUID so public `get`
  is safe against enumeration.

### `/ai_cache/{hash}`
**Purpose**: cross-user cache for identical AI prompts. Saves API $$.
**Fields**: `response` (the cached JSON text), `model`, `cachedAt`.
**Rules** (post-R0): `read: true` (cross-user savings), `write:
  if request.auth != null` so anonymous clients can't poison the cache.
**Cache key**: SHA-256 of the normalized prompt (see
  `services/cacheService.ts`).

### `/processing_queue/{id}`
**Purpose**: worker side — failed Gemini extractions for email-forward
imports. Human can inspect + re-run. (`workers/src/index.ts`).
**Fields**: raw email body, parse error, uid, timestamp.

## Collection-group rules

The rules file also has a catch-all `match /{path=**}/trips/{tripId}`
for a single collection-group query used for orphan-trip recovery by
email. Exposed only to the calling user's own email/uid.

## Dormant fields on `Trip`

Kept in the schema but no UI consumes them:
- `expenses[]` — Budget view was deleted in R0.
- `shoppingItems[]` — Shopping view deleted in R0. Map pin logic for
  shopping was removed in Q5. Safe to delete on next schema migration.

## What's NOT in Firestore

- User authentication — Firebase Auth (not Firestore).
- Gemini API keys — Cloudflare Worker env vars.
- Forwarding-email address for Smart Import — Cloudflare Email Routing
  dashboard config. Not in code, not in env.
- Geocoding cache for map pins — `localStorage` key
  `travel_app_geo_cache_v5`. Shared between live map + HTML export.
- Route-leg AI classifications — `localStorage` key
  `travel_app_route_classify_v1`. Per-trip keyed with a stops-signature.

## Rule verification (manual)

Paste the following into the Firebase Rules Playground after every
rules change:
1. `/users/X/trips/Y` as user X → should read/write. As user Z → deny.
2. `/shared-trips/S` with `collaborators=[X]` as X → read/write. Anon →
   deny. User Z not in collaborators → deny.
3. `/trip_invites/I` anon `get` → allow (any UUID). Anon `list` → deny.
4. `/ai_cache/H` anon `get` → allow. Anon `set` → deny. Auth user
   `set` → allow.
