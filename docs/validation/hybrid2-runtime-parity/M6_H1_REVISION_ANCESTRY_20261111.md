# M6 / HYBRID-2 — revision-bound three-way H1 sync follow-up

Date: 2026-11-11. Validation branch only. Starting point:
e3c30ee86379d4a013297eb0e4fbc9d4735af3aa.
No active Liftosaur, real athlete training history or private native M6 values
were modified or committed. This is not a migration authorization.

## Motivation / reproduced RED failures

Previous HYBRID-2 merge compared only two current device copies. If device A
corrected completed H1 reps and B still held the exact common original result,
B's newer unrelated profile timestamp could win generic field merging; the
H1 review heuristic also interpreted a unilateral correction as a competing
edit without evidence of the original. Two devices editing different workouts
in the same A/B/C or K5 cycle could therefore get a false review barrier.

The new tests deliberately reproduced these RED cases:
- a single existing H1 set corrected offline while the other device had
  exactly the last confirmed value (new revision ancestor is required);
- two different completed H1 workouts corrected on separate devices;
- two devices changing the SAME completed set with different values;
- an earlier workout deleted or moved while another offline device completed
  a successor (must not invent missing cycle chronology);
- HTTP 409 and an ordinary dirty GET needing the same verified common base;
- a restored server history branch reusing a revision number, and corruption
  of the private revision journal;
- stale/legacy writes without H1 provenance and the visibility of sync hold.

## Implementation

1. api/training-control/hybrid2/history-ancestry.js contains shared pure
   H1 structural evidence hashing and deterministic three-way classification.
   H1 evidence covers workout date/start/end, structural tags and full
   exposures (including original work sets, warmups, unilateral sides and
   progression identities). Generic notes, media and edit timestamps are
   not part of the H1 digest; they still use the normal sync merger.
   Digest is deterministic FNV-1a-64 via the existing canonical engine
   hash, **not** a signature or cryptographic authenticity proof.
2. The isolated API saves a private bounded sidecar:
   h1-ancestors-<uid>.json in DATA_DIR, mode 0600, newest 64 revision+wID
   snapshots. Each stores digest values, not raw athlete weights or H1
   anchors. Durability uses atomicWrite before accepting the updated
   profile; a failed/corrupt journal write fails closed with HTTP 503.
3. Authenticated PUT /api/data HTTP 409 can return hybrid2Ancestor only for
   a baseRev and baseWid contained in the current server _wids lineage.
   Authenticated GET /api/data can do the same when requested with headers
   x-opengym-h1-base-rev and x-opengym-h1-base-wid. A forked/restored
   server or expired witness cannot be treated as the common ancestor.
4. frontend/src/store/useStore.js verifies the returned rev+wid against
   this local copy's stored sync marker before passing the witness to
   mergeStates. Dirty GET and retry after 409 both use the witness.
   Unverified/missing evidence retains the strict previous fail-closed
   behavior.
5. frontend/src/lib/sync-merge.js selects a H1 workout's structural
   evidence from the one side changed relative to the verified ancestor,
   independent of unrelated _ts and while preserving the generic note
   and media union. If BOTH sides diverged on the same record differently,
   the prior explicit history review remains mandatory. Derived Engine V2,
   H1, ATP2 and Timed Load replay happens after source selection.
6. Existing structural replay guards remain in force. A deletion or date
   move that makes cycle chronology or frozen deload invalid yields
   INCOMPATIBLE with original evidence retained. There is no H1 reset.
7. The API now returns HTTP 428 h1-ancestry-required if an incoming
   canonical write modifies/deletes an EXISTING structural H1 workout
   without a matching CURRENT baseRev/baseWid. This blocks legacy clients
   that read a revision number but cannot prove which history they edited.
   Invalid tagged workouts with no adapter still fail HTTP 400.
8. Sync UI displays an actionable H1 review warning and navigates to
   Plan. Review remains explicit, without silent acceptance or discarding
   source branches.

