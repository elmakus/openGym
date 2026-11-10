#!/usr/bin/env node
// Exact pinned Liftosaur native progress UI action + finish persistence for independent left/right reps.
// Synthetic, explicitly declared paired test observations; NO live Liftosaur/account writes.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
import {execFileSync} from 'node:child_process'
import {h1FromExposure} from '../../api/training-control/hybrid2/observation.js'
import {observeAnchor,validateAnchor} from '../../api/training-control/hybrid2/h1.js'
import {evaluateCycle} from '../../api/training-control/hybrid2/trigger.js'
const fitness=process.env.FITNESS_ROOT,runtime=process.env.LIFTOSAUR_RUNTIME_ROOT,priv=process.env.PRIVATE_LIVE_ROOT,out=process.env.H2_PARITY_OUT
if(!fitness||!runtime||!priv||!out)throw Error('Pinned fitness, original native runtime, private source and output are required')
const pin='ce75750bde4a190682fb5a6fa1984fc9184a9842'
if(!fs.readFileSync(path.join(runtime,'README.txt'),'utf8').includes(pin))throw Error('Native runtime pin mismatch')
const req=createRequire(import.meta.url),rt=req(path.join(runtime,'runtime_api.cjs'))
const programNative=req(path.join(runtime,'src/models/program.ts'))
const progressNative=req(path.join(runtime,'src/models/progress.ts'))
const plannerNative=req(path.join(runtime,'src/pages/planner/models/plannerProgram.ts'))
const serializeNative=req(path.join(runtime,'src/liftohistory/liftohistorySerializer.ts'))
const {buildSettings}=req(path.join(fitness,'tests/fixtures/marta-playground-baseline/settings/build_settings.cjs'))
const originalSettings=buildSettings(path.join(fitness,'tests/fixtures/marta-playground-baseline'))
const settings=structuredClone(originalSettings);settings.exercises={};settings.exerciseData={}
const py="import json,sys;sys.path.insert(0,"+JSON.stringify(path.join(fitness,'programs'))+");from hybrid2_krzysztof_reference_adapter import KRZYSZTOF_H2_CANDIDATE;print(json.dumps([x['sourceLabel'] for x in KRZYSZTOF_H2_CANDIDATE['materializedOccurrences']]))"
const labels=JSON.parse(execFileSync('python3',['-c',py],{encoding:'utf8'}))
const templateId=Object.keys(originalSettings.exercises)[0],template=originalSettings.exercises[templateId],data=originalSettings.exerciseData[templateId]
let unilateralRegistrations=0
labels.forEach((name,i)=>{
 const id='h2perfkrz'+String(i+1).padStart(3,'0')
 settings.exercises[id]={...structuredClone(template),id,name}
 const isUnilateral=name.includes('Single-Leg Leg Press')
 if(isUnilateral)unilateralRegistrations++
 settings.exerciseData[id]={...structuredClone(data),isUnilateral}
})
if(unilateralRegistrations!==1)throw Error('Unilateral registry cardinality drift')
const original=fs.readFileSync(path.join(priv,'npyswbiu.liftoscript'),'utf8')
const sha=s=>crypto.createHash('sha256').update(s).digest('hex')
if(sha(original)!=='74420646c1c5826f77d842025291f75f7d89367f46265818a43a92cacfec662e')throw Error('Real source SHA changed')
if(rt.Playground_validateProgramText(original,settings)!=null)throw Error('Original K5 source parser rejected')
const keys=['perf1','perf2','perf3','perfCount','perfReference','candidateGuard']
const kg=v=>typeof v==='number'?v:v?.unit==='kg'?v.value:v?.unit==='lb'?v.value*.45359237:0
const norm=s=>Object.fromEntries(keys.map(k=>[k,k==='perfCount'||k==='candidateGuard'?Number(s[k]??0):kg(s[k]??0)]))
const makeProgram=source=>{
 const weeks=rt.PlannerProgram_evaluateText(source)
 return {vtype:'program',id:'playground',name:'Playground',url:'',author:'',shortDescription:'',description:'',nextDay:1,exercises:[],days:[],weeks:[],isMultiweek:weeks.length>1,tags:[],clonedAt:0,planner:{vtype:'planner',name:'Playground',weeks}}
}
const project=src=>{
 const ev=rt.Program_evaluate(makeProgram(src),settings)
 const days=ev.weeks[0].days.map(d=>d.exercises.filter(e=>e.name!=='Adaptive Rep Engine Template'&&e.name!=='Timed H2 Closer Template'))
 const signals=Object.fromEntries(days.flatMap((list,d)=>list.map((e,i)=>({e,d:d+1,i:i+1})).filter(x=>x.e.progress?.state?.anchorId>0).map(x=>[x.e.progress.state.anchorId,x])))
 return {ev,days,signals,control:ev.states['900']}
}
const expectedDays='8,9,7,4,10'
if(project(original).days.map(d=>d.length).join(',')!==expectedDays)throw Error('K5 executable topology drift')
const cases=[{cycle:1,allReps:10,left:10,right:10},
 {cycle:2,allReps:10,left:9,right:10},
 {cycle:3,allReps:10,left:8,right:9},
 {cycle:4,allReps:7,left:7,right:10}]
