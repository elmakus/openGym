# Actual native M6 kg set inputs → openGym frontend → real HTTP backend → restart (2026-11-10)

**PASS in the tested scope: 9 native-input openGym frontend sessions / 38 original-native loaded kg work sets / 157 frontend assertions / 0 RED; then 9 real openGym API writes / 13 API reads / 3 genuine server restarts / 232 backend assertions / 0 RED.** These are **zero new original-Liftosaur workouts**: the earlier published 9 post-deload native workouts are reused as the source oracle. Their workout totals must not be counted again.

## Provenance and exact limits

- Original read-only M6 `qtwbbqff` source SHA-256 `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`, original pinned native runtime `ce75750bde4a190682fb5a6fa1984fc9184a9842`, frozen original fitness `9f2deb6c345643d7c0c793c52d358e496c2710d2`.
- Input: prior private actual original-Liftosaur M6 post-deload native result SHA-256 `2b4a0747d39890dfb3c89a49e4df8c3229e39c390713a8a58d42e66284d25c95`. The source passed original native comparisons previously. It includes exact completed-set kg, actual repetitions and pre/post native candidate per original anchor, all retained **outside Git**.
- This new transport test uses the production/base openGym frontend `buildSessionExposures → entriesForExposures → buildCompletedSession`, authentic `replayHybridHistory` and `reconcileHybridHistory`, production `packProfile/unpackProfile` and the real, unchanged `api/server.js` HTTP `PUT/GET /api/data` with actual atomic disk persistence.
- An explicit **test-only M6 adapter** maps the six source-native H1 anchor occurrences to fixture slots `hip_a/chest_a/hip_b/row_b/hip_c/row_c` across A/B/C. The fixture has a synthetic extra terminal closer, and **does not recreate the other 30 original M6 executable occurrences or their exact exercises**. It is a limited source-native load/identity/history **transport test**, not full original program materialization or numerical original-vs-openGym replay state parity.

## Directly verified

1. For each of nine chronological native-derived A/B/C sessions, all **38 real original-native loaded working sets** have exact kg load and performed repetition preserved through openGym's editable UI and session-finish paths. Actual pre/post native candidates correctly classify all **18 original first-set observations** as `COMPARABLE` after transport, using unchanged `h1FromExposure`.
2. Every completed frontend session is JSON-serialized to an explicitly private mode-0600 profile snapshot; chronological production `replayHybridHistory` and `reconcileHybridHistory` match after each session. **9 frontend sessions / 157 assertions / 0 issues**.
3. Each snapshot is sent via real engine-aware HTTP `PUT /api/data` and read back with actual `GET /api/data` / `unpackProfile`. The complete original-native-derived workout/exposure/set payload matches the production pack/unpack canonical representation, excluding only separately validated server-owned workout sync stamps `_ts`/`_f`. All 38 original kg loads and repetition counts are rechecked on the stored/read-back payload after HTTP.
4. A real isolated backend `DATA_DIR`, synthetic account and random temporary auth secret are used; after HTTP entries 3, 6 and 9 the actual server process is shut down and restarted. Disk state, sequential revisions, write IDs, completed loaded sets and the full replay state survive all three restarts.
5. The restored nine-session profile produces a next-session A fixture with 2 real editable exposures/entries. A stale revision HTTP write is rejected with 409.

**Final real backend checks: 9 writes, 13 reads, 3 restarts, 232 field/state/assertion checks, 0 RED.** The prior frontend 157 checks and the already executed 9 original-native Liftosaur sessions are separate evidence tiers and excluded from new native counters.

## Reproduce in isolation

```sh
BASE=/tmp/hybrid2-runtime-parity-20261109
OUT="$BASE/evidence-m6-kg-backend"
mkdir -p "$OUT/profiles"
cd "$BASE/m6-backend-checkout-20261110"
H2_PARITY_OUT="$OUT" \
 H2_NATIVE_M6_PRIVATE="$BASE/evidence/m6-post-deload-native-private.json" \
 H2_PRIVATE_PROFILE_SNAPSHOTS="$OUT/profiles" \
 node scripts/hybrid2-runtime-parity/run-m6-native-kg-frontend.mjs
H2_PARITY_OUT="$OUT" \
 H2_NATIVE_M6_PRIVATE="$BASE/evidence/m6-post-deload-native-private.json" \
 H2_PRIVATE_PROFILE_SNAPSHOTS="$OUT/profiles" \
 node scripts/hybrid2-runtime-parity/run-native-m6-real-http-backend.mjs
```

[Sanitized frontend trace](m6-native-kg-frontend-sanitized.json) SHA-256 `9fe67b35ad755e2b10df6fcc08baa4a5c30826088a3f82b37f8ab631dfea2dfe`; [sanitized backend trace](m6-native-kg-real-http-sanitized.json) SHA-256 `d952bc6a950929f18b323db0f51e16332bd47cef50eebff79abb6e807440f0c7`. No absolute personal weights, native Liftoscript, private history, scratch profile records, passwords, cookies, auth secret or actual account data are published.

## Still incomplete / classification

- **Missing evidence:** exact whole-M6 36-occurrence source-backed exposure mapping and actual original weights for timed/non-kg and independently bilateral rows, plus exact candidateGuard/H1 persisted numerical readback against native state (our M6 adapter and closer are explicitly fixture-defined).
- **Contract/policy RED:** original fitness accepts performed 21/22 reps into H1 while openGym excludes them; no change or fabricated PASS.
- **Source bug:** the unmodified original M6 still shadows Adaptive update with 29 local RTT updates; the successful native test used only the isolated source-only RTT/H1 variant, not a deployed fix.
- **Not tested:** production database or real user account, client IndexedDB/offline state, two-device sync, real current-gym equipment. No functional branch, main, merge, APK or deployment affected.
