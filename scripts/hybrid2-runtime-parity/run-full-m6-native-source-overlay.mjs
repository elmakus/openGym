#!/usr/bin/env node
// True native M6 11+13+12 occurrence IDs and shared native e.key -> openGym full structural
// exposure/finish/replay bridge, with original native kg weights when present.
// Isolated fixture exercise catalog for openGym; never writes a real Liftosaur account.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {createRequire} from 'node:module'
import {M6} from '../../api/training-control/hybrid2/fixtures/reference-adapters.js'
import {replayHybridHistory} from '../../api/training-control/hybrid2/history.js'
import {h1FromExposure} from '../../api/training-control/hybrid2/observation.js'
import {reconcileHybridHistory} from '../../frontend/src/lib/hybrid2-sync.js'
import {buildSessionExposures} from '../../frontend/src/lib/session-start.js'
import {entriesForExposures} from '../../frontend/src/lib/session-ui-adapter.js'
import {buildCompletedSession} from '../../frontend/src/lib/finish-session.js'
import {ruleOccurrence} from '../../frontend/src/lib/test-fixtures.js'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {validateCanonicalProfile} from '../../api/migration/profile-validation.js'
import {centralizeRttUpdate} from './rtt-centralized-update-variant.mjs'
import {addStaleH1WriteBarrier} from './h1-stale-barrier-variant.mjs'
const out=process.env.H2_PARITY_OUT,srcPath=process.env.PRIVATE_M6_ORIGINAL_PATH,tracePath=process.env.H2_NATIVE_M6_PRIVATE,fitness=process.env.FITNESS_ROOT,runtime=process.env.LIFTOSAUR_RUNTIME_ROOT,snapshots=process.env.H2_PRIVATE_PROFILE_SNAPSHOTS
if(!out||!srcPath||!tracePath||!fitness||!runtime||!snapshots)throw Error('Required original private source/native runtime/evidence/profile roots')
const sha=s=>crypto.createHash('sha256').update(s).digest('hex')
const original=fs.readFileSync(srcPath,'utf8')
if(sha(original)!=='7b1c7d114229b4d1cf86093409d7d89ae4e7d88e6a0c1c4c89bcba30a4a425df')throw Error('Original M6 SHA mismatch')
const raw=fs.readFileSync(tracePath,'utf8')
if(sha(raw)!=='2b4a0747d39890dfb3c89a49e4df8c3229e39c390713a8a58d42e66284d25c95')throw Error('Original M6 native transcript SHA mismatch')
const native=JSON.parse(raw)
if(native.outcome!=='PASS'||native.steps.length!==9)throw Error('Native source differential not PASS')
if(!fs.readFileSync(path.join(runtime,'README.txt'),'utf8').includes('ce75750bde4a190682fb5a6fa1984fc9184a9842'))throw Error('Wrong original native runtime')
const req=createRequire(import.meta.url),rt=req(path.join(runtime,'runtime_api.cjs'))
const {buildSettings}=req(path.join(fitness,'tests/fixtures/marta-playground-baseline/settings/build_settings.cjs'))
const settings=buildSettings(path.join(fitness,'tests/fixtures/marta-playground-baseline'))
// One isolated source-only change: materialize a native shared progression identity
// before Engine v2 creates the prescription, so its immutable contentHash is genuine.
// Copy is private, adjacent only for relative ESM imports, and removed after import.
const sourceModulePath=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../frontend/src/lib/session-start.js')
const originalModule=fs.readFileSync(sourceModulePath,'utf8')
const needle='const trackId = occ.occurrenceId'
if(originalModule.split(needle).length!==2)throw Error('Pinned frontend materialization seam drifted')
const replacement="const trackId = hybrid?.adapter?.occurrences?.find(x => x.occurrenceId === original.occurrenceId)?.progressionIdentity ?? occ.occurrenceId"
const scratchModule=path.join(path.dirname(sourceModulePath),'session-start-validation-native-'+process.pid+'.mjs')
const sourceOnlyOverlayModule=originalModule.replace(needle,replacement)
fs.writeFileSync(scratchModule,sourceOnlyOverlayModule,{mode:0o600})
let buildSourceBackedExposures
try {({buildSessionExposures:buildSourceBackedExposures}=await import(pathToFileURL(scratchModule).href))}
finally {fs.unlinkSync(scratchModule)}
const source=addStaleH1WriteBarrier(centralizeRttUpdate(original).source)
const weeks=rt.PlannerProgram_evaluateText(source)
const plan={vtype:'program',id:'private',name:'private',url:'',author:'',shortDescription:'',description:'',nextDay:1,exercises:[],days:[],weeks:[],isMultiweek:false,tags:[],clonedAt:0,planner:{vtype:'planner',name:'private',weeks}}
const nativePlan=rt.Program_evaluate(plan,settings)
const nativeDays=nativePlan.weeks[0].days.map(z=>z.exercises.filter(e=>e.name!=='Adaptive Rep Engine Template'))
if(nativeDays.map(z=>z.length).join(',')!=='11,13,12')throw Error('Real native M6 topology drift')
const positions=['A','B','C'], adapter=structuredClone(M6.adapter),anchorSlot={}
for(const [di,es]of nativeDays.entries())for(const [i,e]of es.entries()){
 const anchor=Number(e.progress?.state?.anchorId??0)
 if(anchor){if(anchorSlot[anchor])throw Error('Repeated H1 anchor ID '+anchor);anchorSlot[anchor]='d'+(di+1)+'i'+(i+1)}
}
if(Object.keys(anchorSlot).length!==6)throw Error('Missing H1 signal')
const routineIds=positions.map(p=>'m6-native-fixture:'+p)
const slot=(d,i)=>'d'+(d+1)+'i'+(i+1)
const keyHash=e=>sha(e.key||'missing-native-key')
adapter.namespace='m6-native-36-structural-validation'
adapter.planVersion='1'
adapter.closerOccurrence='m6-native:'+slot(2,11)
adapter.occurrences=nativeDays.flatMap((es,di)=>es.map((e,i)=>({
 occurrenceId:'m6-native:'+slot(di,i),cyclePosition:positions[di],routineId:routineIds[di],
 progressionIdentity:e.key?'m6-native-key:'+keyHash(e):null,
 optional:false,controllerTagged:true,canRaiseCandidate:Number(e.progress?.state?.anchorId??0)>0
})))
for(let i=0;i<6;i++){
 const s=adapter.signals[i],id=anchorSlot[i+1]
 s.occurrence='m6-native:'+id
 s.cyclePosition=positions[Number(id[1])-1]
 s.progressionIdentity=adapter.occurrences.find(e=>e.occurrenceId===s.occurrence)?.progressionIdentity
 s.performanceIdentity='m6-native-H1-'+(i+1)
}
const routines=nativeDays.map((es,di)=>({id:routineIds[di],name:'Native M6 A/B/C fixture '+positions[di],
 ex:es.map((e,i)=>{
  const id=slot(di,i),found=native.steps.find(z=>z.day===di+1)?.privateEvidence.find(z=>z.identity===id)
  const normal=Number.isFinite(found?.beforeCandidateKg)&&found.beforeCandidateKg>0?found.beforeCandidateKg:20
  return {...ruleOccurrence('0025',{occurrenceId:'m6-native:'+id,routineId:routineIds[di],
   options:{sets:{min:Math.max(1,e.evaluatedSetVariations?.reduce((n,v)=>n+v.sets.length,0)??1),max:Math.max(1,e.evaluatedSetVariations?.reduce((n,v)=>n+v.sets.length,0)??1)},
    reps:{min:8,max:16},load:{mode:'absolute',value:normal,unit:'kg'},completion:[]}})}
 })}))
