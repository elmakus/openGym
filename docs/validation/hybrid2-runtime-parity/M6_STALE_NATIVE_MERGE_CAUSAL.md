# M6 stale shared H1 reanimation — pinned native finish-day merge causal proof

2026-11-10. **ROOT CAUSE CONFIRMED / test-only native merge overlay PASS**. Do not change or deploy the reference Liftosaur runtime; original frozen source remains RED.

## Frozen inputs / safety
- GitHub validation parent: `93eb7e5d41641343896fa7b94e2249b5e1f006b5` (same tree as local detached `90ddc7deb8ceb20d1f00fcf07d04db788d445090`).
- openGym production `8529b2d41b28fea8ae96a50325aaf28e864a0160`; fitness `9f2deb6c345643d7c0c793c52d358e496c2710d2`; Liftosaur `ce75750bde4a190682fb5a6fa1984fc9184a9842`.
- Read-only M6 ID `qtwbbqff`, source SHA-256 `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`.
- Inputs and detailed output remain in `/tmp/hybrid2-runtime-parity-20261109/private-live` and `evidence`; frozen original equipment fixture, **not live gym settings**. No Liftosaur account, real history, or app writes.
- The 29-occurrence RTT+Adaptive fusion is copied in-process from the already validated seam. It is **not** a production patch.

## Exact original native source mechanism

1. `Program_runAllFinishDayScripts` in `src/models/program.ts` **force-evaluates once** and iterates `progress.entries` in workout entry order (not API command completion order).
2. `Program_runFinishDayScript` uses each exercise's current `progress.state` as local state and `ObjectUtils_clone(program.states)` for `otherStates`. `program.states` is assembled during evaluation from tagged exercise states in `Program_buildEvaluatedProgram`, and does not get refreshed by the loop's later `PP_iterate2` write-through.
3. The first day-A H1 anchor on stale rollover broadcasts global six-tag zeros through `otherStates`. `diffOtherStates` carries the zero fields; `PP_iterate2` applies those fields to every exercise with the matching tag. Thus anchor 2's **current** local `progress.state.perfCount` becomes zero.
4. The second anchor retains a pre-workout `entry.state.perfCount=3`. Its `stateDiff.perfCount` and `otherStates[92002].perfCount` are both absent (no new diff). The native loop applies
   `{ ...exercise.progress.state, ...entry.state, ...state }`, restoring the stale 3 **after** the first anchor's global reset. Five performance fields reanimate, not just a display artifact.
5. Serializing the evaluated planner preserves this reanimated canonical `state[92002]`. Reversing the `complete_set` command order did not reverse the native progress-entry order; anchor 1 still ran before anchor 2.

### Instrumented event at the second anchor

| Native event | original | reordered merge overlay |
|---|---:|---:|
| `newEvaluatedProgram.states[92002].perfCount` snapshot | 3 | 3 |
| Current local `progress.state.perfCount` | 0 | 0 |
| Pre-workout `entry.state.perfCount` | 3 | 3 |
| Native `stateDiff.perfCount` | absent | absent |
| Native `otherStates[92002].perfCount` diff | absent | absent |
| After local merge | **3** | **0** |

The overlay **does not simulate the runtime**: a pre-compilation hook makes precisely one isolated substitution inside the transpiled `program.ts`, leaving the original Playground, scripts, progression and serializing machinery intact:

```diff
- exercise.progress.state = { ...exercise.progress.state, ...entry.state, ...state }
+ exercise.progress.state = { ...entry.state, ...exercise.progress.state, ...state }
```

## Real native results (selected runs; no rerun double counting)

| test | actual `finish_workout()` | assertions | unexpected RED |
|---|---:|---:|---:|
| Frozen original runtime, minimal day A + four isolated controls | 5 | 178 | **10** |
| Same pinned code with one-line in-memory merge-order overlay | 5 | 178 | **0** |
| Previous full fused RTT suite on one-line overlay | 29 | 688 | **0** |

The last suite additionally made 48 direct native set-access probes. Its 29 genuine workouts include NORMAL/INTRO A/B/C comparison, full deload A/B/C, synthetic stale day A/B, exact tag reset after two day-A shared anchors, and three A/B/C post-deload H1 relearning cycles. Turbo-specific additional multi-set behavior and natural stale transitions are **not** established by that suite.

The original-reference 10 RED entries are five nonzero H1 fields for slot 2 in each of the two completed-both conditions, **not ten distinct root causes**. First-only and second-only both reset all six tags in the original. Command-order reversal leaves the underlying `progress.entries` order unchanged.

## Evidence and reproduction

- [Sanitized paired minimal native causal trace](m6-stale-merge-causal-sanitized.json): entry index, anchor ID, canonical/local/entry/diff count, post-merge values, zero/nonzero H1 fields. No actual user weights.
- [Sanitized full fused overlay regression](rtt-fused-native-merge-overlay-sanitized.json).
- [Native minimal tracer](../../../../scripts/hybrid2-runtime-parity/run-m6-stale-native-merge-probe.mjs) uses original transpiled TypeScript, not a mock.
- [One-line isolated overlay](../../../../scripts/hybrid2-runtime-parity/native-finishday-merge-overlay.mjs).

```sh
cd /tmp/hybrid2-runtime-parity-20261109/validation-checkout
export FITNESS_ROOT=/tmp/hybrid2-runtime-parity-20261109/fitness
export LIFTOSAUR_RUNTIME_ROOT=/tmp/hybrid2-runtime-parity-20261109/liftosaur
export PRIVATE_LIVE_ROOT=/tmp/hybrid2-runtime-parity-20261109/private-live
export H2_PARITY_OUT=/tmp/hybrid2-runtime-parity-20261109/evidence
node scripts/hybrid2-runtime-parity/run-m6-stale-native-merge-probe.mjs reference # intentional RED
node scripts/hybrid2-runtime-parity/run-m6-stale-native-merge-probe.mjs current-state-wins # isolated PASS
node --import ./scripts/hybrid2-runtime-parity/native-finishday-merge-overlay.mjs scripts/hybrid2-runtime-parity/run-current-marta-rtt-fused.mjs
```

**Classification:** pinned Liftosaur finish-day stale-entry merge/propagation architecture; the M6 source creates the triggering shared rollover transaction, but the platform merge reanimates a prior local snapshot. This does not establish a standalone openGym history-implementation defect. The overlay is a causal proof, not authorization for a runtime deployment; any general-purpose reorder requires regressions for all native `entry.state` semantics.
