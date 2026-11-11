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

## Real backend persisted-history/restart from K5 native source (2026-11-10)

`run-native-k5-real-http-backend.mjs` extends the original-native sourced K5 session pipeline to a **real** child `api/server.js` with isolated disk `DATA_DIR`, test auth, 20 HTTP PUTs, 23 HTTP GETs, 2 actual backend process restarts and 239 checks (**0 RED**). The existing `run-native-k5-history-pipeline.mjs` optionally writes 20 full canonical v2 profile snapshots **only** when `H2_PRIVATE_PROFILE_SNAPSHOTS` is explicitly set to private scratch; its prior 199 PASS are not new native workouts.

```sh
B=/tmp/hybrid2-runtime-parity-20261109
cd "$B/integration-checkout-20261110"
H2_PARITY_OUT="$B/evidence" H2_PRIVATE_PROFILE_SNAPSHOTS="$B/evidence/k5-isolated-backend-input" \
node scripts/hybrid2-runtime-parity/run-native-k5-history-pipeline.mjs
H2_PARITY_OUT="$B/evidence" H2_PRIVATE_PROFILE_SNAPSHOTS="$B/evidence/k5-isolated-backend-input" \
node scripts/hybrid2-runtime-parity/run-native-k5-real-http-backend.mjs
```

[Evidence / boundaries](../../docs/validation/hybrid2-runtime-parity/K5_NATIVE_REAL_HTTP_BACKEND_RESTART.md). Native K5 reps/paired sets are real original-runtime output; their materialized openGym weights are synthetic. The real backend does not touch production state, and this test does **not** establish exact current M6 native-load persistence parity. Targeted 24 backend API unit/integration tests also PASS (separate count).

## Post-deload real M6 H1 relearning + six-field ATP2 native differential

`run-m6-post-deload-native.mjs` uses the real complete original source-only RTT/H1-fixed current M6 and original native Liftosaur to build actual queued→active→terminal-closer deload state (**3 setup native finishes, NOT new selected workouts**) followed by **9 NEW selected full NORMAL native workouts** across 3 A/B/C cycles. Checks six anchors' H1 `perfCount 1 → 2 → 3`, first-set actual reps, candidateGuard and all six H1 state fields; six-field ATP2 candidate/probe/floor/lowCount/counterActive/counterWeight with original equipment ladders; shared native `e.key` readbacks; and real Turbo multiset changes. **990 selected native comparisons, zero RED**, plus 38 setup checks that are kept separate.

```sh
B=/tmp/hybrid2-runtime-parity-20261109
cd "$B/integration-checkout-20261110"
FITNESS_ROOT="$B/fitness" LIFTOSAUR_RUNTIME_ROOT="$B/liftosaur" \
PRIVATE_LIVE_ROOT="$B/private-live" H2_PARITY_OUT="$B/evidence" \
node scripts/hybrid2-runtime-parity/run-m6-post-deload-native.mjs
```

See [post-deload report](../../docs/validation/hybrid2-runtime-parity/M6_POST_DELOAD_ATP2_H1_RELEARNING_NATIVE.md) and [safe native state trace](../../docs/validation/hybrid2-runtime-parity/m6-post-deload-native-sanitized.json). All 99 absolute source-derived set/ATP2/H1 expected/actual records stay **private mode 0600**; published records contain only anonymized relative values. Original 21/22 H1 policy RED and current M6 full persisted-backend chain remain open.


## Current-M6 **actual native kg** records through real API HTTP persistence (2026-11-10)

This is a **new** backend integration test using the genuine post-deload M6 native transcript's **original completed-set weights/reps**, unlike the earlier K5 backend's synthetic fixture loads. It maps only the six native M6 H1 anchors to an isolated openGym M6 fixture with a synthetic closer; it does **not** claim full original 36-occurrence source materialization or absolute native ↔ openGym H1 replay parity. The original native source, loads, and generated test profiles remain private (the full source evidence is required, and SHA checked).

