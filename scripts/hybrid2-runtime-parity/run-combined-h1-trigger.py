#!/usr/bin/env python3
"""Synthetic combined frozen-source H1 + original controller write-through, real Liftosaur vs openGym.
Not a production materialized-plan test. Each signal uses separate exercise progression identity.
"""
import argparse, importlib.util, json, os, subprocess, sys, hashlib
from pathlib import Path
NAMES=["Squat","Bench Press","Deadlift","Overhead Press","Bicep Curl","Romanian Deadlift"]
TOPOLOGIES={
 "K5":(["P1","P2","P3","P4","P5"],["upper","lower","upper","upper","lower"]),
 "M6":(["A","A","B","B","C","C"],["lower","upper","lower","upper","lower","upper"]),
 "SYN4":(["U1","L1","U2","L2"],["upper","lower","upper","lower"])}
JS="""import fs from 'node:fs';import {initialAnchor,observeAnchor,loadedRepScore} from './api/training-control/hybrid2/h1.js';import {evaluateCycle} from './api/training-control/hybrid2/trigger.js';const q=JSON.parse(fs.readFileSync(0,'utf8')); let states=q.states.map(s=>s||initialAnchor());let votes=[];for(let i=0;i<states.length;i++){let o=observeAnchor(states[i],{kind:'COMPARABLE',performance:loadedRepScore(75*.45359237,q.reps[i])});states[i]=o.state;votes.push({ready:o.ready,valid:o.validVote,weak:o.weak});}let trigger=null;if(q.close){let projections=votes.map((v,i)=>({signalId:'s'+(i+1),systemGroup:q.groups[i],ready:v.ready,seen:true,valid:v.valid,weak:v.weak})); trigger=evaluateCycle(projections,q.thresholds,{badCycleStreak:q.streak});}console.log(JSON.stringify({states,votes,trigger}));"""
def kg(v):
 if isinstance(v,(int,float)):return float(v)
 if isinstance(v,dict):
  if v['unit']=='kg':return float(v['value'])
  if v['unit']=='lb':return float(v['value'])*.45359237
 raise ValueError('weight '+repr(v))
