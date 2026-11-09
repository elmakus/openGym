# H1 >20 reps — native reproducer and classification (2026-11-09)

## Authority

- Frozen fitness commit: `9f2deb6c345643d7c0c793c52d358e496c2710d2`.
- Native runtime: `ce75750bde4a190682fb5a6fa1984fc9184a9842`.
- openGym under test: `8529b2d41b28fea8ae96a50325aaf28e864a0160`.
- Original accepted decision: `decisions/HYBRID_2_PERFORMANCE_REFERENCE.md` (H2PERF-DEC-001).
- Original operative spec: `openspec/changes/hybrid-2-performance-reference-hardening/specs/h1-policy.md`.
- Original source: `programs/hybrid2_promotion_materializer.py`, `_observation_setup` (original frozen SHA-256 `493839d999795a7ba21e17026fca027dea9c192721d905428a0d38cc2edbe655`), and `programs/hybrid2_h1_liftosaur_codegen.py` (SHA-256 `c38004d7f0bd53ce3994ae15675bb6cc8205109accaf378cc675d662ae9f3b8c`).
- openGym observation boundary: `api/training-control/hybrid2/observation.js` and `h1.js`.

The accepted specification describes an **approximately 5..20 performed repetitions** initial operating envelope under stable programmed effort, but does **not** explicitly formulate a normative hard `r <= 20` comparison predicate. The frozen original promotion observation adapter compares a completed, non-default working set if the weight equals the pre-candidate weight, without checking `anchorReps > 20`. The openGym adapter treats values above 20 as indeterminate. It is therefore not justified to call this either a proven *intentional exemption* or an error in native Epley/reference mathematics.

## Minimal native reproduction

Run `run-h1-extended.mjs` with the frozen original fitness generator and genuine pinned Liftosaur runtime. Baseline uses a single separate exercise identity, 75 lb and the sequence `10,10,10,21,10,10` or `10,10,10,22,10,10`. The matching control sequence `10,10,10,20,10,10` is fully green.

- At **workout 4, 21 reps**, original Liftosaur records `perf3 = 57.833027175 kg`, `auditValid=true`; openGym retains `perf3 = 45.35923699999999 kg` and `auditValid=false`.
- At **workout 4, 22 reps**, original records `perf3 = 58.9670081 kg`, `auditValid=true`; openGym retains the old `perf3` and `auditValid=false`.
- After returning to 10 reps, native H1 history still includes those out-of-envelope samples through workouts 5 and 6. Those workouts each show residual history-field differences in both new minimal reproductions.
- Earlier `H1_UNSUPPORTED_GT20` trace sequences `10,10,10,21,22,10`: at workout 6 native reference = `53.342462712 kg`, `weak=true`; openGym reference = `45.35923699999999 kg`, `weak=false`.

Evidence: [original H1 differential](h1-differential.json), [expanded compact native step traces](h1-extended-raw-compact.json).

## Final classification

**Observed:** confirmed two-adapter implementation/contract mismatch at the comparability boundary. Original source generation is more permissive than openGym; actual native runtime faithfully executes that generated code. No independent Epley arithmetic bug demonstrated. The underlying ambiguous normative hard/soft ceiling must be resolved by product contract owner.

**Recommendation:** explicitly decide whether the 20-rep envelope is hard. If hard, bring original fitness `_observation_setup` into line with the intended rejection of 21+ and add 20/21/22 native boundary tests, including persistent-history knock-on. If intentionally soft, the contract must specify supported extensions and openGym adapter must be reconciled only after that decision. Do not silently extend/restrict either implementation or modify evidence to pass.

**Safety/status:** unresolved RED. No source change to either production implementation is authorized by this validation. Pure validation runners and raw traces remain on isolated branch only.
