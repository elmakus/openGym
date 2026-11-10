# M6 previously unparsed positions: real native history records and bilateral serialization (2026-11-10)

**Outcome: native-record PASS for a narrowly defined new nine-workout A/B/C test; no end-to-end openGym/backend parity claim.** The original M6 36-position text-only parser previously yielded 9 unparsed occurrences over 9 source-native workouts, and those older results remain **UNVERIFIED**.

## Source, runtime, scope

- Private original M6 qtwbbqff source SHA-256: `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`.
- Original frozen fitness: `9f2deb6c345643d7c0c793c52d358e496c2710d2`; genuine unmodified pinned Liftosaur runtime: `ce75750bde4a190682fb5a6fa1984fc9184a9842`. Baseline production openGym `8529b2d41b28fea8ae96a50325aaf28e864a0160`.
- The private **source-only** test copy applies only the earlier separately proven RTT centralization and H1 current-anchor-only stale-write barrier to the unchanged original M6; otherwise it is the original frozen original-fitness-generated program, evaluated by the actual original runtime. The original unmodified M6 RTT bug persists (29 local update shadows); this test does **not** claim that original program was corrected.
- The original text-matched Playground parser could not extract the three slots `d1i2`, `d1i8`, `d3i11` on A and C, repeating 3 times = **9 original unparsed occurrences**. Native inspected records show **two unilateral/paired exercises** (`d1i2`, `d3i11`) with 3 programmed sets each, plus **one ordinary kilogram-loaded exercise** (`d1i8`) with 2 sets. This third slot is not thereby evidence of Timed Load or non-kg equipment. The omission is a **harness text-parser coverage gap**, not yet a proved native or openGym algorithm defect.

## Actually executed new controlled native history

Three cycles A/B/C, **9 fresh genuinely executed native workouts** using the original library's `Program_nextHistoryRecord`, `Progress_completeSetAction`, `Progress_settleTimedSet`, `Progress_changeAmrapAction` (when required), `LiftohistorySerializer_serialize`, `Program_runAllFinishDayScripts` and `PlannerProgram_generateFullText`. The generated Liftoscript continuation is read between consecutive days. **123 completed native sets**, of which **24 are targeted previously unparsed positions**: 18 paired first/second/third sets with deliberately **independent left/right** completed repetitions, plus 6 ordinary completed kg sets. The remaining 99 completed native sets drive normal source workout continuity; all numbers are controlled synthetic test inputs, never real user training logs.

**187 assertions / 0 unexpected issues** in selected native record shape, source day 11/13/12 ordering, native set completions, distinct preserved left/right values, load-unit shape, original serializer **slot-specific bilateral serialization**, original-native finish, subsequent source text continuation and source-derived observations. **9/9 targeted structural occurrence instances have new actual native serialized records**; this is a fresh test, not retroactive recovery of previously unparsed original workout values.

The true native serializer was checked for tokens from the exact targeted unilateral exercise line; it preserved independent side values. `h1FromExposure` in unmodified openGym was also invoked using **newly obtained native completed record fields projected as side-specific rows**, establishing only a first-set **input-ingestion** sanity check. The selected M6 occurrences are **NOT** H1 anchor signals; `beforeCandidate` was intentionally supplied as the completed native weight to isolate ingestion, so the result **cannot** prove source-derived ATP2/H1 candidate comparability or numerical Liftosaur↔openGym progression parity for these slots.

## Explicit outstanding limitations

- Older nine source-native workout snapshots still lack parsed actual left/right set data; no made-up historical values are backfilled. This runner creates nine distinct newer controlled workouts. No full-36 frontend persistence/restart/replay/next session with these paired rows was executed here.
- Timed Load, true non-kg/resistance modes, physical original fitness equipment settings, actual unilateral native weights across left/right, real device sync and all remaining non-signal M6 numerical progression parity are **UNVERIFIED**.
- The source-copy RTT/H1 changes remain validation-only; original M6 RTT 29-shadow RED, original H1 21+ contract RED, and unchanged openGym shared identity RED remain independently open.
- No true Liftosaur account, production openGym database, production branch, actual equipment profile, merge, APK, or deployment touched. Full native serialized workout texts and actual synthetic weights/reps stay private.

## Counts and reproduction

New in this distinct stage: **9 native workouts / 187 field assertions**, **0 new real HTTP backend writes**, **0 newly completed openGym frontend workouts**. Earlier debug reruns and evaluation-only discovery probes are excluded from the new native ledger. Previous heterogeneous selected ledger 799 native workouts / 11,392 mixed checks becomes **808 workouts / 11,579 mixed checks**, not full parity.

~~~sh
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/shared-identity-followup-20261110"
H2_PARITY_ROOT="$BASE" H2_PARITY_OUT="$BASE/evidence-m6-native-missing-20261110" \
 FITNESS_ROOT="$BASE/fitness" LIFTOSAUR_RUNTIME_ROOT="$BASE/liftosaur" \
 node scripts/hybrid2-runtime-parity/run-full-m6-native-missing-slots-history.mjs
# 9 new genuine original-native workout executions in selected run;
# 123 completed original-native sets; 24 selected, 187 checks PASS, 0 unexpected issues.
~~~

[Sanitized native record evidence](m6-missing-slots-original-native-sanitized.json), SHA-256 `65808f0f07ed6e54a40db1ae6fb775e7be63208fcfbec6cc93e445d76057cb17`. Detailed native serializer and first-set weight evidence in a private mode-0600 file `evidence-m6-native-missing-20261110/m6-missing-slots-original-native-private.json` (not committed). No user private source text, native loads, tokens or serialized histories are published.
