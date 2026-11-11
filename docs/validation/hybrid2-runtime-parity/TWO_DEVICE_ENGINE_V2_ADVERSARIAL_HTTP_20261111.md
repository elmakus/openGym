# Engine V2 — adversarial two-device real HTTP sync (2026-11-11)

**Verdict: PASS WITH LIMITS.** This is an actual openGym backend/client test on a synthetic K5 + explicit shared-group profile, **not** a new original Liftosaur runtime execution or proof of full M6 numerical parity.

## Provenance and safety

- Validation parent: elmakus/openGym commit 4cc956158ff6844dac8b5a9f4cf57a5a5e9bf370.
- Genuine original Liftosaur workouts added: **zero**.
- Uses real openGym buildSessionExposures, entriesForExposures, syncSideAggregate, buildCompletedSession, editCompletedSession, saveWorkoutEdit, mergeStates, replayProgression, replayAtp2History, replayTimedLoadHistory, replayHybridHistory and packProfile/unpackProfile.
- Starts real api/server.js on an ephemeral port with a unique scratch DATA_DIR and a synthetic account; destroys it after test. Neither real user data nor production services are accessed.

## First reproduced RED: native HYBRID-2 identities rejected by new manual-group catalogue

A new explicit progression group for two ordinary compatible occurrences failed immediately whenever an *unrelated, ungrouped* HYBRID-2 occurrence had a legitimate colon-separated ID, e.g. fixture-k5:chest. The existing catalogue incorrectly applied the manual group ID regex to **every** existing routine occurrence, including immutable native source identities. This is a genuine implementation defect.

The minimal code correction allows a nonempty unique string for the entire catalogue, while retaining strict ID syntax for every explicitly grouped member and each group ID, prohibition on grouping pinned HYBRID-2 identities, and duplicate/empty ID rejection. New unit negative controls cover these boundaries. The earlier test-only omission of syncSideAggregate was also corrected: L/R values and the parent row's done state must be updated via real UI model helpers; this was a harness error, **not** a product defect.

## Full adversarial sequence

1. Produce **5 K5-position** completed sessions through the genuine Engine V2 session UI/finish path: loaded H1 + ATP2 signal work and one timed closer with separately saved left/right durations. Add one synthetic bilateral shared-group workout, then write the resulting **6-session profile** to real HTTP API.
2. Independently clone the *same* actual server snapshot at revision 2 into clients A and B.
3. Client A finishes an additional bilateral workout on the same shared progression track, then one more loaded ATP2/H1 workout; a successful conditional PUT advances the server to revision 3.
4. Offline B opens the earlier saved Timed Load workout through actual historical editor functions and corrects only the **right** first-set duration to **21 seconds**. It separately opens an earlier saved bilateral grouped workout and changes only its **right** first-set repetitions to **5**. These are real saveWorkoutEdit calls, preserving prescribed set IDs and replaying derived history. The editor remains separate from the canonical synced profile, as in useStore.
5. B's stale conditional PUT with baseRev 2 gets **HTTP 409**, with canonical current server state included. Real mergeStates(B,remote) recovers B's edits and both A workouts; merged profile is PUT conditionally at revision 3.
6. Perform GET, stop and **restart the real backend process** with the same disposable disk database, GET again, inspect packed on-disk profile, and repeat the merge with stale B as a duplicate-resurrection control.

## Exact outcome

| Invariant | Observed |
|---|---|
| Synthetic sessions preserved | **8 / 8** |
| Physical bilateral rows explicitly audited | **12**: timed closer 4, each of two grouped sessions 4 |
| Real HTTP requests | **9** |
| Accepted PUT | **4** |
| GET | **4** |
| Expected stale revision conflicts | **1 HTTP 409** |
| Actual backend process restarts | **1** |
| Final server revision | **4** |
| Shared progression group | two unrelated occurrence IDs share one frozen progression-group:synthetic-shared track |
| B's older right timed correction | 21 s, earlier left value unchanged |
| B's older right grouped correction | 5 reps, left unchanged |
| A's newer right grouped result | 6 reps, unchanged |
| L/R row identity | L/r0, R/r0, L/r1, R/r1 preserved across edit/HTTP/merge/restart |
| Replay of ATP2 / Timed Load / HYBRID-2 / grouped Engine V2 | **exact state equality PASS**, including disk, restart, and repeated merge |
| Re-merging the stale B profile | **8** sessions, no duplicate |
| Unexpected failures | **0** |

The test intentionally corrupts B's cached ATP2, Timed Load and HYBRID-2 controller snapshots, demonstrating that the genuine merge ignores their values on progressed tracks and rebuilds controller states from completed history. No purported native-original samples are inferred from this.

## Reproduction

In an isolated clone of this validation commit, run:

    H2_PARITY_OUT="$PWD/docs/validation/hybrid2-runtime-parity" node --test api/test/two-device-engine-v2-adversarial-http.test.js

Additional targeted checks:

    node --test api/test/{progression-groups.test.js,progression-groups-http-restart.test.js,two-device-engine-v2-adversarial-http.test.js,timed-load-native-bilateral-http.test.js,hybrid2-h1-high-reps-http-restart.test.js} api/training-control/{atp2.test.mjs,atp2-oracle.test.mjs,timed-load.test.mjs,timed-load-history.test.mjs,hybrid2-h1.test.mjs,hybrid2-history.test.mjs,hybrid2-controller.test.mjs}

    cd frontend
    ./node_modules/.bin/vitest run src/lib/{hybrid2-sync.test.js,atp2-sync.test.js,timed-load-sync.test.js,sync-merge.test.js,session-edit.test.js,hybrid2-integration.test.js,atp2-integration.test.js}

Targeted result: **73/73 API/control PASS**, **142/142 frontend PASS across 7 files**. Full API suite: **1077/1077 PASS** with TMPDIR=/dev/shm. First full attempt gave 1075 PASS + two environment-only write failures (error -122 on oversized canonical conversion and 30 MB streaming upload with constrained /tmp); both succeeded on isolated /dev/shm retest (30/30 in the two files), then the entire full API suite passed. No test expectations were changed. Entire frontend Vitest suite: **8341 PASS / 1 RED** (700 passing test files, 1 failing file, 8342 test cases). The single failure is an existing unchanged and independently reproduced Brazilian Portuguese locale inheritance fingerprint mismatch: src/lib/pt-br-locale.test.js expects SHA-256 0cc9b7dec572d0c4f964163668d528d130386e90eeb283d524319c9d9558d368 but sees 3d011472b77cc5a67204640d71ead1868e738b455c6001c17edef2af988e1cdf. Locale source and its test are untouched by this change. It is tracked as **unrelated existing RED**, not silently fixed by rewriting expectations. Reusable, secret-free report: [two-device-engine-v2-adversarial-sanitized.json](two-device-engine-v2-adversarial-sanitized.json).

## Remaining limitations

- No full 36-occurrence original M6 native-vs-openGym numeric ATP2/Timed/H1 controller parity or actual gym equipment proof.
- No real Android/browser client, concurrent edits to the same workout on *both* devices, hostile network interruption, cross-account isolation or program backfill migration covered.
- GitHub comparison before this commit: validation branch **ahead by 100, behind by 0** versus integration/engine-v2 (integration SHA 4a3ca7f909bb3fc317fbfefec97ea0637d9a9ac4). No integration merge performed.
- Original unmodified M6 RTT update-shadowing remains a **separate RED**; source-generated corrected candidate is not deployed.
- This stage makes no change to main, integration/engine-v2, production accounts, genuine athlete training history or live backend.
