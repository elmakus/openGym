#!/usr/bin/env python3
"""Scratch-only ATP2 original source + original H1 codegen overlay. No product writes."""
import hashlib, json, os, sys
from pathlib import Path
srcroot=Path(os.environ["FITNESS_ROOT"])
out=Path(sys.argv[1])
source=srcroot.joinpath("programs/adaptive_rep_engine_turbo_probe_candidate.liftoscript").read_text()
assert hashlib.sha1(("blob "+str(len(source.encode()))+"\0").encode()+source.encode()).hexdigest()=="4d6452c2dd2a2ddd45f8b8d653d4ebcf3c37e170"
sys.path.insert(0,str((srcroot/"programs").resolve()))
import hybrid2_promotion_materializer as promo
import hybrid2_h1_liftosaur_codegen as h1
assert h1.h1_codegen_metadata()['metricVersion']=="H1-EPL-1"
progbegin=" / progress: custom(minTarget: 1"
assert source.count(progbegin)==1
p=source.index(progbegin)
template=source[:p]
body=source[p:]
assert template.count(" / update: custom(")==1
# Keep the *entire* original ATP2 progress calculation unchanged; inject the exact
# original H1 adapter setup and H1 codegen once, after original ATP2 changes.
needle="  state.candidate = var.candidate"
assert body.count(needle)==1
body=body.replace(needle,needle,1)
start=body.index(" / progress: custom(")
done=body.index("\n~}",start)
prog=body[start:done]
assert prog.count("  weights = state.candidate")==1
# Capture candidate before original ATP2 logic executes, in the original progress template.
progressStart=" {~\n  var.phaseFresh = 0"
assert prog.count(progressStart)==1
prog=prog.replace(progressStart," {~\n  var.preCandidateController = state.candidate\n  var.ctrl_rolloverClear = 0\n  var.phaseFresh = 0",1)
# Original source untouched up to its terminal write; H1 is a trailing appended observer.
prog += "\n"+promo._observation_setup("  ")+"\n"+h1.render_h1_observation(indent="  ")
prog += """
  state.auditWeak = var.anchorWeak
  state.auditValid = var.anchorValid
  state.auditReady = var.anchorReady
  state.auditGuardBefore = var.guardBeforeH1
  state.auditRefBefore = var.referenceBeforeH1
  state.auditReset = var.anchorReset
"""
body=body[:start]+prog+body[done:]
# Template's own progress state schema must also declare every newly referenced
# H1 field for Liftosaur validation, even though the exercise uses separate state.
templateArgs="progress: custom(minTarget: 1, maxTarget: 1, candidate: 0kg, floorWeight: 0kg, counterWeight: 0kg, lowCount: 0, counterActive: 0, paired: 0, probeActive: 0)"
assert body.count(templateArgs)==1
extra=", perf1: 0kg, perf2: 0kg, perf3: 0kg, perfCount: 0, perfReference: 0kg, candidateGuard: 0, auditWeak: 0, auditValid: 0, auditReady: 0, auditGuardBefore: 0, auditRefBefore: 0kg, auditReset: 0"
body=body.replace(templateArgs,templateArgs[:-1]+extra+")",1)
lat="Lat Pulldown / ...Adaptive Rep Engine Template"
assert body.count(lat)==1
args="progress: custom(minTarget: 8, maxTarget: 15, candidate: 10kg, floorWeight: 5kg, counterWeight: 10kg, counterActive: 1, lowCount: 0, probeActive: 0)"
assert body.count(args)==1
newargs=args[:-1]+", perf1: 0kg, perf2: 0kg, perf3: 0kg, perfCount: 0, perfReference: 0kg, candidateGuard: 0, auditWeak: 0, auditValid: 0, auditReady: 0, auditGuardBefore: 0, auditRefBefore: 0kg, auditReset: 0)"
body=body.replace(args,newargs,1)
result=template+body
assert "calculate1RM(" not in result
out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(result)
print(json.dumps({"schema":"ATP2-H1-ORIGINAL-COMPOSITE-FIXTURE-1","sourceFitnessCommit":"9f2deb6c345643d7c0c793c52d358e496c2710d2","originalAtp2GitBlob":"4d6452c2dd2a2ddd45f8b8d653d4ebcf3c37e170","generatedSha256":hashlib.sha256(result.encode()).hexdigest(),"h1OriginalMetadata":h1.h1_codegen_metadata(),"injection":"nonproduction read-only H1 after frozen original ATP2 custom progress"}))
