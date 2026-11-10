# HYBRID-2 / real Liftosaur runtime parity validation

**Status: RED / PARTIAL, NOT FULL PARITY.** This is an isolated experiment against the genuine source-pinned Liftosaur runtime, not a Javascript Liftosaur reimplementation. It must fail nonzero while the recorded >20-rep discrepancy remains. Do not treat successful openGym unit tests as runtime parity.

## Immutable provenance

- openGym parent: `8529b2d41b28fea8ae96a50325aaf28e864a0160`.
- fitness source: `9f2deb6c345643d7c0c793c52d358e496c2710d2`.
- actual Liftosaur runtime source: `ce75750bde4a190682fb5a6fa1984fc9184a9842`.
- archived runtime (external, **never commit**): `liftosaur-playground-runtime.tar.gz`, SHA-256 `bccd5330a234a0133c8c3d36aca69fac08e9a861f41389076ec3fcfe52633c07`.
- Current accepted H1 policy: `H1-EPL-1` and `H1-ASYM-M3-1`, NOT old native `calculate1RM`/non-decreasing reference.
- Actual frozen source inputs: `programs/hybrid2_h1_liftosaur_codegen.py`, `programs/hybrid2_promotion_materializer.py` and `programs/hybrid2_controller_state.py`. SHA-256 are recorded in `generated-h1-manifest.json` and the differential report.
- Original T03 and T04 split runner sources have reconstructed SHA-256 `feba226603ed2939388d0d2eb6933b26ea1b7433eed9e9ee6d61d1862ee1fdc4` and `7d34484fd40a75b2306afd56b9eb3dcc682133def8f42b3bf0dbf8512880a169` respectively. SHA verification is NOT proof those runner suites executed.

## Reproduction

Supply the **genuine** native Liftosaur runtime with `runtime_api.cjs` implementing `Playground_run`, `PlannerProgram_evaluateText`, and `Program_evaluate`. The runtime must be built from / packaged with the exact pinned commit and contain README pin. The supplied external archive may be used directly. Do not build a mock in its place.

Obtain read-only `elmakus/fitness` checkout at the **exact** frozen commit (private, external dependency). Do **not** copy fitness sources, personal programs, runtime tarballs, npm_modules, live history, snapshots, or credentials into openGym.

```sh
export FITNESS_ROOT=/path/to/fitness-at-9f2deb6
export LIFTOSAUR_RUNTIME_ROOT=/path/to/pinned-liftosaur-runtime
export H2_PARITY_OUT=/tmp/hybrid2-parity-evidence
node scripts/hybrid2-runtime-parity/run-current-h1.mjs
# expected as of this validation: 53 genuine Playground_run workouts;
# 630 per-field comparisons, 50 matching steps, 3 RED steps;
# nonzero exit is intentional and evidence must not be hidden.
```

`generate-current-h1.py` imports original Python codegen and the actual accepted promotion observation setup, writes a deterministic fixture; it does not rewrite the H1 algorithm. `run-current-h1.mjs` calls the real runtime for each workout, completes each set as specified, invokes `finish_workout()`, **continues each next workout from `updatedProgramText`**, uses the original `PlannerProgram_evaluateText`/`Program_evaluate`, normalizes Liftosaur `kg`/`lb` values into kg and compares against openGym's actual `observeAnchor`. Candidate at 12 reps and extra `audit*` fields are **test-harness instrumentation**, not claims about production Adaptive/ATP2 or authentic fitness plan programs.

Run the original unmodified write-through matrix only with the original source checkout, not through a copied implementation:

```sh
python3 "$FITNESS_ROOT/tests/hybrid2/h2m02_t02_runtime_matrix.py" \
  --runtime-root "$LIFTOSAUR_RUNTIME_ROOT"
```

The original T03/T04 split runners must only be executed with their unchanged SHA-verified parts and **their exact declared external archive / snapshots**. Historic H2M03 runners exercise an older H1 reference policy; do not imply current H1 acceptance if they pass.

## Current genuine-runtime results

