#!/usr/bin/env python3
"""Real Liftosaur vs openGym trigger-layer differential on K5/M6/SYN4.

This deliberately injects controlled ready/valid/weak observations; it is NOT
a test of H1 signal inference. The original source-pinned fitness H2M02
runtime matrix helpers and original generic controller Liftoscript codegen
perform the actual native controller mutations. Never claim full-plan parity.
"""
import argparse
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path

NAMES = ["Squat", "Bench Press", "Deadlift", "Overhead Press", "Bicep Curl", "Romanian Deadlift"]
TOPOLOGIES = {
    "K5": (["P1","P2","P3","P4","P5"], ["upper","lower","upper","upper","lower"]),
    "M6": (["A","A","B","B","C","C"], ["lower","upper","lower","upper","lower","upper"]),
    "SYN4": (["U1","L1","U2","L2"], ["upper","lower","upper","lower"]),
}
JS = """import fs from 'node:fs';
import { evaluateCycle } from './api/training-control/hybrid2/trigger.js';
const q=JSON.parse(fs.readFileSync(0,'utf8'));
try{process.stdout.write(JSON.stringify(evaluateCycle(q.projections,q.thresholds,q.state)))}
catch(error){process.stderr.write(String(error.stack||error));process.exitCode=1}
"""
SCENARIOS = {
    "stable": [{}],
    "incomplete": [{"skip": [1]}],
    "broad_once": [{"weak": [1,2]}],
    "fast": [{"weak": "ALL"}],
    "single_group": [{"weak": [1,3]}],
    "slow_two": [{"weak": [1,2]}, {"weak": [1,2]}],
    "streak_interrupt": [{}, {"weak":[1,2]}, {}, {"weak":[1,2]}],
}

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--fitness-root",type=Path,required=True)
    p.add_argument("--runtime-root",type=Path,required=True)
    p.add_argument("--opengym-root",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args()
    pinned=args.fitness_root / "tests/hybrid2/h2m02_t02_runtime_matrix.py"
    if not pinned.is_file(): raise SystemExit(f"Original unmodified matrix missing: {pinned}")
    sys.path.insert(0,str((args.fitness_root/"programs").resolve()))
    spec=importlib.util.spec_from_file_location("frozen_original_h2m02_runtime_matrix", pinned)
    m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
    if not (args.runtime_root/"README.txt").read_text().find(m.PIN)>=0:
        raise SystemExit("Pinned runtime mismatch")
    out={"schema":"HYBRID2-TRIGGER-ORIGINAL-CODEGEN-REAL-RUNTIME-DIFF-1",
        "sourceCommit":"9f2deb6c345643d7c0c793c52d358e496c2710d2",
        "runtimeCommit":m.PIN,
        "scope":"Trigger-only: synthetic weak/valid/ready input facts injected in original frozen generic controller progress codegen; no original H1 observation performance inference or subordinate ATP2",
        "records":[],"discrepancies":[]}
    suites=0;workouts=0;comparisons=0
    for tid,(positions,groups) in TOPOLOGIES.items():
        n=len(positions)
        for scenario,cycles in SCENARIOS.items():
            suites+=1
            tag=900+n*10+list(SCENARIOS).index(scenario)
            occ=[m.O(f"o{i}",i,positions[i-1],f"track{i}",f"s{i}",close=i==n) for i in range(1,n+1)]
            th={"minValidSignals":max(2,n-1),"broadWeakMin":2,"fastWeakMin":n,"slowBroadCycles":2,"weakRatio":.95}
            a=m.A(tag,n,occ,[x["occurrenceId"] for x in occ],sg=groups,thr=th)
            a["orderedCyclePositions"]=list(dict.fromkeys(positions))
            a["cycleStartPosition"]=positions[0]
            lines=["# Week 1"]
            dayLookup={}
            for i in range(1,n+1):
                pos=positions[i-1]
                if pos not in dayLookup:
                    dayLookup[pos]=len(dayLookup)+1
                    lines.append(f"## Day {dayLookup[pos]}")
                ops=[m.R("if (var.ctrl_deloadActive == 0) {"),
                    m.M(f"ready{i}","1","  "),m.M(f"seen{i}","1","  "),
                    m.M(f"valid{i}","1","  "),
                    m.M(f"weak{i}","completedReps[1] <= 4 ? 1 : 0","  "),
                    m.R("}")]
                if i==n:ops += m.closeops(a)
                lines.append(m.X(NAMES[i-1],tag,a,ops,sets=1))
            source="\n".join(lines)+"\n"
            previousStreak=0
            for cy,cycle in enumerate(cycles,1):
                weak=set(range(1,n+1)) if cycle.get("weak")=="ALL" else set(cycle.get("weak",[]))
                skipped=set(cycle.get("skip",[]))
                # Need to know exercise index within day (1 or 2 for M6).
                for day in range(1,len(dayLookup)+1):
                    commands=[]
                    for i,pos in enumerate(positions,1):
                        if dayLookup[pos]!=day:continue
                        localIndex=sum(1 for j in range(1,i+1) if positions[j-1]==pos)
                        if i in skipped:continue
                        commands.append(f"change_reps({localIndex},1,{3 if i in weak else 10})")
                        commands.append(f"complete_set({localIndex},1)")
                    commands.append("finish_workout()")
                    beforeHash=m.ses(args.runtime_root).q({"a":"e","t":source})["states"].get(str(tag),{})
                    source=m.run(args.runtime_root,source,commands,day)
                    workouts+=1
                    state=m.ev(args.runtime_root,source,tag)[0]
                    out["records"].append({"topology":tid,"scenario":scenario,"cycle":cy,"day":day,
                        "op":"finish_workout","state":{"seen":{str(i):state[f"seen{i}"] for i in range(1,n+1)},
                            "valid":{str(i):state[f"valid{i}"] for i in range(1,n+1)},
                            "weak":{str(i):state[f"weak{i}"] for i in range(1,n+1)},
                            "class":state["lastCycleClass"],"streak":state["badCycleStreak"],
                            "queued":state["deloadQueued"]}})
                projected=[{"signalId":f"s{i}","systemGroup":groups[i-1],
                    "ready":i not in skipped,"seen":i not in skipped,"valid":i not in skipped,
                    "weak":i in weak and i not in skipped} for i in range(1,n+1)]
                e=subprocess.run(["node","--input-type=module","-e",JS],cwd=args.opengym_root,
                    input=json.dumps({"projections":projected,"thresholds":th,"state":{"badCycleStreak":previousStreak}}),
                    text=True,capture_output=True,check=True)
                expected=json.loads(e.stdout)
                previousStreak=expected["state"]["badCycleStreak"]
                s=m.ev(args.runtime_root,source,tag)[0]
                want={"lastCycleClass":{"INDETERMINATE":0,"GOOD":1,"BROAD_WEAK":2}[expected["cycleClass"]],
                    "badCycleStreak":previousStreak,"deloadQueued":int(expected["queueDeload"]),
                    "allSignalsReady":int(expected["allReady"])}
                for slot, projection in enumerate(projected,1):
                    for field in ("ready","seen","valid","weak"):
                        want[f"{field}{slot}"]=int(projection[field])
                got={k:int(s[k]) for k in want}
                issues={k:{"liftosaur":got[k],"openGym":want[k]} for k in want if got[k]!=want[k]}
                comparisons+=len(want)
                row={"topology":tid,"scenario":scenario,"cycle":cy,"weak":sorted(weak),
                    "skipped":sorted(skipped),"decisions":want,"liftosaur":got,"issues":issues}
                out["records"].append(row)
                if issues:out["discrepancies"].append(row)
                if expected["queueDeload"] and cy!=len(cycles):
                    raise RuntimeError("Scenario crosses a queued->deload boundary; unsupported trigger-only scope")
    out.update(topologies=list(TOPOLOGIES),suites=suites,runtimeWorkouts=workouts,
        comparedFieldsAcrossCycleBoundaries=comparisons,failures=len(out["discrepancies"]))
    args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(out,indent=2,sort_keys=True)+"\n")
    print(json.dumps({k:out[k] for k in ("suites","runtimeWorkouts","comparedFieldsAcrossCycleBoundaries","failures")},indent=2))
    if out["discrepancies"]: raise SystemExit(1)

if __name__=="__main__":main()
