#!/usr/bin/env node
// Post-deload real current-M6 H1 relearning + ATP2 Turbo differential, running
// the unmodified pinned Liftosaur runtime. The first 3 deload workouts are
// explicitly counted as setup/reruns, NOT added to selected native parity totals.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
import {centralizeRttUpdate} from './rtt-centralized-update-variant.mjs'
import {addStaleH1WriteBarrier} from './h1-stale-barrier-variant.mjs'
import {evaluateAtp2} from '../../api/training-control/atp2.js'
import {h1FromExposure} from '../../api/training-control/hybrid2/observation.js'
import {observeAnchor,validateAnchor} from '../../api/training-control/hybrid2/h1.js'
const b=process.env.PRIVATE_LIVE_ROOT,fitness=process.env.FITNESS_ROOT,runtime=process.env.LIFTOSAUR_RUNTIME_ROOT,out=process.env.H2_PARITY_OUT
if(!b||!fitness||!runtime||!out)throw Error('Private isolated source/runtime/evidence roots required')
const req=createRequire(import.meta.url),rt=req(path.join(runtime,'runtime_api.cjs'))
const {buildSettings}=req(path.join(fitness,'tests/fixtures/marta-playground-baseline/settings/build_settings.cjs'))
const settings=buildSettings(path.join(fitness,'tests/fixtures/marta-playground-baseline'))
const sha=s=>crypto.createHash('sha256').update(s).digest('hex')
const kg=x=>typeof x==='number'?x:x?.unit==='kg'?x.value:x?.unit==='lb'?x.value*0.45359237:0
const hk=['perf1','perf2','perf3','perfCount','perfReference','candidateGuard']
const h1=s=>Object.fromEntries(hk.map(k=>[k,['perfCount','candidateGuard'].includes(k)?Number(s?.[k]??0):kg(s?.[k]??0)]))
const queued=fs.readFileSync(path.join(b,'qtwbbqff-queued-native.liftoscript'),'utf8')
const original=fs.readFileSync(path.join(b,'qtwbbqff.liftoscript'),'utf8')
if(sha(original)!=='7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df')throw Error('Frozen current M6 SHA changed')
if(!fs.readFileSync(path.join(runtime,'README.txt'),'utf8').includes('ce75750bde4a190682fb5a6fa1984fc9184a9842'))throw Error('Not original pinned runtime')
const sourceFix=s=>addStaleH1WriteBarrier(centralizeRttUpdate(s).source)
let current=sourceFix(queued)
if(rt.Playground_validateProgramText(current,settings)!=null)throw Error('Cannot validate source-only variant')
const project=s=>{
 const weeks=rt.PlannerProgram_evaluateText(s),program={vtype:'program',id:'scratch',name:'scratch',url:'',author:'',
 shortDescription:'',description:'',nextDay:1,exercises:[],days:[],weeks:[],isMultiweek:weeks.length>1,tags:[],
 clonedAt:0,planner:{vtype:'planner',name:'scratch',weeks}}
 const p=rt.Program_evaluate(program,settings)
 return {days:p.weeks[0].days.map(d=>d.exercises.filter(e=>e.name!=='Adaptive Rep Engine Template')),control:p.states['920']??{}}
}
const base=project(current)
if(base.days.map(x=>x.length).join(',')!=='11,13,12')throw Error('Current M6 A/B/C topology changed')
const result={schema:'HYBRID2-M6-POST-DELOAD-NATIVE-ATP2-H1-1',
 provenance:{sourceSha256:sha(original),queuedSourceSha256:sha(queued),frozenFitness:'9f2deb6c345643d7c0c793c52d358e496c2710d2',
 nativeRuntime:'ce75750bde4a190682fb5a6fa1984fc9184a9842',baseOpenGym:'8529b2d41b28fea8ae96a50325aaf28e864a0160',
 sourceOnlyRttH1:true,fixture:'original pinned baseline equipment; NOT live equipment',productionWrites:0},
 nativeExecutions:0,setupWorkouts:0,selectedPostDeloadWorkouts:0,checks:0,issues:[],steps:[],setupSourceShas:[],postCycleSummaries:[]}
const compare=(stage,day,field,native,expected,kind='openGym implementation mismatch')=>{
 result.checks++
 if(!Number.isFinite(native)||!Number.isFinite(expected)||Math.abs(native-expected)>0.011)
  result.issues.push({stage,day,field,native,expected,classification:kind})
}
const check=(stage,day,field,ok,kind='source bug')=>{
 result.checks++
 if(!ok)result.issues.push({stage,day,field,classification:kind})
}
const rounding=e=>{
 const equipmentId=settings.exerciseData?.[e.exerciseType?.id]?.equipment?.default
 const equip=settings.gyms[0]?.equipment?.[equipmentId]
 if(!equip)throw Error('Original gym equipment missing')
 const values=(equip.fixed??[]).map(kg).filter(v=>v>=0&&Number.isFinite(v))
 if(values.length>1)return {mode:'allowed_values',allowedValues:values}
 const plates=(equip.plates??[]).map(x=>kg(x.weight)).filter(x=>x>0)
 if(plates.length)return {step:Math.min(...plates)*Number(equip.multiplier??1)}
 throw Error('Original gym equipment has no rounding')
}
const loaded=(workout,e)=>{
 const line=workout.split('\n').find(x=>x.trim().startsWith(e.name+' / '))
 if(!line)return []
 const arr=[...line.matchAll(/(\d+)x(\d+)\s+([0-9.]+)kg/g)]
 return arr.flatMap(a=>Array.from({length:Number(a[1])},()=>({reps:Number(a[2]),weight:Number(a[3]),completed:true})))
}
const exposure=sets=>({mode:'repetitions',performance:{sets:sets.map((r,i)=>({
 setId:'s'+(i+1),role:'work',status:'completed',resistance:{kind:'external-load',value:r.weight,unit:'kg'},
 observations:[{metric:'repetitions',value:r.reps}]}))}})
