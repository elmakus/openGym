#!/usr/bin/env node
// Isolated genuine Liftosaur runtime, compiler-hook instrumentation only.
// Private M6 inputs remain outside the repository; no account writes.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
import {addStaleH1WriteBarrier} from './h1-stale-barrier-variant.mjs'

const runtime=process.env.LIFTOSAUR_RUNTIME_ROOT
const fitness=process.env.FITNESS_ROOT
const privateRoot=process.env.PRIVATE_LIVE_ROOT
const out=process.env.H2_PARITY_OUT
if(!runtime||!fitness||!privateRoot||!out) throw Error('Required frozen external fixture roots missing')
const variant=process.argv[2]||'reference'
if(!['reference','current-state-wins','source-barrier','reference-entry-reversed','source-barrier-entry-reversed'].includes(variant)) throw Error('Unknown variant')
const pin='ce75750bde4a190682fb5a6fa1984fc9184a9842'
if(!fs.readFileSync(path.join(runtime,'README.txt'),'utf8').includes(pin))throw Error('Wrong native runtime')
process.env.TS_NODE_TRANSPILE_ONLY ||= '1'
process.env.TS_NODE_PROJECT ||= path.join(runtime,'tsconfig.json')
const localRequire=createRequire(import.meta.url)
const nativeRequire=createRequire(path.join(runtime,'runtime_api.cjs'))
nativeRequire('ts-node/register/transpile-only')
nativeRequire(path.join(runtime,'register-rn-web.js'))
const originalLoader=localRequire.extensions['.ts']
let loaderApplied=0
localRequire.extensions['.ts']=function(module,filename){
  if(filename===path.join(runtime,'src/models/program.ts')){
    const prev=module._compile
    module._compile=function(js,file){
      if(variant.endsWith('entry-reversed')){
        const entryLoop='for (const entry of progress.entries) {'
        if(!js.includes(entryLoop))throw Error('Cannot find frozen native progress entry loop')
        js=js.replace(entryLoop,'for (const entry of [...progress.entries].reverse()) {')
      }
      const errorSeam='if (newStateResult.success) {'
      if(!js.includes(errorSeam))throw Error('Native finish-day success branch missing')
      js=js.replace(errorSeam,'if(!newStateResult.success)globalThis.__M6_TRACE?.push({phase:"script-error",entryIndex:progress.entries.indexOf(entry),message:String(newStateResult.error).slice(0,240)});'+errorSeam)
      const before='const { state, updates, bindings, otherStates } = newStateResult.data;'
      const merge='exercise.progress.state = Object.assign(Object.assign(Object.assign({}, exercise.progress.state), entry.state), state);'
      if(!js.includes(before)||!js.includes(merge))throw Error('Pinned native compiler seam not found: before='+js.includes(before)+' merge='+js.includes(merge)+' fragment='+js.slice(js.indexOf('exercise.progress.state ='),js.indexOf('exercise.progress.state =')+165))
      const trace='globalThis.__M6_TRACE?.push({phase:"pre-write",entryIndex:progress.entries.indexOf(entry),anchor:Number(programExercise.progress?.state?.anchorId??0),canonical92002:Number(newEvaluatedProgram.states[92002]?.perfCount??-1),local92002:Number(programExercise.progress?.state?.perfCount??-1),entryPerfCount:Number(entry.state?.perfCount??-1),scriptDiffPerfCount:state.perfCount??null,otherStateDiff92002:otherStates[92002]?.perfCount??null,crossResetTags:Object.keys(otherStates).filter(k=>Number(k)>=92001&&Number(k)<=92006&&otherStates[k]?.perfCount===0).map(Number).sort((a,b)=>a-b),controllerRollover:newEvaluatedProgram.states[920]?.rolloverClear??null});'
      js=js.replace(before,before+'\n'+trace)
      const after='globalThis.__M6_TRACE?.push({phase:"post-local-write",entryIndex:progress.entries.indexOf(entry),anchor:Number(exercise.progress.state.anchorId??0),slotPerfCount:Number(exercise.progress.state.perfCount??-1)});'
      js=js.replace(merge,(variant==='current-state-wins'
        ?'exercise.progress.state = Object.assign(Object.assign(Object.assign({}, entry.state), exercise.progress.state), state);'
        :merge)+'\n'+after)
      loaderApplied++
      return prev.call(this,js,file)
    }
  }
  return originalLoader(module,filename)
}
const rt=nativeRequire(path.join(runtime,'runtime_api.cjs'))
if(loaderApplied!==1)throw Error('Instrumentation did not load pinned program.ts exactly once')
const {buildSettings}=nativeRequire(path.join(fitness,'tests/fixtures/marta-playground-baseline/settings/build_settings.cjs'))
const settings=buildSettings(path.join(fitness,'tests/fixtures/marta-playground-baseline'))
const original=fs.readFileSync(path.join(privateRoot,'qtwbbqff-queued-native.liftoscript'),'utf8')
const sha=s=>crypto.createHash('sha256').update(s).digest('hex')
const h1Fields=['perf1','perf2','perf3','perfCount','perfReference','candidateGuard']
const updateMarker=' / update: custom() {~',endMarker='~} / progress: custom('
const a=original.indexOf(updateMarker), b=original.indexOf(endMarker,a)
if(a<0||b<0)throw Error('Inherited Adaptive update missing')
const adaptive=original.slice(a+updateMarker.length,b)
let merged=0
const fusedSource=original.replace(/ \/ update: custom\(\) \{~([\s\S]*?)~\} \/ progress: custom\(/g,(match,body)=>{
  if(!body.includes('RTT-MODE-SEAM:')||!body.includes('exercise-'))return match
  const mode=body.match(/var\.rttMode = [02]/)?.[0]
  if(!mode)throw Error('RTT mode missing')
  merged++
  return updateMarker+'\n'+mode+'\nif (var.rttMode != 2) {\n'+adaptive+'\n}\n'+body+endMarker
})
if(merged!==29)throw Error('Unexpected local RTT blocks '+merged)
const source=variant.startsWith('source-barrier')?addStaleH1WriteBarrier(fusedSource):fusedSource
const origIntro=src=>src.replace(/var\.rttMode = 0/g,'var.rttMode = 2')
const units=x=>typeof x==='number'?x:x?.unit==='kg'?x.value:x?.unit==='lb'?x.value*.45359237:0
function project(src){
 const weeks=rt.PlannerProgram_evaluateText(src)
 const p={vtype:'program',id:'p',name:'p',url:'',author:'',shortDescription:'',description:'',nextDay:1,exercises:[],days:[],weeks:[],isMultiweek:false,tags:[],clonedAt:0,planner:{vtype:'planner',name:'p',weeks}}
 const z=rt.Program_evaluate(p,settings)
 const days=z.weeks[0].days.map(d=>d.exercises.filter(e=>e.name!=='Adaptive Rep Engine Template'))
 const signals=Object.fromEntries(days.flatMap((ex,d)=>ex.map((e,i)=>({e,d:d+1,i:i+1})).filter(x=>x.e.progress?.state?.anchorId>0).map(x=>[x.e.progress.state.anchorId,x])))
 return {days,signals,control:z.states['920'],tags:Object.fromEntries(Array.from({length:6},(_,i)=>[i+1,z.states[String(92001+i)]]))}
}
const result={schema:'M6-STALE-NATIVE-MERGE-PROBE-1',variant,sourceSha256:sha(original),fusedQueuedSha256:sha(source),runtimePin:pin,fitnessPin:'9f2deb6c345643d7c0c793c52d358e496c2710d2',accountWrites:0,nativeWorkouts:0,checks:0,failures:[],cases:[],sourceOutsideRepository:true}
function assertion(ok,caseId,field,slot=null){result.checks++;if(!ok)result.failures.push({caseId,field,slot})}
function run(src,day,commands){
 globalThis.__M6_TRACE=[]
 const x=rt.Playground_run({programText:src,week:1,day,commands},settings,rt.defaultStats())
 if(!x.success)throw Error('Native '+day+' failed: '+String(x.error).slice(0,150))
 if(!x.data?.updatedProgramText)throw Error('Missing serialized original runtime program')
 result.nativeWorkouts++
 const trace=globalThis.__M6_TRACE
 globalThis.__M6_TRACE=undefined
 return {source:x.data.updatedProgramText,trace}
}
const checkSource=rt.Playground_validateProgramText(source,settings)
if(checkSource!=null)throw Error('Invalid fusion variant '+JSON.stringify(checkSource).slice(0,150))
const startView=project(source)
assertion(Number(startView.control.deloadQueued)===1,'setup','queued')
const deloadCommands=startView.days[0].flatMap((ex,i)=>[
 ...(ex.progress?.state?.anchorId>0?[`change_reps(${i+1},1,7)`]:[]),`complete_set(${i+1},1)`])
const deload=run(source,1,[...deloadCommands,'finish_workout()'])
const afterDeload=project(deload.source)
assertion(Number(afterDeload.control.deloadActive)===1,'setup','genuine-deload-start')
const staleSource=origIntro(deload.source)
if(rt.Playground_validateProgramText(staleSource,settings)!=null)throw Error('Invalid scratch RTT INTRO')
const baseline=project(staleSource)
const anchors=Object.entries(baseline.signals).filter(([,x])=>x.d===1)
if(anchors.length!==2)throw Error('Expected two day A H1 anchors')
const cases=[
 {id:'first-only',selected:[anchors[0]]},
 {id:'second-only',selected:[anchors[1]]},
 {id:'both-first-second',selected:anchors},
 {id:'both-complete-reversed',selected:[...anchors].reverse()}
]
for(const item of cases){
 const commands=item.selected.flatMap(([,z])=>[`change_reps(${z.i},1,10)`,`complete_set(${z.i},1)`])
 const done=run(staleSource,1,[...commands,'finish_workout()'])
 const after=project(done.source)
 assertion(Number(after.control.deloadActive)===0,item.id,'active-zero')
 assertion(Number(after.control.rolloverClear)===1,item.id,'rollover-one')
 const tags={}
 for(const [slot,s] of Object.entries(after.tags)){
  const fields=Object.fromEntries(h1Fields.map(k=>[k,k==='perfCount'||k==='candidateGuard'?Number(s?.[k]??-1):units(s?.[k])]))
  for(const field of h1Fields)assertion(Math.abs(fields[field])<.011,item.id,field,Number(slot))
  const prior=baseline.tags[slot]
  assertion(Math.abs(units(s?.candidate)-units(prior?.candidate))<.011,item.id,'candidate-preserved',Number(slot))
  tags[slot]={perfCount:fields.perfCount,allH1Zero:h1Fields.every(k=>Math.abs(fields[k])<.011)}
 }
 const trace=done.trace.filter(x=>x.phase==='pre-write'||x.phase==='script-error'||(x.phase==='post-local-write'&&(x.anchor===2||x.slotPerfCount!==-1)))
 if(variant.startsWith('source-barrier')&&item.id==='both-first-second'){
   const anchorsWritten=trace.filter(x=>x.phase==='pre-write'&&x.anchor>0)
   assertion(JSON.stringify(anchorsWritten[0]?.crossResetTags)==='[92001,92002,92003,92004,92005,92006]',item.id,'global-six-tags-once')
   assertion(JSON.stringify(anchorsWritten[1]?.crossResetTags)===JSON.stringify([92000+anchorsWritten[1]?.anchor]),item.id,'later-anchor-own-tag-barrier-only')
 }
 result.cases.push({id:item.id,requestedAnchorOrder:item.selected.map(([slot])=>Number(slot)),nativeScriptEntryOrder:trace.filter(x=>x.phase==='pre-write'&&x.anchor>0).map(x=>({entryIndex:x.entryIndex,anchor:x.anchor})),controller:{active:Number(after.control.deloadActive),rolloverClear:Number(after.control.rolloverClear)},tags,trace})
}
result.failureCount=result.failures.length
fs.mkdirSync(out,{recursive:true})
const pathOut=path.join(out,'m6-stale-native-merge-'+variant+'.json')
fs.writeFileSync(pathOut,JSON.stringify(result,null,2)+'\n',{mode:0o600})
console.log(JSON.stringify({variant,nativeWorkouts:result.nativeWorkouts,checks:result.checks,failures:result.failures,cases:result.cases.map(x=>({id:x.id,tags:x.tags,nativeScriptEntryOrder:x.nativeScriptEntryOrder,trace:x.trace.filter(z=>z.anchor===2||z.entryPerfCount>0)}))},null,2))
if(result.failureCount)process.exitCode=1
