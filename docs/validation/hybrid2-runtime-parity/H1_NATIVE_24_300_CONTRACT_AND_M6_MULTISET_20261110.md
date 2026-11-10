# H1 24–300 native evidence and M6 ATP2 Turbo multiset follow-up — 2026-11-10

## Classification

**H1: ORIGINAL FROZEN FITNESS vs UNMODIFIED openGym remains RED; now proven through 300 reps.**
**M6 ATP2 Turbo + H1 + RTT + deload on source-overlay native runner: SOURCE-VARIANT PASS, not original unmodified M6 parity.**
No production change or user-account write. A product policy decision is necessary to reconcile source-exact H1 behavior against the accepted hard 20-rep protection.

### Frozen provenance
- openGym production comparison baseline: `8529b2d41b28fea8ae96a50325aaf28e864a0160`.
- Frozen private original fitness: `9f2deb6c345643d7c0c793c52d358e496c2710d2`; original `hybrid2_promotion_materializer.py` SHA-256 `493839d999795a7ba21e17026fca027dea9c192721d905428a0d38cc2edbe655`.
- Genuine original Liftosaur runtime: `ce75750bde4a190682fb5a6fa1984fc9184a9842`.
- Current tested validation-branch HEAD before this stage: `ef919041b8f8bc6ca563b1262e679c6269b1b686`.

## H1 new genuine-native extension

The new reproducible runner `scripts/hybrid2-runtime-parity/run-h1-native-24-300-boundary.mjs` starts from the original frozen fitness H1 codegen, executes the real `Playground_run` `change_reps`, `complete_set`, `finish_workout`, and carries `updatedProgramText` into each subsequent native workout. Readback uses actual native program state, not a copied JavaScript Liftosaur implementation. The openGym `h1FromExposure` input is **projected from the issued completed-set command**; no native completed-set serializer proof is claimed here.

Four independent new event sequences, including return to 10 repetitions after high-rep steps, were executed as **30 genuine native original Liftosaur workouts**. The unchanged openGym H1 adapter had **360 compared fields / 19 mismatching steps / 79 differing fields**. In directly comparable 24/25/30/50/100/300-rep observations, the original marked valid H1 audit samples when their weights matched the baseline, while unmodified openGym mapped every `>20` rep sample to `INDETERMINATE`. The consequences persisted into later normal-rep sessions.

[Compact original-native differential evidence](h1-native-24-300-sanitized.json) includes 30 exact native-vs-adapter steps and their mismatching field names, but not source plan text or real account data.

**Isolated source-only alternative:** `scripts/hybrid2-runtime-parity/run-h1-native-24-300-relaxed-variant.mjs` imports a transient sibling module that removes exactly the local >20 predicate, then reruns the **same** 30 original-native workout sequences. Output: **360/360 comparisons MATCH, 0 differing steps/fields**, including the 300-rep step. These 30 are reruns, **not 30 additional independent workouts**. Transient source files are removed in the runner's `finally`; no shipped module changed. [Sanitized isolated-alternative evidence](h1-native-24-300-relaxed-variant-sanitized.json).

| Completed first-set repetitions | Original native H1 valid votes | Unmodified openGym above-20 policy | Isolated parity variant |
| --- | ---: | --- | --- |
| 24 | 2/2 | All indeterminate | 2/2 matched |
| 25 | 2/2 | All indeterminate | 2/2 matched |
| 30 | 1/1 | Indeterminate | 1/1 matched |
| 50 | 1/1 | Indeterminate | 1/1 matched |
| 100 | 1/1 | Indeterminate | 1/1 matched |
| 300 | 1/1 | Indeterminate | 1/1 matched |

Note: an individual native 21-rep event may have `auditValid=false` because the original H1's other historical and guard conditions are also active; this is not proof of a 20-rep boundary. Each workload is evaluated with its actual evolving native reference state.

### Normative conflict (not silently resolved)

The original `H2PERF-DEC-001` describes an **approximately 5–20-rep operating range**, whereas `docs/HYBRID_2_ENGINE_V2.md` and `api/training-control/hybrid2-evidence-contract.test.mjs` have imposed a **hard 20** and explicitly reject 300 to protect H1 reference from extreme pollution. The frozen original fitness generated runtime contains **no hard upper bound and demonstrably accepts 300**.

Therefore:
- Leaving the hard 20 cap is a safety-oriented divergence from the genuine frozen original.
- Removing the cap achieves original behavior, but **allows a 300-rep outlier to update H1** (which contradicts the current explicit product safeguard).
- Introducing an arbitrary new 23/30/100 limit is neither source-exact nor an approved product decision.
- No version of these mutually incompatible policies can simultaneously match native original at 300 and reject it; require an explicit normative choice or separate versioned comparability modes with clearly scoped guarantees.

