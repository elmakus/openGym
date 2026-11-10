# Current M6: single-template RTT/Adaptive composition and stale H1 source barrier

2026-11-10. **VALIDATION-ONLY SOURCE VARIANT: PASS under the unmodified original Liftosaur runtime**. No active source, fitness checkout, production openGym, stored workout, or deployment was changed. See [native merge root cause](M6_STALE_NATIVE_MERGE_CAUSAL.md). Original M6 remains broken at queue→deload and has NOT been deployed/fixed.

## Source provenance
- Original M6 ID `qtwbbqff`, SHA-256 `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`. Native serialized four-cycle queue source SHA-256 `b1f481de1385292b63ae12d7873c37f386e5f521c4807b89bfa503c8ddaa89e5`.
- Frozen original fitness `9f2deb6c345643d7c0c793c52d358e496c2710d2`; unmodified original Liftosaur `ce75750bde4a190682fb5a6fa1984fc9184a9842`; openGym production `8529b2d41b28fea8ae96a50325aaf28e864a0160`.
- Frozen Marta baseline equipment settings, **NOT verified current live gym equipment**.
- Original shared Adaptive template update body SHA-256 `5ff793946b549a2d9fd9280aaa98b379acdfc8530679da624e63f128345fe6c0`.
- Centralized variant unqueued/queued source SHA-256 `ae9319c54456b2dbad04d7fe0454d0d89cc31594cf3c4960f98498b940c3f225` / `696a374942633f7c3444125cd6d0fd04ed9f54f13bb0473a0edf83c561fa8e32`.
- Combined **source-only** centralization and stale barrier unqueued/queued SHA-256 `3903327e70dd638d13d8870cb128af03d6220321d98bb80447eaa37a37562f1c` / `64895b353253b738872b44959a40bd41f975d545c35158d619c65e7769b8b301`.
- Generated source strings, original private Liftoscripts, actual loads, workouts, settings and snapshots are intentionally **not committed**. SHA is a provenance fingerprint, not a public source dump.

## Maintainable RTT composition: ONE Adaptive template update

The existing current M6 has **29 local RTT `update: custom()` override bodies** in **13 set-shape patterns**, shadowing inherited Adaptive and breaking queue→deload. The earlier scratch fusion copied the full Adaptive update 29 times. Instead the [source-only centralized generator](../../../../scripts/hybrid2-runtime-parity/rtt-centralized-update-variant.mjs):

1. Retains the original full Adaptive template body **once**, under the `rttMode != 2` branch.
2. Routes RTT INTRO (`rttMode == 2`) through one tiny template dispatcher; only `setIndex == 0` may replace `numberOfSets`.
3. Extracts each of the 29 original local INTRO set-shape choices and stores three *numeric occurrence metadata fields* `rttIntroA/B/C` in that occurrence's progression declaration. This preserves all A/B/C and shared-identity variants without copying full algorithm bodies.
4. Removes 29 local `update: custom()` blocks. Does not edit the original Adaptive math, ATP2 decision logic, H1 scoring rules, candidateGuard behavior or original `progress` body.
5. Compares NORMAL and INTRO against their independently correct native original oracles; only the *new three metadata fields*, absent from the original program, are filtered from exact state equality comparisons. No original H1, controller, candidate, actual completed-set or target assertion is relaxed.

This is a **source-generation design candidate**, not a validated automated fitness-source migration or permission to edit the active M6.

## Additional H1 write-through barrier: source-only fix on original runtime

The [source-only H1 barrier](../../../../scripts/hybrid2-runtime-parity/h1-stale-barrier-variant.mjs) appends one guarded block to the inherited Adaptive **progress** script. It activates only when a day-A executing H1 anchor has `state.rolloverClear=1`, `deloadActive=0`, `deloadStarted=0`, and the day is in non-reduced stale shape. It writes zeros only to `state[92000 + state.anchorId]` for `perf1/2/3`, `perfCount`, `perfReference`, `candidateGuard`:

- The **first** executing anchor runs the original global six-tag stale reset once. The original `rolloverClear` and controller converge.
- A **later** anchor's local H1 state has already been cleared, but its `entry.state` is stale; the barrier deliberately reasserts **only that one anchor's** zero fields into its `otherStates` diff. Native finish-day applies the local stale entry and then the own-tag write-through, preventing reanimation.
- No second six-tag global sweep occurs. No H1 performance math is changed, and Adaptive candidate values remain untouched.
- The barrier reads only its own `state`. A **rejected negative design** tried reading `state[920].deloadActive` in `progress` and produced the original ScriptRunner error **'You cannot read from other exercises states, you can only write to them'**. That failed source candidate is intentionally not used.