- Genuine pinned runtime native smoke: `success:true`; `complete_set`, `finish_workout`, serialized continuation confirmed.
- Unmodified H2M02 runtime matrix: PASS (historical controller codegen, 3/4-position synthetic layouts, shared progression state, 12 save boundaries, queue/deload lifecycle).
- Reproduced original `h2m02_t02_naive_stale_overwrite.liftoscript`:
  shared-normal `seen1=0`, shared-skip-earlier `seen1=1`, distinct-identity `seen1=1`. The zero case reproduces native stale snapshot overwrite by design. This is **not** an openGym divergence.
- Current accepted H1 codegen differential: **8 scenarios, 53 Liftosaur workouts, 630 field comparisons, 50 matching steps, 3 failing steps**.
- First genuine difference: `H1_UNSUPPORTED_GT20` workout 4. Original `_observation_setup` passes 21 performed reps as comparable and continues updating H1; openGym production observation adapter rejects >20 and treats `INDETERMINATE`. At workout 6 the original vote is `weak=true` while the openGym vote is `weak=false`, with different reference windows.
- Classification: **source promotion observation adapter vs openGym production observation adapter / comparability contract**. Do not silently relax the openGym 20-rep boundary or rewrite original fixture. An explicit decision is needed on whether original source generation should enforce that bound. The original accepted performance policy says the loaded-reps initial envelope is approximately 5..20.
- There was one false positive in initial harness results: after a wholly skipped workout, the original Liftosaur progress body is not executed, so `auditRefBefore` is stale. The harness initially treated stale instrumentation as a fresh observable field. The preliminary RED trace has been preserved; correcting the **harness-only** nonobservable audit comparison removes this false positive. It does NOT fix or hide the three real discrepancies. No original or openGym controller code was changed.

## External data and limitations

Actual archived runtime binary is intentionally excluded from Git. Original private fitness code and fixtures remain external. Reproducing H2M03 T03/T04 also requires the exact frozen native archive and in T04 external materialized snapshots. SHA reconstruction alone is not execution. Python oracle parity is not native runtime parity.

**Not demonstrated**: full HYBRID-2 whole-controller differential parity in K5, M6, SYN4, all cyclic triggers, exact-once reset under varied shared ATP2/Turbo identities, full source current promoted real plans, end-to-end `buildSessionExposures → entriesForExposures → completed sets → buildCompletedSession → persisted history → replay → next session` against the exact same original Liftosaur scenarios, nor dual-device sync against Liftosaur (no such counterpart). No physical Android, RTT, live account writes, database modification, APK, deployment, or merge.

For independent audit, see full first-step trace and immutable original RED data in `docs/validation/hybrid2-runtime-parity/`, and check `generator`, `run-current-h1.mjs`, original source SHA, current observation comparability, and realistic weight/repetition/unit serialization. Do not treat openGym-only tests as differential evidence.


## Further native differential runners (validation checkpoint 2)

Use the exact pinned `FITNESS_ROOT`, `LIFTOSAUR_RUNTIME_ROOT` and a clean pinned `openGym` checkout. No mock or production data is involved.

```sh
export FITNESS_ROOT=/tmp/hybrid2-runtime-parity-20261109/fitness
export LIFTOSAUR_RUNTIME_ROOT=/tmp/hybrid2-runtime-parity-20261109/liftosaur
export H2_PARITY_OUT=/tmp/hybrid2-runtime-parity-20261109/evidence
node scripts/hybrid2-runtime-parity/run-h1-extended.mjs
# expected: 7 suites, 124 true native runs, 1470 comparisons, 6 RED steps; exit 1
python3 scripts/hybrid2-runtime-parity/run-combined-h1-trigger.py \
  --fitness-root "$FITNESS_ROOT" \
  --runtime-root "$LIFTOSAUR_RUNTIME_ROOT" \
  --opengym-root . \
  --out "$H2_PARITY_OUT/combined-h1-trigger.json"
# expected: K5/M6/SYN4 x fast/slow, 108 native workouts, 891 comparisons, 0 issues
```

