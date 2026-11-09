#!/usr/bin/env node
// Frozen ATP2 candidate + original H1 codegen, actual native runtime, openGym exposure mapper/reducer.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {evaluateAtp2} from '../../api/training-control/atp2.js'
import {h1FromExposure,atp2NextCandidate} from '../../api/training-control/hybrid2/observation.js'
import {observeAnchor,initialAnchor} from '../../api/training-control/hybrid2/h1.js'

const here=path.dirname(fileURLToPath(import.meta.url))
const fitness=process.env.FITNESS_ROOT,runtime=process.env.LIFTOSAUR_RUNTIME_ROOT
const outDir=process.env.H2_PARITY_OUT||path.join(os.tmpdir(),'h2-atp2-h1')
if(!fitness||!runtime) throw Error('No pinned fitness/runtime roots')
const pin='ce75750bde4a190682fb5a6fa1984fc9184a9842'
if(!fs.readFileSync(path.join(runtime,'README.txt'),'utf8').includes(pin))throw Error('Liftosaur pin mismatch')
const rt=createRequire(import.meta.url)(path.join(runtime,'runtime_api.cjs'))
const sha=s=>crypto.createHash('sha256').update(s).digest('hex')
fs.mkdirSync(outDir,{recursive:true})
const programFile=path.join(outDir,'atp2-h1-composite.liftoscript')
const manifest=JSON.parse(execFileSync('python3',[path.join(here,'generate-atp2-h1-native.py'),programFile],{env:{...process.env,FITNESS_ROOT:fitness},encoding:'utf8'}))
const src=fs.readFileSync(programFile,'utf8')
if(sha(src)!==manifest.generatedSha256)throw Error('Generated program SHA mismatch')
const settings=structuredClone(rt.settings);settings.units='kg'
const invalid=rt.Playground_validateProgramText(src,settings)
if(invalid!==undefined && invalid!==null)throw Error('Original Liftosaur validation failed '+JSON.stringify(invalid))
const stateKeys=['perf1','perf2','perf3','perfCount','perfReference','candidateGuard','candidate','floorWeight','probeActive',
 'auditValid','auditWeak','auditReady','auditReset','auditGuardBefore','auditRefBefore']
const weightKeys=new Set(['perf1','perf2','perf3','perfReference','candidate','floorWeight','auditRefBefore'])
function evaluate(source){
 const weeks=rt.PlannerProgram_evaluateText(source)
 const p={vtype:'program',id:'test',name:'test',url:'',author:'',shortDescription:'',description:'',nextDay:1,exercises:[],days:[],weeks:[],isMultiweek:weeks.length>1,tags:[],clonedAt:0,
 planner:{vtype:'planner',name:'test',weeks}}
 const ev=rt.Program_evaluate(p,settings)
 const hits=ev.weeks.flatMap(w=>w.days.flatMap(d=>d.exercises)).filter(e=>e.name==='Lat Pulldown')
 if(hits.length!==1)throw Error('Actual native Lat Pulldown state lookup failed '+hits.length)
 const z=hits[0].progress?.state
 if(!z)throw Error('No state in native evaluatation')
 const num=v=>typeof v==='number'?v:v?.unit==='kg'?v.value:v?.unit==='lb'?v.value*.45359237:null
 return Object.fromEntries(stateKeys.map(k=>[k,weightKeys.has(k)?num(z[k]??0):Number(z[k]??0)]))
}
function workoutSets(workout){
 const line=workout.split('\n').find(x=>x.trimStart().startsWith('Lat Pulldown /'))
 if(!line)throw Error('Native workout line missing')
 const arr=[...line.matchAll(/(\d+)x(\d+)\s+([0-9.]+)kg/g)]
 const sets=[]
 for(const a of arr)for(let i=0;i<Number(a[1]);i++)sets.push({reps:Number(a[2]),weight:Number(a[3]),ordinal:sets.length+1,completed:true})
 return {line,sets}
}
const scenarios=[
 {id:'IN_ENVELOPE_GUARD_AND_SENTINEL',sessions:[[10],[10],[10],[16],[1],[8],[7],[10]]},
 {id:'IN_ENVELOPE_TURBO_CHAIN',sessions:[[10],[10],[10],[16,21],[10],[8],[7]]},
 {id:'ABOVE_ENVELOPE_21',sessions:[[10],[10],[10],[21],[8],[10]]},
 {id:'ABOVE_ENVELOPE_22',sessions:[[10],[10],[10],[22],[7],[10]]},
 {id:'MIXED_20_21_BOUNDARY',sessions:[[10],[10],[10],[20],[21],[10]]}
]
const result={schema:'HYBRID2-ORIGINAL-ATP2-H1-COMPOSITE-NATIVE-1',
 fitnessCommit:'9f2deb6c345643d7c0c793c52d358e496c2710d2',
 runtimePin:pin,openGymBase:'8529b2d41b28fea8ae96a50325aaf28e864a0160',
 manifest,
 coverage:'Native original ATP2 template with after-original-progress original H1 source observation/codegen, composed only in scratch harness. No complete production HYBRID-2 program, no real equipment context, no database history. Comparison uses actual native completed sets mapped to openGym h1FromExposure and evaluateAtp2.',
 settings:{unit:'kg',roundingStepKg:2.5},scenarios:[],workouts:0,comparisons:0,issues:[]}