**Do not label H1 native parity 100% or change product logic based on this report alone.** H1 >20 remains RED/policy unresolved. Existing tests `hybrid2-unsupported-perf-independent.test.mjs` and `hybrid2-evidence-contract.test.mjs` intentionally continue rejecting 300. The original user data and any production H1 implementation were not modified.

## M6 native composite multiset execution

Also executed `scripts/hybrid2-runtime-parity/run-m6-atp2-h1-multiset-native.mjs` against the genuine pinned Liftosaur runtime and the **frozen** original M6 source (private; source SHA-256 `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`). This particular runner **transforms the source text** with its existing test-only `rtt-centralized-update-variant.mjs` and `h1-stale-barrier-variant.mjs` before evaluation. The frozen source and library are unchanged on disk. Genuine native equipment rounding comes from the frozen baseline fixture, **not the live user's current gym settings**.

Its four three-day source-variant scenarios run actual `Playground_run` completion and program serialization:
1. Baseline native A/B/C.
2. Normal ATP2 Turbo multiset A/B/C (heterogeneous set counts/reps).
3. RTT-introduction A/B/C, with expected frozen state.
4. Queued/active deload A/B/C through the terminal day and H1 reset check.

**12 native workouts executed / 155 native set-completion commands / 702 compared fields / 0 mismatches.** Twelve H1 anchor comparisons and 72 shared-key group inspections appear across the native trace. The runner checks historical native candidate/Turbo advancement using original frozen equipment ladders and genuine shared `e.key` state, plus H1 freeze and deload progression where applicable. [Compact privacy-safe outcome](m6-atp2-h1-multiset-20261110-sanitized.json) has individual scenario/day counts and the exact source hashes; complete normalized per-occurrence trace remains on the authorized local test machine and is not uploaded.

The 12 executed native workouts may overlap prior scenario *families* already tested by this project; **do not increment a unique cumulative native-workout ledger without deduplication**. They are genuine new executions in this run but not claimed as distinct previously untested exercise classes.

**Limits:** This native M6 result is **not parity for unmodified current M6**, since the original RTT local update shadowing and H1 stale write are repaired in the test source overlay. It is also **not** the complete Liftosaur-native → openGym HTTP persisted session chain for these exact 12 workloads. Timed Load, all non-anchor exercises, real personalized equipment and true two-device history are not validated here.

## Reproduction

```sh
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/shared-identity-followup-20261110"
export FITNESS_ROOT="$BASE/fitness"
export LIFTOSAUR_RUNTIME_ROOT="$BASE/liftosaur"
export PRIVATE_LIVE_ROOT="$BASE/private-live"

H2_PARITY_OUT="$BASE/evidence-native-h1-24-300-20261110" \
  node scripts/hybrid2-runtime-parity/run-h1-native-24-300-boundary.mjs
# Expected RED/exit 1 (19 steps / 79 fields), intentionally keep proof

H2_PARITY_OUT="$BASE/evidence-native-h1-24-300-relaxed-20261110" \
  node scripts/hybrid2-runtime-parity/run-h1-native-24-300-relaxed-variant.mjs
# SOURCE_OVERLAY_PASS; 360/360 comparisons

H2_PARITY_OUT="$BASE/evidence-m6-atp2-multiset-20261110" \
  node scripts/hybrid2-runtime-parity/run-m6-atp2-h1-multiset-native.mjs
# Real native source-overlay M6: 12 workouts, 155 set commands, 702/702 fields
```

Current unmodified local Node API regressions (H1 evidence, H1 extreme, ATP2, Timed Load): **43 tests PASS, zero failures**. These are **not native differential proof**; source-only corrected H1 variant does not make them pass by changing a checked-in production file.

**Unresolved:** original unmodified M6 RTT 29 local update shadow and stale H1 write; extreme H1 policy conflict; Timed Load native whole-plan equivalence; full native serialization → openGym backend and mobile sync across all 36 current-M6 slots; no merge to production.

## Subsequent accepted implementation decision (2026-11-10)

The `normative conflict` above is the **historical pre-decision classification** and documents the genuine incompatibility of a hard-20 rule with original native behavior. The user has now explicitly chosen **exact original Liftosaur H1 even at 300 repetitions**. The validation branch has removed only that arbitrary upper cutoff and verified 0 mismatches across source-pinned native H1 sequences; no cap has been substituted. [Current authoritative acceptance report](H1_SOURCE_EXACT_300_ACCEPTED_20261110.md). The historical 19-step/79-field RED evidence remains preserved as the pre-fix comparison.
