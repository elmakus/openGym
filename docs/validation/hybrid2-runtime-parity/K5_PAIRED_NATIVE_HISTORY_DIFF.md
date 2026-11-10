# Current K5 paired native history-record differential (2026-11-10)

**Selected result: PASS — 20 new genuine native K5 workouts, 152 completed first sets, 4 independent bilateral H1 records, 488 comparisons, 0 RED.** Exact current K5 Liftoscript source is unchanged and private. Earlier 20-workout Playground test was limited by `change_reps_left()` being unsupported, so its four unilateral H1 steps remain **INDETERMINATE**. The new distinct execution builds controlled *independent* left and right observations through the original lower-level native record/finish pathway, establishing bilateral equivalence in the selected cases without pretending those values were actual user training data.

## Pinned provenance and scope

- Actual current read-only K5 `npyswbiu` source SHA-256 `74420646c1c5826f77d842025291f75f7d89367f46265818a43a92cacfec662e`, prepromoted `H1-EPL-1`/`H1-ASYM-M3-1`.
- Genuine original Liftosaur `ce75750bde4a190682fb5a6fa1984fc9184a9842`; original frozen fitness `9f2deb6c345643d7c0c793c52d358e496c2710d2`; openGym base `8529b2d41b28fea8ae96a50325aaf28e864a0160`.
- Exercise label registry is synthesized from frozen original fitness H2PERF reference adapter, and only the known `Single-Leg Leg Press` registry record is explicitly marked `isUnilateral`. Equipment profile is an original frozen synthetic fixture, **not the active user's live gym settings**.
- Five-day actual executable K5 topology `8+9+7+4+10`, four full cycles, `20` genuine native finish-script invocations, `152` completed first-set records.
- Every unilateral observation is intentionally specified independently on two sides: left/right `10/10`, `9/10`, `8/9`, `7/10` across four Saturday sessions. These are synthetic test inputs, **not inferred, fabricated, or attributed to user history**.

## Native original API — no simulated engine

The pinned original `src/playground/playground.ts` command parser accepts `change_reps` but **does not accept** `change_reps_left`. The underlying original code has the correct bilateral support: `completedRepsLeft` in the native record and script bindings, `Progress_completeSetAction`, `Progress_settleTimedSet`, `Progress_changeAmrapAction`, the actual `Program_runAllFinishDayScripts` and `LiftohistorySerializer_serialize`.

The runner uses the real original source, native `Program_nextHistoryRecord` and original native completion actions as Playground does. It sets independently chosen `completedReps` and `completedRepsLeft` before the original completion action, precisely the fields modified by the app UI, then verifies:
1. Both native sides persist without replacing the left with the right.
2. The original serializer produces a bilateral `right|left` completed-set record.
3. The pinned native `Program_runAllFinishDayScripts` updates the real original source; `PlannerProgram_generateFullText` reloads and `Program_evaluate` supplies subsequent per-workout state.
4. The identical actual first-set records become two side-specific `performance.sets` rows with a shared `setId`, and openGym `h1FromExposure` + `observeAnchor` consume **the actual native record's two sides**, not a right-side fallback.
5. Six H1 state fields for every executed signal and three controller fields at each cycle close agree (`488` total assertions, zero issues).

Native bilateral H1 slot 5 progressed `perfCount=1,2,3,3`; sample classification `COMPARABLE` in all four cycles. Candidate guards and votes agree. Other four H1 signals and K5 cycle controller also agree. The serializer checks detect that correct bilateral history fields were actually present.

## Limitations / classification

**PASS for genuine original-native controlled bilateral execution and openGym field differential**, replacing the previous noncomparable **harness-only limitation** for these deliberately controlled cases. **NOT** proof of actual live-account equipment semantics, live left/right user training values, original Playground UI bilateral command support, a complete persisted database round-trip, K5 deload/rollover, or full production parity. Nothing was written to the real account; only validation workspace and validation branch files were modified. The old four one-sided steps remain archived, not retroactively changed into passing tests. H1 observations above 20 reps remain an independent open RED policy seam.

## Reproduction

```sh
cd /tmp/hybrid2-runtime-parity-20261109/validation-checkout
export FITNESS_ROOT=/tmp/hybrid2-runtime-parity-20261109/fitness
export LIFTOSAUR_RUNTIME_ROOT=/tmp/hybrid2-runtime-parity-20261109/liftosaur
export PRIVATE_LIVE_ROOT=/tmp/hybrid2-runtime-parity-20261109/private-live
export H2_PARITY_OUT=/tmp/hybrid2-runtime-parity-20261109/evidence
node scripts/hybrid2-runtime-parity/run-current-krzysztof-paired-native.mjs
# Expected: PASS, 20 native workouts, 152 completed first sets,
# 4 bilateral completed records, 488 comparisons, 0 failures.
```

[Sanitized actual-native trace](current-k5-native-paired-sanitized.json): SHA-256 `44a84c1dbe7439909810d1e7275f22a1afbcf94dcbbff10d937cef7a8a814e31`. Runner SHA-256 `7b3c5aee6d3a87ff66d0f451b6751130ed7c817c304e47219e790cd328fa2905`. Private original Liftoscript, raw working loads, actual personal history and account settings are **not included**.
