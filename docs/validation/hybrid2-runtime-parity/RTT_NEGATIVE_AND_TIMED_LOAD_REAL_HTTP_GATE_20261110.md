# M6 RTT expected-RED gate + Timed Load real frontend/HTTP/persistence — 2026-11-10

**Branch:** `validation/hybrid2-liftosaur-runtime-parity`
**Parent baseline:** `3f2d564de4d25f31e312bc91687ecb97169e9d8e`
**Scope:** Independent native RTT causal rerun and source-only corrected M6 controller on actual pinned Liftosaur, plus completed synthetic Timed Load sessions from production openGym session/finish/replay code and actual HTTP/disk/restart. **No production updates, original fitness source writes, real Liftosaur account changes, or private athlete training-history edits.**

## 1. RTT remains an original-source blocker (not an openGym H1 regression)

The genuine original current M6 `qtwbbqff` is pinned by SHA-256 `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`, original frozen fitness `9f2deb6c345643d7c0c793c52d358e496c2710d2`, original unmodified Liftosaur runtime `ce75750bde4a190682fb5a6fa1984fc9184a9842`, and the previously archived frozen gym equipment fixture (not verified live gym settings).

`run-current-marta-rtt-causal.mjs` was rerun with authentic, privately serialized, queued `qtwbbqff-queued-native.liftoscript`. It performed **6 native workout completions, 122 causal assertions**, zero unexpected test-harness failures. In the **unchanged** M6, following the queued controller's next workout, `deloadQueued=1`, `deloadActive=0`, `deloadStarted=0`: an **expected original-program RED**. When removing only the first local RTT `update` in a scratch program, the actual native deload starts (`deloadActive=1`). The all-29-overrides-removed causal control also starts and completes a reduced A/B/C deload, but **that control deliberately removes RTT INTRO behavior and is not a production fix**.

The maintainable in-memory candidate `rtt-centralized-update-variant.mjs` + `h1-stale-barrier-variant.mjs` was then retested by `run-current-marta-rtt-source-fixed.mjs` on the **unmodified real original Liftosaur runtime**: **29 native `finish_workout` executions, 48 set access probes, 688 comparisons/assertions, zero differences**. It covers original inherited Adaptive NORMAL, RTT INTRO, A/B/C queued deload, stale H1 cross-occurrence write order, and post-deload relearning. The variant never changes the original current program on disk or the real account, and cannot be silently classified as native original-source PASS.

**Root causes confirmed:** (a) 29 per-occurrence RTT `update` blocks shadow the inherited template; (b) a later stale H1 entry may overwrite a previously cleared shared H1 tag on finish-day. Earlier source-level reports remain the detailed causal reference: [RTT update-shadowing](M6_RTT_UPDATE_SHADOW_CAUSAL.md) and [centralized RTT/H1 write barrier](M6_RTT_CENTRALIZED_H1_STALE_SOURCE_FIX_NATIVE.md).

## 2. New Timed Load end-to-end test, independently grounded in frozen Python oracle

New automated regression: `api/test/timed-load-real-http-restart.test.js`.

- Uses the actual `defaultPlanRule → buildSessionExposures → entriesForExposures → buildCompletedSession → packProfile/HTTP PUT → disk → HTTP GET/unpack → replayTimedLoadHistory` chain.
- Executes **12 successive state transitions** in 12 complete unilateral Side Plank sessions, plus a thirteenth deliberately excluded workout. All four physical L/R work rows per session are retained (**52 physical L/R rows**, 13 × 4).
- For every counted step, finds the identical initial state and success/failure decision in the frozen original Python oracle fixture `api/training-control/fixtures/timed-load-oracle-v1.json` (Git blob `9caa4778c291a652e08ed1342e2acef7ca83702b`, **4976 generated oracle cases**) and compares the resulting state to that independent oracle record. **12/12 individually matched.**
- Scenarios: 30→35→40→45 seconds; next load 0→2 kg; first failed target; second failure at a newly promoted load enters 25-second emergency; failed emergency steps down to 1 kg with 2 kg bridge; return at 45 seconds to the deferred load; final established-load time advancement.
- Exercises the real `api/server.js` in a child process, **31 HTTP requests (15 successful PUT, 16 GET), 2 actual server restarts**, physically stored, fully unpacked and replayed after each save.
- A thirteenth excluded workout preserves its time rows without changing the Timed Load state. Subsequent deliberate edit to the **last counted workout's fourth physical row** forces chronological recalculation: prior state 2 kg × 35 s, `fails=0` becomes 2 kg × 30 s, `fails=1`; the recalculated state is saved, verified on disk and restored by HTTP. Every canonical profile check and immutable prescription link passes.
- The test account, HMAC secret and all temporary database files are exclusively local scratch data and deleted in `t.after`; no real external service endpoint is used.

