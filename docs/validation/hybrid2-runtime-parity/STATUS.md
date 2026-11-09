# HYBRID-2 validation checkpoint (2026-11-09)

**Verdict: PARTIAL / RED. Full runtime parity is NOT established.**

## Exact provenance
- openGym base: `8529b2d41b28fea8ae96a50325aaf28e864a0160`
- frozen original fitness: `9f2deb6c345643d7c0c793c52d358e496c2710d2`
- exact original Liftosaur runtime: `ce75750bde4a190682fb5a6fa1984fc9184a9842`
- external archive SHA-256: `bccd5330a234a0133c8c3d36aca69fac08e9a861f41389076ec3fcfe52633c07` (not committed)
- source-generator content hashes: [generated-h1-manifest.json](generated-h1-manifest.json)
- original source runner matrix: [h2m02-runtime-matrix.json](h2m02-runtime-matrix.json)

## Real native runtime execution and semantic comparisons

| Suite | Native workouts in recorded differential | Compared semantic fields | Matching steps | RED steps | Scope |
|---|---:|---:|---:|---:|---|
| Current H1 source codegen vs openGym | 53 | 630 | 50 | 3 | 8 independent H1 scenarios; actual `Playground_run`, write/reload |
| K5/M6/SYN4 trigger engine vs openGym | 132 | 792 | 21 trigger scenario suites with 0 failed fields | 0 | Controlled synthetic signal votes; original generic Liftoscript controller progress generator |
| Shared progression original negative smoke | 3 | N/A | 3 | 0 | Original unchanged Liftoscript: native stale snapshot semantics, no openGym comparison |
| H2M02 original matrix | Native real runtime exercised | N/A | PASS | 0 | Unmodified historical original matrix and frozen fixture; no openGym comparison |

The first two rows use **185** native workouts and **1,422** per-field comparisons. The other native test counts are **not** added to those totals because they do not measure two-system differential parity.

**Current-H1 first divergence**: `H1_UNSUPPORTED_GT20`, workout 4. Frozen source's accepted promotion observation setup considers `21` reps comparable, so original H1 window/reference is updated. openGym adapter excludes reps above 20 as INDETERMINATE. By workout 6 the original yields `weak=true` and openGym `weak=false`. The issue is the observation-adapter comparability contract, not an arbitrary JSON difference. [Original RED trace](h1-differential.json); [pre-harness-correction trace](h1-differential-pre-harness-correction.json).

**Harness-only correction**: when `finish_workout()` follows a fully skipped workout, Liftosaur doesn't run the progress block. A stale audit-only field was initially compared even though no new observation existed; the false positive was removed from the comparison, retaining its original raw trace. No algorithm/code under test was changed. 10g numeric tolerance for Liftosaur kg/lb serialization (maximum observed matching delta about 3.4g).

## Regressions on clean base tree
- API: `1058 PASS, 0 FAIL` (`npm test` from `api`)
- Frontend: `8332 PASS, 0 FAIL` across `699` test files (`npm test -- --run`)
- Production frontend: `npm run build` PASS (bundle size / ineffective dynamic-import warnings)
- Frozen original Python oracle isolated subset: `17 PASS`
- Note: source Python oracle parity, native Liftoscript generation, native runtime run, and two-sided differential are **separate** evidence tiers.

## Not yet established; audit blockers
- Full accepted HYBRID-2 **combined** H1+trigger+deload+post-deload native parity on identical K5/M6/SYN4 session traces.
- The pinned original T03/T04 complete long-horizon runners with their exact unchanged binaries/snapshots and SHA proofs; reconstruction hash verification does **not** equal execution. Their old reference policy also cannot prove new H1-EPL-1/H1-ASYM-M3-1.
- Full ATP2/Turbo opaque state comparison and exact-once H1 propagation through all shared progression identities, including terminal closer and stale rollover.
- End-to-end openGym `buildSessionExposures` → entries → completed sets → `buildCompletedSession` → persisted history → replay → next-session comparison against original real programs.
- Sync is openGym-only and cannot be called Liftosaur parity.
- No source policy change or bug fix was applied. The >20-rep discrepancy remains RED pending authoritative decision on the accepted boundary.

## Safety
Only isolated files, synthetic fixtures and separate validation branch. No account data, live Liftosaur workouts, Unraid DB, deployment, APK, PR update, merge or RTT.


## Continued native validation (2026-11-09, checkpoint 2)

Read-only inspection confirms validation HEAD at `f7cce7bccfc96623a69e47bb8048176238433c2e` before these additional validation-only commits. The exact original pinned fitness H1 policy source is `openspec/changes/hybrid-2-performance-reference-hardening/specs/h1-policy.md` and accepted decision `decisions/HYBRID_2_PERFORMANCE_REFERENCE.md` at fitness `9f2deb6...`.

