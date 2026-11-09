# Native shared progression identity + H1, deload reset, relearn — 2026-11-09

## Reproducible original native source

[Runner](../../../../scripts/hybrid2-runtime-parity/run-shared-h1-propagation.py) is a validation-only synthetic 3-signal controller. It imports **the unchanged frozen original** `fitness@9f2deb6c345643d7c0c793c52d358e496c2710d2` H1 observation setup, H1 codegen, generic write-through controller and private H1 reset-address generator, executing genuine original `Liftosaur@ce75750bde4a190682fb5a6fa1984fc9184a9842` `Playground_run`, `finish_workout`, and persistent `updatedProgramText` reload after every native workout.

Three real native progression-key configurations:
- `SHARED_NORMAL`: 3 occurrences of exactly the same native `benchpress_barbell` progression key across days; first occurrence executed.
- `SHARED_SKIP_CARRIER`: same 3-occurrence shared group, with earlier carrier skipped; preservation of remaining write-through and H1.
- `DISTINCT_CONTROL`: distinct identities/negative control.

Each executes 8 complete 3-day cycles: 3 H1 seeding, queue on widespread 7-rep weakness, completed-deload reset via original private H1 reset tags, 3 cycles of new 9-rep relearning. Actual H1 slots, both preceding non-H1 shared carriers, global queue and streak, 6 H1 state fields, Adaptive candidate and a synthetic Adaptive `adaptiveKeep` preservation sentinel are checked. All raw generated source and source hashes are owned by the isolated harness, not production programs.

**Results: 72 original native workouts / 2,025 two-system fields or identity/preservation checks / 0 discrepancies.** Three independent suites PASS (24 native workouts each). The shared native exercise key remains identical through serialization and resets; distinct control is separate.

[Full native readback and openGym state trace](shared-h1-native-compact.json), SHA-256 `e16ea9f86689b8e13d67343853b06403a33da4812509e739b96e6f92f89a89e6`; runner SHA-256 `36b3ed1827d7f331af41a37e390b564da6233a43633b590a17e27b5d99816b6f`.

**Limit:** synthetic 3-signal plan, not the current real K5/M6 shared-group program; synthetic lifecycle harness supplies start/freeze gating. Full published user-plan parity is **not** inferred.
