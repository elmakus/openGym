# Combined original ATP2 + original H1 native differential (2026-11-09)

## Method, trusted boundaries and source

This validation-only **composite** is built by [generate-atp2-h1-native.py](../../../../scripts/hybrid2-runtime-parity/generate-atp2-h1-native.py) from exact frozen original `fitness@9f2deb6c345643d7c0c793c52d358e496c2710d2` `programs/adaptive_rep_engine_turbo_probe_candidate.liftoscript` (Git blob `4d6452c2dd2a2ddd45f8b8d653d4ebcf3c37e170`), `hybrid2_promotion_materializer._observation_setup` and `hybrid2_h1_liftosaur_codegen.render_h1_observation`. The entire original ATP2 progress calculation remains unchanged, and H1 is appended as an observer with read-only first-set/performance input and H1-owned writes. The tiny harness glue captures the original pre-ATP2 candidate and sets a non-deload rollover flag; extra H1 state fields are declared in template and Lat Pulldown progression state. No production source or live program was edited.

Source manifest: [atp2-h1-composite-manifest.json](atp2-h1-composite-manifest.json); generated program SHA-256 `2688f20de43df93ff737c2d7d324742ef3c23d0fe17bea3fec11d5f6527ff583`. Genuine pinned Liftosaur `ce75750bde4a190682fb5a6fa1984fc9184a9842`, cloned stock settings with kg (model 2.5kg ladder); underlying original code validates and runs in native `Playground_run`.

For each native workout the [runner](../../../../scripts/hybrid2-runtime-parity/run-atp2-h1-composite.mjs) parses **actual** native workout set weights/reps, reloads `updatedProgramText`, reads native state via `PlannerProgram_evaluateText` / `Program_evaluate`, then:
- maps actual first-set work exposure using openGym `h1FromExposure` with native before/after ATP2 candidate;
- compares native H1 6 persistent fields + 4 audit flags to pure openGym `observeAnchor`;
- compares native ATP2 candidate/floor/probe to `evaluateAtp2` from the same real native workout sets.
- carries openGym states across sessions while original Liftosaur carries `updatedProgramText` across sessions.

## Results

**33 real original-runtime workouts, 429 per-field comparisons; 8 RED steps.**

| Scenario | Native workouts | RED steps | Finding |
|---|---:|---:|---|
| IN_ENVELOPE_GUARD_AND_SENTINEL | 8 | 0 | first-set H1, 16-rep ATP2 progression, candidateGuard and default 1-rep sentinel PASS |
| IN_ENVELOPE_TURBO_CHAIN | 7 | 0 | second-set Turbo progression/first-set H1 distinction PASS |
| ABOVE_ENVELOPE_21 | 6 | 3 | >20 H1 mismatch and carried history |
| ABOVE_ENVELOPE_22 | 6 | 3 | >20 H1 mismatch and carried history, including weak-vote divergence |
| MIXED_20_21_BOUNDARY | 6 | 2 | 20 in-range accepted; subsequent 21 out-of-range mismatch plus history |

All native ATP2 candidate/floor/probe field comparisons agree; all H1 issues belong to the already identified 21/22 loaded-rep comparability discrepancy. No new independent ATP2 algorithm bug demonstrated.

[Native raw compact step trace](atp2-h1-composite-native-compact.json) SHA-256 `998499d6e944d80ab356d7dac68e2848c8bf7491fa724b5aed938f070595e4bf`, with all native and expected state, input commands, native workout transcript, source before/after SHA-256, classified H1 input and each mismatch. Runner SHA-256 `58eaec660c11f16cea9821122e0147d967587070c1f622bba593b41b5083cf64`; generator SHA-256 `54d7111031b94f8a1581860815799881a80f9e0f53da3556a7772577f253dd3e`.

## Reproduction

```sh
FITNESS_ROOT=/tmp/hybrid2-runtime-parity-20261109/fitness \
LIFTOSAUR_RUNTIME_ROOT=/tmp/hybrid2-runtime-parity-20261109/liftosaur \
H2_PARITY_OUT=/tmp/hybrid2-runtime-parity-20261109/evidence \
node scripts/hybrid2-runtime-parity/run-atp2-h1-composite.mjs
# expected: 33 original Liftosaur workouts, 429 compared fields, 8 RED steps, exit 1.
```

This does **NOT** establish full HYBRID-2 materialized plan parity, K5/M6 history persistence, production deload/rollover or shared progression effects. The H1 comparability ceiling is an unresolved contract decision; these tests must remain RED.
