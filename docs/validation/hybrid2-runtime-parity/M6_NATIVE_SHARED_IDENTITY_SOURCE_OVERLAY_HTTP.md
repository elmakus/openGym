# Full source-structural M6 native shared progression identity → openGym (2026-11-10)

**VERDICT: ORIGINAL openGym materialization RED; isolated one-line source overlay PASS within its scope.** Never relabel the original RED as product parity.

## Provenance

- Actual original private M6 `qtwbbqff` source SHA-256: `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`. Underlying pinned original fitness: `9f2deb6c345643d7c0c793c52d358e496c2710d2`, genuine unchanged original Liftosaur native runtime: `ce75750bde4a190682fb5a6fa1984fc9184a9842`.
- Input: **previously executed**, private native M6 post-deload workout trace SHA-256: `2b4a0747d39890dfb3c89a49e4df8c3229e39c390713a8a58d42e66284d25c95`. **Zero additional original-Liftosaur workouts** in this stage; the original selected native ledger remains 771 / 11,056, and earlier debug reruns are not counted.
- Genuine original structural topology: **11 A + 13 B + 12 C = 36 occurrences**, six independent H1 anchors, six native `e.key` shared progression groups across **13 original occurrences** including one three-occurrence group. Generated source is never published. Original custom exercise types cannot be silently mapped to real openGym catalogue exercise semantics; this uses `0025` as an explicit **test-only catalogue placeholder**.

## Authoritative negative control: implementation mismatch

The current unchanged production/base `frontend/src/lib/session-start.js` uses `const trackId = occ.occurrenceId`. Source-native progression identities come instead from the original Liftosaur `e.key`; these identities are explicitly declared in the static openGym HYBRID-2 adapter. On all nine real native-input A/B/C sessions (three cycles), the original frontend materialized **108 mismatched exposure identities** across the 36 distinct structural slots (one underlying implementation contract failure, **NOT 108 independent bugs**).

Actual original `replayHybridHistory` rejected the unchanged frontend's first completed full-36 workout with **`HYBRID-2 replay: exposure track identity metadata mismatch`**. Merely changing a finished exposure's `trackId` also causes actual `PUT /api/data` to reject the profile with `invalid state`: prescriptions belong to another track and Engine v2 progression state track IDs no longer match. These observed errors remain classified **openGym implementation mismatch**, not harness-only false positives. The original source-based native program is not changed.

## Minimal isolated source-only candidate

The validation runner starts with the exact original frontend module SHA-256 `f8d0575f047e04155531aab00a536f7f97ff1e0267cac2413c5919d3c6310ed1`, verifies a single unique existing assignment, and substitutes **only** its track identity selection before the genuine Engine v2 prescription is generated:

```js
const trackId = hybrid?.adapter?.occurrences?.find(
  x => x.occurrenceId === original.occurrenceId
)?.progressionIdentity ?? occ.occurrenceId
```

Source-only temporary ESM module SHA-256: `d33d0b446eb860f67e6dd945decfd5e49abdb46944df942fc9a42cb3ad263bbe`. It is imported from the original frontend directory so all *unchanged* production dependencies and `generatePrescription` / content-hash / progression code execute. Its temporary file is deleted after import. **The real openGym source module is neither edited nor committed.** No post-hoc modification of stored prescriptions or history is used in this selected variant.

The runner executes the unmodified production materializer on a separate cloned scratch profile to retain the original 108 RED inputs, then the one-line source variant against the actual in-memory profile. This is an **isolated source integration hypothesis**, not approval for direct production deployment. Other native/custom equipment identity and progression contracts still require review.

## Actual original-set validation / backend persistence

- **9 openGym frontend-finished sessions, 36 source-backed structural occurrences per native A/B/C cycle, 119 exact original-native kg completed work sets, 18 genuinely native H1 first-set observations**. Nine additional source-native paired/non-kg occurrences are **not** made up as loaded work sets; preserved as unexecuted or non-comparable structural rows.
- All six native shared key groups use the same declared openGym track identity across occurrences after the isolated source overlay.
- **854 positive frontend/structural/replay assertions, 0 new failures** in the isolated variant; the **108 original RED identity observations remain recorded separately**. Source-backed `buildSessionExposures → entriesForExposures → buildCompletedSession → JSON persistence → replayHybridHistory/reconcileHybridHistory` are exercised in real code.
- Real unchanged `api/server.js`, unique scratch `DATA_DIR`, synthetic user and secret: **9 API writes, 13 API reads, 3 actual process restarts, 475 backend assertions, 0 further RED**. All **119 original-native kg sets and their performed repetitions** survive HTTP pack/unpack, disk persistence and restart; revision and write ID survive each restart, next A routine offers 11 editable entries, stale revision PUT fails HTTP 409.
- These are **frontend/backend validations**, not new Liftosaur-native workouts. Absolute native candidate/H1 performance state parity against identical original custom equipment in the real full program is **NOT** proven by the placeholder exercise catalogue.

## Reproduction and evidence

```sh
BASE=/tmp/hybrid2-runtime-parity-20261109
OUT="$BASE/evidence-m6-full-36"
cd "$BASE/m6-full-structural-20261110"
H2_PARITY_OUT="$OUT" PRIVATE_M6_ORIGINAL_PATH="$BASE/private-live/qtwbbqff.liftoscript" \
 H2_NATIVE_M6_PRIVATE="$BASE/evidence/m6-post-deload-native-private.json" \
 FITNESS_ROOT="$BASE/fitness" LIFTOSAUR_RUNTIME_ROOT="$BASE/liftosaur" \
 H2_PRIVATE_PROFILE_SNAPSHOTS="$OUT/profiles" \
 node scripts/hybrid2-runtime-parity/run-full-m6-native-source-overlay.mjs
# Expected exit 1: original production identity RED remains; overlay checks 854/854 PASS.
H2_PARITY_OUT="$OUT" \
 H2_NATIVE_M6_PRIVATE="$BASE/evidence/m6-post-deload-native-private.json" \
 H2_PRIVATE_PROFILE_SNAPSHOTS="$OUT/profiles" \
 node scripts/hybrid2-runtime-parity/run-full-m6-native-http-backend.mjs
# Expected backend bridge 9/13 HTTP, 3 restarts, 475/475 PASS; upstream RED retained.
```

Published safe traces: [full-36 source identity RED and isolated source overlay](m6-full36-native-source-overlay-sanitized.json), SHA-256 `889dadd21517dbdd195bec138215251c5b48cf034919b63263a6c1f0f9418bcb`; [actual isolated HTTP backend checks](m6-full36-native-bridge-http-sanitized.json), SHA-256 `1794074cdf73a27584ab2abe3752d76e2fd74b4f699a7dfea29c0ccca6d886d9`. They contain only anonymous slot IDs, hashes, count/status and classified issues. No program text, absolute weights, private records, account secret, cookies, production DB or actual credentials are committed.

## Still open

**Global verdict: PARTIAL / RED**. This adds an explicit **openGym implementation mismatch** in source-backed shared progression identity materialization, alongside the existing **original-fitness/openGym H1 21/22 rep policy RED** and the original current-M6 source bug (29 RTT local updates shadow inherited Adaptive; fixed only in isolated source variant). Precise Timed Load and bilateral original records, current gym equipment, full 36-exercise numerical candidate/performance parity, online/offline two-device sync and production adoption remain unverified. No `main`, feature branch, real Liftosaur account, production DB, merge, APK or deployment changed.
