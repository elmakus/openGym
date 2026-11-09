# HYBRID-2 — Engine v2 integration and audit contract

Status: **implementation candidate for independent adversarial review**, not a production release.

## Pinned provenance

- Target repository: [elmakus/openGym](https://github.com/elmakus/openGym)
- Base branch: `feature/timed-load-engine-v2`
- Base commit (verified against remote): `140c5fc69ddfbc04d5076517d877247bbd242e77`
- Implementation branch: `feature/hybrid-2-engine-v2`; no merge into other branches
- Source repository: [elmakus/fitness](https://github.com/elmakus/fitness)
- **Exact source commit:** `9f2deb6c345643d7c0c793c52d358e496c2710d2`
- Source policies: `decisions/HYBRID_2_UNIVERSAL_CONTROLLER.md`,
  `decisions/HYBRID_2_POST_DELOAD_RELEARN.md`,
  `decisions/HYBRID_2_PERFORMANCE_REFERENCE.md`,
  `decisions/HYBRID_2_VALIDATION_SCOPE.md`,
  `decisions/H2M03_T04_H1_RESET_PROPAGATION_CORRECTIVE.md`;
  `requirements/HYBRID_2_REQUIREMENTS.md`,
  `requirements/HYBRID_2_UNIVERSAL_ADAPTER_REQUIREMENTS.md`,
  `planning/HYBRID_2_DESIGN_FREEZE.md`,
  `implementation/milestones/HYBRID-2.md`,
  `docs/project-context/shared/HYBRID_2_PLAN_ADAPTER_GUIDE.md`,
  `implementation/contracts/RTT_HYBRID2_RECOVERY_CONTRACT.md`.
- Source algorithm modules: `programs/hybrid2_trigger_core.py`,
  `hybrid2_controller_state.py`, `hybrid2_state_integration.py`,
  `hybrid2_plan_adapter.py`, `hybrid2_runtime_bridge.py`,
  `hybrid2_promotion_state_transition.py`,
  `hybrid2_performance_reference_materializer.py`,
  `hybrid2_liftosaur_codegen.py`, `hybrid2_h1_reset_codegen.py`.
- Source oracle: `tests/oracle/hybrid2_performance_reference_oracle.py`;
  deterministic fixtures generated directly from that pinned Python source
  (SHA-256 `65c6539e9ebc7e4ec9832e20591a8693130e564da88238f81052f7c63fca8e58`).

Source historical docs do not override later accepted decisions.

## Responsibility boundaries

| Component | Responsibility |
| --- | --- |
| `api/training-control/hybrid2/h1.js` | `H1-EPL-1` loaded-reps performance; `H1-ASYM-M3-1` asymmetric three-sample reference; pre-update weak classification; candidate guard and discontinuity. |
| `adapter.js` | Strict Static Plan Adapter schema; topology, occurrence binding, system groups, thresholds, identity safety and immutable adapter fingerprint. |
| `trigger.js` | Signal evaluability, cross-system confirmation, broad/fast/slow trigger and structural-cycle streak. |
| `lifecycle.js` | Queued, started, active, closed and stale rollover; deload budget and permission policy. |
| `controller.js` | Versioned `HYBRID-STATE-2` H1-only state; signal windows, reset and relearning. |
| `observation.js` | First completed loaded-reps set, physical unit conversion, actual ATP2 candidate delta and Engine v2 progression evidence. |
| `history.js` | Deterministic replay from chronological completed workouts, versioned structural evidence and terminal closer; all-H1 reset. |
| `supervisor.js` | Deload prescription overlay, normal subordinate loads, execution permissions, binding to the active routine; future higher-priority supervisor hook. |
| `frontend/src/lib/hybrid2-sync.js` | Rebuild H1 from canonical workout evidence on edits/deletes/merges; reject concurrent incompatible adapter changes. |
| `frontend/src/components/Hybrid2Settings.jsx` | Explicit opt-in, reviewed JSON adapter assignment, validation and read-only diagnostics. |

**Controller hierarchy:** Static Plan Adapter → HYBRID-2 recovery supervisor → underlying ATP2 / Timed Load / Engine v2. The recovery supervisor **never computes subordinate candidate increases**. There is no RTT implementation.

**Versions:** controller `HYBRID-2`; state `HYBRID-STATE-2`; performance `H1-EPL-1`; reference `H1-ASYM-M3-1`.

## H1 contract

For an eligible completed loaded-reps working set in NORMAL mode:

```
performance = weight_kg * (1 + reps / 30)
first 3 comparable NORMAL samples -> perfReference = median(first3)
weak = performance <= 0.95 * reference_before_current_update
M = median(last3)
newReference = reference + (M > reference ? 0.40 : M < reference ? 0.10 : 0) * (M - reference)
```

The three learning observations produce no weak vote. Candidate guard is armed **only by a real positive change in the subordinate progression candidate**, and suppresses the next otherwise eligible vote. Missing or invalid samples do not fabricate votes. A comparable load discontinuity resets that signal. There is **no `calculate1RM()` substitution**. Timed Load and isometric exercise classes are not eligible for the loaded-reps H1 metric; their own progression remains separate.

Normal H1 samples are generated from the first completed loaded-reps working set, with physically comparable external load. Provenance and units are explicit. A candidate is taken from ATP2 replay or native Engine replay, not inferred from repetitions. No deload sample enters H1 learning.

## Static Plan Adapter contract and activation

HYBRID-2 is **disabled by default**. Users must explicitly assign a reviewed adapter via **Plan → HYBRID-2 recovery controller → Assign reviewed Static Plan Adapter**, then explicitly enable it. No actual routine, program or historical workout is modified by adapter assignment.

Versioned adapter JSON specifies: `controllerTag`, `namespace`, `planVersion`,
`segmentationMode: "STATIC_ORDERED"`, `controllerPersistence: "HYBRID-WRITE-THROUGH-1"`,
`comparabilityStatus`, `orderedCyclePositions`, `cycleStartPosition`,
`closerOccurrence`, `occurrences`, `signals`, `thresholds`, `zeroOverrides`.
Every occurrence has a stable `occurrenceId`, exact `routineId`, `cyclePosition`,
`progressionIdentity` or null, `optional`, `controllerTagged`, and `canRaiseCandidate`.
Every H1 signal includes unique `signalId`, `performanceIdentity`, `progressionIdentity`,
`occurrence`, `cyclePosition`, `systemGroup`, `signalClass: "LOADED_REPS"`, and an explicitly reviewed `candidateChangeVisibility`.
Threshold keys are `minValidSignals`, `broadWeakMin`, `fastWeakMin`,
`slowBroadCycles`, `weakRatio: 0.95`.

Validated adapters bind by stable IDs and **exact exercise occurrence order**, not name, weekday or inferred muscle group. Each structural slot must resolve to one existing routine; the final closer must be guaranteed, non-optional, controller-tagged and the last occurrence. A wrong signal class, missing progression identity, mismatched group, ambiguous same-identity candidate writer, duplicate signal or unreachable threshold rejects the adapter.

No K5/M6/SYN4 fixture is automatically assigned to a real user. The reference test layouts model the five-signal / five-position K5 shape, six-signal / A→B→C M6 shape, and a synthetic U1→L1→U2→L2 topology. They are fixtures, not replacements for complete independently reviewed real workout adapters.

## Data, exact-once lifecycle and synchronisation

- Opt-in settings: `profile.trainingControl.hybrid2Config`; independent H1 cache: `profile.trainingControl.hybrid2`.
- Every HYBRID-2 exposure carries `hybrid2: {version,namespace,planVersion,adapterFingerprint,cyclePosition,progressionIdentity,signalId,signalClass,deloadFrozen,unit,...}`.
- Every completed HYBRID-2 workout carries a structural `hybrid2` event containing `version`, `controllerVersion`, `stateSchemaVersion`, `namespace`, `planVersion`, `adapterFingerprint` and `positions`.
- The adapter fingerprint comes from canonical content hashing of all explicit adapter fields. Replay rejects a changed adapter with the same version and any mismatched structural event. Separate namespaces do not merge H1 epochs.
- H1 cache is **derived** from chronological completed workout evidence, not selected via last-write-wins when synchronizing offline devices. A cached H1 snapshot cannot restore an old reference. Divergent offline adapter configurations must be reviewed in the Settings UI.
- At a full standard deload closure with completed closer working sets, reset **all** configured H1 anchors and windows exactly once; resume LEARNING and seed three new NORMAL samples per signal. Queued-but-never-started deload does not reset. Active deload with stale rollover resets once and enters a guarded rollover path. Replaying the identical canonical history does not repeat a reset as a new transition.
- A deload is one structural cycle. Working sets are `ceil(original_sets / 2)` or an explicitly approved optional ZERO override. The regular subordinate candidate load is preserved, as are the current programmed non-H1 effort parameters.
- `excludedFromProgression` and `hybrid2.deloadFrozen` independently guard all three native progression replay paths, as well as live finish, derived 1RM records, personal records, best weights and last-session read-back. In-session downward safety work does not persist a new candidate. A maliciously edited frozen exposure without exclusion fails closed in HYBRID-2 replay.
- Completed workout deletion, edits, backfills, reordering, offline merges and unit conversions are represented by canonical workout evidence. H1 loads are normalized to kg; conversion updates the saved unit witness without copying stale reference state.

The code does **not** modify or copy ATP2, Timed Load or generic Engine state during a reset. Opaque future fields remain untouched. Further higher-priority RTT supervisory arbitration can be introduced at the existing permission/overlay seam, but no RTT detector, INTRO or re-entry algorithm exists here.

## Reproducible isolated checks

```sh
# From openGym root
cd api && npm ci && npm test
cd ../frontend && npm ci && npm test -- --run && npm run build
# From openGym root, targeted node tests:
node --test api/training-control/hybrid2-*.test.mjs
# From frontend:
npx vitest run src/lib/hybrid2-sync.test.js src/lib/hybrid2-integration.test.js

# Regenerate oracle fixtures against exactly fitness@9f2deb6c...:
python3 api/training-control/hybrid2/generate-oracle-fixtures.py \
  /path/to/pinned/fitness/tests/oracle/hybrid2_performance_reference_oracle.py \
  api/training-control/hybrid2/fixtures/h1-python-oracle.json
```

Frozen Python oracle fixture: **160 traces / 4,467 H1 transitions**. Its JS differential test verifies every resulting anchor, vote, guard, reset and reference-preupdate value. The original pinned Python oracle tests executed in isolation: **37 PASS**. The JS differential comparison is **Python-oracle parity only**.

**Not tested:** proprietary/real Liftosaur runtime execution, physical Android, real personal plans, production databases or live two-device server deployment. Those tests are deferred. No APK, release, migration, merge or production account change was performed.

## Reviewer attention and safe limits

1. This is a port of the accepted **controller policy**, not a byte-for-byte port of the Liftosaur script generator. The app's own prescription models and user-action semantics differ. Independently validate native runtime parity before using on real plans.
2. No validated performance contract exists for Timed Load/isometric H1; these exercises never produce loaded-reps H1 votes. Set-count intervention and freeze do not imply a new timed-performance metric.
3. A changed adapter with historical exposures in the same namespace cannot silently be treated as comparable. Version/fingerprint drift fails closed; review and explicit epoch/namespace transition is required, not provided by an automatic migration. Likewise, missing/reordered structural events reject replay.
4. The browser uses openGym's existing profile sync contract; there is **no separate authenticated HYBRID-2 HTTP Settings endpoint**. The feature is opt-in in the existing authenticated profile and sync flow.
5. Actual full source K5/M6 Liftosaur plans are **not bound** to live openGym routines. Fixture structural subsets do not constitute approval of the real plan translation. Complete production Static Plan Adapters require separate review.
6. Converted display units use the application's rounding policy, so exact floating-point normalized scores may differ slightly after a kg↔lb history conversion. The conversion retains physical units and does not intentionally start a new H1 epoch.
7. The deterministic reducer intentionally refuses incomplete/ambiguous structural histories or conflicting adapter edits rather than inventing a recovery decision. Resolve those records explicitly before activating on a new history.

## Explicit historical source-test discrepancy

On the pinned fitness source, the additional original test set
(test_h2m03_t04c_h1_reset_codegen.py, test_h2perf_t04_integrated.py,
test_h2m01_t01.py and test_h2m01_t02.py) returned **67 PASS / 1 FAIL**
plus **29 passing unittest subtests** after supplying its full fixture inputs.

The sole failure is test_h2m01_t01.py::H1LearningTests::test_seeded_reference_never_decreases.
It asserts that a seeded reference must remain exactly 100.0 even with successive
94, 93, 92 and 91 observations. The pinned production source implementation
actually returns 100.0, 99.4, 98.76 and 98.084, correctly following the
later-accepted **0.10 downward alpha** from H2PERF-DEC-001. Thus this is an
**obsolete test expectation incompatible with the accepted performance-reference
contract**, not a reason to replace H1 with a non-decreasing reference.

The current Python oracle test group (37 PASS), the pinned 4,467-transition
cross-language fixture and the openGym automated H1 tests apply the accepted
asymmetric policy. The older failure is recorded, not suppressed or
changed to force a green report.
