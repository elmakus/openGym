# Real fitness Python M6 generator correction — source-produced original-native PASS

**Date:** 2026-11-10
**openGym validation branch parent:** `0d4f04214d3347dfecfea5865bf0e61aa2e45a63`
**Real source-code change:** <https://github.com/elmakus/fitness/tree/fix/m6-rtt-centralized-h1-persistence>
**Fitness branch verified latest commit:** `74e9a4e95444116205c8ad9ef881949593cc7a00`
**Status:** Actual generated M6 candidate code verified on original Liftosaur; no deployment.

## Change in executable generator code, not only tests

A new **source-producing** Python module was added to the separate private `elmakus/fitness` repository at `programs/hybrid2_m6_rtt_materializer.py`. It implements a real builder for a corrected M6 Liftoscript program, using a pinned original source as input, with an explicit output file. It does not change the original source file or a connected Liftosaur account.

The builder moves the 29 per-occurrence RTT `update` overrides' numeric INTRO set-shape parameters into corresponding `progress` records and integrates one RTT dispatcher in the inherited Adaptive template `update`. An H1 rollover stale-state write barrier is appended once to the inherited template `progress` body. These are the two source defects isolated in previous native experiments: shadowed queued→active deload, and a later re-persisted shared-key anchor that undoes a reset.

Python `unittest` on synthetic source: **8/8 PASS** including strict topology, duplicate IDs, idempotence, expected SHA-256 and exclusive output guards. The CLI creates generated files owner-only (0600); source and manifest are never committed.

## Direct original native proof (no JavaScript source overlay)

A new runner `scripts/hybrid2-runtime-parity/run-fitness-generated-m6-native.mjs` requires the explicit new Python generator path and frozen private source/runtime roots. It builds **two fresh physical program files**: normal M6 and queued-state M6; their manifests bind both frozen input SHA-256 to generated output SHA-256. These artifacts are executed **directly** by the unchanged original Liftosaur runtime `ce75750bde4a190682fb5a6fa1984fc9184a9842`, via the existing genuine native runner's new `M6_GENERATED_CANDIDATE_DIR` mode. In this mode `centralizeRttUpdate` and `addStaleH1WriteBarrier` are **not called**; the runner only uses the already generated Python output.

| Source | SHA-256 |
| --- | --- |
| Original normal M6 | `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df` |
| Original queued-state M6 | `b1f481de1385292b63ae12d7873c37f386e5f521c4807b89bfa503c8ddaa89e5` |
| Compiled normal M6 | `58acb488bc69ac8b2024c06a7549a67a3118d9f21b676f24a423544708b132e4` |
| Compiled queued-state M6 | `d0e99f5e41c9f40eeadaa05b14838c79e74be994dabf487dd8d431cdec1e61db` |

**Genuine original-native result: 29 `finish_workout` executions, 48 set access probes, 688 compared conditions, 0 mismatches.** It covers inherited Adaptive NORMAL, RTT INTRO, queued→active deload on A/B/C, H1 stale write-order protection and post-deload H1 relearning. The only difference from the older JavaScript-derived verified candidate is the comment describing the Python generator version; the complete executable source bytes are otherwise identical. [Privacy-safe result](fitness-python-m6-native-sanitized.json).

### Reproduction

```sh
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/shared-identity-followup-20261110"

M6_PYTHON_GENERATOR=/private/fitness/programs/hybrid2_m6_rtt_materializer.py \
M6_CANDIDATE_TMP=/dev/shm \
FITNESS_ROOT="$BASE/fitness" \
LIFTOSAUR_RUNTIME_ROOT="$BASE/liftosaur" \
PRIVATE_LIVE_ROOT="$BASE/private-live" \
H2_PARITY_OUT="$BASE/a-new-empty-native-output" \
node scripts/hybrid2-runtime-parity/run-fitness-generated-m6-native.mjs
```

The runner refuses unexpected source SHA-256, compiled SHA-256 and override count; creates private temporary compiled candidate files; runs direct native scenarios; and removes those candidates after completion. The only committed output is the safe counters/hashes summary, never raw personal Liftoscript.

## Boundaries

- This is an actual reusable source generator on an isolated **fitness** branch, not a change to the live Liftosaur user account, not a commit of private original M6, and not a deployment.
- The old frozen M6 source is still an independent expected RED (queued→active deload). It must not be silently reclassified. **A newly generated corrected candidate** now passes direct original-native execution.
- The source materializer is intentionally fail-closed on anything except the known M6 29-override pattern; this does not prove general program compatibility.
- The new generator is **not yet automatically invoked by the account promotion/deployment path**. Applying a corrected candidate to an actual program must require an explicit separate release decision.
- Full 36-occurrence native completed-set serializer → openGym frontend → HTTP → offline multi-device sync equivalence remains unproven; native Timed Load is independent and still not demonstrated.
