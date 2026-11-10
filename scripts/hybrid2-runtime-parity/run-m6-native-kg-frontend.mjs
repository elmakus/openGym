#!/usr/bin/env node
// Real current-M6 original-native set loads -> openGym UI->history/replay.
// Validation-only partial six-anchor fixture. NEVER publish private snapshots.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {M6} from '../../api/training-control/hybrid2/fixtures/reference-adapters.js'
import {h1FromExposure} from '../../api/training-control/hybrid2/observation.js'
import {replayHybridHistory} from '../../api/training-control/hybrid2/history.js'
import {reconcileHybridHistory} from '../../frontend/src/lib/hybrid2-sync.js'
import {buildSessionExposures} from '../../frontend/src/lib/session-start.js'
import {entriesForExposures} from '../../frontend/src/lib/session-ui-adapter.js'
import {buildCompletedSession} from '../../frontend/src/lib/finish-session.js'
import {ruleOccurrence} from '../../frontend/src/lib/test-fixtures.js'
const out=process.env.H2_PARITY_OUT,privatePath=process.env.H2_NATIVE_M6_PRIVATE,outProfiles=process.env.H2_PRIVATE_PROFILE_SNAPSHOTS
if(!out||!privatePath||!outProfiles)throw Error('Explicit private native M6 source / isolated profiles and evidence paths required')
const original=fs.readFileSync(privatePath,'utf8'),originalSha=crypto.createHash('sha256').update(original).digest('hex')
if(originalSha!=='2b4a0747d39890dfb3c89a49e4df8c3229e39c390713a8a58d42e66284d25c95')throw Error('Native private M6 transcript changed')
const native=JSON.parse(original)
if(native.outcome!=='PASS'||native.selectedPostDeloadWorkouts!==9||native.steps.length!==9)throw Error('Native source is not authoritative')
const rawMap={'hip_a':'d1i1','chest_a':'d1i6','hip_b':'d2i2','row_b':'d2i8','hip_c':'d3i2','row_c':'d3i8'}
const nativeBySlot={}
for(const [slot,id]of Object.entries(rawMap)){
 const baseline=native.steps.find(s=>s.day===Number(id[1]))?.privateEvidence.find(e=>e.identity===id)
 if(!baseline||!Number.isFinite(baseline.beforeCandidateKg)||!Number.isFinite(baseline.nativeFloorKg))throw Error('Missing original native anchor '+slot)
 nativeBySlot[slot]=baseline
}
const adapter=structuredClone(M6.adapter)
for(const o of adapter.occurrences)if(o.progressionIdentity!==null)o.progressionIdentity=o.occurrenceId
for(const s of adapter.signals)s.progressionIdentity=s.occurrence
const routines=M6.routines.map(r=>({...r,ex:r.ex.map(x=>{
 const slot=x.occurrenceId.slice('fixture-m6:'.length),n=nativeBySlot[slot]
 if(slot==='closer')return ruleOccurrence('0025',{occurrenceId:x.occurrenceId,routineId:r.id,
  options:{sets:{min:1,max:1},reps:{min:10,max:10},load:{mode:'absolute',value:0,unit:'kg'},completion:[]}})
 return {...ruleOccurrence('0025',{occurrenceId:x.occurrenceId,routineId:r.id,
  options:{sets:{min:3,max:3},reps:{min:8,max:16},load:{mode:'absolute',value:n.beforeCandidateKg,unit:'kg'},completion:[]}}),
  atp2:{enabled:true,floorWeight:n.nativeFloorKg}}
})}))
const profile={engineSchemaVersion:2,unit:'kg',restSec:90,workouts:[],prescriptions:{},progression:{},oneRepMaxes:{},bodyweight:[],exWeights:{},
 routines,trainingControl:{hybrid2Config:{version:1,enabled:true,adapter}}}
const result={schema:'HYBRID2-M6-ORIGINAL-NATIVE-KG-TO-OPENGYM-UI-HISTORY-1',
 provenance:{nativePrivateSha256:originalSha,originalNativeRuntime:native.provenance.nativeRuntime,sourceSha256:native.provenance.sourceSha256,
 input:'real native original-M6 6 H1 anchor completed sets / isolated M6 fixture',newNativeWorkouts:0,
 numericNativeControllerParityNotClaimed:true,productionWrites:0,privateProfilePublished:false},
 frontendSessions:0,comparedNativeSets:0,historyChecks:0,checks:0,issues:[],steps:[]}