The extended H1 output is a full JSON report locally; [published compact raw trace](../../docs/validation/hybrid2-runtime-parity/h1-extended-raw-compact.json) keeps each workout's input, native post-state, openGym post-state, issue list, and sequential program-text hashes. Combined H1/trigger similarly has [raw trace](../../docs/validation/hybrid2-runtime-parity/combined-h1-trigger-compact.json) from actual native execution. Original generator SHA metadata is in both the H1 data and existing manifest. Do not confuse synthetic combined controller source with full promoted production plans: the combined runner stops when deload queues.

The already published `run-topology-triggers.py` checks controlled synthetic weak/valid/ready votes (21 scenarios, 132 native workouts, 792 fields); it is separate from `run-combined-h1-trigger.py`, which obtains weak votes from original H1 codegen.

**T03/T04**: reconstructed originals depend on exact SHA-verified native archive and T04 source snapshot at hard-coded paths on the execution machine. Presence of those on another filesystem does not count. Historic T03 H1 is the rejected `calculate1RM`/ratchet policy and not valid proof of H1-EPL-1.


## Nine-cycle native H1 / deload / reset / relearn integration probe

```sh
python3 scripts/hybrid2-runtime-parity/run-combined-lifecycle.py \
  --fitness-root "$FITNESS_ROOT" --runtime-root "$LIFTOSAUR_RUNTIME_ROOT" \
  --opengym-root . --out "$H2_PARITY_OUT/combined-lifecycle-native-set-check.json"
# native pinned Liftosaur; expected 108 finished workouts, 1134 comparisons,
# 4 failures exclusively at last deload day second-set-access probes.
```

Uses original frozen fitness H1, generic controller and private H1 reset generator combined in a **synthetic harness**. Deload start/update gate is test-owned, not an exact production materialization. Directly probes `Playground_run(change_reps(exercise,2,6))` during reduced sets; do NOT replace with `Program_evaluate` static `evaluatedSetVariations` (the latter produced a **false positive** across all 15 signals).

Detailed [audit and raw evidence](../../docs/validation/hybrid2-runtime-parity/LIFECYCLE_INTEGRATION_PROBE.md); [authoritative in-scope runner trace](../../docs/validation/hybrid2-runtime-parity/combined-lifecycle-native-set-check.json). Retained [pre-correction trace](../../docs/validation/hybrid2-runtime-parity/combined-lifecycle-static-shape-precorrection.json) and [non-authoritative cross-tag probe](../../docs/validation/hybrid2-runtime-parity/combined-lifecycle-native-tag-read-diagnostic.json). **NOT A PASS for production full-plan deload**.


## Original (unaltered) fitness H2PERF native regressions

Restoring frozen original private `fitness@9f2deb6...` source into a scratch workspace is necessary; do not commit source/fixtures to openGym. Original `tests/runtime/h2perf_t03_runtime.cjs` and `tests/runtime/h2perf_t04_real_adapters.cjs` accept `<runtime-dir> <fitness-repo-root>` and run genuine pinned Liftosaur `ce75750...`. The H2PERF-T03 additionally requires original `tests/hybrid2/h2perf_t03_differential.py`, frozen Python programs+oracle. H2PERF-T04 requires original real K5/M6 source files plus `tests/fixtures/marta-playground-baseline/settings` fixture. Results: [T03 JSON](../../docs/validation/hybrid2-runtime-parity/h2perf-t03-original-native.json) (PASS, 49 continuation boundaries), [T04 JSON](../../docs/validation/hybrid2-runtime-parity/h2perf-t04-original-native.json) (PASS, real adapter K5/M6 fixture native parser/serializer). They are distinct from historical *H2M03*-T03/T04 runners still blocked on external snapshots.


## ATP2 Turbo genuine native differential

```sh
FITNESS_ROOT=/tmp/hybrid2-runtime-parity-20261109/fitness \
LIFTOSAUR_RUNTIME_ROOT=/tmp/hybrid2-runtime-parity-20261109/liftosaur \
H2_PARITY_OUT=/tmp/hybrid2-runtime-parity-20261109/evidence \
node scripts/hybrid2-runtime-parity/run-atp2-real-native.mjs
# Expected: 18 genuine native finish_workout/reload, 75 openGym field comparisons, 0 issues.
```

