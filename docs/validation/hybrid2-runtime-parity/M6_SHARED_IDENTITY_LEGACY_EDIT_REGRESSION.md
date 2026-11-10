# M6 shared progression identities: saved history and earlier edits (2026-11-10)

**VERDICT: isolated one-line source-only variant PASS in tested scope; unchanged openGym implementation RED.** No production source changed and no migration of real user data performed.

## Provenance and count boundaries

- Production openGym baseline: 8529b2d41b28fea8ae96a50325aaf28e864a0160.
- Validation parent: 56b87ee65db181c05a75e8ace467152d8ece1fc2; tree f3a9c3b7d7e53fab8ed64f9660e4a71e01a50f92.
- Original private M6 qtwbbqff SHA-256: 7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df.
- Original fitness: 9f2deb6c345643d7c0c793c52d358e496c2710d2. Actual unmodified original Liftosaur runtime: ce75750bde4a190682fb5a6fa1984fc9184a9842.
- Previously executed real native M6 nine-workout transcript SHA-256: 2b4a0747d39890dfb3c89a49e4df8c3229e39c390713a8a58d42e66284d25c95. Nine earlier full-36 M6 frontend profiles were reused privately. **0 new original Liftosaur workouts** and no synthetic results substituted for real native inputs; previous selected native ledger remains **771 workouts / 11,056 assertions**.
- Original frontend session-start.js SHA-256 f8d0575f047e04155531aab00a536f7f97ff1e0267cac2413c5919d3c6310ed1. Same pre-prescription source-only selection of declared progressionIdentity, with occurrenceId fallback, imported through a temporary sibling ESM file removed after import. No change to production file.
- **3,410 real openGym source assertions PASS, zero unexpected failures**, plus **3 expected RED negative controls** of one legacy identity defect. **9 generated frontend sessions** (six ordinary-plan A/B materializations, next M6 A, actual unchanged materializer legacy A completed with prior true native set, edited-history next M6 A). **0 new real backend HTTP calls/restarts**; only source/frontend/replay in this follow-up. Separate unchanged Node API regression suite: **68 PASS, 0 FAIL**.

## Additional tested contracts

1. **Ordinary plans:** no HYBRID config, disabled HYBRID config, and enabled HYBRID config with a separate unrelated routine. Unmodified and patched source produce byte-identical exposures and original Engine v2 prescriptions; expected occurrence-based track identities preserved. Scenario counts: 11, 11, and 1 materialized exposures for each source version. A preliminary cloned-routine test fixture had a stale rule.routineId and was corrected to its actual new routine ID. No production logic or PASS expectations were modified.
2. **Previously persisted full-M6 prefixes:** nine previously sourced A/B/C x 3 snapshots: **537 saved exposures** across prefixes, **537 immutable prescription/contentHash records**, **211 progression state entries**. All canonical validations, hybrid history replays, adapter identity checks, stored prescription-track checks, state lastPrescriptionId / lastCompletedLogId and engine replayProgression last-pointers PASS, **zero replay-pointer disagreements**. The six native shared e.key groups involve 13 source positions, including one three-position group. These 537 records count repeated prefix observations, not 537 independent sessions.
3. **Following A:** after nine source-native-derived sessions, the real source-only session-start creates **11 next-day A exposures** with exact adapter track IDs, correct immutable content hashes, preserved IDs through JSON serialization and canonical profile validation. This test does not execute another native Liftosaur workout.
4. **Historical edit:** an existing previously completed non-H1 native-input exercise's first set repetitions are changed in an isolated in-memory prior-workout copy. Canonical validation, HYBRID-2 state replay/reconciliation, unchanged six shared identities, and next A all remain valid. This is **not proof of arbitrary H1 edits, numerical Engine v2 reprogression for all older edits, or a deployed edit UI**.
5. **Original legacy persisted-history failure (expected RED):** a new isolated A workout is generated using the *unchanged* original openGym materializer and finalized with an actual previously captured native set. **11 original occurrence/declared progression identity mismatches**. The record is *canonically valid* in generic validateCanonicalProfile, but original replayHybridHistory rejects it with **HYBRID-2 replay: exposure track identity metadata mismatch**. reconcileHybridHistory marks INCOMPATIBLE, removes unsafe controller state, and following session start rejects unresolved history. A naive one-field exposure trackId replacement is separately rejected by generic canonical validation because the immutable prescription still belongs to the original track. Three expected RED controls reflect **one root cause**, not three separate product bugs. The scratch historical shape is NOT evidence that a specific real user already has legacy saved data.

## Limits and remaining RED

The unchanged product still uses occurrenceId as trackId for source-native shared progression groups: **product RED retained**. A migration of existing old-format profiles must be explicit, reviewed, fail-closed, and coordinate prescription hashes, Engine v2 states, ATP2/Timed records and evidence provenance. No automatic migration is justified by this test. Original current M6 RTT local-update shadowing and original-fitness H1 21/22 repetition disagreement remain **independent RED**.

The source-to-openGym 36-slot fixture uses generic test catalogue placeholders, not exact original physical/custom equipment. These nine stored profile snapshots have **zero ATP2 or Timed Load state records**, therefore positive pointer/hash checks do NOT establish correct ATP2 or Timed Load shared-state updates. Original paired, timed and non-kg sets are not promoted to PASS. No live account, actual current-gym equipment, production DB, APK, deployment, or remote merge was changed.

## Reproduction

~~~sh
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/shared-identity-followup-20261110"
H2_PARITY_ROOT="$BASE" H2_PARITY_OUT="$BASE/evidence-m6-full-36/legacy-edit-followup-20261110" \
 node scripts/hybrid2-runtime-parity/run-m6-shared-identity-legacy-edit-regression.mjs
# Outcome VARIANT_PASS_ORIGINAL_AND_LEGACY_RED: 3410 positive checks, 0 unexpected failures,
# 3 expected legacy negatives, 9 frontend source calls, 0 original-native workouts.

node --test api/training-control/{atp2.test.mjs,atp2-oracle.test.mjs,timed-load.test.mjs,timed-load-history.test.mjs,hybrid2-h1.test.mjs,hybrid2-history.test.mjs,hybrid2-evidence-contract.test.mjs,hybrid2-controller.test.mjs,hybrid2-adversarial-independent.test.mjs,hybrid2-unsupported-perf-independent.test.mjs,hybrid2-fake-closer-independent.test.mjs}
# 68 PASS / 0 FAIL.
~~~

[Sanitized evidence](m6-shared-identity-legacy-edit-regression-sanitized.json) SHA-256: 115683e48760c23f5c076665213dcbe0ba584a3e5a1aa6bf222e000678e32a5d. Real native values and source, complete reconstructed history, secrets and all scratch credentials remain private and uncommitted.
