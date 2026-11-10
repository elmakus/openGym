# M6 source-promotion read-only preflight — actual fitness code and native runtime

**Date:** 2026-11-10
**openGym validation parent:** `1703e8ae640e39dd4d288a73273efe55bd027766`
**Fix source:** [elmakus/fitness draft PR #22](https://github.com/elmakus/fitness/pull/22), `fix/m6-rtt-centralized-h1-persistence`, head `8f76a1790c4ec4601e2a5ea4027ac9c8f6c30485`.
**Scope:** source preparation and native runtime only; no live account actions.

## Actual new implementation

`fitness/programs/hybrid2_m6_rtt_preflight.py` is **a callable source-preparation module and offline CLI**, not another mock progression rule. It consumes one complete `get_program`-shaped payload for the canonical Marta `qtwbbqff` target, checks an independently supplied SHA-256, and calls the real `hybrid2_m6_rtt_materializer.py` generator to build a separate corrected M6 source candidate. It verifies:

- The exact accepted program ID/name, H2 controller version, original H1 Epley/asymmetric reference markers and preexisting ownership/reset contracts.
- **Exactly 36 prescribed exercises** in identical order, with byte-identical original exercise headers including original native IDs, reps, weights, warmups and other prescription fields.
- **Exactly 30 existing persisted progress blocks** (one controller/template plus 29 RTT occurrence-local). All original fields/values remain identical. Only `rttIntroA`, `rttIntroB`, `rttIntroC` are added in each.
- **Exactly 29** recognized RTT update overrides, and one newly generated H1 stale-write barrier. Rejects unknown source topology and duplicate RTT blocks.
- Strict SHA-256 of the **raw** original source, preserving existing trailing newlines and user-owned state rather than applying the unrelated H2-M04 migration normalizer.
- CLI output is exclusive create with `0600` permissions for candidate and manifest. No overwrite, no account write and no private source text in logged/committed manifest.

**Python regression tests:** **18/18 PASS** — 8 real generator cases and 10 source-preflight/CLI cases. Negative controls reject wrong account/program, incorrect SHA, a deleted occurrence, changed exercise prescription, modified historical candidate, changed H1 markers and unsafe re-use of existing output path. These tests use synthetic source generated from the existing target registry; no private Liftoscript is committed.

## Preflight from frozen source directly into original native Liftosaur

New `scripts/hybrid2-runtime-parity/run-fitness-preflight-m6-native.mjs` constructs two **private, locally pinned copies shaped like `get_program`** (normal M6 and queued-state M6), invokes the real Python preflight CLI against each, saves SHA/shape-verified files into an owner-only temp directory, then executes the **Python-generated candidates directly** in the genuine frozen original Liftosaur runtime (without any JavaScript source overlay). Candidate temp files and private get_program-shaped payloads are deleted in the runner's `finally` block.

| Reference | SHA-256 |
| --- | --- |
| Original normal M6 | `7b1c7d114229b4d1cf86093409d7d89ea4e7d88e6a0c1c4c89bcba30a4a425df` |
| Generated normal M6 | `58acb488bc69ac8b2024c06a7549a67a3118d9f21b676f24a423544708b132e4` |
| Original queued-state M6 | `b1f481de1385292b63ae12d7873c37f386e5f521c4807b89bfa503c8ddaa89e5` |
| Generated queued-state M6 | `d0e99f5e41c9f40eeadaa05b14838c79e74be994dabf487dd8d431cdec1e61db` |

Native result (same scenario family rerun, **not additional unique historical cases**): **29 genuine original Liftosaur finished workouts, 48 set probes, 688 field/condition comparisons, 0 differences**. Supports NORMAL Adaptive, RTT INTRO, queued-to-active deload and A/B/C deload, H1 stale state write barrier, post-deload relearning. Both candidate SHA-256 hashes match those from the earlier source-generator-only pipeline. [Sanitized read-only preflight and native execution proof](fitness-preflight-m6-native-sanitized.json).

The native runner supports either the original generator manifest or the stricter `preflight` manifest. Both paths verify input hash, candidate hash, 29 normalized overrides and, for a preflight manifest, exact `qtwbbqff` target and 36 occurrences. The original previously recorded **unmodified M6 RED** remains RED: its broken override logic is not silently relabeled GREEN.

### Reproduction (authorized offline host)

```sh
BASE=/tmp/hybrid2-runtime-parity-20261109
cd "$BASE/shared-identity-followup-20261110"
M6_PYTHON_PREFLIGHT=/private/fitness/programs/hybrid2_m6_rtt_preflight.py \
M6_CANDIDATE_TMP=/dev/shm \
FITNESS_ROOT="$BASE/fitness" \
LIFTOSAUR_RUNTIME_ROOT="$BASE/liftosaur" \
PRIVATE_LIVE_ROOT="$BASE/private-live" \
H2_PARITY_OUT="$BASE/new-empty-preflight-output" \
node scripts/hybrid2-runtime-parity/run-fitness-preflight-m6-native.mjs
```

The output directory must be new/empty. Only the sanitized summary is checked into Git. Local private logs are not published.

## Remaining release boundaries

- **A fresh live Liftosaur `get_program` API call was NOT performed.** This stage uses frozen private source texts in an identical payload shape. It proves the code pathway but cannot assert the active account still has the same source SHA/settings.
- **No real live program update, promotion write, history migration or `main` merge** occurred. The fitness PR remains **draft**.
- Original current M6 contains the RTT bug until replacement is explicitly reviewed/deployed. The generator only produces a corrected candidate when invoked.
- This is not the complete original-36-occurrence native finished-set → openGym frontend → HTTP/offline two-device parity, and does not establish native Timed Load parity.
