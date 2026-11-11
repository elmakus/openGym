# M6 full source-native transcript, 36/36 real equipment and native warm-up parity — 2026-11-11

## Verdict and precise trust boundary

**PASS for all tested M6 source-origin initial equipment, source-executed physical set transcription, ATP2 NORMAL/Turbo progression, native-source H1 incremental mathematics and first-cycle warm-up prescriptions. Full whole-program RTT/de-load live-account migration remains PARTIAL.**

The original M6 source is pinned by SHA-256 `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`. The original unmodified Liftosaur runtime is pinned at `ce75750bde4a190682fb5a6fa1984fc9184a9842`. The 12-workout multi-scenario runner uses only **in-memory source-variant corrections** `centralizeRttUpdate` + `addStaleH1WriteBarrier`; it does not deploy those corrections to the original user's account and should **not** be described as an unchanged live source. The separate original paired/UI execution checks exercise original-native completion actions independently. Private source strings, full numerical gym ladders, exact personal workout weights and generated profiles stay on authorized Unraid cache, not public GitHub.

## Last source equipment identity recovered: 36/36

Earlier frozen source fixture studies found 35/36 configurations by source exercise ID → `settings.exerciseData[typeId].equipment.default` → `settings.gyms[0].equipment`. The remaining original source occurrence lacks an `exerciseData` preference, but the **original evaluated native exercise explicitly selects the gym's `cable` equipment**. The real native workout transcript confirms `, Cable /` on its physical log, and the gym has **39 explicitly configured cable load rungs**. The source's actual initial work weight, floor, candidate, and calculated next-session candidate are legal rungs; this was verified by an actual original-runtime completed workout. The new private fixture permits this fallback **only when the evaluated native exercise selects an equipment ID present in the pinned gym**, not from its name or an assumed category.

The rebuilt isolated canonical openGym fixture now resolves **29/29 native unique exercise types, all 36/36 structural occurrences**, including two native per-side exercises, with **180/180 exact source-ATP2 initialization comparisons**. No synthetic/fictitious 2.5kg rounding used for ATP2.

## Native source transcript parsing: 155/155 actual work sets

Previous source runner recognized `Exercise / reps kg` but silently excluded actual native `Exercise, Cable /...` and `right|left` bilateral transcript rows. New `native-workout-transcript.mjs` parses those source forms, verifies unambiguous exercise labels, expands counted work-set groups, and preserves independent source left/right reps rather than fabricating a bilateral equality. Synthetic parser regressions: **5/5 PASS**. The previously excluded original-native unilateral exercise `Playground.change_reps` input does **not** independently edit two limbs: the runner now verifies the **actual serialized right|left**, while the separate genuine original-native bilateral completion suite (six workouts, four asymmetric tests) remains the authority for truly controlled independent side observations.

Re-executed the unchanged pinned runtime (against source variants in memory) for **12 source-native workouts / 144 exercise occurrences / 155 completed logical work sets / 155 work-set command inputs**, with **0 unparsed exercise occurrences and 722 native/differential comparisons or assertions PASS**. Scenarios: baseline NORMAL A/B/C, NORMAL Turbo A/B/C, RTT INTRO A/B/C, queued→active→terminal deload A/B/C. The 722 includes both native-only H1/deload invariants and differential assertions, **not** 722 complete end-to-end openGym phone sessions.

## Full 36 custom exercise openGym NORMAL/Turbo comparison

Using the six source-native baseline + Turbo workouts' captured transcript and the **complete original gym equipment** fixture, actual openGym `buildSessionExposures → entriesForExposures → refreshAtp2Live → buildCompletedSession → replayAtp2History → reconcileHybridHistory` executed all **36 original exercise positions across days A/B/C**, two complete consecutive cycles. Exactly **72 source-origin completed exercise exposures / 83 originally completed logical work sets** were carried into canonical records with original kg, repetitions and left/right observations.

**299/299 exact native-source-vs-openGym ATP2 comparisons PASS**: 72 candidate-before, 83 session UI next-set kg, 72 candidate-after and 72 probe-after. In addition, 149 deterministic ATP2 history replay checks, 6 H2 replay checks, 6 H2 compatibility checks and 6 canonical schema checks succeeded. All 36 source positions are covered; original asymmetric independent L/R UI is additionally tested in the separate six-workout native bilateral suite, not inferred from Playground's one-sided `change_reps` command.

