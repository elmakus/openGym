# H1 native-source exactness through 300 repetitions — accepted implementation decision

**Date:** 2026-11-10. **Authority:** user explicitly stated: *"H1 priorytetem jest dokładne zachowanie oryginału również przy 300 powtórzeniach"* (H1 must reproduce original behavior, including 300 repetitions). This explicitly supersedes the hard-20 implementation choice in the prior openGym project description. It does not rewrite the historical tests of the old branch.

**Scope:** H1 loaded first-working-set **comparability** and score, not a health/strength prediction endorsement, a promise of full-plan parity, or a change to the pinned original fitness source. Authoritative original H1 code is `fitness@9f2deb6c345643d7c0c793c52d358e496c2710d2` + `Liftosaur@ce75750bde4a190682fb5a6fa1984fc9184a9842`. Descriptive initial ~5–20 repetitions in H2PERF-DEC-001 is **not a normative upper comparison bound**. All source-pinned initial H1 metric/reference versions `H1-EPL-1 / H1-ASYM-M3-1` are unchanged.

## Implemented on validation-only branch

- `api/training-control/hybrid2/observation.js`: removed the local `H1_SUPPORTED_REPS_UPPER = 20` constant and the `first.reps > 20 => INDETERMINATE` predicate. For a valid completed first working set with baseline-matching load, integer performed reps such as **20/21/22/23/24/25/30/50/100/300/301** are all COMPARABLE, and `loadedRepScore(weight, reps)` uses the same Epley computation as the original. **No substitute high-rep cap, clamping or manually special-casing 300.**
- Existing sentinels remain intact: nonpositive/fractional/non-numeric rep observations, the original unpaired 1-rep exclusion, missing/skipped sets, incomplete unilateral partner, manual load discontinuity, timed load, frozen deload, excluded progression, and candidate raise/guard logic. No other progression algorithm was changed.
- Updated `api/training-control/hybrid2-evidence-contract.test.mjs` and `hybrid2-unsupported-perf-independent.test.mjs` from deliberately protecting the old 300-rep cap to positively verifying original-source behavior. The historical independent test filename is retained to avoid changing legacy test discovery; its logic is now source-exact.
- Two historical H1 runtime differential runners (`run-current-h1.mjs`, `run-h1-extended.mjs`) previously **hardcoded the 20-rep cap in the test harness**, independent of product code. They now call the *actual* `h1FromExposure` adapter from a command-projected set. This repairs a test-harness mismatch, not the original fitness generator. Their prior historical RED records remain in source control; they have **not** been deleted or silently relabelled. Historical 21–23 and 24–300 **source-only overlay** scripts are archival and require the old cutoff-present checkout; use the direct native runners for the current branch.

## Executed original native runtime differential

All five runners called the genuine pinned native runtime with source generated or composed from frozen private fitness code. A completed first-set observation is mapped from the actual **issued native workout command**, not extracted from an independent native completed-set serializer in these H1-specific tests.

| Original native execution | Actual original workouts rerun | Compared fields | RED steps after implementation |
| --- | ---: | ---: | ---: |
| `run-current-h1.mjs` (8 scenarios, true adapter) | 53 | 630 | 0 |
| `run-h1-extended.mjs` (7 scenarios, true adapter) | 124 | 1470 | 0 |
| `run-h1-native-19-23-boundary.mjs` (3 scenarios) | 28 | 336 | 0 |
| `run-h1-native-24-300-boundary.mjs` (4 scenarios, includes 300) | 30 | 360 | 0 |
| `run-atp2-h1-composite.mjs` (combined, nonproduction source composition) | 33 | 429 | 0 |
| **Total native executions in this acceptance run** | **268** | **3225** | **0** |

These are **268 real native workout executions, NOT 268 additional independent test cases for the cumulative project ledger**. Most sequences replay previously exercised scenario families; the 24–300 scenario was already first run in the prior evidence commit and is now repeated on the integrated code. Native scripts carry `updatedProgramText` across sequential workouts. The combined ATP2+H1 case is a test-owned composite, not the complete user M6 plan.

[Fresh post-change pinned runtime evidence for 19–23](h1-approved-19-23-sanitized.json) and [24–300](h1-approved-24-300-sanitized.json) in this acceptance report's execution are backed by the current revised observation.js; the separate historical RED traces in earlier commits remain immutable. [Aggregated acceptance evidence](h1-source-exact-300-accepted-sanitized.json) records source SHA-256, counts and scope.

## Source-level / HTTP / existing-data controls

- **117/117 Node tests PASS** for the H1 evidence contract, independent extreme reps, general H2/ATP2/Timed Load, profile pack/validation, explicit groups, and a real HTTP test.
- **20 completed synthetic K5 records** saved and retrieved through actual isolated openGym `api/server.js`, including `100 kg × 300 completed reps`. The expected reference score of that single observation is **1100 kg in Epley model units** (not an actual one-rep max). Actual persisted H1 `perf3` equals **1100**; `validCount=5`, `cycleClass=GOOD`, `queueDeload=false`; two real process restarts preserve the exact replay and canonical state. [Sanitized HTTP evidence](h1-300-real-http-sanitized.json). No actual original Liftosaur binary ran inside this HTTP test; its native algorithm behavior is verified separately above.
- **12 more original native M6 source-overlay sessions / 155 completed sets / 702 compared fields / zero mismatches** for ATP2 Turbo/H1 and reduced deload; the source is corrected **only in the test overlay** for original RTT and stale H1 state. [Earlier source-variant M6 report](H1_NATIVE_24_300_CONTRACT_AND_M6_MULTISET_20261110.md). This is not unmodified M6 parity.
- **1350/1350 source-side M6 regression checks PASS** on 9 archived original-native-driven profiles, 537 historical exposures, 537 immutable prescription hashes, 211 progression references; no new native workout generated in this M6 readback check.

## Reproduction

```sh
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/shared-identity-followup-20261110"
export FITNESS_ROOT="$BASE/fitness"
export LIFTOSAUR_RUNTIME_ROOT="$BASE/liftosaur"
for script in run-current-h1.mjs run-h1-extended.mjs \
              run-h1-native-19-23-boundary.mjs run-h1-native-24-300-boundary.mjs \
              run-atp2-h1-composite.mjs; do
  H2_PARITY_OUT="$BASE/h1-approved-$script" node "scripts/hybrid2-runtime-parity/$script"
done
H2_PARITY_OUT="$BASE/h1-approved-http" \
  node --test api/test/hybrid2-h1-high-reps-http-restart.test.js
```

**Unresolved (not part of this change):** original unmodified current M6 RTT 29 local update shadowing and stale H1 write; full native completed-set serializer → frontend full-program → HTTP durability → multi-device sync parity; independently verified Timed Load end-to-end parity; physical Android/real account deployment; full HYBRID-2 acceptance. The earlier H1 hard-cap implementation discrepancy **is resolved on this validation branch only**. There was no change to `main`, a user's saved workouts, actual native fitness program or production database.
