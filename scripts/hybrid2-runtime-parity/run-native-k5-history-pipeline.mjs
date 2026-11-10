#!/usr/bin/env node
// Native K5 independent bilateral transcript -> real openGym startup/finish/history/replay chain.
// NOT a Liftosaur emulator. Native source inputs come from separately executed pinned runtime.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {K5} from '../../api/training-control/hybrid2/fixtures/reference-adapters.js'
import {replayHybridHistory} from '../../api/training-control/hybrid2/history.js'
import {replayAtp2History} from '../../api/training-control/history.js'
import {replayTimedLoadHistory} from '../../api/training-control/timed-load-history.js'
import {h1FromExposure} from '../../api/training-control/hybrid2/observation.js'
import {buildSessionExposures} from '../../frontend/src/lib/session-start.js'
import {entriesForExposures, rowsOfPerformance} from '../../frontend/src/lib/session-ui-adapter.js'
import {buildCompletedSession} from '../../frontend/src/lib/finish-session.js'
import {isWarmupRow,isSideSet,syncSideAggregate} from '../../frontend/src/lib/workout-model.js'
import {reconcileHybridHistory} from '../../frontend/src/lib/hybrid2-sync.js'
import {ruleOccurrence} from '../../frontend/src/lib/test-fixtures.js'
import {SIDE_PLANK_TIMED_CONFIG} from '../../api/training-control/timed-load.js'
const dir=process.env.H2_PARITY_OUT
if(!dir)throw Error('H2_PARITY_OUT required; native K5 output expected')
const evidencePath=path.join(dir,'current-k5-native-paired-sanitized.json')
const text=fs.readFileSync(evidencePath,'utf8'),digest=crypto.createHash('sha256').update(text).digest('hex')
if(digest!=='44a84c1dbe7439909810d1e7275f22a1afbcf94dcbbff10d937cef7a8a814e31')throw Error('Pinned original native bilateral transcript changed')
const source=JSON.parse(text)
if(source.outcome!=='PASS'||source.executedWorkouts!==20||source.pairedNativeEntries!==4)throw Error('Native source was not proven PASS')
const adapter=structuredClone(K5.adapter)
for(const occ of adapter.occurrences)if(occ.progressionIdentity!==null)occ.progressionIdentity=occ.occurrenceId
for(const sig of adapter.signals)sig.progressionIdentity=sig.occurrence
const routines=K5.routines.map(r=>({...r,ex:r.ex.map(x=>{
 if(x.occurrenceId.endsWith(':closer'))return {...ruleOccurrence('0089',{preset:'hold_seconds',occurrenceId:x.occurrenceId,routineId:r.id,
  options:{sets:{min:2,max:2},durationSeconds:{min:30,max:30}}}),side:true,warmup:'none',timedLoad:{...SIDE_PLANK_TIMED_CONFIG,enabled:true}}
 return {...ruleOccurrence('0025',{occurrenceId:x.occurrenceId,routineId:r.id,
  options:{sets:{min:3,max:3},reps:{min:8,max:16},load:{mode:'absolute',value:100,unit:'kg'},completion:[]}}),
  ...(x.occurrenceId==='fixture-k5:leg_press'?{side:true}:{}),
  atp2:{enabled:true,floorWeight:10}}
})}))
const profile={engineSchemaVersion:2,unit:'kg',restSec:90,workouts:[],prescriptions:{},progression:{},oneRepMaxes:{},
 bodyweight:[],exWeights:{},routines,trainingControl:{hybrid2Config:{version:1,enabled:true,adapter}}}
const result={schema:'HYBRID2-NATIVE-K5-TRANSCRIPT-OPEN-GYM-PERSISTENCE-1',
 nativeInputSha256:digest,nativeSourceSha256:source.provenance.sourceSha256,
 nativeWorkoutsNewInThisSuite:0,previousNativeWorkoutsUsedAsInput:20,
 fixture:'actual openGym K5 fixture adapter/routines with K5 source-native recorded reps; synthetic constant load 100 (NOT original Liftosaur load), not a numerical H1 performance equivalence claim',
 openGymFinishedSessions:0,persistedRecords:0,comparisons:0,issues:[],positionSummaries:[]}
