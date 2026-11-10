#!/usr/bin/env node
// Actual pinned-Liftosaur native IHistoryRecord/finish exercise for three M6
// occurrences previously unparsed by text Playground output. Test-only synthetic
// unilateral side results, never touching user account or production gym data.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
import {centralizeRttUpdate} from './rtt-centralized-update-variant.mjs'
import {addStaleH1WriteBarrier} from './h1-stale-barrier-variant.mjs'
import {h1FromExposure} from '../../api/training-control/hybrid2/observation.js'
const root=process.env.H2_PARITY_ROOT,out=process.env.H2_PARITY_OUT
if(!root||!out)throw Error('Private H2_PARITY_ROOT and H2_PARITY_OUT required')
const originalPath=path.join(root,'private-live/qtwbbqff.liftoscript')
const runtime=process.env.LIFTOSAUR_RUNTIME_ROOT,fitness=process.env.FITNESS_ROOT
if(!runtime||!fitness)throw Error('Pinned original runtime and fitness roots required')
const sha=s=>crypto.createHash('sha256').update(s).digest('hex')
const original=fs.readFileSync(originalPath,'utf8')
if(sha(original)!=='7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df')throw Error('Original M6 source drift')
if(!fs.readFileSync(path.join(runtime,'README.txt'),'utf8').includes('ce75750bde4a190682fb5a6fa1984fc9184a9842'))throw Error('Original native runtime drift')
const req=createRequire(import.meta.url)
const rt=req(path.join(runtime,'runtime_api.cjs'))
const prog=req(path.join(runtime,'src/models/program.ts'))
const progress=req(path.join(runtime,'src/models/progress.ts'))
const planner=req(path.join(runtime,'src/pages/planner/models/plannerProgram.ts'))
const serialize=req(path.join(runtime,'src/liftohistory/liftohistorySerializer.ts'))
const {buildSettings}=req(path.join(fitness,'tests/fixtures/marta-playground-baseline/settings/build_settings.cjs'))
const settings=buildSettings(path.join(fitness,'tests/fixtures/marta-playground-baseline'))
const initial=addStaleH1WriteBarrier(centralizeRttUpdate(original).source)
const nativeProgram=text=>{
 const weeks=rt.PlannerProgram_evaluateText(text)
 return {vtype:'program',id:'m6-native-scratch',name:'M6 native scratch',url:'',author:'',shortDescription:'',
 description:'',nextDay:1,exercises:[],days:[],weeks:[],isMultiweek:false,tags:[],clonedAt:0,
 planner:{vtype:'planner',name:'M6 native scratch',weeks}}
}
const cases=[
 {slot:'d1i2',day:1,index:1,paired:true,sets:3},
 {slot:'d1i8',day:1,index:7,paired:false,sets:2},
 {slot:'d3i11',day:3,index:10,paired:true,sets:3}
]
const selected=new Map(cases.map(x=>[x.slot,x]))
const countShape=[11,13,12]
const evidence={schema:'HYBRID2-M6-GENUINE-NATIVE-UNPARSED-RECORDS-1',
 sourceSha256:sha(original),nativeRuntimeCommit:'ce75750bde4a190682fb5a6fa1984fc9184a9842',
 originalFitnessCommit:'9f2deb6c345643d7c0c793c52d358e496c2710d2',
 testVariant:'unchanged pinned runtime; in-memory original M6 RTT-centralized and H1-current-only source variant',
 method:'Program_nextHistoryRecord -> original Progress_completeSetAction/Progress_settleTimedSet/Progress_changeAmrapAction -> original serializer -> original Program_runAllFinishDayScripts -> PlannerProgram_generateFullText',
 newNativeWorkouts:0,comparisons:0,unexpectedIssues:[],records:[],pairedSets:0,ordinarySets:0,nativeCompletedSets:0,
 originalNativeCompletedSetSerializersRead:true,backendWrites:0,productionWrites:0,
 earlier9SourceNativeMissedRowsReplaced:false,privateHistoryCommitted:false}