const summary={schema:'HYBRID2-K5-NATIVE-BILATERAL-RECORD-1',
 provenance:{sourceSha256:sha(original),runtimePin:pin,fitnessPin:'9f2deb6c345643d7c0c793c52d358e496c2710d2',openGymBase:'8529b2d41b28fea8ae96a50325aaf28e864a0160',
  settings:'synthetic original H2PERF fixture labels + unilateral flag, NOT live K5 equipment',originalK5Unchanged:true,accountWrites:0},
 method:'Program_nextHistoryRecord, original Progress_completeSetAction, Progress_settleTimedSet, Progress_changeAmrapAction, original Program_runAllFinishDayScripts, native serialization and planner write/reload; independent synthetic left/right observations assigned to native IHistoryRecord like original UI, not inferred from right.',
 executedWorkouts:0,completedFirstSets:0,pairedNativeEntries:0,fieldsCompared:0,failures:[],cycles:[]}
function expect(phase,ok,meta={}){
 summary.fieldsCompared++
 if(!ok)summary.failures.push({phase,...meta})
}
const leftRightPairs=[]
let source=original,anchors=Object.fromEntries(Object.entries(project(source).signals).map(([slot,z])=>[slot,validateAnchor(norm(z.e.progress.state))]))
let streak=0
for(const c of cases){
 const cycle={number:c.cycle,days:[],classification:null}
 const votes={}
 for(let day=1;day<=5;day++){
  const before=project(source),spec=before.days[day-1],program=makeProgram(source),evaluated=rt.Program_evaluate(program,settings)
  const dayIndex=programNative.Program_getDayNumber(evaluated,1,day),stats=rt.defaultStats()
  let record=rt.Program_nextHistoryRecord(program,settings,stats,dayIndex)
  expect('native-entry-count',record.entries.length===spec.length,{cycle:c.cycle,day})
  const inputPairs=[]
  for(let i=0;i<record.entries.length;i++){
   const entry=record.entries[i],nativeSet=entry.sets[0]
   if(!nativeSet)throw Error('No native first set')
   const unilateral=Boolean(nativeSet.isUnilateral)
   const left=unilateral?c.left:null,right=unilateral?c.right:c.allReps
   if(unilateral){
    expect('native-paired-state',entry.state?.paired===1,{cycle:c.cycle,day,exerciseIndex:i+1})
    inputPairs.push({exerciseIndex:i+1,left,right})
   }
   // Original UI writes these exact fields via recordModify; values intentionally independent.
   nativeSet.completedReps=right
   if(unilateral)nativeSet.completedRepsLeft=left
   // Run exact source-native completion action as Playground does.
   const progEx=programNative.Program_getProgramExercise(record.day,evaluated,entry.programExerciseId)
   record=progressNative.Progress_completeSetAction(settings,stats,record,{
    type:'CompleteSetAction',entryIndex:i,setIndex:0,mode:'workout',programExercise:progEx,
    otherStates:evaluated.states,isPlayground:true,forceUpdateEntryIndex:false,isExternal:false},undefined)
   record=progressNative.Progress_settleTimedSet(settings,stats,record,i,0,'workout',{},{
    programExercise:progEx,otherStates:evaluated.states,isPlayground:true})
   if(record.amrapModal!=null){
    const modal=record.amrapModal,set=record.entries[modal.entryIndex].sets[modal.setIndex]
    const newValue=progressNative.Progress_changeAmrapAction(settings,stats,record,{
     type:'ChangeAMRAPAction',entryIndex:modal.entryIndex,setIndex:modal.setIndex,isPlayground:true,
     programExercise:progEx,otherStates:evaluated.states,
     amrapValue:modal.isAmrap?(set.completedReps??set.reps):undefined,
     logRpe:modal.logRpe,rpeValue:modal.logRpe?set.rpe:undefined,
     askWeight:modal.askWeight,weightValue:modal.askWeight?set.weight:undefined},undefined)
    record=newValue
   }
   const completed=record.entries[i].sets[0]
   expect('original-native-isCompleted',completed.isCompleted===true,{cycle:c.cycle,day,exerciseIndex:i+1})
   expect('native-right-preserved',completed.completedReps===right,{cycle:c.cycle,day,exerciseIndex:i+1})
   if(unilateral){
    expect('native-left-preserved',completed.completedRepsLeft===left,{cycle:c.cycle,day,exerciseIndex:i+1})
    summary.pairedNativeEntries++
   }
  }
  const serialized=serializeNative.LiftohistorySerializer_serialize(record,settings,program)
  const leftLine=inputPairs.length?serialized.split('\n').find(line=>line.includes(' / 1x'+c.right+'|'+c.left)):null
  if(inputPairs.length)expect('serialized-real-bilateral-reps',!!leftLine,{cycle:c.cycle,day})
  const errors=[]
  const end=programNative.Program_runAllFinishDayScripts(program,record,stats,settings,e=>errors.push(String(e).slice(0,90)))
  expect('native-finish-no-errors',errors.length===0,{cycle:c.cycle,day,errorCount:errors.length})
  const afterSource=plannerNative.PlannerProgram_generateFullText(end.program.planner.weeks)
  if(!afterSource||afterSource===source)throw Error('Original native finish did not write/reload')
  const after=project(afterSource)
  const dayStats={day,exercises:record.entries.length,pairedRecords:inputPairs.length,comparedAnchors:[],failedFields:[]}
  for(const [slot,z] of Object.entries(before.signals).filter(([,z])=>z.d===day)){
   const index=z.i-1,set=record.entries[index].sets[0],aState=after.signals[slot].e.progress.state
   if(!set.isCompleted)throw Error('Actual H1 signal first set not completed')
   const previous=kg(z.e.progress.state.candidate),next=kg(aState.candidate)
   const weight=kg(set.completedWeight)
   const common={role:'work',status:'completed',resistance:{kind:'external-load',unit:'kg',value:weight}}
   const performance=set.isUnilateral?[
    {...common,setId:'first',side:'L',observations:[{metric:'repetitions',value:set.completedRepsLeft}]},
    {...common,setId:'first',side:'R',observations:[{metric:'repetitions',value:set.completedReps}]}]:
    [{...common,setId:'first',observations:[{metric:'repetitions',value:set.completedReps}]}]
   const observation=h1FromExposure({mode:'repetitions',performance:{sets:performance}},{beforeCandidate:previous,afterCandidate:next,baselineUnit:'kg'})
   const h1=observeAnchor(anchors[slot],observation)
   const actual=norm(aState)
   for(const k of keys){
    const agrees=Math.abs(actual[k]-h1.state[k])<=.011
    expect('H1-native-vs-openGym-'+k,agrees,{cycle:c.cycle,day,slot:Number(slot)})
    if(!agrees)dayStats.failedFields.push({slot:Number(slot),key:k})
   }
   anchors[slot]=h1.state
   votes[slot]={ready:h1.ready,valid:h1.validVote,weak:h1.weak}
   dayStats.comparedAnchors.push({slot:Number(slot),bilateral:Boolean(set.isUnilateral),sample:observation.kind,leftReps:set.isUnilateral?set.completedRepsLeft:undefined,rightReps:set.completedReps,
    sampleCount:actual.perfCount,candidateGuard:actual.candidateGuard})
  }
  summary.executedWorkouts++;summary.completedFirstSets+=record.entries.length;cycle.days.push(dayStats)
  if(inputPairs.length)leftRightPairs.push(...inputPairs.map(p=>({cycle:c.cycle,day,...p})))
  source=afterSource
 }
 const groups=['upper','lower','upper','upper','lower'],thresholds={minValidSignals:4,broadWeakMin:3,fastWeakMin:4,slowBroadCycles:2,weakRatio:.95}
 const projections=groups.map((group,i)=>({signalId:'s'+(i+1),systemGroup:group,ready:votes[i+1].ready,seen:true,valid:votes[i+1].valid,weak:votes[i+1].weak}))
 const expected=evaluateCycle(projections,thresholds,{badCycleStreak:streak}),controller=project(source).control
 streak=expected.state.badCycleStreak
 for(const [field,want] of Object.entries({lastCycleClass:{INDETERMINATE:0,GOOD:1,BROAD_WEAK:2}[expected.cycleClass],badCycleStreak:streak,deloadQueued:Number(expected.queueDeload)})){
  expect('controller-'+field,Number(controller[field]??0)===want,{cycle:c.cycle})
 }
 cycle.classification={native:Number(controller.lastCycleClass),expected:expected.cycleClass,queue:Number(controller.deloadQueued),pairedObservation:[c.left,c.right]}
 summary.cycles.push(cycle)
}
summary.outcome=summary.failures.length?'RED':'PASS'
summary.pairedInputs=leftRightPairs
fs.mkdirSync(out,{recursive:true})
fs.writeFileSync(path.join(out,'current-k5-native-paired-raw.json'),JSON.stringify(summary,null,2)+'\n',{mode:0o600})
const safe=structuredClone(summary)
fs.writeFileSync(path.join(out,'current-k5-native-paired-sanitized.json'),JSON.stringify(safe,null,2)+'\n')
console.log(JSON.stringify({outcome:summary.outcome,workouts:summary.executedWorkouts,firstSets:summary.completedFirstSets,paired:summary.pairedNativeEntries,fields:summary.fieldsCompared,
 failures:summary.failures,cycles:summary.cycles.map(c=>({number:c.number,classification:c.classification,dayFailures:c.days.map(d=>d.failedFields.length)}))},null,2))
if(summary.failures.length)process.exitCode=1
