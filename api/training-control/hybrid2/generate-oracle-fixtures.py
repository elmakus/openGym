#!/usr/bin/env python3
"""Freeze replayable HYBRID-2 differential cases from an explicitly supplied
fitness/tests/oracle/hybrid2_performance_reference_oracle.py source checkout.

Run:
 python3 api/training-control/hybrid2/generate-oracle-fixtures.py \
   /path/to/fitness/tests/oracle/hybrid2_performance_reference_oracle.py \
   api/training-control/hybrid2/fixtures/h1-python-oracle.json

Use a checkout of fitness@9f2deb6c345643d7c0c793c52d358e496c2710d2.
The fixture contains source file SHA-256 to permit an independent reproducibility check.
"""
from __future__ import annotations
from dataclasses import asdict
import hashlib
import importlib.util
import json
import random
import sys
from pathlib import Path

SOURCE_COMMIT = "9f2deb6c345643d7c0c793c52d358e496c2710d2"


def main(source: Path, output: Path) -> None:
    spec = importlib.util.spec_from_file_location("h2oracle", source)
    if not spec or not spec.loader:
        raise RuntimeError("Could not load explicitly provided Python oracle")
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    rng = random.Random(20260915)
    trajectories = []
    for index in range(160):
        state = mod.H1State()
        score = rng.uniform(35.0, 190.0)
        events, expected = [], []
        for step in range(rng.randint(15, 42)):
            choice = rng.random()
            kind = mod.COMPARABLE if choice < .75 else (
                mod.MISSING if choice < .82 else
                mod.INVALID if choice < .89 else
                mod.INDETERMINATE if choice < .97 else mod.DISCONTINUITY)
            if step % 13 == 0:
                score *= .92
            if step % 19 == 0:
                score *= 1.11
            score = max(1.0, score + rng.uniform(-3.1, 3.1))
            candidate = rng.random() < .10
            frozen = rng.random() < .035
            event = dict(kind=kind, score=score if kind == mod.COMPARABLE else None,
                         mode=mod.DELOAD_FROZEN if frozen else mod.NORMAL,
                         candidateRaised=candidate)
            decision = mod.observe(state, score=event["score"], kind=event["kind"],
                                   mode=event["mode"], candidate_raised=candidate)
            state = decision.state
            events.append(event)
            expected.append({
                "samples": list(state.samples), "reference": state.reference,
                "candidateGuard": state.candidate_guard,
                "ready": decision.ready, "validVote": decision.valid_vote,
                "weak": decision.weak, "guarded": decision.guarded,
                "reset": decision.reset, "referenceBefore": decision.reference_before,
            })
        trajectories.append({"id": index, "events": events, "expected": expected})
    output.parent.mkdir(parents=True, exist_ok=True)
    value = {
        "sourceCommit": SOURCE_COMMIT,
        "oraclePath": "tests/oracle/hybrid2_performance_reference_oracle.py",
        "oracleSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "generator": "deterministic-python-reference-v1",
        "trajectories": trajectories
    }
    output.write_text(json.dumps(value, separators=(',', ':'), allow_nan=False) + '\n', encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Expected source oracle filename and output fixture filename")
    main(Path(sys.argv[1]), Path(sys.argv[2]))