const complete=(src,day,planned)=>{
 const commands=[]
 for(const [i,reps]of Object.entries(planned))
  for(const [k,r]of reps.entries())commands.push('change_reps('+i+','+(k+1)+','+r+')','complete_set('+i+','+(k+1)+')')
 commands.push('finish_workout()')
 const native=rt.Playground_run({programText:src,week:1,day,commands},settings,rt.defaultStats())
 if(!native.success||!native.data?.updatedProgramText)throw Error('Original native finish failed: '+JSON.stringify(native.error).slice(0,100))
 result.nativeExecutions++
 return {programText:native.data.updatedProgramText,workout:native.data.workout}
}
for(let day=1;day<=3;day++){
 const planned=Object.fromEntries(base.days[day-1].map((e,i)=>[i+1,[7]]))
 const {programText}=complete(current,day,planned)
 result.setupWorkouts++;result.setupSourceShas.push(sha(programText));current=programText
}
const afterDeload=project(current)
check('post-deload-start',0,'controller-queued-clear',Number(afterDeload.control.deloadQueued??0)===0)
check('post-deload-start',0,'controller-active-clear',Number(afterDeload.control.deloadActive??0)===0)
for(const [di,es]of afterDeload.days.entries())for(const [i,e]of es.entries()){
 if(Number(e.progress?.state?.anchorId)>0)for(const f of hk)compare('post-deload-start',di+1,'h1-'+e.progress.state.anchorId+'-'+f,h1(e.progress.state)[f],0)
}
const firstStage=sha(current)
for(let cycle=1;cycle<=3;cycle++){
 const counts=[]
 for(let day=1;day<=3;day++){
  const before=project(current),all=before.days[day-1],planned=Object.fromEntries(all.map((e,i)=>[i+1,[10]]))
  // Repeated multiset Turbo, preserving genuinely performed first-set observations.
  const slot1=day===1?1:2,slot2=day===1?6:8
  planned[slot1]=cycle===1?(day===1?[16,10,8]:[16,10]):cycle===2?[10,9]:[12,10]
  planned[slot2]=cycle===1?(day===1?[16,16,10]:[16,10]):cycle===2?[10,10]:[12,10]
  const {programText,workout}=complete(current,day,planned)
  result.selectedPostDeloadWorkouts++
  const after=project(programText)
  const step={cycle,day,beforeSha256:sha(current),afterSha256:sha(programText),observedAnchors:[],candidateChecks:0,sharedGroups:[],actualMultiSets:0,actualTurboWeightChanges:0,unparsedRows:0,issues:[],privateEvidence:[]}
  for(const [key,reps]of Object.entries(planned)){
   const ix=Number(key),e=all[ix-1],pre=e.progress?.state??{},post=after.days[day-1][ix-1].progress?.state??{}
   const sets=loaded(workout,e)
   if(!sets.length){step.unparsedRows++;continue}
   const privateEvidence={identity:'d'+day+'i'+ix,setsKg:sets.map(s=>s.weight),setsReps:sets.map(s=>s.reps),
    beforeCandidateKg:kg(pre.candidate),nativeAfterCandidateKg:kg(post.candidate),
    nativeFloorKg:kg(post.floorWeight),nativeProbe:Number(post.probeActive??0),
    nativeLowCount:Number(post.lowCount??0),nativeCounterActive:Number(post.counterActive??0),
    nativeCounterWeightKg:kg(post.counterWeight)}
   step.privateEvidence.push(privateEvidence)
   check('cycle'+cycle,day,'native-completed-reps-d'+day+'i'+ix,
     sets.length===reps.length&&sets.every((s,j)=>s.reps===reps[j]),'harness issue')
   if(sets.length>1){
    step.actualMultiSets++
    if(sets.some((z,j)=>j>0&&Math.abs(z.weight-sets[j-1].weight)>0.011))step.actualTurboWeightChanges++
   }
   if(Number(pre.paired??0)===0&&Number.isFinite(Number(pre.minTarget))&&Number.isFinite(Number(pre.maxTarget))){
    const state={minTarget:Number(pre.minTarget),maxTarget:Number(pre.maxTarget),candidate:kg(pre.candidate),floorWeight:kg(pre.floorWeight),
     probeActive:Number(pre.probeActive??0),lowCount:Number(pre.lowCount??0),counterWeight:kg(pre.counterWeight),counterActive:Number(pre.counterActive??0),paired:0}
    const modelRows=Array.from({length:e.evaluatedSetVariations?.reduce((n,v)=>n+v.sets.length,0)||sets.length},(_,j)=>
      sets[j]??{reps:1,weight:0,completed:false})
    const exp=evaluateAtp2({state,rounding:rounding(e),sets:modelRows,numberOfSets:modelRows.length}).nextState
    privateEvidence.expectedAtp2=exp
    compare('cycle'+cycle,day,'atp2-'+day+'-'+ix+':candidate',kg(post.candidate),exp.candidate)
    compare('cycle'+cycle,day,'atp2-'+day+'-'+ix+':probe',Number(post.probeActive??0),Number(exp.probeActive??0))
    compare('cycle'+cycle,day,'atp2-'+day+'-'+ix+':floor',kg(post.floorWeight),kg(exp.floorWeight))
    compare('cycle'+cycle,day,'atp2-'+day+'-'+ix+':lowCount',Number(post.lowCount??0),Number(exp.lowCount??0))
    compare('cycle'+cycle,day,'atp2-'+day+'-'+ix+':counterActive',Number(post.counterActive??0),Number(exp.counterActive??0))
    compare('cycle'+cycle,day,'atp2-'+day+'-'+ix+':counterWeight',kg(post.counterWeight),kg(exp.counterWeight))
    step.candidateChecks+=6
   }
   if(Number(pre.anchorId??0)>0){
    const signal=Number(pre.anchorId),obs=h1FromExposure(exposure(sets),{
     beforeCandidate:kg(pre.candidate),afterCandidate:kg(post.candidate),baselineUnit:'kg'})
    const expected=observeAnchor(validateAnchor(h1(pre)),obs).state,actual=h1(post)
    privateEvidence.expectedH1=expected
    privateEvidence.nativeH1=actual
    for(const f of hk)compare('cycle'+cycle,day,'h1-'+signal+':'+f,actual[f],expected[f])
    counts.push({signal,count:actual.perfCount,comparable:obs.kind==='COMPARABLE'})
    step.observedAnchors.push({signal,count:actual.perfCount,kind:obs.kind,
      candidateRatio:kg(pre.candidate)>0?Number((kg(post.candidate)/kg(pre.candidate)).toFixed(6)):null,
      expectedReferenceToCandidate:kg(post.candidate)>0?Number((expected.perfReference/kg(post.candidate)).toFixed(6)):null,
      actualReferenceToCandidate:kg(post.candidate)>0?Number((actual.perfReference/kg(post.candidate)).toFixed(6)):null})
   }
  }
  const groups=new Map()
  for(const [d,es]of after.days.entries())for(const [j,e]of es.entries()){
   if(!e.key)continue
   if(!groups.has(e.key))groups.set(e.key,[])
   groups.get(e.key).push({position:'d'+(d+1)+'i'+(j+1),s:e.progress?.state??{}})
  }
  for(const [key,items]of groups)if(items.length>1){
   step.sharedGroups.push({keyHash:sha(key).slice(0,12),occurrences:items.map(x=>x.position)})
   for(const x of items.slice(1))for(const f of ['candidate','floorWeight','probeActive'])
    compare('cycle'+cycle,day,'shared-'+sha(key).slice(0,12)+':'+f,
     f==='probeActive'?Number(x.s[f]??0):kg(x.s[f]),
     f==='probeActive'?Number(items[0].s[f]??0):kg(items[0].s[f]),'source bug')
  }
  step.issues=result.issues.filter(x=>x.stage==='cycle'+cycle&&x.day===day).map(z=>({field:z.field,classification:z.classification}))
  result.steps.push(step);current=programText
 }
 result.postCycleSummaries.push({cycle,anchors:counts})
}
result.selectedNativeComparisons=result.checks-(hk.length*6+2)
result.outcome=result.issues.length?'RED':'PASS'
const priv={...result,afterPostDeloadProgramSha256:sha(current)}
fs.writeFileSync(path.join(out,'m6-post-deload-native-private.json'),JSON.stringify(priv,null,2)+'\n',{mode:0o600})
const safe=structuredClone(priv)
for(const step of safe.steps)delete step.privateEvidence
for(const x of safe.issues){delete x.native;delete x.expected}
fs.writeFileSync(path.join(out,'m6-post-deload-native-sanitized.json'),JSON.stringify(safe,null,2)+'\n')
console.log(JSON.stringify({outcome:result.outcome,setupWorkouts:result.setupWorkouts,
 nativeExecutions:result.nativeExecutions,selectedPostDeloadWorkouts:result.selectedPostDeloadWorkouts,
 checks:result.checks,issues:result.issues.length,cycleSummaries:result.postCycleSummaries,
 firstIssues:result.issues.slice(0,12).map(x=>({stage:x.stage,day:x.day,field:x.field,classification:x.classification}))},null,2))
if(result.issues.length)process.exitCode=1
