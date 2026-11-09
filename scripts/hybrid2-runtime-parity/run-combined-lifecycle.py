#!/usr/bin/env python3
"""Pinned genuine Liftosaur synthetic H1+trigger+deload+H1-reset+relearn lifecycle.
Frozen source primitives with EXPLICIT harness-owned deload gating, not a production plan.
"""
import argparse, importlib.util, hashlib, json, subprocess, sys
from pathlib import Path
NAMES=['Squat','Bench Press','Deadlift','Overhead Press','Bicep Curl','Romanian Deadlift']
TOPS={'SYN4':(['U1','L1','U2','L2'],['upper','lower','upper','lower']),
      'K5':(['TUE','WED','THU','FRI','SAT'],['upper','lower','upper','upper','lower']),
      'M6':(['A','A','B','B','C','C'],['lower','upper','lower','upper','lower','upper'])}
H1JS="""import fs from 'node:fs';import{initialAnchor,observeAnchor,loadedRepScore}from './api/training-control/hybrid2/h1.js';const q=JSON.parse(fs.readFileSync(0,'utf8'));const s=q.state||initialAnchor();const x=observeAnchor(s,{mode:q.frozen?'DELOAD_FROZEN':'NORMAL',kind:'COMPARABLE',performance:q.frozen?null:loadedRepScore(75*.45359237,q.reps)});console.log(JSON.stringify(x));"""
TRJS="""import fs from 'node:fs';import{evaluateCycle}from './api/training-control/hybrid2/trigger.js';const q=JSON.parse(fs.readFileSync(0,'utf8'));console.log(JSON.stringify(evaluateCycle(q.p,q.t,{badCycleStreak:q.streak})));"""
FIELDS=['perf1','perf2','perf3','perfCount','perfReference','candidateGuard']
def js(root,code,data):
 p=subprocess.run(['node','--input-type=module','-e',code],cwd=root,input=json.dumps(data),text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr)
 return json.loads(p.stdout)
def kg(x):
 if isinstance(x,(int,float)):return x
 return float(x['value'])*(0.45359237 if x['unit']=='lb' else 1)
