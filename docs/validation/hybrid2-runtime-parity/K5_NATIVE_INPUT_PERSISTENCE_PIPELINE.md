# K5 original-native bilateral input → real openGym persisted-history/replay pathway (2026-11-10)

## Result / precise scope

**PASS: 20 actual openGym `buildCompletedSession` sessions → JSON history records → canonical `replayHybridHistory` and `reconcileHybridHistory`, 4 persisted two-sided set groups, 199 assertions, 0 failures.** The inputs come from a **previously genuinely executed** original pinned Liftosaur K5 native differential; this suite does **not** reexecute the original runtime, and **adds zero new native workouts**. It is a real openGym frontend/API integration-path run, **not a Liftosaur simulator**.

Evidence input: source-native bilateral K5 test [K5_PAIRED_NATIVE_HISTORY_DIFF.md](K5_PAIRED_NATIVE_HISTORY_DIFF.md), transcript SHA-256 `44a84c1dbe7439909810d1e7275f22a1afbcf94dcbbff10d937cef7a8a814e31` (original current K5 source SHA-256 `74420646c1c5826f77d842025291f75f7d89367f46265818a43a92cacfec662e`; frozen original runtime `ce75750bde4a190682fb5a6fa1984fc9184a9842`). This harness runs the openGym production/base `8529b2d41b28fea8ae96a50325aaf28e864a0160` code through the isolated validation checkout.

## Verified path

1. For each original native K5 cyclic position, import the observed first-set repetitions **from the genuine native transcript**. Left/right repetitions remain independent: `10/10`, `9/10`, `8/9`, `7/10`.
2. Create full K5 fixture routine exposures with the real `buildSessionExposures`. The K5 source-style occurrence IDs map to the fixture adapter identities. One leg-press occurrence is marked `side:true`, and the timed closer uses the real Timed Load source module.
3. Generate actual editable workout entries with `entriesForExposures`; commit both actual side rows via `syncSideAggregate` and mark work sets completed.
4. Finish all 20 actual openGym sessions using `buildCompletedSession`, converting the record to JSON and parsing it again to exercise the serialized-history boundary. Persist into a **scratch in-memory profile**. This is **not** a production DB/IndexedDB/server persistence test.
5. Confirm each saved bilateral `performance.sets` has separate L and R rows with the same `setId` and exact independent reps. Reconstruct the UI via `rowsOfPerformance`, checking both sides separately and preserved comparability.
6. Replay chronological history via `replayHybridHistory`; compare it to `reconcileHybridHistory` output after **every one** of 20 persisted sessions, check native H1 sample counts for corresponding signal identities, and replay the same JSON again for idempotence.
7. Verify canonical replay is insensitive to input array reversal, and both `replayAtp2History` and `replayTimedLoadHistory` retain non-empty source-defined records.

All 199 comparisons pass. There are 20 saved canonical workouts with complete original-native-sourced first-set repetitions and four correctly preserved two-sided records; each replay has the expected H1 sample count. Final fixture status is `QUEUED`.

## Important non-parity boundaries

- This is a **transport/persistence/identity test**. The original K5 workout source is unchanged, and its observed reps are used, but this openGym fixture uses a synthetic constant load and an adapter mapped to openGym's own exercise registry. It is **not** an apples-to-apples candidate-weight or H1 `perfReference` numeric comparison against the original Liftosaur K5 workout; these outcomes cannot be equated without identical active equipment and real program prescriptions.
- The final fixture controller status `QUEUED` is **not claimed** to equal the original live K5 controller status. Any difference remains non-comparable under the synthetic fixture conditions.
- JSON stringify/parse demonstrates persisted document shape and replay; it does not verify actual browser IndexedDB, cloud server write, multi-device synchronization or database migration.
- 20 original-native workouts/488 checks **already counted** in the preceding K5 native stage are not counted again. The present stage adds **20 real openGym frontend sessions and 199 frontend/API assertions, 0 new native workouts**. The native running total stays 750 workouts and 9,364 original-native-comparison assertions before these separate 199 frontend assertions.
- Does not resolve real M6 RTT override, induced stale shared-tag race, H1 21–22 reps policy, actual live gym settings or full multiset Turbo.

## Exact reproduction

```sh
cd /tmp/hybrid2-runtime-parity-20261109/validation-checkout
export H2_PARITY_OUT=/tmp/hybrid2-runtime-parity-20261109/evidence
# The input source must be freshly obtained from the separate genuine native pinned K5 runner:
# FITNESS_ROOT=... LIFTOSAUR_RUNTIME_ROOT=... PRIVATE_LIVE_ROOT=... \
# node scripts/hybrid2-runtime-parity/run-current-krzysztof-paired-native.mjs
node scripts/hybrid2-runtime-parity/run-native-k5-history-pipeline.mjs
# Expected PASS: 20 stored openGym sessions, 4 paired records, 199 checks, zero issues.
```

[Sanitized JSON evidence](native-k5-open-gym-persisted-pipeline-sanitized.json): SHA-256 `8cf262735fc57a6ee4819c9306582dcedbc3a0fed124a15c566f16c0cab2b94a`; runner SHA-256 `f2ca5377a7c9c75308e53d4faf489fb562da7b80b15b340f0b95c6b150b0ab91`. Only controlled fixture reps and boolean/state metadata are published; user Liftoscript source, personal working loads, credentials and actual account history are absent.
