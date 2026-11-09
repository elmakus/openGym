# ATP2-BOOK — experimental openGym Engine v2 integration

Experimental proof of concept based on `integration/engine-v2`. It does **not**
change `main`, and no production profiles or deployments were modified.

## Behavioural contract

**Liftosaur is the source of truth**: the controller must produce the same
decisions and state transitions for the same input, equipment ladder, and
completed-set sequence. UI and storage formats can differ.

Authoritative references in `elmakus/fitness`:

- `programs/adaptive_rep_engine_turbo_probe_candidate.liftoscript`
- `decisions/ATP_UPWARD_BOOK_TURBO.md`
- `decisions/ATP_DOWNWARD_AUTOREGULATION.md`
- `decisions/ATP2_BOOK_HARDENING.md`
- `tests/oracle/test_atp2_book_oracle.py`

The reducer intentionally preserves both the **update** decision for the
remaining sets and the separate **progress** decision for the next exposure.
There is no arbitrary Turbo cap or substitute linear progression.

## Enable the experiment

In a routine, open a supported loaded repetition-based exercise with a
`manual` or `linear` rule. Open **Progression**, then enable
**ATP2-BOOK (experimental)** and set **Minimum native load**.

The exercise needs a positive absolute load, fixed number of work sets,
and a usable repetition range. Side-specific pairs use the per-side range.
Equipment configuration controls the native available load ladder.

ATP2-owned work sets start at **1 rep as the no-result sentinel**; enter the
actual repetitions before marking the set done. This follows the accepted
Liftosaur behaviour, not openGym's usual prefilled-repetition behaviour.
Ordinary exercises stay on Engine v2.

## Implemented

- Opt-in per-routine-occurrence configuration.
- Native-load mapping, manual conservative override, exact-MAX next-exposure
  behaviour, first-set downward autoregulation, and chained Turbo.
- Recalculation after a set is ticked, unticked, or a logged result is corrected.
- Unilateral paired observation handling and 1-rep sentinel.
- Separate persisted `trainingControl.atp2` state.
- Per-exposure ATP2 input snapshot for historical replay.
- Exclusion of ATP2 logs from default Engine v2 progression replay.
- Deterministic replay of the ATP2 controller after profile sync merge.
- Immediate ATP2 replay after local saved-workout editing, deletion, date relocation
  and historical backfill, without resetting unrelated Engine v2 progression.
- Unit conversion of ATP2 candidate, floor, and equipment ladder metadata.
- Frontend production build and dedicated controller/bridge/integration tests.

## Verification commands

From the repository root:

```sh
node --test api/training-control/*.test.mjs
cd frontend
npx vitest run src/lib/atp2-session.test.mjs src/lib/atp2-integration.test.js
npm run build
```

## Direct comparison with Liftosaur (2026-11-09)

The original candidate source is verified by Git blob SHA
`4d6452c2dd2a2ddd45f8b8d653d4ebcf3c37e170`.
The supplied frozen Liftosaur Playground runtime identifies as
`ce75750bde4a190682fb5a6fa1984fc9184a9842`.

A true differential run used both the original Liftoscript custom() bodies
and the openGym ATP2 reducer with identical completed working sets.
It compared remaining-set load after each completion, and next-exposure
`candidate` / `probeActive` after finishing. Result: **672/672 PASS**,
including 500 deterministic seeded scenarios. No divergence in tested cases.

The run used an explicit 5–30 kg native cable-equipment ladder, rep targets
8–12, unilateral=false, and up to three working sets. The test intentionally
changes only the original fixture's input parameters. Liftosaur omits a
zero-valued `probeActive` from serialized text; the test interprets its
absence as zero, matching the controller default.

The reproducible runner is `api/training-control/atp2-liftosaur-parity.mjs`:

```sh
node api/training-control/atp2-liftosaur-parity.mjs \
  /path/to/liftosaur-playground-runtime/runtime_api.cjs \
  /path/to/fitness/programs/adaptive_rep_engine_turbo_probe_candidate.liftoscript
```

The runtime and original source are supplied externally, not vendored into
openGym. The script refuses an unpinned source file.

This is **direct runtime evidence for covered scenarios**, not proof for all
possible equipment ladders, paired inputs, history ordering or device flows.

## Limitations and next work

- No real Android/app interactive workout acceptance test yet.
- Differential runtime comparison still needs alternative native ladders,
  paired/unilateral observations, longer multi-session state transitions,
  and further adverse input coverage.
- Local edit/delete/date/backfill replay and representative two-device merge cases
  have tests. Production sync races, incomplete migrations and actual offline-device
  round trips still need independent validation.
- No Timed Load, HYBRID-2, or RTT integration yet.
- This is not ready for live athlete profiles or production deployment.

Do not merge into `main` or connect to live synced training accounts
until after independent safety validation.