## Selected real native test results

| Variant / engine | Real `finish_workout()` | Set probes | Assertions | RED |
|---|---:|---:|---:|---:|
| Earlier full fused update on test-only native merge-order overlay | 29 | 48 | 688 | 0 |
| Single-template RTT update on test-only native merge-order overlay | 29 | 48 | 688 | 0 |
| **Single-template RTT + H1 barrier, unmodified original runtime** | **29** | **48** | **688** | **0** |
| Original native, minimal two-anchor stale input, normal entry order | 5 | — | 178 | **10** |
| H1 source barrier, original native, normal entry order | 5 | — | 180 | 0 |
| Original native, **synthetically reversed** finish-day entry loop | 5 | — | 178 | **10** |
| H1 source barrier, **synthetically reversed** entry loop | 5 | — | 180 | 0 |

**Important bookkeeping:** these are selected independent experimental variants. Debug reruns (including an initial six-field metadata-only mismatch caused by the test comparator) are not added to previous overall workout/check totals. The reversed entry loop is deliberately modified **test instrumentation**, not a representation of stock native entry ordering. In stock native, reversing `complete_set` commands alone does not change `progress.entries` iteration order.

For `both-first-second` with stock order, instrumented original native emits six H1 reset tags in anchor 1, then no reset diff for anchor 2, which resurrects count 3. The source barrier emits six tags in anchor 1 and **only tag 92002** in anchor 2; six canonical H1 counts remain zero. Reversing the native finish-entry iteration reproduces the failure on **anchor 1** instead: the source-barrier version emits six global tags in anchor 2, followed by only **tag 92001** in anchor 1. Both orientations pass the explicit global-sweep-once + later-own-tag assertions.

The full 29-workout source-only test covers:
- NORMAL against native inherited Adaptive A/B/C; INTRO against original RTT-local A/B/C, including second-set access before and after the first completed set.
- Genuine queued→active deload A/B/C, reduced set shape across 36 probes, six H1 resets at the terminal closer and preserved Adaptive candidates.
- Synthetic stale rollover A/B after a **real** deload-start day A: `deloadActive=0`, `rolloverClear=1→0`, six persistent H1 fields reset across all canonical tags.
- First-only, second-only, both-executed shared H1 anchor controls.
- Three native A/B/C post-deload relearning cycles with H1 `perfCount=1→2→3`, compared with actual openGym H1 reducers.

## Reproduce on authorized isolated machine

```sh
cd /tmp/hybrid2-runtime-parity-20261109/validation-checkout
export FITNESS_ROOT=/tmp/hybrid2-runtime-parity-20261109/fitness
export LIFTOSAUR_RUNTIME_ROOT=/tmp/hybrid2-runtime-parity-20261109/liftosaur
export PRIVATE_LIVE_ROOT=/tmp/hybrid2-runtime-parity-20261109/private-live
export H2_PARITY_OUT=/tmp/hybrid2-runtime-parity-20261109/evidence
node scripts/hybrid2-runtime-parity/run-current-marta-rtt-source-fixed.mjs
node scripts/hybrid2-runtime-parity/run-m6-stale-native-merge-probe.mjs source-barrier
node scripts/hybrid2-runtime-parity/run-m6-stale-native-merge-probe.mjs source-barrier-entry-reversed
# reference negative controls remain RED:
node scripts/hybrid2-runtime-parity/run-m6-stale-native-merge-probe.mjs reference
node scripts/hybrid2-runtime-parity/run-m6-stale-native-merge-probe.mjs reference-entry-reversed
```

Evidence: [unmodified-native source-only full suite](rtt-source-fixed-native-sanitized.json), [single-template without barrier on test-only runtime overlay](rtt-centralized-native-sanitized.json), [both-order causal write trace](m6-stale-source-barrier-exact-once-sanitized.json).

## Remaining checks and decisions

**NOT production-ready.** A guarded source-level bar is preferable to requiring a fork of the Liftosaur runtime, but natural stale rollover in all real schedules, timed/optional closer variants, all shared equipment/progression-key migrations, ATP2 Turbo multiset→guard→H1 corner cases, and actual user equipment settings are not completely covered. Changes to the official `fitness` source generator require review of the original code generation and regression tests. Do not silently alter the H1 >20-rep comparability rule: the independent original-vs-openGym `21/22` RED remains, as do any backend persistence gaps. No main, feature branch, live Liftosaur program or stored training history was modified.
