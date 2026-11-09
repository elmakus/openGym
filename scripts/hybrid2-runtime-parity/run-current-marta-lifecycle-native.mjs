#!/usr/bin/env node
// Actual current read-only Liftosaur program source, original pinned runtime;
// completed full exercise coverage in isolated native Playground, no account writes.
// Compare original H1 signal snapshots and native controller to openGym H1/trigger.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {h1FromExposure} from '../../api/training-control/hybrid2/observation.js'
import {observeAnchor,validateAnchor,initialAnchor} from '../../api/training-control/hybrid2/h1.js'
import {evaluateCycle} from '../../api/training-control/hybrid2/trigger.js'
const here=path.dirname(fileURLToPath(import.meta.url))
const fitness=process.env.FITNESS_ROOT,runtime=process.env.LIFTOSAUR_RUNTIME_ROOT,priv=process.env.PRIVATE_LIVE_ROOT
const outDir=process.env.H2_PARITY_OUT
if(!fitness||!runtime||!priv||!outDir)throw Error('Required roots missing; no mock fallback')
const runtimePin='ce75750bde4a190682fb5a6fa1984fc9184a9842'
if(!fs.readFileSync(path.join(runtime,'README.txt'),'utf8').includes(runtimePin))throw Error('Pinned native runtime drift')
const rt=createRequire(import.meta.url)(path.join(runtime,'runtime_api.cjs'))
const {buildSettings}=createRequire(import.meta.url)(path.join(fitness,'tests/fixtures/marta-playground-baseline/settings/build_settings.cjs'))
const settings=buildSettings(path.join(fitness,'tests/fixtures/marta-playground-baseline'))
const original=fs.readFileSync(path.join(priv,'qtwbbqff.liftoscript'),'utf8')
const sha=x=>crypto.createHash('sha256').update(x).digest('hex')
if(!original.includes('performanceMetric = H1-EPL-1')||!original.includes('H1-ASYM-M3-1'))throw Error('Current original source is not H2PERF')
const invalid=rt.Playground_validateProgramText(original,settings)
if(invalid!==undefined&&invalid!==null)throw Error('Original source native parser failure '+JSON.stringify(invalid).slice(0,200))
const thresholds={minValidSignals:5,broadWeakMin:3,fastWeakMin:4,slowBroadCycles:2,weakRatio:.95}
const groups=['lower','upper','lower','upper','lower','upper']
const h1keys=['perf1','perf2','perf3','perfCount','perfReference','candidateGuard']
const kg=x=>typeof x==='number'?x:x?.unit==='kg'?x.value:x?.unit==='lb'?x.value*.45359237:0
const norm=x=>Object.fromEntries(h1keys.map(k=>[k,k==='perfCount'||k==='candidateGuard'?Number(x[k]??0):kg(x[k]??0)]))
const project=source=>{
 const weeks=rt.PlannerProgram_evaluateText(source)
 const p={vtype:'program',id:'x',name:'x',url:'',author:'',shortDescription:'',description:'',nextDay:1,exercises:[],days:[],weeks:[],isMultiweek:weeks.length>1,tags:[],clonedAt:0,
 planner:{vtype:'planner',name:'x',weeks}}
 const ev=rt.Program_evaluate(p,settings)
 const days=ev.weeks[0].days.map(day=>day.exercises.filter(ex=>ex.name!=='Adaptive Rep Engine Template'))
 const signals=Object.fromEntries(days.flatMap((ex,day)=>ex.map((e,index)=>({e,index:index+1,day:day+1})).filter(z=>z.e.progress?.state?.anchorId>0).map(z=>[z.e.progress.state.anchorId,z])))
 return {native:ev,days,signals,controller:ev.states['920']}
}
const workbookRows=text=>{
 const lines=text.split('\n')
 return lines.filter(line=>line.startsWith('  ')&&line.includes(' / ')).map(line=>line.trim())
}
const fullSourceSHA=sha(original)
const output={schema:'HYBRID2-CURRENT-LIVE-M6-PINNED-NATIVE-LIFECYCLE-1',
 sourceProvenance:{id:'qtwbbqff',origin:'read-only Liftosaur get_program',sourceSha256:fullSourceSHA,sourceChars:original.length,privateSourcePublished:false,
  originalRuntimeCommit:runtimePin,openGymBase:'8529b2d41b28fea8ae96a50325aaf28e864a0160',fixture:'fitness@9f2deb6 frozen Marta baseline custom settings, not current live gym settings'},
 coverage:'Full current M6 program source, 11+13+12 executable exercise first-set completions per structural cycle, native Playground_run/finish_workout/updatedProgramText; openGym h1FromExposure + observeAnchor and evaluateCycle. No live account write. Includes native 3-day deload, private H1 reset, post-deload relearn and another weakness check; still not live settings or database replay.',
 loops:[],issues:[],workouts:0,comparedFields:0,completedExerciseSets:0}