```sh
BASE=/tmp/hybrid2-runtime-parity-20261109
OUT="$BASE/evidence-m6-kg-backend"
mkdir -p "$OUT/profiles"
cd "$BASE/m6-backend-checkout-20261110"
H2_PARITY_OUT="$OUT" \
 H2_NATIVE_M6_PRIVATE="$BASE/evidence/m6-post-deload-native-private.json" \
 H2_PRIVATE_PROFILE_SNAPSHOTS="$OUT/profiles" \
 node scripts/hybrid2-runtime-parity/run-m6-native-kg-frontend.mjs
H2_PARITY_OUT="$OUT" \
 H2_NATIVE_M6_PRIVATE="$BASE/evidence/m6-post-deload-native-private.json" \
 H2_PRIVATE_PROFILE_SNAPSHOTS="$OUT/profiles" \
 node scripts/hybrid2-runtime-parity/run-native-m6-real-http-backend.mjs
```

Expected PASS: **9 openGym UI-finished sessions / 38 source-native kg sets / 157 assertions**; real backend **9 writes / 13 reads / 3 process restarts / 232 checks / 0 RED**, with 18 native first-set comparable inputs, native source weight and repetitions identical after HTTP roundtrip, real file-backed state persistence, and stale rev 409. No new native workout is executed or double-counted. [Detailed scope and limitations](../../docs/validation/hybrid2-runtime-parity/M6_NATIVE_KG_HTTP_BACKEND_RESTART.md).


## Original source-M6 full 36-occurrence shared identity negative control and one-line source-only overlay (2026-11-10)

**Do not call the original source PASS:** the unchanged real openGym `buildSessionExposures` uses occurrence identity as `trackId`, conflicting with original native Liftosaur's shared progression `e.key`. Across nine native-input A/B/C workouts, the original produces **108 mismatched occurrence identity records** in six shared progression groups (13 occurrences), and original HYBRID-2 replay rejects the identity. The following runner always retains that RED and intentionally exits nonzero, but demonstrates an isolated **one-line** source-only frontend materialization variant, before prescriptions/Engine v2 state are generated. It temporarily creates and removes a sibling private ESM module, without changing the actual library or main.

```sh
BASE=/tmp/hybrid2-runtime-parity-20261109
OUT="$BASE/evidence-m6-full-36"
mkdir -p "$OUT/profiles"
cd "$BASE/m6-full-structural-20261110"
H2_PARITY_OUT="$OUT" PRIVATE_M6_ORIGINAL_PATH="$BASE/private-live/qtwbbqff.liftoscript" \
 H2_NATIVE_M6_PRIVATE="$BASE/evidence/m6-post-deload-native-private.json" \
 FITNESS_ROOT="$BASE/fitness" LIFTOSAUR_RUNTIME_ROOT="$BASE/liftosaur" \
 H2_PRIVATE_PROFILE_SNAPSHOTS="$OUT/profiles" \
 node scripts/hybrid2-runtime-parity/run-full-m6-native-source-overlay.mjs
# Expected exit 1: unmodified current openGym 108 source identity RED remain.
# Isolated variant 9 frontend sessions, all 36 native slots, 119 native kg sets, 854/854 checks PASS.

H2_PARITY_OUT="$OUT" H2_NATIVE_M6_PRIVATE="$BASE/evidence/m6-post-deload-native-private.json" \
 H2_PRIVATE_PROFILE_SNAPSHOTS="$OUT/profiles" \
 node scripts/hybrid2-runtime-parity/run-full-m6-native-http-backend.mjs
# 9 HTTP writes, 13 reads, 3 process restarts, 475/475 checks PASS only WITH SOURCE OVERLAY.
```

[Root cause, fixture scope, native source/actual-expected trace and limitations](../../docs/validation/hybrid2-runtime-parity/M6_NATIVE_SHARED_IDENTITY_SOURCE_OVERLAY_HTTP.md). These are real openGym frontend/replay and real API backend tests with prior original-native inputs, NOT new original Liftosaur workouts. The only input originals are private source/test copies, never included in Git. No original weights or true account data committed; no production branch touched.


