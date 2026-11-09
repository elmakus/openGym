# Current real M6 RTT per-occurrence `update` shadowing — native causal isolation

## Confirmed RED on unchanged current source

Using **fresh read-only** actual current program `qtwbbqff` (source SHA-256 `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`), original exact pinned Liftosaur `ce75750...` and frozen original Marta equipment fixture (not current actual gym), the [whole M6 native runner](../../../../scripts/hybrid2-runtime-parity/run-current-marta-lifecycle-native.mjs) reaches `deloadQueued=1` after 12 normal full original workouts, but the *next genuine native workout*, intended as start of deload, retains `deloadQueued=1, deloadActive=0, deloadStarted=0`. Actual second/third working sets remain available and H1 continues updating. Full nine-cycle diagnostic ran 27 original native workouts / 324 exercise first sets / 488 assertions and logged 97 mismatch *entries*, but **almost all are downstream consequences** of this one failed transition; do NOT interpret 97 as separate production defects or completed deload/relearn comparisons. [Sanitized RED trace](current-real-marta-lifecycle-red-compact.json), SHA-256 `5f55c146c55ef0ee4c89f8f14a805f0b5c3a2380c8729110833658057d3cad32`.

## Cause: occurrence-local RTT update overrides inherited Adaptive `update`

The live current source has `RTT-COMPOSITION:rttm04-t02.qtwbbqff.v1`. In each working exercise, a local `update: custom()` stores an RTT/INTRO mode-2 set change but does not delegate to the original Adaptive template `update` when `rttMode=0`. Native Liftosaur does **not** execute the template's inherited update in addition to the local one. The template `update` has the `state.deloadQueued`/`state.deloadActive` branch responsible for `numberOfSets = ceil(programNumberOfSets / 2)`, and `progress` requires that actual reduced-set shape to start `deloadActive=1`. Thus the local RTT override shadows/blocks the deload shape and transition even with correct queued state.

### Native scratch-only causal controls

The [runner](../../../../scripts/hybrid2-runtime-parity/run-current-marta-rtt-causal.mjs) starts from an authentic serialized full M6 source after four normal cycles (source SHA in evidence). Three *private scratch* variants were executed; neither fixture nor resulting source is committed or written to Liftosaur:

| Source variant | Local RTT occurrence overrides removed only in PRIVATE copy | Native `change_reps(1,3,6)` | After one real native workout |
|---|---:|---|---|
| Original current queued source | 0 | **accepted** (unreduced 3-set exercise) | queued=1; active=0; started=0 — RED |
| Remove only first exercise's RTT local update | 1 | **rejected** (`Set 3 not found`) | queued=0; active=1; started=1 — causal control PASS |
| Remove all occurrence RTT local updates | 29 | **rejected** | queued=0; active=1; started=1 — diagnostic control PASS |

The all-overrides-removed diagnostic then executed **the full three-day M6 native deload A→B→C**. Actual native reduced-set checks at each anchor and terminal closer: 10/10 correctly reject the out-of-range set. Six original H1 signal references, sample counts and guards remain frozen until C closer, when all six reset exactly to fresh LEARNING; per-signal Adaptive candidates survive the deload. Controller completes with queue=0, active=0, started=0, streak=0, class=0. **6 native finish_workout executions / 10 native set probes / 122 compared state fields or conditions, 0 unexpected discrepancies** (native original is an intentionally failing negative control). [Sanitized native causal result](real-marta-rtt-causal-compact.json), SHA-256 `609e98c9ae52ac573b32f6bfc367c4a8b0c2dbb9a0725f49746489537fc8f93b`.

### Classification and safety

**CONFIRMED source-integration regression in current M6 under frozen verified Marta settings**, at RTT per-exercise update inheritance / H2 deload shape boundary; this is **not** the earlier artificial synthetic closer-deload harness failure. Runtime faithfully executes the current source; the active account's actual equipment settings were not read/replayed, so full in-app reproduction remains unproven.

**Do NOT remove all 29 overrides as a production fix**: those guards also implement RTT INTRO behavior, and the diagnostic throws that behavior away. A real bounded fix must restore generic Adaptive update semantics in NORMAL and DELOAD while preserving RTT INTRO=2 and custom exercise-specific changes, with negative tests including multi-set Turbo, preserved states/identities, timed closer, deload, stale rollover, and full session replay. This validation branch intentionally contains no proposed product patch and does not authorize one.

Evidence source hashes and commands are public; full original Liftoscript plus private personal progression data remain only chmod-600 on the authorized remote computer. No repo main/feature branch, Liftosaur account, merge/deploy/APK changed.