**New native differential executions, not repetitions of the prior 185 workouts:**

| New suite | Runtime workouts | Differential field comparisons | Outcome | What it does NOT establish |
|---|---:|---:|---|---|
| [Expanded H1](h1-extended-raw-compact.json) | 124 | 1,470 | 118 matching workouts / **6 RED workouts** | Multi-anchor combined/production full-plan parity |
| [Combined source-H1 + trigger](combined-h1-trigger-compact.json) | 108 | 891 | **0 mismatched fields** | Deload continuation, post-deload reset/relearn, ATP2/Turbo, production materialization |

Combined current differential evidence, retaining originally published baseline: **417 genuine native workouts and 3,783 semantic field comparisons**, including **9 RED workout steps** (3 original, 6 new boundary cases), all due to the same >20-repetition policy seam. These are test-execution counts, not statistically independent failure classes. Original H2M02 matrix/shared smoke remain separate native-only evidence, not included in two-system field totals.

Expanded H1 includes: 20 (control), 21, 22 repetitions, repeated 5/10/15/20, 43 stationary workouts, 35-workout decline/recovery, and skipped/reloaded transitions. Every step executes actual `Playground_run`, `finish_workout`, reloads `updatedProgramText`, then reads persistent state via original `PlannerProgram_evaluateText`/`Program_evaluate`. Unit comparison tolerance 0.01 kg; maximum matching drift 0.004423 kg. The 21/22 tests each diverge at workout 4 (native `perf3` and `auditValid`) with residual window differences on workouts 5–6; control 20 and other five suites match. Full original additional trace remains in isolated local workspace; the published compact JSON retains all native post-workout state, expected openGym state, inputs, mismatches, and before/after source SHA-256 for each workout.

Combined native H1/trigger harness uses frozen `hybrid2_promotion_materializer._observation_setup`, `hybrid2_h1_liftosaur_codegen.render_h1_observation`, and `hybrid2_liftosaur_codegen.render_controller_progress`, with actual completed rep inputs and native write/reload across 3 original controller topologies (K5, M6, SYN4) × fast/slow trigger paths. It compares 6 H1 fields per signal after each workout, plus trigger-state fields at cycle close. Actual 108 workouts/891 comparisons/0 discrepancies. Synthetic test-program prescription and no ATP2/deload implementation: **do not promote to production parity evidence**.

**H1 boundary classification:** [H1_GT20_CLASSIFICATION.md](H1_GT20_CLASSIFICATION.md). The accepted policy describes an *approximately* 5..20 operating envelope; the live fitness source observation adapter fails to enforce a strict >20 rejection while openGym's adapter enforces it. Observed mismatch is **implementation/observation-adapter policy inconsistency**. Whether to harden fitness codegen or formally broaden the envelope requires an explicit authority decision; **not** a proven intentional exemption or an Epley arithmetic defect. Red traces stay intact; no production changes.

**T03/T04 inspection:** original reconstructed script files are present locally with checked pinned source; the required external archive SHA `bccd5330...` is present and SHA-verified in the ChatGPT container, **not** on the Desktop Commander host (its `/mnt/data/liftosaur-playground-runtime.tar.gz` is absent). Original T03 runner fails its mandatory archive precondition on that host. T04 additionally requires `/mnt/data/h2runtime/t04_marta_snapshot.json`, also absent there. Both unmodified runners remain **NOT EXECUTED** in this checkpoint. T03/T04 legacy `calculate1RM`/monotonic reference policy would not validate accepted H1-EPL-1/H1-ASYM-M3-1 even with intact historical fixtures.

**Still RED / PARTIAL:** real K5/M6/SYN4 full-plan combined H1+trigger+queued→deload→epoch reset→post-deload relearning, exact-once shared H1 reset propagation and stale rollover, ATP2 Turbo, and saved-history/exposure round-trip comparison are NOT yet established. No production branch, live account, merge, deployment, or APK change performed.

New reproducible runners:
- [run-h1-extended.mjs](../../../../scripts/hybrid2-runtime-parity/run-h1-extended.mjs) (intentional nonzero RED)
- [run-combined-h1-trigger.py](../../../../scripts/hybrid2-runtime-parity/run-combined-h1-trigger.py) (six K5/M6/SYN4 native scenarios)

Raw evidence SHA-256 (UTF-8 compact files):
- `h1-extended-raw-compact.json`: `f2ab26a6c1a98dd4b239daa5d2b2c56da3841425120a92c125e156d711384621`
- `combined-h1-trigger-compact.json`: `a51e7fab1d062f9a46a60a3569c6120111068ddf0bce837044c97cd4295a8956`


## Continued native validation (2026-11-09, checkpoint 3)

