#!/usr/bin/env node
// Frozen original ATP2 Liftoscript candidate vs openGym evaluateAtp2, real pinned Playground.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { evaluateAtp2 } from '../../api/training-control/atp2.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const opengym=path.resolve(here,'../..');
const runtimeRoot=process.env.LIFTOSAUR_RUNTIME_ROOT,fitnessRoot=process.env.FITNESS_ROOT;
if(!runtimeRoot||!fitnessRoot) throw Error('Pinned runtime and fitness roots required');
const pin='ce75750bde4a190682fb5a6fa1984fc9184a9842';
if(!fs.readFileSync(path.join(runtimeRoot,'README.txt'),'utf8').includes(pin))throw Error('incorrect native Liftosaur pin');
const original=fs.readFileSync(path.join(fitnessRoot,'programs/adaptive_rep_engine_turbo_probe_candidate.liftoscript'),'utf8');
const rt=createRequire(import.meta.url)(path.join(runtimeRoot,'runtime_api.cjs'));
const settings=structuredClone(rt.settings);
settings.units='kg';
const roundup={step:2.5};
const sh=x=>crypto.createHash('sha256').update(x).digest('hex');
const kgFloat=x=>typeof x==='number'?x:x?.unit==='kg'?x.value:x?.unit==='lb'?x.value*.45359237:null;
const finite=v=>Number.isFinite(v);
const approx=(a,b)=>finite(a)&&finite(b)&&Math.abs(a-b)<=0.011;
const plain=s=>{
 const line=s.split('\n').find(x=>x.startsWith('Lat Pulldown / ...Adaptive Rep Engine Template'));
 if(!line) throw Error('Lat Pulldown progression line not found');
 const match=line.match(/progress: custom\(([^)]*)\)/);
 if(!match)throw Error('progress state missing');
 const raw=match[1];
 const numeric=k=>{const m=raw.match(new RegExp('(?:^|, )'+k+': ([0-9.]+)(kg)?(?:,|$)'));return m?Number(m[1]):0;};
 return {candidate:numeric('candidate'),floorWeight:numeric('floorWeight'),probeActive:numeric('probeActive'),
  lowCount:numeric('lowCount'), minTarget:numeric('minTarget'),maxTarget:numeric('maxTarget'),
  counterWeight:numeric('counterWeight'),counterActive:numeric('counterActive'),paired:numeric('paired'),
  line};
};
const parseWorkout=workout=>{
 const l=workout.split('\n').find(x=>x.trim().startsWith('Lat Pulldown /'));
 if(!l) throw Error('no actual native workout exercise line');
 const matches=[...l.matchAll(/([0-9]+)x([0-9]+)\s+([0-9.]+)kg/g)];
 if(!matches.length)throw Error('cannot read native workout sets: '+l);
 const sets=[];
 for(const m of matches)for(let i=0;i<Number(m[1]);i++)sets.push({reps:Number(m[2]),weight:Number(m[3]),completed:true,ordinal:sets.length+1});
 return {line:l,sets};
};
const suites=[
 {id:'FIRST_SET_PERSISTENCE',sessions:[[21],[7],[10],[21],[8]]},
 {id:'SECOND_SET_TURBO_VALIDATION',sessions:[[21,8],[10],[21]]},
 {id:'SECOND_SET_CHAIN',sessions:[[21,21],[10]]},
 {id:'SECOND_SET_HARD_FAIL',sessions:[[21,3],[10]]},
 {id:'SENTINEL_AND_BOUNDARIES',sessions:[[1],[8],[15],[16],[1],[7]]}
];
const out={schema:'HYBRID2-ATP2-ORIGINAL-NATIVE-vs-OPENGYM-1',
 sourceCommit:'9f2deb6c345643d7c0c793c52d358e496c2710d2',
 originalSourceGitBlob:'4d6452c2dd2a2ddd45f8b8d653d4ebcf3c37e170',
 sourceSha256:sh(original),runtimeCommit:pin,
 openGymBase:'8529b2d41b28fea8ae96a50325aaf28e864a0160',
 scope:'Genuine frozen original ATP2-book standalone candidate, kg generic stock Liftosaur settings and 2.5kg model step. Native Playground_run vs openGym evaluateAtp2. NOT H1/ATP2 HYBRID-2 source materialization, live exposure persistence, or real equipment-specific settings.',
 environment:{unit:'kg',nativeSettings:'stock pinned runtime with units kg',openGymRounding:roundup},
 suites:[],comparisons:0,nativeWorkouts:0,issues:[]};
