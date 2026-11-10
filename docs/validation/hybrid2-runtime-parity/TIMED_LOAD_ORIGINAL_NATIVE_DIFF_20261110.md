# Timed Load — original native Liftosaur vs openGym (2026-11-10)

**Verdict: PASS WITH LIMITS.** New, genuinely executed frozen original-Liftosaur `Playground_run` → `finish_workout()` → persistent `updatedProgramText` comparisons against the existing openGym `evaluateTimedLoad` reducer. No Timed Load production algorithm changes and no account writes.

## Frozen provenance

- Original source: `elmakus/fitness@9f2deb6c345643d7c0c793c52d358e496c2710d2`, `programs/timed_load_side_plank_candidate.liftoscript` (blob `48136e1756e9fa1e245bbe3036872525aa1647ee`, SHA-256 `9b6a10c60c8d53888ade21f60640e4baee03bb8a0ed3b9637e31f82543799218`). Original script is externally loaded; its text is NOT committed or edited.
- Genuine frozen runtime: `ce75750bde4a190682fb5a6fa1984fc9184a9842` (not a Python-oracle or synthesized Liftoscript substitute).
- Existing openGym implementation: `api/training-control/timed-load.js` and its frozen `SIDE_PLANK_TIMED_CONFIG` native kg ladder.
- Controlled **in-memory** native gym setup: fixed dumbbell list matches the actual original Side Plank controller ladder `[0, 1, 2, ... 10, 12.5, ..., 30] kg`. This is necessary because unmodified stock Liftosaur gym has a 5 kg dumbbell bar/minimum: otherwise a source starting at `0kg` is *physically calibrated* to 5 kg and a naive 0 kg initial-state comparison is invalid. This does not claim the real athlete has this equipment configuration.

## Selected genuine native workload

- **17 actual serial native workouts** (each calls `Playground_run` with two completed native `1|1` logical Side Plank sets and `finish_workout`, then reloads the exact `updatedProgramText` for the next workout).
- **272 exact state-field comparisons, 0 discrepancies**: each of 17 steps checks 8 state fields both before and after the native session, using unmodified openGym `evaluateTimedLoad` and the same fixture ladder. Checks cover: initialized, load, target seconds, failure counter, new/established load provenance, emergency mode, bridge target and bridge provenance.
- Transition reasons exercised: initial load calibration, normal time increases, top-time weight promotion, first failure, new-load emergency, emergency failure load bridge, successful return to a remembered load, and second failure decreasing the time target.
- **No tolerance-based fudging**; compared canonical numeric and Boolean state fields exactly. Controlled sessions use matching first-set completion and the Playground's native `change_set_time` on each logical set. The openGym row projection uses the original native fixture's unchanged 60-second opposite-side timer and the commanded timer. It does not claim to vary both independent sides in the original native runtime.
- Original pinned source script remains byte-identical on disk. Only disposable evidence in the isolated validation directory. Sanitized state/transition trace `timed-load-original-native-sanitized.json` is derived from source-only synthetic workouts; no account data or private equipment snapshots appear.

## Reproduce

```sh
cd <openGym-validation-checkout>
LIFTOSAUR_RUNTIME_ROOT=<pinned-original-runtime-directory> \
TIMED_LOAD_ORIGINAL_SOURCE=<unchanged-fitness-original-side-plank-script> \
H2_PARITY_OUT=<isolated-disposable-output-directory> \
node scripts/hybrid2-runtime-parity/run-timed-load-original-native.mjs
```

Expected `PASS_WITH_LIMITS`, 17 genuine native workouts, 272/272 state comparisons, zero differences. The runner refuses an unknown original source or native runtime SHA/commit. Source text and private program data are not written into the public repository.

## Outstanding before full parity

This is **standalone Side Plank original-native controller parity under one matched synthetic equipment configuration**, not a current M6 program/full 36 exercises, true per-limb independent timer equivalence, live athlete equipment validation, HTTP persistence, offline device sync, shared identity interaction, RTT/deload composition or full lifetime performance. Existing separate real HTTP Timed Load/Python-oracle test covers persistence and editing but is not a substitute for native Liftosaur comparison. The unchanged original M6 RTT-local update shadowing remains RED until corrected source is deployed. Do not merge this checkpoint into production or claim the full algorithm portfolio is 1:1.
