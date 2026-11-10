# M6: genuine ATP2 Turbo → H1 integrated native differential (2026-11-10)

**Selected PASS: 12 genuine original-Liftosaur finished workouts / 702 comparisons or assertions / 0 RED.** These are new native executions, not debug reruns of the earlier 29-workout RTT/H1 source-fix suite. Overall system verdict remains **PARTIAL / RED**.

## Exact trust boundary

- Current private original M6 `qtwbbqff` SHA-256: `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`. No source string committed.
- Original frozen fitness: `9f2deb6c345643d7c0c793c52d358e496c2710d2`; original **unmodified** Liftosaur: `ce75750bde4a190682fb5a6fa1984fc9184a9842`; openGym base `8529b2d41b28fea8ae96a50325aaf28e864a0160`.
- In-memory source-only transformation: `centralizeRttUpdate` (single shared Adaptive update with RTT INTRO occurrence metadata), followed by `addStaleH1WriteBarrier` (current H1 tag only). NO native runtime merge overlay, real account write, modified source file or deployment.
- Equipment mapping is derived from the **original frozen settings**, by `settings.exerciseData[exerciseType.id].equipment.default` to `settings.gyms[0].equipment[equipmentId]`, using real fixed allowed weights, not a generic 2.5kg guess.
- Every workout calls the real `Playground_run` / `complete_set` / `finish_workout`, then reloads native `updatedProgramText` through original `PlannerProgram_evaluateText` and `Program_evaluate`. Differential adapters are production openGym `evaluateAtp2`, `h1FromExposure` and `observeAnchor`, not a Liftosaur simulator.

## Selected actual executions

| Case | Native workouts | Validated |
|---|---:|---|
| NORMAL baseline A/B/C | 3 | 36 executable original occurrences; six first-set H1 observations; serial native continuation |
| NORMAL Turbo A/B/C | 3 | Unequal repetitions between completed sets, nine genuine next-set load changes, original equipment-ladder ATP2 candidate/probe, six first-set H1 observations |
| RTT INTRO A/B/C | 3 | All 36 occurrences; candidate/probe/guard freeze, shared readback |
| Queued→active→terminal closer deload A/B/C | 3 | All 36 occurrences; candidate/probe/guard preservation; true final closer; six H1 tags held through A/B then zeroed on C |

**12 native workouts, 155 accepted `complete_set` commands**, of which **143 weight-bearing kg sets could be independently decoded from the native workout transcript**. The other **12 native rows are non-kg or unparsed, and are explicitly NOT claimed as weight-bearing parity evidence**. There are **12 comparable original H1 first-set observations** and **nine actual second-set Turbo weight changes**.

**702 checks, 0 failures.** This total mixes direct native↔openGym H1 and ATP2 field comparisons with native-only state invariants for shared progression, deload and reset. These assertion types are recorded separately by scope; they are not 702 independent end-to-end user sessions.

**Shared identity proof:** six actual duplicated `e.key` progression identities across 13 original executable occurrences (including one A/B/C three-occurrence group). After *every* one of the 12 native serialized finishes, the runner reads all occurrences and compares candidate, floor and probe fields across each group: **252 explicit original-native shared-state assertions / 0 RED**. Grouping is based on actual native progress key, NOT guessed from exercise names.

## Original source / state evidence

[Per-workout sanitized trace](m6-atp2-h1-multiset-sanitized.json) retains source-before and source-after SHA-256, exact artificial test repetitions, normalized native set-load ratios, native-vs-openGym relative ATP2 candidate values and probe flags, both canonical six-field H1 state snapshots, native controller status, every shared key readback and any mismatch. The ratios are relative to each anonymous exercise's first observed candidate. **No absolute personal weights, original private Liftoscript, gym credentials, real user workouts or live history are published.** Exact private comparisons stay chmod-600 in `evidence/`.

## Pre-correction negative test (retained)

The initial harness imposed a universal 2.5kg equipment step. That produced **one false candidate mismatch** in an exercise shared across days B/C. The original frozen exercise settings actually point that exercise to a **1.25kg fixed-value equipment ladder**. Re-running unchanged openGym ATP2 math with the *original* equipment map gave the above **12/702/0**. This is a **harness equipment-contract issue**, not reason to alter Liftosaur/openGym algorithms.

The separate [sanitized pre-correction trace](m6-atp2-h1-multiset-assumed-2p5-precorrection.json) preserves the failed original-assumption check. This is NOT called a production RED, and it is not silently erased.

## Reproduction

```sh
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/integration-checkout-20261110"
FITNESS_ROOT="$BASE/fitness" \
LIFTOSAUR_RUNTIME_ROOT="$BASE/liftosaur" \
PRIVATE_LIVE_ROOT="$BASE/private-live" \
H2_PARITY_OUT="$BASE/evidence" \
node scripts/hybrid2-runtime-parity/run-m6-atp2-h1-multiset-native.mjs
# 12 native workouts; 702 comparisons/assertions; 0 RED
```

## Remaining gaps

- Original fitness vs openGym **21/22 H1 observation comparability RED** remains. This test used only in-envelope 7/10/16 reps.
- Those 12 non-kg/unparsed native rows, Timed Load complete flow and independent paired-left/right performance are not proven by this run.
- The **prior** 29-workout source-only suite proved three cycles of post-deload H1 relearning. This *new* 12-workout test does NOT independently prove the full post-deload ATP2+H1 persistence/replay chain.
- No live gym settings, real openGym database restart, true user-account Liftosaur save, fitness generator modification, merging, APK or deployment. The user's unchanged original M6 still contains its pre-existing RTT override defect.

Hashes of published audit artifacts: runner SHA-256 `85dc27c449ffcfbbe83ccd27ac4d5f67f66920ced5c886f59d94089e8e9eead9`; sanitized trace `328f2a585cad5ed86b5910b3afdebc37aef4c2282672b262a44a8b6e33926df6`; pre-correction sanitized trace `2a48fc43189f47edc19261028d54f4975e4921142717f4d0d6d3d52bd7f877bc`.

Validation-only static/regression check: `node --check` PASS, both published JSON files parsed successfully, `git diff --check` PASS. Targeted unchanged production openGym API tests: `node --test api/training-control/atp2.test.mjs api/training-control/hybrid2-h1.test.mjs api/training-control/hybrid2-history.test.mjs` — **25 PASS, 0 FAIL**, separately counted as unit tests, NOT new native sessions.
