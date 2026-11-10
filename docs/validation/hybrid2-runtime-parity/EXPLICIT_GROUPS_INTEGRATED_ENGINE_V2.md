# Engine v2 selective progression groups — integrated validation branch (2026-11-10)

## Scope and authority

**Status: implemented in actual application code on the validation branch, NOT deployed or merged into production.**

User-approved requirement: a lifter can explicitly group selected repeated occurrences of **the same catalogue exercise**, such as the first-position Monday and Friday Bench Press, and leave fifth-position Wednesday Bench Press independent. A shared progression group is never inferred merely from equal exercise names or weekday/position. Matching **repetition ranges are mandatory**. Initially the implementation conservatively requires matching set/phase structure, entire progression program/rounding and logging configuration as well; this is stricter than the minimum user rule to guarantee Engine v2 state compatibility. Difficulty ladders are excluded until their effective rung identity is supported. No automatic historical migration: this feature assumes a clean start.

## Shipped-source changes on validation branch

- `api/engine/progression-groups.js`: pure selectors + validator + guarded group mutations. Optional canonical field `progressionGroups: {version:1, groups:[{id, members:[occurrenceId, occurrenceId, ...]}]}`. Shared members get `trackId = progression-group:<id>`; non-members retain their existing occurrence ID. Static pinned HYBRID-2 adapter `progressionIdentity` is authoritative for its occurrences and cannot be manually overwritten.
- `frontend/src/lib/session-start.js`: uses shared identity **before generating immutable Engine v2 prescriptions**. It also prevents the global `lastFrom: any` option and the ordinary exercise fallback from injecting observations from another group. Wednesday always stays independent.
- `api/migration/profile-validation.js`: refuses invalid manual groups at canonical write-time. `packProfile/unpackProfile` retains the optional group field. The existing `stampEdits/mergeStates` correctly syncs this setting across two device copies (confirmed by test).
- `frontend/src/components/ProgressionGroupControl.jsx`, `frontend/src/views/RoutineEdit.jsx`: control in each repeated-exercise row; candidates show the other routine and ordinal position, incompatible matches disabled, explicit join/leave. Routine editor refuses an incompatible rule/repetition edit before writing state. Routine/member deletion guards also enforced in `Plan.jsx` and the central routine deletion function.
- A completed occurrence cannot be regrouped to a new track; a previously progressed group cannot accept newly grouped occurrences. No history is rewritten or forcibly rekeyed. Group membership is changed before training, or remains locked until a separately reviewed history policy exists.
- 19 locales have all four new UI strings; Portuguese (Brazil) inherits the Portuguese strings as intended.

## Reproducible genuine code tests and outcomes

| Check | Outcome |
| --- | --- |
| Real Engine v2 integration: Monday group 100 → 102.5, Wednesday independently 100, Friday inherits 102.5 → 105, next Monday 105 | PASS, synthetic fixture, original Engine v2 generation/finish/replay |
| Same track appears twice in a single workout | PASS, advances exactly once |
| Global `lastFrom:any`, exercise fallback, duplicate memberships, mismatched reps/sets/operators, different exercises, difficulty ladder, existing-history join, pinned-H2 native key | PASS negative/control cases |
| Canonical validator, profile packing/unpacking, two-device `stampEdits/mergeStates` | PASS |
| Actual rendered UI: matching candidate, incompatible rejection, join/leave, persistence stamp, unsafe edit/delete guards | PASS |
| Backend/API test subset including original H2/ATP2/Timed Load tests | **115 / 115 PASS** |
| Existing frontend engine/routine/Plan regressions | **621 / 621 PASS in 36 Vitest files** |
| Vite production build | PASS (only existing bundle warnings) |
| Locales consistency | **19 language packs / 3816 keys PASS** |
| Existing source-string strict check | **Unrelated baseline failures**: 22 older untranslated source keys in Hybrid2Settings/Workout remain; this feature adds no missing keys |
| Original-native-derived M6 nine chronological profile snapshots from frozen source | **1350 source checks PASS**; 537 exposures / 537 immutable prescription hashes / 211 progression-state pointers, plus 3 new source-based materializations; 0 new native Liftosaur workouts |

Original source input pins: openGym production baseline `8529b2d41b28fea8ae96a50325aaf28e864a0160`; original fitness `9f2deb6c345643d7c0c793c52d358e496c2710d2`; original Liftosaur runtime `ce75750bde4a190682fb5a6fa1984fc9184a9842`. Original M6 source SHA256 `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`. Native source, account records and workout values were never uploaded. [Sanitized M6 evidence](shipped-m6-identity-integration-sanitized.json).

To reproduce original native-derived M6 test (requires private pinned evidence present on the authorized computer only):

```sh
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/shared-identity-followup-20261110"
H2_PARITY_ROOT="$BASE" H2_PARITY_OUT="$BASE/evidence-integrated-m6-20261110" \
  node scripts/hybrid2-runtime-parity/run-shipped-m6-identity-regression.mjs
```

Frontend tests: `cd frontend && npx vitest run src/views/RoutineEdit src/views/Plan.swipe src/lib/session-start src/lib/sync-merge src/lib/prescription src/components/ProgressionGroupControl`. Node API tests: `node --test api/test/progression-groups.test.js api/test/profile-validation.test.js api/test/profile-pack.test.js api/test/engine-main-features.test.js api/training-control/{atp2.test.mjs,atp2-oracle.test.mjs,timed-load.test.mjs,timed-load-history.test.mjs,hybrid2-h1.test.mjs,hybrid2-history.test.mjs,hybrid2-evidence-contract.test.mjs,hybrid2-controller.test.mjs,hybrid2-adversarial-independent.test.mjs,hybrid2-unsupported-perf-independent.test.mjs,hybrid2-fake-closer-independent.test.mjs}`.

## Unresolved

- Real HTTP API finish/save/restart/replay in a separate backend instance not executed in this step; integration tests exercised in-memory canonical model and real generation/reducers/sync.
- UI and persistence not exercised on physical Android device; web build passed.
- H1 `H1_SUPPORTED_REPS_UPPER=20` in original openGym is still an unresolved source parity RED. A **separate temporary-source** test of 21–23 reps reached 0 mismatch against real original Liftosaur, but product cutoff was **not** changed in this feature stage (extreme-rep contract undecided).
- Original fitness M6 29 RTT local update shadowing and full native→backend hybrid/ATP2/Timed Load lifecycle remain outstanding; no claim of full HYBRID-2 parity.
- Legacy progression identity migration deferred as instructed. No production branch, customer account, or backend state touched.