const profile={engineSchemaVersion:2,unit:'kg',restSec:90,workouts:[],prescriptions:{},progression:{},oneRepMaxes:{},bodyweight:[],exWeights:{},routines,
 trainingControl:{hybrid2Config:{version:1,enabled:true,adapter}}}
const result={schema:'HYBRID2-M6-ORIGINAL-36-SHARED-STRUCTURAL-NATIVE-INPUT-1',
 provenance:{sourceSha256:sha(original),nativePrivateTraceSha256:sha(raw),originalFrontendSourceSha256:sha(originalModule),sourceOnlyOneLineModuleSha256:sha(sourceOnlyOverlayModule),runtime:'ce75750bde4a190682fb5a6fa1984fc9184a9842',fitness:'9f2deb6c345643d7c0c793c52d358e496c2710d2',
 originalNativeWorkoutsNew:0,adapter:'native source structural slots and shared e.key / openGym catalog fixture',originalPhysicalExercisesMapped:false,
 productionWrites:0,privateWeightsPublished:false},workouts:0,completedNativeKgSets:0,unparsedOccurrences:0,checks:0,issues:[],steps:[],nativeSharedGroups:[],
 identityContractRed:[],bridge:'ONE source-only session-start trackId choice before generating prescriptions/progression; unchanged original materializer remains RED'}
