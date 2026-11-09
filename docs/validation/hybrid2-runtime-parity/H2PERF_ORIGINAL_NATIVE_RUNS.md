# Authentic original fitness H2PERF-T03 and H2PERF-T04 native runs (2026-11-09)

## Source pin and commands

Original `elmakus/fitness@9f2deb6c345643d7c0c793c52d358e496c2710d2`. **UNMODIFIED** source runner files obtained by GitHub connector:
- `tests/runtime/h2perf_t03_runtime.cjs` Git blob SHA-1 `78ff5de1c829bae0969730c73183aed5e8229a7a`.
- `tests/hybrid2/h2perf_t03_differential.py` Git blob `450a6f88b1577321ac039036028527f56213e82a`.
- `tests/runtime/h2perf_t04_real_adapters.cjs` Git blob `57bc2a6d685f151b6d17b3705050326538649146`.
- Underlying K5 real Liftoscript Git blob `413fadc846d8f25ce1616bf2b1f06ba5748a005b`; M6 real source blob `3c40b21204bcfd6296874081450e375ff28a7d2c`.
- Exact original committed Marta settings test files loaded via unchanged `build_settings.cjs` Git blob `fa293df364ef2a5190ab9f2c03187f09c3d3fdb5`; its required JSON `exercise_data.json`, `exercises.json`, `gym.json`, `scaffold.json` restored from same private pinned source.
- Native original runtime checkout `liftosaur@ce75750bde4a190682fb5a6fa1984fc9184a9842`. Both tests executed on `elmakus-HP-EliteDesk-800-G2-SFF`, isolated temporary workspace. Zero live/staging writes.

```sh
# from original fitness repo root, on runtime machine with pinned source and fixture files:
node tests/runtime/h2perf_t03_runtime.cjs /tmp/hybrid2-runtime-parity-20261109/liftosaur /tmp/hybrid2-runtime-parity-20261109/fitness
node tests/runtime/h2perf_t04_real_adapters.cjs /tmp/hybrid2-runtime-parity-20261109/liftosaur /tmp/hybrid2-runtime-parity-20261109/fitness
```

## Results (original unmodified scripts)

1. [H2PERF-T03 native JSON](h2perf-t03-original-native.json): **PASS**, 49 continuation boundaries, native parser/serializer, first 3 sample seeding, Epley 100kg×10=133.3333 and ×15=150, both anti-`calculate1RM` and anti-monotonic-ratchet negative controls **rejected**; successful deterministic replay. Native `calculate1RM` control: 136.4 and 166.4, showing why the accepted controller metric is different. Original oracle/controller/current H1 codegen compared on pinned original Liftosaur. Aggregate hashes are native runner output; **not** a complete per-step openGym differential.
2. [H2PERF-T04 native JSON](h2perf-t04-original-native.json): **PASS** for original real-plan K5(5 signals)/M6(6 signals) adapter materialization and native parse/serialize (see specific SHA-256 of original materialized source and continuation in report); 0 `calculate1RM` paths. This is an original **real adapter H1 fixture probe**, not full current-plan trigger/deload/ATP2 parity.

## Important: not the historical H2M03-T03/T04

These two **H2PERF-T03/T04** current-H1 provenance-specified runners are distinct from **H2M03-T03/T04** historical long-horizon/real-plan runners referred to in the handoff. The historical original H2M03-T03 runner insists on the original 331,633,475-byte archive SHA-256 and source matrix records; T04 also requires `/mnt/data/h2runtime/t04_marta_snapshot.json`. The Desktop Commander host does NOT have those original `/mnt/data` artifacts. The older runners also encode rejected `calculate1RM` and monotonic-ratchet H1 mathematics; **they are still NOT EXECUTED**, and cannot pass as modern H1 proof even if restored.

No source, state, production, branch, live data or user programs changed; restoration of source/fixtures was only into temporary original fitness workspace.