## Test coverage

- frontend/src/lib/hybrid2-three-way.test.js: 5 synthetic revision ancestry
  cases (unilateral edit, two separate existing workout corrections,
  two-sided same-workout dispute, deletion+successor, date move+successor).
- frontend/src/store/useStore.hybrid2-ancestry.test.jsx: real store dirty
  GET/retry and rejection of mismatched witness write ID.
- frontend/src/components/SyncBanner.test.jsx: user-visible review action.
- api/test/two-device-engine-v2-adversarial-http.test.js: genuine
  isolated server PUT/409/GET, exact common ancestry, deterministic replay,
  explicit review, backend restart, wrong/missing write IDs, 428 legacy
  refusal, unrelated restored _wids branch and 503 on corrupt journal.
- Existing hybrid2-sync/history-conflict/session-edit and API/bootstrap
  regressions remain applicable. Full test logs are stored ONLY locally
  on Tower under:
  /mnt/cachedl/projects/openGym-validation/local-native-proof-20261111/

## Important limitations — NOT READY FOR PRODUCTION

- Bounded ancestry window: at most 64 digest snapshots, and only write IDs
  retained in current _wids (50). Beyond either limit an offline client
  must resolve explicitly; it must NEVER infer that LWW is safe.
- This protects automatic client merges using server-issued evidence and
  server rejection of writes without current revision IDs. It is NOT a
  tamper-proof per-operation authoring signature. A client knowingly sending
  the latest write ID can still submit a standalone replay-valid edit; do
  not claim cryptographically proven author intent or a complete event-sourced
  audit. Future work: authenticated per-H1-edit immutable receipts.
- The non-cryptographic digest is a change comparison, not proof of identity
  or source correctness. Native Liftosaur checkpoint authenticity is not
  inferred from it. Stronger hashes can be added before production.
- Distinct Native H1 checkpoint conflicts remain fail closed and require
  a dedicated server-compatible guided resolution process.
- Hardware Android workflow, connection loss after finish/save, media limits,
  app process death and full physical two-device tests are pending.
- Real future M6 native Liftosaur RTT differential (original H1, ATP2,
  36 warmups, INTRO, frozen deload/recovery, 29 custom exercises and
  equipment) is still outstanding. Synthetic tests must NOT be described as
  original Liftosaur parity.
- The prior independent full frontend run reported 2 unrelated failing
  tests (pt-BR locale fingerprint; generic warmup rounding fallback). Do
  not silently mark them green or modify them as part of this H1 package.

## Safe migration preflight (not executed)

Freeze all active clients at a verified cutover, list offline devices, take
immutable read-only original Liftosaur backup and validate its SHA-256. Create
an isolated openGym staging profile, import only reviewed adapter/native H1
anchors, verify all workout/exercise/side/warmup/equipment identities, replay
the full actual future M6 schedule in both runtimes, confirm complete tests
including offline conflict UX, then prepare a documented rollback to untouched
Liftosaur. Obtain separate user authorization before touching the live account
or merging validation into main.

## Verified regression outcome

On the current validation checkout after implementation:

- Full API: 1092 tests, **1089 PASS / 0 FAIL / 3 SKIP**.
- Focused frontend (H1, sync, store, connection UX): **450 PASS / 0 FAIL**
  across 37 test files.
- Vite build: PASS. Unrelated chunk size/dynamic-import warnings remain.
- git diff --check: PASS.
- Previous full frontend regression from the preceding package was
  8368 PASS / 2 FAIL (pt-BR locale inheritance fingerprint and generic
  warmup fallback). This continuation did not rerun all 8370 tests and
  does not claim those two separate failures are resolved.

Private logs:
  /mnt/cachedl/projects/openGym-validation/local-native-proof-20261111/
  h2-ancestry-api-final.log
  h2-ancestry-frontend-final.log
  h2-ancestry-build-final.log
