# Real current M6 post-deload H1 relearning + ATP2 Turbo differential (2026-11-10)

**PASS: 9 selected NEW original-Liftosaur post-deload native workouts, 990 selected checks, 0 RED.** There are **3 additional native deload-closer setup/rerun workouts with 38 preparatory checks**. These are recorded as separate `setupWorkouts:3`, `nativeExecutions:12` and **not** included in the 9 selected post-deload workouts or 990 selected comparisons. Total actual runner checks: **1028**, no failures.

## Why this adds evidence

The previous 12-workout complete real-M6 integration suite proved real Turbo multiset, RTT INTRO, queued→active deload, true closer and H1 reset. This new independent, source-only experiment tests what follows the closer: **three full subsequent NORMAL A/B/C cycles** (9 native workouts) while reusing original equipment, native finished set transcripts, native serial `updatedProgramText` and openGym's actual production ATP2/H1 modules.

The setup starts with the genuine *private original queued M6* copy, SHA checked against the unchanged full M6 original `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`, applies only the previously accepted source-only RTT fusion and H1 stale barrier IN MEMORY, and executes **3 actual queued-deload A/B/C setup workouts** on **unmodified** original Liftosaur `ce75750bde4a190682fb5a6fa1984fc9184a9842`. No native engine overlay, production account, original private program modification, app DB or upstream changes.

Before new NORMAL cycle 1, the setup asserts queued and active controller markers are off and all 6 H1 tags are zero. Only then do nine **new, selected** complete workouts run from the actual resulting serialized native state.

## Selected checks

- **18 first actual native H1-anchor completed-set observations**, all comparable and all six-field native-versus-openGym PASS for `perf1`, `perf2`, `perf3`, `perfCount`, `perfReference` and `candidateGuard`. All 6 H1 anchors relearned `perfCount = 1 → 2 → 3` across the three genuine post-deload A/B/C cycles.
- **594** direct original-runtime versus production openGym ATP2 field comparisons of `candidate`, `probeActive`, `floorWeight`, `lowCount`, `counterActive` and `counterWeight` across 99 weight-bearing native-transcript parsed workout occurrences. The native original per-exercise fixed-allowable or plate equipment ladders are used; no assumed universal 2.5 kg step.
- **18 genuinely completed multiset cases**, six of which had a **real measured change of working load between successive native sets**. Requested/actual repetitions are independently checked for each parsed occurrence.
- **Six real duplicated `e.key` progression identities** re-read after each native finish; candidate, floor and probe are compared across all their occurrences, contributing **189 native-only shared-state assertions**.
- **Nine non-kg or unparseable original transcript rows** are explicitly classified as **missing comparable weight evidence**; never counted as proven ATP2 numerical cases.
- **990 selected checks** plus 38 setup checks = **1028 actually executed comparisons/assertions**, **0 RED**. This is not a new additional 29-workout RTT test, and setup reruns are never credited as new post-deload coverage.

## Evidence and privacy

[Sanitized native/source and relative-state trace](m6-post-deload-native-sanitized.json) includes each native serial source SHA-256, each selected cycle/day, all H1 signal counts and classification, native/expected H1 reference relative to candidate, normalized ATP2 candidate ratios, per-workout six-key shared groups, counts of completed multiset / actual changes and any field mismatch, **no absolute user loads or private source**.

Absolute native loaded sets, actual/expected ATP2 and H1 field values for all 99 comparable workout occurrences remain in the **mode-0600 private** `evidence/m6-post-deload-native-private.json`. The sanitized JSON drops entire `privateEvidence` arrays; confirmed **99 private sets, zero public absolute sets**.

SHA-256 of published runner `f0f042f9160a6a24b1e07ac0110aec9ab2e04c6a31b27a064d99ddf1336f2e70`, sanitized trace `1b6615ba163eab253ecff886f37f853778e53bff11a0bd477e86697765683452`.

## Reproduction

```sh
B=/tmp/hybrid2-runtime-parity-20261109
cd "$B/integration-checkout-20261110"
FITNESS_ROOT="$B/fitness" LIFTOSAUR_RUNTIME_ROOT="$B/liftosaur" \
PRIVATE_LIVE_ROOT="$B/private-live" H2_PARITY_OUT="$B/evidence" \
node scripts/hybrid2-runtime-parity/run-m6-post-deload-native.mjs
# 3 native setup finishes + 9 selected post-deload native finishes;
# 38 setup checks + 990 selected checks; 0 mismatch.
```

## Deliberate omissions and negative harness control

A first diagnostic attempted 3 completed sets on an anchor with only 2 native available sets after deload (day B). Original runtime correctly refused “Set 3 not found”. Adjusting only the **test command count** to the actual original day A/B/C set shape produced the selected PASS. This is a harness shape mistake, not a Liftosaur or openGym behavior change; no algorithm or tolerance was modified.

These 9 new selected original-native workouts can be **added to the prior 12 selected integration workouts** (giving 21 native workouts and 1,692 checks for the integrated M6 phases). They cannot also be counted as 12 additional workouts because the first 3 are explicitly recurring fixture setup. Previous aggregate selective regression 762/10,066 would become 771/11,056, but these are heterogeneous check types, not a whole-system parity claim.

**Open:** original fitness versus openGym H1 21/22 repetitions comparability RED (policy/contract), source-only RTT/H1 fix not integrated into the original fitness generator or real user account, true current-M6 history persisted via actual openGym backend (the separately passing real HTTP/restart fixture is from K5 with original-native repetitions and synthetic loads), paired/timed actual M6 source rows and live gym settings. Frozen source and production untouched.
