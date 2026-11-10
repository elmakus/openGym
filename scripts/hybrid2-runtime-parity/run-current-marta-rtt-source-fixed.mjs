#!/usr/bin/env node
// Validation-only, private in-memory composition. NEVER write a real Liftosaur account.
// Contrasts merged Adaptive+local RTT update with original Adaptive NORMAL and original RTT INTRO.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
import {h1FromExposure} from '../../api/training-control/hybrid2/observation.js'
import {centralizeRttUpdate} from './rtt-centralized-update-variant.mjs'
import {addStaleH1WriteBarrier} from './h1-stale-barrier-variant.mjs'
import {observeAnchor,initialAnchor,validateAnchor} from '../../api/training-control/hybrid2/h1.js'
const root=process.env.PRIVATE_LIVE_ROOT, fitness=process.env.FITNESS_ROOT,runtime=process.env.LIFTOSAUR_RUNTIME_ROOT,out=process.env.H2_PARITY_OUT
if(!root||!fitness||!runtime||!out)throw Error('Required private frozen source/native runtime/fitness/output roots not provided')
const runtimePin='ce75750bde4a190682fb5a6fa1984fc9184a9842',fitnessPin='9f2deb6c345643d7c0c793c52d358e496c2710d2'
if(!fs.readFileSync(path.join(runtime,'README.txt'),'utf8').includes(runtimePin))throw Error('Unpinned runtime')
const require=createRequire(import.meta.url)
const rt=require(path.join(runtime,'runtime_api.cjs'))
const {buildSettings}=require(path.join(fitness,'tests/fixtures/marta-playground-baseline/settings/build_settings.cjs'))
const settings=buildSettings(path.join(fitness,'tests/fixtures/marta-playground-baseline'))
const sha=s=>crypto.createHash('sha256').update(s).digest('hex')
const original=fs.readFileSync(path.join(root,'qtwbbqff.liftoscript'),'utf8')
const queued=fs.readFileSync(path.join(root,'qtwbbqff-queued-native.liftoscript'),'utf8')
const h1Keys=['perf1','perf2','perf3','perfCount','perfReference','candidateGuard']
const kg=x=>typeof x==='number'?x:x?.unit==='kg'?x.value:x?.unit==='lb'?x.value*.45359237:0
const norm=s=>Object.fromEntries(h1Keys.map(k=>[k,k==='perfCount'||k==='candidateGuard'?Number(s[k]??0):kg(s[k]??0)]))
const result={schema:'HYBRID2-RTT-CENTRALIZED-SOURCE-H1-STALE-BARRIER-1',pin:{runtime:runtimePin,fitness:fitnessPin,
 openGymBase:'8529b2d41b28fea8ae96a50325aaf28e864a0160',originalSourceSha256:sha(original),queuedSourceSha256:sha(queued),
 settings:'Frozen original Marta baseline; NOT active gym',privateOriginalPublished:false,accountWrites:0},
 experiments:[],nativeFinishedWorkouts:0,nativeSetProbes:0,comparisons:0,failures:[],exclusion:'Validation-only centralized one-template RTT intro dispatcher plus in-template H1 stale barrier on UNMODIFIED runtime; not a production patch. No real program modified.'}