## Shared identity: ordinary plans / historical edit / legacy persisted replay (2026-11-10)

Real frontend source-only follow-up on nine existing original-native-derived M6 profiles (no additional original native workout). Checks ordinary-plan parity with/without HYBRID config, 9 saved 36-slot prefixes, Engine v2 hashes and state pointers, next A, a non-H1 prior edit, and a new genuine unchanged-source materializer legacy workout fail-closed. **3,410 checks PASS, 3 expected RED negatives, 9 new frontend generation calls, 68 unchanged API tests PASS, 0 new backend writes, 0 new Liftosaur workouts.** No production code modified.

~~~sh
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/shared-identity-followup-20261110"
H2_PARITY_ROOT="$BASE" H2_PARITY_OUT="$BASE/evidence-m6-full-36/legacy-edit-followup-20261110" \
 node scripts/hybrid2-runtime-parity/run-m6-shared-identity-legacy-edit-regression.mjs
~~~

[Report and original-source RED preserved](../../docs/validation/hybrid2-runtime-parity/M6_SHARED_IDENTITY_LEGACY_EDIT_REGRESSION.md); [sanitized evidence](../../docs/validation/hybrid2-runtime-parity/m6-shared-identity-legacy-edit-regression-sanitized.json). Do not auto-migrate stored histories.


## New genuine original native H1 boundary 19–23 (2026-11-10)

Three original-fitness-generated synthetic H1 sequences on **unchanged pinned original Liftosaur**: 28 NEW actual native workouts, 336 field comparisons; **16 workout steps / 58 fields are RED**, caused by original native acceptance of 21/22 and new 23 reps while unchanged openGym `h1FromExposure` excludes them. Later H1 history remains different. No contract change: original spec roughly 5–20 requires an explicit normative decision. Real original native completed-set command and finish/readback, *but* openGym source input is projected from commands (not extracted native serialized sets); not full original M6. Native cumulative selected ledger becomes 799 / 11,392 mixed assertions, not full parity.

~~~sh
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/shared-identity-followup-20261110"
FITNESS_ROOT="$BASE/fitness" LIFTOSAUR_RUNTIME_ROOT="$BASE/liftosaur" \
 H2_PARITY_OUT="$BASE/evidence-h1-native-boundary-20261110" \
 node scripts/hybrid2-runtime-parity/run-h1-native-19-23-boundary.mjs
# Intentionally exits 1 due genuine 21+ native/openGym RED.
~~~

[Native H1 boundary report](../../docs/validation/hybrid2-runtime-parity/H1_NATIVE_19_23_BOUNDARY_RED.md); [sanitized actual outcome](../../docs/validation/hybrid2-runtime-parity/h1-native-19-23-sanitized.json). No private original fitness source or native load records are committed.


## Original M6: native history record coverage of nine previously unparsed positions (2026-11-10)

The previous nine full-36 source-native text-parser blanks are **not** proven failures of native training; original source position analysis shows two distinct paired/unilateral kg slots and one ordinary kg slot repeated three times, with no verified Timed Load in those three. New **9 real pinned original Liftosaur source-overlay variant workout executions** (A/B/C x 3) used `Program_nextHistoryRecord`, actual original progress set actions, true `LiftohistorySerializer_serialize` and original finish scripts. **123 native sets complete, 24 targeted (18 bilateral, 6 ordinary); 187 assertions PASS/0 unexpected failures.** Side values were independent and preserved by original native serializer. Unchanged openGym `h1FromExposure` read command-derived native records as a limited ingestion check, not full-source H1/ATP2 parity. Older nine incomplete source traces remain UNVERIFIED; no historical results invented. No backend writes, production code, real users, or source M6 files modified.

