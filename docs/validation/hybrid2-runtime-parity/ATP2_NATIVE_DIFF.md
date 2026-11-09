# Original ATP2 Turbo vs openGym: genuine pinned runtime differential (2026-11-09)

## Exact provenance

- Original **unchanged** `elmakus/fitness` source: `programs/adaptive_rep_engine_turbo_probe_candidate.liftoscript` at fitness commit `9f2deb6c345643d7c0c793c52d358e496c2710d2`, exact original Git blob `4d6452c2dd2a2ddd45f8b8d653d4ebcf3c37e170`.
- Native original `liftosaur/liftosaur@ce75750bde4a190682fb5a6fa1984fc9184a9842`, not a mock.
- openGym under test: `8529b2d41b28fea8ae96a50325aaf28e864a0160`, `api/training-control/atp2.js` / `evaluateAtp2`.
- Isolated environment: runtime stock settings cloned, `units='kg'`, normalized model equipment step 2.5kg (no real user gym/settings). No live/staging writes.
- [Runner](../../../../scripts/hybrid2-runtime-parity/run-atp2-real-native.mjs) SHA-256 `2be4911225bf76ba50048d69721148635da24f4628197242a316f99cbba64563`.
- [Native raw per-workout JSON](atp2-real-native-diff.json) SHA-256 `c281afc5489ec5c5ff0078e66725974a7177b90ce181e270d4234b4b36d5ff7e`.

## Genuine execution

18 native `Playground_run`/ `finish_workout` calls with serial reloaded `updatedProgramText`, **75 explicit differential comparisons, 0 FAIL**. Each trace contains inputs, actual native sets as printed by the genuine workout, persisted candidate/probe/floor/low-count, corresponding openGym nextState, hashes of original source before and after finish, and all issue lists.

Five scenarios: first set high-rep 21 and next-session calibration (5 workouts), same-session 21+8 Turbo validation (3), 21+21 chained Turbo (2), 21+3 hard backoff (2), 1-rep sentinel and boundary sequence (6). Native and openGym agree including next intra-session set weight in 2-set scenarios.

Notable exact native outcomes:

| Sequence | Native durable ATP2 candidate | probeActive |
|---|---|---|
| 10kg × 21 reps (single first set) | 12.5kg | 1 |
| Next at 12.5kg × 7 | 10kg | 0 |
| 10kg × 21, then 12.5kg × 8 same workout | 12.5kg | 0 |
| 10kg × 21, then 12.5kg × 21 same workout | 15kg | 1 |
| 10kg × 21, then 12.5kg × 3 same workout | 10kg | 0 |
| 10kg × default sentinel 1 rep | 10kg | 0 |

No automatic rescaling of the raw source to force a PASS; after each real workout `evaluateAtp2` consumes the same **native completed-set weight and repetitions** that Liftosaur actually recorded. We compare final candidate, floor, probe and low-count, plus predicted second-set load when applicable.

## How to reproduce

```sh
# From a frozen openGym base checkout that has the validation runner available:
LIFTOSAUR_RUNTIME_ROOT=/tmp/hybrid2-runtime-parity-20261109/liftosaur \
FITNESS_ROOT=/tmp/hybrid2-runtime-parity-20261109/fitness \
H2_PARITY_OUT=/tmp/hybrid2-runtime-parity-20261109/evidence \
node scripts/hybrid2-runtime-parity/run-atp2-real-native.mjs
# expected: 18 native workouts, 75 compared fields, 0 issues
```

## Not established

This is **standalone ATP2 pure-reducer parity**, not a complete HYBRID-2 original real-plan materialization with ATP2 candidate H1 guard in the same native exercise, nor an actual openGym database saved-exposure → next-session history replay test, nor custom/migrated equipment ladder, nor all nine original ATP2-BOOK test cases. Thus **this PASS cannot close full production parity**. The separate H1 >20-repetition contract mismatch remains RED.
