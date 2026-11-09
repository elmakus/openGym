#!/usr/bin/env python3
"""Generate an isolated Liftoscript H1 seam from frozen fitness code.

This is deliberately NOT a full production HYBRID-2 plan. The precise
observation setup and H1 transition body come from fitness@9f2deb6.
Synthetic candidate progression and audit fields are harness-owned.
"""
import argparse
import hashlib
import importlib
import json
import sys
from pathlib import Path

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--fitness-root", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    args = p.parse_args()
    programs = args.fitness_root / "programs"
    required = ["hybrid2_h1_liftosaur_codegen.py", "hybrid2_promotion_materializer.py",
                "hybrid2_controller_state.py"]
    for filename in required:
        if not (programs / filename).is_file():
            raise SystemExit(f"Missing frozen original source: {programs / filename}")
    sys.path.insert(0, str(programs.resolve()))
    import hybrid2_h1_liftosaur_codegen as h1
    import hybrid2_promotion_materializer as materializer
    if h1.h1_codegen_metadata()["metricVersion"] != "H1-EPL-1":
        raise SystemExit("Unexpected original H1 metric version")
    setup = materializer._observation_setup("")
    observation = h1.render_h1_observation()
    prefix = """# Week 1
## Day 1
Squat / 1x10 / 75lb / id: tags(843) / update: custom() {~
~} / progress: custom(perf1: 0kg, perf2: 0kg, perf3: 0kg, perfCount: 0, perfReference: 0kg, candidateGuard: 0, candidate: 75lb, paired: 0, ctrl_rolloverClear: 0, auditWeak: 0, auditValid: 0, auditReady: 0, auditReset: 0, auditGuardBefore: 0, auditRefBefore: 0kg, auditPerformance: 0kg) {~
/// Isolated pinned original H1 seam. Candidate increase at 12 reps is synthetic.
var.ctrl_rolloverClear = state.ctrl_rolloverClear
var.preCandidateController = state.candidate
if (completedNumberOfSets > 0 && completedReps[1] == 12) {
  state.candidate = state.candidate + 5lb
}
"""
    suffix = """
state.auditWeak = var.anchorWeak
state.auditValid = var.anchorValid
state.auditReady = var.anchorReady
state.auditReset = var.anchorReset
state.auditGuardBefore = var.guardBeforeH1
state.auditRefBefore = var.referenceBeforeH1
if (var.hasComparableH1 == 1) {
  state.auditPerformance = var.performance
}
~}
"""
    script = prefix + setup + "\n" + observation + "\n" + suffix
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(script)
    digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    print(json.dumps({"generatedSha256": hashlib.sha256(script.encode()).hexdigest(),
        "originalSource": "fitness@9f2deb6c345643d7c0c793c52d358e496c2710d2",
        "metric": h1.h1_codegen_metadata(), "sourceSha256": {
            name: digest(programs / name) for name in required}}, sort_keys=True))

if __name__ == "__main__":
    main()
