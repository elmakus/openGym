# Timed Load real native independent L/R + openGym HTTP/replay (2026-11-11)

**Verdict: PASS WITH LIMITS in both new independent suites.** The genuine original Liftosaur timer record is now generated with separately supplied left and right durations for *each* of two logical unilateral sets. This removes the previous standalone runner's assumption that the original opposite-side timer is always the unchanged target or 60 seconds. It is a *new direct native execution*, not just the pre-existing frozen Python oracle comparison.

## Exact provenance and immutable boundaries

- Original actual Liftoscript: `elmakus/fitness@9f2deb6c345643d7c0c793c52d358e496c2710d2` `programs/timed_load_side_plank_candidate.liftoscript`, Git blob `48136e1756e9fa1e245bbe3036872525aa1647ee`, SHA-256 `9b6a10c60c8d53888ade21f60640e4baee03bb8a0ed3b9637e31f82543799218`.
- Actual unchanged original Liftosaur runtime pin: `ce75750bde4a190682fb5a6fa1984fc9184a9842`. The new runner invokes the pinned original `Program_nextHistoryRecord`, `Progress_completeSetAction`, `Progress_settleTimedSet` with **two independently specified side durations per set**, `Program_runAllFinishDayScripts`, and `PlannerProgram_generateFullText`. Native `completedSetTimerLeft`/`completedSetTimer` are checked *after* actual set completion, with no implementation overlay.
- Existing unmodified openGym source reducer: `api/training-control/timed-load.js` `evaluateTimedLoad` and `SIDE_PLANK_TIMED_CONFIG`. Production algorithm files were not modified.
- Native gym equipment **in-memory only** is configured to the original Side Plank algorithm's declared `0,1,2,...,10,12.5,...,30 kg` physical ladder, *not* stock Liftosaur's 5 kg dumbbell minimum. This is controlled test equipment, not live athlete equipment. No real account/API, program, history, production DB, or installed app touched.

## Genuine original-runtime differential

- New `run-timed-load-native-bilateral.mjs`: **24 serial true original Liftosaur completed workout executions**, with **96 native completed physical L/R observations** (2 logical sets × 2 sides × 24 workouts), all preserved with individual `seconds` and native kg load. Each next workout starts with the previous actual original `updatedProgramText`.
- **384/384 strict state comparisons, 0 mismatches**: eight native state fields before and after each of the 24 workouts versus openGym `evaluateTimedLoad`. Fields: initialized flag, native load, prescribed seconds, failure count, new/established provenance, emergency mode, bridge target and bridge provenance.
- Covers first-set left-only failure, right-only failure, second-set left-only failure, right-only failure, overshoots on either side, increasing time, load promotion, emergency success/failure, emergency bridge down, return to remembered load and established-load time backoff. A failing side on the *second logical set* is correctly detected by both engines.
- The frozen source is checked again for an unchanged SHA-256 after the full run. Full source text is never committed. **Sanitized native source execution evidence** (synthetic observations/state only): [timed-load-native-bilateral-sanitized.json](timed-load-native-bilateral-sanitized.json) (generated SHA-256 `c60b9ce10f2f348b57aff68e29fbef09a6a0b8be1d236336cefb230d4875f478`).

## Real Engine V2 session finish, native-origin history, HTTP and restarts

- New `api/test/timed-load-native-bilateral-http.test.js` consumes the verified genuine original-native evidence; it does **not** claim to re-run additional Liftosaur workouts. It runs the **actual** openGym `buildSessionExposures → entriesForExposures → buildCompletedSession` pipeline for all 24 source-native sessions, using the **exact four original native physical side records** per session (distinct seconds, actual kg load and L/R identity).
- Real isolated `api/server.js` with disposable test account and HMAC secret, `PUT /api/data`, `GET /api/data`, pack/unpack, disk and **three real server process restarts**: **26 accepted HTTP writes, 28 successful HTTP reads**. Three restarts preserve all timer values and chronological `replayTimedLoadHistory` state.
- **192 original-native side records verified at the frontend and HTTP boundaries** (96 at each). **192 state-field checks** against original-native after-states across 24 persisted workouts. Test report counts **422 explicit field/side assertions** (does not include other structural, validation, restart and replay assertions).
- Confirmed that changing the **right-side duration of the last completed session** in isolated stored history and recomputing chronological Timed Load state produces a changed controller state that survives a further HTTP write/read. Original native evidence remains unchanged. In openGym, logical zero (`0kg`) serializes as `bodyweight` rather than external-load zero, and historical Timed Load correctly reads it back as the same logical 0kg; not a data-loss mismatch.
- Real HTTP result: `TIMED_NATIVE_BILATERAL_HTTP_PASS`, **1/1 integration test PASS**. API-only state regression tests are documented separately in the validation console/log. Output summary is written to isolated `H2_PARITY_OUT`, not a persistent server.

## Reproducibility

```sh
cd <isolated-validation-checkout>
LIFTOSAUR_RUNTIME_ROOT=<pinned-runtime> \
TIMED_LOAD_ORIGINAL_SOURCE=<frozen-original-side-plank-script> \
H2_PARITY_OUT=<isolated-evidence-dir> \
node scripts/hybrid2-runtime-parity/run-timed-load-native-bilateral.mjs

H2_PARITY_OUT=<isolated-evidence-dir> \
node --test api/test/timed-load-native-bilateral-http.test.js
```

The committed evidence JSON is a source-derived synthetic workout fixture, **not** a personal training history or a live account export. Test-generated source/UIds/credentials remain private to the disposable runtime/test directory. A new source SHA or runtime pin causes the native runner to fail closed.

## Limitations / next gates

- These tests cover the **standalone original Side Plank Timed Load policy** and direct openGym session/API history handling with exact native-origin L/R values. They do not establish current-M6 full source materialization, source-native RTT/deload composition, real gym equipment constraints, arbitrary user-entered timing, two-device offline synchronization, shared HYBRID-2 progression identity interactions, or full numeric parity for the remaining original M6 36 exercise occurrences.
- Original live M6 RTT source still has known local-update shadowing until fixed source is independently approved and deployed; this new Timed Load PASS does **not** convert that existing RED into a product PASS.
- No modifications to production algorithms, `main`, `integration/engine-v2`, Liftosaur user data, production API, APK or deployment. Global full M6 1:1 parity is still **PARTIAL**.
