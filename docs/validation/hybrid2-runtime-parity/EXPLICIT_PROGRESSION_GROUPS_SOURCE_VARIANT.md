# Explicit selective progression groups — Engine v2 source-overlay validation (2026-11-10)

**VERDICT: SOURCE_OVERLAY_PASS for the tested ordinary-plan scenario, NOT a shipped UI or schema change.**

## Decision and boundary

User-approved architecture: independent occurrences of the same exercise may be deliberately placed in a named progression group. Grouping is **manual, not inferred from a display name or identical exerciseId**. Member occurrences must have an identical declared repetition range; distinct exercise IDs must never be merged. Additional preliminary safety gates require compatible sets, entire program/operator structure, rounding, logging type and equipment-side semantics. These conservative gates are **prototype constraints**, not a claim that arbitrary matching rep ranges alone are always sufficient.

The validation-only configuration is:
```json
{
  "progressionGroups": {
    "version": 1,
    "groups": [
      {"id": "bench-main", "members": ["bench-mon", "bench-fri"]}
    ]
  }
}
```
This field is **not yet part of the validated/persisted openGym production model**.

## Real-source execution

Actual pinned openGym Engine v2 `generatePrescription`, `resolveProgressionContext`, `buildCompletedSession`, `advanceProgression`, `replayProgression`, immutable prescription hashes and real frontend `buildSessionExposures` were executed, replacing **only** its track ID selector in a transient imported sibling source module. Original product source untouched (SHA-256 `f8d0575f047e04155531aab00a536f7f97ff1e0267cac2413c5919d3c6310ed1`). This is not a mock progression engine.

The synthetic test plan (safe fixture, not a real user) contains:

| Day | Exercise | Position | Rep range | Track |
| --- | --- | ---: | --- | --- |
| Monday | Bench Press | 1 | 6–8 | `progression-group:bench-main` |
| Wednesday | Bench Press | 5 (after 4 fillers) | 10–12 | `bench-wed` |
| Friday | Bench Press | 1 | 6–8 | `progression-group:bench-main` |

Replayed native Engine v2 flow: Monday 100 → state 102.5 kg; Wednesday independently 100 → 102.5 kg; Friday sees Monday 102.5 → group state 105 kg; Wednesday independently 102.5 → 105; next Monday sees Friday's 105 kg. These numbers are **controlled synthetic fixture values**, not actual Liftosaur current-plan weights.

**68 assertions PASS / 0 unexpected failures**, **16 actual source materializations**, **7 completed frontend Engine v2 sessions**, **7 in-memory history workout records in two independent test profiles**, **2 independent state tracks per profile**, **8 deliberately invalid grouping scenarios rejected** (different rep ranges, exercise, operator, set count, duplicate membership, missing member, duplicate member, one-member group), plus pinned original HYBRID-2 adapter authority blocking a conflicting manual override. Independent immutable prescription content hashes and Engine v2 chronological replay state pointers/values verified.

Unconfigured ordinary sessions retain their exact original per-occurrence track ID. Static pinned HYBRID-2 adapters retain their explicit original-fitness `progressionIdentity` as authoritative; arbitrary UI groups cannot overwrite them.

## Limitations and work to do

- No UI to select groups. No persisted schema, schema migration, copy/export/import/sync or compatibility validation at edit/save boundary. A group defined only inside this test fixture cannot be used from the app.
- No full M6+backend restart/replay, no simultaneous double occurrence edge test, no actual user data or original Liftosaur native session in this group stage.
- The prototype requires identical entire progression program structure (including set structure); whether differently configured sets can safely share a state needs a separate decision and tests. Identical rep range is necessary but not sufficient for safe Engine v2 state sharing.
- Changing a group's membership once history exists must be reviewed separately. Current scope assumes a clean start with no earlier migration.
- **Confirmed then resolved inside source-only variant:** with `lastFrom: any`, changing only the `trackId` still borrowed an unrelated Wednesday observation, causing 6 mismatched isolation assertions. The variant now disables cross-routine lookup and filters unrelated same-exercise tracks from the baseline history when a manual group is authoritative. A negative control proves unchanged Engine v2 would borrow Monday's grouped history for Wednesday before this filter, while the overlay returns no foreign baseline. Repeated 3 sessions with `lastFrom: any` now PASS. An ordinary profile without configured groups produces byte-identical original exposures/prescriptions even with `lastFrom: any`.\n- Full frontend Vitest integration could not be started in this remote worktree because `vite` is not installed (`ERR_MODULE_NOT_FOUND`). Real-source Node validation passed; no npm installation was attempted. Other embedded prescription features require further regression testing before product rollout.

## Reproduction
```sh
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/shared-identity-followup-20261110"
H2_PARITY_OUT="$BASE/evidence-explicit-groups-20261110" \
 node scripts/hybrid2-runtime-parity/run-explicit-progression-groups-source.mjs
# SOURCE_OVERLAY_PASS, 68 assertions, 7 completed sessions, 8 negative controls
```

[Sanitized evidence](explicit-progression-groups-sanitized.json). No original native source or current user's training loads are published.