const privateTrace={...evidence,privateResults:[],originalSerializedHistory:[]}
const check=(name,ok,cycle,day,slot)=>{evidence.comparisons++;if(!ok)evidence.unexpectedIssues.push({name,cycle,day,slot})}
const kg=v=>v?.unit==='kg'?v.value:v?.unit==='lb'?v.value*0.45359237:null
let source=initial
for(let cycle=1;cycle<=3;cycle++)for(let day=1;day<=3;day++){
 const beforeHash=sha(source),p=nativeProgram(source),ev=rt.Program_evaluate(p,settings)
 const actualDay=ev.weeks[0].days[day-1].exercises.filter(e=>e.name!=='Adaptive Rep Engine Template')
 check('native-original-day-count',actualDay.length===countShape[day-1],cycle,day,'day')
 const dayIndex=prog.Program_getDayNumber(ev,1,day),stats=rt.defaultStats()
 let record=rt.Program_nextHistoryRecord(p,settings,stats,dayIndex)
 check('native-history-entry-count',record.entries.length===countShape[day-1],cycle,day,'day')
 const firstEntries=record.entries.map((e,i)=>({slot:'d'+day+'i'+(i+1),sets:e.sets.length,paired:e.sets.some(s=>s.isUnilateral)}))
 const dayProof={cycle,day,entryCount:record.entries.length,sourceBeforeFingerprint:beforeHash.slice(0,16),
  selected:[],nativeFinishOk:false}
 for(let i=0;i<record.entries.length;i++){
  const slot='d'+day+'i'+(i+1),x=selected.get(slot),entry=record.entries[i]
  if(x){check('selected-same-position',x.day===day&&x.index===i,cycle,day,slot)
   check('selected-native-set-count',entry.sets.length===x.sets,cycle,day,slot)
   check('selected-native-paired-flag',entry.sets.every(s=>Boolean(s.isUnilateral)===x.paired),cycle,day,slot)}
  const workCount=x?entry.sets.length:Math.min(entry.sets.length,1)
  const trace={slot,workCount,sets:[]}
  for(let j=0;j<workCount;j++){
   const set=record.entries[i].sets[j],unilateral=Boolean(set.isUnilateral)
   const right=x?.paired?9+j+(cycle%2):10
   const left=unilateral?(x?.paired?7+j+(cycle%2):9):null
   set.completedReps=right
   if(unilateral)set.completedRepsLeft=left
   const ex=prog.Program_getProgramExercise(record.day,ev,entry.programExerciseId)
   record=progress.Progress_completeSetAction(settings,stats,record,{
     type:'CompleteSetAction',entryIndex:i,setIndex:j,mode:'workout',
     programExercise:ex,otherStates:ev.states,isPlayground:true,
     forceUpdateEntryIndex:false,isExternal:false},undefined)
   record=progress.Progress_settleTimedSet(settings,stats,record,i,j,'workout',{},
     {programExercise:ex,otherStates:ev.states,isPlayground:true})
   if(record.amrapModal!=null){
     const modal=record.amrapModal,modset=record.entries[modal.entryIndex].sets[modal.setIndex]
     record=progress.Progress_changeAmrapAction(settings,stats,record,{
       type:'ChangeAMRAPAction',entryIndex:modal.entryIndex,setIndex:modal.setIndex,
       isPlayground:true,programExercise:ex,otherStates:ev.states,
       amrapValue:modal.isAmrap?(modset.completedReps??modset.reps):undefined,
       logRpe:modal.logRpe,rpeValue:modal.logRpe?modset.rpe:undefined,
       askWeight:modal.askWeight,weightValue:modal.askWeight?modset.weight:undefined},undefined)
   }
   const done=record.entries[i].sets[j]
   if(done.isCompleted===true)evidence.nativeCompletedSets++
   if(x){
     check('native-isCompleted',done.isCompleted===true,cycle,day,slot)
     check('right-reps-native-record',done.completedReps===right,cycle,day,slot)
     check('left-reps-native-record',!x.paired||done.completedRepsLeft===left,cycle,day,slot)
     check('native-load-unit-is-kg',Number.isFinite(kg(done.completedWeight))&&kg(done.completedWeight)>=0,cycle,day,slot)
     trace.sets.push({nativeCompleted:done.isCompleted,paired:unilateral,left,right,
       programmedUnit:done.weight?.unit,completedWeightKg:kg(done.completedWeight)})
     if(x.paired)evidence.pairedSets++
     else evidence.ordinarySets++
   }
  }
  if(x)privateTrace.privateResults.push({cycle,day,...trace})
 }
 const serialized=serialize.LiftohistorySerializer_serialize(record,settings,p)
 privateTrace.originalSerializedHistory.push({cycle,day,serialized})
 for(const x of cases.filter(x=>x.day===day)){
  const entry=record.entries[x.index],proof=privateTrace.privateResults.find(t=>t.cycle===cycle&&t.slot===x.slot)
  const each=proof.sets.map(s=>s.paired?String(s.right)+'|'+String(s.left):String(s.right))
  // Real native serializer must include both independent left/right values for unilateral input.
  const line=serialized.split('\n').find(t=>t.includes(entry.exerciseName)||t.includes(actualDay[x.index]?.name))
  const pairedProof=x.paired?Boolean(line)&&each.every(token=>line.includes(token)):true
  check('serialized-original-independent-sides',pairedProof,cycle,day,x.slot)
  const first=proof.sets[0]
  const pairedRows=x.paired?[
    {setId:'first',side:'L',role:'work',status:'completed',resistance:{kind:'external-load',value:first.completedWeightKg,unit:'kg'},observations:[{metric:'repetitions',value:first.left}]},
    {setId:'first',side:'R',role:'work',status:'completed',resistance:{kind:'external-load',value:first.completedWeightKg,unit:'kg'},observations:[{metric:'repetitions',value:first.right}]}
  ]:[{setId:'first',role:'work',status:'completed',resistance:{kind:'external-load',value:first.completedWeightKg,unit:'kg'},observations:[{metric:'repetitions',value:first.right}]}]
  const ob=h1FromExposure({mode:'reps',performance:{sets:pairedRows}},{
    beforeCandidate:first.completedWeightKg,afterCandidate:first.completedWeightKg,baselineUnit:'kg'})
  // Ingestion check only: these are NOT H1 signal occurrences in actual M6.
  check('openGym-reads-native-independent-first-set',ob.kind==='COMPARABLE',cycle,day,x.slot)
  if(x.paired)check('openGym-native-paired-min-rep-score',
    Math.abs(ob.performance-first.completedWeightKg*(1+Math.min(first.left,first.right)/30))<1e-6,
    cycle,day,x.slot)
  dayProof.selected.push({slot:x.slot,paired:x.paired,nativeSets:proof.sets.length,serializedSidesVerified:pairedProof,
    openGymSourceObservationKind:ob.kind,isOriginalH1Signal:false,decodedNativeWeightUnit:'kg'})
 }
 const errors=[]
 const finished=prog.Program_runAllFinishDayScripts(p,record,stats,settings,e=>errors.push(String(e).slice(0,80)))
 check('original-finish-without-errors',errors.length===0,cycle,day,'day')
 const next=planner.PlannerProgram_generateFullText(finished.program.planner.weeks)
 check('serialized-native-source-continued',typeof next==='string'&&sha(next)!==beforeHash,cycle,day,'day')
 dayProof.nativeFinishOk=errors.length===0&&typeof next==='string'&&sha(next)!==beforeHash
 dayProof.sourceAfterFingerprint=sha(next).slice(0,16)
 evidence.records.push(dayProof);evidence.newNativeWorkouts++
 source=next
}
evidence.totalMissingSourceOccurrencesPerNinePriorSessions=9
check('three-original-missing-native-slots',cases.length===3,0,0,'overview')
check('nine-original-missing-native-occurrence-repeats',evidence.records.reduce((n,d)=>n+d.selected.length,0)===9,0,0,'overview')
check('eighteen-native-paired-completed-sets',evidence.pairedSets===18,0,0,'overview')
check('six-native-ordinary-completed-sets',evidence.ordinarySets===6,0,0,'overview')
evidence.outcome=evidence.unexpectedIssues.length?'NATIVE_RECORD_RED':'NATIVE_RECORDS_PASS_NONH1_SCOPE'
privateTrace.summary={outcome:evidence.outcome,checks:evidence.comparisons,issues:evidence.unexpectedIssues}
fs.mkdirSync(out,{recursive:true,mode:0o700})
fs.writeFileSync(path.join(out,'m6-missing-slots-original-native-private.json'),JSON.stringify(privateTrace,null,2)+'\n',{mode:0o600})
fs.writeFileSync(path.join(out,'m6-missing-slots-original-native-sanitized.json'),JSON.stringify(evidence,null,2)+'\n',{mode:0o600})
console.log(JSON.stringify({outcome:evidence.outcome,nativeWorkouts:evidence.newNativeWorkouts,
  pairedSets:evidence.pairedSets,ordinarySets:evidence.ordinarySets,nativeCompletedSets:evidence.nativeCompletedSets,checks:evidence.comparisons,
  issues:evidence.unexpectedIssues.slice(0,30),selectedSlots:evidence.records.flatMap(r=>r.selected).length},null,2))
if(evidence.unexpectedIssues.length)process.exitCode=1