~~~sh
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/shared-identity-followup-20261110"
H2_PARITY_ROOT="$BASE" H2_PARITY_OUT="$BASE/evidence-m6-native-missing-20261110" \
 FITNESS_ROOT="$BASE/fitness" LIFTOSAUR_RUNTIME_ROOT="$BASE/liftosaur" \
 node scripts/hybrid2-runtime-parity/run-full-m6-native-missing-slots-history.mjs
~~~

[Report and limitations](../../docs/validation/hybrid2-runtime-parity/M6_MISSING_SLOTS_NATIVE_HISTORY.md); [sanitized genuine native records](../../docs/validation/hybrid2-runtime-parity/m6-missing-slots-original-native-sanitized.json). This is 9 NEW native workouts / 187 comparisons; selected native ledger now 808 / 11,579 heterogeneous checks, not complete parity.

## 2026-11-10 superseding H1 source-exact acceptance

**Historical caveat:** earlier sections of this README intentionally preserve their original RED expectations for `openGym@8529b2d...` with a hard 20-rep observation cutoff. Those counts remain valid only for that earlier implementation. The user has now explicitly approved native-source H1 exactness **including 300 repetitions**. After removing the hard 20 cap in the **validation branch**, five real original-native H1 runners now match **268 executed native workouts / 3225 compared fields / 0 discrepancies**; older `run-current-h1.mjs` and `run-h1-extended.mjs` had to drop their own duplicated cap and call the actual observer. The archival `run-h1-native-19-23-relaxed-variant.mjs` and `run-h1-native-24-300-relaxed-variant.mjs` require the *previous cap-present checkout*; on the current branch run their direct native baseline runners instead. See [accepted source-exact 300 decision](../../docs/validation/hybrid2-runtime-parity/H1_SOURCE_EXACT_300_ACCEPTED_20261110.md). **Overall full HYBRID-2/M6 parity remains PARTIAL/RED** for independent RTT/stale-write and full runtime transport gaps. Do not confuse H1 seam parity with complete program parity.

## 2026-11-10 — real fitness M6 read-only preflight → native runtime

