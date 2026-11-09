# Current actual read-only K5 and M6 program native runtime checks — 2026-11-09

## Sources and non-mutation guarantee

Fresh Liftosaur connector **read-only** `get_program` returned full current sources:
- `qtwbbqff`: SHA-256 `7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df`, M6;
- `npyswbiu`: SHA-256 `74420646c1c5826f77d842025291f75f7d89367f46265818a43a92cacfec662e`, K5.

Both were already accepted `HYBRID-2`/`HYBRID-STATE-2`/`H1-EPL-1`/`H1-ASYM-M3-1` with no native `calculate1RM()`. Historical prepromotion materializer **correctly refuses** to redo the transition (`no predecessor calculate1RM H1 block found`). Do not treat this as a defect. [Sanitized source metadata](current-live-source-metadata.json) includes structural cardinality and SHA only. Raw source (and native-state details including actual weights) is **NOT committed**; private chmod-600 remote scratch only. No live Liftosaur changes, no staging or production writes.

These tests run exact current source with original native Liftosaur `ce75750bde4a190682fb5a6fa1984fc9184a9842`, but **NOT** account-current equipment. M6 uses exact frozen original Marta baseline settings from fitness; K5 uses a parser-only generated custom-exercise registry derived from original H2PERF-T04 and a generic frozen equipment profile. This distinction materially limits acceptance.

## M6 current source: 12 original native workouts PASS through queue

Original `Program_evaluate` includes one `used:none` template on M6 day A; this is not an executable exercise. Actual native session topology **A 11, B 13, C 12** (36 executable occurrences) matches old adapter; raw static 12/13/12 is a harness measurement artifact, **not topology drift**.

[Runner](../../../../scripts/hybrid2-runtime-parity/run-current-marta-native.mjs) simulates 4 complete original 3-day M6 cycles with all 36 exercises completed at least once per structural cycle (12 workouts / 144 actual exercise first sets), six native H1 signals per cycle, and explicit real original `finish_workout`/serialized continuation. Uses native workout records as input to openGym `h1FromExposure`, `observeAnchor`, `evaluateCycle`. **156 compared fields / 0 discrepancies.**

Native controller after cycles 1→4: `INDETERMINATE, INDETERMINATE, GOOD, BROAD_WEAK`, with streak `0,0,0,1` and deload queue `0,0,0,1`. Direct [sanitized trace](current-real-marta-native-compact.json) includes per-exercise/source hashes, H1 sample classification and vote and state digests, without raw source or personal load details.

## K5 current source: five-day original native but paired limitation

[Runner](../../../../scripts/hybrid2-runtime-parity/run-current-krzysztof-native.mjs) registered all 38 frozen original K5 occurrence labels in a synthetic custom-exercise registry. Native parser PASS; real executable 8+9+7+4+10=38 exercises over five days (two `used:none` templates excluded). Four complete cycles ran, **20 actual native workouts / 152 exercise first sets / 132 comparisons**. Four recorded H1 step differences are confined to the `Single-Leg Leg Press` `paired:1` signal on Saturday.

**These four are not proven product bugs.** Original runtime Playground supports `change_reps(exercise,set,reps)`, but NOT `change_reps_left`; actual paired left-side result stays unset in this fixture. The naive openGym one-sided exposure mapper cannot claim an equivalent two-sided observation. A native command to set left reps was rejected (`Invalid command: change_reps_left(1,1,10)`). Four other H1 signals match. Proper paired first-set parity remains **UNVERIFIED/INDETERMINATE**, with raw first-side provenance held private; do not count this as an H1 algorithm regression. [Sanitized K5 trace](current-real-krzysztof-limited-compact.json) preserves all source hashes, counts, and failure-field names.

## Unproven

Actual K5/M6 current account gyms/equipment, full one-to-one source prescription/exposure mappings, native paired bilateral outcomes, complete current H1 deload/rollover under unmodified RTT composition, and openGym persisted history/replay remain outside accepted PASS.
