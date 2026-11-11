# Original-native M6 custom exercise equipment + future ATP2 / H1 differential — 2026-11-11

**Verdict: PASS within verified scope; whole-M6 numeric parity remains PARTIAL.**

This review extends the source-derived private 29-`customEx` / 36-occurrence M6 profile with original-native **gym equipment configuration and side-specific execution**, rather than comparing against generic catalogue names, guessed plate increments, or snapshot-only weights. Actual sources were the pinned original Liftosaur runtime `ce75750bde4a190682fb5a6fa1984fc9184a9842`, frozen original M6 program SHA-256 `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`, and its frozen original fixture gym settings. No source, account, live training history, or production API was written.

## Native settings authority

The previously reported **35 missing equipment definitions** were a lookup error in the test fixture: the evaluated `exercise.equipment` property is not the authoritative equipment mapping for the frozen gym. The correct resolution is the original source exercise type ID → `settings.exerciseData[typeId].equipment.default` → `settings.gyms[0].equipment[equipmentId]`. Resolve the actual ordered `fixed` equipment loads, not a universal 0.5/2.5 kg step.

- **29 distinct original source exercise identities**, placed in 36 A/B/C structural slots (11/13/12); six shared cross-day progression-key groups.
- **28/29 unique source exercise types and 35/36 occurrences** resolve to original fixed equipment ladders. Exactly one source occurrence has no gym equipment record in this frozen settings fixture; it is explicitly **unresolved**, not silently assigned synthetic weights.
- Two source occurrences are genuinely **paired / unilateral** (`progress.state.paired == 1`). The custom exercise occurrence's `side` flag must reflect the original progression state, not a guessed name or a missing `isUnilateral` property.
- **88 original work rows** in the initial compiled source. Real source `minTarget`/`maxTarget`, initial candidate, native floor, paired flag, and fixed equipment rung list were carried into isolated custom exercise ATP2 configuration. For a paired exercise the openGym PlanRule must declare twice the per-limb native repetition target so that `prepareAtp2Session` sees the source per-side minimum and maximum.
- The actual `buildSessionExposures → prepareAtp2Session` path passed **175/175 exact initialization checks across 35 equipment-backed occurrences**, including candidate, source min/max, paired and exact ladder. No source-app-specific runtime module or modified Liftosaur code was used to implement openGym ATP2.

## Frozen source-native future progression compared with real openGym UI / history

An earlier original pinned Liftosaur trace containing 12 finished workouts was **reused**; the first 6 chronological NORMAL / Turbo A/B/C workouts are one valid sequential source progression chain. Those six original-native workouts were projected as **72 actual openGym custom-exercise exposure logs**, including 66 source-decoded loaded exercise occurrences with **77 real source work sets**. Two side-paired source occurrences and one equipment-unresolved occurrence are excluded from this specific *bilateral-unaware source-transcript regex*; a separate direct native bilateral test below closes the paired execution coverage.

The actual openGym chain used `buildSessionExposures`, `entriesForExposures`, live `refreshAtp2Live`, `buildCompletedSession`, `replayAtp2History`, `reconcileHybridHistory`, and full canonical profile validation. Results:

| Contract | Exact assertions | Verdict |
|---|---:|---|
| Initial source controller and original gym ladder | 175 | PASS |
| Native source vs openGym ATP2 before candidate, physical next-set kg, after candidate and probe | **275** | **PASS** |
| Other actual history/controller reconciliation and canonical validation assertions | 151 | PASS |
| True original-native H1 source-initialized incremental observation, using **saved openGym exercise logs** | **84** | **PASS** |
| Real original Liftosaur paired L/R workout → actual openGym bilateral UI → finish → native ATP2 | **18** | **PASS** |

The naive fresh-profile H1 comparison initially produced **44 mismatches out of 498 aggregate fields**. **All 44 were H1 history baseline fields**: the actual source's six H1 signals had differing pre-existing counters/score samples, whereas a newly created openGym profile starts its event-sourced H1 replay at zero. There were **0 ATP2, UI, history-replay or canonical-state mismatches**. This is **not** evidence of a new algorithm defect. The original RED file was deliberately retained. When using the *actual original-native initial H1 values* for each of the six signals, `h1FromExposure → observeAnchor` over twelve genuine custom history observations passed **84/84**, with 12/12 source observation kinds matching. Five of six source signals already had nonzero H1 samples at the imported starting point.

**Important trust distinction:** source-seeded *incremental H1 mathematics* is verified; full deterministic HYBRID-2 replay from a **nonempty source history not imported to openGym** is not. The normal openGym replay remains deterministic against its **own** generated history; it must not be advertised as identical to source H1 accumulated state without an explicit bootstrap/import policy.

## Genuine original bilateral workouts

A new separate runner executed **six actual source-native finishes**, three independent asymmetric/normal input variants for each of the two original paired exercises (four trials had different L/R repetitions). It used the pinned original program model, `Progress_completeSetAction`, `Progress_settleTimedSet`, `Progress_changeAmrapAction` as requested by the original UI and `Program_runAllFinishDayScripts`, then parsed the original rewritten program state. Independently, openGym saved **two separate completed physical work rows per paired set** via real session start/finish; both arms' repetitions were preserved. The unchanged `evaluateAtp2` result, actual openGym saved state and original native next-candidate/probe passed **18/18 state comparisons**. No real account interaction.

## Real isolated HTTP / offline conflict / disk restart

The new six-session source-driven custom profile was packed and persisted through a separate authenticated `api/server.js` (`PORT=0`, independent secret and ephemeral `DATA_DIR`), including exact physical gym ladders, original-source logged loads and correct custom exercise snapshots. Three authenticated GETs, three accepted PUTs, **one real stale-client HTTP 409**, canonical merge and one physical backend restart all passed. After every read, merge, and disk unpack, exact `replayAtp2History` and HYBRID-2 replay matched saved canonical state. **72 saved exercise exposures, 29 custom definitions, all 36 routine positions survived.** Zero production contacts or writes.

## Evidence and reproduction boundary

All private source strings, original numeric load ladders, original workout data, serialized profiles and test runners remain in the private Unraid cache under `/mnt/cachedl/projects/openGym-validation/local-native-proof-20261111/` (mode 0700 directory, 0600 files). The non-sensitive aggregate record `m6-authoritative-gym-summary-sanitized.json` and its assertion-driven producer `summarize-m6-authoritative-gym.mjs` retain all counts. Key isolated private runners are:

- `build-m6-authoritative-equipment-profile.mjs` — actual source equipment and initial ATP2 parameters;
- `verify-m6-source-native-atp2-frontend.mjs` — 6 original-native finished-workout evidence chain and real frontend/history (retains naive H1 seed RED);
- `verify-m6-h1-native-seeded-custom-logs.mjs` — 12 source-seeded, actual saved-workout H1 observations;
- `verify-m6-original-native-paired-execution.mjs` — 6 fresh genuine original-runtime bilateral executions;
- `verify-m6-source-atp2-http.mjs` — authenticated isolated backend, canonical merge and physical restart.

**Remaining:** exactly one original unresolvable gym equipment assignment; all exercises' real future RTT script state and warmup variations beyond tested NORMAL/Turbo inputs; official H1 migration/bootstrap semantics for pre-existing original-native H1 memory; app-device offline delivery in the real phone. These limitations **do not** invalidate the demonstrated original-native ATP2/paired/H1 incremental parity.