**Important methodological separation:** The original Python **Timed Load oracle** is a pinned independent model, but there is **no execution of a native original Liftosaur Timed Load prescription** in this test. Therefore this validates openGym UI, controller, oracle transition agreement, history replay, storage and restart; it is **NOT a native Liftosaur Timed Load runtime parity PASS**. The older Krzysztof hybrid script contains a timed Side Plank presentation with the Hybrid-1 controller, but it cannot be asserted equivalent to the complete newer Timed Load/PGE transition contract without independent native code evidence. Do not substitute one for the other.

## 3. Combined source-integrity gate

New reusable script `scripts/hybrid2-runtime-parity/run-rtt-timed-load-integrity-gate.mjs` requires explicit frozen `FITNESS_ROOT`, `LIFTOSAUR_RUNTIME_ROOT`, `PRIVATE_LIVE_ROOT`, and an **empty new** `H2_PARITY_OUT`. It checks the original source and runtime SHA/pin, invokes both original negative and source-only corrected RTT suites followed by the new HTTP test, verifies each exact expected status and numerical count, then emits a **privacy-safe summary** `rtt-timed-load-gate-sanitized.json`. Raw program states, actual load values and intermediate logs remain private in the dedicated local output directory.

```bash
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/shared-identity-followup-20261110"
FITNESS_ROOT="$BASE/fitness" \
LIFTOSAUR_RUNTIME_ROOT="$BASE/liftosaur" \
PRIVATE_LIVE_ROOT="$BASE/private-live" \
H2_PARITY_OUT="$BASE/a-new-empty-validation-output" \
node scripts/hybrid2-runtime-parity/run-rtt-timed-load-integrity-gate.mjs
```

[Committed sanitized gate outcome](rtt-timed-load-gate-sanitized.json) does **not** include the personal original Liftoscript, source text, account tokens, individual private weights or raw training history. [Committed synthetic Timed Load HTTP scenario proof](timed-load-real-http-sanitized.json) contains only artificial test-state values.

## 4. Other regressions and unresolved scope

A relevant Node API regression subset including canonical profile validation, explicit progression groups, H1=300 contract, ATP2, HYBRID-2 controller/history and Timed Load tests: **110/110 PASS**, zero failed. An additional byte-identical copy of the unchanged frontend/API source on `/dev/shm` ran **18/18 Vitest tests** across Timed Load integration, historical sync, frozen HYBRID-2, and the timed technique UI. The copy used RAM because the original remote `/tmp` has a user-write quota; code checksums match. Previous earlier-stage H1 = 300 acceptance remains valid; this stage does not touch `api/training-control/hybrid2/observation.js` or any other production file.

**Full-program acceptance is still PARTIAL:**
- The unmodified actual M6 contains its own RTT queue→deload bug; only a source-only test candidate is currently demonstrated. Fixing the **original fitness source generator** and revalidating **unmodified newly generated M6** is distinct work, not a silently authorized upstream change.
- A full original Liftosaur Timed Load source implementation and its actual completed-set readback are not demonstrated; Python oracle parity is not a substitute for actual runtime parity.
- Full current-plan native-to-openGym 36-occurrence, paired/time semantics, actual equipment, multi-device offline conflict resolution and unmodified M6 after RTT source repair are not yet accepted.
- Neither main nor production accounts, actual personal history, live Liftosaur programs, deployed apps or Android devices were changed.

The initial development attempt of the HTTP fixture exposed **test harness-only mutable-array/object memoization** (the real profile store replaces immutable `workouts` and `prescriptions` references before packing) and a historical-edit no-op after later recovery. Those issues were corrected in the test fixture, then the complete standalone server test and combined gate rerun PASS; neither was misclassified as an application bug.