def main():
 a=argparse.ArgumentParser();a.add_argument('--fitness-root',type=Path,required=True);a.add_argument('--runtime-root',type=Path,required=True);a.add_argument('--opengym-root',type=Path,required=True);a.add_argument('--out',type=Path,required=True);p=a.parse_args()
 orig=p.fitness_root/'tests/hybrid2/h2m02_t02_runtime_matrix.py'
 sys.path.insert(0,str((p.fitness_root/'programs').resolve()))
 spec=importlib.util.spec_from_file_location('pinned_original_matrix',orig);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 import hybrid2_promotion_materializer as pm
 import hybrid2_h1_liftosaur_codegen as h1
 import hybrid2_h1_reset_codegen as reset
 assert m.PIN in (p.runtime_root/'README.txt').read_text()
 out={'schema':'HYBRID2-NATIVE-ISOLATED-LIFECYCLE-H1-RESET-1','runtimeCommit':m.PIN,
      'fitnessCommit':'9f2deb6c345643d7c0c793c52d358e496c2710d2','openGymCommit':'8529b2d41b28fea8ae96a50325aaf28e864a0160',
      'scope':'Synthetic isolated lifecycle uses original H1 and controller generator, original H1 private-reset tag codegen and harness-supplied start/freeze/gating. NOT unchanged production materialization or ATP2/history parity.',
      'harnessOwned':['deload start at next cycle','freeze H1 while active','halve set shape','gate reset broadcast at closer'],
      'records':[],'issues':[],'workouts':0,'comparedFields':0}
 for topo,(positions,groups) in TOPS.items():
  n=len(groups);tag=1400+n*10
  occ=[m.O('o'+str(i),i,positions[i-1],'track'+str(i),'s'+str(i),close=i==n) for i in range(1,n+1)]
  th={'minValidSignals':max(2,n-1),'broadWeakMin':2,'fastWeakMin':n,'slowBroadCycles':2,'weakRatio':.95}
  ad=m.A(tag,n,occ,[o['occurrenceId'] for o in occ],sg=groups,thr=th);ad['orderedCyclePositions']=list(dict.fromkeys(positions));ad['cycleStartPosition']=positions[0]
  resetPlan=reset.build_h1_reset_plan(ad)
  resetLines=reset.render_h1_group_reset(ad).splitlines()
  lines=['# Week 1'];days={}
  for slot in range(1,n+1):
   pos=positions[slot-1]
   if pos not in days:days[pos]=len(days)+1;lines.append('## Day '+str(days[pos]))
   initial={f:'0' for f in m.controller_global_fields(ad)}
   initial.update({'perf1':'0kg','perf2':'0kg','perf3':'0kg','perfCount':'0','perfReference':'0kg','candidateGuard':'0','candidate':'75lb','paired':'0'})
   decl=', '.join(f'{k}: {v}' for k,v in initial.items())
   ops=[]
   if slot==1:
    ops.extend([m.R('if (var.ctrl_deloadQueued == 1) {'),m.M('deloadQueued','0','  '),m.M('deloadActive','1','  '),m.M('deloadStarted','1','  '),m.M('lastCycleClass','0','  '),m.R('}')])
   block='var.preCandidateController = state.candidate\n'+pm._observation_setup('')+'\nvar.h1Frozen = var.ctrl_deloadActive == 1 ? 1 : var.h1Frozen\n'+h1.render_h1_observation()
   ops.extend(m.R(line) for line in block.splitlines())
   for f,exp in [('ready','var.anchorReady'),('seen','1'),('valid','var.anchorValid'),('weak','var.anchorWeak')]:
    ops.append(m.M(f+str(slot),exp))
   if slot==n:
    ops.append(m.R('var.wasDeloadClosing = var.ctrl_deloadActive == 1 ? 1 : 0'))
    ops.extend(m.closeops(ad))
   prog=m.render_controller_progress(ad,ops)
   if slot==n: prog += '\nif (var.wasDeloadClosing == 1) {\n'+reset.render_h1_group_reset(ad,indent='  ')+'\n}'
   upd='var.deloadNow = state.deloadQueued == 1 || state.deloadActive == 1\nif (var.deloadNow) { numberOfSets = ceil(programNumberOfSets / 2) }'
   tags=f'{tag}, {resetPlan.tag_for_slot(slot)}'
   lines.append(f'{NAMES[slot-1]} / 2x10 / 75lb / id: tags({tags}) / update: custom() {{~\n{upd}\n~}} / progress: custom({decl}) {{~\n{prog}\n~}}')
  source='\n'.join(lines)+'\n';h1state=[None]*n;streak=0
  for cycle in range(1,10):
   frozen=cycle==5
   reps=10 if cycle<=3 else 7 if cycle==4 else 7 if cycle==5 else 9 if cycle<=8 else 6
   votes={}
   for day in range(1,len(days)+1):
    ix=[i for i,pos in enumerate(positions) if days[pos]==day]
    cmd=[]
    for number,i in enumerate(ix,1):
     cmd.extend([f'change_reps({number},1,{reps})',f'complete_set({number},1)'])
    cmd.append('finish_workout()')
    before=hashlib.sha256(source.encode()).hexdigest()
    source=m.run(p.runtime_root,source,cmd,day)
    out['workouts']+=1
    ctrl,es=m.ev(p.runtime_root,source,tag)
    if frozen:
     out.setdefault('nativeSecondSetProbes',[])
     for local_idx,i in enumerate(ix,1):
      probe=m.ses(p.runtime_root).q({'a':'r','i':{'programText':source,'week':1,'day':day,'commands':[f'change_reps({local_idx},2,6)']}})
      item={'topology':topo,'cycle':cycle,'day':day,'signalSlot':i+1,'command':f'change_reps({local_idx},2,6)','nativeSuccess':bool(probe.get('success')),'nativeError':str(probe.get('error',''))}
      out['nativeSecondSetProbes'].append(item)
      out['comparedFields']+=1
      if item['nativeSuccess'] or 'Set 2 not found' not in item['nativeError']:
       out['issues'].append({'topology':topo,'cycle':cycle,'day':day,'slot':i+1,'field':'nativeSecondSetAccess','native':item,'expected':'Set 2 not found'})
    row={'topology':topo,'cycle':cycle,'day':day,'frozen':frozen,'reps':reps,'commands':cmd,'sourceBefore':before,'sourceAfter':hashlib.sha256(source.encode()).hexdigest(),'signals':[],'ctrl':{k:int(ctrl[k]) for k in ['deloadQueued','deloadActive','deloadStarted','badCycleStreak','lastCycleClass']}}
    for i in ix:
     expected=js(p.opengym_root,H1JS,{'state':h1state[i],'frozen':frozen,'reps':reps})
     h1state[i]=expected['state'];votes[i+1]={'ready':expected['ready'],'valid':expected['validVote'],'weak':expected['weak']}
     matches=[e for e in es if e['name']==NAMES[i]]
     assert len(matches)==1,(topo,NAMES[i],len(matches))
     z=matches[0]['state'];observed={k:kg(z[k]) if k.startswith('perf') and k!='perfCount' else int(z[k]) for k in FIELDS}
     candidate=kg(z['candidate'])
     out['comparedFields']+=1
     if abs(candidate-75*.45359237)>.01:out['issues'].append({'topology':topo,'cycle':cycle,'slot':i+1,'field':'adaptiveCandidatePreserved','liftosaur':candidate,'expected':75*.45359237})
     row['signals'].append({'slot':i+1,'adaptiveCandidateKg':candidate,'liftosaur':observed,'openGym':h1state[i],'vote':votes[i+1]})
     for k in FIELDS:
      out['comparedFields']+=1
      same=abs(observed[k]-h1state[i][k])<.01 if k.startswith('perf') and k!='perfCount' else observed[k]==h1state[i][k]
      if not same and not (frozen and day==len(days)):
       out['issues'].append({'topology':topo,'cycle':cycle,'day':day,'slot':i+1,'field':k,'liftosaur':observed[k],'openGym':h1state[i][k]})
    out['records'].append(row)
   if frozen:
    # Source-authoritative reset broadcast occurs only after terminal deload workout.
    h1state=[None]*n;streak=0
    ctrl,es=m.ev(p.runtime_root,source,tag)
    for i in range(n):
     z=next(e['state'] for e in es if e['name']==NAMES[i])
     for k in FIELDS:
      out['comparedFields']+=1
      v=kg(z[k]) if k.startswith('perf') and k!='perfCount' else int(z[k])
      if v!=0:out['issues'].append({'topology':topo,'cycle':cycle,'slot':i+1,'field':'reset:'+k,'liftosaur':v,'openGym':0})
    for k in ['deloadQueued','deloadActive','deloadStarted','badCycleStreak']:
     out['comparedFields']+=1
     if int(ctrl[k])!=0:out['issues'].append({'topology':topo,'cycle':cycle,'field':'lifecycle:'+k,'liftosaur':ctrl[k],'openGym':0})
   else:
    projections=[{'signalId':'s'+str(i),'systemGroup':groups[i-1],'ready':votes[i]['ready'],'seen':True,'valid':votes[i]['valid'],'weak':votes[i]['weak']} for i in range(1,n+1)]
    tr=js(p.opengym_root,TRJS,{'p':projections,'t':th,'streak':streak});streak=tr['state']['badCycleStreak']
    ctrl=m.ev(p.runtime_root,source,tag)[0]
    exp={'badCycleStreak':streak,'deloadQueued':int(tr['queueDeload']),'lastCycleClass':{'INDETERMINATE':0,'GOOD':1,'BROAD_WEAK':2}[tr['cycleClass']]}
    for k,w in exp.items():
     out['comparedFields']+=1
     if int(ctrl[k])!=w:out['issues'].append({'topology':topo,'cycle':cycle,'field':k,'liftosaur':int(ctrl[k]),'openGym':w})
    out['records'][-1]['cycleDecision']={'native':{k:int(ctrl[k]) for k in exp},'openGym':exp}
   out['records'][-1]['phase']='DELOAD_END' if frozen else 'SEED' if cycle<=3 else 'QUEUE' if cycle==4 else 'RELEARN' if cycle<=8 else 'POST_RELEARN_WEAK'
 out['failures']=len(out['issues'])
 p.out.parent.mkdir(parents=True,exist_ok=True);p.out.write_text(json.dumps(out,indent=2)+'\n')
 print(json.dumps({'workouts':out['workouts'],'comparisons':out['comparedFields'],'failures':out['failures'],'issues':out['issues'][:15]},indent=2))
 if out['failures']:sys.exit(1)
if __name__=='__main__':main()