Source from **original frozen private fitness Git blob** (not copied into openGym), runtime pin enforced, stock settings with kg and 2.5kg ladder. This is **ATP2-only**, not complete H1+ATP2 original integration and **not** database exposure-history parity. See [methodology](../../docs/validation/hybrid2-runtime-parity/ATP2_NATIVE_DIFF.md) and [per-workout raw evidence](../../docs/validation/hybrid2-runtime-parity/atp2-real-native-diff.json).


## Combined ATP2+H1 native composite

```sh
FITNESS_ROOT=/tmp/hybrid2-runtime-parity-20261109/fitness \
LIFTOSAUR_RUNTIME_ROOT=/tmp/hybrid2-runtime-parity-20261109/liftosaur \
H2_PARITY_OUT=/tmp/hybrid2-runtime-parity-20261109/evidence \
node scripts/hybrid2-runtime-parity/run-atp2-h1-composite.mjs
# expected: 33 native workouts, 429 fields, 8 RED steps. The 21/22 upper-envelope seam is intentionally unresolved.
```

[Source-verified manifest](../../docs/validation/hybrid2-runtime-parity/atp2-h1-composite-manifest.json), [full per-workout native/expected state trace](../../docs/validation/hybrid2-runtime-parity/atp2-h1-composite-native-compact.json), [interpretation](../../docs/validation/hybrid2-runtime-parity/ATP2_H1_COMPOSITE_NATIVE_DIFF.md). Generated code is a nonproduction composite of original frozen ATP2 and original fitness H1; no product source or live program is edited.


## Native current user-program read-only M6/K5 + RTT causal isolated checks

The four current-source native runners require **fresh read-only** current Liftosaur `get_program` content copied to a chmod-600 scratch directory, original `fitness@9f2deb6...`, exact original `liftosaur@ce75750...`, and local *frozen* reference equipment settings (NOT live gym equipment). Never commit user Liftoscript source or native private weight/history files.

```sh
export FITNESS_ROOT=/tmp/hybrid2-runtime-parity-20261109/fitness
export LIFTOSAUR_RUNTIME_ROOT=/tmp/hybrid2-runtime-parity-20261109/liftosaur
export PRIVATE_LIVE_ROOT=/tmp/hybrid2-runtime-parity-20261109/private-live
export H2_PARITY_OUT=/tmp/hybrid2-runtime-parity-20261109/evidence

python3 scripts/hybrid2-runtime-parity/run-shared-h1-propagation.py \
  --fitness-root "$FITNESS_ROOT" --runtime-root "$LIFTOSAUR_RUNTIME_ROOT" \
  --opengym-root . --out "$H2_PARITY_OUT/shared-h1-native.json"
# 72 genuine workouts, 2025 checks, 0 issues

node scripts/hybrid2-runtime-parity/run-current-marta-native.mjs
# 12 native current M6 normal workouts / 156 fields / 0 differences, queued at cycle 4

node scripts/hybrid2-runtime-parity/run-current-marta-lifecycle-native.mjs
# expected RED after queue: current M6 RTT local update prevents native deload start;
# 27 original workouts / 488 checks / 97 downstream red entries, don't promote as full parity

node scripts/hybrid2-runtime-parity/run-current-marta-rtt-causal.mjs
# private scratch-only causal variants, 6 native finish_workout, 10 probes, 122 checks, 0 unexpected issues

node scripts/hybrid2-runtime-parity/run-current-krzysztof-native.mjs
# 20 full current K5 native workouts, 132 checks, 4 noncomparable paired-left probe steps
```

The actual current K5 runner uses a **synthetic custom label registry** from the original H2PERF-T04 fixture. The original pinned Playground does not implement `change_reps_left`, so `paired:1` `Single-Leg Leg Press` cannot be validated as a bilateral result; explicitly treat those 4 steps as INDETERMINATE rather than product RED. All private source and numeric loads remain off GitHub. Only [sanitized source hashes](../../docs/validation/hybrid2-runtime-parity/current-live-source-metadata.json), [read-only live M6/K5 results](../../docs/validation/hybrid2-runtime-parity/CURRENT_LIVE_K5_M6_NATIVE.md), [genuine M6 RTT cause](../../docs/validation/hybrid2-runtime-parity/M6_RTT_UPDATE_SHADOW_CAUSAL.md), and [shared native proof](../../docs/validation/hybrid2-runtime-parity/SHARED_H1_NATIVE_DIFF.md) are committed.