The [isolated H1+trigger+deload/reset/relearn report](LIFECYCLE_INTEGRATION_PROBE.md) adds **108 new actual original-runtime workouts** and **1,134 state/probe checks** across K5, M6 and SYN4, running nine full cycles per topology with original fitness H1/reset/controller generators and explicit synthetic lifecycle wiring. Original source `updatedProgramText` is serially reloaded after each actual `finish_workout`.

- H1 learning, weak classification, queue, epoch reset, Adaptive candidate preservation and three subsequent relearning cycles: **0 field discrepancies** in isolated runner.
- Native DELoad **second-set-access** probes: **11/15 PASS, 4/15 FAIL**; the four expected-invalid second-set accesses are accepted on final deload/closer days. **This proves a gap in the synthetic harness integration, NOT a production bug**, because the `update` seam was harness-authored and not an unchanged real materialization.
- Earlier static `Program_evaluate` set count claimed all 15 shapes still had 2 sets: **harness measurement false positive**, preserved separately rather than deleted. Actual native session access test is authoritative for this probe.
- A further 108-workout **unsupported cross-tag diagnostic** has 15/15 failed second-set-access checks and is excluded from comparable evidence totals.

Primary cumulative native differential executions now **525 actual workouts / 4,917 semantic field comparisons or direct native assertions** (original 185/1422; H1 extension 124/1470; combined H1+trigger 108/891; lifecycle 108/1134). **Original H1 policy RED = 9 workout steps across 2 suites** (one unique >20-rep cause); **synthetic lifecycle deload-shape RED = 4 native access assertions** (not yet proven product defect). Mixed semantic fields and native shape assertions are identified and not implied to be equivalent. The additional diagnostic 108 runs are separate and are NOT added.

Verdict remains **PARTIAL / RED**, NOT ready to close: unchanged full production materialization, exact-once H1 reset in real shared progression groups, ATP2 Turbo, openGym exposure/history replay, original T03/T04 external snapshots/runners, and full current-user-plan runtime parity remain unproven. No non-validation branch, live account, main, functional feature, merge, deploy or APK was touched.


## Continued original current-H1 native fitness checks (2026-11-09, checkpoint 4)

Two additional **unmodified original pinned fitness runtime scripts** were retrieved (with exact Git blob identities) and executed against original Liftosaur `ce75750...` with no live/staging writes:

- [H2PERF-T03 native result](h2perf-t03-original-native.json): **PASS**, **49 native serial continuation boundaries**, T01 oracle/T02 controller/native H1 parity and adversarial negative controls (native `calculate1RM` / monotonic ratchet rejected).
- [H2PERF-T04 native result](h2perf-t04-original-native.json): **PASS**, original real K5(5)/M6(6) adapter H1 fixtures parsed and persisted; original underlying program source SHA-1 identities verified.

See [H2PERF_ORIGINAL_NATIVE_RUNS.md](H2PERF_ORIGINAL_NATIVE_RUNS.md) for pinned runner Git blobs, commands and caveats. They are **native-only original runner evidence** and must not be added to the 525 native two-system workout / 4917 field/shape-check differential count. They do not cover ATP2 Turbo, actual complete full-plan deload, shared progress H1 end-to-end or current openGym exposure storage. Earlier *H2M03* T03/T04 historical runners remain blocked/unexecuted and must not be confused with *H2PERF* T03/T04.


## Continued genuine original ATP2 Turbo differential (2026-11-09, checkpoint 5)

[ATP2 direct original Liftoscript vs openGym report](ATP2_NATIVE_DIFF.md): **18 new genuine original Liftosaur workouts / 75 comparisons / 0 failures**. Unlike model-only ATP2 tests, this replays real `Playground_run` with original `adaptive_rep_engine_turbo_probe_candidate.liftoscript@fitness:9f2deb6...` (Git blob `4d6452c...`), `finish_workout`, repeated native `updatedProgramText` reloads, native workout-record set weights and `evaluateAtp2` from pinned openGym. Covers 21-rep Turbo, 2-set calibration, validation, chained, hard backoff, 1-rep sentinel, persisted candidate/floor/probe and intra-session second-set load at 2.5kg rounding.

**Primary cumulative across 5 differential suites: 543 native workouts and 4,992 field/shape assertions.** Original H1 contract RED 9 failing workout steps across two suites, plus 4 synthetic lifecycle native set-access probe failures. All 18 native ATP2 workouts and all 75 comparisons PASS. Historical original current-H1 H2PERF T03/T04 source-only native-run evidence is separately recorded (do not double count as openGym differential), as is non-authoritative 108-workout lifecycle diagnostic. Global classification still **PARTIAL / RED**, because ATP2 + H1 guard original full materialization, true source-exposure persistence and replay, shared progression full workflow, and full-plan deload remain unverified.