for(const suite of suites){
 let src=original,og=null;
 let row={id:suite.id,trace:[]};
 for(const [idx,reps]of suite.sessions.entries()){
  const before=plain(src);
  if(og===null)og={minTarget:before.minTarget,maxTarget:before.maxTarget,candidate:before.candidate,
   floorWeight:before.floorWeight,probeActive:before.probeActive,lowCount:before.lowCount,
   counterWeight:before.counterWeight,counterActive:before.counterActive,paired:before.paired};
  const commands=[];
  for(let i=0;i<reps.length;i++){commands.push('change_reps(1,'+(i+1)+','+reps[i]+')','complete_set(1,'+(i+1)+')');}
  commands.push('finish_workout()');
  const response=rt.Playground_run({programText:src,week:1,day:1,commands},settings,rt.defaultStats());
  out.nativeWorkouts++;
  if(!response.success||typeof response.data?.updatedProgramText!=='string')
   throw Error(suite.id+' step '+(idx+1)+' native failed '+JSON.stringify(response));
  const workout=parseWorkout(response.data.workout);
  if(workout.sets.length!==reps.length)throw Error('Native set count mismatch: '+workout.line);
  for(let i=0;i<reps.length;i++)if(workout.sets[i].reps!==reps[i])throw Error('Native repetitions not as requested');
  const ogRows=Array.from({length:3},(_,i)=>workout.sets[i]??{completed:false,ordinal:i+1,weight:0,reps:1});
  const expected=evaluateAtp2({state:og,rounding:roundup,sets:ogRows,numberOfSets:3});
  const partial=reps.length>1?evaluateAtp2({state:og,rounding:roundup,sets:[ogRows[0]],numberOfSets:3}):null;
  const after=plain(response.data.updatedProgramText);
  const issues=[];
  for(const k of ['candidate','floorWeight','probeActive','lowCount']){
    out.comparisons++;
    const match=approx(after[k],expected.nextState[k]);
    if(!match) issues.push({field:k,liftosaur:after[k],openGym:expected.nextState[k]});
  }
  if(partial){
   out.comparisons++;
   if(!approx(workout.sets[1].weight,partial.nextSetLoad))
    issues.push({field:'nativeSecondSetWeight',liftosaur:workout.sets[1].weight,openGym:partial.nextSetLoad});
  }
  const item={index:idx+1,commands,workout:workout.line,nativeSets:workout.sets,
    beforeNative:{candidate:before.candidate,probeActive:before.probeActive,floorWeight:before.floorWeight},
    afterNative:{candidate:after.candidate,probeActive:after.probeActive,floorWeight:after.floorWeight,lowCount:after.lowCount},
    openGymBefore:og,openGymAfter:expected.nextState,openGymNextSetLoad:expected.nextSetLoad,
    nativeSourceBeforeSha256:sh(src),nativeSourceAfterSha256:sh(response.data.updatedProgramText),
    issues};
  if(partial)item.openGymSecondSetWeightFromFirst=partial.nextSetLoad;
  row.trace.push(item);
  if(issues.length)out.issues.push({suite:suite.id,session:idx+1,issues});
  og=expected.nextState;
  src=response.data.updatedProgramText;
 }
 out.suites.push(row);
}
out.failures=out.issues.length;
const dest=path.resolve(process.env.H2_PARITY_OUT??path.join(os.tmpdir(),'hybrid2-atp2'),'atp2-real-native-diff.json');
fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({nativeWorkouts:out.nativeWorkouts,comparisons:out.comparisons,failures:out.failures,issues:out.issues},null,2));
if(out.failures)process.exitCode=1;