const updateMarker=' / update: custom() {~'
const endMarker='~} / progress: custom('
function merge(source){
 const a=source.indexOf(updateMarker),b=source.indexOf(endMarker,a)
 if(a<0||b<0)throw Error('Adaptive template missing')
 const template=source.slice(a+updateMarker.length,b)
 // When supplied, execute the already materialized fitness generator artifact
 // *directly* in native Liftosaur. The original JS overlays are NOT invoked.
 // Both candidate input SHAs must match the current private original sources.
 const candidateDir=process.env.M6_GENERATED_CANDIDATE_DIR
 if(candidateDir){
  const originalSha=sha(original), queuedSha=sha(queued), inSha=sha(source)
  const prefix=inSha===originalSha?'m6-normal':inSha===queuedSha?'m6-queued':null
  if(!prefix)throw Error('Generated candidate input is not one of the two pinned source states')
  const manifest=JSON.parse(fs.readFileSync(path.join(candidateDir,prefix+'.json'),'utf8'))
  const candidate=fs.readFileSync(path.join(candidateDir,prefix+'-fixed.liftoscript'),'utf8')
  const compilerVersion=manifest.source_generator||manifest.version
  if(manifest.original_sha256!==inSha ||
     manifest.candidate_sha256!==sha(candidate) ||
     manifest.merged_overrides!==29 ||
     !compilerVersion?.includes('M6-H1-STALE-ENTRY-BARRIER-1') ||
     (manifest.target_program_id && manifest.target_program_id!=='qtwbbqff') ||
     (manifest.occurrence_count && manifest.occurrence_count!==36))
    throw Error('Generated fitness candidate source digest, identity or contract mismatch')
  return {source:candidate,merged:manifest.merged_overrides,templateUpdateSha256:sha(template)}
 }
 const x=centralizeRttUpdate(source)
 return {...x,source:addStaleH1WriteBarrier(x.source),templateUpdateSha256:sha(template)}
}
function withoutRttMetadata(state){
 return Object.fromEntries(Object.entries(state??{}).filter(([key])=>!['rttIntroA','rttIntroB','rttIntroC'].includes(key)))
}
function removeAll(source){
 let n=0
 const reduced=source.replace(/ \/ update: custom\(\) \{~([\s\S]*?)~\} \/ progress: custom\(/g,(match,body)=>{
  if(!body.includes('RTT-MODE-SEAM:')||!body.includes('exercise-'))return match
  n++;return ' / progress: custom('
 })
 if(n!==29)throw Error('Reference source missing 29 local RTT blocks')
 return reduced
}
function intro(source){const changed=source.replace(/var\.rttMode = 0/g,'var.rttMode = 2');if(changed===source)throw Error('No RTT mode found');return changed}
function verify(source,tag){
 const bad=rt.Playground_validateProgramText(source,settings)
 if(bad!=null)throw Error(tag+' native validation error: '+JSON.stringify(bad).slice(0,250))
}
function project(src){
 const weeks=rt.PlannerProgram_evaluateText(src)
 const p={vtype:'program',id:'p',name:'p',url:'',author:'',shortDescription:'',description:'',nextDay:1,exercises:[],days:[],weeks:[],isMultiweek:false,tags:[],clonedAt:0,
 planner:{vtype:'planner',name:'p',weeks}}
 const z=rt.Program_evaluate(p,settings)
 const days=z.weeks[0].days.map(d=>d.exercises.filter(e=>e.name!=='Adaptive Rep Engine Template'))
 const signals=Object.fromEntries(days.flatMap((a,d)=>a.map((e,i)=>({e,d:d+1,i:i+1})).filter(z=>z.e.progress?.state?.anchorId>0)
   .map(z=>[z.e.progress.state.anchorId,z])))
 return {days,signals,control:z.states['920'],canonicalTags:Object.fromEntries(Array.from({length:6},(_,i)=>[i+1,z.states[String(92001+i)]]))}
}
function native(src,day,commands){
 const x=rt.Playground_run({programText:src,week:1,day,commands},settings,rt.defaultStats())
 if(!x.success)throw Error('Native failed: '+String(x.error).slice(0,320)+'; day '+day+' cmds '+commands.length)
 return x
}
function finish(src,day,reps,includeSecond=false){
 const view=project(src),ex=view.days[day-1],cmd=[]
 for(let i=0;i<ex.length;i++){
  const state=ex[i].progress?.state||{}
  if(state.anchorId>0)cmd.push(`change_reps(${i+1},1,${reps})`)
  cmd.push(`complete_set(${i+1},1)`)
 }
 if(includeSecond){const remove=cmd[0]?.startsWith('change_reps(')?2:1;cmd.splice(0,remove,'change_reps(1,1,12)','complete_set(1,1)','change_reps(1,2,10)','complete_set(1,2)')}
 cmd.push('finish_workout()')
 const x=native(src,day,cmd)
 if(!x.data?.updatedProgramText)throw Error('Native did not serialize finished source')
 result.nativeFinishedWorkouts++
 return {source:x.data.updatedProgramText,workout:x.data.workout,view}
}
const completedRows=workout=>workout.split('\n').filter(s=>s.startsWith('  ')&&s.includes(' / ')).map(s=>s.trim())
const completedSetOnly=rows=>rows.map(row=>row.split(' / ')[1]??'')
const plannedDetails=rows=>rows.map(row=>row.split(' / ').slice(2).join(' / '))
function fail(phase,detail){result.failures.push({phase,...detail})}
function checkEq(a,b,phase,detail={}){
 result.comparisons++
 if(JSON.stringify(a)!==JSON.stringify(b))fail(phase,detail)
}
function compareState(a,b,phase){
 const pa=project(a),pb=project(b)
 checkEq(withoutRttMetadata(pa.control),withoutRttMetadata(pb.control),phase+'-controller')
 for(let d=0;d<3;d++){
  checkEq(pa.days[d].length,pb.days[d].length,phase+'-day-count',{day:d+1})
  for(let i=0;i<pa.days[d].length;i++){
   const x=pa.days[d][i],y=pb.days[d][i]
   checkEq(withoutRttMetadata(x.progress?.state),withoutRttMetadata(y?.progress?.state),phase+'-exercise-progress',{day:d+1,exerciseIndex:i+1})
  }
 }
}
function expect(name,ok,detail={}){
 result.comparisons++
 if(!ok)fail(name,detail)
}
function probe(src,day,index,set,expectedSuccess){
 const o=rt.Playground_run({programText:src,week:1,day,commands:[`change_reps(${index},${set},6)`]},settings,rt.defaultStats())
 result.nativeSetProbes++
 expect('set-probe',o.success===expectedSuccess,{day,exerciseIndex:index,set,expectedSuccess,actual:o.success,errorKind:String(o.error||'').replace(/\d+(\.\d+)?(kg|lb)?/g,'#').slice(0,90)})
 return o
}
console.log('Native checking scratch fused source...')
const fusedInitial=merge(original),fusedQueued=merge(queued)
verify(fusedInitial.source,'merged-normal');verify(fusedQueued.source,'merged-queued')
result.pin.fusedInitialSha256=sha(fusedInitial.source);result.pin.fusedQueuedSha256=sha(fusedQueued.source)
result.pin.templateUpdateSha256=fusedInitial.templateUpdateSha256
result.experiments.push({id:'fusion-shape',mergedOccurrenceOverrides:fusedInitial.merged,originalSourceUntouched:true,parser:'PASS'})
// In NORMAL, the correct oracle is the original inherited Adaptive update, not the broken local-only RTT update.
let clean=removeAll(original),stitched=fusedInitial.source
verify(clean,'adaptive-no-local-normal')
const normal=[]
for(let day=1;day<=3;day++){
 const a=finish(clean,day,day===1?21:12),b=finish(stitched,day,day===1?21:12)
 compareState(a.source,b.source,'normal-after-finish-'+day)
 checkEq(completedSetOnly(completedRows(a.workout)),completedSetOnly(completedRows(b.workout)),'normal-actual-completed-sets',{day})
 checkEq(plannedDetails(completedRows(a.workout)),plannedDetails(completedRows(b.workout)),'normal-targets-and-supplementary',{day})
 clean=a.source;stitched=b.source
 normal.push({day,matchedAllProgressStates:result.failures.filter(e=>e.phase.includes('normal')).length===0})
}
result.experiments.push({id:'NORMAL-against-native-inherited-Adaptive',nativeWorkouts:6,normal})
// RTT INTRO: original RTT-only mode 2 is oracle, with the same scratch-only rttMode modification on both sources.
let introOriginal=intro(original),introMerged=intro(fusedInitial.source)
verify(introOriginal,'original-rtt-intro');verify(introMerged,'fused-rtt-intro')
const introCases=[]
for(let day=1;day<=3;day++){
 const checkA=rt.Playground_run({programText:introOriginal,week:1,day,commands:['change_reps(1,2,10)']},settings,rt.defaultStats())
 const checkB=rt.Playground_run({programText:introMerged,week:1,day,commands:['change_reps(1,2,10)']},settings,rt.defaultStats())
 result.nativeSetProbes+=2
 const postFirstCommands=['change_reps(1,1,12)','complete_set(1,1)','change_reps(1,2,10)']
 const afterFirstA=rt.Playground_run({programText:introOriginal,week:1,day,commands:postFirstCommands},settings,rt.defaultStats())
 const afterFirstB=rt.Playground_run({programText:introMerged,week:1,day,commands:postFirstCommands},settings,rt.defaultStats())
 result.nativeSetProbes+=2
 expect('intro-second-set-after-first-native-parity',afterFirstA.success===afterFirstB.success,{day,originalAccepted:afterFirstA.success,fusedAccepted:afterFirstB.success})
 expect('intro-second-set-native-parity',checkA.success===checkB.success,{day,originalAccepted:checkA.success,fusedAccepted:checkB.success})
 const a=finish(introOriginal,day,12),b=finish(introMerged,day,12)
 compareState(a.source,b.source,'intro-after-finish-'+day)
 checkEq(completedSetOnly(completedRows(a.workout)),completedSetOnly(completedRows(b.workout)),'intro-actual-completed-sets',{day})
 checkEq(plannedDetails(completedRows(a.workout)),plannedDetails(completedRows(b.workout)),'intro-targets-and-supplementary',{day})
 introOriginal=a.source;introMerged=b.source
 introCases.push({day,secondSetNativeAccepted:checkA.success,secondSetAfterFirstAccepted:afterFirstA.success})
}
result.experiments.push({id:'INTRO-against-native-original-RTT',nativeWorkouts:6,days:introCases})
// Full queued->deload native lifecycle with all local RTT overrides kept.
let src=fusedQueued.source
const pre=project(src),before=Object.fromEntries(Object.entries(pre.signals).map(([k,z])=>[k,{h1:norm(z.e.progress.state),candidate:kg(z.e.progress.state.candidate)}]))
expect('initial-queued',Number(pre.control.deloadQueued)===1&&Number(pre.control.deloadActive)===0)
const deload=[]
let afterFirstNativeDeload=null
for(let day=1;day<=3;day++){
 const v=project(src),count=Object.keys(v.signals).length,probes=[]
 for(let i=0;i<v.days[day-1].length;i++){
  const z=v.days[day-1][i],full=z.evaluatedSetVariations?.reduce((n,q)=>n+(q.sets?.length||0),0)||0
  const notAvailable=Math.ceil(full/2)+1
  probe(src,day,i+1,notAvailable,false)
  probes.push({exerciseIndex:i+1,anchor:Number(z.progress?.state?.anchorId||0),invalidSet:notAvailable})
 }
 const done=finish(src,day,7)
 src=done.source
 if(day===1)afterFirstNativeDeload=src
 const x=project(src),c=x.control
 expect('deload-queued-transition',Number(c.deloadQueued)===0,{day})
 expect('deload-active',Number(c.deloadActive)===(day===3?0:1),{day})
 for(const [slot,z] of Object.entries(x.signals)){
  const state=norm(z.e.progress.state),prior=before[slot],expected=day===3?norm({}):prior.h1
  for(const field of h1Keys){result.comparisons++;if(Math.abs(state[field]-expected[field])>.011)fail('deload-H1-'+field,{day,slot:Number(slot)})}
  result.comparisons++
  if(Math.abs(kg(z.e.progress.state.candidate)-prior.candidate)>.011)fail('deload-adaptive-candidate',{day,slot:Number(slot)})
 }
 deload.push({day,anchors:Object.keys(x.signals).length,invalidSetProbes:probes.length,
  active:Number(c.deloadActive),queued:Number(c.deloadQueued),resetOnCloser:day===3})
}
result.experiments.push({id:'QUEUED-full-native-DELOAD-with-all-RTT',nativeWorkouts:3,days:deload})
// Induce stale rollover from an actual deload-start serialized source by scratch-only switching RTT
// to INTRO before a repeated day-A session: native should clear the stale active flag exactly once.
let staleSrc=intro(afterFirstNativeDeload)
verify(staleSrc,'scratch-intro-stale-rollover')
const staleBefore=project(staleSrc),staleDayA=finish(staleSrc,1,10),staleA=project(staleDayA.source)
expect('stale-precondition',Number(staleBefore.control.deloadActive)===1&&Number(staleBefore.control.deloadStarted)===1)
expect('stale-clear-A',Number(staleA.control.deloadActive)===0&&Number(staleA.control.deloadStarted)===0&&Number(staleA.control.rolloverClear)===1)
for(const [slot,z] of Object.entries(staleA.signals)){
 for(const field of h1Keys){result.comparisons++;if(Math.abs(norm(z.e.progress.state)[field])>.011)fail('stale-H1-reset-'+field,{slot:Number(slot)})}
 const originalCandidate=kg(staleBefore.signals[slot].e.progress.state.candidate)
 result.comparisons++
 if(Math.abs(kg(z.e.progress.state.candidate)-originalCandidate)>.011)fail('stale-Adaptive-candidate',{slot:Number(slot)})
}
const staleDayB=finish(staleDayA.source,2,10),staleB=project(staleDayB.source)
expect('stale-clear-B',Number(staleB.control.rolloverClear)===0&&Number(staleB.control.deloadActive)===0)
for(const [slot,z] of Object.entries(staleB.signals)){
 for(const field of h1Keys){result.comparisons++;if(Math.abs(norm(z.e.progress.state)[field])>.011)fail('stale-exact-once-'+field,{slot:Number(slot)})}
}
const checkTagReadback=view=>Object.fromEntries(Object.keys(view.signals).map(slot=>{
 const fromOccurrence=norm(view.signals[slot].e.progress.state)
 const fromTag=view.canonicalTags[slot]?norm(view.canonicalTags[slot]):null
 for(const f of h1Keys){
  result.comparisons++
  if(fromTag&&Math.abs(fromTag[f])>.011)fail('stale-canonical-tag-H1-'+f,{slot:Number(slot)})
 }
 return [slot,{day:view.signals[slot].d,occurrenceCount:fromOccurrence.perfCount,
  canonicalCount:fromTag?.perfCount??null,occurrenceIsReset:h1Keys.every(f=>Math.abs(fromOccurrence[f])<=.011),
  canonicalIsReset:!!fromTag&&h1Keys.every(f=>Math.abs(fromTag[f])<=.011)}]
}))
const dayATags=checkTagReadback(staleA),dayBTags=checkTagReadback(staleB)
// Isolate whether stale H1 reset loss is from a later day-A shared progression occurrence.
const dayAAnchors=Object.entries(staleBefore.signals).filter(([,z])=>z.d===1)
const staleOrderCases=[
 {id:'first-anchor-only',slots:[dayAAnchors[0]]},
 {id:'second-anchor-only',slots:[dayAAnchors[1]]},
 {id:'first-then-second',slots:dayAAnchors}
]
const staleOrderReadback=[]
for(const scenario of staleOrderCases){
 const commands=[]
 for(const [slot,z] of scenario.slots){
  commands.push(`change_reps(${z.i},1,10)`,`complete_set(${z.i},1)`)
 }
 commands.push('finish_workout()')
 const trial=native(staleSrc,1,commands)
 if(!trial.data?.updatedProgramText)throw Error('Stale ordering diagnostic could not serialize '+scenario.id)
 result.nativeFinishedWorkouts++
 const shape=project(trial.data.updatedProgramText)
 const tagCounts=Object.fromEntries(Object.keys(shape.canonicalTags).map(slot=>[slot,Number(shape.canonicalTags[slot]?.perfCount??-1)]))
 staleOrderReadback.push({id:scenario.id,executedSlots:scenario.slots.map(([slot])=>Number(slot)),cleared:Number(shape.control.deloadActive)===0,
  rolloverClear:Number(shape.control.rolloverClear),tagCounts})
}
result.experiments.push({id:'STALE-shared-write-order-native-controls',nativeWorkouts:3,cases:staleOrderReadback})
result.experiments.push({id:'INDUCED-STALE-original-progress-shared-tag920',nativeWorkouts:2,mode:'scratch RTT mode 2 after genuine day-A deload (not naturally occurring)',
 dayA:{rolloverClear:Number(staleA.control.rolloverClear),active:Number(staleA.control.deloadActive),tags:dayATags},
 dayB:{rolloverClear:Number(staleB.control.rolloverClear),active:Number(staleB.control.deloadActive),tags:dayBTags}})
// Check new first-set H1 learning against openGym from native completed workout rows.
const expected=Object.fromEntries(Object.keys(before).map(slot=>[slot,initialAnchor()]))
const relearn=[]
for(let cycle=1;cycle<=3;cycle++){
 let differences=0
 for(let day=1;day<=3;day++){
  const prev=project(src),done=finish(src,day,9),after=project(done.source)
  const lines=done.workout.split('\n').filter(s=>s.startsWith('  ')&&s.includes(' / ')).map(s=>s.trim())
  for(const [slot,z] of Object.entries(prev.signals).filter(([,z])=>z.d===day)){
   const row=lines.find(r=>r.startsWith(z.e.name+' / '))
   const match=row?.match(/(\d+)x(\d+)\s+([0-9.]+)kg/)
   if(!match)throw Error('Native workbook missing first completed work set; day '+day+' anchor '+slot)
   const beforeCandidate=kg(z.e.progress.state.candidate),afterCandidate=kg(after.signals[slot].e.progress.state.candidate)
   const exposure={mode:'repetitions',performance:{sets:[{setId:'first',role:'work',status:'completed',resistance:{kind:'external-load',value:Number(match[3]),unit:'kg'},observations:[{metric:'repetitions',value:Number(match[2])}]}]}}
   const ob=h1FromExposure(exposure,{beforeCandidate,afterCandidate,baselineUnit:'kg'})
   const next=observeAnchor(validateAnchor(expected[slot]),ob).state
   const got=norm(after.signals[slot].e.progress.state)
   for(const key of h1Keys){
    result.comparisons++
    if(Math.abs(got[key]-next[key])>.011){fail('post-deload-H1-'+key,{cycle,day,slot:Number(slot)});differences++}
   }
   expected[slot]=next
  }
  src=done.source
 }
 relearn.push({cycle,observedSignals:Object.keys(expected).length,differences,
   anchorCounts:Object.entries(expected).map(([slot,s])=>({slot:Number(slot),count:s.perfCount}))})
}
result.experiments.push({id:'POST-DELOAD-native-relearn-vs-openGym',nativeWorkouts:9,cycles:relearn})
result.failureCount=result.failures.length
fs.mkdirSync(out,{recursive:true})
const destination=path.join(out,'rtt-source-fixed-private-native-result.json')
fs.writeFileSync(destination,JSON.stringify(result,null,2)+'\n',{mode:0o600})
const published={...result}
fs.writeFileSync(path.join(out,'rtt-source-fixed-sanitized.json'),JSON.stringify(published,null,2)+'\n')
console.log(JSON.stringify({nativeFinishedWorkouts:result.nativeFinishedWorkouts,nativeSetProbes:result.nativeSetProbes,
 comparisons:result.comparisons,failures:result.failureCount,experimentSummaries:result.experiments},null,2))
if(result.failures.length)process.exitCode=1