const initial=project(original)
if(initial.days.map(x=>x.length).join(',')!=='11,13,12')throw Error('Expected actual plan executable topology 11/13/12; not safe to proceed')
if(Object.keys(initial.signals).length!==6)throw Error('Expected exactly 6 current native H1 anchors')
let source=original,streak=Number(initial.controller.badCycleStreak??0)
let candidatesBeforeDeload=null
const openAnchors=Object.fromEntries(Object.entries(initial.signals).map(([slot,z])=>[slot,validateAnchor(norm(z.e.progress.state))]))
for(let cycle=1;cycle<=9;cycle++){
 const isDeload=cycle===5
 const reps=cycle<=3?10:cycle===4||cycle===5?7:cycle<=8?9:6
 if(isDeload){
  const snapshot=project(source)
  if(Number(snapshot.controller.deloadQueued)!==1)throw Error('Deload not queued on true current plan')
  candidatesBeforeDeload=Object.fromEntries(Object.entries(snapshot.signals).map(([k,v])=>[k,kg(v.e.progress.state.candidate)]))
 }
 const suite={cycle,reps,days:[]}
 const votes={}
 for(let day=1;day<=3;day++){
  const before=project(source),exec=before.days[day-1],current=Object.values(before.signals).filter(z=>z.day===day)
  const commands=[]
  if(isDeload){
   const checks=current.map(z=>({index:z.index,baseSets:z.e.evaluatedSetVariations?.reduce((n,v)=>n+(v.sets?.length||0),0)||0,slot:z.e.progress.state.anchorId}))
   if(day===3){
    const i=exec.length,ex=exec[i-1]
    checks.push({index:i,baseSets:ex.evaluatedSetVariations?.reduce((n,v)=>n+(v.sets?.length||0),0)||0,slot:'closer'})
   }
   for(const x of checks){
    const unavailable=Math.ceil(x.baseSets/2)+1
    const check=rt.Playground_run({programText:source,week:1,day,commands:[`change_reps(${x.index},${unavailable},6)`]},settings,rt.defaultStats())
    output.comparedFields++
    const pass=check.success===false&&String(check.error||'').includes('Set '+unavailable+' not found')
    const evidence={cycle,day,slot:x.slot,originalSets:x.baseSets,expectedDeloadSets:unavailable-1,command:'change_reps('+x.index+','+unavailable+',6)',nativeSuccess:check.success,nativeError:String(check.error||'').slice(0,160),pass}
    output.nativeDeloadSetProbes??=[]
    output.nativeDeloadSetProbes.push(evidence)
    if(!pass)output.issues.push({cycle,day,slot:x.slot,phase:'nativeDeloadSetProbe',issues:[{field:'setShape',expected:'Set '+unavailable+' not found',native:check.success}]})
   }
  }
  for(let idx=0;idx<exec.length;idx++){
   if(Number(exec[idx].progress?.state?.anchorId??0)>0)commands.push(`change_reps(${idx+1},1,${reps})`)
   commands.push(`complete_set(${idx+1},1)`)
  }
  commands.push('finish_workout()')
  const prevHash=sha(source)
  const response=rt.Playground_run({programText:source,week:1,day,commands},settings,rt.defaultStats())
  if(!response.success||!response.data?.updatedProgramText)throw Error('Native '+cycle+'/'+day+' '+JSON.stringify(response.error).slice(0,300))
  const rows=workbookRows(response.data.workout)
  if(rows.length!==exec.length)throw Error(`Native workout row coverage differs cycle ${cycle} day ${day}: ${rows.length} vs ${exec.length}`)
  const afterSource=response.data.updatedProgramText,after=project(afterSource)
  const record={cycle,day,nativeExercisesCompleted:exec.length,signals:[],global:{queuedBefore:Number(before.controller.deloadQueued||0),queuedAfter:Number(after.controller.deloadQueued||0),
    streakBefore:Number(before.controller.badCycleStreak||0),streakAfter:Number(after.controller.badCycleStreak||0)},
    sourceBeforeSha256:prevHash,sourceAfterSha256:sha(afterSource),issues:[]}
  for(const z of current){
   const slot=z.e.progress.state.anchorId
   const line=rows.find(r=>r.startsWith(z.e.name+' / '))
   if(!line)throw Error('Executed native H1 anchor not in genuine workout, slot '+slot)
   const match=line.match(/(\d+)x(\d+)\s+([0-9.]+)kg/)
   if(!match)throw Error('Cannot parse native first working set, slot '+slot)
   const firstReps=Number(match[2]),firstWeight=Number(match[3])
   if(firstReps!==reps)throw Error('Actual recorded native repetitions differ '+slot)
   const afterState=after.signals[slot]?.e.progress?.state
   if(!afterState)throw Error('Missing native H1 anchor after workout: '+slot)
   const beforeCandidate=kg(z.e.progress.state.candidate),afterCandidate=kg(afterState.candidate)
   const exposure={mode:'repetitions',performance:{sets:[{setId:'s1',role:'work',status:'completed',resistance:{kind:'external-load',value:firstWeight,unit:'kg'},observations:[{metric:'repetitions',value:firstReps}]}]}}
   const obs=isDeload?{kind:'INDETERMINATE',performance:null,candidateRaised:false}:
     h1FromExposure(exposure,{beforeCandidate,afterCandidate,baselineUnit:'kg'})
   const expected=isDeload?{state:day===3?initialAnchor():openAnchors[slot],ready:false,validVote:false,weak:false}:observeAnchor(openAnchors[slot],obs)
   const native=norm(afterState)
   const diff=[]
   for(const f of h1keys){
    output.comparedFields++
    if(Math.abs(native[f]-expected.state[f])>.011)diff.push({field:f,native:native[f],openGym:expected.state[f]})
   }
   const entry={slot,nativeFirstSet:{reps:firstReps,weightKg:firstWeight},nativeBeforeCandidateKg:beforeCandidate,nativeAfterCandidateKg:afterCandidate,
    openGymSample:obs,nativeH1State:native,openGymH1State:expected.state,openGymVote:{ready:expected.ready,valid:expected.validVote,weak:expected.weak},issues:diff}
   record.signals.push(entry)
   if(diff.length){record.issues.push({slot,diff});output.issues.push({cycle,day,slot,issues:diff})}
   openAnchors[slot]=expected.state
   votes[slot]={ready:expected.ready,valid:expected.validVote,weak:expected.weak}
  }
  if(isDeload){
   if(day===3)for(let slot=1;slot<=6;slot++)openAnchors[slot]=initialAnchor()
   for(let slot=1;slot<=6;slot++){
    const actual=norm(after.signals[slot].e.progress.state)
    const expected=openAnchors[slot]
    for(const f of h1keys){
     output.comparedFields++
     if(Math.abs(actual[f]-expected[f])>.011)output.issues.push({cycle,day,slot,phase:'allH1ResetOrFreeze',issues:[{field:f,native:actual[f],openGym:expected[f]}]})
    }
    const candidate=kg(after.signals[slot].e.progress.state.candidate)
    output.comparedFields++
    if(Math.abs(candidate-candidatesBeforeDeload[slot])>.011)output.issues.push({cycle,day,slot,phase:'adaptiveDeloadPersistence',issues:[{field:'candidate',native:candidate,openGym:candidatesBeforeDeload[slot]}]})
   }
  }
  output.completedExerciseSets+=exec.length;output.workouts++
  suite.days.push(record);source=afterSource
 }
 const afterCycle=project(source)
 if(isDeload){
  const want={deloadQueued:0,deloadActive:0,deloadStarted:0,rolloverClear:0,badCycleStreak:0,allSignalsReady:0,lastCycleClass:0}
  const got=Object.fromEntries(Object.keys(want).map(k=>[k,Number(afterCycle.controller[k]??0)]))
  const issues=Object.keys(want).filter(k=>{output.comparedFields++;return got[k]!==want[k]}).map(k=>({field:k,native:got[k],expected:want[k]}))
  suite.cycleController={native:got,openGym:want,phase:'completeNativeDeloadReset',issues}
  if(issues.length)output.issues.push({cycle,phase:'deloadClosingController',issues})
  streak=0
  output.loops.push(suite)
  continue
 }
 const proj=groups.map((g,i)=>{const slot=i+1,v=votes[slot];if(!v)throw Error('Missing H1 signal in cycle '+slot);return{signalId:'s'+slot,systemGroup:g,ready:v.ready,seen:true,valid:v.valid,weak:v.weak}})
 const e=evaluateCycle(proj,thresholds,{badCycleStreak:streak})
 streak=e.state.badCycleStreak
 const want={lastCycleClass:{INDETERMINATE:0,GOOD:1,BROAD_WEAK:2}[e.cycleClass],badCycleStreak:streak,deloadQueued:Number(e.queueDeload)}
 const got=Object.fromEntries(Object.keys(want).map(k=>[k,Number(afterCycle.controller[k]??0)]))
 const issues=Object.keys(want).filter(k=>{output.comparedFields++;return want[k]!==got[k]}).map(k=>({field:k,native:got[k],openGym:want[k]}))
 suite.cycleController={native:got,openGym:want,projections:proj,issues}
 if(issues.length)output.issues.push({cycle,phase:'cycleCloser',issues})
 output.loops.push(suite)
 if(cycle===4 && got.deloadQueued!==1)throw Error('No queued deload after simulated 7 reps')
 if(cycle<4 && got.deloadQueued)throw Error('Unexpected premature deload on frozen current source')
}
output.failureEntries=output.issues.length
fs.mkdirSync(outDir,{recursive:true})
fs.writeFileSync(path.join(outDir,'current-real-marta-lifecycle-native-private.json'),JSON.stringify(output,null,2)+'\n',{mode:0o600})
const safe=structuredClone(output)
for(const l of safe.loops)for(const d of l.days)for(const s of d.signals){delete s.nativeBeforeCandidateKg;delete s.nativeAfterCandidateKg;delete s.nativeFirstSet.weightKg}
safe.sourceProvenance.privateSourcePublished=false
fs.writeFileSync(path.join(outDir,'current-real-marta-lifecycle-native-public.json'),JSON.stringify(safe,null,2)+'\n')
console.log(JSON.stringify({workouts:output.workouts,completedExerciseSets:output.completedExerciseSets,comparisons:output.comparedFields,failures:output.failureEntries,
 cycles:output.loops.map(x=>({cycle:x.cycle,controller:x.cycleController.native,issues:x.days.reduce((n,d)=>n+d.issues.length,0)+x.cycleController.issues.length})),
 issues:output.issues.map(z=>({cycle:z.cycle,day:z.day,slot:z.slot,fields:z.issues.map(i=>i.field)}))},null,2))
if(output.failureEntries)process.exitCode=1