Original Liftosaur's H1 baseline was not a zero-history state: five of six anchor signals already contain saved source observations. The deliberately naive zero-history H2 comparison retains **44 RED H1-only fields** in the private proof (there are zero ATP2, session-record or canonical divergences). With the exact source-native prior H1 values supplied per signal to the actual saved openGym custom exposures, the separate incremental `h1FromExposure → observeAnchor` comparison gives **84/84 H1 fields and 12/12 input observation types PASS**. **No unverified claim is made that openGym can rebuild the historical Liftosaur H1 baseline from an empty workout log.** A formal import/bootstrap policy remains outstanding.

A new isolated authenticated openGym backend proof of this 36-position source-origin six-session profile passed three GETs, three accepted PUTs, one actual HTTP 409 stale-client merge, persisted disk re-read, physical restart, full ATP2 and H2 replay and all 72 source exposure rows.

## Native M6 warm-up parity and production bug fix

The actual pinned native Liftosaur `Program_nextHistoryRecord` has **8 physical warm-up sets in 6 of the 36 exercise positions** (days A/B/C: 2/3/3 warm-up sets). The source recipe encodes explicit repetitions and percentages; the real native compiled gym uses **the nearest legal equipment rung below the percentage target**, not a universal 2.5kg step.

Confirmed three production RED tests: `api/engine/warmup.js::planWarmupRows` respected explicit `allowed_values` ladders **only for dumbbells**. Cable, selectorized and assisted-machine prescriptions could therefore fabricate non-existent warm-up loads by rounding to a generic step. Fixed genuine Engine V2 warm-up planner to sort the declared equipment rungs and use the actual **lower legal rung** for a non-assisted warm-up and **upper legal rung** for assisted warm-ups. Ordinary step-based warm-up behavior remains unchanged. Four new regression tests: **3 RED → 4/4 PASS**.

Source-native end-to-end proof: the 36 custom exercise profile carried the **six genuine original native warm-up recipes** into approved `template` rules, through real `buildSessionExposures → prescription.warmupRows → editable UI → buildCompletedSession → historicalAtp2Rows`. Original source weights/reps: **16/16 exact prescription fields, 16/16 editable UI fields, all 8/8 saved warm-up physical rows**, and 8/8 excluded from ATP2 history. Three A/B/C synthetic physical workout sessions with all 36 positions retained deterministic replay and canonical profile validation; synthetic completed work was deliberately 1 rep so warm-up performance could not invent an ATP2 promotion. A new integration regression for a synthetic custom cable ladder verifies real frontend session creation, UI and saved history with warm-ups and unchanged ATP2 candidate.

### Test matrix

- Full API: **1085 PASS, 0 FAIL, 3 SKIP** (1088 total), including four new warm-up equipment tests.
- Focused frontend before final warm-up integration addition: **224/224 PASS**; final `session-start.test.js` after addition: **27/27 PASS**.
- New original-native transcript parser tests: **5/5 PASS**.
- Vite production build: PASS.
- All original private validation scripts and generated sanitized result manifests stay on Unraid; not published to the public repository. Existing unrelated full-frontend `pt-BR` locale fingerprint snapshot RED from a previous sweep is outside this focused regression and was not silently rebaselined.

### Remaining gaps

The full H1 checkpoint/import design for pre-existing native history, all source future warm-up **transitions** (only source initial warm-ups were verified), full native RTT/queued deload across the real user's phone workflow, complete program mobile sync, and actual user-account deployment were not established in this run. Normal/Turbo source numeric parity is proven at its explicit six-native-session boundary; native-only RTT/de-load assertions do not automatically imply every openGym frontend transition has been verified.

### Additional native warm-up HTTP/offline proof

A further independent isolated `api/server.js` run used the **full three-session A/B/C profile with all eight actually completed source-native warm-up rows** (36 recorded exercise exposures and 29 custom exercises). On every authenticated GET, the stale-client HTTP `409` conflict/merge, backend restart, and persisted disk unpack, assertions required **exactly eight separate completed `role: warmup` rows**, canonical schema validity, source exercise names, deterministic `replayAtp2History` and deterministic HYBRID-2 history. **3 GETs, 3 accepted PUTs, 1 real 409 merge, 1 restart — PASS**. The proof was executed with a random private test user/secret and ephemeral isolated data directory, no production account writes. The test driver and sanitized counts are kept in protected Unraid private evidence, not this public repository.
