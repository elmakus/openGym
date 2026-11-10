# Original fitness H1 boundary 19–23: genuine pinned Liftosaur differential (2026-11-10)

**VERDICT: confirmed independent original-fitness versus unchanged openGym observation-contract RED; no adopted policy change.**

## Authorities and provenance

- Production openGym: `8529b2d41b28fea8ae96a50325aaf28e864a0160`; unchanged frontend/H1 library.
- Original frozen fitness: `elmakus/fitness@9f2deb6c345643d7c0c793c52d358e496c2710d2`. Actual original code from `programs/hybrid2_promotion_materializer.py` SHA-256 `493839d999795a7ba21e17026fca027dea9c192721d905428a0d38cc2edbe655`, and `programs/hybrid2_h1_liftosaur_codegen.py` SHA-256 `c38004d7f0bd53ce3994ae15675bb6cc8205109accaf378cc675d662ae9f3b8c`.
- **Actual unmodified** original Liftosaur runtime `liftosaur/liftosaur@ce75750bde4a190682fb5a6fa1984fc9184a9842`; generated Liftoscript only in private scratch. Version and source SHA hashes checked in runner.
- Authority ambiguity: original accepted H2PERF-DEC-001 defines an *approximately* 5–20-repetition initial operating envelope; it does **not** explicitly declare 20 as a mandatory comparability cutoff. Native original promotion materializer marks a non-default loaded first set comparable if candidate/actual weights match, without a greater-than-20 filter. Unchanged openGym `api/training-control/hybrid2/observation.js` uses `H1_SUPPORTED_REPS_UPPER = 20`, returning `INDETERMINATE` for 21+.
- The separate previously published [H1 >20 classification](H1_GT20_CLASSIFICATION.md) is retained; this follow-up adds truly new 19–23 native test sequences, not reruns.

## Executed native workouts and differential

**28 NEW genuine original-Liftosaur workouts**, three fresh serial native Playground sequences, each call with real `change_reps(1,1,N)`, `complete_set(1,1)`, `finish_workout()` and verified successful `updatedProgramText`. After every native workout the original pinned evaluator reads controller tag 843 and real persistent/performance/reference/audit state. The frozen original fitness generator produced the observation setup and H1 transition. A corresponding **unchanged openGym** `h1FromExposure` processes the issued completed-set input as an explicit **command-derived exposure projection**, then `observeAnchor` updates the controller. This is NOT a claimed native serialized completed-set extraction and NOT a full original M6 workout.

| Fresh native scenario | Repetition sequence | Native workouts |
| --- | --- | ---: |
| H1_NEW_TRANSITION_19_23 | 10,10,10,19,20,21,22,23,20,19,10 | 11 |
| H1_NEW_SEED_19_THEN_20_23 | 19,19,19,20,21,22,23,19,19 | 9 |
| H1_NEW_23_RETURN_20_19 | 10,10,10,23,10,20,19,10 | 8 |

**336 native/openGym field comparisons** (12 per completed workout), **16 workout steps with differences** and **58 mismatched individual fields**. This is a known **single independent comparability-boundary contract RED** with subsequent history effects; not 58 separate product defects. The runner returns exit 1 by design; it must never be recorded as passing overall.

| Completed reps | Tested native workouts | Original native auditValid true | openGym auditValid true | Steps with any mismatch |
| ---: | ---: | ---: | ---: | ---: |
| 10 | 9 | 3 | 3 | 3 |
| 19 | 8 | 5 | 5 | 4 |
| 20 | 4 | 4 | 4 | 2 |
| 21 | 2 | 2 | 0 | 2 |
| 22 | 2 | 2 | 0 | 2 |
| 23 | 3 | 3 | 0 | 3 |

Native acceptance of **23** is a new distinct boundary probe beyond earlier 21/22 examples. At 19/20/10, some **later** workouts still disagree in `perf1`, `perf2`, `perfReference` and `auditRefBefore` after native accepts 21–23; these are history knock-on differences. 19 reps during early reference seeding are not necessarily eligible for audit vote; both sides agree on vote availability for this range. No native arithmetic bug or standalone ATP2/deload defect was demonstrated.

## Classification and limits

- **Original fitness ↔ unchanged openGym: RED (confirmed).** 21, 22 and 23 native H1 first-set comparisons feed genuine original H1 state while the original openGym adapter returns `INDETERMINATE`.
- Normative policy **UNRESOLVED**; neither a silent removal of the openGym cap nor an unapproved addition of a hard 20-rep cap to original fitness is justified by these tests. Both source implementations remain unmodified.
- All weights in this isolated source-generated H1 harness are synthetic and controlled; the full original current M6 script/equipment, paired sets, Timed Load, online/offline sync, physical device, and production backend are **not** exercised here. OpenGym input exposure is projected from native commands, not native serialized record extraction. Do not claim the 28 workouts are full-M6 end-to-end integration or 28 successful parity tests.
- No real Liftosaur account, fitness repository, production branch, production DB, merge, APK, or deployment was changed.

Selected cumulative native-workout ledger, if extending the earlier heterogeneous 771/11,056 ledger with **only these new** scenarios: **799 native workouts / 11,392 mixed comparisons**. The ledger includes multiple independent heterogeneous scopes; it is NOT a number of parity PASS workouts. This stage adds **zero frontend completed openGym sessions and zero actual backend HTTP writes/restarts**; the projected observation/controller calls are counted only in the 336 differentials.

## Reproduction and evidence

~~~sh
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/shared-identity-followup-20261110"
mkdir -p "$BASE/evidence-h1-native-boundary-20261110"
FITNESS_ROOT="$BASE/fitness" LIFTOSAUR_RUNTIME_ROOT="$BASE/liftosaur" \
 H2_PARITY_OUT="$BASE/evidence-h1-native-boundary-20261110" \
 node scripts/hybrid2-runtime-parity/run-h1-native-19-23-boundary.mjs
# Expected nonzero exit: genuine RED, 28 native workouts, 336 field comparisons,
# 16 mismatched workout steps, 58 mismatched fields.
~~~

[Sanitized evidence](h1-native-19-23-sanitized.json) SHA-256 `1ac79cd91ef6c1888c7a011c800f94281d6d74181d8652d5b9053c90f2d5fb7c`: only rep counts, field names and verdicts, no absolute native loads, private credentials or source text. Private full state/command/native continuation traces remain in `evidence-h1-native-boundary-20261110/h1-native-19-23-full-private.json` mode 0600 and are NOT committed.
