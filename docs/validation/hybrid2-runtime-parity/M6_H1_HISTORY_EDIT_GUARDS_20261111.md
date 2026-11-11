# HYBRID-2 M6 — structural history edit preflight and Custom M6 RTT (2026-11-11)

## Scope and provenance

This batch extends the validated openGym branch without changing the original
Liftosaur program, private historical records, user account or production backend.

The prior branch commit `f9f6efa95819f3f07d97534071ffcd138013c9a3`
already implements a **read-only, source-evaluated native H1 checkpoint importer**,
tested locally with the pinned original runtime; the resulting real H1 checkpoint
remains private on Unraid. This batch operates on **synthetic** H1 anchors and
synthetic custom exercises in real openGym session and history functions.
It does not claim newly executed original-Liftosaur workouts.

## Confirmed product failures before the fix

`frontend/src/lib/hybrid2-session-edit.test.js` exercises actual
`buildSessionExposures → entriesForExposures → buildCompletedSession →
reconcileHybridHistory` with six custom signal exercises, three A/B/C sessions,
custom names from the profile without global registration, and a native-style
H1 cutover.

Three independent history-edit test cases were RED before the product change:

1. `moveWorkoutInProfile` accepted moving an early structural workout before
   the imported native H1 cutover. Controller state became INCOMPATIBLE only
   after committing a broken chronology.
2. `deleteEditedWorkout` removed the first A workout while downstream B/C
   still existed, destroying the previously valid cycle ordering.
3. `saveWorkoutEdit` appended a duplicate structural occurrence to one
   persisted workout. It saved conflicting evidence before replay detected it.

The History detail sheet also bypassed the editor and deleted workouts directly.
Date-edit and deletion sheets were not handling a structural rejection.

## Implementation

- `assertSafeHybridHistoryEdit(profile, proposedWorkouts)` runs a **read-only,
  full structural preflight** before committing an edit. It checks the same
  adapter validation, frozen progression exclusions, enabled-resume continuity,
  native H1 bootstrap chronology, and deterministic H1 replay as the controller.
  A previously healthy profile cannot become structurally invalid through a
  local workout edit. Already-incompatible history remains editable for
  deliberate recovery; the existing reconciliation barrier remains intact.
- `saveWorkoutEdit` builds one-rep-max estimates on a temporary copy and
  preflights the candidate workout **before** stamping or changing the source
  history, caches or draft. Valid custom exercise set edits still replay the
  source H1 and Engine chronology.
- `moveWorkoutInProfile`, `deleteEditedWorkout` and the new
  `deleteWorkoutFromProfile` block invalidating actions atomically.
  The History detail sheet now uses the same validated deletion function.
- The History date/deletion sheets display errors and keep the sheet open
  instead of closing it or displaying a false success notification.

## Full synthetic M6 RTT lifecycle

A genuine openGym API path test drives custom M6 through:
- Imported/synthetic six-signal H1 anchors → `QUEUED`
- Next structural A/B/C cycle with frozen prescriptions and persistent
  `excludedFromProgression` → `LEARNING`
- Three subsequent normal A/B/C cycles → `NORMAL`

It also asserts ordinary Engine progression does not advance during the frozen
cycle. The test uses the **next prescribed work-row load** rather than forcing
an obsolete 40 kg at later sessions. Deliberately forcing an earlier load
produced legitimate H1 `DISCONTINUITY`, not an Engine bug.

## Limitations

This is a deterministic **synthetic-M6** end-to-end regression, not a fresh
original-native M6 differential, not a production Android walkthrough, and
not a complete physical-gym future-session comparison. Multi-device offline
concurrent edits can still merge into an incompatible structural timeline; the
established merged-history fail-closed barrier remains the authority there.
The read-only imported checkpoint has not been deployed to a live openGym user.

No account write, original source modification or private benchmark data
publication occurred in this batch.
