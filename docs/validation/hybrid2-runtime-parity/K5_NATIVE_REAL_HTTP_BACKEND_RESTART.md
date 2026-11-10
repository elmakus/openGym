# K5 original-native sourced records → real openGym backend → restart → replay (2026-11-10)

## Selected outcome

**PASS: 20 real `PUT /api/data` history writes, 23 real `GET /api/data` reads, two real `api/server.js` process restarts, 239 checks, zero RED.** This is a new persistent backend integration test, **not 20 more Liftosaur-native workouts**.

The input data comes from the **previous** original pinned native K5 bilateral transcript (SHA-256 `44a84c1dbe7439909810d1e7275f22a1afbcf94dcbbff10d937cef7a8a814e31`). The existing `run-native-k5-history-pipeline.mjs` materializes 20 finished openGym sessions from those *native-recorded repetitions* through genuine `buildSessionExposures`, `entriesForExposures` and `buildCompletedSession`; its synthetic loads remain 100 kg for this fixture and **do not** represent original live Liftosaur weights or H1 absolute numerical equivalence.

## Real production code paths used

1. The existing K5 runner emits 20 cumulative canonical v2 profile snapshots to a private, mode-0600, scratch-only directory when `H2_PRIVATE_PROFILE_SNAPSHOTS` is set. Its prior 199 test assertions remain PASS; no additional original native workouts are run.
2. The new `run-native-k5-real-http-backend.mjs` starts **actual unmodified openGym `api/server.js`** as a child, with an empty random isolated `DATA_DIR`, a synthetic test account, synthetic signed cookie, ephemeral OS-selected TCP port, and never a production auth secret or real profile.
3. Each profile is sent as an engine-aware `PUT /api/data` with `baseRev` and `baseWid`; each successful response is read back over `GET /api/data`. This takes the server's real `packProfile`/`unpackProfile` wire contract, `validateCanonicalProfile`, `stampPut`, atomic durable JSON file writes, cache eviction and v2 profile revision gates.
4. All 20 records are checked as complete canonical workouts, including their set IDs, actual native-origin reps, bilateral left/right sets in positions 5, 10, 15, 20, resistance objects, structural tags and training-control metadata. Exact deep equality is checked **after** the original pack/unpack canonical transform, ignoring **only** the server's intentionally added workout bookkeeping keys `_ts` and `_f`.
5. After every persisted read, **production** `replayHybridHistory` and `reconcileHybridHistory` produce the same state and match the K5 original-native input oracle's H1 slot count. This includes the genuine reset after deload, rather than a fabricated monotonic H1 count.
6. After the 10th and 20th entries, the child server is **stopped and started again using the same isolated data directory**. Actual persisted file, revision, `_wid`, completed history and entire replayed H1 state are re-verified after each process restart.
7. A real next-session preparation call (`buildSessionExposures` → `entriesForExposures`) produces 1 matching next-session exposure and entry from the **HTTP-restored profile at revision 20**, with controller status `QUEUED`. An intentionally stale `baseRev:0` HTTP write is rejected with 409, confirming history was not overwritten.

## Real counts, scope and reproducibility

- **20** real server-side durable writes; **23** reads; **2** child-server restarts; **239** original backend checks / **0 RED**.
- **20** previously generated openGym K5 sessions reused, **0 new Liftosaur native workouts**, **4** original-native sourced bilateral record checks.
- Original input samples are from pinned frozen K5. Timed Load closer is exercised in the inherited K5 materialization and persisted by the real API; this does **not** demonstrate real current-M6 timed-load, original absolute weights or real device offline sync.
- API server data files, synthetic cookie secret and full snapshots are private; mode 0700 scratch directory/mode 0600 private files. No production DB, credentials, programs or histories are touched.

Reproduction after generating existing native K5 sanitized transcript and the private profiles:

```sh
B=/tmp/hybrid2-runtime-parity-20261109
cd "$B/integration-checkout-20261110"
H2_PARITY_OUT="$B/evidence" \
H2_PRIVATE_PROFILE_SNAPSHOTS="$B/evidence/k5-isolated-backend-input" \
node scripts/hybrid2-runtime-parity/run-native-k5-history-pipeline.mjs
H2_PARITY_OUT="$B/evidence" \
H2_PRIVATE_PROFILE_SNAPSHOTS="$B/evidence/k5-isolated-backend-input" \
node scripts/hybrid2-runtime-parity/run-native-k5-real-http-backend.mjs
```

The new runner requires original openGym API dependencies available locally; for this isolated worktree the frozen base worktree's already-installed `api/node_modules` was referenced by an ignored symlink (no dependencies installed, published or modified).

[Safe 20-session trace](k5-native-real-http-backend-sanitized.json) includes each native-sourced session ordinal, actual API revision, replay source count, controller state, restart/next-session and test verdict, without source workouts or weights. SHA-256 runner `e4f565f93ed1f3fcf26f88c93e6d25f663e8400dfaf5ccb4c7e207aa5797759c`; modified K5 snapshot opt-in runner `b843d304f9918affc55ff453229b7d809b1b73ee54f06a4993a371da17ecd968`; published sanitized backend trace `bfef582bb490362b25772c1e32f427d0a37881bc6df2c6cee60a42b6ce91757d`.

## Harness controls / deliberately excluded conclusions

Three initial *diagnostic harness mistakes* were explicitly corrected with **production contracts**, without changing the server or weakening replay contracts:

- A first diagnostic tried replaying packed `GET /api/data` JSON without the app's `unpackProfile`. That failed with “invalid H1 load unit” (pack stores the nested unit key in short form).
- A raw byte-for-byte workout equality diagnostic failed because the server intentionally inserts `_ts`/`_f`, adds canonical row defaults and reorders object keys. The new check compares every workout and every exposure/set after applying the same production pack/unpack transform, excluding only the exact two server stamp fields.
- A hard-coded monotonically increasing H1 sample-count expectation failed on the 16–20th sessions, whose **original native K5** history legitimately resets after deload. The final comparator uses the already pinned original-native sourced oracle for each of 20 H1 count checks.

The initially failing *harness assertions* are not relabeled as product bugs or counted in the selected PASS. Their origins remain documented here. There is **still a separate original-fitness/openGym H1 21–22 rep contract RED**, and **current real-M6 to persistent backend exact absolute-load parity is not yet established**. No production deployment or user-account modifications.

Post-test targeted API regression command: `node --test api/test/engine-gate.test.js api/test/profile-pack.test.js api/test/server-data-wid.test.js` — **24 PASS, 0 FAIL**. These are separate from 239 new backend checks, not additional native sessions.