**DO NOT** delete 29 RTT overrides from a real account/program as a fix: that was intentionally a destructive-of-RTT-in-intro control performed only on a temporary private test string. Product change would need a separate reviewed authorization.


## RTT update fusion / stale shared-tag native diagnostic (2026-11-10)

Use the original read-only current M6 source and queued serialized snapshot in the private scratch directory. This experiment deliberately returns nonzero due to an **induced shared stale-reset RED**, after successfully testing NORMAL, INTRO, full 36-occurrence deload set budgets and three native H1 relearning cycles.

```sh
export FITNESS_ROOT=/tmp/hybrid2-runtime-parity-20261109/fitness
export LIFTOSAUR_RUNTIME_ROOT=/tmp/hybrid2-runtime-parity-20261109/liftosaur
export PRIVATE_LIVE_ROOT=/tmp/hybrid2-runtime-parity-20261109/private-live
export H2_PARITY_OUT=/tmp/hybrid2-runtime-parity-20261109/evidence
node scripts/hybrid2-runtime-parity/run-current-marta-rtt-fused.mjs
# Expected: 29 native finished workouts, 48 set probes, 688 assertions,
# 20 RED fields under synthetic RTT mode-switch stale rollover. Do not mask.
```

[Native findings](../../docs/validation/hybrid2-runtime-parity/M6_RTT_NONDESTRUCTIVE_UPDATE_FUSION_NATIVE.md) and [sanitized trace](../../docs/validation/hybrid2-runtime-parity/rtt-fused-native-sanitized.json) retain source SHA proofs and comparison details, excluding any private training loads or Liftoscript source. The source composition happens only in isolated memory and is not a production patch.


## K5 native bilateral left/right history record (2026-11-10)

```sh
export FITNESS_ROOT=/tmp/hybrid2-runtime-parity-20261109/fitness
export LIFTOSAUR_RUNTIME_ROOT=/tmp/hybrid2-runtime-parity-20261109/liftosaur
export PRIVATE_LIVE_ROOT=/tmp/hybrid2-runtime-parity-20261109/private-live
export H2_PARITY_OUT=/tmp/hybrid2-runtime-parity-20261109/evidence
node scripts/hybrid2-runtime-parity/run-current-krzysztof-paired-native.mjs
# PASS: 20 actual pinned original-native finish workouts, 152 completed first sets,
# 4 bilateral original history records, 488 semantic assertions, 0 discrepancies.
```

The original Playground command parser lacks `change_reps_left`; this runner uses the real original `Progress_completeSetAction` and `Program_runAllFinishDayScripts` with independently controlled native `completedRepsLeft` and `completedReps` fields. [Analysis and limits](../../docs/validation/hybrid2-runtime-parity/K5_PAIRED_NATIVE_HISTORY_DIFF.md) and [scrubbed trace](../../docs/validation/hybrid2-runtime-parity/current-k5-native-paired-sanitized.json). Source, actual weights, live records and account state stay private.


## K5 true-native input through openGym UI/persisted-history replay (2026-11-10)

After genuinely running `run-current-krzysztof-paired-native.mjs` with pinned Liftosaur sources, the scrubbed transcript can drive real openGym's end-to-end frontend pipeline:

```sh
export H2_PARITY_OUT=/tmp/hybrid2-runtime-parity-20261109/evidence
node scripts/hybrid2-runtime-parity/run-native-k5-history-pipeline.mjs
# PASS: 20 new *openGym* saved sessions, 4 independent bilateral records,
# 199 frontend/replay comparisons, ZERO new native Liftosaur executions.
```

[Report](../../docs/validation/hybrid2-runtime-parity/K5_NATIVE_INPUT_PERSISTENCE_PIPELINE.md) and [scrubbed frontend/replay data](../../docs/validation/hybrid2-runtime-parity/native-k5-open-gym-persisted-pipeline-sanitized.json). Synthetic fixture loads and adapter ensure this tests the data transport and H1 count, **not** numerical weight/parity, original live equipment or server DB write.

