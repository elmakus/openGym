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
