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
