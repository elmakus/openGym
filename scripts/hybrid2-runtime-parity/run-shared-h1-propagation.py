#!/usr/bin/env python3
"""Original fitness shared progression + H1 codegen/private reset, actual Liftosaur vs openGym.
Synthetic 3-anchor plan: three occurrences of one native shared progression identity.
"""
from __future__ import annotations
import argparse, hashlib, importlib.util, json, subprocess, sys
from pathlib import Path

H1FIELDS=['perf1','perf2','perf3','perfCount','perfReference','candidateGuard']
PROGRAMS=[('SHARED_NORMAL',True,False),('SHARED_SKIP_CARRIER',True,True),('DISTINCT_CONTROL',False,False)]
JS="""import fs from 'node:fs';import{observeAnchor,initialAnchor,loadedRepScore}from './api/training-control/hybrid2/h1.js';const q=JSON.parse(fs.readFileSync(0,'utf8'));const x=observeAnchor(q.before||initialAnchor(),{kind:'COMPARABLE',mode:q.frozen?'DELOAD_FROZEN':'NORMAL',performance:q.frozen?null:loadedRepScore(75*.45359237,q.reps)});console.log(JSON.stringify(x));"""
TR="""import fs from 'node:fs';import{evaluateCycle}from './api/training-control/hybrid2/trigger.js';const q=JSON.parse(fs.readFileSync(0,'utf8'));console.log(JSON.stringify(evaluateCycle(q.projections,q.thresholds,{badCycleStreak:q.streak})));"""
def runjs(root,code,arg):
 proc=subprocess.run(['node','--input-type=module','-e',code],cwd=root,input=json.dumps(arg),text=True,capture_output=True,check=True)
 return json.loads(proc.stdout)
def norm(k,v):
 if k in ('perf1','perf2','perf3','perfReference'):
  return v if isinstance(v,(int,float)) else v['value']*(.45359237 if v['unit']=='lb' else 1)
 return int(v)
