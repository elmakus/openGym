#!/usr/bin/env node
// Isolated real-M6 multiset and shared-identity differential. No account writes.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
import {centralizeRttUpdate} from './rtt-centralized-update-variant.mjs'
import {addStaleH1WriteBarrier} from './h1-stale-barrier-variant.mjs'
import {evaluateAtp2} from '../../api/training-control/atp2.js'
import {h1FromExposure} from '../../api/training-control/hybrid2/observation.js'
import {observeAnchor,validateAnchor} from '../../api/training-control/hybrid2/h1.js'
const base=process.env.PRIVATE_LIVE_ROOT,fitness=process.env.FITNESS_ROOT,runtime=process.env.LIFTOSAUR_RUNTIME_ROOT,out=process.env.H2_PARITY_OUT
if(!base||!fitness||!runtime||!out)throw Error('PINNED private, fitness, runtime and output roots required')
const pin='ce75750bde4a190682fb5a6fa1984fc9184a9842'
if(!fs.readFileSync(path.join(runtime,'README.txt'),'utf8').includes(pin))throw Error('Wrong native runtime')
const require=createRequire(import.meta.url),rt=require(path.join(runtime,'runtime_api.cjs'))
const {buildSettings}=require(path.join(fitness,'tests/fixtures/marta-playground-baseline/settings/build_settings.cjs'))
const settings=buildSettings(path.join(fitness,'tests/fixtures/marta-playground-baseline'))
const sha=s=>crypto.createHash('sha256').update(s).digest('hex')
const kg=v=>typeof v==='number'?v:v?.unit==='kg'?v.value:v?.unit==='lb'?v.value*.45359237:0
const hk=['perf1','perf2','perf3','perfCount','perfReference','candidateGuard']
const h1=s=>Object.fromEntries(hk.map(k=>[k,['perfCount','candidateGuard'].includes(k)?Number(s?.[k]??0):kg(s?.[k]??0)]))
const fix=s=>addStaleH1WriteBarrier(centralizeRttUpdate(s).source)
const input=fs.readFileSync(path.join(base,'qtwbbqff.liftoscript'),'utf8')
const queued=fs.readFileSync(path.join(base,'qtwbbqff-queued-native.liftoscript'),'utf8')
if(sha(input)!=='7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df')throw Error('Source SHA changed')
const original=fix(input),queuedFixed=fix(queued)
for(const s of [original,queuedFixed]){
 const invalid=rt.Playground_validateProgramText(s,settings)
 if(invalid!=null)throw Error('Native parser failure: '+JSON.stringify(invalid).slice(0,150))
}
const result={schema:'HYBRID2-M6-ATP2-H1-MULTISET-NATIVE-1',provenance:{sourceSha256:sha(input),fixedSourceSha256:sha(original),queuedFixedSha256:sha(queuedFixed),runtime:pin,fitness:'9f2deb6c345643d7c0c793c52d358e496c2710d2',openGym:'8529b2d41b28fea8ae96a50325aaf28e864a0160',fixture:'frozen Marta baseline; not active gym',accountWrites:0},nativeWorkouts:0,comparisons:0,nativeSetCommands:0,failures:[],steps:[]}
const relativeBase=new Map()
const tol=.011
// Resolve the same frozen gym equipment selected for the original custom exercise.
// Never use a generic 2.5 kg assumption when a native fixed ladder is available.
function originalEquipmentRounding(e){
 const typeId=e.exerciseType?.id
 const equipmentId=settings.exerciseData?.[typeId]?.equipment?.default
 const equipment=settings.gyms[0]?.equipment?.[equipmentId]
 if(!equipmentId||!equipment)return null
 const values=(equipment.fixed??[]).map(kg).filter(x=>Number.isFinite(x)&&x>=0)
 if(values.length>=2)return {rounding:{mode:'allowed_values',allowedValues:values},equipmentFingerprint:sha(equipmentId).slice(0,12),ladderValues:values.length}
 const plates=(equipment.plates??[]).map(z=>kg(z.weight)).filter(x=>x>0)
 if(plates.length){
  const step=Math.min(...plates)*Number(equipment.multiplier??1)
  return {rounding:{step},equipmentFingerprint:sha(equipmentId).slice(0,12),ladderValues:0}
 }
 return null
}
function failure(scenario,day,field,actual,expected,kind='openGym implementation mismatch'){
 result.failures.push({scenario,day,field,actual,expected,classification:kind})
}
function compare(scenario,day,field,a,b){
 result.comparisons++
 if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>tol)failure(scenario,day,field,a,b)
}
function project(src){
 const weeks=rt.PlannerProgram_evaluateText(src)
 const program={vtype:'program',id:'iso',name:'iso',url:'',author:'',shortDescription:'',description:'',nextDay:1,exercises:[],days:[],weeks:[],isMultiweek:weeks.length>1,tags:[],clonedAt:0,planner:{vtype:'planner',name:'iso',weeks}}
 const parsed=rt.Program_evaluate(program,settings)
 const days=parsed.weeks[0].days.map(d=>d.exercises.filter(e=>e.name!=='Adaptive Rep Engine Template'))
 const signals=Object.fromEntries(days.flatMap((a,d)=>a.map((e,i)=>({e,d:d+1,i:i+1})).filter(z=>Number(z.e.progress?.state?.anchorId)>0).map(z=>[Number(z.e.progress.state.anchorId),z])))
 return {days,signals,control:parsed.states['920']??{}}
}
function workoutSets(workout,e){
 const line=workout.split('\n').map(x=>x.trim()).find(x=>x.startsWith(e.name+' / '))
 if(!line)return [] // Missing native row remains explicitly non-comparable; never infer a completed set.
 const arr=[...line.matchAll(/(\d+)x(\d+)\s+([0-9.]+)kg/g)]
 const sets=[]
 for(const a of arr)for(let i=0;i<Number(a[1]);i++)sets.push({ordinal:sets.length+1,reps:Number(a[2]),weight:Number(a[3]),completed:true})
 return sets
}
function exposure(rows){
 return {mode:'repetitions',performance:{sets:rows.map((r,i)=>({setId:'s'+(i+1),role:'work',status:'completed',resistance:{kind:'external-load',value:r.weight,unit:'kg'},observations:[{metric:'repetitions',value:r.reps}]}))}}
}
function run(src,scenario,day,planned,{freeze=false,atp2=true}={}){
 const before=project(src),all=before.days[day-1],commands=[]
 for(const [i,rs]of Object.entries(planned)){
  const pos=Number(i);if(!all[pos-1])throw Error('Unknown native occurrence '+day+'/'+pos)
  for(const [k,r]of rs.entries())commands.push('change_reps('+pos+','+(k+1)+','+r+')','complete_set('+pos+','+(k+1)+')')
 }
 result.nativeSetCommands+=Object.values(planned).reduce((n,rs)=>n+rs.length,0)
 commands.push('finish_workout()')
 const resp=rt.Playground_run({programText:src,week:1,day,commands},settings,rt.defaultStats())
 if(!resp.success||!resp.data?.updatedProgramText)throw Error('Native failure '+scenario+': '+JSON.stringify(resp.error).slice(0,180))
 const after=project(resp.data.updatedProgramText)
 result.nativeWorkouts++
 const row={scenario,day,sourceBeforeSha256:sha(src),sourceAfterSha256:sha(resp.data.updatedProgramText),completedOccurrences:[],h1:[],controls:{queuedBefore:Number(before.control.deloadQueued??0),queuedAfter:Number(after.control.deloadQueued??0),activeBefore:Number(before.control.deloadActive??0),activeAfter:Number(after.control.deloadActive??0)},issues:[]}
 for(const [i,reps]of Object.entries(planned)){
  const ix=Number(i),e=all[ix-1],b=e.progress?.state??{},a=after.days[day-1][ix-1]?.progress?.state??{},sets=workoutSets(resp.data.workout,e)
  if(sets.length===0){
   row.completedOccurrences.push({identity:'d'+day+'i'+ix,exerciseHash:sha(e.name).slice(0,12),nativeSets:0,nonLoadedOrUnparseable:true})
   continue
  }
  if(sets.length!==reps.length||sets.some((s,k)=>s.reps!==reps[k])){
   console.error('Native set parser discrepancy',JSON.stringify({scenario,day,index:ix,requested:reps,parsed:sets.map(s=>s.reps),exerciseHash:sha(e.name).slice(0,12)}))
   throw Error('Native completed-set transcription differs '+scenario+'/'+day+'/'+ix)
  }
  const id=sha(e.name).slice(0,12),identity='d'+day+'i'+ix
  const start=kg(b.candidate),end=kg(a.candidate)
  if(start>0&&!relativeBase.has(id))relativeBase.set(id,start)
  const divisor=relativeBase.get(id)||Math.max(start,1)
  const detail={identity,exerciseHash:id,anchor:Number(b.anchorId??0),nativeSets:sets.length,reps:sets.map(s=>s.reps),
   relativeSetLoads:sets.map(s=>Number((s.weight/divisor).toFixed(6))),candidateBeforeRatio:Number((start/divisor).toFixed(6)),candidateAfterRatio:Number((end/divisor).toFixed(6)),
   floorBeforeRatio:Number((kg(b.floorWeight)/divisor).toFixed(6)),floorAfterRatio:Number((kg(a.floorWeight)/divisor).toFixed(6)),
   probeBefore:Number(b.probeActive??0),probeAfter:Number(a.probeActive??0),
   guardBefore:Number(b.candidateGuard??0),guardAfter:Number(a.candidateGuard??0)}
  detail.privateAbsolute={nativeSetsKg:sets.map(z=>z.weight),nativeCandidateBeforeKg:start,nativeCandidateAfterKg:end,nativeFloorBeforeKg:kg(b.floorWeight),nativeFloorAfterKg:kg(a.floorWeight)}
  row.completedOccurrences.push(detail)
  if(freeze){
   compare(scenario,day,identity+':candidate-frozen',end,start)
   compare(scenario,day,identity+':guard-frozen',Number(a.candidateGuard??0),Number(b.candidateGuard??0))
   compare(scenario,day,identity+':probe-frozen',Number(a.probeActive??0),Number(b.probeActive??0))
   continue
  }
  if(atp2&&Number(b.paired??0)===0&&Number.isFinite(Number(b.minTarget))&&Number.isFinite(Number(b.maxTarget))&&sets.length>0){
   const modelRows=Array.from({length:e.evaluatedSetVariations?.reduce((n,v)=>n+v.sets.length,0)||sets.length},(_,k)=>sets[k]??{ordinal:k+1,reps:1,weight:0,completed:false})
   const state={minTarget:Number(b.minTarget),maxTarget:Number(b.maxTarget),candidate:start,floorWeight:kg(b.floorWeight??0),probeActive:Number(b.probeActive??0),lowCount:Number(b.lowCount??0),counterWeight:kg(b.counterWeight??0),counterActive:Number(b.counterActive??0),paired:0}
   const eq=originalEquipmentRounding(e)
   if(eq){
    detail.equipmentFingerprint=eq.equipmentFingerprint
    detail.ladderValues=eq.ladderValues
    const m=evaluateAtp2({state,rounding:eq.rounding,sets:modelRows,numberOfSets:modelRows.length})
    detail.privateAbsolute.openGymExpectedCandidateKg=m.nextState.candidate
    detail.modelCandidateRatio=Number((m.nextState.candidate/divisor).toFixed(6))
    detail.modelProbe=Number(m.nextState.probeActive??0)
    compare(scenario,day,identity+':atp2-candidate',end,m.nextState.candidate)
    compare(scenario,day,identity+':atp2-probe',Number(a.probeActive??0),Number(m.nextState.probeActive??0))
   } else detail.atp2MissingEvidence='Frozen original gym has no resolvable ladder'
   if(sets.length>=2)detail.nativeTurboWeightChanged=sets[1].weight!==sets[0].weight
  }
  if(Number(b.anchorId??0)>0){
   const signal=Number(b.anchorId),first=exposure(sets)
   const ob=h1FromExposure(first,{beforeCandidate:start,afterCandidate:end,baselineUnit:'kg'})
   const expected=observeAnchor(validateAnchor(h1(b)),ob).state
   const got=h1(a),mark=result.failures.length
   for(const key of hk)compare(scenario,day,'h1-'+signal+':'+key,got[key],expected[key])
   const hs={signal,inputKind:ob.kind,firstReps:sets[0].reps,firstSetWeightRelative:detail.relativeSetLoads[0],candidateRaised:end>start+tol,
     native:Object.fromEntries(hk.map(k=>[k,['perfCount','candidateGuard'].includes(k)?got[k]:Number((got[k]/divisor).toFixed(6))])),
     openGym:Object.fromEntries(hk.map(k=>[k,['perfCount','candidateGuard'].includes(k)?expected[k]:Number((expected[k]/divisor).toFixed(6))])),
     mismatchFields:result.failures.slice(mark).map(z=>z.field)}
   hs.privateAbsolute={nativeH1:got,openGymH1:expected}
   row.h1.push(hs)
  }
 }
 // Native persistence of every repeated progression identity across all day occurrences.
 // Same e.key is authoritative; a matching exercise name alone is not.
 const groups=new Map()
 for(const [di,es]of after.days.entries())for(const [j,e]of es.entries()){
  const key=e.key
  if(!key)continue
  if(!groups.has(key))groups.set(key,[])
  groups.get(key).push({id:'d'+(di+1)+'i'+(j+1),state:e.progress?.state??{}})
 }
 row.sharedProgression=[]
 for(const [key,items]of groups){
  if(items.length<2)continue
  const first=items[0]
  const trace={keyFingerprint:sha(key).slice(0,12),occurrences:items.map(x=>x.id),candidateConsistent:true,floorConsistent:true,probeConsistent:true}
  for(const other of items.slice(1)){
   for(const [field,actual,expected]of [
    ['candidate',kg(other.state.candidate),kg(first.state.candidate)],
    ['floorWeight',kg(other.state.floorWeight),kg(first.state.floorWeight)],
    ['probeActive',Number(other.state.probeActive??0),Number(first.state.probeActive??0)]
   ]){
    compare(scenario,day,'shared-'+trace.keyFingerprint+'-'+field,actual,expected)
    if(Math.abs(actual-expected)>tol)trace[field==='candidate'?'candidateConsistent':field==='floorWeight'?'floorConsistent':'probeConsistent']=false
   }
  }
  row.sharedProgression.push(trace)
 }
 row.issues=result.failures.filter(f=>f.scenario===scenario&&f.day===day).map(z=>({field:z.field,classification:z.classification}))
 result.steps.push(row)
 return resp.data.updatedProgramText
}
const baseView=project(original)
if(baseView.days.map(z=>z.length).join(',')!=='11,13,12'||Object.keys(baseView.signals).length!==6)throw Error('Current M6 topology drift')
const filled=day=>Object.fromEntries(baseView.days[day-1].map((e,i)=>[i+1,[10]]))
let s=original
// Genuine consecutive complete cycle seeds H1 and persistent native ATP2 state.
for(let d=1;d<=3;d++)s=run(s,'baseline-native-A-B-C',d,filled(d),{atp2:false})
// Next native cycle: heterogeneous actual sets; multiset Turbo on both day-A H1 anchors.
const normal=[
 {...filled(1),1:[16,10,8],6:[16,16,10],4:[16,10]},
 {...filled(2),2:[16,10],8:[16,10],5:[16,9]},
 {...filled(3),2:[16,10],8:[16,10],5:[16,8]}]