## 2026-11-10 source-only M6 RTT + H1 stale rollover validation

Read [M6 native source-fix report](../../docs/validation/hybrid2-runtime-parity/M6_RTT_CENTRALIZED_H1_STALE_SOURCE_FIX_NATIVE.md) and [native merge root cause](../../docs/validation/hybrid2-runtime-parity/M6_STALE_NATIVE_MERGE_CAUSAL.md) before using these **test-only** runners. All private M6 data remains under `PRIVATE_LIVE_ROOT`; do not commit, print or upload real programs, loads, history or equipment data.

```sh
cd /tmp/hybrid2-runtime-parity-20261109/validation-checkout
export FITNESS_ROOT=/tmp/hybrid2-runtime-parity-20261109/fitness
export LIFTOSAUR_RUNTIME_ROOT=/tmp/hybrid2-runtime-parity-20261109/liftosaur
export PRIVATE_LIVE_ROOT=/tmp/hybrid2-runtime-parity-20261109/private-live
export H2_PARITY_OUT=/tmp/hybrid2-runtime-parity-20261109/evidence
node scripts/hybrid2-runtime-parity/run-current-marta-rtt-source-fixed.mjs
# Unmodified original native runtime: 29 finish_workout; 48 probes; 688 checks; 0 RED
node scripts/hybrid2-runtime-parity/run-m6-stale-native-merge-probe.mjs source-barrier
# 5 native workouts; 180 checks; 0 RED
node scripts/hybrid2-runtime-parity/run-m6-stale-native-merge-probe.mjs source-barrier-entry-reversed
# 5 native workouts; 180 checks; 0 RED; only finish-day entry-loop ordering is test-modified
node scripts/hybrid2-runtime-parity/run-m6-stale-native-merge-probe.mjs reference
# EXPECTED RED: 5 native workouts; 178 checks; 10 RED
node scripts/hybrid2-runtime-parity/run-m6-stale-native-merge-probe.mjs reference-entry-reversed
# EXPECTED RED: 5 native workouts; 178 checks; 10 RED
```

The source-only fix centralizes the template Adaptive update (no 29 body copies) and reasserts the **current H1 tag only** on stale rollover. Do not confuse this with `native-finishday-merge-overlay.mjs`, a separate isolated one-line runtime causal control. Do not deploy either variant without further fitness-source review and missing end-to-end regressions.

## Actual full-source M6 ATP2 Turbo + HYBRID-2 H1 integration (2026-11-10)

The new `run-m6-atp2-h1-multiset-native.mjs` uses the **real complete current M6**, with the previously validated source-only RTT/H1 repairs applied in memory, and original pinned unmodified Liftosaur. It runs **12 new actual native workouts, 702 comparisons/assertions, 0 RED**. These cover real unequal multiset reps and nine native Turbo load changes, all six H1 signals, candidate/probe/candidateGuard, 6 genuinely shared progress keys, RTT INTRO, queued→active deload and a genuine terminal closer. A prior assumed 2.5kg-ladder false mismatch is archived separately and the runner now obtains equipment ladders from original frozen fixture settings.

```sh
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/integration-checkout-20261110"
FITNESS_ROOT="$BASE/fitness" LIFTOSAUR_RUNTIME_ROOT="$BASE/liftosaur" \
PRIVATE_LIVE_ROOT="$BASE/private-live" H2_PARITY_OUT="$BASE/evidence" \
node scripts/hybrid2-runtime-parity/run-m6-atp2-h1-multiset-native.mjs
# 12 actual original-native finish_workout; 155 accepted set commands;
# 702 comparisons / assertions; zero differences.
```

See [full native scope and caveats](../../docs/validation/hybrid2-runtime-parity/M6_ATP2_H1_INTEGRATED_NATIVE_DIFF.md) and [sanitized original vs openGym state/ratio trace](../../docs/validation/hybrid2-runtime-parity/m6-atp2-h1-multiset-sanitized.json). **12 of the 155 completed sets lack directly comparable kg workout-row parsing and are NOT claimed as ATP2 set records.** Original 21/22 H1 boundary RED, production M6 bug and isolated real-backend persistence remain open; passing this runner must not be called production parity.