const check=(label,okay,session,meta={})=>{result.checks++;if(!okay)result.issues.push({label,session,...meta})}
const groups=Object.groupBy(nativeDays.flatMap((es,di)=>es.map((e,i)=>({key:keyHash(e),id:slot(di,i)}))),x=>x.key)
for(const arr of Object.values(groups).filter(x=>x.length>1))result.nativeSharedGroups.push({fingerprint:arr[0].key.slice(0,12),occurrences:arr.map(x=>x.id)})
check('source-six-shared-native-key-groups',result.nativeSharedGroups.length===6,0)
check('source-thirteen-occurrences-in-shared-keys',result.nativeSharedGroups.reduce((n,g)=>n+g.occurrences.length,0)===13,0)
check('original-all-36-structural-positions',adapter.occurrences.length===36,0)
check('native-h1-six-anchors',adapter.signals.length===6,0)
fs.mkdirSync(snapshots,{recursive:true,mode:0o700});fs.chmodSync(snapshots,0o700)
for(const [idx,step]of native.steps.entries()){
 const day=step.day,di=day-1,routine=profile.routines[di],stamp=Date.UTC(2026,10,20)+idx*86400000
 const unmodifiedExposures=buildSessionExposures(structuredClone(profile),routine,{now:stamp,newId:s=>s,unit:'kg'})
 const exposures=buildSourceBackedExposures(profile,routine,{now:stamp,newId:s=>s,unit:'kg'})
 // Negative control: the unchanged frontend couples trackId to occurrenceId and cannot
 // honor source-native shared e.key progressionIdentity. Keep each original mismatch RED.
 const mismatches=unmodifiedExposures.flatMap(e=>{
  const expected=adapter.occurrences.find(a=>a.occurrenceId===e.occurrenceId)?.progressionIdentity
  return expected!==e.trackId?[{session:idx+1,occurrenceId:e.occurrenceId,
    nativeProgressionFingerprint:sha(expected||'none').slice(0,12),classification:'openGym implementation mismatch: native progression identity not materialized'}]:[]
 })
 result.identityContractRed.push(...mismatches)
 // The modified source module itself issues native shared-key prescriptions and
 // genuine immutable content hashes. No post-finish repairs or JSON rewriting.
 const mappedExposures=exposures
 const entries=entriesForExposures(mappedExposures,profile.prescriptions)
 check('true-original-day-exposure-count',exposures.length===nativeDays[di].length,idx+1,{day})
 check('original-day-entry-count',entries.length===nativeDays[di].length,idx+1,{day})
 const saved=[]
 for(const [i,entry]of entries.entries()){
  const id=slot(di,i),exp=mappedExposures.find(e=>e.exposureId===entry.exposureId)
  const nativeSet=step.privateEvidence.find(x=>x.identity===id)
  check('source-native-occurrence-identity',exp?.occurrenceId==='m6-native:'+id,idx+1,{id})
  check('real-shared-progression-identity',exp?.trackId===adapter.occurrences.find(z=>z.occurrenceId==='m6-native:'+id)?.progressionIdentity,idx+1,{id})
  if(!nativeSet){
   result.unparsedOccurrences++
   saved.push({id,hasNativeSets:false})
   continue // Original paired/non-kg row is NOT guessed as a completed numeric work set.
  }
  if(nativeSet.setsKg.length>entry.sets.length)throw Error('Native full-36 set shape cannot hold original actual work rows '+id)
  for(let k=0;k<nativeSet.setsKg.length;k++){
   entry.sets[k].w=nativeSet.setsKg[k];entry.sets[k].r=nativeSet.setsReps[k];entry.sets[k].done=true
  }
  saved.push({id,hasNativeSets:true,setCount:nativeSet.setsKg.length})
 }
 const active={id:'m6-native-36-'+(idx+1),start:stamp,d:new Date(stamp).toISOString().slice(0,10),name:routine.name,routineIds:[routine.id],exposures:mappedExposures,entries}
 const finished=buildCompletedSession(active,profile,{end:stamp+3600000,newId:s=>s,unit:'kg'})
 const persisted=JSON.parse(JSON.stringify(finished.session))
 check('native-complete-structural-exposure-count',persisted.exposures.length===nativeDays[di].length,idx+1,{day})
 const nativeById=new Map(step.privateEvidence.map(z=>[z.identity,z]))
 for(const [i,ex]of persisted.exposures.entries()){
  const id=slot(di,i),src=nativeById.get(id)
  check('durable-native-slot-identity',ex.occurrenceId==='m6-native:'+id,idx+1,{id})
  const expectedIdentity=adapter.occurrences.find(z=>z.occurrenceId===ex.occurrenceId)?.progressionIdentity
  check('durable-native-shared-progression-identity',ex.trackId===expectedIdentity,idx+1,{id})
  const sets=(ex.performance?.sets||[]).filter(s=>s.role==='work'&&s.status==='completed')
  if(!src){check('nonkg-not-fabricated',sets.length===0,idx+1,{id});continue}
  check('source-native-kg-set-count',sets.length===src.setsKg.length,idx+1,{id})
  for(const [j,s]of sets.entries()){
   check('source-native-kg-exact',Math.abs(s.resistance?.value-src.setsKg[j])<1e-7&&s.resistance.unit==='kg',idx+1,{id,set:j+1})
   check('source-native-repetitions-exact',s.observations?.find(x=>x.metric==='repetitions')?.value===src.setsReps[j],idx+1,{id,set:j+1})
   result.completedNativeKgSets++
  }
  if(Number(nativeDays[di][i].progress?.state?.anchorId??0)>0){
   const ob=h1FromExposure(ex,{beforeCandidate:src.beforeCandidateKg,afterCandidate:src.nativeAfterCandidateKg,baselineUnit:'kg'})
   check('native-H1-first-comparable',ob.kind==='COMPARABLE',idx+1,{id,kind:ob.kind})
  }
 }
 profile.workouts.push(persisted)
 Object.assign(profile.progression,finished.progression)
 const valid=validateCanonicalProfile(profile)
 check('isolated-shared-native-track-prescription-state-valid',valid.ok,idx+1,{errorKinds:valid.errors?.map(s=>s.split(':').at(-1).trim()).slice(0,3)})
 profile.trainingControl.atp2={...profile.trainingControl.atp2,...finished.atp2States}
 profile.trainingControl.timedLoad={...profile.trainingControl.timedLoad,...finished.timedLoadStates}
 const replay=replayHybridHistory({workouts:profile.workouts,adapter,prescriptions:profile.prescriptions})
 const reconciled=reconcileHybridHistory(profile)
 check('full-source-structural-replay-agrees',JSON.stringify(replay.state)===JSON.stringify(reconciled.state),idx+1)
 check('full-source-structural-replay-count',replay.sourceCount===idx+1,idx+1)
 const file=path.join(snapshots,'profile-'+String(idx+1).padStart(2,'0')+'.json')
 fs.writeFileSync(file,JSON.stringify(profile)+'\n',{mode:0o600})
 result.workouts++
 result.steps.push({session:idx+1,day,cycle:step.cycle,sourceAfterSha256:step.afterSha256,
  nativeLoadedOccurrences:saved.filter(x=>x.hasNativeSets).length,nonkgUnparsed:saved.filter(x=>!x.hasNativeSets).length,
  completedNativeKgSets:saved.filter(x=>x.hasNativeSets).reduce((n,x)=>n+x.setCount,0),persistedExposures:persisted.exposures.length,
  status:replay.status,sourceCount:replay.sourceCount,issueCount:result.issues.length})
}
result.outcome=result.issues.length?'BRIDGE_RED':result.identityContractRed.length?'BRIDGE_PASS_ORIGINAL_PRODUCTION_RED':'PASS'
fs.mkdirSync(out,{recursive:true})
fs.writeFileSync(path.join(out,'m6-full36-native-source-overlay-sanitized.json'),JSON.stringify(result,null,2)+'\n')
console.log(JSON.stringify({outcome:result.outcome,sourceIdentityRed:result.identityContractRed.length,sessions:result.workouts,loadedSets:result.completedNativeKgSets,
 unparsedOccurrences:result.unparsedOccurrences,checks:result.checks,issues:result.issues.slice(0,18),sharedGroups:result.nativeSharedGroups.length,last:result.steps.at(-1)},null,2))
// Preserve original source identity RED even when the explicitly isolated bridge passes.
if(result.issues.length||result.identityContractRed.length)process.exitCode=1
