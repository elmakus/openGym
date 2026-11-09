# Current M6 RTT non-destructive update fusion — original native runtime test (2026-11-10)

## Verdict

**PARTIAL / RED — not a production fix.** A private in-memory composition that executes the **original inherited Adaptive `update` only in RTT NORMAL/DELOAD**, and retains the **unchanged occurrence-local RTT `update` in RTT INTRO**, passes the tested NORMAL, INTRO, deload and post-deload H1 cases. It does **not** meet the stale-rollover exact-once requirement when two shared-tag H1 anchor occurrences run on the same day. The original unmodified M6 remains RED at queue→deload as in [previous causal proof](M6_RTT_UPDATE_SHADOW_CAUSAL.md).

## Provenance and isolation

- Current actual M6 source retrieved read-only: `qtwbbqff`, SHA-256 `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`.
- Serialized source after the original four-cycle native queue: SHA-256 `b1f481de1385292b63ae12d7873c37f386e5f521c4807b89bfa503c8ddaa89e5`.
- Frozen original fitness: `9f2deb6c345643d7c0c793c52d358e496c2710d2`; original Liftosaur: `ce75750bde4a190682fb5a6fa1984fc9184a9842`; openGym production base: `8529b2d41b28fea8ae96a50325aaf28e864a0160`.
- Frozen original Marta baseline equipment settings, **NOT live gym settings**.
- Template Adaptive update SHA-256 `5ff793946b549a2d9fd9280aaa98b379acdfc8530679da624e63f128345fe6c0`.
- Scratch fused current source SHA-256 `435865f44eed0c8d27ace9e9d45d11633df15897ff20328f92cb0d04890427f2`; queued fused source `b4b52dbfbb8dbbc94ddc1e1f18a1e268967b65ab597b8e88db98bcfcf4418583`.
- The source strings are composed **only in process memory**. No active Liftosaur program, history, settings, branch outside validation, or application code was written.

## The experimental seam

The actual M6 contains 29 per-occurrence RTT local `update: custom()` overrides, which shadow the inherited Adaptive template `update`. Removing all 29 restores deload but loses RTT INTRO. Simply prepending the full Adaptive update unconditionally was tested and **REJECTED**: native `change_reps(1,2,10)` after completing the first set was accepted by the original RTT INTRO but rejected by the naive unconditional composite on all A/B/C days. That negative observation is not a reason to modify expected values.

The bounded **validation-only** construction preserves each original local RTT block and wraps the original Adaptive update with `if (var.rttMode != 2)`. This prevents Adaptive INTRO's one-set default from interfering with the occurrence-specific RTT INTRO set count. The source-generation code does not alter either original algorithm body, only the controlled dispatch seam. The resulting source still needs a maintainable, reviewed production design; copying a large template block 29 times is not a recommended deployment architecture.

## Selected final native execution (reruns NOT added)

**29 native `finish_workout()` executions / 48 direct native set-access probes / 688 assertions / 20 RED field entries.** This selected final trace alone is used for bookkeeping, not earlier debug runs of the same suite. All workouts use real `Playground_run`, `finish_workout`, `updatedProgramText` continuation and `PlannerProgram_evaluateText` + `Program_evaluate` readback.

| Case | Native finished workouts | Evidence |
|---|---:|---|
| NORMAL, original inherited Adaptive vs fused 29 local RTT blocks | 6 | 3-day A/B/C pairs: progression states, controller state, actual completed sets and supplementary targets match |
| INTRO, original local RTT vs fused mode-gated update | 6 | 3-day A/B/C pairs: state, completed sets and targets match; second set accepted both before and after completing first |
| Full queued M6 deload with RTT blocks preserved | 3 | A/B/C controller activation/completion; **36/36** out-of-deload-budget native set probes rejected across every executable occurrence; six H1 references/guards reset at closer; Adaptive candidates preserved |
| Post-deload native relearning vs openGym H1 | 9 | Three complete A/B/C cycles; six anchors sequentially `perfCount=1→2→3`, all compared H1 fields agree |
| Induced stale rollover after authentic deload day A | 2 | `rolloverClear=1→0`, activation clears but H1 slot 2 does not reset, RED |
| Isolated stale write-order negative controls | 3 | first-only and second-only reset all six H1 tags; completing first **then second** resurrects tag 92002 count 3, RED diagnostic |

### Stale rollover RED — two observations, one causal seam

In the **synthetic** stale scenario, a private copy is switched to RTT INTRO after real native deload day A, then rerun at day A to trigger the original unchanged `staleDeload` progress branch. The controller clears `deloadActive`, sets `rolloverClear=1`, and clears it on day B. Five H1 anchors are reset, but slot 2 remains at `perfCount=3`, both in the occurrence readback and canonical `state[92002]`. Five H1 fields fail on day A, remain nonzero on B, and canonical tag checks repeat those failures: **20 RED comparison entries, not 20 defects**.

To isolate write order, three more native `finish_workout` controls reused the exact same stale-source input. Completing only the first anchor resets all six canonical H1 tags to zero. Completing only the second anchor also resets all six. Completing the **first and then second** in one day resets five tags but leaves `state[92002].perfCount=3`. This supports an intra-workout stale snapshot/write-through ordering seam, not a math problem or a simple readback artifact. The scenario uses a deliberately changed RTT mode after an already-completed deload day, so classification remains **native original-progress conditional integration RED under a synthetic transition**, not independently demonstrated during normal real-account use.

### What remains unproven

1. The original M6 is still broken: successful scratch fusion does **not** fix the live source.
2. A maintainable, nonduplicating production composition of RTT and Adaptive is not designed or authorized.
3. Natural stale rollover and exact-once H1 reset across actual user workloads require broader source-backed coverage.
4. Full multiset Turbo and `candidateGuard` under RTT INTRO/DELOAD, true terminal closer, paired unilateral K5, live equipment settings, and openGym persisted-history/replay remain unfinished.
5. Original accepted H1 `21/22` repetitions vs openGym `INDETERMINATE` remains independent RED.

## Reproduction

```sh
cd /tmp/hybrid2-runtime-parity-20261109/validation-checkout
export FITNESS_ROOT=/tmp/hybrid2-runtime-parity-20261109/fitness
export LIFTOSAUR_RUNTIME_ROOT=/tmp/hybrid2-runtime-parity-20261109/liftosaur
export PRIVATE_LIVE_ROOT=/tmp/hybrid2-runtime-parity-20261109/private-live
export H2_PARITY_OUT=/tmp/hybrid2-runtime-parity-20261109/evidence
node scripts/hybrid2-runtime-parity/run-current-marta-rtt-fused.mjs
# EXPECTED INTENTIONAL RED: 29 native finished workouts, 48 set probes,
# 688 assertions, 20 stale-reset field entries, nonzero exit.
```

Published [sanitized native trace](rtt-fused-native-sanitized.json): SHA-256 `f3845f54cf9fc7aeefe718770be1ec93873b2e91fe094dad561708df8cd3fb40`. Runner SHA-256 `61ba8dca86f1abe45ff5fb89ec72a1a477e95de43d3abd34098438012319b814`. No original user Liftoscript, actual numeric training loads, history records, equipment settings, credentials, generated private sources, runtime artifacts or account writes are published.