[Draft fitness PR #22](https://github.com/elmakus/fitness/pull/22) adds
`programs/hybrid2_m6_rtt_preflight.py` as a **real executable source
preparation step**, not merely a test: it binds accepted `qtwbbqff` target
metadata, exact SHA-256, 36 exercise prescriptions and 30 unchanged progress
records before generating private review-only RTT/H1-corrected source.

`run-fitness-preflight-m6-native.mjs` drives this Python CLI using frozen
private `get_program`-shaped inputs (NOT a fresh live API read), produces
two temporary verified candidate files, and runs both **directly** on
original frozen Liftosaur runtime. It invokes no JavaScript RTT source
patches during native work. Result: **29 native workout finish executions,
48 set probes, 688/688 checks**. Uses explicit `M6_PYTHON_PREFLIGHT`,
`M6_CANDIDATE_TMP`, `FITNESS_ROOT`, `LIFTOSAUR_RUNTIME_ROOT`,
`PRIVATE_LIVE_ROOT`, and an empty `H2_PARITY_OUT`; all candidate files
are removed after execution. [Full proof](../../docs/validation/hybrid2-runtime-parity/M6_FITNESS_READONLY_PREFLIGHT_NATIVE_20261110.md).

This does **not** update any live Liftosaur program or history and does not
turn the unchanged original M6 RTT expected-RED case into a PASS.

## 2026-11-10 — original native Timed Load controller differential

`run-timed-load-original-native.mjs` runs the *unchanged pinned original*
`fitness/programs/timed_load_side_plank_candidate.liftoscript` in the genuine
pinned Liftosaur runtime for 17 serial Side Plank workouts. It compares eight
persistent state fields before and after each workout with the existing
openGym `evaluateTimedLoad`, obtaining **272/272 matches**. Supply the
`LIFTOSAUR_RUNTIME_ROOT`, `TIMED_LOAD_ORIGINAL_SOURCE`, and isolated
`H2_PARITY_OUT` paths. The script fixes only the **test-runtime in-memory**
dumbbell availability to match the original controller's native kg ladder;
stock gym settings would otherwise clamp the requested 0kg to 5kg.

See [scope and limitations](../../docs/validation/hybrid2-runtime-parity/TIMED_LOAD_ORIGINAL_NATIVE_DIFF_20261110.md).
This standalone test does not cover independent bilateral timers, current M6,
real athlete equipment, or production deployment.

## 2026-11-11 — true native independent bilateral Timed Load + real HTTP

`run-timed-load-native-bilateral.mjs` executes original frozen Liftosaur
`Progress_completeSetAction` and `Progress_settleTimedSet` for **two independently
specified left/right timers per logical set**, serially reloading the original
`updatedProgramText`. **24 genuine original native finished workouts, 96 physical
L/R observations and 384/384 exact before/after field comparisons.** All four
native side rows and states are retained in the synthetic sanitized reference
[fixture](../../docs/validation/hybrid2-runtime-parity/timed-load-native-bilateral-sanitized.json).

`api/test/timed-load-native-bilateral-http.test.js` then uses that exact native
reference as input to openGym's real frontend session-start/finish, isolated
backend HTTP pack/store/read, three process restarts, and chronological
controller replay: 26 HTTP writes, 28 reads, 96 original L/R observations
preserved, and a historical right-side timing edit recalculates state.

Both suites are separately reproducible and must not double count native runs.
See [full constraints and provenance](../../docs/validation/hybrid2-runtime-parity/TIMED_LOAD_NATIVE_BILATERAL_HTTP_20261111.md).

## 2026-11-11 — Adversarial two-device sync using actual HTTP, real history editor, independent L/R

The runnable `api/test/two-device-engine-v2-adversarial-http.test.js` exercises actual Engine V2 session start/finish, historical edit, real backend revision-based optimistic conflict (HTTP 409), `mergeStates` and conditional retry, canonical disk persistence, and restart. The synthetic K5/HYBRID-2 + ATP2 + bilateral Timed Load profile also has two manually grouped independent bilateral occurrences with the same true Engine V2 track. Offline historical edits on the right side survive the merge without losing A's newer sessions or either side's `setId`. All four controller histories are re-derived; a second stale merge does not duplicate workouts. **8 synthetic completed sessions, 12 bilateral rows, 9 real HTTP requests, one actual server restart, 0 unexpected failures**.

A reproduced native-id compatibility defect in `api/engine/progression-groups.js` is corrected: an *ungrouped* HYBRID-2 occurrence ID containing `:` no longer prevents a separate explicit manual group, while grouped-member IDs, duplicate detection and native identity lock remain strict. See [full report](../../docs/validation/hybrid2-runtime-parity/TWO_DEVICE_ENGINE_V2_ADVERSARIAL_HTTP_20261111.md) and [sanitized evidence](../../docs/validation/hybrid2-runtime-parity/two-device-engine-v2-adversarial-sanitized.json). This is an openGym synthetic integration result, **not** a new genuine original-Liftosaur workout or full M6 acceptance.

Complete API regression (isolated validation worktree, TMPDIR=/dev/shm): **1077/1077 PASS**; the first attempt's two -122 scratch filesystem write failures disappeared without source/test changes. Validation branch is 100 commits ahead of integration/engine-v2 and 0 behind before this checkpoint. Integration is not authorized by this result.

Full frontend Vitest: **8341 PASS / 1 unrelated existing RED** in 701 files; unchanged pt-BR inherited-text fingerprint assertion also fails in isolation. All targeted 142 Engine V2 frontend tests pass; no locale fingerprint expectation was altered.

## 2026-11-11 — Correct earlier historical edits with later Engine v2 sessions

`saveWorkoutEdit` now replays the complete chronological progression for all affected tracks instead of only refreshing when the corrected workout was the terminal log. This prevents stale downstream phase successes and load states after a backdated correction, including shared progression groups. Actual regression: 18/18 focused API and 156/156 frontend tests PASS; original Liftosaur parity count unchanged. See the latest STATUS checkpoint. No deployment.

## 2026-11-11 — Date-change history fix

`Change date & time` now uses `moveWorkoutInProfile()` to move a session and replay Engine v2 progression as well as ATP2, Timed Load and HYBRID-2; the previously stale terminal log/load after chronological reordering is corrected. Reproduced RED before fix; 75/75 focused frontend regressions PASS. See STATUS checkpoint. No production deployment.

## 2026-11-11 — Paused HYBRID-2 preserves original M6 source tracks

Once stored native HYBRID-2 workouts pin a reviewed adapter, temporarily disabling its H1 monitor no longer changes any of the adapter's Engine v2 progression identities, including not-yet-trained B/C source occurrences. A never-used disabled adapter still opts out. An incompatible replacement identity or historical namespace is rejected instead of silently rekeying history. Verified in-memory against all 36 slots (11/13/12) from an existing private nine-session M6 profile: 36 matching frontend exposure/prescription tracks, canonical profile valid, 0 new Liftosaur native workouts; 36 focused API + 162 frontend tests PASS. Status remains PARTIAL for numerical full M6 and actual physical equipment. See STATUS checkpoint.

## 2026-11-11 — HYBRID-2 pause/resume continuity guard

A reviewed native source track identity is now retained while H2 is paused, but **resuming the H1 monitor after recording adapter-mapped workouts without structural metadata is unsafe**. Engine V2 blocks that silent resumption until an explicit review; it never rewrites completed workouts, prescriptions or real user data. Legacy sessions before H2 began and unrelated exercise sessions while paused remain valid. Product fix touches native history continuity, the normal supervisor and real H2 settings UI. 54 API + 163 frontend focused checks PASS; Vite build PASS. Nine-session original-source-derived M6 profile: isolated paused A (11 exposures) detected correctly; no live activity. See STATUS for precise boundaries and reproduction.

## 2026-11-11 — Bilateral persisted set identity preservation

`api/training-control/paired-rows.js` is a shared pure source-key grouping routine for saved unilateral rows, consumed by ATP2 historical replay and saved-workout UI reconstruction. It restores unique original `r0/r1` set order across shuffled `L/R` persisted arrays; ambiguous duplicate `setId` evidence never becomes a fabricated successful pair, and timed physical holds stay separate. Reproduced both pre-fix REDs; 62 focused API + 262 frontend PASS, full API 1078 PASS/0 FAIL/3 SKIP, Vite build PASS. Reused **18 genuine original-native M6 paired sets** in isolation (6 source instances, 108 data/replay checks) with no newly executed native workouts, user account writes, or physical catalogue claim. See STATUS for provenance and scope.

## 2026-11-11 — Source-derived native custom M6 on isolated openGym

A private pinned original-native M6 test profile now uses **29 real custom exercise identities across all 36 A/B/C slots**, with matching shared source progression keys. **88 source-compiled initial work sets / 264 exact initial kg-reps-AMRAP checks** are modelled as isolated manual snapshots without inventing a physical gym ladder; nine native openGym synthetic A/B/C sessions (108 completed exercises) passed actual history validation. A separate authenticated isolated HTTP test passed real packed read/write, 409/merge and backend restart. The real saved-workout path had a **confirmed custom exercise snapshot bug** (persisting an opaque ID rather than the profile-owned name, including when the global exercise catalogue was not yet registered, and an undefined name for a nameless legacy custom), now fixed with targeted regressions. Full API 1081 PASS/0 FAIL/3 SKIP; focused frontend 153/153 PASS; Vite build PASS. Full future source-native 36-slot numeric parity remains unverified. Private generated profiles and detailed provenance are retained only under `/mnt/cachedl/projects/openGym-validation/local-native-proof-20261111`, outside public GitHub.

## 2026-11-11 — Original-native M6 gym equipment and true bilateral test suite

Beyond 29 custom exercise identities and a source-accurate first-workout snapshot, the pinned original gym settings now resolve **35/36 real M6 equipment ladders (28/29 original unique types)**, and two native paired L/R exercises. **175/175 native original ATP2 init checks, 275/275 original candidate/UI next-set/probe checks across 6 real source-normal/Turbo workouts, 151/151 historical/replay checks, 84/84 source-seeded H1 field checks, 18/18 paired real-original-native-state checks across 6 fresh original runtime workouts**; real isolated source-profile HTTP read/write, 409/merge, backend restart and both derived controller replays PASS. The first zero-history H1 comparison's **44 RED fields** were caused by not carrying 5/6 existing original H1 histories: retained, not rewritten, and the source-seeded incremental observation proof does not claim completed H1-history import. One native equipment assignment remains unresolved. Full details in [M6_CUSTOM_NATIVE_GYM_FUTURE_DIFF_20261111.md](../../docs/validation/hybrid2-runtime-parity/M6_CUSTOM_NATIVE_GYM_FUTURE_DIFF_20261111.md); all private source and runner files remain exclusively in `/mnt/cachedl/projects/openGym-validation/local-native-proof-20261111/`, no actual user-account writes or public private-data copies.

## 2026-11-11 — M6 full 36 original custom exercise native workout + warm-up parity

The pinned source-gym fallback for a directly evaluated native `cable` movement (39 original legal rungs) completes **29/29 original custom exercise equipment definitions / 36/36 source positions**, 180 native ATP2 init checks. Native workout transcript now decodes the equipment suffix and left/right paired source sets rather than silently dropping 12 occurrences: **12 original runtime workouts, 144/144 exercise observations, 155/155 logical source set records, 722/722 native/differential assertions PASS**. Real openGym six-session NORMAL/Turbo **36-slot, 72-exposure, 83-original-work-set** pipeline passes **299/299 source-native ATP2 kg/candidate/probe checks**, 167 replay/schema checks, separate source-seeded original H1 84/84 (44 naive empty-history H1 mismatches retained). Existing original-native six paired-L/R workout evidence remains valid; uncontrolled Playground unilateral input is not claimed as an asymmetric side test. Authenticated full source profile HTTP/409 merge/restart PASS.

New **production `warmup.js` bug** corrected: original native fixed equipment rungs now govern cable/machine (and assisted) warm-up loads instead of arbitrary 2.5kg rounding. Three RED regressions before fix, four PASS after; original M6 native **8 warm-ups over six exercises, 16/16 exact prescription and 16/16 UI warm-up numeric checks, 8 saved/excluded from ATP2**; real custom cable start→finish/ATP2 frontend regression PASS. Full API 1085 PASS / 3 SKIP, focused frontend 224 PASS, final start 27 PASS, production Vite build PASS. See [full native 36 + warmups proof](../../docs/validation/hybrid2-runtime-parity/M6_FULL_NATIVE_36_WARMUPS_20261111.md). Private original values and source scripts remain on the authorized Unraid cache, not in Git. Source-native-initialized H1 memory migration remains unimplemented.

## 2026-11-11 — ATP2 subsequent-session warmup target regression

Added true two-session custom M6 equipment ladder test: a native-allowed 34 kg candidate has 18.125/24.75 kg warmups; progressed ATP2 28.75 kg candidate must have 10/18.125 kg warmups. Initial RED showed old warmups persisted despite correct ATP2 candidate. Session-start now regenerates `template`/`smart` warmups at the real ATP2 candidate using the source-owned equipment ladder, while leaving ATP2 work rows and HYBRID-2 frozen deload unchanged. The saved next-session workout and historical ATP2-excluded warmup rows are asserted. Focused frontend **226/226 PASS**, full API **1085 PASS / 0 FAIL / 3 SKIP**, production Vite build PASS. No real account modifications.
