# M6 / HYBRID-2 — offline H1 conflicts and explicit review (2026-11-11)

## Safety boundary

Validation branch only; synthetic K5/M6 fixtures and isolated HTTP backend. No active
Liftosaur changes, no real M6 history writes, no public private weights, names or native
anchor values, no production deployment. This does not establish full native M6 parity.

Previously a two-device HTTP 409 could produce an incompatible H1 union then retry PUT
automatically. Original device workout records were not preserved. More subtly, two
different completed H1 values could yield a valid-looking replay and be accepted
silently by generic timestamp/field merge.

## Implemented

- frontend/src/lib/hybrid2-sync.js: retainHybridHistoryConflict captures exact local,
  remote and merged versions of disputed mapped workouts, including tombstone metadata.
  A pending review remains sticky; conflicting completed H1 values require review even
  if independent replay of each version succeeds. Prior config/bootstrap conflicts and
  immutable review receipts also survive re-merges.
- mergeHybridSettings detects a device missing a native H1 checkpoint when it edits an
  existing structural workout, not only when it inserts a new ID.
- resolveHybridHistoryConflict requires a choice for every disputed record: local,
  remote, merged or current (user-corrected History). The entire proposed timeline
  must pass frozen history, native H1 cutover, resume continuity and full H1 replay
  before the original profile is changed. ATP2, Timed Load, Engine V2 progression and
  derived one-rep maximums are reconstructed. Selected records are stamped more recently
  than superseded field edits, and both originals plus choices are retained in
  hybrid2HistoryReviews. The H1 controller remains disabled until a separate action.
- frontend/src/lib/sync-merge.js reconciles after stamped settings and exercise merges,
  so a generic settings update cannot overwrite an already checked H1 state.
- frontend/src/store/useStore.js: during an unresolved H1 history/config/bootstrap
  conflict or incompatible enabled H1 status, doPush retains the owed local profile,
  reports sync code hybrid2-review, and refuses an automatic follow-up PUT after 409.
- frontend/src/components/Hybrid2Settings.jsx: visible conflict notice, expandable
  original workout records, explicit per-record choices, review validation action.
  Multiple independent unresolved histories must not be auto-concatenated.
- api/training-control/hybrid2/supervisor.js blocks mapped training while there is
  unresolved structural history review, even when H1 is disabled temporarily.
- api/server.js: canonical PUT rejects pending H1 reviews, tagged H1 without adapter
  and structurally incompatible H1 timelines via the actual frozen/replay checks.

## Reproduced RED cases

1. Earlier result correction changes queued-deload vote; frozen successor becomes invalid.
   Previous merge marked INCOMPATIBLE but retained no per-device evidence.
2. Two devices change the same H1 set value. Generic merge replay still passes, but
   automatically selecting one value discards conflicting completed observations.
3. An offline device missing native H1 bootstrap modifies the same known workout ID,
   which the previous additional-ID-only checkpoint guard failed to detect.
4. The store HTTP 409 retry previously accepted or attempted to PUT an invalid union
   before independent explicit review.
5. The real isolated persistence server previously returned HTTP 200 for a canonical
   but H1-conflicted profile; now it returns 400. Stripping the H1 adapter is also 400.

Compatible changes to different workouts and harmless note-only edits can still
converge automatically. No fabricated reps, H1 reset or deletion of alternate evidence.

## Tests and evidence

- frontend/src/lib/hybrid2-history-conflict.test.js
- frontend/src/lib/hybrid2-sync.test.js
- frontend/src/lib/hybrid2-session-edit.test.js
- frontend/src/store/useStore.hybrid2-409.test.jsx
- api/test/two-device-engine-v2-adversarial-http.test.js: real isolated server,
  genuine 409 response, validation gate 400, explicit synthetic choice, accepted PUT,
  cold server restart, durable disk reload, deterministic H1 / ATP2 / Timed Load /
  grouped Engine V2 replay; no real workouts used.
- api/test/hybrid2-bootstrap-http.test.js: native checkpoint immutable across HTTP
  writes and restart.
- Full logs are private under:
  /mnt/cachedl/projects/openGym-validation/local-native-proof-20261111/

## Outstanding blockers — NOT READY FOR PRODUCTION

1. Need authoritative three-way ancestor/revision matching of H1 workout evidence,
   deletions, structure and immutable resolution receipts on the server. An old client
   could submit a different but individually replay-valid result without a conflict
   marker, and the server cannot always infer true concurrency from one snapshot.
2. Distinct native H1 checkpoints currently fail closed but lack a complete guided
   resolution flow that respects the server's immutable checkpoint restriction.
3. Hardware Android multi-device offline/online, app process death, interrupted
   workout edit/start/finish, storage limits and conflict UI accessibility need testing.
4. The full real M6 future native comparison against pinned Liftosaur runtime, including
   H1, ATP2, warmups, INTRO, deload/recovery, custom exercise and gym-equipment mapping,
   is still pending. Synthetic tests must never be described as source-native parity.
5. Live migration requires a fresh verified backup, immutable source H1 boundary,
   offline-device inventory, staging run, read-only source window and rollback plan,
   followed by explicit separate permission from the user.

Follow-up: implement server-verified per-workout ancestors plus offline delete/move RED
tests, then physical Android UX and full private M6 native future differential.
Never merge this validation branch to main without separate authorization.

## Regression outcome from this validation checkout

- Full API: 1088 PASS, 0 FAIL, 3 SKIP.
- Focused frontend sync/store/edit regression: 401 PASS across 32 test files.
- Full frontend: 8368 PASS, **2 FAIL**, 704 files. The independently reproduced
  failures are src/lib/pt-br-locale.test.js (pt-PT inheritance fingerprint) and
  src/lib/prescription/warmup.test.js (rule-step fallback, expected 85 versus 100).
  They import locale and api/engine/warmup modules not modified by this package.
  They remain unresolved; do not report overall frontend as all-green.
- Vite build: PASS, nonfatal chunk/dynamic-import warnings.
- API two-device adversarial HTTP: PASS, 409 then 400 guard then explicit review,
  persisted PUT and one physical isolated backend process restart.
- git diff --check: PASS.
- Logs are local only in the private Unraid proof directory noted above.
