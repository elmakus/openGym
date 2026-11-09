#!/usr/bin/env node
// Read-only source from Liftosaur get_program, pinned original runtime.
// Causal control for RTT occurrence update overrides shadowing Adaptive template update.
// Validation-only transformations are NEVER written to the account or public repository.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {cycleStartTransition,completeDeloadCloser} from '../../api/training-control/hybrid2/lifecycle.js'
const here=path.dirname(fileURLToPath(import.meta.url))
const fitness=process.env.FITNESS_ROOT,runtimeRoot=process.env.LIFTOSAUR_RUNTIME_ROOT,privateRoot=process.env.PRIVATE_LIVE_ROOT,outDir=process.env.H2_PARITY_OUT
if(!fitness||!runtimeRoot||!privateRoot||!outDir)throw Error('Require pinned fitness/native runtime/private workspace paths')
const pin='ce75750bde4a190682fb5a6fa1984fc9184a9842'
if(!fs.readFileSync(path.join(runtimeRoot,'README.txt'),'utf8').includes(pin))throw Error('Native pin mismatch')
const rt=createRequire(import.meta.url)(path.join(runtimeRoot,'runtime_api.cjs'))
const {buildSettings}=createRequire(import.meta.url)(path.join(fitness,'tests/fixtures/marta-playground-baseline/settings/build_settings.cjs'))
const settings=buildSettings(path.join(fitness,'tests/fixtures/marta-playground-baseline'))
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
const baseline=fs.readFileSync(path.join(privateRoot,'qtwbbqff-queued-native.liftoscript'),'utf8')
function transform(s,limit){
 let pos=0,n=0
 while(true){
  const u=s.indexOf(' / update: custom() {~',pos)
  if(u<0)break
  const e=s.indexOf('~} / progress: custom(',u)
  if(e<0)throw Error('Malformed native update/progress delimiter')
  const body=s.slice(u,e)
  if(body.includes('RTT-MODE-SEAM:')&&body.includes('exercise-')&&n<limit){
   s=s.slice(0,u)+s.slice(e+2);n++;pos=u
  }else pos=e+2
 }
 return {source:s,removed:n}
}
function ev(source){
 const weeks=rt.PlannerProgram_evaluateText(source)
 const p={vtype:'program',id:'p',name:'p',url:'',author:'',shortDescription:'',description:'',nextDay:1,exercises:[],days:[],weeks:[],isMultiweek:false,tags:[],clonedAt:0,planner:{vtype:'planner',name:'p',weeks}}
 const v=rt.Program_evaluate(p,settings)
 return {controller:v.states['920'],days:v.weeks[0].days.map(d=>d.exercises.filter(x=>x.name!=='Adaptive Rep Engine Template'))}
}
const kg=x=>typeof x==='number'?x:x?.unit==='kg'?x.value:x?.unit==='lb'?x.value*.45359237:0
function signals(source){
 const x=ev(source)
 return x.days.flatMap((list,day)=>list.map((e,i)=>({e,day:day+1,index:i+1})).filter(z=>z.e.progress?.state?.anchorId>0)
 .map(z=>({slot:z.e.progress.state.anchorId,day:z.day,index:z.index,
  count:Number(z.e.progress.state.perfCount??0),ref:kg(z.e.progress.state.perfReference??0),guard:Number(z.e.progress.state.candidateGuard??0),
  candidate:kg(z.e.progress.state.candidate??0)})))
}
function lifecycle(s){
 return {deloadQueued:Number(s.deloadQueued??0),deloadActive:Number(s.deloadActive??0),deloadStarted:Number(s.deloadStarted??0),
 rolloverClear:Number(s.rolloverClear??0),badCycleStreak:Number(s.badCycleStreak??0),allSignalsReady:Boolean(s.allSignalsReady),lastCycleClass:Number(s.lastCycleClass??0)}
}
function native(programText,day,commands){
 const r=rt.Playground_run({programText,week:1,day,commands},settings,rt.defaultStats())
 return r
}
const baseState=lifecycle(ev(baseline).controller)
if(baseState.deloadQueued!==1||baseState.deloadActive!==0)throw Error('Real queued fixture does not contain intended lifecycle input')
const expectedStarted=cycleStartTransition(baseState,true).state
const expectedClosed=completeDeloadCloser(expectedStarted,1).state
const variants=[{id:'ORIGINAL_READONLY',source:baseline,removed:0},
 {id:'REMOVE_FIRST_OVERRIDE_CONTROL',...transform(baseline,1)},
 {id:'REMOVE_ALL_RTT_OCCURRENCE_OVERRIDES_CONTROL',...transform(baseline,1e6)}]
