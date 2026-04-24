# Share / Join flow — current state + gaps

This doc is the single source of truth for how trip sharing works
today and what's missing for a real "view-only" mode.

## Current behaviour

1. **Trip owner** opens `ShareModal` in `AdminView` → clicks "Generate
   link". This creates (or reuses) a `shareId` (UUID) and persists:
   - `/shared-trips/{shareId}` with the full trip snapshot + an
     `owner` field + a `collaborators` array.
   - `/trip_invites/{shareId}` with a minimal preview (name,
     destination, owner display name) so unauthenticated users can
     see what they're about to join.
2. **Recipient** gets a link `https://.../#/join/{shareId}`.
3. Opening the link triggers `JoinTripModal` in `App.tsx`. It loads
   the invite preview, shows a "Join" CTA.
4. On click, `joinSharedTrip()` adds the recipient's uid to
   `collaborators`, writes a reference under
   `/users/{uid}/shared-trip-refs/{shareId}`, and they land in the
   trip's itinerary view with **full edit access**.

## Firestore rules enforce (`firestore.rules`):

- `shared-trips/{tripId}` read: owner || in collaborators || email in
  allowedEmails. Unauthenticated users cannot read the document.
- `trip_invites/{inviteId}` **get** is public (anyone with the ID
  can preview). `list` is denied — no enumeration.
- Updates require the caller to hold a matching `shareId` (anti-
  hijack measure).

## Known gaps (what the user asked for but we don't have yet)

1. **True view-only mode** — nothing distinguishes a "viewer" from a
   "collaborator". Anyone who joins immediately becomes an editor.
2. **No unauthenticated preview deeper than the invite snapshot**.
   A recipient who doesn't want to sign in can't see the itinerary.
3. **Share UX is hidden** inside `AdminView` (behind the trip-detail
   panel). Users don't discover it easily.
4. **No link revocation** — once a `shareId` is out, it's valid until
   the owner deletes the shared-trip doc entirely.
5. **No "who has access" list** in the UI — owner can't see who has
   joined the trip.
6. **Silent failures**: if a user opens a link and the worker hasn't
   finished writing the invite, they see "Trip not found" with no
   retry.

## Design for full view-only mode (proposed, not yet shipped)

### User-facing

- Share modal exposes TWO copy buttons: "קישור לצפייה" (read-only) and
  "קישור לעריכה" (collaborator).
- Each link format: `.../#/join/{shareId}?view=1` vs `.../#/join/{shareId}`.
- Viewer never writes to Firestore. Opens in a read-only shell that
  hides every edit button in every view.

### Under the hood

- `trip_invites/{shareId}` is expanded to include the FULL trip
  snapshot (not just the preview). Reads are public by shareId-
  knowledge (already the case via `allow get: if true`).
- Client reads `trip_invites/{shareId}` when `?view=1` is present.
  Wraps the data in a read-only context (`TripContext.isReadOnly=true`)
  consumed by every view to gate edit handlers.
- On the owner's edits, the worker (or a client Cloud Function)
  mirrors the diff into `trip_invites/{shareId}` so viewers stay
  current.

### Edge cases to handle in that future round

- Two viewers open the link simultaneously with stale data — read
  once, don't keep a live subscription.
- Viewer signs in mid-session — should we promote the view link into
  a full join? Default: no, keep it view-only, show a toast "להצטרפות
  עם הרשאת עריכה בקשו מהיוצר לינק חדש".
- Trip deleted by owner while a viewer has it open — show an
  "Unavailable" screen, not a stuck loader.
- Viewer is on mobile with no internet — cache the invite in
  localStorage for 24 h, render the cached version with a banner.
- Link leaks to someone unintended — owner needs "regenerate link"
  button that rotates `shareId`.
- SEO / unfurl — the invite preview should include a proper OG image
  (currently none), so pasting into WhatsApp / Slack shows a card.

## TL;DR

Today's share = "join and edit, requires auth". The view-only mode
the user asked for is a material feature, not just a rule tweak —
tracked as future work.