const check=(label,ok,step,meta={})=>{result.checks++;if(!ok)result.issues.push({step,label,...meta})}
fs.mkdirSync(outProfiles,{recursive:true,mode:0o700})
fs.chmodSync(outProfiles,0o700)
for(const [ordinal,step]of native.steps.entries()){
 const day=step.day,cycle=step.cycle,sessionId='m6-native-kg-'+cycle+'-'+day
 const timestamp=Date.UTC(2026,10,15)+(ordinal+1)*86400000,routine=profile.routines[day-1]
 const exposures=buildSessionExposures(profile,routine,{now:timestamp,newId:s=>s,unit:'kg'})
 const entries=entriesForExposures(exposures,profile.prescriptions)
 check('entries-exposure-count',entries.length===exposures.length,ordinal+1)
 const mapped=[]
 for(const entry of entries){
  const e=exposures.find(z=>z.exposureId===entry.exposureId)
  if(!e)throw Error('No openGym exposure for UI entry')
  const slot=e.occurrenceId.slice('fixture-m6:'.length),id=rawMap[slot],src=step.privateEvidence.find(z=>z.identity===id)
  if(!id){entry.sets[0].done=true;entry.sets[0].r=10;entry.sets[0].w=0;continue}
  if(!src?.setsKg?.length||src.setsKg.length!==src.setsReps.length||src.setsKg.length>entry.sets.length)
    throw Error('Native source/UI set-shape mismatch')
  for(let i=0;i<src.setsKg.length;i++){entry.sets[i].w=src.setsKg[i];entry.sets[i].r=src.setsReps[i];entry.sets[i].done=true}
  mapped.push({slot,source:src})
 }
 const active={id:sessionId,start:timestamp,d:new Date(timestamp).toISOString().slice(0,10),
  name:routine.name,routineIds:[routine.id],exposures,entries}
 const finished=buildCompletedSession(active,profile,{end:timestamp+3600000,newId:s=>s,unit:'kg'})
 const persisted=JSON.parse(JSON.stringify(finished.session))
 for(const {slot,source:src}of mapped){
  const exp=persisted.exposures.find(e=>e.occurrenceId==='fixture-m6:'+slot)
  const sets=(exp?.performance?.sets||[]).filter(x=>x.role==='work'&&x.status==='completed')
  check('recorded-native-set-count',sets.length===src.setsKg.length,ordinal+1,{slot})
  for(const [k,s]of sets.entries()){
   const rep=s.observations?.find(x=>x.metric==='repetitions')?.value
   check('native-original-kg-preserved',s.resistance?.unit==='kg'&&Math.abs(s.resistance.value-src.setsKg[k])<1e-7,ordinal+1,{slot,set:k+1})
   check('native-original-reps-preserved',rep===src.setsReps[k],ordinal+1,{slot,set:k+1})
   result.comparedNativeSets++
  }
  const ob=h1FromExposure(exp,{beforeCandidate:src.beforeCandidateKg,afterCandidate:src.nativeAfterCandidateKg,baselineUnit:'kg'})
  // Native-source comparability is checked from its actual candidate and first performed set.
  check('original-native-first-set-comparable',ob.kind==='COMPARABLE',ordinal+1,{slot,kind:ob.kind})
  check('actual-native-first-set',sets[0]?.observations?.[0]?.value===src.setsReps[0],ordinal+1,{slot})
 }
 profile.workouts.push(persisted)
 Object.assign(profile.progression,finished.progression)
 profile.trainingControl.atp2={...profile.trainingControl.atp2,...finished.atp2States}
 profile.trainingControl.timedLoad={...profile.trainingControl.timedLoad,...finished.timedLoadStates}
 const a=replayHybridHistory({workouts:profile.workouts,adapter,prescriptions:profile.prescriptions})
 const b=reconcileHybridHistory(profile)
 result.historyChecks++
 check('canonical-replay-equality',JSON.stringify(a.state)===JSON.stringify(b.state),ordinal+1)
 check('replay-count',a.sourceCount===ordinal+1,ordinal+1)
 const dest=path.join(outProfiles,'profile-'+String(ordinal+1).padStart(2,'0')+'.json')
 fs.writeFileSync(dest,JSON.stringify(profile)+'\n',{mode:0o600})
 result.steps.push({ordinal:ordinal+1,cycle,day,nativeSourceStepSha256:step.afterSha256,
  recordedOriginalNativeLoadedSets:mapped.reduce((n,x)=>n+x.source.setsKg.length,0),
  replayCount:a.sourceCount,controller:a.status,issuesToDate:result.issues.length})
 result.frontendSessions++
}
result.outcome=result.issues.length?'RED':'PASS'
const pathOut=path.join(out,'m6-native-kg-frontend-sanitized.json')
fs.writeFileSync(pathOut,JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({outcome:result.outcome,sessions:result.frontendSessions,sourceSets:result.comparedNativeSets,
 checks:result.checks,issues:result.issues.slice(0,18),last:result.steps.at(-1)},null,2))
if(result.issues.length)process.exitCode=1
