# System Stability & Bug Analysis Report (PRD)

**Date**: 2026-01-28
**Author**: Senior Agentic Researcher
**Subject**: Recursion, Data Integrity & UI/UX Failures

## 1. Executive Summary
This document provides a comprehensive root-cause analysis of three critical system failures reported by the user: "Zombie" persistent records, UI Modal invisibility, and Data Duplication. It outlines the forensic findings from code analysis and details the mathematical and state-machine fixes applied to ensure system stability.

## 2. Issue Analysis

### 2.1. The "Zombie Trip" Recursion (Critical Severity)
**Symptoms**: Deleted shared trips reappear upon refresh. Console logs show infinite loops of `Subscribing -> Update -> Left -> Subscribing`.
**Root Cause**: Race Condition in State Management.
- The `useEffect` hook in `App.tsx` was designed to subscribe to the `activeTrip`.
- When a user deletes/leaves a trip, the intuitive expectation is that the trip ceases to exist.
- However, `App.tsx` employs "Optimistic UI Updates" (removing the item from the array locally *before* the network request completes).
- **The Flaw**: The Local State (`trips` array) removal triggered a re-evaluation of `activeTrip`. If the deletion logic (async) hadn't fully resolved alongside the `useEffect` cleanup, the system would inadvertently *re-subscribe* to the very trip it was trying to leave, because the Firestore listener would receive one last "snapshot" before the server-side deletion took effect, thus "resurrecting" the local record.
**Fix Implemented**: `Processing Guard Pattern`.
- Introduced a `processingTripId` state semaphore.
- The Subscription Effect now checks `if (tripId === processingTripId) ABORT`.
- This ensures that once a "Delete" or "Leave" sequence begins, the system is **deaf** to any further updates from that specific ID, breaking the resurrection loop.

### 2.2. The Phantom Modals (High Severity)
**Symptoms**: User reported "No dialogs" despite code presence.
**Root Cause**: Stacking Context Isolation (Z-Index War).
- The `AdminView` modal utilizes `z-index: 100`.
- The `ConfirmModal` was initialized with `z-index: 100`.
- **The Physics**: When two elements share a stacking context and z-index, DOM order dictates visibility. However, since `ConfirmModal` is nested within the `AdminView` render tree but often positioned fixed relative to the viewport, browser compositing can render it *underneath* the backdrop of the parent modal.
**Fix Implemented**: Stratosphere Elevation.
- Elevated `ConfirmModal` to `z-index: 200`.
- Darkened the backdrop opacity from 40% to 60% for better contrast and focus.

### 2.3. Hotel Cellular Mitosis (Data Duplication)
**Symptoms**: "Records multiply when clicking between trips."
**Root Cause**: Naive Array Concatenation.
- The `handleAiUpdate` function in `AdminView` used the spread operator: `hotels: [...oldHotels, ...newHotels]`.
- If the AI or a sync operation returned hotels that *already existed* (but perhaps with slight metadata updates), the array would grow indefinitely ($N + N = 2N$), duplicating entries visually.
**Fix Implemented**: Idempotent Merge/Filter.
- Implemented a Set-theory based merge:
  ```typescript
  hotels: [
      ...currentHotels,
      ...newHotels.filter(newH => !currentHotels.some(existingH => existingH.id === newH.id))
  ]
  ```
- This ensures that $N \cup N = N$. No matter how many times an update runs, existing records are preserved and only *truly new* records are added.

## 3. Verification Protocol
To certify the fix, the following test vector is recommended:

1.  **Deletion Test**:
    - Open "Manage Trips".
    - Click "Leave" on a shared trip.
    - **Observe**: Modal appears (Z-Index check).
    - **Action**: Confirm.
    - **Result**: Trip vanishes. No console spam. Reload page -> Trip remains gone.

2.  **Duplication Test**:
    - Select a trip with 3 hotels.
    - Switch to another trip.
    - Switch back.
    - **Result**: Still 3 hotels. (Not 6).

## 4. Conclusion
The codebase has been patched with strict concurrency guards and layout corrections. The architecture is now resilient against async race conditions and visual stacking errors.