for(const suite of scenarios){
 let source=src,anchor=initialAnchor(),atp2=null
 const report={id:suite.id,trace:[]}
 for(let i=0;i<suite.sessions.length;i++){
  const reps=suite.sessions[i],before=evaluate(source)
  if(atp2===null)atp2={minTarget:8,maxTarget:15,candidate:before.candidate,floorWeight:before.floorWeight,probeActive:before.probeActive,lowCount:0,counterWeight:10,counterActive:1,paired:0}
  const beforeSourceSha256=sha(source)
  const commands=[]
  for(let k=0;k<reps.length;k++)commands.push(`change_reps(1,${k+1},${reps[k]})`,`complete_set(1,${k+1})`)
  commands.push('finish_workout()')
  const response=rt.Playground_run({programText:source,week:1,day:1,commands},settings,rt.defaultStats())
  if(!response.success||!response.data?.updatedProgramText)throw Error(`${suite.id} step ${i+1}: native failure ${JSON.stringify(response)}`)
  const observation=workoutSets(response.data.workout)
  if(observation.sets.length!==reps.length||reps.some((r,k)=>observation.sets[k]?.reps!==r))throw Error('Native completion mismatch: '+observation.line)
  const nativeSets=observation.sets
  const modelRows=Array.from({length:3},(_,k)=>nativeSets[k]??{ordinal:k+1,completed:false,reps:1,weight:0})
  const model=evaluateAtp2({state:atp2,rounding:{step:2.5},sets:modelRows,numberOfSets:3})
  const post=evaluate(response.data.updatedProgramText)
  const exposure={mode:'repetitions',performance:{sets:nativeSets.map((s,k)=>({setId:'set'+(k+1),role:'work',status:'completed',resistance:{kind:'external-load',value:s.weight,unit:'kg'},observations:[{metric:'repetitions',value:s.reps}]}))},
   atp2:{version:1,rounding:{step:2.5},initialState:{...atp2}}}
  const openGymInput=h1FromExposure(exposure,{beforeCandidate:atp2.candidate,afterCandidate:post.candidate,baselineUnit:'kg'})
  const responseH1=observeAnchor(anchor,openGymInput)
  const expected=responseH1.state
  const diff=[]
  for(const key of ['perf1','perf2','perf3','perfCount','perfReference','candidateGuard']){
   result.comparisons++
   if(Math.abs(post[key]-expected[key])>0.011)diff.push({field:key,native:post[key],openGym:expected[key]})
  }
  for(const [key,value]of [['auditValid',responseH1.validVote?1:0],['auditWeak',responseH1.weak?1:0],['auditReady',responseH1.ready?1:0],['auditReset',responseH1.reset?1:0]]){
   result.comparisons++
   if(post[key]!==value)diff.push({field:key,native:post[key],openGym:value})
  }
  for(const key of ['candidate','floorWeight','probeActive']){
   result.comparisons++
   if(Math.abs(post[key]-model.nextState[key])>0.011)diff.push({field:'atp2:'+key,native:post[key],openGym:model.nextState[key]})
  }
  // Native first set drives H1; later Turbo sets may affect ATP2 but not H1.
  const item={session:i+1,commands,nativeWorkout:observation.line,nativeSets,
    beforeNative:before,afterNative:post,
    openGymH1Input:openGymInput,openGymH1Expected:expected,openGymH1Vote:{valid:responseH1.validVote,weak:responseH1.weak,ready:responseH1.ready,reset:responseH1.reset},
    atp2OpenGym:model.nextState,atp2ExternalActualCandidate:atp2NextCandidate(exposure,atp2),
    inputSha256:beforeSourceSha256,outputSha256:sha(response.data.updatedProgramText),issues:diff}
  result.workouts++
  if(diff.length)result.issues.push({scenario:suite.id,session:i+1,issues:diff})
  report.trace.push(item)
  anchor=expected;atp2=model.nextState;source=response.data.updatedProgramText
 }
 result.scenarios.push(report)
}
result.failureSteps=result.issues.length
fs.writeFileSync(path.join(outDir,'atp2-h1-composite-native-differential.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({workouts:result.workouts,comparisons:result.comparisons,failureSteps:result.failureSteps,issues:result.issues.map(x=>({scenario:x.scenario,session:x.session,fields:x.issues.map(i=>i.field)}))},null,2))
if(result.failureSteps)process.exitCode=1
