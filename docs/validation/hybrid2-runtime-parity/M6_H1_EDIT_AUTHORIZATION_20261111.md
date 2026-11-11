# M6 HYBRID-2 / Existing H1 edits — server-signed authorization and audit

Date: 2026-11-11. Continuation from
e30266b44d15818489eabc75a28caf12c785efca.
All code, tests and network requests are confined to the validation branch
and synthetic isolated backend. No changes to active Liftosaur, real M6 source
data, production user files, deployment or main are authorized.

## Threat / reproduced gap

The earlier server revision ancestry protocol blocked legacy writers without
exact baseRev/baseWid, but an authenticated client that knew the latest
server write ID could still replace an existing, individually replay-valid
H1 workout without a separate review step. Preserving the work's structural
validity does not establish that the athlete meant to correct previous reps
or unilateral sides. A 409 resolved without a structural clash may still
carry such an offline correction.

## Protocol implemented

- api/training-control/hybrid2/edit-authority.js computes the EXACT changed
  set of previously saved structural workouts, using deterministic SHA-256
  hashes over the H1 evidence (date/start/end, H1 tags, complete exposure
  and performance rows). Workout notes and media are not considered H1
  training evidence. New workout IDs are normal fresh logs and do not
  require retrospective edit authorization.
- Authenticated POST /api/data/h1-authorize with an explicit PREVIEW
  request returns affected workout IDs and before/after SHA-256 evidence
  hashes, **without issuing a token**. The Android/web UI displays the
  exact IDs and a confirmation prompt before requesting authorization.
- A separate explicit APPROVE request, against the exact current
  server baseRev/baseWid, returns an HMAC-SHA256 server-signed token
  bound to uid, current session version, revision, write-id, full SHA-256
  changed set, random nonce and five-minute validity window. Authorization
  does not modify the stored profile. A stale/changed server revision
  refuses the approval with 409.
- PUT /api/data continues requiring the exact current baseRev/baseWid
  for edits to already saved H1 evidence. Without a valid approval token
  it now refuses with HTTP 428 h1-approval-required. Invalid tokens,
  changed H1 results, different sessions or forked revisions fail closed.
  A genuine conflicting 409 still uses ancestry/explicit review first.
- The token is used ONLY for the immediate explicitly requested PUT; no
  localStorage persistence, silent API approval, background token renewal
  or reuse after 409 retry. A change occurring after review selection
  invalidates the expected workout-ID set and forces a fresh review.
- On a successful PUT the API appends a **server-owned HMAC-chained receipt**
  describing the exact changed IDs, old/new SHA-256 digests, approved
  session, source and target revision+wid, nonce and approval/commit times.
  The receipt list is stored in the same atomic canonical profile write
  as the approved H1 evidence (server internal _h1Receipts). GET /api/data
  strips server-only receipts before sending a client profile; user-
  supplied receipts are ignored and cannot remove earlier receipts.
  Subsequent writes validate the full signature chain; corruption
  causes HTTP 503 h1-receipt-unavailable even for unrelated settings.
- APPROVE responses also return the exact SHA-256 old/new change set
  originally seen in PREVIEW. The frontend compares IDs and digests after
  authorisation, so changing even the SAME workout ID between preview
  and approval aborts the PUT and requires a fresh review.
- The verified receipt chain is also reconciled to the latest approved
  workout's CURRENT structural evidence; a tampered state file containing
  unchanged valid HMAC receipts but modified H1 rows is refused on both
  GET and PUT with HTTP 503, rather than being offered to an offline client.
  This detects unsanctioned edits to existing approved events and does
  not claim a full cross-revision WORM audit.
- The server replays frozen H1 constraints and re-evaluates the exact
  approved change set AFTER stampPut, so any structural rewrites introduced
  by legacy stamp/merge repair also fail closed.
- Mobile CORS OPTIONS now allows X-OpenGym-H1-Base-Rev and
  X-OpenGym-H1-Base-Wid so the revision ancestry GET also works from
  paired Android WebView origins.

## Adversarial validation

- api/test/hybrid2-edit-authority.test.js verifies per-workout edits vs
  new logs/notes, signed token binding, subject/session/revision/write-id,
  changed evidence, expiry, signature mutation, deletion, chained
  receipts and tampering.
- api/test/two-device-engine-v2-adversarial-http.test.js covers the
  true isolated authenticated HTTP flow: preview without token,
  unapproved valid H1 PUT=428, forged token=428, approved write accepted,
  receipt not exposed by GET, original audit survives backend restart,
  409 full source conflict, corrected unrevised existing sets,
  stale device branch, Android CORS preflight, corrupt audit chain=503,
  corrupt ancestor journal=503 and preserved current revision.
- frontend/src/store/useStore.hybrid2-ancestry.test.jsx exercises the
  live store: no automatic authorization on failed push, explicit
  preview before write, matching-ID and matching-SHA256-evidence
  confirmation, one PUT carrying token, no token reuse on next push.
- api/test/openapi-routes.test.js verifies the newly published documented
  H1 authorisation route and the GET/PUT status/request fields.

## Limitations / safety gates — NOT READY FOR PRODUCTION

This is an *authenticated session and explicit app-UI approval protocol*,
NOT WebAuthn-backed proof that a specific human pressed Confirm. A stolen
active account session or malicious same-origin JavaScript can request
a preview and token. Stronger author intent needs device-key-based step-up
and an explicit account reauthentication design.

HMAC receipts are tamper-evident and server-owned, but the profile JSON
is NOT an independent append-only/WORM log. A full authorized storage
rollback can restore an older valid receipt prefix and matching profile.
Independent audit anchoring, backup-aware rollback detection and
longer-lived secure archives remain needed for production.

The earlier 64-snapshot SHA comparison journal remains an independent
mechanism for offline 3-way merges. It uses FNV-1a-64 and does not prove
source-native truth. There is no multi-device physical Android scenario
in these tests, no production cutover or separate Native H1 checkpoint
conflict approval. Full future M6 Liftosaur RTT differential, warmups,
INTRO, frozen deload/recovery and equipment parity are still required.

Never treat approval as permission to fabricate training evidence: the
frozen H1 replay and imported native source checkpoint remain mandatory.
Separate user authorization is required before any actual migration.

## Regression and independent review notes

Synthetic isolated H1 HTTP adversarial tests: 2 PASS, including original
two-device review and new receipt source tampering, GET/PUT fail-closed,
backend restart, wrong/missing approval, CORS and unrelated server branch.
Pure authority tests: 4 PASS. OpenAPI route tests: 4 PASS.
Focused sync/UX frontend regression: 452 PASS / 0 FAIL across 37 files.
Frontend full suite: 8378 PASS / 2 FAIL, 706 files; both failures are
independently pre-existing: pt-BR inherited translation review fingerprint
and generic warmup missing-step rounding. The new HYBRID-2 tests passed.
Vite build: PASS with pre-existing dynamic import warnings. The full API final rerun passed: 1096 tests = 1093 PASS /
0 FAIL / 3 SKIP; totals are also in STATUS.md.

An intermittent security test failure was due to its attempted replacement
of the last signature character with 'A' being a no-op when the randomly
generated signature already ended in 'A'. The test now always chooses a
different character. No production token validation code was changed for
this test-only fix.

All logs are private under:
  /mnt/cachedl/projects/openGym-validation/local-native-proof-20261111/
  h2-signed-approval-api-final-rerun.log
  h2-signed-approval-frontend-focus.log
  h2-edit-authority-frontend-full.log
  h2-signed-approval-build.log

No live or physical Android dual-device check was run. No original
Liftosaur future M6 source-native differential was run. These are
remaining release blockers.
