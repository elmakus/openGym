# H1 >20 rep adapter — isolated native-parity correction (2026-11-10)

**VERDICT: 28 genuine pinned original-Liftosaur workouts re-executed / 336 comparisons / 0 mismatches using a source-only openGym observation variant. Unchanged product remains RED.**

## Cause and isolated remedy

The original H1 performance contract `H2PERF-DEC-001` describes approximately 5–20 reps, not a normative hard 20 cutoff. Unchanged openGym `api/training-control/hybrid2/observation.js` introduced `H1_SUPPORTED_REPS_UPPER = 20` and maps all 21+ reps to `INDETERMINATE`. Frozen original fitness `hybrid2_promotion_materializer.py` has no such high-side predicate.

A **temporary sibling-module source-only variant** suppresses exactly this line:
```js
if (first.reps > H1_SUPPORTED_REPS_UPPER) return bare('INDETERMINATE', raised)
```
No production source file or original fitness/Liftosaur source was modified; temporary sibling files are always removed after execution.

This reruns the **same** three 19–23-rep scenarios from the prior original native RED report using genuine pinned `Playground_run`, `complete_set`, `finish_workout`, actual `updatedProgramText` and native state readback. It is a differential re-execution, **not 28 newly independent scenarios**, and must not be added to the cumulative unique workout ledger.

| Reps | Original native workouts | Original H1 valid audit votes | Variant valid audit votes | RED steps |
| ---: | ---: | ---: | ---: | ---: |
| 10 | 9 | 3 | 3 | 0 |
| 19 | 8 | 5 | 5 | 0 |
| 20 | 4 | 4 | 4 | 0 |
| 21 | 2 | 2 | 2 | 0 |
| 22 | 2 | 2 | 2 | 0 |
| 23 | 3 | 3 | 3 | 0 |

**336/336 semantic comparisons matched**, including H1 history/reference, audit flags, and residual downstream effects across sequences. The previous unmodified-product comparison of these same sequences had **16 RED steps / 58 mismatched fields**.

## Critical limits

- Native first-set input mapped from the issued commands, not extracted from the native serialized completed workout. This is a real native H1 state differential but **not full user-plan/end-to-end parity**.
- Removing the hard cap without adding another one may accept extreme synthetic repetition counts (e.g. 300) outside the normal supported operating envelope. This experiment establishes **21–23 parity only**; a coherent exceptional-input policy requires independent approval/tests before product change. Do not imply universal safety for arbitrary high reps.
- Existing original-product API tests for deliberate extreme-count rejection still PASS because original source is untouched; they cannot prove this candidate variant would retain that extreme-count safety gate.
- No actual current M6 full-plan progression, H1+ATP2 paired/Timed Load roundtrip, full backend persistence/restart, UI or deployed package verified in this step.

## Reproduction
```sh
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/shared-identity-followup-20261110"
FITNESS_ROOT="$BASE/fitness" \
LIFTOSAUR_RUNTIME_ROOT="$BASE/liftosaur" \
H2_PARITY_OUT="$BASE/evidence-h1-relaxed-20261110" \
 node scripts/hybrid2-runtime-parity/run-h1-native-19-23-relaxed-variant.mjs
# SOURCE_OVERLAY_PASS, 28 genuine native rerun workouts, 336 comparisons, 0 mismatches
```

[Sanitized evidence](h1-relaxed-reps-variant-sanitized.json). Native exact source and full state remain private.
