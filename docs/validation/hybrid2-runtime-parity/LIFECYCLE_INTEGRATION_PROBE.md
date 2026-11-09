# Isolated native HYBRID-2 H1 → queue → deload → reset → relearn probe (2026-11-09)

## Provenance and precise scope

- Original `elmakus/fitness`: `9f2deb6c345643d7c0c793c52d358e496c2710d2`.
- Real, original `liftosaur/liftosaur`: `ce75750bde4a190682fb5a6fa1984fc9184a9842`.
- openGym base: `8529b2d41b28fea8ae96a50325aaf28e864a0160`.
- Native original imported generators: `hybrid2_promotion_materializer._observation_setup`, `hybrid2_h1_liftosaur_codegen.render_h1_observation`, `hybrid2_liftosaur_codegen.render_controller_progress`, `hybrid2_h1_reset_codegen.render_h1_group_reset`.
- **Important**: the harness independently authors cycle start, deload freeze and reduced-set `update: custom`. This is an **isolated synthetic integration probe**, not the complete native materialization of the unchanged production plan. It does not exercise ATP2/Turbo or persisted openGym history.

## Actual native execution

Run [run-combined-lifecycle.py](../../../../scripts/hybrid2-runtime-parity/run-combined-lifecycle.py) with the three pinned roots; `Playground_run`, `finish_workout`, `updatedProgramText`, `PlannerProgram_evaluateText` and `Program_evaluate` are genuine original runtime calls.

Every K5, M6 and SYN4 setup crosses nine **whole cycles**: three 10-rep learning cycles; 7-rep cycle fast-queues deload; deload workout cycle; three post-reset 9-rep relearning cycles; finally a 6-rep weak cycle queues again. There are 108 actual `finish_workout` workouts, 1,134 comparisons / asserted fields, and **4 failing native second-set-access assertions**. All ordinary H1 state, trigger, native reset (6 fields per slot) and preserved Adaptive-candidate assertions match the openGym expectations under this synthetic schedule.

Native deload *set-shape* was assessed by attempting `change_reps(exercise, 2, 6)` within an actual `Playground_run` of each deload-day exercise. For 2x10 → 1x10 deload, the correct result is `success:false`, `Set 2 not found for exercise N`. Out of 15 probes, **11 rejected**, **4 allowed** (the terminal day/closer in each topology: SYN4 day 4 slot 4, K5 day 5 slot 5, M6 day 3 slots 5 and 6). Raw outcomes are in [combined-lifecycle-native-set-check.json](combined-lifecycle-native-set-check.json). **RED for this synthetic exercise-shape harness**, NOT confirmed production bug or confirmed cross-system set-shape parity. The verdict remains PARTIAL/RED.

### False positive detected and preserved

An earlier comparison read `Program_evaluate(...).evaluatedSetVariations` from the serialized *static program* after deload and falsely inferred there were 2 active session sets for every exercise. But the real `Playground_run` command for the first exercise during deload fails with `Set 2 not found`; session dynamic `update` applies differently than that static evaluation. Original 15-static-mismatch trace is deliberately retained as [pre-correction native JSON](combined-lifecycle-static-shape-precorrection.json) **and must not be counted as an extra product discrepancy**. Corrected harness probes the runtime directly and preserves the four actual successful second-set commands as diagnostic gaps.

### Non-authoritative control

A diagnostic variant [run-combined-lifecycle-diagnostic-tag-read.py](../../../../scripts/hybrid2-runtime-parity/run-combined-lifecycle-diagnostic-tag-read.py) made the harness-authored `update` read `state[controllerTag]` directly. This deviates from the intended no-cross-tag-read architectural boundary; all 15 direct second-set probes succeeded (worse), while H1 state comparisons still matched. See [raw diagnostic](combined-lifecycle-native-tag-read-diagnostic.json). This is an **invalid proposed fix**, not a passing implementation. It has 108 further actual native workouts, purposely *excluded* from the main differential totals because it is an unsupported diagnostic fixture.

## Next authentic proof required

Materialize a **real, unchanged** production `fitness` HYBRID-2 K5/M6/SYN4 Liftoscript program with original `update` code, and compare (for all workout dates) live `Playground_run` set-count accessibility, written/loaded H1 fields, controller lifecycle, Adaptive state, private reset tags, and identity continuity to the actual openGym built session pipeline. The synthetic runner's local `update` seam must not be treated as the authoritative product behavior. Add terminal-closer split, shared progression identities and original ATP2 Turbo cases before GREEN. No production source changes were made.

## Raw data SHA-256

- [corrected native command probe](combined-lifecycle-native-set-check.json): `a279cadf25a70e9cb43e3c84946a706379cd30aeb7c61ea7dc1ddd15dd45ba9f`
- [cross-tag diagnostic](combined-lifecycle-native-tag-read-diagnostic.json): `8093e45f3818b74b881cffb51a88f5a7e87de4bae83f85648628853f306ce459`
- [original static-shape false alarm](combined-lifecycle-static-shape-precorrection.json): `ec34c3654d8d5f8581aab9b3d9d89ccedb01d661fd93ac2c756505b8f64ae267`
- corrected runner source: `d54e1529d2d09ace49433924af4b379faa090c2e9400c808d147177420b5eb8c`
- deliberately unsupported diagnostic runner source: `38a1a460b168d975c8832d0c635362c4a3d7b73e6625ebd40d81ee00400b53`.
