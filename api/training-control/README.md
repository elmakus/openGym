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

The original Liftosaur oracle vectors have been translated into JavaScript
acceptance tests; they have **not** been executed through the original
Liftosaur runtime as part of this openGym integration.

## Limitations and next work

- No real Android/app interactive workout acceptance test yet.
- No independent differential test of every state against the pinned
  Liftosaur runtime; passing golden vectors is not a full parity proof.
- Full edit-history/backfill, sync race, cross-device and unit-switch edge
  conditions still need adversarial verification.
- No Timed Load, HYBRID-2, or RTT integration yet.
- This is not ready for live athlete profiles or production deployment.

Do not merge into `main` or connect to live synced training accounts
until after independent safety validation.