for(let d=1;d<=3;d++)s=run(s,'normal-turbo-A-B-C',d,normal[d-1])
// RTT INTRO: execute every original occurrence, not just the two anchors.
let intro=original.replace(/var\.rttMode = 0/g,'var.rttMode = 2')
for(let d=1;d<=3;d++)intro=run(intro,'rtt-intro-A-B-C',d,filled(d),{freeze:true,atp2:false})
// Complete the real queued deload through the terminal closer, retain the full
// original ATP2 state and compare all six native H1 readbacks after every finish.
let dl=queuedFixed
const queuedH1=Object.fromEntries(Object.entries(project(dl).signals).map(([slot,z])=>[slot,h1(z.e.progress.state)]))
for(let d=1;d<=3;d++){
 const planned=Object.fromEntries(baseView.days[d-1].map((e,i)=>[i+1,[7]]))
 dl=run(dl,'queued-active-deload-A-B-C',d,planned,{freeze:true,atp2:false})
 const current=project(dl)
 compare('queued-active-deload-A-B-C',d,'controller:queued',Number(current.control.deloadQueued??0),0)
 compare('queued-active-deload-A-B-C',d,'controller:active',Number(current.control.deloadActive??0),d===3?0:1)
 for(const [slot,z]of Object.entries(current.signals)){
  const native=h1(z.e.progress.state),expected=d===3?h1({}):queuedH1[slot]
  for(const f of hk)compare('queued-active-deload-A-B-C',d,'deload-H1-'+slot+':'+f,native[f],expected[f])
 }
}
result.failureSteps=new Set(result.failures.map(x=>x.scenario+'/'+x.day)).size
fs.mkdirSync(out,{recursive:true})
const privateDest=path.join(out,'m6-atp2-h1-multiset-private.json')
fs.writeFileSync(privateDest,JSON.stringify(result,null,2)+'\n',{mode:0o600})
const safe=structuredClone(result)
for(const row of safe.steps){
 for(const z of row.completedOccurrences){
  // Published only normalized ratios, not any absolute user weight or identifiable name.
  delete z.floorBeforeRatio
  delete z.floorAfterRatio
  delete z.privateAbsolute
 }
 for(const z of row.h1)delete z.privateAbsolute
}
for(const f of safe.failures){ // Absolute mismatch values stay only in private, retain exact relative endpoints in trace.
 delete f.actual;delete f.expected
}
fs.writeFileSync(path.join(out,'m6-atp2-h1-multiset-sanitized.json'),JSON.stringify(safe,null,2)+'\n')
console.log(JSON.stringify({nativeWorkouts:result.nativeWorkouts,comparedFields:result.comparisons,nativeSetCommands:result.nativeSetCommands,failureSteps:result.failureSteps,
 failuresByClass:result.failures.reduce((o,f)=>(o[f.classification]=(o[f.classification]||0)+1,o),{}),
 stepSummary:result.steps.map(s=>({scenario:s.scenario,day:s.day,sets:s.completedOccurrences.reduce((n,z)=>n+z.nativeSets,0),h1:s.h1.map(z=>({signal:z.signal,kind:z.inputKind,issues:z.mismatchFields})),issues:s.issues.map(x=>x.field)}))},null,2))
if(result.failures.length)process.exitCode=1