def sha(s):return hashlib.sha256(s.encode()).hexdigest()
def main():
 parser=argparse.ArgumentParser()
 for arg in ['fitness-root','runtime-root','opengym-root','out']:parser.add_argument('--'+arg,type=Path,required=True)
 a=parser.parse_args();sys.path.insert(0,str((a.fitness_root/'programs').resolve()))
 original=a.fitness_root/'tests/hybrid2/h2m02_t02_runtime_matrix.py'
 spec=importlib.util.spec_from_file_location('original_fitness_shared_matrix',original)
 m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 import hybrid2_promotion_materializer as promo
 import hybrid2_h1_liftosaur_codegen as h1
 import hybrid2_h1_reset_codegen as reset
 assert m.PIN in (a.runtime_root/'README.txt').read_text()
 out={'schema':'HYBRID2-ORIGINAL-SHARED-H1-REAL-RUNTIME-DIFF-1',
 'fitnessCommit':'9f2deb6c345643d7c0c793c52d358e496c2710d2','nativeRuntimePin':m.PIN,'openGymBase':'8529b2d41b28fea8ae96a50325aaf28e864a0160',
 'scope':'Synthetic original generic write-through + frozen H1 observation and private H1 reset with actual native shared progression key across 3 occurrences and non-signal closer; no original production Liftoscript complete materialization',
 'records':[],'issues':[],'workouts':0,'comparisons':0}
 for idx,(scenario,shared,skip) in enumerate(PROGRAMS):
  tag=1700+idx*10
  occ=[m.O('signal1',1,'P1','track1','s1'),
       m.O('shared_carrier',2,'P1','shared'),
       m.O('signal2',3,'P2','track2','s2'),
       m.O('shared_observer2',4,'P2','shared' if shared else 'distinct2'),
       m.O('signal3',5,'P3','track3','s3'),
       m.O('shared_observer3',6,'P3','shared' if shared else 'distinct3'),
       m.O('closer',7,'P3','closer',close=True)]
  groups=['upper','lower','upper'];th={'minValidSignals':3,'broadWeakMin':2,'fastWeakMin':3,'slowBroadCycles':2,'weakRatio':0.95}
  shgrp=[{'progressionIdentity':'shared','occurrences':['shared_carrier','shared_observer2','shared_observer3']}] if shared else []
  ad=m.A(tag,3,occ,['signal1','signal2','signal3'],groups=shgrp,sg=groups,thr=th)
  ad['orderedCyclePositions']=['P1','P2','P3'];ad['cycleStartPosition']='P1'
  rst=reset.build_h1_reset_plan(ad)
  names=[['Squat','Bench Press'],['Deadlift','Bench Press' if shared else 'Bicep Curl'],['Overhead Press','Bench Press' if shared else 'Bicep Curl','Romanian Deadlift']]
  globalfields=m.controller_global_fields(ad)
  initial={f:'0' for f in globalfields}
  initial.update({'perf1':'0kg','perf2':'0kg','perf3':'0kg','perfCount':'0','perfReference':'0kg','candidateGuard':'0','candidate':'75lb','paired':'0','adaptiveKeep':'19'})
  args=', '.join(f'{k}: {v}' for k,v in initial.items())
  lines=['# Week 1']
  def prog(slot,first,closer):
   ops=[]
   if first:
    ops += [m.R('if (var.ctrl_deloadQueued == 1) {'),m.M('deloadQueued','0','  '),m.M('deloadActive','1','  '),m.M('deloadStarted','1','  '),m.M('lastCycleClass','0','  '),m.R('}')]
   if slot:
    setup='var.preCandidateController = state.candidate\n'+promo._observation_setup('')+'\nvar.h1Frozen = var.ctrl_deloadActive == 1 ? 1 : var.h1Frozen\n'+h1.render_h1_observation()
    ops += [m.R(x) for x in setup.splitlines()]
    for f,v in [('ready','var.anchorReady'),('seen','1'),('valid','var.anchorValid'),('weak','var.anchorWeak')]:
     ops.append(m.M(f+str(slot),v))
   if closer:
    ops.append(m.R('var.wasDeloadClosing = var.ctrl_deloadActive == 1 ? 1 : 0'))
    ops.extend(m.closeops(ad))
   s=m.render_controller_progress(ad,ops)
   if closer:
    s+='\nif (var.wasDeloadClosing == 1) {\n'+reset.render_h1_group_reset(ad,indent='  ')+'\n}'
   return s
  for day,exs in enumerate(names,1):
   lines.append('## Day '+str(day))
   for no,name in enumerate(exs):
    slot=(day if no==0 else 0);first=day==1 and no==0;closer=day==3 and no==2
    tags=str(tag)+(', '+str(rst.tag_for_slot(slot)) if slot else '')
    upd='var.deloadNow = state.deloadActive == 1 || state.deloadQueued == 1\nif (var.deloadNow) { numberOfSets = ceil(programNumberOfSets / 2) }'
    lines.append(f'{name} / 2x10 / 75lb / id: tags({tags}) / update: custom() {{~\n{upd}\n~}} / progress: custom({args}) {{~\n{prog(slot,first,closer)}\n~}}')
  source='\n'.join(lines)+'\n'
  baseline=m.ses(a.runtime_root).q({'a':'e','t':source})['exercises']
  sharedKeys=[z['key'] for z in baseline if z['name']=='Bench Press']
  out['records'].append({'scenario':scenario,'phase':'source_baseline','sourceSha256':sha(source),'nativeBenchPressProgressionKeys':sharedKeys,'expectedShared':shared,'resetTags':list(rst.reset_tags)})
  out['comparisons']+=1
  if shared and not (len(sharedKeys)==3 and len(set(sharedKeys))==1):
   out['issues'].append({'scenario':scenario,'field':'sameProgressionIdentity','keys':sharedKeys})
  if not shared and len(sharedKeys)!=1:out['issues'].append({'scenario':scenario,'field':'distinctControlBenchKeys','keys':sharedKeys})
  h1State=[None]*3;streak=0
  for cycle in range(1,9):
   frozen=cycle==5
   reps=10 if cycle<=3 else 7 if cycle in (4,5) else 9
   votes={}
   for day,exs in enumerate(names,1):
    before=sha(source);commands=[]
    for k,name in enumerate(exs,1):
     if skip and day==1 and k==2:continue
     commands.extend([f'change_reps({k},1,{reps})',f'complete_set({k},1)'])
    commands.append('finish_workout()')
    source=m.run(a.runtime_root,source,commands,day);out['workouts']+=1
    globalsNative,exercises=m.ev(a.runtime_root,source,tag)
    row={'scenario':scenario,'cycle':cycle,'day':day,'reps':reps,'frozen':frozen,
      'commands':commands,'programBeforeSha256':before,'programAfterSha256':sha(source),
      'nativeGlobal':{k:globalsNative[k] for k in ['seen1','seen2','seen3','valid1','valid2','valid3','weak1','weak2','weak3','deloadQueued','deloadActive','badCycleStreak','lastCycleClass']},'signals':[]}
    for signal in range(1,4):
     e=next((z for z in exercises if z['name']==names[signal-1][0]),None)
     if e is None:raise AssertionError('native signal missing')
     st=e['state']
     got={f:norm(f,st.get(f,0)) for f in H1FIELDS}
     row['signals'].append({'slot':signal,'native':got,'adaptiveKeep':st.get('adaptiveKeep'),'candidate':st.get('candidate')})
     if signal==day:
      expected=runjs(a.opengym_root,JS,{'before':h1State[signal-1],'frozen':frozen,'reps':reps})
      h1State[signal-1]=expected['state']
      votes[signal]=expected
     want=h1State[signal-1] or {k:0 for k in H1FIELDS}
     for f in H1FIELDS:
      out['comparisons']+=1
      if abs(got[f]-want[f])>.01 and not (frozen and day==3):
       out['issues'].append({'scenario':scenario,'cycle':cycle,'day':day,'slot':signal,'field':f,'native':got[f],'openGym':want[f]})
     out['comparisons']+=1
     if st.get('adaptiveKeep')!=19:out['issues'].append({'scenario':scenario,'cycle':cycle,'day':day,'slot':signal,'field':'adaptiveKeep','native':st.get('adaptiveKeep')})
     out['comparisons']+=1
     candidate=st.get('candidate')
     weight=(candidate['value']*(.45359237 if candidate['unit']=='lb' else 1)) if isinstance(candidate,dict) else float(candidate)
     if abs(weight-75*.45359237)>.01:out['issues'].append({'scenario':scenario,'cycle':cycle,'day':day,'slot':signal,'field':'adaptiveCandidate','nativeKg':weight})
    sameGroup=[(e['day'],e['name'],e['key'],e['state'].get('adaptiveKeep')) for e in exercises if e['name']=='Bench Press']
    row['sharedExerciseStates']=sameGroup
    out['comparisons']+=len(sameGroup)
    for _,name,key,keeper in sameGroup:
     if keeper!=19:out['issues'].append({'scenario':scenario,'cycle':cycle,'day':day,'field':'sharedAdaptiveKeep','native':keeper,'exercise':name})
    if shared and (len(sameGroup)!=3 or len({g[2] for g in sameGroup})!=1):
     out['issues'].append({'scenario':scenario,'cycle':cycle,'day':day,'field':'sharedNativeKeyChanged','native':sameGroup})
    out['records'].append(row)
   if frozen:
    ctrl,exs=m.ev(a.runtime_root,source,tag)
    for signal in range(1,4):
     st=next(e['state'] for e in exs if e['name']==names[signal-1][0])
     for f in H1FIELDS:
      out['comparisons']+=1
      native=norm(f,st.get(f,0))
      if native!=0:out['issues'].append({'scenario':scenario,'cycle':cycle,'field':'reset:'+f,'slot':signal,'native':native})
    h1State=[None]*3;streak=0
    for f in ('deloadQueued','deloadActive','badCycleStreak'):
     out['comparisons']+=1
     if ctrl[f]!=0:out['issues'].append({'scenario':scenario,'cycle':cycle,'field':'lifecycle:'+f,'native':ctrl[f]})
   else:
    p=[{'signalId':f's{i}','systemGroup':groups[i-1],'ready':votes[i]['ready'],'seen':True,'valid':votes[i]['validVote'],'weak':votes[i]['weak']} for i in range(1,4)]
    ev=runjs(a.opengym_root,TR,{'projections':p,'thresholds':th,'streak':streak})
    streak=ev['state']['badCycleStreak'];ctrl=m.ev(a.runtime_root,source,tag)[0]
    expected={'deloadQueued':int(ev['queueDeload']),'badCycleStreak':streak,'lastCycleClass':{'INDETERMINATE':0,'GOOD':1,'BROAD_WEAK':2}[ev['cycleClass']]}
    for f,w in expected.items():
     out['comparisons']+=1
     if int(ctrl[f])!=w:out['issues'].append({'scenario':scenario,'cycle':cycle,'field':'global:'+f,'native':ctrl[f],'openGym':w})
    out['records'][-1]['closerComparison']={'expected':expected,'native':{k:int(ctrl[k]) for k in expected}}
 out['records'].append({'scenario':scenario,'phase':'final','nativeSourceSha256':sha(source)})
 out['scenarioOutcomes']=[{'scenario':name,'workouts':sum(1 for x in out['records'] if x.get('scenario')==name and 'cycle' in x and 'day' in x),'issues':sum(1 for z in out['issues'] if z['scenario']==name)} for name,_,_ in PROGRAMS]
 out['failures']=len(out['issues'])
 a.out.parent.mkdir(parents=True,exist_ok=True)
 a.out.write_text(json.dumps(out,separators=(',',':'))+'\n')
 print(json.dumps({'workouts':out['workouts'],'comparisons':out['comparisons'],'failures':out['failures'],'scenarioOutcomes':out['scenarioOutcomes'],'issues':out['issues'][:22]},indent=2))
 if out['failures']:raise SystemExit(1)
if __name__=='__main__':main()