def close(a,b,tol=.01):
 return abs(a-b)<=tol
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--fitness-root',type=Path,required=True);ap.add_argument('--runtime-root',type=Path,required=True);ap.add_argument('--opengym-root',type=Path,required=True);ap.add_argument('--out',type=Path,required=True);args=ap.parse_args()
 p=args.fitness_root/'tests/hybrid2/h2m02_t02_runtime_matrix.py'
 sys.path.insert(0,str((args.fitness_root/'programs').resolve()))
 sp=importlib.util.spec_from_file_location('original_h2m02',p);m=importlib.util.module_from_spec(sp);sp.loader.exec_module(m)
 import hybrid2_h1_liftosaur_codegen as h1
 import hybrid2_promotion_materializer as promo
 assert m.PIN in (args.runtime_root/'README.txt').read_text()
 assert h1.h1_codegen_metadata()['metricVersion']=='H1-EPL-1'
 out={"schema":"HYBRID2-NATIVE-COMBINED-H1-TRIGGER-DIFFERENTIAL-1","sourceCommit":"9f2deb6c345643d7c0c793c52d358e496c2710d2","runtimeCommit":m.PIN,"openGymBase":"8529b2d41b28fea8ae96a50325aaf28e864a0160","scope":"Isolated native Liftoscript combining frozen original _observation_setup and H1 codegen with original generic controller render_controller_progress. Not a full materialized production plan or deload/ATP2 suite.","runs":[],"issues":[],"workouts":0,"comparedFields":0}
 def issue(top,scenario,cycle,day,signal,field,a,b):
  out["issues"].append({"topology":top,"scenario":scenario,"cycle":cycle,"day":day,"signal":signal,"field":field,"liftosaur":a,"openGym":b})
 for topology,(pos,groups) in TOPOLOGIES.items():
  n=len(pos)
  for scenario in ['fast','slow']:
   occ=[m.O('o'+str(i),i,pos[i-1],'id'+str(i),'s'+str(i),close=i==n) for i in range(1,n+1)]
   th={'minValidSignals':max(2,n-1),'broadWeakMin':2,'fastWeakMin':n,'slowBroadCycles':2,'weakRatio':.95}
   a=m.A(1000+n*10+(1 if scenario=='fast' else 2),n,occ,[x['occurrenceId'] for x in occ],sg=groups,thr=th)
   a['orderedCyclePositions']=list(dict.fromkeys(pos));a['cycleStartPosition']=pos[0]
   tag=a['controllerTag'];lines=['# Week 1'];days={}
   for i in range(1,n+1):
    if pos[i-1] not in days:
     days[pos[i-1]]=len(days)+1;lines.append('## Day '+str(days[pos[i-1]]))
    globals={f:'0' for f in m.controller_global_fields(a)}
    local={'perf1':'0kg','perf2':'0kg','perf3':'0kg','perfCount':'0','perfReference':'0kg','candidateGuard':'0','candidate':'75lb','paired':'0'}
    init=', '.join(f'{k}: {v}' for k,v in {**globals,**local}.items())
    prefix='var.preCandidateController = state.candidate'
    logic=prefix+'\n'+promo._observation_setup('')+'\n'+h1.render_h1_observation()
    ops=[m.R(line) for line in logic.splitlines()]+[m.M('ready'+str(i),'var.anchorReady'),m.M('seen'+str(i),'1'),m.M('valid'+str(i),'var.anchorValid'),m.M('weak'+str(i),'var.anchorWeak')]
    if i==n:ops+=m.closeops(a)
    src=m.render_controller_progress(a,ops)
    lines.append(f'{NAMES[i-1]} / 1x10 / 75lb / id: tags({tag}) / update: custom() {{~\n~}} / progress: custom({init}) {{~\n{src}\n~}}')
   source='\n'.join(lines)+'\n';states=[None]*n;streak=0
   for cycle in range(1,6 if scenario=='fast' else 7):
    reps=[10]*n if cycle<=3 else ([7]*n if scenario=='fast' else [7 if i<2 else 10 for i in range(n)])
    # STOP after the queue cycle; no claim of deload.
    for day in range(1,len(days)+1):
     indices=[i for i,x in enumerate(pos) if days[x]==day]
     commands=[]
     for local_idx,i in enumerate(indices,1):
      commands.extend([f'change_reps({local_idx},1,{reps[i]})',f'complete_set({local_idx},1)'])
     commands.append('finish_workout()')
     oldsource=source
     source=m.run(args.runtime_root,source,commands,day);out["workouts"]+=1
     globals_native,ex=m.ev(args.runtime_root,source,tag)
     # Compute expected H1 for each exercised identity via actual openGym code.
     q={'states':[states[i] for i in indices],'reps':[reps[i] for i in indices],'close':False,'groups':[groups[i] for i in indices],'thresholds':th,'streak':streak}
     result=subprocess.run(['node','--input-type=module','-e',JS],cwd=args.opengym_root,input=json.dumps(q),text=True,capture_output=True,check=True)
     expected=json.loads(result.stdout)
     row={'topology':topology,'scenario':scenario,'cycle':cycle,'day':day,'reps':[reps[i] for i in indices],'commands':commands,'inputSha256':hashlib.sha256(oldsource.encode()).hexdigest(),'outputSha256':hashlib.sha256(source.encode()).hexdigest(),'signals':[]}
     for j,i in enumerate(indices):
      states[i]=expected['states'][j]
      matching=[v for v in ex if v['name']==NAMES[i]]
      if len(matching)!=1:raise RuntimeError(f'exercise state lookup {topology} {NAMES[i]}: {len(matching)}')
      native=matching[0]['state'];fields=['perf1','perf2','perf3','perfReference','perfCount','candidateGuard']
      got={k:kg(native[k]) if k.startswith('perf') and k!='perfCount' else int(native[k]) for k in fields}
      expt={k:states[i][k] for k in fields}
      for k in fields:
       out['comparedFields']+=1
       if (not close(got[k],expt[k])) if k.startswith('perf') and k!='perfCount' else got[k]!=expt[k]:issue(topology,scenario,cycle,day,i+1,k,got[k],expt[k])
      row['signals'].append({'slot':i+1,'native':got,'openGym':expt,'vote':expected['votes'][j]})
     row['controller']={k:globals_native.get(k) for k in ['lastCycleClass','badCycleStreak','deloadQueued','allSignalsReady']}
     out['runs'].append(row)
    # Trigger only at final cycle closer; compute openGym on last votes from each signal (on all days)
    q={'states':[], 'reps':[], 'close':False,'groups':[],'thresholds':th,'streak':streak}
    # Reconstruct original vote flags from just-executed native status fields for all signals;
    # separate openGym H1 vote transitions are saved as each day row.
    rows=[r for r in out['runs'] if r['topology']==topology and r['scenario']==scenario and r['cycle']==cycle]
    votes={z['slot']:z['vote'] for r in rows for z in r['signals']}
    projections=[{'signalId':'s'+str(i),'systemGroup':groups[i-1], 'ready':votes[i]['ready'],'seen':True,'valid':votes[i]['valid'],'weak':votes[i]['weak']} for i in range(1,n+1)]
    trigjs="""import fs from 'node:fs';import {evaluateCycle} from './api/training-control/hybrid2/trigger.js';const q=JSON.parse(fs.readFileSync(0,'utf8'));console.log(JSON.stringify(evaluateCycle(q.p,q.t,{badCycleStreak:q.s})))"""
    e=subprocess.run(['node','--input-type=module','-e',trigjs],cwd=args.opengym_root,input=json.dumps({'p':projections,'t':th,'s':streak}),text=True,capture_output=True,check=True)
    tr=json.loads(e.stdout);streak=tr['state']['badCycleStreak']
    ctrl=m.ev(args.runtime_root,source,tag)[0]
    fields={'badCycleStreak':streak,'deloadQueued':int(tr['queueDeload']),'lastCycleClass':{'INDETERMINATE':0,'GOOD':1,'BROAD_WEAK':2}[tr['cycleClass']]}
    for k,want in fields.items():
     out['comparedFields']+=1
     if int(ctrl[k])!=want:issue(topology,scenario,cycle,'closer',0,k,int(ctrl[k]),want)
    out['runs'][-1]['cycleDecision']={'liftosaur':{k:int(ctrl[k]) for k in fields},'openGym':fields,'projections':projections}
    if tr['queueDeload']:break
   if not any(r.get('cycleDecision') and r['cycleDecision']['openGym']['deloadQueued'] for r in out['runs'] if r['topology']==topology and r['scenario']==scenario):
    issue(topology,scenario,'end','closer',0,'expectedTrigger','not queued','queued after weak cycles')
 out['failures']=len(out['issues'])
 args.out.parent.mkdir(parents=True,exist_ok=True);args.out.write_text(json.dumps(out,indent=2)+'\n')
 print(json.dumps({'workouts':out['workouts'],'comparedFields':out['comparedFields'],'failures':out['failures'],'issues':out['issues'][:12]},indent=2))
 if out['failures']:sys.exit(1)
if __name__=='__main__':main()