const expectedSlots=['chest','squat','row','incline','leg_press']
const posToSlot=Object.fromEntries(expectedSlots.map((s,i)=>[i,s]))
const assert=(phase,okay,meta={})=>{result.comparisons++;if(!okay)result.issues.push({phase,...meta})}
for(const c of source.cycles){
 for(let d=0;d<5;d++){
  const day=c.days[d],timestamp=Date.UTC(2026,10,9)+(c.number*5+d)*86400000
  const routine=profile.routines[d]
  const beforeHybridState=profile.trainingControl.hybrid2?.anchors?.[posToSlot[d]]
  const exposures=buildSessionExposures(profile,routine,{now:timestamp,newId:s=>s,unit:'kg'})
  const entries=entriesForExposures(exposures,profile.prescriptions)
  assert('entry-exposure-count',exposures.length===entries.length,{cycle:c.number,day:d+1})
  const nativeH1=day.comparedAnchors[0]
  assert('native-signal-mapped',nativeH1?.slot===d+1,{cycle:c.number,day:d+1})
  const expectedLeft=nativeH1.leftReps,expectedRight=nativeH1.rightReps
  for(const entry of entries){
   const exposure=exposures.find(x=>x.exposureId===entry.exposureId)
   if(exposure?.timedLoad?.version===1){
    for(const row of entry.sets.filter(x=>!isWarmupRow(x))){
      row.done=true;row.sec=30
    }
   }else{
    const idx=entry.sets.findIndex(row=>!isWarmupRow(row))
    const row=entry.sets[idx]
    if(d===4 && exposure.occurrenceId==='fixture-k5:leg_press'){
     assert('native-origin-paired-ui-row',isSideSet(row),{cycle:c.number})
     row.sides.L.r=expectedLeft;row.sides.R.r=expectedRight
     row.sides.L.done=true;row.sides.R.done=true
     entry.sets[idx]=syncSideAggregate(row)
     assert('native-paired-limbs-complete',entry.sets[idx].done===true,{cycle:c.number})
    }else{
     row.done=true
     row.r=expectedRight
    }
   }
  }
  const active={id:'native-replay-'+c.number+'-'+(d+1),start:timestamp,d:new Date(timestamp).toISOString().slice(0,10),
   name:routine.name,routineIds:[routine.id],exposures,entries}
  const finished=buildCompletedSession(active,profile,{end:timestamp+3600000,newId:s=>s,unit:'kg'})
  // Simulate the app's persistent JSON storage/readback. This is NOT a remote DB write.
  const persisted=JSON.parse(JSON.stringify(finished.session))
  assert('saved-workout-id',persisted.id===active.id,{cycle:c.number,day:d+1})
  assert('serialized-performance',persisted.exposures.some(x=>x.performance?.sets?.some(y=>y.role==='work'&&y.status==='completed')),{cycle:c.number,day:d+1})
  if(d===4){
   const leg=persisted.exposures.find(x=>x.occurrenceId==='fixture-k5:leg_press')
   const rows=leg.performance.sets.filter(r=>r.role==='work'&&r.status==='completed')
   const lr=rows.find(x=>x.side==='L'),rr=rows.find(x=>x.side==='R')
   assert('saved-bilateral-side-count',!!lr&&!!rr,{cycle:c.number})
   assert('native-left-exact-persisted',lr?.observations?.find(x=>x.metric==='repetitions')?.value===expectedLeft,{cycle:c.number})
   assert('native-right-exact-persisted',rr?.observations?.find(x=>x.metric==='repetitions')?.value===expectedRight,{cycle:c.number})
   assert('saved-bilateral-same-set-id',lr?.setId===rr?.setId,{cycle:c.number})
   const restoredRows=rowsOfPerformance(leg.performance.sets,leg.mode)
   const sideRestored=restoredRows.find(row=>isSideSet(row))
   assert('saved-to-editable-L-restored',sideRestored?.sides.L.r===expectedLeft,{cycle:c.number})
   assert('saved-to-editable-R-restored',sideRestored?.sides.R.r===expectedRight,{cycle:c.number})
   const kind=h1FromExposure(leg,{beforeCandidate:lr?.resistance?.value,afterCandidate:lr?.resistance?.value,baselineUnit:'kg'}).kind
   assert('persisted-H1-comparability',kind===nativeH1.sample,{cycle:c.number,original:nativeH1.sample,persisted:kind})
  }
  profile.workouts.push(persisted)
  Object.assign(profile.progression,finished.progression)
  profile.trainingControl.atp2={...profile.trainingControl.atp2,...finished.atp2States}
  profile.trainingControl.timedLoad={...profile.trainingControl.timedLoad,...finished.timedLoadStates}
  const reconciliation=reconcileHybridHistory(profile)
  const manual=replayHybridHistory({workouts:JSON.parse(JSON.stringify(profile.workouts)),adapter,prescriptions:profile.prescriptions})
  assert('reconcile-snapshot-identity',JSON.stringify(reconciliation?.state)===JSON.stringify(manual.state),{cycle:c.number,day:d+1})
  assert('persisted-workout-count',manual.sourceCount===profile.workouts.length,{cycle:c.number,day:d+1})
  assert('native-to-persisted-H1-count',Number(manual.state.anchors[posToSlot[d]]?.perfCount)===nativeH1.sampleCount,{cycle:c.number,day:d+1,
   openGymCount:manual.state.anchors[posToSlot[d]]?.perfCount,nativeCount:nativeH1.sampleCount})
  // Replaying the exact same canonical JSON history must be idempotent.
  const twice=replayHybridHistory({workouts:JSON.parse(JSON.stringify(profile.workouts)),adapter,prescriptions:profile.prescriptions})
  assert('repeat-replay-idempotent',JSON.stringify(twice.state)===JSON.stringify(manual.state),{cycle:c.number,day:d+1})
  result.openGymFinishedSessions++;result.persistedRecords++;result.positionSummaries.push({
   cycle:c.number,position:d+1,paired:d===4,nativeH1Count:nativeH1.sampleCount,historyReplayCount:manual.state.anchors[posToSlot[d]]?.perfCount,
   status:manual.status,workoutsPersisted:profile.workouts.length})
 }
}
const fullReplay=replayHybridHistory({workouts:profile.workouts,adapter,prescriptions:profile.prescriptions})
const shuffled=profile.workouts.slice().reverse()
const replayReverse=replayHybridHistory({workouts:shuffled,adapter,prescriptions:profile.prescriptions})
assert('chronology-sort-invariant',JSON.stringify(fullReplay.state)===JSON.stringify(replayReverse.state))
assert('canonical-atp2-replay',Object.keys(replayAtp2History(profile.workouts)).length>0)
assert('canonical-timed-replay',Object.keys(replayTimedLoadHistory(profile.workouts)).length>0)
result.pairedPersistedCount=result.positionSummaries.filter(s=>s.paired).length
result.finalStatus=fullReplay.status
result.outcome=result.issues.length?'RED':'PASS'
fs.writeFileSync(path.join(dir,'native-k5-open-gym-persisted-pipeline-sanitized.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({outcome:result.outcome,sessions:result.openGymFinishedSessions,pairedRecords:result.pairedPersistedCount,
 assertions:result.comparisons,errors:result.issues.length,issues:result.issues.slice(0,25),status:result.finalStatus},null,2))
if(result.issues.length)process.exitCode=1