const result={schema:'HYBRID2-M6-CURRENT-LIVE-RTT-UPDATE-SHADOW-CAUSAL-1',
 provenance:{programId:'qtwbbqff',freshReadOnlySourceSha256:sha(fs.readFileSync(path.join(privateRoot,'qtwbbqff.liftoscript'),'utf8')),queuedNativeSourceSha256:sha(baseline),
 fitnessPin:'9f2deb6c345643d7c0c793c52d358e496c2710d2',nativeRuntimePin:pin,openGymBase:'8529b2d41b28fea8ae96a50325aaf28e864a0160',settings:'committed frozen Marta fixture (NOT live gym)',accountWrites:0},
 scope:'Actual current Liftosaur source queued after four full native normal M6 cycles. Three PRIVATE SCRATCH source variants: original, remove only first RTT per-exercise update override, remove all RTT per-exercise overrides. Original Adaptive base template/Controller/H1 math unchanged. Deload full-cycle only in all-overrides-removed control; NOT proposed production patch.',
 initialLifecycle:baseState,controlExpectations:{started:expectedStarted,closed:expectedClosed},
 variants:[],issues:[],nativeFinishedWorkouts:0,nativeSetAccessProbes:0,comparedFields:0}
const originalSignals=signals(baseline),beforeBySlot=Object.fromEntries(originalSignals.map(s=>[s.slot,s]))
const compare=(kind,a,b,meta)=>{for(const key of Object.keys(b)){result.comparedFields++;const same=typeof b[key]==='number'?Math.abs(a[key]-b[key])<=0.011:a[key]===b[key];if(!same)result.issues.push({...meta,phase:kind,field:key,native:a[key],openGym:b[key]})}}
for(const variant of variants){
 let src=variant.source
 const validation=rt.Playground_validateProgramText(src,settings)
 if(validation!==undefined && validation!==null)throw Error('Scratch source variant parser failure '+variant.id)
 const bad=native(src,1,['change_reps(1,3,6)']);result.nativeSetAccessProbes++
 const one=native(src,1,['change_reps(1,1,7)','complete_set(1,1)','finish_workout()']);result.nativeFinishedWorkouts++
 if(!one.success||!one.data?.updatedProgramText)throw Error('Native first session failed '+variant.id+' '+one.error)
 const st=lifecycle(ev(one.data.updatedProgramText).controller)
 const rec={id:variant.id,removedRTTOverrides:variant.removed,scratchSourceSha256:sha(src),parser:'PASS',
   probeThirdSet:{command:'change_reps(1,3,6)',nativeSuccess:bad.success,error:String(bad.error||'').slice(0,100)},
   firstWorkout:{updatedSourceSha256:sha(one.data.updatedProgramText),nativeController:st},
   deloadDays:[]}
 if(variant.id==='ORIGINAL_READONLY'){
  compare('originalNativeDoesNotStart',st,baseState,{variant:variant.id,assertion:'pinned source retains queued/active state after first workout'})
  // Direct control: confirm the expected deload does not start; intentionally RED relative to desired behavior.
  result.comparedFields++
  if(st.deloadActive!==0)result.issues.push({variant:variant.id,phase:'negativeControlUnexpectedActivation'})
 }else{
  compare('positiveControlStarts',st,expectedStarted,{variant:variant.id})
 }
 if(variant.id==='REMOVE_ALL_RTT_OCCURRENCE_OVERRIDES_CONTROL'){
  let source=src
  for(let day=1;day<=3;day++){
   const before=ev(source),ex=before.days[day-1],cmd=[],probes=[]
   for(let i=0;i<ex.length;i++){
    const e=ex[i],slot=e.progress?.state?.anchorId||0
    if(slot>0 || (day===3&&i===ex.length-1)){
     const baseCount=e.evaluatedSetVariations?.reduce((n,v)=>n+(v.sets?.length||0),0)||0
     const unavailable=Math.ceil(baseCount/2)+1
     const probe=native(source,day,[`change_reps(${i+1},${unavailable},6)`]);result.nativeSetAccessProbes++;result.comparedFields++
     const pass=probe.success===false&&String(probe.error||'').includes('Set '+unavailable+' not found')
     probes.push({slot:slot||'closer',exerciseIndex:i+1,programSets:baseCount,expectedReducedSets:unavailable-1,probeSet:unavailable,pass,nativeSuccess:probe.success,nativeError:String(probe.error||'').slice(0,120)})
     if(!pass)result.issues.push({variant:variant.id,day,slot,phase:'nativeSetBudget',native:probe.success})
    }
    if(slot>0)cmd.push(`change_reps(${i+1},1,7)`)
    if(e.progress?.state?.optionalDeloadSkip===1)continue
    cmd.push(`complete_set(${i+1},1)`)
   }
   cmd.push('finish_workout()')
   const out=native(source,day,cmd)
   result.nativeFinishedWorkouts++
   if(!out.success||!out.data?.updatedProgramText)throw Error('All-override diagnostic deload failed on day '+day+': '+String(out.error))
   source=out.data.updatedProgramText
   const ctrl=lifecycle(ev(source).controller)
   const actualAnchors=signals(source)
   for(const anchor of actualAnchors){
    const before=beforeBySlot[anchor.slot]
    result.comparedFields+=4
    if(Math.abs(anchor.candidate-before.candidate)>.011)result.issues.push({variant:variant.id,day,slot:anchor.slot,phase:'adaptiveCandidateChanged',native:anchor.candidate,baseline:before.candidate})
    const expectedCount=day===3?0:before.count
    const expectedReference=day===3?0:before.ref
    const expectedGuard=day===3?0:before.guard
    if(anchor.count!==expectedCount)result.issues.push({variant:variant.id,day,slot:anchor.slot,phase:'h1Count',native:anchor.count,openGym:expectedCount})
    if(Math.abs(anchor.ref-expectedReference)>.011)result.issues.push({variant:variant.id,day,slot:anchor.slot,phase:'h1Reference',native:anchor.ref,openGym:expectedReference})
    if(anchor.guard!==expectedGuard)result.issues.push({variant:variant.id,day,slot:anchor.slot,phase:'candidateGuard',native:anchor.guard,openGym:expectedGuard})
   }
   compare('deloadController',ctrl,day===3?expectedClosed:expectedStarted,{variant:variant.id,day})
   rec.deloadDays.push({day,workoutSourceAfterSha256:sha(source),nativeController:ctrl,
     anchors:actualAnchors.map(a=>({slot:a.slot,count:a.count,referenceReady:a.ref>0,guard:a.guard})),nativeSetProbes:probes})
  }
 }
 result.variants.push(rec)
}
result.failures=result.issues.length
fs.mkdirSync(outDir,{recursive:true})
fs.writeFileSync(path.join(outDir,'real-marta-rtt-shadow-causal-raw.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({original:result.variants[0],firstControl:result.variants[1].firstWorkout,
 allControl:result.variants[2].deloadDays.map(x=>({day:x.day,controller:x.nativeController,signals:x.anchors,failedSetProbes:x.nativeSetProbes.filter(p=>!p.pass).length})),
 finishedWorkouts:result.nativeFinishedWorkouts,setProbes:result.nativeSetAccessProbes,comparedFields:result.comparedFields,failures:result.failures,issues:result.issues.slice(0,18)},null,2))
if(result.failures)process.exitCode=1
